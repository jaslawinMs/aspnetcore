using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Hosting;

if (args is not [var expectedOwnerHash, var output])
{
    throw new ArgumentException("Provide the verified SPA owner SHA256 and output path.");
}
var ownerPath = Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.SpaServices.Extensions.dll");
var ownerHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(ownerPath)));
if (ownerHash != expectedOwnerHash)
{
    throw new InvalidOperationException("The exact verified original/proposed SPA owner is required.");
}
var harness = Assembly.LoadFrom(Path.Combine(AppContext.BaseDirectory, "AutoPerf.Benchmarks.dll"));
var serverType = harness.GetType("AutoPerf.LoopbackServer", throwOnError: true)!;
var workloadType = harness.GetType("AutoPerf.ProxyWorkload", throwOnError: true)!;
var server = Activator.CreateInstance(serverType)!;
using var serverLifetime = (IDisposable)server;
var uri = (Uri)serverType.GetProperty("Uri")!.GetValue(server)!;
var results = new List<object>();
foreach (var recipe in new[] { "Http200", "Http404", "EmptyHttp", "FaultedUri", "FactoryThrows", "Http200UncancelableRequest" })
{
    foreach (var count in new[] { 1, 32, 1024 })
    {
        var workload = Activator.CreateInstance(workloadType, uri, recipe)!;
        using var workloadLifetime = (IDisposable)workload;
        var hostLifetime = (IHostApplicationLifetime)workloadType.GetProperty("Lifetime")!.GetValue(workload)!;
        var sources = new List<WeakReference<CancellationTokenSource>>(count);
        workloadType.GetMethod("RunCompletedBatch")!.Invoke(workload, [count, sources]);
        var checkpoints = new List<object>();
        var clock = Stopwatch.StartNew();
        int alive = 0;
        for (var attempt = 0; attempt < 8; attempt++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            alive = Probe.CountAlive(sources);
            checkpoints.Add(new { attempt, alive, elapsed_ms = clock.Elapsed.TotalMilliseconds });
            await Task.Yield();
        }
        if (hostLifetime.ApplicationStopping.IsCancellationRequested)
        {
            throw new InvalidOperationException("The parent must remain live through every GC checkpoint.");
        }
        var result = new
        {
            recipe, completed_requests = count, owner_sha256 = ownerHash,
            sources_tracked = sources.Count, checkpoints, final_alive_before_any_host_stop = alive,
            real_host_parent_not_canceled_during_observation = true,
            actual_existing_frozen_public_workload_invoked = true,
            observer_reflection_targets_private_harness_only_not_framework_internals = true
        };
        results.Add(result);
        Console.WriteLine("AUTOPERF_QUIESCENCE " + JsonSerializer.Serialize(result));
        GC.KeepAlive(workload);
    }
}
File.WriteAllText(output, JsonSerializer.Serialize(results));

internal static class Probe
{
    [MethodImpl(MethodImplOptions.NoInlining)]
    public static int CountAlive(List<WeakReference<CancellationTokenSource>> sources)
    {
        return sources.Count(source => source.TryGetTarget(out _));
    }
}
