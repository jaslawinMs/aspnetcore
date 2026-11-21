// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.InternalTesting;
using Microsoft.AspNetCore.NodeServices.Npm;
using Microsoft.AspNetCore.NodeServices.Util;
using Microsoft.Extensions.DiagnosticAdapter;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Xunit;

namespace Microsoft.AspNetCore.SpaServices.Extensions.Tests;

public class NodeScriptRunnerTests
{
    [Theory]
    [InlineData(LogLevel.Information)]
    [InlineData(LogLevel.Error)]
    [InlineData(LogLevel.Critical)]
    [InlineData(LogLevel.None)]
    public async Task AttachToLogger_FiltersAndNormalizesRealNodeOutput(LogLevel minimumLevel)
    {
        var sink = new TestSink();
        using var loggerFactory = LoggerFactory.Create(builder => builder
            .SetMinimumLevel(minimumLevel)
            .AddProvider(new TestLoggerProvider(sink)));
        var logger = new RecordingLogger(loggerFactory.CreateLogger("Microsoft.AspNetCore.SpaServices"));
        using var diagnosticListener = new DiagnosticListener(nameof(NodeScriptRunnerTests));
        var started = new TaskCompletionSource<Process>(TaskCreationOptions.RunContinuationsAsynchronously);
        using var subscription = diagnosticListener.SubscribeWithAdapter(new NodeStartedObserver(started));
        var runner = new NodeScriptRunner(
            Path.Combine(AppContext.BaseDirectory, "NodeScriptRunner"),
            "stderr", null, null, "node", diagnosticListener, CancellationToken.None);
        var process = await started.Task.DefaultTimeout();
        using var errors = new EventedStreamStringReader(runner.StdErr);
        var progressReceived = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var linesReceived = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var stdoutClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var stderrClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var progress = new StringBuilder();
        using var consoleOutput = new StringWriter();
        var originalConsoleOutput = Console.Out;

        try
        {
            Console.SetOut(consoleOutput);
            runner.AttachToLogger(logger);
            runner.StdErr.OnReceivedChunk += chunk =>
            {
                progress.Append(chunk.Array, chunk.Offset, chunk.Count);
                if (progress.ToString() == "progress")
                {
                    progressReceived.TrySetResult();
                }
            };
            runner.StdErr.OnReceivedLine += line =>
            {
                if (line == "\u001b[0m\n")
                {
                    linesReceived.TrySetResult();
                }
            };
            runner.StdOut.OnStreamClosed += () => stdoutClosed.TrySetResult();
            runner.StdErr.OnStreamClosed += () => stderrClosed.TrySetResult();

            await SendCommandAsync(process, "start");
            await progressReceived.Task.DefaultTimeout();
            Assert.Equal("progress", consoleOutput.ToString());
            Assert.Empty(logger.Writes);
            Assert.Empty(sink.Writes);

            await SendCommandAsync(process, "lines");
            await linesReceived.Task.DefaultTimeout();
            await SendCommandAsync(process, "finish");
            await Task.WhenAll(stdoutClosed.Task, stderrClosed.Task, process.WaitForExitAsync()).DefaultTimeout();
            Assert.Equal(0, process.ExitCode);

            string[] rawErrorLines =
            [
                "progress\r\u001b[31mfirst error\u001b[0m\r\n",
                "\n",
                " \t\r\n",
                "plain {Value}\n",
                "\u001b[1;33msecond error\u001b[0m\n",
                "\u001b[0m\n",
                "tail"
            ];
            Assert.Equal(string.Concat(rawErrorLines.Select(line => line + Environment.NewLine)), errors.ReadAsString());
            Assert.EndsWith("tail", consoleOutput.ToString());

            string[] expectedErrors = minimumLevel <= LogLevel.Error
                ? ["progress\rfirst error\r\n", "plain {Value}\n", "second error\n", "\n", "tail"]
                : [];
            string[] expectedOutput = minimumLevel <= LogLevel.Information ? ["stdout\n"] : [];
            Assert.Equal(expectedErrors, logger.Writes.Where(write => write.Level == LogLevel.Error).Select(write => write.Message));
            Assert.Equal(expectedOutput, logger.Writes.Where(write => write.Level == LogLevel.Information).Select(write => write.Message));
            Assert.Equal(expectedErrors, sink.Writes.Where(write => write.LogLevel == LogLevel.Error).Select(write => write.Message));
            Assert.Equal(expectedOutput, sink.Writes.Where(write => write.LogLevel == LogLevel.Information).Select(write => write.Message));
        }
        finally
        {
            Console.SetOut(originalConsoleOutput);
            ((IDisposable)runner).Dispose();
            await process.WaitForExitAsync().DefaultTimeout();
            process.Dispose();
        }
    }

    private static async Task SendCommandAsync(Process process, string command)
    {
        await process.StandardInput.WriteLineAsync(command);
        await process.StandardInput.FlushAsync();
    }

    private sealed class NodeStartedObserver(TaskCompletionSource<Process> started)
    {
        [DiagnosticName("Microsoft.AspNetCore.NodeServices.Npm.NpmStarted")]
        public void OnNpmStarted(Process process)
        {
            started.TrySetResult(process);
        }
    }

    private sealed class RecordingLogger(ILogger logger) : ILogger
    {
        public ConcurrentQueue<(LogLevel Level, string Message)> Writes { get; } = new();

        public IDisposable BeginScope<TState>(TState state) where TState : notnull
        {
            return logger.BeginScope(state);
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return logger.IsEnabled(logLevel);
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception exception, Func<TState, Exception, string> formatter)
        {
            Writes.Enqueue((logLevel, formatter(state, exception)));
            logger.Log(logLevel, eventId, state, exception, formatter);
        }
    }
}
