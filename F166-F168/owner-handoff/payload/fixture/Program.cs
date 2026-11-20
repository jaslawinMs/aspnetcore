using System.Collections;
using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.JsonPatch.Exceptions;
using Microsoft.AspNetCore.JsonPatch.Internal;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace AutoPerfPreparation;

internal static class Program
{
    private static readonly List<object> s_rows = [];
    private static bool s_failed;

    private static async Task<int> Main(string[] args)
    {
        var role = args[0];
        var output = Path.GetFullPath(args[1]);
        var work = Path.GetFullPath(args[2]);
        Directory.CreateDirectory(work);
        await Run("F166_ActualProviderFactoryPreservesExistingMappings", () => Provider(work));
        await Run("F166_PublicMiddlewareServesRealFilesAndNegotiatedResponses", () => Middleware(work));
        await Run("F167_RealManagerInputsAndRetainedKeyDictionary", () => KeyRing(work));
        await Run("F168_RealDynamicBinderWriteOnceCaseAndNullSemantics", Binder);
        await Run("F168_JsonPatchDocumentReplaceRemoveAndAdd", Patch);
        await Run("F168_JsonPatchMissingAndDuplicateControls", PatchControls);
        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrEmpty(assembly.Location))
            .Select(assembly => new
            {
                name = assembly.GetName().Name,
                version = assembly.GetName().Version?.ToString(),
                path = assembly.Location,
                mvid = assembly.ManifestModule.ModuleVersionId.ToString(),
                sha256 = Hash(assembly.Location),
                bytes = new FileInfo(assembly.Location).Length
            }).OrderBy(assembly => assembly.name).ToArray();
        using var process = Process.GetCurrentProcess();
        var nativeModules = process.Modules.Cast<ProcessModule>()
            .Where(module => new[] { "hostfxr.dll", "hostpolicy.dll", "coreclr.dll", "clrjit.dll" }
                .Contains(module.ModuleName, StringComparer.OrdinalIgnoreCase))
            .Select(module => new
            {
                name = module.ModuleName,
                path = module.FileName,
                sha256 = Hash(module.FileName),
                bytes = new FileInfo(module.FileName).Length
            }).OrderBy(module => module.name).ToArray();
        var result = new
        {
            role,
            processId = Environment.ProcessId,
            framework = RuntimeInformation.FrameworkDescription,
            frameworkVersion = Environment.Version.ToString(),
            baseDirectory = AppContext.BaseDirectory,
            rows = s_rows,
            loadedAssemblies = assemblies,
            nativeModules,
            observationBoundary = "One console-process snapshot, not VSTest observations or an exhaustive managed/native census.",
            generatedKeyXmlRetained = false,
            allPassed = !s_failed
        };
        Directory.CreateDirectory(Path.GetDirectoryName(output)!);
        File.WriteAllText(output, JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine(JsonSerializer.Serialize(new { role, allPassed = !s_failed, rows = s_rows.Count }));
        return s_failed ? 1 : 0;
    }

    private static async Task Run(string name, Func<Task<object>> action)
    {
        try
        {
            var data = await action();
            s_rows.Add(new { name, passed = true, data, error = (string?)null });
        }
        catch (Exception exception)
        {
            s_failed = true;
            s_rows.Add(new { name, passed = false, data = (object?)null, error = exception.ToString() });
        }
    }

    private static Task<object> Provider(string work)
    {
        using var files = new PhysicalFileProvider(work);
        var before = new FileExtensionContentTypeProvider();
        var factory = typeof(ComponentsWebAssemblyApplicationBuilderExtensions)
            .GetMethod("CreateStaticFilesOptions", BindingFlags.Static | BindingFlags.NonPublic)!;
        var options = (StaticFileOptions)factory.Invoke(null, [files])!;
        var provider = (FileExtensionContentTypeProvider)options.ContentTypeProvider!;
        var mappings = (Dictionary<string, string>)provider.Mappings;
        var names = new[] { ".dll", ".webcil", ".pdb", ".br", ".dat", ".blat", ".mjs" };
        var entries = names.Select(name => new
        {
            name,
            existedBefore = before.Mappings.ContainsKey(name),
            before = before.Mappings.TryGetValue(name, out var value) ? value : null,
            after = mappings[name]
        }).ToArray();
        Require(ReferenceEquals(mappings.Comparer, StringComparer.OrdinalIgnoreCase), "Actual provider comparer");
        Require(ReferenceEquals(files, options.FileProvider), "Actual provider retained");
        Require(entries.Count(entry => entry.existedBefore) == 1 && entries.Single(entry => entry.existedBefore).name == ".mjs",
            "The existing .mjs mapping is the natural present-key producer");
        Require(entries.All(entry => entry.after == (entry.name == ".mjs" ? "text/javascript" : "application/octet-stream")),
            "All seven actual mappings");
        Require(before.Mappings[".mjs"] == mappings[".mjs"], "Existing .mjs value preserved");
        Require(provider.TryGetContentType("sample.DLL", out var upper) && upper == "application/octet-stream",
            "Actual case-insensitive lookup");
        return Task.FromResult<object>(new
        {
            boundary = "Direct invocation of actual native factory for structural observations; public middleware producer is exercised separately.",
            dictionaryType = mappings.GetType().FullName,
            comparerType = mappings.Comparer.GetType().FullName,
            countBefore = before.Mappings.Count,
            countAfter = mappings.Count,
            entries
        });
    }

    private static async Task<object> Middleware(string work)
    {
        var root = Path.Combine(work, "wwwroot");
        var framework = Path.Combine(root, "_framework");
        Directory.CreateDirectory(framework);
        var bytes = Encoding.UTF8.GetBytes("private-f166-file-content");
        foreach (var extension in new[] { "dll", "webcil", "pdb", "br", "dat", "blat", "mjs", "DLL" })
        {
            File.WriteAllBytes(Path.Combine(framework, $"sample.{extension}"), bytes);
        }
        File.WriteAllText(Path.Combine(framework, "blazor.server.js"), "excluded-server");
        File.WriteAllText(Path.Combine(framework, "blazor.web.js"), "excluded-web");
        var compressedPath = Path.Combine(framework, "sample.dll.br");
        using (var stream = File.Create(compressedPath))
        using (var brotli = new BrotliStream(stream, CompressionLevel.Fastest))
        {
            brotli.Write(bytes);
        }
        using var files = new PhysicalFileProvider(root);
        var environment = new ProbeEnvironment(files, root);
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddOptions();
        services.AddSingleton<IWebHostEnvironment>(environment);
        services.AddSingleton<IHostEnvironment>(environment);
        using var provider = services.BuildServiceProvider();
        var application = new ApplicationBuilder(provider);
        application.UseBlazorFrameworkFiles();
        application.Run(context =>
        {
            context.Response.StatusCode = 418;
            return Task.CompletedTask;
        });
        var pipeline = application.Build();
        var observations = new List<object>();
        foreach (var extension in new[] { "dll", "webcil", "pdb", "br", "dat", "blat", "mjs", "DLL" })
        {
            var context = Context(provider, $"/_framework/sample.{extension}");
            await pipeline(context);
            var expectedType = extension == "mjs" ? "text/javascript" : "application/octet-stream";
            Require(context.Response.StatusCode == 200 && context.Response.ContentType == expectedType, $"Served {extension}");
            Require(context.Response.Headers.CacheControl.ToString() == "no-cache", $"PrepareResponse {extension}");
            Require(context.Response.Headers["Blazor-Environment"].ToString() == "Preparation", "Actual branch header");
            Require(((MemoryStream)context.Response.Body).ToArray().SequenceEqual(bytes), $"Actual file bytes {extension}");
            observations.Add(new { path = context.Request.Path.Value, status = context.Response.StatusCode,
                contentType = context.Response.ContentType, cacheControl = context.Response.Headers.CacheControl.ToString(),
                bodySha256 = Convert.ToHexString(SHA256.HashData(((MemoryStream)context.Response.Body).ToArray())) });
        }
        var negotiated = Context(provider, "/_framework/sample.dll");
        negotiated.Request.Headers.AcceptEncoding = "br";
        await pipeline(negotiated);
        var responseBytes = ((MemoryStream)negotiated.Response.Body).ToArray();
        Require(negotiated.Response.StatusCode == 200 && negotiated.Request.Path.Value == "/_framework/sample.dll.br",
            "Actual ContentEncodingNegotiator rewrites the request");
        Require(negotiated.Response.ContentType == "application/octet-stream" &&
            negotiated.Response.Headers.ContentEncoding.ToString() == "br" &&
            negotiated.Response.Headers.CacheControl.ToString() == "no-cache", "Actual handler restores original content type");
        Require(responseBytes.SequenceEqual(File.ReadAllBytes(compressedPath)), "Actual compressed file bytes");
        using (var compressed = new MemoryStream(responseBytes))
        using (var brotli = new BrotliStream(compressed, CompressionMode.Decompress))
        using (var expanded = new MemoryStream())
        {
            await brotli.CopyToAsync(expanded);
            Require(expanded.ToArray().SequenceEqual(bytes), "Real Brotli roundtrip");
        }
        observations.Add(new { path = negotiated.Request.Path.Value, status = negotiated.Response.StatusCode,
            contentType = negotiated.Response.ContentType, encoding = negotiated.Response.Headers.ContentEncoding.ToString(),
            bodySha256 = Convert.ToHexString(SHA256.HashData(responseBytes)) });
        foreach (var path in new[] { "/_framework/blazor.server.js", "/_framework/blazor.web.js", "/outside/sample.dll", "/_framework/missing.dll" })
        {
            var context = Context(provider, path);
            await pipeline(context);
            var expectedStatus = path == "/_framework/missing.dll" ? 404 : 418;
            Require(context.Response.StatusCode == expectedStatus && context.Response.Body.Length == 0, $"Actual fall-through {path}");
            observations.Add(new { path, status = context.Response.StatusCode, bodyBytes = context.Response.Body.Length });
        }
        return new
        {
            boundary = "Actual public UseBlazorFrameworkFiles -> MapWhen -> ContentEncodingNegotiator -> StaticFileMiddleware -> physical IFileInfo -> response stream; no server transport/browser.",
            observations
        };
    }

    private static DefaultHttpContext Context(IServiceProvider provider, string path)
    {
        var context = new DefaultHttpContext();
        context.RequestServices = provider;
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static Task<object> KeyRing(string work)
    {
        var root = Path.Combine(work, "key-repository");
        Directory.CreateDirectory(root);
        try
        {
            using var provider1 = KeyServices(root);
            var manager1 = provider1.GetRequiredService<IKeyManager>();
            var now = DateTimeOffset.UtcNow;
            var first = manager1.CreateNewKey(now.AddDays(-1), now.AddDays(30));
            var snapshotBeforeSecondKey = manager1.GetAllKeys();
            var second = manager1.CreateNewKey(now.AddHours(-1), now.AddDays(60));
            using var provider2 = KeyServices(root);
            var manager2 = provider2.GetRequiredService<IKeyManager>();
            var allKeys = manager2.GetAllKeys();
            var listedFirst = allKeys.Single(key => key.KeyId == first.KeyId);
            Require(allKeys.Count == 2 && snapshotBeforeSecondKey.Count == 1 &&
                snapshotBeforeSecondKey.All(key => key.KeyId != second.KeyId), "Real repository snapshot inputs");
            Require(!ReferenceEquals(first, listedFirst), "Independent manager rereads a distinct real key instance");
            var type = typeof(IKeyManager).Assembly.GetType("Microsoft.AspNetCore.DataProtection.KeyManagement.KeyRing", throwOnError: true)!;
            var constructor = type.GetConstructor([typeof(IKey), typeof(IEnumerable<IKey>)])!;
            var mapField = type.GetField("_keyIdToKeyHolderMap", BindingFlags.NonPublic | BindingFlags.Instance)!;
            var defaultProperty = type.GetProperty("DefaultAuthenticatedEncryptor")!;
            var lookup = type.GetMethod("GetAuthenticatedEncryptorByKeyId")!;
            var present = constructor.Invoke([first, allKeys]);
            var presentMap = (IDictionary)mapField.GetValue(present)!;
            Require(presentMap.Count == 2, "Present default does not insert again");
            var holder = presentMap[first.KeyId]!;
            var retainedKey = holder.GetType().GetField("_key", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(holder);
            Require(ReferenceEquals(listedFirst, retainedKey), "Present default retains the enumerated key object");
            Require(holder.GetType().GetField("_encryptor", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(holder) is null,
                "Ring holder begins with deferred encryptor");
            var firstEncryptor = defaultProperty.GetValue(present);
            Require(firstEncryptor is not null && ReferenceEquals(firstEncryptor, defaultProperty.GetValue(present)),
                "Default holder caches the real encryptor instance");
            object?[] lookupArguments = [first.KeyId, false];
            Require(ReferenceEquals(firstEncryptor, lookup.Invoke(present, lookupArguments)) && Equals(lookupArguments[1], false),
                "Present-key lookup shares default holder");
            var absent = constructor.Invoke([second, snapshotBeforeSecondKey]);
            var absentMap = (IDictionary)mapField.GetValue(absent)!;
            Require(absentMap.Count == 2 && absentMap.Contains(second.KeyId), "Absent default is inserted");
            var absentHolder = absentMap[second.KeyId]!;
            Require(ReferenceEquals(second, absentHolder.GetType().GetField("_key", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(absentHolder)),
                "Inserted holder retains actual default key object");
            var secondEncryptor = defaultProperty.GetValue(absent);
            lookupArguments = [second.KeyId, false];
            Require(secondEncryptor is not null && ReferenceEquals(secondEncryptor, lookup.Invoke(absent, lookupArguments)),
                "Inserted default is used by subsequent lookup");
            lookupArguments = [Guid.Empty, true];
            Require(lookup.Invoke(absent, lookupArguments) is null && Equals(lookupArguments[1], false),
                "Unknown id returns null and resets revocation output");
            var duplicate = Expect<TargetInvocationException>(() => constructor.Invoke([second, new[] { listedFirst, listedFirst }]));
            Require(duplicate.InnerException is ArgumentException, "Duplicate allKeys id still throws before fallback");
            var comparer = presentMap.GetType().GetProperty("Comparer")!.GetValue(presentMap)!;
            var persistedFiles = Directory.EnumerateFiles(root, "*.xml").Select(Path.GetFileName).Order().ToArray();
            Require(persistedFiles.Length == 2, "Actual filesystem repository persisted both keys");
            return Task.FromResult<object>(new
            {
                boundary = "Actual FileSystemXmlRepository/XmlKeyManager inputs and actual internal constructor by reflection. The old snapshot is deliberately supplied, not proof the normal provider omits persisted keys.",
                dictionaryType = presentMap.GetType().FullName,
                comparerType = comparer.GetType().FullName,
                keyType = first.GetType().FullName,
                keyIds = allKeys.Select(key => key.KeyId).Order().ToArray(),
                presentCount = presentMap.Count,
                absentCount = absentMap.Count,
                enumeratedObjectRetained = true,
                realEncryptorType = firstEncryptor!.GetType().FullName,
                duplicateException = duplicate.InnerException!.GetType().FullName,
                persistedFiles,
                xmlBytesExcluded = true
            });
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static ServiceProvider KeyServices(string path)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(path));
        return services.BuildServiceProvider();
    }

    private static Task<object> Binder()
    {
        dynamic target = new WriteOnceDynamicTestObject();
        target.Name = "first";
        target.name = "different-case";
        var duplicate = Expect<ArgumentException>(() => target.Name = "rejected");
        var actual = (WriteOnceDynamicTestObject)target;
        Require(actual.Count == 2 && (string)target.Name == "first" && (string)target.name == "different-case",
            "Real binder preserves old value and case-sensitive keys");
        target.Name = null;
        Require(actual.Count == 1 && !actual.ContainsKey("Name"), "Null binder write removes the entry");
        target.Name = "after-removal";
        Require(actual.Count == 2 && (string)target.Name == "after-removal", "Reinsertion after real removal");
        var map = (Dictionary<string, object>)typeof(WriteOnceDynamicTestObject)
            .GetField("_dictionary", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(actual)!;
        return Task.FromResult<object>(new { boundary = "Actual C# dynamic binder invokes the native test object; no injected binder callback.",
            dictionaryType = map.GetType().FullName, comparerType = map.Comparer.GetType().FullName,
            keys = actual.Keys.Order().ToArray(), count = actual.Count, duplicateMessage = duplicate.Message });
    }

    private static Task<object> Patch()
    {
        dynamic target = new WriteOnceDynamicTestObject();
        target.Name = "old";
        target.name = "case-control";
        var document = new JsonPatchDocument();
        document.Replace("/Name", "new");
        document.ApplyTo((object)target);
        Require((string)target.Name == "new" && (string)target.name == "case-control" &&
            ((WriteOnceDynamicTestObject)target).Count == 2, "Real JsonPatch replace removes then sets through the actual dynamic adapter");
        var removeAdd = new JsonPatchDocument();
        removeAdd.Remove("/Name");
        removeAdd.Add("/Name", "again");
        removeAdd.ApplyTo((object)target);
        Require((string)target.Name == "again" && (string)target.name == "case-control", "Actual remove/add sequence");
        return Task.FromResult<object>(new { boundary = "Public JsonPatchDocument -> actual ObjectAdapter/ObjectVisitor/AdapterFactory -> actual DynamicObjectAdapter -> C# CallSite -> native WriteOnceDynamicTestObject.",
            operation = document.Operations.Single().op, path = document.Operations.Single().path,
            finalName = (string)target.Name, finalCaseControl = (string)target.name, count = ((WriteOnceDynamicTestObject)target).Count });
    }

    private static Task<object> PatchControls()
    {
        dynamic target = new WriteOnceDynamicTestObject();
        target.Name = "unchanged";
        var missing = new JsonPatchDocument();
        missing.Replace("/Missing", "new");
        var missingException = Expect<JsonPatchException>(() => missing.ApplyTo((object)target));
        Require((string)target.Name == "unchanged" && ((WriteOnceDynamicTestObject)target).Count == 1, "Missing replace has no mutation");
        var duplicate = new JsonPatchDocument();
        duplicate.Add("/Name", "new");
        var duplicateException = Expect<ArgumentException>(() => duplicate.ApplyTo((object)target));
        Require((string)target.Name == "unchanged" && ((WriteOnceDynamicTestObject)target).Count == 1, "Duplicate add retains old value");
        return Task.FromResult<object>(new { missingType = missingException.GetType().FullName,
            missingMessage = missingException.Message, duplicateType = duplicateException.GetType().FullName,
            duplicateMessage = duplicateException.Message, count = ((WriteOnceDynamicTestObject)target).Count });
    }

    private static TException Expect<TException>(Action action) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException exception)
        {
            return exception;
        }
        throw new InvalidOperationException($"Expected {typeof(TException).FullName}");
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    private sealed class ProbeEnvironment(IFileProvider files, string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "AutoPerfPreparation";
        public IFileProvider WebRootFileProvider { get; set; } = files;
        public string WebRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = "Preparation";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = files;
    }
}
