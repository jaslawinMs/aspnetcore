using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

internal static class Program
{
    internal static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public static async Task<int> Main(string[] args)
    {
        if (args.Length != 4)
        {
            Console.Error.WriteLine("Usage: F139.EmitProbe <role-image> <fixture-root> <output> <role>");
            return 2;
        }

        var image = Path.GetFullPath(args[0]);
        var fixture = Path.GetFullPath(args[1]);
        var output = Path.GetFullPath(args[2]);
        Directory.CreateDirectory(output);
        var resolutions = new List<object>();
        AssemblyLoadContext.Default.Resolving += (context, name) =>
        {
            var path = Path.Combine(image, $"{name.Name}.dll");
            resolutions.Add(new { requested = name.FullName, path, exists = File.Exists(path) });
            return File.Exists(path) ? context.LoadFromAssemblyPath(path) : null;
        };
        var exit = 1;
        try
        {
            exit = await Probe.RunAsync(image, fixture, output);
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
                .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
                .Select(assembly => new
                {
                    name = assembly.GetName().Name,
                    version = assembly.GetName().Version?.ToString(),
                    path = assembly.Location,
                    sha256 = Hash(assembly.Location),
                    mvid = assembly.ManifestModule.ModuleVersionId,
                    loadContext = AssemblyLoadContext.GetLoadContext(assembly)?.Name
                }).ToArray();
            Write(output, "loaded-assemblies.json", assemblies);
            var outsideRole = assemblies.Where(assembly =>
                assembly.name!.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal) &&
                !assembly.path.StartsWith(image + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)).ToArray();
            if (outsideRole.Length != 0)
            {
                exit = 1;
            }
            Write(output, "source-role-boundary.json", new { passes = outsideRole.Length == 0, outsideRole });
            Write(output, "runtime.json", new
            {
                role = args[3],
                pid = Environment.ProcessId,
                processPath = Environment.ProcessPath,
                framework = RuntimeInformation.FrameworkDescription,
                version = Environment.Version.ToString(),
                coreLibPath = typeof(object).Assembly.Location,
                coreLibSha256 = Hash(typeof(object).Assembly.Location),
                coreLibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory(),
                dotnetRoot = Environment.GetEnvironmentVariable("DOTNET_ROOT"),
                rollForward = Environment.GetEnvironmentVariable("DOTNET_ROLL_FORWARD"),
                image,
                fixture,
                exit
            });
            var owners = assemblies.Where(assembly => assembly.name is
                "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation" or
                "Microsoft.AspNetCore.Mvc.Razor" or
                "Microsoft.AspNetCore.Mvc.ViewFeatures" or
                "Microsoft.AspNetCore.Razor.Runtime" or
                "F139.EmitProbe").Select(assembly => Metadata(assembly.path)).ToArray();
            Write(output, "owner-metadata.json", owners);
        }

        return exit;
    }

    private static object Metadata(string path)
    {
        using var peStream = File.OpenRead(path);
        using var pe = new PEReader(peStream);
        var metadata = pe.GetMetadataReader();
        var debug = pe.ReadDebugDirectory();
        var codeView = debug.Where(entry => entry.Type == DebugDirectoryEntryType.CodeView)
            .Select(entry =>
            {
                var data = pe.ReadCodeViewDebugDirectoryData(entry);
                return new { guid = data.Guid, stamp = entry.Stamp, age = data.Age, path = data.Path };
            }).ToArray();
        var pdbPath = Path.ChangeExtension(path, ".pdb");
        object? pdb = null;
        if (File.Exists(pdbPath))
        {
            using var stream = File.OpenRead(pdbPath);
            using var provider = MetadataReaderProvider.FromPortablePdbStream(stream);
            var reader = provider.GetMetadataReader();
            var id = reader.DebugMetadataHeader!.Id.ToArray();
            pdb = new
            {
                path = pdbPath,
                sha256 = Hash(pdbPath),
                guid = new Guid(id.AsSpan(0, 16)),
                stamp = BitConverter.ToUInt32(id.AsSpan(16, 4)),
                documents = reader.Documents.Select(handle =>
                {
                    var document = reader.GetDocument(handle);
                    return new
                    {
                        name = reader.GetString(document.Name),
                        algorithm = reader.GetGuid(document.HashAlgorithm),
                        checksum = Convert.ToHexString(reader.GetBlobBytes(document.Hash))
                    };
                }).ToArray()
            };
        }

        return new { path, sha256 = Hash(path), mvid = metadata.GetGuid(metadata.GetModuleDefinition().Mvid), codeView, pdb };
    }

    internal static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    internal static void Write(string output, string name, object value)
    {
        File.WriteAllText(Path.Combine(output, name), JsonSerializer.Serialize(value, JsonOptions));
    }
}

internal static class Probe
{
    private static readonly List<object> Rows = [];
    private static readonly List<object> Emitted = [];

    internal static async Task<int> RunAsync(string image, string fixture, string output)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var failures = new List<object>();
        foreach (var mode in new[] { "portable", "none" })
        {
            try
            {
                await RunModeAsync(image, fixture, output, mode);
            }
            catch (Exception exception)
            {
                failures.Add(new { mode, exception = exception.ToString() });
                Console.Error.WriteLine($"{mode}: {exception}");
            }
        }
        Program.Write(output, "rows.json", Rows);
        Program.Write(output, "emitted-assemblies.json", Emitted);
        Program.Write(output, "mode-failures.json", failures);

        return failures.Count == 0 ? 0 : 1;
    }

    private static async Task RunModeAsync(string image, string fixture, string output, string mode)
    {
        var contextName = mode == "portable" ? "F139.PortableContext" : "F139.NoPdbContext";
        var context = Assembly.LoadFrom(Path.Combine(AppContext.BaseDirectory, contextName + ".dll"));
        var depsPath = Path.Combine(AppContext.BaseDirectory, contextName + ".deps.json");
        using var deps = JsonDocument.Parse(File.ReadAllText(depsPath));
        var debugType = deps.RootElement.GetProperty("compilationOptions").GetProperty("debugType").GetString();
        Check(mode, "OwningDependencySetting", debugType == mode, new { contextName, debugType, depsPath, sha256 = Program.Hash(depsPath) });
        using var physical = new PhysicalFileProvider(fixture);
        var environment = new ProbeEnvironment(context.GetName().Name!, fixture, physical);
        var services = new ServiceCollection();
        services.AddSingleton<IWebHostEnvironment>(environment);
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddLogging(builder => builder.SetMinimumLevel(LogLevel.None));
        using var listener = new DiagnosticListener("F139.EmitProbe");
        services.AddSingleton(listener);
        services.AddSingleton<DiagnosticSource>(listener);
        var references = ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!).Split(Path.PathSeparator)
            .Concat(Directory.EnumerateFiles(image, "*.dll"))
            .GroupBy(Path.GetFileName, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last()).ToArray();
        Program.Write(output, mode + "-compilation-references.json", references.Select(path => new { path, sha256 = Program.Hash(path) }).ToArray());
#pragma warning disable ASPDEPR003 // Exercise the existing runtime-compilation registration without changing its obsolete status.
        services.AddControllersWithViews()
            .ConfigureApplicationPartManager(parts => parts.ApplicationParts.Clear())
            .AddRazorRuntimeCompilation(options =>
            {
                options.FileProviders.Clear();
                options.FileProviders.Add(physical);
                foreach (var reference in references)
                {
                    options.AdditionalReferencePaths.Add(reference);
                }
            });
#pragma warning restore ASPDEPR003
        using var provider = services.BuildServiceProvider(validateScopes: true);
        using var scope = provider.CreateScope();
        var scoped = scope.ServiceProvider;
        var compilerProvider = provider.GetRequiredService<IViewCompilerProvider>();
        var compiler = compilerProvider.GetCompiler();
        var compilerType = compiler.GetType();
        Check(mode, "RegisteredRuntimeCompiler", compilerType.FullName == "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompiler" &&
            compilerProvider.GetType().FullName == "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompilerProvider",
            new { providerType = compilerProvider.GetType().FullName, compilerType = compilerType.FullName, owner = compilerType.Assembly.Location });
        var csharpType = compilerType.Assembly.GetType("Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.CSharpCompiler", throwOnError: true)!;
        var csharpCompiler = provider.GetRequiredService(csharpType);
        var emitPdb = (bool)csharpType.GetProperty("EmitPdb")!.GetValue(csharpCompiler)!;
        var emitOptions = csharpType.GetProperty("EmitOptions")!.GetValue(csharpCompiler)!;
        var format = emitOptions.GetType().GetProperty("DebugInformationFormat")!.GetValue(emitOptions)!.ToString();
        Check(mode, "OwningEmitPdbSetting", emitPdb == (mode == "portable"), new { emitPdb, format });
        const string goodPath = "/Views/F139/Good.cshtml";
        var firstTask = compiler.CompileAsync(goodPath);
        var descriptor = await firstTask;
        var repeatedTask = compiler.CompileAsync(goodPath);
        var repeated = await repeatedTask;
        var viewType = descriptor.Type ?? throw new InvalidOperationException("Actual runtime compilation produced no view type.");
        ObserveEmitted(mode, "good", viewType.Assembly);
        Check(mode, "FreshEmittedView", viewType.Assembly.Location.Length == 0 && descriptor.Item is not null &&
            descriptor.RelativePath == goodPath, new { type = viewType.FullName, descriptor.RelativePath });
        Check(mode, "RepeatedCompilerRetention", ReferenceEquals(firstTask, repeatedTask) && ReferenceEquals(descriptor, repeated) &&
            ReferenceEquals(compiler, compilerProvider.GetCompiler()), new { sameTask = ReferenceEquals(firstTask, repeatedTask), sameDescriptor = ReferenceEquals(descriptor, repeated) });
        var viewEngine = provider.GetRequiredService<IRazorViewEngine>();
        var firstView = viewEngine.GetView(null, goodPath, isMainPage: true);
        var secondView = viewEngine.GetView(null, goodPath, isMainPage: true);
        Check(mode, "RealViewFactoryUsesEmittedType", firstView.Success && secondView.Success &&
            firstView.View is RazorView firstRazor && firstRazor.RazorPage.GetType() == viewType &&
            secondView.View is RazorView secondRazor && secondRazor.RazorPage.GetType() == viewType,
            new { firstView.Success, secondSuccess = secondView.Success });
        var firstRendered = await RenderAsync(firstView.View, scoped);
        var secondRendered = await RenderAsync(secondView.View, scoped);
        var expected = "F139|42|rendered\n";
        File.WriteAllText(Path.Combine(output, mode + "-rendered.txt"), firstRendered);
        Check(mode, "KnownRenderedOutput", firstRendered == expected && secondRendered == expected, new { expected, firstRendered, secondRendered });
        const string throwPath = "/Views/F139/Throw.cshtml";
        var throwingDescriptor = await compiler.CompileAsync(throwPath);
        var throwingType = throwingDescriptor.Type ?? throw new InvalidOperationException("Throwing view was not emitted.");
        ObserveEmitted(mode, "throw", throwingType.Assembly);
        var throwingView = viewEngine.GetView(null, throwPath, isMainPage: true);
        Exception? observed = null;
        try
        {
            await RenderAsync(throwingView.View, scoped);
        }
        catch (InvalidOperationException exception) when (exception.Message == "F139-emitted-frame")
        {
            observed = exception;
        }
        Check(mode, "EmittedExceptionMaterialConsumer", observed is not null, new { exception = observed?.ToString() });
        var frames = new StackTrace(observed!, fNeedFileInfo: true).GetFrames()
            .Where(frame => frame.GetMethod()?.DeclaringType?.Assembly == throwingType.Assembly)
            .Select(frame => new { method = frame.GetMethod()?.Name, file = frame.GetFileName(), line = frame.GetFileLineNumber() }).ToArray();
        Check(mode, "ActualLoadedPdbStackFrame", frames.Length > 0 &&
            (mode == "portable" ? frames.Any(frame => frame.file?.EndsWith("Throw.cshtml", StringComparison.Ordinal) == true && frame.line == 1) :
                frames.All(frame => frame.file is null && frame.line == 0)), frames);
        await VerifyFailureAsync(mode, fixture, output, compiler, "InvalidCSharp.cshtml", "CS0103", requireGeneratedCode: true);
        await VerifyFailureAsync(mode, fixture, output, compiler, "InvalidRazor.cshtml", "RZ1006", requireGeneratedCode: false);
    }

    private static async Task VerifyFailureAsync(string mode, string fixture, string output, IViewCompiler compiler, string name, string diagnosticId, bool requireGeneratedCode)
    {
        var relative = "/Views/F139/" + name;
        var source = File.ReadAllText(Path.Combine(fixture, "Views", "F139", name));
        Exception? observed = null;
        var task = compiler.CompileAsync(relative);
        try
        {
            await task;
        }
        catch (Exception exception)
        {
            observed = exception;
        }
        var failures = (observed as ICompilationException)?.CompilationFailures.ToArray() ?? [];
        var messages = failures.SelectMany(failure => failure.Messages ?? []).Where(message => message is not null).ToArray();
        Program.Write(output, mode + "-" + name + "-diagnostics.json", new { exception = observed?.ToString(), failures });
        Check(mode, name + "-ExactDiagnostic", observed?.GetType().FullName == "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.CompilationFailedException" &&
            failures.Length == 1 && failures[0].SourceFileContent == source &&
            failures[0].SourceFilePath?.EndsWith(name, StringComparison.Ordinal) == true &&
            messages.Any(message => message!.FormattedMessage?.Contains(diagnosticId, StringComparison.Ordinal) == true && message.StartLine == 1) &&
            (requireGeneratedCode ? !string.IsNullOrEmpty(failures[0].CompiledContent) : string.IsNullOrEmpty(failures[0].CompiledContent)),
            new { exceptionType = observed?.GetType().FullName, expectedDiagnostic = diagnosticId, failures });
        var repeated = compiler.CompileAsync(relative);
        Exception? again = null;
        try
        {
            await repeated;
        }
        catch (Exception exception)
        {
            again = exception;
        }
        Check(mode, name + "-FailureRetention", ReferenceEquals(task, repeated) && ReferenceEquals(observed, again),
            new { sameTask = ReferenceEquals(task, repeated), sameException = ReferenceEquals(observed, again) });
    }

    private static async Task<string> RenderAsync(IView view, IServiceProvider services)
    {
        var context = new DefaultHttpContext { RequestServices = services };
        var actionContext = new ActionContext(context, new RouteData(), new ActionDescriptor());
        var viewData = new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary());
        var tempData = new TempDataDictionary(context, new EmptyTempDataProvider());
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        var viewContext = new ViewContext(actionContext, view, viewData, tempData, writer, new HtmlHelperOptions());
        await view.RenderAsync(viewContext);

        return writer.ToString();
    }

    private static void ObserveEmitted(string mode, string purpose, Assembly assembly)
    {
        Emitted.Add(new
        {
            mode,
            purpose,
            assembly = assembly.FullName,
            assembly.Location,
            mvid = assembly.ManifestModule.ModuleVersionId,
            loadContext = AssemblyLoadContext.GetLoadContext(assembly)?.Name,
            assembly.IsCollectible,
            producer = "Registered RuntimeViewCompiler CompileAsync; physical .cshtml -> RazorProjectEngine -> Roslyn.Emit -> existing Assembly.Load(byte[], byte[]?)",
            rawEmittedBytesCaptured = false
        });
    }

    private static void Check(string mode, string name, bool passes, object evidence)
    {
        Rows.Add(new { mode, name, passes, evidence });
        Console.WriteLine($"{(passes ? "PASS" : "FAIL")} {mode}.{name}");
        if (!passes)
        {
            throw new InvalidOperationException($"Probe requirement failed: {mode}.{name}");
        }
    }

    private sealed class EmptyTempDataProvider : ITempDataProvider
    {
        public IDictionary<string, object> LoadTempData(HttpContext context) => new Dictionary<string, object>();

        public void SaveTempData(HttpContext context, IDictionary<string, object> values)
        {
        }
    }

    private sealed class ProbeEnvironment(string applicationName, string root, IFileProvider files) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = applicationName;
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = files;
        public string WebRootPath { get; set; } = root;
        public IFileProvider WebRootFileProvider { get; set; } = files;
    }
}
