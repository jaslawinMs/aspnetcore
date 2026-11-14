# F181: reuse enumerated DFA complex-literal nodes

**Qualified warmed matcher-construction proposal, not a universal speedup.**
Only three of fifteen successful-membership cases improve in every allowed
comparison: optional fragments, long prefixes and Unicode literals. All three
comparisons are consumed; no tuning, discarded launch or fourth run.

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Measured source and compatibility tests](https://github.com/jaslawinMs/aspnetcore/commit/609489170dffb859f50172977fcf20bb49cf6c51):
`609489170dffb859f50172977fcf20bb49cf6c51`.
This is an informational build-time finding, not a demonstrated hot request
bottleneck.

## Complete measured trade-offs

Twenty-four cases, six successful serialized launches, eight retained measured
iterations per case: **144 measured outcomes**, with matching actual producer
setup receipts. Negative changes mean lower time. Medians are medians of paired
percentage changes, not ratios of median means.

| Repeatable target | Pair 1 / 2 / 3 time change | Median paired change | Median reported B/op, original to changed |
|---|---:|---:|---:|
| OptionalMixed_128_4 | -4.38 / -2.75 / -3.09% | -3.09% | 672,379 to 672,353 |
| LongPrefix_128_4 | -2.38 / -3.67 / -10.43% | -3.67% | 801,408 to 801,383 |
| Unicode_128_4 | -9.26 / -11.72 / -2.49% | -9.26% | 670,332 to 670,305 |

These are actual complete builds with 128 literal siblings and four complex
continuations, not isolated dictionary probes. Optional values alternate
present/absent; Unicode prefixes are Greek; the long-prefix case adds 128 ASCII
characters. These observations do not establish a general ASCII-routing gain.

The other fifteen cases reaching the changed loop are mixed collectively:
thirteen change sign across pairs, while `Match_32_1` and `Miss_128_8` are slower
in all three. Eight of eighteen changed-loop cases have higher paired medians.
Overall, **11 of 24 medians are lower and 13 higher**.
Five of six untouched controls have higher medians: Empty +13.99%,
LiteralOnly_1 +2.70%, LiteralOnly_32 +2.84%, LiteralOnly_256 +7.77%, and
NoSiblingLiterals_8 +1.26%. The simple-constraint control is mixed, median -2.37%.
These are retained without a harmless-noise or compiler/JIT explanation.

`Grouped_32_8` has an apparent -27.55% median but changes
**-27.55 / -35.28 / +5.52%**. Its original means/SD are
1,417,300/1,129,393 ns, 1,654,563/868,973 ns and 1,443,348/462,522 ns;
changed means/SD are 1,026,845/117,229 ns, 1,070,770/154,319 ns and
1,523,041/551,227 ns. All retain N=8. The first original range is
896,500-4,180,094 ns. This unstable result is **not a supported headline gain**;
all outliers and raw statistics remain.

Reported median allocations are slightly lower in all eighteen affected cases:
21-45 B/op for single-parent cases and 192 B/op for the eight-parent grouped
case. These are small reductions relative to complete builder allocations.
Individual reports vary, including **4 more B/op** for LongPrefix in pair 1.
No blanket per-launch allocation or production-throughput claim is made.

[All 24 paired means and allocations](comparison.md),
[machine-readable paired changes](comparison.json),
[all raw case outcomes and statistics](raw-case-outcomes.json),
[complete variance](variance.json), and the original JSON/CSV/Markdown exporters
for every launch accompany this report. Generated log whitespace is preserved
with an artifact-only exemption; source/test formatting is not exempted.

## What changes

Only two existing production statements change, with one explanatory local
added: enumerate `parent.Literals` pairs, retain `literal = kvp.Key`, and use
`kvp.Value` instead of looking up `parent.Literals[literal]`.
The comparer, matching, policy/parameter/sibling order, branches and
`routeValues.Clear()` stay exactly as written.
All unrelated source is preserved. The existing test class gains six
compatibility rows; there is no public API/default/convention, new cache,
shipping dependency or assembly-boundary change.

Actual `DfaNode` dictionaries are produced by real endpoint registration and
`DfaMatcherBuilder.BuildDfaTree`. The complete timed operation obtains a fresh
transient builder from real routing services, adds preconstructed endpoints,
calls actual `Build()`, and returns the real completed `DfaMatcher`.
Tree production, policies, candidate/state construction and jump tables are
included. Endpoint parsing, DI registration, cached reflection/expression bridge
compilation and all assertions are outside timing. There is no copied loop,
shipping friend assembly, UnsafeAccessor, timed Moq, growing invocation history
or growing retained result collection.

Every fixture builds two actual complete matchers, verifies the entire ordered
DFA graph and state count, and asserts selected endpoint identity and exact
route values. The complete matrix asserts **16,372 requests**: existing literal
branches, case-insensitive aliases, all complex continuations, syntax/policy
rejection, optional absence, parameter fallback and unregistered paths.
All 24 setup receipts agree between original/changed snapshots and every
measured launch; see [actual producer receipts](setup-correctness.json).

## Requirement coverage

Original and changed containing Routing suites both pass **3,511/3,511, zero
skipped**. Every added theory row is individually present and passed in both
actual TRX reports. These are optimization compatibility checks, not functional
bug-fix red/green evidence.

| Requirement | Evidence |
|---|---|
| Actual sibling producer, case alias, preserved original nodes, accepted continuations and rejection/nonmatch pruning | `BuildDfaTree_ComplexLiteralSiblings_PreservePolicyOrderAndOptionalValues`, both rows |
| Real parsed policy values and order, later extension callback after number rejection, absent optional value after a prior sibling supplied it | `BuildDfaTree_ComplexLiteralSiblings_PreservePolicyOrderAndOptionalValues`, both rows |
| Actual DI-created complete matcher and default selector: accepted/optional/rejected paths and case-insensitive literal endpoint identity; exact values/count/absence | `Build_ComplexLiteralSiblings_PreserveEndpointSelection`, all four rows |
| Complete benchmark producer/state graph and actual runtime endpoint/value results for all 24 configurations | `Setup`/`VerifyMatcher`; every receipt in `setup-correctness.json` |

[Focused outcomes](correctness.json), [all 7,022 containing outcomes](all-test-outcomes.json),
and the before/after complete TRX reports are retained.

## Exact successful commands

Every direct .NET command ran from the source checkout after `. .\activate.ps1`.
`RunRoot` is the F181 artifact directory. Both final source-built harness builds
passed with zero warnings/errors; the original final build used the same
command with log `build-before-final.log`, candidate with `build-after.log`:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --no-restore -v quiet
```

All 24 real complete builder/graph/selection fixtures passed on both immutable
snapshots:

```powershell
dotnet "$RunRoot\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\binaries\after\AutoPerf.Benchmarks.dll" --verify-setups
```

Both commands below passed 3,511/3,511, including every one of six added rows:

```powershell
dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet

dotnet test src\Http\Routing\test\UnitTests\Microsoft.AspNetCore.Routing.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet
```

Changed-file whitespace checks and staged `git diff --cached --check` passed:

```powershell
dotnet format whitespace --folder src\Http\Routing `
  --include 'C:\src\aspnetcore\src\Http\Routing\src\Matching\DfaMatcherBuilder.cs' `
    'C:\src\aspnetcore\src\Http\Routing\test\UnitTests\Matching\DfaMatcherBuilderTest.cs' `
  --verify-no-changes --verbosity quiet

dotnet format whitespace "$RunRoot\harness\AutoPerf.Benchmarks.csproj" `
  --no-restore --include "$RunRoot\harness\Program.cs" `
    "$RunRoot\harness\DfaLiteralBuildBenchmark.cs" `
  --verify-no-changes --verbosity quiet
git diff --cached --check
```

All six launches passed all 24 measured cases/N=8 with allocation diagnostics,
in original/changed, changed/original, original/changed order:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*DfaLiteralBuildBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Provenance and limitations

[Standalone C# 13/BenchmarkDotNet 0.13.0 project](harness/AutoPerf.Benchmarks.csproj)
references real source projects through `AspNetCoreRoot`, pins the runtime and
disables transitive shared-framework fallback. Two early original dependency
preparations lacked explicit source abstractions; their original failure logs
are retained. Both were resolved before capture/timing. No timed launch failed
or was discarded.

The exact original harness DLL/PDB/runtime/dependency configuration is reused.
Of **77 recursively checked DLL/JSON files, only Routing.dll differs**.
Every measured launch records its actual owner path/MVID.
See [closure](closure-preconditions.json), [hashes](assembly-hashes.json),
[loads](assembly-loads.json), [provenance](provenance.json) and
[pre-implementation criteria](pre-implementation-acceptance.md).
Captured dirty-source manifests are kept distinct from the final source commit.
No binary/PDB/build output is published.

SDK `12.0.100-alpha.1.26557.102`, runtime `12.0.0-alpha.1.26562.105`,
in-process/server GC on a **shared Windows machine**. Builds and measurements
were serialized, with two build workers; no machine settings changed.
Managed builds disable IIS native assets and Node rebuilding.

This establishes warmed managed complete matcher construction and untimed
managed selection compatibility. Full application startup, live refresh
latency, hosted HTTP throughput, cold runtime, concurrent builds, other
runtimes/architectures and composition with other branches remain unverified.
No causal explanation of untouched-control or grouped-case variance is claimed.
