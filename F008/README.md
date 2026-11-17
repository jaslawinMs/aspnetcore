# F008: supported-culture startup index declined;live-list behavior retained

**Disposition: rejected/design-blocked for the uninvalidated startup-index proposal,not measured comparative no-gain or an asymptotic fix.** The original repeated linear matching is real and remains. No independent compatible optimization was selected,no shipping source/public API/default/dependency/TFM/visibility/permanent-test change was made,and no speculative PR was created. The [separate fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F008-request-localization-culture-membership) deliberately retains campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## What blocks that proposal

Actual public `RequestLocalizationMiddleware.Invoke` observes caller-owned `RequestLocalizationOptions` and `IList<CultureInfo>` state after middleware construction. Real QueryString/AcceptLanguage providers produce the inputs;the actual downstream delegate observes thread-culture/feature object identity,the response Content-Language and selected formatting. No copied private matcher,provider-result injection or proposed cache is used.

| Actual sequential change | Observed downstream effect |
|---|---|
| Add then remove fr-FR in the original list | Default en-US ->fr-FR ->en-US on the same middleware/options/list |
| Replace one List element without changing count | Default en-US ->fr-FR;identity/count cache checks miss it |
| Replace mutable backing of a ReadOnlyCollection | Same wrapper/count and IsReadOnly=true,but en-US ->fr-FR |
| Replace an array element | Same array/length and generic IList.IsReadOnly=true,but en-US ->fr-FR |
| Replace both options list properties independently | en-US/en-US ->fr-FR/de-DE;actual Content-Language becomes de-DE |
| Mutate the same configured CultureInfo formatting | Actual new read-only wrapper uses new decimal separator;old wrapper remains unchanged |
| Reorder duplicate fr-FR entries with different formatting | First duplicate wins,then the newly first duplicate wins,including mixed-case query matching |

A membership snapshot therefore needs real invalidation/ownership semantics;reference/count/IsReadOnly heuristics are insufficient. Caching read-only wrapper values also changes the formatting behavior. These are original-owner observations supporting a counterfactual,**not red/green execution of an implemented cache** or a concurrency guarantee. A per-request/revalidated index,new version/freeze contract or other independent compatible design remains unimplemented/unverified;this is not proof that no optimization could ever help.

## Related upstream work is not our measurement

[dotnet/aspnetcore#70155](https://github.com/dotnet/aspnetcore/pull/70155),by **David Fowler (davidfowl)**,was open at captured head `41165d91cabfc7d7b9d01b5c21984b97fbe7398f`. Its actual diff replaces the exact FirstOrDefault/collection-enumerator allocation seam with specialized List/array loops and an enumeration fallback,plus related provider cleanup/tests/benchmarks. **It retains linear supported-culture matching,not a precomputed O(1) lookup.** We do not duplicate that safe allocation cleanup as a new independent PR,misclassify the entire asymptotic finding as fixed,or reuse its reported numbers as this box's results.

The separate open invariant-culture proposal dotnet/aspnetcore#58844 changes empty-name fallback,not membership indexing. Both actual metadata/diffs and selected owner history are retained under `investigation`.

## Original-only diagnostic results

| Original input shape | Mean(ns) | SD(ns) | CV | Retained N | Process-wide allocated B/op | All8 raw actual mean(ns) |
|---|---:|---:|---:|---:|---:|---:|
| QueryOneMutable | 509.22 | 12.85 | 2.52% | 8 | 936 | 511.22 |
| QueryOneReadOnly | 403.69 | 15.50 | 3.84% | 7 | 712 | 411.68 |
| Query16LastArray | 511.97 | 4.18 | 0.82% | 8 | 712 | 513.99 |
| Query16LastReadOnlyWrapper | 750.12 | 8.10 | 1.08% | 8 | 776 | 752.46 |
| Query64Last | 925.84 | 8.10 | 0.87% | 8 | 712 | 927.95 |
| Query64Miss | 825.23 | 7.86 | 0.95% | 8 | 680 | 827.63 |
| Header3List64 | 2209.35 | 7.34 | 0.33% | 7 | 1432 | 2214.84 |
| Query64Parent | 2453.04 | 28.03 | 1.14% | 8 | 840 | 2455.68 |

**One original-only profile,eight cases,no candidate,paired comparison or improvement percentage.** These are different configured original inputs,not before/after roles. The same DefaultHttpContext is reused;the query collection is warmed and raw header text is preinstalled. Actual providers and full public middleware still run normally per operation,plus a minimal downstream reference/call-count observer. The header parser is not replaced or asserted to be cached. This is not a new HTTP request,network,whole query-parsing throughput,production mix or whole-current-default integration measurement.

The actual default supported list has one culture. The16/64 supported-culture lists are configured scaling diagnostics,not established typical traffic;their names come uniquely from actual platform cultures. The default AcceptLanguage candidate limit remains **3**. A separate actual provider control shows the fourth language excluded at default3 and included only after setting4.

Untimed instrumented CultureInfo.Name getters establish real owner miss-path scans:for1/16/64 supported cultures,the actual one-name query produces **2/32/128** Name reads and actual three-name default-header producer produces **6/96/384**,including culture and UI passes. Real providers and downstream default selection execute. Getter instrumentation is not timed and is not an allocation/performance estimate.

## Evidence and exact boundary

| Requirement | Actual retained evidence |
|---|---|
| Current default/history/docs | `current-source-investigation.json`:all16 selected baseline/working/default source/project/test files,including entire owner,canonically equal at fresh default `49147673007a4b1d676694e2c5f85b83ad76c36f`;history/related diffs/SDK-context delta retained. Current Arcade/Helix/shared-framework inputs differ;no whole-default dependency/SDK integration claim. |
| Existing owning tests | Entire original unit project:40 passed,0 failed,0 skipped = **38 area cases +2 repository AlwaysTest sentinel cases**. All28 source Facts and all10 parent-culture Theory payloads are mapped to exact unique TRX execution/test IDs and positive durations. Sentinels are not owner coverage. No original unit-test rerun or new permanent tests. |
| Real owner/producer contracts | Final36 logical untimed checks,including8 actual timed Setup/task wrappers;44 validated observations/36 producer records. Preserved partial earlier preflights plus timing setups bring the audit to82 producer records/90 owner observations/16 actual setup preflights. |
| Timing data | 8 successful reports,64 raw actual samples,62 retained results,2 upper-filtered samples,24 warmups and129 actual overhead iterations. Full JSON/CSV/raw logs/GC records preserved. BDN0.13 throughput,requested100ms,3warmups/8actual,unroll1,default upper-outlier filtering;raw8 means shown too. |
| Settings and source/image identity | Final92-file execution image/30 frozen source snapshots. Full live audit rehashes final92 plus178 archived image files and90 source snapshots;11 captured PE/PDB bindings/64 selected source-document checks,16 unchanged process/thread/affinity point records. These witnesses are bounded,not whole build provenance or method coverage/continuous OS tracing. |
| No fabricated fix/gain | Closed `measurement-budget.json`:0/3 paired comparisons,one original-only diagnostic attempt,no source candidate or PR. `final-evaluation.json` explicitly leaves original O(N*M) present and other designs unverified. |

BenchmarkDotNet truncates the26-character read-only-wrapper display/Parameters label. Its actual untruncated FullName,source enum and full setup record identify Query16LastReadOnlyWrapper uniquely;raw display text is preserved,not guessed or rewritten.

Allocation is **process-wide** on pinned net12,including native providers,async owner,downstream and other process activity;it is not isolated lookup allocation. `investigation/bdn-memory-accounting` explicitly attributes the previously captured BDN0.13 GcStats source through F007/F006/F002 and checks this measured DLL's identical hash. It is not a new upstream fetch,independent BDN binary/source binding or directly instrumented delegate.

## Preserved preparation failures

The first command wrapper shadowed native dotnet through PowerShell's case-insensitive function resolution;zero native build/test commands launched,and both empty outer logs/source are retained. The corrected original owner/test builds and all40 discovered unit rows pass.

Harness preparation1 lacked a direct HttpContext reference;preparation2 used three targetless C# collection expressions. Both compile failures and exact sources/logs remain. Preparation3 built but wrongly expected the empty query value to produce null;the actual native provider returns a result containing an empty segment. Its18 successful observations,negative child exit and exact image/source are retained. Preparation4 fixes that assertion and reaches20 observations,but actual AcceptLanguage loading fails because standalone output lacks Http.Extensions. Preparation5 adds that real ProjectReference and passes every prepared producer/owner/timed-wrapper path. No product behavior was changed to satisfy a probe.

There are three frozen original execution images across preparations3/4/5;**only the final image was timed**,once. Restores occur only for new/changed manifests;preparations3/4 reused the exact successful preparation2 restore. No completed owning unit suite or diagnostic profile was repeated,and no failure was converted into a claimed performance win.

## Reproduce and inspect

Run `node reproduce-analysis.mjs <absolute-capsule-path> --verify` to audit raw copies,source triples,all38 area+2 sentinel TRX rows/theory payloads,actual producer/selection/mutation records,settings,PDB/source witness consistency,raw timing/GC records,sample statistics/R7 quantiles/confidence-bound arithmetic. The copied portable auditor is actually run before publication. It cannot rehash deliberately omitted DLL/PDB/native/build-binlog bytes,rebind absent PE/PDBs,independently compute confidence critical values or establish unrecorded schedules/production frequency.

For a **new** experiment,checkout the baseline in a separate source tree,activate its locally pinned SDK,run the exact supported scoped build/test workflow,and restore/build the supplied net12/C#13/BenchmarkDotNet0.13 project against actual source using its AspNetCoreRoot property. See [exact historical commands and observed outcomes](validation-commands.md). Guarded historical drivers are evidence,not overwrite/replay instructions. Frozen images/bin/obj/binlogs are omitted with hashes;runtimeconfig/deps metadata is retained separately.

Shared Windows VM,SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105. No deliberate power/priority/affinity or unrelated-process changes,max2 build nodes. No isolated-machine,default-app improvement or production-frequency claim.
