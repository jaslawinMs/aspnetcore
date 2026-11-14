using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Google.Protobuf.Reflection;
using Grpc.AspNetCore.Server;
using Grpc.AspNetCore.Server.Model;
using Grpc.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Grpc.JsonTranscoding;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Transcoding;

[MemoryDiagnoser]
public class BodyPropertyBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Helper_Sub", Mode.Helper, "sub", 2, false),
        new("Helper_Repeated", Mode.Helper, "repeated_strings", 5, true),
        new("Parse_Sub", Mode.Parse, "sub", 2, false),
        new("Parse_SubData", Mode.Parse, "sub_data", 27, false),
        new("Parse_Repeated", Mode.Parse, "repeated_strings", 5, true),
        new("Parse_RepeatedMsg", Mode.Parse, "repeated_messages", 25, true),
        new("Parse_Map", Mode.Parse, "map_strings", 7, true),
        new("Parse_RepeatedWrap", Mode.Parse, "repeated_double_values", 14, true),
        new("Parse_Empty_Control", Mode.Parse, ""),
        new("Parse_Wild_Control", Mode.Parse, "*"),
        new("Parse_Miss_Control", Mode.Error, "NoMatch"),
        new("Parse_Nest_Control", Mode.Error, "sub.subfield"),
        new("Map_Greeter_1", Mode.MapGreeter, Count: 1),
        new("Map_Greeter_4", Mode.MapGreeter, Count: 4),
        new("Map_Colon_Control", Mode.MapColon, Count: 1),
        new("Map_NoBind_Control", Mode.MapNoBind, Count: 1)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private static readonly MethodDescriptor BodyMethod = JsonTranscodingGreeter.Descriptor.FindMethodByName("SubBody");
    private Scenario _scenario = null!;
    private Func<string, Type, MethodDescriptor, object?> _resolve = null!;
    private Func<string, string, string, MethodDescriptor, object> _parse = null!;
    private IReadOnlyList<Endpoint> _lastEndpoints = [];

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        var owner = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
        _resolve = owner.GetType("Grpc.Shared.ServiceDescriptorHelpers", throwOnError: true)!
            .GetMethod("ResolveBodyDescriptor", BindingFlags.Public | BindingFlags.Static)!
            .CreateDelegate<Func<string, Type, MethodDescriptor, object?>>();
        var binder = owner.GetType("Microsoft.AspNetCore.Grpc.JsonTranscoding.Internal.Binding.JsonTranscodingProviderServiceBinder`1", throwOnError: true)!
            .MakeGenericType(typeof(GreeterService));
        var parse = binder.GetMethod("ParseRoute", BindingFlags.NonPublic | BindingFlags.Static)!;
        var pattern = Expression.Parameter(typeof(string));
        var body = Expression.Parameter(typeof(string));
        var responseBody = Expression.Parameter(typeof(string));
        var method = Expression.Parameter(typeof(MethodDescriptor));
        _parse = Expression.Lambda<Func<string, string, string, MethodDescriptor, object>>(
            Expression.Convert(Expression.Call(parse, pattern, body, responseBody, method), typeof(object)),
            pattern, body, responseBody, method).Compile();

        Validate(Execute());
        Validate(Execute());
        var httpChecks = VerifyProducedRequestHandlers();
        var signatures = _lastEndpoints.OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>() is not null)
            .Select(endpoint => new
            {
                Method = endpoint.Metadata.GetMetadata<GrpcMethodMetadata>()!.Method.Name,
                Body = endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>()!.HttpRule.Body,
                Route = endpoint.RoutePattern.RawText,
                HandlerBuilt = endpoint.RequestDelegate is not null
            }).OrderBy(signature => signature.Method, StringComparer.Ordinal).ToArray();
        var expectedBindings = _scenario.Mode switch
        {
            Mode.MapGreeter => 9,
            Mode.MapColon => 2,
            _ => 0
        };
        if (signatures.Length != expectedBindings || signatures.Any(signature => !signature.HandlerBuilt) ||
            (_scenario.Mode is Mode.MapGreeter &&
                (signatures.Single(signature => signature.Method == "SubBody").Body != "sub" ||
                signatures.Single(signature => signature.Method == "SubRepeatedBody").Body != "repeated_strings")))
        {
            throw new InvalidOperationException("Actual generated HTTP binding count/named-body/handler differs.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            Mode = _scenario.Mode.ToString(),
            _scenario.Body,
            _scenario.FieldNumber,
            _scenario.Repeated,
            _scenario.Count,
            ActualBoundary = _scenario.Mode switch
            {
                Mode.Helper => "Complete actual ResolveBodyDescriptor with generated descriptors",
                Mode.Parse or Mode.Error => "Complete actual binder ParseRoute/CreateDescriptorInfo",
                _ => "Fresh AddGrpc/AddJsonTranscoding/DI/MapGrpcService/materialized endpoints"
            },
            ParseWrapperBoxesTuple = _scenario.Mode is Mode.Parse or Mode.Error,
            HttpChecks = httpChecks,
            Signatures = signatures,
            PerRequestSpeedupMeasured = false,
            ColdFirstProcessMeasured = false,
            NewMetadataCache = false
        }));
    }

    [Benchmark]
    public object? Execute()
    {
        return _scenario.Mode switch
        {
            Mode.Helper => _resolve(_scenario.Body, typeof(GreeterService), BodyMethod),
            Mode.Parse => _parse("/v1/greeter/{name}", _scenario.Body, "", BodyMethod),
            Mode.Error => ParseInvalid(),
            Mode.MapGreeter => MapServices<GreeterService>(_scenario.Count),
            Mode.MapColon => MapServices<ColonService>(_scenario.Count),
            Mode.MapNoBind => MapServices<NoBindService>(_scenario.Count),
            _ => throw new InvalidOperationException("Unknown body metadata scenario.")
        };
    }

    private object ParseInvalid()
    {
        try
        {
            _parse("/v1/greeter/{name}", _scenario.Body, "", BodyMethod);
        }
        catch (InvalidOperationException exception) when (exception.Message == (_scenario.Body == "NoMatch"
            ? "Couldn't find matching field for body 'NoMatch' on HelloRequest."
            : "The body field 'sub.subfield' references a nested field. The body field name must be on the top-level request message."))
        {
            return 1;
        }
        throw new InvalidOperationException("Invalid named-body exception changed.");
    }

    private void Validate(object? result)
    {
        if (_scenario.Mode is Mode.MapGreeter or Mode.MapColon or Mode.MapNoBind or Mode.Error)
        {
            if (result is not int count || count < 0)
            {
                throw new InvalidOperationException("Actual startup/error fixture result differs.");
            }
            return;
        }
        var info = result ?? throw new InvalidOperationException("Named body metadata unexpectedly absent.");
        if (_scenario.Mode is Mode.Parse)
        {
            var tupleType = info.GetType();
            if (tupleType.GetField("Item1")!.GetValue(info) is not RoutePattern { RawText: "/v1/greeter/{name}" })
            {
                throw new InvalidOperationException("Actual route adapter result differs.");
            }
            info = tupleType.GetField("Item2")!.GetValue(info)!;
        }
        var prefix = _scenario.Mode is Mode.Parse ? "Body" : "";
        var descriptor = (MessageDescriptor?)info.GetType().GetProperty(prefix + "Descriptor")!.GetValue(info);
        var field = (FieldDescriptor?)info.GetType().GetProperty(prefix + "FieldDescriptor")!.GetValue(info);
        var repeated = (bool)info.GetType().GetProperty(_scenario.Mode is Mode.Parse ? "BodyDescriptorRepeated" : "IsDescriptorRepeated")!.GetValue(info)!;
        var expectedDescriptor = _scenario.Body switch
        {
            "" => null,
            "*" => HelloRequest.Descriptor,
            _ when _scenario.Repeated => HelloRequest.Descriptor,
            _ => HelloRequest.Types.SubMessage.Descriptor
        };
        var expectedField = _scenario.FieldNumber == 0 ? null : HelloRequest.Descriptor.FindFieldByNumber(_scenario.FieldNumber);
        if (!ReferenceEquals(descriptor, expectedDescriptor) || !ReferenceEquals(field, expectedField) || repeated != _scenario.Repeated)
        {
            throw new InvalidOperationException("Actual body descriptor/field/repetition differs.");
        }
    }

    private static ServiceProvider CreateProvider()
    {
        var services = new ServiceCollection();
        services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.None));
        services.AddSingleton<CapturedRequest>();
        var grpc = services.AddGrpc();
        services.RemoveAll(typeof(IServiceMethodProvider<>));
        grpc.AddJsonTranscoding();

        return services.BuildServiceProvider();
    }

    private int MapServices<TService>(int count) where TService : class
    {
        var result = 0;
        for (var index = 0; index < count; index++)
        {
            using var provider = CreateProvider();
            IEndpointRouteBuilder endpoints = new EndpointBuilder(provider);
            endpoints.MapGrpcService<TService>();
            _lastEndpoints = endpoints.DataSources.Single().Endpoints;
            result += _lastEndpoints.Count;
        }
        return result;
    }

    private static object[] VerifyProducedRequestHandlers()
    {
        using var provider = CreateProvider();
        IEndpointRouteBuilder endpoints = new EndpointBuilder(provider);
        endpoints.MapGrpcService<GreeterService>();
        var captured = provider.GetRequiredService<CapturedRequest>();
        var cases = new[]
        {
            (Method: "SubBody", Body: """{"subfield":"Body!","subfields":["One","Two"]}"""),
            (Method: "SubRepeatedBody", Body: """["One","Two"]"""),
            (Method: "Body", Body: """{"name":"BodyName","sub":{"subfield":"Whole!"},"repeatedStrings":["Whole"]}""")
        };
        var receipts = new List<object>();
        foreach (var test in cases)
        {
            var endpoint = endpoints.DataSources.Single().Endpoints.Single(endpoint =>
                endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>()?.MethodDescriptor.Name == test.Method);
            using var input = new MemoryStream(Encoding.UTF8.GetBytes(test.Body));
            using var output = new MemoryStream();
            var context = new DefaultHttpContext { RequestServices = provider };
            context.SetEndpoint(endpoint);
            context.Request.Method = "POST";
            context.Request.Path = "/v1/greeter";
            context.Request.QueryString = new QueryString("?name=QueryName&sub.subfield=QuerySub&sub.subfields=Ignored");
            context.Request.ContentType = "application/json";
            context.Request.Body = input;
            context.Response.Body = output;
            var before = captured.Count;
            endpoint.RequestDelegate!(context).GetAwaiter().GetResult();
            var request = captured.Value ?? throw new InvalidOperationException("Produced handler never reached generated service.");
            var expectedName = test.Method == "Body" ? "BodyName" : "QueryName";
            var correct = test.Method switch
            {
                "SubBody" => request.Sub is { Subfield: "Body!" } && request.Sub.Subfields.SequenceEqual(["One", "Two"]),
                "SubRepeatedBody" => request.Sub is { Subfield: "QuerySub" } && request.RepeatedStrings.SequenceEqual(["One", "Two"]),
                "Body" => request.Sub is { Subfield: "Whole!" } && request.RepeatedStrings.SequenceEqual(["Whole"]),
                _ => false
            };
            output.Position = 0;
            using var response = JsonDocument.Parse(output);
            if (captured.Count != before + 1 || context.Response.StatusCode != 200 || request.Name != expectedName || !correct ||
                response.RootElement.GetProperty("message").GetString() != expectedName)
            {
                throw new InvalidOperationException("Actual produced request handler body/query/response contract differs.");
            }
            receipts.Add(new
            {
                test.Method,
                DescriptorIdentity = ReferenceEquals(endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>()!.MethodDescriptor.Service, JsonTranscodingGreeter.Descriptor),
                request.Name,
                Sub = request.Sub.Subfield,
                Repeated = request.RepeatedStrings.ToArray(),
                context.Response.StatusCode,
                RouteMatchingExercised = false,
                Boundary = "Generated descriptor/provider/binder/endpoint RequestDelegate/HTTP JSON/service/JSON response"
            });
        }
        return receipts.ToArray();
    }

    private sealed class EndpointBuilder(IServiceProvider provider) : IEndpointRouteBuilder
    {
        public ICollection<EndpointDataSource> DataSources { get; } = new List<EndpointDataSource>();
        public IServiceProvider ServiceProvider { get; } = provider;
        public IApplicationBuilder CreateApplicationBuilder() => new ApplicationBuilder(ServiceProvider);
    }

    private sealed class CapturedRequest
    {
        public int Count { get; set; }
        public HelloRequest? Value { get; set; }
    }

    private sealed class GreeterService(CapturedRequest captured) : JsonTranscodingGreeter.JsonTranscodingGreeterBase
    {
        private Task<HelloReply> Capture(HelloRequest request)
        {
            captured.Count++;
            captured.Value = request;

            return Task.FromResult(new HelloReply { Message = request.Name });
        }

        public override Task<HelloReply> SubBody(HelloRequest request, ServerCallContext context) => Capture(request);
        public override Task<HelloReply> SubRepeatedBody(HelloRequest request, ServerCallContext context) => Capture(request);
        public override Task<HelloReply> Body(HelloRequest request, ServerCallContext context) => Capture(request);
    }

    private sealed class ColonService : JsonTranscodingColonRoute.JsonTranscodingColonRouteBase
    {
        public ColonService()
        {
        }
    }
    private sealed class NoBindService
    {
        public NoBindService()
        {
        }
    }
    private sealed record Scenario(string Name, Mode Mode, string Body = "", int FieldNumber = 0, bool Repeated = false, int Count = 0);
    private enum Mode { Helper, Parse, Error, MapGreeter, MapColon, MapNoBind }
}
