using System.Diagnostics;
using System.Net;
using System.Net.Quic;
using System.Net.Security;
using System.Reflection;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Https;
using Microsoft.AspNetCore.Server.Kestrel.Transport.Quic;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

[SupportedOSPlatform("windows10.0.20348")]
internal static class NativeQuicProbe
{
    internal static async Task ActualQuicFinRemovesAssociatedStreamAsync()
    {
        using var key = RSA.Create(2048);
        var request = new CertificateRequest("CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddDays(1));
        var protocols = new List<SslApplicationProtocol> { SslApplicationProtocol.Http3 };
        var authentication = new SslServerAuthenticationOptions { ApplicationProtocols = protocols, ServerCertificate = certificate };
        var features = new FeatureCollection();
        features.Set(new TlsConnectionCallbackOptions
        {
            ApplicationProtocols = protocols,
            OnConnection = (_, _) => ValueTask.FromResult(authentication)
        });
        var factory = new QuicTransportFactory(NullLoggerFactory.Instance, Options.Create(new QuicTransportOptions
        {
            MaxBidirectionalStreamCount = 16,
            MaxUnidirectionalStreamCount = 16,
            DefaultCloseErrorCode = 0
        }));
        await using var listener = await factory.BindAsync(new IPEndPoint(IPAddress.Loopback, 0), features, CancellationToken.None);
        var options = new QuicClientConnectionOptions
        {
            RemoteEndPoint = listener.EndPoint,
            MaxInboundBidirectionalStreams = 16,
            MaxInboundUnidirectionalStreams = 16,
            DefaultStreamErrorCode = 0,
            DefaultCloseErrorCode = 0,
            ClientAuthenticationOptions = new SslClientAuthenticationOptions
            {
                ApplicationProtocols = protocols,
                RemoteCertificateValidationCallback = static (_, _, _, _) => true
            }
        };
        await using var client = await QuicConnection.ConnectAsync(options).AsTask().WaitAsync(Evidence.Timeout);
        await using var server = await listener.AcceptAsync().AsTask().WaitAsync(Evidence.Timeout)
            ?? throw new InvalidOperationException("Actual loopback QUIC server connection missing.");
        await using (var dummyClient = await client.OpenOutboundStreamAsync(QuicStreamType.Unidirectional).AsTask().WaitAsync(Evidence.Timeout))
        {
            Evidence.Require(dummyClient.Id == 2, "Native stream numbering differs before HTTP/3 parent alignment.");
            await dummyClient.WriteAsync(new byte[] { 0x00 }, completeWrites: true).AsTask().WaitAsync(Evidence.Timeout);
            var dummyServer = await server.AcceptAsync().AsTask().WaitAsync(Evidence.Timeout)
                ?? throw new InvalidOperationException("Actual alignment stream missing.");
            var read = await dummyServer.Transport.Input.ReadAtLeastAsync(1).AsTask().WaitAsync(Evidence.Timeout);
            dummyServer.Transport.Input.AdvanceTo(read.Buffer.End);
            await dummyServer.Transport.Input.CompleteAsync();
            await ProcessingTask(dummyServer).WaitAsync(Evidence.Timeout);
            await dummyServer.DisposeAsync();
            ((IDisposable)dummyServer).Dispose();
        }

        await using var fixture = await ProtocolFixture.CreateAsync(0);
        await using var outgoing = await client.OpenOutboundStreamAsync(QuicStreamType.Unidirectional).AsTask().WaitAsync(Evidence.Timeout);
        Evidence.Require(outgoing.Id == 6, "Native associated stream ID must not collide with existing in-memory CONNECT/control streams.");
        await outgoing.WriteAsync(new byte[] { 0x40, 0x54, 0x00 }).AsTask().WaitAsync(Evidence.Timeout);
        var incoming = await server.AcceptAsync().AsTask().WaitAsync(Evidence.Timeout)
            ?? throw new InvalidOperationException("Actual native associated stream missing.");
        Evidence.Require(incoming.GetType().FullName == "Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.Internal.QuicStreamContext",
            "Actual QUIC transport stream,not a replacement context,required.");
        await fixture.AssociateRealTransportStreamAsync(incoming);
        Evidence.Require(incoming.ConnectionClosed.CanBeCanceled && !incoming.ConnectionClosed.IsCancellationRequested &&
            fixture.Streams.Single().ConnectionClosed.CanBeCanceled && !fixture.Streams.Single().ConnectionClosed.IsCancellationRequested,
            "Both native producer and registered consumer cancellation tokens must be real and not canceled before FIN.");
        var before = fixture.Snapshot();
        Evidence.Write("native-associated-before-fin", new
        {
            caseName = "NativeQuicProbe.ActualQuicFinRemovesAssociatedStreamAsync",
            target = outgoing.Id,
            before,
            nativeTransport = Evidence.AssemblyIdentity(typeof(QuicTransportFactory).Assembly),
            systemQuic = Evidence.AssemblyIdentity(typeof(QuicConnection).Assembly),
            identities = Evidence.Identities(),
            nativeContextType = incoming.GetType().FullName,
            parentIsInMemoryHttp3 = true,
            nativePeerIsLoopback = true
        });
        await outgoing.WriteAsync(ReadOnlyMemory<byte>.Empty, completeWrites: true).AsTask().WaitAsync(Evidence.Timeout);
        await ProcessingTask(incoming).WaitAsync(Evidence.Timeout);
        Evidence.Require(incoming.ConnectionClosed.IsCancellationRequested && fixture.Streams.Single().ConnectionClosed.IsCancellationRequested,
            "Actual native receive completion must cancel its token and the actual registered WebTransport token.");
        fixture.AssertRemoval(outgoing.Id, initialStreams: 1, removed: true);
        var afterAutomaticRemoval = fixture.Snapshot();
        Evidence.Require(!fixture.Remove(outgoing.Id), "After actual callback removal,a separate repeat removal must report false.");
        Evidence.Require(Evidence.Compact(afterAutomaticRemoval) == Evidence.Compact(fixture.Snapshot()), "Native follow-up miss changed owner state.");
        var nativeModules = Process.GetCurrentProcess().Modules.Cast<ProcessModule>()
            .Where(module => module.ModuleName.Equals("msquic.dll", StringComparison.OrdinalIgnoreCase))
            .Select(module => new
            {
                module.ModuleName,
                module.FileName,
                sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(module.FileName)))
            }).ToArray();
        Evidence.Write("native-fin-automatically-removed", new
        {
            caseName = "NativeQuicProbe.ActualQuicFinRemovesAssociatedStreamAsync",
            target = outgoing.Id,
            afterAutomaticRemoval,
            nativeModules,
            automaticRemovalAssertedBeforeAnyDirectTryRemoveCall = true,
            nativeProcessingTaskCompleted = true,
            actualNativeCancellationObserved = true,
            fullNetworkHttp3OrContendedRegistrationProofClaimed = false
        });
        await incoming.DisposeAsync();
        ((IDisposable)incoming).Dispose();
        Console.WriteLine("F002 actual loopback QUIC FIN/QuicStreamContext cancellation ->real HTTP/3 associated WebTransport stream removal passed;hybrid in-memory parent,not full network HTTP/3 or contended-registration proof.");
    }

    private static Task ProcessingTask(ConnectionContext context)
    {
        var field = context.GetType().GetField("_processingTask", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingFieldException(context.GetType().FullName, "_processingTask");

        return (Task)(field.GetValue(context) ?? throw new InvalidOperationException("Actual QUIC processing task missing."));
    }
}
