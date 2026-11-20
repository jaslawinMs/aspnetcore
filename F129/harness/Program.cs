using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Media;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.JSInterop;
using Moq;

if (args.Length != 2)
{
    throw new ArgumentException("Expected role and destination JSON path.");
}

string[] profiles =
[
    "NoAttributes", "OrdinaryNoHref", "OrdinaryWithHref", "UppercaseHrefOrdinalIgnoreCase",
    "ReplaceValueWithHref", "ReplaceValueWithoutHref", "AddKeyWithHref", "AddKeyWithoutHref",
    "ChildContentWithHref"
];
var observations = new List<Observation>();
foreach (var profile in profiles)
{
    for (var repetition = 1; repetition <= 3; repetition++)
    {
        observations.Add(await CharacterizeAsync(profile, repetition));
    }
}

var assemblies = AppDomain.CurrentDomain.GetAssemblies()
    .Where(assembly => !assembly.IsDynamic &&
        (assembly.GetName().Name?.StartsWith("Microsoft.AspNetCore.Components", StringComparison.Ordinal) is true ||
         assembly.GetName().Name?.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal) is true ||
         assembly.GetName().Name is "Microsoft.JSInterop" or "AutoPerf.Characterization" or "Moq" or "Castle.Core"))
    .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
    .Select(assembly => new
    {
        Name = assembly.GetName().Name,
        Version = assembly.GetName().Version?.ToString(),
        assembly.Location,
        Sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        Mvid = assembly.ManifestModule.ModuleVersionId,
        InformationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    })
    .ToArray();
var failures = observations.Where(observation => observation.Failures.Count > 0).ToArray();
var sourceBindings = new[]
{
    BindSource(typeof(FileDownload).Assembly, @"src\Components\Media\src\FileDownload.cs"),
    BindSource(typeof(FileDownload).Assembly, @"src\Components\Media\src\MediaComponentBase.cs"),
    BindSource(typeof(FileDownload).Assembly, @"src\Components\Media\src\MediaSource.cs"),
    BindSource(typeof(ComponentBase).Assembly, @"src\Components\Components\src\Rendering\RenderTreeBuilder.cs"),
    BindSource(typeof(HtmlRenderer).Assembly, @"src\Components\Web\src\HtmlRendering\HtmlRenderer.cs")
};
var report = new
{
    Role = args[0],
    Framework = RuntimeInformation.FrameworkDescription,
    Runtime = Environment.Version.ToString(),
    Architecture = RuntimeInformation.ProcessArchitecture.ToString(),
    Boundary = "Actual managed component rendering through public HtmlRenderer; no browser, JS, timing or allocation measurement.",
    Assemblies = assemblies,
    SourceBindings = sourceBindings,
    Observations = observations,
    ContractFailureRows = failures.Length,
    ContractFailureProfiles = failures.Select(failure => failure.Profile).Distinct().ToArray()
};
File.WriteAllText(args[1], JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);
Console.WriteLine(JsonSerializer.Serialize(new { Role = args[0], Rows = observations.Count, ContractFailureRows = failures.Length, report.ContractFailureProfiles }));
Environment.ExitCode = failures.Length == 0 ? 0 : 2;

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
        throw new InvalidOperationException($"Loaded PE and portable PDB do not match: {assembly.Location}");
    }

    var suffix = "/" + relative.Replace('\\', '/');
    var handle = reader.Documents.Single(handle => reader.GetString(reader.GetDocument(handle).Name).Replace('\\', '/').EndsWith(suffix, StringComparison.Ordinal));
    var document = reader.GetDocument(handle);
    var documentName = reader.GetString(document.Name);
    var algorithm = reader.GetGuid(document.HashAlgorithm);
    var sourcePath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "source", relative));
    var sourceBytes = File.ReadAllBytes(sourcePath);
    var actual = algorithm switch
    {
        var guid when guid == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") => SHA256.HashData(sourceBytes),
        var guid when guid == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") => SHA1.HashData(sourceBytes),
        _ => throw new NotSupportedException($"Unrecognized portable PDB source hash algorithm {algorithm}.")
    };
    var expected = reader.GetBlobBytes(document.Hash);
    if (!actual.AsSpan().SequenceEqual(expected))
    {
        throw new InvalidOperationException($"Loaded source checksum does not match the physical snapshot: {documentName}");
    }

    return new(assembly.GetName().Name!, assembly.Location, pdbPath, codeView.Guid, debugEntry.Stamp,
        documentName, relative, algorithm, Convert.ToHexString(expected), Convert.ToHexString(SHA256.HashData(sourceBytes)));
}

static async Task<Observation> CharacterizeAsync(string profile, int repetition)
{
    IEqualityComparer<string> comparer = profile is "UppercaseHrefOrdinalIgnoreCase" ? StringComparer.OrdinalIgnoreCase : EqualityComparer<string>.Default;
    Dictionary<string, object>? attributes = profile is "NoAttributes" ? null : new(comparer);
    if (profile is "OrdinaryWithHref" or "ReplaceValueWithHref" or "AddKeyWithHref" or "ChildContentWithHref")
    {
        attributes!.Add("href", "https://example.test/ignored");
    }
    if (profile is "UppercaseHrefOrdinalIgnoreCase")
    {
        attributes!.Add("HREF", "https://example.test/uppercase");
    }
    MutatingValue? value = null;
    if (profile.StartsWith("ReplaceValue", StringComparison.Ordinal))
    {
        var target = attributes!;
        value = new MutatingValue(() => target["data-after"] = "after");
        target.Add("data-trigger", value);
        target.Add("data-after", "before");
    }
    else if (profile.StartsWith("AddKey", StringComparison.Ordinal) || profile is "ChildContentWithHref")
    {
        var target = attributes!;
        value = new MutatingValue(() => target.Add("data-late", "late"));
        target.Add("data-trigger", value);
        target.Add("data-after", "before");
    }
    else
    {
        attributes?.Add("class", "btn");
    }

    var js = new Mock<IJSRuntime>(MockBehavior.Strict);
    var services = new ServiceCollection().AddLogging().AddSingleton(js.Object);
    await using var provider = services.BuildServiceProvider();
    await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
    using var stream = new MemoryStream([1, 2, 3], writable: false);
    var source = new MediaSource(stream, "application/octet-stream", $"F129-{profile}-{repetition}");
    var parameters = new Dictionary<string, object?>
    {
        [nameof(FileDownload.Source)] = source,
        [nameof(FileDownload.FileName)] = "diagnostic.bin",
        [nameof(FileDownload.AdditionalAttributes)] = attributes
    };
    if (profile is "ChildContentWithHref")
    {
        RenderFragment<FileDownloadContext> content = _ => builder => builder.AddContent(0, "custom-link");
        parameters.Add(nameof(FileDownload.ChildContent), content);
    }

    var suppliedHrefWasDetected = attributes?.ContainsKey("href") is true;
    string? html = null;
    ObservedException? observedException = null;
    try
    {
        html = await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var component = await renderer.RenderComponentAsync<FileDownload>(ParameterView.FromDictionary(parameters));
            return component.ToHtmlString();
        });
    }
    catch (InvalidOperationException exception)
    {
        observedException = new(exception.GetType().FullName!, exception.Message, exception.StackTrace);
    }

    var failures = new List<string>();
    var expectsException = profile is "AddKeyWithoutHref";
    if (expectsException)
    {
        Require(observedException is not null &&
            observedException.Type == typeof(InvalidOperationException).FullName &&
            observedException.Message.Contains("Collection was modified", StringComparison.Ordinal),
            "Expected the original direct-enumeration InvalidOperationException.", failures);
    }
    else
    {
        Require(observedException is null, $"Expected successful rendering, observed {observedException?.Type}: {observedException?.Message}", failures);
        Require(html is not null, "No actual HTML was produced.", failures);
    }

    if (profile is "ChildContentWithHref")
    {
        Require(html == "custom-link", "Custom ChildContent output changed.", failures);
        Require(value?.Calls == 0, "Custom content must bypass value conversion.", failures);
        Require(attributes?.ContainsKey("data-late") is false, "The bypassed mutator changed its source.", failures);
    }
    else
    {
        Require(value is null || value.Calls == 1, "The actual renderer must convert the mutating object exactly once.", failures);
        if (html is not null)
        {
            Require(html.StartsWith("<a ", StringComparison.Ordinal) && html.EndsWith(">Download</a>", StringComparison.Ordinal), "Default anchor output changed.", failures);
            if (profile is not "UppercaseHrefOrdinalIgnoreCase")
            {
                Require(html.Contains("href=\"javascript:void(0)\"", StringComparison.Ordinal), "The original inert href was not rendered.", failures);
                Require(!html.Contains("https://example.test/ignored", StringComparison.Ordinal), "The supplied lowercase href was rendered.", failures);
            }
        }
    }

    if (profile is "OrdinaryNoHref" or "OrdinaryWithHref" or "UppercaseHrefOrdinalIgnoreCase")
    {
        Require(html?.Contains("class=\"btn\"", StringComparison.Ordinal) is true, "The ordinary class attribute was not rendered.", failures);
    }
    if (profile.StartsWith("ReplaceValue", StringComparison.Ordinal))
    {
        Require(attributes?["data-after"] is "after", "The production ToString dispatch did not update the source dictionary.", failures);
        var expected = profile is "ReplaceValueWithHref" ? "before" : "after";
        Require(html?.Contains($"data-after=\"{expected}\"", StringComparison.Ordinal) is true, $"Expected rendered data-after={expected}.", failures);
    }
    if (profile.StartsWith("AddKey", StringComparison.Ordinal))
    {
        Require(attributes?.ContainsKey("data-late") is true, "The production ToString dispatch did not add the source key.", failures);
        if (profile is "AddKeyWithHref")
        {
            Require(html?.Contains("data-after=\"before\"", StringComparison.Ordinal) is true, "The copied trailing value did not render.", failures);
            Require(html is not null && !html.Contains("data-late", StringComparison.Ordinal), "The late key escaped the original snapshot.", failures);
        }
    }
    js.VerifyNoOtherCalls();

    return new(profile, repetition, suppliedHrefWasDetected, html, observedException, value?.Calls ?? 0,
        attributes?.Count ?? 0, attributes?.ContainsKey("data-late") is true,
        attributes?.TryGetValue("data-after", out var after) is true && after is string afterText ? afterText : null,
        failures);
}

static void Require(bool condition, string message, List<string> failures)
{
    if (!condition)
    {
        failures.Add(message);
    }
}

internal sealed class MutatingValue(Action mutate)
{
    public int Calls { get; private set; }

    public override string ToString()
    {
        Calls++;
        mutate();
        return "converted";
    }
}

internal sealed record ObservedException(string Type, string Message, string? StackTrace);

internal sealed record SourceBinding(
    string Assembly,
    string AssemblyLocation,
    string PdbLocation,
    Guid CodeViewGuid,
    uint DebugStamp,
    string DocumentName,
    string RelativeSource,
    Guid HashAlgorithm,
    string PdbSourceChecksum,
    string SnapshotSha256);

internal sealed record Observation(
    string Profile,
    int Repetition,
    bool SuppliedHrefWasDetected,
    string? Html,
    ObservedException? Exception,
    int ToStringCalls,
    int SourceAttributeCount,
    bool SourceContainsLateKey,
    string? SourceAfterValue,
    List<string> Failures);
