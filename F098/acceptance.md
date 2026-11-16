# F098 preimplementation acceptance - explicit IJSRuntime timeout

Continue the existing restored358-item evaluation campaign; no new scan,
inventory/card edits or telemetry workflow. The scanner's utility-frequency
classification is provenance, not proof of application call frequency.

Owner: public JSRuntimeExtensions.InvokeAsync<T>(IJSRuntime, string, TimeSpan,
object[]). Producer: its actual per-call CTS constructor/token and await/using
lifetime. Public arbitrary IJSRuntime implementations receive that token before
returning. Unlike F097's private default path, successful consumers may retain
the token. Finite/infinite are different contracts; existing infinity already
creates no CTS. Sibling timed InvokeVoid/constructor/get/set overloads are
excluded from this finding's optimization, not silently repaired.

Use the generic Microsoft.JSInterop managed-library exception in
docs/BlazorComponentsGuidance.md. No browser/JS/circuit/transport/server/
WebAssembly, NativeAOT, app frequency or production-throughput claim.
Independent branch from37e809e; preserve all F097 frozen artifacts/commits.
Read current-default/source/blob identity, renamed-path history and existing
contracts before considering implementation. No SDK/package/global changes.

| Requirement | Faithful acceptance before any shipping change |
|---|---|
| Explicit deadline really cancels | Three real100ms CTS producer deadlines through actual timed extension, public retaining IJSRuntime consumer and JSRuntime/protocol; canceled exception token equals the one passed to the consumer, late public reply cannot undo cancellation; watchdog must not produce the claimed cancellation. |
| None/infinity/default remain distinct | Real configured default100ms cancels its default call; same-time infinity and explicit-None calls remain pending beyond a real600ms sentinel and complete with731. Infinity uses exactly CancellationToken.None and adds no timer. |
| Zero is synchronous | Consumer observes requested/cancelable token before forwarding; actual JSRuntime returns canceled public task and never dispatches. |
| Lifetime covers actual work | Pending finite CTS remains active until actual public reply; success/error cleans active timer. Serializer getter is entered while source is active, deadline expires before explicit release and public call cancels; no injected timeout. |
| Validation and errors are preserved | Null receiver and invalid -2ms are returned-task ArgumentNull/ArgumentOutOfRange errors with jsRuntime/delay parameters; actual getter, synchronous transport and async public protocol failures preserve exact exception/type/returned-task timing and timer cleanup. |
| Ownership and overlap remain independent | Eight actually pending calls each carry distinct cancelable tokens; one success and seven real canceled tasks, matching original passed tokens and late-reply cleanup; Dispose does not cancel an owned pending explicit-timeout operation. |
| Successful token lifetime cannot be changed | Actual timed extension success exposes a never-canceled retained token; a later real timed call cancels only its own token. Separate public CTS.TryReset/CancelAfter control, still consumed by the actual public IJSRuntime/JSRuntime path, demonstrates how reuse changes a previously completed retained token. This control is not a compiled shipping candidate or speedup. |
| Resource effect and evidence are real | Actual warmed public-owner5000-call checksums, finite/infinity/None allocation/timer counts, immutable loaded owner/harness/runtime/source/PDB/closure identity; existing exact owning test rows/no skips/positive duration. |
| Measurement/disposition are honest | At most3 source comparisons. If generic removal/reuse violates public token contracts, reject it without shipping edits or a performance PR; run only one original9-case BDN sweep (3 policies x3 reply shapes, overlap8 per batch) to quantify pressure, never label finite-vs-infinity/None a before/after gain. Preserve all raw samples/GC/setup/source association and publish an actual immutable receipt/index. |

No permanent product tests for an intentionally throwaway compatibility probe.
A shipped replacement would additionally require the same assertion genuinely
red without the performance change and green with it, complete error/ownership
preservation and repository coverage. An owner-specific API/lifecycle redesign
is not implicitly authorized or proven by rejecting unconditional generic reuse.
