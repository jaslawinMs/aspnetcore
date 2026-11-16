using System.Collections.Concurrent;
using System.Collections.Immutable;
using Microsoft.AspNetCore.Components.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace AutoPerf;

// Probe-only forwarding observes real driver callbacks; measured runs use the unwrapped public owner.
[DiagnosticAnalyzer(LanguageNames.CSharp)]
internal sealed class ProducerProbe : DiagnosticAnalyzer
{
    private readonly StateHasChangedAnalyzer _owner = new();
    private readonly ConcurrentDictionary<string, ComponentCallbacks> _components = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<int, byte> _threads = new();
    private int _active;
    private int _maximumActive;
    private int _symbolStarts;

    public bool EnabledConcurrentExecution { get; private set; }
    public GeneratedCodeAnalysisFlags GeneratedFlags { get; private set; }

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => _owner.SupportedDiagnostics;

    public override void Initialize(AnalysisContext context)
    {
        context.EnableConcurrentExecution();
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.Analyze | GeneratedCodeAnalysisFlags.ReportDiagnostics);
        _owner.Initialize(new ForwardAnalysisContext(context, this));
    }

    public object Validate(CompilationWorkload workload)
    {
        var rows = _components.OrderBy(pair => pair.Key, StringComparer.Ordinal).Select(pair => new
        {
            component = pair.Key,
            operationCallbacks = pair.Value.OperationCallbacks,
            syntaxCallbacks = pair.Value.SyntaxCallbacks,
            symbolEndCallbacks = pair.Value.SymbolEndCallbacks,
            actualFactoryInvocations = pair.Value.FactoryInvocations,
            actualUniqueHandlerMethodTargets = pair.Value.HandlerMethods.Count,
            actualBoundUnsuspendedStateCallMethods = pair.Value.StateCallMethods.Count
        }).ToArray();
        Evidence.Require(EnabledConcurrentExecution &&
            GeneratedFlags == (GeneratedCodeAnalysisFlags.Analyze | GeneratedCodeAnalysisFlags.ReportDiagnostics),
            "Actual owner concurrency/generated registration was not forwarded.");
        Evidence.Require(rows.Length == workload.Components && rows.All(row => row.symbolEndCallbacks == 1) &&
            rows.Sum(row => row.actualFactoryInvocations) == workload.FactoryInvocations &&
            rows.Sum(row => row.actualUniqueHandlerMethodTargets) == workload.HandlerTargets &&
            rows.Sum(row => row.actualBoundUnsuspendedStateCallMethods) == workload.BoundStateCalls,
            "Real driver component callbacks/handler/state method cardinality or symbol-end completion differ.");

        return new
        {
            workload.Label,
            actualAttemptedNamedTypeSymbolStarts = _symbolStarts,
            actualQualifyingComponentRegistrations = rows.Length,
            EnabledConcurrentExecution,
            configuredGeneratedCodeFlags = GeneratedFlags.ToString(),
            observedCallbackThreadIds = _threads.Keys.Order().ToArray(),
            maximumOverlappingObservedCallbacks = _maximumActive,
            realDriverCallbacksForwardedWithoutInjection = true,
            observerScope = "Ordinary unfiltered inputs;newer read-only generated/filter context fields match their default values. Generated-code controls run the unwrapped owner.",
            observerUsedInTimedBenchmark = false,
            cardinalityBoundary = "Actual generated factory method-target and nonsuspending StateHasChanged-method sets observed in real callbacks;not arbitrary production source cardinality or proof of timed contention.",
            rows
        };
    }

    private void Observe(Action callback)
    {
        _threads.TryAdd(Environment.CurrentManagedThreadId, 0);
        var active = Interlocked.Increment(ref _active);
        var prior = Volatile.Read(ref _maximumActive);
        while (active > prior)
        {
            var observed = Interlocked.CompareExchange(ref _maximumActive, active, prior);
            if (observed == prior)
            {
                break;
            }
            prior = observed;
        }
        try
        {
            callback();
        }
        finally
        {
            Interlocked.Decrement(ref _active);
        }
    }

    private sealed class ComponentCallbacks
    {
        public int OperationCallbacks;
        public int SyntaxCallbacks;
        public int SymbolEndCallbacks;
        public int FactoryInvocations;
        public ConcurrentDictionary<IMethodSymbol, byte> HandlerMethods { get; } = new(SymbolEqualityComparer.Default);
        public ConcurrentDictionary<IMethodSymbol, byte> StateCallMethods { get; } = new(SymbolEqualityComparer.Default);
    }

    private sealed class ForwardAnalysisContext(AnalysisContext inner, ProducerProbe probe) : AnalysisContext
    {
        public override DiagnosticSeverity MinimumReportedSeverity => inner.MinimumReportedSeverity;
        public override void EnableConcurrentExecution()
        {
            probe.EnabledConcurrentExecution = true;
            inner.EnableConcurrentExecution();
        }
        public override void ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags analysisMode)
        {
            probe.GeneratedFlags = analysisMode;
            inner.ConfigureGeneratedCodeAnalysis(analysisMode);
        }
        public override void RegisterSymbolStartAction(Action<SymbolStartAnalysisContext> action, SymbolKind symbolKind)
        {
            inner.RegisterSymbolStartAction(context => probe.Observe(() =>
            {
                Interlocked.Increment(ref probe._symbolStarts);
                Evidence.Require(!context.IsGeneratedCode && context.FilterTree is null && context.FilterSpan is null,
                    "The callback observer is restricted to ordinary unfiltered real compilations.");
                action(new ForwardSymbolStartContext(context, probe));
            }), symbolKind);
        }
        public override void RegisterCompilationStartAction(Action<CompilationStartAnalysisContext> action) => inner.RegisterCompilationStartAction(action);
        public override void RegisterCompilationAction(Action<CompilationAnalysisContext> action) => inner.RegisterCompilationAction(action);
        public override void RegisterSemanticModelAction(Action<SemanticModelAnalysisContext> action) => inner.RegisterSemanticModelAction(action);
        public override void RegisterSymbolAction(Action<SymbolAnalysisContext> action, ImmutableArray<SymbolKind> symbolKinds) => inner.RegisterSymbolAction(action, symbolKinds);
        public override void RegisterCodeBlockStartAction<TLanguageKindEnum>(Action<CodeBlockStartAnalysisContext<TLanguageKindEnum>> action) => inner.RegisterCodeBlockStartAction(action);
        public override void RegisterCodeBlockAction(Action<CodeBlockAnalysisContext> action) => inner.RegisterCodeBlockAction(action);
        public override void RegisterSyntaxTreeAction(Action<SyntaxTreeAnalysisContext> action) => inner.RegisterSyntaxTreeAction(action);
        public override void RegisterSyntaxNodeAction<TLanguageKindEnum>(Action<SyntaxNodeAnalysisContext> action, ImmutableArray<TLanguageKindEnum> syntaxKinds) => inner.RegisterSyntaxNodeAction(action, syntaxKinds);
    }

    private sealed class ForwardSymbolStartContext(SymbolStartAnalysisContext inner, ProducerProbe probe)
        : SymbolStartAnalysisContext(inner.Symbol, inner.Compilation, inner.Options, inner.CancellationToken)
    {
        public override void RegisterOperationAction(Action<OperationAnalysisContext> action, ImmutableArray<OperationKind> operationKinds)
        {
            var row = GetRow();
            inner.RegisterOperationAction(context => probe.Observe(() =>
            {
                Interlocked.Increment(ref row.OperationCallbacks);
                if (context.Operation is IInvocationOperation operation &&
                    operation.TargetMethod.ContainingType.ToDisplayString() == typeof(Microsoft.AspNetCore.Components.EventCallbackFactory).FullName)
                {
                    Interlocked.Increment(ref row.FactoryInvocations);
                    foreach (var method in operation.Arguments.SelectMany(argument => argument.Value.DescendantsAndSelf())
                        .OfType<IMethodReferenceOperation>())
                    {
                        row.HandlerMethods.TryAdd(method.Method, 0);
                    }
                }
                action(context);
            }), operationKinds);
        }

        public override void RegisterSyntaxNodeAction<TLanguageKindEnum>(Action<SyntaxNodeAnalysisContext> action, ImmutableArray<TLanguageKindEnum> syntaxKinds)
        {
            var row = GetRow();
            inner.RegisterSyntaxNodeAction(context => probe.Observe(() =>
            {
                Interlocked.Increment(ref row.SyntaxCallbacks);
                var method = (MethodDeclarationSyntax)context.Node;
                var hasBoundStateCall = method.DescendantNodes().OfType<InvocationExpressionSyntax>().Any(invocation =>
                    context.SemanticModel.GetSymbolInfo(invocation).Symbol is IMethodSymbol symbol &&
                    symbol.ContainingType.ToDisplayString() == typeof(Microsoft.AspNetCore.Components.ComponentBase).FullName &&
                    symbol.Name == "StateHasChanged");
                if (hasBoundStateCall)
                {
                    if (context.SemanticModel.GetDeclaredSymbol(method) is not IMethodSymbol symbol)
                    {
                        throw new InvalidOperationException("Actual method callback declaration did not bind.");
                    }
                    row.StateCallMethods.TryAdd(symbol, 0);
                }
                action(context);
            }), syntaxKinds);
        }

        public override void RegisterSymbolEndAction(Action<SymbolAnalysisContext> action)
        {
            var row = GetRow();
            inner.RegisterSymbolEndAction(context => probe.Observe(() =>
            {
                action(context);
                Interlocked.Increment(ref row.SymbolEndCallbacks);
            }));
        }

        public override void RegisterCodeBlockStartAction<TLanguageKindEnum>(Action<CodeBlockStartAnalysisContext<TLanguageKindEnum>> action) => inner.RegisterCodeBlockStartAction(action);
        public override void RegisterCodeBlockAction(Action<CodeBlockAnalysisContext> action) => inner.RegisterCodeBlockAction(action);
        public override void RegisterOperationBlockStartAction(Action<OperationBlockStartAnalysisContext> action) => inner.RegisterOperationBlockStartAction(action);
        public override void RegisterOperationBlockAction(Action<OperationBlockAnalysisContext> action) => inner.RegisterOperationBlockAction(action);

        private ComponentCallbacks GetRow()
        {
            return probe._components.GetOrAdd(inner.Symbol.ToDisplayString(), static _ => new ComponentCallbacks());
        }
    }
}
