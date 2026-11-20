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
using BenchmarkDotNet.Environments;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Loggers;
using BenchmarkDotNet.Running;
using BenchmarkDotNet.Toolchains;
using BenchmarkDotNet.Toolchains.InProcess;
using BenchmarkDotNet.Toolchains.InProcess.NoEmit;
using BenchmarkDotNet.Toolchains.Parameters;
using BenchmarkDotNet.Toolchains.Results;
using BenchmarkDotNet.Validators;
using Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks;
using Perfolizer.Mathematics.OutlierDetection;

internal static class Program
{
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };

    private static async Task<int> Main(string[] args)
    {
        try
        {
            Require(args.Length == 2 && args[0] is "inspect" or "run" && Path.IsPathFullyQualified(args[1]),
                "Expected inspect/run and one absolute launch-spec path.");
            var spec = JsonSerializer.Deserialize<LaunchSpec>(File.ReadAllText(args[1]), Json)
                ?? throw new InvalidDataException("Null launch specification.");
            Require(Path.IsPathFullyQualified(spec.Output) && !Directory.Exists(spec.Output), "Output must be a fresh absolute directory.");
            Directory.CreateDirectory(spec.Output);
            var owner = Assembly.Load("Microsoft.AspNetCore.Server.Kestrel.Core");
            Verify(spec.Owner, owner);
            Verify(spec.Fixture, typeof(TransportConnectionManagerBenchmark).Assembly);
            Verify(spec.CoreLib, typeof(object).Assembly);
            Require(new DirectoryInfo(Path.GetDirectoryName(typeof(object).Assembly.Location)!).Name == spec.Runtime, "Loaded runtime differs.");
            Require(Hash(typeof(BenchmarkRunner).Assembly.Location) == "4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437",
                "Pinned BenchmarkDotNet bytes differ.");
            Require(GCSettings.IsServerGC && Environment.GetEnvironmentVariable("DOTNET_TieredCompilation") == "0" &&
                Environment.GetEnvironmentVariable("COMPlus_TieredCompilation") == "0", "Frozen process GC/tiering preconditions differ.");
            if (!OperatingSystem.IsWindows())
            {
                throw new PlatformNotSupportedException("The private benchmark is pinned to the Windows coordinator.");
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
            var toolchain = new SharedHostToolchain();
            var config = ManualConfig.CreateEmpty();
            config.UnionRule = ConfigUnionRule.AlwaysUseGlobal;
            config.ArtifactsPath = Path.Combine(spec.Output, "bdn");
            config.AddLogger(ConsoleLogger.Default);
            config.AddExporter(DefaultConfig.Instance.GetExporters().ToArray());
            config.AddColumnProvider(DefaultColumnProviders.Instance);
            config.AddDiagnoser(MemoryDiagnoser.Default);
            config.AddValidator(DefaultConfig.Instance.GetValidators().ToArray());
            config.AddJob(Job.Default.WithToolchain(toolchain).WithStrategy(RunStrategy.Throughput)
                .WithLaunchCount(1).WithWarmupCount(31).WithIterationCount(501).WithInvocationCount(1).WithUnrollFactor(1)
                .WithOutlierMode(OutlierMode.DontRemove).WithGcServer(true).WithGcForce(false).DontEnforcePowerPlan());
            var exactConfig = config.CreateImmutableConfig();
            var converted = BenchmarkConverter.TypeToBenchmarks(typeof(TransportConnectionManagerBenchmark), config);
            WriteNew(Path.Combine(spec.Output, "converted-cases.json"), converted.BenchmarksCases.Select(item => new
            {
                item.DisplayInfo, Toolchain = item.Job.Infrastructure.Toolchain.Name,
                Selected = ReferenceEquals(item.Job.Infrastructure.Toolchain, toolchain)
            }).ToArray());
            var cases = converted.BenchmarksCases.Where(item => ReferenceEquals(item.Job.Infrastructure.Toolchain, toolchain))
                .Select(item => BenchmarkCase.Create(item.Descriptor, item.Job, item.Parameters, exactConfig)).ToArray();
            Require(cases.Length == 4 && cases.Select(item => (int)item.Parameters.Items.Single().Value).Order()
                .SequenceEqual([0, 1, 16, 256]), "The four frozen connection-count cases differ.");
            Require(cases.All(item => item.Descriptor.WorkloadMethod.Name == nameof(TransportConnectionManagerBenchmark.GracefulDrain) &&
                item.Job.Run.InvocationCount == 1 && item.Job.Run.UnrollFactor == 1 &&
                item.Config.GetDiagnosers().Any(diagnoser => diagnoser is MemoryDiagnoser)),
                "Workload, per-setup invocation count, unroll factor or allocation diagnoser differs.");
            var validation = exactConfig.GetValidators().SelectMany(validator =>
                validator.Validate(new ValidationParameters(cases, exactConfig))).ToArray();
            WriteNew(Path.Combine(spec.Output, "config-validation.json"),
                validation.Select(error => new { error.IsCritical, error.Message }).ToArray());
            Require(validation.Length == 0, "Actual complete frozen configuration validation did not pass cleanly.");
            Require(cases.All(item => toolchain.IsSupported(item, ConsoleLogger.Default, InfrastructureResolver.Instance)),
                "Actual custom toolchain admission rejected at least one frozen case.");
            WriteNew(Path.Combine(spec.Output, "admitted-cases.json"), cases.Select(item => new
            {
                item.DisplayInfo, ActualCustomToolchainSupported = true,
                item.Job.Run.InvocationCount, item.Job.Run.UnrollFactor
            }).ToArray());
            if (args[0] == "inspect")
            {
                var sample = cases[0];
                var gcMismatch = BenchmarkCase.Create(sample.Descriptor, sample.Job.WithGcServer(false), sample.Parameters, exactConfig);
                var invalidInvocations = BenchmarkCase.Create(sample.Descriptor, sample.Job.WithInvocationCount(2), sample.Parameters, exactConfig);
                var wrongToolchain = BenchmarkCase.Create(sample.Descriptor,
                    sample.Job.WithToolchain(InProcessNoEmitToolchain.Instance), sample.Parameters, exactConfig);
                Require(!toolchain.IsSupported(gcMismatch, ConsoleLogger.Default, InfrastructureResolver.Instance), "Mismatched server GC was accepted.");
                Require(!toolchain.IsSupported(invalidInvocations, ConsoleLogger.Default, InfrastructureResolver.Instance), "Two invocations reused one connection setup.");
                Require(!toolchain.IsSupported(wrongToolchain, ConsoleLogger.Default, InfrastructureResolver.Instance), "A stock executor was accepted.");
                var inspect = typeof(TransportConnectionManagerBenchmark).GetMethod("InspectCompletedDrain", BindingFlags.Instance | BindingFlags.NonPublic)
                    ?? throw new MissingMethodException("Actual fixture completion inspection was not found.");
                var results = new List<object>();
                foreach (var count in new[] { 0, 1, 16, 256 })
                {
                    var fixture = new TransportConnectionManagerBenchmark { ConnectionCount = count };
                    fixture.SetupService();
                    fixture.PrepareConnections();
                    Require(await fixture.GracefulDrain().WaitAsync(TimeSpan.FromSeconds(30)), "Actual graceful drain failed.");
                    results.Add(inspect.Invoke(fixture, null) ?? throw new InvalidOperationException("Null fixture inspection."));
                }
                Require(SharedHostExecutor.ExecuteCalls == 0, "Admission unexpectedly entered a benchmark executor.");
                WriteNew(Path.Combine(spec.Output, "inspection.json"), new
                {
                    spec.Role, Cases = results, ActualAllFourCustomIsSupportedCallsPassed = true,
                    NegativeControls = new[] { "WrongGcRejected", "MultipleInvocationsRejected", "StockExecutorRejected" },
                    ActualCompleteConfigValidationClean = true, ActualNoEngineOrCounters = true, SharedHostExecutor.ExecuteCalls
                });
            }
            else
            {
                RequireLease();
                var summary = BenchmarkRunner.Run(new BenchmarkRunInfo(cases, typeof(TransportConnectionManagerBenchmark), exactConfig));
                Require(!summary.HasCriticalValidationErrors && summary.Reports.Length == 4, "BenchmarkDotNet validation/report count failed.");
                var rows = summary.Reports.Select(report =>
                {
                    Require(report.BuildResult.IsGenerateSuccess && report.BuildResult.IsBuildSuccess && report.ResultStatistics is not null,
                        "BenchmarkDotNet did not complete.");
                    var actual = report.AllMeasurements.Where(item => item.IterationMode == IterationMode.Workload &&
                        item.IterationStage == IterationStage.Result).ToArray();
                    var bytes = report.GcStats.BytesAllocatedPerOperation;
                    Require(actual.Length == 501 && actual.All(item => item.Operations == 1) &&
                        bytes >= 0 && report.ResultStatistics!.Mean > 0, "Incomplete measurements, invocation counts or allocation diagnostics.");
                    return new
                    {
                        ConnectionCount = (int)report.BenchmarkCase.Parameters.Items.Single().Value,
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

    internal static void RequireLease()
    {
        var path = Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_PATH");
        var token = Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_TOKEN");
        Require(path is not null && token is not null, "Actual coordinator benchmark lease is required.");
        using var lease = JsonDocument.Parse(File.ReadAllText(path!));
        Require(lease.RootElement.GetProperty("purpose").GetString() == "benchmark" &&
            lease.RootElement.GetProperty("findingId").GetString() == "F198" &&
            lease.RootElement.GetProperty("token").GetString() == token, "Actual lease identity differs.");
    }

    private static object[] Images() => AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0)
        .OrderBy(assembly => assembly.FullName, StringComparer.Ordinal)
        .Select(assembly => (object)new { assembly.FullName, Path = assembly.Location, Mvid = assembly.ManifestModule.ModuleVersionId, Sha256 = Hash(assembly.Location) }).ToArray();

    private static void Verify(ImagePin pin, Assembly assembly) =>
        Require(Path.IsPathFullyQualified(pin.Path) && string.Equals(Path.GetFullPath(pin.Path), Path.GetFullPath(assembly.Location), StringComparison.OrdinalIgnoreCase) &&
            Hash(pin.Path) == pin.Sha256 && assembly.ManifestModule.ModuleVersionId == pin.Mvid, "Loaded image pin differs: " + assembly.GetName().Name);

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
    public string Name => "F198NoHostSettingChanges";
    public IGenerator Generator => Stock.Generator;
    public IBuilder Builder => Stock.Builder;
    public IExecutor Executor { get; } = new SharedHostExecutor();
    public bool IsInProcess => true;

    public bool IsSupported(BenchmarkCase benchmarkCase, ILogger logger, IResolver resolver)
    {
        if (!ReferenceEquals(benchmarkCase.Job.Infrastructure.Toolchain, this) ||
            benchmarkCase.Descriptor.Type != typeof(TransportConnectionManagerBenchmark) ||
            benchmarkCase.Descriptor.WorkloadMethod.Name != nameof(TransportConnectionManagerBenchmark.GracefulDrain) ||
            benchmarkCase.HasArguments || !string.IsNullOrEmpty(benchmarkCase.Descriptor.AdditionalLogic) ||
            benchmarkCase.Job.Run.InvocationCount != 1 || benchmarkCase.Job.Run.UnrollFactor != 1)
        {
            logger.WriteLineError("// Private toolchain, supported descriptor or one-invocation producer contract differs.");
            return false;
        }

        // Validate the identical job's runtime/environment through the stock concrete tag.
        // Actual execution remains our separate executor, never the stock priority-changing executor.
        var stockJob = benchmarkCase.Job.WithToolchain(Stock);
        var stockConfig = ManualConfig.CreateEmpty().AddJob(stockJob).CreateImmutableConfig();
        var stockCase = BenchmarkCase.Create(benchmarkCase.Descriptor, stockJob, benchmarkCase.Parameters, stockConfig);
        if (!Stock.IsSupported(stockCase, logger, resolver))
        {
            return false;
        }
        var errors = InProcessValidator.FailOnError.Validate(new ValidationParameters([stockCase], stockConfig)).ToArray();
        foreach (var error in errors)
        {
            logger.WriteLineError(error.Message);
        }

        return errors.Length == 0;
    }
}

internal sealed class SharedHostExecutor : IExecutor
{
    private static readonly Func<IHost, BenchmarkCase, int> Run = typeof(InProcessNoEmitToolchain).Assembly
        .GetType("BenchmarkDotNet.Toolchains.InProcess.NoEmit.InProcessNoEmitRunner", throwOnError: true)!
        .GetMethod("Run", BindingFlags.Public | BindingFlags.Static)!
        .CreateDelegate<Func<IHost, BenchmarkCase, int>>();
    internal static int ExecuteCalls { get; private set; }

    public SharedHostExecutor() => _ = Run;

    public ExecuteResult Execute(ExecuteParameters parameters)
    {
        Program.RequireLease();
        ExecuteCalls++;
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
