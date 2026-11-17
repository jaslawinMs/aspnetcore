# F014: SignalR user-target membership

**Rejected/design-blocked: a simple per-send membership snapshot changes recipients.** No shipping source change, indexed owner, performance PR, comparative no-gain result or improvement percentage. The original repeated scan remains. This does not establish that every alternative optimization is impossible.

The actual public `DefaultHubLifetimeManager.SendUsersAsync` scans the registered connection store and calls the live user-ID input's `Contains` for each connection's current `UserIdentifier`. Unlike `SendConnectionsAsync`, this method has no16-target threshold. Related David Fowler work dotnet/aspnetcore#69189 changes connection targeting, not this user-send path; no upstream or F011/F012/F013 timing is reused.

## Why the suggested index was not selected

The real `JsonHubProtocol` serializes an argument whose ordinary property getter replaces eight requested user IDs in the same64-element array, List or read-only-wrapper backing input. With eight actual registered connections, each original live send delivers exactly one valid frame. Which connection is first is not prescribed. Explicit HashSet-to-array copied-input controls, passed to the **unchanged** owner before the same getter runs, deliver to all eight. These are native producer/input-semantics controls, not an implemented indexed owner or optimization red/green test.

Native `ICollection<string>.Contains` custom OrdinalIgnoreCase dispatch selects `c-upper`; an explicit Ordinal copied-input control selects none. A real List subclass reimplementing that interface also retains its two native calls and actual recipient. `IReadOnlyList`, `IsReadOnly`, identity and unchanged count therefore do not establish immutable input or a substitutable comparer.

User identifiers are not injected arbitrary connection IDs: the fixture invokes actual public `DefaultUserIdProvider.GetUserId` on real `HubConnectionContext` and `DefaultConnectionContext.User` principals during untimed setup, then assigns that actual result through the existing public property. Missing NameIdentifier claims produce null even though a Name claim exists. The native send excludes those null users, selects both connections sharing a requested user, preserves case distinctions and sends once per selected connection despite target duplicates. This warm-state boundary does **not** execute the internal protocol handshake.

## Original-only measurements on this box

One original profile,14 successful reports; no candidate role or paired comparison. These are different configured inputs, **not before/after roles**.

| Original shape | Mean ns | SD ns | Retained N | Process-wide B/op |
|---|---:|---:|---:|---:|
| NoConnections512 | 107.337 | 5.114 | 8 | 64 |
| EmptyTargets | 735.253 | 3.975 | 8 | 64 |
| Small4List2 | 500.463 | 3.685 | 7 | 312 |
| C32List64Miss | 3687.166 | 13.865 | 8 | 64 |
| C32Array64Miss | 3249.554 | 15.909 | 8 | 64 |
| C32ReadOnly64Miss | 3946.246 | 30.419 | 8 | 64 |
| C128List256Miss | 45462.960 | 361.522 | 8 | 66 |
| C128Array256Miss | 37985.042 | 147.531 | 7 | 66 |
| C32List64Sparse | 4091.451 | 22.200 | 7 | 312 |
| C32Array64Sparse | 3482.073 | 10.022 | 7 | 312 |
| C32List64All | 4350.502 | 16.432 | 8 | 312 |
| C32DupList64 | 4411.810 | 27.910 | 8 | 312 |
| C32SharedUserList64 | 4280.792 | 103.835 | 8 | 312 |
| C32NullUsersArray64 | 2049.017 | 13.503 | 7 | 64 |

`C32`/`C128` denote registered connections. Miss cases select none; sparse cases select one; all selects32; duplicate and shared-user cases select two, once per connection; null-user case selects none. EmptyTargets has32 connections, no requested users and no serialization. Input/provider/principal/connection construction is outside timing.

All **112 raw actual samples,107 retained results,five upper-filtered samples,42 warmups and267 actual overhead iterations** remain in the full JSON export/raw console log. Default BDN upper-outlier filtering applies. Empty-store CV is4.76%; shared-user CV is2.43%; unfavorable variation is not discarded. An empty store runs no membership predicate. Allocation is process-wide on the pinned runtime, not isolated membership/serializer/transport allocation; the66 B/op results are not an attributed two-byte owner allocation or improvement.

Timing repeatedly calls the real public user-send owner over pre-registered connections, real JSON serialization and synchronous fixed256-byte per-connection transport buffers. Minimal call/frame/byte counters are included. No unbounded Pipe growth, network, handshake, connection/provider/principal/input/group construction, stateful reconnect, production-frequency or whole-application throughput claim. Actual two-Pipe backpressure/completion/cancellation is established separately, untimed.

BDN0.13, throughput, requested100ms iteration time,3 warmups/8 actual iterations, unroll1 and Guid.Empty power policy. Shared Windows VM; SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105. No dedicated-host claim or deliberate OS power/priority/affinity changes.

## Requirement evidence

| Requirement | Evidence |
|---|---|
| User scope, case, duplicates and multiple connections per user | `UserScopeCaseDuplicatesAndMultipleConnections`: `c-lower,c-outside,c-shared` receive once; case variants do not, and selected outside-group connections receive. |
| Real provider and null user identifiers | `DefaultUserIdProviderProducesAbsentClaimNulls`: actual default provider produces `user,null,null`; only `named` receives, despite an input matching every principal's display Name. Every fixture records actual provider output and NameIdentifier claim. |
| Empty/missing target laziness and canceled-token behavior | `EmptyConnectionStoreDoesNotReadTargets` proves zero Count/element/getter reads; `AllMissingDoesNotSerializeCanceledSend` completes successfully without initiating canceled writes or serializing payload. |
| Ordinary JSON getter reachability and shared serialization | `JsonPayloadSerializedOnceForAllRecipients`; `LiveArrayMutationAtJsonGetter`, `LiveListMutationAtJsonGetter`, `LiveReadOnlyWrapperMutationAtJsonGetter` plus their three `SnapshotInputControl` cases establish actual frames and same-count post-getter values. |
| Custom and derived collection dispatch | `CustomCollectionContainsDispatch`, `SnapshotInputControlCustomDispatch`, `DerivedListRetainsCustomContainsDispatch`. |
| Repeated scan through the actual owner | `RepeatedMissEnumerationC1T1`, `RepeatedMissEnumerationC8T16`, `RepeatedMissEnumerationC32T64`:1/128/2048 yielded values, zero Count/indexer reads. Untimed instrumented input, not a timed comparison-count claim for ordinary Lists/arrays. |
| Completion/cancellation owned by actual transports | `PendingWritesWaitForEveryPipe`, `PendingWritesCancelThroughActualPipes`: two real Pipes, threshold1, both frames, wait-for-both completion/native cancellation and no abort; no sleeps or injected manager callbacks. |
| Actual timed paths and reports | Each of14 `UserSendBenchmarks.Send` shapes preflighted and delivery-validated under both actual JSON versions; the single timed original profile also validates all14. |

All19 logical producer checks plus14 actual timed-wrapper paths pass independently with original and actual captured-default JSON producers. The first standalone build and all four new native preparation commands exit0. No fresh owning-suite run: the original F01127-row `DefaultHubLifetimeManagerTests` evidence is explicitly reused/rehashed with original commands, timestamps and TRX. It contains23 Facts including12 inherited specification Facts plus all four actual16/17 array/List Theory payloads; those are historical connection-targeting rows, not a user-send threshold. No whole SignalR-suite claim, failed/skipped/sentinel row or newly rebuilt current JSON producer.

## Audit and source boundary

Baseline/source branch: `autoperf/F014-signalr-user-membership` at unchanged `37e809ead5824bc753a1c3d56f11615bdb1296c5`. Fresh upstream default `49147673007a4b1d676694e2c5f85b83ad76c36f`:23 actual baseline/default/working source triples, owner/provider/context history and empty exact-symbol open-PR search captured. The selected owner/provider/context sources are unchanged; the captured JSON source delta is retained.

Two frozen80-file consumer images differ only in actual JSON DLL/PDB. Each90-source catalog includes the provider/interface sources; those two Core files were already in the prior complete snapshot, while `IConnectionUserFeature.cs` adds one file. Original owner/test/current JSON bytes are explicitly borrowed/rehashed from F011; actual F014 observations and timing execute independently. No whole-current-default SDK/dependency integration claim.

Independent live and copied portable audits recompute all27 historical TRX result/definition/entry identities, positive durations and four exact Theory payloads; **38 producer,42 setup,42 delivery,21 PE/PDB witness,57 selected document,180 source snapshot and28 unchanged settings-point records**, plus raw statistics, median-overhead compensation/upper filtering, sample N-1 variance, R7 quantiles/confidence-bound arithmetic and process-wide GC midpoint-even rounding. No new reader/native/timing failure or rerun. Confidence critical values and source-to-BDN DLL binding are not independently derived; the already observed BDN source is explicitly reused against the identical measured DLL hash, not freshly fetched/instrumented/rebuilt.

Portable audit command, executed successfully after copying:

```powershell
node .\F014\reproduce-analysis.mjs .\F014 --verify
```

Portable mode verifies copied bytes and recorded evidence consistency, but cannot rehash omitted DLL/PDB/binlogs or independently replay PE/PDB binding. Witnesses are bounded selected-source evidence, not complete build provenance or method coverage.

## Files and reproduction

`harness\` contains the six-file runnable BenchmarkDotNet project with actual default-provider setup, producer controls and settings-preserving toolchain. `measurements\original-diagnostic-only\` contains complete raw timing/GC/settings records and exports; `characterization\` contains both independent native producer runs; `sources\` contains both frozen catalogs; `tests\original\` contains explicitly borrowed actual27-row evidence and attribution.

`acceptance.json`, closed `measurement-budget.json`, `candidate-selection.json`, `analysis.json`, `final-evaluation.json`, `measurement-audit.json`, source/image manifests and checked tool provenance preserve decisions and boundaries. `validation-commands.md` lists exact actual historical commands **with outcomes**, not overwrite/replay instructions. Every fresh .NET shell activates `. .\activate.ps1` from `C:\src\aspnetcore`; use a separate scratch directory and exact baseline/pinned dependencies for new native work. Historical guarded drivers intentionally refuse overwriting evidence.

The budget is permanently closed: one original-only diagnostic; zero selected shipping candidates, candidate profiles or paired comparisons; maximum comparison allowance3 was not consumed. Any future ownership/versioning or compatible constant-factor proposal needs independent evidence and a separate evaluation, not more F014 timing.
