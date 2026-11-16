# F103 acceptance - component-scoped StateHasChanged analyzer maps

Scope: the two per-component dictionaries in `StateHasChangedAnalyzer`.
The actual source enables concurrent Roslyn callbacks and uses
SymbolEqualityComparer.Default. The analyzer targets netstandard2.0 and keeps
the VS2019-compatible Roslyn 3.3.1 package dependency; those contracts stay intact.
The measured compiler host uses the same Roslyn 5.11.0-1.26420.103 version
actually loaded by the current repository analyzer tests. The generated input
uses C#8 syntax; the standalone harness uses C#13.

- Verify current-default/baseline/working owner, symbol helpers, diagnostic
  resources, code-fix/control projects and real Components reference sources,
  including canonical Git bytes. Capture the actual June2026 introduction,
  September2026 async-suspension correction and bounded current work.
- Exercise the **real Roslyn analyzer driver** against actual compiled
  Microsoft.AspNetCore.Components metadata, not just dictionary constructors,
  injected callbacks or framework-type stubs. Verify compiler errors are absent,
  component inheritance and actual event-method semantic bindings, and exact
  BL0012 IDs/severity/locations/messages for every expected diagnostic.
- Include empty types, lifecycle-only types, event-only types, small populated
  maps and high-cardinality partial components spread across multiple syntax
  trees. Run serial and concurrent-analysis driver settings. Empty/event-only
  workloads include a real positive lifecycle anchor so a missing analyzer or
  missing component symbols cannot produce a false pass. Input cardinalities
  are controlled evidence, not a production workload-distribution claim.
- First proposed approach: allocate maps lazily with thread-safe Lazy<T>
  publication, preserving the actual ConcurrentDictionary comparer/default
  capacity/default concurrency/adaptive behavior when a map is needed.
  Prefer this over silently lowering lock concurrency based on unmeasured
  production cardinality. Preserve per-symbol lifetime, diagnostics, generated
  code settings, syntax/operation registration and callback completion ordering.
  Make no shipping change before the original owning workload is reproduced.
  After the first actual comparison, a lighter candidate uses nullable map
  targets and the BCL lock-based LazyInitializer overload with one per-component
  lazy initialization gate and separate initialization flags for the two maps.
  The actual netstandard2.0 build rejected the three-argument overload with six
  CS1503 errors before a second source comparison began. The final candidate
  uses the supported four-argument overload, without changing the target,
  dependency versions or nullable policy. The failed build and the overly broad
  original documentation assumption are retained. It preserves one factory execution per needed map,
  original map defaults and per-symbol lifetime. A third comparison may repeat
  this same final source for confidence rather than invent another optimization.
- Run the 30 exact existing StateHasChanged analyzer/code-fix Fact controls
  against original and any final proposed owner, including real compiled
  source/PDB/owner identity and zero skips. Existing stub-based unit controls
  are separate from the real-reference compiler benchmark boundary.
- Compare identical frozen harness/input/reference/config/dependency settings
  and actual original/proposed owner binaries. Measure complete analyzer runs
  and consume returned diagnostics. Preserve every raw case/sample/setup receipt,
  compiler/analyzer identities, allocation/GC/timing variation and regressions.
  Check process-wide allocation calipers so worker-thread allocations are not
  silently treated as current-thread-only measurements; disclose the actual
  BenchmarkDotNet memory boundary.
- Maximum three source comparisons. One is enough for a compatible clear
  large win; otherwise use at most three measured proposals/comparisons.
  Reject or mark no-gain if the actual owner measurements do not support a
  compatible improvement. Do not claim a dictionary-only saving is an
  end-to-end compiler or build saving.
  If timing shifts in populated-map controls, comparisons two and three use
  fresh paired original controls within that same three-comparison budget.
  Preserve all reference sweeps; do not replace the first baseline or attribute
  the control timing movement to the source change. Global callback concurrency
  is observed; per-cache contention is not established or claimed.
- Preserve unrelated work and source lines exactly outside necessary seams;
  do not change diagnostic/API/default behavior, package/SDK/TFM settings or
  shipping assembly visibility. No new framework IVT/UnsafeAccessor/private
  cross-assembly access. No unnecessary permanent tests or formatting cleanup.
- Publish a separate verified fork branch and exact portable project/source/
  inputs/history/docs/probes/tests/raw/auditor capsule with actual remote blob/
  ref verification. A supported fork draft must follow the repository PR
  template and include exact validation commands/results, then be opened
  immediately. Unsupported outcomes get an honest published disposition.

Validation is compiler/managed-analyzer owned, not a Blazor UI/browser lifecycle
change. No native rendering, browser timing, full-build throughput, VS2019 CLR/
Mono/WASM/AOT or production cardinality/distribution claim. CPU-heavy work on
this shared Windows host remains serialized/max2 build nodes with no power,
priority, affinity or unrelated process changes.

Permanent validation boundary: the behavior owner is StateHasChangedAnalyzer;
the producer is real Roslyn symbol/operation/syntax callbacks and symbol-end
completion for actual derived-component compilations; the observable is exact
diagnostics and complete-run allocations/time. Existing analyzer/code-fix unit
controls preserve diagnostic behavior; the portable real-reference driver
probes/benchmark exercise this allocation proposal. No new browser behavior
requires a sample or browser regression. A constructor-only benchmark or
zero-diagnostic compilation without positive/semantic prerequisites could
otherwise pass while the real analyzer never runs.
