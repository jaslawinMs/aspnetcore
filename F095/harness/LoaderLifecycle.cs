using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Razor.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Moq;

[assembly: RazorCompiledItem(typeof(AutoPerf.LoaderPage), "mvc.1.0.razor-page", "/Pages/LoaderProbe.cshtml")]

namespace AutoPerf;

public sealed class LoaderPage : Page
{
    public LoaderPage Model => this;
    public override Task ExecuteAsync() => Task.CompletedTask;
    public void OnGet() { }
}

internal sealed record LoaderSnapshot(string Profile, string Caller, string OwnerType, string CompilerType,
    bool SameDiInstance, bool SameCachedTask, bool SameCachedResult, bool ActualCompiledItem,
    bool FreshResultDistinctFromPrimedResult, int ActualCompilerCalls, string PageType, string HandlerType,
    string EndpointType, string Route, int HandlerCount, bool? SyncObservedWaiting, bool? AsyncReturnedPending,
    bool? NoResultBeforeRelease);

#pragma warning disable CS0618 // Exercise the retained obsolete interface deliberately.
internal sealed class LoaderLifecycle : IDisposable
{
    public static readonly string[] Profiles = ["CachedOriginal", "CompiledSelf", "FreshPrecompiled", "GatedPrecompiled"];
    private readonly string _profile;
    private readonly ServiceProvider _provider;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F095");
    private readonly PageLoader _modern;
    private readonly IPageLoader _legacy;
    private readonly IViewCompiler _realCompiler;
    private readonly CompilerExtension _extension;
    private readonly LoaderCoordinator? _coordinator;
    private readonly PageActionDescriptor _cachedInput;
    private readonly CompiledPageActionDescriptor _cachedResult;
    private readonly Task<CompiledPageActionDescriptor> _cachedTask;
    private CompiledPageActionDescriptor? _lastCapturedFreshResult;
    public LoaderSnapshot Last { get; private set; } = null!;

    public LoaderLifecycle(string profile)
    {
        _profile = profile;
        if (!Profiles.Contains(profile, StringComparer.Ordinal))
        {
            throw new ArgumentException("Unknown actual loader profile.", nameof(profile));
        }
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(value => value.ApplicationName).Returns(typeof(LoaderPage).Assembly.GetName().Name!);
        environment.SetupGet(value => value.EnvironmentName).Returns("Development");
        environment.SetupGet(value => value.ContentRootPath).Returns(AppContext.BaseDirectory);
        environment.SetupGet(value => value.WebRootPath).Returns(AppContext.BaseDirectory);
        environment.SetupGet(value => value.ContentRootFileProvider).Returns(new NullFileProvider());
        environment.SetupGet(value => value.WebRootFileProvider).Returns(new NullFileProvider());
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(environment.Object);
        services.AddSingleton(_diagnostics);
        services.AddSingleton<DiagnosticSource>(_diagnostics);
        var part = new CompiledRazorAssemblyPart(typeof(LoaderPage).Assembly);
        var item = ((IRazorCompiledItemProvider)part).CompiledItems.Single();
        if (item.Type != typeof(LoaderPage) || item.Kind != "mvc.1.0.razor-page" || item.Identifier != "/Pages/LoaderProbe.cshtml")
        {
            throw new InvalidOperationException("Actual RazorCompiledItemLoader did not produce the typed page catalog entry.");
        }
        services.AddRazorPages().ConfigureApplicationPartManager(parts =>
        {
            parts.ApplicationParts.Clear();
            parts.ApplicationParts.Add(part);
        });
        var compilerDescriptor = services.Single(descriptor => descriptor.ServiceType == typeof(IViewCompilerProvider));
        var compilerType = compilerDescriptor.ImplementationType ??
            throw new InvalidOperationException("Expected real default compiler type registration.");
        services.Remove(compilerDescriptor);
        services.AddSingleton(compilerType);
        services.AddSingleton(provider => new CompilerExtension(((IViewCompilerProvider)provider.GetRequiredService(compilerType)).GetCompiler()));
        services.AddSingleton<IViewCompilerProvider>(provider => provider.GetRequiredService<CompilerExtension>());
        _provider = services.BuildServiceProvider();
        _extension = _provider.GetRequiredService<CompilerExtension>();
        _realCompiler = _extension.RealCompiler;
        _modern = _provider.GetRequiredService<PageLoader>();
        _legacy = _provider.GetRequiredService<IPageLoader>();
        if (!ReferenceEquals(_modern, _legacy) ||
            _modern.GetType().FullName != "Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.DefaultPageLoader" ||
            _realCompiler.GetType().FullName != "Microsoft.AspNetCore.Mvc.Razor.Compilation.DefaultViewCompiler")
        {
            throw new InvalidOperationException("Actual registered loader/default compiled-item producer missing.");
        }
        _cachedInput = Input();
        _cachedTask = _modern.LoadAsync(_cachedInput, EndpointMetadataCollection.Empty);
        _cachedResult = _cachedTask.GetAwaiter().GetResult();
        if (!_cachedTask.IsCompletedSuccessfully ||
            !ReferenceEquals(_cachedTask, _modern.LoadAsync(_cachedInput, EndpointMetadataCollection.Empty)))
        {
            throw new InvalidOperationException("Actual producer did not cache its real completed task.");
        }
        _modern.LoadAsync(_cachedResult, EndpointMetadataCollection.Empty).GetAwaiter().GetResult();
        if (profile == "GatedPrecompiled")
        {
            _coordinator = new LoaderCoordinator();
        }
        Validate(_cachedResult);
    }

    internal static PageActionDescriptor Input() => new()
    {
        RelativePath = "/Pages/LoaderProbe.cshtml",
        ViewEnginePath = "/LoaderProbe",
        AttributeRouteInfo = new AttributeRouteInfo { Template = "/loader-probe" },
        RouteValues = new Dictionary<string, string?> { ["page"] = "/LoaderProbe" }
    };

    private PageActionDescriptor NextInput() => _profile switch
    {
        "CachedOriginal" => _cachedInput,
        "CompiledSelf" => _cachedResult,
        _ => Input()
    };

    public int RunSync(bool obsoleteCaller, bool capture = false)
    {
        using var gate = _coordinator is null ? null : new LoaderGate(Thread.CurrentThread, asyncCaller: false, _coordinator);
        _extension.Arm(gate);
        var compilerCalls = _extension.CompileCount;
        var input = NextInput();
        var result = obsoleteCaller ? _legacy.Load(input) :
            _modern.LoadAsync(input, EndpointMetadataCollection.Empty).GetAwaiter().GetResult();
        return Complete(input, result, obsoleteCaller ? "LegacyBridge" : "ModernWait", gate, capture, compilerCalls);
    }

    public async Task<int> RunAsync(bool capture = false)
    {
        using var gate = _coordinator is null ? null : new LoaderGate(Thread.CurrentThread, asyncCaller: true, _coordinator);
        _extension.Arm(gate);
        var compilerCalls = _extension.CompileCount;
        var input = NextInput();
        var task = _modern.LoadAsync(input, EndpointMetadataCollection.Empty);
        if (gate is not null)
        {
            if (!gate.Entered.IsSet || task.IsCompleted)
            {
                throw new InvalidOperationException("Actual modern loader did not return before compiler release.");
            }
            gate.AsyncReturnedPending = true;
            gate.AsyncCallerReturned.Set();
        }
        var result = await task;
        return Complete(input, result, "ModernAsync", gate, capture, compilerCalls);
    }

    private int Complete(PageActionDescriptor input, CompiledPageActionDescriptor result, string caller, LoaderGate? gate, bool capture, int compilerCallsBefore)
    {
        if (capture)
        {
            Validate(result);
            var task = _modern.LoadAsync(input, EndpointMetadataCollection.Empty);
            if (!task.IsCompletedSuccessfully || !ReferenceEquals(task.GetAwaiter().GetResult(), result) ||
                !ReferenceEquals(task, _modern.LoadAsync(input, EndpointMetadataCollection.Empty)))
            {
                throw new InvalidOperationException("Actual task/result caching contract differs.");
            }
            var cached = _profile is "CachedOriginal" or "CompiledSelf";
            if (cached && !ReferenceEquals(result, _cachedResult))
            {
                throw new InvalidOperationException("Warmed real result identity differs.");
            }
            var compilerCalls = _extension.CompileCount - compilerCallsBefore;
            if (compilerCalls != (cached ? 0 : 1) ||
                (!cached && (ReferenceEquals(result, _cachedResult) || ReferenceEquals(result, _lastCapturedFreshResult))))
            {
                throw new InvalidOperationException("Actual cold compiler invocation/new compiled descriptor producer not reached.");
            }
            if (!cached)
            {
                _lastCapturedFreshResult = result;
            }
            Last = new LoaderSnapshot(_profile, caller, _modern.GetType().FullName!, _realCompiler.GetType().FullName!,
                true, true, cached, true, !cached, compilerCalls, result.PageTypeInfo!.FullName!, result.HandlerTypeInfo!.FullName!,
                result.Endpoint!.GetType().FullName!, ((RouteEndpoint)result.Endpoint).RoutePattern.RawText!,
                result.HandlerMethods.Count, gate?.SyncObservedWaiting, gate?.AsyncReturnedPending, gate?.NoResultBeforeRelease);
        }
        if (gate is not null && (!gate.Release.Task.IsCompletedSuccessfully || !gate.NoResultBeforeRelease ||
            (caller == "ModernAsync" ? !gate.AsyncReturnedPending : !gate.SyncObservedWaiting)))
        {
            throw new InvalidOperationException("Actual gated compiler/caller ordering not reached.");
        }
        return result.HandlerMethods.Count;
    }

    private static void Validate(CompiledPageActionDescriptor result)
    {
        if (result.PageTypeInfo?.AsType() != typeof(LoaderPage) || result.HandlerTypeInfo?.AsType() != typeof(LoaderPage) ||
            result.Endpoint is not RouteEndpoint endpoint || endpoint.RoutePattern.RawText != "/loader-probe" ||
            result.HandlerMethods.Count != 1 || result.HandlerMethods[0].MethodInfo.Name != nameof(LoaderPage.OnGet) ||
            !ReferenceEquals(endpoint.Metadata.GetMetadata<CompiledPageActionDescriptor>(), result))
        {
            throw new InvalidOperationException("Actual typed page/default application models/endpoint/handler metadata differs.");
        }
    }

    internal PageLoader Modern => _modern;
    internal IPageLoader Legacy => _legacy;
    internal CompilerExtension Extension => _extension;
    internal PageActionDescriptor CachedInput => _cachedInput;
    internal CompiledPageActionDescriptor CachedResult => _cachedResult;

    public void Dispose()
    {
        _coordinator?.Dispose();
        _diagnostics.Dispose();
        _provider.Dispose();
    }
}
#pragma warning restore CS0618

internal sealed class CompilerExtension(IViewCompiler realCompiler) : IViewCompilerProvider, IViewCompiler
{
    private LoaderGate? _gate;
    public int CompileCount { get; private set; }
    public IViewCompiler RealCompiler { get; } = realCompiler;
    public IViewCompiler GetCompiler() => this;
    public void Arm(LoaderGate? gate) => _gate = gate;
    public Task<CompiledViewDescriptor> CompileAsync(string relativePath)
    {
        CompileCount++;
        var actual = RealCompiler.CompileAsync(relativePath);
        return _gate is { } gate ? CompileGated(actual, gate) : actual;
    }

    private static async Task<CompiledViewDescriptor> CompileGated(Task<CompiledViewDescriptor> actual, LoaderGate gate)
    {
        gate.Entered.Set();
        await gate.Release.Task;
        if (gate.Fail)
        {
            throw new CompilerFailure();
        }
        return await actual;
    }
}

internal sealed class CompilerFailure : Exception
{
    public CompilerFailure() : base("actual compiler extension failed") { }
}

internal sealed class LoaderGate : IDisposable
{
    public readonly ManualResetEventSlim Entered = new();
    public readonly ManualResetEventSlim AsyncCallerReturned = new();
    public readonly TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public readonly Thread Caller;
    public readonly bool AsyncCaller;
    public bool SyncObservedWaiting;
    public bool AsyncReturnedPending;
    public bool NoResultBeforeRelease;
    public bool Fail;
    public bool Cancel;
    public LoaderGate(Thread caller, bool asyncCaller, LoaderCoordinator coordinator)
    {
        Caller = caller;
        AsyncCaller = asyncCaller;
        coordinator.Enqueue(this);
    }
    public void Dispose()
    {
        Entered.Dispose();
        AsyncCallerReturned.Dispose();
    }
}

internal sealed class LoaderCoordinator : IDisposable
{
    private readonly BlockingCollection<LoaderGate> _queue = new();
    private readonly Thread _thread;
    public LoaderCoordinator()
    {
        _thread = new Thread(Run) { IsBackground = true, Name = "AutoPerf.F095.CompilerProducer" };
        _thread.Start();
    }
    public void Enqueue(LoaderGate gate) => _queue.Add(gate);
    private void Run()
    {
        foreach (var gate in _queue.GetConsumingEnumerable())
        {
            try
            {
                if (!gate.Entered.Wait(TimeSpan.FromSeconds(10)))
                {
                    throw new TimeoutException("Actual compiler extension was never reached.");
                }
                if (gate.AsyncCaller)
                {
                    if (!gate.AsyncCallerReturned.Wait(TimeSpan.FromSeconds(10)))
                    {
                        throw new TimeoutException("Actual modern async loader never returned pending.");
                    }
                }
                else
                {
                    if (!SpinWait.SpinUntil(() => (gate.Caller.ThreadState & System.Threading.ThreadState.WaitSleepJoin) != 0,
                        TimeSpan.FromSeconds(10)))
                    {
                        throw new TimeoutException("Actual synchronous loader caller never waited.");
                    }
                    gate.SyncObservedWaiting = true;
                }
                gate.NoResultBeforeRelease = !gate.Release.Task.IsCompleted;
                if (gate.Cancel)
                {
                    gate.Release.SetCanceled(new CancellationToken(canceled: true));
                }
                else
                {
                    gate.Release.SetResult();
                }
            }
            catch (Exception exception)
            {
                gate.Release.TrySetException(exception);
            }
        }
    }
    public void Dispose()
    {
        _queue.CompleteAdding();
        if (!_thread.Join(TimeSpan.FromSeconds(10)))
        {
            throw new TimeoutException("Owned compiler producer thread did not stop.");
        }
        _queue.Dispose();
    }
}
