using System.Buffers.Binary;
using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace AutoPerf.F137;

internal static class Program
{
    private static readonly List<object> Rows = [];
    private static int _failed;
    private static int _assertions;
    private static string _role = "";
    private static string _checkout = "";

    public static async Task<int> Main(string[] args)
    {
        _role = args[0];
        _checkout = args[1];
        var resultPath = args[2];
        await Case("EmptyParts_MissingViewReturnsMissingDescriptor", async () =>
        {
            using var app = Create([]);
            var compiler = app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
            var descriptor = await compiler.CompileAsync("/Views/Missing.cshtml");
            Check(descriptor.Item is null, "Missing precompiled item");
            Check(descriptor.RelativePath == "/Views/Missing.cshtml", "Normalized missing path retained");
            Check(descriptor.ExpirationTokens?.Count == 1, "Missing source has one watcher token");
            Check(app.Logs.Events.Any(e => e.Message.Contains("No compiled views", StringComparison.OrdinalIgnoreCase)), "Empty constructor diagnostic");
            return new { descriptor.RelativePath, descriptor.Type, tokens = descriptor.ExpirationTokens?.Count, events = app.Logs.Events };
        });
        await ViewCase("UniqueAssembly_PrecompiledViewRenders", ["HIGH"], "/Views/Home/Index.cshtml", "HIGH", "FIRST", 2);
        await ViewCase("ExactDuplicates_FirstPartRetained", ["HIGH", "EXACT"], "/Views/Home/Index.cshtml", "HIGH", "FIRST", 3);
        await ViewCase("ExactDuplicates_ReverseOrderChangesWinner", ["EXACT", "HIGH"], "/Views/Home/Index.cshtml", "EXACT", "LATER", 3);
        await ViewCase("CaseDuplicates_FirstPartRetained", ["HIGH", "CASE"], "/VIEWS/HOME/INDEX.CSHTML", "HIGH", "FIRST", 3);
        await ViewCase("CaseDuplicates_ReverseOrderChangesWinner", ["CASE", "HIGH"], "/Views/Home/Index.cshtml", "CASE", "LATER", 3);
        await ViewCase("NormalizedSlashDuplicates_FirstPartRetained", ["HIGH", "SLASH"], @"Views\Home\Index.cshtml", "HIGH", "FIRST", 3);
        await ViewCase("NormalizedSlashDuplicates_ReverseOrderChangesWinner", ["SLASH", "HIGH"], "/Views/Home/Index.cshtml", "SLASH", "LATER", 3);
        await ViewCase("NonDuplicateViewSurvivesEarlierDuplicate", ["EXACT", "HIGH"], "/Views/Unique.cshtml", "HIGH", "UNIQUE", 3);
        await Case("OrdinalIgnoreCase_TurkishCultureKeepsDistinctDotlessI", async () =>
        {
            var previous = CultureInfo.CurrentCulture;
            try
            {
                CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("tr-TR");
                using var app = Create(["TURKISH"]);
                var compiler = app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
                var latin = await compiler.CompileAsync("/views/i.cshtml");
                var dotless = await compiler.CompileAsync("/Views/ı.cshtml");
                Check(latin.Type?.Name == "View", "ASCII I/i resolves first ordinal-insensitive key");
                Check(dotless.Type?.Name == "UniqueView", "Dotless I is a distinct key");
                Check(await Render(app.Services, "/views/i.cshtml") == "LATER", "Latin path rendered output");
                Check(await Render(app.Services, "/Views/ı.cshtml") == "UNIQUE", "Dotless path rendered output");
                return new { culture = CultureInfo.CurrentCulture.Name, latinType = latin.Type?.FullName, dotlessType = dotless.Type?.FullName };
            }
            finally
            {
                CultureInfo.CurrentCulture = previous;
            }
        });
        await ThrowsCase("SamePartCaseDuplicates_RejectedByStandardFeatureProvider", ["SAMEPART"], typeof(InvalidOperationException), "differ only in case", null);
        await ThrowsCase("EmptyIdentifier_RejectedBeforeCompilerInsertion", ["EMPTYID"], typeof(IndexOutOfRangeException), null, null);
        await ThrowsCase("NullIdentifier_RejectedByAttributeLoader", ["NULLID"], typeof(ArgumentNullException), null, "identifier");
        await Case("WrongViewType_DescriptorAcceptedButRazorPageFactoryRejects", async () =>
        {
            using var app = Create(["WRONGTYPE"]);
            var descriptor = await app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler().CompileAsync("/Views/Home/Index.cshtml");
            Check(descriptor.Type == typeof(string), "Compiler retained metadata with non-page type");
            Exception? observed = null;
            try { await Render(app.Services, "/Views/Home/Index.cshtml"); }
            catch (Exception ex) { observed = Unwrap(ex); }
            Check(observed is not null, "Actual page factory/render path rejected non-page type");
            return new { descriptorType = descriptor.Type.FullName, exception = observed!.GetType().FullName, observed.Message };
        });
        await Case("ExtensionProvider_NullDescriptorFailsAtConstructor", async () =>
        {
            using var app = Create([], new InvalidDescriptorProvider(null));
            var ex = Capture(() => app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler());
            Check(ex is NullReferenceException, "Null descriptor dereferenced by constructor");
            await Task.CompletedTask;
            return new { boundary = "Custom registered feature provider, not standard compiled-item loader", exception = ex.GetType().FullName, ex.StackTrace };
        });
        await Case("ExtensionProvider_NullPathFailsDictionaryKeyContract", async () =>
        {
            using var app = Create([], new InvalidDescriptorProvider(new CompiledViewDescriptor()));
            var ex = Capture(() => app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler());
            Check(ex is ArgumentNullException { ParamName: "key" }, "Null RelativePath rejected as dictionary key");
            await Task.CompletedTask;
            return new { boundary = "Custom registered feature provider, not standard compiled-item loader", exception = ex.GetType().FullName, parameter = ((ArgumentNullException)ex).ParamName, ex.StackTrace };
        });
        await Case("NullCompilePath_ArgumentGuard", async () =>
        {
            using var app = Create(["HIGH"]);
            var compiler = app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
            var ex = Capture(() => compiler.CompileAsync(null!));
            Check(ex is ArgumentNullException { ParamName: "relativePath" }, "CompileAsync null argument guard");
            await Task.CompletedTask;
            return new { exception = ex.GetType().FullName, parameter = ((ArgumentNullException)ex).ParamName };
        });
        await Case("EmptyCompilePath_NormalizerRejects", async () =>
        {
            using var app = Create([]);
            var compiler = app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
            var ex = Capture(() => compiler.CompileAsync(""));
            Check(ex is IndexOutOfRangeException, "Empty path reaches ViewPath index operation");
            await Task.CompletedTask;
            return new { exception = ex.GetType().FullName, ex.StackTrace };
        });
        using (var app = Create(["HIGH"]))
        {
            var compiler = app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
            var owner = compiler.GetType().Assembly;
            var identity = new[]
            {
                Identity(owner, "src\\Mvc\\Mvc.Razor.RuntimeCompilation\\src\\RuntimeViewCompiler.cs"),
                Identity(typeof(CompiledViewDescriptor).Assembly, "src\\Mvc\\Mvc.Razor\\src\\ApplicationParts\\RazorCompiledItemFeatureProvider.cs"),
                Identity(typeof(ApplicationPartManager).Assembly, "src\\Mvc\\Mvc.Core\\src\\ApplicationParts\\ApplicationPartManager.cs"),
                Identity(typeof(RazorCompiledItemLoader).Assembly, "src\\Razor\\Razor.Runtime\\src\\Hosting\\RazorCompiledItemLoader.cs")
            };
            var result = new
            {
                role = _role, sourceCheckout = _checkout, candidateApplied = false, performanceMeasured = false,
                runtime = new
                {
                    frameworkDescription = RuntimeInformation.FrameworkDescription, version = Environment.Version.ToString(),
                    architecture = RuntimeInformation.ProcessArchitecture.ToString(), processId = Environment.ProcessId,
                    coreLibrary = typeof(object).Assembly.Location, coreLibrarySha256 = Hash(typeof(object).Assembly.Location),
                    hostPath = Environment.ProcessPath, hostSha256 = Hash(Environment.ProcessPath!),
                    rollForward = Environment.GetEnvironmentVariable("DOTNET_ROLL_FORWARD"),
                    runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory()
                },
                ownerIdentities = identity,
                commonConsumer = new { path = typeof(Program).Assembly.Location, sha256 = Hash(typeof(Program).Assembly.Location), mvid = typeof(Program).Assembly.ManifestModule.ModuleVersionId },
                rows = Rows, failed = _failed, assertions = _assertions,
                limits = new[]
                {
                    "Standard compiled-assembly metadata producer and real RazorView rendering are exercised; fixtures are hand-authored assembly attributes, not Razor SDK-generated .cshtml artifacts.",
                    "Bad descriptor rows use registered public feature-provider extensibility and are not ordinary loader-produced descriptors.",
                    "Selected PE/PDB/document checks establish selected source association, not complete compiler input attestation.",
                    "Original/default graphs and runtimes characterize functionality separately and are not a causal performance pair."
                }
            };
            File.WriteAllText(resultPath, JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        }
        Console.WriteLine(JsonSerializer.Serialize(new { role = _role, rows = Rows.Count, failed = _failed, assertions = _assertions }));
        return _failed == 0 ? 0 : 1;
    }

    private static async Task ViewCase(string name, string[] variants, string lookup, string expectedFixture, string expectedOutput, int expectedDescriptors)
    {
        await Case(name, async () =>
        {
            using var app = Create(variants);
            var feature = new ViewsFeature();
            app.Parts.PopulateFeature(feature);
            Check(feature.ViewDescriptors.Count == expectedDescriptors, "Actual application parts produced expected ordered descriptor count");
            var provider = app.Services.GetRequiredService<IViewCompilerProvider>();
            var compiler = provider.GetCompiler();
            Check(compiler.GetType().FullName == "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompiler", "Registered runtime compiler owns insertion");
            Check(ReferenceEquals(compiler, provider.GetCompiler()), "Provider caches compiler construction");
            var descriptor = await compiler.CompileAsync(lookup);
            Check(descriptor.Type?.Assembly.GetName().Name == $"AutoPerf.F137.Fixture.{expectedFixture}", "First matching application part retained");
            Check(ReferenceEquals(descriptor, await compiler.CompileAsync(lookup)), "Descriptor is stable on cache hit");
            var rendered = await Render(app.Services, "/" + lookup.Replace('\\', '/').TrimStart('/'));
            Check(rendered == expectedOutput, "Actual RazorView output identifies retained page");
            var constructionEvents = app.Logs.Events.Where(e => e.Name == "ViewCompilerLocatedCompiledView").ToArray();
            Check(constructionEvents.Length == expectedDescriptors, "Constructor observed all descriptors, including duplicates");
            return new
            {
                variants, lookup, descriptor.RelativePath, selectedAssembly = descriptor.Type!.Assembly.GetName().Name,
                rendered, featureDescriptors = feature.ViewDescriptors.Select(d => new { d.RelativePath, assembly = d.Type?.Assembly.GetName().Name }),
                constructionEvents
            };
        });
    }

    private static async Task ThrowsCase(string name, string[] variants, Type expectedType, string? messagePart, string? parameter)
    {
        await Case(name, async () =>
        {
            using var app = Create(variants);
            var ex = Capture(() => app.Services.GetRequiredService<IViewCompilerProvider>().GetCompiler());
            Check(ex.GetType() == expectedType, $"Expected {expectedType.Name}, got {ex.GetType().Name}");
            if (messagePart is not null) { Check(ex.Message.Contains(messagePart, StringComparison.Ordinal), "Expected production diagnostic"); }
            if (parameter is not null) { Check(ex is ArgumentException arg && arg.ParamName == parameter, "Expected parameter name"); }
            await Task.CompletedTask;
            return new { exception = ex.GetType().FullName, ex.Message, ex.StackTrace };
        });
    }

    private static App Create(string[] variants, IApplicationFeatureProvider<ViewsFeature>? extra = null)
    {
        var logs = new Logs();
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(logs));
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        services.AddSingleton<IWebHostEnvironment>(new HostingEnvironment());
        services.AddSingleton(_ => new DiagnosticListener("AutoPerf.F137"));
        services.AddSingleton<DiagnosticSource>(provider => provider.GetRequiredService<DiagnosticListener>());
        var builder = services.AddControllersWithViews().AddRazorRuntimeCompilation(options =>
        {
            options.FileProviders.Clear();
            options.FileProviders.Add(new NullFileProvider());
        });
        builder.PartManager.ApplicationParts.Clear();
        foreach (var variant in variants)
        {
            var assembly = Assembly.LoadFrom(Path.Combine(AppContext.BaseDirectory, $"AutoPerf.F137.Fixture.{variant}.dll"));
            builder.PartManager.ApplicationParts.Add(new CompiledRazorAssemblyPart(assembly));
        }
        if (extra is not null) { builder.PartManager.FeatureProviders.Add(extra); }
        return new App(services.BuildServiceProvider(), builder.PartManager, logs);
    }

    private static async Task<string> Render(ServiceProvider services, string path)
    {
        var engine = services.GetRequiredService<IRazorViewEngine>();
        var result = engine.GetView(null, path, isMainPage: false);
        Check(result.Success, "Razor view engine found precompiled page");
        var http = new DefaultHttpContext { RequestServices = services };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        var viewContext = new ViewContext(
            action, result.View, new ViewDataDictionary(new EmptyModelMetadataProvider(), action.ModelState),
            new TempDataDictionary(http, new TempData()), writer, new HtmlHelperOptions());
        await result.View.RenderAsync(viewContext);
        return writer.ToString();
    }

    private static object Identity(Assembly assembly, string repositoryPath)
    {
        var location = assembly.Location;
        Check(Path.GetDirectoryName(location) == Path.TrimEndingDirectorySeparator(AppContext.BaseDirectory), "Source owner loaded from actual private consumer image");
        var pdbPath = Path.ChangeExtension(location, ".pdb");
        using var peStream = File.OpenRead(location);
        using var pe = new PEReader(peStream);
        var codeViewEntry = pe.ReadDebugDirectory().Single(e => e.Type == DebugDirectoryEntryType.CodeView);
        var codeView = pe.ReadCodeViewDebugDirectoryData(codeViewEntry);
        using var pdbStream = File.OpenRead(pdbPath);
        using var provider = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
        var metadata = provider.GetMetadataReader();
        var id = metadata.DebugMetadataHeader!.Id.ToArray();
        var guid = new Guid(id.AsSpan(0, 16));
        var stamp = BinaryPrimitives.ReadUInt32LittleEndian(id.AsSpan(16, 4));
        Check(codeView.Guid == guid && codeViewEntry.Stamp == stamp, "Portable PDB ID matches actual loaded PE");
        var fileName = Path.GetFileName(repositoryPath);
        var handle = metadata.Documents.Single(d => metadata.GetString(metadata.GetDocument(d).Name).Replace('/', '\\').EndsWith(repositoryPath, StringComparison.OrdinalIgnoreCase));
        var document = metadata.GetDocument(handle);
        var algorithm = metadata.GetGuid(document.HashAlgorithm);
        var physical = Path.Combine(_checkout, repositoryPath);
        var physicalBytes = File.ReadAllBytes(physical);
        var actualChecksum = algorithm == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") ? SHA256.HashData(physicalBytes) : SHA1.HashData(physicalBytes);
        var storedChecksum = metadata.GetBlobBytes(document.Hash);
        Check(actualChecksum.SequenceEqual(storedChecksum), "Selected PDB document checksum matches physical pinned source");
        return new
        {
            assembly = assembly.FullName, location, sha256 = Hash(location), mvid = assembly.ManifestModule.ModuleVersionId,
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            pdbPath, pdbSha256 = Hash(pdbPath),
            peCodeView = new { codeView.Guid, codeView.Age, codeView.Path, codeViewEntry.Stamp },
            pdbId = new { guid, stamp },
            selectedDocument = new
            {
                document = metadata.GetString(document.Name), algorithm,
                checksum = Convert.ToHexString(storedChecksum), physical, physicalSha256 = Hash(physical),
                checksumMatches = actualChecksum.SequenceEqual(storedChecksum)
            }
        };
    }

    private static async Task Case(string name, Func<Task<object>> body)
    {
        var before = _assertions;
        try
        {
            var evidence = await body();
            Rows.Add(new { name, outcome = "Passed", assertions = _assertions - before, evidence });
            Console.WriteLine($"PASS {name}");
        }
        catch (Exception ex)
        {
            _failed++;
            Rows.Add(new { name, outcome = "Failed", assertions = _assertions - before, exception = ex.ToString() });
            Console.WriteLine($"FAIL {name}: {ex}");
        }
    }

    private static void Check(bool condition, string message)
    {
        _assertions++;
        if (!condition) { throw new InvalidOperationException(message); }
    }

    private static Exception Capture(Action action)
    {
        try { action(); }
        catch (Exception ex) { return Unwrap(ex); }
        throw new InvalidOperationException("Expected exception was not thrown.");
    }

    private static Exception Unwrap(Exception ex) => ex is TargetInvocationException { InnerException: not null } invocation ? Unwrap(invocation.InnerException) : ex;
    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();

    private sealed record App(ServiceProvider Services, ApplicationPartManager Parts, Logs Logs) : IDisposable
    {
        public void Dispose() => Services.Dispose();
    }

    private sealed class HostingEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = typeof(Program).Assembly.GetName().Name!;
        public string EnvironmentName { get; set; } = "Production";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class InvalidDescriptorProvider(CompiledViewDescriptor? descriptor) : IApplicationFeatureProvider<ViewsFeature>
    {
        public void PopulateFeature(IEnumerable<ApplicationPart> parts, ViewsFeature feature) => feature.ViewDescriptors.Add(descriptor!);
    }

    private sealed class TempData : ITempDataProvider
    {
        public IDictionary<string, object> LoadTempData(HttpContext context) => new Dictionary<string, object>();
        public void SaveTempData(HttpContext context, IDictionary<string, object> values) { }
    }

    private sealed class Logs : ILoggerProvider, ILogger
    {
        public List<LogEvent> Events { get; } = [];
        public ILogger CreateLogger(string categoryName) => this;
        public void Dispose() { }
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Events.Add(new LogEvent(eventId.Id, eventId.Name, formatter(state, exception)));
    }

    private sealed record LogEvent(int Id, string? Name, string Message);
}
