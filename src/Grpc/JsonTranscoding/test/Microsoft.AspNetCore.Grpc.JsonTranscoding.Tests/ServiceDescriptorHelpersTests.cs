// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Custom.Http.Rule;
using Google.Protobuf.Reflection;
using Grpc.Shared;
using Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.TestObjects;
using TranscodingRequest = Transcoding.HelloRequest;

namespace Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests;

public class ServiceDescriptorHelpersTests
{
    private static readonly MethodDescriptor BodyMethod = Transcoding.JsonTranscodingGreeter.Descriptor.FindMethodByName("SubBody");

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

    [Theory]
    [InlineData("sub", false)]
    [InlineData("sub_data", false)]
    [InlineData("repeated_strings", true)]
    [InlineData("repeated_messages", true)]
    [InlineData("map_strings", true)]
    public void ResolveBodyDescriptor_NamedFieldPreservesBindingDescriptors(string body, bool repeated)
    {
        var field = TranscodingRequest.Descriptor.FindFieldByName(body);

        var result = ServiceDescriptorHelpers.ResolveBodyDescriptor(body, typeof(JsonTranscodingGreeterService), BodyMethod);

        Assert.NotNull(result);
        Assert.Same(field, result.FieldDescriptor);
        Assert.Same(repeated ? TranscodingRequest.Descriptor : field.MessageType, result.Descriptor);
        Assert.Equal(repeated, result.IsDescriptorRepeated);
        Assert.Null(result.ParameterInfo);
    }

    [Fact]
    public void ResolveBodyDescriptor_EmptyBodyPreservesNoBody()
    {
        var result = ServiceDescriptorHelpers.ResolveBodyDescriptor(string.Empty, typeof(JsonTranscodingGreeterService), BodyMethod);

        Assert.Null(result);
    }

    [Fact]
    public void ResolveBodyDescriptor_WildcardPreservesRequestParameterMetadata()
    {
        var result = ServiceDescriptorHelpers.ResolveBodyDescriptor("*", typeof(JsonTranscodingGreeterService), BodyMethod);

        Assert.NotNull(result);
        Assert.Same(TranscodingRequest.Descriptor, result.Descriptor);
        Assert.Null(result.FieldDescriptor);
        Assert.False(result.IsDescriptorRepeated);
        Assert.NotNull(result.ParameterInfo);
        Assert.Equal("request", result.ParameterInfo.Name);
        Assert.Same(typeof(TranscodingRequest), result.ParameterInfo.ParameterType);
    }

    [Fact]
    public void ResolveBodyDescriptor_MissingFieldPreservesException()
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => ServiceDescriptorHelpers.ResolveBodyDescriptor("NoMatch", typeof(JsonTranscodingGreeterService), BodyMethod));

        Assert.Equal("Couldn't find matching field for body 'NoMatch' on HelloRequest.", exception.Message);
    }

    [Fact]
    public void ResolveBodyDescriptor_NestedFieldPreservesException()
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => ServiceDescriptorHelpers.ResolveBodyDescriptor("sub.subfield", typeof(JsonTranscodingGreeterService), BodyMethod));

        Assert.Equal("The body field 'sub.subfield' references a nested field. The body field name must be on the top-level request message.", exception.Message);
    }

    [Fact]
    public void ResolveBodyDescriptor_ScalarFieldPreservesException()
    {
        Assert.Throws<InvalidOperationException>(
            () => ServiceDescriptorHelpers.ResolveBodyDescriptor("name", typeof(JsonTranscodingGreeterService), BodyMethod));
    }
}
