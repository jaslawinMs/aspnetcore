using System.Diagnostics;
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
        Evidence.Require(args.Length == 2 && args[0] is "--characterize" or "--benchmark", "Explicit mode/new evidence directory required.");
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
            beforeAfterSourceComparisons = 0,
            noOptimizationOrLiveQuicBenefitClaimed = true,
            settings = SettingsPreservingEmitToolchain.ReadSettings()
        });
        if (args[0] == "--characterize")
        {
            foreach (var count in new[] { 0, 1, 16 })
            {
                await using var fixture = await ProtocolFixture.CreateAsync(count);
                var before = fixture.Snapshot();
                await fixture.EndConnectInputAsync();
                await fixture.AssertClosedAsync();
                Evidence.Write("protocol-eof", new { streams = count, before, after = fixture.Snapshot() });
            }
            await using (var fixture = await ProtocolFixture.CreateAsync(1))
            {
                var stream = fixture.Streams.Single();
                var before = fixture.Snapshot();
                var disposal = stream.DisposeAsync();
                var completedSynchronously = disposal.IsCompletedSuccessfully;
                await disposal.AsTask().WaitAsync(Evidence.Timeout);
                Evidence.Write("actual-input-leaf-disposal", new { before, completedSynchronously, after = fixture.Snapshot() });
                fixture.Close();
                await fixture.AssertClosedAsync();
            }
            await using (var fixture = await ProtocolFixture.CreateAsync(0))
            {
                await fixture.OpenOutputAsync();
                var disposal = fixture.Streams.Single().DisposeAsync();
                var completedSynchronously = disposal.IsCompletedSuccessfully;
                await disposal.AsTask().WaitAsync(Evidence.Timeout);
                Evidence.Write("actual-output-leaf-disposal", new { completedSynchronously, after = fixture.Snapshot() });
                fixture.Close();
                await fixture.AssertClosedAsync();
            }
            await using (var fixture = await ProtocolFixture.CreateAsync(1))
            {
                fixture.Abort();
                await fixture.AssertClosedAsync();
                Evidence.Write("public-abort-control", fixture.Snapshot());
            }
            Console.WriteLine("F001 actual HTTP/3 handshake/associated-input producer EOF0/1/16,actual input/output leaf disposal and public abort controls passed;not live QUIC.");

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
        var summary = BenchmarkRunner.Run<SessionCloseBenchmark>(config);
        Evidence.Require(summary.Reports.Count() == 3 && summary.Reports.All(report => report.ExecuteResults.Count > 0 &&
            report.ExecuteResults.All(execution => execution.ExitCode == 0) && report.ResultStatistics is not null), "All3 original-only diagnostic outcomes required.");
        Evidence.Write("original-only-completed", new { outcomes = 3, sourceComparisons = 0, optimizationGainEstablished = false });
    }
}

[MemoryDiagnoser]
[Orderer(SummaryOrderPolicy.Declared)]
public class SessionCloseBenchmark
{
    private ProtocolFixture _fixture = null!;

    [Params(0, 1, 16)]
    public int Streams { get; set; }

    [IterationSetup]
    public void Setup()
    {
        _fixture = ProtocolFixture.CreateAsync(Streams).GetAwaiter().GetResult();
        Evidence.Write("prepared-close", new { Streams, snapshot = _fixture.Snapshot(), identities = Evidence.Identities() });
    }

    [Benchmark]
    public void CloseSession()
    {
        _fixture.Close();
    }

    [IterationCleanup]
    public void Cleanup()
    {
        _fixture.AssertClosedAsync().GetAwaiter().GetResult();
        Evidence.Write("closed-before-cleanup", new { Streams, snapshot = _fixture.Snapshot() });
        _fixture.Close();
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

    internal static object[] Identities() => new[]
    {
        typeof(Program).Assembly, typeof(BenchmarkAttribute).Assembly,
        typeof(Microsoft.AspNetCore.Http.Features.IWebTransportSession).Assembly,
        Assembly.Load("Microsoft.AspNetCore.Server.Kestrel.Core"), Assembly.Load("InMemory.FunctionalTests"),
        typeof(System.IO.Pipelines.Pipe).Assembly, typeof(object).Assembly
    }.Select(assembly => new
    {
        name = assembly.GetName().Name,
        path = assembly.Location,
        sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    }).Cast<object>().ToArray();
}
