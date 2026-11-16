# F100 preimplementation requirements

Scope: restored retained finding, timed public `JSRuntimeExtensions.InvokeConstructorAsync`
finite CTS; independent baseline branch `autoperf/F100-js-runtime-constructor-timeouts`.
Not a new scan and not F096's object-reference-owner measurement.

| Requirement | Faithful boundary / acceptance |
|---|---|
| Current provenance | Exact current-default/baseline/working source/project/test/constructor-converter blobs and canonical remote bytes, preserving UTF8 BOM; actual renamed2025 API introduction and constructor rename/property addition history. Bounded existing-work query, not exhaustive absence proof. |
| Real constructed reference | Actual public timed constructor -> retaining public IJSRuntime consumer -> actual JSRuntime ConstructorCall/JSObjectReference/target0/args -> public `{"__jsObjectId":47}` reply -> actual registered converter/worker -> exact owning JSObjectReference. Subsequent public operation on the result dispatches target47 and returns nondefault731. The benchmark returns IJSObjectReference, not an integer constructor adapter. |
| Original deadline characterization | Three independent actual100ms constructor CTS rows observed after a real600ms sentinel/5s watchdog. Preserve whether the original pending task/token cancels and completes from a later actual reference reply. Three nearest awaited generic invoke deadline controls must cancel with exact token matches. A require-deadlines mode is red if the original fails; no repair-as-speedup. |
| Default/zero/control distinctions | Real configured100ms default constructor deadline vs explicit infinity/None override, zero requested at consumer entry/no dispatch; no default set after dispatch. |
| Timer ownership/serialization | Actual active timers while pending/after completion for each original policy. Real JSON getter gate expires finite deadline while serialization still owns the source; actual cancellation/token and dispatch count, not injected callbacks or a fabricated nondispatch guarantee. |
| Validation/error timing | Null runtime/invalid timeout/actual getter/actual synchronous dispatch failures and actual asynchronous public protocol failure, exact type/parameter/returned-task timing and restored timer count. |
| Concurrent/disposal contracts | Eight actual pending constructor requests/eight distinct tokens, early public success and remaining deadline behavior observed before later cleanup replies. Runtime disposal/pending explicit constructor and actual constructed-reference disposal flag/public call rejection; no native object-release claim. |
| Borrowed-token equivalence | Actual earlier successful per-call token remains unchanged at a later original deadline; real public TryReset/CancelAfter explicit-token constructor control, including earlier retained token and later real pending task, distinguished from a compiled source replacement. Reject generic removal/reset-reuse when these contracts differ. |
| Measurement | Maximum3 source comparisons. If generic source hypothesis fails compatibility, one original-only9-case finite/infinity/None by inline/deferred/Overlap8 sweep with identical frozen harness/owner,3 warmups/8 actual retained results/requested100ms/DontRemove, all console/protocol/setup/GC/sample/statistical evidence and resource/variance retained. |
| Existing checks | Exact selected existing16 original extension/runtime/object-reference test methods, positive durations/zero skips and matching result/definition/execution IDs; compiled baseline test-source/PDB and local owning DLL explicitly equal the exercised frozen owner. Existing tests do not prove every new constructor TimeSpan deadline. |
| Persistent delivery | Exact portable project/source/history/probe/test/raw/analysis capsule and actual independent fork ref, immutable Git blob/receipt/index verification. No speculative PR for an incompatible source; immediately request opening only a justified measured fork draft. |

Explicit exclusions: no generic CTS replacement that erases deadlines,
invalid-timeout validation, token observability or synchronous exception timing.
No sibling F101/F102 or original lifetime correctness repair, owner-specific
pool redesign, public API/default/dependency/visibility changes, permanent
product tests for a throwaway rejected control, or runtime private access.

Managed Microsoft.JSInterop-only boundary per docs/BlazorComponentsGuidance.md:
actual serializer/converter/runtime/CTS/public managed protocol. The harness
supplies replies with a fixed positive fixture object ID; it does not execute
JavaScript constructors, prove native identity generation/release, browser/UI/
circuit/server/network/WebAssembly/NativeAOT behavior or production hot-path
frequency/throughput. Material target47 and typed731 control are outside the
timed constructor benchmark, not claimed as native execution.
