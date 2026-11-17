using System.Diagnostics;
using System.Net.Quic;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Exporters.Json;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Order;
using BenchmarkDotNet.Running;
using Perfolizer.Horology;

namespace AutoPerf;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        Evidence.Require(args.Length == 2 && args[0] is "--characterize" or "--benchmark" or "--native-quic",
            "Explicit mode/new evidence directory required.");
        Evidence.Initialize(args[1]);
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var file = Path.Combine(AppContext.BaseDirectory, name.Name + ".dll");

            return File.Exists(file) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(file) : null;
        };
        Evidence.Write("process", new
        {
            mode = args[0],
            pid = Environment.ProcessId,
            runtime = RuntimeInformation.FrameworkDescription,
            corelib = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            processors = Environment.ProcessorCount,
            originalOnly = true,
            sourceComparisons = 0,
            settings = SettingsPreservingEmitToolchain.ReadSettings()
        });
        if (args[0] == "--native-quic")
        {
            if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 20348) || !QuicConnection.IsSupported || !QuicListener.IsSupported)
            {
                Evidence.Write("native-producer-blocked", new
                {
                    caseName = "NativeQuicProbe.ActualQuicFinRemovesAssociatedStreamAsync",
                    reason = "This pinned runtime/OS does not advertise required QUIC support;no native assertion reached.",
                    outcome = "blocked-not-passed"
                });
                Environment.ExitCode = 2;

                return;
            }
            await NativeQuicProbe.ActualQuicFinRemovesAssociatedStreamAsync();

            return;
        }
        if (args[0] == "--characterize")
        {
            foreach (var scenario in Enum.GetValues<RemovalScenario>())
            {
                await using var fixture = await ProtocolFixture.PrepareRemovalAsync(scenario);
                var target = scenario == RemovalScenario.Missing ? long.MaxValue : ProtocolFixture.StreamId(fixture.Streams[0]);
                var before = fixture.Snapshot();
                var actual = fixture.Remove(target);
                var expected = scenario != RemovalScenario.Missing;
                Evidence.Require(actual == expected, "Exact removal Boolean differs.");
                fixture.AssertRemoval(target, fixture.Streams.Count, expected);
                var after = fixture.Snapshot();
                Evidence.Require(!fixture.Remove(target), "Second removal must report false.");
                Evidence.Require(Evidence.Compact(after) == Evidence.Compact(fixture.Snapshot()), "Second removal must not alter owner state.");
                await fixture.EndConnectInputAsync();
                await fixture.AssertClosedAsync();
                Evidence.Write("component-removal", new
                {
                    scenario = scenario.ToString(),
                    target,
                    actual,
                    before,
                    after,
                    afterRealConnectEof = fixture.Snapshot(),
                    actualTransportCancellationCallbackExercised = false
                });
            }
            await using (var fixture = await ProtocolFixture.CreateAsync(1))
            {
                fixture.Abort();
                await fixture.AssertClosedAsync();
                Evidence.Write("public-abort-control", fixture.Snapshot());
            }
            Console.WriteLine("F0024 real HTTP/3 prepared component-removal cases/repeated misses/real CONNECT EOF and public Abort controls passed;direct removal is not callback reachability proof.");

            return;
        }

        var job = Job.Default.WithId("original-diagnostic-only")
            .WithToolchain(new SettingsPreservingEmitToolchain())
            .WithPowerPlan(Guid.Empty).WithLaunchCount(1)
            .WithStrategy(RunStrategy.Monitoring).WithInvocationCount(1).WithUnrollFactor(1)
            .WithWarmupCount(3).WithIterationCount(8).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithOutlierMode(Perfolizer.Mathematics.OutlierDetection.OutlierMode.DontRemove);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job)
            .AddExporter(JsonExporter.FullCompressed)
            .WithArtifactsPath(Path.Combine(Evidence.DirectoryPath, "artifacts"));
        var summary = BenchmarkRunner.Run<StreamRemovalBenchmark>(config);
        Evidence.Require(summary.Reports.Count() == 4 && summary.Reports.All(report => report.ExecuteResults.Count > 0 &&
            report.ExecuteResults.All(execution => execution.ExitCode == 0) && report.ResultStatistics is not null),
            "All4 original-only diagnostic outcomes required.");
        Evidence.Write("original-only-completed", new { outcomes = 4, sourceComparisons = 0, optimizationGainEstablished = false });
    }
}

public enum RemovalScenario
{
    Missing,
    InputOne,
    InputSixteen,
    OutputOne
}

[MemoryDiagnoser]
[Orderer(SummaryOrderPolicy.Declared)]
public class StreamRemovalBenchmark
{
    private ProtocolFixture _fixture = null!;
    private long _target;
    private bool _lastResult;

    [ParamsAllValues]
    public RemovalScenario Scenario { get; set; }

    [IterationSetup]
    public void Setup()
    {
        _fixture = ProtocolFixture.PrepareRemovalAsync(Scenario).GetAwaiter().GetResult();
        _target = Scenario == RemovalScenario.Missing ? long.MaxValue : ProtocolFixture.StreamId(_fixture.Streams[0]);
        _lastResult = false;
        Evidence.Write("prepared-removal", new { scenario = Scenario.ToString(), target = _target, snapshot = _fixture.Snapshot(), identities = Evidence.Identities() });
    }

    [Benchmark]
    public bool TryRemoveStream()
    {
        var result = _fixture.Remove(_target);
        _lastResult = result;

        return result;
    }

    [IterationCleanup]
    public void Cleanup()
    {
        Evidence.Require(_lastResult == (Scenario != RemovalScenario.Missing), "Measured removal Boolean differs.");
        _fixture.AssertRemoval(_target, _fixture.Streams.Count, _lastResult);
        var after = _fixture.Snapshot();
        Evidence.Require(!_fixture.Remove(_target), "Measured repeat must be false.");
        Evidence.Require(Evidence.Compact(after) == Evidence.Compact(_fixture.Snapshot()), "Measured repeat altered owner state.");
        Evidence.Write("removed-before-cleanup", new { scenario = Scenario.ToString(), target = _target, actual = _lastResult, snapshot = after });
        _fixture.DisposeAsync().AsTask().GetAwaiter().GetResult();
    }
}

internal static class Evidence
{
    private static int _sequence;
    internal static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
    internal static string DirectoryPath { get; private set; } = "";
    internal static object InitialSettings { get; private set; } = new { };

    internal static void Initialize(string directory)
    {
        DirectoryPath = Path.GetFullPath(directory);
        Require(!Directory.Exists(DirectoryPath), "Never overwrite original diagnostic evidence.");
        Directory.CreateDirectory(DirectoryPath);
        InitialSettings = SettingsPreservingEmitToolchain.ReadSettings();
    }

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    internal static string Compact(object value) => JsonSerializer.Serialize(value);

    internal static void Write(string kind, object value)
    {
        var record = new { kind, sequence = Interlocked.Increment(ref _sequence), pid = Environment.ProcessId, value };
        var file = Path.Combine(DirectoryPath, $"{record.sequence:D5}-{kind}.json");
        File.WriteAllText(file, JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true }));
    }

    internal static object AssemblyIdentity(Assembly assembly) => new
    {
        name = assembly.GetName().Name,
        path = assembly.Location,
        sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    };

    internal static object[] Identities() => new[]
    {
        typeof(Program).Assembly, typeof(BenchmarkAttribute).Assembly,
        typeof(Microsoft.AspNetCore.Http.Features.IWebTransportSession).Assembly,
        Assembly.Load("Microsoft.AspNetCore.Server.Kestrel.Core"), Assembly.Load("InMemory.FunctionalTests"),
        typeof(System.IO.Pipelines.Pipe).Assembly, typeof(object).Assembly
    }.Select(AssemblyIdentity).ToArray();
}
