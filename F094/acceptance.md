# F094 acceptance, before any shipping edit

The synchronous RazorPage.RenderSection compatibility method must finish the
real section before returning its empty HtmlString token. Pending waits are
required, not an optimization defect. Current upstream owner, RazorPageBase,
RazorView and owning tests match the independent campaign baseline.

The hypothesis is narrower: a completed present section currently creates a
Task<HtmlString> holding non-null HtmlString.Empty. A private ValueTask result
may avoid that wrapper only for successfully completed synchronous sections.
Keep public Task-based overloads, validation/messages, rendered-section
ordering, async delegate/context semantics and pending/faulted task waits.
Do not implement until the original actual producer/resource premise is
observed. No allocation count or speedup is assumed.

| Requirement | Required evidence |
|---|---|
| Real section producer and material output | Content RazorPage.ExecuteAsync calls real public DefineSection; actual RazorView transfers its original SectionWriters to the layout, sets IsLayoutBeingRendered, executes it and flushes actual pooled view buffers. Verify exact final HTML, section invocation counts, token identity and dictionary identity. Handwritten pages/locator isolate the managed RazorView boundary, not the compiler, network or browser. |
| Exact synchronous and Task-based contracts | Empty/1/2/8/32/128 sections, long names, absent optional null tokens, null entry arguments, unregistered layout, required missing, duplicate sync/async mixed calls and immediate/pending delegate failures. Preserve unwrapped exception types/messages and state after failure. |
| Genuine pending producer | Real full-view section awaits an explicit gate. Observe sync rendering caller in WaitSleepJoin while the section is incomplete, no returned caller/flushed output, then release and observe exact completion or unwrapped failure. Async full-view caller returns an incomplete task before release. No directly invoked completion callback, fixed sleep or fabricated owner. |
| Structural resource premise | Precreate/prime real page owners through public DefineSection before an untimed disposal-like allocation caliper; measure only public RenderSection/RenderSectionAsync. Record actual completed-present, public async and missing/null allocations and task/token identities. Page-only transfer is an explicit diagnostic boundary; real RazorView separately supplies transfer reachability. Original zero-wrapper assertion must fail for the actual extra wrapper and selected must pass. |
| Fair controls and costs | Page-only calipers and full actual RazorView workloads; synchronous targets, public Task compatibility callers and genuinely pending profiles. No-sections bypass is a truly unchanged control. Public async adapter/private core will change, so do not call async callers untouched code. Retain possible pending state-machine heap increases, async overhead, full-view non-wins and every regression. |
| Source, tests and closure | Exact original/selected owner/harness portable-PDB source checks. Frozen identical harness/runtime/deps; complete execution closure only owner DLL/PDB may differ. Existing selected RazorPage tests pass with actual row identities/positive durations/no skips on both sources. Preserve original code shape/locals except necessary changed seams; no public API/visibility/dependency/default changes. |
| Bounded measurements and publication | At most3 measured comparisons across all strategies/runtimes, identical Release/net12/BDN0.13 settings and owner-only snapshots, console-linked per-case hashes/setup receipts and all samples/GC totals. Only grounded benefit earns a fork-only draft; otherwise restore unsupported shipping code, publish no-gain and continue. Exact commands/results and remote byte verification are required. |

CPU-heavy work is serial/max2 build nodes on this shared Windows machine.
No power/affinity/unrelated-process changes, repository SDK/package/NuGet
manifest changes, source cross-assembly private access or speculative API.
