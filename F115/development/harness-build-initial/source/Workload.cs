using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson.Exceptions;

namespace AutoPerf;

public interface IMutableNumber
{
    int Value { get; set; }
}

public struct MutableNumber(int value) : IMutableNumber
{
    public int Value { get; set; } = value;
    public long Stamp { get; set; } = 1099511627777;
}

public sealed class Leaf
{
    public int Value { get; set; } = 731;
    public string Text { get; set; } = Model.Text;
}

public sealed class Model
{
    internal const string Text = "value-\u00e9\u4e2d\U0001F30D";
    public List<int> Ints { get; } = [731];
    public List<long> Longs { get; } = [1099511627777];
    public List<decimal> Decimals { get; } = [1234.125m];
    public List<Guid> Guids { get; } = [Guid.Parse("00112233-4455-6677-8899-aabbccddeeff")];
    public List<MutableNumber> Structs { get; } = [new(731)];
    public List<int?> Nullable { get; } = [731, null];
    public List<string> Strings { get; } = [Text];
    public List<Leaf> References { get; } = [new()];
    public List<object> Objects { get; } = [731];
    public JsonArray ScalarNodes { get; } = new(JsonValue.Create(731), null);
    public JsonArray Nodes { get; } = new(new JsonObject { [nameof(Leaf.Value)] = 731 });
    public int Scalar { get; set; } = 731;
    public int CopiedInt { get; set; }
    public string CopiedString { get; set; } = string.Empty;
}

public sealed class DivergentList : List<int>, IList
{
    public DivergentList() : base([731])
    {
    }
    public int NonGenericReads { get; private set; }
    object? IList.this[int index]
    {
        get
        {
            NonGenericReads++;

            return base[index] + 1000;
        }
        set => base[index] = (int)(value ?? throw new ArgumentNullException(nameof(value)));
    }
}

public sealed class DivergentModel
{
    public DivergentList Values { get; } = new();
}

internal delegate bool TryRead(object target, string segment, JsonSerializerOptions options, out object? value, out string? error);

internal static class Bindings
{
    internal static readonly Assembly Owner = typeof(JsonPatchDocument).Assembly;
    internal static readonly Func<object, int, object?> GetElement = Owner.GetType(
        "Microsoft.AspNetCore.JsonPatch.SystemTextJson.Helpers.GenericListOrJsonArrayUtilities", throwOnError: true)!
        .GetMethod("GetElementAt", BindingFlags.Static | BindingFlags.NonPublic)!
        .CreateDelegate<Func<object, int, object?>>();

    internal static TryRead Reader(object target, string method)
    {
        var type = Owner.GetType("Microsoft.AspNetCore.JsonPatch.SystemTextJson.Adapters.AdapterFactory", throwOnError: true)!;
        var factory = type.GetProperty("Default", BindingFlags.NonPublic | BindingFlags.Static)!.GetValue(null)!;
        var adapter = type.GetMethod("Create")!.Invoke(factory, [target])!;

        return adapter.GetType().GetMethod(method)!.CreateDelegate<TryRead>(adapter);
    }
}

internal sealed class Workload
{
    private readonly Model _model = new();
    private readonly Spec _spec;
    private readonly Func<object?> _run;
    private readonly JsonPatchDocument? _patch;
    internal object Input { get; }

    internal Workload(Spec spec)
    {
        _spec = spec;
        object target = spec.Target switch
        {
            Target.Int => _model.Ints,
            Target.Long => _model.Longs,
            Target.Decimal => _model.Decimals,
            Target.Guid => _model.Guids,
            Target.Struct => _model.Structs,
            Target.NullableValue or Target.NullableNull => _model.Nullable,
            Target.String => _model.Strings,
            Target.Reference => _model.References,
            Target.Preboxed => _model.Objects,
            Target.JsonValue or Target.JsonNull => _model.ScalarNodes,
            Target.Model => _model,
            _ => throw new ArgumentOutOfRangeException(nameof(spec))
        };
        Input = new
        {
            spec.Label, mode = spec.Mode.ToString(), target = spec.Target.ToString(), spec.Index, spec.Patch,
            targetRuntimeType = target.GetType().FullName, initialModel = JsonSerializer.Serialize(_model)
        };
        if (spec.Mode == Mode.Patch)
        {
            var patch = JsonSerializer.Deserialize<JsonPatchDocument>(spec.Patch)
                ?? throw new JsonException("The real JSON Patch converter must produce a document.");
            _patch = patch;
            _run = () =>
            {
                patch.ApplyTo(_model);

                return null;
            };
        }
        else if (spec.Mode is Mode.Get or Mode.Traverse)
        {
            var reader = Bindings.Reader(target, spec.Mode == Mode.Get ? "TryGet" : "TryTraverse");
            var segment = spec.Index.ToString(CultureInfo.InvariantCulture);
            Evidence.Require(reader(target, segment, JsonSerializerOptions.Default, out _, out var error) && error is null,
                "The actual factory-selected reader must succeed before timing.");
            _run = () =>
            {
                reader(target, segment, JsonSerializerOptions.Default, out var value, out _);

                return value;
            };
        }
        else
        {
            _run = () => Bindings.GetElement(target, spec.Index);
        }
    }

    internal object? Run() => _run();

    internal object Verify()
    {
        var result = Run();
        if (_spec.Mode == Mode.Patch)
        {
            Evidence.Require(result is null && _patch is not null &&
                _patch.Operations.Count == (_spec.Label == "PatchTestInt8" ? 8 : 1), "Actual complete public patch required.");
        }
        else
        {
            var expected = _spec.Target switch
            {
                Target.Int or Target.NullableValue or Target.Preboxed => result is int value && value == 731,
                Target.Long => result is long value && value == 1099511627777,
                Target.Decimal => result is decimal value && value == 1234.125m,
                Target.Guid => result is Guid value && value == Guid.Parse("00112233-4455-6677-8899-aabbccddeeff"),
                Target.Struct => result is MutableNumber { Value: 731, Stamp: 1099511627777 },
                Target.NullableNull or Target.JsonNull => result is null,
                Target.String => result is string value && value == Model.Text && ReferenceEquals(result, _model.Strings[0]),
                Target.Reference => result is Leaf { Value: 731, Text: Model.Text } && ReferenceEquals(result, _model.References[0]),
                Target.JsonValue => result is JsonValue value && value.GetValue<int>() == 731 && ReferenceEquals(result, _model.ScalarNodes[0]),
                _ => false
            };
            Evidence.Require(expected, "Exact result value/type/reference/nullable contract differs:" + _spec.Label);
            if (_spec.Target == Target.Preboxed)
            {
                Evidence.Require(ReferenceEquals(result, _model.Objects[0]), "Existing object element must remain the same object.");
            }
        }
        var expectedModel = new Model
        {
            CopiedInt = _spec.Label == "PatchCopyInt" ? 731 : 0,
            CopiedString = _spec.Label == "PatchCopyString" ? Model.Text : string.Empty
        };
        var actualModel = JsonSerializer.Serialize(_model);
        Evidence.Require(actualModel == JsonSerializer.Serialize(expectedModel), "Complete final model differs:" + _spec.Label);

        return new
        {
            _spec.Label, mode = _spec.Mode.ToString(), resultType = result?.GetType().FullName,
            resultJson = JsonSerializer.Serialize(result, result?.GetType() ?? typeof(object)),
            finalModel = actualModel, patchOperations = _patch?.Operations.Count ?? 0, passed = true
        };
    }

    internal static object VerifyObjectBoundary()
    {
        var values = new List<int> { 731 };
        var first = Bindings.GetElement(values, 0);
        values[0] = 997;
        var next = Bindings.GetElement(values, 0);
        Evidence.Require(first is 731 && next is 997, "A later real list mutation must be observed without changing the prior boxed value.");
        var structs = new List<MutableNumber> { new(731) };
        var boxed = Bindings.GetElement(structs, 0) ?? throw new InvalidOperationException("Mutable value must be boxed.");
        ((IMutableNumber)boxed).Value = 997;
        var subsequent = Bindings.GetElement(structs, 0);
        Evidence.Require(((IMutableNumber)boxed).Value == 997 && structs[0].Value == 731 &&
            subsequent is MutableNumber { Value: 731 }, "Escaped boxed-struct mutation must not affect list storage or later value reads.");
        var divergent = new DivergentModel();
        var document = JsonSerializer.Deserialize<JsonPatchDocument>(
            """[{"op":"test","path":"/Values/0","value":1731}]""")
            ?? throw new JsonException("Public differential contract requires the real converter.");
        document.ApplyTo(divergent);
        Evidence.Require(divergent.Values.NonGenericReads == 1 && ((IList<int>)divergent.Values)[0] == 731,
            "The public operation must reach the actual non-generic producer,not silently select a different generic indexer.");
        var opposite = JsonSerializer.Deserialize<JsonPatchDocument>(
            """[{"op":"test","path":"/Values/0","value":731}]""")
            ?? throw new JsonException("Nearest-opposite control requires the real converter.");
        string failure;
        try
        {
            opposite.ApplyTo(divergent);
            throw new InvalidOperationException("The divergent generic-only value must not pass the current public test.");
        }
        catch (JsonPatchException exception)
        {
            failure = exception.Message;
        }
        Evidence.Require(divergent.Values.NonGenericReads == 2, "Both real public tests must reach the owning non-generic getter.");
        foreach (var target in new object[] { new[] { 731 }, new ArrayList { 731 } })
        {
            var reader = Bindings.Reader(target, "TryGet");
            Evidence.Require(!reader(target, "0", JsonSerializerOptions.Default, out var value, out var error) &&
                value is null && error is not null, "Current actual factory-selected unsupported-target contract must remain.");
        }

        return new
        {
            candidate = "F115", listMutationObserved = true, boxedMutableStructIsolated = true,
            currentPipelineReturnType = Bindings.GetElement.Method.ReturnType.FullName,
            publicDivergentNonGenericValue = 1731, genericIndexerValue = 731, publicNonGenericReads = 2,
            nearestOppositePublicTestFailed = true, nearestOppositeMessage = failure,
            actualArrayAndNonGenericListRejected = true,
            limitation = "Internal object-valued pipeline,not a public IAdapter API. Different generic/typed-return or cached-box strategies are not assumed equivalent;no universal future redesign impossibility claim."
        };
    }
}
