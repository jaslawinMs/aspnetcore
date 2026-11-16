using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;

var artifactIndex = Array.IndexOf(args, "--artifacts");
if (artifactIndex < 0 || artifactIndex + 1 >= args.Length)
{
    throw new ArgumentException("Explicit actual evidence --artifacts directory required.");
}
var artifacts = Path.GetFullPath(args[artifactIndex + 1]);
Directory.CreateDirectory(artifacts);
Environment.SetEnvironmentVariable("AUTOPERF_STATES", Path.Combine(artifacts, "states"));
var environment = new
{
    runtime = RuntimeInformation.FrameworkDescription,
    corelib_informational_version = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion,
    di_informational_version = typeof(Microsoft.Extensions.DependencyInjection.ServiceProvider).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion,
    actual_owner = typeof(Microsoft.AspNetCore.Http.Features.RequestServicesFeature).Assembly.FullName,
    actual_owner_file = typeof(Microsoft.AspNetCore.Http.Features.RequestServicesFeature).Assembly.Location,
    server_gc = System.Runtime.GCSettings.IsServerGC,
    process_id = Environment.ProcessId,
    shared_machine = true
};
File.WriteAllText(Path.Combine(artifacts, "runtime-environment.json"), JsonSerializer.Serialize(environment, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine("ACTUAL_RUNTIME " + JsonSerializer.Serialize(environment));
if (args.Contains("--verify", StringComparer.Ordinal))
{
    RequestServicesBenchmark.VerifyCases();
    await RequestServicesProbe.VerifyAsync(artifacts);
    Console.WriteLine("F093:28 actual cases,10 functional observations,4 genuine sync waits,actual registered response gate and4 zero-allocation disposal batches passed.");
    return;
}
BenchmarkSwitcher.FromAssembly(typeof(RequestServicesBenchmark).Assembly).Run(args);
