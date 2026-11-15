// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Microsoft.AspNetCore.Components.Server.Circuits;

public partial class ServerComponentDeserializerTest
{
    [Theory]
    [InlineData("", 1, false)]
    [InlineData("Hello from SSR", 1, false)]
    [InlineData("\u00E9\u6F22\U0001F642 \"quoted\" \\ path <tag> & line\n", 1, false)]
    [InlineData("\u00E9\u6F22\U0001F642 \"quoted\" \\ path <tag> & line\n", 256, false)]
    [InlineData("Nested fragment", 1, true)]
    public void CanParseCapturedRenderFragmentParameters(string content, int repetitions, bool nested)
    {
        var expected = string.Concat(Enumerable.Repeat(content, repetitions));
        RenderFragment fragment = builder =>
        {
            if (nested)
            {
                builder.OpenElement(0, "section");
                builder.SetKey(17);
                builder.AddAttribute(1, "data-fragment", "\u00E9 \"quoted\" \\ path");
                builder.OpenElement(2, "em");
            }
            if (expected.Length > 0)
            {
                builder.AddContent(3, expected);
            }
            if (nested)
            {
                builder.CloseElement();
                builder.CloseElement();
            }
        };
        var captured = CaptureEndpointRenderFragment(fragment);
        var marker = CreateMarker(typeof(FragmentParameterComponent), new()
        {
            [nameof(FragmentParameterComponent.Label)] = "typed control",
            [nameof(FragmentParameterComponent.ChildContent)] = captured,
        });
        var deserializer = CreateServerComponentDeserializer();

        Assert.True(deserializer.TryDeserializeComponentDescriptorCollection(SerializeMarkers([marker]), out var descriptors));
        var descriptor = Assert.Single(descriptors);
        Assert.Equal(typeof(FragmentParameterComponent), descriptor.ComponentType);
        var parameters = descriptor.Parameters.ToDictionary();
        Assert.Equal([nameof(FragmentParameterComponent.Label), nameof(FragmentParameterComponent.ChildContent)], parameters.Keys);
        Assert.Equal("typed control", parameters[nameof(FragmentParameterComponent.Label)]);
        var restored = Assert.IsType<RenderFragment>(parameters[nameof(FragmentParameterComponent.ChildContent)]);
        using var output = new RenderTreeBuilder();
        restored(output);
        var frames = output.GetFrames();
        if (nested)
        {
            Assert.Equal(4, frames.Count);
            Assert.Equal(RenderTreeFrameType.Element, frames.Array[0].FrameType);
            Assert.Equal("section", frames.Array[0].ElementName);
            Assert.Equal(17, frames.Array[0].ElementKey);
            Assert.Equal("data-fragment", frames.Array[1].AttributeName);
            Assert.Equal("\u00E9 \"quoted\" \\ path", frames.Array[1].AttributeValue);
            Assert.Equal("em", frames.Array[2].ElementName);
            Assert.Equal(expected, frames.Array[3].TextContent);
        }
        else if (expected.Length == 0)
        {
            Assert.Equal(0, frames.Count);
        }
        else
        {
            Assert.Equal(1, frames.Count);
            Assert.Equal(RenderTreeFrameType.Text, frames.Array[0].FrameType);
            Assert.Equal(expected, frames.Array[0].TextContent);
        }
    }

    [Theory]
    [InlineData("null", typeof(NullReferenceException))]
    [InlineData("\"text\"", typeof(JsonException))]
    [InlineData("42", typeof(JsonException))]
    [InlineData("[]", typeof(JsonException))]
    [InlineData("{\"nodes\":{}}", typeof(JsonException))]
    public void InvalidRenderFragmentParameter_PreservesDebugFailure(string json, Type exceptionType)
    {
        var logger = CreateFragmentParameterLogger();
        var deserializer = new ComponentParameterDeserializer(logger.Object, new ComponentParametersTypeCache());
        var values = JsonSerializer.Deserialize<IList<object>>($"[{json}]", ServerComponentSerializationSettings.JsonSerializationOptions);

        Assert.False(deserializer.TryDeserializeParameters([CreateFragmentParameterDefinition()], values, out var parameters));
        Assert.Equal(default(ParameterView), parameters);
        AssertInvalidFragmentParameterLog(logger, exceptionType);
    }

    [Theory]
    [InlineData(false, typeof(InvalidOperationException))]
    [InlineData(true, typeof(ObjectDisposedException))]
    public void UnavailableRenderFragmentElement_PreservesDebugFailure(bool disposed, Type exceptionType)
    {
        var logger = CreateFragmentParameterLogger();
        var deserializer = new ComponentParameterDeserializer(logger.Object, new ComponentParametersTypeCache());
        JsonElement element = default;
        if (disposed)
        {
            using var document = JsonDocument.Parse("{\"nodes\":[]}");
            element = document.RootElement;
        }

        Assert.False(deserializer.TryDeserializeParameters([CreateFragmentParameterDefinition()], [element], out var parameters));
        Assert.Equal(default(ParameterView), parameters);
        AssertInvalidFragmentParameterLog(logger, exceptionType);
    }

    [Theory]
    [InlineData("{\"nodes\":null}", typeof(NullReferenceException))]
    [InlineData("{\"nodes\":[{\"type\":\"unknown\"}]}", typeof(NotImplementedException))]
    public void InvalidRenderFragmentNodes_PreserveDeferredRenderingFailure(string json, Type exceptionType)
    {
        var logger = CreateFragmentParameterLogger();
        var deserializer = new ComponentParameterDeserializer(logger.Object, new ComponentParametersTypeCache());
        var values = JsonSerializer.Deserialize<IList<object>>($"[{json}]", ServerComponentSerializationSettings.JsonSerializationOptions);

        Assert.True(deserializer.TryDeserializeParameters([CreateFragmentParameterDefinition()], values, out var parameters));
        Assert.DoesNotContain(logger.Invocations, invocation => invocation.Method.Name == nameof(ILogger.Log));
        var fragment = Assert.IsType<RenderFragment>(parameters.ToDictionary()[nameof(FragmentParameterComponent.ChildContent)]);
        using var builder = new RenderTreeBuilder();
        var exception = Record.Exception(() => fragment(builder));
        Assert.IsType(exceptionType, exception);
    }

    private static object CaptureEndpointRenderFragment(RenderFragment fragment)
    {
        var capture = new RenderFragmentCapture(fragment);
        using var builder = new RenderTreeBuilder();
        capture.Invoke(builder);
        var captured = new SerializedRenderFragment
        {
            Nodes = RenderFragmentSerializer.SerializeFrames(capture, NullLogger.Instance),
        };
        var options = ServerComponentSerializationSettings.JsonSerializationOptions;
        // The producer records the Endpoints DTO identity, not the Server shared-source copy.
        var producerType = typeof(RazorComponentsEndpointRouteBuilderExtensions).Assembly
            .GetType(typeof(SerializedRenderFragment).FullName, throwOnError: true);
        var producerValue = JsonSerializer.Deserialize(JsonSerializer.Serialize(captured, options), producerType, options);
        Assert.NotNull(producerValue);

        return producerValue;
    }

    private static ComponentParameter CreateFragmentParameterDefinition() => new()
    {
        Name = nameof(FragmentParameterComponent.ChildContent),
        TypeName = typeof(SerializedRenderFragment).FullName,
        Assembly = "Microsoft.AspNetCore.Components.Endpoints",
    };

    private static Mock<ILogger<ComponentParameterDeserializer>> CreateFragmentParameterLogger()
    {
        var logger = new Mock<ILogger<ComponentParameterDeserializer>>();
        logger.Setup(value => value.IsEnabled(LogLevel.Debug)).Returns(true);

        return logger;
    }

    private static void AssertInvalidFragmentParameterLog(Mock<ILogger<ComponentParameterDeserializer>> logger, Type exceptionType)
    {
        var log = Assert.Single(logger.Invocations.Where(invocation => invocation.Method.Name == nameof(ILogger.Log)));
        Assert.Equal(LogLevel.Debug, log.Arguments[0]);
        var eventId = Assert.IsType<EventId>(log.Arguments[1]);
        Assert.Equal(4, eventId.Id);
        Assert.Equal("InvalidParameterValue", eventId.Name);
        Assert.IsType(exceptionType, log.Arguments[3]);
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object>>>(log.Arguments[2]);
        Assert.Contains(state, value => value.Key == "Name" && Equals(value.Value, nameof(FragmentParameterComponent.ChildContent)));
        Assert.Contains(state, value => value.Key == "TypeName" && Equals(value.Value, typeof(SerializedRenderFragment).FullName));
        Assert.Contains(state, value => value.Key == "Assembly" && Equals(value.Value, "Microsoft.AspNetCore.Components.Endpoints"));
    }

    private sealed class FragmentParameterComponent : ComponentBase
    {
        [Parameter] public string Label { get; set; }
        [Parameter] public RenderFragment ChildContent { get; set; }
    }
}
