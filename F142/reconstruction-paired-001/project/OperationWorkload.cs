using System.Reflection;
using System.Text.Json;
using AutoPerf.F142;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;

internal sealed class OperationWorkload(
    IOpenApiOperationTransformer transformer,
    OpenApiOperation operation,
    OpenApiOperationTransformerContext context,
    string fullDocumentJson)
{
    internal string FullDocumentJson { get; } = fullDocumentJson;
    internal string GeneratedType => transformer.GetType().FullName
        ?? throw new InvalidOperationException("Missing actual generated type identity.");
    internal string ProducerMethod => context.Description.ActionDescriptor.EndpointMetadata.OfType<MethodInfo>().Single().Name;

    internal Task InvokeAsync() => transformer.TransformAsync(operation, context, CancellationToken.None);

    internal string Observe() => JsonSerializer.Serialize(new
    {
        operation.Summary,
        operation.Description,
        Parameters = operation.Parameters?.Select(parameter => new
        {
            parameter.Name,
            parameter.Description,
            Example = parameter.Example?.ToJsonString()
        }).ToArray(),
        BodyDescription = operation.RequestBody?.Description
    });

    internal static async Task<OperationWorkload> CaptureAsync(DocumentFixture fixture)
    {
        OpenApiOperation? capturedOperation = null;
        OpenApiOperationTransformerContext? capturedContext = null;
        var invocations = 0;
        fixture.Services.GetRequiredService<IOptionsMonitor<OpenApiOptions>>().Get("v1")
            .AddOperationTransformer((operation, context, _) =>
            {
                capturedOperation = operation;
                capturedContext = context;
                invocations++;
                return Task.CompletedTask;
            });
        var json = await fixture.GenerateAsync();
        if (invocations != 1 || capturedOperation is null || capturedContext is null)
        {
            throw new InvalidOperationException("The real document provider did not produce exactly one captured operation/context.");
        }
        var type = typeof(DocumentFixture).Assembly.GetTypes().Single(type =>
            type.Name.Contains("XmlCommentOperationTransformer", StringComparison.Ordinal)
            && typeof(IOpenApiOperationTransformer).IsAssignableFrom(type));
        if (Activator.CreateInstance(type, nonPublic: true) is not IOpenApiOperationTransformer transformer)
        {
            throw new InvalidOperationException("The actual analyzer-generated transformer could not be instantiated.");
        }

        return new OperationWorkload(transformer, capturedOperation, capturedContext, json);
    }
}
