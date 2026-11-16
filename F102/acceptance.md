# F102 acceptance - timed public runtime property write

Scope: `JSRuntimeExtensions.SetValueAsync<TValue>(IJSRuntime,string,TValue,TimeSpan)`.
This is the runtime-root setter, not F101's reader, a function/constructor
adapter, an object-reference setter repair or native JavaScript mutation.

Before considering a shipping optimization:

- Reverify current-default/baseline/working owner, runtime/interface/serializer/
  pending/result/project/test source and canonical Git bytes. Inspect the
  actual introduction through the relocated path, approved originating API
  proposal and bounded current setter/timeout work. Scan classification
  remains provenance, not measured production frequency.
- Build a new pinned BenchmarkDotNet project whose measured method returns
  **void** and consumes the real setter's non-generic ValueTask. The actual
  runtime serializes value123 as `[123]`, dispatches SetValue/JSVoidResult/
  target0 and consumes a public `null` acknowledgment through its real pending
  call and serializer. An array-value control must preserve both123 and731
  in the emitted wire payload. Do not substitute integer reply731, GetValue,
  constructor dispatch, fabricated browser state or an object-reference setter.
- Exercise the original finite pending deadline three times using real100ms
  CTS,600ms sentinel and5s watchdog, with three nearest awaited void-function
  cancellation controls. Preserve any original deadline failure without
  describing its repair or different timeout policies as a performance win.
- Cover ordinary configured-default cancellation, infinity/explicit None
  overrides, zero cancellation at the retaining public setter consumer,
  active timer counts, eight distinct overlapping tokens/real acknowledgments,
  pending runtime disposal and completed retained-token lifetime.
- Preserve the actual error boundary: null runtime/invalid timeout are
  synchronous extension errors; real JSRuntime's **async setter** captures
  value-serialization and synchronous transport exceptions in the returned
  ValueTask. Exercise actual protocol failure separately. Do not carry over
  a reader/constructor's synchronous transport claim.
- Hold the actual serializer's value-property getter behind an explicit
  bounded test gate. Observe the real timer/token/runtime cancellation before
  releasing serialization and consuming the resulting setter task. This
  producer is reachable because SetValue has a real value argument; it is
  not F101's transport gate or evidence of browser scheduling.
- Exercise public TryReset/CancelAfter with a retained actual setter consumer
  token and a later actual explicit-token setter. Deletion or unconditional
  reset/reuse must preserve tokens, zero, pre-return serialization, errors,
  ownership and overlap; otherwise reject that generic strategy. Do not
  pretend that this disproves every possible private owner-specific redesign.
- Run the16 exact existing baseline extension/runtime/object-reference
  controls, requiring actual definition/execution/result IDs, positive
  durations, zero skips and test-source/PDB/local-owner matches. These are
  controls, not existing dedicated timed-setter coverage.
- Measure nine original cases: finite/infinity/explicit None times inline/
  deferred/eight overlapping actual setter operations. Retain all raw samples,
  actual hash/PID/enum-linked setup receipts, GC/statistics and three phases of
  warmed5000-write/fresh20-runtime calipers. Count completed acknowledgments
  and actually emitted value123 checksums, not invented return values.
  Include all batch/harness/serializer costs and preserve cold/variance data.
- Maximum three actual source comparisons; no rerunning an original sweep
  to hide inconvenient results. A rejected compatibility gate closes the
  source-comparison budget at zero, with original profiling and an honest
  rejection rather than a speculative optimization PR.
- Publish a separate verified fork branch and byte-exact portable project/
  source/history/docs/probes/tests/raw/auditor capsule. Verify actual immutable
  remote blobs and receipt/index. Open a fork draft immediately only for a
  compatible, measured proposal.

Managed generic Microsoft.JSInterop-only scope per
`docs/BlazorComponentsGuidance.md`. No shipping API/default/dependency/visibility
change, private cross-assembly access, permanent product-test addition, sibling
repair, browser/UI/circuit/server/network/native mutation, WASM/AOT or
production throughput claims. Serialize CPU-heavy work/max2 build nodes on the
shared Windows host; do not change power, priority, affinity or unrelated work.
