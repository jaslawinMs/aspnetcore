using BenchmarkDotNet.Running;

var artifactsIndex = Array.IndexOf(args, "--artifacts");
if (artifactsIndex < 0 || artifactsIndex + 1 >= args.Length)
{
    throw new ArgumentException("An explicit --artifacts directory is required.");
}
var artifacts = Path.GetFullPath(args[artifactsIndex + 1]);
Directory.CreateDirectory(artifacts);
Environment.SetEnvironmentVariable("AUTOPERF_F092_STATE_DIR", Path.Combine(artifacts, "states"));
if (args.Contains("--verify"))
{
    foreach (var profile in ResponseBodyReadBenchmark.Profiles)
    {
        foreach (var method in new[]
        {
            nameof(ResponseBodyReadBenchmark.PreparedSync),
            nameof(ResponseBodyReadBenchmark.PreparedMemoryAsync),
            nameof(ResponseBodyReadBenchmark.PublicSync),
        })
        {
            var benchmark = new ResponseBodyReadBenchmark { Profile = profile };
            try
            {
                benchmark.Prepare(method);
            }
            finally
            {
                benchmark.Cleanup();
            }
        }
    }
    ResponseBodyReadProbe.Verify(artifacts, args.Contains("--assert-no-wrapper"));
    Console.WriteLine("Verified 24 actual response benchmark cases and real pending/lifetime/validation probes.");
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(ResponseBodyReadBenchmark).Assembly).Run(args);
}
