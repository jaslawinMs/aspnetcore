# F089 preimplementation acceptance

Recorded against upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`, before changing the shipping owner.

## Corrected premise and provenance

- Retained scanner ID F089, card `unnecessary-string-allocations`, owner `WebAssemblyScrollToLocationHash.RefreshScrollPositionForHash`.
- The original `"#"` is a reused string literal, not a new per-navigation string. The installed runtime's exact VMR commit is `dotnet/dotnet@dfd6ac738610ea05f42e704be82b386e71052e12`, as recorded in its `.version` and independently resolved through GitHub.
- Its `String.Searching.cs` lines 321-344 route ordinal string search to `Ordinal.IndexOf`; `Ordinal.cs` lines 299-328 use a span; `MemoryExtensions.cs` lines 2319-2338 use `SpanHelpers.IndexOf`; `SpanHelpers.Char.cs` lines 15-27 already dispatch a one-character value to `IndexOfChar`. The proposed char overload directly uses the same helper. Allocation and elapsed-time claims are separate.
- The owner was introduced by upstream #47320 (`85573e6b9293cd5df5b938a9a0b8ac772bb0fc68`) in April 2023. Its delimiter search is unchanged. Current bounded owner/navigation/scroll PR searches and actual candidate changed files are retained; they found no exact owner overlap, not proof of exhaustive coverage of every active PR.
- `Router` sets its scroll flag after routing to a changed relative path and calls the public `IScrollToLocationHash` after rendering. Same-page hash navigation has a separate JavaScript fast path in `NavigationManager.ts`; it is an adjacent control, not evidence that this managed owner ran.

## Proposal and preservation

The only proposed shipping change is `locationAbsolute.IndexOf('#')`. Preserve every other byte of the owner, including the first-delimiter semantics, missing/trailing-empty guard, raw substring, actual browser import, and completed-task return.

Before a shipping recommendation:

1. Exercise the canonical standalone WebAssembly sample using real `NavigationManager`/Router navigation. A temporary sample decorator must delegate to the actual registered shipping owner, record its assembly identity and actual input, and not replace or fake its browser import.
2. Observe actual URL, rendered destination, and final scroll geometry for nonempty fragments. Include no-fragment, trailing-empty, missing-element, multiple-delimiter, encoded-identifier and same-page controls. The latter must distinguish the JavaScript-only producer.
3. First compare the char-search prototype with the original at actual received URI inputs in the sample, without changing the shipping owner. Then, if useful, apply the one-line throwaway candidate and preserve the same observations.
4. Select existing `RoutingTest` real-browser cases for any retained shipping proposal. Functional assertions should remain green on the original: this is not a claimed scrolling correctness defect. Do not invent a red browser failure or add trivial framework-overload tests.
5. Do not add public API, new shipping friends, unsafe accessors, caches, dependency changes, or Hot Reload state.

## Measurement boundaries and budget

- Use the repository SDK and runtime, Release, x64, existing BenchmarkDotNet 0.13.0 and serialized CPU-heavy work with at most two MSBuild workers.
- Measure the actual compiled owner through the public interface for the complete CoreCLR short-circuit paths: no delimiter or a trailing empty fragment. Resolve its singleton outside timing and retain owner/harness/PDB/source/closure identities.
- Nonempty fragments require the actual browser import. Do not fake that bridge and present a desktop proxy as WebAssembly scrolling performance. Separate direct string-search diagnostics from actual owner measurements.
- CoreCLR results do not establish WebAssembly interpreter/AOT timing, browser string marshaling, DOM scrolling cost or whole-navigation throughput. Browser preservation checks do not establish allocation or timing gains.
- Pinned BDN 0.13.0 `MonoWasm/WasmToolChain.cs` explicitly rejects Windows. Do not substitute its CoreCLR job for a browser job. Complement the requested BDN project with explicitly labelled custom browser calipers in the canonical sample: public `Stopwatch` and per-thread GC accounting around the actual owner, with genuine previously captured URI inputs and real browser imports/DOM. Use Release without AOT; prepare the existing targets outside timing. Repeated prepared-target scrolling is not first-navigation or whole-application throughput.
- Native calipers use three warmup iterations and eight retained result iterations. Calibrate operation counts on the original, reuse exact original URI strings and operation counts on the selected owner, and retain every row. They are not BenchmarkDotNet results. The combined budget is one native before/after comparison and at most two desktop BDN comparisons, three total across both mechanisms.
- Original and selected snapshots must use identical inputs, harness, runtime, dependencies and settings; only the owner DLL/PDB may differ.
- Desktop closure must be literally owner-DLL/PDB-only. Native SDK builds may change the sample PE/PDB identity when its owner reference changes, plus generated boot fingerprints/manifests. Before accepting native results, prove every sample method body/signature/local/exception region and assembly/type/member/field reference metadata unchanged; verify the caliper source through both PDBs. State this native identity distinction explicitly rather than claim a byte-identical sample DLL. Preserve unchanged runtime asset hashes.
- At most three total measured comparisons for this finding, not three per strategy. Preserve all samples, controls, regressions and variance. Early stopping requires a clear large gain at the measured owner boundary, not merely a faster isolated delimiter helper.
- Publish no-gain/rejection/qualification honestly if allocation savings or a meaningful supported improvement are not established. Do not call a CoreCLR-only win a verified WebAssembly improvement, nor missing WebAssembly timing proof of universal no-gain.

## Required/excluded matrix

Required functional boundary: canonical standalone, interactive WebAssembly, real Router present, no prerender, cross-page navigation and the adjacent same-page JavaScript control. Required measured desktop boundary: actual complete no-import owner paths, plus explicitly labelled search diagnostics.

Excluded from this item: Server, Auto, static SSR, enhanced-navigation routing without an interactive Router, Native AOT, browser timing/allocation claims without separate faithful measurements, changes to existing raw-fragment decoding behavior, and a claim that an ordinary IJSRuntime mock reaches the source-generated browser import.
