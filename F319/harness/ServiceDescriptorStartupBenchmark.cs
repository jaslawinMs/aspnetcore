using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Grpc.AspNetCore.Server;
using Grpc.AspNetCore.Server.Model;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Grpc.JsonTranscoding;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Transcoding;
using ServiceDescriptor = Google.Protobuf.Reflection.ServiceDescriptor;

[MemoryDiagnoser]
public class ServiceDescriptorStartupBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Helper_Greeter", Mode.HelperGreeter),
        new("Helper_Colon", Mode.HelperColon),
        new("Helper_Null", Mode.HelperNull),
        new("Helper_Throw", Mode.HelperThrow),
        new("Helper_Missing", Mode.HelperMissing),
        new("Helper_Wrong", Mode.HelperWrong),
        new("Direct_Descriptor_Control", Mode.Direct),
        new("Map_Greeter_1", Mode.MapGreeter, 1),
        new("Map_Greeter_4", Mode.MapGreeter, 4),
        new("Map_Greeter_16", Mode.MapGreeter, 16),
        new("Map_Colon_1", Mode.MapColon, 1),
        new("Map_Colon_4", Mode.MapColon, 4),
        new("Map_NoBind_Control", Mode.MapNoBind, 1)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private Func<Type, ServiceDescriptor?> _getDescriptor = null!;
    private IReadOnlyList<Endpoint> _lastEndpoints = [];

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        var owner = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
        _getDescriptor = owner.GetType("Grpc.Shared.ServiceDescriptorHelpers", throwOnError: true)!
            .GetMethod("GetServiceDescriptor", BindingFlags.Public | BindingFlags.Static)!
            .CreateDelegate<Func<Type, ServiceDescriptor?>>();
        var first = Execute();
        var second = Execute();
        if (!Equals(first, second))
        {
            throw new InvalidOperationException("Actual repeated descriptor/startup result changed.");
        }
        if ((_scenario.Mode is Mode.HelperGreeter && !ReferenceEquals(first, JsonTranscodingGreeter.Descriptor)) ||
            (_scenario.Mode is Mode.HelperColon && !ReferenceEquals(first, JsonTranscodingColonRoute.Descriptor)) ||
            (_scenario.Mode is Mode.HelperNull && first is not null))
        {
            throw new InvalidOperationException("Actual generated descriptor identity/null result differs.");
        }
        var expectedDescriptor = _scenario.Mode switch
        {
            Mode.MapGreeter => JsonTranscodingGreeter.Descriptor,
            Mode.MapColon => JsonTranscodingColonRoute.Descriptor,
            _ => null
        };
        var signatures = _lastEndpoints.OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>() is not null)
            .Select(endpoint => new
            {
                Method = endpoint.Metadata.GetMetadata<GrpcMethodMetadata>()!.Method.Name,
                Route = endpoint.RoutePattern.RawText,
                Http = endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()!.HttpMethods.ToArray(),
                HandlerBuilt = endpoint.RequestDelegate is not null,
                DescriptorIdentity = ReferenceEquals(
                    endpoint.Metadata.GetMetadata<GrpcJsonTranscodingMetadata>()!.MethodDescriptor.Service, expectedDescriptor)
            }).OrderBy(signature => signature.Method, StringComparer.Ordinal)
            .ThenBy(signature => string.Join(",", signature.Http), StringComparer.Ordinal).ToArray();
        var expected = _scenario.Mode switch
        {
            Mode.MapGreeter => 9,
            Mode.MapColon => 2,
            _ => 0
        };
        if (signatures.Length != expected || signatures.Any(signature => !signature.HandlerBuilt || !signature.DescriptorIdentity))
        {
            throw new InvalidOperationException($"Actual generated HTTP binding count/handler/descriptor differs: expected {expected}, got {signatures.Length}.");
        }
        if (_scenario.Mode is Mode.MapGreeter)
        {
            var say = signatures.Single(signature => signature.Method == "SayHello");
            var additional = signatures.Where(signature => signature.Method == "AdditionalBindings").ToArray();
            if (say.Route != "/v1/greeter/{name}" || say.Http.Single() != "GET" ||
                additional.Length != 2 || additional.Any(signature => signature.Route != "/v1/additional_bindings/{name}") ||
                (string.Join(",", additional.SelectMany(signature => signature.Http).Order(StringComparer.Ordinal)) != "DELETE,GET"))
            {
                throw new InvalidOperationException("Actual route/HTTP additional-bindings contract differs.");
            }
        }
        if (_scenario.Mode is Mode.MapColon &&
            signatures.Any(signature => signature.Http.Single() != "POST" || !signature.Route!.StartsWith("/v1/frames:", StringComparison.Ordinal)))
        {
            throw new InvalidOperationException("Actual colon-route binding contract differs.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            Mode = _scenario.Mode.ToString(),
            _scenario.Count,
            ActualBoundary = _scenario.Mode is Mode.MapGreeter or Mode.MapColon or Mode.MapNoBind
                ? "AddGrpc/AddJsonTranscoding/DI/MapGrpcService/materialized endpoints"
                : "Diagnostic actual descriptor helper/getter",
            Signatures = signatures,
            Result = first is ServiceDescriptor descriptor ? descriptor.FullName : first,
            PerRequestHotnessEstablished = false,
            ColdFirstProcessMeasured = false,
            CachedDescriptorValues = false
        }));
    }

    [Benchmark]
    public object? Execute()
    {
        return _scenario.Mode switch
        {
            Mode.HelperGreeter => _getDescriptor(typeof(JsonTranscodingGreeter)),
            Mode.HelperColon => _getDescriptor(typeof(JsonTranscodingColonRoute)),
            Mode.HelperNull => _getDescriptor(typeof(NullDescriptor)),
            Mode.HelperThrow => ThrowingGetter(),
            Mode.HelperMissing => MissingGetter(),
            Mode.HelperWrong => WrongGetter(),
            Mode.Direct => JsonTranscodingGreeter.Descriptor,
            Mode.MapGreeter => MapServices<GreeterService>(_scenario.Count),
            Mode.MapColon => MapServices<ColonService>(_scenario.Count),
            Mode.MapNoBind => MapServices<NoBindService>(_scenario.Count),
            _ => throw new InvalidOperationException("Unknown descriptor fixture.")
        };
    }

    private int ThrowingGetter()
    {
        try
        {
            _getDescriptor(typeof(ThrowDescriptor));
        }
        catch (TargetInvocationException exception) when (exception.InnerException is InvalidOperationException { Message: "Descriptor failed." })
        {
            return 1;
        }
        throw new InvalidOperationException("Descriptor getter exception changed.");
    }

    private int MissingGetter()
    {
        try
        {
            _getDescriptor(typeof(NoBindService));
        }
        catch (InvalidOperationException exception) when (exception.Message == "Get not find Descriptor property on NoBindService.")
        {
            return 1;
        }
        throw new InvalidOperationException("Missing descriptor exception changed.");
    }

    private int WrongGetter()
    {
        try
        {
            _getDescriptor(typeof(WrongDescriptor));
        }
        catch (InvalidCastException)
        {
            return 1;
        }
        throw new InvalidOperationException("Wrong descriptor CLR value was accepted.");
    }

    private int MapServices<TService>(int count) where TService : class
    {
        var result = 0;
        for (var index = 0; index < count; index++)
        {
            var services = new ServiceCollection();
            services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.None));
            var grpc = services.AddGrpc();
            services.RemoveAll(typeof(IServiceMethodProvider<>));
            grpc.AddJsonTranscoding();
            using var provider = services.BuildServiceProvider();
            IEndpointRouteBuilder endpoints = new EndpointBuilder(provider);
            endpoints.MapGrpcService<TService>();
            _lastEndpoints = endpoints.DataSources.Single().Endpoints;
            result += _lastEndpoints.Count;
        }
        return result;
    }

    private sealed class EndpointBuilder(IServiceProvider provider) : IEndpointRouteBuilder
    {
        public ICollection<EndpointDataSource> DataSources { get; } = new List<EndpointDataSource>();
        public IServiceProvider ServiceProvider { get; } = provider;
        public IApplicationBuilder CreateApplicationBuilder() => new ApplicationBuilder(ServiceProvider);
    }

    private sealed class GreeterService : JsonTranscodingGreeter.JsonTranscodingGreeterBase
    {
        public GreeterService()
        {
        }
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
    private sealed class NullDescriptor
    {
        public static ServiceDescriptor? Descriptor => null;
    }
    private sealed class ThrowDescriptor
    {
        public static ServiceDescriptor Descriptor
        {
            get
            {
                throw new InvalidOperationException("Descriptor failed.");
            }
        }
    }
    private sealed class WrongDescriptor
    {
        public static string Descriptor => "Wrong descriptor.";
    }
    private sealed record Scenario(string Name, Mode Mode, int Count = 0);
    private enum Mode
    {
        HelperGreeter, HelperColon, HelperNull, HelperThrow, HelperMissing, HelperWrong,
        Direct, MapGreeter, MapColon, MapNoBind
    }
}
