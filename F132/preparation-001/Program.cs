using System.Diagnostics;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

if (args.Length != 3 || args[0] is not ("characterize" or "measure"))
{
    throw new ArgumentException("Expected characterize|measure, role and destination JSON path.");
}

string[] profiles = ["RegisteredShort4", "RegisteredLong4", "PlainShort4"];
var rows = new List<ProfileResult>();
var measuring = args[0] is "measure";
foreach (var profile in profiles)
{
    for (var repetition = 1; repetition <= (measuring ? 1 : 3); repetition++)
    {
        rows.Add(await ExecuteAsync(profile, repetition, measuring));
    }
}

var owner = typeof(ComponentBase).Assembly;
var bindings = new[]
{
    BindSource(owner, @"src\Components\Components\src\ComponentSubscriptionKey.cs"),
    BindSource(owner, @"src\Components\Components\src\CascadingParameterInfo.cs"),
    BindSource(owner, @"src\Components\Components\src\CascadingParameterValueProvider.cs"),
    BindSource(owner, @"src\Components\Components\src\PersistentState\PersistentStateValueProvider.cs"),
    BindSource(owner, @"src\Components\Components\src\CascadingParameterState.cs"),
    BindSource(owner, @"src\Components\Components\src\Rendering\ComponentState.cs"),
    BindSource(owner, @"src\Components\Components\src\ParameterView.cs"),
    BindSource(typeof(HtmlRenderer).Assembly, @"src\Components\Web\src\HtmlRendering\HtmlRenderer.cs"),
};
var assemblies = AppDomain.CurrentDomain.GetAssemblies()
    .Where(assembly => !assembly.IsDynamic &&
        (assembly.GetName().Name?.StartsWith("Microsoft.AspNetCore.Components", StringComparison.Ordinal) is true ||
         assembly.GetName().Name?.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal) is true ||
         assembly.GetName().Name is "Microsoft.JSInterop" or "AutoPerf.CascadingHashes" or "System.Private.CoreLib"))
    .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
    .Select(assembly => new
    {
        Name = assembly.GetName().Name,
        assembly.Location,
        Sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        Mvid = assembly.ManifestModule.ModuleVersionId,
        InformationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    }).ToArray();
var failures = rows.Sum(row => row.Failures.Count);
var report = new
{
    Mode = args[0], Role = args[1], Framework = RuntimeInformation.FrameworkDescription,
    Runtime = Environment.Version.ToString(), Architecture = RuntimeInformation.ProcessArchitecture.ToString(),
    Stopwatch.Frequency, CommonHarness = typeof(ProbeParent).Assembly.Location,
    Boundary = "Real public registration and HtmlRenderer parameter delivery/lifetime; not a native browser, Session/TempData I/O, persistence-navigation or complete compiler-provenance claim.",
    StructSizes = new
    {
        CascadingParameterInfo = Unsafe.SizeOf<CascadingParameterInfo>(),
        ComponentSubscriptionKey = SizeOf(owner.GetType("Microsoft.AspNetCore.Components.Infrastructure.ComponentSubscriptionKey", throwOnError: true)!),
        CascadingParameterState = SizeOf(owner.GetType("Microsoft.AspNetCore.Components.CascadingParameterState", throwOnError: true)!),
    },
    ProcessOverrides = new
    {
        TieredCompilation = Environment.GetEnvironmentVariable("DOTNET_TieredCompilation"),
        TieredPGO = Environment.GetEnvironmentVariable("DOTNET_TieredPGO"),
        ReadyToRun = Environment.GetEnvironmentVariable("DOTNET_ReadyToRun"),
    },
    SourceBindings = bindings, Assemblies = assemblies, Rows = rows, ContractFailures = failures,
};
File.WriteAllText(args[2], JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);
Console.WriteLine(JsonSerializer.Serialize(new { report.Mode, report.Role, Rows = rows.Count, report.StructSizes, report.ContractFailures }));
Environment.ExitCode = failures == 0 ? 0 : 2;

static int SizeOf(Type type)
    => (int)(typeof(Unsafe).GetMethod(nameof(Unsafe.SizeOf))!.MakeGenericMethod(type).Invoke(null, null)
        ?? throw new InvalidOperationException("Missing actual struct size."));

static async Task<ProfileResult> ExecuteAsync(string profile, int repetition, bool measuring)
{
    var stats = new ProbeStats();
    var services = new ServiceCollection().AddLogging();
    if (profile is "PlainShort4")
    {
        services.AddCascadingValue(_ => new CascadingValueSource<string>(ProbeStats.SuppliedValue, isFixed: false));
    }
    else
    {
        services.TryAddCascadingValueSupplier<ProbeAttribute>(_ => (subscriber, _, info) =>
        {
            stats.Created++;
            stats.Active++;
            if (stats.Captured.Count < 8)
            {
                stats.Captured.Add(new(subscriber, info));
            }
            return new ProbeSubscription(stats);
        });
    }

    await using var provider = services.BuildServiceProvider();
    var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
    var result = new ProfileResult(profile, repetition);
    ProbeParent? parent = null;
    try
    {
        await renderer.Dispatcher.InvokeAsync(async () =>
        {
            Action<ProbeParent> capture = value => parent = value;
            var root = await renderer.RenderComponentAsync<ProbeParent>(ParameterView.FromDictionary(
                new Dictionary<string, object?>
                {
                    [nameof(ProbeParent.Profile)] = profile,
                    [nameof(ProbeParent.Stats)] = stats,
                    [nameof(ProbeParent.Capture)] = capture,
                }));
            var retainedParent = parent ?? throw new InvalidOperationException("Real root capture did not run.");
            var subscribed = profile is not "PlainShort4";
            var expectedSubscriptions = subscribed ? 64 * 4 : 0;
            Require(stats.Children.Count == 64, "Real component activation did not create exactly64 children.", result);
            Require(stats.Created == expectedSubscriptions && stats.Active == expectedSubscriptions,
                "Actual subscription creation count differs.", result);
            result.PropertyNames = subscribed
                ? stats.Captured.Select(item => item.Info.PropertyName).Distinct(StringComparer.Ordinal).ToArray()
                : [nameof(PlainLeaf.FirstValue), nameof(PlainLeaf.SecondValue), nameof(PlainLeaf.ThirdValue), nameof(PlainLeaf.FourthValue)];
            result.InitialHtml = root.ToHtmlString();
            VerifyHtml(result.InitialHtml, 0, result);
            if (subscribed)
            {
                result.KeyContracts.AddRange(CheckKeyContracts(stats.Captured));
                Require(result.KeyContracts.All(row => row.Passed), "Actual subscription-key invariant failed.", result);
            }

            var ticks = 0;
            if (measuring)
            {
                for (var warmup = 0; warmup < 3; warmup++)
                {
                    for (var operation = 0; operation < 256; operation++)
                    {
                        retainedParent.Step();
                        ticks++;
                    }
                }

                for (var batch = 0; batch < 8; batch++)
                {
                    var callsBefore = stats.Gets;
                    var allocationsBefore = GC.GetAllocatedBytesForCurrentThread();
                    var started = Stopwatch.GetTimestamp();
                    for (var operation = 0; operation < 256; operation++)
                    {
                        retainedParent.Step();
                    }
                    var elapsed = Stopwatch.GetTimestamp() - started;
                    var allocated = GC.GetAllocatedBytesForCurrentThread() - allocationsBefore;
                    ticks += 256;
                    result.Samples.Add(new(batch + 1, 256, elapsed, allocated, stats.Gets - callsBefore));
                    Require(stats.Gets - callsBefore == (subscribed ? 256L * 64 * 4 : 0),
                        "A timed batch bypassed the real provider producer.", result);
                }
            }
            else
            {
                for (var operation = 0; operation < 5; operation++)
                {
                    retainedParent.Step();
                    ticks++;
                }
            }

            result.ParentTicks = ticks;
            result.ReadCallsBeforeRemoval = stats.Gets;
            result.ActualRetainedChildren = stats.Children.Count;
            result.ActualChildRendersBeforeRemoval = stats.Children.Sum(child => child.Renders);
            result.FinalHtml = root.ToHtmlString();
            VerifyHtml(result.FinalHtml, ticks, result);
            Require(stats.Children.Count == 64, "Normal parameter updates replaced retained child instances.", result);
            Require(stats.Children.All(child => child.Generation == ticks && child.Renders == ticks + 1),
                "Retained children did not receive/render every changed direct parameter.", result);
            Require(stats.Gets == (subscribed ? (long)(ticks + 1) * 64 * 4 : 0),
                "Real current-value counts do not match every parameter delivery.", result);
            Require(stats.Created == expectedSubscriptions && stats.Active == expectedSubscriptions,
                "Updates unexpectedly recreated subscriptions.", result);

            retainedParent.DropChildren();
            result.HtmlAfterRemoval = root.ToHtmlString();
            Require(result.HtmlAfterRemoval == "<main></main>", "Real renderer did not remove all child output.", result);
            Require(stats.Active == 0 && stats.Disposed == expectedSubscriptions,
                "Renderer-owned unsubscribe did not dispose every removed subscription.", result);

            retainedParent.RestoreChildren();
            result.HtmlAfterReactivation = root.ToHtmlString();
            VerifyHtml(result.HtmlAfterReactivation, ticks + 2, result);
            Require(stats.Children.Count == 128, "Reactivation did not create64 new children.", result);
            Require(stats.Created == expectedSubscriptions * 2 && stats.Active == expectedSubscriptions,
                "Reactivation did not establish the expected fresh subscriptions.", result);
        });
    }
    finally
    {
        await renderer.DisposeAsync();
    }

    result.SubscriptionsCreated = stats.Created;
    result.SubscriptionsDisposed = stats.Disposed;
    result.ActiveAfterRendererDisposal = stats.Active;
    Require(stats.Active == 0 && stats.Created == stats.Disposed, "Final renderer disposal leaked a subscription.", result);
    return result;
}

static void VerifyHtml(string html, int generation, ProfileResult result)
{
    var child = $"<span data-generation=\"{generation}\">{string.Concat(Enumerable.Repeat(ProbeStats.SuppliedValue, 4))}</span>";
    var expected = "<main>" + string.Concat(Enumerable.Repeat(child, 64)) + "</main>";
    Require(html == expected, $"Actual rendered child values/generation differ at generation{generation}.", result);
}

static List<KeyContract> CheckKeyContracts(List<CapturedInput> captured)
{
    var first = captured[0];
    var otherProperty = captured.First(item => ReferenceEquals(item.Subscriber, first.Subscriber) && item.Info.PropertyName != first.Info.PropertyName);
    var otherSubscriber = captured.First(item => !ReferenceEquals(item.Subscriber, first.Subscriber));
    var infoConstructor = typeof(CascadingParameterInfo).GetConstructor(BindingFlags.Instance | BindingFlags.NonPublic,
        null, [typeof(CascadingParameterAttributeBase), typeof(string), typeof(Type)], null)
        ?? throw new InvalidOperationException("Missing actual metadata constructor.");
    var type = typeof(ComponentBase).Assembly.GetType("Microsoft.AspNetCore.Components.Infrastructure.ComponentSubscriptionKey", throwOnError: true)!;
    var keyConstructor = type.GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic).Single();
    object CreateKey(ComponentState? subscriber, CascadingParameterInfo info)
    {
        object? second = keyConstructor.GetParameters()[1].ParameterType == typeof(string) ? info.PropertyName : info;
        return keyConstructor.Invoke([subscriber, second]);
    }
    CascadingParameterInfo CopyWithName(string name)
        => (CascadingParameterInfo)infoConstructor.Invoke([first.Info.Attribute, name, first.Info.PropertyType]);
    var key = CreateKey(first.Subscriber, first.Info);
    var copiedName = new string(first.Info.PropertyName.ToCharArray());
    var sameText = CreateKey(first.Subscriber, CopyWithName(copiedName));
    var changedCase = CreateKey(first.Subscriber, CopyWithName(first.Info.PropertyName.ToUpperInvariant()));
    var differentProperty = CreateKey(first.Subscriber, otherProperty.Info);
    var differentSubscriber = CreateKey(otherSubscriber.Subscriber, first.Info);
    var empty = Activator.CreateInstance(type)!;
    var nullName = CreateKey(first.Subscriber, default);
    return
    [
        new("ActualMetadataHashFormula", key.GetHashCode(), HashCode.Combine(first.Subscriber, first.Info.PropertyName),
            key.GetHashCode() == HashCode.Combine(first.Subscriber, first.Info.PropertyName)),
        new("EqualTextDifferentReference", key.GetHashCode(), sameText.GetHashCode(),
            !ReferenceEquals(copiedName, first.Info.PropertyName) && key.Equals(sameText) && key.GetHashCode() == sameText.GetHashCode()),
        new("OrdinalCaseDistinction", key.GetHashCode(), changedCase.GetHashCode(), !key.Equals(changedCase)),
        new("DifferentProperty", key.GetHashCode(), differentProperty.GetHashCode(), !key.Equals(differentProperty)),
        new("DifferentActualSubscriber", key.GetHashCode(), differentSubscriber.GetHashCode(), !key.Equals(differentSubscriber)),
        new("DefaultKeyHashFormula", empty.GetHashCode(), HashCode.Combine<ComponentState?, string?>(null, null),
            empty.Equals(Activator.CreateInstance(type)) && empty.GetHashCode() == HashCode.Combine<ComponentState?, string?>(null, null)),
        new("DefaultMetadataNullNameHashFormula", nullName.GetHashCode(), HashCode.Combine<ComponentState?, string?>(first.Subscriber, null),
            nullName.GetHashCode() == HashCode.Combine<ComponentState?, string?>(first.Subscriber, null)),
    ];
}

static void Require(bool condition, string message, ProfileResult result)
{
    if (!condition)
    {
        result.Failures.Add(message);
    }
}

static SourceBinding BindSource(Assembly assembly, string relative)
{
    var pdbPath = Path.ChangeExtension(assembly.Location, ".pdb");
    using var pe = new PEReader(File.OpenRead(assembly.Location));
    var debugEntry = pe.ReadDebugDirectory().Single(entry => entry.Type is DebugDirectoryEntryType.CodeView);
    var codeView = pe.ReadCodeViewDebugDirectoryData(debugEntry);
    using var provider = MetadataReaderProvider.FromPortablePdbStream(File.OpenRead(pdbPath));
    var reader = provider.GetMetadataReader();
    var id = reader.DebugMetadataHeader?.Id.ToArray() ?? throw new InvalidOperationException("Missing portable PDB identity.");
    if (new Guid(id.AsSpan(0, 16)) != codeView.Guid || BitConverter.ToUInt32(id.AsSpan(16, 4)) != debugEntry.Stamp)
    {
        throw new InvalidOperationException($"Actual PE and portable PDB do not match: {assembly.Location}");
    }

    var suffix = "/" + relative.Replace('\\', '/');
    var handle = reader.Documents.Single(handle => reader.GetString(reader.GetDocument(handle).Name).Replace('\\', '/').EndsWith(suffix, StringComparison.Ordinal));
    var document = reader.GetDocument(handle);
    var documentName = reader.GetString(document.Name);
    var algorithm = reader.GetGuid(document.HashAlgorithm);
    var source = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "source", relative));
    var bytes = File.ReadAllBytes(source);
    var actual = algorithm switch
    {
        var guid when guid == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") => SHA256.HashData(bytes),
        var guid when guid == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") => SHA1.HashData(bytes),
        _ => throw new NotSupportedException($"Unrecognized portable PDB source hash algorithm {algorithm}."),
    };
    var expected = reader.GetBlobBytes(document.Hash);
    if (!actual.AsSpan().SequenceEqual(expected))
    {
        throw new InvalidOperationException($"Actual source snapshot does not match the loaded owner PDB: {documentName}");
    }

    return new(assembly.GetName().Name!, assembly.Location, pdbPath, codeView.Guid, debugEntry.Stamp, documentName, relative,
        algorithm, Convert.ToHexString(expected), Convert.ToHexString(SHA256.HashData(bytes)));
}

public sealed class ProbeStats
{
    public const string SuppliedValue = "F132-value";
    public long Created;
    public long Disposed;
    public long Gets;
    public long Active;
    public List<CapturedInput> Captured { get; } = new(8);
    public List<ProbeLeaf> Children { get; } = new();
    public Action<ProbeLeaf> Capture { get; }
    public ProbeStats() => Capture = Children.Add;
}

[AttributeUsage(AttributeTargets.Property)]
public sealed class ProbeAttribute : CascadingParameterAttributeBase;

public sealed class ProbeSubscription(ProbeStats stats) : CascadingParameterSubscription
{
    private bool _disposed;
    public override object GetCurrentValue()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException(nameof(ProbeSubscription));
        }
        stats.Gets++;
        return ProbeStats.SuppliedValue;
    }
    public override void Dispose()
    {
        if (_disposed)
        {
            throw new InvalidOperationException("Subscription disposed twice.");
        }
        _disposed = true;
        stats.Disposed++;
        stats.Active--;
    }
}

public sealed class ProbeParent : ComponentBase
{
    private int _generation;
    private int _children = 64;
    [Parameter] public string Profile { get; set; } = string.Empty;
    [Parameter] public ProbeStats Stats { get; set; } = null!;
    [Parameter] public Action<ProbeParent> Capture { get; set; } = null!;
    protected override void OnInitialized() => Capture(this);
    public void Step()
    {
        _generation++;
        StateHasChanged();
    }
    public void DropChildren()
    {
        _children = 0;
        Step();
    }
    public void RestoreChildren()
    {
        _children = 64;
        Step();
    }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        var leafType = Profile switch
        {
            "RegisteredShort4" => typeof(ShortLeaf),
            "RegisteredLong4" => typeof(LongLeaf),
            "PlainShort4" => typeof(PlainLeaf),
            _ => throw new InvalidOperationException("Unknown profile."),
        };
        builder.OpenElement(0, "main");
        for (var index = 0; index < _children; index++)
        {
            builder.OpenComponent(1, leafType);
            builder.AddComponentParameter(2, nameof(ProbeLeaf.Generation), _generation);
            builder.AddComponentParameter(3, nameof(ProbeLeaf.Capture), Stats.Capture);
            builder.CloseComponent();
        }
        builder.CloseElement();
    }
}

public abstract class ProbeLeaf : ComponentBase
{
    [Parameter] public int Generation { get; set; }
    [Parameter] public Action<ProbeLeaf> Capture { get; set; } = null!;
    public int Renders { get; private set; }
    protected override void OnInitialized() => Capture(this);
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        Renders++;
        builder.OpenElement(0, "span");
        builder.AddAttribute(1, "data-generation", Generation);
        WriteValues(builder);
        builder.CloseElement();
    }
    protected abstract void WriteValues(RenderTreeBuilder builder);
}

public sealed class ShortLeaf : ProbeLeaf
{
    [Probe] public string FirstValue { get; set; } = string.Empty;
    [Probe] public string SecondValue { get; set; } = string.Empty;
    [Probe] public string ThirdValue { get; set; } = string.Empty;
    [Probe] public string FourthValue { get; set; } = string.Empty;
    protected override void WriteValues(RenderTreeBuilder builder)
    {
        builder.AddContent(2, FirstValue);
        builder.AddContent(3, SecondValue);
        builder.AddContent(4, ThirdValue);
        builder.AddContent(5, FourthValue);
    }
}

public sealed class LongLeaf : ProbeLeaf
{
    [Probe] public string FirstCascadingParameterPropertyWithAnIntentionallyLongMetadataName { get; set; } = string.Empty;
    [Probe] public string SecondCascadingParameterPropertyWithAnIntentionallyLongMetadataName { get; set; } = string.Empty;
    [Probe] public string ThirdCascadingParameterPropertyWithAnIntentionallyLongMetadataName { get; set; } = string.Empty;
    [Probe] public string FourthCascadingParameterPropertyWithAnIntentionallyLongMetadataName { get; set; } = string.Empty;
    protected override void WriteValues(RenderTreeBuilder builder)
    {
        builder.AddContent(2, FirstCascadingParameterPropertyWithAnIntentionallyLongMetadataName);
        builder.AddContent(3, SecondCascadingParameterPropertyWithAnIntentionallyLongMetadataName);
        builder.AddContent(4, ThirdCascadingParameterPropertyWithAnIntentionallyLongMetadataName);
        builder.AddContent(5, FourthCascadingParameterPropertyWithAnIntentionallyLongMetadataName);
    }
}

public sealed class PlainLeaf : ProbeLeaf
{
    [CascadingParameter] public string FirstValue { get; set; } = string.Empty;
    [CascadingParameter] public string SecondValue { get; set; } = string.Empty;
    [CascadingParameter] public string ThirdValue { get; set; } = string.Empty;
    [CascadingParameter] public string FourthValue { get; set; } = string.Empty;
    protected override void WriteValues(RenderTreeBuilder builder)
    {
        builder.AddContent(2, FirstValue);
        builder.AddContent(3, SecondValue);
        builder.AddContent(4, ThirdValue);
        builder.AddContent(5, FourthValue);
    }
}

public sealed record CapturedInput(ComponentState Subscriber, CascadingParameterInfo Info);
public sealed record KeyContract(string Name, int ActualHash, int ComparedHash, bool Passed);
public sealed record Batch(int Index, int ParentTicks, long ElapsedStopwatchTicks, long AllocatedBytes, long ActualProducerReads);
public sealed record SourceBinding(string Assembly, string ActualAssemblyPath, string ActualPdbPath, Guid PeCodeViewGuid,
    uint PeCodeViewStamp, string DocumentName, string RelativePath, Guid HashAlgorithm, string PdbDocumentHash, string SourceSha256);
public sealed record ProfileResult(string Profile, int Repetition)
{
    public List<string> Failures { get; } = [];
    public List<KeyContract> KeyContracts { get; } = [];
    public List<Batch> Samples { get; } = [];
    public string[] PropertyNames { get; set; } = [];
    public string InitialHtml { get; set; } = string.Empty;
    public string FinalHtml { get; set; } = string.Empty;
    public string HtmlAfterRemoval { get; set; } = string.Empty;
    public string HtmlAfterReactivation { get; set; } = string.Empty;
    public int ParentTicks { get; set; }
    public int ActualRetainedChildren { get; set; }
    public int ActualChildRendersBeforeRemoval { get; set; }
    public long ReadCallsBeforeRemoval { get; set; }
    public long SubscriptionsCreated { get; set; }
    public long SubscriptionsDisposed { get; set; }
    public long ActiveAfterRendererDisposal { get; set; }
}
