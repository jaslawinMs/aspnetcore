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
        var entryPath = Assembly.GetExecutingAssembly().Location;
        var context = new PinnedSourceContext(sourceRoot, Path.GetDirectoryName(entryPath)!);
        try
        {
            context.LoadChecked(expectedOwner, "pinned-owner");
            var entry = context.LoadFromAssemblyPath(entryPath);
            using var reflectionScope = context.EnterContextualReflection();
            var program = entry.GetType("F151F152.Program", throwOnError: true)!;
            var task = (Task<int>)program.GetMethod("RunAsync", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, [args])!;
            return await task;
        }
        finally
        {
            Directory.CreateDirectory(Path.GetDirectoryName(args[2])!);
            File.WriteAllText(args[2] + ".loader.json", JsonSerializer.Serialize(context.Resolutions, new JsonSerializerOptions { WriteIndented = true }));
        }
    }

    private sealed class PinnedSourceContext(string sourceRoot, string appDirectory) : AssemblyLoadContext("F151-F152-pinned-source", isCollectible: false)
    {
        public List<object> Resolutions { get; } = [];

        protected override Assembly? Load(AssemblyName assemblyName)
        {
            var fileName = assemblyName.Name + ".dll";
            var source = Path.Combine(sourceRoot, "artifacts", "bin", assemblyName.Name!, "Debug", "net12.0", fileName);
            if (File.Exists(source))
            {
                return LoadChecked(source, "pinned-source-dependency");
            }

            var privateFile = Path.Combine(appDirectory, fileName);
            if (File.Exists(privateFile))
            {
                return LoadChecked(privateFile, "private-probe-dependency");
            }

            var installed = Path.Combine(sourceRoot, ".dotnet", "shared", "Microsoft.AspNetCore.App", "12.0.0-alpha.1.26557.102", fileName);
            if (File.Exists(installed))
            {
                return LoadChecked(installed, "installed-transport-support");
            }

            return null;
        }

        public Assembly LoadChecked(string path, string kind)
        {
            var assembly = LoadFromAssemblyPath(path);
            var expectedHash = Hash(path);
            var actualHash = Hash(assembly.Location);
            Resolutions.Add(new { kind, requested_path = path, loaded_path = assembly.Location, load_context = GetLoadContext(assembly)!.Name, expectedHash, actualHash });
            if (expectedHash != actualHash)
            {
                throw new InvalidOperationException($"A framework binary displaced a selected binary: {path} -> {assembly.Location}");
            }

            return assembly;
        }
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }
}
