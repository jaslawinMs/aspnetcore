# F096 preimplementation acceptance

Scope: the five TimeSpan overloads of JSObjectReferenceExtensions and their
managed timeout/token/timer lifetime. No shipping change is decided.
Finite per-operation deadlines are a public contract, not disposable overhead
that can be removed or moved to an unrelated outer call.

Generic Microsoft.JSInterop-only library work is explicitly distinguished
from Components UI/Web.JS/browser-runtime work in
docs/BlazorComponentsGuidance.md, Tests/diagnostics/repo-fit. The initial
faithful boundary is the real managed JSRuntime, its actual object-reference
converter/implementation, real BCL timeout timers, pending-task cancellation
and public dispatch completion. A transport subclass records the actual
dispatch; it does not prove browser/server/WebAssembly transport behavior.
No sample, permanent test or browser claim is made for this throwaway probe.

| Requirement | Faithful evidence / gate |
|---|---|
| Current default, documentation and history | Exact owner, real runtime/reference/converter/dispatcher/interface and relevant test blobs match current default before edits. Follow the actual pre-relocation paths; inspect the 2025 API addition and constructor rename, not only the 2026 move. |
| Real pending producer and every overload | Obtain an actual JSObjectReference through the actual JSRuntime JSON converter and dispatch via its normal implementation. Exercise generic invoke, void invoke, constructor, property get and property set separately. Verify actual dispatch call type/target/result, noncompleted task before reply and output after public dispatcher completion. No private cache/registration access or direct framework cancellation callback injection. |
| Finite deadline and cancellation | A real finite TimeSpan creates the production CTS/timer. A retained incomplete operation must become canceled with the actual TaskCanceledException/token before a JS reply. Observe actual timer completion/cancellation; no fixed synchronization sleep or manually canceled substitute for the timeout producer. Keep positive invoke/void controls alongside constructor/get/set. If a lifetime prerequisite fails, characterize and preserve that failure before timing or changing shipping code. |
| Infinite and default-timeout boundaries | Infinity must pass CancellationToken.None, allocate/schedule no extension CTS and suppress the runtime default timeout; distinct explicit finite calls must receive independent per-operation token/deadline identities. Do not pool sources or share outer deadline lifetimes without proving equivalence. |
| Validation, errors and cleanup | Preserve null entry, disposed object, invalid timeout, dispatch failure, async JS failure, success/cancel lifetime and token observation. Document synchronous versus returned-ValueTask exception timing; an async rewrite is not automatically behavior-neutral. Late public dispatch completion must not convert a canceled task into success. |
| Original resource premise | Primed actual-runtime completion batches and timer observations distinguish extension CTS/timer cost from actual runtime registration/task/serialization costs. Show the already-existing infinity bypass, not a manufactured missing optimization. |
| Optional measured optimization | Only a high-confidence public-contract-preserving candidate gets frozen original/selected source, real source PDB and owner-only execution closure. At most3 measured comparisons total, identical harness/runtime/settings; serialize CPU-heavy work/max2 build nodes. No speculative source edit to force an A/B. If no safe candidate exists, benchmark/record the original pressure and explicitly publish the blocked/rejected/no-gain disposition instead. |
| Correctness-only discovered lifetime gap | Do not describe repairing a broken timeout as a speedup or manufacture an optimization PR from a correctness fix. Establish the exact lower managed boundary and every affected overload, inspect existing issue work, then keep shipping changes out of this performance item unless directly required and justified. |
| Owning tests and persistence | Run the exact relevant existing JSInterop tests and audit every actual row/definition/outcome/duration/no skips. Publish the external project, actual commands/results, source/proofs, baseline and all outcomes. Any justified draft must be fork-only and opened immediately; otherwise no performance PR. |

Intentionally excluded at this stage: real JS execution, browser scheduling,
DOM/UI/render-mode/circuit behavior, runtime-compilation analogy, API approval,
application call-frequency/production throughput, arbitrary custom reference
implementations, other runtimes/OS and broad repository changes.
