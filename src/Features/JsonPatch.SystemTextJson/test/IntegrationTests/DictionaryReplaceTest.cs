// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#nullable enable

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace Microsoft.AspNetCore.JsonPatch.SystemTextJson.IntegrationTests;

public class DictionaryReplaceTest
{
    [Fact]
    public void Replace_AlreadyTypedReference_PreservesIdentityWithoutConversion()
    {
        var converter = new PayloadConverter();
        var options = CreateOptions(converter);
        var expected = new Payload(42);
        var other = new Payload(7);
        var dictionary = new Dictionary<string, Payload> { ["Value"] = new(1), ["Other"] = other };
        var patch = new JsonPatchDocument { SerializerOptions = options }.Replace("/Value", expected);

        patch.ApplyTo(dictionary);

        Assert.Same(expected, dictionary["Value"]);
        Assert.Same(other, dictionary["Other"]);
        Assert.Equal(2, dictionary.Count);
        Assert.Equal(0, converter.ReadCalls);
        Assert.Equal(0, converter.WriteCalls);
    }

    [Fact]
    public void Replace_ExistingNullValue_PreservesDictionaryEntry()
    {
        var expected = new Payload(42);
        var dictionary = new Dictionary<string, Payload?> { ["Value"] = null };
        var patch = new JsonPatchDocument().Replace("/Value", expected);

        patch.ApplyTo(dictionary);

        Assert.Same(expected, dictionary["Value"]);
        Assert.Single(dictionary);
    }

    [Fact]
    public void Replace_MissingKey_ReportsErrorBeforeValueConversion()
    {
        var converter = new PayloadConverter();
        var other = new Payload(7);
        var dictionary = new Dictionary<string, Payload> { ["Other"] = other };
        var patch = JsonSerializer.Deserialize<JsonPatchDocument>(
            """[{"op":"replace","path":"/Value","value":42}]""", CreateOptions(converter))!;
        var errors = new List<JsonPatchError>();
        Assert.IsType<JsonElement>(patch.Operations[0].value);

        patch.ApplyTo(dictionary, errors.Add);

        var error = Assert.Single(errors);
        Assert.Equal("The target location specified by path segment 'Value' was not found.", error.ErrorMessage);
        Assert.Same(other, dictionary["Other"]);
        Assert.Single(dictionary);
        Assert.False(dictionary.ContainsKey("Value"));
        Assert.Equal(0, converter.ReadCalls);
        Assert.Equal(0, converter.WriteCalls);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Replace_ConverterChangesDictionary_WritesCurrentStorage(bool clear)
    {
        var other = new Payload(7);
        var inserted = new Payload(-1);
        var dictionary = new Dictionary<string, Payload> { ["Value"] = new(1), ["Other"] = other };
        var capacity = dictionary.EnsureCapacity(0);
        var observedOriginal = false;
        var converter = new PayloadConverter(() =>
        {
            observedOriginal = dictionary["Value"].Value == 1;
            if (clear)
            {
                dictionary.Clear();
                dictionary.Add("Inserted", inserted);
            }
            else
            {
                for (var index = 0; index < 128; index++)
                {
                    dictionary.Add($"Added{index}", new Payload(index));
                }
            }
        });
        var patch = JsonSerializer.Deserialize<JsonPatchDocument>(
            """[{"op":"replace","path":"/Value","value":42}]""", CreateOptions(converter))!;
        Assert.IsType<JsonElement>(patch.Operations[0].value);
        Assert.Equal(0, converter.ReadCalls);

        patch.ApplyTo(dictionary);

        Assert.True(observedOriginal);
        Assert.Equal(1, converter.ReadCalls);
        Assert.Equal(0, converter.WriteCalls);
        Assert.Equal(42, dictionary["Value"].Value);
        if (clear)
        {
            Assert.Equal(2, dictionary.Count);
            Assert.Same(inserted, dictionary["Inserted"]);
            Assert.False(dictionary.ContainsKey("Other"));
        }
        else
        {
            Assert.Equal(130, dictionary.Count);
            Assert.True(dictionary.EnsureCapacity(0) > capacity);
            Assert.Same(other, dictionary["Other"]);
            Assert.Equal(127, dictionary["Added127"].Value);
        }
    }

    private static JsonSerializerOptions CreateOptions(PayloadConverter converter)
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(converter);

        return options;
    }

    private sealed record Payload(int Value);

    private sealed class PayloadConverter(Action? converting = null) : JsonConverter<Payload>
    {
        internal int ReadCalls { get; private set; }
        internal int WriteCalls { get; private set; }

        public override Payload Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            ReadCalls++;
            var value = reader.GetInt32();
            converting?.Invoke();

            return new Payload(value);
        }

        public override void Write(Utf8JsonWriter writer, Payload value, JsonSerializerOptions options)
        {
            WriteCalls++;
            writer.WriteNumberValue(value.Value);
        }
    }
}
