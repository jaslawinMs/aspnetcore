using System.Globalization;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

public class PatchConversionBenchmark
{
    private JsonPatchDocument _patch = null!;
    private PatchModel _model = null!;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var shape in new[] { "ConvertObject", "CopyObject", "CopyArray", "JsonElement" })
            {
                foreach (var size in new[] { 1, 16, 256, 4096 })
                {
                    yield return $"{shape}_{size}";
                }
            }

            yield return "ConvertScalar_1";
            yield return "Assignable_1";
        }
    }

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var shape = parts[0];
        var size = int.Parse(parts[1], CultureInfo.InvariantCulture);
        var payload = new Payload
        {
            Text = new string('x', size),
            Values = Enumerable.Range(0, size).ToArray(),
        };
        _model = new PatchModel { Source = payload, SourceArray = payload.Values };
        _patch = new JsonPatchDocument();
        switch (shape)
        {
            case "ConvertObject":
                _patch.Replace(nameof(PatchModel.Projection), payload);
                break;
            case "CopyObject":
                _patch.Copy(nameof(PatchModel.Source), nameof(PatchModel.Target));
                break;
            case "CopyArray":
                _patch.Copy(nameof(PatchModel.SourceArray), nameof(PatchModel.TargetArray));
                break;
            case "JsonElement":
                _patch.Replace(nameof(PatchModel.Projection), payload);
                _patch = JsonSerializer.Deserialize<JsonPatchDocument>(JsonSerializer.Serialize(_patch))!;
                if (_patch.Operations.Single().value is not JsonElement)
                {
                    throw new InvalidOperationException("The real patch deserializer did not produce JsonElement.");
                }
                break;
            case "ConvertScalar":
                _patch.Replace(nameof(PatchModel.Number), 42);
                break;
            case "Assignable":
                _patch.Replace(nameof(PatchModel.Target), payload);
                break;
            default:
                throw new InvalidOperationException("Unknown benchmark case.");
        }

        ApplyPatch();
        if (shape is "ConvertObject" or "JsonElement")
        {
            if (_model.Projection.Text != payload.Text ||
                !_model.Projection.Values.SequenceEqual(payload.Values) ||
                ReferenceEquals(_model.Projection.Values, payload.Values))
            {
                throw new InvalidOperationException("Actual public patch projection did not preserve the complete value.");
            }
        }
        else if (shape == "CopyObject")
        {
            if (ReferenceEquals(_model.Target, payload) ||
                ReferenceEquals(_model.Target.Values, payload.Values) ||
                _model.Target.Text != payload.Text ||
                !_model.Target.Values.SequenceEqual(payload.Values))
            {
                throw new InvalidOperationException("Actual public patch copy did not create an independent complete value.");
            }
        }
        else if (shape == "CopyArray")
        {
            if (ReferenceEquals(_model.TargetArray, payload.Values) ||
                !_model.TargetArray.SequenceEqual(payload.Values))
            {
                throw new InvalidOperationException("Actual public patch array copy was incomplete or aliased.");
            }
        }
        else if (shape == "ConvertScalar" && _model.Number != 42)
        {
            throw new InvalidOperationException("Actual integer-to-long patch conversion failed.");
        }
        else if (shape == "Assignable" && !ReferenceEquals(_model.Target, payload))
        {
            throw new InvalidOperationException("The assignable-value fast path changed object identity.");
        }
    }

    [Benchmark]
    public PatchModel ApplyPatch()
    {
        _patch.ApplyTo(_model);
        return _model;
    }

    public sealed class PatchModel
    {
        public long Number { get; set; }

        public Payload Source { get; set; } = null!;

        public Payload Target { get; set; } = null!;

        public ProjectionPayload Projection { get; set; } = null!;

        public int[] SourceArray { get; set; } = null!;

        public int[] TargetArray { get; set; } = null!;
    }

    public sealed class Payload
    {
        public string Text { get; set; } = null!;

        public int[] Values { get; set; } = null!;
    }

    public sealed class ProjectionPayload
    {
        public string Text { get; set; } = null!;

        public int[] Values { get; set; } = null!;
    }
}
