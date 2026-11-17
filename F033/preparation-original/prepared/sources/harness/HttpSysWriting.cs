// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.HttpSys;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AutoPerf;

internal enum CallbackKind
{
    None,
    Completed,
    PendingSuccess,
    PendingFailure,
    PendingCancellation,
    AlreadyFaulted,
    AlreadyCanceled,
}

internal enum BufferCase
{
    Valid,
    Null,
    NegativeOffset,
    NegativeCount,
    PastEnd,
}

internal sealed class WritePlan : IDisposable
{
    internal static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
    internal static readonly byte[] SuccessPayload = Encoding.ASCII.GetBytes("returned|after");
    internal static readonly byte[] FailurePayload = Encoding.ASCII.GetBytes("caught|after");
    internal static readonly byte[] EmptyBuffer = CreateBuffer(0);
    internal const int BufferOffset = 3;
    private static readonly byte[] SmallBuffer = CreateBuffer(128);
    private static readonly byte[] LargeBuffer = CreateBuffer(4096);
    private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly CancellationTokenSource _cancellation = new();
    private Task? _callbackTask;
    private int _invocationFinished;
    private HttpContext? _context;
    private ContextSnapshot? _completedContext;

    private sealed record ContextSnapshot(string StreamType, string StreamOwner, bool HasStarted, bool HeadersReadOnly);

    internal required string Profile { get; init; }
    internal CallbackKind Callback { get; init; } = CallbackKind.Completed;
    internal bool Async { get; init; }
    internal bool Live { get; init; }
    internal bool AllowSynchronousIO { get; init; } = true;
    internal int PayloadLength { get; init; } = 128;
    internal BufferCase Arguments { get; init; }
    internal InvalidOperationException ExpectedFailure { get; } = new("F033 controlled OnStarting failure.");
    internal TaskCompletionSource CallbackEntered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal TaskCompletionSource LiveReady { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal TaskCompletionSource ReleaseLive { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal TaskCompletionSource ApplicationFinished { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal ConcurrentQueue<string> CallbackOrder { get; } = new();
    internal Thread? CallingThread { get; set; }
    internal Task? ActualAsyncWriteTask { get; set; }
    internal Task? ActualCallbackTask => Volatile.Read(ref _callbackTask);
    internal bool InvocationFinished => Volatile.Read(ref _invocationFinished) != 0;
    internal bool InvocationSucceeded { get; private set; }
    internal Exception? InvocationError { get; private set; }
    internal bool? HeadersReadOnlyAfterInvocation { get; private set; }
    internal HttpContext Context => _context ?? throw new InvalidOperationException("Actual accepted request has not entered the application.");
    internal CancellationToken ProducerToken => _cancellation.Token;
    internal byte[] OperationBuffer => PayloadLength switch
    {
        0 => EmptyBuffer,
        128 => SmallBuffer,
        4096 => LargeBuffer,
        _ => throw new InvalidOperationException("Undeclared ranged operation payload."),
    };

    internal static WritePlan Create(string profile) => profile switch
    {
        "Request.Sync.None.128" => new() { Profile = profile, Callback = CallbackKind.None },
        "Request.Sync.Ready.128" => new() { Profile = profile },
        "Request.Sync.Ready.4096" => new() { Profile = profile, PayloadLength = 4096 },
        "Request.Async.Ready.128" => new() { Profile = profile, Async = true },
        "Live.Sync.Started.Zero" => new() { Profile = profile, Live = true },
        "Live.Async.Started.Zero" => new() { Profile = profile, Live = true, Async = true },
        _ => throw new InvalidOperationException("Undeclared actual profile: " + profile),
    };

    private static byte[] CreateBuffer(int payloadLength)
    {
        var buffer = new byte[payloadLength + 2 * BufferOffset];
        Array.Fill(buffer, (byte)0xD6);
        buffer.AsSpan(BufferOffset, payloadLength).Fill((byte)'w');

        return buffer;
    }

    private void InvokeSynchronousWrite()
    {
        var buffer = Arguments is BufferCase.Null ? null! : OperationBuffer;
        var offset = Arguments is BufferCase.NegativeOffset ? -1 : BufferOffset;
        var count = Arguments switch
        {
            BufferCase.NegativeCount => -1,
            BufferCase.PastEnd => OperationBuffer.Length,
            _ => PayloadLength,
        };
        Context.Response.Body.Write(buffer, offset, count);
    }

    internal void Release()
    {
        if (Callback is CallbackKind.PendingFailure)
        {
            _release.TrySetException(ExpectedFailure);
        }
        else if (Callback is CallbackKind.PendingCancellation)
        {
            _cancellation.Cancel();
            _release.TrySetCanceled(ProducerToken);
        }
        else
        {
            _release.TrySetResult();
        }
        ReleaseLive.TrySetResult();
    }

    private Task OnStarting(HttpContext context)
    {
        CallbackOrder.Enqueue("new-enter");
        Task task;
        if (Callback is CallbackKind.AlreadyFaulted)
        {
            task = Task.FromException(ExpectedFailure);
        }
        else if (Callback is CallbackKind.AlreadyCanceled)
        {
            _cancellation.Cancel();
            task = Task.FromCanceled(ProducerToken);
        }
        else if (Callback is CallbackKind.Completed)
        {
            CompleteCallback(context);
            task = Task.CompletedTask;
        }
        else
        {
            task = AwaitProducerAsync(context);
        }
        Volatile.Write(ref _callbackTask, task);
        CallbackEntered.TrySetResult();

        return task;
    }

    private async Task AwaitProducerAsync(HttpContext context)
    {
        await _release.Task.ConfigureAwait(false);
        CompleteCallback(context);
    }

    private void CompleteCallback(HttpContext context)
    {
        context.Response.Headers["X-AutoPerf-Starting"] = "ready";
        CallbackOrder.Enqueue("new-exit");
    }

    internal async Task ExecuteAsync(HttpContext context)
    {
        _context = context;
        Evidence.Require(context.Response.Body.GetType().FullName == "Microsoft.AspNetCore.Server.HttpSys.ResponseStream",
            "Require the actual accepted-request ResponseStream, not a replaced or fabricated response.");
        var bodyControl = context.Features.GetRequiredFeature<IHttpBodyControlFeature>();
        Evidence.Require(!bodyControl.AllowSynchronousIO, "Preserve and observe the actual default synchronous-IO setting.");
        bodyControl.AllowSynchronousIO = AllowSynchronousIO;
        context.Response.ContentType = "text/plain";
        if (Callback is not CallbackKind.None)
        {
            context.Response.OnStarting(() =>
            {
                CallbackOrder.Enqueue("old");
                context.Response.Headers["X-AutoPerf-Order"] = string.Join(",", CallbackOrder);

                return Task.CompletedTask;
            });
            context.Response.OnStarting(() => OnStarting(context));
        }

        CallingThread = Thread.CurrentThread;
        try
        {
            if (Async)
            {
                Evidence.Require(Arguments is BufferCase.Valid, "Invalid argument characterization targets the synchronous array Write entry.");
                ActualAsyncWriteTask = context.Response.Body.WriteAsync(OperationBuffer.AsMemory(BufferOffset, PayloadLength),
                    CancellationToken.None).AsTask();
                await ActualAsyncWriteTask.ConfigureAwait(false);
            }
            else
            {
                InvokeSynchronousWrite();
            }
            InvocationSucceeded = true;
        }
        catch (InvalidOperationException error) when (ReferenceEquals(error, ExpectedFailure) || !AllowSynchronousIO)
        {
            InvocationError = error;
        }
        catch (OperationCanceledException error) when (error.CancellationToken == ProducerToken)
        {
            InvocationError = error;
        }
        catch (ArgumentException error) when (Arguments is not BufferCase.Valid)
        {
            InvocationError = error;
        }
        finally
        {
            HeadersReadOnlyAfterInvocation = context.Response.Headers.IsReadOnly;
            Volatile.Write(ref _invocationFinished, 1);
        }

        if (Live)
        {
            Evidence.Require(InvocationSucceeded && context.Response.HasStarted && context.Response.Headers.IsReadOnly,
                "The prepared live request must really have started and locked its headers.");
            LiveReady.TrySetResult();
            await ReleaseLive.Task.ConfigureAwait(false);
        }
        var payload = InvocationSucceeded ? SuccessPayload : FailurePayload;
        await context.Response.Body.WriteAsync(payload.AsMemory()).ConfigureAwait(false);
        _completedContext = ReadContext();
    }

    private ContextSnapshot ReadContext() => new(Context.Response.Body.GetType().FullName ??
        throw new InvalidOperationException("Actual stream type absent."), Context.Response.Body.GetType().Assembly.Location,
        Context.Response.HasStarted, Context.Response.Headers.IsReadOnly);

    internal object Capture()
    {
        var context = _completedContext ?? ReadContext();

        return new
        {
            profile = Profile,
            callback = Callback.ToString(),
            actualStreamType = context.StreamType,
            actualStreamOwner = context.StreamOwner,
            actualPublicHasStarted = context.HasStarted,
            actualHeadersReadOnly = context.HeadersReadOnly,
            actualCallbackTaskIncomplete = ActualCallbackTask is { IsCompleted: false },
            actualPublicInvocationFinished = InvocationFinished,
            actualPublicInvocationSucceeded = InvocationSucceeded,
            actualPublicErrorType = InvocationError?.GetType().FullName,
            actualArgumentParameter = (InvocationError as ArgumentException)?.ParamName,
            actualBufferCase = Arguments.ToString(),
            actualFailureReferencePreserved = ReferenceEquals(InvocationError, ExpectedFailure),
            actualProducerTokenPreserved = InvocationError is OperationCanceledException canceled && canceled.CancellationToken == ProducerToken,
            actualHeadersReadOnlyAfterInvocation = HeadersReadOnlyAfterInvocation,
            actualCallbackOrder = CallbackOrder.ToArray(),
            actualAsyncWriteReturnedIncomplete = ActualAsyncWriteTask is { IsCompleted: false },
            actualApplicationFinished = ApplicationFinished.Task.IsCompleted,
            actualAllowSynchronousIO = AllowSynchronousIO,
            actualOperationPayloadLength = PayloadLength,
            actualOperationBufferOffset = BufferOffset,
            actualLive = Live,
            requestAbortProducerTest = false,
            harnessTaskWaitInsideSynchronousServerCall = false,
        };
    }

    public void Dispose()
    {
        _cancellation.Dispose();
    }
}

internal sealed class HttpSysFixture : IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, WritePlan> _plans = new();
    private readonly IHost _host;
    private readonly HttpClient _client;
    private int _sequence;
    private Uri? _address;

    internal HttpSysFixture()
    {
        _host = new HostBuilder().ConfigureWebHost(webHost => webHost.UseHttpSys(options =>
            {
                options.UrlPrefixes.Add(UrlPrefix.Create("http", "localhost", "0", string.Empty));
                options.MaxAccepts = 1;
            }).Configure(app => app.Run(HandleAsync))).Build();
        _client = new HttpClient(new SocketsHttpHandler { UseProxy = false, MaxConnectionsPerServer = 1 })
        {
            Timeout = WritePlan.Timeout,
            DefaultRequestVersion = HttpVersion.Version11,
            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionExact,
        };
    }

    internal async Task StartAsync()
    {
        await _host.StartAsync().ConfigureAwait(false);
        var address = _host.Services.GetRequiredService<IServer>().Features.GetRequiredFeature<IServerAddressesFeature>().Addresses.Single();
        _address = new Uri(address);
        Evidence.Write("actual-listener-started", new
        {
            actualAddress = address,
            actualPort = _address.Port,
            actualUniqueEphemeralLoopback = _address.IsLoopback && _address.Port != 0,
            actualMaxAccepts = 1,
            actualNativeHostStarted = true,
        });
        Evidence.Require(_address.IsLoopback && _address.Port != 0, "Own only a unique actual ephemeral loopback listener.");
    }

    internal RequestHandle Begin(WritePlan plan)
    {
        var address = _address ?? throw new InvalidOperationException("Actual HTTP.sys host must be started first.");
        var id = Interlocked.Increment(ref _sequence).ToString(CultureInfo.InvariantCulture);
        Evidence.Require(_plans.TryAdd("/" + id, plan), "Fresh actual request identity required.");
        var request = new HttpRequestMessage(HttpMethod.Get, new Uri(address, id));
        var response = _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

        return new RequestHandle(this, "/" + id, plan, request, response);
    }

    private async Task HandleAsync(HttpContext context)
    {
        var route = context.Request.Path.Value ?? throw new InvalidOperationException("Actual request path absent.");
        Evidence.Require(_plans.TryGetValue(route, out var plan), "Undeclared actual loopback request.");
        var actual = plan ?? throw new InvalidOperationException("Actual declared plan absent.");
        try
        {
            await actual.ExecuteAsync(context).ConfigureAwait(false);
            actual.ApplicationFinished.TrySetResult();
        }
        catch (Exception error)
        {
            actual.ApplicationFinished.TrySetException(error);
            throw;
        }
    }

    internal void Remove(string id, WritePlan plan)
    {
        Evidence.Require(_plans.TryRemove(id, out var actual) && ReferenceEquals(actual, plan),
            "Remove only the owned completed request.");
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            foreach (var plan in _plans.Values)
            {
                plan.Release();
            }
            await Task.WhenAll(_plans.Values.Select(plan => plan.ApplicationFinished.Task)).WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
        }
        finally
        {
            _client.Dispose();
            using var timeout = new CancellationTokenSource(WritePlan.Timeout);
            try
            {
                await _host.StopAsync(timeout.Token).ConfigureAwait(false);
            }
            finally
            {
                _host.Dispose();
            }
        }
        Evidence.Write("actual-listener-disposed", new { actualHostStoppedAndDisposed = true, actualRemainingRequests = _plans.Count });
    }
}

internal sealed class RequestHandle : IAsyncDisposable
{
    private readonly HttpSysFixture _fixture;
    private readonly string _id;
    private readonly HttpRequestMessage _request;
    private Task<int>? _consumption;
    internal WritePlan Plan { get; }
    internal Task<HttpResponseMessage> Headers { get; }
    internal bool ActualWireSuccess { get; private set; }
    private byte[]? _actualWirePayload;
    internal string? ActualWireStartingHeader { get; private set; }
    internal string? ActualWireOrderHeader { get; private set; }

    internal RequestHandle(HttpSysFixture fixture, string id, WritePlan plan,
        HttpRequestMessage request, Task<HttpResponseMessage> response)
    {
        _fixture = fixture;
        _id = id;
        Plan = plan;
        _request = request;
        Headers = response;
    }

    internal Task<int> ConsumeAsync() => _consumption ??= ConsumeCoreAsync();

    private async Task<int> ConsumeCoreAsync()
    {
        using var response = await Headers.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
        var body = await response.Content.ReadAsByteArrayAsync().WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
        await Plan.ApplicationFinished.Task.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
        Evidence.Require(response.StatusCode == HttpStatusCode.OK && response.Version == HttpVersion.Version11,
            "Actual loopback HTTP status or protocol differs.");
        var operationLength = Plan.InvocationSucceeded ? Plan.PayloadLength : 0;
        var suffix = Plan.InvocationSucceeded ? WritePlan.SuccessPayload : WritePlan.FailurePayload;
        Evidence.Require(body.Length == operationLength + suffix.Length &&
            body.AsSpan(0, operationLength).SequenceEqual(Plan.OperationBuffer.AsSpan(WritePlan.BufferOffset, operationLength)) &&
            body.AsSpan(operationLength).SequenceEqual(suffix),
            "Actual complete ranged write and caller-continuation wire payload differs.");
        ActualWireStartingHeader = response.Headers.TryGetValues("X-AutoPerf-Starting", out var starting) ? starting.Single() : null;
        ActualWireOrderHeader = response.Headers.TryGetValues("X-AutoPerf-Order", out var order) ? order.Single() : null;
        _actualWirePayload = body;
        ActualWireSuccess = true;

        return body.Length;
    }

    internal object Capture() => new
    {
        actualPlan = Plan.Capture(),
        actualWireSuccess = ActualWireSuccess,
        actualWirePayloadBytes = _actualWirePayload?.Length,
        actualWirePayloadSha256 = _actualWirePayload is null ? null :
            Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(_actualWirePayload)),
        actualWireStartingHeader = ActualWireStartingHeader,
        actualWireOrderHeader = ActualWireOrderHeader,
    };

    public async ValueTask DisposeAsync()
    {
        Plan.Release();
        try
        {
            await ConsumeAsync().ConfigureAwait(false);
        }
        finally
        {
            _request.Dispose();
            _fixture.Remove(_id, Plan);
            Plan.Dispose();
        }
    }
}
