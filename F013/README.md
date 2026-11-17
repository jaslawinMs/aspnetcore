# F013: targeted SignalR membership - measured no-gain

**No performance PR or shipping change is justified.** Three authorized paired comparisons tested two compatible constant-factor specializations of the actual public `DefaultHubLifetimeManager.SendConnectionsAsync` path. The first regressed important List/array cases. The smaller array-only version still regressed the 128-connection/256-target array-miss case in both comparisons. Small-array effects varied, untouched fallback/control paths also moved, and no repeatable allocation benefit was established. The budget is permanently closed.

Both proposed owner implementations, the added preservation test, runnable BenchmarkDotNet project, every unfavorable result, and failed preparation/reader sources are retained here. The independent source branch remains at the unchanged campaign baseline; this capsule does not recommend merging either experiment.

## Finding, current-source check and actual owner

- Finding: `linear-contains-inside-loop` for large targeted sends, not the independently evaluated group or broadcast-exclusion paths.
- Campaign baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Captured default: `49147673007a4b1d676694e2c5f85b83ad76c36f`.
- Fresh investigation captures 20 selected baseline/default/working source triples, owner history, exact selected JSON delta, documentation context and a bounded exact-symbol open-PR search. This is not a repository-wide duplicate search or a whole-current-default build.
- David Fowler's merged dotnet/aspnetcore#69189 already improves requests with at most 16 targets. The remaining `connectionIds.Count > 16` branch still scans the real connection store and performs membership against the caller's live list for every connection. It is not wholly duplicate of that change. No upstream or F011/F012 timing is reused.
- The real private send helper lazily creates the invocation only after a selected connection, calls the real `HubConnectionContext.WriteAsync`, consumes completed ValueTasks and joins pending writes. The benchmark calls the public method, not a copied Contains loop.

The original asymptotic scan cost remains. Neither experiment constructs an index, snapshots caller input or changes the existing small-target algorithm:

| Candidate | Owner change inside the existing >16 branch | Actual comparisons |
|---|---|---|
| `native-specialization-001` | Exact runtime `List<string>` guard with direct List.Contains; array guard with Array.IndexOf; generic/custom fallback unchanged | 1 |
| `native-specialization-002` | Array-only AsSpan().Contains; all Lists and custom collections retain the original fallback | 2 and 3 |

The exact List guard in the first version is intentional: a derived List can reimplement ICollection.Contains. An unrestricted `is List<string>` optimization can bypass observable dispatch. The second version removes the List specialization altogether. No API/default/convention change is proposed.

## Results on this box

These are whole actual owner-path observations, not isolated Contains timings. **Negative change means lower candidate time.** Comparison 1 is a different implementation from comparisons 2/3: there are not three replications of the array-only variant. No pooling or production weighting is used.

| Shape | C1: exact List / Array.IndexOf | C2: array span | C3: same array span |
|---|---:|---:|---:|
| NoConnections512 | -21.96% | +7.71% | +15.57% |
| EmptyTargets | -0.67% | -0.63% | -10.61% |
| Small4List2 | -1.47% | -1.25% | +1.99% |
| Threshold16List | -1.35% | +1.42% | -0.65% |
| Threshold17List | -1.01% | -2.35% | -1.51% |
| C32List64Miss | +28.84% | -5.01% | -12.38% |
| C32Array64Miss | +12.56% | -2.34% | -0.99% |
| C32ReadOnly64Miss | -7.55% | -0.69% | -12.38% |
| C128List256Miss | +7.65% | +11.43% | -14.58% |
| C128Array256Miss | +9.61% | +7.01% | +9.36% |
| C32List64Sparse | +26.75% | -0.70% | -15.87% |
| C32Array64Sparse | +11.09% | -8.61% | -0.91% |
| C32List64All | -0.63% | -0.87% | -2.78% |
| C32DupList64 | +14.47% | -1.14% | -9.50% |

The large-array miss means for the second version are 38,849.417 -> 41,572.482 ns and 38,463.555 -> 42,062.017 ns. The apparent improvement for an empty connection store in C1 does not demonstrate a faster membership operation: no membership predicate executes there. Nor should the later large movements of unchanged List/read-only/small-target paths be attributed to an array specialization. JIT/layout/shared-host effects were not separately isolated.

Complete per-role means, SD, CV, retained N, confidence fields, GC observations and all raw/retained/warmup/overhead iterations:
[comparison 1](analysis-comparison-1.json), [comparison 2](analysis-comparison-2.json), [comparison 3](analysis-comparison-3.json), [combined non-pooled analysis](analysis.json).
Original BDN JSON/CSV/HTML and complete role console logs are under [comparison 1](measurements/comparison-1), [comparison 2](measurements/comparison-2), [comparison 3](measurements/comparison-3).

| Comparison | Role order | Actual role reports | Raw actual | Retained | Warmups | Actual overheads |
|---|---|---:|---:|---:|---:|---:|
| 1 | Original, candidate 001 | 28 | 224 | 215 | 84 | 516 |
| 2 | Candidate 002, original | 28 | 224 | 217 | 84 | 498 |
| 3 | Original, candidate 002 | 28 | 224 | 213 | 84 | 497 |
| Total | Six complete profiles | 84 | 672 | 645 | 252 | 1511 |

All 672 actual samples remain available, including 27 default upper-filtered samples. Raw8 means explicitly include overhead; they are not mislabeled as overhead-compensated retained means. A low within-profile CV does not establish cross-process isolation or make the different variants interchangeable. Console warnings, if printed, remain unedited.

**Allocation boundary:** BDN0.13/net12 measures process-wide GC allocated bytes/op, not isolated membership/enumerator/serializer costs. All measured array-path allocations are unchanged. C3's unchanged `C128List256Miss` fallback reports **66 -> 65 B/op**; that single 1B observation is retained, not hidden or called an allocation win. Other rows report unchanged 0/64/66/248/312 B/op as shown in the raw exports. Identical BDN DLL hash and explicitly borrowed GcStats source attribution are retained under `investigation\bdn-memory-accounting`; no new source fetch/instrumentation or independently rebuilt source-to-DLL binding is claimed.

## Faithful workload and native producer controls

The 14 timed shapes use real registered connection stores and the actual public method. Inputs/connections and an Ordinal expected-recipient set are constructed outside timing. The timed body includes actual recipient selection, lazy cached JSON serialization, real synchronous writes into fixed 256-byte per-connection writers, and minimal call/frame/byte counters. Full recipient, byte and actual invocation-frame checks execute outside timing. The selected recipients are checked exactly once each per call, including duplicates.

- NoConnections512: zero connections and 512 array targets. EmptyTargets: 32 connections and an empty List.
- Small4List2 and Threshold16List/Threshold17List exercise the actual existing small-path boundary.
- The 32x64 and 128x256 misses use actual List, array and read-only-wrapper inputs as named.
- Sparse cases have one real ID at the final target; All selects all 32; Dup alternates two real IDs and requires each to receive only once.
- Timed connections need no groups. A separate native scope check includes an explicitly targeted outside-group connection.

Eighteen actual producer/contract checks plus all 14 timed wrappers execute independently under **six contexts**: original and each candidate, each with original JSON and the actual captured-default JSON producer. No prior group/broadcast observation substitutes for these checks.

- `LiveArrayMutationAtJsonGetter`, `LiveListMutationAtJsonGetter`, `LiveReadOnlyWrapperMutationAtJsonGetter`: a real JSON-serialized argument getter removes the eight real IDs from the same 17-element caller-owned input. Count stays 17, never crossing the existing boundary. The original and both compatible candidates deliver one valid frame; recipient identity/order is not assumed.
- Explicit `SnapshotInputControlArray`, `SnapshotInputControlList`, `SnapshotInputControlReadOnlyWrapper` pass a copied input to the unchanged owner and deliver to eight. They are **not implemented indexed owners or measured optimizations**.
- `CustomCollectionContainsDispatch`, `SnapshotInputControlCustomDispatch` and `DerivedListRetainsCustomContainsDispatch` establish real ICollection.Contains comparison/dispatch and its actual recipient effect.
- `RepeatedMissEnumerationC1T17`, `RepeatedMissEnumerationC8T32`, `RepeatedMissEnumerationC32T64`: real-owner misses enumerate 17/256/2048 values, with one required public Count read and zero indexer reads. Instrumentation is untimed.
- `PendingWritesWaitForEveryPipe`, `PendingWritesCancelThroughActualPipes`: two real Pipes with pause threshold 1 establish actual pending writes, completion only after both drains, native cancellation and no connection abort. No sleeps, injected manager callbacks or copied filtering helper.
- Other native controls establish case-sensitive target scope/duplicates, an empty store reading only Count, no serialization for all misses even with a canceled token, and one real JSON argument serialization across multiple selected recipients.

These controls reject a naive snapshot assumption, not every possible compatible optimization. The measured outcome is no-gain for the two actual specializations, not proof all future designs are impossible.

## Owning tests and preparation

**Three fresh owning suites pass 28/28 rows each**, zero failed/skipped: unchanged original, variant 001, variant 002. Each includes 24 Facts (12 inherited specification Facts) and all four actual `(16,False)`, `(16,True)`, `(17,False)`, `(17,True)` Theory payloads.

| Requirement | Evidence |
|---|---|
| Existing array/List small-path boundary and once-only delivery | `SendConnectionsAsyncWritesOnceToSpecifiedConnections`, every actual 16/17 array/List row in each of the three fresh TRX files |
| Preserve derived ICollection.Contains dispatch and actual recipients | New `SendConnectionsAsyncPreservesDerivedListContainsDispatch`, passed on unchanged original and both candidates |
| Existing completion/cancellation behavior plus the disputed large-path producer | Existing owning rows including `SendConnectionsAsyncWaitsForAllWrites`; the separate actual large-path Pipe controls named above |

The successful commands use the actual project and `--filter FullyQualifiedName~DefaultHubLifetimeManagerTests`; all exact arguments and observed exits are in [validation commands](validation-commands.md). This is not the whole SignalR test project. The new preservation test is expected green on both source versions; it is not functional bug-fix red/green. Performance evidence comes from the actual paired measurements.

Initial preparation explicitly borrows/re-hashes the old F011 27-row test evidence and unchanged original owner bytes. Those initial 27 rows are **not** counted as a new F013 test run. The three later 28-row suites are actually built/run; 84 fresh plus 27 explicitly borrowed TRX rows are independently audited separately.

Preparation history: 17 actual native commands, 16 successful and one failed test build; one restore, seven builds including that failure, six complete characterizations and three owning suites. Four changed-file whitespace verification commands also pass. All CPU-heavy campaign commands are serialized, build concurrency at most two nodes.

Retained failures and qualifications:

- The new helper was initially inserted inside an existing test method. Actual test build fails CS1513/CS1519, before any owning test/assertion runs. Exact bad test/owner/driver source, full build log and omitted-binlog hash remain under `tests\owning-comparison\original`. The raw premature test-run plan marker is explicitly qualified; a distinct corrected original attempt passes.
- The first audit reader expected the borrowed row schema for fresh rows; the second expected different missing-ID suffixes. Exact failed sources, commands, full stderr and observations remain under `analysis-attempts\independent-audit`. Corrected attempt 003 passes without changing product or experimental data or rerunning a test/profile.
- One final informational line in the successful original test runner interpolates role/count incorrectly. Actual command, TRX and audit are correct; no passing suite was rerun for a display typo.
- Current-default JSON DLL/PDB are explicitly reused/rehashed from F011 at the same captured revision, not newly compiled. Every F013 native producer context is new. No whole-current-default SDK/dependency integration claim.

After the live audit, only this experiment's proposal and extra test are manually unwound. All 20 selected original source files are byte-exact, with no tracked source changes. Eight known output identities are checked before/after; six exact owner/test DLL-PDB replacements are restored from the explicit archived original capture. Both measured proposals and the new passing preservation test remain in the capsule. No new test/build is claimed for restoration.

## Reproducibility and boundaries

The [six-file executable project](harness/AutoPerf.Benchmarks.csproj) is net12/C#13, BenchmarkDotNet0.13.0, with real repository ProjectReferences and configurable `AspNetCoreRoot` (default `C:\src\aspnetcore`). Historical commands preserve SDK12.0.100-alpha.1.26557.102 and runtime12.0.0-alpha.1.26562.105. Each fresh .NET shell activates `. .\activate.ps1` from the repository root.

For a **separate new experiment**, first build the matching repository owner/dependencies using `docs\BuildFromSource.md`, use a fresh output directory and the exact chosen owner/test/source snapshot. The standalone restore/build entry points are:

```powershell
Set-Location C:\src\aspnetcore
. .\activate.ps1
dotnet restore '<capsule>\harness\AutoPerf.Benchmarks.csproj' -p:AspNetCoreRoot=C:\src\aspnetcore
dotnet build '<capsule>\harness\AutoPerf.Benchmarks.csproj' --no-restore --no-dependencies -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -o '<fresh-absolute-output>'
```

These illustrative relocation commands are not claimed as additional executions. For the actual historical successful commands/results, use [validation-commands.md](validation-commands.md), execution records and frozen executed-source drivers. The guards intentionally refuse overwriting evidence or reopening this finding's closed timing budget.

`Program` requires `--sources`, `--context` and an absolute `--artifacts`; `--characterize` runs native controls, otherwise `--filter '*'` selects the benchmark cases. Optional `--test-assembly`/`--spec-assembly` add actual test-source witnesses. A source/PDB mismatch fails explicitly. Do not mix owner, JSON, test or source roles; do not treat a rebuilt image as the historical frozen image.

The pair images contain the same compiled harness/PDB/BDN and other 78 byte-identical consumer files; only Core DLL/PDB differ. The captured-default producer images differ only in JSON DLL/PDB. Paired source snapshots contain identical new test source and differ only in the owner. Initial preparation snapshots intentionally retain the older borrowed test source.

Independent live and copied portable audits recompute 84 reports/672 raw/645 retained/252 warmups/1511 overheads; actual TRX identity/discovery/duration/payload checks; 108 producer/168 setup/168 delivery records; 84 bounded PE/PDB witnesses/216 selected documents; 623 source snapshots and 168 unchanged settings point records. The actual measured images are rehashed live. Portable audit:

```powershell
node .\F013\reproduce-analysis.mjs .\F013 --verify
```

The portable audit needs Node, not compiled benchmark binaries, and does not run extra timing. Source/text/raw data are published byte-exact with copy and omission manifests. DLL/PDB/executable/build images/binlogs are deliberately omitted with hashes; portable mode cannot rehash those missing bytes or independently replay PE/PDB bindings. Witnesses are bounded, not full build provenance/method coverage; confidence critical values are not independently derived.

The shared Windows VM is not dedicated or isolated. A settings-preserving executor requests the empty power-policy GUID and retains process/thread priority, affinity and ambient power observations; no deliberate OS power/priority/affinity changes. Timing covers repeated warm sends and synchronous transports, not connection creation, network, handshake, stateful reconnect, production frequency or general application throughput.

See [final evaluation](final-evaluation.json), [closed budget](measurement-budget.json), [preparation history](preparation-history.json) and [repository restoration](repository-restoration.json). A no-gain outcome finalizes this evaluation, not a shipping fix.
