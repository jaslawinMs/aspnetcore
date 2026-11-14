# F131 measured proposal: private OWIN feature-map lookup index

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Final source](https://github.com/jaslawinMs/aspnetcore/commit/fb2946a78adb33150ae345b5154d5557cb11275c):
`fb2946a78adb33150ae345b5154d5557cb11275c`.

[Draft jaslawinMs/aspnetcore#31](https://github.com/jaslawinMs/aspnetcore/pull/31)
and [origin jaslawinMs/aspnetcore#30](https://github.com/jaslawinMs/aspnetcore/issues/30)
are fork-only. The newly created draft was immediately browser-open requested.

**Ordinary method reads/writes improve 5.38-5.61% in final paired medians;
several other complete reads improve 7.10-18.87%.** Allocations are unchanged.
Actual full-`UseOwin` pipeline observations are small/mixed, not a stable broad
throughput claim. Six unchanged-path controls have higher medians.
The proposal adds one application-lifetime lookup table, not a memory reduction.

## Surgical change and compatibility

Retain the original immutable 25-entry map for counts, enumeration and mutable
per-context copying. Add a private `IReadOnlyDictionary<string, FeatureMap>`
backed by a once-built ordinal `Dictionary`, sharing the original FeatureMap
objects. Only three stable-map lookup probes use the index.
The original branches, explanatory locals, deleted-key guards, context-dependent
body setter, public mutable FeatureMaps API and ordering/copy paths are unchanged.
No public signature/default/convention, cache-refresh or dependency changes.
Two source/test files change: **158 additions / 3 deletions**, including
152 directly related compatibility-test lines.

The initial **FrozenDictionary** prototype regressed common method get/try/
contains/set scenarios **6.73 / 16.33 / 23.64 / 21.10%** in pair 1.
It is retained with all source, storage, tests and 29 paired case reports.
One source-only tune switched the private index to a read-only-interface
dictionary. The timing harness/DLL/PDB/configuration never changed.
Final summaries use **pairs 2-3 only**, not the frozen prototype.
All three allowed comparisons are consumed; no fourth run.

## Final measurements and non-wins

Each launch completed all 29 cases with eight retained measurements.
Negative percentages mean lower measured time; final medians are medians of
paired changes, not ratios of median means.

| Complete operation | Pair 2 / 3 change | Final paired median |
|---|---:|---:|
| Get_Method | -8.86 / -2.34% | -5.60% |
| Try_Method | -6.38 / -4.38% | -5.38% |
| SetRead_Method | -7.10 / -4.13% | -5.61% |
| Get_Query | -7.27 / -6.94% | -7.10% |
| Get_RequestHeaders | -8.99 / -6.46% | -7.73% |
| Get_Status | -11.16 / -7.72% | -9.44% |
| Get_ResponseBody | -9.19 / -18.98% | -14.09% |
| Try_Item | -15.58 / -12.36% | -13.97% |
| Try_Unknown | -14.03 / -19.91% | -16.97% |
| Try_CaseVariant, uncommon Items key | -17.89 / -19.85% | -18.87% |
| Get_Path, mixed | +4.51 / -11.39% | -3.44% |
| Contains_Method, mixed | -6.62 / +0.25% | -3.19% |

All 21 affected cases have lower final medians; 17 improve both pairs.
All **29 cases have identical allocation measurements in every pair**.

| Actual default UseOwin pipeline | Pair 2 / 3 change | Final paired median |
|---|---:|---:|
| NoRead | -4.70 / -0.46% | -2.58% |
| ReadCommon | -5.72 / -0.40% | -3.06% |
| ReadHeaders | -4.72 / +0.44% | -2.14% |
| PortsPresent | -4.88 / +0.65% | -2.12% |
| PortsMissing | -1.48 / -2.16% | -1.82% |

The second NoRead/ReadCommon gains are near zero; headers/ports reverse sign.
These are warmed managed pipeline observations, **not evidence of a stable
production/network throughput improvement**.

Eight controls bypass the new index in their measured execution. Six have
higher medians: Copied_Method **+4.07%**, Custom_Map **+2.97%**,
Construct_WarmContext **+2.90%**, Materialize_Maps **+2.73%**, Copy **+0.36%**,
Keys **+0.07%**. Removed_Method is lower in both pairs (-7.25% median);
Enumerate is mixed (-1.42% median). No index benefit, causal explanation or
harmless-noise diagnosis is claimed from these controls.

**AddRemove_Item is unstable and not a headline gain.** Original pair 3 mean/
SD/N is **184.16 / 126.72 ns / 8**, versus pair 2 **71.18 / 0.43 ns / 8**;
changed means are 60.06 and 56.34 ns. The apparent -69.41% pair-3 and -42.52%
median are retained without explanation, not used to justify a large speedup.
See [full statistics](add-remove-variance.json).

[All 29 final paired cases](comparison.md),
[exact machine-readable pairs](comparison.json),
[all 174 original/prototype/final case outcomes](raw-case-outcomes.json) and
unmodified JSON/CSV/Markdown exports preserve every result.
Raw logs retain generated whitespace, with session-path redaction only;
artifact-only log exemptions do not exempt production/test source.

## Actual producer and correctness boundary

Real `DefaultHttpContext` request/response/connection features produce method,
path/query, status, headers, ports and body values. Complete public environment
get/try/contains/set/AddRemove/enumeration/Keys/CopyTo/materialization/construction
operations run over that state. Pipeline cases use actual
`ApplicationBuilder.UseOwin` default registration and terminal middleware.
They consume actual values and verify complete checksum/status/header behavior.
This is not an extracted dictionary or injected callback benchmark.

All 29 setup receipts agree for original, frozen and final implementations.
Assertions, ordering checks, private-storage reflection and diagnostics run
outside timing. Timed execution has no Moq invocation history or growing
collection; AddRemove restores Items state and result fields retain one value.

Untimed original/prototype storage checks and the separate final
[storage-check project](storage-checks/AutoPerf.StorageChecks.csproj) establish
25 original maps, exact shared references, ordinal comparison, original public
copy order, a private readonly-interface field, no public static-index alias and
per-context/body isolation. The final diagnostic loads the **exact measured
Owin DLL**. The original harness's `--verify-storage` flag is specific to the
frozen prototype; the timing harness was not edited to support tuning.

## Requirement coverage

Original, frozen and final containing suites pass **31/31, zero skipped**.
All 12 added rows are individually accounted for in actual TRX reports.
These are compatibility checks, not a functional bug-fix red/green claim.

| Requirement | Evidence |
|---|---|
| Actual mapped values/setters, ordinal keys, missing-feature Items fallback and duplicate Add errors, both default/materialized paths | `OwinEnvironmentPreservesMappedAndItemsLookupEquality`, both rows |
| Removal/fallback/count and next-request isolation, both map paths | `OwinEnvironmentPreservesRemovalFallbackAndNextRequest`, both rows |
| Default/materialized order, shared original descriptors, custom-map isolation, owned body setter, Keys/CopyTo | `OwinEnvironmentPreservesCopyOrderCustomizationAndContextBody` |
| Readonly mapping replacement and Items/remove semantics | `OwinEnvironmentPreservesReadOnlyMapReplacement` |
| Get/TryGet/Set/Contains/Add/Remove null-key error/parameter identity | `OwinEnvironmentPreservesNullKeyErrors`, all six rows |
| Existing clear/new-request behavior | `OwinEnvironmentClearBehavesCorrectlyAndDoesNotImpactNextOwinEnvironment` |
| Complete actual producer/default pipeline/operation results | All 29 original/frozen/final receipts in `setup-correctness.json` |
| Actual private index/reference/comparer/order/body isolation | `storage-after-2.log` and `storage-checks/Program.cs` |

## Exact successful commands

Every direct .NET command ran after `. .\activate.ps1` from the source checkout.
Original and final harness builds passed, zero warnings/errors:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\before" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\after-2" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
```

Original/frozen/final each passed all 29 complete setup cases:

```powershell
dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\after-2\AutoPerf.Benchmarks.dll" --verify-setups
```

Original/frozen `--verify-storage` passed. Final separate checks built without
warnings/errors and exited successfully against the exact final target:

```powershell
dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-storage
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-storage
dotnet build "$RunRoot\storage-checks\AutoPerf.StorageChecks.csproj" `
  -c Release -o "$RunRoot\storage-build\after-2" -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false --verbosity quiet
dotnet "$RunRoot\storage-build\after-2\AutoPerf.StorageChecks.dll"
```

Original focused command passed all 12 rows. Each original/frozen/final full
command passed 31/31; the frozen TRX was archived before final overwrite:

```powershell
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --filter 'FullyQualifiedName~OwinEnvironmentPreserves' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-focused-before" --verbosity quiet

dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet
```

Source/test whitespace and staged diff checks passed without baseline exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Http\Owin\src\OwinEnvironment.cs `
    .\src\Http\Owin\test\OwinEnvironmentTests.cs `
  --report "$RunRoot\formatting-final" -v quiet
git diff --cached --check
```

All six measured launches passed all 29 cases, eight retained measurements each:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*OwinFeatureMapBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Reproducibility and limits

[Standalone timing project](harness/AutoPerf.Benchmarks.csproj) references the
actual source projects through `AspNetCoreRoot`. Build original/frozen/final
source separately and freeze complete outputs. Reuse the exact original harness/
PDB/runtime/configuration; only Owin DLL differs in both recursive closures.
All measured owner locations/MVIDs are recorded. Capture manifests retain
dirty-source provenance separately from the final source commit, without rewrite.

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha, BenchmarkDotNet `0.13.0`,
in-process/server GC, serial measurement on a shared Windows host.
No machine settings or repository dependency manifests changed.
The original immutable map remains plus one additional 25-entry index.
**Cold construction and retained index size are unmeasured**; the warm
constructor is not first-use evidence. Hosted HTTP/network throughput,
concurrent pressure, other runtimes/architectures, composition with other
branches and the cause of variance remain unverified.
