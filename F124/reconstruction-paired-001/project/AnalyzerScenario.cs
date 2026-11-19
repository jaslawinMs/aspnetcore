// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Immutable;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace AutoPerf;

internal sealed record ProfileDefinition(string Key, string SelectedClass, bool ExpectedPredicate,
    int ExpectedDiagnosticCount, string Source, string? AdditionalSource, string Derivation);

internal sealed class AnalyzerScenario
{
    private static readonly ImmutableArray<MetadataReference> References = CreateReferences();
    private static readonly Func<SyntaxNode, bool> Predicate = BindPredicate();
    private readonly ImmutableArray<DiagnosticAnalyzer> _analyzers = [new PublicPartialProgramClassAnalyzer()];
    private readonly CompilationWithAnalyzersOptions _options = Options(concurrent: false);
    private static readonly Dictionary<string, AnalyzerScenario> Prepared = new(StringComparer.Ordinal);

    internal ProfileDefinition Definition { get; }
    internal CSharpCompilation Compilation { get; }
    internal ClassDeclarationSyntax Declaration { get; }
    internal int DescendantCount { get; }
    internal string FileName { get; }

    internal AnalyzerScenario(ProfileDefinition definition, string? fileName = null)
    {
        Definition = definition;
        FileName = fileName ?? definition.Key + ".cs";
        var trees = new List<SyntaxTree>
        {
            CSharpSyntaxTree.ParseText(definition.Source, new CSharpParseOptions(LanguageVersion.CSharp13), path: FileName)
        };
        if (definition.AdditionalSource is not null)
        {
            trees.Add(CSharpSyntaxTree.ParseText(definition.AdditionalSource,
                new CSharpParseOptions(LanguageVersion.CSharp13), path: definition.Key + "-Main.cs"));
        }
        var root = trees[0].GetRoot();
        Declaration = root.DescendantNodes().OfType<ClassDeclarationSyntax>()
            .Single(node => node.Identifier.ValueText == definition.SelectedClass);
        DescendantCount = root.DescendantNodes().Count();
        Compilation = CSharpCompilation.Create("AutoPerf_F124_" + definition.Key, trees, References,
            new CSharpCompilationOptions(OutputKind.ConsoleApplication, optimizationLevel: OptimizationLevel.Release)
                .WithSpecificDiagnosticOptions(ImmutableDictionary<string, ReportDiagnostic>.Empty.Add("ASP0027", ReportDiagnostic.Info)));
        var errors = Compilation.GetDiagnostics().Where(item => item.Severity == DiagnosticSeverity.Error).ToArray();
        Evidence.Require(errors.Length == 0, "The real input compilation must be valid: " + string.Join("; ", errors.Select(item => item.ToString())));
    }

    private static CompilationWithAnalyzersOptions Options(bool concurrent) => new(
        new AnalyzerOptions(ImmutableArray<AdditionalText>.Empty), onAnalyzerException: null,
        concurrentAnalysis: concurrent, logAnalyzerExecutionTime: false, reportSuppressedDiagnostics: false);

    internal Task<ImmutableArray<Diagnostic>> AnalyzeAsync(CancellationToken cancellationToken = default)
    {
        var driver = Compilation.WithAnalyzers(_analyzers, _options);

        return driver.GetAnalyzerDiagnosticsAsync(cancellationToken);
    }

    internal Task<ImmutableArray<Diagnostic>> AnalyzeConcurrentAsync(CancellationToken cancellationToken = default)
    {
        var driver = Compilation.WithAnalyzers(_analyzers, Options(concurrent: true));

        return driver.GetAnalyzerDiagnosticsAsync(cancellationToken);
    }

    internal bool Evaluate() => Predicate(Declaration);
    internal static AnalyzerScenario GetPrepared(string key) => Prepared[key];

    internal object Validate(ImmutableArray<Diagnostic> diagnostics)
    {
        Evidence.Require(diagnostics.Length == Definition.ExpectedDiagnosticCount,
            $"Unexpected real analyzer diagnostic count for {Definition.Key}: {string.Join("; ", diagnostics)}");
        var descriptor = _analyzers[0].SupportedDiagnostics.Single();
        Evidence.Require(descriptor.Id == "ASP0027" && descriptor.DefaultSeverity == DiagnosticSeverity.Info,
            "Require the actual unchanged ASP0027 information diagnostic.");
        foreach (var diagnostic in diagnostics)
        {
            Evidence.Require(diagnostic.Id == descriptor.Id && diagnostic.Severity == DiagnosticSeverity.Info
                && diagnostic.GetMessage() == descriptor.MessageFormat.ToString()
                && diagnostic.Location.SourceTree == Declaration.SyntaxTree
                && diagnostic.Location.SourceSpan == Declaration.Span,
                "The actual owning callback must report the unchanged class diagnostic and exact location.");
        }

        return diagnostics.Select(item => new
        {
            id = item.Id, severity = item.Severity.ToString(), message = item.GetMessage(),
            file = item.Location.SourceTree!.FilePath, start = item.Location.SourceSpan.Start,
            length = item.Location.SourceSpan.Length
        }).ToArray();
    }

    internal async Task VerifyAsync(string kind, CancellationToken cancellationToken)
    {
        var predicate = Evaluate();
        Evidence.Require(predicate == Definition.ExpectedPredicate, "Actual compiled predicate result differs from the declared contract.");
        var first = Validate(await AnalyzeAsync(cancellationToken).ConfigureAwait(false));
        var second = Validate(await AnalyzeAsync(cancellationToken).ConfigureAwait(false));
        var concurrent = Validate(await AnalyzeConcurrentAsync(cancellationToken).ConfigureAwait(false));
        var location = Declaration.GetLocation();
        Evidence.Require(location.SourceTree == Declaration.SyntaxTree && location.SourceSpan == Declaration.Span,
            "Unchanged benchmark control must observe the actual same declaration.");
        Evidence.Write(kind, new
        {
            profile = Definition.Key, Definition.Source, Definition.AdditionalSource, FileName,
            actualSelectedClass = Declaration.Identifier.ValueText, actualDescendantCount = DescendantCount,
            actualPredicateResult = predicate, actualExpectedPredicate = Definition.ExpectedPredicate,
            actualExpectedDiagnosticCount = Definition.ExpectedDiagnosticCount,
            actualCompilerErrors = 0, actualFreshSerialDriverRuns = 2, actualFreshConcurrentDriverRuns = 1,
            actualPredicateOwner = Predicate.Method.DeclaringType!.FullName,
            actualPredicateMethod = Predicate.Method.Name, actualPredicateMetadataToken = Predicate.Method.MetadataToken,
            actualPredicateOwnerMvid = Predicate.Method.Module.ModuleVersionId,
            actualDriverOptionsEnableAsp0027Info = true, actualTimingRunByThisCharacterization = false,
            first, second, concurrent
        });
    }

    internal static async Task PrepareAsync()
    {
        var file = Path.Combine(AppContext.BaseDirectory, "profile-definitions.json");
        var definitions = JsonSerializer.Deserialize<ProfileDefinition[]>(File.ReadAllBytes(file),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Evidence.Require(definitions is { Length: 4 }, "Require all four exact predeclared profiles.");
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        foreach (var definition in definitions!)
        {
            var scenario = new AnalyzerScenario(definition);
            await scenario.VerifyAsync("prepared-profile-contract", timeout.Token).ConfigureAwait(false);
            Evidence.Require(Prepared.TryAdd(definition.Key, scenario), "Never prepare the same benchmark profile twice.");
        }
        Evidence.Require(Prepared["LoneDeclaration"].DescendantCount == 1
            && Prepared["MinimalProgram"].DescendantCount > 1
            && Prepared["LargeProgram"].DescendantCount > Prepared["MinimalProgram"].DescendantCount,
            "Actual parser-produced profile thresholds and scaling must be reached.");
    }

    private static Func<SyntaxNode, bool> BindPredicate()
    {
        var method = typeof(PublicPartialProgramClassAnalyzer).GetMethod("IsPublicPartialClassProgram",
            BindingFlags.Static | BindingFlags.NonPublic);
        Evidence.Require(method is not null && method.ReturnType == typeof(bool)
            && method.GetParameters() is [{ ParameterType: var parameter }] && parameter == typeof(SyntaxNode),
            "Bind the actual private owner predicate, not a local replacement.");

        return method!.CreateDelegate<Func<SyntaxNode, bool>>();
    }

    private static ImmutableArray<MetadataReference> CreateReferences()
    {
        var trusted = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string;
        Evidence.Require(trusted is not null, "Require actual pinned runtime reference metadata.");
        var runtime = trusted!.Split(Path.PathSeparator).Where(file =>
        {
            var name = Path.GetFileName(file);

            return name.StartsWith("System.", StringComparison.Ordinal)
                || name.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal)
                || name is "mscorlib.dll" or "netstandard.dll" or "Microsoft.CSharp.dll";
        });
        var metadata = Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "reference-metadata"), "*.dll");
        Evidence.Require(metadata.Any(file => Path.GetFileName(file) == "Microsoft.AspNetCore.dll"),
            "Require source-built WebApplication reference metadata.");
        var files = runtime.Concat(metadata).DistinctBy(Path.GetFileName, StringComparer.OrdinalIgnoreCase).Order().ToArray();
        Evidence.Write("compiler-reference-metadata", new
        {
            actualEntries = files.Length, actualSourceBuiltAspNetCoreMetadataEntries = metadata.Length,
            files = files.Select(file => new { path = file, sha256 = Evidence.Hash(file) }).ToArray(),
            actualAspNetCoreReferenceAssembliesNotLoadedAsMeasuredOwners = true
        });

        return files.Select(file => MetadataReference.CreateFromFile(file)).ToImmutableArray<MetadataReference>();
    }
}
