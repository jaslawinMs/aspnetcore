using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TestSite;

namespace F145.Functional;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        var siteDirectory = Path.GetFullPath(args[0]);
        var endpointFiles = Path.GetFullPath(args[1]);
        var evidencePath = Path.GetFullPath(args[2]);
        var events = new ConcurrentQueue<object>();
        using var watcher = new FileSystemWatcher(endpointFiles)
        {
            Filter = "*",
            NotifyFilter = NotifyFilters.FileName
        };
        watcher.Created += (_, e) => events.Enqueue(new { kind = "created", path = e.FullPath });
        watcher.Deleted += (_, e) => events.Enqueue(new { kind = "deleted", path = e.FullPath });
        watcher.Error += (_, e) => events.Enqueue(new { kind = "watcher-error", error = e.GetException().ToString() });
        watcher.EnableRaisingEvents = true;
        var exitCode = 0;
        string? failure = null;
        try
        {
#pragma warning disable ASPDEPR004
#pragma warning disable ASPDEPR008
            using var host = new WebHostBuilder()
                .UseContentRoot(siteDirectory)
                .UseSetting(WebHostDefaults.PreventHostingStartupKey, "true")
                .UseKestrel()
                .UseIIS()
                .UseIISIntegration()
                .UseUrls("http://127.0.0.1:0")
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.SetMinimumLevel(LogLevel.None);
                })
                .UseStartup<Startup>()
                .Build();
#pragma warning restore ASPDEPR008
#pragma warning restore ASPDEPR004
            await host.StartAsync();
            var server = host.Services.GetRequiredService<IServer>();
            var address = server.Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                kind = "ready",
                pid = Environment.ProcessId,
                address,
                serverType = server.GetType().AssemblyQualifiedName,
                startup = Identity(typeof(Startup).Assembly),
                runtime = RuntimeInformation.FrameworkDescription,
                coreLibrary = Identity(typeof(object).Assembly),
                architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                processTemp = Path.GetTempPath(),
                diagnostics = "No log providers, listeners, timers, benchmarks, or allocation instrumentation."
            }));
            await host.WaitForShutdownAsync();
        }
        catch (Exception exception)
        {
            failure = exception.ToString();
            Console.Error.WriteLine(failure);
            exitCode = 1;
        }
        finally
        {
            watcher.EnableRaisingEvents = false;
            var assemblies = AppDomain.CurrentDomain.GetAssemblies()
                .Where(a => !a.IsDynamic && (a.GetName().Name is "InProcessWebSite" or "F145FunctionalHost" or "System.Private.CoreLib" ||
                    a.GetName().Name!.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal) ||
                    a.GetName().Name!.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal)))
                .OrderBy(a => a.GetName().Name, StringComparer.Ordinal)
                .Select(Identity)
                .ToArray();
            File.WriteAllText(evidencePath, JsonSerializer.Serialize(new
            {
                pid = Environment.ProcessId,
                exitCode,
                failure,
                runtime = RuntimeInformation.FrameworkDescription,
                architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                processTemp = Path.GetTempPath(),
                endpointFilesRemaining = Directory.GetFiles(endpointFiles),
                fileEvents = events.ToArray(),
                assemblies
            }, new JsonSerializerOptions { WriteIndented = true }));
        }

        return exitCode;
    }

    private static object Identity(Assembly assembly)
    {
        var path = assembly.Location;
        var pdb = Path.ChangeExtension(path, ".pdb");
        return new
        {
            name = assembly.GetName().Name,
            fullName = assembly.FullName,
            path,
            mvid = assembly.ManifestModule.ModuleVersionId,
            sha256 = Hash(path),
            pdbPath = File.Exists(pdb) ? pdb : null,
            pdbSha256 = File.Exists(pdb) ? Hash(pdb) : null,
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        };
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexStringLower(SHA256.HashData(stream));
    }
}
