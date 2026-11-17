using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.Serialization.Json;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace AutoPerf;

internal static class Program
{
    private static string Hash(string file)
    {
        using var sha = SHA256.Create();
        using var stream = File.OpenRead(file);

        return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "");
    }

    private static string Settings()
    {
#if NET
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("Windows-only shared-machine settings evidence.");
        }
#endif
        using var process = Process.GetCurrentProcess();

        return process.PriorityClass + "|" + Thread.CurrentThread.Priority + "|" + process.ProcessorAffinity.ToInt64();
    }

    private static void Write<T>(string file, T value)
    {
        using var stream = File.Create(file);
        new DataContractJsonSerializer(typeof(T)).WriteObject(stream, value);
    }

    public static int Main(string[] args)
    {
        SharedProof.Require(args.Length == 4, "Explicit output/context/ownerTFM/actualOwnerHash required.");
        var destination = args[0];
        Directory.CreateDirectory(destination);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var initial = Settings();
        var owner = typeof(ClaimsAuthorizationRequirement).Assembly;
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()!.FrameworkName;
        SharedProof.Require(target == args[2] && Hash(owner.Location) == args[3], "Actual loaded TFM/owner bytes differ from explicitly built product.");
        Write(Path.Combine(destination, "runtime.json"), new Dictionary<string, string>
        {
            ["candidate"] = "F010", ["context"] = args[1], ["runtime"] = Environment.Version.ToString(),
            ["corelibProductVersion"] = FileVersionInfo.GetVersionInfo(typeof(object).Assembly.Location).ProductVersion!,
            ["ownerTargetFramework"] = target, ["ownerPath"] = owner.Location, ["ownerSha256"] = Hash(owner.Location),
            ["ownerPdbSha256"] = Hash(Path.ChangeExtension(owner.Location, ".pdb")),
            ["harnessSha256"] = Hash(typeof(Program).Assembly.Location), ["corelibSha256"] = Hash(typeof(object).Assembly.Location),
            ["initialSettings"] = initial, ["serverGc"] = GCSettings.IsServerGC.ToString(),
            ["boundary"] = "Untimed real public builder/registered service/requirement dispatch on explicitly loaded library TFM;not legacy performance measurements or whole current-default integration."
        });
        var sequence = 0;
        var count = ContractProbes.Run(record =>
        {
            Write(Path.Combine(destination, (++sequence).ToString("D4") + "-producer.json"), record);
        }).GetAwaiter().GetResult();
        SharedProof.Require(count == sequence && initial == Settings(), "Every actual producer check and unchanged process/thread settings required.");
        Write(Path.Combine(destination, "completed.json"), new Dictionary<string, string>
        {
            ["candidate"] = "F010", ["context"] = args[1], ["actualChecks"] = count.ToString(),
            ["actualRecords"] = sequence.ToString(), ["passed"] = "true", ["finalSettings"] = Settings(),
            ["ownerTargetFramework"] = target, ["ownerSha256"] = Hash(owner.Location)
        });
        Console.WriteLine($"F010 {args[1]}:{count} native public-pipeline producer/contract observations passed;actual owner {target}.");

        return 0;
    }
}
