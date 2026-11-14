# F108: cookie ToArray already reuses the array; enumerable replacement is no-gain

**No performance PR.** All fourteen affected cases are slower in every one of
three paired comparisons. Their median paired mean changes are **+8.11% to
+108.32%** (positive means slower), with **64 additional B/op**, except one
large append observation reporting 65 additional B/op. Shipping source and the
original owning DLL were restored byte-for-byte. The independent
[`autoperf/F108-cookie-join-enumerable` branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F108-cookie-join-enumerable)
retains only thirteen preservation-test rows at
[`2a9a4700b83a3e368548bc6e2390d01af83b160f`](https://github.com/jaslawinMs/aspnetcore/commit/2a9a4700b83a3e368548bc6e2390d01af83b160f).

## The scan premise is not true at this seam

F108 suggested that `HttpRequestHeaders.MergeCookies` materializes an extra
array via `StringValues.ToArray` and that an enumerable join might avoid it.
The actual branch requires `HasCookie && _headers._Cookie.Count > 1`.
`StringValues` stores multiple values in an array; its `ToArray` returns that
existing instance.

The repository-pinned dependency is `dotnet/dotnet` at
`dfd6ac738610ea05f42e704be82b386e71052e12`. The
[pinned StringValues source](https://github.com/dotnet/dotnet/blob/dfd6ac738610ea05f42e704be82b386e71052e12/src/runtime/src/libraries/Microsoft.Extensions.Primitives/src/StringValues.cs)
(Git blob `be0c20acec5441f716649bdd5a5c7090d027876d`) explicitly documents
returning an internally stored array and implements that behavior. All fourteen
multi-value setups also establish reference identity through the **loaded
runtime**, including arrays produced by Kestrel's actual generated `Append`
method. The measured original therefore does not include the supposed array
copy.

The temporary [one-line experiment](experiment.patch) replaces the array join
with an explicit `IEnumerable<string?>` join. It preserves the guards, separator
and header assignment; it does not remove any original array allocation at this
seam. The experiment is retained in [source-experiment.cs](source-experiment.cs),
but **is not in the tests-only source commit**.

## Real owner and producer boundaries

Baseline is fresh upstream main
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. Introducing
dotnet/aspnetcore#41591 and its original cookie-concatenation contract were
inspected. Current `Http2Stream.TryParseRequest` and
`Http3Stream.TryParseRequest` invoke `MergeCookies` after pseudo-header handling.
The current actual HTTP/2 and HTTP/3 `HEADERS_CookiesMergedIntoOne` tests passed
before, with, and after the experiment. They feed real framed in-memory
connections through header decoding/stream processing and assert the complete
application-visible `"a=0; b=1; c=2"` header. This is protocol producer evidence,
not a callback injected directly into a consumer.

The [standalone harness](harness/AutoPerf.Benchmarks.csproj) loads the actual
source-built Kestrel assembly. Identical expression-compiled typed delegates
call its real constructor, generated `Append`, `OnHeadersComplete`, and
`MergeCookies`; there is no per-operation reflection, object-array invocation,
new IVT or UnsafeAccessor. The loaded owner MVID is checked against its PE
module. All **69 recursively enumerated DLL/JSON files** in the frozen
executable/configuration closure agree between variants except the owning
`Microsoft.AspNetCore.Server.Kestrel.Core.dll`. Harness DLL/PDB/runtime/deps are
reused unchanged.

`Append*` measures actual reusable header clear/byte append/complete/merge.
`Merge*` separately measures immutable prebuilt `StringValues` assignment plus
actual merge; the setter cost is included identically and these are **not pure
MergeCookies timings**. Original multi-values are reset every operation, so
repeatedly measuring an already-merged header cannot turn the target into its
guard. Four unchanged no-cookie/empty/single-cookie/Accept controls are retained.
Fixtures use different ordered cookie names and deterministic ASCII values;
`NxM` means N values with M payload characters, plus their cookie-name prefix.

Every measured setup independently checks complete ordered output, value count,
retained input values and runtime array identity, then emits a complete producer
receipt. There are **108 measured outcomes, 108 matching producer receipts,
54 paired rows and 18 complete three-pair summaries**. The real in-memory
protocol tests cover their three-cookie scenario, not all microbenchmark rows.

## All three comparisons

Same implementation throughout; no tuning. Launch order is A/B, B/A, A/B.
Numbers are paired mean percentage changes; the median is taken across those
three percentages, not pooled samples or a significance claim. Maximum CV is
the largest within-launch standard-deviation/mean percentage for that row.
All cases retain at least eight measured observations; outliers are not removed.

| Case | Pair 1 % | Pair 2 % | Pair 3 % | Median % | Extra B/op by pair | Max CV % |
|---|---:|---:|---:|---:|---|---:|
| AcceptControl | 0.48 | 0.74 | -0.39 | 0.48 | 0 / 0 / 0 | 2.17 |
| Append2x8 | 24.96 | 22.37 | 21.30 | 22.37 | 64 / 64 / 64 | 6.59 |
| Append3x128 | 12.97 | 16.69 | 11.40 | 12.97 | 64 / 64 / 64 | 10.62 |
| Append8x2048 | 13.01 | 34.00 | 23.89 | 23.89 | 64 / 64 / 65 | 13.30 |
| Append8x8 | 8.11 | 8.13 | 6.93 | 8.11 | 64 / 64 / 64 | 6.13 |
| EmptyControl | -2.79 | 0.94 | -4.24 | -2.79 | 0 / 0 / 0 | 1.22 |
| Merge2x4096 | 54.60 | 34.92 | 24.71 | 34.92 | 64 / 64 / 64 | 23.50 |
| Merge2x8 | 66.56 | 71.45 | 73.04 | 71.45 | 64 / 64 / 64 | 6.96 |
| Merge32x8 | 53.56 | 52.96 | 49.37 | 52.96 | 64 / 64 / 64 | 4.22 |
| Merge3x128 | 55.34 | 41.45 | 36.94 | 41.45 | 64 / 64 / 64 | 13.63 |
| Merge3x8 | 61.91 | 59.99 | 51.96 | 59.99 | 64 / 64 / 64 | 6.51 |
| Merge8x128 | 44.24 | 41.93 | 37.39 | 41.93 | 64 / 64 / 64 | 8.17 |
| Merge8x2048 | 108.32 | 81.63 | 118.84 | 108.32 | 64 / 64 / 64 | 12.38 |
| Merge8x8 | 51.75 | 43.91 | 31.96 | 43.91 | 64 / 64 / 64 | 13.48 |
| MergeEmpty | 81.90 | 79.13 | 76.10 | 79.13 | 64 / 64 / 64 | 3.80 |
| MergeNulls | 71.84 | 75.91 | 82.50 | 75.91 | 64 / 64 / 64 | 7.25 |
| NoCookieControl | -2.70 | 5.32 | -6.57 | -2.70 | 0 / 0 / 0 | 1.15 |
| SingleControl | 3.14 | -0.15 | -2.67 | -0.15 | 0 / 0 / 0 | 1.29 |

All fourteen affected time directions are higher in all three pairs.
The four unchanged controls have mixed signs and unchanged zero reported heap.
`Merge2x4096` has appreciable variance (maximum CV 23.50%); it is not omitted.
The 65-byte large append observation is also retained rather than normalized
to the otherwise 64-byte allocation delta.

[comparison.md](comparison.md) contains all absolute before/after ns/op and
median B/op; [comparison.json](comparison.json), [all-paired-outcomes.json](all-paired-outcomes.json)
and [all-paired-summary.json](all-paired-summary.json) retain every pair's
absolute allocations and percentages. [raw-case-outcomes.json](raw-case-outcomes.json),
[setup-correctness.json](setup-correctness.json), [recursive-closure.json](recursive-closure.json)
and all six `round-*` directories retain the observations, complete output
receipts, provenance and untrimmed exports.

## Requirement coverage

Original, experiment and restored each pass **924 header tests** (all thirteen
new rows inspected) and **two actual framed protocol tests**: **2,778 passed
test outcomes**, no failed or skipped rows. This characterizes healthy existing
behavior; it is not a red/green bug-fix claim.

| Requirement | Evidence |
|---|---|
| Ordered append-produced cookies, empty segments, duplicates, quoted values, idempotence and retained original values | `MergeCookies_AppendedValues_PreservesOrderAndSeparators`, five individually passed rows per variant |
| Nullable programmatic entries and unchanged caller array | `MergeCookies_ProgrammaticValues_PreservesNullEntries`, three individually passed rows per variant |
| Empty/single cookie presence, value count and retained backing values | `MergeCookies_AtMostOneValue_PreservesHeaderAndBackingValue`, three individually passed rows per variant |
| No cookie leaves other headers intact | `MergeCookies_NoCookie_PreservesOtherHeaders` |
| Reused headers do not retain the previous request's cookies | `MergeCookies_ReusedHeaders_DoesNotRetainPreviousCookies` |
| Actual HTTP/2 and HTTP/3 producer and application-visible output | `Http2ConnectionTests.HEADERS_CookiesMergedIntoOne` and `Http3ConnectionTests.HEADERS_CookiesMergedIntoOne`, both passed for original, experiment and restored |
| Scan's supposed array copy and exact component output | All fourteen multi-value loaded-runtime setup receipts establish identical `ToArray` references; all eighteen measured case receipts match in all six launches |
| No non-improving shipping change | Original/restored source and owner DLL hashes equal; source commit contains only the existing test file |

[all-test-outcomes.json](all-test-outcomes.json) and six `tests-*`/`protocol-*`
TRX files preserve the exact row names and results. Initial missing test assets
and test-authoring compiler errors occurred **before any test assertion**;
their preparation logs are retained and are not counted as test outcomes.
Missing assets were restored through the failed targeted commands. New tests
follow the existing nullable-disabled test-file and explicit-header-interface
conventions. Scoped `dotnet format whitespace --verify-no-changes` and
`git diff --check` passed. No untouched existing lines were reformatted.

## Reproduction and environment

After activating the checkout's local SDK from its root with `. .\activate.ps1`,
these commands passed in each of original, experiment and restored states:

```powershell
dotnet test .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~HttpRequestHeadersTests' --logger 'trx;LogFileName=results.trx' --results-directory '<variant-unit-results>'
dotnet test .\src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~HEADERS_CookiesMergedIntoOne' --logger 'trx;LogFileName=results.trx' --results-directory '<variant-protocol-results>'
```

**Results:** each unit command passed 924/924; each protocol command passed 2/2.
First successful executions restored missing assets by omitting `--no-restore`.
Scoped format command passed:

```powershell
dotnet format whitespace .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj --no-restore --verify-no-changes --include 'C:\src\aspnetcore\src\Servers\Kestrel\Core\test\HttpRequestHeadersTests.cs' --verbosity quiet
```

Build the standalone project from this evidence directory, first with original
source and then with `git apply .\experiment.patch` from the checkout root
(use the patch's absolute path when outside this directory):

```powershell
dotnet build .\harness\AutoPerf.Benchmarks.csproj -c Release -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet .\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll --verify-setups
dotnet .\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll --filter '*CookieMergeBenchmark*' --inProcess --exporters json csv --artifacts '<results>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

**Results:** both builds passed with zero warnings/errors; both frozen setup
commands passed all 18 cases; all six measured launches completed 18 cases.
Copy each complete binary output into a separate immutable directory before
rebuilding, reuse the original harness DLL/PDB/runtime/deps, require identical
recursive dependency hashes except the owner, and alternate A/B, B/A, A/B.
Do not overwrite the campaign's already completed comparisons or run a fourth
comparison. To independently regenerate summaries from these published logs:

```powershell
.\summarize.ps1 -RunRoot .
```

SDK `12.0.100-alpha.1.26557.102`, pinned .NET runtime
`12.0.0-alpha.1.26562.105`, C# 13, BenchmarkDotNet 0.13.0,
in-process/server GC, Release. [environment.json](environment.json) records the
actual runtime banner; [hardware.json](hardware.json) records the shared
Windows host. Builds use `-m:2`; measurements are serialized.
No affinity, power, sleep, other-process or machine setting was changed.

No performance proposal, API change, cache or Hot Reload state was introduced.
No network/browser E2E, production throughput, first-process/cold heap,
concurrency, malformed-input, other-platform or native/JIT causal-allocation
claim. This finding is **no-gain with a disproved array-copy premise**, not an
optimization awaiting approval.
