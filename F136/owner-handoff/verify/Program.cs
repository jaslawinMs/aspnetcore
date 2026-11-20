using System.Buffers.Binary;
using System.Diagnostics;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

return Evidence.Run(args);

internal static class Evidence
{
    private static readonly List<object> Cases = [];
    private static readonly string[] SelectedSources =
    [
        @"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileProvider.cs",
        @"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileChangeToken.cs",
        @"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileInfo.cs",
        @"src\Components\Endpoints\test\Builder\RazorComponentsEndpointConventionBuilderExtensionsTest.cs",
        @"src\Components\Endpoints\test\HotReloadServiceTests.cs",
        @"src\Components\Endpoints\test\RazorComponentEndpointDataSourceTest.cs",
        @"src\Components\Endpoints\src\Builder\RazorComponentEndpointDataSource.cs",
        @"src\Components\Endpoints\src\DependencyInjection\DefaultRazorComponentsServiceOptionsConfiguration.cs"
    ];

    internal static int Run(string[] args)
    {
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var path = Path.Combine(AppContext.BaseDirectory, $"{name.Name}.dll");
            return File.Exists(path) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(path) : null;
        };
        var role = args[0];
        var graph = Path.GetFullPath(args[1]);
        var output = Path.GetFullPath(args[2]);
        var succeeded = true;
        Execute(nameof(MissingAndRepeatPreserveIdentity), MissingAndRepeatPreserveIdentity);
        Execute(nameof(PublicChangedStateReplacesWithoutCallbacks), PublicChangedStateReplacesWithoutCallbacks);
        Execute(nameof(ExplicitReplacementAndOrdinalFilters), ExplicitReplacementAndOrdinalFilters);
        Execute(nameof(FileMutationDoesNotProduceTokenChanges), FileMutationDoesNotProduceTokenChanges);
        Execute(nameof(RealEndpointFixtureReadsFilesWithoutWatch), RealEndpointFixtureReadsFilesWithoutWatch);
        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
            .OrderBy(a => a.GetName().Name)
            .Select(a => new
            {
                name = a.GetName().Name,
                path = a.Location,
                sha256 = Hash(File.ReadAllBytes(a.Location)),
                mvid = a.ManifestModule.ModuleVersionId
            }).ToArray();
        var owner = typeof(TestFileProvider).Assembly;
        var componentOwner = typeof(RazorComponentsEndpointRouteBuilderExtensions).Assembly;
        var report = new
        {
            role,
            graph,
            pid = Environment.ProcessId,
            processPath = Environment.ProcessPath,
            framework = RuntimeInformation.FrameworkDescription,
            runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory(),
            coreLibrary = typeof(object).Assembly.Location,
            succeeded,
            cases = Cases,
            assemblies,
            selectedMetadata = new[] { Describe(owner, graph), Describe(componentOwner, graph), Describe(typeof(Evidence).Assembly, graph) },
            nativeModules = Process.GetCurrentProcess().Modules.Cast<ProcessModule>()
                .Where(m => m.ModuleName is "coreclr.dll" or "clrjit.dll" or "dotnet.exe")
                .Select(m => new { name = m.ModuleName, path = m.FileName, sha256 = Hash(File.ReadAllBytes(m.FileName)) }).ToArray(),
            limitations = new[]
            {
                "Untimed managed provider and endpoint-fixture evidence, not browser or hosted HTTP evidence.",
                "The token's public HasChanged setter is the owning helper state producer; inspected native fixtures never use it.",
                "Only selected PDB documents are associated with raw source bytes; not full compiler attestation.",
                "No concurrent access, universal caller frequency, candidate equivalence or performance claim."
            }
        };
        File.WriteAllText(output, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
        return succeeded ? 0 : 1;

        void Execute(string name, Func<object> action)
        {
            try
            {
                var detail = action();
                Cases.Add(new { name, outcome = "Passed", detail });
                Console.WriteLine($"PASS {name}");
            }
            catch (Exception exception)
            {
                succeeded = false;
                Cases.Add(new { name, outcome = "Failed", exception = exception.ToString() });
                Console.WriteLine($"FAIL {name}: {exception}");
            }
        }
    }

    private static object MissingAndRepeatPreserveIdentity()
    {
        var provider = new TestFileProvider();
        var filter = new string("site.css".ToCharArray());
        var first = (TestFileChangeToken)provider.Watch(filter);
        var equalFilter = new string(filter.ToCharArray());
        Require(!ReferenceEquals(filter, equalFilter), "Distinct equal filter input was not produced.");
        Require(ReferenceEquals(first.Filter, filter), "Initial filter identity changed.");
        Require(ReferenceEquals(first, provider.GetChangeToken(filter)), "Watch did not publish its token.");
        Require(ReferenceEquals(first, provider.Watch(equalFilter)), "Unchanged repeat did not retain the token.");
        Require(ReferenceEquals(first.Filter, filter), "Equal repeat replaced the original filter object.");
        Require(!first.HasChanged && !first.ActiveChangeCallbacks, "Initial token state differs.");
        return new { initialMissingFilter = true, equalRepeatSameToken = true, originalFilterObjectRetained = true };
    }

    private static object PublicChangedStateReplacesWithoutCallbacks()
    {
        var provider = new TestFileProvider();
        var first = (TestFileChangeToken)provider.Watch("site.css");
        var oldInvoked = false;
        var newInvoked = false;
        var reentered = false;
        using var oldRegistration = first.RegisterChangeCallback(_ =>
        {
            oldInvoked = true;
            provider.Watch("site.css");
            reentered = true;
        }, new object());
        first.HasChanged = true;
        Require(first.HasChanged && !oldInvoked, "Public changed-state setter unexpectedly notified callbacks.");
        var second = (TestFileChangeToken)provider.Watch("site.css");
        Require(!ReferenceEquals(first, second) && first.HasChanged && !second.HasChanged, "Changed token replacement lost old/new state.");
        using var newRegistration = second.RegisterChangeCallback(_ => newInvoked = true, new object());
        using var lateOldRegistration = first.RegisterChangeCallback(_ => oldInvoked = true, new object());
        Require(!oldInvoked, "Late old-token registration unexpectedly ran.");
        first.HasChanged = false;
        Require(ReferenceEquals(second, provider.Watch("site.css")), "Retained old token still controls the current slot.");
        second.HasChanged = true;
        var third = (TestFileChangeToken)provider.Watch("site.css");
        Require(!ReferenceEquals(second, third) && second.HasChanged && !third.HasChanged, "Second generation replacement failed.");
        oldRegistration.Dispose();
        newRegistration.Dispose();
        Require(!oldInvoked && !newInvoked && !reentered, "Inactive helper callbacks unexpectedly ran or reentered.");
        return new { generations = new[] { "first retained", "second retained", "third current" }, producer = "public TestFileChangeToken.HasChanged setter", callbacksInvoked = false, callbackReentryObserved = false };
    }

    private static object ExplicitReplacementAndOrdinalFilters()
    {
        var provider = new TestFileProvider();
        var lower = provider.AddChangeToken("site.css");
        var upper = (TestFileChangeToken)provider.Watch("SITE.css");
        Require(!ReferenceEquals(lower, upper), "Ordinally different filters were merged.");
        var replacementFilter = new string("site.css".ToCharArray());
        var explicitReplacement = provider.AddChangeToken(replacementFilter);
        Require(!ReferenceEquals(lower, explicitReplacement), "AddChangeToken retained an unchanged old token.");
        Require(ReferenceEquals(explicitReplacement.Filter, replacementFilter), "Explicit replacement filter identity changed.");
        Require(ReferenceEquals(explicitReplacement, provider.Watch("site.css")), "Explicit replacement was not current.");
        Require(ReferenceEquals(upper, provider.Watch("SITE.css")) && !lower.HasChanged, "Unrelated or retained token was altered.");
        return new { comparer = "StringComparer.Ordinal", unchangedExplicitReplacement = true, independentCaseVariant = true };
    }

    private static object FileMutationDoesNotProduceTokenChanges()
    {
        var provider = new TestFileProvider();
        provider.AddFile("site.css", "first");
        var token = (TestFileChangeToken)provider.Watch("site.css");
        provider.AddFile("site.css", "replacement");
        using (var stream = provider.GetFileInfo("site.css").CreateReadStream())
        using (var reader = new StreamReader(stream))
        {
            Require(reader.ReadToEnd() == "replacement", "Public file replacement did not change readable content.");
        }
        Require(!token.HasChanged && ReferenceEquals(token, provider.Watch("site.css")), "AddFile unexpectedly signaled a token.");
        provider.DeleteFile("site.css");
        Require(!provider.GetFileInfo("site.css").Exists, "DeleteFile did not remove the file.");
        Require(!token.HasChanged && ReferenceEquals(token, provider.Watch("site.css")), "DeleteFile unexpectedly signaled a token.");
        return new { replacedContentObserved = "replacement", deletedFileAbsent = true, fileMutationSignalsToken = false };
    }

    private static object RealEndpointFixtureReadsFilesWithoutWatch()
    {
        var provider = new ObservedProvider();
        provider.AddFile("site.css", "body { color: red; }");
        var retained = provider.Watch("site.css");
        provider.Events.Clear();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { [WebHostDefaults.DetailedErrorsKey] = "true" }).Build());
        services.AddSingleton<IWebHostEnvironment>(new ProbeEnvironment(provider));
        services.AddRazorComponents();
        using var serviceProvider = services.BuildServiceProvider();
        var routes = new ProbeRoutes(serviceProvider);
        routes.MapStaticAssets();
        routes.MapRazorComponents<ProbeComponent>().WithStaticAssets();
        var endpoints = routes.DataSources.SelectMany(ds => ds.Endpoints).ToArray();
        var page = endpoints.OfType<RouteEndpoint>().Single(e => e.RoutePattern.RawText == "/f136");
        if (page.Metadata.GetMetadata<ResourceAssetCollection>() is not IReadOnlyList<ResourceAsset> resources)
        {
            throw new InvalidOperationException("Actual mapped page has no resource collection.");
        }
        Require(resources.Count == 1 && resources[0].Url == "default.css", "Actual mapped manifest did not yield default.css resource metadata.");
        Require(serviceProvider.GetRequiredService<IOptions<RazorComponentsServiceOptions>>().Value.DetailedErrors, "Actual native post-configuration did not consume configuration.");
        Require(provider.Events.Contains("GetFileInfo:TestApplication.modules.json"), "Actual options producer did not reach this provider.");
        Require(!provider.Events.Any(e => e.StartsWith("Watch:", StringComparison.Ordinal)), "The exercised consuming fixture called Watch.");
        Require(ReferenceEquals(retained, provider.GetChangeToken("site.css")) && !retained.HasChanged, "Endpoint setup changed the existing watch token.");
        return new { boundary = "real MapStaticAssets / MapRazorComponents / native options configuration, fixture-equivalent public setup", providerOperations = provider.Events.ToArray(), route = "/f136", resource = resources[0].Url, watchReachedByThisSetup = false };
    }

    private static object Describe(Assembly assembly, string graph)
    {
        using var stream = File.OpenRead(assembly.Location);
        using var pe = new PEReader(stream);
        var debug = pe.ReadDebugDirectory();
        var codeView = debug.Where(e => e.Type == DebugDirectoryEntryType.CodeView).Select(e =>
        {
            var data = pe.ReadCodeViewDebugDirectoryData(e);
            return new { guid = data.Guid, age = data.Age, path = data.Path, stamp = e.Stamp };
        }).ToArray();
        var pdbPath = Path.ChangeExtension(assembly.Location, ".pdb");
        if (!File.Exists(pdbPath))
        {
            return new { path = assembly.Location, mvid = assembly.ManifestModule.ModuleVersionId, codeView, missingPdb = pdbPath };
        }
        using var pdbStream = File.OpenRead(pdbPath);
        using var metadata = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
        var reader = metadata.GetMetadataReader();
        var id = reader.DebugMetadataHeader!.Id.ToArray();
        var documents = reader.Documents.Select(handle => reader.GetDocument(handle)).Select(document =>
        {
            var name = reader.GetString(document.Name);
            var relative = SelectedSources.FirstOrDefault(source => name.Replace('/', '\\').EndsWith(source, StringComparison.OrdinalIgnoreCase));
            if (relative is null)
            {
                return null;
            }
            var rawPath = Path.Combine(graph, relative);
            var raw = File.ReadAllBytes(rawPath);
            var algorithm = reader.GetGuid(document.HashAlgorithm);
            var expected = Convert.ToHexString(reader.GetBlobBytes(document.Hash)).ToLowerInvariant();
            var actual = algorithm == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460")
                ? Convert.ToHexString(SHA1.HashData(raw)).ToLowerInvariant() : Hash(raw);
            return new
            {
                name, relative, rawPath, algorithm, documentChecksum = expected, rawDocumentChecksum = actual,
                rawDocumentMatches = expected == actual, rawSha256 = Hash(raw),
                lfNormalizedSha256 = Hash(Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(raw).Replace("\r\n", "\n")))
            };
        }).Where(d => d is not null).ToArray();
        return new
        {
            path = assembly.Location,
            sha256 = Hash(File.ReadAllBytes(assembly.Location)),
            mvid = assembly.ManifestModule.ModuleVersionId,
            peTimestamp = pe.PEHeaders.CoffHeader.TimeDateStamp,
            codeView,
            pdbPath,
            pdbSha256 = Hash(File.ReadAllBytes(pdbPath)),
            pdbGuid = new Guid(id.AsSpan(0, 16)),
            pdbStamp = BinaryPrimitives.ReadUInt32LittleEndian(id.AsSpan(16, 4)),
            totalPdbDocuments = reader.Documents.Count,
            selectedDocuments = documents
        };
    }

    private static string Hash(byte[] bytes)
    {
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed class ObservedProvider : TestFileProvider
    {
        internal List<string> Events { get; } = [];

        public override IFileInfo GetFileInfo(string subpath)
        {
            Events.Add($"GetFileInfo:{subpath}");
            return base.GetFileInfo(subpath);
        }

        public override IChangeToken Watch(string filter)
        {
            Events.Add($"Watch:{filter}");
            return base.Watch(filter);
        }
    }

    private sealed class ProbeEnvironment(IFileProvider provider) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "TestApplication";
        public string EnvironmentName { get; set; } = "TestEnvironment";
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = provider;
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = provider;
    }

    private sealed class ProbeRoutes(IServiceProvider services) : IEndpointRouteBuilder
    {
        public IServiceProvider ServiceProvider { get; } = services;
        public ICollection<EndpointDataSource> DataSources { get; } = new List<EndpointDataSource>();

        public IApplicationBuilder CreateApplicationBuilder()
        {
            return new ApplicationBuilder(ServiceProvider);
        }
    }
}

/// <summary>Artifact-only component discovered by the real endpoint builder.</summary>
[Route("/f136")]
public sealed class ProbeComponent : IComponent
{
    void IComponent.Attach(RenderHandle renderHandle)
    {
    }

    Task IComponent.SetParametersAsync(ParameterView parameters)
    {
        return Task.CompletedTask;
    }
}
