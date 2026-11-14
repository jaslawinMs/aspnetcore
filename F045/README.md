# F045: reuse the validation-message ModelState lookup

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Source: `0e72208e9e659c3de730314721ff0717e6836d76`.
This branch does **not** include F090's Boolean-string optimization.

## What changed and why it is equivalent

`GenerateValidationMessage` previously called `ContainsKey(fullName)` and then
`TryGetValue(fullName, out entry)`. Both ModelState methods traverse the same
internal tree and recognize a value only when `IsContainerNode` is false.
The early-return case with no entry and client validation disabled already
performed only one traversal.

The existing `tryGetModelStateResult` statement moves above that early-return
guard and supplies its Boolean result. The explanatory local, guard structure,
error selection and all subsequent rendering logic remain. No unrelated
formatting, new cache, exported API, test or dependency changes.
The pattern dates to the initial `IHtmlGenerator` implementation,
`339c63d143482313e0c80cf55c386aba940aba66`. Related upstream
dotnet/aspnetcore#65568 does not change this source file.

## Faithful producer and output boundary

The actual `SimpleTypeModelBinder` consumes a `FormValueProvider` outside timing.
It produces a valid integer entry, an invalid integer/error, or no entry for a
missing value. It also genuinely binds 0, 63 or 255 other fields; the ModelState
tree is not populated by directly adding values/errors in the fixture.

Every setup checks each other binding result, target existence/attempted value,
binding success, total ModelState entries/errors and complete actual rendered
HTML (or the required null result). The timed method is the actual public
`DefaultHtmlGenerator.GenerateValidationMessage`, not a copied lookup.
The 60 cases cover these three widths, three binding states, null/empty/custom
messages, client validation enabled/disabled and caller-provided attribute
overrides. The original and candidate each pass all 60 setups and Dry cases.

There are 51 double-lookup scenarios and 9 single-lookup controls. All raw
results, allocations and control regressions are retained in
[the complete paired table](comparison.md) and
[machine-readable per-pair results](measurement-summary.json).

## Measurements, regressions and limits

All 51 double-lookup cases have lower median paired time: **3.48-48.02%**.
The largest wins are client-disabled valid-state calls that return no tag,
not full HTML rendering. All 60 cases have unchanged measured allocations.

| Case | Other bound fields | Median paired time change |
|---|---:|---:|
| ClientOff_Valid_Null | 0 | -44.75% |
| ClientOff_Valid_Null | 63 | -45.17% |
| ClientOff_Valid_Null | 255 | -47.85% |
| ClientOn_Valid_Null | 63 | -14.52% |
| ClientOn_Invalid_Null | 255 | -12.54% |
| ClientOn_Absent_Null | 0 | -3.48% |

48 affected cases improve in every pair. The three client-enabled absent-target
cases with zero other fields regress in round 3: custom +3.47%, empty +1.81%,
null +0.23%. Their medians still improve; they are not described as consistent
per-round wins.

Three single-lookup controls have positive medians, all with zero other fields:
custom +4.09%, empty +3.06%, null +1.94%. The other six controls have medians
-3.94% to -0.20%. **The custom/no-other-fields control is unstable**:
original means are 8.03 / 40.42 / 7.78 ns and changed means are
8.20 / 51.69 / 8.10 ns. Round 2 is +27.87%, while the other rounds are
+2.02% / +4.09%. This remains unexplained; neither the launch nor any
measurement is discarded or diagnosed as harmless noise.

All three comparisons are consumed. They use original/changed,
changed/original, original/changed order without source tuning.
Reported changes are medians of paired percentages, not ratios of median times.
This is not an all-path or production-throughput claim.

## Validation commands and results

Each direct .NET invocation ran from the checkout after `. .\activate.ps1`.
Original and candidate owning suites each passed **2,593 tests, zero skipped**:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-before" --nologo -v quiet

dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" --nologo -v quiet
```

All eight existing exact-HTML validation-message tests individually pass both
versions. They cover expressions, explicit messages, HTML attributes and custom
tags; they were reused instead of adding duplicate tests. The external fixture
checks the additional real producer scenarios.

Whitespace passed without exceptions; `git diff --check` passed:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\DefaultHtmlGenerator.cs `
  --report "$RunRoot\formatting-final" -v quiet
```

Both standalone builds passed with zero warnings/errors:

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet

dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release --no-restore -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false --nologo -v quiet
```

Both direct preflights passed all 60 setups:

```powershell
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups
```

Both immutable snapshots passed all 60 Dry cases:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationMessageBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

Each measured launch completed 60 cases with at least eight measurements each:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationMessageBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

These are compatibility checks and actual A/B performance observations, not a
functional red/green defect claim. Existing JavaScript assets were reused;
native IIS assets and Node rebuilding were disabled. No repository dependency
manifest or NuGet configuration was changed.

## Reproducibility and limits

[The complete standalone project](harness/AutoPerf.Benchmarks.csproj) references
actual source projects through `AspNetCoreRoot`. Copy complete original/changed
outputs separately and run serially. Harness/runtime/dependency configurations
and dependency DLLs are byte-identical; only the ViewFeatures assembly differs.
Raw manifests preserve the dirty-source capture and distinguish it from the
final source commit.

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha, BenchmarkDotNet `0.13.0`,
server GC on a shared Windows/Xeon host. See [loads](assembly-loads.json),
[hashes](assembly-hashes.json), [test outcomes](correctness.json) and raw reports.
This is warmed generator-only timing with binding and HTML assertions outside
timing. Flat-key tree widths are measured; nested-key workloads, first-render
metadata/error-collection initialization, HTTP throughput, browser workflows,
native IIS/ANCM, other runtimes and composition with other branches remain
unverified. No machine settings were changed.
