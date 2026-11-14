# F085: inline known-method records have no supported steady-state gain

**No performance PR.** Three unchanged paired comparisons establish no material
lookup/parser win or per-operation allocation reduction. The eight standard
non-GET lookup median changes are only **-0.27% to +0.15%**; mixed lookup is
**+0.09%** and the actual mixed request-line parser is **+1.26%**. Positive
means slower. Shipping source and the actual owning Kestrel DLL were restored
byte-for-byte; the independent
[`autoperf/F085-inline-known-http-methods` branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F085-inline-known-http-methods)
retains only two preservation theories/twenty-four rows at
[`6cdef334e4e6e2ba204b5abe96ca148ba809f0e3`](https://github.com/jaslawinMs/aspnetcore/commit/6cdef334e4e6e2ba204b5abe96ca148ba809f0e3).

## What was evaluated

The retained `tuple-reference-composite-key` candidate identifies the private
17-slot generated known-method table. It is an indexed record table, not a
dictionary composite key. Static initialization creates eight standard
non-GET reference tuples and one shared invalid tuple for every gap. Lookup
does not construct a tuple per request. GET returns through its separate
four-byte fast path before consulting this table.

The [three-file experiment](experiment.patch) replaces those reference records
with inline `(ulong, ulong, HttpMethod, int)` values in the **real generator
template**, regenerates the shipping declaration, and updates directly
dependent construction/default-gap detection and the now-impossible reference
null check. The masks, values, method discriminators, lengths, 17-slot size,
perfect-hash arithmetic, explanatory locals and surrounding branches are
preserved. No ref-local optimization, unrelated cleanup, public API, or new
cache is mixed in.

Fresh upstream main was
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. The recent independent string
non-ASCII guard (`d4038d418f6c39d8f51b40f26bff8362c0231820`) is untouched.
[Owner](owner-history.log) and [companion](companion-history.log) history and a
[bounded existing-PR query](existing-prs.json) are retained. F301's separate
code-generation optimization is not carried into this baseline.

## Actual owner, producer and generation checks

The [pinned standalone project](harness/AutoPerf.Benchmarks.csproj) loads the
actual source-built `Microsoft.AspNetCore.Server.Kestrel.Core.dll`. Typed
delegates bind its byte-span lookup and untouched string/version methods once;
there is no per-operation reflection, fabricated replacement lookup, new IVT,
or UnsafeAccessor. The actual public `HttpParser` executes complete single-
and three-segment request lines and invokes its real `OnStartLine` handler.
Setup observes method, method length, version, target/path fields, completion
and consumed data; it does not inject a callback into a consumer.

The producer's disputed lookup is the real
`HttpParser.TryParseRequestLine -> HttpUtilities.GetKnownMethod` call. The
[existing parser benchmark](existing-parser-benchmark.cs) was inspected; its
GET/header workloads do not isolate this non-GET record representation.

All seventeen initialized original records are captured through `ITuple` and
compared against their exact mask/value/method/length counterparts outside
every measured setup. The original [contract oracles](contract-oracles.json)
include every fixed case plus all twelve mixed members. Mixed-case top-level
input metadata is a descriptor, not a single synthetic request: the member
receipts retain the actual twelve input hashes and producer outputs.

Each real fresh-process CodeGenerator run produced five complete files.
Original files are retained under [generator-original](generator-original).
Only `HttpUtilities.Generated.cs` changes with the actual template; the other
four outputs remain byte-identical. Restoring the template and regenerating
also reproduces **all five originals byte-for-byte**.
[generator-byte-parity.json](generator-byte-parity.json) and
[generator-restoration.json](generator-restoration.json) preserve these checks.

Loaded owner MVID is checked against PE metadata. The immutable recursive
closure contains **70 DLL/JSON files**, differing only in the actual Kestrel
owner. Harness DLL/PDB/runtime/deps are reused unchanged. All **222 outcomes
and 222 setup receipts** cover the same 37 cases in serial A/B, B/A, A/B order.
The experiment uses the same implementation throughout; no tuning.

## All measured comparisons

Values below are paired mean percentage changes; the median is taken across
the three percentages, not pooled samples or a statistical-significance claim.
All outcomes retain exactly eight measured observations and three warmups,
100ms iteration targets, and `DontRemove` outliers. Maximum CV is the largest
within-launch standard-deviation/mean percentage for that case.

| Case | Pair 1 % | Pair 2 % | Pair 3 % | Median % | Before / after median B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| Lookup_Collision | 0.14 | -0.34 | 0.35 | 0.14 | 0.00 / 0.00 | 1.10 |
| Lookup_CONNECT | 0.56 | -0.06 | -0.51 | -0.06 | 0.00 / 0.00 | 1.23 |
| Lookup_DELETE | -0.10 | -0.24 | -0.37 | -0.24 | 0.00 / 0.00 | 1.15 |
| Lookup_Empty | -0.28 | 0.19 | -0.12 | -0.12 | 0.00 / 0.00 | 0.90 |
| Lookup_ExtraSuffix | -0.16 | -0.67 | 2.53 | -0.16 | 0.00 / 0.00 | 2.55 |
| Lookup_GET | -0.76 | 0.41 | -0.11 | -0.11 | 0.00 / 0.00 | 1.24 |
| Lookup_HEAD | -0.22 | 0.09 | 0.05 | 0.05 | 0.00 / 0.00 | 1.26 |
| Lookup_Lowercase | 0.17 | 0.58 | -0.11 | 0.17 | 0.00 / 0.00 | 1.16 |
| Lookup_OPTIONS | -0.05 | -0.17 | -0.36 | -0.17 | 0.00 / 0.00 | 1.03 |
| Lookup_PATCH | 0.03 | -0.14 | -0.50 | -0.14 | 0.00 / 0.00 | 2.19 |
| Lookup_POST | -0.60 | 0.03 | -0.06 | -0.06 | 0.00 / 0.00 | 1.10 |
| Lookup_PropFind | 0.25 | 0.72 | -0.11 | 0.25 | 0.00 / 0.00 | 1.09 |
| Lookup_PUT | -0.09 | -0.50 | -0.27 | -0.27 | 0.00 / 0.00 | 2.27 |
| Lookup_Short7 | 0.13 | 0.48 | -0.49 | 0.13 | 0.00 / 0.00 | 0.89 |
| Lookup_TRACE | -0.03 | 0.46 | 0.15 | 0.15 | 0.00 / 0.00 | 0.73 |
| MixedLookup12 | 0.14 | -1.22 | 0.09 | 0.09 | 0.00 / 0.00 | 1.55 |
| MixedParser12 | 0.30 | 1.26 | 1.54 | 1.26 | 0.00 / 0.00 | 1.21 |
| Parser_CONNECT | 1.41 | 3.71 | 2.60 | 2.60 | 0.00 / 0.00 | 1.84 |
| Parser_DELETE | 1.26 | -1.75 | 3.59 | 1.26 | 0.00 / 0.00 | 3.00 |
| Parser_GET | -0.76 | -0.65 | -0.61 | -0.65 | 0.00 / 0.00 | 1.59 |
| Parser_HEAD | -0.76 | 1.46 | -1.29 | -0.76 | 0.00 / 0.00 | 2.10 |
| Parser_Incomplete | 2.78 | 1.96 | -4.21 | 1.96 | 0.00 / 0.00 | 1.92 |
| Parser_OPTIONS | -0.50 | 1.25 | 0.50 | 0.50 | 0.00 / 0.00 | 1.50 |
| Parser_PATCH | 2.42 | 1.63 | 1.27 | 1.63 | 0.00 / 0.00 | 1.39 |
| Parser_POST | 0.83 | 2.99 | 3.07 | 2.99 | 0.00 / 0.00 | 2.12 |
| Parser_PostLongPath | -0.58 | -0.07 | -0.22 | -0.22 | 0.00 / 0.00 | 1.21 |
| Parser_PropFind | 1.99 | 0.69 | 3.00 | 1.99 | 0.00 / 0.00 | 1.22 |
| Parser_PUT | -0.10 | 0.40 | -0.11 | -0.10 | 0.00 / 0.00 | 1.57 |
| Parser_SegmentedCustom | 4.07 | -3.01 | -4.44 | -3.01 | 48.00 / 48.00 | 5.64 |
| Parser_SegmentedPost | 4.50 | 0.88 | -3.96 | 0.88 | 40.00 / 40.00 | 1.27 |
| Parser_TRACE | 3.42 | 2.16 | -1.06 | 2.16 | 0.00 / 0.00 | 4.54 |
| String_Custom_Control | -1.14 | 0.44 | -2.02 | -1.14 | 0.00 / 0.00 | 1.14 |
| String_Get_Control | 2.74 | -5.49 | 8.55 | 2.74 | 0.00 / 0.00 | 1.11 |
| String_NonAscii_Control | -2.04 | -0.40 | -2.13 | -2.04 | 0.00 / 0.00 | 1.49 |
| String_Post_Control | 3.48 | -4.98 | 9.14 | 3.48 | 0.00 / 0.00 | 1.10 |
| Version_11_Control | -2.13 | 1.38 | 2.71 | 1.38 | 0.00 / 0.00 | 2.04 |
| Version_Unknown_Control | 1.42 | 1.74 | 3.35 | 1.74 | 0.00 / 0.00 | 0.90 |

The three direct non-GET cases improving in every pair (`DELETE`, `OPTIONS`,
`PUT`) have medians no larger than 0.27% in magnitude, not a meaningful supported
win. Full parser signs are mixed; the small POST/CONNECT increases and segmented
custom direction changes are retained. GET parser improvement is on the
untouched early-return path and is **not attributed to the table change**.

All per-operation heap observations are unchanged: zero reported B/op except
40 B for segmented POST and 48 B for segmented custom parsing. The six untouched
string/version control medians range from -2.04% to +3.48%, including two controls
with low within-launch CV yet several-percent differences. Low CV is not proof
of causal attribution or harmless cross-launch shifts. No control is hidden.

Lookup timings include identical typed-delegate/dispatch/checksum costs; parser
timings include actual parsing plus identical reader creation, handler reset
and field/checksum consumption. Mixed rows report **twelve operations per
benchmark invocation**, not a per-request rate. Hashing, reflection, initial
table capture and string target capture happen outside measurement.

[comparison.md](comparison.md) retains absolute before/after ns/op and heap
observations. [all-paired-outcomes.json](all-paired-outcomes.json) contains all
111 paired rows; [raw-case-outcomes.json](raw-case-outcomes.json) preserves all
222 full identities/statistics, and [setup-correctness.json](setup-correctness.json)
preserves every complete producer receipt. The initial pair analysis is also
retained rather than replaced by only the final summary.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Custom classification across all 16 perfect-hash buckets | `HttpUtilitiesTest.GetsCustomMethodForEveryHashBucket`: all 16 rows individually passed on original, experiment and restored shipping code. |
| Incomplete non-GET prefixes 0 through 7 do not read beyond input | `HttpUtilitiesTest.DoesNotReadIncompleteNonGetMethodPrefix`: all 8 rows individually passed in all 3 variants. |
| Known method recognition, interning and independent string behavior | Existing `GetsKnownMethod`, `KnownMethodsAreInterned`, `GetKnownMethod_NonAsciiStart_ReturnsCustom`, plus the complete utility suite: every configured row passed. |
| Real parser input production and observable effects | Existing `HttpParserTests.ParsesRequestLine` and complete parser suite passed; all 37 measured setups also compare actual lookup/parser outputs and every 12-member mixed group. |
| Original slot contents and generator/runtime agreement | Actual 17-slot oracle checks, real five-file CLI output parity and complete restoration records. |
| Owner-only A/B isolation | [recursive-closure.json](recursive-closure.json), reused identical harness/configuration and actual owner load/MVID checks. |
| Unsupported change is not left in shipping code | [restoration.json](restoration.json): all 3 source files and actual owner are byte-equal to originals; restored 3943 tests/all 24 new rows and 37 setups passed. |

There are **11829 passing individual test outcomes**: 3943 each on original,
experiment and restored shipping code; no skips or failures. They are
preservation checks, not a fabricated failing functional bug: original behavior
was already correct. [correctness.json](correctness.json),
[all-test-outcomes.json](all-test-outcomes.json) and the three redacted TRX sets
retain every row.

## Exact commands and outcomes

All direct .NET commands activated the repository-local environment from the
repository root first:

```powershell
. .\activate.ps1
```

```powershell
dotnet test .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~HttpUtilitiesTest|FullyQualifiedName~HttpParserTests' --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<variant>'
```

**Passed 3943/3943, all 24 new rows individually, on each of `before`, `after`,
`restored`.** The same source-built owner is used by the harness.

```powershell
dotnet build .\src\Servers\Kestrel\tools\CodeGenerator\CodeGenerator.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet .\artifacts\bin\CodeGenerator\Release\net12.0\CodeGenerator.dll '<OUT>\HttpHeaders.Generated.cs' '<OUT>\HttpProtocol.Generated.cs' '<OUT>\HttpUtilities.Generated.cs' '<OUT>\TransportMultiplexedConnection.Generated.cs' '<OUT>\TransportConnection.Generated.cs'
```

**All three generator builds/CLI runs passed.** Proposed/restored CLI used the
shipping utility path as argument 3 so it was genuinely regenerated; the other
four output paths were isolated. Their retained copied utility outputs match
the corresponding shipping file exactly.

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --verify-setups
```

**Final builds passed with zero warnings/errors; original capture passed;
all 37 setups passed for all three owners.** Initial `NETSDK1004` was followed by
a restore-enabled build only after that failure. An initial missing runtime
`Microsoft.AspNetCore.Http.Abstractions` dependency was diagnosed at the actual
owner class initializer; explicit real project dependencies and the pinned
Primitives package were then added before any immutable snapshot or measurement.
Both original preparation failures and successful final logs are retained.

```powershell
dotnet format whitespace .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj --verify-no-changes --no-restore --include 'C:\src\aspnetcore\src\Servers\Kestrel\Core\src\Internal\Infrastructure\HttpUtilities.cs' 'C:\src\aspnetcore\src\Servers\Kestrel\Core\src\Internal\Infrastructure\HttpUtilities.Generated.cs' 'C:\src\aspnetcore\src\Servers\Kestrel\Core\test\HttpUtilitiesTest.cs' --verbosity quiet
git --no-pager diff --check
```

**Passed.** Formatter log is legitimately empty. Restored shipping files match
the untouched baseline byte-for-byte; only the preservation test insertions
remain in the source branch.

```powershell
dotnet '<SNAPSHOT>\AutoPerf.Benchmarks.dll' --filter '*MethodLookupBenchmark*' --inProcess --exporters json csv --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove --artifacts '<ROUND>'
```

**All six launches passed, 37 cases each, 222 complete outcomes/receipts.**
The published raw analysis can be reproduced with
`.\summarize.ps1 -RunRoot .` from this report directory.

## Environment and excluded boundaries

Shared Windows 11 Enterprise 10.0.26300 guest, Xeon Platinum 8473C, 8 cores/16
logical processors, approximately 64 GiB; independently captured
[hardware.json](hardware.json), because BDN 0.13.0 prints `Unknown processor`.
Repository SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105
(BDN banner .NET 12.0.0/12.0.26.56305); C# 13, concurrent server GC, in-process.
Builds/tests/measurements were serialized, with builds limited to `-m:2`.
No manual power/affinity changes or unrelated process termination.

This evaluates warmed real lookup and request-line parsing, not a full network
request, headers/application handling, browser, other runtime/platform, or
concurrency workload. Inline storage removes startup reference-tuple objects
structurally, but **cold class-construction and retained-byte savings were not
measured and are not a justification for a PR here**. No native/JIT instruction
or unchanged-control explanation is asserted. All gains, regressions,
heap observations and variance remain public; three comparisons are final.