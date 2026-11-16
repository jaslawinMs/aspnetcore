# F097 preimplementation acceptance

Finding: default-timeout CTS/timer allocation in JSRuntime, not F096's public
object-reference TimeSpan extensions. Source baseline
37e809ead5824bc753a1c3d56f11615bdb1296c5; independent branch
autoperf/F097-js-runtime-default-timeouts.

## Owning boundary and implementation gate

The existing default InvokeAsync overload creates its own token and calls the
nonvirtual internal explicit-token overload. Public BeginInvokeJS receives
invocation metadata, not that token. Its real pending call, registration,
serialization and protocol completion own the disputed preconditions.
Cancellation exceptions can expose a canceled token; those sources must never
be reset or reused. Explicit caller tokens remain caller-owned and untouched.

Prototype 1 preserved all semantics and saved 288B per warmed default call, but
its residual finite-minus-unconfigured overhead was 112B and missed the
unchanged <100B acceptance. Preserve that failed prototype and its exact
executed closure. Prototype 2 additionally changes the existing cancellable
registration expression to a static, stateful callback, eliminating its
per-call captured delegate. Caller tokens, execution-context capture,
registration cleanup and public signatures remain unchanged. Account for the
resulting unconfigured-control savings separately rather than attributing them
to timer reuse. Add an actual caller-token identity/override case and execute
the same updated tests against the original and proposed owning binaries.

Before a shipping edit, verify current-default source identities, actual
pre-relocation introducing/cleanup history, documentation, exact existing test
rows, and the baseline real managed probe. Read-only compiled public CTS method
IL must establish the measured BCL reset/queued-timer guard. The measured
CoreLib informational revision was not available from the public GitHub API
(404); a separately pinned current-public reference is not represented as its
source. No reflection access to private object state or private method execution
is permitted in the behavioral probe.

If ownership and reset rules pass, evaluate only a one-slot, per-runtime private
default-timeout source cache. It may retain one inactive CTS/timer/registration
node after success, but no active timer, pending request or completed request
state. Extra instance/first-use/idle retention costs must be disclosed.
No global pool, new dependencies, API/default changes or framework-private
cross-assembly access. Dispose must close and drain the free slot without
canceling already-owned pending calls or changing the original post-disposal
call behavior.

## Requirement matrix

| Requirement | Required concrete evidence |
|---|---|
| Default deadline reaches real pending work | Every Invoke/InvokeVoid/Constructor/Get/Set through public runtime APIs; three real finite-timer cancellations per operation, canceled task and cancelable requested exception token, late public reply leaves cancellation unchanged. |
| Existing overrides remain distinct | Each operation's real default timer actually cancels while its explicit CancellationToken.None call remains pending; reply completes the latter with the nondefault actual result. Configured infinity and unconfigured defaults remain pending past the observed finite boundary. |
| Zero deadline is immediate | After an earlier finite call completes, each operation with exact TimeSpan.Zero is already canceled and makes no transport dispatch. Constructor-zero cancellation is not equivalent to asynchronous CancelAfter(0). |
| Earlier timers cannot cancel later work | Complete a real finite default request, switch to infinity, start another pending request, observe a real sentinel after the earlier deadline, then complete by public reply. |
| Canceled exception tokens retain identity/state | Real timer cancels a default call; after further success and another deadline, the old exposed canceled token remains requested and differs from the new canceled operation token. |
| Overlap owns separate deadlines | Start eight genuinely pending default calls before their public replies; complete a selected request, let remaining real timers cancel, retain every handle/task/token outcome. |
| Serialization is inside the deadline | An actual serialized argument getter uses an explicit test gate; real runtime timeout elapses while serialization is held. Release the getter and observe the actual canceled public call, not an injected cancellation callback. |
| Validation/transport/protocol errors | Invalid timeout, actual serialization getter exception, synchronous public dispatch exception and actual public protocol failure preserve exception type/parameter/message and returned-task timing. |
| Disposal and free-source lifetime | Existing pending default call survives runtime Dispose until its own reply/deadline; subsequent behavior stays as baseline. Primed allocation before/after Dispose and collectability observe reuse shutdown/absence of a live timer root at the managed boundary. |
| Correctness and exact producer identity | Existing xUnit rows plus focused new semantic cases as needed; raw TRX definitions/outcomes/positive durations/zero skips; actual owner, producer, harness PDB source checks and complete executable closure. |
| Measured resource objective | An unchanged baseline public-owner allocation check must fail the compatible reuse objective; the candidate must pass it. This is the performance red/green boundary, not a claim that existing timeout semantics were broken. |
| Honest actual comparison/publication | At most three before/after comparisons, identical harness/runtime/settings, all controls/results/GC/statistics/variance retained, exact immutable source and evidence commits remotely verified. A grounded compatible gain alone permits a fork-only draft, opened immediately. |

## Intentionally excluded boundaries

This is generic Microsoft.JSInterop-only managed-library work; the explicit
exception in docs/BlazorComponentsGuidance.md, Tests/diagnostics/repo-fit,
selects its faithful managed test boundary. No browser JS execution, UI,
transport/server/WebAssembly interoperability, circuit lifecycle, render-mode,
application invocation frequency or production-throughput claim. No trimming
or reflection-metadata behavior is changed. Native/WebAssembly timing and every
possible timer/disposal race are not proved by a bounded desktop probe; record
the compiled ownership invariant and actually exercised interleavings.
