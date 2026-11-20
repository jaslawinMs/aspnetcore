// Artifact-only producer characterization; never a native QUIC/WebTransport claim.
#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

namespace Microsoft.AspNetCore.Server.Kestrel.Core.Tests;

[CollectionDefinition(nameof(F146SampleConsole), DisableParallelization = true)]
public sealed class F146SampleConsole
{
}

[Collection(nameof(F146SampleConsole))]
public sealed class F146ManagedProducerTests : Http3TestBase
{
    [Fact]
    public async Task ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler()
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptInputAsync();
            await test.WriteAndAssertAsync(input, "first-write");
            await test.WriteAndAssertAsync(input, "second-write");
            Assert.Single(test.AcceptedStreamIds);
        });
    }

    [Fact]
    public async Task ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads()
    {
        await RunCase(async test =>
        {
            var input = await test.AcceptInputAsync();
            var chunks = await test.WriteAndAssertAsync(input, new string('x', 9000));
            Assert.True(chunks.Count >= 3);
            Assert.All(chunks, chunk => Assert.InRange(chunk.Length, 1, 4096));
            Assert.Single(test.AcceptedStreamIds);
        });
    }

    [Fact]
    public async Task ManagedHttp3_IndependentInputStreamsReachIndependentHandlers()
    {
        await RunCase(async test =>
        {
            var first = await test.AcceptInputAsync();
            await test.WriteAndAssertAsync(first, "stream-one");
            var second = await test.AcceptInputAsync();
            await test.WriteAndAssertAsync(second, "stream-two");
            Assert.Equal(2, test.AcceptedStreamIds.Count);
            Assert.Equal(2, test.AcceptedStreamIds.Distinct().Count());
        });
    }

    private async Task RunCase(Func<ProducerCase, Task> action)
    {
        AssertSourceBuiltOwner();
        Http3Api._serviceContext.ServerOptions.EnableWebTransportAndH3Datagrams = true;
        var exitSession = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var originalOutput = Console.Out;
        var received = new ReceivedMessages();
        ProducerCase? test = null;
        try
        {
            Console.SetOut(received);
            var session = await WebTransportTestUtilities.GenerateSession(Http3Api, exitSession);
            test = new ProducerCase(Http3Api, session, received.Reader);
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
                received.Dispose();
            }
        }
    }

    private static void AssertSourceBuiltOwner()
    {
        var expectedPath = Environment.GetEnvironmentVariable("F146_EXPECTED_KESTREL_CORE_PATH");
        var expectedHash = Environment.GetEnvironmentVariable("F146_EXPECTED_KESTREL_CORE_SHA256");
        Assert.False(string.IsNullOrWhiteSpace(expectedPath));
        Assert.False(string.IsNullOrWhiteSpace(expectedHash));
        var actualPath = typeof(KestrelServerOptions).Assembly.Location;
        Assert.Equal(Path.GetFullPath(expectedPath!), Path.GetFullPath(actualPath), StringComparer.OrdinalIgnoreCase);
        Assert.Equal(expectedHash!.ToUpperInvariant(), Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(actualPath))));
        var expectedRuntime = Environment.GetEnvironmentVariable("F146_EXPECTED_CORE_RUNTIME_VERSION");
        Assert.False(string.IsNullOrWhiteSpace(expectedRuntime));
        var actualRuntime = Path.GetFileName(Path.GetDirectoryName(typeof(object).Assembly.Location)!);
        Assert.Equal(expectedRuntime, actualRuntime);
    }

    private sealed class ProducerCase(Http3InMemory http3, WebTransportSession session, ChannelReader<string> received)
    {
        private readonly List<Http3StreamBase> _inputs = [];
        private readonly List<Task> _handlers = [];

        internal List<long> AcceptedStreamIds { get; } = [];

        internal async Task<Http3StreamBase> AcceptInputAsync()
        {
            var accepting = session.AcceptStreamAsync(CancellationToken.None);
            var input = await WebTransportTestUtilities.CreateUnidirectionalStream(http3, 0x54, session.SessionId);
            _inputs.Add(input);
            var stream = await accepting.AsTask().DefaultTimeout();
            Assert.NotNull(stream);
            Assert.IsType<WebTransportStream>(stream);
            var direction = stream.Features.GetRequiredFeature<IStreamDirectionFeature>();
            Assert.True(direction.CanRead);
            Assert.False(direction.CanWrite);
            AcceptedStreamIds.Add(stream.Features.GetRequiredFeature<IStreamIdFeature>().StreamId);
            _handlers.Add(F146SampleHandler.Run(session, stream));

            return input;
        }

        internal async Task<List<string>> WriteAndAssertAsync(Http3StreamBase input, string expected)
        {
            await input.Pair.Application.Output.WriteAsync(Encoding.ASCII.GetBytes(expected));
            var chunks = new List<string>();
            var result = new StringBuilder();
            while (result.Length < expected.Length)
            {
                var message = await received.ReadAsync().AsTask().DefaultTimeout();
                Assert.NotEmpty(message);
                chunks.Add(message);
                result.Append(message);
            }

            Assert.Equal(expected, result.ToString());

            return chunks;
        }

        internal async Task StopHandlersAsync()
        {
            foreach (var input in _inputs)
            {
                input.StreamContext.Abort(new ConnectionAbortedException("F146 artifact producer teardown"));
            }

            foreach (var handler in _handlers)
            {
                try
                {
                    await handler.DefaultTimeout();
                }
                catch (ConnectionAbortedException)
                {
                }

                Assert.True(handler.IsCompleted);
            }
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
