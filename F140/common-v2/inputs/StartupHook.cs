using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;

internal static class StartupHook
{
    private static int _writing;
    private static int _sequence;

    public static void Initialize()
    {
        Snapshot("initialize");
        AppDomain.CurrentDomain.AssemblyLoad += (_, args) =>
        {
            if (args.LoadedAssembly.GetName().Name is
                "Microsoft.AspNetCore.SignalR.Client.Tests" or
                "Microsoft.AspNetCore.SignalR.Client.Core" or
                "Microsoft.AspNetCore.SignalR.Client" or
                "Microsoft.AspNetCore.SignalR.Protocols.Json")
            {
                Snapshot("selected-owner-load");
            }
        };
        AppDomain.CurrentDomain.ProcessExit += (_, _) => Snapshot("process-exit");
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
            var destination = Path.Combine(directory, $"{Environment.ProcessId}-{Interlocked.Increment(ref _sequence)}-{phase}.json");
            using var output = new MemoryStream();
            using var writer = new Utf8JsonWriter(output);
            writer.WriteStartObject();
            writer.WriteString("phase", phase);
            writer.WriteString("observedUtc", DateTime.UtcNow.ToString("O"));
            writer.WriteNumber("pid", Environment.ProcessId);
            writer.WriteString("processStartUtc", process.StartTime.ToUniversalTime().ToString("O"));
            writer.WriteString("processPath", Environment.ProcessPath);
            writer.WriteString("framework", RuntimeInformation.FrameworkDescription);
            writer.WriteString("runtimeDirectory", RuntimeEnvironment.GetRuntimeDirectory());
            writer.WriteStartArray("assemblies");
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies().OrderBy(item => item.FullName, StringComparer.Ordinal))
            {
                writer.WriteStartObject();
                writer.WriteString("name", assembly.FullName);
                writer.WriteBoolean("dynamic", assembly.IsDynamic);
                if (!assembly.IsDynamic)
                {
                    writer.WriteString("location", assembly.Location);
                    writer.WriteString("mvid", assembly.ManifestModule.ModuleVersionId);
                    if (assembly.Location.Length > 0)
                    {
                        writer.WriteString("sha256", Hash(assembly.Location));
                    }
                }
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
            writer.WriteStartArray("runtimeModules");
            foreach (var module in process.Modules.Cast<ProcessModule>().Where(item =>
                item.ModuleName.Equals("coreclr.dll", StringComparison.OrdinalIgnoreCase) ||
                item.ModuleName.Equals("hostpolicy.dll", StringComparison.OrdinalIgnoreCase) ||
                item.ModuleName.Equals("hostfxr.dll", StringComparison.OrdinalIgnoreCase)))
            {
                writer.WriteStartObject();
                writer.WriteString("name", module.ModuleName);
                writer.WriteString("path", module.FileName);
                writer.WriteString("sha256", Hash(module.FileName));
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
            writer.WriteEndObject();
            writer.Flush();
            var temporary = destination + ".incomplete";
            File.WriteAllBytes(temporary, output.ToArray());
            File.Move(temporary, destination);
        }
        finally
        {
            Volatile.Write(ref _writing, 0);
        }
    }

    private static string Hash(string file)
    {
        using var stream = File.OpenRead(file);
        return Convert.ToHexString(SHA256.HashData(stream));
    }
}
