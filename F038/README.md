# F038: one-probe new-tree keyed rendering

**Qualified fork-only draft candidate:** the declared `KeyedStable:Integer:256` primary uses
**7.49%, 8.07%, 6.36% less renderer time** in three alternating comparisons
(median 7.49%), with **74 B/op unchanged**. This is a prepared actual-renderer result,
not application throughput, DOM/browser timing, or Mono/AOT performance.

Source branch: [`autoperf/F038-render-tree-keyed-lookup`](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F038-render-tree-keyed-lookup)
at `9c422372a360c0ef06ffcaf8d06995a8873ceaec`. Its diff is exactly one shipping file, 5 insertions/3 deletions.
The benchmark project and evidence live here, not in the shipping source diff.
`publication.json` is added separately after immutable remote blobs and the fork draft are verified.

## What changed and why

Only the new-tree loop in `RenderTreeDiffBuilder.BuildKeyToInfoLookup` changes.
`CollectionsMarshal.GetValueRefOrAddDefault` replaces a lookup followed by an indexer write.
The existing `existingEntry` local and branch structure are retained. The miss is immediately
initialized with `new KeyedItemInfo(-1, newStartIndex)`; the existing-key path preserves the
old index and exact duplicate guard. No ref escapes or spans another dictionary insertion.
The old-tree loop, comparer, exceptions, sibling scopes, permutations, pooling and public/protected surface are unchanged.

**Historical credit:** the same new-tree ref strategy was explored in
[dotnet/aspnetcore#70133](https://github.com/dotnet/aspnetcore/pull/70133) and removed by
`95837ac848beda6c84dc17f44be2298dd7414df2` under that earlier campaign's constraint.
That PR closed without merging; its final old-tree-only change is outside F038.
This is not a novelty claim. Its historical numbers are not this machine's results.

## Measurements, including the non-wins

- [All 40 profiles and all three pairs](comparison-results.md): 240 rows, 1,920 retained samples,
  independently matched between native stdout and full JSON; no discarded outliers.
- Counts 0/1/16/256; actual Integer/String keys; stable, reorder, replace, mixed and unkeyed controls.
  One complete prepared update runs through the real default Dispatcher, public RenderHandle,
  RenderTreeBuilder, Renderer and RenderBatch. Keys/labels/arrays/delegates are prepared outside timing.
  Timed lists contain elements, not keyed child components. There is no copied dictionary algorithm.
- At 256 items, stable string keys use 11.48/11.94/10.64% less time. This does not imply the
  same effect for every keyed workload: integer replacement at 256 has a 1.02% slower median.
- Unkeyed 256 integer/string controls have medians 0.32%/0.62% slower. Empty stable-string control
  is 5.10% slower at the median. Isolated adverse observations include integer replacement at 16
  taking 24.25% more time in pair 2 and mixed integer 256 taking 8.44% more in pair 1.
  They are retained, not dismissed or averaged out of the published rows.
- All 120 allocation pairs are retained: 116 equal and four reported 1 B/op lower.
  There is **no structural allocation-saving claim**. Maximum profile CV is18.94%.
- Untimed real-renderer counting keys witness 128->96 hash calls for 32 keys and 64->48 for 16
  colliding keys. These are reachability/mechanism checks, not timed synthetic-key gains.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Existing managed owner | All 83 original and 83 candidate RenderTreeDiffBuilderTest rows pass, 0 skipped; every TRX row and 14 required keyed facts parsed |
| Actual renderer contracts | Three successful characterizations each produce the same complete 44 semantic records and 40 actual benchmark lifecycles, including empty/singleton, growth, pool reuse, equal/colliding keys and real new/old duplicate producers |
| Actual browser producer | Canonical BlazorWebAppPerPage InteractiveServer, five real-click transitions on each source version; correct order, retained native element/component identities, local child state, typed input and unkeyed neighbors; removed/replaced nodes disconnected; actual WebSocket/framework 200; 0 page/console errors |
| Permanent browser coverage | Existing KeyTest.CanReorder plus seven remaining existing KeyTest facts pass, 8 fresh rows/0 skips, after the documented dependency-aware E2E build; Debug WebAssembly correctness only, not the measured Release image or Wasm performance |
| Exact measured harness | 106 files/image; only Components DLL/PDB differ. 104 unchanged files **include the two harness files**, leaving 102 other unchanged files |
| Runnable project | Exact seven-file project independently relocated, restored and rebuilt with 0 warnings/0 errors; actual 44 semantic/40 lifecycle collections match, with a separately compiled harness; no extra timing or relocated-PE identity claim |
| Cleanup | Only the two task-created Razor probes were archived then removed after permanent coverage passed; captured server/Selenium helpers gone; four unrelated untracked reports preserved |

This is performance/preservation work, **not a semantic bug-fix red/green claim**.
No new behavior needs a new semantic test. Existing permanent suites were reused.
[Exact commands and results](validation-commands.md) and original TRX/browser records are retained.

## Runtime, source and claim boundaries

- SDK `12.0.100-alpha.1.26557.102`; pinned runtime `12.0.0-alpha.1.26562.105`
  (`Environment.Version` 12.0.0); C# 13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN 0.13.0; settings-preserving in-process emitted executor; 3 warmups/8 results, 100 ms,
  unroll 1, `DontRemove`, `Guid.Empty` power-plan mode.
  Source order original/candidate, candidate/original, original/candidate; exactly three closed attempts.
- Shared Hyper-V VM, **not dedicated or isolated**. No priority/affinity/power/OS/network changes
  or unrelated process termination. All 240 before/after executor settings pairs and 240 setup/cleanup
  observations per side are recorded; the live audit rehashes 467 unique files,
  318 consumer bindings and 705 loaded-assembly bindings.
- Fresh selected comparison against default `c5baf473f31fa3bbe9f8201e3411361c632f3a91`: 20/21 files match the
  tested baseline, including this owner, owning tests and selected keyed producers. Renderer event-error/
  disposed-exception changes are retained as explicit excluded drift; SDK/version files also differ.
  **Not a full-current-main build or measurement.**
- Timed binaries were built on baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` plus the uncommitted candidate,
  not relabeled as compiled from the later source publication commit. Its LF-canonical source matches.
- No production-frequency, whole-app, transport, browser, event-error/disposed-exception, hot-reload,
  WebView, Mono interpreter or AOT performance claim. The eight Selenium passes add bounded Debug
  WebAssembly correctness evidence, not that unmeasured runtime matrix.
- Selected PE/PDB witnesses cover 81 source-document associations,
  not complete compiler provenance or method coverage. No new IVT or UnsafeAccessor is used.

## Use the evidence and project

Portable copied-text/statistics audit, without .NET or retiming:

```powershell
node .\F038-verify.mjs .
```

`harness\AutoPerf.Benchmarks.csproj` is the exact measured seven-file project.
For a **new** experiment, copy it outside the source checkout, activate that checkout's
repository SDK and set `AUTOPERF_ASPNETCORE_ROOT` to it. First build the actual owning
Components.Tests project in Release, not installed framework binaries. Restore/build the
standalone project with that checkout's NuGet.config. The actual independently successful
commands are in `raw\reproduction-candidate-001\build-commands.json`.

The program requires explicit mode, variant, fresh state directory, new 106-file consumer closure,
current nine selected source documents and report directory. Its usage and strong runtime/source
checks are in `harness\Program.cs` and `Evidence.cs`; the executed preparation/reproduction
drivers show the exact manifest construction. Default to an untimed `characterize` run before
new measurements. Historical absolute paths/closed-budget drivers are evidence, **not overwrite/replay commands**.

Compiled/restore/native files are omitted with exact hashes; portable verification cannot rehash
those omitted bytes or independently recreate historical runtime execution.
See `authoritative-copy-manifest.json`,`omitted-file-manifest.json` and `raw\live-file-audit.json`.
All copied raw source,stdout,CSV,full JSON,TRX and browser data are byte-exact.
