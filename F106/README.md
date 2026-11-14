# F106: per-call enum-name reverse lookup

**Measured, fork-only proposal with substantial workload trade-offs.**
Source: `aed53fce5281e7f3d9a54c2e0ba6a45a42c234f5`.

Independent upstream baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
No F021 parsing change, F130 membership experiment or other optimization is
carried on this branch.

## Final measurements: gains and regressions

All **13 indexed workloads** improve in both final pairs: median paired time
is **10.91-83.65% lower**, with **608-12,257 fewer B/op**.
The biggest wins are 64 selected members of a 64-member enum.
These are not representative of the more common one/two-value inputs.

**27 of 28 non-indexed controls have higher median time**, and 21 regress
in both pairs. Control medians range from -2.58% to +10.36%.
`Small_Typed_1` is +15.87% / +4.84%, median **+10.36%**, approximately
30 ns slower when averaging the pair deltas.
The two-valid/62-invalid large input is **+9.11%**, approximately 2.9 us slower.
The one-valid/63-invalid input is +5.26%.
These are retained costs, not dismissed as harmless noise.
This is not an all-path or generally throughput-positive claim.

| Case | Original ns/op by pair | Changed ns/op by pair | Median paired time change | Original B/op | Changed B/op |
|---|---:|---:|---:|---:|---:|
| Large_Names_64 | 102835.43 / 103064.61 | 46081.98 / 43937.30 | -56.28% | 40693 / 40693 | 34418 / 34418 |
| Large_Numbers_64 | 96395.00 / 96670.51 | 40289.59 / 39798.41 | -58.52% | 40693 / 40693 | 34418 / 34418 |
| Large_Typed_64 | 67060.94 / 66813.15 | 11446.94 / 10440.26 | -83.65% | 25852 / 25852 | 19577 / 19576 |
| Small_Names_8 | 5746.89 / 5599.41 | 5116.93 / 4991.14 | -10.91% | 4952 / 4952 | 4344 / 4344 |
| Small_Typed_64 | 15547.77 / 15720.10 | 6209.57 / 5986.85 | -60.99% | 19233 / 19233 | 6976 / 6976 |
| Large_TwoValid_64 | 32066.98 / 32319.73 | 35131.09 / 35117.40 | +9.11% | 15826 / 15826 | 15826 / 15826 |
| Small_Typed_1 | 286.12 / 289.53 | 331.53 / 303.55 | +10.36% | 504 / 504 | 504 / 504 |
| Small_Empty_0 | 39.28 / 39.24 | 41.48 / 39.16 | +2.69% | 64 / 64 | 64 / 64 |

The sparse invalid allocation increase from prototype 1 is removed in the
measured final ModelState scenarios, but their CPU regressions remain.
Five controls have small per-launch allocation differences, all retained:
large iterator +10/+8 B, large invalid +1/+1 B, large undefined +1/0 B,
small mixed +1/+1 B, small lowercase 0/-2 B.
No explanation or uniform unchanged-allocation claim is made for those.

[All 41 cases](comparison.md), [per-pair machine-readable values](comparison.json),
[classified summary](measurement-summary.json), and the
[rejected first prototype](prototype-1/README.md) are included.
Final medians use only rounds 2-3; all six raw launches remain.

## Mechanism and boundary

The original generator scans all `EnumNamesAndValues` for every converted enum
value. The candidate builds an ordinal `ILookup` once per call, lazily, only
when the input exposes a collection count greater than one and at least the
enum's name count. Known-invalid ModelState stays on the original scan.
The eligibility decision is also lazy, so empty and entirely unparsed inputs
do not inspect collection size or ModelState for this optimization.

All aliases retain their metadata enumeration order. Original string addition,
case-sensitive enum parsing, numeric conversion, integer addition and the
small/uncounted-input scan remain. No process-wide cache or exported API is
added; no new Hot Reload handler is required for per-call state.
The eligible path makes an additional bounded ModelState lookup to avoid
allocating an index for known-invalid input. This is not a claim about large
or nested ModelState trees.

## Actual producers and correctness

The [standalone project](harness/AutoPerf.Benchmarks.csproj) uses actual MVC
DataAnnotations metadata, `FormValueProvider`, `CollectionModelBinder` and
`EnumTypeModelBinder`, or actual typed model lists/iterator producers.
The complete binding state and bound counts are asserted; ModelState values
and errors are not manually injected in the benchmark.

41 cases cover eight/64-member enums, 1/2/8/64 input values, aliases, flags,
undefined numbers, invalid strings, lowercase input, one/two valid values amid
invalid input, uncounted iterators, a non-enum control and an empty collection.
Small enum/64-value cases intentionally repeat values; large enum/64-value
cases select distinct members. Undefined values are rejected by binding but
still parse during rendering, preserving the existing boundary.

Each setup checks the complete current-value set and complete encoded
`GenerateSelect` HTML, including selected/unselected options and invalid CSS.
Separate preflight receipts also prove identical current-value insertion order
and exact HTML for every original/final case. All assertions and binding are
outside warmed public `GetCurrentValues` timing. Client validation is disabled.
See [all direct receipts](setup-correctness.json) and
[all individual unit-test outcomes](correctness.json).

Original and final owning suites pass **2596/2596**, zero skipped.
All **182** `DefaultHtmlGeneratorTest` outcomes are individually retained,
including the three new rows of
`GetCurrentValues_CollectionPreservesEnumAliasesAndInvalidValues`:
`Aliases`, `UndefinedNumeric`, `Invalid`.
These are compatibility checks, not a functional red/green bug-fix claim.
The test's direct ModelState setup establishes downstream semantics; the
benchmark separately establishes actual producer reachability.

## Protocol and tuning

Round 1 preserves the original count-gated prototype: large cases improved
56-84%, but sparse invalid submissions increased heap approximately 42-45%.
It is not mixed into the final implementation's statistics.
One tuning change made eligibility lazy and retained the original scan for
known-invalid ModelState without reading/allocating its error collection.

All three allowed comparisons are consumed by rounds 1-3.
The final implementation is measured only in rounds 2-3, changed/original and
original/changed order. Round 1 and its raw exports remain separate.
There is no fourth comparison and no discarded measurement.
Only ViewFeatures differs among 69 executable/configuration files in each
snapshot; the benchmark DLL is reused byte-for-byte.

## Exact commands and outcomes

From the source checkout, activate before invoking `dotnet`:

```powershell
. .\activate.ps1

# Original/final: 2596 passed each; zero skipped; all 182 focused rows passed.
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-before" -v:quiet
# Final: 2596 passed; zero skipped; all 182 focused rows passed.
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-after" -v:quiet

# Original/final builds passed: zero warnings/errors.
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -v:quiet
# Final build passed: zero warnings/errors.
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release --no-restore -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -v:quiet

# Original/final: all 41 actual producer/current-value/HTML checks passed.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups

# Original/prototype/final: all 41 Dry cases passed each.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*EnumNameBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1

# All six measured launches: 41 cases, N>=8, exit 0.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*EnumNameBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove

# Passed with no baseline exceptions; git diff --check also passed.
dotnet format whitespace .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  --no-restore --verify-no-changes `
  --include src\Mvc\Mvc.ViewFeatures\src\DefaultHtmlGenerator.cs `
    src\Mvc\Mvc.ViewFeatures\test\DefaultHtmlGeneratorTest.cs `
  --report "$RunRoot\formatting-final"
```

Set `HarnessRoot` to this directory's `harness`, `BuildOutput` to its
`bin\Release\net12.0`, and choose separate artifact directories for each launch.
Freeze complete Release outputs for original/changed runs; do not change source
or dependencies between captures and their corresponding measurements.
Builds and runs were serial on a shared Windows host, with no machine settings
changed. Native IIS/ANCM and Node rebuilding were disabled; existing generated
JavaScript assets were reused. Repository dependency manifests were untouched.

SDK `12.0.100-alpha.1.26557.102`, runtime
`12.0.0-alpha.1.26562.105`, BenchmarkDotNet 0.13.0, server GC.
Cold metadata/delegate initialization, nested/large ModelState, sparse invalid
model fallback without an invalid ModelState entry, HTTP throughput, browser
workflows, native IIS/ANCM, other runtimes and composition remain unverified.
Initial fixture HTML line-ending and test compilation mistakes were corrected
before their successful preflights/tests; no failed steady-state run is hidden.
