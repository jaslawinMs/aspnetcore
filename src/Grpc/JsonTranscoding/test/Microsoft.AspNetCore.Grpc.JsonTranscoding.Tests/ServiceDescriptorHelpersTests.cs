// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Custom.Http.Rule;
using Grpc.Shared;
using Microsoft.AspNetCore.InternalTesting;
using Transcoding;

namespace Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests;

public class ServiceDescriptorHelpersTests
{
    [Theory]
    [InlineData("", "", "", "", "")]
    [InlineData("_", "", "", "", "")]
    [InlineData("#", "_", "_", "_", "_")]
    [InlineData("a", "a", "A", "a", "A")]
    [InlineData("A", "a", "A", "a", "A")]
    [InlineData("__foo_bar", "FooBar", "FooBar", "FooBar", "FooBar")]
    [InlineData("foo__BAR", "fooBAR", "FooBAR", "fooBAR", "FooBAR")]
    [InlineData("FOO_bar", "fOOBar", "FOOBar", "fOOBar", "FOOBar")]
    [InlineData("a1b2c", "a1B2C", "A1B2C", "a1B2C", "A1B2C")]
    [InlineData("123_name", "123Name", "123Name", "123Name", "123Name")]
    [InlineData("foo.bar#", "fooBar_", "FooBar_", "foo.Bar_", "Foo.Bar_")]
    [InlineData(".a..b", "AB", "AB", ".A..B", ".A..B")]
    [InlineData("foo_#", "foo_", "Foo_", "foo_", "Foo_")]
    [InlineData("foo-baR", "fooBaR", "FooBaR", "fooBaR", "FooBaR")]
    [InlineData("\u00e9t\u00e9_name", "\u00e9t\u00e9Name", "\u00c9t\u00e9Name", "\u00e9t\u00e9Name", "\u00c9t\u00e9Name")]
    [InlineData("\u00c9T\u00c9_name", "\u00e9T\u00c9Name", "\u00c9T\u00c9Name", "\u00e9T\u00c9Name", "\u00c9T\u00c9Name")]
    [InlineData("a\u0661b", "a\u0661B", "A\u0661B", "a\u0661B", "A\u0661B")]
    [InlineData("\ud83d\ude00foo_\ud801\udc00bar", "FooBar", "FooBar", "FooBar", "FooBar")]
    [InlineData("\u03c3_\u03c2", "\u03c3\u03a3", "\u03a3\u03a3", "\u03c3\u03a3", "\u03a3\u03a3")]
    [InlineData("\u03a3_\u03c3", "\u03c3\u03a3", "\u03a3\u03a3", "\u03c3\u03a3", "\u03a3\u03a3")]
    [InlineData("i_id", "iId", "IId", "iId", "IId")]
    [InlineData("I_ID", "iID", "IID", "iID", "IID")]
    public void FormatUnderscoreName_PreservesInvariantCharacterTransitions(
        string input, string camel, string pascal, string camelPeriods, string pascalPeriods)
    {
        Assert.Equal(camel, ServiceDescriptorHelpers.FormatUnderscoreName(input, pascalCase: false, preservePeriod: false));
        Assert.Equal(pascal, ServiceDescriptorHelpers.FormatUnderscoreName(input, pascalCase: true, preservePeriod: false));
        Assert.Equal(camelPeriods, ServiceDescriptorHelpers.FormatUnderscoreName(input, pascalCase: false, preservePeriod: true));
        Assert.Equal(pascalPeriods, ServiceDescriptorHelpers.FormatUnderscoreName(input, pascalCase: true, preservePeriod: true));
    }

    [Fact]
    [UseCulture("tr-TR")]
    public void FormatUnderscoreName_PreservesInvariantCasingUnderTurkishCulture()
    {
        Assert.Equal("tr-TR", System.Globalization.CultureInfo.CurrentCulture.Name);
        Assert.Equal("IId", ServiceDescriptorHelpers.FormatUnderscoreName("i_id", pascalCase: true, preservePeriod: false));
        Assert.Equal("iID", ServiceDescriptorHelpers.FormatUnderscoreName("I_ID", pascalCase: false, preservePeriod: false));
    }

    [Theory]
    [InlineData("sub", false, nameof(HelloRequest.Sub))]
    [InlineData("sub_data", false, nameof(HelloRequest.SubData))]
    [InlineData("repeated_strings", true, nameof(HelloRequest.RepeatedStrings))]
    [InlineData("repeated_messages", true, nameof(HelloRequest.RepeatedMessages))]
    [InlineData("map_strings", true, nameof(HelloRequest.MapStrings))]
    public void ResolveBodyDescriptor_PreservesGeneratedPropertySelection(string body, bool repeated, string propertyName)
    {
        var method = JsonTranscodingGreeter.Descriptor.Methods.Single(
            method => method.Name == nameof(JsonTranscodingGreeter.JsonTranscodingGreeterBase.SayHello));
        var request = new HelloRequest
        {
            Sub = new HelloRequest.Types.SubMessage { Subfield = "first" },
            SubData = new HelloRequest.Types.SubMessage { Subfield = "second" },
        };
        request.RepeatedStrings.Add("third");
        request.RepeatedMessages.Add(new HelloRequest.Types.SubMessage { Subfield = "fourth" });
        request.MapStrings.Add("fifth", "value");

        var descriptor = ServiceDescriptorHelpers.ResolveBodyDescriptor(
            body, typeof(JsonTranscodingGreeter.JsonTranscodingGreeterBase), method);

        Assert.NotNull(descriptor);
        Assert.NotNull(descriptor.FieldDescriptor);
        Assert.NotNull(descriptor.PropertyInfo);
        Assert.Equal(body, descriptor.FieldDescriptor.Name);
        Assert.Equal(repeated, descriptor.IsDescriptorRepeated);
        Assert.Equal(propertyName, descriptor.PropertyInfo.Name);
        Assert.Same(descriptor.FieldDescriptor.Accessor.GetValue(request), descriptor.PropertyInfo.GetValue(request));
    }

    [Fact]
    public void TryGetHttpRule_CustomHttpRule_Success()
    {
        // Arrange
        var method = HelloService.Descriptor.Methods.Single(m => m.Name == "Say");

        // Act
        Assert.True(ServiceDescriptorHelpers.TryGetHttpRule(method, out var httpRule));

        // Assert
        Assert.Equal("/say", httpRule.Post);
        Assert.Equal("*", httpRule.Body);
    }
}
