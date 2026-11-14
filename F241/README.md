# F241 measured proposal: bounded view-component discovery membership

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Final source](https://github.com/jaslawinMs/aspnetcore/commit/de11a4d95cf493f907520ca7a29865456ff93305):
`de11a4d95cf493f907520ca7a29865456ff93305`.

[Draft jaslawinMs/aspnetcore#33](https://github.com/jaslawinMs/aspnetcore/pull/33)
and [origin jaslawinMs/aspnetcore#32](https://github.com/jaslawinMs/aspnetcore/issues/32)
are fork-only. The newly created draft was immediately browser-open requested.

**Three 1,024-component complete-discovery cases improve 30.03-33.71% in
final paired medians, with more heap allocation.** Two indexed 256-component
cases improve 5.53-7.97%. Eighteen of twenty non-index cases have higher medians.
This is a qualified metadata-discovery proposal, **not a request-throughput,
full application startup or universal performance improvement**.

## Surgical change and compatibility

Keep the existing ordered exposed list, preexisting duplicates, convention
predicate, argument errors and original type enumeration. Lazily create a
per-call `HashSet<TypeInfo>` once 256 entries already exist and another actual
component is examined. Append first unseen types to the same list and update
the local index.

A custom type/assembly/parts enumerator can mutate that exposed list while
yielding. A blanket snapshot index would change live membership semantics.
Indexing is therefore limited to the exact manager-style `List<ApplicationPart>`
containing exact `AssemblyPart` providers backed by ordinary runtime assemblies.
Null/non-type parts still skip normally. Custom/derived type providers, custom
assemblies and arbitrary parts enumeration retain list membership.
No public signature, default or convention change is intended; no static
metadata cache, Hot Reload handler or dependency change is introduced.

The independent source diff contains **223 additions / 2 deletions** in two
files, including 203 directly related test lines. Untouched code is preserved.

The initial 32-entry prototype improved the three large cases 32.06-32.62%,
but smaller indexed cases generally regressed and allocated more. Its complete
source/test patch, original criteria, manifests, 2,604/2,604 compatibility
results and first paired measurements are archived in [prototype-1](prototype-1).
One documented source-only tune raised the threshold to 256; the timing
harness/DLL/PDB/configuration did not change.
Final summaries use **pairs 2-3 only**, never aggregate the two thresholds.
All three permitted comparisons are consumed; no fourth run.

## Final measurements and non-wins

Every launch completed all 25 cases with eight retained measurements.
Negative percentages mean lower time. Medians are medians of paired changes,
not ratios of median means. Bytes below are medians of the reported B/op.

| Complete discovery | Pair 2 / 3 time change | Final paired median | Before / after B/op |
|---|---:|---:|---:|
| Runtime_1024 | -30.37 / -29.69% | -30.03% | 27,781 / 72,394 |
| Repeated_1024_3 | -32.97 / -32.15% | -32.56% | 49,614 / 92,225 |
| PrepopAll_1024 | -34.52 / -32.89% | -33.71% | 27,777.5 / 49,330 |
| Repeated_256_3 | -7.27 / -3.79% | -5.53% | 11,270 / 17,246 |
| PrepopAll_256 | -8.55 / -7.39% | -7.97% | 6,780 / 12,782 |

All five indexed cases improve both final pairs, but add **5,976-44,613 median
reported B/op**. This is a time/heap tradeoff, not an allocation reduction.
The three largest cases save roughly 0.36-1.19 milliseconds per complete
discovery operation in the measured pairs, not per request.

Twenty cases do not create the final index. Eighteen have higher medians;
`Derived_64_2` (-2.41%, mixed) and `NoComponents_1024` (-1.12%, both pairs)
are lower. Common small cases include `Runtime_8` +0.75%, `Runtime_31` +0.98%,
`Runtime_32` +0.82%, `Runtime_33` +0.07%, and `Runtime_64` +1.60%.
`Runtime_256` is **+2.60%**, with unchanged reported B/op: one part finishes at
256 entries without a further candidate, so it does not create the index.
Empty discovery is **+9.15 / +11.83%, +10.49% median**, about 23-30 extra ns/op.
All non-wins, allocation discrepancies and controls remain in
[the complete 25-case table](comparison.md).

**The array fallback is unstable and regresses.** Its two changes are
-0.18 / +42.82%, **+21.32% median**. Pair-3 original mean/SD/N is
103,181.74 / 11,666.70 ns / 8; changed is
147,369.05 / 55,930.90 ns / 8. The changed range is
96,597.92-243,180.95 ns. These results are retained, not excluded or explained
away as harmless noise. No index benefit or index-allocation attribution is
made for paths that do not index.

[Machine-readable final pairs](comparison.json),
[all 150 original/prototype/final case outcomes](raw-case-outcomes.json),
[full variance](variance.json), and every raw JSON/CSV/Markdown/console export
retain all observations and outliers.

## Actual producer and validation boundary

Actual `ApplicationPartManager`, ordinary runtime `Assembly.DefinedTypes`,
`AssemblyPart`, convention filtering and `ViewComponentFeatureProvider`
perform complete discovery. Fixtures are real persisted/loaded CLR assemblies
with public invokable classes using both suffix and actual attribute conventions.
Fixture construction/loading, reflection assertions and serialization are
outside timing. Each operation creates and prepopulates a fresh feature,
performs discovery and consumes its count/first/last result.
Setup checks the entire ordered `TypeInfo` sequence and its ordered-name hash.
No extracted list benchmark, injected callback, timed mock history or growing
per-operation retained collection substitutes for the owning producer.

All 25 complete setup receipts match original, initial and final outputs.
Array/lazy cases call the public provider directly; other cases use the
actual manager. Actual trusted/fallback producer types are checked.
The unchanged harness's `IndexThresholdReachable` field describes the
**32-entry prototype**. [Final preconditions](final-preconditions.json) derive
the five 256-entry cases from exact final source, actual producer/result
receipts and unchanged scenario part counts. This is **derived reachability,
not private index-creation instrumentation**.

## Requirement coverage

Final original/candidate containing suites pass **2,607/2,607, zero skipped**.
All 16 focused rows, including 14 added rows, are individually recorded in
the original and final TRX reports. Initial 2,604/2,604 and 13 focused rows
are archived before the threshold tune. These are compatibility checks,
not a functional bug-fix red/green claim.

| Requirement | Evidence |
|---|---|
| Same exposed list, existing duplicates, exact first-new order, repeated ordinary runtime assemblies, null/non-type parts and 31/32/33/255/256/257 boundaries | `PopulateFeature_PreservesAssemblyOrderAndExistingDuplicates`, all six rows |
| Actual custom producer add/remove/replace effects with 300 preexisting entries | `PopulateFeature_PreservesCustomPartListMutations`, all three rows |
| Derived AssemblyPart reimplements Types and mutates a 256-entry feature | `PopulateFeature_PreservesReimplementedAssemblyPartTypes` |
| Custom Assembly.DefinedTypes mutates a 256-entry feature and is enumerated once | `PopulateFeature_PreservesCustomAssemblyTypeEnumeration` |
| Arbitrary parts producer remains single-pass and its mutation is observed | `PopulateFeature_PreservesSinglePassPartsEnumeration` |
| Null parts/feature exception type and parameter identity | `PopulateFeature_PreservesNullArgumentErrors`, both rows |
| Existing suffix and attributed component discovery | `GetDescriptor_DefaultConventions`, `GetDescriptor_WithAttribute` |
| Complete actual manager/provider results and producer preconditions | All 25 original/initial/final receipts in `setup-correctness.json` |

## Exact successful commands

Every direct .NET command ran after `. .\activate.ps1` from the source checkout.
`$RunRoot` was the session artifact directory `autoperf-runs\F241`;
the published standalone project is [harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj).

The final harness build passed with zero warnings/errors:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -v quiet
```

The following full command passed 2,607/2,607 on **exact original shipping
source with the final tests**, then 2,607/2,607 on final source. Every focused
row passed; zero skips:

```powershell
dotnet test src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet
dotnet test src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet
```

Whitespace and staged-diff checks passed without preexisting exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\ViewComponents\ViewComponentFeatureProvider.cs `
    .\src\Mvc\Mvc.ViewFeatures\test\ViewComponents\ViewComponentFeatureProviderTest.cs `
  --report "$RunRoot\formatting-2" -v quiet
git diff --cached --check
```

The exact final frozen owner passed all 25 setup cases:

```powershell
dotnet "$RunRoot\binaries\after-2\AutoPerf.Benchmarks.dll" --verify-setups
```

All six measured launches passed all 25 cases, eight retained measurements each:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ViewComponentDiscoveryBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Reproducibility, preparation and limits

The standalone project references actual source projects through
`AspNetCoreRoot` (override for another checkout). Use the pinned repository
environment and documented build prerequisites, including MVC static assets.
Build each source variant separately, freeze the complete original output and
replace only the exact freshly built owning DLL/PDB for the source-only variant.
Do not rebuild the timing harness or change runtime/dependency configuration
between measured variants.

The first final snapshot attempt rejected regenerated dependency metadata
**before manifest capture or any measured launch**. The rebuilt metadata omitted
unrelated reference-runtime entries. The resolution staged the entire original
closure with only the exact built ViewFeatures DLL/PDB replaced; no captured
snapshot or harness was edited. [Preparation](binary-preparation.json) and
[the rejected metadata](uncaptured-rebuilt-deps.json) preserve this event.
All **154 recursive DLL/JSON files** were checked: only the owner DLL differs.
The harness DLL/PDB/runtime/deps remain byte-identical, all 25 setup receipts
match, and every actual measured owner location/MVID is recorded.
Capture manifests retain honest dirty-source provenance separately from the
final source commit; they were not rewritten.

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha,
BenchmarkDotNet `0.13.0`, in-process/server GC, serial measurements on a shared
Windows machine. No machine settings or tracked dependency manifests changed.
Cold-runtime/assembly-loading cost, full application startup or HTTP throughput,
concurrent discovery/metadata updates, other runtimes/architectures, combined
branch effects, production workload distribution and the cause of variance
remain unverified. The index's extra ephemeral heap is part of the reported
tradeoff, not a free improvement.
