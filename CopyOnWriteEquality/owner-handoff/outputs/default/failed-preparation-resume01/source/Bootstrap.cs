using System.Reflection;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;

namespace F151F152;

internal static class Bootstrap
{
    public static async Task<int> Main(string[] args)
    {
        var sourceRoot = args[0];
        var expectedOwner = args[1];
        var appDirectory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        var candidates = Directory.GetFiles(appDirectory, "*.dll")
            .Select(path => Path.Combine(sourceRoot, "artifacts", "bin", Path.GetFileNameWithoutExtension(path), "Debug", "net12.0", Path.GetFileName(path)))
            .Where(File.Exists)
            .Append(expectedOwner)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase);
        var loaded = new List<object>();
        foreach (var path in candidates)
        {
            var assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
            var expectedHash = Hash(path);
            var actualHash = Hash(assembly.Location);
            loaded.Add(new { source_output = path, loaded_path = assembly.Location, expectedHash, actualHash });
            if (expectedHash != actualHash)
            {
                throw new InvalidOperationException($"A framework binary displaced a pinned source binary: {path} -> {assembly.Location}");
            }
        }

        Directory.CreateDirectory(Path.GetDirectoryName(args[2])!);
        File.WriteAllText(args[2] + ".loader.json", JsonSerializer.Serialize(loaded, new JsonSerializerOptions { WriteIndented = true }));
        var program = Assembly.GetExecutingAssembly().GetType("F151F152.Program", throwOnError: true)!;
        var task = (Task<int>)program.GetMethod("RunAsync", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, [args])!;
        return await task;
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }
}
