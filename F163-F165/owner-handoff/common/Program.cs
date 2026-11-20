using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Components;

internal static class StartupHook
{
    private static int _writing;
    private static int _sequence;

    public static void Initialize()
    {
        Snapshot("initialize");
        AppDomain.CurrentDomain.AssemblyLoad += (_, args) =>
        {
            if (args.LoadedAssembly.GetName().Name?.StartsWith("Microsoft.AspNetCore.Components", StringComparison.Ordinal) is true)
            {
                Snapshot("owner-load");
            }
        };
        AppDomain.CurrentDomain.ProcessExit += (_, _) => Snapshot("process-exit");
    }

    internal static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    internal static void Snapshot(string phase)
    {
        var directory = Environment.GetEnvironmentVariable("AUTOPERF_IDENTITY_DIR");
        if (directory is null || Interlocked.Exchange(ref _writing, 1) != 0)
        {
            return;
        }

        try
        {
            Directory.CreateDirectory(directory);
            using var process = Process.GetCurrentProcess();
            var assemblies = AppDomain.CurrentDomain.GetAssemblies().OrderBy(a => a.FullName, StringComparer.Ordinal).Select(a =>
            {
                var location = a.IsDynamic ? "" : a.Location;
                return new
                {
                    name = a.FullName,
                    location,
                    mvid = a.IsDynamic ? "" : a.ManifestModule.ModuleVersionId.ToString(),
                    sha256 = location.Length == 0 ? "" : Hash(location)
                };
            }).ToArray();
            var modules = process.Modules.Cast<ProcessModule>().Select(m => new
            {
                name = m.ModuleName,
                path = m.FileName,
                sha256 = Hash(m.FileName)
            }).OrderBy(m => m.path, StringComparer.OrdinalIgnoreCase).ToArray();
            var receipt = new
            {
                launchId = Environment.GetEnvironmentVariable("AUTOPERF_LAUNCH_ID"),
                phase,
                pid = Environment.ProcessId,
                processStartUtc = process.StartTime.ToUniversalTime().ToString("O"),
                observedUtc = DateTime.UtcNow.ToString("O"),
                processPath = Environment.ProcessPath,
                commandLine = Environment.CommandLine,
                runtimeVersion = Environment.Version.ToString(),
                framework = RuntimeInformation.FrameworkDescription,
                runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory(),
                assemblies,
                modules
            };
            var sequence = Interlocked.Increment(ref _sequence);
            File.WriteAllText(Path.Combine(directory, $"{Environment.ProcessId}-{sequence}-{phase}.json"), JsonSerializer.Serialize(receipt));
        }
        catch (Exception ex)
        {
            File.AppendAllText(Path.Combine(directory, $"{Environment.ProcessId}.errors.txt"), ex.ToString());
        }
        finally
        {
            Volatile.Write(ref _writing, 0);
        }
    }
}

internal static class Program
{
    public static int Main(string[] args)
    {
        var roleBin = Path.GetFullPath(args[0]);
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var path = Path.Combine(roleBin, $"{name.Name}.dll");
            return File.Exists(path) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(path) : null;
        };
        return Contracts.Run();
    }
}

internal static class Contracts
{
    [MethodImpl(MethodImplOptions.NoInlining)]
    internal static int Run()
    {
        var results = new List<object>();
        void Check(string name, Action action)
        {
            try
            {
                action();
                results.Add(new { name, passed = true });
            }
            catch (Exception ex)
            {
                results.Add(new { name, passed = false, error = ex.ToString() });
            }
        }

        Check("F164.FirstDuplicateDiagnosticAndCaseInsensitiveLabelDetection", () =>
        {
            var exception = Throws<InvalidOperationException>(() => _ = new ResourceAssetCollection([
                new("first.hash.js", [new("label", "App.js")]),
                new("second.hash.js", [new("LABEL", "app.JS")]),
                new("third.hash.js", [new("label", "app.js")])
            ]));
            Equal("The static asset 'app.JS' is already mapped to first.hash.js.", exception.Message);
        });
        Check("F164.DuplicateLabelWithinOneResource", () =>
        {
            var exception = Throws<InvalidOperationException>(() => _ = new ResourceAssetCollection([
                new("same.hash.js", [new("label", "same.js"), new("label", "same.js")])
            ]));
            Equal("The static asset 'same.js' is already mapped to same.hash.js.", exception.Message);
        });
        Check("F164.InputEnumerationAndNullProperties", () =>
        {
            IReadOnlyList<ResourceAsset> resources = new ResourceAssetCollection([
                new("z.css", null), new("a.hash.js", [new("label", "a.js")])
            ]);
            Equal("z.css,a.hash.js", string.Join(",", resources.Select(r => r.Url)));
        });
        Check("F165.ZeroSourcesAndNullSections", () =>
        {
            Equal("{}", ImportMapDefinition.Combine().ToString());
            Equal("{}", ImportMapDefinition.Combine(new ImportMapDefinition(null, null, null)).ToString());
        });
        Check("F165.EmptySectionsRemainPresent", () =>
        {
            var result = ImportMapDefinition.Combine(new ImportMapDefinition(
                new Dictionary<string, string>(),
                new Dictionary<string, IReadOnlyDictionary<string, string>>(),
                new Dictionary<string, string>()));
            using var document = JsonDocument.Parse(result.ToString());
            Equal("imports,scopes,integrity", string.Join(",", document.RootElement.EnumerateObject().Select(p => p.Name)));
            foreach (var section in document.RootElement.EnumerateObject())
            {
                Equal(0, section.Value.EnumerateObject().Count());
            }
        });
        Check("F165.ThreeMapScopedPrecedenceCaseOrderingAndInputIsolation", () =>
        {
            ImportMapDefinition Map(Dictionary<string, string> entries) => new(null,
                new Dictionary<string, IReadOnlyDictionary<string, string>> { ["/scope/"] = entries }, null);
            var first = Map(new() { ["x"] = "one", ["X"] = "upper" });
            var second = Map(new() { ["x"] = "two", ["y"] = "second" });
            var third = Map(new() { ["x"] = "three", ["z"] = "third" });
            var before = first.ToString();
            var combined = ImportMapDefinition.Combine(first, second, third);
            var scope = combined.Scopes!["/scope/"];
            Equal("three", scope["x"]);
            Equal("upper", scope["X"]);
            Equal("x,X,y,z", string.Join(",", scope.Keys));
            Equal(before, first.ToString());
            Equal("one", first.Scopes!["/scope/"]["x"]);
        });
        Check("F165.NullSourceInputsHaveNoCustomDiagnostic", () =>
        {
            _ = Throws<NullReferenceException>(() => ImportMapDefinition.Combine(null!));
            _ = Throws<NullReferenceException>(() => ImportMapDefinition.Combine([null!]));
        });
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            provenance = "Supplemental direct public owner API calls; not a replacement producer, browser run, testhost capture, benchmark or production frequency claim.",
            pid = Environment.ProcessId,
            results
        }));
        StartupHook.Snapshot("supplemental-complete");
        return results.Any(r => JsonSerializer.Serialize(r).Contains("\"passed\":false", StringComparison.Ordinal)) ? 1 : 0;
    }

    private static void Equal<T>(T expected, T actual)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw new InvalidOperationException($"Expected '{expected}', got '{actual}'.");
        }
    }

    private static T Throws<T>(Action action) where T : Exception
    {
        try
        {
            action();
        }
        catch (T exception)
        {
            return exception;
        }

        throw new InvalidOperationException($"Expected {typeof(T).Name}.");
    }
}
