# F001: WebTransport shutdown wait retained;no justified local performance change

**Disposition: rejected/design-blocked,not a measured comparative no-gain.** The source-level synchronous wait exists. This investigation did not establish its disputed live-transport blocking precondition or a compatible local optimization. No shipping source edit,new source commit,candidate profile or performance PR was created. [Separate fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F001-webtransport-session-disposal) deliberately retains baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

The retained scan calls this a session Dispose path. The actual owner is `WebTransportSession.OnClientConnectionClosed`;the session has no Dispose method. It joins each actual `WebTransportStream.DisposeAsync`,then clears streams,completes pending readers and removes the session. That leaf awaits registration and pipe completion;it does **not** call `QuicStreamContext.DisposeAsync`.

## What actually ran

An unmodified in-tree Kestrel HTTP/3 SETTINGS/CONNECT handshake creates each session. Existing associated-stream helpers send the real variable-length WebTransport stream header;actual HTTP/3 parsing/association and public AcceptStreamAsync produce real WebTransportStream instances. EOF is produced by completing the actual CONNECT client pipe,not by injecting a cleanup callback. Real pending accept,stream directions,active pipe completion,owner dictionary and connection registry are observed. Separate input/output leaf disposal and public Abort controls also run.

The protocol cases0/1/16 pass;both separately observed actual leaf disposal ValueTasks completed synchronously. However,this in-memory transport leaves associated-stream ConnectionClosed uncancellable. It therefore does **not** reproduce contended cancellation-registration disposal or prove live QUIC waits harmless. Real System.IO.Pipelines/completion wrappers are exercised,but no live QUIC,production load,thread-pool starvation,lock contention or all-schedules claim is made.

Removing the wait by discarding a ValueTask,async-void or detached Task.Run would change completion/error ownership,not establish an equivalent optimization. A broader async lifecycle design remains unimplemented/unverified. This disposition is not proof that no such design could ever help.

## Original-only diagnostic benchmark

| Associated input streams | Original mean(us) | SD(us) | CV | Process-wide allocated B |
|---|---:|---:|---:|---:|
| 0 | 59.76 | 4.12 | 6.89% | 3232 |
| 1 | 80.66 | 20.03 | 24.84% | 3152 |
| 16 | 87.86 | 7.30 | 8.31% | 3648 |

**No candidate/comparison or improvement percentage exists.** One monitoring profile,three cases,one invocation per iteration,three warmups/eight retained results per case,DontRemove,settings-preserving emitted executor/Guid.Empty power. Requested100ms is job metadata,not a claim that each one-invocation sample lasted100ms. Prepared inputs use the real handshake/stream producer;the timed region is a cached bound call to the original OnClientConnectionClosed component,not a network-trigger latency measurement.

All24 retained samples/nine warmups/raw logs/GC records/full compressed JSON/CSV are retained under `measurements/original-diagnostic-only`. No overhead samples were produced by Monitoring. Memory is process-wide on this pinned runtime and can include channel/worker/fixture activity;it is not a pure per-thread disposal allocation or a before/after benefit. `investigation/bdn-memory-accounting/provenance.json` explicitly reuses the previously captured BDN0.13 GcStats source read/source hash and maps this explanation to the actual measured DLL identity;it is not a new F001 source fetch or runtime delegate instrumentation. These short single-call/shared-machine observations are diagnostic only.

## Requirement | Evidence

| Requirement | Evidence |
|---|---|
| Current source/history/documentation | `current-source-investigation.json`,`context-amendment.json`,all21 source triples,`docs/WebTransport.md`,original introduction dotnet/aspnetcore#42097 and cleanup dotnet/aspnetcore#69708.20/21 baseline/default files match;current Http3Stream frame reuse/request-path validation differ outside two exactly equal selected cleanup call neighborhoods. No full current-default integration run. |
| Existing owning correctness | `tests/original/webtransport-original.trx`:17 passed,0 failed,0 skipped. Exact `WebTransportSession_Closed_RemovedFromConnection` both rows,`WebTransportSession_ClosesProperly` all four,`WebTransportSession_LateAssociatedStreamDoesNotAbortConnection`,`WebTransportStream_StreamTypesAreDefinedCorrectly` all three,`WebTransportStream_WritingFlushingReadingWorks` and all handshake rows are GUID/duration checked by `reproduce-analysis.mjs`. |
| Actual protocol EOF | `characterization/original-prep2/states/*-protocol-eof.json`:0/1/16 actual associated streams,real pending accept ->null,stream directions closed,active pipe ends completed,owner streams/registered sessions ->0. |
| Actual leaf and opposite controls | `*-actual-input-leaf-disposal.json`,`*-actual-output-leaf-disposal.json`,`*-public-abort-control.json`;output path also independently asserts actual wire bytes40-54-00. Associated tokens are recorded uncancellable,not silently represented as live QUIC. |
| Original-only measurement fidelity | Three outcomes/24 retained/nine warmups,36 prepared+36 fully checked closed fixtures,seven physical assembly hashes per setup,six before/after Normal/Normal/affinity65535 records. These are point observations,not continuous OS tracing. |
| Source/image provenance | `149` frozen active image files;19 owner/protocol/pipe/harness source-PDB document checks. Not independent PE/PDB binding or method coverage. Failed first image/source retained;public package deliberately omits all DLL/PDB/native binaries. |
| No fabricated fix/gain | `final-evaluation.json`,closed `measurement-budget.json`:0/3 comparisons used,one original-only profile,no changed source shape,no PR. No global.json/shipping dependency manifests/TFMs/public APIs/assembly bridges or permanent tests changed. |

Two existing IncorrectHeadersRejects inputs have the same **truncated** discovery/TRX display name. The initial checker wrongly required unique display text and failed before tests ran. The same17-row discovery was continued without rediscovery;all17 unique runtime test/execution IDs passed once. The display-name multiset,source arguments and exact TRX are retained. The public TRX alone does not reconstruct which colliding display belongs to each source payload. Optional detailed VSTest host/protocol traces remain local,with omission hashes;no test names/data were changed.

Preparation1 reached actual session construction but failed resolving the enum under an incorrect namespace. The actual shared source declares System.Net.Http.Http3StreamType. Both original build attempts exited0;build1's two redundant missing-reference warnings are retained. Build2 removes that redundant reference(net12 already supplies Pipelines),fixes the exact type name,observes real EOF producer completion and records rather than mandates synchronous leaf completion;it has0 warnings. Preparation1's negative child exit/source/image manifest/log are retained. No completed test or benchmark profile was repeated.

## Reproduction and limitations

Run `node reproduce-analysis.mjs <absolute-capsule-path> --verify` to audit all published copies,source triples,fixtures,TRX identities/durations,PDB-document logs,raw measurements/statistics and settings records. The copied portable auditor was actually run before publication. It cannot rehash deliberately omitted DLL/PDB/runtime bytes,independently compute confidence critical values,prove in-memory equals live QUIC,or reconstruct unrecorded schedules. The live audit additionally rehashed the complete frozen image and the physical runtime identities captured at setup.

For a new experiment,checkout the baseline in a separate source tree,activate its locally pinned SDK,run the exact scoped existing test/build workflow,and restore/build the supplied net12/C#13/BenchmarkDotNet0.13 project against that actual owner/dependency output. Historical guarded scripts and [exact commands with actual outcomes](validation-commands.md) are evidence,not overwrite/replay instructions. Frozen binaries/private keys/certificates/build binlogs are not distributed.

Shared Windows VM,SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105. No deliberate power/priority/affinity/unrelated-process changes,max2 build nodes. No isolated-machine or production-frequency/application-wide performance claim.
