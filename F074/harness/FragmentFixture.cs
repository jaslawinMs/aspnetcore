using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Reflection.Emit;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal enum FragmentShape { Empty, Text, Escaped, Elements, Markup, Typed }

internal sealed record FragmentProfile(string Name, FragmentShape Shape, int Nodes = 1, int TextLength = 64,
    int OrdinaryParameters = 1, int Fragments = 1, bool Render = false, bool Collection = false);

internal static class FragmentCases
{
    public static readonly FragmentProfile[] All =
    [
        new("DirectEmpty", FragmentShape.Empty),
        new("DirectText1", FragmentShape.Text),
        new("DirectText8", FragmentShape.Text, Nodes: 8),
        new("DirectText64", FragmentShape.Text, Nodes: 64),
        new("DirectTextLong", FragmentShape.Text, TextLength: 4096),
        new("DirectEscaped1", FragmentShape.Escaped),
        new("DirectEscapedLong", FragmentShape.Escaped, TextLength: 4096),
        new("DirectElements1", FragmentShape.Elements),
        new("DirectElements8", FragmentShape.Elements, Nodes: 8),
        new("DirectElements32", FragmentShape.Elements, Nodes: 32),
        new("DirectMarkup", FragmentShape.Markup),
        new("DirectMarkupLong", FragmentShape.Markup, TextLength: 4096),
        new("DirectMixed8", FragmentShape.Text, OrdinaryParameters: 8),
        new("DirectTwoFragments", FragmentShape.Escaped, Fragments: 2),
        new("DirectTyped1", FragmentShape.Typed, Fragments: 0),
        new("DirectTyped8", FragmentShape.Typed, OrdinaryParameters: 8, Fragments: 0),
        new("RenderText8", FragmentShape.Text, Nodes: 8, Render: true),
        new("RenderEscapedLong", FragmentShape.Escaped, TextLength: 4096, Render: true),
        new("RenderElements8", FragmentShape.Elements, Nodes: 8, Render: true),
        new("RenderMarkupLong", FragmentShape.Markup, TextLength: 4096, Render: true),
        new("CollectionText1", FragmentShape.Text, Collection: true),
        new("CollectionEscapedLong", FragmentShape.Escaped, TextLength: 4096, Collection: true),
        new("CollectionElements8", FragmentShape.Elements, Nodes: 8, Collection: true),
        new("CollectionTypedControl", FragmentShape.Typed, Fragments: 0, Collection: true),
    ];
}

internal sealed class FragmentFixture
{
    private readonly FragmentProfile _profile;
    private readonly OwnerBridge _bridge = new();
    private readonly Dictionary<string, RenderFragment> _sourceFragments = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string> _expectedFrames = new(StringComparer.Ordinal);
    private readonly object _definitions;
    private readonly IList<object?> _values;
    private readonly string _markers;
    private readonly string[] _names;
    private readonly object[] _definitionShapes;
    private readonly int _rawCharacters;
    private readonly long _predictedStringBytes;
    private ParameterView _lastParameters;

    public FragmentFixture(FragmentProfile profile)
    {
        _profile = profile;
        var parameters = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            [nameof(FragmentHostComponent.Label)] = "typed control",
        };
        for (var i = 1; i < profile.OrdinaryParameters; i++)
        {
            parameters.Add($"Extra{i}", $"ordinary value{i}");
        }
        for (var i = 0; i < profile.Fragments; i++)
        {
            var name = i == 0 ? nameof(FragmentHostComponent.ChildContent) : nameof(FragmentHostComponent.Footer);
            var fragment = BuildFragment(profile);
            _sourceFragments.Add(name, fragment);
            using var expected = new RenderTreeBuilder();
            fragment(expected);
            _expectedFrames.Add(name, DescribeFrames(expected));
            parameters.Add(name, _bridge.Capture(fragment));
        }
        _names = parameters.Keys.ToArray();
        (_markers, _definitions, _values) = _bridge.Produce(parameters);
        var definitions = (IList)_definitions;
        var rawCharacters = 0;
        var predictedStringBytes = 0L;
        _definitionShapes = Enumerable.Range(0, definitions.Count).Select(index =>
        {
            var definition = definitions[index]!;
            var name = (string)OwnerBridge.Get(definition, "Name");
            var assembly = (string)OwnerBridge.Get(definition, "Assembly");
            var typeName = (string)OwnerBridge.Get(definition, "TypeName");
            if (_sourceFragments.ContainsKey(name))
            {
                Require(assembly == "Microsoft.AspNetCore.Components.Endpoints", "Actual producer DTO assembly mismatch.");
                Require(typeName == "Microsoft.AspNetCore.Components.SerializedRenderFragment", "Actual producer DTO type mismatch.");
                Require(_values[index] is JsonElement, "Actual descriptor parser did not supply a JsonElement.");
                var rawLength = ((JsonElement)_values[index]!).GetRawText().Length;
                rawCharacters += rawLength;
                predictedStringBytes += (24L + 2L * rawLength + 7L) & ~7L;
            }
            return (object)new
            {
                name, assembly, type_name = typeName,
                value_kind = _values[index] is JsonElement element ? element.ValueKind.ToString() : _values[index]?.GetType().FullName,
            };
        }).ToArray();
        _rawCharacters = rawCharacters;
        _predictedStringBytes = predictedStringBytes;
    }

    public int Exercise()
    {
        ParameterView parameters;
        var success = _profile.Collection
            ? _bridge.Collection(_markers, out parameters)
            : _bridge.Parameters(_definitions, _values, out parameters);
        if (!success)
        {
            throw new InvalidOperationException($"Actual owner failed for {_profile.Name}.");
        }
        _lastParameters = parameters;
        if (_profile.Render)
        {
            var count = 0;
            foreach (var pair in parameters)
            {
                if (pair.Value is RenderFragment fragment)
                {
                    using var builder = new RenderTreeBuilder();
                    fragment(builder);
                    count += builder.GetFrames().Count;
                }
            }
            return count;
        }
        var parameterCount = 0;
        foreach (var pair in parameters)
        {
            parameterCount += pair.Name.Length;
        }
        return parameterCount;
    }

    public object Validate()
    {
        Require(_bridge.Parameters(_definitions, _values, out var direct), "Direct owner rejected producer input.");
        Require(_bridge.Collection(_markers, out var collection), "Actual stateless descriptor collection rejected producer input.");
        var directFrames = ValidateParameters(direct);
        var collectionFrames = ValidateParameters(collection);
        Require(JsonSerializer.Serialize(directFrames) == JsonSerializer.Serialize(collectionFrames), "Owner and full descriptor outcomes differ.");
        Exercise();
        ValidateParameters(_lastParameters);

        return new
        {
            parameter_names = _names,
            producer_definitions = _definitionShapes,
            raw_fragment_characters = _rawCharacters,
            predicted_removed_utf16_string_bytes = _predictedStringBytes,
            fragment_frames = directFrames,
            actual_collection_agrees = true,
            timed_boundary = _profile.Collection ? "DescriptorCollection" : _profile.Render ? "OwnerAndRenderTree" : "Owner",
        };
    }

    private Dictionary<string, string> ValidateParameters(ParameterView parameters)
    {
        var dictionary = parameters.ToDictionary();
        Require(dictionary.Keys.SequenceEqual(_names), "Parameter order/name mismatch.");
        Require(Equals(dictionary[nameof(FragmentHostComponent.Label)], "typed control"), "Ordinary typed label changed.");
        foreach (var pair in dictionary)
        {
            if (pair.Key.StartsWith("Extra", StringComparison.Ordinal))
            {
                Require(Equals(pair.Value, $"ordinary value{pair.Key[5..]}"), "Ordinary typed control changed.");
            }
        }
        var frames = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var name in _sourceFragments.Keys)
        {
            Require(dictionary[name] is RenderFragment, "Restored parameter is not a RenderFragment.");
            using var builder = new RenderTreeBuilder();
            ((RenderFragment)dictionary[name]!)(builder);
            var actual = DescribeFrames(builder);
            Require(actual == _expectedFrames[name], "Materialized frames differ from the real producer.");
            frames.Add(name, actual);
        }
        return frames;
    }

    private static RenderFragment BuildFragment(FragmentProfile profile)
    {
        var unit = profile.Shape switch
        {
            FragmentShape.Escaped => "\u00E9\u6F22\U0001F642 \"quoted\" \\ path <tag> & line\n",
            FragmentShape.Markup => "<strong>markup &amp; content</strong>",
            _ => "ordinary content",
        };
        var content = profile.Shape is FragmentShape.Text or FragmentShape.Elements
            ? new string('x', profile.TextLength)
            : string.Concat(Enumerable.Repeat(unit, Math.Max(1, profile.TextLength / unit.Length)));
        return builder =>
        {
            if (profile.Shape is FragmentShape.Empty or FragmentShape.Typed)
            {
                return;
            }
            for (var i = 0; i < profile.Nodes; i++)
            {
                if (profile.Shape == FragmentShape.Elements)
                {
                    builder.OpenElement(0, "div");
                    builder.SetKey(i);
                    builder.AddAttribute(1, "data-value", 42);
                    builder.AddAttribute(2, "class", "content");
                    builder.OpenElement(3, "span");
                }
                if (profile.Shape == FragmentShape.Markup)
                {
                    builder.AddMarkupContent(4, content);
                }
                else
                {
                    builder.AddContent(4, content);
                }
                if (profile.Shape == FragmentShape.Elements)
                {
                    builder.CloseElement();
                    builder.CloseElement();
                }
            }
        };
    }

    private static string DescribeFrames(RenderTreeBuilder builder)
    {
        var frames = builder.GetFrames();
        var result = new List<object>(frames.Count);
        for (var i = 0; i < frames.Count; i++)
        {
            var frame = frames.Array[i];
            result.Add(frame.FrameType switch
            {
                RenderTreeFrameType.Element => new { kind = "element", name = frame.ElementName, count = frame.ElementSubtreeLength, key = Scalar(frame.ElementKey) },
                RenderTreeFrameType.Attribute => (object)new { kind = "attribute", name = frame.AttributeName, value = Scalar(frame.AttributeValue) },
                RenderTreeFrameType.Text => new { kind = "text", text = frame.TextContent },
                RenderTreeFrameType.Markup => new { kind = "markup", text = frame.MarkupContent },
                _ => throw new InvalidOperationException($"Unexpected produced frame: {frame.FrameType}."),
            });
        }
        return JsonSerializer.Serialize(result);
    }

    private static object? Scalar(object? value)
    {
        return value is null ? null : new { type = value.GetType().FullName, text = Convert.ToString(value, CultureInfo.InvariantCulture) };
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal sealed class OwnerBridge
{
    private delegate bool ParameterCall(object owner, object definitions, IList<object?> values, out ParameterView parameters);
    private delegate bool CollectionCall(object owner, string json, out object descriptors);
    private readonly Assembly _server = Assembly.Load("Microsoft.AspNetCore.Components.Server");
    private readonly Assembly _endpoints = Assembly.Load("Microsoft.AspNetCore.Components.Endpoints");
    private readonly EphemeralDataProtectionProvider _provider = new();
    private readonly object _parametersOwner;
    private readonly object _collectionOwner;
    private readonly ParameterCall _parameters;
    private readonly CollectionCall _collection;
    private readonly Func<object, ParameterView> _descriptorParameters;
    private readonly JsonSerializerOptions _serverOptions;
    private readonly JsonSerializerOptions _endpointOptions;

    public OwnerBridge()
    {
        var parameterType = Type(_server, "Microsoft.AspNetCore.Components.Server.ComponentParameterDeserializer");
        var parameterCtor = parameterType.GetConstructors().Single();
        _parametersOwner = parameterCtor.Invoke([Logger(parameterType), New(parameterCtor.GetParameters()[1].ParameterType)]);
        var method = parameterType.GetMethod("TryDeserializeParameters")!;
        var thunk = new DynamicMethod("ActualServerParameters", typeof(bool),
            [typeof(object), typeof(object), typeof(IList<object?>), typeof(ParameterView).MakeByRefType()],
            typeof(OwnerBridge).Module, skipVisibility: true);
        var il = thunk.GetILGenerator();
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Castclass, parameterType);
        il.Emit(OpCodes.Ldarg_1);
        il.Emit(OpCodes.Castclass, method.GetParameters()[0].ParameterType);
        il.Emit(OpCodes.Ldarg_2);
        il.Emit(OpCodes.Ldarg_3);
        il.Emit(OpCodes.Callvirt, method);
        il.Emit(OpCodes.Ret);
        _parameters = thunk.CreateDelegate<ParameterCall>();

        var collectionType = Type(_server, "Microsoft.AspNetCore.Components.Server.ServerComponentDeserializer");
        var ctor = collectionType.GetConstructors().Single();
        _collectionOwner = ctor.Invoke([_provider, Logger(collectionType), New(ctor.GetParameters()[2].ParameterType), _parametersOwner]);
        var collectionMethod = collectionType.GetMethod("TryDeserializeComponentDescriptorCollection")!;
        var listType = collectionMethod.GetParameters()[1].ParameterType.GetElementType()!;
        var collectionThunk = new DynamicMethod("ActualServerDescriptorCollection", typeof(bool),
            [typeof(object), typeof(string), typeof(object).MakeByRefType()], typeof(OwnerBridge).Module, skipVisibility: true);
        il = collectionThunk.GetILGenerator();
        var list = il.DeclareLocal(listType);
        var success = il.DeclareLocal(typeof(bool));
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Castclass, collectionType);
        il.Emit(OpCodes.Ldarg_1);
        il.Emit(OpCodes.Ldloca, list);
        il.Emit(OpCodes.Callvirt, collectionMethod);
        il.Emit(OpCodes.Stloc, success);
        il.Emit(OpCodes.Ldarg_2);
        il.Emit(OpCodes.Ldloc, list);
        il.Emit(OpCodes.Stind_Ref);
        il.Emit(OpCodes.Ldloc, success);
        il.Emit(OpCodes.Ret);
        _collection = collectionThunk.CreateDelegate<CollectionCall>();
        var descriptorType = listType.GetGenericArguments()[0];
        var getter = descriptorType.GetProperty("Parameters")!.GetMethod!;
        var descriptorThunk = new DynamicMethod("ActualDescriptorParameters", typeof(ParameterView),
            [typeof(object)], typeof(OwnerBridge).Module, skipVisibility: true);
        il = descriptorThunk.GetILGenerator();
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Castclass, descriptorType);
        il.Emit(OpCodes.Callvirt, getter);
        il.Emit(OpCodes.Ret);
        _descriptorParameters = descriptorThunk.CreateDelegate<Func<object, ParameterView>>();
        _serverOptions = Options(_server);
        _endpointOptions = Options(_endpoints);
    }

    public bool Parameters(object definitions, IList<object?> values, out ParameterView parameters)
    {
        return _parameters(_parametersOwner, definitions, values, out parameters);
    }

    public bool Collection(string json, out ParameterView parameters)
    {
        parameters = default;
        if (!_collection(_collectionOwner, json, out var descriptors))
        {
            return false;
        }
        var list = (IList)descriptors;
        if (list.Count != 1)
        {
            throw new InvalidOperationException("Expected one actual component descriptor.");
        }
        parameters = _descriptorParameters(list[0]!);
        return true;
    }

    public object Capture(RenderFragment fragment)
    {
        var captureType = Type(_endpoints, "Microsoft.AspNetCore.Components.RenderFragmentCapture");
        var capture = Activator.CreateInstance(captureType, [fragment])!;
        using var builder = new RenderTreeBuilder();
        captureType.GetMethod("Invoke")!.CreateDelegate<Action<RenderTreeBuilder>>(capture)(builder);
        var serializerType = Type(_endpoints, "Microsoft.AspNetCore.Components.RenderFragmentSerializer");
        var nodes = serializerType.GetMethod("SerializeFrames", BindingFlags.Static | BindingFlags.NonPublic)!
            .Invoke(null, [capture, NullLogger.Instance, nameof(FragmentHostComponent)])!;
        var dto = New(Type(_endpoints, "Microsoft.AspNetCore.Components.SerializedRenderFragment"));
        dto.GetType().GetProperty("Nodes")!.SetValue(dto, nodes);
        return dto;
    }

    public (string Markers, object Definitions, IList<object?> Values) Produce(Dictionary<string, object?> parameters)
    {
        var markerType = Type(_endpoints, "Microsoft.AspNetCore.Components.ComponentMarker");
        var marker = markerType.GetMethod("Create", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!
            .Invoke(null, ["server", true, null])!;
        var serializerType = Type(_endpoints, "Microsoft.AspNetCore.Components.Endpoints.ServerComponentSerializer");
        var serializer = Activator.CreateInstance(serializerType, [_provider])!;
        var serialize = serializerType.GetMethod("SerializeInvocation")!;
        var arguments = new object?[]
        {
            marker, New(serialize.GetParameters()[1].ParameterType),
            typeof(FragmentHostComponent), ParameterView.FromDictionary(parameters), null,
        };
        serialize.Invoke(serializer, arguments);
        marker = arguments[0]!;
        var array = Array.CreateInstance(markerType, 1);
        array.SetValue(marker, 0);
        var markers = JsonSerializer.Serialize(array, array.GetType(), _endpointOptions);
        var protector = _provider.CreateProtector("Microsoft.AspNetCore.Components.ComponentDescriptorSerializer,V1").ToTimeLimitedDataProtector();
        var decoded = System.Text.Encoding.UTF8.GetString(protector.Unprotect(Convert.FromBase64String((string)Get(marker, "Descriptor"))));
        var serverComponentType = Type(_server, "Microsoft.AspNetCore.Components.ServerComponent");
        var component = JsonSerializer.Deserialize(decoded, _serverOptions.GetTypeInfo(serverComponentType))!;
        return (markers, Get(component, "ParameterDefinitions"), (IList<object?>)Get(component, "ParameterValues"));
    }

    public static object Get(object instance, string property)
    {
        return instance.GetType().GetProperty(property)!.GetValue(instance)!;
    }

    private static Type Type(Assembly assembly, string name)
    {
        return assembly.GetType(name, throwOnError: true)!;
    }

    private static object New(Type type)
    {
        return Activator.CreateInstance(type, nonPublic: true)!;
    }

    private static object Logger(Type type)
    {
        return typeof(NullLogger<>).MakeGenericType(type).GetField(nameof(NullLogger<object>.Instance))!.GetValue(null)!;
    }

    private static JsonSerializerOptions Options(Assembly assembly)
    {
        return (JsonSerializerOptions)Type(assembly, "Microsoft.AspNetCore.Components.ServerComponentSerializationSettings")
            .GetField("JsonSerializationOptions", BindingFlags.Static | BindingFlags.Public)!.GetValue(null)!;
    }
}

public sealed class FragmentHostComponent : ComponentBase
{
    [Parameter] public string Label { get; set; } = "";
    [Parameter] public RenderFragment? ChildContent { get; set; }
    [Parameter] public RenderFragment? Footer { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object?>? Extra { get; set; }
}
