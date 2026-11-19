// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Immutable;
using BenchmarkDotNet.Attributes;
using Microsoft.CodeAnalysis;

namespace AutoPerf;

/// <summary>Actual compiled analyzer predicate and fresh real diagnostic-driver measurements.</summary>
public class AnalyzerBenchmarks
{
    private AnalyzerScenario _scenario = null!;

    /// <summary>The exact predeclared parser-produced syntax profile.</summary>
    [Params("MinimalProgram", "LargeProgram", "LoneDeclaration", "EarlyGuard")]
    public string Profile { get; set; } = string.Empty;

    /// <summary>Select a synchronously available, already characterized real compilation.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _scenario = AnalyzerScenario.GetPrepared(Profile);
        Evidence.Require(_scenario.Evaluate() == _scenario.Definition.ExpectedPredicate, "Prepared predicate contract changed.");
        Evidence.Write("benchmark-setup", new
        {
            profile = Profile, actualPreparedBeforeAnyTiming = true,
            actualDescendantCount = _scenario.DescendantCount,
            actualExpectedPredicate = _scenario.Definition.ExpectedPredicate,
            actualExpectedDiagnostics = _scenario.Definition.ExpectedDiagnosticCount,
            actualSettings = SettingsPreservingEmitToolchain.ReadSettings()
        });
    }

    /// <summary>Invoke the actual private owner method through an untimed-bound delegate.</summary>
    [Benchmark]
    public bool Predicate() => _scenario.Evaluate();

    /// <summary>Return complete diagnostics from a fresh real analyzer driver on every invocation.</summary>
    [Benchmark]
    public Task<ImmutableArray<Diagnostic>> AnalyzeCompilation() => _scenario.AnalyzeAsync();

    /// <summary>Observe the unchanged actual source location on the same Roslyn declaration.</summary>
    [Benchmark]
    public Location UnchangedGetLocation() => _scenario.Declaration.GetLocation();
}
