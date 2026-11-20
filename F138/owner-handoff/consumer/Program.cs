using System.Diagnostics;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public static async Task<int> Main(string[] args)
    {
        if (args.Length != 3)
        {
            Console.Error.WriteLine("Usage: F138.Characterization <source-built-test-output> <result-directory> <role>");
            return 2;
        }
        var graph = Path.GetFullPath(args[0]);
        var output = Path.GetFullPath(args[1]);
        Directory.CreateDirectory(output);
        var resolutions = new List<object>();
        AssemblyLoadContext.Default.Resolving += (context, name) =>
        {
            var path = Path.Combine(graph, $"{name.Name}.dll");
            resolutions.Add(new { requested = name.FullName, path, exists = File.Exists(path) });
            return File.Exists(path) ? context.LoadFromAssemblyPath(path) : null;
        };
        var exit = 1;
        try
        {
            exit = await Characterization.RunAsync(output);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);
            Write(output, "failure.json", new { exception = exception.ToString() });
        }
        finally
        {
            Write(output, "resolutions.json", resolutions);
            var assemblies = AppDomain.CurrentDomain.GetAssemblies()
                .Where(assembly => !assembly.IsDynamic && !string.IsNullOrEmpty(assembly.Location))
                .OrderBy(assembly => assembly.GetName().Name)
                .Select(assembly => new
                {
                    name = assembly.GetName().Name,
                    version = assembly.GetName().Version?.ToString(),
                    path = assembly.Location,
                    sha256 = Hash(assembly.Location),
                    mvid = assembly.ManifestModule.ModuleVersionId
                }).ToArray();
            Write(output, "loaded-assemblies.json", assemblies);
            Write(output, "runtime.json", new
            {
                role = args[2],
                pid = Environment.ProcessId,
                processPath = Environment.ProcessPath,
                framework = RuntimeInformation.FrameworkDescription,
                version = Environment.Version.ToString(),
                coreLibPath = typeof(object).Assembly.Location,
                coreLibSha256 = Hash(typeof(object).Assembly.Location),
                coreLibMvid = typeof(object).Assembly.ManifestModule.ModuleVersionId,
                coreLibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory(),
                dotnetRoot = Environment.GetEnvironmentVariable("DOTNET_ROOT"),
                rollForward = Environment.GetEnvironmentVariable("DOTNET_ROLL_FORWARD"),
                graph,
                exit
            });
            var images = Directory.EnumerateFiles(graph, "*", SearchOption.AllDirectories)
                .Where(path => Path.GetExtension(path) is ".dll" or ".exe")
                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
                .Select(path => new { relativePath = Path.GetRelativePath(graph, path), path, sha256 = Hash(path), mvid = GetMvid(path) })
                .ToArray();
            Write(output, "graph-images.json", images);
            var nonRoleFrameworkAssemblies = assemblies.Where(assembly =>
                assembly.name!.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal) &&
                !assembly.path.StartsWith(graph + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)).ToArray();
            Write(output, "source-role-boundary.json", new
            {
                sourceBuiltFrameworkAssemblies = assemblies.Count(assembly => assembly.name!.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal)),
                nonRoleFrameworkAssemblies,
                passes = nonRoleFrameworkAssemblies.Length == 0
            });
            if (nonRoleFrameworkAssemblies.Length > 0)
            {
                exit = 1;
            }
        }
        return exit;
    }

    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    private static Guid? GetMvid(string path)
    {
        using var stream = File.OpenRead(path);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata)
        {
            return null;
        }
        var reader = pe.GetMetadataReader();
        return reader.GetGuid(reader.GetModuleDefinition().Mvid);
    }

    internal static void Write(string output, string name, object value)
    {
        File.WriteAllText(Path.Combine(output, name), JsonSerializer.Serialize(value, JsonOptions));
    }
}

internal static class Characterization
{
    private static readonly List<object> Rows = [];
    private static readonly List<object> MetadataRows = [];
    private static readonly MethodInfo TryGetBody = typeof(IOpenApiDocumentProvider).Assembly
        .GetType("ApiDescriptionExtensions", throwOnError: true)!
        .GetMethod("TryGetBodyParameter", BindingFlags.Static | BindingFlags.Public)!;

    internal static async Task<int> RunAsync(string output)
    {
        try
        {
            var builder = CreateBuilder();
            builder.Services.AddControllers().AddApplicationPart(typeof(FormController).Assembly);
            builder.Services.AddOpenApi();
            await using var app = builder.Build();
            app.MapGet("/zero", () => "ok");
            app.MapPost("/query/{id}", ([FromRoute] int id, [FromQuery] string query) => "ok");
            app.MapPost("/one", ([FromBody] Payload body) => "ok");
            app.MapPost("/first", ([FromBody] Payload body, [FromQuery] string query) => "ok");
            app.MapPost("/middle/{id}", (int id, [FromBody] Payload body, [FromHeader] string header) => "ok");
            app.MapPost("/last/{id}", (int id, [FromQuery] string query, [FromBody] Payload body) => "ok");
            app.MapPost("/optional", ([FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] Payload? body) => "ok");
            app.MapPost("/custom", (Payload body) => "ok").Accepts<Payload>("application/f138+json", "application/json");
            app.MapPost("/metadata-only", () => "ok").Accepts<Payload>("application/f138+json");
            app.MapPost("/form", ([FromForm] string title) => "ok").DisableAntiforgery();
            app.MapPost("/files", (IFormFile first, IFormFile second) => "ok").DisableAntiforgery();
            app.MapControllers();
            app.MapOpenApi();
            await app.StartAsync();
            using var client = app.GetTestClient();
            using var response = await client.GetAsync("/openapi/v1.json");
            var json = await response.Content.ReadAsStringAsync();
            File.WriteAllText(Path.Combine(output, "document.json"), json);
            Check("http-openapi-output", response.IsSuccessStatusCode &&
                response.Content.Headers.ContentType?.MediaType == "application/json",
                new { status = (int)response.StatusCode, contentType = response.Content.Headers.ContentType?.ToString() });
            using var document = JsonDocument.Parse(json);
            var paths = document.RootElement.GetProperty("paths");
            var provider = app.Services.GetRequiredService<IApiDescriptionGroupCollectionProvider>();
            var groups = provider.ApiDescriptionGroups;
            var descriptions = groups.Items.SelectMany(group => group.Items)
                .ToDictionary(description => "/" + description.RelativePath);
            Check("api-description-cache-stable", ReferenceEquals(groups, provider.ApiDescriptionGroups), new { groups.Version });
            var seed = descriptions["/one"].ParameterDescriptions[0];
            Verify(descriptions, paths, "/zero", "get", [], -1, null, null, seed);
            Verify(descriptions, paths, "/query/{id}", "post", ["Path", "Query"], -1, null, null, seed);
            Verify(descriptions, paths, "/one", "post", ["Body"], 0, true, ["application/json"], seed);
            Verify(descriptions, paths, "/first", "post", ["Body", "Query"], 0, true, ["application/json"], seed);
            Verify(descriptions, paths, "/middle/{id}", "post", ["Path", "Body", "Header"], 1, true, ["application/json"], seed);
            Verify(descriptions, paths, "/last/{id}", "post", ["Path", "Query", "Body"], 2, true, ["application/json"], seed);
            Verify(descriptions, paths, "/optional", "post", ["Body"], 0, false, ["application/json"], seed);
            Verify(descriptions, paths, "/custom", "post", ["Body"], 0, true, ["application/f138+json", "application/json"], seed);
            Verify(descriptions, paths, "/metadata-only", "post", ["Body"], 0, true, ["application/f138+json"], seed);
            Verify(descriptions, paths, "/form", "post", ["FormFile"], -1, true, ["application/x-www-form-urlencoded", "multipart/form-data"], seed);
            Verify(descriptions, paths, "/files", "post", ["FormFile", "FormFile"], -1, true, ["multipart/form-data"], seed);
            Verify(descriptions, paths, "/mvc/form", "post", ["Form"], -1, true, ["application/x-www-form-urlencoded"], seed);
            var firstBody = descriptions["/first"].ParameterDescriptions[0];
            var lastBody = descriptions["/last/{id}"].ParameterDescriptions[2];
            var multiplicityControl = new ApiDescription();
            multiplicityControl.ParameterDescriptions.Add(firstBody);
            multiplicityControl.ParameterDescriptions.Add(lastBody);
            var multiplicity = Invoke(multiplicityControl, seed);
            Check("isolated-public-metadata-multiple-control", !multiplicity.result && multiplicity.selected is null,
                new { boundary = "Unhosted public metadata-list guard control; two real parameter identities reused. Not a shipping multiple-body producer.", count = multiplicityControl.ParameterDescriptions.Count });
            await using var bad = CreateBuilder().Build();
            bad.MapPost("/invalid", ([FromBody] Payload first, [FromBody] Payload second) => "ok");
            Exception? rejection = null;
            try
            {
                _ = ((IEndpointRouteBuilder)bad).DataSources.SelectMany(source => source.Endpoints).ToArray();
            }
            catch (InvalidOperationException exception)
            {
                rejection = exception;
            }
            Check("real-rdf-multiple-body-rejected", rejection is InvalidOperationException &&
                rejection.Message.Contains("Failure to infer one or more parameters.", StringComparison.Ordinal) &&
                rejection.Message.Contains("UNKNOWN", StringComparison.Ordinal),
                new { exception = rejection?.ToString(), boundary = "Real mapped endpoint materialization, before ApiDescription or OpenAPI helper invocation." });
            using var secondResponse = await client.GetAsync("/openapi/v1.json");
            var secondJson = await secondResponse.Content.ReadAsStringAsync();
            using var secondDocument = JsonDocument.Parse(secondJson);
            Check("second-document-request-preserves-request-body", secondResponse.IsSuccessStatusCode &&
                secondDocument.RootElement.GetProperty("paths").GetProperty("/middle/{id}").GetProperty("post")
                    .GetProperty("requestBody").GetProperty("content").TryGetProperty("application/json", out _),
                new { boundary = "Second real TestServer OpenAPI HTTP request, no timing." });
            await app.StopAsync();
            return 0;
        }
        finally
        {
            Program.Write(output, "assertions.json", Rows);
            Program.Write(output, "metadata.json", MetadataRows);
        }
    }

    private static WebApplicationBuilder CreateBuilder()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(Program).Assembly.FullName,
            ContentRootPath = AppContext.BaseDirectory,
            EnvironmentName = "Production"
        });
        builder.Logging.ClearProviders();
        builder.WebHost.UseTestServer();
        return builder;
    }

    private static void Verify(Dictionary<string, ApiDescription> descriptions, JsonElement paths, string path,
        string method, string[] sources, int bodyIndex, bool? required, string[]? mediaTypes, ApiParameterDescription seed)
    {
        var description = descriptions[path];
        var actualSources = description.ParameterDescriptions.Select(parameter => parameter.Source.Id).ToArray();
        var actual = Invoke(description, seed);
        var selectedIdentityMatches = bodyIndex < 0
            ? !actual.result && actual.selected is null
            : actual.result && ReferenceEquals(actual.selected, description.ParameterDescriptions[bodyIndex]);
        Check($"metadata-and-selected-identity:{path}", actualSources.SequenceEqual(sources) && selectedIdentityMatches,
            new { expectedSources = sources, actualSources, bodyIndex, actual.result, selected = actual.selected?.Name, selectedIdentityMatches });
        var operation = paths.GetProperty(path).GetProperty(method);
        var hasBody = operation.TryGetProperty("requestBody", out var body);
        if (required is null)
        {
            Check($"request-body-output:{path}", !hasBody, new { hasBody });
        }
        else
        {
            var actualRequired = hasBody && body.TryGetProperty("required", out var requiredValue) && requiredValue.GetBoolean();
            var actualMediaTypes = hasBody ? body.GetProperty("content").EnumerateObject().Select(property => property.Name).Order().ToArray() : [];
            var expectedMediaTypes = mediaTypes!.Order().ToArray();
            Check($"request-body-output:{path}", hasBody && actualRequired == required && actualMediaTypes.SequenceEqual(expectedMediaTypes),
                new { hasBody, actualRequired, expectedRequired = required, actualMediaTypes, expectedMediaTypes });
        }
        MetadataRows.Add(new
        {
            path,
            collectionType = description.ParameterDescriptions.GetType().FullName,
            parameters = description.ParameterDescriptions.Select((parameter, index) => new
            {
                index,
                parameter.Name,
                source = parameter.Source.Id,
                type = parameter.Type.FullName,
                parameter.IsRequired,
                descriptor = parameter.ParameterDescriptor?.GetType().FullName
            }).ToArray(),
            supportedRequestFormats = description.SupportedRequestFormats.Select(format => format.MediaType).ToArray(),
            bodyResult = actual.result,
            bodySelectedIndex = actual.selected is null ? -1 : description.ParameterDescriptions.IndexOf(actual.selected)
        });
    }

    private static (bool result, ApiParameterDescription? selected) Invoke(ApiDescription description, ApiParameterDescription seed)
    {
        object?[] parameters = [description, seed];
        var result = (bool)TryGetBody.Invoke(null, parameters)!;
        return (result, (ApiParameterDescription?)parameters[1]);
    }

    private static void Check(string name, bool pass, object detail)
    {
        var row = new { name, pass, detail };
        Rows.Add(row);
        Console.WriteLine(JsonSerializer.Serialize(row));
        if (!pass)
        {
            throw new InvalidOperationException($"Assertion failed: {name}");
        }
    }
}

/// <summary>Payload used by the private characterization application.</summary>
public sealed record Payload(string Name, int Count);

/// <summary>Real MVC form-binding metadata producer used by the private application.</summary>
[ApiController]
[Route("mvc")]
public sealed class FormController : ControllerBase
{
    /// <summary>Defines an MVC form action for ApiExplorer.</summary>
    [HttpPost("form")]
    [Consumes("application/x-www-form-urlencoded")]
    public string Form([FromForm] string title) => title;
}
