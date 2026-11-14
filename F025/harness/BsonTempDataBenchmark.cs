using System.Buffers.Binary;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Mvc.ViewFeatures.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

public class BsonTempDataBenchmark
{
    private ServiceProvider _services = null!;
    private TempDataSerializer _serializer = null!;
    private IDictionary<string, object?> _values = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var count in new[] { 1, 8, 64 })
            {
                foreach (var length in new[] { 16, 1024, 16384 })
                {
                    yield return $"Text_{count}_{length}";
                }
            }
            foreach (var repetitions in new[] { 8, 2048, 131072 })
            {
                yield return $"Unicode_1_{repetitions}";
            }
            foreach (var count in new[] { 1, 8 })
            {
                foreach (var length in new[] { 8, 256, 4096 })
                {
                    yield return $"Array_{count}_{length}";
                }
            }
            yield return "Mixed";
            yield return "Empty";
            yield return "Null";
        }
    }

    public int VerifiedLength { get; private set; }
    public string VerifiedHash { get; private set; } = null!;
    public string VerifiedRoundTrip { get; private set; } = null!;
    public string? VerifiedCookieProducer { get; private set; }

    [GlobalSetup]
    public void Setup()
    {
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddSingleton(typeof(ILogger<>), typeof(NullLogger<>));
        services.AddMvcCore().AddNewtonsoftJson();
        _services = services.BuildServiceProvider();
        _serializer = _services.GetRequiredService<TempDataSerializer>();
        Require(_serializer.GetType().FullName ==
            "Microsoft.AspNetCore.Mvc.NewtonsoftJson.BsonTempDataSerializer", "Actual BSON codec must be resolved.");
        _values = CreateValues(Case);
        var bytes = _serializer.Serialize(_values);
        VerifiedLength = bytes.Length;
        VerifiedHash = Convert.ToHexString(SHA256.HashData(bytes));
        if (Case is "Empty" or "Null")
        {
            Require(ReferenceEquals(bytes, Array.Empty<byte>()), "Empty/null must retain the existing shared empty result.");
            VerifiedRoundTrip = "Not deserialized: provider does not store an empty payload.";
        }
        else
        {
            Require(BinaryPrimitives.ReadInt32LittleEndian(bytes) == bytes.Length && bytes[^1] == 0,
                "Complete BSON document framing must match.");
            if (Case.StartsWith("Text_", StringComparison.Ordinal) ||
                Case.StartsWith("Unicode_", StringComparison.Ordinal))
            {
                Require(bytes.AsSpan().SequenceEqual(EncodeStringDocument(_values)),
                    "Complete string BSON bytes must match the independent framing oracle.");
            }
            var restored = _serializer.Deserialize(bytes);
            VerifyDictionary(_values, restored);
            VerifiedRoundTrip = JsonSerializer.Serialize(restored);
            var ownedCopy = bytes.ToArray();
            var other = _serializer.Serialize(new Dictionary<string, object?>
            {
                ["Other"] = new string('z', Math.Max(16, bytes.Length)),
            });
            Require(!ReferenceEquals(bytes, other) && bytes.AsSpan().SequenceEqual(ownedCopy),
                "Another serialization must not mutate an independently owned result.");
        }
        VerifyUnsupportedType();
        if (Case == "Mixed")
        {
            VerifyCookieProducer();
        }
    }

    [Benchmark]
    public byte[] Serialize()
    {
        return _serializer.Serialize(_values);
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services?.Dispose();
    }

    private static IDictionary<string, object?> CreateValues(string name)
    {
        if (name == "Null")
        {
            return null!;
        }
        if (name == "Empty")
        {
            return new Dictionary<string, object?>();
        }
        if (name == "Mixed")
        {
            return new Dictionary<string, object?>
            {
                ["Text"] = "text-\u00E9\u6F22\u5B57\uD83D\uDE42",
                ["Integer"] = 123,
                ["Long"] = 2147483664L,
                ["Boolean"] = true,
                ["Double"] = 1.5d,
                ["Decimal"] = 2.25m,
                ["Guid"] = new Guid("00112233-4455-6677-8899-aabbccddeeff"),
                ["Utc"] = new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc),
                ["Offset"] = new DateTimeOffset(2024, 1, 2, 3, 4, 5, TimeSpan.FromHours(2)),
                ["Uri"] = new Uri("https://example.invalid/tempdata"),
                ["Enum"] = DayOfWeek.Wednesday,
                ["Null"] = null,
                ["Integers"] = new[] { 1, -2, 3 },
                ["Strings"] = new[] { "first", "\u00E9", "third" },
                ["Dictionary"] = new Dictionary<string, int> { ["Alpha"] = 1, ["Beta"] = -2 },
                ["Binary"] = new byte[] { 0, 1, 255 },
            };
        }
        var parts = name.Split('_');
        Require(parts.Length == 3, "Unexpected case identity.");
        var count = int.Parse(parts[1], CultureInfo.InvariantCulture);
        var length = int.Parse(parts[2], CultureInfo.InvariantCulture);
        var values = new Dictionary<string, object?>(count);
        for (var i = 0; i < count; i++)
        {
            values.Add($"Key{i}", parts[0] switch
            {
                "Text" => new string('a', length),
                "Unicode" => string.Concat(Enumerable.Repeat("\u00E9\u6F22\u5B57\uD83D\uDE42", length)),
                "Array" => Enumerable.Range(0, length).Select(number => number - length / 2).ToArray(),
                _ => throw new ArgumentOutOfRangeException(nameof(name), name, "Unexpected input family."),
            });
        }

        return values;
    }

    private static byte[] EncodeStringDocument(IDictionary<string, object?> values)
    {
        var length = 5 + values.Sum(item =>
            1 + Encoding.UTF8.GetByteCount(item.Key) + 1 + 4 + Encoding.UTF8.GetByteCount((string)item.Value!) + 1);
        var bytes = new byte[length];
        BinaryPrimitives.WriteInt32LittleEndian(bytes, length);
        var offset = 4;
        foreach (var item in values)
        {
            bytes[offset++] = 2;
            offset += Encoding.UTF8.GetBytes(item.Key, bytes.AsSpan(offset));
            offset++;
            var text = (string)item.Value!;
            var textBytes = Encoding.UTF8.GetByteCount(text);
            BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(offset), textBytes + 1);
            offset += 4;
            offset += Encoding.UTF8.GetBytes(text, bytes.AsSpan(offset));
            offset++;
        }
        Require(offset == length - 1, "Independent BSON oracle must fill the complete document.");

        return bytes;
    }

    private static void VerifyDictionary(IDictionary<string, object?> input, IDictionary<string, object?> restored)
    {
        Require(input.Count == restored.Count, "Complete round-trip key count must match.");
        foreach (var item in input)
        {
            Require(restored.TryGetValue(item.Key.ToUpperInvariant(), out var actual),
                $"Case-insensitive round-trip key missing: {item.Key}.");
            var expected = item.Value switch
            {
                decimal value => (object)(double)value,
                DateTime value => value.ToLocalTime(),
                DateTimeOffset value => value.LocalDateTime,
                Uri value => value.ToString(),
                DayOfWeek value => (int)value,
                _ => item.Value,
            };
            if (expected is int[] integers)
            {
                Require(actual is int[] actualIntegers && integers.SequenceEqual(actualIntegers),
                    $"Complete integer array differs: {item.Key}.");
            }
            else if (expected is string[] strings)
            {
                Require(actual is string[] actualStrings && strings.SequenceEqual(actualStrings),
                    $"Complete string array differs: {item.Key}.");
            }
            else if (expected is byte[] binary)
            {
                Require(actual is byte[] actualBinary && binary.SequenceEqual(actualBinary),
                    $"Complete binary payload differs: {item.Key}.");
            }
            else if (expected is IDictionary<string, int> dictionary)
            {
                Require(actual is IDictionary<string, int> actualDictionary &&
                    actualDictionary.Count == dictionary.Count &&
                    dictionary.All(pair => actualDictionary.TryGetValue(pair.Key, out var value) && value == pair.Value),
                    $"Complete nested dictionary differs: {item.Key}.");
            }
            else
            {
                Require(Equals(expected, actual), $"Round-trip value differs: {item.Key}.");
            }
        }
    }

    private void VerifyUnsupportedType()
    {
        try
        {
            _serializer.Serialize(new Dictionary<string, object?> { ["Unsupported"] = new object() });
        }
        catch (InvalidOperationException exception)
        {
            Require(exception.Message == "The 'Microsoft.AspNetCore.Mvc.NewtonsoftJson.BsonTempDataSerializer' " +
                "cannot serialize an object of type 'System.Object'.", "Unsupported-type error contract changed.");
            return;
        }

        throw new InvalidOperationException("Unsupported objects must be rejected.");
    }

    private void VerifyCookieProducer()
    {
        var observed = new ObservedSerializer(_serializer);
        var provider = new CookieTempDataProvider(new EphemeralDataProtectionProvider(), NullLoggerFactory.Instance,
            Options.Create(new CookieTempDataProviderOptions()), observed);
        var response = new DefaultHttpContext();
        provider.SaveTempData(response, _values);
        Require(observed.SerializeCalls == 1 && response.Response.Headers.SetCookie.Count > 0,
            "Real cookie TempData save must invoke the actual BSON serializer and emit cookies.");
        var request = new DefaultHttpContext();
        request.Request.Headers.Cookie = string.Join("; ",
            response.Response.Headers.SetCookie.Select(cookie => cookie!.Split(';', 2)[0]));
        var restored = provider.LoadTempData(request);
        Require(observed.DeserializeCalls == 1, "Real cookie TempData load must consume the emitted payload.");
        VerifyDictionary(_values, restored);
        VerifiedCookieProducer = JsonSerializer.Serialize(new
        {
            serializer = _serializer.GetType().FullName,
            saves = observed.SerializeCalls,
            loads = observed.DeserializeCalls,
            response_cookies = response.Response.Headers.SetCookie.Count,
            complete_restored_dictionary = restored,
        });
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed class ObservedSerializer(TempDataSerializer serializer) : TempDataSerializer
    {
        public int SerializeCalls { get; private set; }
        public int DeserializeCalls { get; private set; }

        public override byte[] Serialize(IDictionary<string, object?> values)
        {
            SerializeCalls++;
            return serializer.Serialize(values);
        }

        public override IDictionary<string, object?> Deserialize(byte[] value)
        {
            DeserializeCalls++;
            return serializer.Deserialize(value);
        }

        public override bool CanSerializeType(Type type)
        {
            return serializer.CanSerializeType(type);
        }
    }
}
