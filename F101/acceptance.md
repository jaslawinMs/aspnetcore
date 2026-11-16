# F101 acceptance - timed public runtime property read

Scope: `JSRuntimeExtensions.GetValueAsync<TValue>(IJSRuntime,string,TimeSpan)`,
not F096's object-reference owner, F098's function call, F100's constructor,
F102's setter or a browser/native JavaScript lifecycle change.

Before considering a shipping change:

- Reverify the actual current-default/baseline/working owner and producing
  runtime/interface/result/converter/project/test sources, canonical Git bytes
  and historical relocated paths. Inspect the original approved API proposal
  and a bounded current existing-work query. Preserve scan classification
  as provenance, not demonstrated usage frequency or a verified hot-path bug.
- Build a new pinned BenchmarkDotNet project that **returns the actual int
  property value731** through GetValue/Default/root0/`[]`, public reply decoding
  and actual PendingAsyncCall<int>. Verify the GetValue opcode, material result,
  owning DLL, same harness/config/deps and full frozen execution closure.
  Exercise a separate actual reference-valued property reply and public
  reference property read on target47 as diagnostic scope/converter controls,
  not a constructor or integer-returning surrogate for the timed path.
- Reach every finite pending deadline precondition and nearest awaited typed
  function deadline control three times using real100ms CTS,600ms sentinel
  and bounded5s watchdog. If the original loses its deadline before task
  completion, preserve and report that failure; repairing it is explicitly
  outside this performance evaluation, not a speedup or an A/B improvement.
- Verify actual default-timeout cancellation, infinity/explicit None
  overrides, zero requested at public consumer entry, distinct overlap tokens,
  active timer counts, synchronous null/invalid-timeout/transport errors,
  actual asynchronous protocol/deserialization failure, pending runtime
  disposal, successful retained-token lifetime and actual reference disposal.
- **GetValue has no arguments or value serialization.** Do not copy F100's
  constructor argument getter gate or F102's setter-value serialization into
  its claimed producer. Instead characterize real CTS/runtime cancellation
  while a test host's synchronous BeginInvokeJS gate holds the property call
  before return. Name that managed transport-gate boundary; it is not evidence
  of a production browser host stall or property argument serialization.
- Exercise real public TryReset/CancelAfter and a retained actual GetValue
  consumer token. Generic deletion or unconditional reset/reuse must preserve
  all observable tokens/zero/errors/ownership contracts; otherwise reject
  that strategy without claiming every possible owner-specific redesign is
  disproved. A downstream response with synthetic callbacks is not enough.
- Run the16 exact existing baseline extension/runtime/object-reference
  control tests with actual definition/result/execution IDs,positive durations,
  zero skips and actual test-source/PDB/local-owner proofs. Existing tests do
  not claim dedicated timed-property coverage; new executable owning probes
  establish the disputed GetValue boundary.
- Measure nine real original policy/workload cases: finite,infinity,explicit
  None times inline,deferred,eight overlapping property reads. Retain every
  raw sample,setup receipt,GC/allocation,mean/median/CV and all warmed5000-read/
  fresh20-runtime phase calipers. Different original timeout policies are
  not equivalent source optimizations; do not force allocation deltas to
  match sibling cases or attribute variance/cold costs without evidence.
- Maximum three actual source comparisons; stop early only for a clear
  compatible large win. No rerunning original sweeps to hide inconvenient
  samples. If the compatibility gate rejects the generic strategy, close the
  source-comparison budget at zero and publish original profiling/rejection
  rather than an empty speculative performance PR.
- Publish a separate verified fork branch and an exact portable source/project/
  history/docs/probe/tests/raw/statistical-auditor capsule, then actual remote
  immutable blobs and four-file receipt/index. Open a fork-only draft
  immediately only for a compatible grounded proposal. Rejections have no
  optimization PR/browser-open claim.

Managed generic Microsoft.JSInterop-only scope per
`docs/BlazorComponentsGuidance.md`; no shipping API/default/dependency/visibility
changes,private cross-assembly access,permanent product tests,sibling repair,
UI/browser/circuit/server/network/native JS identity/release,WASM/AOT or
production frequency/throughput claims. Shared Windows CPU-heavy work stays
serialized/max2 build nodes;power/priority/affinity/unrelated processes unchanged.
