using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Characteristics;
using BenchmarkDotNet.Columns;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Loggers;
using BenchmarkDotNet.Running;
using BenchmarkDotNet.Toolchains;
using BenchmarkDotNet.Toolchains.InProcess;
using BenchmarkDotNet.Toolchains.InProcess.NoEmit;
using BenchmarkDotNet.Toolchains.Parameters;
using BenchmarkDotNet.Toolchains.Results;
using BenchmarkDotNet.Validators;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.OpenApi.Microbenchmarks;
using Perfolizer.Horology;
using Perfolizer.Mathematics.OutlierDetection;

internal static class Program
{
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };
    private delegate bool BodySelector(ApiDescription description, out ApiParameterDescription? body);

    private static async Task<int> Main(string[] args)
    {
        try
        {
            Require(args.Length == 2 && args[0] is "inspect" or "run", "Expected inspect/run and one absolute launch-spec path.");
            Require(Path.IsPathFullyQualified(args[1]), "An absolute external launch-spec path is required.");
            var spec = JsonSerializer.Deserialize<LaunchSpec>(File.ReadAllText(args[1]), Json)
                ?? throw new InvalidDataException("Null launch specification.");
            Require(Path.IsPathFullyQualified(spec.Output) && !Directory.Exists(spec.Output), "Output must be a fresh absolute directory.");
            Directory.CreateDirectory(spec.Output);
            var owner = Assembly.Load("Microsoft.AspNetCore.OpenApi");
            Verify(spec.Owner, owner);
            Verify(spec.Fixture, typeof(GenerationBenchmarks).Assembly);
            Verify(spec.CoreLib, typeof(object).Assembly);
            Require(new DirectoryInfo(Path.GetDirectoryName(typeof(object).Assembly.Location)!).Name == spec.Runtime, "Loaded CoreLib runtime differs.");
            Require(Hash(typeof(BenchmarkRunner).Assembly.Location) == "4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437", "Pinned BenchmarkDotNet bytes differ.");
            Require(GCSettings.IsServerGC, "The frozen benchmark requires process-scoped server GC.");
            if (!OperatingSystem.IsWindows())
            {
                throw new PlatformNotSupportedException("This preparation is pinned to the Windows coordinator.");
            }
            using var process = Process.GetCurrentProcess();
            var priority = process.PriorityClass;
            var affinity = process.ProcessorAffinity;
            var threadPriority = Thread.CurrentThread.Priority;
            WriteNew(Path.Combine(spec.Output, "identity.json"), new
            {
                spec.Role, spec.Runtime, Pid = Environment.ProcessId, CreationUtc = process.StartTime.ToUniversalTime(),
                Framework = RuntimeInformation.FrameworkDescription, GCSettings.IsServerGC,
                ProcessPriority = priority.ToString(), Affinity = affinity.ToInt64(), ThreadPriority = threadPriority.ToString(),
                Assemblies = Images(),
                NativeRuntime = process.Modules.Cast<ProcessModule>()
                    .Where(module => module.ModuleName is "coreclr.dll" or "clrjit.dll" or "hostpolicy.dll")
                    .Select(module => new { module.ModuleName, Path = module.FileName, Sha256 = Hash(module.FileName) }).ToArray()
            });
            var config = ManualConfig.CreateEmpty();
            config.UnionRule = ConfigUnionRule.AlwaysUseGlobal;
            config.ArtifactsPath = Path.Combine(spec.Output, "bdn");
            config.AddLogger(ConsoleLogger.Default);
            config.AddColumnProvider(DefaultColumnProviders.Instance);
            config.AddDiagnoser(MemoryDiagnoser.Default);
            config.AddValidator(JitOptimizationsValidator.FailOnError);
            config.AddJob(Job.Default.WithToolchain(new SharedHostToolchain())
                .WithStrategy(RunStrategy.Throughput).WithLaunchCount(1).WithWarmupCount(3).WithIterationCount(7)
                .WithIterationTime(TimeInterval.FromMilliseconds(100)).WithUnrollFactor(1)
                .WithOutlierMode(OutlierMode.DontRemove).WithGcServer(true).DontEnforcePowerPlan());
            var converted = BenchmarkConverter.TypeToBenchmarks(typeof(GenerationBenchmarks), config);
            WriteNew(Path.Combine(spec.Output, "converted-cases.json"), converted.BenchmarksCases.Select(item => new
            {
                item.DisplayInfo, Toolchain = item.Job.Infrastructure.Toolchain.Name,
                Selected = item.Job.Infrastructure.Toolchain is SharedHostToolchain
            }).ToArray());
            var info = new BenchmarkRunInfo(converted.BenchmarksCases.Where(item => item.Job.Infrastructure.Toolchain is SharedHostToolchain).ToArray(),
                typeof(GenerationBenchmarks), converted.Config);
            Require(info.BenchmarksCases.Length == 3, "Exactly three unchanged benchmark cases are required.");
            Require(info.BenchmarksCases.Select(item => (int)item.Parameters.Items.Single().Value).Order().SequenceEqual([10, 100, 1000]), "Frozen parameters differ.");
            Require(info.BenchmarksCases.All(item => item.Descriptor.WorkloadMethod.Name == nameof(GenerationBenchmarks.GenerateDocument) &&
                item.Job.Infrastructure.Toolchain is SharedHostToolchain &&
                item.Config.GetDiagnosers().Any(diagnoser => diagnoser is MemoryDiagnoser)), "Attribute union changed the frozen method, toolchain or diagnoser.");
            if (args[0] == "inspect")
            {
                var helper = CharacterizeHelper(owner);
                var documents = await CharacterizeDocuments();
                WriteNew(Path.Combine(spec.Output, "inspection.json"), new { spec.Role, Helper = helper, Documents = documents, NoMeasurementExecuted = true });
            }
            else
            {
                RequireLease();
                var summary = BenchmarkRunner.Run(info);
                Require(!summary.HasCriticalValidationErrors && summary.Reports.Length == 3, "BenchmarkDotNet validation/report count failed.");
                var rows = summary.Reports.Select(report =>
                {
                    Require(report.BuildResult.IsGenerateSuccess && report.BuildResult.IsBuildSuccess && report.ResultStatistics is not null, "BenchmarkDotNet did not complete.");
                    var actual = report.AllMeasurements.Where(item => item.IterationMode == IterationMode.Workload &&
                        item.IterationStage == IterationStage.Result).ToArray();
                    var bytes = report.GcStats.BytesAllocatedPerOperation;
                    Require(actual.Length == 7 && actual.All(item => item.Operations > 0) && bytes >= 0, "Incomplete measurements or allocation diagnostics.");
                    return new
                    {
                        EndpointCount = (int)report.BenchmarkCase.Parameters.Items.Single().Value,
                        Nanoseconds = report.ResultStatistics!.Mean, Bytes = bytes,
                        Measurements = actual.Select(item => new { item.IterationIndex, item.Operations, item.Nanoseconds }).ToArray()
                    };
                }).ToArray();
                WriteNew(Path.Combine(spec.Output, "measurement.json"), new { spec.Role, Rows = rows });
            }
            process.Refresh();
            Require(process.PriorityClass == priority && process.ProcessorAffinity == affinity &&
                Thread.CurrentThread.Priority == threadPriority, "Observed process/thread settings changed.");
            WriteNew(Path.Combine(spec.Output, "completion.json"), new { spec.Role, Mode = args[0], Passed = true, Assemblies = Images() });
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);
            return 1;
        }
    }

    private static object[] CharacterizeHelper(Assembly owner)
    {
        var method = owner.GetType("ApiDescriptionExtensions", throwOnError: true)!
            .GetMethod("TryGetBodyParameter", BindingFlags.Public | BindingFlags.Static)
            ?? throw new MissingMethodException("Real body selector was not found.");
        var select = method.CreateDelegate<BodySelector>();
        (string Name, BindingSource[] Sources, int Selected)[] cases =
        [
            ("Empty", [], -1),
            ("QueryOnly", [BindingSource.Query], -1),
            ("BodyOnly", [BindingSource.Body], 0),
            ("BodyBetweenOtherSources", [BindingSource.Query, BindingSource.Body, BindingSource.Header], 1),
            ("TwoBodies", [BindingSource.Body, BindingSource.Body], -1),
            ("TwoBodiesWithOtherSources", [BindingSource.Query, BindingSource.Body, BindingSource.Form, BindingSource.Body, BindingSource.Header], -1),
            ("FormsAreNotBody", [BindingSource.Form, BindingSource.FormFile], -1)
        ];
        return cases.Select(row =>
        {
            var description = new ApiDescription();
            foreach (var source in row.Sources)
            {
                description.ParameterDescriptions.Add(new ApiParameterDescription { Source = source });
            }
            var found = select(description, out var result);
            Require(found == (row.Selected >= 0), "Body selector Boolean mismatch: " + row.Name);
            Require(row.Selected < 0 ? result is null : ReferenceEquals(result, description.ParameterDescriptions[row.Selected]), "Body selector object/null mismatch: " + row.Name);
            return (object)new { row.Name, Passed = true, Boundary = "Actual helper; manually constructed metadata, not binder support for multiple JSON bodies." };
        }).ToArray();
    }

    private static async Task<object[]> CharacterizeDocuments()
    {
        var results = new List<object>();
        foreach (var count in new[] { 10, 100, 1000 })
        {
            var benchmark = new GenerationBenchmarks { EndpointCount = count };
            benchmark.OperationTransformerAsDelegate_Setup();
            await benchmark.GenerateDocument();
            var flags = BindingFlags.Instance | BindingFlags.NonPublic;
            var type = typeof(GenerationBenchmarks);
            var service = type.GetField("_documentService", flags)!.GetValue(benchmark)!;
            var provider = type.GetField("_serviceProvider", flags)!.GetValue(benchmark)!;
            var method = service.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .Single(item => item.Name == "GetOpenApiDocumentAsync" && item.GetParameters() is { Length: > 0 } parameters &&
                    parameters[0].ParameterType == typeof(IServiceProvider) && parameters.Skip(1).All(parameter => parameter.IsOptional));
            var arguments = method.GetParameters().Select(parameter => parameter.Position == 0 ? provider : Type.Missing).ToArray();
            var task = (Task)method.Invoke(service, arguments)!;
            await task;
            var document = task.GetType().GetProperty("Result")!.GetValue(task)!;
            var paths = (IEnumerable)document.GetType().GetProperty("Paths")!.GetValue(document)!;
            var operations = 0;
            var pathCount = 0;
            foreach (var entry in paths)
            {
                pathCount++;
                var path = entry.GetType().GetProperty("Value")!.GetValue(entry)!;
                var items = (IEnumerable)path.GetType().GetProperty("Operations")!.GetValue(path)!;
                operations += items.Cast<object>().Count();
            }
            Require(operations == 3 * (count + 1) + 1, "Actual document operation count differs from frozen source-defined count.");
            results.Add(new { EndpointCount = count, Paths = pathCount, Operations = operations, ActualUnchangedBenchmarkMethodAlsoCompleted = true });
            (provider as IDisposable)?.Dispose();
        }
        return results.ToArray();
    }

    private static void RequireLease()
    {
        var path = Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_PATH");
        var token = Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_TOKEN");
        Require(path is not null && token is not null, "Actual coordinator lease is required.");
        using var lease = JsonDocument.Parse(File.ReadAllText(path!));
        Require(lease.RootElement.GetProperty("purpose").GetString() == "benchmark" &&
            lease.RootElement.GetProperty("findingId").GetString() == "F219" &&
            lease.RootElement.GetProperty("token").GetString() == token, "Actual lease identity differs.");
    }

    private static object[] Images() => AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0)
        .OrderBy(assembly => assembly.FullName, StringComparer.Ordinal)
        .Select(assembly => (object)new { assembly.FullName, Path = assembly.Location, Mvid = assembly.ManifestModule.ModuleVersionId, Sha256 = Hash(assembly.Location) }).ToArray();

    private static void Verify(ImagePin pin, Assembly assembly)
    {
        Require(Path.IsPathFullyQualified(pin.Path) && string.Equals(Path.GetFullPath(pin.Path), Path.GetFullPath(assembly.Location), StringComparison.OrdinalIgnoreCase) &&
            Hash(pin.Path) == pin.Sha256 && assembly.ManifestModule.ModuleVersionId == pin.Mvid, "Loaded external image pin differs: " + assembly.GetName().Name);
    }

    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    private static void WriteNew(string path, object value)
    {
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.Read);
        JsonSerializer.Serialize(stream, value, Json);
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed record ImagePin(string Path, string Sha256, Guid Mvid);
    private sealed record LaunchSpec(string Role, string Runtime, string Output, ImagePin Owner, ImagePin Fixture, ImagePin CoreLib);
}

internal sealed class SharedHostToolchain : IToolchain
{
    private static readonly IToolchain Stock = InProcessNoEmitToolchain.Instance;
    public string Name => "NoHostSettingChanges";
    public IGenerator Generator => Stock.Generator;
    public IBuilder Builder => Stock.Builder;
    public IExecutor Executor { get; } = new SharedHostExecutor();
    public bool IsInProcess => true;
    public bool IsSupported(BenchmarkCase benchmarkCase, ILogger logger, IResolver resolver) => Stock.IsSupported(benchmarkCase, logger, resolver);
}

internal sealed class SharedHostExecutor : IExecutor
{
    private static readonly Func<IHost, BenchmarkCase, int> Run = typeof(InProcessNoEmitToolchain).Assembly
        .GetType("BenchmarkDotNet.Toolchains.InProcess.NoEmit.InProcessNoEmitRunner", throwOnError: true)!
        .GetMethod("Run", BindingFlags.Public | BindingFlags.Static)!
        .CreateDelegate<Func<IHost, BenchmarkCase, int>>();

    public ExecuteResult Execute(ExecuteParameters parameters)
    {
        var host = new InProcessHost(parameters.BenchmarkCase, parameters.Logger, parameters.Diagnoser);
        var exit = Run(host, parameters.BenchmarkCase);
        var lines = host.RunResults.GetMeasurements().Select(item => item.ToString()).ToList();
        if (!host.RunResults.GCStats.Equals(GcStats.Empty))
        {
            lines.Add(host.RunResults.GCStats.ToOutputLine());
        }
        if (!host.RunResults.ThreadingStats.Equals(ThreadingStats.Empty))
        {
            lines.Add(host.RunResults.ThreadingStats.ToOutputLine());
        }
        return new ExecuteResult(true, exit, default, lines.ToArray(), []);
    }
}
