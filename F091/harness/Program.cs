using BenchmarkDotNet.Running;

if (args is ["--verify"])
{
    foreach (var profile in GoogleChallengeBenchmark.Profiles)
    {
        foreach (var method in new[] { nameof(GoogleChallengeBenchmark.PreparedOwner), nameof(GoogleChallengeBenchmark.PublicChallenge) })
        {
            var benchmark = new GoogleChallengeBenchmark { Profile = profile };
            try
            {
                benchmark.Prepare(method);
                Console.WriteLine($"Verified actual Google owner: {profile}/{method}");
            }
            finally
            {
                benchmark.Cleanup();
            }
        }
    }
}
else
{
    var artifactsIndex = Array.IndexOf(args, "--artifacts");
    if (artifactsIndex < 0 || artifactsIndex + 1 >= args.Length)
    {
        throw new ArgumentException("An explicit --artifacts directory is required for per-launch actual setup receipts.");
    }
    Environment.SetEnvironmentVariable("AUTOPERF_F091_STATE_DIR",
        Path.Combine(Path.GetFullPath(args[artifactsIndex + 1]), "states"));
    BenchmarkSwitcher.FromAssembly(typeof(GoogleChallengeBenchmark).Assembly).Run(args);
}
