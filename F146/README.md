# F146: useful pooling unestablished for a WebTransport sample buffer

**No pooling change admitted; zero comparisons and no performance PR.** The source allocates its 4 KB scratch array **once per accepted unidirectional handler, outside the read loop**, and reuses it across reads. It is not a new allocation per message. Useful pooling under material real-client stream churn was not established for this sample, and the proposed ownership/lifetime change was not implemented or validated.

Classification is `rejected` / `sample-workload-pooling-benefit-unestablished`, **not measured no-gain, zero allocation, a disproven allocation mechanism or proof that pooling cannot help**. The managed stream producer is real; the executed handler was source-extracted, not the compiled sample owner.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator scope/disposition | [Acceptance](coordinator-acceptance.json), [closed zero-comparison budget](closed-budget.json) | Original 632-file payload and unchanged older 100-file payload independently verified; no candidate or timing |
| Complete historical handoff | [Executable handoff](owner-handoff/HANDOFF.md), [executable acceptance](owner-handoff/EXECUTABLE-ACCEPTANCE.md), [actual results](owner-handoff/EXECUTABLE-RESULTS.json), [complete original manifest](owner-handoff/MANIFEST.json) | The executable continuation supersedes only old unrun status, not its retained historical provenance |
| Six actual producer XML rows | [Original XML](owner-handoff/results/Original/attempt1/F146-Original-rt57-attempt1.trx), [observed-default XML](owner-handoff/results/ObservedDefault/attempt1/F146-ObservedDefault-rt57-attempt1.trx), [exact row checks](owner-handoff/TRX-ROW-CHECKS.json), [independent XML parser](audit-native-xml.ps1) | Three exact passed rows per pin; every row contains real managed HTTP3 SETTINGS/HEADERS/input-stream traces |
| Executed test and sample extraction | [Real producer tests](owner-handoff/prepared/F146ManagedProducerTests.cs), [Original extracted handler](owner-handoff/prepared/Original/F146SampleHandler.cs), [default extraction](owner-handoff/prepared/ObservedDefault/F146SampleHandler.cs) | Actual pending-stream/session/accept/pipe producer; no mocked stream or injected acceptance callback; handler resides in InMemory.FunctionalTests, not sample DLL |
| Raw selected compiled-source proof | [All twelve raw copies and associations](raw-compiled-source-associations.json), [historical PDB checks](owner-handoff/PDB-SOURCE-OWNER-CHECKS.json), [historical physical/LF distinctions](owner-handoff/SOURCE-TEXT-AND-RAW-IDENTITIES.json) | Eight managed-producer documents plus four test/extracted-handler documents matched raw compiled PDB checksums; not full compiler attestation |
| Full actual image inventories | [Original 224 entries](owner-handoff/Original-complete-output-image-after-run.json), [default 224 entries](owner-handoff/ObservedDefault-complete-output-image-after-run.json), [complete gate result](owner-handoff/COMPLETE-IMAGE-AUDIT.json), [all omitted hashes](omitted-file-hashes.json) | **61 non-sample-owner differences**, independently compiled test harnesses and missing compiled sample owner correctly prohibit causal comparison; no fixture-prefix exception |
| Exact commands, actual runtime and failures | [Every command/exit code](owner-handoff/EXACT-COMMANDS-AND-EXIT-CODES.json), [runtime selection](owner-handoff/RUNTIME-SELECTION.md), [Default analyzer prerequisite](owner-handoff/DEFAULT-ANALYZER-PREREQUISITE.md), [language boundary](owner-handoff/BUILD-LANGUAGE.md) | Explicit runtime 57 inside all six test rows; failed runtime62 restore and Default analyzer failure/correction retained, not full CI validation |
| Materialization and terminal-state boundaries | [Archive/input limits](owner-handoff/SOURCE-ARCHIVE-RAW-CHECKS.json), [recorded final owned PID check](owner-handoff/FINAL-OWNED-PID-CHECK.json), [coordinator verification](coordinator-whole-payload-verification.json), [older manifest](older-preparation-manifest.json) | Incomplete full-tree identity/missing Unicode file outside producer retained; all observed owned processes terminal, not exhaustive child sampling or PID-slot reuse conflation |
| Copy integrity and final linkage | [Copied hashes](authoritative-copies.json), [portable historical auditor](verify.mjs), [immutable core](capsule-file-hashes.json), [additive verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F146/publication.json) | Closed tracking issue; no performance PR/new window; fixed classified report unchanged |

## Faithful boundary and results

The existing `Http3InMemory` multiplexed transport generates SETTINGS, CONNECT, unidirectional stream-type and session-ID bytes. Real source-built Kestrel pending-stream parsing produces the actual `WebTransportStream`, session publication and `AcceptStreamAsync` acceptance. The exact extracted sample handler reads that real pipe; received decoded strings are asserted. The probe does not call `session.AddStream`, mock streams or inject the acceptance callback.

All three exact `Microsoft.AspNetCore.Server.Kestrel.Core.Tests.F146ManagedProducerTests` methods passed on both source pins:

| Method | Material observation |
|---|---|
| `ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler` | Two separately written/received exact strings through one real accepted readable/non-writable stream |
| `ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads` | Exactly 9,000 characters, at least three nonempty chunks, no chunk larger than 4,096 |
| `ManagedHttp3_IndependentInputStreamsReachIndependentHandlers` | Independent exact payloads through two accepted handlers and distinct real stream IDs |

Each test's actual source asserts the loaded source-built Kestrel.Core path/hash and exact runtime-directory version. Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; observed default is `ae89581dfd24c6277b4267a9779d05f7b9f047f1`. Both used explicit `12.0.0-alpha.1.26557.102`, not runtime62 or private68. Later default target identity was checked separately without claiming a later complete rebuild.

The compiled sample assembly, full sample startup, native QUIC/MsQuic, TLS and browser were **not** exercised. The source-extracted handler is compiled into `InMemory.FunctionalTests.dll`; Kestrel.Core owns the managed producer, **not the proposed sample allocation change**. These six passed rows establish this boundary only, not a verified pooling fix.

## Lifetime and retained limitations

The source buffer remains owned across tokenless `ReadAsync` and awaited `ApplySpecialCommands`. A rental would need the exact 4,096-byte slice and a whole-handler `finally`; token notification alone does not establish that a pending read completed. Pool return/clearing, pending-read cancellation, EOF, special commands and exceptional console/decode paths remain unverified. The test teardown aborts owned inputs and awaits handlers; it is not a general cancellation test.

Missing generated props, uncached ILLink62, dependency preview-language requirements, the artifact language guard and the Default AD0001 prerequisite failure are preserved. The Default retry explicitly disabled diagnostic analyzers while compilation/source generation remained enabled: **not full CI/analyzer validation**. The whole archive-materialization audit was incomplete and found a missing expected Unicode filename outside the tested boundary; no full-tree identity or unrelated repair is claimed. Historical LF snapshots are not confused with raw Windows source/PDB checksum bytes.

## Historical audit

With existing Node.js and PowerShell 7 (`pwsh`):

```powershell
node .\verify.mjs . --require-seal
pwsh -NoLogo -NoProfile -File .\audit-native-xml.ps1 -Root .
```

**Passed:** selected copied file hashes against the original manifest; each of six exact XML outcomes and real frame traces; twelve newly copied raw source checksums against historical compiled-document receipts; all 224 original/default image entries and correctly rejected 61-difference causal pair; original/older manifest identities and recorded terminal state. No .NET build/test/host, producer rerun, allocation counter or benchmark starts.

Public selection omits 448 executed-image binaries, two full source archives and two machine-local CLI-home cache files, preserving all 452 individual hashes. Native private prerequisite graphs remain external; the portable audit does not freshly parse omitted PE/PDB/runtime binaries or re-attest every compiler input. Ordinary test/build duration text remains raw and is not adopted as measurement.

The first coordinator receipt had a literal `\n` appended after otherwise valid JSON and failed parsing. Its [raw invalid envelope](coordinator-receipt-original-invalid-envelope.txt) is retained; the [additive corrected envelope](coordinator-whole-payload-verification.json) preserves the actual successful audit output and records the serialization correction. The original `Audit007` verification, native producer and measurements were not rerun to repair that envelope.

No material real-client churn, useful pooling or lifetime-equivalent candidate was established. The zero-of-three comparison budget is permanently closed; this is not an empirical no-gain result.
