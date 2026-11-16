# F113: exact owned distributed-cache tag-helper entries

**Disposition: measured component/allocation draft, not merge-ready.** The real prepared evict-plus-miss targets used 14.29-14.37% fewer allocated bytes and 8.60-34.61% lower mean time across all three comparisons. The five selected direct-encoder targets used 50.06-50.82% fewer bytes and 33.68-58.23% lower mean time. These are synthetic component measurements, **not application or HTTP speedups**.

All three permitted comparisons are closed. There is one minimal source shape,not three fabricated alternatives;the middle pair reverses execution order. All 84 paired rows,including slower/non-improving controls and shared-VM variability,are retained in [paired-outcomes.md](paired-outcomes.md). Maximum observed CV is **68.36%**;the largest unchanged-control slowdown is **50.26%**. Timing differences are observations,not proof that every difference was caused by this source change.

## Finding and source

Retained finding F113,card `memorystream-unbounded-growth`,is in `DistributedCacheTagHelperService.Encode`. Scanner severity/confidence/frequency labels are provenance,not a confirmed defect,production distribution or measured impact.

- Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh scoped default: `18781e9d03cba0f3df9cdf7fae90f77771ca9f00`;all16 captured default/baseline/working source identities matched before editing. [Exact source investigation](current-source-investigation.json),[source copies](producer-source-copies.json) and bounded owner/consumer history/search records are retained;absence in a bounded search is not exhaustive novelty proof.
- Source branch: `autoperf/F113-distributed-cache-encode`;[later source commit 04c9d1b7acbb1ce1703d0b2decb2d8cc1b1c744b](https://github.com/jaslawinMs/aspnetcore/commit/04c9d1b7acbb1ce1703d0b2decb2d8cc1b1c744b),only one shipping source and one existing test file. **Measured binaries predate that commit and are not relabeled as built from it.**
- [Pre-edit acceptance](acceptance.json),[pre-edit absolute resource goals](resource-goals.json),[selected evaluation](final-evaluation.json),[closed budget](measurement-budget.json).

Only the private encoder changes from a growable MemoryStream/final ToArray to one exact final byte array with ordered prefix/key/value copies. The existing `keyLength = BitConverter.GetBytes(serializedKey.Length)` local is retained. The final bytes remain independently owned;the small four-byte prefix allocation remains. No pool,new cache,configuration,dependency,TFM,visibility,public API or shipped default change. Decode,worker gating,keys,expiration and child rendering are unchanged.

The actual envelope is a **native-endian Int32 UTF8 key-byte count**,then the full **unhashed** UTF8 CacheTagKey.GenerateKey bytes,then formatter payload bytes. The storage lookup key is separately SHA256/Base64. The old class description calls the stored key hashed;this evaluation follows actual source without changing unrelated documentation. Only Windows x64 little-endian execution is measured. The unchanged BitConverter convention is not a cross-endian execution claim.

The checked final-size sum does not silently wrap. **Exact failure-type/heap-limit equivalence for unrepresentable aggregate array sizes or allocation exhaustion is unverified and explicitly excluded.** No multi-GB allocation was forced on the shared machine. This boundary,shared-machine timing variation and missing application/load evidence are reasons this is not merge-ready evidence.

## Actual producer and measurement boundary

The harness uses public `AddMvcCore().AddCacheTagHelper()` registrations,actual singleton service/default UTF8 formatter/storage and MemoryDistributedCache. Every contract exercises public DistributedCacheTagHelper.ProcessAsync through a real miss,observes exact stored bytes/HTML,and reads the next hit without re-rendering child content.

**Public miss rows include explicit cache.Remove on every invocation**,a new TagHelperOutput,actual CacheTagKey/hash/worker/HTML-render/UTF8/envelope/cache work. Tag helper/provider and child TagHelperContent/task are prepared outside timing;HTML encoding/rendering performed by the service remains inside. This is evict-plus-prepared-tag-helper processing,not a full Razor page,HTTP request or external distributed-store transport. No manually injected private callback stands in for the producer.

Direct Encode rows separately bind the actual private method once outside timing;their input key/child HTML/payload is produced through the actual framework outside timing. No reflection,fixture reads,hashes,assertions or output reads occur inside the timed operation. This harness-only binding does not add shipping reflection or cross-framework private access.

Hit controls are seeded using original envelopes and must not invoke child content. Disabled and formatter-only controls are retained. Their expected binary fixtures normalize the envelope;the actual non-envelope operation result is independently checked rather than mislabeled as an envelope.

There are28 explicit cases:empty/small/1KiB/16KiB/128KiB,escaped/Unicode,long key,both-large,public misses/hits/disabled/formatter controls,and exact encoded lengths255/256/257 and65535/65536/65537. Those boundaries are **not GC LOH-cutoff proofs**. No exact count of large MemoryStream resizes/copies is claimed;one large Write can jump directly to the needed capacity after a short key.

## Public evict-plus-miss target observations

| Comparison | Case | Original ns | Candidate ns | Time change | Original B | Candidate B | Allocation change |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Miss16K | 20185.498 | 18024.271 | -10.71% | 116873 | 100073 | -14.37% |
| 1 | Miss128K | 463176.743 | 391131.592 | -15.55% | 919668 | 788235 | -14.29% |
| 2 | Miss16K | 17403.297 | 15205.372 | -12.63% | 116873 | 100073 | -14.37% |
| 2 | Miss128K | 620217.266 | 409117.739 | -34.04% | 919690 | 788209 | -14.30% |
| 3 | Miss16K | 19290.645 | 12614.611 | -34.61% | 116873 | 100073 | -14.37% |
| 3 | Miss128K | 452614.342 | 413698.542 | -8.60% | 919724 | 788182 | -14.30% |

Negative change is lower time/allocation. [All84 paired observations](paired-outcomes.md),[all derived numerical observations](measurement-audit.json) and raw per-profile reports/console/GC/overhead evidence under `measurements` remain authoritative. Controls can drift without source changes;there is no production-frequency weighting or extrapolation to throughput.

## Preservation and expected resource red/green

| Requirement | Evidence |
| --- | --- |
| Native header,complete key/payload,empty/large content,non-ASCII/large keys and actual next-hit HTML | `ProcessAsync_PreservesEncodedCacheBytesAndReadsCachedContent(contentLength: 0/32/16384/131072)`,every row passed on original and selected owner;exact full cache bytes and child-not-rerendered output asserted. |
| Ownership after formatter input mutation and a subsequent larger real store | `ProcessAsync_PreservesStoredBytesAcrossFormatterMutationAndSubsequentCalls`;final version asserts the second envelope too,not merely non-reference-equality. Passed on both owners. |
| Existing cache enable/vary-by,expiration,deterministic concurrency/exception cleanup and formatter contracts | All14 exact original Facts pass in original and extended/selected runs. Existing concurrency tests are preservation controls,not load measurements. |
| Material allocation reduction at actual owning boundaries | All7 pre-edit absolute goals fail on original for expected allocation reason and pass every selected sample:five direct targets require25% reduction,two public misses require5%. All35 selected samples checked. |

Five captured owning-test executions contain **90 passed,0 failed,0 skipped rows**:14 initial,19 extended-original,19 selected,then19 original-final and19 selected-final after strengthening the second-store assertion. These semantic preservation tests pass before and after the performance edit;the frozen allocation goals provide the expected red/green resource proof. Test-image metadata is captured,not a claim of full test-closure or in-test loaded-hash validation.

Current matched images have **56 characterization contracts/280 same-thread and process allocation samples**;timed setup contracts bring current complete contract observations to **224**. An additional56 contracts/280 samples from the preprofile harness are retained under `development/preprofile-settings`,not discarded or called timing comparisons. Workload.cs and Cases.cs are byte-identical across the policy amendment,and all exact per-case input/output bytes agree. Resource thresholds were never retuned.

The final source/test scoped formatter passed without changes. Exact commands and actual outcomes,including historical setup/build warnings,are in [validation-commands.md](validation-commands.md).

## Shared-machine execution policy and historical clarification

Before any F113 timing comparison,inspection found that upstream BDN0.13.0's default InProcessEmitExecutor attempts High process/Highest thread priority and then restores them. **No F113 timing used that executor.** [The preprofile amendment](shared-settings-amendment.json) preserves all earlier source/images/fixtures/calipers and explains the change.

The measured harness uses BDN's stock InProcessEmitGenerator/InProcessEmitBuilder/public RunnableProgram/engine/diagnosers with a minimal harness-only **SettingsPreservingEmitToolchain/IExecutor**. It omits priority/affinity setters and configures Guid.Empty power plan so BDN does not apply a plan. This is actual emitted execution,**not default InProcessEmitExecutor or NoEmit**. It executes on the calling thread rather than the default priority-changing worker wrapper.

All168 startup-linked setups and336 before/after records observe **Normal process priority,Normal thread priority,affinity65535 (all16 logical CPUs)**. Read-only pre/post power-scheme observations agree for all six profiles. These are recorded observations plus explicit no-mutation configuration,not a continuous OS trace. No unrelated process was stopped or tuned;CPU-heavy work was serialized,max2 build nodes.

**Historical clarification:** earlier stock-executor runs,including F112,did not capture these process/thread settings. Lack of a priority message does not establish that BDN never changed its own priority. Read earlier broad "no power/priority/affinity changes" notes as an unverified claim about BDN internals,not proof of normal-priority timing. Their measurements are not rerun or relabeled here;the F113 settings-preserving profiles are independently identified.

## Execution identity and reproducibility

Actual read-only machine observation:Windows `10.0.26300`,Virtual Machine,Intel(R) Xeon(R) Platinum 8473C,8cores/16logical. This is a shared VM and a point observation,not proof of idle/isolation. BDN's own Unknown processor metadata is retained rather than rewritten from CIM.

Pinned SDK `12.0.100-alpha.1.26557.102`,runtime `12.0.0-alpha.1.26562.105`,x64/server+concurrent GC,only Microsoft.NETCore.App framework,RollForward Disable. BDN0.13.0,3 warmups/8 retained results/requested100ms iterations/DontRemove. **168 actual outcomes,1344 retained results,504 warmups,2955 actual overhead samples**,all full setup markers linked by PID/harness/owner/input/output hashes.

Each frozen measured image contains284 copied files/117 declared runtime assets. Only Mvc.TagHelpers DLL/PDB differ;the harness,dependency/runtime configuration,other application assets and fixtures are identical. Original owner matches executed original-test image;selected owner matches executed selected tests. [Original manifest](original-manifest.json),[selected manifest](candidate1-manifest.json),[original closure](execution-closure-original.json),[selected closure](execution-closure-candidate1.json).

There are22 portable-PDB document/source checksum observations. These are **not PE/PDB binding or method coverage**. Raw DLL/PDB/runtime bytes,binlogs and build images are omitted from public evidence. The portable auditor rehashes copied sources/fixtures/raw reports/records and checks captured identities;it cannot rehash those omitted binaries/runtime. Confidence-interval arithmetic is checked using recorded margins;critical values are not independently recomputed.

For a fresh reproduction,activate this repository's SDK,build the exact original/selected owner and owning test dependencies in Release,build [the standalone harness](harness/AutoPerf.Benchmarks.csproj) with `-p:AspNetCoreRoot=<your checkout>`,and freeze separate complete images. Do not substitute installed ASP.NET Core assemblies. Follow the historical freeze/closure scripts and retain fresh artifacts;do not overwrite these closed measurements.

Run each fresh image with explicit absolute fixture/artifact paths and the same3/8/100ms/DontRemove settings in the recorded commands. **Do not add --inProcess or --job**:the program supplies the settings-preserving emitted job. Characterize every case before timing,and keep the public miss eviction/prepared-child boundary. Rebuilding does not promise byte-identical compiler/runtime outputs on other machines.

Offline copied-evidence audit from this results checkout:

```powershell
node .\F113\reproduce-analysis.mjs (Resolve-Path .\F113).Path --verify
```

The audit recomputes exact source/input/native-envelope/TRX/PDB-document/setup/settings/actual-overhead/GC/statistical relationships and all paired rows. It is not a new benchmark run. [Authoritative copy mappings](authoritative-copy-manifest.json) preserve every current and archived fixture without deduplication.
