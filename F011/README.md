# F011: group-exclusion snapshot declined; live-input behavior retained

**Rejected/design-blocked for an unvalidated per-send exclusion snapshot, not measured comparative no-gain.** The original repeated membership scan is real and remains. No compatible shipping optimization, API/default/dependency/TFM/visibility change or permanent test was selected. The [independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F011-signalr-group-exclusions) deliberately retains campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; it is not a performance fix. No speculative performance PR was created.

## Decisive owner and producer evidence

The harness registers and groups actual `HubConnectionContext` instances through public lifetime-manager methods, then calls actual `DefaultHubLifetimeManager.SendGroupExceptAsync`. Ordinary `JsonHubProtocol`, `System.Text.Json`, `SerializedHubMessage` caching and the actual connection write path run normally. It does not override `WriteAsync`, copy the owner filter, invoke the serializer callback manually or replace the protocol.

| Actual input/control | Observed transport effect |
|---|---|
| Same 16-element array; a real JSON-serialized argument getter replaces eight entries with actual connection IDs during the first serialization | Exactly one of eight connections receives a valid invocation; subsequent group members observe the new exclusions |
| Same mutation in a List | Exactly one recipient |
| Same mutation through a read-only wrapper over its mutable backing List | Exactly one recipient despite wrapper `IsReadOnly=true` |
| Explicit pre-send HashSet-to-array copy passed to the unchanged owner, followed by that same real JSON getter mutation | All eight receive valid invocations |
| Custom IReadOnlyList/ICollection with OrdinalIgnoreCase Contains | Native owner calls Contains twice, enumerates zero times and sends only to `other` |
| Explicit Ordinal snapshot-input control for that custom collection | One pre-send enumeration, zero Contains calls and delivery to both `CONNECTION` and `other` |

These are **input-semantics controls, not a compiled indexed owner, red/green optimization or timing comparison**. Actual recipient identity/order is not assumed for the single-recipient case. The property getter executes once through real JSON serialization. Input reference/count remain unchanged; generic array `IsReadOnly` and read-only wrappers do not establish immutable contents. A snapshot therefore needs a genuine ownership/invalidation contract. Other compatible designs remain unimplemented/unverified; this does not prove that every optimization is impossible.

Both original and actual captured-default JSON source produce these results. The latter is compiled into an otherwise identical 80-file consumer image: only the JSON DLL/PDB differ, all other 78 files and the owner/harness are identical. Its source adds direct Dictionary enumeration for nonempty message headers; the lifetime-manager-created invocation has no headers. This bounded producer substitution uses baseline SDK/dependencies, **not a whole-current-default build**. Original repository JSON DLL/PDB outputs were restored byte-exact afterward.

Additional actual-owner controls preserve case-sensitive group scope, duplicate exclusions, missing-group input laziness, all-excluded serialization/cancellation laziness and one real JSON serialization for multiple recipients. Two real Pipes independently establish pending writes, completion only after both are drained, and cancellation without connection abort. No sleeps or injected manager callbacks are used.

Untimed instrumented input establishes the real miss-path scan: group/exclusion dimensions **1x1, 8x16 and 32x64** cause **1, 128 and 2048** yielded exclusion values, respectively; Count/indexer reads remain zero. That collection is never timed.

## Related work

David Fowler's merged [dotnet/aspnetcore#69189](https://github.com/dotnet/aspnetcore/pull/69189), "Improve SignalR hot paths and add regression benchmarks," changes the adjacent **SendConnectionsAsync** path for at most 16 targets. Its actual owner diff retains the old scan for larger target lists and does **not** change SendGroupExceptAsync. Full metadata/diff and owner history are retained. No upstream timing numbers were reused, and F012 broadcast exclusions, F013 targeted sends and F014 user membership remain independent findings.

## Original-only diagnostic results

| Original shape | Mean ns | SD ns | CV | Retained N | Process-wide B/op |
|---|---:|---:|---:|---:|---:|
| NoGroup512 | 5.743 | 0.030 | 0.53% | 8 | 0 |
| OneEmpty | 261.840 | 7.243 | 2.77% | 8 | 248 |
| Small4List2 | 536.621 | 6.664 | 1.24% | 7 | 248 |
| G32List64 | 4584.769 | 11.693 | 0.26% | 8 | 248 |
| G32Array64 | 6882.311 | 22.042 | 0.32% | 7 | 248 |
| G32ReadOnly64 | 4971.806 | 11.482 | 0.23% | 7 | 248 |
| G128List256 | 41935.420 | 137.187 | 0.33% | 7 | 250 |
| G128Array256 | 80110.515 | 1242.382 | 1.55% | 7 | 252 |
| G32AllList | 2009.103 | 5.596 | 0.28% | 7 | 0 |
| G32AllArray | 3092.422 | 6.802 | 0.22% | 8 | 0 |
| G32HalfList | 2747.239 | 16.539 | 0.60% | 7 | 248 |
| G32DupList64 | 8741.924 | 45.681 | 0.52% | 6 | 248 |

**One original-only profile, 12 inputs, zero candidate profiles or paired comparisons; no improvement percentage.** These are different configured original inputs, not before/after roles. The configured 32/128-member and 64/256-exclusion shapes are scaling diagnostics, not established typical traffic.

Connections/group registration happen before timing. Each operation performs the real public group send, per-send JSON serialization and synchronous writes into fixed **256-byte** per-connection buffers. Minimal call/frame/byte counters remain in the timed path; full frame/JSON assertions run outside it. Cleanup validates every expected recipient's exact frame/byte counts and final wire contents. No unbounded Pipe growth is timed. Network, handshake, connection creation, stateful reconnect, production frequency and end-to-end application improvement are not measured. Async/backpressure/cancellation are characterized separately, untimed.

BDN 0.13: throughput, requested 100 ms, three warmups/eight actual iterations, unroll 1, default upper-outlier filtering. All **96 raw samples, 87 retained results, nine upper-filtered samples, 36 warmups and 227 actual overheads** remain, including raw eight-sample means in `analysis.json`. No benchmark validation warning section was printed; filtered observations are still explicitly retained and independently reconciled rather than hidden.

Allocation is **process-wide** on pinned net12, not isolated owner/lookup/serializer/transport allocation. The 250/252 versus 248 B/op observations must not be attributed to an isolated membership allocation. `investigation/bdn-memory-accounting` attributes the prior GcStats source observation through F008/F007/F006/F002 and checks the identical measured BDN DLL hash. This is not a new upstream fetch, independently established BDN source/binary binding or direct delegate instrumentation.

## Requirement coverage and exact boundary

| Requirement | Evidence |
|---|---|
| Default/history/docs and independent source | `current-source-investigation.json`: 21 baseline/working/captured-default triples, 20 canonically equivalent and the exact JSON source delta retained at `49147673007a4b1d676694e2c5f85b83ad76c36f`. SDK inputs differ; no whole-default SDK integration claim. |
| Existing owning coverage | All 27 discovered `DefaultHubLifetimeManagerTests` rows passed, zero failed/skipped: 23 Facts, including 12 inherited specification Facts, plus all four `SendConnectionsAsyncWritesOnceToSpecifiedConnections` Theory payloads. Exact TRX result/definition/entry identities and positive durations audited. This is not the whole SignalR test project. |
| Real live-input/dispatch contracts | `LiveArrayMutationAtJsonGetter`, `LiveListMutationAtJsonGetter`, `LiveReadOnlyWrapperMutationAtJsonGetter`, the corresponding `SnapshotInputControl*` controls, and `CustomCollectionContainsDispatch`/`SnapshotInputControlCustomDispatch` pass with both actual JSON producer versions. |
| Laziness, scope and shared serialization | `GroupScopeCaseAndDuplicates`, `MissingGroupDoesNotReadInput`, `AllExcludedDoesNotSerializeCanceledSend` and `JsonPayloadSerializedOnceForAllRecipients` pass with both producers. |
| Real scanning and async effects | `RepeatedMissEnumerationG1E1`, `RepeatedMissEnumerationG8E16`, `RepeatedMissEnumerationG32E64`, `PendingWritesWaitForEveryPipe` and `PendingWritesCancelThroughActualPipes` pass with both producers. |
| Timed path preconditions and effects | All 12 actual benchmark Setup/send/cleanup wrappers pass before timing under each producer; all 12 timed cleanups validate real recipient/frame/byte effects. Total audit: 34 producer, 36 setup and 36 validated benchmark records. |
| Identity and host settings | Two 80-file images/89 source snapshots each; live audit rehashes 160 image files and 178 snapshots. Actual execution records supply 19 bounded PE/PDB bindings, 52 selected document checks and 24 unchanged before/after process/thread/affinity point records. These are not complete build provenance, method coverage or continuous OS tracing. |
| Honest disposition/budget | `final-evaluation.json`, `candidate-selection.json`, closed `measurement-budget.json`: original cost remains, no compatible source candidate or performance PR, one diagnostic profile, zero comparisons and no further F011 timing authorized. |

## Preserved preparation outcomes

The first source-triple reader stopped on the real JSON source delta instead of silently claiming equivalence. Its exact source/partial captures and negative exit remain; no .NET build or timing had launched. The corrected investigation admits that delta and the actual producer is characterized separately.

The first producer-overlay reader then rejected the SDK's nonempty default after-hook path. The path's file does not exist: a nonempty default property is not an active custom import. Its successful native property query, failed outer reader and exact source remain. The corrected guard rejects an existing hook file, preserves repository/Arcade before-hooks and records the actual compile substitution. Both JSON builds and both complete producer characterizations pass. All these are preparation/reader outcomes, not failed timing attempts or product failures. Original builds, the 27 owning rows and the one diagnostic profile were not rerun.

## Reproduce and inspect

Run `node reproduce-analysis.mjs <absolute-capsule-path> --verify` to audit raw copies, source triples, all 27 owning TRX rows/theory payloads, real producer/recipient/Pipe records, settings, captured PDB/source witness consistency, raw timing/GC records and independently recomputed sample statistics/R7 quantiles/confidence-bound arithmetic. The copied portable auditor is executed before publication. It cannot rehash deliberately omitted DLL/PDB/binlogs, replay absent PE/PDB bindings, independently derive confidence critical values or establish unrecorded schedules/production frequency.

For a **new** experiment, use a separate baseline source tree, activate its pinned SDK from the repository root with `. .\activate.ps1`, run the documented scoped owner/test workflow, and restore/build the supplied net12/C#13/BDN0.13 project using its `AspNetCoreRoot` property. See [exact historical commands and observed outcomes](validation-commands.md). Guarded historical drivers are evidence, not instructions to overwrite completed experiments or reopen this closed budget. Binaries/bin/obj/binlogs are omitted with hashes; runtimeconfig/deps metadata is retained separately.

Shared Windows VM, SDK `12.0.100-alpha.1.26557.102`, runtime `12.0.0-alpha.1.26562.105`. Settings-preserving emitted executor, Guid.Empty power policy, maximum two build nodes; no deliberate power/priority/affinity or unrelated-process changes. No dedicated-machine or general application-speedup claim.
