using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf.F142;

if (args.Length is not (5 or 6) || args[0] is not ("verify" or "measure"))
{
    throw new ArgumentException("Expected mode, role, immutable inventory, canonical document directory, fresh output directory and optional measured profile.");
}
var measure = args[0] == "measure";
var role = args[1];
var inventory = JsonSerializer.Deserialize<Inventory>(File.ReadAllText(args[2]))
    ?? throw new InvalidOperationException("Missing inventory.");
var output = Path.GetFullPath(args[4]);
if (Directory.Exists(output))
{
    throw new InvalidOperationException("Never overwrite an earlier observation.");
}
Directory.CreateDirectory(output);
foreach (var entry in inventory.Files)
{
    var file = Path.Combine(AppContext.BaseDirectory, entry.File);
    Require(new FileInfo(file).Length == entry.Bytes, "Consumer length mismatch: " + entry.File);
    Require(Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file))) == entry.Sha256, "Consumer hash mismatch: " + entry.File);
}
Require(Path.GetFileName(Path.GetDirectoryName(typeof(object).Assembly.Location)) == inventory.PlatformVersion, "Unexpected actual runtime.");
var profiles = new[] { "Undocumented", "Zero", "One", "Four", "Aliased", "Ignored", "Body" };
if (measure)
{
    Require(args.Length == 6 && profiles.Contains(args[5], StringComparer.Ordinal), "A fixed measured profile is required.");
    var leasePath = Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_PATH")
        ?? throw new InvalidOperationException("A coordinator gateway lease is required.");
    using var lease = JsonDocument.Parse(File.ReadAllText(leasePath));
    Require(lease.RootElement.GetProperty("findingId").GetString() == "F142"
        && lease.RootElement.GetProperty("purpose").GetString() == "benchmark"
        && lease.RootElement.GetProperty("token").GetString() == Environment.GetEnvironmentVariable("AUTOPERF_BENCHMARK_LEASE_TOKEN"),
        "The actual coordinator lease does not authorize this measurement.");
    profiles = [args[5]];
}
else
{
    Require(args.Length == 5, "Verification never accepts a measured profile.");
}
using var deadline = new CancellationTokenSource(TimeSpan.FromMinutes(3));
foreach (var profile in profiles)
{
    await using var fixture = await DocumentFixture.CreateAsync(profile, deadline.Token);
    var workload = await OperationWorkload.CaptureAsync(fixture).WaitAsync(deadline.Token);
    Require(workload.FullDocumentJson == File.ReadAllText(Path.Combine(args[3], profile + ".json")),
        "The captured real producer's full document differs from the accepted canonical document: " + profile);
    Require(workload.ProducerMethod == profile, "The captured context did not come from the expected actual endpoint.");
    var expected = workload.Observe();
    var first = workload.InvokeAsync();
    Require(first.IsCompletedSuccessfully, "The actual generated transform must complete synchronously for thread-local allocation measurement.");
    await first;
    Require(workload.Observe() == expected, "The actual generated transformer changed accepted operation data.");
    var samples = new List<Sample>();
    if (measure)
    {
        for (var warmup = 0; warmup < 20000; warmup++)
        {
            var task = workload.InvokeAsync();
            Require(task.IsCompletedSuccessfully, "Unexpected asynchronous transform.");
            await task;
        }
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        const int iterations = 50000;
        for (var sample = 0; sample < 15; sample++)
        {
            var thread = Environment.CurrentManagedThreadId;
            var bytes = GC.GetAllocatedBytesForCurrentThread();
            var ticks = Stopwatch.GetTimestamp();
            for (var iteration = 0; iteration < iterations; iteration++)
            {
                var task = workload.InvokeAsync();
                Require(task.IsCompletedSuccessfully, "Unexpected asynchronous transform.");
                await task;
            }
            var elapsed = Stopwatch.GetTimestamp() - ticks;
            var allocated = GC.GetAllocatedBytesForCurrentThread() - bytes;
            Require(thread == Environment.CurrentManagedThreadId, "A thread change invalidates this allocation sample.");
            samples.Add(new Sample(sample, iterations, elapsed * (1_000_000_000d / Stopwatch.Frequency) / iterations, (double)allocated / iterations));
        }
        Require(workload.Observe() == expected, "Repeated actual generated transforms changed operation data.");
    }
    var result = new
    {
        role,
        profile,
        passed = true,
        measured = measure,
        actualProducer = "Operation and context captured from the awaited actual registered document provider; the actual source-generated file-scoped operation transformer is invoked.",
        boundary = "Warm isolated generated operation transformer, not whole document generation or application throughput.",
        actualTransformer = workload.GeneratedType,
        actualProducerMethod = workload.ProducerMethod,
        actualGeneratedOwnerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(DocumentFixture).Assembly.Location))),
        actualPlatform = inventory.PlatformVersion,
        expectedOperation = expected,
        samples
    };
    var json = JsonSerializer.Serialize(result);
    File.WriteAllText(Path.Combine(output, profile + ".json"), json);
    Console.WriteLine(json);
}

static void Require(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

internal sealed record Inventory(string PlatformVersion, InventoryFile[] Files);
internal sealed record InventoryFile(string File, long Bytes, string Sha256);
internal sealed record Sample(int Index, int Iterations, double NanosecondsPerOperation, double BytesPerOperation);
