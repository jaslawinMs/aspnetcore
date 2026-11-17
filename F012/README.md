# F012: broadcast-exclusion snapshot declined; live-input behavior retained

**Rejected/design-blocked for an unvalidated per-send exclusion snapshot, not measured comparative no-gain.** The original repeated scan remains. No compatible shipping optimization, API/default/dependency/TFM/visibility change or permanent test was selected. The [independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F012-signalr-broadcast-exclusions) retains baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; it is not a performance fix. No speculative performance PR was created.

## Independent broadcast evidence

Actual public `DefaultHubLifetimeManager.SendAllExceptAsync` traverses the actual registered connection store, runs ordinary `JsonHubProtocol`/`System.Text.Json` serialization and writes through real `HubConnectionContext` instances. There is no copied private filter, overridden WriteAsync, fake serializer or manually invoked serialization callback. F011 group-send observations/timings are **not** reused as broadcast evidence.

With eight actual connections and 16 initially missing exclusions, a real serialized argument property getter replaces eight entries with actual IDs during the first serialization. The unchanged broadcast owner delivers a valid invocation to **exactly one** connection, then observes the changed exclusions for later recipients. This occurs independently for an array, List and read-only wrapper over mutable backing. Reference/count remain unchanged; array/wrapper IsReadOnly does not establish immutable contents. The recipient's identity/order is not assumed.

Explicit pre-send Ordinal HashSet-to-array copied-input controls, passed to the **unchanged owner** before that same real JSON getter executes, deliver to **all eight**. A custom ICollection implementation separately shows native OrdinalIgnoreCase Contains called twice with zero enumerations and only `other` receiving a frame; the explicit Ordinal copied-input control enumerates once before sending and delivers to both `CONNECTION` and `other`.

These are **input-semantics controls, not a compiled indexed owner, red/green optimization or timing comparison**. Other ownership/versioning/immutable-input-specific or compatible local designs remain unimplemented/unverified; this is not proof that all optimizations are impossible.

All 17 broadcast contract/producer checks and 12 actual timed-wrapper paths execute independently under both original and actual captured-default JSON source. Only JSON DLL/PDB differ between the two 80-file consumer images; the owner, harness and other 78 files are identical. The current source adds direct Dictionary enumeration for nonempty message headers; actual lifetime-manager invocations have no headers. This uses baseline SDK/dependencies, not a whole-current-default build.

## Original-only diagnostics on this box

| Original shape | Mean ns | SD ns | CV | Retained N | Process-wide B/op |
|---|---:|---:|---:|---:|---:|
| NoConnections512 | 100.538 | 4.765 | 4.74% | 8 | 64 |
| OneEmpty | 351.863 | 4.276 | 1.22% | 8 | 312 |
| Small4List2 | 632.126 | 3.833 | 0.61% | 8 | 312 |
| C32List64 | 5273.766 | 20.789 | 0.39% | 7 | 312 |
| C32Array64 | 7483.717 | 13.447 | 0.18% | 7 | 312 |
| C32ReadOnly64 | 5320.175 | 12.335 | 0.23% | 8 | 312 |
| C128List256 | 44506.250 | 303.592 | 0.68% | 8 | 314 |
| C128Array256 | 78244.988 | 220.982 | 0.28% | 8 | 316 |
| C32AllList | 2860.656 | 16.531 | 0.58% | 8 | 64 |
| C32AllArray | 3433.331 | 16.425 | 0.48% | 7 | 64 |
| C32HalfList | 3504.898 | 9.052 | 0.26% | 7 | 312 |
| C32DupList64 | 9964.256 | 18.068 | 0.18% | 7 | 313 |

**One independently executed original-only profile, 12 inputs, zero candidate profiles/paired comparisons. No improvement percentage or comparison with F011's different group-send path.** Configured connection/exclusion sizes are scaling diagnostics, not established typical traffic.

Connection registration occurs before timing, without group creation. Operations perform the real public broadcast send, per-send JSON serialization and synchronous writes into fixed **256-byte** per-connection buffers. Minimal call/frame/byte counters remain timed; full wire/JSON assertions run outside timing. Cleanup checks exact recipient/frame/byte counts and final wire contents. No unbounded Pipe growth is timed. Network, handshake, connection creation, stateful reconnect, production frequency and end-to-end application improvement are not measured. Actual Pipe backpressure/completion/cancellation are characterized separately, untimed.

BDN0.13 throughput, requested100ms, three warmups/eight actual iterations, unroll1, default upper-outlier filtering. All **96 raw samples, 91 retained results, five upper-filtered samples, 36 warmups and 223 actual overheads** remain, including raw eight-sample means in `analysis.json`. No benchmark validation warning section was printed. The first empty-store case's 4.74% CV is retained, not rerun or hidden.

Allocation is **process-wide** on pinned net12, not isolated membership/serializer/transport/enumerator allocation. In particular, 64B for empty/all-excluded broadcasts and 313/314/316 versus312B must not be assigned to an isolated cause from this profile. `investigation/bdn-memory-accounting` attributes the prior GcStats observation through F011/F008/F007/F006/F002 and verifies the identical actual BDN DLL hash. No new upstream fetch, independently established BDN source/binary binding or direct delegate instrumentation is claimed.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Broadcast scope/case/duplicates, not group scope | `BroadcastScopeCaseAndDuplicates`: four registered connections, only three grouped; native broadcast delivers to the two nonexcluded case variants **and the outside-group connection**. |
| Empty/all-excluded laziness and shared serialization | `EmptyConnectionStoreDoesNotReadInput`, `AllExcludedDoesNotSerializeCanceledSend`, `JsonPayloadSerializedOnceForAllRecipients`: no exclusion/getter reads when empty, no serialization/canceled writes when entirely excluded, one actual JSON serialization for multiple recipients. |
| Native live input and comparison dispatch | `LiveArrayMutationAtJsonGetter`, `LiveListMutationAtJsonGetter`, `LiveReadOnlyWrapperMutationAtJsonGetter`, their three `SnapshotInputControl*` controls, `CustomCollectionContainsDispatch`, `SnapshotInputControlCustomDispatch`. All independently pass under both actual producers. |
| Actual repeated scanning | `RepeatedMissEnumerationC1E1`, `RepeatedMissEnumerationC8E16`, `RepeatedMissEnumerationC32E64`: untimed instrumented input yields1/128/2048 values on actual broadcasts, Count/indexer reads0. Instrumentation is never timed. |
| Real pending transport effects | `PendingWritesWaitForEveryPipe` and `PendingWritesCancelThroughActualPipes`: two actual Pipes; no completion until both drain, cancellation propagates without connection abort, valid bytes observed. No sleeps/injected manager callbacks. |
| Existing owning coverage, explicitly reused | Exact byte-identical **F011** original owner/test evidence: 27 passed,0 failed/skipped; 23 Facts including12 inherited specification Facts plus all four `SendConnectionsAsyncWritesOnceToSpecifiedConnections` Theory rows. Includes `SendAllExceptAsyncWillCancelWithToken`. Original commands/timestamps/TRX retained; **zero new F012 owning-suite runs**, not the whole SignalR test project. All six copied tested DLL/PDBs rehashed. |
| New F012 execution and identity | First standalone restore/build and both complete producer characterizations pass; build0warnings/errors. All12 actual timed Setup/send/cleanup paths per producer plus12 timed cleanups:34 producer/36 setup/36 validated benchmark records. Two80-file images/89 snapshots each; live audit rehashes160 image files/178 snapshots, checks19 bounded PE/PDB bindings/52 selected documents/24 unchanged settings point records. |
| Source/history/current default | Fresh20 selected source triples at `49147673007a4b1d676694e2c5f85b83ad76c36f`:19 canonically equivalent and exact JSON delta retained. Fresh owner history/open exact-symbol PR search; bounded search is not complete absence proof. SDK inputs differ; no whole-current-default integration. |
| Honest outcome and budget | Closed `measurement-budget.json`, `candidate-selection.json`, `final-evaluation.json`: no indexed implementation/source fix/gain or performance PR; one original-only profile, zero comparisons and no additional F012 timing. |

The original owner and test binaries/sources and exact current JSON DLL/PDB are explicitly reused/rehashed from F011, not freshly rebuilt or relabeled. Current-default revision remains identical, and new F012 source/PE/PDB witnesses and every F012 broadcast control run again against those bytes. Repository original JSON outputs remain byte-exact and were not overlaid or modified. Those provenance reuses do not reuse group-send behavior or timing.

David Fowler's merged [dotnet/aspnetcore#69189](https://github.com/dotnet/aspnetcore/pull/69189) changes adjacent small-target SendConnectionsAsync, not SendAllExceptAsync. Its actual prior metadata/full diff/body are retained with exact attribution; no upstream numbers reused. F013 targeted sends and F014 user membership remain independent.

## Preparation and reproducibility

The first final investigation-metadata writer passed an absolute path to a relative-path helper, producing an invalid nested Windows drive path. Exact first source, console, negative exit and partial captures remain. The corrected reader resumes only on the same baseline branch and requires every existing capture to be byte-identical.

The first audit-scaffold reader expected LF but its actual template had540 CRLF line endings; its exact source and observed failure metadata remain. That initial tool stderr was not redirected into a separate artifact file. The corrected template working string normalizes LF, its successful execution is logged, and original F011 source/raw observations are unchanged. Neither reader failure is a product/measurement failure. The first new harness build, both native characterizations, extraction and independent live audit pass. No completed owning-suite/profile rerun.

Run `node reproduce-analysis.mjs <absolute-capsule-path> --verify` to audit raw copies, source triples, all27 explicitly reused TRX rows/theory payloads, native broadcast/getter/recipient/Pipe records, source/PDB witness consistency, host settings, all raw timing/GC records and independent sample-statistics/R7-quantile/confidence-bound arithmetic. The copied portable auditor is executed before publication. It cannot rehash deliberately omitted DLL/PDB/binlogs, replay absent PE/PDB bindings, independently derive confidence critical values or establish unrecorded schedules/production frequency.

For a **new** experiment, use a separate baseline source tree, activate its pinned SDK from the repository root with `. .\activate.ps1`, run the documented scoped owner/test workflow and build the supplied net12/C#13/BDN0.13 project using its `AspNetCoreRoot` property. See [exact historical commands and observed outcomes](validation-commands.md), which distinguishes borrowed F011 commands from new F012 execution. Guarded historical drivers are evidence, not instructions to overwrite completed experiments/reopen this budget. Binaries/bin/obj/binlogs omitted with hashes; runtimeconfig/deps retained separately.

Shared Windows VM, SDK `12.0.100-alpha.1.26557.102`, runtime `12.0.0-alpha.1.26562.105`; settings-preserving emitted executor/Guid.Empty power policy, maximum two build nodes. No deliberate power/priority/affinity/unrelated-process changes, dedicated-machine or general application-speedup claim.
