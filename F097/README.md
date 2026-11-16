# F097 - private JSRuntime default timeout reuse

**Qualified allocation-focused fork draft, not merge-ready.** Real managed
default calls save352B per warmed single invocation, including all timed single
cases. Timed allocation falls26.35-44.44%, not50%. This is not a universal
speedup:14/15 finite Overlap8 comparisons are slower despite799-800B saved per
eight-request batch (7.24-8.60%). Get/Overlap8 is12.11% slower in one pair.
Finite Invoke/WindowInline means range17.55% slower to37.79% faster, maximum
CV52.25%; its third-pair median is28.26% slower. All outcomes remain.

The final proposal has one private idle source slot per JSRuntime. A completed
operation returns only a successfully reset, noncanceled, never-queued source.
Exact zero cancels synchronously rather than using asynchronous CancelAfter(0).
Dispose atomically closes/drains the free slot without canceling an owned
pending call or changing the original subsequent-call behavior. Explicit tokens
remain caller-owned. The existing registration expression also uses a static,
stateful callback with the same context/token/cleanup contract. Therefore
no-default controls are **changed**, saving48B per call/384B per eight-request
batch separately;24/75 control mean comparisons regress, including15.86%
slower Constructor/ObjectInline. No timer-only speedup attribution.

Source: two independent shipping/test files, JSRuntime.cs54 additions/8
deletions and JSRuntimeTest.cs132 additions/0 deletions. No public API,
default, package/project, visibility or framework-private access change.
[Actual source commit](source-commit.txt), [remote canonical source
proof](committed-source-identities.json) and [minimal-diff review](surgical-source-review.json).
Measured binaries were compiled from verified working edits on37e809e;
the later source commit is verified against their actual PDB source, not
substituted into earlier assembly informational metadata. Git CRLF-to-LF
canonicalization is the only permitted source-byte difference.

## Actual evidence

Three unchanged-candidate comparisons AB/BA/AB,50 cases per source:
Invoke/InvokeVoid/Constructor/Get/Set, finite/unconfigured default, window and
actual converter-created object callers, inline/deferred public replies and
eight genuinely overlapping pending requests. **Overlap8 is per batch, not per
call.**300 actual outcomes/150 pairs/2400 retained results/900 warmups/300
owner-harness-PID-linked exact protocol/type/args/result setup receipts.
Every setup invokes twice, consuming1462 or11696 as appropriate.

The identical faithful resource probe is original-red/proposed-green:
400B original finite-minus-unconfigured overhead,96B proposed, strictly below
the unchanged100B acceptance; disposal shutdown difference is at least200B.
All five warm single calls save352B; configured infinity likewise saves352B
but is not in the timed matrix. Prototype1 saved288B but failed the same goal
at112B, and its source/executed closure and expected-resource-red repeats
remain. The first expected-green attempt actually exited1 and is not relabeled
as a pass. Static callback tuning adds64B default saving while no-default
separately saves48B. No fourth comparison or postmeasurement tuning.

Original/proposed each preserve53 exact semantic observations. All34 initial
existing tests,40 baseline-with-initial-new-tests,41 updated original-owner and
41 proposed-owner rows pass with strict identities/positive durations/zero
skips. The last two use the same compiled test assembly. Semantic checks are
green/green preservation, not a fabricated correctness failure.

| Requirement | Evidence |
|---|---|
| Actual finite producer cancels pending calls | `DefaultDeadline_CancelsPendingInvoke`, `DefaultDeadline_CancelsPendingInvokeVoid`, `DefaultDeadline_CancelsPendingConstructor`, `DefaultDeadline_CancelsPendingGet`, `DefaultDeadline_CancelsPendingSet`: three real CTS deadlines per operation, requested cancelable exception token and late public replies leave cancellation unchanged. |
| Overrides and infinity stay distinct | Five `DefaultVsExplicitNone_*` pairs, ten real sentinel-observed infinity/unconfigured pending controls; `InvokeAsync_ExplicitNoneOverridesDefaultAfterCompletedCall` and `InvokeAsync_CancellationExceptionPreservesExplicitCallerToken`. |
| Exact zero never dispatches after earlier success | Five `ZeroDefault_NoDispatchAfterCompleted*` rows and `InvokeAsync_ZeroDefaultTimeoutDoesNotDispatchAfterCompletedCall`. |
| Old successful timers cannot cancel later work | Five `EarlierDeadlineCannotCancelLaterInfinite_*` public-owner probes. |
| Canceled exception tokens never get reset/reused | Five `CanceledDefaultTokenNeverReused_*` rows and `InvokeAsync_CanceledDefaultTokenIsNotReused`. |
| Overlap owns independent sources/deadlines | `OverlappingDefaults_IndependentDeadlines`: eight real pending calls, one actual success, seven real cancellations and distinct tokens; `InvokeAsync_OverlappingDefaultCallsHaveIndependentCancellationTokens`. |
| Serialization remains inside the deadline | `DefaultDeadline_CoversActualSerialization`: real serializer getter/explicit gate, sentinel past actual deadline, canceled public task after release; no injected framework timeout. |
| Error type/parameter/timing stays intact | `InvalidDefaultTimeout`, `ActualSerializationGetterFailure`, `SynchronousPublicTransportFailure`, `ActualPublicProtocolFailure`; `InvokeAsync_InvalidDefaultTimeoutAfterCompletedCallPreservesValidation` also tests recovery. |
| Disposal preserves owned work and shuts down reuse | `Dispose_PreservesPendingAndPostDisposeBehavior`, real pending public reply, primed resource shutdown check and no extra active timer; `InvokeAsync_DisposeDoesNotCancelPendingDefaultCall`. |
| Completed default runtime is collectable | `CompletedDefaultRuntime_IsCollectable`, bounded actual owner/CTS GC probe. |
| Resource objective is truly red/green | Same frozen harness: [original expected-red](frozen-baseline-reuse-red-command.json), [preserved prototype1 expected-red](frozen-prototype1-reuse-red-command.json), [proposed green](frozen-candidate-reuse-green-command.json); all53 observations/15 warm/15 fresh-runtime batches reach assertions. |
| Exact actual producer/binary/report association |28 owner/producer/harness PDB proofs, one updated test PDB proof, identical62-file/20-runtime-asset closures differing only owner DLL/PDB; [portable auditor](reproduce-analysis.mjs), [exact commands/results](validation-commands.md), raw TRX/full JSON/consoles and actual source-blob verification. |

## Reproduction and audit

The [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj) pins
BDN0.13.0, net12, C#13, Release/x64, concurrent server GC, in-process,
requested100ms iterations,3 warmups/8 retained results and DontRemove.
SDK12.0.100-alpha.1.26557.102 and runtime12.0.0-alpha.1.26562.105 are
recorded. From C:\src\aspnetcore activate `. .\activate.ps1` in every fresh
dotnet shell; build the external project using
`-p:AspNetCoreRoot=<checkout> -p:UseIisNativeAssets=false`, max2 nodes.
See [exact commands and outcomes](validation-commands.md).

Run `node .\reproduce-analysis.mjs <absolute-capsule-path> --verify` and the
four exact [TRX auditor](F097-xml-audit.ps1) invocations documented with their
34/40/41/41 expected identities. Raw console samples/GC totals are compared to
full JSON; mean/variance/SD/SE/median and CI-internal arithmetic are recomputed.
Confidence-distribution quantiles are not independently recomputed.
[All150 pairs](comparison.md), [all300 raw outcomes](raw-outcomes.json),
[resource/cold observations](resource-deltas.json) and
[original/proposed resource probes](verification) remain unchanged.

## Boundaries and costs

Generic Microsoft.JSInterop-only managed-library work, selected by the explicit
exception in docs/BlazorComponentsGuidance.md, Tests/diagnostics/repo-fit.
Real JSRuntime/converter/reference/CTS timers and public protocol completion are
exercised, **not JavaScript execution, browser/UI, circuit, transport/server or
WebAssembly interoperability**. Deadline observations are public window APIs;
actual object paths are tested in timed protocol/completion cases, not an
unexecuted object-target deadline/browser claim.

A reference and boolean instance field and up to one inactive
CTS/timer/registration are retained per runtime after success. This is not free
memory. Fresh-runtime20-call batches include real serializer/runtime startup
and variation; no isolated layout-size, first-use-throughput, browser/native
timer behavior, every-disposal-race, application-frequency or production hot-path
claim. Shared Windows Xeon8473C,8 cores/16 logical processors, CPU-heavy work
serial/max2 nodes, no machine/power/affinity/unrelated process changes requested.
BDN's Unknown processor/null counts are preserved beside read-only inventory.

The measured CoreLib informational commit was publicly404; separately pinned
current-public CTS source is reference-only. Actual loaded compiled
constructor/reset/initializer IL, queued-timer guard and real zero/deadline
effects are retained; no private object-state read or private method invocation.
All14 scoped current-default/baseline source identities match initialb38e2847
and latestd7870e7e; no whole-current-default build/runtime equivalence claim.

Raw DLL/PDB bytes are omitted from this public capsule. All actual recursive
closure records/source-PDB proofs/raw reports are included and byte-copied;
portable audits do not pretend to rehash omitted executable bytes. Preparation
audit assumptions (.csproj included as source, then exact800B timed delta)
were rejected and corrected only in the auditor, with actual799B rounding
retained; shipping source, harness, runs and strict resource acceptance did not
change.
