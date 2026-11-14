// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Xunit;

namespace Microsoft.AspNetCore.JsonPatch.IntegrationTests;

public class ConversionIntegrationTest
{
    [Fact]
    public void Replace_NestedObjectValue_PreservesDateParsing()
    {
        var target = new ConversionTarget();
        var patch = new JsonPatchDocument();
        patch.Replace(nameof(ConversionTarget.Object), new Dictionary<string, object>
        {
            [nameof(ObjectValue.Value)] = "2024-01-02T03:04:05Z"
        });

        patch.ApplyTo(target);

        var value = Assert.IsType<DateTime>(target.Object.Value);
        Assert.Equal(new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc), value);
        Assert.Equal(DateTimeKind.Utc, value.Kind);
    }

    [Fact]
    public void Replace_NestedObjectValue_PreservesFloatingPointParsing()
    {
        var target = new ConversionTarget();
        var patch = new JsonPatchDocument();
        patch.Replace(nameof(ConversionTarget.Object), new Dictionary<string, object>
        {
            [nameof(ObjectValue.Value)] = 1.25m
        });

        patch.ApplyTo(target);

        Assert.Equal(1.25d, Assert.IsType<double>(target.Object.Value));
    }

    [Fact]
    public void Replace_ByteArrayValue_UsesTextTokenForDestinationConverter()
    {
        var target = new ConversionTarget();
        var patch = new JsonPatchDocument();
        patch.Replace(nameof(ConversionTarget.Encoded), new byte[] { 0, 1, 255 });

        patch.ApplyTo(target);

        Assert.Equal(JsonToken.String, target.Encoded.Token);
        Assert.Equal("AAH/", target.Encoded.Value);
    }

    private class ConversionTarget
    {
        public ObjectValue Object { get; set; }

        public EncodedValue Encoded { get; set; }
    }

    private class ObjectValue
    {
        public object Value { get; set; }
    }

    [JsonConverter(typeof(EncodedValueConverter))]
    private class EncodedValue
    {
        public JsonToken Token { get; set; }

        public string Value { get; set; }
    }

    private class EncodedValueConverter : JsonConverter
    {
        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(EncodedValue);
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            if (reader.TokenType is not JsonToken.String)
            {
                throw new JsonSerializationException("Expected a base64 JSON string.");
            }

            return new EncodedValue { Token = reader.TokenType, Value = (string)reader.Value };
        }

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            writer.WriteValue(((EncodedValue)value).Value);
        }
    }
}
