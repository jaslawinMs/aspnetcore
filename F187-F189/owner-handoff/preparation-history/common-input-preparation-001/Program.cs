using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ControllersFromServicesClassLibrary;
using ControllersFromServicesWebSite;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Diagnostics;
using Microsoft.AspNetCore.Mvc.FunctionalTests;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.Language;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AutoPerf.Mvc.HelperPreparation;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private static readonly List<Row> Rows = [];
    private static readonly Dictionary<object, int> References = new(ReferenceEqualityComparer.Instance);
    private static Row _row = null!;
    private static string _role = string.Empty;
    private static string _checkout = string.Empty;
    private static string _output = string.Empty;

    private static async Task<int> Main(string[] args)
    {
        _role = args[0];
        _checkout = args[1];
        _output = args[2];
        await Run("F187_MissingDirectoryIdentityAndRegisteredState", MissingDirectoryIdentityAndRegisteredState);
        await Run("F187_PublicRazorEnumeration_UsesRealProvider", PublicRazorEnumerationUsesRealProvider);
        await Run("F188_MissingFileContractAndMutableLookup", MissingFileContractAndMutableLookup);
        await Run("F188_PublicRazorMissingItemAndCompilerCache", PublicRazorMissingItemAndCompilerCache);
        await Run("F188_PublicFileVersionProvider_CacheAndHelperInvalidation", PublicFileVersionProviderCacheAndHelperInvalidation);
        await Run("F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl", ExistingHostedFixtureExcludesNestedAndExecutesDiscoveredControl);
        Persist();
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            role = _role,
            result = Rows.All(row => row.Result == "Passed") ? "PASS" : "FAIL",
            rows = Rows.Count,
            assertions = Rows.Sum(row => row.Assertions.Count),
            passedAssertions = Rows.Sum(row => row.Assertions.Count(assertion => assertion.Passed)),
            findings = new[] { "F187", "F188", "F189" },
            status = "PENDING"
        }, JsonOptions));

        return Rows.All(row => row.Result == "Passed") ? 0 : 1;
    }

    private static async Task Run(string name, Func<Task> action)
    {
        _row = new Row { Name = name };
        Rows.Add(_row);
        try
        {
            await action();
            _row.Result = "Passed";
        }
        catch (Exception exception)
        {
            _row.Result = "Failed";
            _row.Failure = exception.ToString();
        }
        Persist();
    }

    private static Task MissingDirectoryIdentityAndRegisteredState()
    {
        var provider = new TestFileProvider(Path.Combine(_checkout, "source-only-provider-root"));
        var missing = provider.GetDirectoryContents("/absent");
        var repeated = provider.GetDirectoryContents(new string("/absent".ToCharArray()));
        var other = provider.GetDirectoryContents("/other");
        Equal(false, missing.Exists, "Missing directory does not exist");
        Equal(0, missing.Count(), "Generic directory enumeration is empty");
        Equal(0, ((IEnumerable)missing).Cast<object>().Count(), "Nongeneric enumeration is empty");
        Equal(typeof(NotFoundDirectoryContents).FullName, missing.GetType().FullName, "Actual public directory-result type");
        Different(missing, repeated, "Repeated same path currently produces distinct result objects, not a required identity contract");
        Different(missing, other, "Different missing paths currently produce distinct result objects");
        Different(missing, new TestFileProvider().GetDirectoryContents("/absent"), "Different provider owns no shared miss instance today");
        var file = provider.AddFile("/absent/present.cshtml", "directory content");
        Equal(false, provider.GetDirectoryContents("/absent").Exists, "Adding a file does not register its containing directory");
        var directory = provider.AddDirectoryContent("/absent", new[] { file });
        Same(directory, provider.GetDirectoryContents("/absent"), "Registered directory reference is returned");
        Same(directory, provider.GetDirectoryContents(new string("/absent".ToCharArray())), "Equal ordinal directory key hits");
        Equal(true, directory.Exists, "Registered directory exists");
        Equal(true, directory.IsDirectory, "Registered directory represents a directory");
        Equal("absent", directory.Name, "Directory name comes from registered path");
        Same(file, directory.Single(), "Registered directory preserves the actual file object");
        Equal(false, provider.GetDirectoryContents("/ABSENT").Exists, "Directory keys are case-sensitive");
        Equal(false, provider.GetDirectoryContents("absent").Exists, "Directory lookup does not add a slash");
        var replacement = provider.AddDirectoryContent("/absent", Array.Empty<IFileInfo>());
        Same(replacement, provider.GetDirectoryContents("/absent"), "Replacement changes retained directory reference");
        Different(directory, replacement, "Old directory object remains separate");
        Equal(1, directory.Count(), "Previously returned directory retains its original contents");
        Equal(0, replacement.Count(), "Replacement directory is empty");
        Equal(false, missing.Exists, "Previously returned missing directory remains not found after registration");
        Equal(false, provider.GetDirectoryContents(string.Empty).Exists, "Empty directory key is a supported miss");
        _row.Observations.Add(new { boundary = "Direct real test-provider contract; finite reference observations, not performance or required fresh-identity claims", root = provider.Root });

        return Task.CompletedTask;
    }

    private static Task PublicRazorEnumerationUsesRealProvider()
    {
        var provider = new RecordingFileProvider(Path.Combine(_checkout, "source-only-provider-root"));
        using var services = CreateRazorServices(provider);
        var fileSystem = services.GetRequiredService<RazorProjectFileSystem>();
        Equal("Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystem", fileSystem.GetType().FullName, "Public DI resolved the actual internal file-system owner");
        provider.ClearReads();
        Equal(0, fileSystem.EnumerateItems("/absent").Count(), "Real Razor enumeration of a missing directory is empty");
        Sequence(new[] { "/absent" }, provider.DirectoryReads.Select(read => read.Path), "Real file system asked the actual provider for the missing path");
        Equal(false, provider.DirectoryReads.Single().Result.Exists, "Real producer obtained the actual missing result");
        var rootFile = provider.AddFile("/root.cshtml", "root");
        var childDirectory = new TestDirectoryFileInfo { Name = "child" };
        provider.AddDirectoryContent("/", new IFileInfo[] { rootFile, childDirectory });
        provider.ClearReads();
        Sequence(new[] { "/root.cshtml" }, fileSystem.EnumerateItems("/").Select(item => item.FilePath), "A missing child directory contributes no Razor items");
        Sequence(new[] { "/", "/child" }, provider.DirectoryReads.Select(read => read.Path), "Real recursive enumeration reaches the absent child producer");
        Equal(false, provider.DirectoryReads[1].Result.Exists, "Recursive child produced not-found contents");
        var childFile = provider.AddFile("/child/leaf.cshtml", "child");
        provider.AddDirectoryContent("/child", new[] { childFile });
        provider.ClearReads();
        var items = fileSystem.EnumerateItems("/").OrderBy(item => item.FilePath, StringComparer.Ordinal).ToArray();
        Sequence(new[] { "/child/leaf.cshtml", "/root.cshtml" }, items.Select(item => item.FilePath), "Registering the child changes real enumeration");
        Equal(true, items.All(item => item.Exists), "Both real returned items exist");
        Same(childFile, ((FileProviderRazorProjectItem)items[0]).FileInfo, "Real child item retains the provider file reference");
        _row.Observations.Add(provider.Snapshot("Two-node finite directory fixture; no workload-size or invocation-frequency inference"));

        return Task.CompletedTask;
    }

    private static Task MissingFileContractAndMutableLookup()
    {
        var root = Path.Combine(_checkout, "source-only-provider-root");
        var provider = new TestFileProvider(root);
        var missing = provider.GetFileInfo("/views/missing.cshtml");
        var repeated = provider.GetFileInfo(new string("/views/missing.cshtml".ToCharArray()));
        var other = provider.GetFileInfo("/different/name.txt");
        Equal("Microsoft.Extensions.FileProviders.TestFileProvider+NotFoundFileInfo", missing.GetType().FullName, "Actual private result is not the similarly named public path-bearing type");
        Equal(false, missing.Exists, "Missing file Exists is false");
        Different(missing, repeated, "Repeated miss currently produces a fresh object, not a required identity contract");
        Different(missing, other, "Different paths currently produce distinct objects");
        foreach (var item in new[] { missing, other })
        {
            Throws<NotImplementedException>(() => _ = item.Name, "Missing file Name throws rather than echoing the requested name");
            Throws<NotImplementedException>(() => _ = item.PhysicalPath, "Missing file PhysicalPath throws");
            Throws<NotImplementedException>(() => _ = item.Length, "Missing file Length throws");
            Throws<NotImplementedException>(() => _ = item.IsDirectory, "Missing file IsDirectory throws");
            Throws<NotImplementedException>(() => _ = item.LastModified, "Missing file LastModified throws");
            Throws<NotImplementedException>(() => item.CreateReadStream(), "Missing file cannot produce a stream");
        }
        var stored = provider.AddFile("/views/missing.cshtml", "Hello World!");
        Same(stored, provider.GetFileInfo("/views/missing.cshtml"), "Exact registered key returns the stored file");
        Same(stored, provider.GetFileInfo(new string("/views/missing.cshtml".ToCharArray())), "Equal newly allocated string finds the same stored object");
        Equal(true, stored.Exists, "Registered file exists");
        Equal(false, stored.IsDirectory, "Registered file is not a directory");
        Equal("missing.cshtml", stored.Name, "AddFile computes the real basename");
        Equal(Path.Combine(root, "views", "missing.cshtml"), stored.PhysicalPath, "AddFile normalizes physical path separately from lookup key");
        Equal(12L, stored.Length, "Registered file length is UTF8 byte length");
        using (var stream = new StreamReader(stored.CreateReadStream()))
        {
            Equal("Hello World!", stream.ReadToEnd(), "Real file stream contents are retained");
        }
        Equal(false, missing.Exists, "Old miss object does not become a live proxy after AddFile");
        Equal(false, provider.GetFileInfo("/VIEWS/missing.cshtml").Exists, "Lookup uses ordinal case-sensitive paths");
        Equal(false, provider.GetFileInfo("views/missing.cshtml").Exists, "Lookup does not normalize leading slash");
        Equal(false, provider.GetFileInfo(@"\views\missing.cshtml").Exists, "Lookup does not normalize path separators");
        var replacement = provider.AddFile("/views/missing.cshtml", "replacement");
        Same(replacement, provider.GetFileInfo("/views/missing.cshtml"), "Existing key replacement retains the new file");
        Different(stored, replacement, "Previously returned file remains a separate object");
        Equal("Hello World!", stored.Content, "Old file object retains old content after replacement");
        provider.DeleteFile("/views/missing.cshtml");
        var deleted = provider.GetFileInfo("/views/missing.cshtml");
        Equal(false, deleted.Exists, "Deletion restores the missing branch");
        Different(missing, deleted, "Deletion miss currently has fresh identity");
        Throws<NotImplementedException>(() => _ = deleted.Name, "Deleted result retains the same throwing Name contract");
        Equal(false, provider.GetFileInfo(string.Empty).Exists, "Empty file key is a supported miss");
        _row.Observations.Add(new { boundary = "Actual provider and returned objects only; no replacement/singleton proposal", root, resultType = missing.GetType().FullName });

        return Task.CompletedTask;
    }

    private static async Task PublicRazorMissingItemAndCompilerCache()
    {
        var provider = new RecordingFileProvider(Path.Combine(_checkout, "source-only-provider-root"));
        using var services = CreateRazorServices(provider);
        var fileSystem = services.GetRequiredService<RazorProjectFileSystem>();
        var item = (FileProviderRazorProjectItem)fileSystem.GetItem("/missing.cshtml", fileKind: null);
        Equal(false, item.Exists, "Real Razor missing item reports absent");
        Equal("/missing.cshtml", item.FilePath, "Razor item preserves the actual request path independently of missing FileInfo.Name");
        Equal(string.Empty, item.BasePath, "Real missing item's base path");
        Equal<string?>(null, item.RelativePhysicalPath, "Missing item has no relative physical path");
        Same(provider.FileReads.Single().Result, item.FileInfo, "Real Razor item keeps the exact actual provider result");
        Throws<NotImplementedException>(() => _ = item.FileInfo.Name, "Real wrapped FileInfo still throws for Name");
        Throws<NotImplementedException>(() => _ = item.PhysicalPath, "Real missing item's PhysicalPath propagates target behavior");
        Throws<NotImplementedException>(() => item.Read(), "Real missing item's Read propagates target behavior");
        var compilerProvider = services.GetRequiredService<IViewCompilerProvider>();
        Equal("Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompilerProvider", compilerProvider.GetType().FullName, "Public DI resolved real runtime compiler provider");
        var compiler = compilerProvider.GetCompiler();
        provider.ClearReads();
        var first = await compiler.CompileAsync("/uncached-missing.cshtml");
        var second = await compiler.CompileAsync(new string("/uncached-missing.cshtml".ToCharArray()));
        var other = await compiler.CompileAsync("/another-missing.cshtml");
        Equal<object?>(null, first.Item, "Real missing compilation descriptor contains no compiled item");
        Equal("/uncached-missing.cshtml", first.RelativePath, "Descriptor preserves requested normalized path");
        Same(first, second, "Real compiler negative cache reuses the descriptor for repeated equal path");
        Different(first, other, "Different path has a separate cached descriptor");
        Same(provider.GetChangeToken("/uncached-missing.cshtml"), first.ExpirationTokens.Single(), "Real negative cache carries the actual helper change token");
        Sequence(new[] { "/uncached-missing.cshtml", "/another-missing.cshtml" }, provider.FileReads.Select(read => read.Path), "Finite repeated compiler request does not requery cached missing path");
        Equal(true, provider.FileReads.All(read => !read.Result.Exists), "Both compiler misses came from actual provider missing results");
        _row.Observations.Add(provider.Snapshot("Real public DI compiler negative-cache path; no template compilation, filesystem watcher, timing or application frequency claim"));
    }

    private static Task PublicFileVersionProviderCacheAndHelperInvalidation()
    {
        var provider = new RecordingFileProvider(Path.Combine(_checkout, "source-only-provider-root"));
        using var services = CreateRazorServices(provider);
        var versionProvider = services.GetRequiredService<IFileVersionProvider>();
        Equal("Microsoft.AspNetCore.Mvc.Razor.Infrastructure.DefaultFileVersionProvider", versionProvider.GetType().FullName, "Public DI resolved actual file-version consumer");
        provider.ClearReads();
        const string filePath = "/scripts/missing.js";
        Equal(filePath, versionProvider.AddFileVersionToPath(PathString.Empty, filePath), "Real file-version consumer leaves missing path unchanged");
        Equal(filePath, versionProvider.AddFileVersionToPath(PathString.Empty, filePath), "Real file-version negative cache preserves output");
        Sequence(new[] { filePath }, provider.FileReads.Select(read => read.Path), "Finite repeated negative-cache request made one real lookup");
        provider.AddFile(filePath, "Hello World!");
        Equal(filePath, versionProvider.AddFileVersionToPath(PathString.Empty, filePath), "AddFile alone does not expire the cached version result");
        Equal(1, provider.FileReads.Count, "Unchanged helper token leaves the actual negative cache in place");
        provider.GetChangeToken(filePath).HasChanged = true;
        const string versioned = "/scripts/missing.js?v=f4OxZX_x_FO5LcGBSKHWXfwtSx-j1ncoSt3SABJtkGk";
        Equal(versioned, versionProvider.AddFileVersionToPath(PathString.Empty, filePath), "Explicit public helper token mutation lets real consumer see the added file");
        Equal(2, provider.FileReads.Count, "Real consumer performed the one post-expiration lookup");
        provider.DeleteFile(filePath);
        provider.GetChangeToken(filePath).HasChanged = true;
        Equal(filePath, versionProvider.AddFileVersionToPath(PathString.Empty, filePath), "Real consumer observes deletion after explicit helper token mutation");
        Equal(3, provider.FileReads.Count, "Real consumer performed the one post-delete lookup");
        provider.ClearReads();
        Equal("/app/other.js", versionProvider.AddFileVersionToPath(new PathString("/app"), "/app/other.js"), "Real request-path-base fallback still returns unchanged missing URL");
        Sequence(new[] { "/app/other.js", "/other.js" }, provider.FileReads.Select(read => read.Path), "Real path-base fallback requests both actual keys");
        _row.Observations.Add(provider.Snapshot("HasChanged is deliberately set via the test helper's public property, as in existing native tests; this proves cache response, not an OS watcher producer. Counts are correctness-only finite scenario observations."));

        return Task.CompletedTask;
    }

    private static async Task ExistingHostedFixtureExcludesNestedAndExecutesDiscoveredControl()
    {
        using var fixture = new MvcTestFixture<Startup>(NullLoggerFactory.Instance);
        var contentRoot = Path.Combine(_checkout, "src", "Mvc", "test", "WebSites", "ControllersFromServicesWebSite");
        using var application = fixture.WithWebHostBuilder(builder => builder.UseContentRoot(contentRoot));
        using var client = application.CreateDefaultClient();
        var services = application.Services;
        var manager = services.GetRequiredService<ApplicationPartManager>();
        var feature = new ControllerFeature();
        manager.PopulateFeature(feature);
        var nestedType = typeof(NestedControllerOwner.NestedController);
        Equal(true, nestedType.IsNestedPublic, "Target is an actual public nested class");
        Equal(false, nestedType.IsPublic, "Actual CLR top-level-public test excludes nested types");
        Equal(true, manager.ApplicationParts.OfType<AssemblyPart>().Any(part => part.Assembly == nestedType.Assembly), "Actual owning class-library assembly is an application part, not missing from setup");
        Equal(false, feature.Controllers.Any(controller => controller.AsType() == nestedType), "Real feature provider excludes target nested type");
        Equal(true, feature.Controllers.Any(controller => controller.AsType() == typeof(ConstructorInjectionController)), "Real feature provider includes discovered control");
        var descriptors = services.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items;
        Equal(false, descriptors.OfType<ControllerActionDescriptor>().Any(descriptor => descriptor.ControllerTypeInfo.AsType() == nestedType), "Real action descriptor producer creates no target action");
        using (var scope = services.CreateScope())
        {
            Equal<object?>(null, scope.ServiceProvider.GetService(nestedType), "Real AddControllersAsServices does not register nested target");
        }
        Equal(typeof(ServiceBasedControllerActivator).FullName, services.GetRequiredService<IControllerActivator>().GetType().FullName, "Actual fixture uses service-based activation");
        var observer = new MvcObserver();
        using var subscription = services.GetRequiredService<DiagnosticListener>().Subscribe(observer, MvcObserver.IsEnabled);
        using (var response = await client.GetAsync("/not-discovered/nested"))
        {
            Equal(HttpStatusCode.NotFound, response.StatusCode, "Actual TestServer HTTP pipeline returns 404 for nested route");
            Equal(0, (await response.Content.ReadAsByteArrayAsync()).Length, "Actual nested route response has no action-result body");
        }
        using (var response = await client.GetAsync("/not-discovered/nested"))
        {
            Equal(HttpStatusCode.NotFound, response.StatusCode, "Finite repeated nested request remains undiscovered");
        }
        Equal(0, observer.Events.Count, "Actual MVC diagnostic producer emitted no action-method/result events for the negative requests");
        foreach (var value in new[] { 14, 15 })
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/constructorinjection?value=" + value);
            request.Headers.Add("Test-Header", "test-header-value");
            using var response = await client.SendAsync(request);
            Equal(HttpStatusCode.OK, response.StatusCode, "Discovered control is activated and served through actual hosted MVC");
            Equal("/constructorinjection " + value + " test-header-value", await response.Content.ReadAsStringAsync(), "Real request-scoped query/header dependencies and ContentResult execution reach HTTP body");
        }
        var beforeMethods = observer.Events.Where(item => item.Event == BeforeControllerActionMethodEventData.EventName).ToArray();
        var afterMethods = observer.Events.Where(item => item.Event == AfterControllerActionMethodEventData.EventName).ToArray();
        var beforeResults = observer.Events.Where(item => item.Event == BeforeActionResultEventData.EventName).ToArray();
        var afterResults = observer.Events.Where(item => item.Event == AfterActionResultEventData.EventName).ToArray();
        Equal(2, beforeMethods.Length, "Passive producer observation saw both real control activations");
        Equal(2, afterMethods.Length, "Passive producer observation saw both real method results");
        Equal(2, beforeResults.Length, "Passive producer observation saw both result executions begin");
        Equal(2, afterResults.Length, "Passive producer observation saw both result executions complete");
        Equal(true, beforeMethods.All(item => item.ControllerType == typeof(ConstructorInjectionController).FullName), "Actual activated instances are the discovered control type");
        Equal(true, afterResults.All(item => item.ResultType == typeof(ContentResult).FullName), "Actual executed results are ContentResult, not target EmptyResult");
        Equal(true, beforeMethods[0].ControllerReference != beforeMethods[1].ControllerReference, "Real transient control activations have distinct object references across requests");
        for (var index = 0; index < 2; index++)
        {
            Equal(beforeMethods[index].ControllerReference, afterMethods[index].ControllerReference, "Real activation instance survives method execution");
            Equal(afterMethods[index].ResultReference, beforeResults[index].ResultReference, "Actual returned result enters MVC result execution");
            Equal(beforeResults[index].ResultReference, afterResults[index].ResultReference, "Same real result completes execution");
        }
        Equal(false, observer.Events.Any(item => item.ControllerType == nestedType.FullName || item.Path == "/not-discovered/nested"), "No target activation/result was observed in the real fixture's finite requests");
        _row.Observations.Add(new
        {
            boundary = "Existing source-built MvcTestFixture and unchanged Startup through real TestServer, discovery, DI activation, MVC method/result diagnostics and HTTP responses. Target Index is never directly invoked; its EmptyResult is not a hosted producer in this fixture.",
            contentRoot,
            applicationParts = manager.ApplicationParts.Select(part => part.Name).ToArray(),
            controllers = feature.Controllers.Select(type => type.FullName).ToArray(),
            actionDescriptorCount = descriptors.Count,
            events = observer.Events
        });
    }

    private static ServiceProvider CreateRazorServices(RecordingFileProvider provider)
    {
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(item => item.ApplicationName).Returns(typeof(Program).Assembly.GetName().Name!);
        environment.SetupGet(item => item.EnvironmentName).Returns(Environments.Development);
        environment.SetupGet(item => item.ContentRootPath).Returns(provider.Root);
        environment.SetupGet(item => item.WebRootPath).Returns(provider.Root);
        environment.SetupGet(item => item.ContentRootFileProvider).Returns(provider);
        environment.SetupGet(item => item.WebRootFileProvider).Returns(provider);
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.ClearProviders());
        services.AddSingleton<IWebHostEnvironment>(environment.Object);
        services.AddSingleton<IHostEnvironment>(environment.Object);
        services.AddMvc().AddRazorRuntimeCompilation(options =>
        {
            options.FileProviders.Clear();
            options.FileProviders.Add(provider);
        });

        return services.BuildServiceProvider();
    }

    private static int Reference(object value)
    {
        if (!References.TryGetValue(value, out var reference))
        {
            reference = References.Count + 1;
            References.Add(value, reference);
        }

        return reference;
    }

    private static void Equal<T>(T expected, T actual, string description)
    {
        Check(EqualityComparer<T>.Default.Equals(expected, actual), description, expected, actual);
    }

    private static void Sequence(IEnumerable<string> expected, IEnumerable<string> actual, string description)
    {
        var expectedArray = expected.ToArray();
        var actualArray = actual.ToArray();
        Check(expectedArray.SequenceEqual(actualArray, StringComparer.Ordinal), description, expectedArray, actualArray);
    }

    private static void Same(object expected, object actual, string description)
    {
        Check(ReferenceEquals(expected, actual), description, Reference(expected), Reference(actual));
    }

    private static void Different(object expected, object actual, string description)
    {
        Check(!ReferenceEquals(expected, actual), description, Reference(expected), Reference(actual));
    }

    private static void Throws<TException>(Action action, string description) where TException : Exception
    {
        Exception? observed = null;
        try
        {
            action();
        }
        catch (Exception exception)
        {
            observed = exception;
        }
        Check(observed?.GetType() == typeof(TException), description, typeof(TException).FullName, observed?.GetType().FullName);
    }

    private static void Check(bool passed, string description, object? expected, object? actual)
    {
        _row.Assertions.Add(new Assertion { Description = description, Passed = passed, Expected = expected, Actual = actual });
        if (!passed)
        {
            throw new InvalidOperationException(description);
        }
    }

    private static object Identity()
    {
        using var process = Process.GetCurrentProcess();
        var assemblies = new[]
        {
            typeof(Program).Assembly, typeof(TestFileProvider).Assembly, typeof(FileProviderRazorProjectItem).Assembly,
            typeof(RazorProjectFileSystem).Assembly, typeof(MvcTestFixture<>).Assembly,
            typeof(NestedControllerOwner).Assembly, typeof(Startup).Assembly, typeof(ControllerFeatureProvider).Assembly,
            typeof(IFileVersionProvider).Assembly, typeof(object).Assembly, typeof(Mock).Assembly
        }.Distinct().Select(assembly => new
        {
            name = assembly.GetName().Name,
            fullName = assembly.FullName,
            path = assembly.Location,
            mvid = assembly.ManifestModule.ModuleVersionId,
            sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
            bytes = new FileInfo(assembly.Location).Length
        }).ToArray();
        var modules = process.Modules.Cast<ProcessModule>().Select(module => module.FileName).Distinct(StringComparer.OrdinalIgnoreCase).Select(filename =>
        {
            var version = FileVersionInfo.GetVersionInfo(filename);
            return new
            {
                path = filename,
                fileVersion = version.FileVersion,
                productVersion = version.ProductVersion,
                sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(filename))),
                bytes = new FileInfo(filename).Length
            };
        }).ToArray();

        return new
        {
            boundary = "Actual in-process reflection for the selected assemblies, and current Process.Modules snapshot. This is supplemental-only and is not substituted for native-testhost observations.",
            processId = process.Id,
            creationUtc = process.StartTime.ToUniversalTime().ToString("o"),
            processPath = Environment.ProcessPath,
            runtime = RuntimeInformation.FrameworkDescription,
            environmentVersion = Environment.Version.ToString(),
            assemblies,
            modules
        };
    }

    private static void Persist()
    {
        var data = new
        {
            role = _role,
            checkout = _checkout,
            status = "PENDING",
            result = Rows.All(row => row.Result == "Passed") ? "PASS" : "FAIL",
            boundary = "Finite correctness characterization only. No timing/allocation/performance counters, warmups, workload loop or performance result.",
            identity = Identity(),
            rows = Rows
        };
        File.WriteAllText(_output + ".partial", JsonSerializer.Serialize(data, JsonOptions));
        File.Move(_output + ".partial", _output, overwrite: true);
    }

    private sealed class Row
    {
        public string Name { get; set; } = string.Empty;
        public string Result { get; set; } = "Incomplete";
        public string? Failure { get; set; }
        public List<Assertion> Assertions { get; } = [];
        public List<object> Observations { get; } = [];
    }

    private sealed class Assertion
    {
        public string Description { get; set; } = string.Empty;
        public bool Passed { get; set; }
        public object? Expected { get; set; }
        public object? Actual { get; set; }
    }

    private sealed class RecordingFileProvider(string root) : TestFileProvider(root)
    {
        public List<(string Path, IDirectoryContents Result)> DirectoryReads { get; } = [];
        public List<(string Path, IFileInfo Result)> FileReads { get; } = [];

        public override IDirectoryContents GetDirectoryContents(string subpath)
        {
            var result = base.GetDirectoryContents(subpath);
            DirectoryReads.Add((subpath, result));

            return result;
        }

        public override IFileInfo GetFileInfo(string subpath)
        {
            var result = base.GetFileInfo(subpath);
            FileReads.Add((subpath, result));

            return result;
        }

        public void ClearReads()
        {
            DirectoryReads.Clear();
            FileReads.Clear();
        }

        public object Snapshot(string boundary)
        {
            return new
            {
                boundary,
                directoryReads = DirectoryReads.Select(read => new { path = read.Path, exists = read.Result.Exists, type = read.Result.GetType().FullName, reference = Reference(read.Result) }).ToArray(),
                fileReads = FileReads.Select(read => new { path = read.Path, exists = read.Result.Exists, type = read.Result.GetType().FullName, reference = Reference(read.Result) }).ToArray()
            };
        }
    }

    private sealed class MvcObserver : IObserver<KeyValuePair<string, object?>>
    {
        public List<MvcEvent> Events { get; } = [];

        public static bool IsEnabled(string name)
        {
            return name is BeforeControllerActionMethodEventData.EventName or AfterControllerActionMethodEventData.EventName or BeforeActionResultEventData.EventName or AfterActionResultEventData.EventName;
        }

        public void OnNext(KeyValuePair<string, object?> item)
        {
            var data = item.Value switch
            {
                BeforeControllerActionMethodEventData value => new MvcEvent(item.Key, value.ActionContext.HttpContext.Request.Path, value.Controller.GetType().FullName, Reference(value.Controller), null, 0),
                AfterControllerActionMethodEventData value => new MvcEvent(item.Key, value.ActionContext.HttpContext.Request.Path, value.Controller.GetType().FullName, Reference(value.Controller), value.Result.GetType().FullName, Reference(value.Result)),
                BeforeActionResultEventData value => new MvcEvent(item.Key, value.ActionContext.HttpContext.Request.Path, null, 0, value.Result.GetType().FullName, Reference(value.Result)),
                AfterActionResultEventData value => new MvcEvent(item.Key, value.ActionContext.HttpContext.Request.Path, null, 0, value.Result.GetType().FullName, Reference(value.Result)),
                _ => null
            };
            if (data is not null)
            {
                Events.Add(data);
            }
        }

        public void OnCompleted()
        {
        }

        public void OnError(Exception error)
        {
            throw error;
        }
    }

    private sealed record MvcEvent(string Event, string Path, string? ControllerType, int ControllerReference, string? ResultType, int ResultReference);
}
