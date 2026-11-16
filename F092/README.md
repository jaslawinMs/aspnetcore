# F092: completed synchronous TestHost response reads

**Qualified allocation-focused draft, not merge-ready. The reported pending
wait is required by the synchronous Stream contract; it is not removed.**
The proposal consumes a successfully completed memory `ValueTask<int>`
directly, instead of allocating a `Task<int>` wrapper. Pending and failed reads
retain the original `AsTask().GetAwaiter().GetResult()` path.

## Actual results and limitations

All **15 guaranteed-completed prepared target pairs** save exactly **72 B/op**:
**128 B to 56 B, a 56.25% reduction**. Actual memory-read, cached-result 1/8
and prepared EOF allocation controls are unchanged. This does not mean that
all response reads allocate zero or that pending reads avoid their task.

Three prepared profiles are faster in every pair: `Partial16`, `Uncached16`
and `Uncached256`, with paired medians **8.18%, 7.00% and 6.61% faster**.
Prepared target timings overall range **11.89% faster to 24.96% slower**.
The retained regressions are `PreparedSync/Uncached9` in pair2 (**3.05% slower**)
and `PreparedSync/Uncached4096` in pair3 (**24.96% slower**). The latter has
low within-launch CV (0.75% original, 0.46% selected) and is not discarded.

Actual full `PublicSync` target requests save a reported **52-67 B/op**,
only **0.54-0.70%** of full request allocation. This path retains HttpClient,
ClientHandler, the real runtime read-only wrapper, response reads, EOF,
trailer copying and disposal. It can reach the necessary pending branch.
Its target timings range **4.70% faster to 1.83% slower**. Only `Partial16`
is faster in all three pairs, with a tiny **0.56% faster median**. There is
**no established material full-request speedup**: selected `Uncached16`,
`Uncached4096` and `Uncached9` median changes are 0.24%, 0.33% and 0.62% slower.

Untouched `PreparedMemoryAsync` timings move **5.48% faster to 31.21% slower**;
the first `PreparedSync/Cached1` case reaches **33.67% CV**. Public cached/EOF
heap counts also move despite having no structural task-wrapper saving.
Controls, first-case movement, low-CV regressions and every raw sample remain.
Shared-host or phase movement is not used to erase an unfavorable result.

[All72 paired outcomes, including regressions](comparison.md).
[All144 raw outcomes](raw-outcomes.json).
[Console-linked results, warmups and GC totals](console-measurement-receipts.json).
[Actual setup bytes and owner identities](setup-correctness.json).

## Producer and source

The scanner retained F092 under `blocking-async-result-or-wait`, targeting
`ResponseBodyReaderStream.Read`. Its observation that a caller can block is
real, but that wait is part of a synchronous stream's contract. Returning
early, removing `Read`, or consuming an incomplete `ValueTask` would be wrong.
The narrower, measured opportunity is task conversion after successful
synchronous completion.

The sole shipping change is two additions/one deletion in that method.
The memory overload, pipe lifecycle, validation, exception ordering and
public API shape/defaults are unchanged. An existing test file adds one
focused theory with rows8,9,256; no new test project or visibility bridge.
[Exact measured source](source-after.cs).
[Exact original source](source-before.cs).
[Remote two-file source scope](committed-source-identity.json).

Prepared cases use **public TestServer.SendAsync** and its returned
`HttpContext.Response.Body`, the actual owner constructed by
`HttpContextBuilder`. Production response bytes come from the actual
application `HttpResponse.BodyWriter`, captured while its request is alive.
No private unwrap, constructor access, synthetic pipe result or replacement
stream is used. Public cases retain **HttpClient's actual
StreamContent.ReadOnlyStream**; pinned runtime source proves that its
DelegatingStream forwards synchronous reads to the TestHost owner.

The owner and seven inspected direct producer/test files match current
upstream default head `b38e2847d9cda5fbba26177354ed11ede3f7dbfe` and campaign
baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`. This is scoped source
identity, **not whole-newer-branch or runtime equivalence**.
The 2022 CA1844 change introduced the memory overload/array AsTask shim;
the 2022 validation change intentionally removed restrictive array checks.
Existing null/empty memory-overload behavior is therefore preserved rather
than silently tightened. Official Stream.Read documentation permits a
zero-byte read to wait without consuming data.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Actual completed-read resource effect | Original strict `--verify --assert-no-wrapper` reaches its assertion after24 real cases/15 probes and fails for72 extra B/read; identical selected harness passes with0 extra. Each uses5000 actual nine-byte reads; the actual memory control stays56B/read. [Red/green records](faithful-red-green-and-preservation.json). No latency is measured by this diagnostic assertion. |
| Cached/uncached offset, short-read and EOF behavior | `Microsoft.AspNetCore.TestHost.Tests.ResponseBodyTests.BodyStream_SynchronousRead_PreservesOffsetShortReadAndEof(byteCount: 8)`, the same exact method with `byteCount: 9`, and with `byteCount: 256` all pass on both sources. The actual response is flushed before the synchronous read; bytes, offset sentinels, short result and EOF are asserted. [All actual TRX rows](actual-test-audit.json). |
| Required pending sync behavior and zero-byte non-consumption | Actual `PendingData`, `PendingZero`, `PendingEof` and `PendingAbort` probes observe dedicated workers in `WaitSleepJoin` before the real producer releases data, completes the live response or invokes public HttpContext.Abort. Results and bytes match across owners. [Original actual observations](verification-before/functional-probe.json); [selected](verification-after/functional-probe.json). No sleeps or injected pipe callbacks. |
| Validation, abort, async cancellation and disposal | All15 actual observations match, including negative/beyond-end array inputs, null/empty behavior without consuming data, previous public application abort, a genuinely pending async read canceled by its real token, subsequent sync failure and disposed response. Functional probes are green/green, separate from the resource red/green assertion. |
| Real complete client response and trailer delivery | All8 PublicSync profile setups in each of6 launches exercise ClientHandler's real runtime wrapper, synchronous read, full EOF/trailer copying and disposal. Prepared-owner EOF does not register or claim to prove ClientHandler's trailer-copy callback. |
| Existing owning coverage | 23 initial original tests pass. After adding the focused theory,26 original and26 selected response/lifetime/reset/features rows pass, with matching identities and zero skips. Every actual definition/duration/outcome is audited; all three new rows are inspected, not inferred from a summary. |
| Fair closure, source and measurement | Complete126-file copied sets and58 declared runtime assets; only TestHost DLL/PDB differ. Identical retained harness/config/deps. Actual owner and four harness-source portable-PDB documents match source snapshots. All144 outcomes/1152 result samples/432 actual warmups/GC totals and144 setup receipts are console-linked and audited. |

## Settings and budget

**Three comparisons, AB/BA/AB, one unchanged strategy; budget3/3 closed.**
Each launch contains24 cases (8 profiles x3 methods),3 warmups and8 retained
results, requested100ms, `DontRemove`. No fourth comparison or hidden tuning.

BDN0.13.0; Release/net12.0/x64/in-process/concurrent-server-GC; C#13 harness.
SDK `12.0.100-alpha.1.26557.102`; runtime pack
`12.0.0-alpha.1.26562.105`; actual banner
`.NET 12.0.0 (12.0.26.56305)`.
BDN's processor label remains unknown. The separate read-only Windows
inventory reports Intel Xeon Platinum8473C,8 cores/16 logical processors,
MaxClockSpeed2100. This is a **shared Windows machine**, not a dedicated
performance host. CPU-heavy work was serial, builds requested max2 nodes;
no power, affinity or unrelated process changes.

## Reproduction and evidence

The [external BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references actual in-tree assemblies and pinned Extensions packages. Build
original and selected sources independently, retain identical harness/config
bytes, then use the [historical runner](historical-benchmark-runner.ps1).
All fresh .NET shells activate the repository SDK from the repository root:
`. .\activate.ps1`. The repository's unchanged NuGet.config is used for the
new external manifest restore. It and global.json/package manifests are not
modified. The external legacy WebHost/TestServer fixture builds with the
two recorded deprecation warnings; none is hidden or treated as a failure.

[Exact commands and their outcomes](validation-commands.md).
[Closed measurement budget](measurement-budget.json).
[Strict actual measurement/source audit](measurement-audit.json).
[Complete copied execution closure](execution-closure.json).
[Actual original owner PDB proof](owner-pdb-before.json).
[Actual selected owner PDB proof](owner-pdb-after.json).

`node .\reproduce-analysis.mjs . --verify` and
`.\F092-xml-audit.ps1 -RunRoot . -Verify` revalidate the published raw/source/
proof records without rewriting them. **Raw DLL/PDB bytes are omitted**;
the public audit cannot independently rehash them or recreate their
original-host PDB inspection merely by reading a recorded proof.

Three unmeasured preparation failures are retained: StartAsync did not
return the TestHost response message; the public HTTP stream is its real
read-only wrapper; and EOF receipt collection initially dereferenced a
completed application's disposed feature collection. Corrections use the
actual first-flush producer, public direct-owner API and captured live
PipeWriter reference. None reached timing or the resource assertion.
A mistaken push to the upstream remote failed without changing upstream;
the measured two-file source was then pushed to the verified authorized
fork remote. No benchmark or source outcome is rewritten by that correction.

This evaluates TestHost's in-memory response boundary, not network server
throughput, browser behavior, every application's sync-read frequency,
startup, other runtimes/OS or a universally faster replacement. Review the
small completed-read seam and retained timing/control limitations before
considering an upstream proposal.
