// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.InternalTesting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Core.Internal;
using Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks;

/// <summary>
/// Measures transport-manager graceful drain with real connection execution and completion.
/// </summary>
[MemoryDiagnoser]
public class TransportConnectionManagerBenchmark
{
    private ServiceContext _service = default!;
    private TransportConnectionManager _manager = default!;
    private TaskCompletionSource _applicationRelease = default!;
    private KestrelConnection<ConnectionContext>[] _connections = [];
    private Task[] _executions = [];
    private int _requested;
    private bool _closeResult;

    [Params(0, 1, 16, 256)]
    public int ConnectionCount { get; set; }

    [GlobalSetup]
    public void SetupService()
    {
        var trace = new KestrelTrace(NullLoggerFactory.Instance);
        var connections = new ConnectionManager(trace, ResourceCounter.Unlimited);
        _service = TestContextFactory.CreateServiceContext(new KestrelServerOptions(), connectionManager: connections);
    }

    [IterationSetup]
    public void PrepareConnections()
    {
        if (_executions.Any(execution => !execution.IsCompleted))
        {
            throw new InvalidOperationException("Previous connection delegates did not complete.");
        }

        _manager = new TransportConnectionManager(_service.ConnectionManager);
        _applicationRelease = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _connections = new KestrelConnection<ConnectionContext>[ConnectionCount];
        _executions = new Task[ConnectionCount];
        _requested = 0;
        _closeResult = false;

        for (var i = 0; i < _connections.Length; i++)
        {
            var id = _manager.GetNewConnectionId();
            var transport = new DefaultConnectionContext(id.ToString(CultureInfo.InvariantCulture));
            var connection = new KestrelConnection<ConnectionContext>(id, _service, _manager,
                _ => _applicationRelease.Task, transport, _service.Log, TestContextFactory.CreateMetricsContext(transport));
            connection.ConnectionClosedRequested.Register(static state =>
                Interlocked.Increment(ref ((TransportConnectionManagerBenchmark)state!)._requested), this);
            _connections[i] = connection;
            _manager.AddConnection(id, connection);
            _executions[i] = connection.ExecuteAsync();
        }
    }

    /// <summary>
    /// Requests closure, releases the application delegates, and awaits their actual teardown.
    /// </summary>
    [Benchmark]
    public async Task<bool> GracefulDrain()
    {
        var close = _manager.CloseAllConnectionsAsync(CancellationToken.None);
        _applicationRelease.SetResult();
        _closeResult = await close.ConfigureAwait(false);
        await Task.WhenAll(_executions).ConfigureAwait(false);

        return _closeResult;
    }

    internal object InspectCompletedDrain()
    {
        var remaining = 0;
        _service.ConnectionManager.Walk(_ => remaining++);
        var actualCompletionTasks = _connections.Count(connection => connection.ExecutionTask.IsCompletedSuccessfully);
        var actualDelegates = _executions.Count(execution => execution.IsCompletedSuccessfully);
        if (!_closeResult || _requested != ConnectionCount || actualCompletionTasks != ConnectionCount ||
            actualDelegates != ConnectionCount || remaining != 0)
        {
            throw new InvalidOperationException("Actual connection request, execution or completion boundary differs.");
        }

        return new
        {
            ConnectionCount, ActualCloseRequested = _requested, ActualExecutionTasksCompleted = actualCompletionTasks,
            ActualDelegatesCompleted = actualDelegates, ActualRemainingConnections = remaining,
            ActualCloseResult = _closeResult, ActualPrivateExecutionTaskOrCallbackInjected = false,
            Boundary = "Real Kestrel connection delegates and manager completion; no socket or HTTP application throughput claim."
        };
    }
}
