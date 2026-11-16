# F088 acceptance before implementation

Baseline: fresh default main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Branch: `autoperf/F088-table-alignment-classes`.
Owner: `MessageListContext.RenderTable`, introduced by
dotnet/aspnetcore#68324 at `0b72e0b152fa94ada8fa7b74bb6d75b27d13023b`.
The bounded active dotnet/aspnetcore#68672 owner patch does not modify this seam.

## Corrected input and lifetime boundary

Core is protocol-neutral. A provider supplies immutable published
`RichTextContent` snapshots containing `TableNode` presentation nodes;
`UIAgent`/the default block-mapping pipeline produce `RichContentBlock`,
and `MessageList`/`MessageListContext` produce table-cell attributes.
Plain `TextContent` does not establish table reachability. The Dojo fixture's
Markdown mapper does not establish a table-parser path either. Do not add a
parser, claim built-in Markdown handling or assume aligned tables are frequent.

The original guard skips `None` and absent alignment entries. Eligible cells
format a CSS class using enum string conversion and invariant lowercasing.
Do not assume every enum `ToString` allocates: quantify actual full-owner
resources rather than the scan's two-intermediate-string premise.

Proposed seam: reuse complete literal CSS classes for Left/Center/Right.
Preserve the guard, render regions, sequence numbers, traversal and text.
Bind the switch's unmatched value and use the original formatted fallback,
including an unexpected None returned by a stateful alignment indexer.
Do not re-read the indexer on that fallback. No new metadata cache or
Hot Reload state, public API/default, visibility bridge or dependency change.

## Requirements and selected evidence

| Requirement | Planned evidence |
|---|---|
| Original table producer reaches its intended UI | Canonical `BlazorWebAppPerPage` InteractiveServer page with real public `UIAgent`/`RichTextContent` snapshots, textarea/send interaction, gated two-to-eight-row update, actual default `MessageList`, framework/CSS/network and browser-console checks. |
| Prototype in sample before shipping edit | Table-only temporary prototype maps complete class literals beside the actual original component. Compare exact classes/text and computed center/right alignment; prototype is unmeasured and not the shipping owner. Re-run the actual component after the owner edit. |
| Defined alignment output and eliminated per-cell class objects | Three Left/Center/Right rows in the existing `MessageListTests`: feed actual provider content through `AgentBoundary`/public context/default pipeline and inspect actual rendered descendant frames. Exact six-cell output plus repeated class-object identity; each row must fail the resource assertion on original and pass selected. |
| None, sparse and undefined alignment remain unchanged | Focused actual-provider/render tests for None, missing entries, positive/negative undefined enum values and a stateful indexer; exact keys/text/attribute absence and original lookup count. These preservation assertions pass original and selected. |
| Streaming and ordinary content remain intact | Existing MessageList, rich-node/content and paragraph-handler tests, plus the unchanged existing `AIApp.E2E.Tests.RichTextTests.RichText_RendersTheStructuredContentMatrix` where feasible. No arbitrary sleeps, direct handler injection, private cache seeding or permanent Jest proxy. |
| Actual performance, not a casing microbenchmark | Identical original/proposal BenchmarkDotNet harness: prepared blocks produced by public UIAgent; actual public RenderBlock/RenderTreeBuilder and complete provider/pipeline/render paths; ordinary and scaled aligned shapes, None/missing/undefined/paragraph/custom-renderer controls. Assert executed cell/class/provider/frame counts outside timing. |
| Source/runtime identity and closure | Original/selected source and test PDB identity, tested and executing owner hashes, identical harness/dependencies and complete recursive runtime closure; only Components.AI DLL/PDB may differ. Preserve all raw state captures and failed setup traces. |
| Publication | At most three measured A/B comparisons total. AB/BA/AB unless large real gains justify early stop. Preserve all costs/no-gains/variance, close budget, publish reproducible project/raw reports and exact commands/results, verify source/draft/immutable blobs and immediately request browser opening after actual fork draft creation. |

## Permanent regression boundary

- Behavior owner: managed default rich-text table renderer.
- Production producer: provider presentation snapshot -> public UIAgent/default
  mapping -> real MessageList/MessageListContext render.
- Final observable: exact generated table attributes/text and actual managed
  per-cell class-string reuse. No changed layout/browser lifecycle contract.
- Selected permanent surface: existing Components.AI managed MessageListTests
  with actual component frames; existing real-browser rich-text matrix preserves
  the UI. Browser validation uses a canonical sample before permanent work.
- Lower-boundary false-pass risk: directly constructing an internal block or
  timing enum casing would bypass provider/default mapping and full traversal;
  counting only an unchanged parent render could miss the owner entirely.

## Intentionally excluded cells

InteractiveServer per-page sample, prerender-to-interactive attachment and
actual streamed snapshots are the browser boundary selected here. No change
crosses render-mode destinations, DI scope or renderer ownership. WebAssembly,
Auto, global interactivity, navigation/rehydration, native/AOT/trimming, other
OS/runtime, network/LLM latency, first-process startup, parser throughput,
production frequency and universal throughput remain unverified.

The shared host is not a sandbox. Serialize CPU-heavy builds/tests/benchmarks,
request MSBuild at most two workers, do not change power/affinity settings or
stop unrelated processes. Sample/browser helpers get their own process/profile
and are stopped before rebuilding or timing. Remove only our temporary files
and temporary project edits after selected permanent coverage passes.
