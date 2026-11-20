#nullable enable

using System;
using System.Buffers;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipelines;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.InternalTesting;
using Microsoft.AspNetCore.Server.Kestrel.Core.Internal.WebTransport;
using Microsoft.Extensions.Logging;

namespace Microsoft.AspNetCore.Server.Kestrel.Core.Tests;

[CollectionDefinition(nameof(CompiledSampleConsole010), DisableParallelization = true)]
public sealed class CompiledSampleConsole010
{
}

[Collection(nameof(CompiledSampleConsole010))]
public sealed class CompiledSampleProducerTests : Http3TestBase
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualSample_SeparateWritesRetainStringsAndEchoOriginalBytes(bool bidirectional)
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptAsync(bidirectional);
            var first = await test.WriteAndAssertAsync(input, "AbC!123-and-longer-first");
            await test.WriteAndAssertAsync(input, "Short");
            if (!bidirectional)
            {
                Assert.Equal("AbC!123-and-longer-first", Assert.Single(first));
            }
            Assert.Single(test.StreamIds);
        });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualSample_PayloadAbove4096TraversesRealReads(bool bidirectional)
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptAsync(bidirectional);
            var payload = new string(Enumerable.Range(0, 9000).Select(i => (char)('!' + i % 90)).ToArray());
            var chunks = await test.WriteAndAssertAsync(input, payload);
            if (!bidirectional)
            {
                Assert.True(chunks.Count >= 3);
                Assert.All(chunks, chunk => Assert.InRange(chunk.Length, 1, 4096));
            }
        });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualSample_IndependentStreamIdsAndHandlerOwnership(bool bidirectional)
    {
        await RunCase(async test =>
        {
            var first = await test.AcceptAsync(bidirectional);
            var second = await test.AcceptAsync(bidirectional);
            await test.WriteAndAssertAsync(first, "First-stream-ABC");
            await test.WriteAndAssertAsync(second, "Second-stream-xyz");
            await test.WriteAndAssertAsync(first, "First-again");
            Assert.Equal(2, test.StreamIds.Count);
            Assert.Equal(2, test.StreamIds.Distinct().Count());
        });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualSample_ExactInitiateCommandProducesRealOutboundStream(bool bidirectional)
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptAsync(bidirectional);
            await test.WriteAndAssertAsync(input, "initiate stream");
            Assert.False(Http3Api.MultiplexedConnectionContext.ToClientAcceptQueue.Reader.TryRead(out _));
            await test.WriteAndAssertAsync(input, "Initiate Stream");
            var outbound = await Http3Api.MultiplexedConnectionContext.ToClientAcceptQueue.Reader.ReadAsync().AsTask().DefaultTimeout();
            var expected = new byte[] { 0x40, 0x54, 0x00 }
                .Concat("Created a new stream from the client and sent this message then closing the stream."u8.ToArray()).ToArray();
            Assert.Equal(expected, await ReadExactlyAsync(outbound.Pair.Application.Input, expected.Length));
            Assert.Equal(1, Http3Api.Connection.WebTransportSessionCount);
            await test.WriteAndAssertAsync(input, "ordinary-after-command");
        });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualSample_ExactAbortCommandRemovesRealSession(bool bidirectional)
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptAsync(bidirectional);
            await test.WriteAndAssertAsync(input, "abort");
            await input.Wire.Pair.Application.Output.WriteAsync("Abort"u8.ToArray());
            var exception = await test.ObserveHandlerFaultAsync(input);
            Assert.IsType<InvalidOperationException>(exception);
            Assert.Equal(0, Http3Api.Connection.WebTransportSessionCount);
            Assert.Null(await test.Session.AcceptStreamAsync(CancellationToken.None));
        });
    }

    private async Task RunCase(Func<ProducerCase, Task> action)
    {
        var handlers = LoadActualSampleHandlers();
        Http3Api._serviceContext.ServerOptions.EnableWebTransportAndH3Datagrams = true;
        var exitSession = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var originalOutput = Console.Out;
        using var received = new ReceivedMessages();
        ProducerCase? test = null;
        try
        {
            Console.SetOut(received);
            var session = await WebTransportTestUtilities.GenerateSession(Http3Api, exitSession);
            test = new ProducerCase(Http3Api, session, received.Reader, handlers.Uni, handlers.Bi);
            await action(test);
        }
        finally
        {
            try
            {
                if (test is not null)
                {
                    await test.StopHandlersAsync();
                }
            }
            finally
            {
                exitSession.TrySetResult();
                Console.SetOut(originalOutput);
                if (Http3Api.MultiplexedConnectionContext is not null)
                {
                    Http3Api.MultiplexedConnectionContext.Abort(new ConnectionAbortedException("F147/F149 artifact teardown"));
                    await Http3Api._connectionTask.DefaultTimeout();
                }
            }
        }
    }

    private (Func<IWebTransportSession, ConnectionContext, Task> Uni,
        Func<IWebTransportSession, ConnectionContext, Task> Bi) LoadActualSampleHandlers()
    {
        var samplePath = Environment.GetEnvironmentVariable("PROBE010_SAMPLE_PATH")!;
        var sampleHash = Environment.GetEnvironmentVariable("PROBE010_SAMPLE_SHA256")!;
        var coreHash = Environment.GetEnvironmentVariable("PROBE010_CORE_SHA256")!;
        Assert.False(string.IsNullOrEmpty(samplePath));
        Assert.Equal(sampleHash, Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(samplePath))));
        var sample = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.GetFullPath(samplePath));
        Assert.Equal("WebTransportInteractiveSampleApp", sample.GetName().Name);
        Assert.Equal(Path.GetFullPath(samplePath), sample.Location, StringComparer.OrdinalIgnoreCase);
        var program = sample.GetType("Program", throwOnError: true)!;
        var methods = program.GetMethods(BindingFlags.Static | BindingFlags.NonPublic);
        var uni = Assert.Single(methods, method => method.Name.Contains("g__handleUnidirectionalStream|", StringComparison.Ordinal));
        var bi = Assert.Single(methods, method => method.Name.Contains("g__handleBidirectionalStream|", StringComparison.Ordinal));
        Assert.Same(sample, uni.DeclaringType!.Assembly);
        Assert.Same(sample, bi.DeclaringType!.Assembly);
        var core = typeof(KestrelServerOptions).Assembly;
        Assert.Equal(coreHash, Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(core.Location))));
        var runtime = Path.GetFileName(Path.GetDirectoryName(typeof(object).Assembly.Location)!);
        Assert.Equal("12.0.0-alpha.1.26557.102", runtime);
        Logger.LogInformation("ACTUAL_SAMPLE path={Path} sha256={Hash} mvid={Mvid} uni={Uni} bi={Bi}",
            sample.Location, sampleHash, sample.ManifestModule.ModuleVersionId, uni.Name, bi.Name);
        foreach (var assembly in new[] { sample, core, typeof(CompiledSampleProducerTests).Assembly, typeof(TestContext).Assembly, typeof(object).Assembly })
        {
            Logger.LogInformation("ACTUAL_LOADED name={Name} path={Path} sha256={Hash} mvid={Mvid}",
                assembly.GetName().Name, assembly.Location,
                Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
                assembly.ManifestModule.ModuleVersionId);
        }
        foreach (ProcessModule module in Process.GetCurrentProcess().Modules)
        {
            if (module.ModuleName is "hostfxr.dll" or "hostpolicy.dll" or "coreclr.dll" or "dotnet.exe" or "testhost.exe")
            {
                Logger.LogInformation("ACTUAL_HOST module={Name} path={Path} sha256={Hash} version={Version} rollForward={RollForward}",
                    module.ModuleName, module.FileName,
                    Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(module.FileName))),
                    module.FileVersionInfo.FileVersion, Environment.GetEnvironmentVariable("DOTNET_ROLL_FORWARD"));
            }
        }

        return (uni.CreateDelegate<Func<IWebTransportSession, ConnectionContext, Task>>(),
            bi.CreateDelegate<Func<IWebTransportSession, ConnectionContext, Task>>());
    }

    private static async Task<byte[]> ReadExactlyAsync(PipeReader reader, int length)
    {
        var result = new byte[length];
        await reader.AsStream(leaveOpen: true).ReadExactlyAsync(result).AsTask().DefaultTimeout();

        return result;
    }

    private sealed record AcceptedInput(Http3StreamBase Wire, bool Bidirectional, Task Handler);

    private sealed class ProducerCase(
        Http3InMemory http3,
        WebTransportSession session,
        ChannelReader<string> received,
        Func<IWebTransportSession, ConnectionContext, Task> uni,
        Func<IWebTransportSession, ConnectionContext, Task> bi)
    {
        private readonly List<AcceptedInput> _inputs = [];
        private readonly HashSet<Task> _alreadyAwaited = [];

        internal WebTransportSession Session => session;
        internal List<long> StreamIds { get; } = [];

        internal async Task<AcceptedInput> AcceptAsync(bool bidirectional)
        {
            var accepting = session.AcceptStreamAsync(CancellationToken.None);
            Http3StreamBase wire;
            if (bidirectional)
            {
                var context = new TestStreamContext(canRead: true, canWrite: true, http3);
                context.Initialize(http3.GetStreamId(0x00));
                wire = new Http3StreamBase(context);
                var header = new byte[VariableLengthIntegerHelper.GetByteCount(0x41) + VariableLengthIntegerHelper.GetByteCount(session.SessionId)];
                var written = VariableLengthIntegerHelper.WriteInteger(header, 0x41);
                VariableLengthIntegerHelper.WriteInteger(header.AsSpan(written), session.SessionId);
                await wire.Pair.Application.Output.WriteAsync(header);
                await http3.MultiplexedConnectionContext.ToServerAcceptQueue.Writer.WriteAsync(context);
            }
            else
            {
                wire = await WebTransportTestUtilities.CreateUnidirectionalStream(http3, 0x54, session.SessionId);
            }
            var stream = await accepting.AsTask().DefaultTimeout();
            Assert.NotNull(stream);
            Assert.IsType<WebTransportStream>(stream);
            var direction = stream.Features.GetRequiredFeature<IStreamDirectionFeature>();
            Assert.True(direction.CanRead);
            Assert.Equal(bidirectional, direction.CanWrite);
            var id = stream.Features.GetRequiredFeature<IStreamIdFeature>().StreamId;
            Assert.Equal(wire.StreamContext.StreamId, id);
            StreamIds.Add(id);
            var input = new AcceptedInput(wire, bidirectional, (bidirectional ? bi : uni)(session, stream));
            _inputs.Add(input);

            return input;
        }

        internal async Task<List<string>> WriteAndAssertAsync(AcceptedInput input, string expected)
        {
            var bytes = Encoding.ASCII.GetBytes(expected);
            await input.Wire.Pair.Application.Output.WriteAsync(bytes);
            var chunks = new List<string>();
            if (input.Bidirectional)
            {
                var echoed = await ReadExactlyAsync(input.Wire.Pair.Application.Input, bytes.Length);
                for (var start = 0; start < bytes.Length; start += 4096)
                {
                    bytes.AsSpan(start, Math.Min(4096, bytes.Length - start)).Reverse();
                }
                Assert.Equal(bytes, echoed);
            }
            else
            {
                var text = new StringBuilder();
                while (text.Length < expected.Length)
                {
                    var message = await received.ReadAsync().AsTask().DefaultTimeout();
                    Assert.NotEmpty(message);
                    chunks.Add(message);
                    text.Append(message);
                }
                Assert.Equal(expected, text.ToString());
            }

            return chunks;
        }

        internal async Task<Exception?> ObserveHandlerFaultAsync(AcceptedInput input)
        {
            var exception = await Record.ExceptionAsync(() => input.Handler.DefaultTimeout());
            Assert.True(input.Handler.IsCompleted);
            _alreadyAwaited.Add(input.Handler);

            return exception;
        }

        internal async Task StopHandlersAsync()
        {
            foreach (var input in _inputs)
            {
                input.Wire.StreamContext.Abort(new ConnectionAbortedException("F147/F149 artifact input teardown"));
            }
            await Task.WhenAll(_inputs.Select(async input =>
            {
                if (!_alreadyAwaited.Contains(input.Handler))
                {
                    try
                    {
                        await input.Handler.DefaultTimeout();
                    }
                    catch (ConnectionAbortedException)
                    {
                    }
                }
                Assert.True(input.Handler.IsCompleted);
            }));
        }
    }

    private sealed class ReceivedMessages : TextWriter
    {
        private readonly Channel<string> _messages = Channel.CreateUnbounded<string>();
        private bool _expectMessage;

        public override Encoding Encoding => Encoding.UTF8;
        internal ChannelReader<string> Reader => _messages.Reader;

        public override void WriteLine(string? value)
        {
            if (_expectMessage)
            {
                _expectMessage = false;
                _messages.Writer.TryWrite(value ?? string.Empty);
            }
            else if (value is "RECEIVED FROM CLIENT:")
            {
                _expectMessage = true;
            }
        }
    }
}
