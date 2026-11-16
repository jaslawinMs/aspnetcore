using System.Collections.Concurrent;
using System.Collections.Immutable;
using Microsoft.AspNetCore.Analyzers.RouteHandlers;
using Microsoft.AspNetCore.Builder;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace AutoPerf;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
internal sealed class ProducerProbe : DiagnosticAnalyzer
{
    private readonly RouteHandlerAnalyzer _owner = new();
    private readonly ConcurrentDictionary<int, BlockCallbacks> _blocks = new();
    private readonly ConcurrentDictionary<int, byte> _threads = new();
    private int _blockId;
    private int _active;
    private int _maximumActive;
    private int _compilationStarts;

    public bool EnabledConcurrentExecution { get; private set; }
    public GeneratedCodeAnalysisFlags GeneratedFlags { get; private set; }

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => _owner.SupportedDiagnostics;

    public override void Initialize(AnalysisContext context)
    {
        context.EnableConcurrentExecution();
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        _owner.Initialize(new ForwardAnalysisContext(context, this));
    }

    public object Validate(CompilationWorkload workload)
    {
        var rows = _blocks.OrderBy(pair => pair.Key).Select(pair => new
        {
            block = pair.Key,
            owningSymbol = pair.Value.OwningSymbol,
            actualBlockStartFilterTree = pair.Value.FilterTree,
            actualBlockStartFilterStart = pair.Value.FilterStart,
            actualBlockStartFilterLength = pair.Value.FilterLength,
            actualBlockStartIsGeneratedCode = pair.Value.IsGeneratedCode,
            invocationCallbacks = pair.Value.InvocationCallbacks,
            actualRouteInvocations = pair.Value.RouteInvocations,
            successfulBlockEndCallbacks = pair.Value.EndCallbacks,
            maximumOverlappingInvocationCallbacksWithinBlock = pair.Value.MaximumActive
        }).ToArray();
        Evidence.Require(_compilationStarts == 1 && EnabledConcurrentExecution && GeneratedFlags == GeneratedCodeAnalysisFlags.None &&
            rows.Length > 0 && rows.All(row => row.successfulBlockEndCallbacks == 1) &&
            rows.Sum(row => row.actualRouteInvocations) == workload.BoundRouteInvocations,
            "Real compilation/block/action cardinality, completion or owner configuration differs.");

        return new
        {
            workload.Label,
            actualCompilationStarts = _compilationStarts,
            actualOperationBlocks = rows.Length,
            actualInvocationCallbacks = rows.Sum(row => row.invocationCallbacks),
            actualRouteInvocationCallbacks = rows.Sum(row => row.actualRouteInvocations),
            EnabledConcurrentExecution,
            configuredGeneratedCodeFlags = GeneratedFlags.ToString(),
            observedCallbackThreadIds = _threads.Keys.Order().ToArray(),
            maximumOverlappingGlobalCallbacks = _maximumActive,
            maximumOverlappingCallbacksWithinSingleBlock = rows.Max(row => row.maximumOverlappingInvocationCallbacksWithinBlock),
            observerUsedInTimedBenchmark = false,
            realRoslynCallbacksForwardedWithoutInjection = true,
            dictionaryConstructionCountOrPhysicalPoolReuseMeasured = false,
            blockStartReadOnlyFiltersNotForwardableThroughPublicProtectedConstructor = true,
            blockStartOwnerOnlyUsesRegistrationMethods = true,
            originalOperationAndEndCallbackContextsForwardedUnchanged = true,
            boundary = "Ordinary full-compilation real driver callbacks;actual block-start filter values recorded. Public/protected adapter cannot copy read-only filter metadata,which this owner's block-start body does not read. Invocation/end callback contexts are original. Overlap is observed,not forced;physical pool addresses/construction counts are not measured.",
            rows
        };
    }

    private static void UpdateMaximum(ref int maximum, int active)
    {
        var prior = Volatile.Read(ref maximum);
        while (active > prior)
        {
            var observed = Interlocked.CompareExchange(ref maximum, active, prior);
            if (observed == prior)
            {
                break;
            }
            prior = observed;
        }
    }

    private void Observe(Action callback, BlockCallbacks? row = null)
    {
        _threads.TryAdd(Environment.CurrentManagedThreadId, 0);
        var active = Interlocked.Increment(ref _active);
        UpdateMaximum(ref _maximumActive, active);
        if (row is not null)
        {
            var blockActive = Interlocked.Increment(ref row.Active);
            UpdateMaximum(ref row.MaximumActive, blockActive);
        }
        try
        {
            callback();
        }
        finally
        {
            if (row is not null)
            {
                Interlocked.Decrement(ref row.Active);
            }
            Interlocked.Decrement(ref _active);
        }
    }

    private sealed class BlockCallbacks(string owningSymbol, string? filterTree, int? filterStart, int? filterLength, bool isGeneratedCode)
    {
        public string OwningSymbol { get; } = owningSymbol;
        public string? FilterTree { get; } = filterTree;
        public int? FilterStart { get; } = filterStart;
        public int? FilterLength { get; } = filterLength;
        public bool IsGeneratedCode { get; } = isGeneratedCode;
        public int InvocationCallbacks;
        public int RouteInvocations;
        public int EndCallbacks;
        public int Active;
        public int MaximumActive;
    }

    private sealed class ForwardAnalysisContext(AnalysisContext inner, ProducerProbe probe) : AnalysisContext
    {
        public override DiagnosticSeverity MinimumReportedSeverity => inner.MinimumReportedSeverity;
        public override void EnableConcurrentExecution()
        {
            probe.EnabledConcurrentExecution = true;
            inner.EnableConcurrentExecution();
        }
        public override void ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags flags)
        {
            probe.GeneratedFlags = flags;
            inner.ConfigureGeneratedCodeAnalysis(flags);
        }
        public override void RegisterCompilationStartAction(Action<CompilationStartAnalysisContext> action)
        {
            inner.RegisterCompilationStartAction(context => probe.Observe(() =>
            {
                Interlocked.Increment(ref probe._compilationStarts);
                action(new ForwardCompilationStartContext(context, probe));
            }));
        }
        public override void RegisterCompilationAction(Action<CompilationAnalysisContext> action) => inner.RegisterCompilationAction(action);
        public override void RegisterSemanticModelAction(Action<SemanticModelAnalysisContext> action) => inner.RegisterSemanticModelAction(action);
        public override void RegisterSymbolAction(Action<SymbolAnalysisContext> action, ImmutableArray<SymbolKind> kinds) => inner.RegisterSymbolAction(action, kinds);
        public override void RegisterCodeBlockStartAction<TLanguageKindEnum>(Action<CodeBlockStartAnalysisContext<TLanguageKindEnum>> action) => inner.RegisterCodeBlockStartAction(action);
        public override void RegisterCodeBlockAction(Action<CodeBlockAnalysisContext> action) => inner.RegisterCodeBlockAction(action);
        public override void RegisterSyntaxTreeAction(Action<SyntaxTreeAnalysisContext> action) => inner.RegisterSyntaxTreeAction(action);
        public override void RegisterSyntaxNodeAction<TLanguageKindEnum>(Action<SyntaxNodeAnalysisContext> action, ImmutableArray<TLanguageKindEnum> kinds) => inner.RegisterSyntaxNodeAction(action, kinds);
    }

    private sealed class ForwardCompilationStartContext(CompilationStartAnalysisContext inner, ProducerProbe probe)
        : CompilationStartAnalysisContext(inner.Compilation, inner.Options, inner.CancellationToken)
    {
        public override void RegisterOperationBlockStartAction(Action<OperationBlockStartAnalysisContext> action)
        {
            inner.RegisterOperationBlockStartAction(context => probe.Observe(() =>
            {
                Evidence.Require(!context.IsGeneratedCode, "Observer is limited to real ordinary operation blocks.");
                var row = new BlockCallbacks(context.OwningSymbol.ToDisplayString(), context.FilterTree?.FilePath,
                    context.FilterSpan?.Start, context.FilterSpan?.Length, context.IsGeneratedCode);
                var id = Interlocked.Increment(ref probe._blockId);
                Evidence.Require(probe._blocks.TryAdd(id, row), "Duplicate actual block identity.");
                action(new ForwardOperationBlockStartContext(context, probe, row));
            }));
        }
        public override void RegisterCompilationEndAction(Action<CompilationAnalysisContext> action) => inner.RegisterCompilationEndAction(action);
        public override void RegisterSemanticModelAction(Action<SemanticModelAnalysisContext> action) => inner.RegisterSemanticModelAction(action);
        public override void RegisterSymbolAction(Action<SymbolAnalysisContext> action, ImmutableArray<SymbolKind> kinds) => inner.RegisterSymbolAction(action, kinds);
        public override void RegisterCodeBlockStartAction<TLanguageKindEnum>(Action<CodeBlockStartAnalysisContext<TLanguageKindEnum>> action) => inner.RegisterCodeBlockStartAction(action);
        public override void RegisterCodeBlockAction(Action<CodeBlockAnalysisContext> action) => inner.RegisterCodeBlockAction(action);
        public override void RegisterSyntaxTreeAction(Action<SyntaxTreeAnalysisContext> action) => inner.RegisterSyntaxTreeAction(action);
        public override void RegisterSyntaxNodeAction<TLanguageKindEnum>(Action<SyntaxNodeAnalysisContext> action, ImmutableArray<TLanguageKindEnum> kinds) => inner.RegisterSyntaxNodeAction(action, kinds);
    }

    private sealed class ForwardOperationBlockStartContext(OperationBlockStartAnalysisContext inner, ProducerProbe probe, BlockCallbacks row)
        : OperationBlockStartAnalysisContext(inner.OperationBlocks, inner.OwningSymbol, inner.Compilation, inner.Options, inner.CancellationToken)
    {
        public override void RegisterOperationAction(Action<OperationAnalysisContext> action, ImmutableArray<OperationKind> kinds)
        {
            var extensions = inner.Compilation.GetTypeByMetadataName(typeof(EndpointRouteBuilderExtensions).FullName!)
                ?? throw new InvalidOperationException("Actual endpoint metadata missing in block producer.");
            inner.RegisterOperationAction(context => probe.Observe(() =>
            {
                Interlocked.Increment(ref row.InvocationCallbacks);
                if (context.Operation is IInvocationOperation operation && CompilationWorkload.IsRouteInvocation(operation, extensions))
                {
                    Interlocked.Increment(ref row.RouteInvocations);
                }
                action(context);
            }, row), kinds);
        }

        public override void RegisterOperationBlockEndAction(Action<OperationBlockAnalysisContext> action)
        {
            inner.RegisterOperationBlockEndAction(context => probe.Observe(() =>
            {
                action(context);
                Interlocked.Increment(ref row.EndCallbacks);
            }));
        }
    }
}
