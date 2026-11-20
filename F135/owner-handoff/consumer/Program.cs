using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

if (args.Length != 4)
{
    throw new ArgumentException("Expected role, source root, owner SHA256, and result path.");
}

var owner = typeof(CacheVaryByRules).Assembly;
Check(Hash(owner.Location) == args[2].ToUpperInvariant(), "The loaded owner is not the selected private source-built assembly.");
Check(RuntimeInformation.FrameworkDescription == ".NET 12.0.0-alpha.1.26568.110", "Unexpected selected runtime; fallback is forbidden.");
var results = new List<object>();
foreach (var scenario in new[] { "uninitialized", "initialized-empty", "one-policy-dynamic", "two-policy-values-unsorted", "cleared-after-policy", "duplicate-policy-key" })
{
    var observation = new ObservationState(scenario);
    CapturingStore? store = null;
    var endpointCalls = 0;
    using var host = new HostBuilder()
        .ConfigureLogging(logging => logging.ClearProviders())
        .ConfigureWebHost(web => web
            .UseTestServer()
            .ConfigureServices(services =>
            {
                services.AddSingleton(observation);
                services.AddOutputCache(options => options.AddBasePolicy(builder =>
                {
                    builder.SetVaryByQuery(Array.Empty<string>());
                    switch (scenario)
                    {
                        case "one-policy-dynamic":
                            builder.VaryByValue(context => new KeyValuePair<string, string>(context.Request.Headers["X-Key"].ToString(), context.Request.Headers["X-Value"].ToString()));
                            break;
                        case "two-policy-values-unsorted":
                            builder.VaryByValue("z", "last").VaryByValue("a", "first");
                            break;
                        case "cleared-after-policy":
                            builder.VaryByValue("tenant", "discarded");
                            break;
                        case "duplicate-policy-key":
                            builder.VaryByValue("tenant", "overwritten").VaryByValue(context => new KeyValuePair<string, string>("tenant", context.Request.Headers["X-Value"].ToString()));
                            break;
                    }
                    builder.AddPolicy<ObservationPolicy>();
                }));
                var descriptor = services.Single(item => item.ServiceType == typeof(IOutputCacheStore));
                services.Remove(descriptor);
                services.AddSingleton<IOutputCacheStore>(provider =>
                {
                    var inner = descriptor.ImplementationInstance as IOutputCacheStore
                        ?? descriptor.ImplementationFactory?.Invoke(provider) as IOutputCacheStore
                        ?? (IOutputCacheStore)ActivatorUtilities.CreateInstance(provider, descriptor.ImplementationType!);
                    return store = new CapturingStore(inner);
                });
            })
            .Configure(app =>
            {
                app.UseOutputCache();
                app.Run(context =>
                {
                    endpointCalls++;
                    return context.Response.WriteAsync("response-" + endpointCalls);
                });
            }))
        .Build();
    await host.StartAsync();
    using var client = host.GetTestClient();
    client.BaseAddress = new Uri("http://example.test");
    var requests = scenario is "one-policy-dynamic"
        ? new[] { new Input("first", "tenant", "blue"), new Input("same-key-and-value", "tenant", "blue"), new Input("different-key-same-value", "other", "blue"), new Input("same-key-different-value", "tenant", "red"), new Input("return-to-original", "tenant", "blue"), new Input("value-case-control", "tenant", "Blue"), new Input("empty-value", "tenant", "") }
        : new[] { new Input("first", "tenant", "blue"), new Input("same-key-and-value", "tenant", "blue"), new Input("different-value", "tenant", "red"), new Input("return-to-original", "tenant", "blue") };
    var expectedResponses = new Dictionary<string, string>(StringComparer.Ordinal);
    foreach (var input in requests)
    {
        var expectedKey = "GET\u001eHTTP\u001eEXAMPLE.TEST\u001e/PRODUCTS";
        expectedKey += scenario switch
        {
            "one-policy-dynamic" => "\u001eV\u001e" + input.Key + "\u001d" + input.Value,
            "two-policy-values-unsorted" => "\u001eV\u001ea\u001dfirst\u001ez\u001dlast",
            "duplicate-policy-key" => "\u001eV\u001etenant\u001d" + input.Value,
            _ => ""
        };
        var expectedHit = expectedResponses.TryGetValue(expectedKey, out var expectedBody);
        expectedBody ??= "response-" + (expectedResponses.Count + 1);
        var eventsBefore = store?.Events.Count ?? 0;
        using var request = new HttpRequestMessage(HttpMethod.Get, "/products");
        request.Headers.Add("X-Key", input.Key);
        request.Headers.Add("X-Value", input.Value);
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        Check(response.StatusCode == System.Net.HttpStatusCode.OK, scenario + ": status");
        Check(body == expectedBody, scenario + "/" + input.Name + ": actual middleware response/cache reuse");
        Check(store is not null, "The real registered output-cache store was not resolved.");
        var events = store!.Events.Skip(eventsBefore).ToArray();
        Check(events.Length == (expectedHit ? 1 : 2), scenario + ": expected one lookup and a write only on cache miss");
        Check(events[0] == new StoreEvent("get", expectedKey, expectedHit), scenario + ": actual storage lookup key or hit");
        if (!expectedHit)
        {
            Check(events[1] == new StoreEvent("set", expectedKey, false), scenario + ": actual storage write key");
        }
        var observed = observation.Last ?? throw new InvalidOperationException("The configured policy producer did not run.");
        var after = ObservationPolicy.Storage.GetValue(observed.Rules);
        var expectedCount = scenario switch
        {
            "uninitialized" => (int?)null,
            "initialized-empty" or "cleared-after-policy" => 0,
            "two-policy-values-unsorted" => 2,
            _ => 1
        };
        Check(observed.Count == expectedCount, scenario + ": real policy storage precondition");
        Check((observed.Storage is null) == (expectedCount is null), scenario + ": lazy backing storage");
        Check(ReferenceEquals(observed.Storage, after), scenario + ": key generation changed dictionary ownership");
        Check((after as IDictionary<string, string>)?.Count == expectedCount, scenario + ": key generation mutated dictionary count");
        expectedResponses[expectedKey] = expectedBody;
        Check(endpointCalls == expectedResponses.Count, scenario + ": endpoint execution count");
        results.Add(new
        {
            scenario,
            request = input.Name,
            passed = true,
            key = expectedKey,
            cacheHit = expectedHit,
            body,
            endpointCalls,
            storageWasNull = observed.Storage is null,
            storageCount = observed.Count,
            dictionaryType = observed.Storage?.GetType().FullName,
            dictionaryIdentityPreserved = ReferenceEquals(observed.Storage, after),
            events
        });
    }
    await host.StopAsync();
}

var sourceBindings = SourceBindings(owner, args[1]);
Check(sourceBindings.All(item => item.SourceMatched && item.PePdbGuidMatched), "Owner source/PE/PDB association failed.");
var report = new
{
    finding = "F135",
    role = args[0],
    runtime = RuntimeInformation.FrameworkDescription,
    architecture = RuntimeInformation.ProcessArchitecture.ToString(),
    machine = Environment.MachineName,
    pid = Environment.ProcessId,
    boundary = "HttpClient -> actual TestServer -> registered OutputCache middleware -> genuine VaryByValue policies -> actual OutputCacheKeyProvider -> decorated real default MemoryOutputCacheStore -> actual cached response replay",
    directHelperInvocations = 0,
    timed = false,
    candidateExecuted = false,
    passedRows = results.Count,
    rows = results,
    ownerSourceBindings = sourceBindings,
    loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies()
        .Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0)
        .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
        .Select(assembly => new
        {
            name = assembly.GetName().Name,
            fullName = assembly.FullName,
            path = assembly.Location,
            mvid = assembly.ManifestModule.ModuleVersionId,
            sha256 = Hash(assembly.Location),
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            pdbPath = File.Exists(Path.ChangeExtension(assembly.Location, ".pdb")) ? Path.ChangeExtension(assembly.Location, ".pdb") : null,
            pdbSha256 = File.Exists(Path.ChangeExtension(assembly.Location, ".pdb")) ? Hash(Path.ChangeExtension(assembly.Location, ".pdb")) : null
        }).ToArray(),
    limitations = new[]
    {
        "In-memory HTTP TestServer boundary, not a TCP/Kestrel/native-host assertion.",
        "Initialized-empty and cleared cases are explicit public policy configurations, not evidence that default requests allocate then clear the dictionary.",
        "Storage inspection uses read-only diagnostic reflection; no helper is called and no private field is written.",
        "Sequential requests; expiration, eviction, concurrency, failures, workload frequency and performance are unmeasured."
    }
};
File.WriteAllText(args[3], JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine(JsonSerializer.Serialize(new { finding = "F135", role = args[0], passedRows = results.Count, runtime = report.runtime, ownerSha256 = Hash(owner.Location), instrumentation = "none" }));

static void Check(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static string Hash(string path)
{
    using var stream = File.OpenRead(path);
    return Convert.ToHexString(SHA256.HashData(stream));
}

static Binding[] SourceBindings(Assembly assembly, string sourceRoot)
{
    using var peStream = File.OpenRead(assembly.Location);
    using var pe = new PEReader(peStream);
    var codeViews = pe.ReadDebugDirectory().Where(entry => entry.Type == DebugDirectoryEntryType.CodeView)
        .Select(pe.ReadCodeViewDebugDirectoryData).ToArray();
    using var pdbStream = File.OpenRead(Path.ChangeExtension(assembly.Location, ".pdb"));
    using var pdb = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
    var metadata = pdb.GetMetadataReader();
    var pdbGuid = new Guid(metadata.DebugMetadataHeader!.Id.Take(16).ToArray());
    var names = new[] { "CacheVaryByRules.cs", "OutputCacheKeyProvider.cs", "OutputCacheMiddleware.cs", "OutputCachePolicyBuilder.cs", "VaryByValuePolicy.cs" };
    return names.Select(name =>
    {
        var document = metadata.Documents.Select(handle => metadata.GetDocument(handle))
            .Single(item => metadata.GetString(item.Name).EndsWith("\\" + name, StringComparison.Ordinal) || metadata.GetString(item.Name).EndsWith("/" + name, StringComparison.Ordinal));
        var compiledPath = metadata.GetString(document.Name);
        var relative = name == "VaryByValuePolicy.cs" ? Path.Combine("src", "Middleware", "OutputCaching", "src", "Policies", name) : Path.Combine("src", "Middleware", "OutputCaching", "src", name);
        var physical = Path.Combine(sourceRoot, relative);
        var expected = Convert.ToHexString(metadata.GetBlobBytes(document.Hash));
        var actual = Hash(physical);
        return new Binding(compiledPath, physical, expected, actual, expected == actual, pdbGuid, codeViews.Any(item => item.Guid == pdbGuid));
    }).ToArray();
}

internal sealed record Input(string Name, string Key, string Value);
internal sealed record StoreEvent(string Operation, string Key, bool Hit);
internal sealed record Binding(string CompiledDocument, string PhysicalSource, string PdbDocumentSha256, string ActualSourceSha256, bool SourceMatched, Guid PdbGuid, bool PePdbGuidMatched);
internal sealed record StorageObservation(CacheVaryByRules Rules, object? Storage, int? Count);

internal sealed class ObservationState(string scenario)
{
    internal string Scenario { get; } = scenario;
    internal StorageObservation? Last { get; set; }
}

internal sealed class ObservationPolicy(ObservationState state) : IOutputCachePolicy
{
    internal static readonly FieldInfo Storage = typeof(CacheVaryByRules).GetField("_varyByValues", BindingFlags.Instance | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException("Missing pinned source-owned backing storage.");

    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellationToken)
    {
        if (state.Scenario == "initialized-empty")
        {
            _ = context.CacheVaryByRules.VaryByValues;
        }
        if (state.Scenario == "cleared-after-policy")
        {
            context.CacheVaryByRules.VaryByValues.Clear();
        }
        var storage = Storage.GetValue(context.CacheVaryByRules);
        state.Last = new(context.CacheVaryByRules, storage, (storage as IDictionary<string, string>)?.Count);
        return ValueTask.CompletedTask;
    }

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellationToken) => ValueTask.CompletedTask;
    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellationToken) => ValueTask.CompletedTask;
}

internal sealed class CapturingStore(IOutputCacheStore inner) : IOutputCacheStore, IDisposable
{
    internal List<StoreEvent> Events { get; } = [];

    public async ValueTask<byte[]?> GetAsync(string key, CancellationToken cancellationToken)
    {
        var value = await inner.GetAsync(key, cancellationToken);
        Events.Add(new("get", key, value is not null));
        return value;
    }

    public ValueTask SetAsync(string key, byte[] value, string[]? tags, TimeSpan validFor, CancellationToken cancellationToken)
    {
        Events.Add(new("set", key, false));
        return inner.SetAsync(key, value, tags, validFor, cancellationToken);
    }

    public ValueTask EvictByTagAsync(string tag, CancellationToken cancellationToken) => inner.EvictByTagAsync(tag, cancellationToken);

    public void Dispose()
    {
        (inner as IDisposable)?.Dispose();
    }
}
