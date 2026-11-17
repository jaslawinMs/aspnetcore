using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Server;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal delegate bool ParseBatch(object owner, string json, out object? batch, bool deserializeMarkers);

internal sealed class ServerAdapter : IDisposable
{
    private const BindingFlags Members = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static;
    private readonly Type _ownerType;
    private readonly Type _operationType;
    private readonly Type _batchType;
    private readonly Type _markerType;
    private readonly Type _parameterDeserializerType;
    private readonly object _rootTypes;
    private readonly object _parameterTypes;
    private readonly object _serializer;
    private readonly EphemeralDataProtectionProvider _provider = new();
    private readonly MethodInfo _serializeInvocation;
    private readonly MethodInfo _createMarker;
    private readonly PropertyInfo _operations;
    private readonly PropertyInfo _batchId;
    private readonly PropertyInfo _id;
    private readonly PropertyInfo _kind;
    private readonly PropertyInfo _marker;
    private readonly PropertyInfo _descriptor;
    private readonly FieldInfo _currentInvocation;
    private readonly FieldInfo _expiredInvocations;
    private readonly FieldInfo _seenSequences;

    public Assembly OwnerAssembly { get; } = typeof(CircuitOptions).Assembly;
    public JsonSerializerOptions Options { get; }
    public ParseBatch Parse { get; }

    public ServerAdapter()
    {
        _ownerType = Type("Microsoft.AspNetCore.Components.Server.ServerComponentDeserializer");
        _operationType = Type("Microsoft.AspNetCore.Components.RootComponentOperation");
        _batchType = Type("Microsoft.AspNetCore.Components.RootComponentOperationBatch");
        _markerType = Type("Microsoft.AspNetCore.Components.ComponentMarker");
        _parameterDeserializerType = Type("Microsoft.AspNetCore.Components.Server.ComponentParameterDeserializer");
        _rootTypes = New(Type("Microsoft.AspNetCore.Components.RootTypeCache"));
        _parameterTypes = New(Type("Microsoft.AspNetCore.Components.ComponentParametersTypeCache"));
        _serializer = New(Type("Microsoft.AspNetCore.Components.Endpoints.ServerComponentSerializer"), _provider);
        _serializeInvocation = _serializer.GetType().GetMethod("SerializeInvocation", Members)!;
        _createMarker = _markerType.GetMethod("Create", Members)!;
        _operations = Property(_batchType, "Operations");
        _batchId = Property(_batchType, "BatchId");
        _id = Property(_operationType, "SsrComponentId");
        _kind = Property(_operationType, "Type");
        _marker = Property(_operationType, "Marker");
        _descriptor = Property(_operationType, "Descriptor");
        _currentInvocation = _ownerType.GetField("_currentInvocationId", Members)!;
        _expiredInvocations = _ownerType.GetField("_expiredInvocationIds", Members)!;
        _seenSequences = _ownerType.GetField("_seenSequenceNumbersForCurrentInvocation", Members)!;
        Options = (JsonSerializerOptions)Type("Microsoft.AspNetCore.Components.ServerComponentSerializationSettings")
            .GetField("JsonSerializationOptions", Members)!.GetValue(null)!;
        var target = Expression.Parameter(typeof(object), "owner");
        var json = Expression.Parameter(typeof(string), "json");
        var output = Expression.Parameter(typeof(object).MakeByRefType(), "batch");
        var deserialize = Expression.Parameter(typeof(bool), "deserializeMarkers");
        var actualBatch = Expression.Variable(_batchType, "actualServerBatch");
        var success = Expression.Variable(typeof(bool), "success");
        var call = Expression.Call(Expression.Convert(target, _ownerType),
            _ownerType.GetMethod("TryDeserializeRootComponentOperations", Members)!, json, actualBatch, deserialize);
        Parse = Expression.Lambda<ParseBatch>(Expression.Block([actualBatch, success],
            Expression.Assign(success, call), Expression.Assign(output, Expression.Convert(actualBatch, typeof(object))), success),
            target, json, output, deserialize).Compile();
        Evidence.Require(_batchType.Assembly == OwnerAssembly && _operationType.Assembly == OwnerAssembly
            && _markerType.Assembly == OwnerAssembly, "Actual Server-assembly DTOs,not linked Endpoints copies,required.");
    }

    private Type Type(string name) => OwnerAssembly.GetType(name, throwOnError: true)!;

    private static PropertyInfo Property(Type owner, string name) =>
        owner.GetProperty(name, Members) ?? throw new InvalidOperationException("Missing actual property:" + name);

    private static object New(Type type, params object?[] arguments) =>
        Activator.CreateInstance(type, Members, binder: null, arguments, CultureInfo.InvariantCulture)
        ?? throw new InvalidOperationException("Actual constructor returned null:" + type.FullName);

    private static object Logger(Type category, CaptureSink? sink)
    {
        if (sink is null)
        {
            return typeof(NullLogger<>).MakeGenericType(category).GetProperty("Instance", Members)!.GetValue(null)!;
        }

        return New(typeof(Logger<>).MakeGenericType(category), new CaptureFactory(sink));
    }

    public object CreateOwner(CaptureSink? sink = null) =>
        New(_ownerType, _provider, Logger(_ownerType, sink), _rootTypes,
            New(_parameterDeserializerType, Logger(_parameterDeserializerType, sink), _parameterTypes));

    public object CreateInvocation() => New(Type("Microsoft.AspNetCore.Components.Endpoints.ServerComponentInvocationSequence"));

    public object CreateRealMarker(object invocation, int value)
    {
        var key = New(Type("Microsoft.AspNetCore.Components.ComponentMarkerKey"), typeof(ProbeComponent).FullName, null);
        var marker = _createMarker.Invoke(null, ["server", false, key])!;
        object?[] arguments = [marker, invocation, typeof(ProbeComponent),
            ParameterView.FromDictionary(new Dictionary<string, object?> { [nameof(ProbeComponent.Value)] = value }), null];
        _serializeInvocation.Invoke(_serializer, arguments);

        return arguments[0]!;
    }

    public object CreateBareMarker() => New(_markerType);

    public string Serialize(IReadOnlyList<OperationSpec> specifications, long batchId = 71)
    {
        var array = Array.CreateInstance(_operationType, specifications.Count);
        for (var index = 0; index < specifications.Count; index++)
        {
            var specification = specifications[index];
            var operation = New(_operationType);
            _kind.SetValue(operation, Enum.Parse(_kind.PropertyType, specification.Kind));
            _id.SetValue(operation, specification.Id);
            _marker.SetValue(operation, specification.Marker);
            array.SetValue(operation, index);
        }
        var batch = New(_batchType);
        _batchId.SetValue(batch, batchId);
        _operations.SetValue(batch, array);

        return JsonSerializer.Serialize(batch, _batchType, Options);
    }

    public BatchObservation Observe(object batch)
    {
        Evidence.Require(batch.GetType() == _batchType, "Returned batch must have exact actual Server type identity.");
        var operations = ((Array)_operations.GetValue(batch)!).Cast<object>().Select(operation =>
        {
            var descriptor = _descriptor.GetValue(operation);
            Dictionary<string, object?>? parameters = null;
            string? component = null;
            if (descriptor is not null)
            {
                component = ((Type)Property(descriptor.GetType(), "ComponentType").GetValue(descriptor)!).FullName;
                var rootParameters = Property(descriptor.GetType(), "Parameters").GetValue(descriptor)!;
                parameters = ((ParameterView)Property(rootParameters.GetType(), "Parameters").GetValue(rootParameters)!)
                    .ToDictionary().ToDictionary(item => item.Key, item => item.Value);
            }

            return new OperationObservation((int)_id.GetValue(operation)!, _kind.GetValue(operation)!.ToString()!,
                _marker.GetValue(operation) is not null, descriptor is not null, component, parameters);
        }).ToArray();

        return new((long)_batchId.GetValue(batch)!, operations);
    }

    public OwnerState State(object owner) => new((Guid?)_currentInvocation.GetValue(owner),
        ((HashSet<Guid>)_expiredInvocations.GetValue(owner)!).Count,
        ((HashSet<int>)_seenSequences.GetValue(owner)!).Order().ToArray());

    public object TypeIdentity() => new
    {
        owner = _ownerType.AssemblyQualifiedName,
        batch = _batchType.AssemblyQualifiedName,
        operation = _operationType.AssemblyQualifiedName,
        marker = _markerType.AssemblyQualifiedName,
        sameActualOwnerAssembly = true,
        adapter = "One cached compiled expression calls the actual instance method with actual internal out-batch,then widens only output to object. Reflection constructs producers/owners and reads observations outside timing. No method copy,shipping bridge or test-assembly identity spoof.",
        trimmedOrAotHarnessNotClaimed = true
    };

    public void Dispose() => ((IDisposable)_rootTypes).Dispose();

    private sealed class CaptureFactory(CaptureSink sink) : ILoggerFactory
    {
        public ILogger CreateLogger(string categoryName) => new CaptureLogger(sink, categoryName);
        public void AddProvider(ILoggerProvider provider) => throw new NotSupportedException("No providers added by this adapter.");
        public void Dispose() { }
    }

    private sealed class CaptureLogger(CaptureSink sink, string category) : ILogger
    {
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Debug;
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Evidence.Require(state is IEnumerable<KeyValuePair<string, object?>>, "Structured actual owner log required.");
            var values = (IEnumerable<KeyValuePair<string, object?>>)state!;
            sink.Entries.Add(new(category, logLevel.ToString(), eventId.Id, eventId.Name, formatter(state, exception),
                values.ToDictionary(item => item.Key, item => item.Value?.ToString()), exception?.GetType().FullName));
        }
    }
}

internal sealed class CaptureSink
{
    public List<LogObservation> Entries { get; } = [];
}

internal sealed record OperationSpec(string Kind, int Id, object? Marker = null);
internal sealed record OperationObservation(int Id, string Kind, bool HasMarker, bool HasDescriptor,
    string? Component, Dictionary<string, object?>? Parameters);
internal sealed record BatchObservation(long BatchId, OperationObservation[] Operations);
internal sealed record OwnerState(Guid? CurrentInvocation, int ExpiredInvocations, int[] SeenSequences);
internal sealed record LogObservation(string Category, string Level, int Id, string? Name, string Message,
    Dictionary<string, string?> Fields, string? Exception);

/// <summary>Application-defined component used by the real marker/parameter producer.</summary>
public sealed class ProbeComponent : ComponentBase
{
    /// <summary>Gets or sets the round-tripped application parameter.</summary>
    [Parameter]
    public int Value { get; set; }
}
