# F110: index larger caller-provided select-value lists

**Measured workload-specific proposal, with extra heap and control regressions.**
Source: `cc6b5bc4f181f26d7d1bffe1053b4aafbac18323`.
Branch: `autoperf/F110-select-value-membership`.
Independent upstream baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
No other AutoPerf proposal is carried on this branch.

## Final measurements

Seven larger List/grouped cases improve in both final pairs, with median paired
time **39.87-84.11% lower**. Five 1,024-option cases improve **60.60-84.11%**.
Across all 12 indexed cases, 11 have lower medians and 10 improve in both pairs.
`Grouped_64_32` has a **+1.21%** median; `ListHit_64_32` is -12.38% in one pair
and approximately +0.004% in the other. These are not universal wins.

**Every indexed case allocates more in both pairs**: measured increases range
from **646 to 22,233 B/op**. The per-render HashSet trades temporary heap for
repeated list scans. These deltas include the complete rendering workload,
not only an isolated or exact intrinsic HashSet allocation.

Twenty non-indexed controls are retained: 11 lower and nine higher time medians,
with four regressions in both pairs. The normal binder-produced HashSet case
at 64 options/32 values is **+7.68%**, approximately 1.33 us slower when averaging
the absolute pair differences. This proposal does not improve the default MVC
path, which already supplies a HashSet, and is not a weighted/net production
throughput claim.

| Case | Original us/op by pair | Changed us/op by pair | Median paired time change | Added B/op by pair |
|---|---:|---:|---:|---:|
| ListHit_256_128 | 104.47 / 103.12 | 58.93 / 65.86 | -39.87% | 3023 / 2774 |
| ListMiss_256_128 | 113.72 / 112.15 | 54.64 / 62.64 | -48.05% | 3005 / 2774 |
| ListHit_1024_512 | 929.54 / 900.51 | 338.96 / 346.86 | -62.51% | 10537 / 10795 |
| ListHit_1024_1024 | 1193.47 / 1151.10 | 396.35 / 385.17 | -66.66% | 22127 / 22233 |
| ListMiss_1024_512 | 1123.16 / 1068.19 | 294.11 / 303.75 | -72.69% | 10511 / 10551 |
| ListMiss_1024_1024 | 2039.42 / 1906.95 | 308.27 / 317.59 | -84.11% | 22114 / 22186 |
| Grouped_1024_512 | 938.43 / 925.74 | 363.10 / 371.35 | -60.60% | 10803 / 10564 |
| Grouped_64_32 | 22.17 / 23.91 | 23.60 / 22.95 | +1.21% | 848 / 646 |
| Bound_64_32 | 16.74 / 18.64 | 18.61 / 19.42 | +7.68% | -48 / 0 |
| ListMiss_16_16 | 6.05 / 5.93 | 6.43 / 6.12 | +4.72% | -48 / 0 |
| Indexer_64_32 | 74.41 / 66.69 | 66.26 / 73.57 | -0.32% | -42 / 44145 |

[All 32 cases](comparison.md), [all per-pair values](comparison.json),
[indexed/control classification](measurement-summary.json), and
[notable individual samples](notable-case-samples.json) are included.
Final statistics use only rounds 2-3; all six raw launches remain.

## Important control limitations

`Indexer_64_32` uses the same Moq option-indexer producer in both variants.
Its round-3 changed allocation is **126,533 B/op**, versus **82,388 B/op**
original: **+44,145 B/op**, approximately +53.6%. The other final pair is
-42 B/op. Its time pairs are -10.95% and +10.32%.

A separate **untimed actual-render observation** proves this control retains
131 additional Moq invocations per render. After 64 renders, retained calls
grow from 131 to 8,515 and invocation-storage capacity from 256 to 16,384,
while complete HTML remains identical. See the
[diagnostic source](diagnostic/Program.cs) and
[actual observation](indexer-retention.log).
This is not a steady-state allocation control. It is not used to justify
source speedups or to quantify the cause of the +44,145 B/op result; the raw
increase is neither removed nor dismissed. No fourth benchmark was run.
The permanent test separately proves actual indexer mutation semantics.

`Array_1024_512` is not indexed. Its apparent final median improvement is
-32.90%, but original means/SDs are **1,376.73/549.24 us** and
**1,758.03/1,994.58 us** in the final pairs. The first pair regressed +12.76%.
No array-path improvement, harmless-noise explanation or causal attribution
is made. All eight samples and outliers remain.

Other non-indexed allocation differences also remain. There is no blanket
unchanged-allocation or unchanged-control-time claim.

## Mechanism and preserved behavior

The original private option loop invokes `ICollection<string>.Contains` for
each option. Normal `GetCurrentValues` already returns a HashSet; a caller's
sequential list can instead require options times selected-values scans.

The nine added shipping lines build one ordinal HashSet per render only for
an **exact List<string> with at least 32 entries** and at least **32 options**
in a materialized **exact List<SelectListItem> or SelectListItem[]**.
Lazy option enumeration finishes before the index is built.
The existing `GenerateOption` call, `Value ?? Text` fallback, Selected override,
grouping, option label, output order and encoding are untouched.

Exact collection checks are intentional: a List subclass can reimplement
`ICollection.Contains`, arbitrary collections can use different comparers or
side effects, and custom option indexers can update selected values during
rendering. Those paths keep the original calls. Existing HashSets, arrays of
selected values, small/empty inputs and unknown option indexers are not indexed.
The count gate is a measured heuristic, not a universal optimum; different
value lengths, duplicates, early hits and workload distributions are unverified.
No caller collection is modified or retained by the optimization.
No exported API, process-wide metadata cache or Hot Reload handler is added.

## Actual producer and correctness evidence

The [standalone BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
times the actual public `GenerateSelect` overload, `WriteTo(HtmlEncoder.Default)`
and `StringWriter.ToString`, including full tag construction and encoding.
It does not time an extracted `Contains` proxy.

32 setups compare complete HTML against an independent oracle based on
selected option indices, not the tested membership operation. Cases include
16/64/256/1,024 options, hits/misses, 1/8/16/32/128/512/1,024 selected values,
ordinal/ignore-case HashSets, arrays of selected values, List subclasses, opaque collections,
groups, disabled/previously-selected options, encoded labels/text, null Value
with Text fallback, empty lists, lazy enumeration and custom indexers.
The normal controls use actual `FormValueProvider`,
`CollectionModelBinder<string>` and `GetCurrentValues`; every bound value and
ModelState outcome is checked. Binding and setup assertions are outside timing.
Client validation is disabled.
The eligible options-array path is not separately timed in these 32 cases;
all indexed timing cases use concrete or materialized option Lists.

The lazy/indexer updates occur on the first setup render. Their established
input is timed; a fresh mutation on every measured iteration is not claimed.
All complete HTML/producer receipts agree in the original, first prototype
and final builds. Original/prototype/final owning suites each pass
**2,601 tests**, zero skipped, including every one of the eight new rows.

| Requirement | Evidence |
|---|---|
| Ordinal matching, Selected override, grouped and ungrouped exact HTML | `GenerateSelect_CurrentValuesList_PreservesOrdinalMatchingAndGrouping(false/true)` |
| Existing ordinal and ignore-case HashSet comparers | `GenerateSelect_CurrentValuesHashSet_PreservesComparer(false/true)` |
| Actual List-subclass Contains result and all 32 calls | `GenerateSelect_CurrentValuesListSubclass_PreservesContainsImplementation` |
| Arbitrary Contains without added enumeration/Count access | `GenerateSelect_CurrentValuesCollection_PreservesContainsWithoutEnumeration` |
| Actual lazy option producer updates before indexing | `GenerateSelect_CurrentValuesList_ObservesOptionEnumerationUpdates` |
| Actual custom indexer updates during selection | `GenerateSelect_CurrentValuesList_ObservesCustomOptionIndexerUpdates` |

[All individual focused outcomes](correctness.json),
[all complete HTML/producer receipts](setup-correctness.json), and
[acceptance scope](acceptance.json) are retained.
These are compatibility checks, not a functional bug-fix red/green claim.
The complete MVC generator/encoder boundary is observed; no browser, HTTP-hosted
application, production workload or concurrent-mutation test was performed.

## Protocol, tuning and provenance

Round 1's count-16 prototype includes a 6.06% time / 539 B/op regression for
the small hit case. One tune raises both gates to 32.
The [first prototype](prototype-1/README.md), its source and all results remain;
its statistics are not pooled with the final implementation.

Three comparisons are consumed: original/prototype, final/original and
original/final. The final DLL is immutable and identical in rounds 2-3.
Each A/B closure reuses the exact original benchmark DLL/PDB after matching
runtime/dependency configurations. Only ViewFeatures differs among executable
DLL/configuration files. All actual target loads, hashes, capture manifests and
final-commit verification are retained in [provenance](provenance.json),
[assembly hashes](assembly-hashes.json) and [actual loads](assembly-loads.json).
The capture manifests truthfully retain baseline HEAD and dirty source/test
state, rather than being rewritten to claim the final commit was already built.

The pinned prerelease SDK is 12.0.100-alpha.1.26557.102 and runtime
12.0.0-alpha.1.26562.105; BenchmarkDotNet 0.13.0 uses in-process server GC.
This is a shared Windows host with serial builds/measurements, not an isolated
production server. No machine settings were changed.

## Exact successful commands

From the checkout, activate before each command session:

```powershell
. .\activate.ps1

# Final build: passed, zero warnings/errors.
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\after-2" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet

# Original/prototype/final setup executable: all 32 complete contracts passed.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups

# Final owning suite: 2601 passed, zero failed/skipped; all eight new rows passed.
dotnet test src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet

# All six measured launches: passed; 32 cases each, N=8, all samples retained.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*SelectMembershipBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove

# Both touched files: passed, no changes/diagnostics.
dotnet format whitespace --folder . `
  --include src\Mvc\Mvc.ViewFeatures\src\DefaultHtmlGenerator.cs `
  src\Mvc\Mvc.ViewFeatures\test\DefaultHtmlGeneratorTest.cs `
  --verify-no-changes --verbosity quiet
# Passed.
git --no-pager diff --check

# Untimed diagnostic: build passed with zero warnings/errors.
dotnet build "$RunRoot\diagnostic\F110Diagnostics.csproj" -c Release `
  -o "$RunRoot\diagnostic-build" -m:2 --verbosity quiet
# Passed: actual invocation retention/storage growth, identical complete HTML.
dotnet "$RunRoot\diagnostic-build\F110Diagnostics.dll" "$RunRoot\binaries\after-2"
```

Reuse the locally generated MVC Node/static-web-assets prerequisites with
`BuildNodeJS=false`; this machine lacks native ANCM build prerequisites, so
`UseIisNativeAssets=false` is explicit. No tracked SDK, NuGet or Node manifests
were changed. Original and first-prototype builds also passed with zero
warnings/errors. Benchmark projects and diagnostics live outside shipping code.
