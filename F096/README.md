# F096: per-operation JS object timeout sources

**Rejected as a generic performance proposal. No shipping change and no
performance PR.** The original finite request paths have a real allocation
cost, approximately400 additional managed bytes per call at this managed
boundary, including the actual runtime cancellation registration. That does
not justify deleting a deadline or generically reusing an externally observable
operation token. Infinity already bypasses extension CTS/timer creation.

There is also a separately reproduced **original managed timeout-lifetime
failure**: constructor, property-get and property-set TimeSpan calls dispose
their CTS before an incomplete runtime operation finishes. All three fail the
deadline assertion in every one of three repetitions; generic invoke and void
invoke cancel correctly in every repetition. No correctness repair or
repair-as-speedup is claimed in this performance item.

## Original finding and scope

- Retained scanner ID: F096; card `cancellationtokensource-timeout-timer-hot-path`.
- Owner: `src/Components/JSInterop/src/JSObjectReferenceExtensions.cs`, scan
  lines97-202. Five finite TimeSpan operations create a CTS and schedule a
  timeout timer. Scanner medium/likely/moderate classifications are provenance,
  not proof of excessive application call frequency or unnecessary deadlines.
- Independent source branch: `autoperf/F096-js-object-reference-timeouts`,
  unchanged campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Current upstream default checked:
  `b38e2847d9cda5fbba26177354ed11ede3f7dbfe`. All13 relevant owner, actual
  producer, interface, project and test source blobs match the baseline and
  captured working source. Raw Windows bytes and canonical Git identities are
  separately checked; CRLF is not confused with Git LF normalization.
- Followed actual pre-relocation history. The constructor TimeSpan method was
  added in the 2025 API addition, dotnet/aspnetcore#61246; the constructor rename
  and new property TimeSpan methods were introduced in dotnet/aspnetcore#62588.
  The 2026 directory move alone was not treated as creation history.
- The preserved targeted existing-work query returned13 issue/PR matches; it
  did not identify an exact open pending-deadline fix. This bounded query is not
  proof that no related work exists anywhere.

See [preimplementation acceptance](acceptance.md), [every original benchmark
outcome](comparison.md), [strict measurement audit](measurement-audit.json),
[exact commands and outcomes](validation-commands.md), and the source/proof/raw
trees. No source candidate passed the generic compatibility gate.

## Faithful managed producer and limits

The external harness uses the actual shipping JSRuntime. Its actual registered
JSON converter creates an exact `Microsoft.JSInterop.Implementation.JSObjectReference`;
the normal object implementation dispatches the real operation into the real
pending-task, serialization and cancellation-registration path. A public
transport subclass records actual JSInvocationInfo and withholds or delivers
actual protocol replies through public DotNetDispatcher.EndInvokeJS.

TimeSpan cancellation is produced by the real extension CTS and real BCL timer,
not by manually firing a cancellation callback. A separately observed real BCL
sentinel timer establishes the observation after the100ms finite deadline,
approximately600ms later. Its5s watchdog bounds a failed prerequisite; a fixed
sleep is not the synchronization mechanism. The two existing awaited timeout
operations are positive controls alongside each affected operation.

This validates **managed per-operation deadline/task/token ownership**, not
actual JavaScript execution, browser scheduling, server/WebAssembly transport,
UI, render modes, circuits or production throughput. Generic JSInterop-only
library work is explicitly outside the Components UI/browser workflow in
`docs/BlazorComponentsGuidance.md`, Tests/diagnostics/repo-fit. No sample or
shipping browser test is added for this throwaway library investigation.

The timed setter uses a string value and a null public protocol reply. It does
not establish all setter generic-type/result conventions, actual JS mutation,
or a value-type setter/browser scenario. Arbitrary custom object-reference
implementations and restricted-consumer pool designs are not evaluated.

## Actual lifetime and compatibility observations

| Exact diagnostic case | Actual original observation |
|---|---|
| `FiniteTimeout_CancelsPendingInvoke` | All3 rows cancel the actual pending task from its real100ms timer; the actual cancellation token matches and a late public reply leaves it canceled. |
| `FiniteTimeout_CancelsPendingInvokeVoid` | All3 rows cancel with the same material token/task checks. |
| `FiniteTimeout_CancelsPendingConstructor` | All3 rows remain incomplete/noncanceled after the observed real sentinel timer; only the later cleanup reply completes the real constructor result. |
| `FiniteTimeout_CancelsPendingGet` | All3 rows fail the same managed deadline assertion; only the public cleanup reply produces the nondefault731 result. |
| `FiniteTimeout_CancelsPendingSet` | All3 rows fail the same managed deadline assertion; only the public cleanup reply completes the retained task. |
| `ActualPendingTimerLifetime_{operation}_Finite` | Invoke and InvokeVoid retain one active timer while pending and none after completion. Constructor/Get/Set expose cancelable tokens but already have zero active timers while their real tasks remain pending. |
| `ActualPendingTimerLifetime_{operation}_Infinite` | Every operation uses CancellationToken.None with no added active timer, despite a configured runtime default timeout. |
| `OriginalDefaultRuntimeDeadlineVsInfiniteOverride_{operation}` | All5 real default/infinity pairs reach pending producers: runtime-default calls actually cancel, infinity calls remain pending beyond that deadline and complete only from their public reply. |
| `GenericTryResetReuse_ChangesPreviouslyCompletedConsumerToken` | Real BCL TryReset succeeds after an actual first completed request; its real rearmed timer cancels a second real runtime request. A retained token from the previously successful pooled request now reports canceled, unlike the original disposed-per-call token. This is a generic-pooling counterexample, not a shipping candidate or a speedup. |

Each `{operation}` row is present separately for Invoke, InvokeVoid,
Constructor, Get and Set in the actual JSON. The frozen check contains15 finite
deadline rows,5 default/infinity pairs,10 timer observations,25 exact
validation/error/timing observations and10 primed5000-call allocation batches.
The earlier pre-format/pre-default-control check also preserves all15 actual
finite rows and its exact original harness source/PDB identities.

`NullObject_{operation}`, `InvalidTimeout_{operation}`,
`DisposedObject_{operation}`, `SynchronousTransportFailure_{operation}` and
`AsyncPublicProtocolFailure_{operation}` are separately observed for every
operation. Existing constructor/get entry and transport failures are
synchronous, whereas invoke/void and the actual setter's asynchronous
implementation have returned-task failure paths. Simply adding async to
existing public extension declarations would also change some original
exception timing. No such rewrite is silently presented as a neutral
performance optimization.

The documented [TryReset sole-owner conditions and retained-token behavior](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.tryreset?view=net-10.0) were
checked against public Microsoft documentation and reproduced on the pinned
runtime. The public documentation moniker was net10/net11, **not a claimed
net12-specific guarantee**; actual runtime behavior is independently in the
control. Removing every finite timer, sharing an outer deadline, or adding a
generic source pool is not accepted without an equivalent operation boundary.

## Original resource pressure, not savings

All10 original5000-call inline completion batches consume the actual result
checksum3655000; actual runtime task/registration/serialization work is
included. Incremental finite versus infinity allocated bytes per call are:

| Operation | Original finite B/call | Original infinity B/call | Different-contract increment B/call |
|---|---:|---:|---:|
| Invoke | 912.0000 | 510.7328 | 401.2672 |
| InvokeVoid | 814.7328 | 414.7328 | 400.0000 |
| Constructor | 902.7328 | 502.7328 | 400.0000 |
| Get | 766.7328 | 366.7328 | 400.0000 |
| Set | 838.7328 | 438.7328 | 400.0000 |

These are measured whole managed-boundary allocations, not an isolated CTS
object-size attribution. No unmeasured cause is asserted for the small first
row residual. Selecting infinity changes the cancellation contract; those
bytes are not a compatible source-change saving.

## Original BenchmarkDotNet run

One original-only sweep covers5 operations x2 existing deadline policies x2
harness-owned reply timings: **20 actual outcomes,160 retained result samples,
60 actual warmups and20 owner/harness/hash/PID-linked setup receipts**. Every
case verifies two real calls, target47, arguments, call/result type and consumed
result before timing. No unfavorable case or sample is dropped.

Release/x64, C#13, BenchmarkDotNet0.13.0, SDK
12.0.100-alpha.1.26557.102, runtime12.0.0-alpha.1.26562.105
(`.NET12.0.0 (12.0.26.56305)`), in-process, concurrent-server-GC,
requested100ms iterations,3 warmups and8 actual retained results, DontRemove.
The actual original owner SHA256 is
`9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5`;
the measured harness SHA256 is
`9AC0F7D993E4445DEA664D1424731080F339292E23FC5AB72CE6BD2EB2DC9E3B`.

Read-only machine inventory reports an Intel Xeon Platinum8473C,8 cores/16
logical processors; the actual BDN report says Unknown processor and missing
core counts. Both observations are preserved. This is a shared Windows machine;
no power/affinity/priority settings or unrelated processes were changed, and
CPU-heavy work was serialized with max2 build nodes.

Maximum retained CV is **48.93%**, original constructor/finite/deferred. Its
actual results trend from approximately3028ns to905ns; no causal host/JIT
explanation or stable comparative speedup is asserted. The full table and raw
samples retain it. In timed deferred cases the harness sends a public reply
after actual dispatch returns; it does not wait for expiration or repair the
broken original deadlines.

**Source A/B comparisons:0/maximum3.** A generic compatible source candidate
was rejected before timing; the closed one-sweep original pressure experiment
is not counted as an original/proposed comparison. Running an incompatible
proposal three times would not justify it. No restricted implementation,
different strategy or runtime is represented as measured.

## Owning tests and requirement coverage

The actual existing owning test command passes all18 exact definitions/results,
with positive durations and zero skips. The strict TRX audit names every
test. Those existing tests passing do not contradict or repair the separately
failing TimeSpan extension deadlines.

| Requirement | Evidence |
|---|---|
| Actual underlying object dispatch/disposal | `Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_InvokeAsync_CallsUnderlyingJSRuntimeInvokeAsync`, `JSObjectReference_Dispose_DisallowsFurtherInteropCalls`, `JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException`, `JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException_OnMultipleCalls`; actual18-row TRX plus live converter/protocol diagnostics. |
| Existing timeout/no-timeout contracts | `Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeAsync_WithTimeout`, `InvokeAsync_WithInfiniteTimeout`, `InvokeVoidAsync_WithTimeout`, `InvokeVoidAsync_WithInfiniteTimeout`; all5 real default/infinity diagnostic pairs supply actual timeout producer reachability beyond these existing completed mocked cases. |
| Actual runtime timeout/cancel/early completion | `Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout`, `InvokeAsync_CompletesSuccessfullyBeforeTimeout`, `InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires`, `InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested`; all actual TRX rows pass. |
| Every finite object TimeSpan deadline | Exact `FiniteTimeout_CancelsPendingInvoke`, `FiniteTimeout_CancelsPendingInvokeVoid`, `FiniteTimeout_CancelsPendingConstructor`, `FiniteTimeout_CancelsPendingGet`, `FiniteTimeout_CancelsPendingSet` diagnostic rows; first two green3/3, last three red3/3 each, initial and frozen checks. No green-after-fix claim. |
| Public validation/error timing and token reuse | All25 separately named error rows and `GenericTryResetReuse_ChangesPreviouslyCompletedConsumerToken`; actual producer/task/token effect, exact source/PDB proof, no private access. |
| Original resource/run/persistence | Ten exact `InlineActualOwnerAllocation_{operation}_{policy}` batches;20 fully audited BDN cases; source/PDB, recorded recursive62-file/20-runtime-asset closure, complete command/results and immutable copy/remote verification receipts. |

No shipping code, sample, permanent test or API baseline is changed. No RTM
approval, broad test coverage, production hot-path frequency or browser
interoperability is claimed. The constructor/get/set managed deadline gap is
recorded for a separate correctness follow-up, not fixed by this evaluation.

## Reproduction and evidence interpretation

From the downloaded F096 directory, replay the recorded evidence:

```powershell
node .\reproduce-analysis.mjs "$((Get-Location).Path)" --verify
.\audit-owning-tests.ps1 -RunRoot "$((Get-Location).Path)" -Verify
```

These commands passed on the exact public copies. They validate source hashes,
canonical Git identities, recorded PDB source proofs/closure, every contract
observation, every setup/console/full-JSON sample, GC totals and internal
reported confidence-interval arithmetic. They do not independently recompute
confidence-distribution quantiles or rehash omitted DLL/PDB bytes.

For a fresh actual-owner run, use the specified baseline checkout, activate
`. .\activate.ps1` from C:\src\aspnetcore in each new shell, restore/build the
external harness in Release/max2 nodes, and pass a new explicit absolute
`--artifacts` directory. `--require-deadlines` deliberately returns1 on this
unchanged baseline with the nine observed failures; `--characterize` records
the same original diagnostic boundary without claiming the deadlines passed.
Use the exact preserved benchmark arguments for an original profile sweep.

Historical orchestration scripts retain their session-root paths and are
records, not directly portable entry points. Actual measured DLL/PDB bytes
remain local and are omitted from the public package. Their real source
document checks and full original copied execution closure are preserved.
The immutable package and separate four-file receipt/index publication are
verified against actual fork Git blobs, not inferred from a successful push.
