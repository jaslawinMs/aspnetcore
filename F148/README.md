# F148: bidirectional sample buffer pooling is not established

**No pooling change admitted; zero comparisons and no performance PR.** This
4 KB scratch array is allocated **once per bidirectional handler, outside its
read loop**, and reused for subsequent reads. Material real-client stream churn
and a lifetime-equivalent rental were not established. This is
`rejected` / `bidirectional-handler-pooling-material-benefit-unestablished`,
not measured no-gain, zero allocation, or proof that pooling cannot help.

The handler here is the **actual compiled sample**, not F146's source-extracted
unidirectional handler. F148 is a separate bidirectional allocation/lifetime
assessment, not an automatic duplicate. Neither the allocation reductions nor
the inconclusive timing in F147/F149 constitute evidence for buffer pooling.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator decision | [Acceptance](coordinator-acceptance.json), [closed budget](closed-budget.json) | Separate F148 scope; all three unused comparison authorizations permanently closed |
| Actual scratch ownership | [Original source](study/inputs/Original/Baseline/Program.cs), [default source](study/inputs/CurrentDefault/Baseline/Program.cs) | 4,096-byte allocation before the loop; slice to actual read length, reverse, awaited write, full-buffer clear |
| Faithful producer and assertions | [Executed fixture source](study/prepared/CompiledSampleProducerTests.cs) | Real HTTP3 parser/session acceptance; delegates execute actual sample DLL methods, not copied handler bodies |
| Existing native executions | [Original XML](study/results/Original-Baseline-functional-1/Original-Baseline-functional-1.trx), [default-owner XML](study/results/CurrentDefault-Baseline-functional-1/CurrentDefault-Baseline-functional-1.trx) | 20 passed case values per source role; existing evidence, not 40 newly executed or distinct tests |
| Selected compiled identity | [Historical complete audit](study/evidence/native-identity-acceptance-011.json), [copied bytes](authoritative-copies.json), [portable verifier](verify.mjs) | Three selected PE/PDB/raw-source associations freshly reparsed here; other historical pairs are explicitly not re-attested |
| Declared complete inventories | [Original sample](study/evidence/Original-Baseline-image.json), [default sample](study/evidence/CurrentDefault-Baseline-image.json), [common/runtime](study/common-identity.json) | 156 sample-image entries per role, 224 common and 197 runtime entries; omitted full images remain hash-only |
| Full immutable upstream study | [F147/F149 study](https://github.com/jaslawinMs/aspnetcore/blob/e3f5a048e12bcca5074266751afd07825359f88c/F147-F149/README.md), [closed tracking jaslawinMs/aspnetcore#187](https://github.com/jaslawinMs/aspnetcore/issues/187) | Complete builds, failed attempts, provenance, source history/docs and native checks retained; no comparison is replayed |
| Additive final linkage | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F148/publication.json) | Fork-only closed tracking issue, no PR or new browser window; fixed classified report unchanged |

## Producer and lifetime

The real managed `Http3InMemory` transport produces SETTINGS/CONNECT and stream
header `0x41` plus the session ID. Kestrel parses and publishes a real
`WebTransportStream`; `WebTransportSession.AcceptStreamAsync` returns it.
Reflection-created delegates then enter the actual compiled sample handlers.
No `session.AddStream`, fabricated accepted stream or injected acceptance callback
substitutes for the parser. Full sample startup, physical QUIC/MsQuic, TLS and a
browser were not executed.

The passed `CompiledSampleProducerTests` cases include
`ActualSample_SeparateWritesRetainStringsAndEchoOriginalBytes`,
`ActualSample_PayloadAbove4096TraversesRealReads`, and
`ActualSample_IndependentStreamIdsAndHandlerOwnership`, each with the actual
`bidirectional: True` row in both selected baseline reports. The latter creates
two real streams, sends exact different payloads to each and sends to the first
again, asserting distinct actual stream IDs and exact reversed response bytes.
The 9,000-byte case crosses the 4,096-byte read boundary. The reports also retain
the unidirectional and command/UTF8/session controls; their inclusion is not a
claim that every row directly tests F148's allocation.

The scratch memory remains live across `ReadAsync`, `ApplySpecialCommands` and the
awaited echo write. The handler reverses only the actual-read slice and clears
the **entire** scratch buffer afterwards. A rental would need the intended
4,096-byte bound even when a pool returns a larger array, equivalent clear
behavior, and return only after all uses end. Pending-read completion, EOF,
abort/fault/cancellation ordering and exactly-once return for a pooling candidate
were not validated. Existing teardown is not proof of those new semantics.

No material stream-creation frequency or real-client pooling benefit was
established. Repeating messages on one retained stream does not repeatedly incur
this scratch-array allocation. No alternative was written or benchmarked.

## Source, runtime and audit boundary

Original sample source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`;
the independently compiled default sample owner is
`90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`. Both are exercised under the same
Original common fixture/framework and actual runtime
`12.0.0-alpha.1.26557.102`. This is **default sample-owner only**, not the normal
whole-default framework/runtime. A separate closing main/blob observation in
the acceptance file checks target freshness without pretending a new rebuild.

`node .\verify.mjs` passes selected copied hashes, three fresh PE/PDB and raw
Document checksums, and all 40 historical native XML outcomes, identities,
counters and exact ownership/large-payload theory values. No .NET process,
producer execution, allocation counter or benchmark starts. The broader
immutable study also independently reconciled those rows with real
`System.Xml`; this thin follow-up does not repeat the native run.

Only selected bytes are copied. Complete-image metadata is preserved without
prefix exemptions, but omitted image/runtime/compiler inputs are not freshly
rehash-attested or a portable runnable distribution. Historical source and
fixture are evidence, not a pooling implementation or a verified performance fix.
