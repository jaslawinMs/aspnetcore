# F055 independent acceptance before implementation

Fresh upstream main37e809ead5824bc753a1c3d56f11615bdb1296c5.
Retained scanner identifies eager explicit-failure reason construction, but
incorrectly calls this Error. Actual generated event2 is **Information**.
Actual owning assembly targets **net462;netstandard2.0;net12.0**, not only the
scanner's net12.0. Existing ILogger.IsEnabled API is available on all three.
No new scan or global/plugin telemetry/publication workflow is requested.

History d1310d9a/dotnet/aspnetcore#68572 added detailed reason output. Preserve
enabled formatting, individual original reason/handler identity and result
contents. Actual DefaultAuthorizationService calls real handlers, real context
factory/evaluator, then the logging wrapper. Default context retains Fail(reason)
instances in order; default evaluator exposes them in AuthorizationResult.

Initial pre-measurement prototype: F056 independently owns the unmet-requirements branch. Scope F055 to the
existing FailCalled branch: narrow Information guard inside that branch,
unchanged explanatory reason local/ternary/else/generated logger. No unchecked/global filter bypass, other API/default/options/framework-boundary
changes. Initial explicit path checks twice; no-reason literal is a control.

Original229 outcomes226 pass/three individually expected failures. All15
new rows reach their assertions; the allocation rows observe248/496/1264
diagnostic bytes for1/4/16 real reasons. All12 original preservation/control
rows pass. Missing test assets NETSDK1004 was a preparation failure, corrected
by focused restore without manifest/config changes before the valid run.
Fresh separate original harness captures/repeat-checks32 whole-service
contracts;18 actual nonempty disabled/default/LoggerFactory-filtered targets.
Original unit-tested/harness/frozen owner DLL hashes match exactly.

## First-pair evidence-driven tune

All18 targets faster23.20-96.44% with lower heap;10 exceed50% speedup.
All five enabled-reason controls slower2.84-29.11% in this single pair, despite
unchanged heap; no causal attribution or significance claim. Preserve original
first-pair source-after/binaries/measurements and derived phase1 archive.

One source tune: the sole private generated event2 call now skips its redundant
generated filter, while BOTH existing wrapper branches own one Information
check. Explicit branch checks before reason computation; unmet branch checks
AFTER its original eager join, preserving F056 work and output filtering.
No F056 optimization or unchecked call; every successful path to the private
generated helper has checked the same Information level. Existing reason local,
ternary, else, fields/template/event/level/final call retained. Do not aggregate
initial and final source timings. At most two remaining comparisons.

## Permanent requirement/producer/observation matrix

| Requirement | Entry point and producer | Required precondition/reachability | Observe at faithful boundary | Exact permanent evidence |
|---|---|---|---|---|
| Omit real disabled explicit-reason diagnostics, not merely shift allocations | Actual DI-registered IAuthorizationService.AuthorizeAsync, real handler calls context.Fail(reason), real DefaultAuthorizationEvaluator delegated by tracking evaluator |1/4/16 actual reasons; Information disabled; mark after real evaluator returns, before owning service logs | Zero first Information-check diagnostic bytes, exactly one disabled check/no emitted log; entire post-evaluator-to-AuthorizeAsync-return interval is lower than enabled; all returned reasons/handler identities retained | Authorize_InformationDisabled_DoesNotAllocateExplicitFailureDiagnostics, three rows |
| Preserve enabled detailed message/event/fields and returned data, including empty/duplicate/multiline strings | Actual DI service and reason-producing handler | Information enabled and disabled, messages empty/duplicate/newline-containing | Exact result/FailCalled/reason/reference/order; single expected Info event2 Name/template/Reason/formatted message when enabled, none disabled | Authorize_ShouldPreserveExplicitFailureReasonsAndLogFields, six rows |
| Preserve actual Fail() with no reasons | Actual handler context.Fail(), not direct synthetic log input | Information enabled/disabled | Failed result/empty reasons; exact existing literal/event if enabled, zero output otherwise | Authorize_ShouldPreserveExplicitFailureWithoutReasons, two rows |
| Keep F056 independent, eager work and log contract preserved | Real no-handler unmet requirements through default evaluator | FailCalledFalse; enabled/disabled Information | Original requirement ToString enumeration and failed-requirement identity both modes, exact enabled diagnostic/none disabled | Authorize_ShouldPreserveUnmetRequirementDiagnostics, two rows |
| Preserve success path | Real default pass-through handler evaluates true assertion requirement | Information enabled/disabled, Debug allowed | Succeeded result/no Failure and exact Debug event1/template/zero Info checks | Authorize_ShouldPreserveSuccessDiagnostics, two rows |

Resource logging stores bounded counts only; full state/format capture happens
only in functional field tests/setup. Warm actual producer in both modes.
Check every parameterized row original-red/proposed-green individually, not
only a failing summary. Original enabled/negative controls must pass.

Disabled diagnostic-only reason enumeration is intentionally omitted; the
real failure result sequence is not changed. Arbitrary side-effecting/throwing
custom reason enumerables, invalid null data, concurrent filter changes and
other runtimes are not covered by ordinary default-result preservation.
No claim about broader policy behavior, server/middleware or rendered UI.
Pure diagnostic performance/output scope; no security assessment.

## Measurement/publication

Fresh separate BDN project uses actual DI service and default producer with
named/direct requirement inputs, disabled/Null/enabled/real LoggerFactory
filters, reason cardinalities/message sizes, empty/success/unmet controls.
Setup captures full actual results/logs twice against original contracts.
Immutable original harness/runtime/deps/all other output files, tested owner
only replacement for proposed; complete recursive DLL/JSON closure.
Serialize builds/tests/measurements, build -m:2, no schedules/subagents/
detached services or unrelated process/power changes.

Maximum three measured paired comparisons total; stop early only for a
clear large repeatable credible gain, otherwise at most three and retain every
case/control/time/heap direction. Publish full raw artifacts/commands/tests
and exact limitations in a fork-only template-preserving draft only after
acceptance is green and measurements justify it. Immediately request opening
every newly created draft in the browser, then verify remote head/body/scope/
blob bytes and persistent receipt/inventory. Unsupported gain means no-gain
or incompatible rejection, not a speculative draft.

## Final acceptance and closed measured budget

Final proposed229/229, all15 new rows pass; all three shipping TFMs built and
scoped whitespace passes. Exact original-owner/final-test shadows each226 pass/
three actual248/496/1264 resource failures. Initial-prototype owner with final
single-check assertions222 pass/seven Expected1/Actual2 failures; retained.
All six executed suites1374 outcomes1358 pass/nine original+seven initial-
prototype expected failures/no skips. Real producers/results/logs preserved.

Exactly three comparisons completed A/B, B/A, A/B:192 measured outcomes/
96 ratios/192 complete repeated original contracts,384 real setup workloads.
Final after-2 source is pairs2/3 only; all18 reached filtered-reason targets
faster in both pairs,16.39-95.88% lower time medians and216-65904 fewer B/op
in both. Maximum target CV16.58%; full observations/outliers retained.
Both source variants have66-file recursive owner-only DLL/JSON closures.

Tradeoffs remain after the tune: all five enabled-reason medians higher
3.92-31.52%; four slower in both final pairs, factory1-reason mixed.
Three no-reason literal controls slower in both, medians+4.19/+5.75/+12.26%.
Other unmet/success control directions mixed; no causal attribution.
This supports only the filtered explicit-diagnostic proposal, not a universal
net performance win or claim that tuning cured enabled costs. Every32-case/
all-three-pair result remains published, source versions never aggregated.
Budget closed; no fourth comparison or further source tune.
