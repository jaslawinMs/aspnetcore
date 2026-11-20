using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Components.AI;
using Microsoft.AspNetCore.Components.AI.SourceGenerators;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.AI;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private static readonly List<object> Rows = [];
    private static string Output = "";

    public static int Main(string[] args)
    {
        Output = args[0];
        Directory.CreateDirectory(Output);
        Exception? failure = null;
        try
        {
            Run("F160_DuplicateToolNamesKeepFirstAndRegisterEveryCandidate", """
                using Microsoft.AspNetCore.Components.AI;
                [ToolBlock("tool")] public partial class FirstBlock : FunctionInvocationContentBlock { }
                [ToolBlock("tool")] public partial class SecondBlock : FunctionInvocationContentBlock { }
                [ToolBlock("tool")] public partial class ThirdBlock : FunctionInvocationContentBlock { }
                [ToolBlock("Tool")] public partial class CaseBlock : FunctionInvocationContentBlock { }
                """,
                ["BAIC008", "BAIC008"],
                [
                    "Duplicate tool name 'tool' — classes 'FirstBlock' and 'SecondBlock' both map to the same FunctionCallContent.Name",
                    "Duplicate tool name 'tool' — classes 'FirstBlock' and 'ThirdBlock' both map to the same FunctionCallContent.Name"
                ],
                ["FirstBlockHandler", "SecondBlockHandler", "ThirdBlockHandler", "CaseBlockHandler"],
                [],
                []);
            Run("F161_DuplicateParametersKeepFirstOrdinalKeysAndUsableSetter", """
                using Microsoft.AspNetCore.Components.AI;
                [ToolBlock("parameters")] public partial class ParameterBlock : FunctionInvocationContentBlock
                {
                    [ToolParameter(Name = "key")] public string? First { get; set; }
                    [ToolParameter(Name = "key")] public string? Second { get; set; }
                    [ToolParameter(Name = "key")] public string? Third { get; set; }
                    [ToolParameter(Name = "KEY")] public string? Case { get; set; }
                    [ToolParameter] public string? Fallback { get; set; }
                    [ToolParameter(Name = "Fallback")] public string? FallbackDuplicate { get; set; }
                    [ToolParameter(Name = "")] public string? EmptyName { get; set; }
                    [ToolParameter(Name = null)] public string? NullName { get; set; }
                    [ToolParameter(Name = "setter")] public string? Unusable { get; }
                    [ToolParameter(Name = "setter")] public string? Usable { get; set; }
                }
                """,
                ["BAIC006", "BAIC006", "BAIC006", "BAIC007"],
                [
                    ArgumentMessage("key"), ArgumentMessage("key"), ArgumentMessage("Fallback"),
                    "Property 'Unusable' must have an accessible non-init setter and will not be populated"
                ],
                ["ParameterBlockHandler"],
                ["state.First =", "state.Case =", "state.Fallback =", "state.EmptyName =", "state.NullName =", "state.Usable ="],
                ["state.Second =", "state.Third =", "state.FallbackDuplicate =", "state.Unusable ="]);
            Run("F162_DuplicateResultsKeepFirstOrdinalKeysAndUsableSetter", """
                using Microsoft.AspNetCore.Components.AI;
                [ToolBlock("results")] public partial class ResultBlock : FunctionInvocationContentBlock
                {
                    [ToolResult(Name = "key")] public string? First { get; set; }
                    [ToolResult(Name = "key")] public string? Second { get; set; }
                    [ToolResult(Name = "key")] public string? Third { get; set; }
                    [ToolResult(Name = "KEY")] public string? Case { get; set; }
                    [ToolResult] public string? Fallback { get; set; }
                    [ToolResult(Name = "Fallback")] public string? FallbackDuplicate { get; set; }
                    [ToolResult(Name = "")] public string? EmptyName { get; set; }
                    [ToolResult(Name = null)] public string? NullName { get; set; }
                    [ToolResult(Name = "setter")] public string? Unusable { get; }
                    [ToolResult(Name = "setter")] public string? Usable { get; set; }
                }
                """,
                ["BAIC010", "BAIC010", "BAIC010", "BAIC007"],
                [
                    ResultMessage("key"), ResultMessage("key"), ResultMessage("Fallback"),
                    "Property 'Unusable' must have an accessible non-init setter and will not be populated"
                ],
                ["ResultBlockHandler"],
                ["state.First =", "state.Case =", "state.Fallback =", "state.EmptyName =", "state.NullName =", "state.Usable ="],
                ["state.Second =", "state.Third =", "state.FallbackDuplicate =", "state.Unusable ="]);
            Run("IndependentParameterResultDictionariesAndInheritedPropertyControl", """
                using Microsoft.AspNetCore.Components.AI;
                public class BaseBlock : FunctionInvocationContentBlock
                {
                    [ToolParameter(Name = "shared")] public string? Inherited { get; set; }
                }
                [ToolBlock("control")] public partial class ControlBlock : BaseBlock
                {
                    [ToolParameter(Name = "shared")] public string? Parameter { get; set; }
                    [ToolResult(Name = "shared")] public string? ResultValue { get; set; }
                }
                """,
                [], [], ["ControlBlockHandler"], ["state.Parameter =", "state.ResultValue ="], ["state.Inherited ="]);
        }
        catch (Exception ex)
        {
            failure = ex;
        }

        var standardReference = args[1];
        using var referenceStream = File.OpenRead(standardReference);
        using var referencePe = new PEReader(referenceStream);
        var referenceMetadata = referencePe.GetMetadataReader();
        var dictionary = referenceMetadata.TypeDefinitions.Select(referenceMetadata.GetTypeDefinition)
            .Single(type => referenceMetadata.GetString(type.Namespace) == "System.Collections.Generic"
                && referenceMetadata.GetString(type.Name) == "Dictionary`2");
        var dictionaryMethods = dictionary.GetMethods().Select(referenceMetadata.GetMethodDefinition)
            .Select(method => referenceMetadata.GetString(method.Name)).Distinct().Order().ToArray();
        Check(!dictionaryMethods.Contains("TryAdd"), "Declared netstandard2.0 Dictionary instance API does not expose TryAdd");
        var result = new
        {
            role = args[2],
            scope = args[2] == "Original"
                ? "Original generator plus Original compiled AI producer and Original runtime62"
                : "Fresh Default target generator only, projected under identical Original compiled AI producer/common verifier/runtime62; NOT a whole-default graph",
            pid = Environment.ProcessId,
            findings = new { F160 = "PENDING", F161 = "PENDING", F162 = "PENDING" },
            completed = failure is null,
            failure = failure?.ToString(),
            rows = Rows,
            runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            owner = Identity(typeof(ToolBlockGenerator).Assembly),
            producer = Identity(typeof(ToolBlockAttribute).Assembly),
            common = Identity(typeof(Program).Assembly),
            declaredReference = new { path = standardReference, sha256 = Hash(standardReference), dictionaryMethods },
            loadedRuntimeDictionaryHasTryAdd = typeof(Dictionary<string, string>).GetMethods().Any(method => method.Name == "TryAdd"),
            loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0).Select(Identity).ToArray(),
            modules = Process.GetCurrentProcess().Modules.Cast<ProcessModule>().Select(module => new { path = module.FileName, sha256 = Hash(module.FileName) }).ToArray(),
            fullCompilerInputAttestation = false,
            performanceMeasurement = false
        };
        File.WriteAllText(Path.Combine(Output, "result.json"), JsonSerializer.Serialize(result, JsonOptions));
        Console.WriteLine(JsonSerializer.Serialize(new { result.completed, result.role, rowCount = Rows.Count, result.failure }));
        return failure is null ? 0 : 1;
    }

    private static void Run(string name, string declarations, string[] ids, string[] messages, string[] handlers, string[] present, string[] absent)
    {
        var folder = Path.Combine(Output, name);
        Directory.CreateDirectory(folder);
        var source = declarations + """

            public static class GeneratedConsumer
            {
                public static object Create()
                {
                    var options = new Microsoft.AspNetCore.Components.AI.UIAgentOptions();
                    Microsoft.AspNetCore.Components.AI.GeneratedToolBlockRegistrations.AddGeneratedToolBlocks(options);
                    Microsoft.AspNetCore.Components.AI.GeneratedToolBlockRegistrations.AddGeneratedToolBlocks(options);
                    return options;
                }
            }
            """;
        File.WriteAllText(Path.Combine(folder, "input.cs"), source);
        var parseOptions = CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.CSharp13);
        var tree = CSharpSyntaxTree.ParseText(source, parseOptions, path: name + ".cs", encoding: Encoding.UTF8);
        var paths = ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!).Split(Path.PathSeparator)
            .Append(typeof(ToolBlockAttribute).Assembly.Location).Append(typeof(FunctionCallContent).Assembly.Location)
            .Distinct(StringComparer.OrdinalIgnoreCase);
        var compilation = CSharpCompilation.Create(name, [tree], paths.Select(path => MetadataReference.CreateFromFile(path)),
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary).WithNullableContextOptions(NullableContextOptions.Enable));
        GeneratorDriver driver = CSharpGeneratorDriver.Create([new ToolBlockGenerator().AsSourceGenerator()], parseOptions: parseOptions);
        driver = driver.RunGeneratorsAndUpdateCompilation(compilation, out var output, out var diagnostics);
        Check(diagnostics.Select(diagnostic => diagnostic.Id).SequenceEqual(ids), name + " exact diagnostic order/IDs");
        Check(diagnostics.Select(diagnostic => diagnostic.GetMessage(System.Globalization.CultureInfo.InvariantCulture)).SequenceEqual(messages), name + " exact diagnostic contents");
        for (var index = 0; index < diagnostics.Length; index++)
        {
            var diagnostic = diagnostics[index];
            Check(diagnostic.Severity == (ids[index] == "BAIC007" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error), name + " severity");
            if (ids[index] == "BAIC008")
            {
                Check(diagnostic.Location == Location.None, name + " duplicate tool Location.None");
            }
            else
            {
                var property = diagnostic.Location.SourceTree!.GetRoot().FindNode(diagnostic.Location.SourceSpan)
                    .AncestorsAndSelf().OfType<Microsoft.CodeAnalysis.CSharp.Syntax.PropertyDeclarationSyntax>().First();
                var expectedProperty = index switch { 0 => "Second", 1 => "Third", 2 => "FallbackDuplicate", _ => "Unusable" };
                Check(property.Identifier.ValueText == expectedProperty, name + " diagnostic exact owning property/span");
            }
        }
        var generated = driver.GetRunResult().Results.Single().GeneratedSources;
        Check(generated.Length == handlers.Length + 1, name + " exact handler/registration cardinality");
        foreach (var item in generated)
        {
            File.WriteAllText(Path.Combine(folder, item.HintName), item.SourceText.ToString());
        }
        var registration = generated.Single(item => item.HintName == "GeneratedToolBlockRegistrations.g.cs").SourceText.ToString();
        var registrationTree = CSharpSyntaxTree.ParseText(registration, parseOptions);
        var registeredTypes = registrationTree.GetRoot().DescendantNodes()
            .OfType<Microsoft.CodeAnalysis.CSharp.Syntax.ObjectCreationExpressionSyntax>().Select(node => node.Type.ToString()).ToArray();
        Check(registeredTypes.SequenceEqual(handlers.Select(handler => "global::" + handler)), name + " exact registration order, including duplicates");
        var handlerText = string.Join("\n", generated.Where(item => item.HintName != "GeneratedToolBlockRegistrations.g.cs").Select(item => item.SourceText.ToString()));
        foreach (var text in present)
        {
            Check(handlerText.Contains(text, StringComparison.Ordinal), name + " generated mapping includes " + text);
        }
        foreach (var text in absent)
        {
            Check(!handlerText.Contains(text, StringComparison.Ordinal), name + " generated mapping excludes " + text);
        }
        var errors = output.GetDiagnostics().Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error).ToArray();
        Check(errors.Length == 0, name + " actual generated compilation: " + string.Join("\n", errors.Select(error => error.ToString())));
        using var image = new MemoryStream();
        var emit = output.Emit(image);
        Check(emit.Success, name + " actual consumer image emit");
        image.Position = 0;
        var loaded = AssemblyLoadContext.Default.LoadFromStream(image);
        var options = loaded.GetType("GeneratedConsumer")!.GetMethod("Create")!.Invoke(null, null)!;
        var registrations = (IList)typeof(UIAgentOptions).GetProperty("HandlerRegistrations", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(options)!;
        Check(registrations.Count == 2 * handlers.Length, name + " generated registration method really executes twice without deduplication");
        var actualHandlers = registrations.Cast<object>().Select(registrationValue =>
            registrationValue.GetType().GetField("_handler", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(registrationValue)!).ToArray();
        Check(actualHandlers.Take(handlers.Length).Select(handler => handler.GetType().Name).SequenceEqual(handlers), name + " actual registered handler types/order");
        for (var index = 0; index < handlers.Length; index++)
        {
            Check(!ReferenceEquals(actualHandlers[index], actualHandlers[index + handlers.Length]), name + " a fresh handler instance is created per call");
        }
        var semantic = compilation.GetSemanticModel(tree);
        var properties = tree.GetRoot().DescendantNodes().OfType<Microsoft.CodeAnalysis.CSharp.Syntax.PropertyDeclarationSyntax>()
            .Select(node => semantic.GetDeclaredSymbol(node)!).Select(property => new
            {
                property = property.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat),
                name = property.Name,
                owner = property.ContainingType.ToDisplayString(),
                attributes = property.GetAttributes().Select(attribute => new
                {
                    type = attribute.AttributeClass!.ToDisplayString(),
                    namedArguments = attribute.NamedArguments.Select(argument => new { key = argument.Key, value = argument.Value.Value?.ToString() }).ToArray()
                }).ToArray()
            }).ToArray();
        var row = new
        {
            name,
            passed = true,
            diagnostics = diagnostics.Select(diagnostic => new
            {
                id = diagnostic.Id,
                message = diagnostic.GetMessage(System.Globalization.CultureInfo.InvariantCulture),
                severity = diagnostic.Severity.ToString(),
                locationKind = diagnostic.Location.Kind.ToString(),
                path = diagnostic.Location.GetLineSpan().Path,
                start = diagnostic.Location.SourceSpan.Start,
                length = diagnostic.Location.SourceSpan.Length,
                startLine = diagnostic.Location.GetLineSpan().StartLinePosition.Line + 1,
                startColumn = diagnostic.Location.GetLineSpan().StartLinePosition.Character + 1
            }).ToArray(),
            semanticProperties = properties,
            generatedHintNames = generated.Select(item => item.HintName).ToArray(),
            exactRegistrationOrder = registeredTypes,
            actualRegistrationCountAfterTwoCalls = registrations.Count,
            actualHandlerInstancesDifferentAcrossCalls = true,
            generatedCompilationErrors = errors.Length,
            consumerAssembly = loaded.FullName
        };
        File.WriteAllText(Path.Combine(folder, "row.json"), JsonSerializer.Serialize(row, JsonOptions));
        Rows.Add(row);
    }

    private static string ArgumentMessage(string key) => $"A property mapping to argument key '{key}' is already declared on this ToolBlock; the duplicate is ignored";
    private static string ResultMessage(string key) => $"A property mapping to result key '{key}' is already declared on this ToolBlock; the duplicate is ignored";
    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));
    private static object Identity(Assembly assembly) => new { name = assembly.FullName, path = assembly.Location, mvid = assembly.ManifestModule.ModuleVersionId, sha256 = Hash(assembly.Location) };
    private static void Check(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
