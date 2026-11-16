using System.Text.Json;
using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class RequestServicesBenchmark
{
    private RequestServicesLifecycle _lifecycle = default!;

    public static DisposalProfile[] Profiles { get; } =
    [
        new("EmptyScope", ResourceKind.Empty, 0),
        new("Sync1", ResourceKind.Sync, 1),
        new("Sync16", ResourceKind.Sync, 16),
        new("AsyncCompleted1", ResourceKind.Async, 1),
        new("AsyncCompleted16", ResourceKind.Async, 16),
        new("DualCompleted1", ResourceKind.Dual, 1),
        new("SourceCompleted1", ResourceKind.Source, 1)
    ];

    [ParamsSource(nameof(Profiles))]
    public DisposalProfile Profile { get; set; } = Profiles[0];

    [GlobalSetup(Target = nameof(PreparedSync))]
    public void SetupSync() => Setup(nameof(PreparedSync));

    [GlobalSetup(Target = nameof(PreparedAsync))]
    public void SetupAsync() => Setup(nameof(PreparedAsync));

    [GlobalSetup(Target = nameof(PublicExplicitSync))]
    public void SetupPublicSync() => Setup(nameof(PublicExplicitSync));

    [GlobalSetup(Target = nameof(PublicRegisteredAsync))]
    public void SetupPublicAsync() => Setup(nameof(PublicRegisteredAsync));

    private void Setup(string method)
    {
        _lifecycle = new RequestServicesLifecycle(Profile);
        var state = method switch
        {
            nameof(PreparedSync) => _lifecycle.RunPrepared(synchronous: true),
            nameof(PreparedAsync) => _lifecycle.RunPrepared(synchronous: false),
            nameof(PublicExplicitSync) => _lifecycle.RunPublicAsync(explicitSync: true).GetAwaiter().GetResult(),
            nameof(PublicRegisteredAsync) => _lifecycle.RunPublicAsync(explicitSync: false).GetAwaiter().GetResult(),
            _ => throw new InvalidOperationException("Unknown real disposal case.")
        };
        var directory = Environment.GetEnvironmentVariable("AUTOPERF_STATES") ??
            throw new InvalidOperationException("Actual setup evidence directory not supplied.");
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, $"{method}-{Profile.Name}.json"),
            JsonSerializer.Serialize(_lifecycle.Receipt(state, method), new JsonSerializerOptions { WriteIndented = true }));
    }

    [Benchmark]
    public int PreparedSync() => _lifecycle.RunPrepared(synchronous: true).CompletedCalls;

    [Benchmark]
    public int PreparedAsync() => _lifecycle.RunPrepared(synchronous: false).CompletedCalls;

    [Benchmark]
    public async Task<int> PublicExplicitSync() => (await _lifecycle.RunPublicAsync(explicitSync: true)).CompletedCalls;

    [Benchmark]
    public async Task<int> PublicRegisteredAsync() => (await _lifecycle.RunPublicAsync(explicitSync: false)).CompletedCalls;

    [GlobalCleanup]
    public void Cleanup() => _lifecycle.Dispose();

    public static void VerifyCases()
    {
        foreach (var profile in Profiles)
        {
            foreach (var method in new[] { nameof(PreparedSync), nameof(PreparedAsync), nameof(PublicExplicitSync), nameof(PublicRegisteredAsync) })
            {
                var benchmark = new RequestServicesBenchmark { Profile = profile };
                benchmark.Setup(method);
                benchmark.Cleanup();
            }
        }
    }
}
