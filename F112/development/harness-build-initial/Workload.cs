using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

internal delegate object? DeserializeValueDelegate(ReadOnlySpan<byte> data, Type targetType);

internal sealed class Workload : IAsyncDisposable
{
    private const string SessionKey = "autoperf-f112-value";
    private readonly ServiceProvider _services;
    private readonly AsyncServiceScope _scope;
    private readonly Func<IDictionary<string, object?>, byte[]> _serializeData;
    private readonly Func<object?, Type, byte[]> _serializeValue;
    private readonly Func<IDictionary<string, JsonElement>, IDictionary<string, object?>> _deserializeData;
    private readonly DeserializeValueDelegate _deserializeValue;
    private readonly Func<Task> _persist;
    private readonly DefaultHttpContext _context = new();
    private readonly ISession _session;
    private readonly Func<object> _operation;
    private readonly object? _input;
    private readonly Type _declaredType;
    private readonly IDictionary<string, object?> _data;
    private SessionComponent? _component;
    private object? _lastOutput;

    private Workload(CaseSpec spec)
    {
        Spec = spec;
        _input = spec.Create();
        _declaredType = spec.DeclaredType ?? _input?.GetType() ?? typeof(string);
        _data = spec.Mode == "Data" ? _input as IDictionary<string, object?>
            ?? throw new InvalidDataException("Bulk control requires its actual dictionary.") : Cases.Data();
        var services = new ServiceCollection();
        services.AddRazorComponents();
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        services.AddLogging(builder => builder.ClearProviders());
        services.AddDistributedMemoryCache();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddSingleton<IWebHostEnvironment>(new HarnessEnvironment());
        _services = services.BuildServiceProvider();
        _scope = _services.CreateAsyncScope();
        var assembly = typeof(RazorComponentsServiceOptions).Assembly;
        var serializer = _scope.ServiceProvider.GetRequiredService(
            assembly.GetType("Microsoft.AspNetCore.Components.Endpoints.IStoredDataSerializer", throwOnError: true)!);
        var supplier = _scope.ServiceProvider.GetRequiredService(
            assembly.GetType("Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplier", throwOnError: true)!);
        Evidence.Require(serializer.GetType().FullName == "Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializer",
            "The actual registered serializer is required.");
        T Bind<T>(object target, string name, BindingFlags flags) where T : Delegate =>
            (target.GetType().GetMethod(name, flags | BindingFlags.Instance)
                ?? throw new MissingMethodException(target.GetType().FullName, name)).CreateDelegate<T>(target);
        _serializeData = Bind<Func<IDictionary<string, object?>, byte[]>>(serializer, "SerializeData", BindingFlags.Public);
        _serializeValue = Bind<Func<object?, Type, byte[]>>(serializer, "SerializeValue", BindingFlags.Public);
        _deserializeData = Bind<Func<IDictionary<string, JsonElement>, IDictionary<string, object?>>>(serializer, "DeserializeData", BindingFlags.Public);
        _deserializeValue = Bind<DeserializeValueDelegate>(serializer, "DeserializeValue", BindingFlags.Public);
        _persist = Bind<Func<Task>>(supplier, "PersistAllValues", BindingFlags.NonPublic);
        var store = new DistributedSessionStore(
            _services.GetRequiredService<IDistributedCache>(), _services.GetRequiredService<ILoggerFactory>());
        _session = store.Create("F112-isolated-session", TimeSpan.FromMinutes(20), TimeSpan.FromSeconds(10),
            static () => true, isNewSessionKey: true);
        _context.Session = _session;
        _context.RequestServices = _scope.ServiceProvider;
        _context.Request.Scheme = "http";
        _context.Request.Host = new HostString("127.0.0.1");
        _context.Request.Path = "/f112-renderer-setup";
        _context.Request.Method = HttpMethods.Get;
        _context.Response.Body = new MemoryStream();
        Evidence.Require(_session.IsAvailable && _session.GetType() == typeof(DistributedSession), "A loaded real DistributedSession is required.");
        _operation = spec.Mode switch
        {
            "Data" => () => _serializeData(_data),
            "Value" => () => _serializeValue(_input, _declaredType),
            "Session" => () => _persist(),
            _ => throw new InvalidDataException("Unknown explicit case mode."),
        };
        Binding = new
        {
            serializer = serializer.GetType().AssemblyQualifiedName, supplier = supplier.GetType().AssemblyQualifiedName,
            session = _session.GetType().AssemblyQualifiedName, cache = _services.GetRequiredService<IDistributedCache>().GetType().AssemblyQualifiedName,
            serializeValueMethod = _serializeValue.Method.ToString(), persistMethod = _persist.Method.ToString(),
            publicRendererEntry = typeof(RazorComponentResult<SessionComponent>).AssemblyQualifiedName,
            internalPersistBoundOnceOutsideTimingByHarnessOnly = true, noDirectCallbackRegistrationOrSyntheticComponentState = true,
            establishedSessionCallback = "Explicit true factory callback;canonical browser separately proves real SessionMiddleware/HTTP establishment.",
            timedBoundary = "Synchronous actual getter/SerializeValue/DistributedSession.Set;Task already completed on return. Public result rendering creates real subscriptions outside timing;it does not itself persist. No session commit,cache I/O or HTTP rendering is timed.",
        };
    }

    internal static async Task<Workload> CreateAsync(CaseSpec spec)
    {
        var workload = new Workload(spec);
        var parameters = new Dictionary<string, object?>
        {
            [nameof(SessionComponent.Input)] = workload._input,
            [nameof(SessionComponent.Capture)] = (Action<SessionComponent>)(value => workload._component = value),
        };
        await new RazorComponentResult<SessionComponent>(parameters) { PreventStreamingRendering = true }.ExecuteAsync(workload._context);
        Evidence.Require(workload._component is not null && ReferenceEquals(workload._component.Value, workload._input),
            "The real public renderer must create/initialize the component and supply its state.");
        Evidence.Require(Encoding.UTF8.GetString(((MemoryStream)workload._context.Response.Body).ToArray()).Contains("f112-component", StringComparison.Ordinal),
            "The actual public renderer must produce component HTML.");
        Evidence.Require(!workload._session.TryGetValue(SessionKey, out _),
            "Public RazorComponentResult creates subscriptions but does not itself persist.");

        return workload;
    }

    internal CaseSpec Spec { get; }
    internal object Binding { get; }
    private SessionComponent Component => _component ?? throw new InvalidOperationException("Actual rendered component is missing.");
    internal object InputSnapshot => new
    {
        Spec.Label, Spec.Mode, Spec.ExactOutputLength, declaredType = _declaredType.AssemblyQualifiedName, input = Cases.Describe(_input),
    };

    internal object Run() => _operation();

    internal byte[] RunAndObserveOutput()
    {
        _lastOutput = Run();
        if (Spec.Mode != "Session")
        {
            return (byte[])_lastOutput;
        }
        Evidence.Require(_lastOutput is Task { IsCompletedSuccessfully: true }, "The actual synchronous persistence task must already have completed.");
        if (_session.TryGetValue(SessionKey, out var output))
        {
            Evidence.Require(_input is not null, "Null component state must remove the actual key.");

            return output;
        }
        Evidence.Require(_input is null, "Non-null component state must reach the actual session store.");

        return [];
    }

    internal object Verify(string fixtureDirectory)
    {
        var expected = File.ReadAllBytes(Path.Combine(fixtureDirectory, "expected", Spec.Label + ".bin"));
        var sourceInput = File.ReadAllBytes(Path.Combine(fixtureDirectory, "inputs", Spec.Label + ".json"));
        Evidence.Require(sourceInput.AsSpan().SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(InputSnapshot, Evidence.JsonOptions)),
            "Exact typed shared input bytes differ:" + Spec.Label);
        if (Spec.Mode == "Session" && _input is null)
        {
            _session.Set(SessionKey, [9, 7, 5]);
        }
        var first = RunAndObserveOutput();
        Evidence.Require(first.AsSpan().SequenceEqual(expected), "Full original output differs:" + Spec.Label);
        if (Spec.ExactOutputLength is int exact)
        {
            Evidence.Require(first.Length == exact, "Exact encoded boundary was not reached.");
        }
        object? roundTrip = Spec.Mode switch
        {
            "Data" => _deserializeData(JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(first)
                ?? throw new InvalidDataException("Bulk control returned a null document.")),
            "Session" when _input is null => null,
            _ => _deserializeValue(first, _declaredType),
        };
        Evidence.Require(Evidence.Compact(Cases.Describe(roundTrip)) == Evidence.Compact(Cases.Describe(_input)),
            "Actual deserialization changed a supported value/type/order:" + Spec.Label);
        var retained = first.ToArray();
        _serializeValue(new string('Z', 100000), typeof(string));
        Evidence.Require(first.AsSpan().SequenceEqual(retained), "Later serialization overwrote retained output.");
        if (first.Length > 0)
        {
            first[0] ^= 0x7f;
        }
        var second = RunAndObserveOutput();
        Evidence.Require(second.AsSpan().SequenceEqual(expected) &&
            (first.Length == 0 || !ReferenceEquals(first, second)), "Output is not independently owned across calls.");
        var failures = new List<object>();
        foreach (var unsupported in new[] { true, false })
        {
            byte[] beforeFailure = [9, 7, 5, 3, 1];
            _session.Set(SessionKey, beforeFailure);
            object?[] nested = [null];
            for (var index = 0; index < 600; index++)
            {
                nested = [nested];
            }
            Component.Value = unsupported ? new IntPtr(42) : nested;
            string message;
            try
            {
                _persist();
                throw new InvalidDataException("Invalid real component value unexpectedly persisted.");
            }
            catch (InvalidOperationException exception)
            {
                message = exception.Message;
                Evidence.Require(unsupported ? message == "Cannot serialize type 'System.IntPtr'."
                    : message.Contains("depth", StringComparison.OrdinalIgnoreCase), "Wrong real producer failure.");
            }
            Evidence.Require(_session.TryGetValue(SessionKey, out var afterFailure) &&
                afterFailure.AsSpan().SequenceEqual(beforeFailure), "Failed serialization replaced the session key.");
            Component.Value = "recovered-\u00e9<&";
            Evidence.Require(_persist().IsCompletedSuccessfully && _session.TryGetValue(SessionKey, out var recovered) &&
                recovered.AsSpan().SequenceEqual(_serializeValue(Component.Value, typeof(string))), "The same actual producer failed to recover.");
            failures.Add(new { unsupported, message, retainedOriginalSessionBytes = true, actualGetterAndSerializerReached = true, recovered = true });
        }
        Component.Value = _input;
        var final = RunAndObserveOutput();
        Evidence.Require(final.AsSpan().SequenceEqual(expected), "Final exact fixture output differs.");

        return new
        {
            Spec.Label, Spec.Mode, inputSha256 = Evidence.HashBytes(sourceInput), outputSha256 = Evidence.HashBytes(final), outputBytes = final.Length,
            exactOutputAndTypedRoundTrip = true, retainedAcrossUnrelatedSerialization = true, independentAcrossCalls = true, failures,
            actualRendererCreatedPropertySubscription = true, noPartialReplacementOfFailingKey = true,
            noMultipleKeyAtomicityClaim = true, recoveryThroughSameProducer = true, Binding,
            ownershipBoundary = Spec.Mode == "Session" ? "Actual DistributedSession stored copy" : "Serializer-owned byte[]",
        };
    }

    public async ValueTask DisposeAsync()
    {
        await _scope.DisposeAsync();
        await _services.DisposeAsync();
        await _context.Response.Body.DisposeAsync();
    }
}

/// <summary>Rendered through the real public server renderer to create the production property subscription.</summary>
public sealed class SessionComponent : ComponentBase
{
    /// <summary>Exact synthetic typed setup input.</summary>
    [Parameter]
    public object? Input { get; set; }

    /// <summary>Setup-only instance observer;not a session callback.</summary>
    [Parameter]
    public Action<SessionComponent>? Capture { get; set; }

    /// <summary>Actual framework-subscribed component property,read by its production PropertyGetter.</summary>
    [SupplyParameterFromSession(Name = "autoperf-f112-value")]
    public object? Value { get; set; }

    protected override void OnInitialized()
    {
        Value = Input;
        (Capture ?? throw new InvalidOperationException("Setup instance observer required."))(this);
    }

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenElement(0, "output");
        builder.AddAttribute(1, "id", "f112-component");
        builder.AddContent(2, "ready");
        builder.CloseElement();
    }
}

internal sealed class HarnessEnvironment : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = typeof(Workload).Assembly.GetName().Name
        ?? throw new InvalidOperationException("Actual harness assembly name required.");
    public string EnvironmentName { get; set; } = "Production";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public string WebRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
}
