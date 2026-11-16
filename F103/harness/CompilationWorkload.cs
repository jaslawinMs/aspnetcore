using System.Collections.Immutable;
using System.Text;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace AutoPerf;

/// <summary>Controlled real-component input shape, not a production frequency estimate.</summary>
public enum ComponentWorkload
{
    Empty,
    LifecycleOnly,
    EventOnly,
    SmallPopulated,
    WidePartials
}

/// <summary>Actual Roslyn analyzer-driver scheduling option.</summary>
public enum DriverMode
{
    Serial,
    Concurrent
}

internal sealed record InputFile(string Name, string Content);
internal sealed record DiagnosticExpectation(string File, int Start, int Length, string Method);
internal sealed record DiagnosticSnapshot(string Id, string Severity, string File, int Start, int Length, string Message);

internal sealed class CompilationWorkload
{
    private static readonly ImmutableArray<MetadataReference> References = CreateReferences();
    private readonly ImmutableArray<DiagnosticAnalyzer> _analyzers;
    private readonly CompilationWithAnalyzersOptions _options;

    public required CSharpCompilation Compilation { get; init; }
    public required IReadOnlyList<InputFile> Inputs { get; init; }
    public required IReadOnlyList<DiagnosticExpectation> Expected { get; init; }
    public required string Label { get; init; }
    public required DriverMode Mode { get; init; }
    public required int Components { get; init; }
    public required int FactoryInvocations { get; init; }
    public required int HandlerTargets { get; init; }
    public required int BoundStateCalls { get; init; }

    private CompilationWorkload(DiagnosticAnalyzer analyzer, DriverMode mode)
    {
        _analyzers = ImmutableArray.Create(analyzer);
        _options = new CompilationWithAnalyzersOptions(
            new AnalyzerOptions(ImmutableArray<AdditionalText>.Empty),
            onAnalyzerException: null,
            concurrentAnalysis: mode == DriverMode.Concurrent,
            logAnalyzerExecutionTime: false,
            reportSuppressedDiagnostics: false);
    }

    public async Task<ImmutableArray<Diagnostic>> AnalyzeAsync(CancellationToken cancellationToken = default)
    {
        var driver = Compilation.WithAnalyzers(_analyzers, _options);

        return await driver.GetAnalyzerDiagnosticsAsync(cancellationToken);
    }

    public static CompilationWorkload Create(ComponentWorkload shape, DriverMode mode, int padding = 0, bool generated = false, DiagnosticAnalyzer? analyzer = null)
    {
        var files = new List<InputFile>();
        var expected = new List<DiagnosticExpectation>();
        var names = new List<string>();
        var classCount = shape switch
        {
            ComponentWorkload.SmallPopulated => 32,
            ComponentWorkload.WidePartials => 4,
            _ => 128
        };
        var handlers = shape switch
        {
            ComponentWorkload.EventOnly => 1,
            ComponentWorkload.SmallPopulated => 2,
            ComponentWorkload.WidePartials => 64,
            _ => 0
        };
        var parts = shape == ComponentWorkload.WidePartials ? 8 : 1;
        AddType("Anchor", lifecycle: true, handlerCount: 0, partCount: 1);
        for (var component = 0; component < classCount; component++)
        {
            AddType($"Component{component:D4}", lifecycle: shape == ComponentWorkload.LifecycleOnly, handlers, parts);
        }

        var label = $"{shape}-{mode}-pad{padding}-{(generated ? "generated" : "ordinary")}";

        return Finish(label, mode, files, expected, names, classCount + 1, classCount * handlers, classCount * handlers,
            1 + (shape == ComponentWorkload.LifecycleOnly ? classCount : 0) +
                (shape is ComponentWorkload.SmallPopulated or ComponentWorkload.WidePartials ? classCount * handlers : 0),
            analyzer);

        void AddType(string name, bool lifecycle, int handlerCount, int partCount)
        {
            names.Add("AutoPerfInput." + name);
            for (var part = 0; part < partCount; part++)
            {
                var file = $"{name}.Part{part}{(generated ? ".g" : string.Empty)}.cs";
                var text = Begin(padding, generated);
                text.AppendLine($"public partial class {name}{(part == 0 ? " : ComponentBase" : string.Empty)}");
                text.AppendLine("{");
                if (lifecycle && part == 0)
                {
                    text.Append("    protected override void OnInitialized() => ");
                    AddStateCall(text, file, "OnInitialized", report: true);
                }
                for (var handler = part; handler < handlerCount; handler += partCount)
                {
                    var method = $"Handler{handler:D4}";
                    text.AppendLine($"    private EventCallback Callback{handler:D4} => EventCallback.Factory.Create(this, new Action({method}));");
                    text.AppendLine($"    private void {method}()");
                    text.AppendLine("    {");
                    if (shape is ComponentWorkload.SmallPopulated or ComponentWorkload.WidePartials)
                    {
                        text.Append("        ");
                        AddStateCall(text, file, method, report: true);
                    }
                    text.AppendLine("    }");
                }
                text.AppendLine("}");
                text.AppendLine("}");
                files.Add(new InputFile(file, text.ToString()));
            }
        }

        void AddStateCall(StringBuilder text, string file, string method, bool report)
        {
            var start = text.Length;
            const string invocation = "StateHasChanged()";
            text.Append(invocation).AppendLine(";");
            if (report)
            {
                expected.Add(new DiagnosticExpectation(file, start, invocation.Length, method));
            }
        }
    }

    public static CompilationWorkload CreateNegative(string label, DriverMode mode, bool derived)
    {
        var text = Begin(padding: 0, generated: false);
        text.AppendLine($"public class Negative{(derived ? " : ComponentBase" : string.Empty)}");
        text.AppendLine("{");
        text.AppendLine("    private void Background() { StateHasChanged(); }");
        if (!derived)
        {
            text.AppendLine("    private void StateHasChanged() { }");
        }
        text.AppendLine("}");
        text.AppendLine("}");

        return Finish(label, mode, [new InputFile("Negative.cs", text.ToString())], [],
            derived ? ["AutoPerfInput.Negative"] : [], derived ? 1 : 0, 0, 0, derived ? 1 : 0, analyzer: null);
    }

    public IReadOnlyList<DiagnosticSnapshot> Validate(ImmutableArray<Diagnostic> diagnostics)
    {
        var actual = Snapshot(diagnostics);
        var expected = Expected.Select(expectation => new DiagnosticSnapshot(
            "BL0012", nameof(DiagnosticSeverity.Warning), expectation.File, expectation.Start, expectation.Length,
            $"StateHasChanged is unnecessary in method '{expectation.Method}' and can be removed."))
            .OrderBy(snapshot => snapshot.File, StringComparer.Ordinal).ThenBy(snapshot => snapshot.Start).ToArray();
        Evidence.Require(actual.SequenceEqual(expected),
            $"{Label}: actual diagnostics differ.\nExpected:{Evidence.Compact(expected)}\nActual:{Evidence.Compact(actual)}");

        return actual;
    }

    public void WriteInputProof()
    {
        var directory = Path.Combine(Evidence.InputDirectory, Label);
        Directory.CreateDirectory(directory);
        var copies = Inputs.Select(input =>
        {
            var path = Path.Combine(directory, input.Name);
            if (File.Exists(path))
            {
                Evidence.Require(File.ReadAllText(path) == input.Content, "A repeated input label changed source bytes.");
            }
            else
            {
                File.WriteAllText(path, input.Content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
            }

            return new { file = input.Name, sha256 = Evidence.Hash(path), bytes = new FileInfo(path).Length };
        }).ToArray();
        Evidence.Write("input-" + Label, new
        {
            Label,
            components = Components,
            syntaxTrees = Inputs.Count,
            factoryInvocations = FactoryInvocations,
            actualUniqueHandlerTargets = HandlerTargets,
            actualBoundStateCalls = BoundStateCalls,
            expectedDiagnostics = Expected,
            generatedInputLanguage = nameof(LanguageVersion.CSharp8),
            copies,
            componentMetadataSha256 = Evidence.Hash(typeof(ComponentBase).Assembly.Location),
            compilerSha256 = Evidence.Hash(typeof(CSharpCompilation).Assembly.Location),
            references = References.Select(reference => reference.Display).ToArray()
        });
    }

    private static CompilationWorkload Finish(string label, DriverMode mode, IReadOnlyList<InputFile> files,
        IReadOnlyList<DiagnosticExpectation> expected, IReadOnlyList<string> componentNames,
        int components, int factoryInvocations, int handlerTargets, int boundStateCalls, DiagnosticAnalyzer? analyzer)
    {
        var compilation = CSharpCompilation.Create("AutoPerfF103Input",
            files.Select(input => CSharpSyntaxTree.ParseText(input.Content, new CSharpParseOptions(LanguageVersion.CSharp8), input.Name)),
            References, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary, optimizationLevel: OptimizationLevel.Release,
                concurrentBuild: true, deterministic: true));
        var compilerDiagnostics = compilation.GetDiagnostics();
        Evidence.Require(!compilerDiagnostics.Any(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error),
            $"{label}: actual compiler errors:{Evidence.Compact(compilerDiagnostics.Select(diagnostic => diagnostic.ToString()).ToArray())}");
        var baseType = compilation.GetTypeByMetadataName(typeof(ComponentBase).FullName!)
            ?? throw new InvalidOperationException("Actual ComponentBase metadata is missing.");
        var factoryType = compilation.GetTypeByMetadataName(typeof(EventCallbackFactory).FullName!)
            ?? throw new InvalidOperationException("Actual EventCallbackFactory metadata is missing.");
        foreach (var name in componentNames)
        {
            var symbol = compilation.GetTypeByMetadataName(name) ?? throw new InvalidOperationException($"Missing input type:{name}");
            Evidence.Require(SymbolEqualityComparer.Default.Equals(symbol.BaseType, baseType), "Input is not bound to actual ComponentBase.");
        }
        foreach (var name in new[] { typeof(ParameterAttribute).FullName!, typeof(CascadingParameterAttribute).FullName!,
            typeof(IComponent).FullName!, "System.Collections.Generic.Dictionary`2" })
        {
            Evidence.Require(compilation.GetTypeByMetadataName(name) is not null, $"Actual analyzer prerequisite missing:{name}");
        }
        Evidence.Require(compilation.GetSpecialType(SpecialType.System_String).TypeKind != TypeKind.Error &&
            compilation.GetSpecialType(SpecialType.System_Object).TypeKind != TypeKind.Error, "Actual special-type prerequisites are missing.");
        var actualFactories = 0;
        var actualStateCalls = 0;
        var targetSymbols = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        foreach (var tree in compilation.SyntaxTrees)
        {
            var model = compilation.GetSemanticModel(tree);
            foreach (var invocation in tree.GetRoot().DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (model.GetOperation(invocation) is not IInvocationOperation operation)
                {
                    throw new InvalidOperationException("Generated invocation did not bind to a real Roslyn operation.");
                }
                if (SymbolEqualityComparer.Default.Equals(operation.TargetMethod.ContainingType, factoryType))
                {
                    actualFactories++;
                    foreach (var method in operation.Arguments.SelectMany(argument => argument.Value.DescendantsAndSelf())
                        .OfType<IMethodReferenceOperation>())
                    {
                        targetSymbols.Add(method.Method);
                    }
                }
                if (SymbolEqualityComparer.Default.Equals(operation.TargetMethod.ContainingType, baseType) &&
                    operation.TargetMethod.Name == "StateHasChanged")
                {
                    actualStateCalls++;
                }
            }
        }
        Evidence.Require(actualFactories == factoryInvocations && targetSymbols.Count == handlerTargets &&
            actualStateCalls == boundStateCalls, $"{label}: actual factory/handler/StateHasChanged producer bindings differ.");

        return new CompilationWorkload(analyzer ?? new StateHasChangedAnalyzer(), mode)
        {
            Compilation = compilation,
            Inputs = files,
            Expected = expected,
            Label = label,
            Mode = mode,
            Components = components,
            FactoryInvocations = actualFactories,
            HandlerTargets = targetSymbols.Count,
            BoundStateCalls = actualStateCalls
        };
    }

    private static StringBuilder Begin(int padding, bool generated)
    {
        var text = new StringBuilder();
        if (generated)
        {
            text.AppendLine("// <auto-generated/>");
        }
        for (var line = 0; line < padding; line++)
        {
            text.AppendLine("// Distinct compilation lifetime and source locations.");
        }
        text.AppendLine("using System;");
        text.AppendLine("using Microsoft.AspNetCore.Components;");
        text.AppendLine("namespace AutoPerfInput");
        text.AppendLine("{");

        return text;
    }

    private static ImmutableArray<MetadataReference> CreateReferences()
    {
        var paths = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("Actual runtime reference list is unavailable.");

        return paths.Split(Path.PathSeparator).Append(typeof(ComponentBase).Assembly.Location)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(path => MetadataReference.CreateFromFile(path)).ToImmutableArray<MetadataReference>();
    }

    private static IReadOnlyList<DiagnosticSnapshot> Snapshot(ImmutableArray<Diagnostic> diagnostics)
    {
        return diagnostics.Select(diagnostic => new DiagnosticSnapshot(diagnostic.Id, diagnostic.Severity.ToString(),
            Path.GetFileName(diagnostic.Location.SourceTree?.FilePath ?? string.Empty),
            diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length, diagnostic.GetMessage()))
            .OrderBy(snapshot => snapshot.File, StringComparer.Ordinal).ThenBy(snapshot => snapshot.Start).ToArray();
    }
}
