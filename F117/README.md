# F117: maximum route constraint string/integer fast paths

**Compatible, workload-specific measured proposal.**
Draft: [jaslawinMs/aspnetcore#26](https://github.com/jaslawinMs/aspnetcore/pull/26).
Issue: [jaslawinMs/aspnetcore#25](https://github.com/jaslawinMs/aspnetcore/issues/25).
Source: `573ad997602a5c1a0cbbaa01b6b92fc06f68c070`.
Branch: `autoperf/F117-max-route-numeric-values`.
Independent upstream baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
No other AutoPerf change is carried on this branch.
Exact draft source/body/three-file scope and pinned evidence were remotely
verified. Browser opening was requested immediately after creation; rendering
was not verified. See [publication receipt](publication.json).

## Final results and retained non-wins

Three comparisons and one tune are consumed. **Only rounds 2-3** measure
the final `after-2` source; the numeric-only first prototype is retained
separately, not pooled. Final observations:

- All **12 direct Int32/Int64 cases** improve in both pairs, with paired-change
  medians **70.53-93.74% faster**. Eight eliminate **32-64 B/op**; four small
  cached-number cases already allocate zero in the original.
- All **six direct string cases** improve in both pairs, with medians
  **13.04-28.04% faster**, no allocation change.
- Full named-link rejection cases improve in both pairs, medians
  **6.70%/6.76%**. Accepted links are mixed/near-zero,
  **-0.58%/-1.37%** medians; their round-2 signs were +0.06%/+0.12%.
  **No stable accepted-link throughput gain** is claimed.
- All **13 fallback/literal/guard controls** remain. Eight have higher
  medians, up to **+12.21%**. No final case allocates more.
  Apparent non-target control gains are not claimed as target improvements.

| Representative case | Original ns/op, rounds 2 / 3 | Changed ns/op, rounds 2 / 3 | Median paired change | Original / changed B/op |
|---|---:|---:|---:|---:|
| Int32_Hit | 12.21 / 11.99 | 3.56 / 3.55 | -70.61% | 0 / 0 |
| Int32_Min | 36.64 / 35.76 | 3.56 / 3.55 | -90.19% | 48 / 0 |
| Int64_Large | 53.60 / 54.39 | 3.61 / 3.26 | -93.64% | 64 / 0 |
| String_Hit | 9.86 / 10.01 | 7.26 / 7.16 | -27.41% | 0 / 0 |
| String_Max | 27.05 / 22.56 | 21.32 / 21.46 | -13.04% | 0 / 0 |
| Link_Int32_Hit | 273.42 / 271.85 | 273.58 / 268.53 | -0.58% | 272 / 272 |
| Link_Int64_Miss | 148.28 / 144.01 | 135.30 / 137.16 | -6.76% | 224 / 224 |
| Enum_Named | 20.58 / 19.23 | 23.48 / 21.22 | +12.21% | 0 / 0 |
| Formattable | 12.62 / 13.45 | 13.88 / 14.22 | +7.83% | 0 / 0 |

**Decimal_Integral is an unstable, source-fallback control**, not a decimal
speedup claim. Its original round-3 mean/SD are **77.74/63.63 ns**, versus
original round-2 **32.53/1.56 ns** and changed means **32.19/32.31 ns**.
Both N=8 sample sets remain; the apparent -29.75% median is not hidden or
attributed to a measured cause.
See [decimal samples](decimal-control-samples.json).

[All final 35 cases](comparison.md), [exact paired values](comparison.json)
and [classification/non-wins](measurement-summary.json) retain every case.
[First prototype statistics](prototype-1), [exact prototype source](source-prototype.cs)
and [patch](prototype-source.patch) preserve its result: all six string cases
regressed **4.52-26.09%** despite large typed gains. The string-first guard
was the only tune. Raw [round 1](round-1-before), [round 2](round-2-before)
and [round 3](round-3-before) original exports and corresponding
[changed 1](round-1-after), [changed 2](round-2-after), [changed 3](round-3-after)
exports remain. No fourth comparison.

## Mechanism, real producers and boundaries

15 shipping additions at one seam:
first pass sealed strings directly to unchanged `CheckConstraintCore`,
then compare exact boxed `long` and `int` against `Max`.
Every other value keeps existing invariant `Convert.ToString` and
`NumberStyles.Integer` parsing. Existing locals, guards, literal helper,
signatures, defaults and documentation are unchanged.
Do not compare arbitrary numeric-looking types: scaled decimals, exponential
floating-point text, unsigned overflow, named enums and custom conversions
have materially different existing semantics.

The [standalone BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
uses actual public MaxRouteConstraint and RouteValueDictionary objects, not
an extracted parser/comparison. The setups cover 12 typed cases, six strings,
four actual DI-resolved named-link calls, and 13 fallback/literal/guard controls.
Link generation uses a parsed `/bounded/{id:max(42)}` named RouteEndpoint and
default policy activation; the whole returned path or rejected null is checked.
Exact CLR types, complete booleans/paths, unchanged input identities and
custom invariant-formattable dispatch are asserted independently outside
timing. The custom formattable records a scalar count, not retained invocation
history. No producer setup/extraction/parsing is timed in direct Match cases.
[All 35 original/final producer receipts](setup-correctness.json) agree.

[Microsoft's routing documentation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-10.0#route-constraints)
says incoming URL values are strings, constraints do not rewrite values and
constraints also participate in link generation. The string tune improves
the direct constraint boundary; these numbers are **not HTTP-hosted,
browser, WebAssembly or production request throughput**.
Full accepted-link results demonstrate why the 70-94% micro-path improvement
must not be extrapolated into a full-link gain.

Same-area IntRouteConstraint/LongRouteConstraint already recognize exact
boxed integer types. History and current default-source behavior were checked.
dotnet/aspnetcore#49622 shared this source with Components. The routing targets'
actual source include and both compiled consumers were validated; the
Components copy is **not separately timed**.
No cache, retained metadata, Hot Reload mechanism, new API, new IVT or
cross-assembly access is introduced.

## Requirement coverage and compatibility

Original/final Routing suites each pass **3,559**, zero skipped.
All **57 direct MaxRouteConstraint rows** pass individually, including
**54 new rows**. Original/final Components suites each pass **1,320**, with
the same eight pre-existing skipped rows; all **16 new shared-copy rows** pass.

| Requirement | Evidence |
|---|---|
| Exact typed inclusive/above, negative, extreme/mixed-width and input identity | `MaxRouteConstraint_PreservesIntegerBoundaries`, 19 rows |
| Text padding/sign/overflow, other integer widths, scaled decimal, float/double, enum/Boolean fallback | `MaxRouteConstraint_PreservesOtherValueConversions`, 23 rows |
| Invariant custom interface dispatch/exception propagation | `MaxRouteConstraint_PreservesInvariantConvertibleProvider`, `MaxRouteConstraint_PreservesInvariantFormattableProvider`, `MaxRouteConstraint_PreservesConversionException` |
| Missing/null, literal, ambient culture, guards | `MaxRouteConstraint_PreservesMissingAndNullValues` (2), `MaxRouteConstraint_PreservesLiteralMatching` (4), `MaxRouteConstraint_PreservesInvariantCulture` (2), `MaxRouteConstraint_PreservesArgumentGuards` |
| Actual Components-compiled copy and dictionary identity | `Microsoft.AspNetCore.Components.Routing.MaxRouteConstraintTests.MatchPreservesTypedAndStringValues`, 16 rows |
| Real named endpoint policy activation/full paths and input types | Four named-link setups in `setup-correctness.json`, complete `/bounded/42` or null |

[All original/final Max outcomes](all-max-constraint-test-outcomes.json),
[Routing receipts](correctness.json), [Components/skip receipts](components-correctness.json)
and [acceptance](acceptance.json)/[pre-edit plan and tune decision](acceptance-plan.md)
are retained. These are compatibility/performance evidence, **not functional
bug-fix red/green**.

The eight existing skipped Components rows are the two numeric culture binder
tests (dotnet/aspnetcore#30312), three optional-parameter/literal parser tests,
the `{=}`/`{.}` parser rows, and the per-segment constrained catch-all test.
Their explicit existing reasons and exact names remain in the Components
receipt; none is silently counted as passed or used as F117 verification.
The complete new constraint rows and real producer results provide the
managed boundary instead. No rendering/navigation behavior or new browser
feature is claimed.

The immutable executable/configuration closure differs **only in
Microsoft.AspNetCore.Routing.dll**, with exact benchmark DLL/PDB reuse.
Capture manifests keep their actual baseline HEAD/dirty state; separate
final-source hashes prove the committed code equals the measured tune.
See [provenance](provenance.json), [recursive hashes](assembly-hashes.json),
[actual loads](assembly-loads.json) and [shared-host metadata](hardware.json).

## Exact successful commands

Activate with `. .\activate.ps1` from the source checkout before each session.
Pinned SDK 12.0.100-alpha.1.26557.102, runtime/DI/logging
12.0.0-alpha.1.26562.105, BenchmarkDotNet 0.13.0, in-process server GC.
`$RunRoot` is this finding's run root; `$BuildVariant` is `before`, `after` or
`after-2`; `$Variant` is `before`/`after` for test-output paths.
`$Snapshot`/`$Artifacts` are the corresponding immutable
binary/raw-output folders.

```powershell
# All successful original/prototype/tuned builds: zero warnings/errors.
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\$BuildVariant" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
# Each successful variant passed all 35 actual producer/complete-output checks.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups
# Original focused Routing: 57 passed, including all 54 new rows.
dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~MaxRouteConstraintTests' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-focused-before" --verbosity quiet
# Original focused Components copy: all 16 new rows passed.
dotnet test src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~MaxRouteConstraintTests' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-components-focused-before" --verbosity quiet
# Original/prototype/final Routing: 3559 passed each, zero failed/skipped.
dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-$Variant" --verbosity quiet
# Original/prototype/final Components: 1320 passed/eight existing skipped each.
dotnet test src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-components-$Variant" --verbosity quiet
# All six measured launches passed: 35 cases/eight samples each.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*MaxRouteConstraintBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
# Both touched existing files and the new test file: passed, no file changes.
dotnet format whitespace --folder . `
  --include src\Http\Routing\src\Constraints\MaxRouteConstraint.cs `
  src\Http\Routing\test\UnitTests\Constraints\MaxRouteConstraintTests.cs `
  src\Components\Components\test\Routing\MaxRouteConstraintTests.cs `
  --verify-no-changes --verbosity quiet
# Passed.
git --no-pager diff --check
```

Final test outputs use `tests-after`/`tests-components-after`; prototype
receipts were archived before those paths were refreshed.
Initial harness/test compile preflights were corrected before first timing;
no failed compile is represented as a measured comparison.
No tracked SDK, NuGet, Node or package manifests were changed.
