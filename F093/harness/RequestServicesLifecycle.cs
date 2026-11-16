using System.Net;
using System.Security.Cryptography;
using System.Threading.Tasks.Sources;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

public enum ResourceKind { Empty, Sync, Async, Dual, Source }

public sealed record DisposalProfile(string Name, ResourceKind Kind, int Count)
{
    public override string ToString() => Name;
}

public sealed class CallState
{
    public RequestServicesFeature? Owner { get; set; }
    public IServiceProvider? Provider { get; set; }
    public string OwnerType { get; set; } = "";
    public string ProviderType { get; set; } = "";
    public int Created;
    public int SyncCalls;
    public int AsyncCalls;
    public int CompletedCalls;
    public int SourceResults;
    public bool ExplicitSync { get; init; }
    public bool Fail { get; init; }
    public ManualResetEventSlim? PendingEntered { get; init; }
    public TaskCompletionSource<bool>? Release { get; init; }
    public TaskCompletionSource<bool> ResponseCompleted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public bool ActualResponseCallback { get; set; }
    public bool RootStillAlive { get; set; }
    public bool ProviderCleared { get; set; }
    public string Body { get; set; } = "";
    public int Status { get; set; }
}

public sealed class CurrentCall
{
    private CallState? _call;

    public void Set(CallState call)
    {
        if (_call is not null)
        {
            throw new InvalidOperationException("Previous actual lifecycle is not released.");
        }
        _call = call;
    }

    public CallState Get() => _call ?? throw new InvalidOperationException("No active actual request.");

    public void Clear(CallState call)
    {
        if (!ReferenceEquals(_call, call))
        {
            throw new InvalidOperationException("Actual lifecycle identity changed.");
        }
        _call = null;
    }
}

public interface ITracked { }
public sealed class RootMarker { }

public abstract class TrackedResource(CallState state) : ITracked
{
    protected readonly CallState State = Record(state);

    private static CallState Record(CallState state)
    {
        Interlocked.Increment(ref state.Created);
        return state;
    }
}

public sealed class SyncResource(CallState state) : TrackedResource(state), IDisposable
{
    public void Dispose()
    {
        Interlocked.Increment(ref State.SyncCalls);
        if (State.Fail)
        {
            throw new InvalidOperationException("actual scoped cleanup failed");
        }
        Interlocked.Increment(ref State.CompletedCalls);
    }
}

public class AsyncResource(CallState state) : TrackedResource(state), IAsyncDisposable
{
    public ValueTask DisposeAsync()
    {
        Interlocked.Increment(ref State.AsyncCalls);
        State.PendingEntered?.Set();
        if (State.Release is not null)
        {
            return new ValueTask(FinishAsync());
        }
        if (State.Fail)
        {
            return ValueTask.FromException(new InvalidOperationException("actual scoped cleanup failed"));
        }
        Interlocked.Increment(ref State.CompletedCalls);
        return default;
    }

    private async Task FinishAsync()
    {
        await State.Release!.Task.ConfigureAwait(false);
        if (State.Fail)
        {
            throw new InvalidOperationException("actual scoped cleanup failed");
        }
        Interlocked.Increment(ref State.CompletedCalls);
    }
}

public sealed class DualResource(CallState state) : AsyncResource(state), IDisposable
{
    public void Dispose()
    {
        Interlocked.Increment(ref State.SyncCalls);
        throw new InvalidOperationException("Actual async scope incorrectly selected synchronous dual cleanup.");
    }
}

public sealed class SourceResource : TrackedResource, IAsyncDisposable, IValueTaskSource
{
    private ManualResetValueTaskSourceCore<bool> _source;

    public SourceResource(CallState state) : base(state)
    {
        _source.RunContinuationsAsynchronously = true;
        _source.SetResult(true);
    }

    public ValueTask DisposeAsync()
    {
        Interlocked.Increment(ref State.AsyncCalls);
        return new ValueTask(this, _source.Version);
    }

    public void GetResult(short token)
    {
        _source.GetResult(token);
        Interlocked.Increment(ref State.SourceResults);
        Interlocked.Increment(ref State.CompletedCalls);
    }

    public ValueTaskSourceStatus GetStatus(short token) => _source.GetStatus(token);
    public void OnCompleted(Action<object?> continuation, object? state, short token, ValueTaskSourceOnCompletedFlags flags) =>
        _source.OnCompleted(continuation, state, token, flags);
}

public sealed class RequestServicesLifecycle : IDisposable
{
    private readonly DisposalProfile _profile;
    private readonly CurrentCall _current = new();
    private readonly ServiceProvider _root;
    private readonly TestServer _server;
    private readonly HttpClient _client;

    public RequestServicesLifecycle(DisposalProfile profile)
    {
        _profile = profile;
        var services = new ServiceCollection();
        ConfigureServices(services);
        _root = services.BuildServiceProvider();
        _server = new TestServer(new WebHostBuilder().ConfigureServices(ConfigureServices).Configure(app => app.Run(ProcessAsync)));
        _client = _server.CreateClient();
    }

    private void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton(_current);
        services.AddSingleton<RootMarker>();
        for (var i = 0; i < _profile.Count; i++)
        {
            services.AddScoped<ITracked>(_ => _profile.Kind switch
            {
                ResourceKind.Sync => new SyncResource(_current.Get()),
                ResourceKind.Async => new AsyncResource(_current.Get()),
                ResourceKind.Dual => new DualResource(_current.Get()),
                ResourceKind.Source => new SourceResource(_current.Get()),
                _ => throw new InvalidOperationException("Empty scope must not register a resource.")
            });
        }
    }

    public CallState Prepare(CallState? state = null)
    {
        state ??= new CallState();
        _current.Set(state);
        var context = new DefaultHttpContext { ServiceScopeFactory = _root.GetRequiredService<IServiceScopeFactory>() };
        Populate(context, state);
        return state;
    }

    private static void Populate(HttpContext context, CallState state)
    {
        var provider = context.RequestServices;
        if (context.Features.Get<IServiceProvidersFeature>() is not RequestServicesFeature owner)
        {
            throw new InvalidOperationException("Actual DefaultHttpContext did not create the expected public owner.");
        }
        state.Owner = owner;
        state.Provider = provider;
        state.OwnerType = owner.GetType().FullName!;
        state.ProviderType = provider.GetType().FullName!;
        _ = provider.GetServices<ITracked>().ToArray();
    }

    public void End(CallState state) => _current.Clear(state);

    public CallState RunPrepared(bool synchronous)
    {
        var state = Prepare();
        if (synchronous)
        {
            state.Owner!.Dispose();
        }
        else
        {
            var task = state.Owner!.DisposeAsync();
            if (!task.IsCompletedSuccessfully)
            {
                throw new InvalidOperationException("Prepared completed-disposal control became pending.");
            }
            task.GetAwaiter().GetResult();
        }
        CaptureAndValidate(state, publicRequest: false);
        End(state);
        return state;
    }

    private async Task ProcessAsync(HttpContext context)
    {
        var state = _current.Get();
        context.Response.OnCompleted(static item =>
        {
            var call = (CallState)item;
            call.ActualResponseCallback = true;
            call.ProviderCleared = call.Owner!.RequestServices is null;
            call.ResponseCompleted.TrySetResult(true);
            return Task.CompletedTask;
        }, state);
        Populate(context, state);
        if (state.ExplicitSync)
        {
            state.Owner!.Dispose();
        }
        await context.Response.WriteAsync("ok");
    }

    public async Task<CallState> RunPublicAsync(bool explicitSync, CallState? state = null)
    {
        state ??= new CallState { ExplicitSync = explicitSync };
        _current.Set(state);
        using var response = await _client.GetAsync("/", HttpCompletionOption.ResponseContentRead);
        state.Status = (int)response.StatusCode;
        state.Body = await response.Content.ReadAsStringAsync();
        await state.ResponseCompleted.Task.WaitAsync(TimeSpan.FromSeconds(10));
        CaptureAndValidate(state, publicRequest: true);
        End(state);
        return state;
    }

    public void CaptureAndValidate(CallState state, bool publicRequest)
    {
        state.ProviderCleared = state.Owner!.RequestServices is null;
        state.RootStillAlive = _root.GetRequiredService<RootMarker>() is not null &&
            _server.Services.GetRequiredService<RootMarker>() is not null;
        var expectedSync = _profile.Kind is ResourceKind.Sync ? _profile.Count : 0;
        var expectedAsync = _profile.Kind is ResourceKind.Async or ResourceKind.Dual or ResourceKind.Source ? _profile.Count : 0;
        var expectedSource = _profile.Kind is ResourceKind.Source ? _profile.Count : 0;
        if (state.Created != _profile.Count || state.CompletedCalls != _profile.Count ||
            state.SyncCalls != expectedSync || state.AsyncCalls != expectedAsync || state.SourceResults != expectedSource ||
            !state.ProviderCleared || !state.RootStillAlive ||
            state.OwnerType != typeof(RequestServicesFeature).FullName ||
            !state.ProviderType.StartsWith("Microsoft.Extensions.DependencyInjection.", StringComparison.Ordinal) ||
            (publicRequest && (!state.ActualResponseCallback || state.Status != (int)HttpStatusCode.OK || state.Body != "ok")))
        {
            throw new InvalidOperationException("Actual owner/scope/cleanup/reference/public-response contract failed.");
        }
    }

    public object Receipt(CallState state, string method) => new
    {
        method,
        profile = _profile.Name,
        owner_sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(RequestServicesFeature).Assembly.Location))),
        harness_sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(RequestServicesLifecycle).Assembly.Location))),
        process_id = Environment.ProcessId,
        kind = _profile.Kind.ToString(),
        count = _profile.Count,
        state.OwnerType,
        state.ProviderType,
        state.Created,
        state.SyncCalls,
        state.AsyncCalls,
        state.CompletedCalls,
        state.SourceResults,
        state.ProviderCleared,
        state.RootStillAlive,
        state.ActualResponseCallback,
        state.Status,
        state.Body,
        actual_default_http_context_and_di_scope = true
    };

    public void Dispose()
    {
        _client.Dispose();
        _server.Dispose();
        _root.Dispose();
    }
}
