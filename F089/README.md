# F089: URI fragment delimiter search

**Qualified timing proposal, not merge-ready; no allocation savings.** The actual no-import owner takes about 20-24% less time for short/query inputs in both desktop AB/BA pairs, and about 2-5% less for long inputs. One native WebAssembly pair observes 1-14% lower prepared-owner/import times, but has no unchanged native timing control. Substantial movement in untouched desktop diagnostics is retained. These observations are not a verified WebAssembly application or navigation speedup. One unchanged strategy; the combined **3/3 budget is closed**.

## Corrected finding and exact source seam

Change only `locationAbsolute.IndexOf("#", StringComparison.Ordinal)` to `locationAbsolute.IndexOf('#')` in internal `WebAssemblyScrollToLocationHash.RefreshScrollPositionForHash`. Retain the original first-delimiter index, absent/trailing-empty guard, raw identifier slice, actual synchronous source-generated browser import, singleton registration and completed task. No new API, default, cache, dependency, shipping visibility bridge, JavaScript or permanent test code.

The scanner's `unnecessary-string-allocations` premise is incorrect here: `"#"` is a reused literal. The exact installed desktop runtime VMR is **dotnet/dotnet@dfd6ac738610ea05f42e704be82b386e71052e12**, not a dotnet/runtime commit. Its ordinal string-search implementation already reaches the single-character fast path. The potential wrapper/search timing difference is separate from allocation; the measurements do not establish a causal JIT explanation.

The owner was introduced by dotnet/aspnetcore#47320, commit `85573e6b9293cd5df5b938a9a0b8ac772bb0fc68`, and the seam is unchanged since April 2023. Retained bounded owner/navigation searches and actual candidate PR files found no exact overlap; this is not an exhaustive claim about all active work.

Baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; source commit **`3f19ddf1eb0fd5d42d643e704374afe727b95507`**. One shipping file, one addition/one deletion. Builds and measurements preceded the source commit. The recorded dirty-tree manifests, source/PDB checks and committed-source comparison establish the actual measured source, not a claim of a fresh committed-binary measurement.

## Real producer, import and functional boundary

`Router` calls the public `IScrollToLocationHash` service after rendering a changed relative path. The canonical standalone sample's temporary decorator delegates to the actual registered internal singleton and records its real input, identity and completion. It does not replace the source-generated browser import. Positive fragment cases scroll real prepared DOM targets; raw `%20` and additional `#` characters remain raw. Same-page hash navigation uses the separate real JavaScript path and must leave the managed call count unchanged.

Original Debug and original/selected Release probes prove an actual interactive counter change, ten changed-path cases with exactly one additional managed call each, exact URL/raw identifier/completed task, final target-top or no-target scroll geometry, and the adjacent same-page JS-only control. They record zero real page errors/failed requests and executing owner MVIDs matched to source-proven PE identities. The served Webcil files are not claimed to be byte-identical to the PE files.

| Native step | Actual captured input/path |
|---|---|
| 1 | No fragment |
| 2 | Trailing empty `#` |
| 3 | Existing `#hash-target` |
| 4 | Existing raw `#hash#target` |
| 5 | Existing raw `#hash%20target` |
| 6 | Missing `#missing-target` |
| 7 | Query containing encoded `%23`, no fragment |
| 8 | Same query, trailing empty `#` |
| 9 | Query with encoded delimiter and 1,024-character padding, no fragment |
| 10 | Same long query, trailing empty `#` |

## Separate measured boundaries and runtime identities

The external [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj) references the actual in-tree WebAssembly assembly. For six captured URI profiles (`ShortMissing`, `ShortEmpty`, `QueryMissing`, `QueryEmpty`, `LongMissing`, `LongEmpty`), it times the **complete actual no-import owner** through the public interface. Singleton reflection/identity, source hashing and all setup oracles occur outside timing. Each actual launch setup observes 1,000 warmed completed owner calls, zero allocation and no import reachability. The two direct string/char diagnostic methods are **unchanged across variants**, not proposed implementations of this service.

Desktop: SDK `12.0.100-alpha.1.26557.102`, runtime pack `12.0.0-alpha.1.26562.105`, actual runtime `.NET 12.0.0 (12.0.26.56305)`, BDN 0.13.0, C# 13, Release, x64, in-process concurrent server GC. Three warmups/eight result iterations, 100 ms target, `DontRemove`. Two desktop pairs in AB then BA order, 18 cases per launch: **72 outcomes, 72 actual setup receipts, 576 result samples and 216 actual console warmups**. BDN's full JSON exports Result rows, not warmups; the auditor binds each three-row console warmup section to its concrete benchmark.

Pinned BDN 0.13.0's MonoWasm toolchain expressly rejects Windows. Therefore the native measurements are **custom browser calipers, not BenchmarkDotNet**. Release standalone WebAssembly, no AOT requested, installed headless Edge 157.0.4341.57, actual owner/import and prepared existing DOM, public `Stopwatch` plus managed per-thread GC accounting. An untimed real allocation capability probe observes 4,108 bytes on each phase. Three warmups/eight retained results per case. The original calibrates bounded power-of-two operation counts; selected reuses the **exact original URI bytes and counts**, despite a different serving authority. Identical loop/completion-observation costs remain included.

The native runtime package is `Microsoft.NETCore.App.Runtime.browser-wasm/12.0.0-alpha.1.26562.105`, resolved through actual project assets, with matching App.Ref download pin. Runtime configuration records multithreading unsupported. Its exact independent browser runtime source commit was not extracted from package version metadata; the desktop VMR source pin is not substituted for that verification.

Read-only hardware inventory: Microsoft VM, exposed Intel Xeon Platinum 8473C, eight cores/16 logical processors, 64 GiB memory. Raw BDN reports an unknown processor; the separate hardware records are not substituted into it. This is a **shared Windows machine, not a dedicated sandbox**. CPU-heavy work was serialized, builds requested at most two MSBuild workers, and no power/affinity setting or unrelated process was changed.

## All results and measurement limitations

[Every native step and all desktop methods/profiles, both pairs and CVs](comparison.md); [complete audit](measurement-audit.json); [native raw original](native-before-release-attempt-2.json) / [selected](native-after-release.json); [actual desktop setup receipts](setup-correctness.json); [exact commands and results](validation-commands.md).

Short/query actual desktop owner times are approximately 5.5-6.1 ns original versus 4.2-4.8 ns selected in both pairs. Long cases have only modest reductions. **All allocations are unchanged:** desktop/no-fragment browser paths remain 0 B/op; native positive fragment paths remain 36/36/40/44 B/op for steps 3/4/5/6. This is not an allocation optimization.

Untouched short/query **string diagnostics move about -7% to -10% in pair one, then +9% to +10% in pair two**. Untouched **char diagnostics move roughly 0% to -2%, then -14% to -16%**. These movements must not be attributed to the owner edit or dismissed using low within-launch CV.

Native observed reductions range from 1.24% to 14.11%. Step 1 has up to **18.04% within-phase CV**, and other positive-fragment cases also have material variability. **No unchanged native timing control exists**, so cross-launch movement cannot be separated causally. Repeated scrolling to prepared targets does not measure first navigation, routing/rendering, browser scheduling or whole-app latency. Desktop and WebAssembly statistics are never pooled.

## Source/binary distinction and preserved prerequisites

The two frozen desktop execution sets contain **98 files and 38 runtime assets**; only owner DLL/PDB differ. Harness/runtime/dependency configuration and all other copied bytes are identical. Original owner SHA256 `938F6E34F2194933D421C12EDE6C56FFA5AD97D815FA1A430F237BEC52C7792B`, MVID `29e3096b-a83e-4b36-8f6f-85726d3c0c51`; selected SHA256 `A8DAEF15E6F8849610E369C92EA465EF61ECF3C1F15DEC46652242624B0E5C4D`, MVID `911ba917-1367-4143-9826-c4dbc57df134`.

Native rebuilds also alter sample PE/PDB and SDK-generated boot/static-asset identities. The standalone evidence tool proves **all 212 sample method bodies/signatures/local signatures/exception regions and 377 binding/field metadata records identical**, and both actual sample PDBs prove the same caliper source. **219 existing outputs are unchanged**. Added/retired generated boot fingerprints and host-generated `runArgs.json` are explicitly accounted for. This is not a claim of literal native sample binary identity.

Raw copied binaries/PDBs are intentionally omitted from publication. Complete original-host inventories and successful PDB/PE evidence records remain. The public auditor rehashes published source and reparses raw state/results/console arithmetic against those records; it **does not independently reverify omitted binary/PDB bytes**. A rebuild is fresh reproduction evidence, not bit-identical original output.

Preserved failures include missing bootstrap Content when `BuildNodeJS=false`, the actual suffixed `_blazorEvents_1` property, initial temporary CA1305 requiring invariant-culture parsing, and an unmeasured nested-type evidence-tool identity collision. Only the precise optional SDK hot-reload-settings 404 is separated from real browser errors.

The first original Release native collection waited for `data-complete == "True"` and timed out: Boolean false attributes are omitted. Its navigation/control assertions passed with zero real errors; it may have executed calipers, but no parsed native report survived and no selected comparison had run. An **unmeasured** real-DOM isolation probe established attribute serialization; collection was corrected to wait for serialized result text. The successful retry uses unchanged compiled caliper workload. No failed prerequisite is credited as completed measurement or functional assertion.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| No-fragment navigation preserves final scroll | Existing `RoutingTest.ResetsScrollPositionWhenPerformingInternalNavigation_ProgrammaticNavigation` passes original/selected, actual Client fixture. |
| Anchor and changed-path managed navigation preserve real target scroll | Existing `RoutingTest.AnchorWithHrefContainingHashAnotherPage_NavigatesToPageAndScrollsToElement` and `RoutingTest.NavigationManagerNavigateToAnotherUrlWithHash_NavigatesToPageAndScrollsToElement` both pass original/selected. |
| Adjacent same-page and query/hash behavior remains intact | Existing `RoutingTest.NavigationManagerNavigateToSameUrlWithHash_ScrollsToElementOnTheSamePage` and `RoutingTest.NavigationManagerNavigateToSameUrlWithQueryAndHash_ScrollsToElementOnTheSamePage` both pass original/selected. |
| Raw multiple/encoded/empty/missing identifiers and actual producer/import distinction | Canonical original Debug and both Release browser probes assert all ten produced URI inputs, raw identifiers, completed tasks, geometry and JS-only unchanged-call control. |
| Measurement fidelity/resources and honest qualification | All 72 desktop setups/outcomes, 216 console warmups, 576 desktop and 160 native result samples audited; exact native input/count reuse, unchanged allocations, untouched controls and missing native control retained. |
| Actual source and minimal shipping diff | Source/PDB records, native method/reference parity, full desktop owner-only closure and committed-source identity; original sample Program.cs byte identity restored, only three owned temporary files removed, one shipping addition/deletion and scoped formatter/diff checks pass. |

Actual TRX audit: **10 executed, 10 passed, zero skipped**; five identical existing scenarios on each owner. The concrete fixture defaults to Client and uses `BlazorWasmTestAppFixture<BasicTestApp.Program>`, not Server execution. Dependency-aware Debug builds and both exact test commands pass. The entire Components suite was not run. These are green/green preservation checks; the original has no claimed scrolling correctness defect, so no functional red test was manufactured.

## Reproduction and intentionally unverified boundaries

Use a separate checkout at the recorded baseline. Activate `. .\activate.ps1` from its root before every fresh dotnet shell. Copy `harness` with `uri-fixtures.json` in its parent to external scratch. The project defaults `AspNetCoreRoot` to `C:\src\aspnetcore`; override that property for another checkout. Restore the new project, build Release with the recorded flags and `-m:2`, and preserve the complete original output in a separate directory. Apply `experiment.patch`, rebuild the identical harness, preserve selected output separately, and require only owner DLL/PDB differences before running the exact BDN invocation from the command records. Do not overwrite or remeasure this finalized item's recorded three comparisons.

To reproduce native validation, copy the archived `sample` files into the canonical standalone sample at the baseline, build the original Release owner with `BuildNodeJS=true`, and launch with `--no-build --no-restore`; read the actual `App url:` from stdout, not the requested port. Place the archived probe beside a scratch `autoperf-playwright-tools` directory containing Playwright 1.62.0. Invoke `browser-probe.mjs` with actual host URL, output JSON, phase, source-proven owner MVID/SHA256 and `calibrate`. Selected uses `reuse` with the successful original native configuration JSON. Inspect its CLI/command records. This is custom browser measurement; fresh reproduction is separate evidence. Restore only those temporary edits and stop only owned helpers.

`node .\reproduce-analysis.mjs . --verify` checks already-published raw arithmetic/source/state/provenance without replacing audit outputs. `F089-xml-audit.ps1 -RunRoot <package> -Verify` reparses every actual TRX row without rewriting the audit.

Unverified: ordinary application navigation benefit, cold/first-call timing, browser/whole-process memory, AOT/trimming, other browsers/OS/runtime, production URI frequency and universal throughput. Server/Auto/SSR/prerender/enhanced-navigation-without-Router paths are outside this owner matrix. **Review the native/control limitations before advancing this timing-only draft.**
