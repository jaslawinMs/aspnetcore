using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

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
                "Microsoft.AspNetCore.Http.Abstractions.Tests" or
                "Microsoft.AspNetCore.Http.Abstractions" or
                "Microsoft.AspNetCore.Http" or
                "Microsoft.AspNetCore.Http.Features")
            {
                Snapshot("selected-owner-load");
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
            var assemblies = AppDomain.CurrentDomain.GetAssemblies()
                .OrderBy(a => a.FullName, StringComparer.Ordinal)
                .Select(a =>
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
            var modules = process.Modules.Cast<ProcessModule>()
                .Select(m => new { name = m.ModuleName, path = m.FileName, sha256 = Hash(m.FileName) })
                .OrderBy(m => m.path, StringComparer.OrdinalIgnoreCase).ToArray();
            var snapshot = new
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
            File.WriteAllText(
                Path.Combine(directory, $"{Environment.ProcessId}-{Interlocked.Increment(ref _sequence)}-{phase}.json"),
                JsonSerializer.Serialize(snapshot));
        }
        catch (Exception exception)
        {
            File.AppendAllText(Path.Combine(directory, $"{Environment.ProcessId}.errors.txt"), exception.ToString());
        }
        finally
        {
            Volatile.Write(ref _writing, 0);
        }
    }
}

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var roleBin = Path.GetFullPath(args[0]);
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var path = Path.Combine(roleBin, $"{name.Name}.dll");
            return File.Exists(path) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(path) : null;
        };
        var tests = AssemblyLoadContext.Default.LoadFromAssemblyPath(
            Path.Combine(roleBin, "Microsoft.AspNetCore.Http.Abstractions.Tests.dll"));
        var testType = tests.GetType("Microsoft.AspNetCore.Builder.Extensions.UseWhenExtensionsTests", throwOnError: true)!;
        return await Contracts.Run(testType);
    }
}

internal static class Contracts
{
    [MethodImpl(MethodImplOptions.NoInlining)]
    internal static async Task<int> Run(Type testType)
    {
        var increment = testType.GetMethod("Increment", BindingFlags.NonPublic | BindingFlags.Static)!;
        var count = testType.GetMethod("Count", BindingFlags.NonPublic | BindingFlags.Static)!;
        var results = new List<ProbeResult>();
        Func<HttpContext, Func<Task>, Task> Middleware(string key, bool terminate = false)
            => (Func<HttpContext, Func<Task>, Task>)Invoke(increment, [key, terminate])!;
        int Count(HttpContext context, string key) => (int)Invoke(count, [context, key])!;
        RequestDelegate Pipeline(string key, bool terminate = false, bool predicate = true)
        {
            var builder = new ApplicationBuilder(serviceProvider: null!);
            builder.UseWhen(_ => predicate, branch => branch.Use(Middleware(key, terminate)));
            builder.Use(Middleware("after"));
            return builder.Build();
        }

        async Task Check(string name, Func<Task<object>> action)
        {
            try
            {
                results.Add(new(name, true, await action(), null));
            }
            catch (Exception exception)
            {
                results.Add(new(name, false, null, exception.ToString()));
            }
        }

        await Check("F169F170.RealPipeline.RepeatedContextAndFreshContext", async () =>
        {
            var context = new DefaultHttpContext();
            var items = context.Items;
            Equal("Microsoft.AspNetCore.Http.ItemsDictionary", items.GetType().FullName);
            Equal<object?>(null, Backing(context));
            Equal(0, Count(context, "repeated"));
            Equal(0, context.Items.Count);
            Equal<object?>(null, Backing(context));
            var pipeline = Pipeline("repeated");
            await pipeline(context);
            Equal(1, Count(context, "repeated"));
            Equal(1, Count(context, "after"));
            Equal(true, context.Items["__RequestUnhandled"]);
            Equal(0, Count(context, "__RequestUnhandled"));
            Equal(404, context.Response.StatusCode);
            await pipeline(context);
            Equal(2, Count(context, "repeated"));
            Equal(2, Count(context, "after"));
            Equal(3, context.Items.Count);
            Equal(true, ReferenceEquals(items, context.Items));
            var fresh = new DefaultHttpContext();
            await pipeline(fresh);
            Equal(1, Count(fresh, "repeated"));
            Equal(1, Count(fresh, "after"));
            Equal(false, ReferenceEquals(context.Items, fresh.Items));
            return new { reused = Observe(context), fresh = Observe(fresh) };
        });

        foreach (var (name, seed, expected) in new[]
        {
            ("Zero", 0, 1),
            ("Positive", 41, 42),
            ("Negative", -1, 0),
            ("MaxValueUnchecked", int.MaxValue, int.MinValue)
        })
        {
            await Check($"F169F170.RealPipeline.SeededInt{name}", async () =>
            {
                var context = new DefaultHttpContext();
                context.Items["seeded"] = seed;
                Equal(seed, Count(context, "seeded"));
                await Pipeline("seeded")(context);
                Equal(expected, Count(context, "seeded"));
                Equal(expected, context.Items["seeded"]);
                Equal(1, Count(context, "after"));
                return Observe(context);
            });
        }

        foreach (var (name, seed) in new (string Name, object? Seed)[]
        {
            ("Null", null),
            ("String", "41"),
            ("Int64", 41L)
        })
        {
            await Check($"F169F170.RealPipeline.Seeded{name}ResetsToOne", async () =>
            {
                var context = new DefaultHttpContext();
                context.Items["seeded"] = seed;
                var entries = context.Items.Count;
                Equal(0, Count(context, "seeded"));
                Equal(entries, context.Items.Count);
                Equal(seed, context.Items["seeded"]);
                await Pipeline("seeded")(context);
                Equal(1, Count(context, "seeded"));
                Equal(1, context.Items["seeded"]);
                return Observe(context);
            });
        }

        await Check("F169F170.RealPipeline.StringCaseAndValueEquality", async () =>
        {
            var context = new DefaultHttpContext();
            context.Items["Key"] = 17;
            await Pipeline("key")(context);
            Equal(17, Count(context, "Key"));
            Equal(1, Count(context, "key"));
            Equal(1, Count(context, new string("key".ToCharArray())));
            var dictionary = (Dictionary<object, object?>)Backing(context)!;
            Equal(EqualityComparer<object>.Default, dictionary.Comparer);
            Equal(false, dictionary.Comparer.Equals("Key", "key"));
            Equal(true, dictionary.Comparer.Equals("key", new string("key".ToCharArray())));
            return Observe(context);
        });

        await Check("F169F170.RealPipeline.TerminationSkipsParentAndDefaultTerminal", async () =>
        {
            var context = new DefaultHttpContext();
            var pipeline = Pipeline("branch", terminate: true);
            await pipeline(context);
            await pipeline(context);
            Equal(2, Count(context, "branch"));
            Equal(0, Count(context, "after"));
            Equal(false, context.Items.ContainsKey("after"));
            Equal(false, context.Items.ContainsKey("__RequestUnhandled"));
            Equal(1, context.Items.Count);
            return Observe(context);
        });

        await Check("F169F170.RealPipeline.FalseBranchLeavesSeededNullUntouched", async () =>
        {
            var context = new DefaultHttpContext();
            context.Items["branch"] = null;
            await Pipeline("branch", predicate: false)(context);
            Equal(0, Count(context, "branch"));
            Equal<object?>(null, context.Items["branch"]);
            Equal(1, Count(context, "after"));
            Equal(true, context.Items["__RequestUnhandled"]);
            return Observe(context);
        });

        await Check("F169F170.PrivateHelperAndRealPipeline.NullKeyLazyVersusInitialized", async () =>
        {
            var context = new DefaultHttpContext();
            Equal(0, Count(context, null!));
            Equal<object?>(null, Backing(context));
            var writeException = await Throws<ArgumentNullException>(() => Pipeline(null!)(context));
            Equal("key", writeException.ParamName);
            Equal(0, context.Items.Count);
            Equal(true, Backing(context) is Dictionary<object, object?>);
            var readException = await Throws<ArgumentNullException>(() =>
            {
                _ = Count(context, null!);
                return Task.CompletedTask;
            });
            Equal("key", readException.ParamName);
            Equal(false, context.Items.ContainsKey("after"));
            return new
            {
                state = Observe(context),
                writeException = new { type = writeException.GetType().FullName, writeException.ParamName },
                readException = new { type = readException.GetType().FullName, readException.ParamName },
                boundary = "Direct reflection Count helper calls with invalid null key; middleware body is reached only via actual UseWhen/Use-built RequestDelegate."
            };
        });

        Console.WriteLine(JsonSerializer.Serialize(new
        {
            boundary = "Supplemental only. Reflection invokes unchanged private Increment factory and Count reader from the source-built native test DLL. Actual returned middleware runs through public source-built ApplicationBuilder/UseWhen/Use RequestDelegate; no copied helper body or injected next callback. Seeded/repeated/null-key states are diagnostic inputs, not claims about existing native-test or business-request frequency.",
            pid = Environment.ProcessId,
            helpers = new[]
            {
                new { increment.Name, increment.MetadataToken, mvid = increment.Module.ModuleVersionId.ToString(), assembly = increment.DeclaringType!.Assembly.Location },
                new { count.Name, count.MetadataToken, mvid = count.Module.ModuleVersionId.ToString(), assembly = count.DeclaringType!.Assembly.Location }
            },
            results
        }));
        StartupHook.Snapshot("supplemental-complete");
        return results.Any(result => !result.Passed) ? 1 : 0;
    }

    private static object? Invoke(MethodInfo method, object?[] arguments)
    {
        try
        {
            return method.Invoke(null, arguments);
        }
        catch (TargetInvocationException exception) when (exception.InnerException is not null)
        {
            ExceptionDispatchInfo.Capture(exception.InnerException).Throw();
            throw;
        }
    }

    private static object? Backing(HttpContext context)
        => context.Items.GetType().GetField("_items", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(context.Items);

    private static object Observe(HttpContext context)
    {
        var dictionary = Backing(context) as Dictionary<object, object?>;
        return new
        {
            wrapperType = context.Items.GetType().FullName,
            backingType = dictionary?.GetType().FullName,
            comparerType = dictionary?.Comparer.GetType().FullName,
            context.Response.StatusCode,
            entries = context.Items.Select(pair => new
            {
                key = pair.Key.ToString(),
                keyType = pair.Key.GetType().FullName,
                value = pair.Value,
                valueType = pair.Value?.GetType().FullName
            }).ToArray()
        };
    }

    private static void Equal<T>(T expected, T actual)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw new InvalidOperationException($"Expected '{expected}', got '{actual}'.");
        }
    }

    private static async Task<T> Throws<T>(Func<Task> action) where T : Exception
    {
        try
        {
            await action();
        }
        catch (T exception)
        {
            return exception;
        }

        throw new InvalidOperationException($"Expected {typeof(T).Name}.");
    }

    private sealed record ProbeResult(string Name, bool Passed, object? Observations, string? Error);
}
