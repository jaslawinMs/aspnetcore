# F118: reuse bounded builders for general URL attribute content

**Qualified allocation-focused draft, not merge-ready.** Real general/non-HtmlString IHtmlContent rendering through UrlResolutionTagHelper nearly halves warmed allocation for bounded values: **1320 ->664 B at256 characters,4392 ->2200 B at1024,and8488 ->4248 B at2048**. The real ordered tag-helper producer/runner has the same1024-character4392 ->2200 B result. All15 preselected absolute resource samples were expected-red on original and green on candidate,without retuning inputs or thresholds.
**Not an ordinary Razor-page optimization.** The actual RazorPageBase buffered attribute producer already publishes HtmlString and bypasses this fresh-writer seam. Its control remains2136 B in both variants. No HTTP,full-page,production-frequency,whole-application or cold-latency improvement is claimed.
**Costs remain visible:** oversized8192-character prepared rendering is80.47% slower,4.58% faster,and29.45% slower across the three pairs,with no allocation reduction. The real runner8192 case is47.91% slower,9.08% faster,and52.39% slower. URL/encoded and unchanged-control timings vary;the draft is not a general latency recommendation.

Independent source: [3f771ee1df103d0869c07806b647442aa9dc819b](https://github.com/jaslawinMs/aspnetcore/commit/3f771ee1df103d0869c07806b647442aa9dc819b),parent 37e809ead5824bc753a1c3d56f11615bdb1296c5. Only src/Mvc/Mvc.Razor/src/TagHelpers/UrlResolutionTagHelper.cs changes. Raw measured source SHA256:6B74D4A12F9EDE7505E8E4C5203BF4855752CEA1CD3FDE195379C48E772896E8. Measured binaries predate the later source commit and are not relabeled as built from it.
The final draft URL and immutable publication receipt are recorded in publication.json after publication. This capsule remains immutable independently of that later receipt.

## Scope,mechanism and acceptance

[Acceptance criteria](acceptance.json) and [absolute resource goals](resource-goals.json) were fixed before any shipping edit or timing. Original allocation came from a fresh StringWriter and its abandoned builder only on the general IHtmlContent branch. Strings,HtmlString,suppressed/unknown tags and non-content attributes are separate controls.
The candidate adds a private static ObjectPool<StringBuilder> using the existing public StringBuilderPooledObjectPolicy. It still creates a fresh StringWriter(builder) per call,preserves existing using/locals/branches,and returns the builder in finally even after content throws. The existing policy creates capacity100 builders,rejects capacities over4096,clears accepted builders and defaults to at most2x processor-count retained objects. No public/protected API,constructor,default,TFM,dependency,visibility bridge or unrelated cleanup changed.
A fresh writer preserves its actual type,current-culture format provider,newline and disposal. Separate active leases support synchronous nested Process calls. Arbitrary content retaining the borrowed writer/builder after its callback or depending on a fresh builder capacity is **not established compatible**;this draft makes no universal ownership/capacity guarantee.

### Actual producer and current-default boundaries

Campaign baseline37e809ead5824bc753a1c3d56f11615bdb1296c5;captured current default3cd798fe4a76075f68624e8f4a8567aab359ae46. All20 scoped helper/project/test/HTML/URL/runtime/pool files match after canonical CRLF comparison. Two actual MVC context sources are additionally frozen. This is measured-component source equivalence,**not full latest-default application integration execution**.
Positive runner cases use actual TagHelperRunner/TagHelperExecutionContext. An earlier tag helper(Order=-2000) publishes real DefaultTagHelperContent,then UrlResolutionTagHelper(Order=-1999) runs. Helpers are added in the opposite order so the real runner sort owns producer ordering. Ordinary prepared calls restore original attributes before every Process call;otherwise a previous HtmlString replacement would create a false fast-path benchmark.
The nearest-opposite PageBuffered1K calls actual RazorPageBase.BeginAddHtmlAttributeValues/AddHtmlAttributeValue/EndAddHtmlAttributeValues before the resolver. That normal buffered producer emits HtmlString,so it must not be presented as a beneficiary of the selected general-content pooling seam.
URL cases use actual UrlHelperFactory/UrlHelper and real ViewContext/DefaultHttpContext with initialized RouteData/ActionDescriptor,not an injected URL callback. A diagnostic uses actual endpoint ResourceAssetCollection and routing services/factory,asserting real EndpointRoutingUrlHelper and fingerprinted output. No HTTP server or complete Razor page is timed.

## All measured comparisons

Exactly3 source comparisons/one unchanged source shape/six24-case profiles. Order:original/candidate,candidate/original,original/candidate. No tuning or retiming after closure. Each outcome has3 warmups and8 retained results;DontRemove retains outliers. Negative change means lower observed component mean. Pair medians are descriptive,not pooled estimates,proof of significance or causal application claims.

| Case | Pair1 time change | Pair2 time change | Pair3 time change | Median change | B/invocation original -> candidate |
| --- | ---: | ---: | ---: | ---: | --- |
| PreparedShort | -7.26% | -28.12% | -15.36% | -15.36% | 552 -> 280 |
| Prepared256 | -1.48% | -31.42% | -36.35% | -31.42% | 1320 -> 664 |
| Prepared1K | -8.17% | -43.11% | -22.90% | -22.90% | 4392 -> 2200 |
| Prepared2K | -19.88% | -48.09% | -40.45% | -40.45% | 8488 -> 4248 |
| Prepared4K | -23.69% | -49.86% | -38.76% | -38.76% | 16680 -> 8344 |
| PreparedOver4K | 36.98% | 11.87% | -11.43% | 11.87% | 16688 -> 16688 |
| Prepared8K | 80.47% | -4.58% | 29.45% | 29.45% | 33064 -> 33064 |
| PreparedEncoded1K | 23.15% | 1.56% | -2.62% | 1.56% | 16864 -> 16864 |
| PreparedUrl64 | 14.34% | -26.56% | -5.52% | -5.52% | 1040 -> 768 |
| PreparedUrl1K | 33.22% | -28.97% | -17.14% | -17.14% | 10640 -> 8448 |
| PreparedTwoAttrs | -7.32% | -40.02% | -48.29% | -40.02% | 8784 -> 4400 |
| RunnerShort | -6.34% | -22.02% | -11.95% | -11.95% | 552 -> 280 |
| Runner1K | -1.46% | -39.83% | -32.69% | -32.69% | 4392 -> 2200 |
| Runner8K | 47.91% | -9.08% | 52.39% | 47.91% | 33064 -> 33064 |
| RunnerUrl | -9.47% | -16.24% | 6.63% | -9.47% | 1040 -> 768 |
| RunnerTwoAttrs | -4.12% | -40.98% | -27.49% | -27.49% | 8784 -> 4400 |
| PageBuffered1K | 57.60% | 8.16% | -6.69% | 8.16% | 2136 -> 2136 |
| StringControl1K | 0.02% | -0.77% | -1.55% | -0.77% | 0 -> 0 |
| HtmlStringControl1K | 1.09% | -1.71% | -1.27% | -1.27% | 0 -> 0 |
| NullTagControl | 5.75% | 0.74% | -2.11% | 0.74% | 0 -> 0 |
| UnknownTagControl | 0.27% | -0.12% | -0.47% | -0.12% | 0 -> 0 |
| NonContentBoolControl | 4.19% | -0.21% | -0.25% | -0.21% | 0 -> 0 |
| Parallel1K | -2.97% | -4.10% | -15.45% | -4.10% | 3373091..3373095 -> 1689605..1689637 |
| ParallelFast | -2.60% | -4.31% | -1.41% | -2.60% | 10..28 -> 0..26 |

Full means,both CVs,reported confidence-interval overlap and actual overhead subtraction are in [comparison-outcomes.md](comparison-outcomes.md). Complete console/CSV/HTML/full JSON are under measurements/. Long display parameters can be abbreviated by BDN;the auditor joins complete untruncated FullName and exact setup case labels.
Runner1K improves1.46-39.83% across observed pairs;RunnerTwoAttrs4.12-40.98%. These are scoped custom-producer observations,not ordinary Razor or request throughput. Prepared URL1024 includes a33.22% slower pair;RunnerUrl includes a6.63% slower pair. The encoded fixture has unchanged16864 B and mixed timing. Nothing unfavorable was dropped.
The unchanged PageBuffered1K mean moves+57.60%,+8.16%,-6.69%,with identical2136 B allocation. That control drift is retained as a limitation,**not attributed to executing the pool seam it bypasses**. Shared-VM conditions and JIT/layout/order effects are not disentangled.
Audited144 outcomes,1152 retained results,432 warmups and2370 actual overhead samples;192 complete contract captures,240 allocation calipers,144 exact setup/hash/PID links and288 before/after settings records. Maximum observed CV=29.86%.

### Units,allocation and retention

Prepared/Runner/Page rows are one public Process or actual producer/runner call. TwoAttrs is one call over two attributes. Parallel is12 persistent workers x64 real prepared attribute calls =768 calls/coordinated batch,including gates/scheduling. It is not single-request latency.
Pinned BDN0.13.0 uses the available GC.GetTotalAllocatedBytes(precise:true) delegate on this runtime: **BDN allocation is process-wide and includes workers**,plus other process overhead. Pinned upstream source/original retrieval receipt and actual runtime-delegate witnesses are retained. Independent worker calipers attribute4392 ->2200 B per actual1024-character call;fast string worker loops allocate0 in both. BDN parallel fast-control process totals vary0..28 B rather than universally zero;do not substitute worker numbers for process totals.
Every selected goal uses five4096-operation calipers. Original minima1320/4392/8488 B exceed immutable maxima1024/3072/5120 B;candidate664/2200/4248 B passes all15 samples,including small positive tiering/noise deviations preserved in the raw data.
At4096 raw characters,16680 ->8344 B;at4097 and8192 characters allocation is unchanged. The encoded1024-character input renders4072 characters yet also has no allocation reduction. The retention policy checks **builder capacity,not output length**;these measured writers were not instrumented for exact instantaneous capacities,so no sharp output-length cutoff or unobserved mechanism is claimed.
Three fresh processes per variant observe actual first1024-character output and then8192-character output. Candidate immediate read-only materialized state is one cleared capacity1024 builder after the first render,then no retained builder after the oversized render;original has no pool. These are bounded point snapshots,not isolated type-initializer costs or cold latency.
After concurrent characterization,the candidate snapshot contains12 cleared capacity1024 builders. Source policy bounds retention to32 builders on this16-logical-processor runtime and capacity4096 each;the observed state is not a precise total retained-heap measurement or exploration of every concurrent schedule. No private pool fields are written by the diagnostics.

## Requirement coverage

| Requirement | Evidence |
| --- | --- |
| Real general-content producer and ordered resolver | RunnerShort,Runner1K,Runner8K,RunnerUrl,RunnerTwoAttrs;exact typed/name/style/rendered contracts in fixtures/ and all measured setup records. |
| Ordinary Razor nearest-opposite | PageBuffered1K executes real RazorPageBase buffering,publishes HtmlString and preserves2136 B;no ordinary-page gain claimed. |
| Culture,newline,type and disposal | render-controls.json culture rows en-US/fr-FR/tr-TR and throw-partial-then-clean observe actual StringWriter/current provider/newline and ObjectDisposedException after failure. |
| Reentrancy,encoding,whitespace,versioning | render-controls.json reentrant-real-process,general-content-whitespace-encoding and real-resource-asset-collection;exact nested output/once-encoding/fingerprinted endpoint result. |
| Allocation red/green | Prepared256,Prepared1K,Prepared2K;all15 original expected-red and15 candidate green samples against unchanged resource-goals.json. |
| Existing URL contracts | All38 unchanged UrlResolutionTagHelperTest rows per variant,including Process_ResolvesTildeSlashValues,Process_DoesNotResolveNonTildeSlashValues_InHtmlString,Process_DoesNothingIfTagNameIsNull and Process_ResolvesVersionedUrls_WhenResourceCollectionIsAvailable;exact full parameterized names/IDs/durations in tests/<variant>/test-audit.json and TRX. |
| Concurrent real loops and bounded retained state | Parallel1K,ParallelFast,independent worker allocation calipers,cold/ snapshots and characterization/<variant>/states/final-pool-state.json. |

Both original/candidate execute38 owning rows once:76 actual row executions,zero skips,positive durations. Discovery,definition,result and TRX entry IDs/names are joined exactly,not inferred from a green summary. Existing test projects remained unchanged. **No permanent pooling-specific xUnit tests were added to the shipping tree**;this draft supplies a standalone faithful regression/measurement harness rather than claiming that missing integration work is complete.
Active images each contain284 files/118 declared runtime assets,with only the actually tested Mvc.Razor DLL/PDB swapped. Harness,fixtures,all other producers/runtime/deps are unchanged. Loaded owner/harness/BDN hashes,fixture hashes,PIDs and point settings are recorded. Live audit rehashed both whole application images and200 pinned shared-runtime/installed-host files.
All48 selected source/PDB document checks passed;these are **not independent PE/PDB binding or method-coverage proof**,and captured test output images are not an in-test full loaded-closure trace.

## Shared-machine policy and reproduction

Windows11 Enterprise Microsoft VM,Xeon Platinum8473C,8 cores/16 logical processors,about64GiB RAM. **Shared environment,not a dedicated or continuously idle sandbox.** SDK12.0.100-alpha.1.26557.102;runtime12.0.0-alpha.1.26562.105. Runtime.Version reports12.0.0;captured CoreLib informational version identifies the actual build.
CPU-heavy work was serialized,max2 build nodes. No deliberate priority,affinity,power-plan or unrelated-process changes. Custom settings-preserving emitted toolchain uses public BDN generator/builder/runnable/engine/diagnosers but omits stock executor priority/affinity setters. Guid.Empty disables BDN power-plan selection;no --inProcess/--job override.
Observed process/thread priorities Normal/Normal and affinity65535 at captured points;workers have before/after observations. These observations and explicit no-mutation configuration are **not continuous OS tracing** or proof that outside workloads never changed conditions.
The actual [standalone project](harness/AutoPerf.Benchmarks.csproj) targets net12.0/C#13,pinned BDN0.13.0 and exact runtime. It references the actual in-tree Mvc.Razor project and scoped tested dependency closure,not installed ASP.NET Core fallback. Build owning tests first;AspNetCoreRoot can be supplied for a different source path.
Every fresh dotnet shell activates `. .\activate.ps1` from the source repository root. Actual exact commands and observed results are in [validation-commands.md](validation-commands.md) and execution.json records. Historical wrappers have overwrite/branch/budget guards and **must not be replayed over these closed artifacts**. New timing reproduction requires new output directories and builds of both exact source variants,not a fourth comparison in this evaluation.
The public copied audit command is `node <absolute-capsule>\reproduce-analysis.mjs <absolute-capsule> --verify`. It recomputes all preserved numerical/source/fixture/TRX/PDB/settings/resource/GC/actual-overhead relationships and validates exact authoritative copy hashes. DLL/PDB/runtime/bin/obj/binlog images are deliberately omitted: **public audit cannot independently rehash those omitted bytes**,nor does it independently compute confidence critical values.
Preserved preparation corrections:initial manually guessed discovery minimum40 versus actual38 was corrected before any test execution,without rediscovery. Explicit routing context was added before first fixture execution. The first fixture preparation had all24 outputs but failed its real endpoint metadata control:an IEnumerable overload enumerated assets instead of storing the ResourceAssetCollection. Corrected producer construction/positive metadata/factory guards passed,without changing expected output or resource goals. An ad hoc PowerShell preview parser failure never invoked a timing child or advanced budget. No actual completed test or timing profile was rerun. See preparation-corrections.json and development/.
