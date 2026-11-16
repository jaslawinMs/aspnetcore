using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Analyzers.RouteHandlers;
using Microsoft.AspNetCore.Builder;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace AutoPerf;

internal static class Evidence
{
    public static string StateDirectory { get; set; } = string.Empty;
    public static string InputDirectory { get; set; } = string.Empty;
    public static readonly string OwnerSha256 = Hash(typeof(RouteHandlerAnalyzer).Assembly.Location);
    public static readonly string HarnessSha256 = Hash(typeof(Evidence).Assembly.Location);

    public static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);

    public static void Write(string name, object value)
    {
        File.WriteAllText(Path.Combine(StateDirectory, name + ".json"), JsonSerializer.Serialize(value,
            new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var artifactIndex = Array.IndexOf(args, "--artifacts");
        if (artifactIndex < 0 || artifactIndex + 1 >= args.Length || !Path.IsPathFullyQualified(args[artifactIndex + 1]))
        {
            throw new ArgumentException("An explicit absolute --artifacts directory is required.");
        }
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.StateDirectory = Path.Combine(args[artifactIndex + 1], "states");
        Evidence.InputDirectory = Path.Combine(args[artifactIndex + 1], "inputs");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Directory.CreateDirectory(Evidence.InputDirectory);
        Evidence.Write("runtime", new
        {
            runtime = Environment.Version.ToString(),
            processId = Environment.ProcessId,
            architecture = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString(),
            processorCount = Environment.ProcessorCount,
            corelibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            routingSha256 = Evidence.Hash(typeof(EndpointRouteBuilderExtensions).Assembly.Location),
            roslynCommonSha256 = Evidence.Hash(typeof(Compilation).Assembly.Location),
            roslynCSharpSha256 = Evidence.Hash(typeof(CSharpCompilation).Assembly.Location),
            roslynInformationalVersion = typeof(Compilation).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            ownerAssemblyReferences = typeof(RouteHandlerAnalyzer).Assembly.GetReferencedAssemblies().Select(reference => reference.FullName).ToArray(),
            serverGc = GCSettings.IsServerGC,
            configuredConcurrentGc = true,
            generatedInputLanguage = nameof(LanguageVersion.CSharp13),
            measuredBoundary = "Fresh CompilationWithAnalyzers/actual public RouteHandlerAnalyzer/actual in-tree endpoint metadata/complete Task<int> diagnostics. Compilation-start pool is fresh per driver; parse/metadata/setup/observer excluded."
        });
        if (args.Contains("--describe-context", StringComparer.Ordinal))
        {
            var schema = new[] { typeof(AnalysisContext), typeof(CompilationStartAnalysisContext), typeof(OperationBlockStartAnalysisContext) }
                .Select(type => new
                {
                    type = type.FullName,
                    constructors = type.GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                        .Where(constructor => constructor.IsPublic || constructor.IsFamily || constructor.IsFamilyOrAssembly)
                        .Select(constructor => constructor.ToString()).ToArray(),
                    abstractMethods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                        .Where(method => method.IsAbstract).Select(method => method.ToString()).Order(StringComparer.Ordinal).ToArray(),
                    properties = type.GetProperties().Select(property => new
                    {
                        signature = property.ToString(),
                        getterVirtual = property.GetMethod?.IsVirtual,
                        getterPublic = property.GetMethod?.IsPublic,
                        setterPublic = property.SetMethod?.IsPublic
                    }).ToArray()
                }).ToArray();
            Evidence.Write("public-producer-context-schema", schema);
            Console.WriteLine(Evidence.Compact(schema));

            return 0;
        }
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            await AnalyzerProbe.RunAsync();

            return 0;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

        return 0;
    }
}
