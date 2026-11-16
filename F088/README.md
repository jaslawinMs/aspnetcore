# F088: reuse complete rich-text table alignment classes

**Qualified allocation/scaling proposal, not merge-ready.** Three serialized AB/BA/AB comparisons show the 32-by-8 full provider/component/HTML path **26.71% faster with 62.32% less managed allocation** by median paired change. However, the small Center full path is **8.29% slower**: all three comparisons regress, by 20.81%/7.78%/8.29%. That cost is not dismissed as noise or hidden behind prepared-owner gains. One unchanged strategy; the **3/3 budget is closed**.

## Corrected finding and minimal source seam

Core does not provide the assumed Markdown/table parser. A real provider supplies `RichTextContent` presentation-node snapshots, public `UIAgent` and the default mapping produce blocks, and `MessageList`/`MessageListContext` render their table attributes. Plain text and the Dojo Markdown fixture do not establish this table path. The scan's assumption that both enum conversion and lowercasing always allocate is not a measured fact.

For Left/Center/Right, select the complete existing CSS class literal. Preserve the original None/missing guard, sequence numbers, regions, row/cell traversal, child text and formatted fallback. Bind `var alignment` in the fallback: the original eligible path reads the alignment indexer twice, and a third read would change a stateful list. Undefined -1/42 and an unexpected second-read None retain their original strings, including `sc-ai-rich-text__table-cell---1`.

Owner introduced by dotnet/aspnetcore#68324, commit `0b72e0b152fa94ada8fa7b74bb6d75b27d13023b`. The retained bounded active dotnet/aspnetcore#68672 patch does not modify this seam; no exhaustive absence-of-overlap claim.

Two source files, **173 additions/one deletion**: one existing owner argument changes, plus six focused test executions in the existing test class. No unrelated existing statement rewrite, public API/default change, dependency manifest change, metadata cache/Hot Reload state or shipping assembly visibility bridge. Source commit `cba203d9b5db57b4c87adb1bd7dac8ec1e0a84ae`, baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`. The assemblies were built before the source commit; dirty-tree manifests and source/PDB checks establish the exact final source, not a claim that committed assemblies were rebuilt and measured.

## Actual measured producer and boundaries

The external four-file project references the in-tree AI and Web assemblies. It uses public producers and components, not enum casing, a privately constructed block or an unchanged parent-only timing proxy.

| Path | Timed work and producer |
|---|---|
| `PreparedRenderBlock` | Public `UIAgent` prepares the actual assistant block outside timing. Time public `MessageListContext.RenderBlock`, reusable `RenderTreeBuilder` clearing and complete table traversal; observe actual frame count. |
| `ProviderComponentHtml` | New actual client/agent/`HtmlRenderer`, public `AgentBoundary`/`MessageList`/sender, default mapping, completed HTML serialization and disposal per operation. Published node construction and DI service-provider construction are outside timing. |
| `CustomProviderComponentHtml` | The same full public path, but a real public `BlockRenderer<RichContentBlock>` registers before sending and bypasses default table traversal. This is a zero-target control. |

Original setup exposed an incorrect assumption that `UIAgent.SendMessageAsync` yields one block. Actual `Engine\UIAgent.cs` maps/yields the user first, then the assistant. The harness now requires both complete, ordered User/Assistant blocks and selects the real assistant result. Both failed assumptions and the corrected source are retained; neither is a measured comparison.

All eleven profiles cover Left/Center/Right 2-by-3, mixed 8-by-3 and 32-by-8, sparse mixed 8-by-7, None, missing, negative/positive undefined values and a plain paragraph. Capture-only alignment wrappers prove actual guard/indexer traversal; timed fixtures use ordinary arrays. Every setup compares exact cells/text/classes, provider calls/updates, roles/lifecycles, frames, final HTML hash/completion and custom bypass against unchanged original oracles.

The full default path performs **seven actual table passes** in this component lifecycle, not an injected seven-render loop. The 32-by-8 case has 256 final cells, 1,792 actual cell/Count visits and 3,584 indexer reads. Every custom capture has zero alignment reads/classes. These repeated original/proposal setup observations establish reachability, not browser allocation or production frequency.

SDK `12.0.100-alpha.1.26557.102`, pinned framework `12.0.0-alpha.1.26562.105`, actual runtime `.NET 12.0.0 (12.0.26.56305)`, BenchmarkDotNet 0.13.0, C# 13, Release, in-process X64/concurrent server GC. Three warmups, eight result iterations, 100 ms target, `DontRemove` outliers. Actual read-only hardware inventory: Microsoft VM, exposed Intel Xeon Platinum 8473C, eight cores/16 logical processors, 64 GiB memory. BDN itself reports an unknown processor; the separate CIM inventory is not substituted into its raw report.

This is a shared Windows host, not a dedicated sandbox. CPU-heavy work was serialized, MSBuild requested at most two workers, and no power/affinity setting or unrelated process was changed.

## All results and retained costs

[All 33 methods/profiles, every paired round and CV](comparison.md); [strict original-host audit](measurement-audit.json); [exact commands/results](validation-commands.md); [hardware](hardware-inventory.json); [harness](harness/AutoPerf.Benchmarks.csproj).

Prepared Left/Center/Right improve **35.96%/37.35%/35.96%**, saving 864/960/912 B per six-cell render. Prepared mixed 8-by-3/32-by-8 improve **41.02%/43.55%**; the large prepared allocation falls from median 50,379 to 11,721 B/op. Full Left/Right improve **10.95%/7.96%**; full mixed 8-by-3/32-by-8 improve **18.26%/26.71%**. The large full allocation medians are 434,218/163,601 B/op. These separate per-owner medians are not substituted for paired arithmetic.

**Full Center regresses in every round**, despite lower allocation. Prepared missing/negative/positive controls have **4.75%/3.04%/2.45% slower medians**; their largest individual costs are 9.97%/10.78%/13.13%, with unchanged heap. Custom Left/mixed-small/sparse controls are **3.16%/2.84%/2.42% slower** by median. The custom Positive first-round 21.49% apparent gain reverses in round two and is not attributed to a table optimization that it never reaches. Small one-byte heap movements are retained. No cause was established for these control movements; inspect all rounds and variability.

The audit cross-checks **198 outcomes, 1,584 JSON result samples, 1,584 actual workload and 1,584 console result rows**, 198 exact measured setup-state files, 198 setup plus six startup owner markers, and nine source/PDB proofs. Both frozen execution sets contain 89 files and 31 declared runtime assets; only Components.AI DLL/PDB differ. Original/proposal harness, oracles, runtime/dependency configuration and all other copied execution bytes are identical.

Raw copied binaries are not published. Their complete original-host hash inventory and portable-PDB records are retained. The published-record auditor independently verifies raw source/state/console/report arithmetic and the recorded identities, **not omitted binary/PDB bytes**. Rebuilding from the project is reproducible work, not proof of bit-identical original binaries.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Defined output and eliminated per-cell class objects | `MessageListTests.RichTextTable_ReusesDefinedAlignmentClasses`: all Left/Center/Right rows reach the real provider/default component and exact six-cell frames. Every original row fails specifically at `Assert.Same`; every selected row passes. |
| None, missing and undefined values; ignored non-row/non-cell children | `MessageListTests.RichTextTable_PreservesNoneMissingAndUndefinedAlignments`: exact text/class tuples and absence of ignored text pass before/after. |
| Stateful second read and unchanged lookup count | Both None/42 rows of `MessageListTests.RichTextTable_FormatsTheSecondAlignmentRead` pass before/after, asserting the actual output and two value reads per original guard Count read. |
| Ordinary and streamed rich text/default/custom rendering | Existing `MessageListTests.RichTextContent_RendersStructuredNodesAndEncodesUnsafeContent`, `StreamingRichTextContent_ReplacesHeterogeneousSiblings`, `StreamingBlock_RendersStreamingModifierUntilComplete`, `MostRecentlyRegisteredBlockRenderer_Wins`, and the selected rich-node/content/paragraph suites remain green. |
| Actual browser/UI preservation | Unchanged `AIApp.E2E.Tests.Tests.RichTextTests.RichText_RendersTheStructuredContentMatrix` executes and passes 1/1. Canonical InteractiveServer original/selected sample probes prove actual send/release interactions, gated two-to-eight-row snapshots, exact classes/text/computed CSS, plain control, executing owner/PID and zero page errors/failed requests. |
| Benchmark producer/owner/bypass reachability and resources | All 33 cases per launch compare actual original oracles; 198 owner-marked captures and all measured samples/rows are audited. No private setter, handler callback injection or instrumented timed alignment list. |
| Source and runtime boundary | Nine actual source/PDB checks, tested/executing owner equality, identical original/selected test source, complete 89/31 owner-only closure, native source patch and actual committed-source identity. |

Original existing selected suites: **23/23 pass**. With the six new executions, original is **26 pass/three expected resource failures/zero skip**; selected is **29/29 pass**. Together with the actual browser matrix there are **82 distinct XML executions: 79 pass/three expected resource failures/zero skip**. The entire Components.AI suite was not run. Scoped owner/test whitespace checks and source diff checks pass.

## Browser setup corrections and permanent boundary

A socket alone did not establish attached input handlers. The final canonical probe waits for the repository's actual `_blazorEvents_` attachment marker before send/release. Assistant messages belong inside user-initiated turns, so the corrected selector targets `.sc-ai-message--assistant`. Failed original probes, exact scripts, HTML and screenshots are retained.

The quiet scoped build wrapper returned zero but produced no E2E testasset outputs. Actual direct build then failed NETSDK1004, justifying targeted restore. Two MTP attempts failed initialization because a Chromium headless shell was absent and the Edge channel was not loaded. The actual pinned Playwright .NET adapter requires outer `BrowserName`/`LaunchOptions` but nested lowercase `channel`/`headless`. A session-only actual-driver startup probe isolated that prerequisite; its initial missing Bcl reference and final successful Edge startup/click/cleanup are retained.

The next real matrix attempt reached browser startup but the existing app launcher required Debug AIApp.exe: it uses `dotnet run --no-build --no-restore --no-launch-profile` without configuration. Dependency-aware Debug preparation then let the unchanged actual matrix execute and pass. No shipping launcher, Components.Testing settings or package manifest was changed. The startup probe alone is not Blazor validation.

The permanent resource/attribute contract is managed and fully reached in the existing component tests; the browser proves unchanged UI, not object identity or allocation. Temporary canonical sample/project/probe edits were archived and removed; the sample project was byte-for-byte restored, and owned servers/browsers stopped.

## Reproduction and intentionally unverified boundaries

Start a separate clone at the recorded baseline in `C:\src\aspnetcore`; preserve any unrelated work. Activate `. .\activate.ps1` before each dotnet shell. The supplied project uses the same in-tree AI/Web references and pinned packages. Copy the four harness files into an external scratch `harness` directory with `contract-oracles.json` in its parent. Restore only that new project's dependencies, build Release with the recorded flags and `-m:2`, and copy the complete output to an original immutable directory. Apply `source.patch`, build the identical harness again, and copy proposal output separately. Ensure only the target DLL/PDB differ before executing the recorded BDN flags. Do not rerun or overwrite this finalized item's recorded three comparisons; fresh reproduction is separate evidence.

Use `node .\reproduce-analysis.mjs . --published-records --verify` to check published raw arithmetic/source/state against the original host audit. Use `F088-xml-audit.ps1 -RunRoot <copied-package> -Verify` to reparse actual XML without replacing its recorded JSON. The original strict auditor can additionally recheck all copied binaries when given the original complete execution snapshots.

To reproduce the archived canonical page, copy it into the server-only per-page sample and apply the archived temporary AI project reference, build and launch according to Components guidance, and read its actual listening URL. Copy the archived browser probe beside a scratch `autoperf-playwright-tools` directory containing Playwright 1.62.0; invoke `node browser-probe.mjs <actual-url> <output-json> <phase> <actual-owner-sha256>`. Installed headless Edge was used here. Remove only those temporary edits and stop only owned helpers afterwards.

The exercised browser boundary is InteractiveServer per-page with prerender attachment and gated snapshots. WebAssembly/Auto/global modes, navigation/rehydration, NativeAOT/trimming, other OS/runtime, parser/LLM/network latency, browser/whole-process memory, first-process startup, production table frequency and universal throughput remain unverified. The Center and fallback/control timing costs require review before advancing this allocation-focused draft.
