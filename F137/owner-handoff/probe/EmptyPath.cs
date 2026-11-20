using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

namespace AutoPerf.F137.EmptyPath;

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var assertions = 0;
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        services.AddSingleton<IWebHostEnvironment>(new HostingEnvironment());
        services.AddSingleton(_ => new DiagnosticListener("AutoPerf.F137.EmptyPath"));
        services.AddSingleton<DiagnosticSource>(provider => provider.GetRequiredService<DiagnosticListener>());
        var builder = services.AddControllersWithViews().AddRazorRuntimeCompilation(options =>
        {
            options.FileProviders.Clear();
            options.FileProviders.Add(new NullFileProvider());
        });
        builder.PartManager.ApplicationParts.Clear();
        using var provider = services.BuildServiceProvider();
        var compiler = provider.GetRequiredService<IViewCompilerProvider>().GetCompiler();
        Check(compiler.GetType().FullName == "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompiler");
        Exception? observed = null;
        try { await compiler.CompileAsync(""); }
        catch (Exception ex) { observed = ex; }
        Check(observed?.GetType() == typeof(ArgumentException));
        Check(observed.StackTrace?.Contains("NormalizeAndEnsureValidPath", StringComparison.Ordinal) == true);
        Check(((ArgumentException)observed).ParamName == "path");
        var owner = compiler.GetType().Assembly;
        Check(Path.GetDirectoryName(owner.Location) == Path.TrimEndingDirectorySeparator(AppContext.BaseDirectory));
        var result = new
        {
            role = args[0],
            name = "EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath",
            outcome = "Passed",
            assertions,
            exception = observed.GetType().FullName,
            observed.Message,
            parameter = ((ArgumentException)observed).ParamName,
            observed.StackTrace,
            owner = new { owner.FullName, owner.Location, mvid = owner.ManifestModule.ModuleVersionId, sha256 = Hash(owner.Location) },
            commonConsumer = new { location = typeof(Program).Assembly.Location, sha256 = Hash(typeof(Program).Assembly.Location) },
            runtime = new { version = Environment.Version.ToString(), processId = Environment.ProcessId, coreLibrary = typeof(object).Assembly.Location, coreLibrarySha256 = Hash(typeof(object).Assembly.Location), rollForward = Environment.GetEnvironmentVariable("DOTNET_ROLL_FORWARD") },
            boundary = "Direct registered public MVC/runtime-compilation services; real provider creates compiler and CompileAsync invokes real Razor project-file-system producer. No helper invocation or private field mutation.",
            supersedesOnly = "The expected IndexOutOfRangeException in the earlier probe's EmptyCompilePath_NormalizerRejects row was a probe bug. Earlier consumer bytes and failed outcomes are preserved; they are not reported as passing."
        };
        File.WriteAllText(args[1], JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine(JsonSerializer.Serialize(result));
        return 0;

        void Check(bool condition)
        {
            assertions++;
            if (!condition) { throw new InvalidOperationException($"Empty-path producer contract assertion {assertions} failed."); }
        }
    }

    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();

    private sealed class HostingEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = typeof(Program).Assembly.GetName().Name!;
        public string EnvironmentName { get; set; } = "Production";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
