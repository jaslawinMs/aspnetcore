using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

internal static class Program
{
    private const string EndpointKey = "__EndpointRouteBuilder";
    private const string ResolverKey = "__ResourceCollectionResolver";
    private const string ViewPath = "/Views/Rzc/View.cshtml";
    private const string Manifest = "F176-private-absent.staticwebassets.endpoints.json";
    private static readonly List<CaseRow> Rows = [];

    public static async Task<int> Main(string[] args)
    {
        var role = args[0];
        var output = args[1];
        var identityOutput = args[2];
        var assetPath = Path.GetFullPath(args[3]);
        string? failure = null;
        try
        {
            Run("F176", "MapControllers_RealRegistration_ReusesDefaultBuilderAndItems", Controllers);
            Run("F177", "MapDefaultControllerRoute_RepeatedRoutes_ReturnFreshRouteBuilders", DefaultRoute);
            Run("F178", "MapControllerRoute_NamedRoutes_KeepGlobalAndRouteConventions", NamedRoutes);
            Run("F176", "MapControllers_SharedDataSource_PreservesFirstRealBuilder", row => SharedSource(row, "F176"));
            Run("F177", "MapDefaultControllerRoute_SharedDataSource_PreservesFirstRealBuilder", row => SharedSource(row, "F177"));
            Run("F178", "MapControllerRoute_SharedDataSource_PreservesFirstRealBuilder", row => SharedSource(row, "F178"));
            var asset = AssemblyLoadContext.Default.LoadFromAssemblyPath(assetPath);
            await RunAsync("F179", "NativePrecompiledViews_CompilerCache_Case_Normalization_Miss_AndPageFactory", row => NativeViews(row, asset));
            var firstContext = new AssemblyLoadContext("F179-native-first", isCollectible: true);
            var secondContext = new AssemblyLoadContext("F179-native-second", isCollectible: true);
            try
            {
                var first = firstContext.LoadFromAssemblyPath(assetPath);
                var second = secondContext.LoadFromAssemblyPath(assetPath);
                await RunAsync("F179", "NativePrecompiledParts_DuplicatePaths_FirstPartWins_Forward", row => DuplicateParts(row, first, second));
                await RunAsync("F179", "NativePrecompiledParts_DuplicatePaths_FirstPartWins_Reversed", row => DuplicateParts(row, second, first));
            }
            finally
            {
                firstContext.Unload();
                secondContext.Unload();
            }
        }
        catch (Exception exception)
        {
            failure = exception.ToString();
        }

        var result = new
        {
            role,
            exitCode = failure is null ? 0 : 1,
            failure,
            ownerCore = Identity.Inspect(typeof(ControllerEndpointRouteBuilderExtensions).Assembly),
            ownerRazor = Identity.Inspect(typeof(IViewCompiler).Assembly),
            downstream = Identity.Inspect(typeof(ControllerActionEndpointConventionBuilderResourceCollectionExtensions).Assembly),
            consumer = Identity.Inspect(typeof(Program).Assembly),
            coreLib = Identity.Inspect(typeof(object).Assembly),
            nativeAsset = new { path = assetPath, sha256 = Identity.Hash(assetPath), bytes = new FileInfo(assetPath).Length },
            rows = Rows,
            boundary = "Untimed bounded startup/initialization scenarios, not application cardinality/frequency evidence. Real public MVC service/endpoint/part/compiler/page-factory producers. Internal state is read only by reflection, never replaced or populated privately. No HTTP hosting/request execution or hot-reload claim."
        };
        Identity.WriteAtomic(output, result);
        Identity.WriteAtomic(identityOutput, Identity.Snapshot("supplemental-completed"));
        Console.WriteLine(JsonSerializer.Serialize(new { role, result.exitCode, rows = Rows.Count, checks = Rows.Sum(row => row.Checks.Count) }));
        return result.exitCode;
    }

    private static void Run(string finding, string name, Action<CaseRow> body)
    {
        var row = new CaseRow(finding, name);
        Rows.Add(row);
        body(row);
        row.Outcome = "Passed";
    }

    private static async Task RunAsync(string finding, string name, Func<CaseRow, Task> body)
    {
        var row = new CaseRow(finding, name);
        Rows.Add(row);
        await body(row);
        row.Outcome = "Passed";
    }

    private static ServiceCollection Services()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IWebHostEnvironment>(new ProbeEnvironment());
        services.AddSingleton(new DiagnosticListener("Microsoft.AspNetCore"));
        services.AddSingleton<DiagnosticSource>(provider => provider.GetRequiredService<DiagnosticListener>());
        return services;
    }

    private static ServiceProvider ControllerServices()
    {
        var services = Services();
        var mvc = services.AddControllersWithViews();
        mvc.PartManager.ApplicationParts.Clear();
        mvc.PartManager.ApplicationParts.Add(new AssemblyPart(typeof(HomeController).Assembly));
        return services.BuildServiceProvider();
    }

    private static IApplicationBuilder Configure(ServiceProvider services, Action<IEndpointRouteBuilder> configure)
    {
        IApplicationBuilder app = new ApplicationBuilder(services);
        app.UseRouting();
        app.UseEndpoints(configure);
        return app;
    }

    private static EndpointDataSource Source(IEndpointRouteBuilder endpoints)
    {
        return endpoints.DataSources.Single(source => source.GetType().FullName == "Microsoft.AspNetCore.Mvc.Routing.ControllerActionEndpointDataSource");
    }

    private static ControllerActionEndpointConventionBuilder DefaultBuilder(IEndpointRouteBuilder endpoints)
    {
        return (ControllerActionEndpointConventionBuilder)Source(endpoints).GetType().GetProperty("DefaultBuilder")!.GetValue(Source(endpoints))!;
    }

    private static Dictionary<string, object> Items(ControllerActionEndpointConventionBuilder builder)
    {
        return (Dictionary<string, object>)typeof(ControllerActionEndpointConventionBuilder)
            .GetProperty("Items", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(builder)!;
    }

    private static void ItemsContract(CaseRow row, ControllerActionEndpointConventionBuilder builder, IEndpointRouteBuilder firstOwner)
    {
        var items = Items(builder);
        row.Check("ConcreteNativeItemsDictionary", items.GetType() == typeof(Dictionary<string, object>), new { type = items.GetType().FullName });
        row.Check("DefaultStringComparerCaseSensitive", !items.Comparer.Equals(EndpointKey, EndpointKey.ToUpperInvariant()),
            new { comparer = items.Comparer.GetType().FullName, lowerCasePresent = items.ContainsKey(EndpointKey.ToLowerInvariant()) });
        row.Check("FirstRealEndpointBuilderIdentityRetained", ReferenceEquals(items[EndpointKey], firstOwner),
            new { valueType = items[EndpointKey].GetType().FullName, endpointBuilderType = firstOwner.GetType().FullName });
    }

    private static void ControllerDescriptors(CaseRow row, ServiceProvider services)
    {
        var actions = services.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items
            .Cast<ControllerActionDescriptor>().ToArray();
        row.Check("RealControllerActionDiscovery", actions.Length == 2 &&
            actions.Any(action => action.ControllerTypeInfo.AsType() == typeof(HomeController) && action.MethodInfo.Name == nameof(HomeController.Index)) &&
            actions.Any(action => action.ControllerTypeInfo.AsType() == typeof(AttributeProbeController) && action.MethodInfo.Name == nameof(AttributeProbeController.Ping)),
            new { actions = actions.Select(action => new { type = action.ControllerTypeInfo.FullName, method = action.MethodInfo.Name, attributeRoute = action.AttributeRouteInfo?.Template }).ToArray() });
    }

    private static void Controllers(CaseRow row)
    {
        using var services = ControllerServices();
        IEndpointRouteBuilder? endpoints = null;
        ControllerActionEndpointConventionBuilder? initial = null;
        Configure(services, routes =>
        {
            endpoints = routes;
            initial = routes.MapControllers();
            var items = Items(initial);
            row.Check("InitialSingleDataSourceAndItem", routes.DataSources.Count == 1 && items.Count == 1);
            ItemsContract(row, initial, routes);
            row.Check("RepeatedMappingReturnsSameDefaultBuilder", ReferenceEquals(initial, routes.MapControllers()));
            row.Check("ItemsObjectRetained", ReferenceEquals(items, Items(routes.MapControllers())));
            initial.WithStaticAssets(Manifest);
            var resolver = items[ResolverKey];
            routes.MapControllers().WithStaticAssets(Manifest);
            row.Check("RealDownstreamResolverSentinelRetained", ReferenceEquals(resolver, items[ResolverKey]) && items.Count == 2);
            var captured = resolver.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic)
                .Single(field => field.FieldType == typeof(IEndpointRouteBuilder)).GetValue(resolver);
            row.Check("DownstreamCapturedOriginalEndpointBuilder", ReferenceEquals(captured, routes));
        });
        ControllerDescriptors(row, services);
        var produced = Source(endpoints!).Endpoints;
        var actionEndpoint = produced.Single();
        row.Check("AttributeEndpointMaterialized", actionEndpoint is RouteEndpoint route &&
            route.RoutePattern.RawText == "probe/attribute" &&
            actionEndpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.MethodInfo.Name == nameof(AttributeProbeController.Ping),
            EndpointRows(produced));
        row.Check("RealWithStaticAssetsConsumerMaterializedMetadata",
            actionEndpoint.Metadata.GetMetadata<ResourceAssetCollection>() is { Count: 0 } &&
            actionEndpoint.Metadata.GetOrderedMetadata<ResourceAssetCollection>().Count == 1);
        row.Check("DefaultBuilderStillOwnedByDataSource", ReferenceEquals(DefaultBuilder(endpoints!), initial));
    }

    private static void DefaultRoute(CaseRow row)
    {
        using var services = ControllerServices();
        IEndpointRouteBuilder? endpoints = null;
        Configure(services, routes =>
        {
            endpoints = routes;
            var first = routes.MapDefaultControllerRoute();
            var owner = DefaultBuilder(routes);
            var items = Items(owner);
            ItemsContract(row, owner, routes);
            var second = routes.MapDefaultControllerRoute();
            row.Check("RepeatedMappingReusesDataSourceAndDefaultItems", routes.DataSources.Count == 1 &&
                ReferenceEquals(owner, DefaultBuilder(routes)) && ReferenceEquals(items, Items(owner)) && items.Count == 1);
            row.Check("ReturnedRouteBuildersAreDistinctFromDefault", !ReferenceEquals(first, second) &&
                !ReferenceEquals(first, owner) && !ReferenceEquals(second, owner));
            row.Check("ReturnedRouteBuilderItemsAreEmptyAndDistinct", Items(first).Count == 0 && Items(second).Count == 0 &&
                !ReferenceEquals(Items(first), Items(second)) && !ReferenceEquals(Items(first), items));
            first.WithStaticAssets(Manifest);
            row.Check("RouteSpecificWithStaticAssetsDoesNotFindDefaultItem", Items(first).Count == 0 && items.Count == 1);
            first.Add(builder => builder.Metadata.Add(new Marker("route-first")));
            second.Add(builder => builder.Metadata.Add(new Marker("route-second")));
            owner.Add(builder => builder.Metadata.Add(new Marker("global")));
            row.Check("MapControllersReturnsAlreadyOwnedDefault", ReferenceEquals(routes.MapControllers(), owner));
            ItemsContract(row, owner, routes);
        });
        ControllerDescriptors(row, services);
        var produced = Source(endpoints!).Endpoints;
        var matching = produced.Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.MethodInfo.DeclaringType == typeof(HomeController)).ToArray();
        row.Check("TwoDefaultRouteActionEndpointsMaterialized", matching.Length == 2 &&
            matching.OfType<RouteEndpoint>().All(endpoint => endpoint.RoutePattern.RawText == "{controller=Home}/{action=Index}/{id?}"),
            EndpointRows(produced));
        row.Check("DistinctReturnedBuildersDriveOwnEndpointConventions", matching.Any(endpoint => Markers(endpoint).SequenceEqual(["global", "route-first"])) &&
            matching.Any(endpoint => Markers(endpoint).SequenceEqual(["global", "route-second"])),
            matching.Select(endpoint => Markers(endpoint)).ToArray());
        row.Check("AttributeAndLinkGenerationEndpointsRetained", produced.Count == 5 &&
            produced.Count(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is null) == 2);
        row.Check("RouteSpecificStaticAssetCallHasNoEndpointMetadata", produced.All(endpoint => endpoint.Metadata.GetMetadata<ResourceAssetCollection>() is null));
    }

    private static void NamedRoutes(CaseRow row)
    {
        using var services = ControllerServices();
        IEndpointRouteBuilder? endpoints = null;
        Configure(services, routes =>
        {
            endpoints = routes;
            var first = routes.MapControllerRoute("first", "first/{controller=Home}/{action=Index}/{id?}");
            var owner = DefaultBuilder(routes);
            var items = Items(owner);
            ItemsContract(row, owner, routes);
            var second = routes.MapControllerRoute("second", "second/{controller=Home}/{action=Index}/{id?}");
            row.Check("NamedMappingsReuseDefaultAndItems", routes.DataSources.Count == 1 &&
                ReferenceEquals(owner, DefaultBuilder(routes)) && ReferenceEquals(items, Items(owner)) && items.Count == 1);
            row.Check("NamedRouteBuildersAndItemsDistinct", !ReferenceEquals(first, second) && !ReferenceEquals(first, owner) &&
                Items(first).Count == 0 && Items(second).Count == 0 && !ReferenceEquals(Items(first), Items(second)));
            first.Add(builder => builder.Metadata.Add(new Marker("route-first")));
            second.Add(builder => builder.Metadata.Add(new Marker("route-second")));
            owner.Add(builder => builder.Metadata.Add(new Marker("global")));
            owner.WithStaticAssets(Manifest);
            var resolver = items[ResolverKey];
            row.Check("AdditionalMappingRetainsExistingRealSentinels", ReferenceEquals(owner, routes.MapControllers()) &&
                ReferenceEquals(items[EndpointKey], routes) && ReferenceEquals(resolver, items[ResolverKey]) && items.Count == 2);
        });
        ControllerDescriptors(row, services);
        var produced = Source(endpoints!).Endpoints;
        var matching = produced.Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.MethodInfo.DeclaringType == typeof(HomeController)).ToArray();
        row.Check("NamedControllerRouteEndpointsMaterialized", matching.Length == 2 &&
            matching.OfType<RouteEndpoint>().Select(endpoint => endpoint.RoutePattern.RawText).OrderBy(value => value, StringComparer.Ordinal)
                .SequenceEqual(["first/{controller=Home}/{action=Index}/{id?}", "second/{controller=Home}/{action=Index}/{id?}"]),
            EndpointRows(produced));
        row.Check("NamedRouteConventionsAndGlobalConventionBothConsumed", matching.Any(endpoint => Markers(endpoint).SequenceEqual(["global", "route-first"])) &&
            matching.Any(endpoint => Markers(endpoint).SequenceEqual(["global", "route-second"])),
            matching.Select(endpoint => Markers(endpoint)).ToArray());
        row.Check("NamedLinkAndAttributeEndpointsRetained", produced.Count == 5 &&
            produced.Count(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is null) == 2);
        row.Check("DefaultItemsEnableRealDownstreamForAllEndpoints", produced.All(endpoint =>
            endpoint.Metadata.GetMetadata<ResourceAssetCollection>() is { Count: 0 } &&
            endpoint.Metadata.GetOrderedMetadata<ResourceAssetCollection>().Count == 1));
    }

    private static ControllerActionEndpointConventionBuilder Map(IEndpointRouteBuilder routes, string finding)
    {
        return finding switch
        {
            "F176" => routes.MapControllers(),
            "F177" => routes.MapDefaultControllerRoute(),
            "F178" => routes.MapControllerRoute("shared", "shared/{controller=Home}/{action=Index}/{id?}"),
            _ => throw new InvalidOperationException(finding)
        };
    }

    private static void SharedSource(CaseRow row, string finding)
    {
        using var services = ControllerServices();
        IEndpointRouteBuilder? firstRoutes = null;
        IEndpointRouteBuilder? secondRoutes = null;
        EndpointDataSource? nativeSource = null;
        ControllerActionEndpointConventionBuilder? owner = null;
        object? resolver = null;
        Configure(services, routes =>
        {
            firstRoutes = routes;
            Map(routes, finding);
            nativeSource = Source(routes);
            owner = DefaultBuilder(routes);
            owner.WithStaticAssets(Manifest);
            resolver = Items(owner)[ResolverKey];
        });
        Configure(services, routes =>
        {
            secondRoutes = routes;
            routes.DataSources.Add(nativeSource!);
            Map(routes, finding);
            row.Check("DistinctRealEndpointBuildersSharePubliclyRegisteredNativeDataSource",
                !ReferenceEquals(routes, firstRoutes) && ReferenceEquals(Source(routes), nativeSource) &&
                ReferenceEquals(DefaultBuilder(routes), owner),
                new { first = firstRoutes!.GetType().FullName, second = routes.GetType().FullName, topology = "Explicit bounded public DataSources sharing, not a prevalence claim." });
            ItemsContract(row, owner!, firstRoutes!);
            row.Check("ExistingValueNotOverwrittenBySecondRealBuilder", !ReferenceEquals(Items(owner!)[EndpointKey], routes));
            row.Check("ExistingRealResolverSentinelRetained", ReferenceEquals(Items(owner!)[ResolverKey], resolver) && Items(owner!).Count == 2);
            owner!.WithStaticAssets(Manifest);
            var captured = resolver!.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic)
                .Single(field => field.FieldType == typeof(IEndpointRouteBuilder)).GetValue(resolver);
            row.Check("DownstreamStillCapturesFirstRealBuilder", ReferenceEquals(captured, firstRoutes));
        });
        ControllerDescriptors(row, services);
        var produced = Source(secondRoutes!).Endpoints;
        row.Check("SharedSourceEndpointsUseRetainedDownstream", produced.Count == (finding == "F176" ? 1 : 5) &&
            produced.All(endpoint => endpoint.Metadata.GetMetadata<ResourceAssetCollection>() is { Count: 0 }),
            EndpointRows(produced));
    }

    private static string[] Markers(Microsoft.AspNetCore.Http.Endpoint endpoint)
    {
        return endpoint.Metadata.GetOrderedMetadata<Marker>().Select(marker => marker.Name).OrderBy(name => name, StringComparer.Ordinal).ToArray();
    }

    private static object EndpointRows(IReadOnlyList<Microsoft.AspNetCore.Http.Endpoint> endpoints)
    {
        return endpoints.Select(endpoint => new
        {
            endpoint.DisplayName,
            pattern = (endpoint as RouteEndpoint)?.RoutePattern.RawText,
            order = (endpoint as RouteEndpoint)?.Order,
            action = endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.MethodInfo.Name,
            routeName = endpoint.Metadata.GetMetadata<IRouteNameMetadata>()?.RouteName,
            markers = Markers(endpoint),
            resourceMetadata = endpoint.Metadata.GetOrderedMetadata<ResourceAssetCollection>().Count
        }).ToArray();
    }

    private static ApplicationPart[] NativeParts(Assembly assembly)
    {
        return ApplicationPartFactory.GetApplicationPartFactory(assembly).GetApplicationParts(assembly).ToArray();
    }

    private static ServiceProvider RazorServices(params Assembly[] assemblies)
    {
        var services = Services();
        var mvc = services.AddMvcCore().AddRazorViewEngine();
        mvc.PartManager.ApplicationParts.Clear();
        foreach (var assembly in assemblies)
        {
            foreach (var part in NativeParts(assembly))
            {
                mvc.PartManager.ApplicationParts.Add(part);
            }
        }

        return services.BuildServiceProvider();
    }

    private static Dictionary<string, Task<CompiledViewDescriptor>> CompiledViews(IViewCompiler compiler)
    {
        return (Dictionary<string, Task<CompiledViewDescriptor>>)compiler.GetType()
            .GetProperty("CompiledViews", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(compiler)!;
    }

    private static async Task NativeViews(CaseRow row, Assembly asset)
    {
        using var services = RazorServices(asset);
        var parts = NativeParts(asset);
        row.Check("NativeAssemblyFactoryProducesCompiledRazorPart", parts is [CompiledRazorAssemblyPart],
            new { factory = ApplicationPartFactory.GetApplicationPartFactory(asset).GetType().FullName, asset = Identity.Inspect(asset), partTypes = parts.Select(part => part.GetType().FullName).ToArray() });
        var feature = new ViewsFeature();
        services.GetRequiredService<ApplicationPartManager>().PopulateFeature(feature);
        row.Check("NativeLoaderAndFeatureProduceThreeUniqueAssetPaths", feature.ViewDescriptors.Count == 3 &&
            feature.ViewDescriptors.Select(view => view.RelativePath).Distinct(StringComparer.OrdinalIgnoreCase).Count() == 3 &&
            feature.ViewDescriptors.All(view => view.Item is not null && view.Type!.Assembly == asset),
            feature.ViewDescriptors.Select(view => new { view.RelativePath, type = view.Type!.FullName }).ToArray());
        var provider = services.GetRequiredService<IViewCompilerProvider>();
        var compiler = provider.GetCompiler();
        row.Check("RealSingletonDefaultCompilerAndProvider", compiler.GetType().FullName == "Microsoft.AspNetCore.Mvc.Razor.Compilation.DefaultViewCompiler" &&
            ReferenceEquals(provider, services.GetRequiredService<IViewCompilerProvider>()) && ReferenceEquals(compiler, provider.GetCompiler()));
        var compiled = CompiledViews(compiler);
        row.Check("ConcreteCacheHasOrdinalIgnoreCaseComparer", compiled.GetType() == typeof(Dictionary<string, Task<CompiledViewDescriptor>>) &&
            ReferenceEquals(compiled.Comparer, StringComparer.OrdinalIgnoreCase) && compiled.Count == 3,
            new { type = compiled.GetType().FullName, comparer = compiled.Comparer.GetType().FullName, count = compiled.Count });
        var task = compiler.CompileAsync(ViewPath);
        var descriptor = await task;
        row.Check("NativeDescriptorAndCachedTaskIdentity", ReferenceEquals(task, compiled[ViewPath]) &&
            ReferenceEquals(descriptor, compiled[ViewPath].Result) && descriptor.Type!.Assembly == asset && descriptor.RelativePath == ViewPath);
        row.Check("LowercaseLookupReturnsSameTaskAndDescriptor", ReferenceEquals(task, compiler.CompileAsync("/views/rzc/view.cshtml")) &&
            ReferenceEquals(descriptor, await compiler.CompileAsync("/views/rzc/view.cshtml")));
        row.Check("UppercaseLookupReturnsSameTaskAndDescriptor", ReferenceEquals(task, compiler.CompileAsync("/VIEWS/RZC/VIEW.CSHTML")) &&
            ReferenceEquals(descriptor, await compiler.CompileAsync("/VIEWS/RZC/VIEW.CSHTML")));
        row.Check("NonNormalizedBackslashLookupReturnsSameTask", ReferenceEquals(task, compiler.CompileAsync("Views\\Rzc\\View.cshtml")));
        var factoryResult = services.GetRequiredService<IRazorPageFactoryProvider>().CreateFactory("~/Views/Rzc/View.cshtml");
        row.Check("RealPageFactoryConsumesExactNativeDescriptor", factoryResult.Success && ReferenceEquals(factoryResult.ViewDescriptor, descriptor));
        var page = factoryResult.RazorPageFactory!();
        row.Check("FactoryCreatesNativePageWithCanonicalPath", page.GetType() == descriptor.Type && page.Path == ViewPath);
        using var writer = new StringWriter();
        page.ViewContext = new ViewContext { Writer = writer };
        await page.ExecuteAsync();
        row.Check("NativePrecompiledViewExecutesActualLiteral", writer.ToString() == "Hello from buildtime-compiled rzc view!",
            new { output = writer.ToString(), pageType = page.GetType().FullName });
        var missingTask = compiler.CompileAsync("missing\\not-found.cshtml");
        var missing = await missingTask;
        row.Check("MissingViewHasNormalizedPathNullTypeAndNoExpiration", missing.RelativePath == "/missing/not-found.cshtml" &&
            missing.Type is null && missing.Item is null && missing.ExpirationTokens is { Count: 0 });
        row.Check("MissingViewIsNotInsertedIntoCompiledDictionary", compiled.Count == 3 &&
            !compiled.ContainsKey("/missing/not-found.cshtml") && !ReferenceEquals(missingTask, compiler.CompileAsync("missing\\not-found.cshtml")));
        row.Check("ExistingNativeCacheIdentityStillRetained", ReferenceEquals(compiled, CompiledViews(compiler)) &&
            ReferenceEquals(task, compiler.CompileAsync(ViewPath)));
    }

    private static async Task DuplicateParts(CaseRow row, Assembly first, Assembly second)
    {
        row.Check("DistinctNativeAssemblyContextsSamePEBytesAndTypeNames", !ReferenceEquals(first, second) &&
            first.ManifestModule.ModuleVersionId == second.ManifestModule.ModuleVersionId &&
            Identity.Hash(first.Location) == Identity.Hash(second.Location),
            new { first = Identity.Inspect(first), second = Identity.Inspect(second) });
        using var services = RazorServices(first, second);
        var manager = services.GetRequiredService<ApplicationPartManager>();
        var feature = new ViewsFeature();
        manager.PopulateFeature(feature);
        row.Check("RealNativePartProducerAllowsCrossPartDuplicatePaths", manager.ApplicationParts.Count == 2 &&
            feature.ViewDescriptors.Count == 6 &&
            feature.ViewDescriptors.GroupBy(view => view.RelativePath, StringComparer.OrdinalIgnoreCase).All(group => group.Count() == 2),
            feature.ViewDescriptors.Select(view => new { view.RelativePath, context = AssemblyLoadContext.GetLoadContext(view.Type!.Assembly)!.Name }).ToArray());
        var compiler = services.GetRequiredService<IViewCompilerProvider>().GetCompiler();
        var compiled = CompiledViews(compiler);
        row.Check("CompilerCollapsesNativeCrossPartPathsToThree", compiled.Count == 3);
        var task = compiler.CompileAsync(ViewPath);
        var descriptor = await task;
        row.Check("FirstRealNativePartWinsByActualTypeIdentity", descriptor.Type!.Assembly == first &&
            descriptor.Type.Assembly != second && ReferenceEquals(task, compiled[ViewPath]),
            new { winningContext = AssemblyLoadContext.GetLoadContext(descriptor.Type.Assembly)!.Name, path = descriptor.RelativePath });
        row.Check("DuplicatePathCaseAndNormalizationReuseWinningTask", ReferenceEquals(task, compiler.CompileAsync("views\\rzc\\view.cshtml")) &&
            ReferenceEquals(descriptor, await compiler.CompileAsync("/VIEWS/RZC/VIEW.CSHTML")));
        var factory = services.GetRequiredService<IRazorPageFactoryProvider>().CreateFactory(ViewPath);
        var page = factory.RazorPageFactory!();
        row.Check("DownstreamPageFactoryUsesFirstNativePart", factory.Success && ReferenceEquals(factory.ViewDescriptor, descriptor) &&
            page.GetType().Assembly == first && page.Path == ViewPath);
        using var writer = new StringWriter();
        page.ViewContext = new ViewContext { Writer = writer };
        await page.ExecuteAsync();
        row.Check("WinningNativePrecompiledViewExecutesLiteral", writer.ToString() == "Hello from buildtime-compiled rzc view!", new { output = writer.ToString() });
    }

    private sealed record Marker(string Name);

    private sealed class ProbeEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = typeof(Program).Assembly.GetName().Name!;
        public string EnvironmentName { get; set; } = "Production";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}

public sealed class HomeController : ControllerBase
{
    public string Index() => "home";
}

[Route("probe/attribute")]
public sealed class AttributeProbeController : ControllerBase
{
    [HttpGet]
    public string Ping() => "attribute";
}

internal sealed class CaseRow(string finding, string name)
{
    public string Finding { get; } = finding;
    public string Name { get; } = name;
    public string Outcome { get; set; } = "Failed";
    public List<object> Checks { get; } = [];

    public void Check(string name, bool passed, object? observed = null)
    {
        Checks.Add(new { name, passed, observed });
        if (!passed)
        {
            throw new InvalidOperationException($"{Name}: {name}");
        }
    }
}

internal static class Identity
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
    private static int _sequence;

    public static string Hash(string filename)
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(filename)));
    }

    public static object Inspect(Assembly assembly)
    {
        var location = assembly.IsDynamic ? "" : assembly.Location;
        return new
        {
            name = assembly.GetName().Name,
            fullName = assembly.FullName,
            mvid = assembly.ManifestModule.ModuleVersionId.ToString(),
            location,
            loadContext = AssemblyLoadContext.GetLoadContext(assembly)?.Name,
            bytes = location.Length == 0 ? (long?)null : new FileInfo(location).Length,
            sha256 = location.Length == 0 ? null : Hash(location)
        };
    }

    public static object Snapshot(string phase)
    {
        using var process = Process.GetCurrentProcess();
        var nativeNames = new[] { "coreclr.dll", "hostpolicy.dll", "hostfxr.dll" };
        return new
        {
            phase,
            processId = process.Id,
            processCreationUtc = process.StartTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.ffffffZ"),
            observedAtUtc = DateTime.UtcNow.ToString("o"),
            runtime = RuntimeInformation.FrameworkDescription,
            coreLib = Inspect(typeof(object).Assembly),
            assemblies = AppDomain.CurrentDomain.GetAssemblies().OrderBy(assembly => assembly.FullName, StringComparer.Ordinal).Select(Inspect).ToArray(),
            nativeModules = process.Modules.Cast<ProcessModule>().Where(module => nativeNames.Contains(module.ModuleName, StringComparer.OrdinalIgnoreCase))
                .Select(module => new { name = module.ModuleName, path = module.FileName, sha256 = Hash(module.FileName), bytes = new FileInfo(module.FileName).Length,
                    fileVersion = FileVersionInfo.GetVersionInfo(module.FileName).FileVersion, productVersion = FileVersionInfo.GetVersionInfo(module.FileName).ProductVersion }).ToArray(),
            boundary = "Actual managed snapshot plus selected CoreCLR/host native module identities in this named process. SDK-runner identity is not native assertion-testhost identity. No environment/machine configuration captured."
        };
    }

    public static void WriteAtomic(string filename, object value)
    {
        var stage = $"{filename}.{Environment.ProcessId}.{Interlocked.Increment(ref _sequence)}.stage";
        File.WriteAllText(stage, JsonSerializer.Serialize(value, Options));
        File.Move(stage, filename, overwrite: true);
    }
}

internal static class StartupHook
{
    private static int _sequence;

    public static void Initialize()
    {
        var output = Environment.GetEnvironmentVariable("AUTOPERF_IDENTITY_OUTPUT");
        if (string.IsNullOrEmpty(output))
        {
            throw new InvalidOperationException("Explicit private identity output is required for this hook.");
        }

        Directory.CreateDirectory(output);
        Identity.WriteAtomic(Path.Combine(output, $"{Environment.ProcessId}-initialize.json"), Identity.Snapshot("startup-hook-initialize"));
        AppDomain.CurrentDomain.AssemblyLoad += (_, arguments) =>
        {
            var name = arguments.LoadedAssembly.GetName().Name;
            if (name is "Microsoft.AspNetCore.Mvc.Core" or "Microsoft.AspNetCore.Mvc.Razor" or
                "Microsoft.AspNetCore.Mvc.ViewFeatures" or "Microsoft.AspNetCore.Mvc.Core.Test" or
                "Microsoft.AspNetCore.Mvc.Razor.Test" or "RazorBuildWebSite.Views")
            {
                using var process = Process.GetCurrentProcess();
                Identity.WriteAtomic(Path.Combine(output, $"{process.Id}-owner-load-{Interlocked.Increment(ref _sequence)}.json"), new
                {
                    phase = "startup-hook-actual-owner-assembly-load",
                    processId = process.Id,
                    processCreationUtc = process.StartTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.ffffffZ"),
                    observedAtUtc = DateTime.UtcNow.ToString("o"),
                    assembly = Identity.Inspect(arguments.LoadedAssembly),
                    coreLib = Identity.Inspect(typeof(object).Assembly)
                });
            }
        };
        AppDomain.CurrentDomain.ProcessExit += (_, _) =>
            Identity.WriteAtomic(Path.Combine(output, $"{Environment.ProcessId}-exit.json"), Identity.Snapshot("startup-hook-process-exit"));
    }
}
