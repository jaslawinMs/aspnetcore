# F095 preimplementation acceptance

Evaluate only the obsolete explicit `IPageLoader.Load` bridge in PageLoader.
The registered real DefaultPageLoader caches the Task on its input descriptor.
GetAwaiter/GetResult itself creates no wrapper. The synchronous wait on a
pending compiler task is required by this retained synchronous contract.
Do not convert the public API to async/ValueTask, return early, change cached
task/result/endpoint identity, or classify the existing wait as removable.

| Requirement | Faithful boundary |
|---|---|
| Current default and provenance | Exact owner, obsolete interface, real DefaultPageLoader, invoker/matcher, DI and owning-test blobs match current upstream default before source edits; inspect 2019 async-routing and 2021 deprecation history. |
| Actual completed/cached producer | Resolve public PageLoader and obsolete IPageLoader as the same real DefaultPageLoader through normal AddRazorPages DI; use actual DefaultViewCompiler/CompiledRazorAssemblyPart with a valid hand-authored typed-page compiled-item catalog. Verify generated compiled descriptor, endpoint route, type, handler and metadata. This is not Razor source compilation or HTTP execution. |
| Cold versus warmed and already compiled | Exercise newly loaded PageActionDescriptor, warmed original descriptor and actual returned CompiledPageActionDescriptor. Observe public returned Task/result identity, real caching and endpoint equivalence. Do not seed internal descriptor cache fields. |
| Pending/faulted compiler contract | A public IViewCompilerProvider extension wraps the actual precompiled compiler and owns an observable producer gate. The real DefaultPageLoader awaits it; observe actual sync caller waiting before release or public async return-before-release. Preserve unwrapped faults, cancellation and repeated cached fault task. This proves reachable public compiler-extension behavior, not the runtime-compilation implementation or I/O. |
| Original resource premise | Primed actual obsolete bridge and modern direct caller allocation batches must establish current completed-call allocation. Expect no generic AsTask wrapper here; distinguish cold compiled-descriptor/endpoint allocations from warmed adapter cost. Never invent a zero-wrapper red if original already uses zero. |
| Bounded optional candidate | Only if warranted, compare one successful-task Result fast path in the actual explicit bridge; retain original GetAwaiter/GetResult for every pending/fault/cancel path. No public shape/default/visibility/dependency or unrelated source cleanup. Expected resource checks are green/green, not bug-fix red/green. |
| Fair measured comparisons | Four profiles (cached original, returned compiled self, new precompiled descriptor, actual gated precompiled compiler) x obsolete bridge/direct modern wait/modern async. Immutable owner/harness/runtime/deps, actual source-PDB records, full owner-only closure, identical method settings, every setup/output/caller/control/GC/statistic retained. At most3 comparisons total, serialize CPU-heavy work/max2 build nodes, no host changes. |
| Owning tests and conclusion | Run all6 actual DefaultPageLoaderTest rows, inspect each definition/outcome/duration/no skips. A proposed change requires matching existing/real-producer/resource observations and grounded benefit. Otherwise restore only our experiment and publish no-gain/rejection with no speculative PR. Local caller inspection does not prove absence of external obsolete-interface users or production frequency. |

The inspected legacy PageActionInvokerProvider blocks on the modern overload
directly; it does not call the obsolete interface bridge. Dynamic matching uses
the modern async overload. Those are separate call sites, intentionally not
changed or attributed to F095. No compiler/template, browser, hosted request,
production throughput, call-frequency or full-newer-branch equivalence claim.
