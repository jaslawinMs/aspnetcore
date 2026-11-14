// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Custom.Http.Rule;
using Grpc.Shared;
using Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.TestObjects;
using Transcoding;

namespace Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests;

public class ServiceDescriptorHelpersTests
{
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

    [Fact]
    public void ResolveBodyDescriptor_Wildcard_PreservesMessageDescriptor()
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");

        var body = ServiceDescriptorHelpers.ResolveBodyDescriptor("*", typeof(JsonTranscodingGreeterService), method);

        Assert.NotNull(body);
        Assert.Same(method.InputType, body.Descriptor);
        Assert.Null(body.FieldDescriptor);
        Assert.False(body.IsDescriptorRepeated);
    }

    [Theory]
    [InlineData("sub", false, nameof(HelloRequest.Sub))]
    [InlineData("repeated_strings", true, nameof(HelloRequest.RepeatedStrings))]
    public void ResolveBodyDescriptor_NamedField_PreservesBindingMetadata(string name, bool repeated, string propertyName)
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");
        var field = method.InputType.FindFieldByName(name);

        var body = ServiceDescriptorHelpers.ResolveBodyDescriptor(name, typeof(JsonTranscodingGreeterService), method);

        Assert.NotNull(body);
        Assert.Same(repeated ? method.InputType : field.MessageType, body.Descriptor);
        Assert.Same(field, body.FieldDescriptor);
        Assert.Equal(repeated, body.IsDescriptorRepeated);
        Assert.Equal(propertyName, body.PropertyInfo?.Name);
        Assert.Null(body.ParameterInfo);
    }

    [Fact]
    public void ResolveBodyDescriptor_EmptyBody_PreservesNoBody()
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");

        Assert.Null(ServiceDescriptorHelpers.ResolveBodyDescriptor("", typeof(JsonTranscodingGreeterService), method));
    }

    [Fact]
    public void ResolveBodyDescriptor_MissingField_PreservesException()
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ServiceDescriptorHelpers.ResolveBodyDescriptor("NoMatch", typeof(JsonTranscodingGreeterService), method));

        Assert.Equal("Couldn't find matching field for body 'NoMatch' on HelloRequest.", exception.Message);
    }

    [Fact]
    public void ResolveBodyDescriptor_NestedField_PreservesException()
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ServiceDescriptorHelpers.ResolveBodyDescriptor("sub.subfield", typeof(JsonTranscodingGreeterService), method));

        Assert.Equal("The body field 'sub.subfield' references a nested field. The body field name must be on the top-level request message.", exception.Message);
    }

    [Fact]
    public void ResolveBodyDescriptor_ScalarField_PreservesException()
    {
        var method = JsonTranscodingGreeter.Descriptor.FindMethodByName("Body");

        Assert.Throws<InvalidOperationException>(() =>
            ServiceDescriptorHelpers.ResolveBodyDescriptor("name", typeof(JsonTranscodingGreeterService), method));
    }
}
