using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.DependencyInjection;

if (args is not ["characterize", var role, var output])
{
    throw new ArgumentException("Expected: characterize <role> <output.json>. No timing mode exists.");
}

var profiles = new[] { "PublicInvalid", "PublicValid", "ManyPropertiesInvalid", "ExplicitInvalid", "NamesakeRequired", "NamesakeCase", "OrdinaryObject" };
var rows = new List<Observation>();
foreach (var providerMode in new[] { "Default", "DecoratedProvider" })
{
    var collection = new ServiceCollection();
    collection.AddLogging();
    collection.AddMvcCore().AddDataAnnotations();
    if (providerMode is "DecoratedProvider")
    {
        collection.AddSingleton<IModelMetadataProvider>(provider =>
            new MetadataDecorator(ActivatorUtilities.CreateInstance<DefaultModelMetadataProvider>(provider)));
    }

    using var services = collection.BuildServiceProvider();
    var metadataProvider = services.GetRequiredService<IModelMetadataProvider>();
    var validator = services.GetRequiredService<IObjectModelValidator>();
    foreach (var profile in profiles)
    {
        for (var repetition = 0; repetition < 2; repetition++)
        {
            var payload = new Payload(profile is "PublicValid" or "NamesakeRequired" ? "valid" : "invalid");
            TrackedModel model = profile switch
            {
                "PublicInvalid" or "PublicValid" => new PublicUnion(payload),
                "ManyPropertiesInvalid" => new ManyPropertiesUnion(payload),
                "ExplicitInvalid" => new ExplicitUnion(payload),
                "NamesakeRequired" => new NamesakeUnion(null, payload),
                "NamesakeCase" => new NamesakeUnion("public", payload),
                "OrdinaryObject" => new OrdinaryEnvelope(payload),
                _ => throw new InvalidOperationException("Unknown fixed profile."),
            };
            var metadata = metadataProvider.GetMetadataForType(model.GetType());
            var properties = metadata.Properties.ToArray();
            var propertyMetadata = properties.Select(property => new MetadataObservation(
                property.PropertyName!, property.MetadataKind.ToString(), property.GetType().FullName!,
                property is DefaultModelMetadata,
                property.MetadataKind is ModelMetadataKind.Property && property.PropertyName == nameof(IUnion.Value),
                property.MetadataKind is ModelMetadataKind.Property && property.PropertyName == nameof(IUnion.Value) && property is not DefaultModelMetadata))
                .ToArray();
            var context = new ActionContext { HttpContext = new DefaultHttpContext { RequestServices = services } };
            validator.Validate(context, null, "model", model);
            var errors = context.ModelState.OrderBy(entry => entry.Key, StringComparer.Ordinal)
                .SelectMany(entry => entry.Value!.Errors.Select(error => new Error(entry.Key, error.ErrorMessage)))
                .ToArray();
            var cachedProperties = metadataProvider.GetMetadataForProperties(model.GetType()).ToArray();
            var row = new Observation(profile, providerMode, repetition)
            {
                ProviderClrType = metadataProvider.GetType().FullName!,
                RootMetadataClrType = metadata.GetType().FullName!,
                RootIsDefaultModelMetadata = metadata is DefaultModelMetadata,
                ActualProperties = propertyMetadata,
                ActualNamedValueCandidates = propertyMetadata.Count(property => property.NamedValueGuardMatches),
                SourcePredicateFallbackEligibleMetadata = propertyMetadata.Count(property => property.TargetFallbackEligible),
                ActualMetadataReferenceRetained = ReferenceEquals(metadata, metadataProvider.GetMetadataForType(model.GetType())),
                ActualPropertyMetadataReferencesRetained = properties.Length == cachedProperties.Length &&
                    properties.Zip(cachedProperties).All(pair => ReferenceEquals(pair.First, pair.Second)),
                ActualModelStateValid = context.ModelState.IsValid,
                ActualErrors = errors,
                ActualPublicGetterCalls = model.PublicGetterCalls,
                ActualInterfaceGetterCalls = model.InterfaceGetterCalls,
                ActualCaseValidatorCalls = payload.ValidationCalls,
            };
            var valid = profile is "PublicValid" or "OrdinaryObject";
            var namesake = profile is "NamesakeRequired" or "NamesakeCase";
            var explicitValue = profile is "ExplicitInvalid" || namesake;
            var expectedMessage = profile is "NamesakeRequired" ? "The Value field is required." : "Invalid case.";
            Require(row.RootIsDefaultModelMetadata, "The real provider did not produce expected default root metadata.", row);
            Require(propertyMetadata.All(property => property.IsDefaultModelMetadata), "A property was not actual DefaultModelMetadata.", row);
            Require(row.ActualMetadataReferenceRetained && row.ActualPropertyMetadataReferencesRetained, "Actual metadata cache references changed.", row);
            Require(row.SourcePredicateFallbackEligibleMetadata == 0, "Default metadata unexpectedly qualifies for the target fallback.", row);
            Require(properties.Length == (profile is "ManyPropertiesInvalid" ? 17 : profile is "ExplicitInvalid" ? 0 : 1), "Unexpected real reflected property count.", row);
            Require(row.ActualNamedValueCandidates == (profile is "ExplicitInvalid" ? 0 : 1), "Value-name gate does not match expected reflected properties.", row);
            Require(row.ActualModelStateValid == valid, "Unexpected actual model validity.", row);
            Require(valid ? errors.Length == 0 :
                errors is [{ Key: "model.Value" } error] && error.Message == expectedMessage, "Unexpected actual model-state key/message.", row);
            Require(row.ActualPublicGetterCalls == (profile is "ExplicitInvalid" ? 0 : 1), "Unexpected production public getter count.", row);
            Require(row.ActualInterfaceGetterCalls == (explicitValue ? 1 : 0), "Unexpected production explicit-interface getter count.", row);
            Require(row.ActualCaseValidatorCalls == (profile is "OrdinaryObject" or "NamesakeRequired" ? 0 : 1), "Unexpected production case validator count.", row);
            rows.Add(row);
        }
    }
}

var core = typeof(DefaultModelMetadataProvider).Assembly;
var bindings = new[]
{
    BindSource(core, @"src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs"),
    BindSource(core, @"src\Mvc\Mvc.Core\src\ModelBinding\Validation\ValidationVisitor.cs"),
    BindSource(core, @"src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultComplexObjectValidationStrategy.cs"),
    BindSource(core, @"src\Mvc\Mvc.Core\src\ModelBinding\Metadata\DefaultModelMetadata.cs"),
    BindSource(core, @"src\Mvc\Mvc.Core\src\ModelBinding\Metadata\DefaultModelMetadataProvider.cs"),
    BindSource(typeof(ModelMetadata).Assembly, @"src\Mvc\Mvc.Abstractions\src\ModelBinding\ModelMetadata.cs"),
};
var manifestPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "manifest.json"));
using var manifest = JsonDocument.Parse(File.ReadAllText(manifestPath));
var assemblies = AppDomain.CurrentDomain.GetAssemblies()
    .Where(assembly => !assembly.IsDynamic &&
        (assembly.GetName().Name?.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal) is true ||
         assembly.GetName().Name?.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal) is true ||
         assembly.GetName().Name is "AutoPerf.UnionMetadata" or "System.Private.CoreLib"))
    .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
    .Select(assembly => new
    {
        Name = assembly.GetName().Name!,
        assembly.Location,
        Sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        Mvid = assembly.ManifestModule.ModuleVersionId,
        InformationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    }).ToArray();
foreach (var assembly in assemblies.Where(assembly => assembly.Name.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal)))
{
    if (Path.GetDirectoryName(assembly.Location) != Path.TrimEndingDirectorySeparator(AppContext.BaseDirectory))
    {
        throw new InvalidOperationException($"A source owner was silently resolved outside the frozen consumer: {assembly.Location}");
    }
    var binary = manifest.RootElement.GetProperty("binaries").EnumerateArray()
        .Single(entry => entry.GetProperty("file").GetString() == Path.GetFileName(assembly.Location));
    if (binary.GetProperty("sha256").GetString() != assembly.Sha256)
    {
        throw new InvalidOperationException($"The loaded owner does not match the complete consumer manifest: {assembly.Location}");
    }
}
var report = new
{
    Mode = "characterize",
    Role = role,
    Runtime = RuntimeInformation.FrameworkDescription,
    RuntimeVersion = Environment.Version.ToString(),
    ActualTiming = false,
    SourcePredicateOnlyNotInvocationInstrumentation = true,
    NonDefaultModelMetadataProducerExercised = false,
    Rows = rows,
    SourceBindings = bindings,
    Assemblies = assemblies,
    ContractFailures = rows.Sum(row => row.Failures.Count),
};
File.WriteAllText(output, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);
Console.WriteLine(JsonSerializer.Serialize(new { report.Role, Rows = rows.Count, report.ContractFailures, report.ActualTiming }));
return report.ContractFailures == 0 ? 0 : 2;

static void Require(bool condition, string message, Observation row)
{
    if (!condition)
    {
        row.Failures.Add(message);
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
    var algorithm = reader.GetGuid(document.HashAlgorithm);
    var bytes = File.ReadAllBytes(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "source", relative)));
    var actual = algorithm switch
    {
        var guid when guid == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") => SHA256.HashData(bytes),
        var guid when guid == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") => SHA1.HashData(bytes),
        _ => throw new NotSupportedException($"Unrecognized portable PDB source hash algorithm {algorithm}."),
    };
    var expected = reader.GetBlobBytes(document.Hash);
    if (!actual.AsSpan().SequenceEqual(expected))
    {
        throw new InvalidOperationException($"The selected physical source does not match its actual owner PDB: {relative}");
    }
    return new(assembly.GetName().Name!, assembly.Location, pdbPath, codeView.Guid, debugEntry.Stamp,
        reader.GetString(document.Name), relative, algorithm, Convert.ToHexString(expected), Convert.ToHexString(SHA256.HashData(bytes)));
}

public abstract class TrackedModel
{
    public int PublicGetterCalls;
    public int InterfaceGetterCalls;
}

public sealed class Payload(string name) : IValidatableObject
{
    public string Name => name;
    public int ValidationCalls;
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        ValidationCalls++;
        if (name is "invalid")
        {
            yield return new ValidationResult("Invalid case.");
        }
    }
}

public class PublicUnion(Payload value) : TrackedModel, IUnion
{
    [Required]
    public object Value
    {
        get
        {
            PublicGetterCalls++;
            return value;
        }
    }
}

public sealed class ManyPropertiesUnion(Payload value) : PublicUnion(value)
{
    public string A => "valid";
    public string B => "valid";
    public string C => "valid";
    public string D => "valid";
    public string E => "valid";
    public string F => "valid";
    public string G => "valid";
    public string H => "valid";
    public string I => "valid";
    public string J => "valid";
    public string K => "valid";
    public string L => "valid";
    public string M => "valid";
    public string N => "valid";
    public string O => "valid";
    public string P => "valid";
}

public sealed class ExplicitUnion(Payload value) : TrackedModel, IUnion
{
    object IUnion.Value
    {
        get
        {
            InterfaceGetterCalls++;
            return value;
        }
    }
}

public sealed class NamesakeUnion(string? publicValue, Payload actual) : TrackedModel, IUnion
{
    [Required]
    public string? Value
    {
        get
        {
            PublicGetterCalls++;
            return publicValue;
        }
    }
    object IUnion.Value
    {
        get
        {
            InterfaceGetterCalls++;
            return actual;
        }
    }
}

public sealed class OrdinaryEnvelope(Payload value) : TrackedModel
{
    [Required]
    public object Value
    {
        get
        {
            PublicGetterCalls++;
            return value;
        }
    }
}

public sealed class MetadataDecorator(IModelMetadataProvider inner) : IModelMetadataProvider
{
    public ModelMetadata GetMetadataForType(Type modelType) => inner.GetMetadataForType(modelType);
    public IEnumerable<ModelMetadata> GetMetadataForProperties(Type modelType) => inner.GetMetadataForProperties(modelType);
}

public sealed record MetadataObservation(string PropertyName, string MetadataKind, string ClrType,
    bool IsDefaultModelMetadata, bool NamedValueGuardMatches, bool TargetFallbackEligible);
public sealed record Error(string Key, string Message);
public sealed record SourceBinding(string Assembly, string ActualAssemblyPath, string ActualPdbPath, Guid PeCodeViewGuid,
    uint PeCodeViewStamp, string DocumentName, string RelativePath, Guid HashAlgorithm, string PdbDocumentHash, string SourceSha256);
public sealed record Observation(string Profile, string ProviderMode, int Repetition)
{
    public string ProviderClrType { get; set; } = string.Empty;
    public string RootMetadataClrType { get; set; } = string.Empty;
    public bool RootIsDefaultModelMetadata { get; set; }
    public MetadataObservation[] ActualProperties { get; set; } = [];
    public int ActualNamedValueCandidates { get; set; }
    public int SourcePredicateFallbackEligibleMetadata { get; set; }
    public bool ActualMetadataReferenceRetained { get; set; }
    public bool ActualPropertyMetadataReferencesRetained { get; set; }
    public bool ActualModelStateValid { get; set; }
    public Error[] ActualErrors { get; set; } = [];
    public int ActualPublicGetterCalls { get; set; }
    public int ActualInterfaceGetterCalls { get; set; }
    public int ActualCaseValidatorCalls { get; set; }
    public List<string> Failures { get; } = [];
}
