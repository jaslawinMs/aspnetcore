using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

internal delegate object? DeserializeValueDelegate(ReadOnlySpan<byte> data, Type targetType);

internal sealed class Workload : IDisposable
{
    private const string SessionKey = "__BlazorTempData";
    private readonly ServiceProvider _services;
    private readonly CaptureProvider _logs = new();
    private readonly Func<IDictionary<string, object?>, byte[]> _serializeData;
    private readonly Func<object, Type, byte[]> _serializeValue;
    private readonly Func<IDictionary<string, JsonElement>, IDictionary<string, object?>> _deserializeData;
    private readonly DeserializeValueDelegate _deserializeValue;
    private readonly Action<HttpContext, IDictionary<string, object?>> _save;
    private readonly Func<HttpContext, IDictionary<string, object?>> _load;
    private readonly DefaultHttpContext _context = new();
    private readonly ISession _session;
    private readonly Func<object> _operation;
    private readonly object _input;
    private readonly IDictionary<string, object?> _data;
    private object? _lastOutput;

    internal Workload(CaseSpec spec)
    {
        Spec = spec;
        _input = spec.Create();
        _data = spec.Mode == "Value" ? Cases.Data()
            : _input as IDictionary<string, object?> ?? throw new InvalidDataException("A data/save case requires a real dictionary.");
        var services = new ServiceCollection();
        services.AddRazorComponents(options => options.TempDataProviderType = TempDataProviderType.SessionStorage);
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        services.AddLogging(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(_logs));
        services.AddDistributedMemoryCache();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddSingleton<IWebHostEnvironment>(new HarnessEnvironment());
        _services = services.BuildServiceProvider();
        var assembly = typeof(RazorComponentsServiceOptions).Assembly;
        var serializer = _services.GetRequiredService(
            assembly.GetType("Microsoft.AspNetCore.Components.Endpoints.IStoredDataSerializer", throwOnError: true)!);
        var provider = _services.GetRequiredService(
            assembly.GetType("Microsoft.AspNetCore.Components.Endpoints.ITempDataProvider", throwOnError: true)!);
        Evidence.Require(serializer.GetType().FullName == "Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializer",
            "The actual registered serializer is required.");
        Evidence.Require(provider.GetType().FullName == "Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProvider",
            "The actual registered session provider is required.");
        T Bind<T>(object target, string name) where T : Delegate =>
            (target.GetType().GetMethod(name, BindingFlags.Public | BindingFlags.Instance)
                ?? throw new MissingMethodException(target.GetType().FullName, name)).CreateDelegate<T>(target);
        _serializeData = Bind<Func<IDictionary<string, object?>, byte[]>>(serializer, "SerializeData");
        _serializeValue = Bind<Func<object, Type, byte[]>>(serializer, "SerializeValue");
        _deserializeData = Bind<Func<IDictionary<string, JsonElement>, IDictionary<string, object?>>>(serializer, "DeserializeData");
        _deserializeValue = Bind<DeserializeValueDelegate>(serializer, "DeserializeValue");
        _save = Bind<Action<HttpContext, IDictionary<string, object?>>>(provider, "SaveTempData");
        _load = Bind<Func<HttpContext, IDictionary<string, object?>>>(provider, "LoadTempData");
        var store = new DistributedSessionStore(
            _services.GetRequiredService<IDistributedCache>(), _services.GetRequiredService<ILoggerFactory>());
        _session = store.Create("F111-isolated-session", TimeSpan.FromMinutes(20), TimeSpan.FromSeconds(10),
            static () => true, isNewSessionKey: true);
        _context.Session = _session;
        Evidence.Require(_session.IsAvailable && _session.GetType() == typeof(DistributedSession),
            "A loaded real DistributedSession is required.");
        _operation = spec.Mode switch
        {
            "Data" => () => _serializeData(_data),
            "Value" => () => _serializeValue(_input, _input.GetType()),
            "Session" => SaveAndReturnSession,
            _ => throw new InvalidDataException("Unknown explicit case mode."),
        };
        Binding = new
        {
            serializer = serializer.GetType().AssemblyQualifiedName,
            provider = provider.GetType().AssemblyQualifiedName,
            session = _session.GetType().AssemblyQualifiedName,
            cache = _services.GetRequiredService<IDistributedCache>().GetType().AssemblyQualifiedName,
            serializeDataMethod = _serializeData.Method.ToString(),
            serializeValueMethod = _serializeValue.Method.ToString(),
            saveMethod = _save.Method.ToString(),
            publicMethodsBoundOnceOutsideTiming = true,
            establishedSessionCallback = "Explicit true factory callback;not SessionMiddleware/HTTP establishment.",
        };
    }

    internal CaseSpec Spec { get; }
    internal object Binding { get; }
    internal object InputSnapshot => new { Spec.Label, Spec.Mode, Spec.ExactOutputLength, input = Cases.Describe(_input) };

    private object SaveAndReturnSession()
    {
        _save(_context, _data);

        return _session;
    }

    internal object Run() => _operation();

    internal byte[] RunAndObserveOutput()
    {
        _lastOutput = Run();
        if (Spec.Mode != "Session")
        {
            return (byte[])_lastOutput;
        }
        if (_session.TryGetValue(SessionKey, out var output))
        {
            Evidence.Require(_data.Count != 0, "Empty TempData must remove the actual session entry.");

            return output;
        }
        Evidence.Require(_data.Count == 0, "Nonempty TempData must reach the actual session store.");

        return [];
    }

    internal object Verify(string fixtureDirectory)
    {
        var expected = File.ReadAllBytes(Path.Combine(fixtureDirectory, "expected", Spec.Label + ".bin"));
        var sourceInput = File.ReadAllBytes(Path.Combine(fixtureDirectory, "inputs", Spec.Label + ".json"));
        Evidence.Require(sourceInput.AsSpan().SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(InputSnapshot, Evidence.JsonOptions)),
            "Exact typed shared input bytes differ:" + Spec.Label);
        _logs.Enabled = true;
        _logs.Rows.Clear();
        var first = RunAndObserveOutput();
        Evidence.Require(first.AsSpan().SequenceEqual(expected), "Full original output differs:" + Spec.Label);
        var saveLogs = _logs.Rows.ToArray();
        var expectedSaveLogCount = Spec.Mode == "Session" && _data.Count > 0 ? 1 : 0;
        Evidence.Require(saveLogs.Length == expectedSaveLogCount, "Actual save log count differs.");
        if (saveLogs.Length == 1)
        {
            Evidence.Require(saveLogs[0].EventId == 3 && saveLogs[0].EventName == "TempDataSessionSaveSuccess"
                && saveLogs[0].Level == "Debug" && saveLogs[0].Exception is null,
                "The actual structured session save log contract changed.");
        }
        if (Spec.ExactOutputLength is int exact)
        {
            Evidence.Require(first.Length == exact, "The declared encoded boundary was not reached.");
        }
        object? roundTrip = Spec.Mode switch
        {
            "Value" => _deserializeValue(first, _input.GetType()),
            "Session" => _load(_context),
            _ => _deserializeData(JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(first)
                ?? throw new InvalidDataException("The owning serializer returned a null document.")),
        };
        Evidence.Require(Evidence.Compact(Cases.Describe(roundTrip)) == Evidence.Compact(Cases.Describe(_input)),
            "Actual deserialization changed a supported value/type/order:" + Spec.Label);
        var retained = first.ToArray();
        _serializeData(Cases.Data(("Unrelated", new string('Z', 100000))));
        Evidence.Require(first.AsSpan().SequenceEqual(retained), "A later serialization overwrote retained output.");
        if (first.Length > 0)
        {
            first[0] ^= 0x7f;
        }
        var second = RunAndObserveOutput();
        Evidence.Require(second.AsSpan().SequenceEqual(expected) &&
            (first.Length == 0 || !ReferenceEquals(first, second)), "Output is not independently owned across calls.");
        byte[] beforeFailure = [9, 7, 5, 3, 1];
        _session.Set(SessionKey, beforeFailure);
        var failureInput = Cases.Data(("CompletedPrefix", new string('B', 16384)), ("Unsupported", new object()));
        string exceptionMessage;
        try
        {
            _save(_context, failureInput);
            throw new InvalidDataException("Unsupported input unexpectedly reached session.Set.");
        }
        catch (InvalidOperationException exception)
        {
            exceptionMessage = exception.Message;
            Evidence.Require(exceptionMessage == "Cannot serialize type 'System.Object'.", "Unexpected owning failure.");
        }
        Evidence.Require(_session.TryGetValue(SessionKey, out var afterFailure) &&
            afterFailure.AsSpan().SequenceEqual(beforeFailure), "A failed serialization partially replaced stored data.");
        var final = RunAndObserveOutput();
        Evidence.Require(final.AsSpan().SequenceEqual(expected), "The same producer did not recover after failure.");
        _logs.Enabled = false;
        _logs.Rows.Clear();

        return new
        {
            Spec.Label, Spec.Mode, inputSha256 = Evidence.HashBytes(sourceInput),
            outputSha256 = Evidence.HashBytes(final), outputBytes = final.Length,
            exactOutputAndTypedRoundTrip = true, saveLogs,
            retainedAcrossUnrelatedSerialization = true, independentAcrossCalls = true,
            unsupportedFailure = exceptionMessage, noPartialSessionReplacement = true,
            recoveryThroughSameProducer = true, Binding,
            ownershipBoundary = Spec.Mode == "Session" ? "Actual DistributedSession stored copy" : "Serializer-owned byte[]",
        };
    }

    public void Dispose() => _services.Dispose();
}

internal sealed record LogRow(string Category, int EventId, string? EventName, string Level, string? Exception, object? State);

internal sealed class CaptureProvider : ILoggerProvider
{
    internal bool Enabled { get; set; }
    internal List<LogRow> Rows { get; } = [];
    public ILogger CreateLogger(string categoryName) => new CaptureLogger(this, categoryName);
    public void Dispose() { }

    private sealed class CaptureLogger(CaptureProvider provider, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => provider.Enabled;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (IsEnabled(logLevel))
            {
                provider.Rows.Add(new(category, eventId.Id, eventId.Name, logLevel.ToString(),
                    exception?.GetType().FullName, state is IEnumerable<KeyValuePair<string, object?>> entries
                        ? entries.ToDictionary(pair => pair.Key, pair => pair.Value) : state));
            }
        }
    }
}

internal sealed class HarnessEnvironment : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = typeof(Workload).Assembly.GetName().Name
        ?? throw new InvalidOperationException("The actual harness assembly name is required.");
    public string EnvironmentName { get; set; } = "Production";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public string WebRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
}
