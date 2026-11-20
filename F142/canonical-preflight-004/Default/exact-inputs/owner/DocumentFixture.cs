using System.Globalization;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AutoPerf.F142;

/// <summary>Hosts one real source-generated XML-comment OpenAPI profile without a socket listener.</summary>
public sealed class DocumentFixture : IAsyncDisposable
{
    private readonly WebApplication _application;
    private readonly Func<string, TextWriter, Task> _generate;

    private DocumentFixture(WebApplication application)
    {
        _application = application;
        var owner = typeof(OpenApiOptions).Assembly;
        var providerType = owner.GetType("Microsoft.Extensions.ApiDescriptions.IDocumentProvider", throwOnError: true)!;
        var provider = application.Services.GetRequiredService(providerType);
        var method = providerType.GetMethod("GenerateAsync", [typeof(string), typeof(TextWriter)])
            ?? throw new InvalidOperationException("The expected real document-provider method is absent.");
        _generate = method.CreateDelegate<Func<string, TextWriter, Task>>(provider);

        var transformers = typeof(DocumentFixture).Assembly.GetTypes()
            .Where(type => type.Name.Contains("XmlCommentOperationTransformer", StringComparison.Ordinal)
                && typeof(IOpenApiOperationTransformer).IsAssignableFrom(type)).ToArray();
        if (transformers.Length != 1)
        {
            throw new InvalidOperationException("The actual analyzer did not emit exactly one operation-transformer owner.");
        }
    }

    /// <summary>Creates and starts one genuine minimal-endpoint document producer.</summary>
    /// <param name="profile">One fixed characterization profile.</param>
    /// <param name="cancellationToken">A functional fail-stop deadline, not a measurement input.</param>
    /// <returns>The started fixture.</returns>
    public static async Task<DocumentFixture> CreateAsync(string profile, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(DocumentFixture).Assembly.GetName().Name,
            EnvironmentName = Environments.Production,
            ContentRootPath = AppContext.BaseDirectory,
            Args = []
        });
        builder.Configuration.Sources.Clear();
        builder.Logging.ClearProviders();
        builder.WebHost.UseTestServer();
        builder.Services.AddOpenApi("v1");
        var app = builder.Build();
        switch (profile)
        {
            case "Undocumented":
                app.MapGet("/undocumented", Handlers.Undocumented);
                break;
            case "Zero":
                app.MapGet("/zero", Handlers.Zero);
                break;
            case "One":
                app.MapGet("/one", Handlers.One);
                break;
            case "Four":
                app.MapGet("/four", Handlers.Four);
                break;
            case "Aliased":
                app.MapGet("/aliased", Handlers.Aliased);
                break;
            case "Ignored":
                app.MapGet("/ignored", Handlers.Ignored);
                break;
            case "Body":
                app.MapPost("/body", Handlers.Body);
                break;
            default:
                await app.DisposeAsync();
                throw new ArgumentOutOfRangeException(nameof(profile), profile, "Unknown fixed profile.");
        }

        var fixture = new DocumentFixture(app);
        try
        {
            await app.StartAsync(cancellationToken);
            return fixture;
        }
        catch
        {
            await fixture.DisposeAsync();
            throw;
        }
    }

    /// <summary>Awaits the real registered provider through complete document serialization.</summary>
    /// <returns>The complete generated JSON document.</returns>
    public async Task<string> GenerateAsync()
    {
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        await _generate("v1", writer);
        return writer.ToString();
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        await _application.DisposeAsync();
    }

    internal static class Handlers
    {
        internal static string Undocumented(string term, int page) => term + page.ToString(CultureInfo.InvariantCulture);

        /// <summary>XML zero.</summary>
        internal static string Zero() => "zero";

        /// <summary>XML one.</summary>
        /// <param name="term">XML one term.</param>
        internal static string One(string term) => term;

        /// <summary>XML four.</summary>
        /// <param name="term">XML four term.</param>
        /// <param name="page" example="2">XML four page.</param>
        /// <param name="pageSize">XML four page size.</param>
        /// <param name="exact">XML four exact.</param>
        internal static string Four(string term, int page, int pageSize, bool exact) => term;

        /// <summary>XML aliased.</summary>
        /// <param name="term">XML aliased search.</param>
        internal static string Aliased([FromQuery(Name = "search")] string term) => term;

        /// <summary>XML ignored.</summary>
        /// <param name="term">XML ignored term.</param>
        /// <param name="cancellationToken">This must not appear as an OpenAPI parameter or request body.</param>
        internal static string Ignored(string term, CancellationToken cancellationToken) => term;

        /// <summary>XML body.</summary>
        /// <param name="body">XML body input.</param>
        internal static IResult Body([FromBody] BodyInput body) => Results.NoContent();
    }

    internal sealed record BodyInput(string Name);
}
