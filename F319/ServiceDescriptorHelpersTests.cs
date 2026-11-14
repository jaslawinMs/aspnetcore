// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Reflection;
using Custom.Http.Rule;
using Google.Protobuf.Reflection;
using Grpc.Shared;

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
    public void GetServiceDescriptor_ReadsCurrentDescriptorOnEveryCall()
    {
        ChangingDescriptor.Reads = 0;
        ChangingDescriptor.Current = HelloService.Descriptor;
        var first = ServiceDescriptorHelpers.GetServiceDescriptor(typeof(ChangingDescriptor));
        ChangingDescriptor.Current = Transcoding.JsonTranscodingGreeter.Descriptor;

        var second = ServiceDescriptorHelpers.GetServiceDescriptor(typeof(ChangingDescriptor));

        Assert.Same(HelloService.Descriptor, first);
        Assert.Same(Transcoding.JsonTranscodingGreeter.Descriptor, second);
        Assert.Equal(2, ChangingDescriptor.Reads);
    }

    [Fact]
    public void GetServiceDescriptor_NullGetterResultIsPreserved()
    {
        ChangingDescriptor.Reads = 0;
        ChangingDescriptor.Current = null;

        var result = ServiceDescriptorHelpers.GetServiceDescriptor(typeof(ChangingDescriptor));

        Assert.Null(result);
        Assert.Equal(1, ChangingDescriptor.Reads);
    }

    [Fact]
    public void GetServiceDescriptor_ThrowingGetterPreservesInvocationException()
    {
        var exception = Assert.Throws<TargetInvocationException>(
            () => ServiceDescriptorHelpers.GetServiceDescriptor(typeof(ThrowingDescriptor)));

        var innerException = Assert.IsType<InvalidOperationException>(exception.InnerException);
        Assert.Equal("Descriptor getter failed.", innerException.Message);
    }

    [Theory]
    [InlineData(typeof(MissingDescriptor))]
    [InlineData(typeof(InheritedDescriptor))]
    public void GetServiceDescriptor_MissingDeclaredPropertyPreservesException(Type type)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => ServiceDescriptorHelpers.GetServiceDescriptor(type));

        Assert.Equal($"Get not find Descriptor property on {type.Name}.", exception.Message);
    }

    [Fact]
    public void GetServiceDescriptor_WrongGetterTypePreservesInvalidCastException()
    {
        Assert.Throws<InvalidCastException>(
            () => ServiceDescriptorHelpers.GetServiceDescriptor(typeof(WrongDescriptor)));
    }

    private sealed class ChangingDescriptor
    {
        public static int Reads;
        public static ServiceDescriptor? Current;
        public static ServiceDescriptor? Descriptor
        {
            get
            {
                Reads++;
                return Current;
            }
        }
    }

    private sealed class ThrowingDescriptor
    {
        public static ServiceDescriptor Descriptor
        {
            get
            {
                throw new InvalidOperationException("Descriptor getter failed.");
            }
        }
    }

    private class MissingDescriptor
    {
    }

    private sealed class InheritedDescriptor : ChangingDescriptorBase
    {
    }

    private class ChangingDescriptorBase
    {
        public static ServiceDescriptor Descriptor => HelloService.Descriptor;
    }

    private sealed class WrongDescriptor
    {
        public static string Descriptor => "Not a protobuf descriptor.";
    }
}
