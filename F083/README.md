# F083: avoid transient lowercase strings in rewrite-map lookup

[Draft proposal: jaslawinMs/aspnetcore#6](https://github.com/jaslawinMs/aspnetcore/pull/6).

Proposal: `acf0117ed66dd908bb547a2bb6143b23e3a801f8`, branch
`autoperf/F083-rewrite-map-lookup`.
Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

Preserve invariant-lowercase-then-ordinal lookup semantics. For keys of at most
256 UTF-16 characters, normalize into a bounded 256-character stack buffer and
use the real dictionary's span alternate lookup. Longer keys retain the
existing string-normalization lookup. The parser, original string indexer,
comparer, map overwrite behavior and null-on-miss result are unchanged.
Both affected types are internal; no exported framework API is added.

## Result, including regressions

Three serial interleaved comparisons completed: **before/after, after/before,
before/after**. No tuning change or fourth comparison was made. Each launch
has 27 cases, 3 warmups and 8 retained measured iterations per case.

| Case | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|
| UpperHit_8 | -15.98% | 120 | 80 |
| UpperHit_64 | -24.18% | 344 | 192 |
| UpperHit_256 | -28.00% | 1112 | 576 |
| MixedHit_256 | -24.37% | 1112 | 576 |
| UpperMiss_256 | -27.66% | 1112 | 576 |

Case-changing short ASCII cases save about **33-48% of heap allocation**.
The benchmark still includes the real pattern's allocations; it does not
isolate a standalone dictionary or BCL casing operation. The new stack buffer
uses up to 512 bytes and is not included in B/op.

**Nine cases have slower median paired times.** Already-lowercase 8-character
hits are +8.26% without allocation savings. Mixed-case 257-character hits are
+7.20%; uppercase 1024-character hits are +6.85%. Empty misses and other
long-key controls also regress. The unchanged long-key normalization algorithm
does not imply unchanged generated code or zero branch/frame overhead.
UpperMiss_1024 retains a first-round +19.34% slowdown even though its median
paired change is +0.87%. All rounds and outliers are retained.

[All 27 cases](comparison.md) include favorable and unfavorable results.
Every round folder contains complete JSON, CSV and Markdown exports, including
iteration measurements and uncertainty. Workload frequency is unknown; these
figures do not establish a universal win.

## Actual producer and measurement boundary

The [complete benchmark project](harness/AutoPerf.Benchmarks.csproj) directly
references production Rewrite. Public `AddIISUrlRewrite` parses real map/rule
XML with condition input `{map:{R:1}}`. The real initial regex matcher captures
each query; the real input parser constructs the map and rule-capture segments.
Setup extracts the actual map segment, binds its real `Evaluate` method through
a typed expression, and checks its expected string or null result.

The timed method invokes that cached binding. It includes the actual
rule-capture segment, pattern builder/string production, normalization and map
lookup. XML parsing, initial regex capture production, reflection and expression
compilation occur only in setup. No normalization, traversal or lookup
implementation is copied into the harness, and no friend assembly or
UnsafeAccessor is added.

ASCII lengths are 8, 64, 256, 257 and 1024, each with LowerHit, UpperHit,
MixedHit and UpperMiss. Seven additional scenarios cover empty misses, normal
sigma, final sigma, capital sigma, supplementary Deseret casing, accented
Latin casing and a canonically distinct decomposed miss. Maps contain 64
unrelated entries plus the relevant ASCII and Unicode entries.

Lookup preserves distinct sigma and final-sigma mappings and does not introduce
Unicode canonical normalization. Changing the comparer to OrdinalIgnoreCase
was not used as a substitute for preserving the existing contract.

This is the actual segment boundary with capture-produced keys, not HTTP or
whole-middleware throughput. Request parsing, regex matching per request, outer
pattern/action processing, native IIS, other runtimes/platforms, AOT and the
frequency of any workload remain unverified boundaries.

## Correctness and formatting

From the repository root, activate first with `. .\activate.ps1`.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --filter 'FullyQualifiedName~RewriteMapParserTests' `
  --logger 'console;verbosity=normal' --logger trx `
  --results-directory "$RunRoot\tests-before" -v:quiet
```

Original implementation: **20 passed**, with each theory row inspected.
The 19 new cases cover ASCII case/overwrite behavior, missing/empty keys,
distinct Unicode mappings, supplementary casing, canonical non-equivalence,
and lengths 1/255/256/257/1024. They use actual XML parsing and initial regex
captures, not injected map state.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" -v:quiet
```

Candidate: **496 passed, 0 failed, 0 skipped**, including all 20 map cases.
[Exact counters and focused outcomes](correctness.json). Compatibility is
intentionally green on both versions; the performance claim comes from
real before/after measurements, not a claimed functional red/green failure.
Both immutable DLL versions also passed all 27 Dry setup/result checks.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\src\Microsoft.AspNetCore.Rewrite.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\src\PatternSegments\RewriteMapSegment.cs `
    .\src\Middleware\Rewrite\src\IISUrlRewrite\IISRewriteMap.cs -v quiet
```

**Passed**, as did `git diff --check`.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\test\IISUrlRewrite\RewriteMapParserTests.cs -v quiet
```

**Exit 2**, solely CHARSET at (1,1), identically reproduced on the unchanged
baseline file archived with `.editorconfig`:
`dotnet format whitespace $BaselineArchive --folder --verify-no-changes --include $BaselineTestFile -v quiet`.
The original UTF-8 BOM was preserved. No new-line formatting diagnostics;
[exact comparison](formatting.json).

Managed validation uses `UseIisNativeAssets=false`; no native/IIS coverage is
claimed. The existing test project's nullable-disabled convention is retained.

## Reproduce and provenance

Use the complete harness with separate baseline and proposal checkouts.

```powershell
. .\activate.ps1
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release `
  -p:AspNetCoreRoot="$CheckoutRoot" -p:UseIisNativeAssets=false `
  -p:RestorePackagesPath=C:\.tools\.nuget\packages -v:quiet
```

Both harness builds **passed**, zero warnings/errors. Copy each complete
`$HarnessRoot\bin\Release\net12.0` output into an immutable snapshot. Verify the
runtime/dependency configurations match, then reuse before's benchmark DLL/PDB
with after's production DLL.

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" `
  --filter '*RewriteMapBenchmark*' --inProcess `
  --exporters json csv --artifacts "$RoundOutput" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

**All six launches passed**, with all 162 case results measured. Dry smoke uses
`--job Dry --warmupCount 0 --iterationCount 1` instead and is not timing evidence.

SDK `12.0.100-alpha.1.26557.102`, runtime
`12.0.0-alpha.1.26562.105` (`.NET 12.0.0 (12.0.26.56305)`),
BenchmarkDotNet 0.13.0, Release, RyuJIT, concurrent server GC,
InProcessEmitToolchain and memory diagnostics. See [runtime](environment.json),
[hardware](hardware.json), [execution](execution.json), [actual assembly loads](assembly-loads.json),
[source provenance](provenance.json), [both source-file hashes before](source-hashes-before.json)
and [after](source-hashes-after.json), and [before](before-manifest.json)/[after](after-manifest.json)
manifests. The production DLLs differ; the harness and runtime/dependency
configurations are byte-identical across versions. Snapshots precede the final
commit; both committed production source files match the measured after hashes.

Measurements ran serially on a shared Windows machine. Other machine activity
was not controlled. No production throughput or universal performance claim
is made, and raw binaries are not published.
