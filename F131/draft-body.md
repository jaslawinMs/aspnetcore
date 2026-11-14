# [AutoPerf F131] Index stable OWIN feature-map lookups

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Index stable OWIN lookups while preserving enumeration and copy order

## Description

Originating issue: jaslawinMs/aspnetcore#30.

Fork-only measured proposal for deduplicated AutoPerf finding **F131**.
It is independent of every other campaign branch and does not imply upstream
design approval or a stable production/network throughput gain.

Keep the original immutable 25-entry map for enumeration/counts and mutable
per-context copying. Add one private readonly-interface/ordinal dictionary
lookup index sharing the original `FeatureMap` objects; redirect only three
stable-map probes. All original branches/locals, deleted-key checks, custom/
readonly maps, context-specific body ownership and order/copy paths remain.
No public signature/default/convention, assembly-access or dependency change.

**Targeted measured results, not a universal optimization:** final ordinary
method get/try/set-read medians are **5.38-5.61% lower**, query 7.10%, headers
7.73%, status 9.44%, body 14.09%, Items 13.97%, unknown 16.97% and uncommon
case-variant Items 18.87%. All 29 allocation measurements remain identical.

| Actual default UseOwin pipeline | Pair 2 / 3 change | Paired median |
|---|---:|---:|
| NoRead | -4.70 / -0.46% | -2.58% |
| ReadCommon | -5.72 / -0.40% | -3.06% |
| ReadHeaders | -4.72 / +0.44% | -2.14% |
| PortsPresent | -4.88 / +0.65% | -2.12% |
| PortsMissing | -1.48 / -2.16% | -1.82% |

Those pipeline effects are small/mixed. Six of eight unchanged-path controls
have higher medians (**+0.07-4.07%**); Removed_Method is lower in both pairs and
Enumerate mixed. **AddRemove is not a headline gain**: original pair-3 mean/
SD is 184.16/126.72 ns versus pair-2 71.18/0.43 ns. Its apparent -69.41% pair-3/
-42.52% median is retained without explanation.

The original immutable map remains plus an additional application-lifetime
25-entry index. Cold construction/retained size, hosted HTTP, concurrency,
other runtimes/architectures and composition with other branches are unmeasured.

**Three comparisons consumed, one source-only tune.** The initial frozen
prototype regressed common method get/try/contains/set 6.73/16.33/23.64/21.10%;
its full source, tests and raw results are preserved separately. Final paired
summaries use dictionary rounds 2-3 only. Identical original timing harness/PDB/
runtime/configuration; recursively only the Owin DLL differs in both closures.
All six launches complete all 29 cases/eight retained measurements. Reflection/
assertions run outside timing; no injected producer callbacks or growing Moq
invocation history.

[Full immutable evidence, all non-wins, exact commands and standalone timing/storage projects](https://github.com/jaslawinMs/aspnetcore/blob/622224aad173834095fb664026a97d09f52399a8/F131/README.md)
includes all **174** original/prototype/final raw case reports, all individual
TRX rows, complete actual producer receipts, exact owning assembly loads/MVIDs/
hashes, capture manifests and final source provenance. Baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. Related history:
dotnet/aspnetcore#58917.

### Requirement coverage

Original/frozen/final Owin suites pass **31/31, zero skipped**; all 12 added rows
pass individually. These establish compatibility, not a functional bug-fix
red/green claim.

| Requirement | Evidence |
|---|---|
| Mapped values/setters, ordinal key equality, Items/missing-feature fallback and Add errors | `OwinEnvironmentPreservesMappedAndItemsLookupEquality`, both rows |
| Removal/fallback/count and next-context isolation | `OwinEnvironmentPreservesRemovalFallbackAndNextRequest`, both rows |
| Original copy/enumeration/Keys order, shared descriptors, customization and owned body | `OwinEnvironmentPreservesCopyOrderCustomizationAndContextBody` |
| Readonly-map replacement and Items/removal | `OwinEnvironmentPreservesReadOnlyMapReplacement` |
| All six null-key operation error/parameter contracts | `OwinEnvironmentPreservesNullKeyErrors`, all six rows |
| Existing clear/new-context behavior | `OwinEnvironmentClearBehavesCorrectlyAndDoesNotImpactNextOwinEnvironment` |
| Actual producer/default UseOwin/operation outcomes | All 29 original/frozen/final complete setup receipts |
| Private field/ordinal comparer/exact 25 map references/no alias/order/body | Separate untimed exact-final-Owin-DLL storage checks |

Every direct .NET session first activated `. .\activate.ps1` from the checkout.
These exact commands **passed**:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\before" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\after-2" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
# Both builds: zero warnings/errors.

dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\after-2\AutoPerf.Benchmarks.dll" --verify-setups
# All 29 complete real producer/default-pipeline receipts pass per source stage.

dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-storage
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-storage
dotnet build "$RunRoot\storage-checks\AutoPerf.StorageChecks.csproj" `
  -c Release -o "$RunRoot\storage-build\after-2" -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false --verbosity quiet
dotnet "$RunRoot\storage-build\after-2\AutoPerf.StorageChecks.dll"
# Original/frozen storage checks pass; separate final storage build/check passes.

dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --filter 'FullyQualifiedName~OwinEnvironmentPreserves' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-focused-before" --verbosity quiet
# Original focused command: all 12 rows pass.

dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet
# Original/frozen/final full suites: each 31 passed/zero skipped.
# Frozen's complete passing TRX was archived before the final output overwrite.

dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Http\Owin\src\OwinEnvironment.cs `
    .\src\Http\Owin\test\OwinEnvironmentTests.cs `
  --report "$RunRoot\formatting-final" -v quiet
git diff --cached --check
# Both pass without source-format exceptions or unrelated changes.

dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*OwinFeatureMapBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# All six launches: all 29 cases/eight measured iterations complete.
```

SDK 12 alpha, BenchmarkDotNet 0.13.0, in-process/server GC, serial measurements
on this shared Windows host. No machine settings or dependency manifests changed.

Fixes #30
