using System.Security.Cryptography;
using System.Text;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.JsonPatch;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public class NewtonsoftPatchBenchmark
{
    private JsonPatchDocument _document = null!;
    private PatchTarget _target = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var kind in new[] { "LongToInt", "StringToInt", "StringToEnum" })
            {
                foreach (var count in new[] { 1, 8, 64 })
                {
                    yield return $"{kind}_{count}";
                }
            }

            foreach (var kind in new[] { "JsonObject", "ProgrammaticObject" })
            {
                foreach (var count in new[] { 1, 8 })
                {
                    foreach (var length in new[] { 16, 1024, 16384 })
                    {
                        yield return $"{kind}_{count}_{length}";
                    }
                }
            }

            foreach (var kind in new[] { "Assignable", "NullNullable", "Copy" })
            {
                foreach (var count in new[] { 1, 64 })
                {
                    yield return $"{kind}_{count}";
                }
            }

            yield return "EmptyNullable_8";
        }
    }

    public int VerifiedOperations { get; private set; }
    public string VerifiedIncomingType { get; private set; } = "";
    public string VerifiedOutputHash { get; private set; } = "";
    public string VerifiedOutput { get; private set; } = "";
    public bool VerifiedIndependentCopy { get; private set; }

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var kind = parts[0];
        var count = int.Parse(parts[1]);
        var length = parts.Length == 3 ? int.Parse(parts[2]) : 16;
        _target = new PatchTarget();
        _document = new JsonPatchDocument();
        object? input = kind switch
        {
            "LongToInt" => 42L,
            "StringToInt" => "42",
            "StringToEnum" => nameof(DayOfWeek.Friday),
            "Assignable" => 42,
            "NullNullable" => null,
            "EmptyNullable" => "",
            "JsonObject" or "ProgrammaticObject" => new
            {
                Name = new string('a', length),
                Numbers = Enumerable.Range(0, 16).ToArray()
            },
            "Copy" => null,
            _ => throw new InvalidOperationException($"Unknown case: {Case}")
        };
        var member = kind switch
        {
            "StringToEnum" => nameof(PatchTarget.Day),
            "NullNullable" or "EmptyNullable" => nameof(PatchTarget.NullableNumber),
            "JsonObject" or "ProgrammaticObject" => nameof(PatchTarget.Payload),
            "Copy" => nameof(PatchTarget.CopiedPayload),
            _ => nameof(PatchTarget.Number)
        };
        if (kind == "Copy")
        {
            _target.Payload = new Payload
            {
                Name = "original",
                Numbers = Enumerable.Range(0, 16).ToArray()
            };
        }

        for (var index = 0; index < count; index++)
        {
            if (kind == "Copy")
            {
                _document.Copy(nameof(PatchTarget.Payload), member);
            }
            else
            {
                _document.Replace(member, input);
            }
        }

        if (kind == "JsonObject")
        {
            _document = JsonConvert.DeserializeObject<JsonPatchDocument>(
                JsonConvert.SerializeObject(_document))!;
            Require(_document.Operations.All(operation => operation.value is JObject),
                "The JSON patch producer must supply JObject values.");
        }

        _document.ApplyTo(_target);
        switch (kind)
        {
            case "LongToInt":
            case "StringToInt":
            case "Assignable":
                Require(_target.Number == 42, "The complete integer result differs.");
                break;
            case "StringToEnum":
                Require(_target.Day == DayOfWeek.Friday, "The enum result differs.");
                break;
            case "NullNullable":
            case "EmptyNullable":
                Require(_target.NullableNumber is null, "Existing nullable coercion differs.");
                break;
            case "JsonObject":
            case "ProgrammaticObject":
                Require(_target.Payload?.Name == new string('a', length) &&
                    _target.Payload.Numbers.SequenceEqual(Enumerable.Range(0, 16)),
                    "The complete payload differs.");
                break;
            case "Copy":
                var source = _target.Payload ?? throw new InvalidOperationException("The copy source is missing.");
                var copy = _target.CopiedPayload ?? throw new InvalidOperationException("The copy result is missing.");
                Require(!ReferenceEquals(source, copy) &&
                    !ReferenceEquals(source.Numbers, copy.Numbers),
                    "Copy must produce independent objects and arrays.");
                Require(copy.Name == "original" &&
                    copy.Numbers.SequenceEqual(Enumerable.Range(0, 16)),
                    "The complete copied payload differs.");
                copy.Numbers[0] = -1;
                Require(source.Numbers[0] == 0, "Mutating the copy changed its source.");
                copy.Numbers[0] = 0;
                VerifiedIndependentCopy = true;
                break;
        }

        VerifiedOperations = _document.Operations.Count;
        Require(VerifiedOperations == count, "The patch producer omitted an operation.");
        VerifiedIncomingType = _document.Operations[0].value?.GetType().FullName ?? "null";
        VerifiedOutput = JsonConvert.SerializeObject(_target);
        VerifiedOutputHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(VerifiedOutput)));
    }

    [Benchmark]
    public object ApplyPatch()
    {
        _document.ApplyTo(_target);

        return _target;
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public class PatchTarget
    {
        public int Number { get; set; } = -1;
        public DayOfWeek Day { get; set; } = DayOfWeek.Monday;
        public int? NullableNumber { get; set; } = -1;
        public Payload? Payload { get; set; }
        public Payload? CopiedPayload { get; set; }
    }

    public class Payload
    {
        public string Name { get; set; } = "";
        public int[] Numbers { get; set; } = [];
    }
}
