// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Custom.Http.Rule;
using Google.Protobuf;
using Google.Protobuf.Reflection;
using Grpc.Shared;
using HttpRule = Google.Api.HttpRule;

namespace Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests;

public class ServiceDescriptorHelpersTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ResolveQueryParameterDescriptors_PreservesRouteBodyExclusionAndOrderedFieldIdentity(bool namedBody)
    {
        var method = CreateQueryMethodDescriptor();
        var pattern = HttpRoutePattern.Parse("/v1/{get}/{custom.kind}");
        var routes = ServiceDescriptorHelpers.ResolveRouteParameterDescriptors(pattern.Variables, method.InputType);
        var body = namedBody ? ServiceDescriptorHelpers.ResolveBodyDescriptor("custom", typeof(QueryService), method) : null;

        var result = ServiceDescriptorHelpers.ResolveQueryParameterDescriptors(routes, method, body?.Descriptor, body?.FieldDescriptor);

        var expected = namedBody
            ? new[] { "selector", "put", "post", "delete", "patch", "body", "responseBody" }
            : new[] { "selector", "put", "post", "delete", "patch", "body", "custom.path", "responseBody" };
        Assert.Equal(expected, result.Keys);
        Assert.Same(HttpRule.Descriptor.FindFieldByName("selector"), result["selector"]);
        Assert.Same(HttpRule.Descriptor.FindFieldByName("response_body"), result["responseBody"]);
        if (!namedBody)
        {
            Assert.Same(HttpRule.Descriptor.FindFieldByName("custom").MessageType.FindFieldByName("path"), result["custom.path"]);
        }
    }

    [Fact]
    public void ResolveQueryParameterDescriptors_WildcardBodyPreservesEmptyResult()
    {
        var method = CreateQueryMethodDescriptor();
        var pattern = HttpRoutePattern.Parse("/v1/{get}/{custom.kind}");
        var routes = ServiceDescriptorHelpers.ResolveRouteParameterDescriptors(pattern.Variables, method.InputType);
        var body = ServiceDescriptorHelpers.ResolveBodyDescriptor("*", typeof(QueryService), method);
        Assert.NotNull(body);

        var result = ServiceDescriptorHelpers.ResolveQueryParameterDescriptors(routes, method, body.Descriptor, body.FieldDescriptor);

        Assert.Empty(result);
    }

    private static MethodDescriptor CreateQueryMethodDescriptor()
    {
        var proto = new FileDescriptorProto
        {
            Name = "query_fixture.proto",
            Package = "autoperf",
            Syntax = "proto3",
            Dependency = { HttpRule.Descriptor.File.Name },
            Service =
            {
                new ServiceDescriptorProto
                {
                    Name = nameof(QueryService),
                    Method =
                    {
                        new MethodDescriptorProto
                        {
                            Name = nameof(QueryService.Query),
                            InputType = "." + HttpRule.Descriptor.FullName,
                            OutputType = "." + HttpRule.Descriptor.FullName
                        }
                    }
                }
            }
        };
        return FileDescriptor.FromGeneratedCode(proto.ToByteArray(), [HttpRule.Descriptor.File],
            new GeneratedClrTypeInfo(Array.Empty<Type>(), Array.Empty<GeneratedClrTypeInfo>())).Services.Single().Methods.Single();
    }

    private sealed class QueryService
    {
        public void Query(HttpRule request)
        {
        }
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
