# F103 - StateHasChanged analyzer component-cache allocation

**Qualified allocation-focused proposal, not merge-ready or a general speedup claim.**
The final source reduces complete-driver allocation for controlled empty
components by **6.27-14.72%** in the two final paired BenchmarkDotNet comparisons.
Separate real-driver, process-wide calipers observe **7.36-11.66%** lower allocation
for those inputs. Populated-cache results are mixed; every result is retained in
[all three comparison tables](comparisons.md).

This evaluates the scanner's `concurrentdictionary-default-constructor-overallocation`
finding, not a verified production workload distribution. Rather than lowering
dictionary concurrency/capacity based on an assumed cardinality, the proposal
creates each per-component map only when it receives an entry. The original
`SymbolEqualityComparer.Default`, dictionary defaults, concurrent operations,
symbol lifetime and diagnostic behavior remain unchanged.

## Proposal and actual source identities

The [independent source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F103-statehaschanged-component-caches)
contains one surgical shipping-file change. [Source publication](source-branch-publication.json)
records the actual commit, canonical remote blob/ref and raw source hash.
Original and proposed files are preserved under `producer-source` and
`variant-source`; their raw line endings/BOM status were not normalized.

The measured original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Twenty owning/helper/diagnostic/control/project/framework sources were checked
against actual current default `d7870e7ec8da214eb96f96f5512aad0d89bfef11`,
the campaign baseline and working checkout. Canonical Git clean-filter identity
is checked separately from exact raw working-source bytes.
This is not whole-repository or whole-build equivalence.

The analyzer was introduced in dotnet/aspnetcore#67176 for
dotnet/aspnetcore#65196; dotnet/aspnetcore#68720 corrected await-foreach/using
suspension handling. Actual history and bounded related-work evidence are
included. The query is not exhaustive related-work absence proof.

Comparison1 used thread-safe `Lazy<T>` wrappers. Comparisons2/3 used the same
final four-argument `LazyInitializer.EnsureInitialized` source, with separate
initialization flags and one per-component lazy creation gate. The analyzer
continues to target **netstandard2.0/Roslyn3.3.1**.
The attempted three-argument overload was unavailable in that actual target
and failed with six CS1503 errors **before comparison2**. The failed build and
original overbroad documentation assumption are retained; no dependency,
target, nullable-policy or visibility change was used to force compatibility.

## Real owner and measurement boundary

The [pinned standalone project](harness/AutoPerf.Benchmarks.csproj) calls the
actual public `StateHasChangedAnalyzer` through fresh, real
`CompilationWithAnalyzers` drivers against actual compiled Components metadata.
It does not substitute dictionary construction, type stubs or injected callbacks
for the timed owner. The benchmark awaits complete diagnostics and consumes
their count via `Task<int>`. Immutable compilations are warmed and reused;
parsing, metadata binding, setup and the callback observer are outside timing.

| Controlled input | Actual derived components | Syntax trees | Actual factory/unique handler targets | Bound calls/diagnostics |
|---|---:|---:|---:|---:|
| Empty | 129 | 129 | 0 | 1 |
| LifecycleOnly | 129 | 129 | 0 | 129 |
| EventOnly | 129 | 129 | 128 | 1 |
| SmallPopulated | 33 | 33 | 64 | 65 |
| WidePartials | 5 | 33 | 256 | 257 |

Every ordinary timed input has a positive lifecycle anchor. Both serial and
concurrent driver settings are exercised. Exact semantic bindings and diagnostic
IDs/severity/file/spans/messages are prerequisites, not just zero-diagnostic
success. Probe-only forwarding calls the real owner's `Initialize`; Roslyn
produces its callbacks. Global callback overlap is observed, not per-cache
contention or timed lock profiling. Generated inputs run the unwrapped owner.

Each of four actual frozen images passes17 observations,10 process-wide resource
cases and10 real-producer cases. Four negative controls, two generated-code
controls and two concurrently started compilation lifetimes using the same
analyzer instance preserve the actual diagnostic boundary.
Existing analyzer/code-fix controls pass **30/30 on original and30/30 on final**,
with zero skips, positive durations and exact TRX/source/PDB/output-owner/compiler
identities. Those existing stub-based controls are separate from the real-reference
driver evidence; they are not red/green performance-regression tests.

## All measurements and limitations

Three source comparisons are complete and the budget is closed.
Comparisons2/3 each retain a fresh exact-frozen-original sweep because timing
changed strongly even for fully populated controls that did not achieve
comparable allocation reductions. Earlier reference sweeps were not replaced.
**No causal uniform analyzer/compiler/build speedup is established.**

The final SmallPopulated/Serial case allocates1.58% more in comparison3.
WidePartials/Concurrent allocates0.21% more in comparison2. Earlier proposal
regressions and all timing differences remain in the tables/raw data.
The maximum actual timing CV is16.53%; samples/outliers were not discarded.
Input sizes are controlled, not a measured production distribution.

The capsule retains60 actual BDN outcomes,480 result samples,180 workload warmups,
20 actual overhead samples and60 hash/PID-linked two-run setup receipts.
The pinned engine's median-overhead subtraction is checked, including its
recorded no-overhead cases. Raw GC byte totals/operation counts, midpoint-to-even
B/op rounding, sample/variance/median/R7-percentile/outlier and recorded confidence
interval arithmetic are audited. Confidence critical values are not independently
recomputed or treated as causal evidence.

The actual pinned BDN helper uses precise process-wide managed allocation on
this runtime. Each separate caliper encloses10 complete drivers after3 warmups
and consumes expected diagnostics. Worker-thread allocations are included.
The enclosing actual BDN helper never records fewer bytes than that caliper;
its extra bytes are retained, not normalized away. These totals include
driver/tasks/diagnostics/metadata/cache work, not isolated dictionary or native
allocations.

The application closure is98 copied files/29 declared runtime assets per image.
All measured images use the exact original harness image:
`1287E9681BEEA9AC360F56AFE7A9653BED094763F4993E53A971A0E3C44848A1`.
The original owner hash is
`8F6AA9AA776BAA9F37984B85E0EA679F6770E271ECC68B9A2F27977D08EA5E30`;
the identical final owner in comparisons2/3 is
`96F7DEC475E40C80AE3201DA9D81CAC7259B895B412BA3A0BA5E7F80EBA2C9B5`.
Only the same-identity analyzer DLL/PDB differ from the original image.
An earlier recompiled-harness byte drift was rejected before measurement;
unchanged harness sources were not mistaken for identical executable bytes.

Actual source/PDB associations cover5 harness,5 executable analyzer and3
Components sources per image. Constant-only `ComponentsApi` is retained as
canonical source, not executable-PDB or method-coverage proof.
Raw config/deps, runtime/corelib/compiler/Components hashes and209 reference
names are retained. DLL/PDB/binlogs are omitted from this public capsule.
The portable audit rechecks recorded proofs and exact published bytes; it does
not pretend to rehash omitted binaries, every runtime-pack reference byte or
method coverage.

Actual environment: shared Windows10.0.26300, x64, SDK
`12.0.100-alpha.1.26557.102`, pinned runtime pack
`12.0.0-alpha.1.26562.105`, BDN0.13.0, Release, in-process,
server/concurrent GC, Roslyn host `5.11.0-1.26420.103`, C#13 harness/C#8 inputs,
3 workload warmups/8 retained results/requested100ms/DontRemove.
The raw BDN processor name is **Unknown processor** and its core counts are
**null**; separately recorded `Environment.ProcessorCount=16` is not substituted.
Earlier host inventory is labeled earlier, not fresh.
CPU-heavy work is serialized with at most2 build nodes; no power, affinity,
priority or unrelated process changes.

The final standalone probe build has4 known warnings
(CS0618, RS1038, RS1041, RS1036), not a warning-free claim.
The shipping target/settings were not changed to suppress them.
The managed compiler boundary does not establish browser rendering, native
allocations, whole-build throughput, production cardinality/frequency, or
VS2019 CLR/Mono/WASM/AOT execution.

## Reproduce and inspect

The project supports `-p:AspNetCoreRoot=<absolute-repository>`. Activate the
repository SDK in every fresh dotnet shell. The exact historical commands and
their actual results are in [validation-commands.md](validation-commands.md).
Raw executions, frozen probes, input proofs and all report formats remain
linked by the authoritative copy manifest.

```powershell
node .\reproduce-analysis.mjs <absolute-capsule-directory> --verify
```

This passes against the exact capsule and checks128 input proofs/9472 recorded
input-byte mappings, the identities/controls and all60 BDN outcomes.
Identical emitted input bytes are stored once in `input-blobs`; the authoritative
copy manifest maps every original input path to its exact blob. No raw evidence
is silently dropped or reconstructed from a different workload.

For a new measurement, build the harness against an unchanged original checkout
and retain its entire new executable/config/dependency image. Build the proposed
analyzer in the independent proposal checkout. Verify its assembly identity
matches, clone the new original image and substitute **only** the proposed owner
DLL/PDB. Run `--characterize` and the same ten-case BDN command against both images.
Do not rebuild/substitute the harness between compared images.
Newly built images have new hashes and produce new measurements; they do not
replay the historical binary bytes omitted here.

The original images were built from the unchanged baseline. Proposed images
were built from that baseline plus the exact recorded source patch before the
later source commit; publication never relabels them as built from that commit.
