using Microsoft.AspNetCore.JsonPatch;
using Newtonsoft.Json;

public static class ConversionContractProbe
{
    public static List<ContractReceipt> Run()
    {
        var receipts = new List<ContractReceipt>();
        foreach (var (name, value, expectedType) in new (string, object, Type)[]
        {
            ("NestedDate", "2024-01-02T03:04:05Z", typeof(DateTime)),
            ("NestedFloatingPoint", 1.25m, typeof(double))
        })
        {
            var target = new Target();
            var patch = new JsonPatchDocument();
            patch.Replace(nameof(Target.Object), new Dictionary<string, object>
            {
                [nameof(ObjectValue.Value)] = value
            });
            var errors = new List<JsonPatchError>();
            patch.ApplyTo(target, errors.Add);
            var actual = target.Object?.Value;
            var equivalent = expectedType == typeof(DateTime)
                ? actual is DateTime date && date == new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc) &&
                    date.Kind == DateTimeKind.Utc
                : actual is double number && number == 1.25d;
            receipts.Add(new ContractReceipt(name, errors.Count == 0 && equivalent,
                expectedType.FullName!, actual?.GetType().FullName ?? "null",
                JsonConvert.SerializeObject(actual), errors.Select(error => error.ErrorMessage).ToArray()));
        }

        var encodedTarget = new Target();
        var encodedPatch = new JsonPatchDocument();
        encodedPatch.Replace(nameof(Target.Encoded), new byte[] { 0, 1, 255 });
        var encodedErrors = new List<JsonPatchError>();
        EncodedValueConverter.ObservedToken = JsonToken.None;
        encodedPatch.ApplyTo(encodedTarget, encodedErrors.Add);
        receipts.Add(new ContractReceipt("ByteArrayDestinationConverter",
            encodedErrors.Count == 0 && encodedTarget.Encoded?.Value == "AAH/" &&
                EncodedValueConverter.ObservedToken == JsonToken.String,
            nameof(JsonToken.String), EncodedValueConverter.ObservedToken.ToString(),
            encodedTarget.Encoded?.Value ?? "null",
            encodedErrors.Select(error => error.ErrorMessage).ToArray()));

        var originalDefaults = JsonConvert.DefaultSettings;
        var defaultCalls = 0;
        var defaultTarget = new NewtonsoftPatchBenchmark.PatchTarget();
        var defaultPatch = new JsonPatchDocument();
        defaultPatch.Replace(nameof(NewtonsoftPatchBenchmark.PatchTarget.Number), 42L);
        try
        {
            JsonConvert.DefaultSettings = () =>
            {
                defaultCalls++;

                return new JsonSerializerSettings();
            };
            defaultPatch.ApplyTo(defaultTarget);
            receipts.Add(new ContractReceipt("IndependentDefaultSettingsStages",
                defaultCalls == 2 && defaultTarget.Number == 42,
                "2 factory invocations; integer 42", $"{defaultCalls} factory invocations; integer {defaultTarget.Number}",
                defaultTarget.Number.ToString(), []));
        }
        finally
        {
            JsonConvert.DefaultSettings = originalDefaults;
        }

        return receipts;
    }

    public record ContractReceipt(string name, bool compatible, string expected,
        string actual, string result, string[] patch_errors);

    public class Target
    {
        public ObjectValue? Object { get; set; }
        public EncodedValue? Encoded { get; set; }
    }

    public class ObjectValue
    {
        public object? Value { get; set; }
    }

    [JsonConverter(typeof(EncodedValueConverter))]
    public class EncodedValue
    {
        public string Value { get; set; } = "";
    }

    public class EncodedValueConverter : JsonConverter
    {
        public static JsonToken ObservedToken { get; set; }

        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(EncodedValue);
        }

        public override object ReadJson(JsonReader reader, Type objectType, object? existingValue, JsonSerializer serializer)
        {
            ObservedToken = reader.TokenType;
            if (reader.TokenType is not JsonToken.String)
            {
                throw new JsonSerializationException("Expected a base64 JSON string.");
            }

            return new EncodedValue { Value = (string)reader.Value! };
        }

        public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
        {
            writer.WriteValue(((EncodedValue)value!).Value);
        }
    }
}
