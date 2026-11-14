# [AutoPerf F241] Index large view-component discovery membership

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Use bounded membership for large view-component metadata discovery.

## Description

Fork-only AutoPerf F241 proposal; not an upstream submission.
Keep the original ordered exposed list, existing duplicates, convention
filtering and live custom-producer behavior. Lazily create a per-call index
after 256 existing entries, only for exact manager-style parts lists with
ordinary exact `AssemblyPart`/runtime-assembly providers.
Custom/derived providers, custom assemblies and arbitrary parts enumeration
retain list scans. No public signature/default/convention or process-wide
metadata cache change is intended.

The independent two-file diff is 223 additions / 2 deletions, including 203
directly related test lines.
[Immutable complete evidence, exact source, commands and standalone project](https://github.com/jaslawinMs/aspnetcore/tree/b0026a1912ea7167d0a8bab08f1985c3c21075af/F241).

### Measurements and retained costs

All three allowed comparisons are consumed. One source-only tune raised the
initial threshold from 32 to 256. Final summaries use pairs 2-3 only;
the first prototype and every result remain separately published.
The timing harness/DLL/PDB/runtime/dependency configuration stayed unchanged.
Every launch completed all 25 cases with eight retained measurements.

| Complete metadata discovery | Pair 2 / 3 time change | Median | Before / after B/op |
|---|---:|---:|---:|
| Runtime_1024 | -30.37 / -29.69% | -30.03% | 27,781 / 72,394 |
| Repeated_1024_3 | -32.97 / -32.15% | -32.56% | 49,614 / 92,225 |
| PrepopAll_1024 | -34.52 / -32.89% | -33.71% | 27,777.5 / 49,330 |
| Repeated_256_3 | -7.27 / -3.79% | -5.53% | 11,270 / 17,246 |
| PrepopAll_256 | -8.55 / -7.39% | -7.97% | 6,780 / 12,782 |

These five cases improve both final pairs, but add **5,976-44,613 median
reported B/op**. This is a time/heap tradeoff, not an allocation reduction.
Twenty cases do not create the final index; **eighteen have higher medians**.
Empty discovery is +10.49% (about 23-30 extra ns/op).
Single-part Runtime_256 is +2.60% with unchanged reported B/op; it reaches 256
entries without a further candidate, so it does not create the index.

**The array fallback is unstable and regresses:** -0.18 / +42.82%,
+21.32% median. Pair-3 original mean/SD/N is
103,181.74 / 11,666.70 ns / 8; changed is
147,369.05 / 55,930.90 ns / 8. No harmless-noise or causal explanation is claimed.
[All paired cases, controls, allocations and non-wins are retained](https://github.com/jaslawinMs/aspnetcore/blob/b0026a1912ea7167d0a8bab08f1985c3c21075af/F241/comparison.md).

Actual manager, ordinary runtime type enumeration, attribute/convention
filtering, feature creation/prepopulation and complete discovery run in timing.
Fixture assembly generation/loading and assertions run outside timing.
The unchanged harness's 32-entry diagnostic is not relabeled:
five final index preconditions are separately derived from exact source,
actual producer/result receipts and original scenario configuration.
This is warmed metadata-discovery evidence, **not full application startup,
request/production throughput, cold-runtime, concurrency or universal gains**.

### Requirement coverage

Exact original/final source passes **2,607/2,607, zero skipped**.
All 16 focused rows pass individually on both; 14 are added.
Initial original/prototype 2,604/2,604 and 13 focused rows remain archived.
These are compatibility checks, not functional bug-fix red/green.

| Requirement | Evidence |
|---|---|
| Ordered list identity, retained duplicates, first-new order, actual repeated runtime AssemblyPart discovery, null/non-type parts and 31/32/33/255/256/257 boundaries | `PopulateFeature_PreservesAssemblyOrderAndExistingDuplicates`, six rows |
| Actual custom producer live add/remove/replace with 300 preexisting entries | `PopulateFeature_PreservesCustomPartListMutations`, three rows |
| Derived AssemblyPart reimplementation mutates a 256-entry feature | `PopulateFeature_PreservesReimplementedAssemblyPartTypes` |
| Custom Assembly.DefinedTypes mutates a 256-entry feature and enumerates once | `PopulateFeature_PreservesCustomAssemblyTypeEnumeration` |
| Arbitrary parts producer remains single-pass and its mutation is observed | `PopulateFeature_PreservesSinglePassPartsEnumeration` |
| Null parts/feature exception type and parameter identity | `PopulateFeature_PreservesNullArgumentErrors`, both rows |
| Existing suffix and attribute discovery | `GetDescriptor_DefaultConventions`, `GetDescriptor_WithAttribute` |
| Complete actual producer/result correctness | All 25 original/initial/final setup receipts |

### Successful validation commands

Every direct .NET command ran after `. .\activate.ps1` from the source checkout.
`$RunRoot` is the F241 artifact directory.

Both full commands below passed 2,607/2,607, all 16 focused rows, zero skipped:

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

Final harness build passed, zero warnings/errors:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -v quiet
```

Final frozen owner passed all 25 setup cases; formatting and staged-diff checks
passed without baseline exceptions:

```powershell
dotnet "$RunRoot\binaries\after-2\AutoPerf.Benchmarks.dll" --verify-setups
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\ViewComponents\ViewComponentFeatureProvider.cs `
    .\src\Mvc\Mvc.ViewFeatures\test\ViewComponents\ViewComponentFeatureProviderTest.cs `
  --report "$RunRoot\formatting-2" -v quiet
git diff --cached --check
```

All six measured launches passed 25 cases with eight retained measurements:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ViewComponentDiscoveryBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha, BenchmarkDotNet `0.13.0`,
in-process/server GC, serial measurements on a shared Windows machine.
Only the owning DLL differs across the 154-file recursive closure, with exact
actual owner paths/MVIDs recorded. A rejected dependency-metadata preparation
attempt occurred before capture/timing and is documented; the final image
freezes the complete original closure/configuration with the exact built owner
replaced. No captured snapshots were edited.
No machine settings or tracked dependency manifests changed.

Fixes #32
