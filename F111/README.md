# F111: pooled stored-data serialization buffers

**Conditional warmed-pool component draft, not merge-ready.** Across both
selected comparisons, the seven predeclared large-payload targets used
**41.57-74.88% less time and 68.56-85.70% fewer managed allocated B/op**.
Cold rental misses, retained pool heap and concurrent/production distributions
were not measured. This is not a reduction in total retained process memory or
an application/HTTP throughput result.

The independent source proposal is
[`c007585c146990fce6d320dc01dfc68ecd153cc1`](https://github.com/jaslawinMs/aspnetcore/commit/c007585c146990fce6d320dc01dfc68ecd153cc1),
based on campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Frozen measured binaries were built before this later source commit; their
actual hashes are preserved, not relabeled as builds of that commit.

## What changed and what did not

Only `JsonStoredDataSerializer.SerializeData` changes: use the existing shared
`System.Buffers.PooledArrayBufferWriter<byte>` as `Utf8JsonWriter`'s destination,
retain the existing object loop and final `Flush`, then copy `WrittenSpan`
into the required independently owned result array. One project Compile item
includes the existing helper in the owning assembly. The helper itself is
unchanged. Writer disposal precedes rental disposal; the helper clears committed
written regions on growth/disposal and returns rentals to `ArrayPool<T>.Shared`.

This is a **contiguous, growable, pooled** buffer, not segmentation, bounded
input, a new size limit, a new pool or an eliminated final copy. Rental reuse
can retain arrays in the shared pool. The required result copy and real
`DistributedSession.Set` copy remain. No exact resize/copy count is established
by the allocation totals. The attempted source query at the recorded runtime
commit failed; no exact runtime pool-retention/trim policy is claimed.

F112's separate `SerializeValue`, deserialization, public API/defaults,
dependencies, target framework, visibility and framework assembly boundaries
are unchanged. There is no new IVT, UnsafeAccessor or shipping reflection.
The portable audit reverses the three exact selected serializer edits and the
one Compile include to recover the complete original files.

## Faithful measured boundary

The standalone [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
uses public `AddRazorComponents` registrations and actual compiled internal
serializer/provider implementations. Their public methods are bound once with
harness-only reflection/CreateDelegate outside timing; no serializer copy is
compiled into the benchmark.

Session cases use a real public `DistributedSessionStore`, real
`DistributedSession` and `MemoryDistributedCache`. The session is loaded outside
timing and an explicit true factory callback establishes it. This is **not**
SessionMiddleware/HTTP establishment or cache commit/external I/O. Timed saves
perform the real synchronous provider/serializer/session-copy operation and
return the actual session; output reads, hashing, logging capture and verification
remain outside timing. Direct cases return their actual produced byte arrays.

Twenty-eight deterministic synthetic cases include empty/null/scalars,
ASCII 1/16/128 KiB strings, escaped and Unicode text, 16/256 entries,
arrays/nesting/enums, actual session saves and unchanged SerializeValue/empty-save
controls. Exact encoded 4095/4096/4097-byte outputs exercise the 4 KiB boundary.
Typed input snapshots and the owning original's exact output-byte fixtures
are preserved. These shapes are not measured production input frequencies.

## Results, including non-wins

| Case | Pair2 time change | Pair3 time change | Pair2 original/candidate B | Pair3 original/candidate B |
| --- | ---: | ---: | ---: | ---: |
| DataAscii16K | -73.81% | -69.99% | 115841/16680 | 115842/16680 |
| DataAscii128K | -74.88% | -71.32% | 918703/131385 | 918705/131378 |
| DataEscaped16K | -53.44% | -52.89% | 387866/72399 | 387869/72399 |
| DataUnicode16K | -54.14% | -50.43% | 492673/98619 | 492683/98610 |
| SessionAscii16K | -44.93% | -41.57% | 132378/33217 | 132378/33217 |
| SessionAscii128K | -61.16% | -67.37% | 1049960/262599 | 1049931/262586 |
| SessionEscaped16K | -50.31% | -51.78% | 460145/144649 | 460095/144648 |

Numbers above are actual paired means, not medians pooled across runs.
All [84 paired rows/168 raw outcomes](paired-outcomes.md) retain comparison1
and both selected pairs. Each outcome contains eight retained measurements;
outlier removal was disabled. The machine was shared and CPU-heavy work was
serialized; dedicated isolation was not established.

The first candidate was the simpler nonpooled BCL `ArrayBufferWriter<byte>`,
already used elsewhere in the owner. It passed correctness but missed the
predeclared Unicode allocation goal (about 394648 B/op, limit 369504) and
increased small scalar allocations: direct 1696 to 2400 B/op and session
2088 to 2792 B/op. Its complete comparison/source/evidence remain **unselected**.
The selected existing pooled helper passed all seven unchanged goals.

Unchanged-path timings moved substantially and must not be attributed to the
changed method:

| Unchanged control | Pair2 time change | Pair3 time change | Pair2 original/candidate B | Pair3 original/candidate B |
| --- | ---: | ---: | ---: | ---: |
| SessionEmpty | 10.19% | 4.43% | 80/80 | 80/80 |
| ValueStringSmall | 20.30% | 14.93% | 888/888 | 888/888 |
| ValueString16K | -6.14% | 18.41% | 115745/115745 | 115745/115745 |
| ValueUnicode16K | -2.92% | -20.28% | 492615/492595 | 492626/492604 |
| ValueArray256 | 15.07% | 5.20% | 9056/9056 | 9056/9056 |
| ValueNested | 2.02% | 14.56% | 3592/3592 | 3592/3592 |

For example, selected unchanged small-string serialization was 20.30%/14.93%
slower; unchanged array serialization 15.07%/5.20% slower. Selected pair3
unchanged 16 KiB string serialization was 18.41% slower after pair2 was 6.14%
faster. Empty-session save remained 80 B/op but was 10.19%/4.43% slower.
The maximum observed outcome CV was **19.694%**. These control movements,
same-original variation and all confidence intervals/raw samples remain
visible; small timing differences are not evidence of a universal speedup.

## Requirement coverage

| Requirement | Evidence |
| --- | --- |
| Independent bytes survive later serialization and mutation | `JsonStoredDataSerializerTest.SerializeData_PreservesOwnedBytesAcrossSubsequentCalls` |
| Exact ordered/null/escaped/Unicode/typed output across small/4K/large inputs | `JsonStoredDataSerializerTest.SerializeData_PreservesLargeEscapedOutputAndPropertyOrder(length: 16)`, `(length: 4096)`, `(length: 131072)`; each exact row passed on original and selected |
| Actual throwing enumeration and writer-depth failure occur before storage, with same-producer recovery | `JsonStoredDataSerializerTest.SerializeData_PreservesFailureBeforeStorageAndRecovers(throwingEnumeration: True)` and `(throwingEnumeration: False)`; each reached its distinct expected exception on original and selected |
| Existing roundtrip/unsupported enum/SerializeValue/session removal contracts preserved | Six existing exact Facts listed in `tests/candidate2/execution.json` and all individual TRX results |
| At least 25% lower thread allocation for each pre-edit target | Seven original red resource rows; all35 selected target samples green against the unchanged goal-file SHA256 `39E5B55530387DBFB0F081615E335A6293A4C73F19A878321B3A552BE4010016` |
| Real browser storage/read/consume remains correct | Original and exact selected owner in canonical `BlazorWebAppPerPage`, static SSR/default Cookie TempData, real navigation ready/stored/read/consumed, exact 2688 UTF16-unit payload/hash and `int[]{7,11,19}`, framework JS200 and zero current-page errors |

These are preservation tests, not semantic tests that fail before an
optimization. The **resource** checks establish the red/green performance goal.
There were42 passing test-row executions total,0skips:6 original,12 extended
original,12 first-candidate and12 selected. The intervening nullable-disabled
test-file compilation failure (CS8632) ran no test and remains a failed attempt.

The managed serializer/provider owns this behavior; permanent tests extend the
existing TempData test class. The browser check is supplementary preservation,
not an interactive/WASM/Auto test or a browser-performance result. Its temporary
page, ephemeral Data Protection and owner endpoint are archived in the capsule,
then precisely removed from the source proposal; both own servers were stopped.

## Evidence and limits

- Exactly3/3 comparisons are closed: original/candidate1, original/candidate2,
  then candidate2/original. No fourth sweep.
- 168 BenchmarkDotNet outcomes,1344 retained results,504 workload warmups and3088
  actual retained overheads are recomputed from console+JSON, including
  per-case overhead medians, statistics and actual GC-byte rounding.
- 168 setup files link actual owner/harness identities and PID to the runtime
  record. Console markers echo **label and contract only**, not hashes/PID.
  There are252 complete diagnostic/preflight contracts and420 five-sample
  synchronous allocation calipers. Process-wide/thread counter differences are
  retained without attribution; caliper times are diagnostic only.
- Three frozen images each contain199 copied files/87 declared runtime assets.
  Only Endpoints DLL/PDB differ. Harness SHA256 is
  `3BC408A77E422B6C812DECEBEF40612680462BE78DA4FE98FB8FB1984427B199`;
  selected owner SHA256 is
  `43F6538579E82330A27B6CB20206A2F26E7B40DD1B55382F0EE17F0C1FDDC077`.
- Fourteen scoped current-default/baseline/working raw and canonical identities
  match at captured default `7c704fed602c54d174e5674aee7b2eefe57073c9`.
  This is not whole-default-build equivalence. Owner history traces to
  dotnet/aspnetcore#65483; related issue dotnet/aspnetcore#69136 is preserved.
- Twenty-five PDB **document/source checksum** checks are preserved. They do
  not establish PE-CodeView/PDB binding or executed-method coverage. Six-file
  owning-test images were captured, not complete test closures or in-test
  loaded-assembly markers.
- Raw DLL/PDB/binlogs/build images are omitted from this public capsule.
  Config/deps metadata, identities, sources, exact synthetic UTF8 `.bin`
  output fixtures, inputs, logs, commands, TRX, screenshots and measurements
  remain. The public audit cannot rehash omitted binaries or runtime files.
- Initial harness compilation, nullable test compilation, incompatible formatter
  flags, the initial auditor's too-broad console-marker schema and the initial
  packager's natural-exit-code assumption for stopped attached servers are retained
  as failed development attempts with executed sources where captured. The
  corrected audit did not change data or rerun a benchmark.

No cold-pool, retained-heap, concurrency/load, native-memory, exact runtime-pool
capacity, production-frequency or net application claim is established.
These are intentionally unverified boundaries before merge, not waived costs.
Keeping a fork draft parks reproducible component evidence without claiming
the allocation saving is free or merge-ready.

## Reproduce the analysis or replay fresh

The portable analysis needs Node and this capsule, not omitted binaries:

```powershell
node .\reproduce-analysis.mjs <absolute-path-to-this-F111-directory> --verify
```

It rehashes every authoritative copied artifact and recomputes all requested
rows, input/output fixtures, source deltas, resource goals, TRX identities,
PDB document checks, contracts, browser records and paired arithmetic.
It does not rerun timed code or independently recompute confidence critical
values. [validation-commands.md](validation-commands.md) lists the exact
historical commands **with actual exit results**, including failed attempts.

Fresh timing is a new experiment, not permission to extend this closed budget.
Use a separate clean checkout at the recorded baseline/selected commit, follow
that checkout's `docs\BuildFromSource.md` and Components instructions, activate
its SDK with `. .\activate.ps1`, and build the actual Endpoints owning tests
Release before building the external harness. The project accepts
`-p:AspNetCoreRoot=<absolute-checkout-root>` and requires the actual tested
Release dependencies; do not substitute installed ASP.NET Core owners.
It pins net12.0, runtime12.0.0-alpha.1.26562.105, BDN0.13.0,
C#13,x64,server/concurrent GC and roll-forward disabled.

Build the identical harness once, freeze complete independent execution images,
substitute only each measured Endpoints DLL/PDB, and check runtime/dependency
closure. Create a fresh shared fixture from the actual original with
`dotnet <original-harness.dll> --create-fixture <new-absolute-fixture-path>`.
Both variants must verify that same fixture before timing. The historical
freeze/build/measure scripts document the exact performed procedure and fixed
budget; they are guarded session scripts, not portable turnkey entry points.
