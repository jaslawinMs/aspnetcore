using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components.Routing;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace AutoPerf;

public class HashDelimiterBenchmark
{
    private IScrollToLocationHash _owner = null!;
    private string _location = string.Empty;

    public static IReadOnlyList<string> Profiles { get; } =
        ["ShortMissing", "ShortEmpty", "QueryMissing", "QueryEmpty", "LongMissing", "LongEmpty"];

    [ParamsSource(nameof(Profiles))]
    public string Profile { get; set; } = string.Empty;

    public int ExpectedIndex { get; private set; }

    [GlobalSetup(Target = nameof(ActualNoImportOwner))]
    public void SetupOwner() => Setup(nameof(ActualNoImportOwner));

    [GlobalSetup(Target = nameof(DirectStringDiagnostic))]
    public void SetupString() => Setup(nameof(DirectStringDiagnostic));

    [GlobalSetup(Target = nameof(DirectCharDiagnostic))]
    public void SetupChar() => Setup(nameof(DirectCharDiagnostic));

    public void SetupManual() => Setup(nameof(SetupManual));

    private void Setup(string method)
    {
        var fixtures = JsonSerializer.Deserialize<UriFixture[]>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "uri-fixtures.json")),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Original actual-URI fixture input was null.");
        var fixture = fixtures.Single(item => item.Profile == Profile);
        _location = fixture.Location;
        ExpectedIndex = fixture.ExpectedIndex;
        if (!Uri.IsWellFormedUriString(_location, UriKind.Absolute) ||
            ExpectedIndex != _location.IndexOf("#", StringComparison.Ordinal) ||
            ExpectedIndex != _location.IndexOf('#') ||
            ExpectedIndex != -1 && ExpectedIndex != _location.Length - 1)
        {
            throw new InvalidOperationException("A desktop fixture attempted to fake the actual browser import path.");
        }

        var assembly = typeof(WebAssemblyHostBuilder).Assembly;
        var ownerType = assembly.GetType(
            "Microsoft.AspNetCore.Components.WebAssembly.Services.WebAssemblyScrollToLocationHash",
            throwOnError: true) ?? throw new InvalidOperationException("The actual compiled owner type is absent.");
        var instance = ownerType.GetField("Instance", BindingFlags.Public | BindingFlags.Static)?.GetValue(null);
        _owner = instance as IScrollToLocationHash
            ?? throw new InvalidOperationException("The actual singleton does not implement the public scroll contract.");

        for (var index = 0; index < 1000; index++)
        {
            RequireCompleted(_owner.RefreshScrollPositionForHash(_location));
        }

        var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < 1000; index++)
        {
            RequireCompleted(_owner.RefreshScrollPositionForHash(_location));
        }
        var allocatedBytes = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
        if (allocatedBytes != 0)
        {
            throw new InvalidOperationException($"The actual short-circuit owner allocated {allocatedBytes} bytes in 1000 warmed calls.");
        }

        var stateDirectory = Environment.GetEnvironmentVariable("AUTOPERF_F089_STATE_DIR")
            ?? throw new InvalidOperationException("An explicit actual-execution state directory is required.");
        Directory.CreateDirectory(stateDirectory);
        var state = new
        {
            candidate = "F089",
            method,
            profile = Profile,
            location = _location,
            expectedIndex = ExpectedIndex,
            completedOwnerCalls = 1000,
            allocatedBytes,
            importReached = false,
            ownerType = _owner.GetType().FullName,
            ownerMvid = assembly.ManifestModule.ModuleVersionId,
            ownerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
            ownerPath = assembly.Location,
            frameworkDescription = RuntimeInformation.FrameworkDescription,
            processId = Environment.ProcessId,
            measuredBoundary = "Complete actual CoreCLR no-import owner; neither browser import nor WebAssembly timing.",
        };
        File.WriteAllText(Path.Combine(stateDirectory, $"{method}-{Profile}-{Guid.NewGuid():N}.json"),
            JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine($"F089 actual setup: {method}/{Profile}; owner {state.ownerSha256}; allocated {allocatedBytes}; completed 1000.");
    }

    [Benchmark]
    public Task ActualNoImportOwner() => _owner.RefreshScrollPositionForHash(_location);

    [Benchmark]
    public int DirectStringDiagnostic() => _location.IndexOf("#", StringComparison.Ordinal);

    [Benchmark]
    public int DirectCharDiagnostic() => _location.IndexOf('#');

    private static void RequireCompleted(Task result)
    {
        if (!result.IsCompletedSuccessfully)
        {
            throw new InvalidOperationException("The actual no-import owner did not complete successfully.");
        }
    }

    private sealed record UriFixture(string Profile, string Location, int ExpectedIndex);
}
