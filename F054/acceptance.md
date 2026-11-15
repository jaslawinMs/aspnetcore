# F054 acceptance: independently guarded function catch-up diagnostics

Fresh upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`, independent
`autoperf/F054-pipeline-catch-up-log-guard`. No F051-F053 changes included.
Inspect current Pipeline/HandlerEntry/FunctionInvocationHandler and block
contracts, relevant owner history and bounded exact-name existing-work search.
Same-baseline inspected PR68672/release-only PR69385 evidence retained.

## Permanent boundary (recorded before implementation)

| Field | Selected boundary |
|---|---|
| Behavior owner | BlockMappingPipeline phase2 function catch-up diagnostic invocation. |
| Production producer | Real default FunctionInvocationHandler through HandlerEntry.TryHandle/ActiveEntry.Invoke, driven by actual FunctionCallContent and optional matching FunctionResultContent in one update; registered-handler Update extension separately exercised. |
| Final observable | No disabled catch-up diagnostic allocation at the actual return/filter and a positive enabled-minus-disabled delta over the complete real catch-up interval through the following Information emitter filter; fully consumed exact function call/result identity/order/role/author, event2 fields and lifecycle; unchanged phase1 filter. |
| Selected permanent surface | Existing BlockMappingPipelineTests plus full existing Components.AI managed/provider-replay suite, no browser/renderer/JS producer involved. |
| Lower-boundary false-pass risk | A discarded early IsEnabled checkpoint could hide later eager allocation. Also measure the entire actual handler-return-to-emission-filter interval enabled versus disabled, count every actual catch-up and emission checkpoint, and assert fully consumed exact outputs/lifecycle. Do not synthesize callbacks or directly call the generated helper as reachability proof. |

## Acceptance matrix

| Requirement | Planned evidence |
|---|---|
| Skip real disabled diagnostic work for1/4/16 new function calls, with and without same-update results | Six individual `Process_DebugDisabled_CatchUpDoesNotAllocateDiagnostics` rows, delegating real FunctionInvocationHandler; count every catch-up, expected positive original bytes versus proposed0, full catch-up interval enabled/disabled delta and completely consumed function state assertions. |
| Preserve enabled default Pass and Complete catch-up logs/state, including result-before-call | Three `Process_DebugEnabled_PreservesCatchUpFieldsAndFunctionState` rows; exact event2 Debug HandlerType/ResultKind string/BlockId/template and finalization notifications. |
| Preserve registered-handler Update catch-up behavior | `Process_DebugEnabled_RegisteredCatchUpUpdatePreservesFieldsAndLifecycle`; real registered handler delegates default producer then returns supported Update. Do not claim default handler produces Update. |
| Leave separately retained phase1 F053 shared-helper filter intact | `Process_DebugDisabled_ActiveHandlerStillFiltersResult` produces actual active text continuation and observes no disabled event2. Never change global SkipEnabledCheck. |
| Faithful measured owner and contracts | Fresh original BenchmarkDotNet build before shipping edits; actual UIAgent/IChatClient function-call/same-update-result/result-first/mixed/two-turn streams and unaffected text/empty/provider controls; original full fields/blocks/function details/request history repeat-match at every setup. |
| Independent and reproducible measurements | Freeze original executable/complete recursive DLL/JSON closure; proposed clone differs only in separately tested owner DLL/PDB; unchanged harness/runtime/deps per pair; at most three comparisons, serialized shared-host builds/tests/measurements, exact raw/control outcomes. |

Hypothesis: the result-kind conversion contributes positive diagnostic work
(sibling F053 observed24 bytes per call). Verify F054's actual producer and
individual rows before claiming the amount; do not adopt the scanner's
unverified fresh-string allocation claim.

Only the existing phase2 catch-up invocation may receive a caller Debug guard.
Keep explanatory locals/branches and generated helper/phase1 call unchanged.
No public/protected API, default/convention, cache, cross-assembly access,
dependency-manifest or runtime/power/affinity/process changes.
Cold/pressure/concurrent filter changes, other runtimes/platforms, live model/
network/tool execution and rendered application throughput are unverified.

## Actual original evidence before shipping edit

- Fresh original31-case harness captured and repeat-verified complete actual
  streams. Function blocks prove16 reached fully disabled/default cases;
  seven zero-function text/empty/no-response/provider controls are unreached,
  seven function-shaped enabled controls and one partly affected Flip retained.
  Function descriptors/result payloads and complete serialized next-turn input
  content are included, not only block counts/types.
- Original full AI suite150 rows:144 pass and exactly six resource failures,
  each independently Expected0/Actual24/96/384 for1/4/16 calls, both real Pass
  and same-update Complete. Each actual catch-up checkpoint count is correct.
  All five enabled/registered-Update/phase1-filter rows pass on original.
- No scanner fresh-string claim adopted. The observed original interval is
 24 bytes per real catch-up; generated helper's normal filter and phase1
  source remain unchanged.

## Whole-process probe correction

The first proposed run had149/150 pass. All six first Debug checkpoint sums
were0, but the whole-Process allocation comparison for16 same-update results
reported enabled4904/disabled7640 bytes and failed. Unrelated earlier
construction/processing allocation cannot safely attribute this tiny seam;
no cause is claimed. Preserve exact150-row failed probe/TRX/log/test source.

Narrow the **additional false-pass guard**, not the real producer: measure
from every actual FunctionInvocationHandler catch-up return through the
following real generated Information emitter filter. This encompasses the
complete target argument/filter branch and following active-stack work,
so a discarded early Debug check cannot hide later eager arguments.
Both checkpoint counts must equal the actual call count; exact fully consumed
blocks and finalization remain asserted. Whole-agent allocation remains a
separate measured boundary, not inferred from this unit probe.

## Final preservation and immutable snapshot checks

- Final150/150 rows pass, including all six zero first-checkpoint sums and
  positive complete catch-up interval deltas, exact output/state and five
  enabled/registered-Update/phase1-filter rows. Final whitespace check passes.
- Exact original tested/frozen owner hashes match. Original owning DLL with
  final tests/other outputs again144 pass/six independently expected24/96/384
  failures. Three final valid suites450 outcomes438 pass/12 expected original
  failures; separate150-row broad-allocation probe retained,149 pass/one
  diagnostic comparison failure, not silently discarded.
-31 original/proposed setups each repeat-match actual original full-stream
  contracts. Complete recursive75-file DLL/JSON closure is owner-only;
  original harness/runtime/deps and all other outputs reused byte-exact.
- Shipping change remains only phase2's outer Debug guard; shared helper and
  phase1 F053 source unchanged. No source tune; first comparison not yet run.

## Final three-comparison disposition

- Three unchanged-source serialized A/B, B/A, A/B pairs;31 cases/186 raw
  outcomes/93 ratios.186 actual original contracts checked after372 complete
  workloads/396 IChatClient streams. No tune, fourth run or selective subset.
- All16 reached disabled/default targets save23-3076 B/op in every pair
  (nominal24 per new function block, with sampled variation).13 time medians
  lower (0.45-5.03%), only six faster in every pair. Ten target directions
  mixed; Calls_Disabled_8_1 median+1.01% and two-turn+0.30% retained.
- Calls_Disabled_1_1 time ratios-74.79/+147.51/+183.43%, maximum CV73.35%:
  its median+147.51% is not reliable timing evidence. The initial large
  apparent win did not justify early stopping; all three raw pairs retained.
- Repeated control costs: SameUpdate_Enabled_1_4+4.26%,
  ResultFirst_Enabled_1_4+2.20%, Mixed_Enabled_8+0.88%, and unreached
  Text_Null_8_16+4.49%. Heap unchanged except tiny sampled changes. No
  causal explanation of controls/volatile first case or significance claim.
- Supported repeated heap reduction and six modest repeatable timing cases
  justify a transparent fork-only draft, not a general timing improvement.
  Keep all failed-probe/raw/control data and exact resource boundary limits.
