using System.Collections.Immutable;
using System.Text;
using Microsoft.AspNetCore.Analyzers.RouteHandlers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace AutoPerf;

/// <summary>Controlled endpoint-registration shapes, not production workload frequencies.</summary>
public enum RouteWorkload
{
    Empty,
    SmallUnique,
    SmallDuplicate,
    WideUnique,
    WideDuplicate
}

/// <summary>The real analyzer driver's concurrency option.</summary>
public enum DriverMode
{
    Serial,
    Concurrent
}

internal sealed record InputFile(string Name, string Content);
internal sealed record DiagnosticExpectation(string File, int Start, int Length, string Route);
internal sealed record DiagnosticSnapshot(string Id, string Severity, string File, int Start, int Length, string Message);

internal sealed class CompilationWorkload
{
    private const string MessageFormat = "Route '{0}' conflicts with another handler route. An HTTP request that matches multiple routes results in an ambiguous match error. Fix the conflict by changing the route's pattern, HTTP method, or route constraints.";
    private static readonly ImmutableArray<MetadataReference> References = CreateReferences();
    private readonly ImmutableArray<DiagnosticAnalyzer> _analyzers;
    private readonly CompilationWithAnalyzersOptions _options;

    public required CSharpCompilation Compilation { get; init; }
    public required IReadOnlyList<InputFile> Inputs { get; init; }
    public required IReadOnlyList<DiagnosticExpectation> Expected { get; init; }
    public required string Label { get; init; }
    public required DriverMode Mode { get; init; }
    public required int BoundRouteInvocations { get; init; }
    public required int LiteralRouteInvocations { get; init; }
    public required bool GeneratedInput { get; init; }

    private CompilationWorkload(DiagnosticAnalyzer analyzer, DriverMode mode)
    {
        _analyzers = ImmutableArray.Create(analyzer);
        _options = new CompilationWithAnalyzersOptions(new AnalyzerOptions(ImmutableArray<AdditionalText>.Empty),
            onAnalyzerException: null, concurrentAnalysis: mode == DriverMode.Concurrent,
            logAnalyzerExecutionTime: false, reportSuppressedDiagnostics: false);
    }

    public async Task<ImmutableArray<Diagnostic>> AnalyzeAsync(CancellationToken cancellationToken = default)
    {
        var driver = Compilation.WithAnalyzers(_analyzers, _options);

        return await driver.GetAnalyzerDiagnosticsAsync(cancellationToken);
    }

    public static CompilationWorkload Create(RouteWorkload shape, DriverMode mode, int padding = 0,
        bool generated = false, DiagnosticAnalyzer? analyzer = null)
    {
        var files = new List<InputFile>();
        var expected = new List<DiagnosticExpectation>();
        AddRegistration("Anchor", routes: 2, duplicates: true, isGenerated: false);
        var classes = shape switch
        {
            RouteWorkload.Empty => 128,
            RouteWorkload.SmallUnique or RouteWorkload.SmallDuplicate => 16,
            _ => 4
        };
        var routes = shape switch
        {
            RouteWorkload.Empty => 0,
            RouteWorkload.SmallUnique or RouteWorkload.SmallDuplicate => 4,
            _ => 128
        };
        for (var index = 0; index < classes; index++)
        {
            AddRegistration($"Registration{index:D4}", routes,
                shape is RouteWorkload.SmallDuplicate or RouteWorkload.WideDuplicate, generated);
        }
        var label = $"{shape}-{mode}-pad{padding}-{(generated ? "generated" : "ordinary")}";

        return Finish(label, mode, files, expected, 2 + classes * routes, 2 + classes * routes, generated, analyzer);

        void AddRegistration(string name, int routes, bool duplicates, bool isGenerated)
        {
            var file = name + (isGenerated ? ".g.cs" : ".cs");
            var text = Begin(name, padding, isGenerated);
            if (routes == 0)
            {
                text.AppendLine("        _ = Math.Abs(-1);");
            }
            for (var route = 0; route < routes; route++)
            {
                var pattern = name == "Anchor" ? "/anchor" : $"/p{(duplicates ? route / 2 : route):D4}";
                AppendMap(text, file, pattern, "builder", "MapGet", string.Empty, duplicates && !isGenerated, expected);
            }
            End(text);
            files.Add(new InputFile(file, text.ToString()));
        }
    }

    public static CompilationWorkload CreateControl(string kind, DriverMode mode)
    {
        var anchor = Create(RouteWorkload.SmallUnique, mode);
        var files = new List<InputFile> { anchor.Inputs[0] };
        var expected = new List<DiagnosticExpectation>(anchor.Expected);
        const string file = "Control.cs";
        var text = Begin("Control", 0, false, twoBuilders: kind == "DistinctBuilders");
        var extraInvocations = 2;
        var extraLiteralInvocations = 2;
        switch (kind)
        {
            case "DifferentHttpMethods":
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, false);
                AddMap(text, file, "/same", "builder", "MapPost", string.Empty, false);
                break;
            case "DistinctBuilders":
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, false);
                AddMap(text, file, "/same", "other", "MapGet", string.Empty, false);
                break;
            case "Conditional":
                text.AppendLine("        if (DateTime.UtcNow.Ticks > 0)");
                text.AppendLine("        {");
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, false);
                text.AppendLine("        }");
                text.AppendLine("        else");
                text.AppendLine("        {");
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, false);
                text.AppendLine("        }");
                break;
            case "UnknownMetadata":
                AddMap(text, file, "/same", "builder", "MapGet", ".WithMetadata(new object())", false);
                AddMap(text, file, "/same", "builder", "MapGet", ".WithMetadata(new object())", false);
                break;
            case "SafeNameMetadata":
                AddMap(text, file, "/same", "builder", "MapGet", ".WithName(\"a\")", true);
                AddMap(text, file, "/same", "builder", "MapGet", ".WithName(\"b\")", true);
                break;
            case "SameMapGroup":
                AddMap(text, file, "/same", "builder.MapGroup(\"/g\")", "MapGet", string.Empty, true);
                AddMap(text, file, "/same", "builder.MapGroup(\"/g\")", "MapGet", string.Empty, true);
                break;
            case "RequestDelegate":
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, true, requestDelegate: true);
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, true, requestDelegate: true);
                break;
            case "NonLiteral":
                text.AppendLine("        var path = \"/same\";");
                text.AppendLine("        builder.MapGet(path, () => 1);");
                text.AppendLine("        builder.MapGet(path, () => 1);");
                extraLiteralInvocations = 0;
                break;
            case "ExplicitHandlerCast":
                text.AppendLine("        builder.MapGet(\"/same\", (Func<int>)(() => 1));");
                text.AppendLine("        builder.MapGet(\"/same\", (Func<int>)(() => 1));");
                break;
            case "PoolReuse":
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, true);
                AddMap(text, file, "/same", "builder", "MapGet", string.Empty, true);
                End(text);
                var second = Begin("SecondBlock", 0, false);
                AddMap(second, "SecondBlock.cs", "/different", "builder", "MapGet", string.Empty, false);
                End(second);
                files.Add(new InputFile("SecondBlock.cs", second.ToString()));
                extraInvocations = 3;
                extraLiteralInvocations = 3;
                break;
            default:
                throw new ArgumentException("Unknown real-producer control.", nameof(kind));
        }
        if (kind != "PoolReuse")
        {
            End(text);
        }
        files.Add(new InputFile(file, text.ToString()));

        return Finish($"{kind}-{mode}", mode, files, expected, 2 + extraInvocations,
            2 + extraLiteralInvocations, false, analyzer: null);

        void AddMap(StringBuilder text, string name, string route, string builder, string method,
            string suffix, bool report, bool requestDelegate = false)
        {
            AppendMap(text, name, route, builder, method, suffix, report, expected, requestDelegate);
        }
    }

    private static void AppendMap(StringBuilder text, string file, string route, string builder,
        string method, string suffix, bool report, List<DiagnosticExpectation> expected, bool requestDelegate = false)
    {
        text.Append($"        {builder}.{method}(");
        var start = text.Length;
        var literal = "\"" + route + "\"";
        text.Append(literal);
        text.Append(requestDelegate
            ? ", (HttpContext context) => Task.CompletedTask)"
            : ", () => 1)");
        text.Append(suffix).AppendLine(";");
        if (report)
        {
            expected.Add(new DiagnosticExpectation(file, start, literal.Length, route));
        }
    }

    public IReadOnlyList<DiagnosticSnapshot> Validate(ImmutableArray<Diagnostic> diagnostics)
    {
        var actual = diagnostics.Select(diagnostic => new DiagnosticSnapshot(diagnostic.Id,
            diagnostic.Severity.ToString(), Path.GetFileName(diagnostic.Location.SourceTree?.FilePath ?? string.Empty),
            diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length, diagnostic.GetMessage()))
            .OrderBy(row => row.File, StringComparer.Ordinal).ThenBy(row => row.Start).ToArray();
        var expected = Expected.Select(row => new DiagnosticSnapshot("ASP0022", nameof(DiagnosticSeverity.Warning),
            row.File, row.Start, row.Length, string.Format(System.Globalization.CultureInfo.InvariantCulture, MessageFormat, row.Route)))
            .OrderBy(row => row.File, StringComparer.Ordinal).ThenBy(row => row.Start).ToArray();
        Evidence.Require(actual.SequenceEqual(expected),
            $"{Label}: exact diagnostic contract differs.\nExpected:{Evidence.Compact(expected)}\nActual:{Evidence.Compact(actual)}");

        return actual;
    }

    public void WriteInputProof()
    {
        var directory = Path.Combine(Evidence.InputDirectory, Label);
        Directory.CreateDirectory(directory);
        var copies = Inputs.Select(input =>
        {
            var file = Path.Combine(directory, input.Name);
            var bytes = new UTF8Encoding(false).GetBytes(input.Content);
            if (File.Exists(file))
            {
                Evidence.Require(File.ReadAllBytes(file).SequenceEqual(bytes), "Repeated input bytes differ.");
            }
            else
            {
                File.WriteAllBytes(file, bytes);
            }

            return new { file = input.Name, sha256 = Evidence.Hash(file), bytes = bytes.Length };
        }).ToArray();
        Evidence.Write("input-" + Label, new
        {
            Label,
            syntaxTrees = Inputs.Count,
            boundRouteInvocations = BoundRouteInvocations,
            literalRouteInvocations = LiteralRouteInvocations,
            expectedDiagnostics = Expected,
            GeneratedInput,
            generatedInputLanguage = nameof(LanguageVersion.CSharp13),
            copies,
            routingMetadataSha256 = Evidence.Hash(typeof(EndpointRouteBuilderExtensions).Assembly.Location),
            compilerSha256 = Evidence.Hash(typeof(CSharpCompilation).Assembly.Location),
            references = References.Select(reference => reference.Display).ToArray()
        });
    }

    private static CompilationWorkload Finish(string label, DriverMode mode, IReadOnlyList<InputFile> files,
        IReadOnlyList<DiagnosticExpectation> expected, int boundInvocations, int literalInvocations,
        bool generated, DiagnosticAnalyzer? analyzer)
    {
        var compilation = CSharpCompilation.Create("AutoPerfF104Input",
            files.Select(file => CSharpSyntaxTree.ParseText(file.Content, new CSharpParseOptions(LanguageVersion.CSharp13), file.Name)),
            References, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary,
                optimizationLevel: OptimizationLevel.Release, concurrentBuild: true, deterministic: true));
        var errors = compilation.GetDiagnostics().Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error).ToArray();
        Evidence.Require(errors.Length == 0, $"{label}: real compilation errors:{Evidence.Compact(errors.Select(error => error.ToString()).ToArray())}");
        var extensions = compilation.GetTypeByMetadataName(typeof(EndpointRouteBuilderExtensions).FullName!)
            ?? throw new InvalidOperationException("Actual endpoint-builder metadata is missing.");
        foreach (var name in new[] { typeof(IEndpointRouteBuilder).FullName!, typeof(RequestDelegate).FullName!,
            typeof(RouteGroupBuilder).FullName!, typeof(IActionResult).FullName!, typeof(IResult).FullName!,
            typeof(BindAttribute).FullName!, "System.Delegate", "System.String", "System.Object" })
        {
            Evidence.Require(compilation.GetTypeByMetadataName(name) is not null, "Actual analyzer prerequisite missing:" + name);
        }
        var bound = 0;
        var literals = 0;
        foreach (var tree in compilation.SyntaxTrees)
        {
            var model = compilation.GetSemanticModel(tree);
            foreach (var syntax in tree.GetRoot().DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (model.GetOperation(syntax) is not IInvocationOperation operation)
                {
                    throw new InvalidOperationException("Generated invocation did not bind to the real compiler operation.");
                }
                if (IsRouteInvocation(operation, extensions))
                {
                    bound++;
                    Evidence.Require(operation.Arguments.Any(argument => argument.Parameter?.Ordinal == 2 &&
                        argument.Value.DescendantsAndSelf().OfType<IDelegateCreationOperation>().Any()),
                        "Actual route-handler delegate creation is missing.");
                    if (operation.Arguments.Any(argument => argument.Parameter?.Ordinal == 1 &&
                        argument.Syntax is ArgumentSyntax { Expression: LiteralExpressionSyntax }))
                    {
                        literals++;
                    }
                }
            }
        }
        Evidence.Require(bound == boundInvocations && literals == literalInvocations,
            $"{label}: actual endpoint/literal binding cardinality differs ({bound}/{literals}).");

        return new CompilationWorkload(analyzer ?? new RouteHandlerAnalyzer(), mode)
        {
            Compilation = compilation,
            Inputs = files,
            Expected = expected,
            Label = label,
            Mode = mode,
            BoundRouteInvocations = bound,
            LiteralRouteInvocations = literals,
            GeneratedInput = generated
        };
    }

    internal static bool IsRouteInvocation(IInvocationOperation operation, INamedTypeSymbol extensions)
    {
        return operation.TargetMethod.Name.StartsWith("Map", StringComparison.Ordinal) &&
            SymbolEqualityComparer.Default.Equals(operation.TargetMethod.ContainingType, extensions) &&
            operation.Arguments.Length == 3 && operation.TargetMethod.Parameters.Length == 3;
    }

    private static StringBuilder Begin(string name, int padding, bool generated, bool twoBuilders = false)
    {
        var text = new StringBuilder();
        if (generated)
        {
            text.AppendLine("// <auto-generated/>");
        }
        for (var line = 0; line < padding; line++)
        {
            text.AppendLine("// Distinct source locations and compilation lifetime.");
        }
        text.AppendLine("using System;");
        text.AppendLine("using System.Threading.Tasks;");
        text.AppendLine("using Microsoft.AspNetCore.Builder;");
        text.AppendLine("using Microsoft.AspNetCore.Http;");
        text.AppendLine("using Microsoft.AspNetCore.Routing;");
        text.AppendLine("namespace AutoPerfInput");
        text.AppendLine("{");
        text.AppendLine($"public static class {name}");
        text.AppendLine("{");
        text.AppendLine($"    public static void Register(IEndpointRouteBuilder builder{(twoBuilders ? ", IEndpointRouteBuilder other" : string.Empty)})");
        text.AppendLine("    {");

        return text;
    }

    private static void End(StringBuilder text)
    {
        text.AppendLine("    }");
        text.AppendLine("}");
        text.AppendLine("}");
    }

    private static ImmutableArray<MetadataReference> CreateReferences()
    {
        var paths = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("Actual runtime reference list is missing.");

        return paths.Split(Path.PathSeparator).Append(typeof(EndpointRouteBuilderExtensions).Assembly.Location)
            .Append(typeof(RouteData).Assembly.Location)
            .Append(typeof(IActionResult).Assembly.Location)
            .Append(typeof(BindAttribute).Assembly.Location)
            .Distinct(StringComparer.OrdinalIgnoreCase).Select(file => MetadataReference.CreateFromFile(file))
            .ToImmutableArray<MetadataReference>();
    }
}
