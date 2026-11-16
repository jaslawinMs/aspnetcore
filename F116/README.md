# F116: bounded two-port boxing cache

**Qualified allocation-only draft, not merge-ready.** This is a bounded follow-on to merged [dotnet/aspnetcore#69558](https://github.com/dotnet/aspnetcore/pull/69558), not an unconditional boxing bug or a general throughput optimization.
Actual warmed second-port getter/tag/list calls allocate **24 -> 0 B**. Actual enabled Kestrel queued start/stop allocates **48 -> 0 B per second-port stream**, or48 ->0 B per prepared two-port/two-stream batch. Every one of25 preselected absolute resource samples is expected-red on original and green on candidate, without changing goals or inputs.
**Costs remain:** first-port queue latency is2.49-6.66% higher in all three pairs; getter third-port latency is4.36-23.90% higher and list third-port latency1.77-16.33% higher. Most consumer timing is small/mixed or sensitive to shared-machine variation. One extra boxed integer/static reference is retained per warmed participating linked owner, with startup CAS work. No HTTP, complete hub, production-frequency or whole-application speedup is claimed.

Independent source: [22c5811cd78b51175dca2bcb7310365f03ad4346](https://github.com/jaslawinMs/aspnetcore/commit/22c5811cd78b51175dca2bcb7310365f03ad4346), parent 37e809ead5824bc753a1c3d56f11615bdb1296c5. Only src/Shared/ConnectionEndpointTags.cs changed. Raw measured source SHA256: 4E81EFB8B0127D729D693E1EB60BF4D77FE58BC1BC4BB2B85522330B14449EC8. Measured binaries predate this later source commit and are not relabeled as built from it.
The final draft URL and immutable publication receipt are recorded in publication.json after publication. This capsule is preserved independently of that later receipt.

## Scope and acceptance

The [acceptance criteria](acceptance.json) and [absolute resource goals](resource-goals.json) were fixed before any shipping edit or timing. Original first-port caching was deliberate in merged69558; replacing-last-port behavior had regressed under contention. This proposal never replaces a populated cache slot and never introduces a dictionary/unbounded cache.
The candidate adds a secondary stable boxed-port slot and startup-only CompareExchange publication for both slots. Existing cached/boxed locals and first-port branch structure are preserved. A startup loser can return its own correct fresh box; later real calls populate the remaining slot. Stable first publication prevents two retained slots becoming duplicates through first-slot overwrite.
No public/protected API, default, TFM, dependency, assembly-visibility bridge or unrelated cleanup changed. Existing object-valued integer tags, order and values are preserved.

### Current-default and owning producer boundary

Captured current default0d5708d05bb47d5ae84cecd1b12dff7b1d90c84b and campaign baseline37e809ead5824bc753a1c3d56f11615bdb1296c5. Of22 scoped source/project/test files,21 are exact, including the selected helper, metrics, hub dispatcher and full HTTP2/HTTP3 producer files. The remaining KestrelMetricsTests file only adds an observation wait before an HTTP2 shutdown assertion. The original overly narrow difference assertion and its audit-only correction remain archived. This is measured-component source equivalence, **not a full latest-default integration execution**.
ConnectionEndpointTags is separately compiled into Kestrel.Core, SignalR.Core and Http.Connections; these have independent static caches. Actual source consumers are KestrelMetrics and DefaultHubDispatcher. No actual helper hot caller was found for the Http.Connections link in the bounded caller search; it is a link/contract control, **not a claimed third hot consumer**.
Queue rows use actual in-tree KestrelMetrics.CreateContext and RequestQueuedStart/Stop with a real scoped MeterListener. The listener enables the real instrument and receives balanced+1/-1 deltas and complete typed endpoint/protocol tags. No enabled-field writes or injected measurement callbacks. Actual HTTP2/HTTP3 caller source is captured, but no network request/QUIC transport is timed.
SignalR list rows call its actual helper with a reused list containing the same three RPC tags; they do not time complete hub invocation. Existing actual activity tests protect that wider trace boundary.

## All measured comparisons

Exactly3 comparisons, one unchanged source shape, six24-case profiles. Order: original/candidate, candidate/original, original/candidate. No tuning or retiming after closure. Each outcome has3 warmups and8 retained results; DontRemove preserves outliers. Negative change means lower observed component mean. Pair medians are descriptive, not pooled statistical estimates or causal application claims.

| Case | Pair1 time change | Pair2 time change | Pair3 time change | Median change | B/invocation original -> candidate |
| --- | ---: | ---: | ---: | ---: | --- |
| GetFirst | -8.48% | -72.06% | -6.87% | -8.48% | 0 -> 0 |
| GetSecond | -36.23% | -26.57% | -38.60% | -36.23% | 24 -> 0 |
| GetThird | 10.96% | 23.90% | 4.36% | 10.96% | 24 -> 24 |
| GetMix2 | -27.98% | -20.62% | -28.67% | -27.98% | 24 -> 0 |
| GetMix4 | 2.93% | 13.40% | 0.49% | 2.93% | 72 -> 48 |
| TagsFirst | -3.53% | 11.97% | -14.09% | -3.53% | 0 -> 0 |
| TagsSecond | -8.97% | 4.39% | -17.47% | -8.97% | 24 -> 0 |
| TagsThird | 3.90% | 16.76% | -8.55% | 3.90% | 24 -> 24 |
| TagsMix2 | -6.52% | 5.73% | -14.61% | -6.52% | 24 -> 0 |
| TagsIPv6 | -8.41% | 5.55% | -14.46% | -8.41% | 24 -> 0 |
| TagsFallback | -13.12% | -6.38% | -18.18% | -13.12% | 24 -> 0 |
| TagsOverride | -8.13% | -9.48% | -16.27% | -9.48% | 24 -> 0 |
| ListFirst | 1.72% | 13.16% | -1.51% | 1.72% | 0 -> 0 |
| ListSecond | -6.57% | 0.02% | -11.97% | -6.57% | 24 -> 0 |
| ListThird | 3.83% | 16.33% | 1.77% | 3.83% | 24 -> 24 |
| ListMix2 | -0.85% | 4.61% | -8.12% | -0.85% | 24 -> 0 |
| QueueFirst | 3.71% | 6.66% | 2.49% | 3.71% | 0 -> 0 |
| QueueSecond | -8.08% | -0.51% | -9.12% | -8.08% | 48 -> 0 |
| QueueMix2 | -3.57% | 1.72% | -6.38% | -3.57% | 48 -> 0 |
| QueueMany | -1.79% | 6.42% | -2.04% | -1.79% | 144 -> 96 |
| QueueOff | -0.16% | -3.12% | -0.34% | -0.34% | 0 -> 0 |
| ParallelFirst | 2.52% | -15.55% | -1.14% | -1.14% | 33..124 -> 33..42 |
| ParallelMix2 | 0.71% | -0.18% | -0.72% | -0.18% | 73737..73758 -> 28..29 |
| ParallelMiss | -1.68% | -0.10% | -0.97% | -0.97% | 147484..147486 -> 147486 |

Full means, both CVs, reported-interval overlap and raw overhead subtraction are in [comparison-outcomes.md](comparison-outcomes.md); raw console/CSV/HTML/full JSON are under measurements/. Nothing unfavorable was dropped.
GetSecond improves26.57-38.60% in all pairs; that is the isolated private helper, not a consumer-wide speedup. QueueSecond improves0.51-9.12%, while TagsSecond includes a4.39% slower pair. ListMix2 has a0.85% lower median but a4.61% slower pair. ParallelMix2 has essentially unchanged coordinated-batch time despite lower worker allocation.
Pair2 original GetFirst has mean28.75ns/CV45.38%, compared with7.51ns in pair1; its apparent72% gain is **not treated as a cache optimization win**. Pair2 original ParallelFirst also has high variation. Unchanged/disabled and first-port/miss controls remain visible.
Audited144 outcomes,1152 retained results,432 warmups and2249 actual overhead samples;192 complete contract captures,240 active calipers,144 exact setup/hash/PID links and288 before/after settings records. Maximum observed CV=45.38%.

### Units and allocation accounting

Get/Tags/List mixed rows are one prepared multi-call batch. QueueSecond is one stream/two emissions; QueueMix2 is two streams/four emissions; QueueMany is four streams/eight emissions. Parallel rows are12 persistent workers x512 real endpoint-tag calls =6144 calls per coordinated batch, including scheduling/gates. Do not compare these numbers as single-request latency.
Four distinct port integers were observed from four simultaneously bound/listening OS sockets, then frozen and replayed in prepared contexts. Sockets were disposed before timing. No ports are intentionally held open.
Pinned BDN0.13.0 uses the available GC.GetTotalAllocatedBytes(precise:true) delegate on this runtime: **its allocation accounting is process-wide and includes workers**, plus other process overhead. The pinned source and runtime delegate witness are retained. The initial mistaken main-thread-only annotation was corrected before the shipping edit or any actual timing; original-prep1 remains historical, original-prep2 is the active original.
Independent per-worker calipers attribute the actual producer loops: original two-port loops12 B/tag ->candidate0; first-port loops0 both; all-miss loops24 B/tag both. BDN parallel batch totals include additional process overhead and can differ slightly from12x512x12. No fabricated zero-process-overhead claim.
All25 unchanged selected resource samples: original24 B for GetSecond/TagsSecond/ListSecond,48 B for QueueSecond/QueueMix2, expected-red; candidate0 B for each, green. Separate startup allocations include JIT/first producer effects and do not support cold-latency or precise retained-heap-size claims.
The proposal retains one additional boxed integer and one static reference per warmed participating owner. Three/four-port misses still box; bounded caching is not universal port-allocation removal.

## Correctness and immutable-image evidence

Both original and candidate passed21 scoped Kestrel metrics rows plus10 SignalR activity rows:62 actual row executions, zero skips, positive durations. Discovery, definition, execution and TRX entry IDs/names are joined exactly, not inferred from a green summary. Test projects and individual exact names are in tests/<variant>/test-audit.json and the TRX.
All24 full ordered typed case outputs were frozen before editing.27 endpoint-control observations cover null/non-IP/Unix/named-pipe/other endpoints, feature precedence/fallback and prepared multiplexed transport metadata; late-listener disabled/new-context behavior uses the real meter producer. Prepared multiplexed metadata is not actual QUIC transport execution.
Active images each contain233 files/105 declared runtime assets, with only the three actually tested owner DLL/PDB pairs changed. The harness/runtime/deps/fixtures are byte-identical. Loaded owner/harness/BDN hashes, fixture hashes and PIDs are recorded. Live audit rehashed application/runtime bytes on this box.40 source/PDB document checks passed; these are **not PE/PDB binding or method-coverage proof**, and captured test output images are not an in-test full loaded-closure trace.
### Cold-snapshot defect found by the full auditor

The first full auditor correctly failed: historical CacheSnapshot nested Select values were deferred until ColdRace serialized after warmup. Its before/intermediate JSON labels therefore do **not** show the named instant. Fresh-empty preconditions and correct return/warm-state guards had actually run, but those JSON point labels are not accepted as evidence.
The exact failed auditor/source/log and all historical raw JSON remain unchanged. A separate [cold-only driver](cold-probe/Program.cs) immediately materializes every slot/value, loads the exact already-measured owner DLLs and ran three fresh processes per variant. It observes empty-before,12 concurrent four-port actual Kestrel helper returns, stable published cold slots and correct bounded/distinct warm states across all three linked owners. The other linked owners are warmed sequentially, not independently raced. All six supplemental diagnostics passed. No source/frozen timing-harness edit, comparison-budget reopening or timing rerun.
The bounded observations do not explore every startup schedule. See cold-capture-amendment.json and cold-capture-repair/ for the actual source identities, commands, outputs and settings.

## Shared-machine execution policy

Windows11 Enterprise Microsoft VM, Xeon Platinum8473C,8 cores/16 logical processors, about64GiB RAM. **Shared environment, not a dedicated or continuously idle sandbox.** SDK12.0.100-alpha.1.26557.102; runtime12.0.0-alpha.1.26562.105, while Runtime.Version reports12.0.0 and captured CoreLib informational version identifies the actual build.
CPU-heavy work was serialized with at most2 build nodes. No deliberate power-plan, priority, affinity or unrelated-process changes. The custom settings-preserving emitted toolchain uses public BDN generator/builder/runnable/engine/diagnosers but an executor that omits stock priority/affinity setters. Guid.Empty disables BDN power-plan selection; no --inProcess or --job override.
Observed process/thread priorities Normal/Normal and affinity65535 at recorded points; parallel workers have initial/final observations. Configuration and point observations are **not continuous OS tracing** or proof that outside workloads never changed conditions. F116 has no claimed F115-style powercfg pre/post evidence.

## Reproduction and validation

The actual standalone BenchmarkDotNet project is [harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj), targeting net12.0/C#13, pinned BDN0.13.0 and exact runtime. It references the three actual in-tree projects and the scoped SignalR-tested dependency closure, not an installed ASP.NET Core framework. Build scoped owning projects first; AspNetCoreRoot can be supplied for a different source-checkout path.
Every fresh dotnet shell activates `. .\activate.ps1` from the source repository root. Actual exact child commands and outcomes are in [validation-commands.md](validation-commands.md) and execution.json records; original and candidate source/fixtures/images were frozen separately before measurement. Historical wrappers have overwrite/branch/budget guards and are **not commands to run over these closed artifacts**. Reproducing timing requires fresh output directories and original/candidate builds of the recorded source, not a fourth comparison in this evaluation.
Completed historical entry commands and outcomes:

```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F116-test.ps1' -Variant original
# Passed:21 Kestrel metrics +10 SignalR activity rows,zero skips.
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F116-test.ps1' -Variant candidate1
# Passed:the same31 rows,zero skips.
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F116-cold-probe.ps1'
# Passed:six independent immediately-materialized cold-only diagnostics;no timing rerun.
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F116-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F116' --verify
# Passed:all144 outcomes/source/fixture/TRX/PDB/settings/resource/GC/actual-overhead/statistics checks;live images/runtime rehashed.
```

For the public copied capsule, run `node <absolute-capsule>\reproduce-analysis.mjs <absolute-capsule> --verify`. The portable auditor verifies exact authoritative copy hashes and recomputes preserved results. DLL/PDB/runtime/bin/obj/binlog images are deliberately omitted: **the public audit cannot independently rehash those omitted bytes**, and does not independently compute the confidence critical value. Config/deps metadata, closure/hash manifests, source documents and complete raw observations remain available.
The initial source-scope assumption, pre-timing memory annotation correction, candidate pre-characterization PowerShell pipeline failure and first full-audit cold-snapshot failure are all retained. None was repaired by rerunning a completed timing profile or retuning goals.
