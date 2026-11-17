# F002: WebTransport stream removal wait retained;actual native FIN path verified

**Rejected/design-blocked,not a measured comparative no-gain or proven false positive.** The synchronous join in `WebTransportSession.TryRemoveStream(long)` and its real transport callback exist. This investigation establishes ordinary native FIN-driven removal,not a contended-registration/incomplete-disposal latency problem or an equivalent local optimization. No shipping source edit,new source commit,candidate profile or performance PR was created. The [independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F002-webtransport-stream-removal) retains baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

This is distinct from F001's session-close traversal. TryRemoveStream removes one dictionary entry,joins that stream's DisposeAsync and returns its Boolean result. The known real caller is the WebTransportStream constructor's ConnectionClosed registration. Removing the join with discarded work,async-void or detached Task.Run changes cleanup completion/error ownership. No broader asynchronous lifecycle redesign was implemented;this is not proof that one could never help.

## What actually ran

**Real native producer:** an actual in-tree QuicTransportFactory binds an ephemeral loopback endpoint. The actual System.Net.Quic peer opens a unidirectional stream and sends the real WebTransport type/session header40-54-00. An existing HTTP/3 parent performs real SETTINGS/CONNECT and actual associated-stream parsing/acceptance. The peer sends FIN;the real QuicStreamContext receive/send processing cancels its genuine ConnectionClosed token. Before any direct TryRemoveStream invocation,the accepted WebTransport stream is automatically removed,its input pipe is completed,and the owning session/pending accept remain open. A subsequent direct removal returns false without changing those states.

**Boundary:** this is a hybrid lower-boundary control:real loopback QUIC/TLS/native stream/cancellation,with an **in-memory HTTP/3 parent**,not a complete network HTTP/3 connection. As in QuicTestHelpers,the required heartbeat feature records registration only;the probe does not drive heartbeat/pool-expiry callbacks. It does not establish a contended cancellation-registration schedule,incomplete disposal,thread-pool starvation,production frequency or all-schedules-harmless behavior.

**Component controls:** four separately prepared real sessions cover a missing ID,one accepted input,one of16 inputs and actual server output. Each successful direct removal closes only its target and active pipe,returns true,retains other streams/session/pending accept,and a repeated removal returns false. Real CONNECT input EOF subsequently closes the remaining owners. A separate public Abort opposite control passes. These in-memory component streams have uncancellable ConnectionClosed tokens;their direct invocation is not substituted for the separate native producer proof.

## Original-only diagnostic

| Case | Original mean(us) | SD(us) | CV | Process-wide allocated B |
|---|---:|---:|---:|---:|
| Missing | 7.350 | 1.763 | 23.99% | 1968 |
| InputOne | 29.212 | 9.587 | 32.82% | 2352 |
| InputSixteen | 24.663 | 3.936 | 15.96% | 24 |
| OutputOne | 24.950 | 3.626 | 14.53% | 2448 |

**No candidate,comparison or improvement percentage exists.** One profile,four cases,one invocation/iteration,three warmups/eight retained results each,Monitoring/DontRemove,settings-preserving emitted BenchmarkDotNet0.13 executor and Guid.Empty power. Requested100ms is job metadata,not a claim that these one-call samples lasted100ms. The timed region is a cached bound call to the original component plus a Boolean result store;it is **not native FIN-to-removal latency**.

All32 retained results/12 warmups/raw logs/GC records/full compressed JSON/CSV are preserved. No overhead samples were produced. At most three comparisons were allowed;zero were used and the budget is closed. Maximum observed CV=32.82%;all unfavorable samples remain. These short single-call/shared-machine observations are diagnostic only.

On the pinned runtime,BDN0.13's available GC.GetTotalAllocatedBytes(precise:true) accounting is process-wide. Worker/channel/fixture activity can contribute;the allocation column is not pure per-thread removal cost or a before/after benefit. The exact previously captured upstream GcStats source and its original F118 capture/F001 identical-assembly provenance are explicitly borrowed,not fetched anew or independently bound to assembly behavior here.

## Evidence

| Requirement | Evidence |
|---|---|
| Current source/history/documentation | `current-source-investigation.json`,`context-amendment.json`,28 baseline/default/working source triples,actual targeted history/docs/search outputs.27/28 files are baseline/default equivalent;Http3Stream frame reuse/request-path changes remain outside two equal selected cleanup call neighborhoods. No full current-default integration execution. |
| Native FIN producer | `native-quic/attempt6/states/*-native-associated-before-fin.json` and `*-native-fin-automatically-removed.json`:actual native target6,cancellable tokens,real FIN,processing completion,automatic target closure/removal before a direct call,session/pending accept retained. Managed QUIC and actual msquic.dll physical hashes captured and rehashed by the live audit. |
| Component and opposite controls | `characterization/original-prep6/states`:four removal/repeat/real CONNECT EOF cases plus public Abort;actual output wire header also asserted. Direct component invocation is labeled as such. |
| Existing owning tests | `tests/borrowed-F001`:17 exact passing rows,0 skipped,**0 new existing-test executions**. Original source identities and97-file test image match;actual TRX GUIDs/durations/discovery multiset independently checked. |
| Source/image witnesses | `151` frozen active image files;26 source/PDB document witnesses:16 exact borrowed F001 owner checks,2 earlier fresh F002 QUIC checks and8 fresh final F002 checks. All3 old F001 harness witnesses are excluded. Not independent PE/PDB binding,complete build provenance or method coverage. |
| Profile fidelity | Four outcomes/32 retained/12 warmups,48 prepared+48 checked removal fixtures,seven physical assembly identities/setup,eight Normal/Normal/affinity65535 before/after records. Point observations,not continuous OS tracing or isolated-machine evidence. |
| No fabricated fix/gain | `final-evaluation.json`,closed `measurement-budget.json`:one original-only profile,0/3 comparisons,no changed source shape/candidate/PR. No shipping API/default/dependency/TFM/visibility/permanent-test change. |

Two borrowed existing header-test inputs share truncated discovery/TRX display text. All17 runtime test/execution IDs are unique. The original F001 discovery-checker failure and corrected original execution evidence remain explicitly borrowed;they are not newly executed F002 tests. Public TRX does not reconstruct which colliding display belongs to each source payload. Original optional detailed F001 VSTest host/protocol traces remain local;the exact TRX and test evidence copied here are intact.

## Preserved preparation failures

Build1 failed CS0122 because QuicTransportFactory is internal. The standalone probe constructs that existing implementation reflectively and thereafter uses the public listener-factory contract;no shipping accessor/IVT/public bridge was added. Builds2 through6 passed with0 warnings.

Five actual native attempts are retained(numbered2 through6;build1 never produced an executable image). Native2/3/4 failed TLS before association/FIN assertions. Native4's structured concurrent server accept exposed the actual server exception:the platform does not support ephemeral keys. Reusing the owning tests' existing TestResources certificate/PFX-import/global-mutex helper resolved that preparation;no stores/global configuration were edited. Native5 then passed TLS but failed during alignment-stream disposal because the required heartbeat feature was missing. Native6 follows the owning QuicTestHelpers registration-only feature pattern and reaches every named native FIN assertion. All failed source snapshots/image manifests/logs/actual exits are preserved. No callback was injected and no successful profile or existing-test execution was repeated.

## Reproduction and limits

Run `node reproduce-analysis.mjs <absolute-capsule-path> --verify` to audit the published copies,source triples,TRX identities/durations,PDB-document witnesses,component/native states,raw profile/statistics/settings and preserved failures. The copied portable auditor was actually run before publication. It cannot rehash deliberately omitted binaries/runtime bytes,rerun the native producer offline,independently compute confidence critical values or establish unrecorded schedules. The live audit additionally rehashed the complete frozen active image,captured physical managed runtime/QUIC identities and msquic.dll.

For fresh execution,checkout baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` in a separate source tree,activate its locally pinned SDK,and follow its documented Kestrel test/build workflow. The supplied net12/C#13/BDN0.13 project accepts `TestImage` and `QuicImage` MSBuild properties pointing at actual rebuilt source-matching outputs. Follow the dependency-copy/conflict checks in `historical-build-harness.ps1` before execution;reflection-loaded test dependencies are not all project references. Run modes `--characterize`,`--native-quic` and `--benchmark` each require a **new** evidence directory. Native mode runs from the baseline repository root to locate the existing owning test-certificate fixture. Historical guarded scripts and [exact commands with actual outcomes](validation-commands.md) document this execution,not overwrite/replay instructions. DLL/PDB/build images/private keys/certificates/binlogs are not distributed.

Shared Windows VM,SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105. No deliberate power/priority/affinity/unrelated-process changes,max2 build nodes. No complete runtime-host inventory,production-load or application-wide performance claim.
