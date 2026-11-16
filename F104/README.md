# F104 - route-handler pooled operation maps: no-gain

**No performance PR or shipping optimization.** Three full-analyzer comparisons
of two private dictionary-sizing policies did not establish a sufficiently
repeatable, compatible overall gain. There are modest individual savings, not
zero savings in every case; the mixed results and all regressions are retained.
The final repeated policy increases small/unique concurrent allocation in both
pairs, by12.32% and1.62%, and small/duplicate concurrent allocation by0.15%
and20.65%. This bounded no-gain disposition does not disprove every private
redesign or every workload-specific benefit.

The independent fork branch is
`autoperf/F104-route-handler-operation-caches`, unchanged at
`37e809ead5824bc753a1c3d56f11615bdb1296c5`; its actual remote ref was verified.
Only the own one-line experiment was restored. Exact original and all three
trial patches/source snapshots remain here. The three-comparison budget is
closed: **no fourth comparison or replacement sweep**.

## What actually owns the work

`RouteHandlerAnalyzer` in `Microsoft.AspNetCore.App.Analyzers` already creates
a compilation-start queue and clears/returns each block's operation set to it.
The default dictionary constructor is reached when that queue is empty, not
necessarily once per operation block or runtime request. Actual construction
counts, physical dictionary addresses and the production distribution are
not measured. Scanner cardinality/hot-path classifications are provenance,
not observed production facts.

Each timed invocation creates a real `CompilationWithAnalyzers` driver, runs
the actual public analyzer against real in-tree HTTP/routing/MVC metadata and
awaits complete **Task<int>** diagnostics. The compilation-start queue is fresh
for that driver; it is not carried between measured invocations. Immutable
compilation inputs are reused after setup. Parsing, prerequisite-binding
proofs, metadata construction, observers and setup checks are excluded from
the timed method, not silently counted as dictionary savings.

The shipping analyzer remains netstandard2.0 with its existing
Roslyn5.11.0-1.26420.103 dependency. The net12.0/C#13 harness uses that same
compiler version, not the Roslyn3.3.1 host from F103. Release/x64,
BenchmarkDotNet0.13.0, in-process, concurrent-server GC; requested100ms,
3 warmups,8 retained results,`DontRemove`. Actual SDK
12.0.100-alpha.1.26557.102; runtime pack12.0.0-alpha.1.26562.105.
Raw BDN host fields remain `Unknown processor` and null processor/core counts;
the separately recorded managed processor count is not substituted.

| Shape | Ordinary blocks/trees | Real bound route calls | Expected ASP0022 |
|---|---:|---:|---:|
| Empty | 129 | 2 | 2 |
| SmallUnique | 17 | 66 | 2 |
| SmallDuplicate | 17 | 66 | 66 |
| WideUnique | 5 | 514 | 2 |
| WideDuplicate | 5 | 514 | 514 |

Both serial and concurrent driver modes run every shape. Every input includes
an independent ordinary two-route duplicate anchor. Wide inputs have four
128-route registration classes; Small has sixteen four-route classes.
Setup runs two complete drivers and checks exact diagnostic ID, Warning
severity, file, token span and message against independently captured resource
text. Actual emitted source bytes and238 reference names per input are retained.

## All comparisons, including partial gains

Comparison1 uses `concurrencyLevel:1, capacity:1`. Comparisons2/3 use the
**identical** `concurrencyLevel:1, capacity:31` source and owner DLL/PDB,
each with a fresh exact-original sweep. These are supported, thread-safe,
growable dictionaries with the same comparer, set keys, pool/reset/return and
diagnostic behavior. Explicit concurrency1 changes the default adaptive lock
policy; preserving every original adaptive implementation detail is not
claimed. No equivalence to the runtime's default capacity is assumed.

| Complete-driver case | Pair1 allocation reduction | Pair2 allocation reduction | Pair3 allocation reduction |
|---|---:|---:|---:|
| Empty/Serial | -2.11% | -3.06% | 2.57% |
| Empty/Concurrent | 0.17% | 2.62% | 1.08% |
| SmallUnique/Serial | 0.58% | -1.65% | 0.55% |
| SmallUnique/Concurrent | -5.98% | -12.32% | -1.62% |
| SmallDuplicate/Serial | -3.90% | -0.09% | 3.75% |
| SmallDuplicate/Concurrent | 4.54% | -0.15% | -20.65% |
| WideUnique/Serial | 0.51% | 1.23% | 2.57% |
| WideUnique/Concurrent | 0.80% | -0.42% | 0.86% |
| WideDuplicate/Serial | -0.91% | -0.25% | 2.64% |
| WideDuplicate/Concurrent | -2.01% | -4.82% | 0.39% |

Positive means fewer bytes; negative means more. These are percentages of
complete driver work, not isolated dictionary bytes. [comparisons.md](comparisons.md)
contains exact B/op and mean time for every pair, plus every independent
process-wide caliper. All60 outcomes,480 retained results,180 workload warmups,
GC totals and60 hash/PID-linked setup receipts remain available.
**Actual F104 retained overhead rows:0**, not F103's20. All timing variation
remains, including reversed timing directions with identical final source;
maximum observed CV is18.267980601894337%.

The repeated unchanged originals also move. No unmodified-owner timing
control, production frequency or whole-build throughput was measured.
There is no causal uniform speedup claim. Modest partial savings such as
WideUnique/Serial are reported rather than erased to support the disposition.

## Real producers, controls and resource limits

Every image passes33 observations:10 ordinary cases,20 nearest-opposite
HTTP-method/builder/conditional/metadata/nonliteral/RequestDelegate/pool-block/
explicit-cast controls, two generated-code controls and one same-analyzer
pair of concurrently started different compilation lifetimes. Exact diagnostics
and distinct padding/spans are checked. PoolReuse proves observable block
lifetime/reset behavior, not physical dictionary reuse.

Initially cast-shaped handlers did not reach the real route producer:
`RouteUsageDetector.GetMethodInfo` requires the relevant method-bound expression.
The main workloads were repaired to ordinary lambdas; casts remain a negative
control in both driver modes. Missing actual routing/MVC metadata, the
unsupported generic context signature and incorrect observer filter assumption
were development failures before measurement, not passing probes or source
comparisons. Raw failures and the cast-stage source snapshot are preserved.

Ten observer cases per image forward **actual Roslyn-produced callbacks**;
they do not inject operation events. Serial global overlap is1, concurrent
overlap reaches16; within a single block the observed maximum is1. This is
bounded observation, not proof future per-cache contention cannot occur.
Roslyn's readonly block-start filter properties cannot be copied through the
public/protected adapter constructor. Actual values are recorded; the owning
block-start body only registers actions. Invocation/end contexts are forwarded
unchanged. **The adapter is not used in timings or generated-code controls.**

Ten warmed process-wide calipers per image use three warmups then ten complete
drivers, precise `GC.GetTotalAllocatedBytes(true)` across worker threads and the
actual enclosing BDN GC helper. Driver/task/cache/diagnostic work, helper extra
bytes and collection counts remain in the records. Final serial calipers show
some approximately0.4-1.4% savings; concurrent results remain mixed. These probes
have one retained independent original, not a contemporaneous original for
each candidate probe.

Ten separate fresh-compilation rows per image include source/parsing,
prerequisite-binding proof and the first complete driver. They are **not**
cold-process/JIT/metadata or isolated constructor comparisons. Their
`elapsedTicks` field is TimeSpan ticks (100ns), from
`Stopwatch.GetElapsedTime(...).Ticks`; the separately recorded Stopwatch
frequency is not its conversion factor. Every allocation/time row is retained
in [measurement-audit.json](measurement-audit.json).

## Source, owning controls and portable reproduction

Twenty primary plus eight supplemental current-default/baseline/working
source/Git identities were verified against captured current default
`0443efd5cd088ab2f82cb793f476545d85545a7c`. Canonical remote/Git bytes are kept
separate from exact raw working-source bytes, including BOM/CRLF.
Pooling introduction: dotnet/aspnetcore#45582,
`f19d4a1c634793280e99e305a4bf860492292a6c`.
The captured owner-file history's latest entry is
`46a3d2ba55e6f6d9accc3ede92f9231d27a4c10b`.
Ten bounded related-work matches and actual dotnet/aspnetcore#70024/
dotnet/aspnetcore#69260 heads/files are retained; they are not exhaustive
absence proof. GitHub semantic indexing/LSP resolution was unavailable, not
replaced with the unrelated ADO scope.

Each frozen image records196 copied application files/59 declared runtime
assets and25 actual source/PDB associations:five harness,sixteen analyzer/shared
helper and four executable metadata documents. Declarative interfaces,
resource/project/test definitions have separate source proofs.
**PDB document association is not method coverage.** The original harness is
identical in all four images; only the same-identity owner DLL/PDB changes.
Comparisons2/3 have identical complete application-file hashes.

Original and final trial owning tests each pass35/35,0 skipped:23 Facts and
all12 literal InlineData rows, exact names/IDs/durations/execution-definition
mapping, real test source/PDB/output owner/compiler identity. Existing controls
are not red/green performance tests. Scoped product/test/development harness
analyzer DLL/PDB outputs were restored to the previously tested original bytes
after preserving the final proposed controls; this is not a new test run.

Original owner SHA256:
`162A0E48C0D9D80D26835CBC829C99DBA566CAE40C0E94AA8451C1D9393B009D`.
Final evaluated owner:
`972C6F7051E6D3EE194B93C53ACEE2B83D47C8842E2DC0465A1AD62F56B8E1E7`.
Shared harness:
`1D9BA54C8A03005A70B288CB48EB161BABB73DE067B17EA030BF79438525DB9E`.

```powershell
node .\reproduce-analysis.mjs <absolute-capsule> --verify
```

The portable audit rechecks28 source identities, all PDB records,192 input
proofs/3784 actual byte mappings, all observations/resources/producer records,
35 original+35 final controls, every console/JSON result/warmup/setup/GC total,
MidpointRounding.ToEven, actual overhead handling, sample variance/SD/SE,
R7 percentiles and recorded confidence-interval arithmetic. It does not
independently recompute distribution critical values, establish causality or
rehash omitted DLL/PDB/runtime-pack bytes. Pinned BDN public sources/receipts
were reused byte-for-byte from verified F103, not freshly retrieved.

The full harness/project/PDB-tool sources and historical guarded scripts are
included. A new local reproduction starts with a separate baseline checkout,
activates its SDK using `. .\activate.ps1`, and builds the harness with
`-p:AspNetCoreRoot=<checkout>`; keep the harness outside the source checkout's
inherited build properties. Optional trial patches are relative to that
baseline. Historical scripts contain this run's absolute paths and refuse to
overwrite completed images or exceed its closed budget; they are provenance,
not a drop-in command to rerun this campaign. Exact actual command arguments
and exits are in [validation-commands.md](validation-commands.md).

First successful harness compilation has six known warnings:
CS0618,RS1038,RS1041,RS1036 and RS1012 twice,0 errors. Final incremental
build/format checks have0 warnings/errors; that does not erase those warnings.
The initial four-error context compile, subsequent missing RequestDelegate
compile and failed prerequisite/producer/filter prototypes remain recorded.
The original freeze's initial six-versus-five C# file-count guard was corrected
without changing frozen bytes or rerunning the successful25 PDB commands.

No public API/default/dependency/TFM/visibility change, new permanent product
test, new cross-assembly private access, VS host/CLR, browser/native, Mono,
WASM/AOT, production-distribution or whole-build claim. Shared Windows
CPU-heavy work was serialized/max2 build nodes; no power,priority,affinity or
unrelated process change. Preserved raw files use `* -text`; identical input
bytes are content-addressed with every original path mapping retained,
including failed/successful prototypes and the harness `.editorconfig`.
