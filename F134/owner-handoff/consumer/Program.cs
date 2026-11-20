using System.Net.WebSockets;
using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf.Characterization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Microsoft.Net.Http.Headers;

if (args.Length != 2 || args[0] != "--verify-only")
{
    Console.Error.WriteLine("Only --verify-only PAYLOAD is supported. No measurement mode exists.");
    return 2;
}

var support = ProbeSupport.Load(
    [args[1]],
    "F134",
    "Microsoft.AspNetCore.TestHost",
    "Microsoft.AspNetCore.Hosting",
    "Microsoft.AspNetCore.Http",
    "Microsoft.AspNetCore.Http.Abstractions",
    "Microsoft.AspNetCore.WebSockets",
    "Microsoft.Net.Http.Headers");

VerifyOwnerSource(args[1]);
WriteRuntimeEvidence();
var passed = 0;
try
{
    await HandshakeAsync("F134.HandshakeEmpty", [], [], null);
    await HandshakeAsync("F134.HandshakeOne", ["alpha"], ["alpha"], "alpha");
    await HandshakeAsync("F134.HandshakeSeveral", ["alpha", "bravo"], ["alpha", "bravo"], "bravo");
    await HandshakeAsync("F134.UnrequestedSelection", ["alpha", "bravo"], ["alpha", "bravo"], "charlie");
    await HandshakeAsync("F134.DuplicateOffers", ["alpha", "alpha"], ["alpha", "alpha"], "alpha");
    await RejectionAsync("F134.RejectedHandshakeEmpty", [], 400, "Incomplete handshake, status code: 400");
    await RejectionAsync("F134.RejectedHandshakeNonempty", ["alpha"], 400, "Incomplete handshake, status code: 400");
    await RejectionAsync("F134.Status101WithoutAccept", [], 101, "Incomplete handshake");
    await ApplicationExceptionAsync();
    await HandshakeAsync("F134.ConfigureRequestOverride", ["alpha"], ["bravo"], "bravo", overrideHeader: true);
    support.VerifyLoadedSourceOwners();
    ProbeSupport.Require(passed == 10, "Incomplete fixed acceptance matrix.");
    ProbeSupport.Write(new { findingId = "F134", kind = "verification-complete", cases = passed, skipped = 0, mode = "verify-only" });
    return 0;
}
catch (Exception exception)
{
    ProbeSupport.Write(new { findingId = "F134", kind = "verification-failed", completedCases = passed, exception = exception.ToString() });
    return 1;
}

async Task HandshakeAsync(string id, string[] offered, string[] expectedRequested, string? selected, bool overrideHeader = false)
{
    using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(60));
    var token = cancellation.Token;
    var observed = new TaskCompletionSource<HandshakeObservation>(TaskCreationOptions.RunContinuationsAsynchronously);
    var completed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    byte[] payload = [17, 34, 51];
    using var host = CreateHost(async context =>
    {
        try
        {
            var requested = context.WebSockets.WebSocketRequestedProtocols.ToArray();
            var headerPresent = context.Request.Headers.ContainsKey(HeaderNames.SecWebSocketProtocol);
            using var socket = await context.WebSockets.AcceptWebSocketAsync(selected);
            observed.SetResult(new HandshakeObservation(headerPresent, requested, socket.SubProtocol));
            await socket.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Binary, true, token);
            await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "F134", token);
            var close = await socket.ReceiveAsync(new ArraySegment<byte>(new byte[8]), token);
            ProbeSupport.Require(close.MessageType == WebSocketMessageType.Close && close.CloseStatus == WebSocketCloseStatus.NormalClosure, id + ": server close differs.");
            completed.SetResult();
        }
        catch (Exception exception)
        {
            observed.TrySetException(exception);
            completed.TrySetException(exception);
            throw;
        }
    });
    await host.StartAsync(token);
    var client = host.GetTestServer().CreateWebSocketClient();
    Populate(client, offered);
    var overrideObservedGeneratedHeader = false;
    if (overrideHeader)
    {
        client.ConfigureRequest = request =>
        {
            overrideObservedGeneratedHeader = request.Headers[HeaderNames.SecWebSocketProtocol].ToArray().SequenceEqual(offered);
            request.Headers[HeaderNames.SecWebSocketProtocol] = "bravo";
        };
    }

    using var socket = await client.ConnectAsync(new Uri("wss://localhost/probe"), token);
    var observation = await observed.Task.WaitAsync(token);
    ProbeSupport.Require(observation.HeaderPresent == (expectedRequested.Length != 0), id + ": header presence differs.");
    ProbeSupport.Require(observation.RequestedProtocols.SequenceEqual(expectedRequested), id + ": requested protocol contents/order differ.");
    ProbeSupport.Require(socket.SubProtocol == selected && observation.AcceptedProtocol == selected, id + ": client/server selected protocol differs.");
    ProbeSupport.Require(client.SubProtocols.SequenceEqual(offered), id + ": client list changed.");
    if (overrideHeader)
    {
        ProbeSupport.Require(overrideObservedGeneratedHeader, id + ": ConfigureRequest did not observe the generated header.");
    }

    var buffer = new byte[16];
    var received = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
    ProbeSupport.Require(received.MessageType == WebSocketMessageType.Binary && received.EndOfMessage && received.Count == payload.Length, id + ": binary message boundary differs.");
    ProbeSupport.Require(buffer.AsSpan(0, received.Count).SequenceEqual(payload), id + ": exact payload differs.");
    var closed = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
    ProbeSupport.Require(closed.MessageType == WebSocketMessageType.Close && closed.CloseStatus == WebSocketCloseStatus.NormalClosure && closed.CloseStatusDescription == "F134", id + ": client close differs.");
    await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "F134", token);
    await completed.Task.WaitAsync(token);
    await host.StopAsync(token);
    Pass(id, new { offered, observation.HeaderPresent, observation.RequestedProtocols, clientProtocol = socket.SubProtocol, serverProtocol = observation.AcceptedProtocol, payload, normalTwoSidedClose = true, overrideObservedGeneratedHeader });
}

async Task RejectionAsync(string id, string[] offered, int statusCode, string expectedMessage)
{
    using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(60));
    var token = cancellation.Token;
    var observed = new TaskCompletionSource<HandshakeObservation>(TaskCreationOptions.RunContinuationsAsynchronously);
    using var host = CreateHost(context =>
    {
        observed.SetResult(new HandshakeObservation(
            context.Request.Headers.ContainsKey(HeaderNames.SecWebSocketProtocol),
            context.WebSockets.WebSocketRequestedProtocols.ToArray(),
            null));
        context.Response.StatusCode = statusCode;
        return Task.CompletedTask;
    });
    await host.StartAsync(token);
    var client = host.GetTestServer().CreateWebSocketClient();
    Populate(client, offered);
    Exception? actual = null;
    try
    {
        using var unexpectedSocket = await client.ConnectAsync(new Uri("ws://localhost/reject"), token);
    }
    catch (Exception exception)
    {
        actual = exception;
    }

    ProbeSupport.Require(actual?.GetType() == typeof(InvalidOperationException) && actual.Message == expectedMessage, id + ": exception type/message differs.");
    var observation = await observed.Task.WaitAsync(token);
    ProbeSupport.Require(observation.HeaderPresent == (offered.Length != 0) && observation.RequestedProtocols.SequenceEqual(offered), id + ": producer input not observed at the real endpoint.");
    await host.StopAsync(token);
    Pass(id, new { offered, observation.HeaderPresent, observation.RequestedProtocols, exceptionType = actual!.GetType().FullName, actual.Message });
}

async Task ApplicationExceptionAsync()
{
    const string id = "F134.ApplicationException";
    using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(60));
    var token = cancellation.Token;
    var expected = new InvalidDataException("F134 real endpoint failure");
    var observed = false;
    using var host = CreateHost(context =>
    {
        observed = context.WebSockets.IsWebSocketRequest;
        throw expected;
    });
    await host.StartAsync(token);
    var client = host.GetTestServer().CreateWebSocketClient();
    Populate(client, ["alpha"]);
    Exception? actual = null;
    try
    {
        using var unexpectedSocket = await client.ConnectAsync(new Uri("ws://localhost/fault"), token);
    }
    catch (Exception exception)
    {
        actual = exception;
    }

    ProbeSupport.Require(observed && ReferenceEquals(actual, expected), id + ": real endpoint exception was not propagated unchanged.");
    await host.StopAsync(token);
    Pass(id, new { exceptionType = actual!.GetType().FullName, actual.Message, sameExceptionObject = true, actualEndpointRan = observed });
}

void Pass(string id, object observation)
{
    passed++;
    ProbeSupport.Write(new { findingId = "F134", kind = "case", id, passed = true, observation });
}

static IHost CreateHost(RequestDelegate application)
{
    return new HostBuilder().ConfigureWebHost(webHost =>
    {
        webHost.UseTestServer().Configure(app =>
        {
            app.UseWebSockets();
            app.Run(application);
        });
    }).Build();
}

static void Populate(WebSocketClient client, string[] protocols)
{
    ProbeSupport.Require(client.SubProtocols.GetType() == typeof(List<string>), "The actual TestHost client is no longer backed by its owned List<string>.");
    foreach (var protocol in protocols)
    {
        client.SubProtocols.Add(protocol);
    }
}

static void WriteRuntimeEvidence()
{
    var assembly = typeof(Enumerable).Assembly;
    ProbeSupport.Write(new
    {
        kind = "runtime-proof",
        runtime = RuntimeInformation.FrameworkDescription,
        architecture = RuntimeInformation.ProcessArchitecture.ToString(),
        processId = Environment.ProcessId,
        linqAssembly = assembly.Location,
        linqSha256 = ProbeSupport.HashFile(assembly.Location),
        linqInformationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    });
    var method = typeof(Enumerable).GetMethods(BindingFlags.Public | BindingFlags.Static)
        .Single(candidate => candidate.Name == nameof(Enumerable.Any) && candidate.GetParameters().Length == 1)
        .MakeGenericMethod(typeof(string));
    var bytes = method.GetMethodBody()?.GetILAsByteArray() ?? throw new InvalidOperationException("Enumerable.Any IL unavailable.");
    var codes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field.FieldType == typeof(OpCode))
        .Select(field => (OpCode)field.GetValue(null)!)
        .ToDictionary(code => unchecked((ushort)code.Value));
    var instructions = new List<object>();
    var index = 0;
    while (index < bytes.Length)
    {
        var offset = index;
        ushort value = bytes[index++];
        if (value == 0xfe)
        {
            value = (ushort)(0xfe00 | bytes[index++]);
        }

        var code = codes[value];
        var size = code.OperandType switch
        {
            OperandType.InlineNone => 0,
            OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
            OperandType.InlineVar => 2,
            OperandType.InlineI8 or OperandType.InlineR => 8,
            OperandType.InlineSwitch => 4 + 4 * BitConverter.ToInt32(bytes, index),
            _ => 4
        };
        string? member = null;
        if (code.OperandType is OperandType.InlineMethod or OperandType.InlineType or OperandType.InlineField or OperandType.InlineTok)
        {
            member = method.Module.ResolveMember(BitConverter.ToInt32(bytes, index), null, [typeof(string)])?.ToString();
        }

        instructions.Add(new { offset, op = code.Name, member });
        index += size;
    }

    ProbeSupport.Write(new { kind = "linq-any-il", method = method.ToString(), instructions, boundary = "Inspection of the loaded platform IL only; not a JIT, allocation, or gain result." });
}

static void VerifyOwnerSource(string payloadPath)
{
    using var payloadDocument = JsonDocument.Parse(File.ReadAllText(payloadPath));
    var payload = payloadDocument.RootElement;
    string Required(string name) => payload.GetProperty(name).GetString() ?? throw new InvalidDataException(name);
    var owner = typeof(WebSocketClient).Assembly;
    var source = Required("ownerSourcePath");
    var pdbPath = Required("ownerPdbPath");
    ProbeSupport.Require(ProbeSupport.HashFile(owner.Location).Equals(Required("ownerPeSha256"), StringComparison.OrdinalIgnoreCase), "Owner PE changed.");
    ProbeSupport.Require(ProbeSupport.HashFile(pdbPath).Equals(Required("ownerPdbSha256"), StringComparison.OrdinalIgnoreCase), "Owner portable PDB changed.");
    ProbeSupport.Require(ProbeSupport.HashFile(source).Equals(Required("ownerSourceSha256"), StringComparison.OrdinalIgnoreCase), "Physical owner source changed.");
    using var peStream = File.OpenRead(owner.Location);
    using var pe = new PEReader(peStream);
    var debugEntry = pe.ReadDebugDirectory().Single(entry => entry.Type == DebugDirectoryEntryType.CodeView);
    var codeView = pe.ReadCodeViewDebugDirectoryData(debugEntry);
    using var pdbStream = File.OpenRead(pdbPath);
    using var provider = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
    var metadata = provider.GetMetadataReader();
    var id = new BlobContentId(metadata.DebugMetadataHeader!.Id);
    ProbeSupport.Require(id.Guid == codeView.Guid && id.Stamp == debugEntry.Stamp, "Owner PE/PDB identity mismatch.");
    var document = metadata.Documents.Select(handle => metadata.GetDocument(handle))
        .Single(document => metadata.GetString(document.Name).Replace('\\', '/').EndsWith("/src/Hosting/TestHost/src/WebSocketClient.cs", StringComparison.OrdinalIgnoreCase));
    ProbeSupport.Require(metadata.GetGuid(document.HashAlgorithm) == new Guid("8829d00f-11b8-4213-878b-770e8597ac16"), "Expected SHA256 source document.");
    var sourceBytes = File.ReadAllBytes(source);
    ProbeSupport.Require(SHA256.HashData(sourceBytes).AsSpan().SequenceEqual(metadata.GetBlobBytes(document.Hash)), "PDB source checksum mismatch.");
    ProbeSupport.Require(
        File.ReadAllText(source).Replace("\r\n", "\n") == File.ReadAllText(Required("sourceSnapshotPath")).Replace("\r\n", "\n"),
        "Physical owner source and pinned Git source differ beyond line endings.");
    ProbeSupport.Write(new
    {
        kind = "owner-source-proof",
        sourceRevision = Required("sourceRevision"),
        actualLoadedOwner = owner.Location,
        ownerModuleVersionId = owner.ManifestModule.ModuleVersionId,
        ownerPeSha256 = ProbeSupport.HashFile(owner.Location),
        portablePdb = pdbPath,
        portablePdbGuid = id.Guid,
        pePdbGuidAndStampMatch = true,
        physicalSource = source,
        sourceSha256 = ProbeSupport.HashFile(source),
        portablePdbSourceDocument = metadata.GetString(document.Name),
        pdbSourceChecksumMatches = true,
        pinnedGitSourceEqualIgnoringLineEndings = true
    });
}

internal sealed record HandshakeObservation(bool HeaderPresent, string[] RequestedProtocols, string? AcceptedProtocol);
