# Reuse enumerated DFA complex-literal nodes

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [ ] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [ ] You've included unit or integration tests for your change, where applicable.
- [ ] You've included inline docs for your change, where applicable.
- [ ] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Reuse enumerated complex-literal nodes during DFA construction.

## Description

**F181: qualified warmed complete matcher-construction proposal.**
Only the complex-literal loop changes: enumerate the existing dictionary's
pairs, keep `literal = kvp.Key`, and reuse `kvp.Value`. Preserve comparer,
sibling/parameter/policy order, every branch and `routeValues.Clear()`.
No public API/default/convention, new cache, shipping dependency or assembly
boundary change. This is build-time work, not a hot request lookup.

### Measurements and non-wins

Source-built actual DI-created transient `DfaMatcherBuilder`, real endpoints,
actual complete `Build()` and returned matcher; not an extracted dictionary
loop. Parsing, service registration, cached reflection/expression bridges,
complete graph inspection and actual selection assertions are untimed.
No shipping IVT/UnsafeAccessor or timed mocks/growing history.

Shared Windows machine, SDK 12 alpha, BenchmarkDotNet 0.13.0,
in-process/server GC. All **three** allowed comparisons, **24 cases** per
launch, **144 outcomes**, N=8, unchanged candidate and original harness, in
A/B, B/A, A/B order. No discarded launch or fourth run.

| Repeatable target | Pair 1 / 2 / 3 | Median paired change | Median original to changed B/op |
|---|---:|---:|---:|
| OptionalMixed_128_4 | -4.38 / -2.75 / -3.09% | -3.09% | 672,379 to 672,353 |
| LongPrefix_128_4 | -2.38 / -3.67 / -10.43% | -3.67% | 801,408 to 801,383 |
| Unicode_128_4 | -9.26 / -11.72 / -2.49% | -9.26% | 670,332 to 670,305 |

Only **three of fifteen** successful-membership cases improve every pair.
Other affected paths are mixed collectively; `Match_32_1` and `Miss_128_8`
are slower every pair. Overall 11/24 medians are lower, 13 higher.
Five of six untouched control medians are higher, including Empty +13.99%,
LiteralOnly_256 +7.77% and NoSiblingLiterals_8 +1.26%; these are not discarded or
declared harmless noise.
Grouped_32_8 changes **-27.55 / -35.28 / +5.52%**, with large variance retained;
its apparent -27.55% median is **not a supported headline gain**.
Median allocation reductions are small (21-45 B/op on single-parent cases,
192 grouped); LongPrefix reports 4 more B/op in pair 1.

[Complete immutable report, all case means/allocations/variance, raw results,
benchmark project and exact provenance](https://github.com/jaslawinMs/aspnetcore/blob/e0e99058491d052315eff465f1c35ffaa09a31ee/F181/README.md).
Every actual complete ordered graph/state count and selection/value receipt
agrees across snapshots and all launches; the 24-fixture matrix asserts 16,372
real managed requests. Only Routing.dll differs among 77 recursive DLL/JSON
files; exact original harness DLL/PDB/runtime/deps are reused.

### Requirement coverage and successful validation

Original and changed **3,511/3,511 Routing tests, zero skipped**, including each
of six new rows. These are compatibility checks, not functional bug-fix
red/green evidence.

| Requirement | Evidence |
|---|---|
| Real sibling producer, case alias, ordered policies, later parameter after rejection, optional absence after a prior supplied value, original and selected nodes | `BuildDfaTree_ComplexLiteralSiblings_PreservePolicyOrderAndOptionalValues`, both rows pass original/changed |
| Actual DI-created complete matcher/default selector, accepted/optional/rejected/case-alias identity and exact route values/count/absence | `Build_ComplexLiteralSiblings_PreserveEndpointSelection`, all four rows pass original/changed |
| Complete measured configuration semantics | All 24 original/changed `Setup` fixtures and all 144 producer receipts pass |

From the source root after `. .\activate.ps1`, these exact commands passed:

```powershell
# Original: 3,511/3,511; changed: 3,511/3,511, each six new rows passed.
dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet
dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet

# Original/changed: zero warnings/errors.
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --no-restore -v quiet

# Both: all 24 actual complete graph/state/selection fixtures passed.
dotnet "$RunRoot\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\binaries\after\AutoPerf.Benchmarks.dll" --verify-setups

# Passed exact source/test whitespace, no formatting edits.
dotnet format whitespace --folder src\Http\Routing `
  --include 'C:\src\aspnetcore\src\Http\Routing\src\Matching\DfaMatcherBuilder.cs' `
    'C:\src\aspnetcore\src\Http\Routing\test\UnitTests\Matching\DfaMatcherBuilderTest.cs' `
  --verify-no-changes --verbosity quiet
git diff --cached --check

# All six launches passed 24 cases/N=8/allocation diagnostics.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*DfaLiteralBuildBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Two early original standalone closure preparations lacked explicit source
abstractions; errors were resolved and logs preserved **before any timing**.
No machine settings changed, no other users' processes controlled.
Full app startup, live refresh latency, hosted HTTP throughput, cold runtime,
concurrent builds, other runtimes/architectures and combined branches are
unverified. No JIT/causal explanation of regressions is claimed.

Fork-only draft for inspection, not an upstream submission.

Fixes #34
