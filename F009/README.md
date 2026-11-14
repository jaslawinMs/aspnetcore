# F009: avoid growing-list scans in validation summaries

Source proposal: `741b8c19ac10117d253ce74c1e9d6c00fd463547`.
Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.

The final comparison observed **95.66% less helper time** with 1,000 bound
collection values outside the view metadata, and **95.04% less** with one
additional metadata-matched entry. Managed allocation was essentially unchanged
at about 16.7 KB/op. These are bounded helper measurements, not HTTP throughput.

## What changed

`ValidationHelpers.GetModelStateList` first visits the view metadata, then
appends unmatched dictionary entries. Previously each dictionary entry searched
the whole growing output list. The proposal checks only the metadata-visited
prefix: at most one comparison when that prefix has zero or one entry, or a
seeded `HashSet<ModelStateEntry>` for larger prefixes.

The dictionary owns a unique node for each logical key. Its enumeration cannot
repeat an appended entry, so newly appended entries do not need to be added to
the membership set. Output remains the original ordered list, with the same
default equality, metadata-first order, entry identity and model-error filtering.
There is no exported API change or persistent cache.

## Actual producer and observation boundary

The benchmark uses `SimpleTypeModelBinder` and `CollectionModelBinder<int>` to
bind a `FormValueProvider`. The scalar conversion genuinely fails; collection
values genuinely bind. Every setup checks the complete bound collection,
`ModelState.Count`, the conversion error, and returned entry identities/order.
The benchmark does not inject errors, copy the membership algorithm, or time
reflection. A typed delegate to the actual compiled production helper is bound
once during setup.

View shapes are:

- `AllUnmatched`: unassigned/object view metadata, as when returning a view without a model.
- `Mixed`: a projected view with only the bound scalar property.
- `Aligned`: metadata for both bound parameters, avoiding the fallback.
- `Excluded`: model-error-only selection using the actual bound scalar prefix.
- `Empty`: no values or model-state entries.

Counts 1, 16, 128 and 1,000 mean collection elements; nonempty cases have one
additional scalar entry. The largest form contains 1,001 supplied values, below
the default form value-count limit, and its collection remains below the default
model-binding collection limit. HTTP form parsing itself is not exercised.

The six compatibility rows run the actual binders through real HTML-helper
rendering, with zero, one or two metadata-matched entries and property errors
included/excluded. They assert the exact rendered messages, order and uniqueness.
They pass individually on both original and final source. Existing compatibility
tests also cover larger metadata sets. The timed matrix does **not** independently
measure the seeded-set path with multiple matching metadata entries.

## Measurements and tuning

[All 17 final cases](comparison.md) include all regressions and allocation results.
The final table is **comparison 2 only**, launched changed/original. Eight
measurement iterations per case were retained without outlier removal.
The table's single-pair median is simply that comparison's percentage change.

Final examples:

| Case | Original ns/op | Final ns/op | Change | Original/final B/op |
|---|---:|---:|---:|---:|
| AllUnmatched_1000 | 384788.60 | 16717.37 | -95.66% | 16709 / 16688 |
| Mixed_1000 | 377500.32 | 18726.43 | -95.04% | 16709 / 16689 |
| AllUnmatched_128 | 8983.72 | 2773.67 | -69.13% | 4353 / 4352 |
| Mixed_128 | 8951.55 | 2992.16 | -66.57% | 4353 / 4352 |
| AllUnmatched_1 | 98.88 | 103.30 | +4.47% | 176 / 176 |
| Mixed_1 | 114.82 | 120.55 | +4.99% | 176 / 176 |

Nine cases have positive time changes, including `Aligned_128` +9.24% and
`Excluded_1` +11.35%. These unchanged-path controls are retained rather than
discarded; the exclusion differences are approximately 1-2 ns/op. The shared
Windows host and short run do not establish that these changes are significant
or universal. Minor allocation differences are measurement variation, not a
claimed allocation improvement.

[Comparison 1](prototype-1/README.md) measured a rejected allocating prototype:
about 90% less large-case time, but roughly 5.4 times the heap allocation and
33-73% small-fallback slowdowns. That evidence is retained separately and is
**not averaged with the final implementation**. Two comparisons were consumed.
The second implementation met the large-win stopping rule; no third comparison
was run.

## Validation commands and results

Each direct .NET command was run from the source checkout after
`. .\activate.ps1`. Native IIS assets and Node rebuilding were disabled; existing
repository JavaScript assets had already been built.

Original production source, final compatibility fixture: **75 passed, 0 skipped**,
including all six new rows individually:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~HtmlHelperValidationSummaryTest' `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-before" --nologo -v quiet
```

Final source: **2,599 passed, 0 skipped**, including all six rows individually:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" --nologo -v quiet
```

Changed-file whitespace: **passed**, no baseline exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\ValidationHelpers.cs `
            .\src\Mvc\Mvc.ViewFeatures\test\Rendering\HtmlHelperValidationSummaryTest.cs `
  --report "$RunRoot\formatting-final" -v quiet
```

Benchmark project: **built with 0 warnings and 0 errors** for both variants.
Initially missing assets were restored after the no-restore commands reported
`NETSDK1004`. No repository package manifests or NuGet configuration were changed.

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet
```

Dry checks: **all 17 cases passed** on original, prototype and final snapshots:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationSummaryBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

Each of the four measured launches: **17 complete cases, at least eight
measurements per case**, exit code 0:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationSummaryBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

## Reproducibility and limits

[The standalone BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references actual source projects through `AspNetCoreRoot`. Build it separately
against the baseline and proposal, copying each complete build output before
rebuilding the other variant. Activate the checkout's pinned environment first.
The snapshots used byte-identical harness, runtime/dependency configurations,
MVC Core and MVC Abstractions; only the ViewFeatures production assembly changed.
Assembly-load paths and hashes are retained in the evidence.

Runtime: .NET 12.0.0 alpha; SDK `12.0.100-alpha.1.26557.102`;
BenchmarkDotNet `0.13.0`, server GC, Windows/Xeon shared host. See
[environment](environment.json), [provenance](provenance.json),
[correctness](correctness.json), and [all launches](all-execution.json).

The first compatibility setup used implicit indexes with a failing first element.
The real collection binder correctly stopped immediately; that incomplete setup
was rejected before timing. The final rendering fixture supplies explicit indexes
to exercise later conversion failures. The timed collection supplies valid
elements and checks all implicit indexes were actually bound.

No hosted HTTP, browser, native IIS/ANCM, cross-runtime, many-metadata-entry timing,
or composition with other optimization branches is claimed as verified.
