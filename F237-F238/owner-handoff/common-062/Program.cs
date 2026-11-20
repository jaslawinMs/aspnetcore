using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Razor.Language;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

#pragma warning disable ASPDEPR003

namespace AutoPerf.RuntimePageDiscoveryProbe;

internal static class Program
{
    private static void Main(string[] args)
    {
        if (args.Length != 3)
        {
            throw new ArgumentException("Expected role, physical fixture root, and frozen fixture-plan JSON.");
        }

        var planBytes = File.ReadAllBytes(args[2]);
        var plan = JsonSerializer.Deserialize<FixturePlan[]>(planBytes)
            ?? throw new InvalidOperationException("The fixture plan is null.");
        var rows = new List<object>();
        foreach (var fixture in plan)
        {
            var checks = new List<string>();
            void Require(bool condition, string name)
            {
                if (!condition)
                {
                    throw new InvalidOperationException($"{args[0]}/{fixture.Name}: {name}");
                }

                checks.Add(name);
            }

            var physicalRoot = Path.Combine(args[1], fixture.Name);
            var beforeFiles = FileInventory(physicalRoot);
            using var physical = new PhysicalFileProvider(physicalRoot);
            var environment = new Mock<IWebHostEnvironment>();
            environment.SetupGet(value => value.ApplicationName).Returns(typeof(Program).Assembly.GetName().Name!);
            environment.SetupGet(value => value.EnvironmentName).Returns(Environments.Development);
            environment.SetupGet(value => value.ContentRootPath).Returns(physicalRoot);
            environment.SetupGet(value => value.ContentRootFileProvider).Returns(physical);
            environment.SetupGet(value => value.WebRootPath).Returns(string.Empty);
            environment.SetupGet(value => value.WebRootFileProvider).Returns(new NullFileProvider());
            var collector = new CollectingProvider();
            using var loggerFactory = LoggerFactory.Create(builder => builder.ClearProviders()
                .SetMinimumLevel(LogLevel.Warning).AddProvider(collector));
            var services = new ServiceCollection();
            services.AddSingleton(environment.Object);
            services.AddSingleton<IHostEnvironment>(environment.Object);
            services.AddSingleton<ILoggerFactory>(loggerFactory);
            services.AddLogging();
            services.AddRazorPages(options => options.RootDirectory = fixture.RootDirectory)
                .AddRazorRuntimeCompilation();
            using var serviceProvider = services.BuildServiceProvider();
            var providers = serviceProvider.GetServices<IPageRouteModelProvider>().ToArray();
            var provider = providers.Single(value => value.GetType().FullName ==
                "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RazorProjectPageRouteModelProvider");
            var fileSystem = serviceProvider.GetRequiredService<RazorProjectFileSystem>();
            Require(fileSystem.GetType().FullName ==
                "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystem",
                "ActualPublicRegistrationResolvesNativeFileProviderRazorProjectFileSystemAndRouteProvider");
            var areas = fileSystem.EnumerateItems("/Areas").Select(Item).ToArray();
            var pages = fileSystem.EnumerateItems(fixture.RootDirectory).Select(Item).ToArray();
            Require(areas.Length == fixture.ExpectedAreaItems && pages.Length == fixture.ExpectedPageItems,
                "ActualPhysicalRazorFileEnumerationCountsMatchFrozenInputs");
            Require(areas.Concat(pages).All(value => value.Exists &&
                value.CombinedPath.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase) &&
                beforeFiles.Any(file => string.Equals(file.Path, value.CombinedPath, StringComparison.OrdinalIgnoreCase))),
                "ActualRazorItemsExistAndComeFromOwnedPhysicalCshtmlFilesNotInjectedRows");
            var context = new PageRouteModelProviderContext();

            provider.OnProvidersExecuting(context);

            var firstModels = context.RouteModels.ToArray();
            var snapshots = firstModels.Select(Snapshot).ToArray();
            Require(firstModels.Length == fixture.Models.Length,
                "NativeProviderProducesExactFrozenModelCardinality");
            Require(snapshots.Select(value => value.RelativePath).Distinct(StringComparer.OrdinalIgnoreCase).Count() ==
                snapshots.Length, "OverlappingAreaAndRootEnumerationsDoNotDuplicatePhysicalRelativePaths");
            foreach (var expected in fixture.Models)
            {
                var matching = snapshots.Where(value => value.RelativePath == expected.RelativePath).ToArray();
                Require(matching.Length == 1, "ActualModelPresentOnce:" + expected.RelativePath);
                Require(JsonSerializer.Serialize(matching[0]) == JsonSerializer.Serialize(expected),
                    "ActualModelValuesAndSelectorsMatch:" + expected.RelativePath);
            }

            var areaSet = fixture.Models.Where(value => value.AreaName is not null)
                .Select(value => value.RelativePath).ToHashSet(StringComparer.Ordinal);
            var normalSet = fixture.Models.Where(value => value.AreaName is null)
                .Select(value => value.RelativePath).ToHashSet(StringComparer.Ordinal);
            var expectedOrder = areas.Where(value => areaSet.Contains(value.CombinedPath))
                .Concat(pages.Where(value => normalSet.Contains(value.CombinedPath)))
                .Select(value => value.CombinedPath);
            Require(snapshots.Select(value => value.RelativePath).SequenceEqual(expectedOrder),
                "ActualAreaModelsPrecedeNormalModelsInTheirRealFilesystemEnumerationOrder");
            Require(collector.Entries.Count(value => value.EventId == 1) == fixture.ExpectedUnsupportedAreaWarnings &&
                collector.Entries.Count(value => value.EventId == 104) == fixture.ExpectedMalformedWarnings &&
                collector.Entries.Count == fixture.ExpectedUnsupportedAreaWarnings + fixture.ExpectedMalformedWarnings,
                "ActualFirstPassUnsupportedAreaAndMalformedDirectiveDiagnosticsMatchFrozenCase");
            var firstLogs = collector.Entries.ToArray();

            provider.OnProvidersExecuted(context);

            Require(context.RouteModels.SequenceEqual(firstModels),
                "ActualExecutedHookPreservesProducedModelReferencesAndOrder");

            provider.OnProvidersExecuting(context);

            Require(context.RouteModels.SequenceEqual(firstModels) &&
                JsonSerializer.Serialize(context.RouteModels.Select(Snapshot)) == JsonSerializer.Serialize(snapshots),
                "ActualSecondDiscoveryPreservesExistingNativeProducedModelsAndSelectorValues");
            Require(JsonSerializer.Serialize(FileInventory(physicalRoot)) == JsonSerializer.Serialize(beforeFiles),
                "ActualDiscoveryDoesNotMutateOwnedPhysicalFixtureFiles");
            rows.Add(new
            {
                name = fixture.Name,
                actualStatus = "PASS",
                actualChecks = checks,
                actualPhysicalFiles = beforeFiles,
                actualAreaRazorItems = areas,
                actualNormalRazorItems = pages,
                actualModels = snapshots,
                actualFirstPassLogs = firstLogs,
                actualAllPassLogs = collector.Entries,
                actualRegisteredProviders = providers.Select(value => new
                {
                    type = value.GetType().FullName,
                    order = value.Order,
                    invokedByThisProbe = ReferenceEquals(value, provider)
                }).ToArray(),
                actualNativeProvider = Image(provider.GetType().Assembly),
                actualNativeFactoryModels = Image(typeof(PageRouteModel).Assembly),
                actualNativePhysicalFileProvider = Image(typeof(PhysicalFileProvider).Assembly)
            });
        }

        Console.WriteLine(JsonSerializer.Serialize(new
        {
            actualStatus = "PASS",
            actualRole = args[0],
            actualPid = Environment.ProcessId,
            actualRuntime = RuntimeInformation.FrameworkDescription,
            actualFixturePlanSha256 = Convert.ToHexString(SHA256.HashData(planBytes)),
            actualCoreLibrary = Image(typeof(object).Assembly),
            actualConsumer = Image(typeof(Program).Assembly),
            actualRows = rows,
            actualLoadedManagedImages = AppDomain.CurrentDomain.GetAssemblies()
                .Where(value => !value.IsDynamic && value.Location.Length != 0)
                .OrderBy(value => value.GetName().Name, StringComparer.Ordinal).Select(Image).ToArray(),
            actualDynamicAssemblyNamesExcludedFromFileInventory = AppDomain.CurrentDomain.GetAssemblies()
                .Where(value => value.IsDynamic).Select(value => value.FullName).ToArray(),
            actualRealPhysicalFileProviderNativeRazorDirectiveFactoryAndPublicRegistrationExecuted = true,
            actualOtherRegisteredProvidersNotInvokedByThisProbe = true,
            actualCompiledPageProducerCaseInsensitiveCompiledModelOverlapAndEndpointHttpBoundaryNotEstablished = true,
            actualRealPhysicalCaseVariantRootOverlapFixtureIncluded = true,
            actualNoCandidateTimingAllocationCounterOrPerformanceAuthorization = true
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    private static Model Snapshot(PageRouteModel model) => new(model.RelativePath, model.ViewEnginePath, model.AreaName,
        model.RouteValues.OrderBy(value => value.Key, StringComparer.Ordinal)
            .Select(value => new RouteValue(value.Key, value.Value)).ToArray(),
        model.Selectors.Select(selector =>
        {
            var route = selector.AttributeRouteModel
                ?? throw new InvalidOperationException("A native page selector has no attribute route.");
            var metadata = selector.EndpointMetadata.OfType<PageRouteMetadata>().Single();
            return new Selector(route.Template, route.SuppressLinkGeneration, route.SuppressPathMatching,
                route.Name, route.Order, metadata.PageRoute, metadata.RouteTemplate);
        }).ToArray());

    private static ItemInfo Item(RazorProjectItem item) => new(item.CombinedPath, item.BasePath, item.FilePath,
        item.Exists, item.PhysicalPath);

    private static FileInfo[] FileInventory(string root) => Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
        .Select(file => new FileInfo("/" + Path.GetRelativePath(root, file).Replace('\\', '/'),
            Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)))))
        .OrderBy(value => value.Path, StringComparer.Ordinal).ToArray();

    private static object Image(Assembly assembly) => new
    {
        fullName = assembly.FullName,
        location = assembly.Location,
        mvid = assembly.ManifestModule.ModuleVersionId,
        sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
    };

    private sealed record FixturePlan(string Name, string RootDirectory, int ExpectedAreaItems, int ExpectedPageItems,
        int ExpectedUnsupportedAreaWarnings, int ExpectedMalformedWarnings, Model[] Models);
    private sealed record Model(string RelativePath, string ViewEnginePath, string? AreaName, RouteValue[] RouteValues,
        Selector[] Selectors);
    private sealed record RouteValue(string Key, string? Value);
    private sealed record Selector(string? Template, bool SuppressLinkGeneration, bool SuppressPathMatching,
        string? Name, int? Order, string PageRoute, string? RouteTemplate);
    private sealed record ItemInfo(string CombinedPath, string BasePath, string FilePath, bool Exists, string? PhysicalPath);
    private sealed record FileInfo(string Path, string Sha256);
    private sealed record Entry(string Category, LogLevel Level, int EventId, string? EventName, string Message);

    private sealed class CollectingProvider : ILoggerProvider
    {
        public List<Entry> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CollectingLogger(categoryName, Entries);

        public void Dispose()
        {
        }
    }

    private sealed class CollectingLogger(string category, List<Entry> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            entries.Add(new Entry(category, logLevel, eventId.Id, eventId.Name, formatter(state, exception)));
        }
    }
}
