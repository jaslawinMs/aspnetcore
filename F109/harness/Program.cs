using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;

namespace AutoPerf;

internal static class Evidence
{
    internal static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    internal static readonly string OwnerSha256 = Hash(typeof(DataProtectorTokenProvider<FixtureUser>).Assembly.Location);
    internal static readonly string HarnessSha256 = Hash(typeof(Evidence).Assembly.Location);
    internal static string StateDirectory { get; set; } = string.Empty;
    internal static string InputDirectory { get; set; } = string.Empty;
    internal static string FixtureDirectory { get; set; } = string.Empty;
    internal static string Variant { get; set; } = string.Empty;
    internal static bool IsCandidate => Variant.StartsWith("candidate", StringComparison.Ordinal);

    internal static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    internal static string Compact(object value) => JsonSerializer.Serialize(value);

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    internal static void Write(string name, object value)
    {
        using var output = new FileStream(Path.Combine(StateDirectory, name + ".json"), FileMode.CreateNew);
        JsonSerializer.Serialize(output, value, JsonOptions);
    }

    internal static object WriteInput(string label)
    {
        var source = Path.Combine(FixtureDirectory, "case-inputs", label + ".json");
        var destination = Path.Combine(InputDirectory, label + ".json");
        File.Copy(source, destination, overwrite: false);
        Require(Hash(source) == Hash(destination), "The shared exact input bytes changed.");

        return new { label, fileName = label + ".json", sha256 = Hash(destination), bytes = new FileInfo(destination).Length };
    }
}

internal static class Program
{
    public static int Main(string[] args)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        if (args.Length == 2 && args[0] == "--create-fixture")
        {
            TokenFixture.Create(args[1]);

            return 0;
        }
        string ReadOption(string name)
        {
            var index = Array.IndexOf(args, name);
            if (index < 0 || index + 1 >= args.Length)
            {
                throw new ArgumentException("An explicit " + name + " is required.");
            }

            return args[index + 1];
        }
        var artifacts = ReadOption("--artifacts");
        Evidence.FixtureDirectory = ReadOption("--fixture");
        Evidence.Variant = ReadOption("--variant");
        Evidence.Require(Path.IsPathFullyQualified(artifacts) && Path.IsPathFullyQualified(Evidence.FixtureDirectory),
            "Absolute artifact and isolated synthetic fixture directories are required.");
        Evidence.Require(Evidence.Variant is "original" or "candidate1" or "candidate2" or "candidate3",
            "An explicit original/candidate1/candidate2/candidate3 evidence label is required.");
        Evidence.Require(GCSettings.IsServerGC && RuntimeInformation.ProcessArchitecture == Architecture.X64,
            "The pinned x64 server-GC execution environment is required.");
        Evidence.StateDirectory = Path.Combine(artifacts, "states");
        Evidence.InputDirectory = Path.Combine(artifacts, "inputs");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Directory.CreateDirectory(Evidence.InputDirectory);
        var fixture = TokenFixture.Verify(Evidence.FixtureDirectory);
        Evidence.Write("runtime", new
        {
            variant = Evidence.Variant,
            runtime = Environment.Version.ToString(),
            processId = Environment.ProcessId,
            architecture = RuntimeInformation.ProcessArchitecture.ToString(),
            processorCount = Environment.ProcessorCount,
            corelibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            corelibMvid = typeof(object).Assembly.ManifestModule.ModuleVersionId,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            ownerMvid = typeof(DataProtectorTokenProvider<FixtureUser>).Assembly.ManifestModule.ModuleVersionId,
            userManagerSha256 = Evidence.Hash(typeof(UserManager<FixtureUser>).Assembly.Location),
            dataProtectionSha256 = Evidence.Hash(typeof(EphemeralDataProtectionProvider).Assembly.Location),
            dataProtectionExtensionsSha256 = Evidence.Hash(typeof(DataProtectionProvider).Assembly.Location),
            serverGc = GCSettings.IsServerGC,
            configuredConcurrentGc = true,
            profiles = TokenFixture.Labels,
            fixture,
            boundary = "Actual UserManager.VerifyUserTokenAsync/registered DataProtectorTokenProvider/real persisted public Data Protection and explicit synchronous in-memory store. Shared synthetic inputs/keys;not hosted requests,external-store I/O or observed production frequency."
        });
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            Probe.Run();

            return 0;
        }
        var benchmarkArguments = new List<string>();
        for (var index = 0; index < args.Length; index++)
        {
            if (args[index] is "--fixture" or "--variant")
            {
                index++;
            }
            else
            {
                benchmarkArguments.Add(args[index]);
            }
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(benchmarkArguments.ToArray());

        return 0;
    }
}
