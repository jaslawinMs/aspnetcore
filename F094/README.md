# F094: completed synchronous Razor section task materialization

**Qualified allocation-focused draft, not merge-ready. No material full-view
speedup is established.** The scanner's synchronous pending wait is required
and remains. A private `ValueTask<HtmlString?>` core lets successful synchronous
callers avoid the completed `Task<HtmlString?>` wrapper; pending and faulted
values retain `AsTask().GetAwaiter().GetResult()`. Public asynchronous callers
still receive `Task<HtmlString?>` through `AsTask()`.

## Results, costs and uncertainty

The actual primed public-page resource assertion is genuinely red/green:
**72 B to 0 B per present completed synchronous section**, across 5000 owners.
This removes the entire measured completed wrapper, **not all page/view
allocation**. Completed-present public async calls remain **72 B**; missing
optional sync/async calls remain **0 B**. The real `DefineSection` callback and
exact `HtmlString.Empty` or null token are exercised, not fabricated results.

All **18 completed-section `ViewSync` pairs** show the expected approximately
72 B/section reduction: reported **72 B** for one, **143-145 B** for two,
**576 B** for eight/long-eight, **2304 B** for 32 and **9217-9218 B** for 128.
In pair1 these are only **0.73-10.44% of total full-view allocation**.
The full-view methods include actual RazorView transfer, scoped pooled
buffering, HTML extraction/validation, DI scope creation and disposal.
They do not isolate only the saved task or claim application throughput.

There is **no repeatable material timing win**. Full-view completed-sync
timings range **5.79% faster to 10.82% slower**; 8 and 32 sections have
**3.44% and 3.68% slower paired medians**. `PageAsync/Completed8` regresses
in every pair, with a **3.29% slower median**. Async callers are modified-code
compatibility controls, not untouched controls: their private builder and
public adapter also change. No section-call frequency or workload weighting
is assumed.

The first `PageSync/Completed1` pair is **119.15% slower** and reports
**113 B/op more**, despite the independently proven wrapper saving. Its
other pairs report 71 B and 128 B saved, not a clean 72 B result. This entire
first-case anomaly remains; no cause is established or used to erase it.
`NoSections` bypasses the changed core and is genuinely unchanged, yet its
timings move **8.28% faster to 8.28% slower**.

Genuinely pending timings range **53.03% faster to 54.29% slower**, with
maximum **58.92% within-launch CV**. Reported pending saved bytes range
**-51 to 44 B/op**. These scheduling-heavy full-lifecycle results do not
establish a pending allocation or latency win. Possible changed builder/
adapter costs are not dismissed: a pending-only task-size allocation claim
is intentionally unverified at the isolated boundary.

[All108 paired outcomes, including every cost](comparison.md).
[All216 raw outcomes](raw-outcomes.json).
[Console-linked samples, warmups and GC totals](console-measurement-receipts.json).
[Actual owner/harness/PID-linked setup signatures](setup-correctness.json).
[First comparison review, retained before later pairs](first-comparison-review.json).

## Source and production producer

The sole shipping change is **8 additions/3 deletions in RazorPage.cs**:
the successful-completion synchronous branch, public async `AsTask()` adapter
and private generic ValueTask return. Existing locals, validation, delegate
await, rendered-state ordering, missing/required branches, messages and token
comments remain. There is no public API signature/default/visibility,
dependency, cache, or shipping assembly-boundary change.
[Measured original](source-before.cs), [selected](source-after.cs),
[exact diff](candidate-source.diff), [committed source scope](committed-source-identity.json).
Git canonicalizes committed C# CRLF to LF. The
[actual remote blob](committed-canonical-source.cs) differs from the measured
source **only in that canonicalization**; both are preserved, with
[exact hashes and verification](committed-source-canonicalization.json).
The initial prepublication raw-blob identity assertion detected this difference;
it was corrected to verify the actual canonical blob, not weaken code identity
or rewrite measured source. No new measurement or shipping edit followed.

The owner, RazorPageBase, RazorView and owning test blobs match upstream
default head `b38e2847d9cda5fbba26177354ed11ede3f7dbfe` and campaign baseline
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. This is scoped source identity,
**not full newer-branch or runtime equivalence**. The actual introduction
of RenderSectionAsync is commit `4ec6da1ed3e00b50f566ca841e885dbd038c2699`,
October3,2014. Its exact original owner patch is preserved; the empty
modern-path Git show is retained as an unsuccessful path lookup, not diff
evidence. Public XML documentation says the result is a token and the
rendered section writes to Output; both behaviors remain.

`ViewSync`/`ViewAsync` use **actual RazorView.RenderAsync**:
handwritten content ExecuteAsync calls real DefineSection, RazorView transfers
the original section dictionary and marks content for layout, the actual
layout renders it using real scoped MemoryPoolViewBufferScope buffering,
then the exact complete HTML is flushed. A locator and empty activator isolate
this managed boundary, not Razor compilation, a hosted request, browser or
network. The `Page*` diagnostics call real public pages and callbacks but
assign PreviousSectionWriters themselves; they do not prove RazorView transfer.

Nine profiles x four callers exercise no sections, 1/2/8/32/128 completed
sections, eight 256-character names, missing optional and genuinely pending
section producers. The pending callback waits on a real owned producer gate.
A bounded observable coordinator verifies the synchronous caller is waiting
before release, or that the async call returns incomplete; external writer
output is empty before release. No arbitrary synchronization sleep or
directly injected completion/result is used. Owned coordinator threads join
during disposal.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Faithful completed-wrapper resource effect | `SectionProbe.MeasureResources` calls real public RenderSection on 5000 precreated/primed owners with real DefineSection callbacks. Original `--assert-no-completed-wrapper` reaches its assertion and fails for360000 extra B; selected passes with0. Async present72B and missing0B controls are unchanged. [Original](zero-wrapper-before/states/zero-wrapper-resource-check.json), [selected](zero-wrapper-after/states/zero-wrapper-resource-check.json). |
| Actual producer transfer, pooled buffering, tokens and final HTML | `SectionLifecycle.RunSync`/`RunAsync` and `SectionBenchmark.Verify` match all36 original/selected signatures. Every measured setup independently validates invocation/token/null counts, original dictionary identity, actual layout marker, pooled buffer type and exact `<body/>` plus section HTML; 216 receipts are console/owner/harness/PID-linked. Page-only diagnostic transfer is explicitly bypassed. |
| Required pending sync wait and asynchronous return | `GatedPending1` reaches real callbacks in all four callers. Sync workers are observed waiting before release; async returns incomplete before release. All24 measured pending setups and manual counterparts validate empty before-release writer output and final content. Required waits are retained, not optimized away. |
| Actual immediate/pending producer failures and rendered-state ordering | `SectionProbe.VerifyFunctional` exercises four real full-view fault cases, immediate/pending x sync/async. Original/selected match exact unwrapped SectionFailure, message, empty final output and duplicate-after-failure rejection. `RenderSection_ThrowsIfSectionIsRenderedMoreThanOnce` and `RenderSectionAsync_ThrowsIfSectionIsRenderedMoreThanOnce_WithSyncMethod` also pass. |
| Public task/token/null/entry compatibility | `SectionProbe.VerifyFunctional` checks synchronous null-name/layout validation, distinct public present Task identities, HtmlString.Empty identity, cached null Task, mixed sync/async duplicate and completed-fault unwrapping. `RenderSection_ThrowsIfPreviousSectionWritersIsNotSet` and `RenderSectionAsync_ThrowsIfNotInvokedFromLayoutPage` pass. |
| Required/missing, body and section behavior | `RenderSection_RendersSectionFromPreviousPage`, `RenderSection_ThrowsIfRequiredSectionIsNotFound`, `ExecuteAsync_RendersSectionsAndBody`, `DefineSection_ThrowsIfSectionIsAlreadyDefined` and all five selected EnsureRenderedBodyOrSections tests pass on both sources. [All28 actual rows/definitions/positive durations,14 exact identities/no skips](actual-test-audit.json). These existing tests are unchanged green/green preservation, separate from resource red/green. |
| Fair source, execution and raw result linkage | Complete266-file copied sets and98 declared runtime assets differ only in Razor DLL/PDB; harness/runtime/deps remain identical. Actual owner and four harness-source PDB document proofs match snapshots. All216 outcomes/108 pairs/1728 console-linked retained results/648 warmups, actual GC totals/rounding, sample mean/variance/SD/SE/median and CI internal arithmetic are audited. CI distribution quantiles are not independently recomputed. |
| Excluded/unverified boundaries and costs | No isolated pending task-size result, Razor compiler/template, HTTP/server, browser, application throughput, production frequency or whole-current-default build equivalence claim. Every first-case anomaly, async regression, unchanged bypass movement and pending scheduling/heap uncertainty is retained. |

## Settings and budget

**Three comparisons AB/BA/AB, one unchanged strategy; budget3/3 closed.**
Each immutable original/selected launch contains36 cases,3 warmups and8
retained results, requested100ms, `DontRemove`. There is no fourth comparison
or hidden tuning. The first-pair review is retained separately.

BDN0.13.0; Release/net12.0/x64/in-process/concurrent-server-GC; C#13 harness.
SDK `12.0.100-alpha.1.26557.102`, runtime pack
`12.0.0-alpha.1.26562.105`, actual banner
`.NET 12.0.0 (12.0.26.56305)`, Windows10.0.26300.
BDN reports Unknown processor and missing core counts; separate read-only
Windows inventory reports Intel Xeon Platinum8473C,8 cores/16 logical
processors, MaxClockSpeed2100. This is a **shared machine**, not a dedicated
benchmark host. CPU-heavy work was serial/max2 build nodes; no power,
affinity or unrelated process changes.

## Reproduction and immutable evidence

[Pinned external BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references actual in-tree shipping owners and the existing Razor.Test output
dependency closure. Build the owning Razor.Test project first. Override
AspNetCoreRoot when using a different checkout; it defaults to this host's
`C:\src\aspnetcore`. Restore the new external manifest using unchanged
repository NuGet.config, then build original/selected sources independently
and retain identical original harness/runtime/deps. Use the
[historical immutable runner](historical-benchmark-runner.ps1).
Every fresh dotnet shell activates `. .\activate.ps1` from the repository root.
No global.json/package manifests/NuGet.config or project naming changes.

The initial harness build had three nullable-interface warnings; that source,
command and log are archived. GetView/GetAbsolutePath nullability was corrected
before the measured original was frozen. Final builds have0 warnings/errors;
there was no timed preparation failure or consumed extra comparison.
[Exact commands and outcomes](validation-commands.md).
[Actual raw/source audit](measurement-audit.json).
[Complete copied execution closure](execution-closure.json).
[Original PDB proof](owner-pdb-before.json), [selected](owner-pdb-after.json).

`node .\reproduce-analysis.mjs . --verify` and
`.\F094-xml-audit.ps1 -RunRoot . -Verify` revalidate published source/raw/setup/
test/proof records without rewriting them. **Raw DLL/PDB bytes are omitted**:
the public auditor rechecks recorded document proofs and closure, not the
omitted binary bytes or the original-host PDB inspection. Sources, projects,
logs and raw reports are authoritative byte-identical copies; generated
command/copy/receipt records are identified separately.
