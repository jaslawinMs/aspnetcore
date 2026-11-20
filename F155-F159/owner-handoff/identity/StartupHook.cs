using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;

/// <summary>Records loaded file identities at normal process exit, without exercising product code.</summary>
public static class StartupHook
{
    private static int _written;

    /// <summary>Attaches the identity-only exit recorder requested by the native test launcher.</summary>
    public static void Initialize()
    {
        var destination = Environment.GetEnvironmentVariable("F155_IDENTITY_DIR");
        if (string.IsNullOrEmpty(destination))
        {
            return;
        }

        AppDomain.CurrentDomain.ProcessExit += (_, _) => Save(destination);
    }

    private static void Save(string destination)
    {
        if (Interlocked.Exchange(ref _written, 1) != 0)
        {
            return;
        }

        var assemblies = new List<object>();
        var modules = new List<object>();
        var errors = new List<string>();
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies().OrderBy(a => a.FullName))
        {
            try
            {
                if (!assembly.IsDynamic && !string.IsNullOrEmpty(assembly.Location))
                {
                    assemblies.Add(new
                    {
                        name = assembly.FullName,
                        path = assembly.Location,
                        mvid = assembly.ManifestModule.ModuleVersionId,
                        sha256 = Hash(assembly.Location)
                    });
                }
            }
            catch (Exception exception)
            {
                errors.Add($"{assembly.FullName}: {exception.GetType().Name}: {exception.Message}");
            }
        }

        using var process = Process.GetCurrentProcess();
        foreach (ProcessModule module in process.Modules)
        {
            try
            {
                modules.Add(new { path = module.FileName, sha256 = Hash(module.FileName) });
            }
            catch (Exception exception)
            {
                errors.Add($"{module.ModuleName}: {exception.GetType().Name}: {exception.Message}");
            }
        }

        Directory.CreateDirectory(destination);
        var record = new
        {
            kind = "normal-ProcessExit-loaded-image-identity-receipt",
            pid = Environment.ProcessId,
            processPath = Environment.ProcessPath,
            commandLine = Environment.CommandLine,
            framework = RuntimeInformation.FrameworkDescription,
            corelib = typeof(object).Assembly.Location,
            dotnetRoot = Environment.GetEnvironmentVariable("DOTNET_ROOT"),
            startupHook = Environment.GetEnvironmentVariable("DOTNET_STARTUP_HOOKS"),
            assemblies,
            modules,
            errors,
            boundary = "Exit-time snapshot, not an exhaustive historical assembly/module or descendant-process census."
        };
        File.WriteAllText(Path.Combine(destination, $"identity-{Environment.ProcessId}.json"),
            JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true }));
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);

        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }
}
