# F100 - timed public constructor: generic CTS removal/reuse rejected

**No shipping change or performance PR.** Generic CTS removal/reset-reuse
changes the actual public constructor token, zero-timeout, validation and
serialization cancellation contracts. Separately, the original finite
constructor already loses its deadline while its actual result remains
pending. That original correctness failure is characterized, not repaired or
presented as a performance improvement.

Independent fork branch `autoperf/F100-js-runtime-constructor-timeouts` remains
at unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; its actual
remote ref is verified. No optimization commit, API/default/dependency/
visibility change, sibling F101/F102 repair or speculative PR.

## Actual constructor/reference result, not an integer adapter

This new harness invokes the real timed public **runtime** constructor,
not F096's object-reference extension. The actual `JSRuntime` dispatches
ConstructorCall/JSObjectReference/target0/real args/positive handle. A public
`{"__jsObjectId":47}` reply goes through the actual registered converter and
worker, producing the exact owning `JSObjectReference`.

The benchmark really returns **IJSObjectReference**. Diagnostic/setup calls on
its returned references actually dispatch target47 and return typed731. Those
material controls are outside timed measurement, not a fictional integer
constructor result or a presence-only assertion. Each setup verifies two
real runs,2/16 constructor results and two actual material-target controls.
Replies use a fixed positive fixture ID; native identity generation, actual
JavaScript construction and object release are not claimed.

## All nine original measurements

| Original policy | Actual reference workload | Mean ns | Allocated B/op |
|---|---|---:|---:|
| Finite | Inline | 1555.2 | 920 |
| Finite | Deferred | 955.3 | 928 |
| Finite | Overlap8 | 7722.1 | 7768 |
| Infinite | Inline | 730.2 | 528 |
| Infinite | Deferred | 737.6 | 528 |
| Infinite | Overlap8 | 6083.8 | 4568 |
| ExplicitNone | Inline | 747.2 | 528 |
| ExplicitNone | Deferred | 726.1 | 528 |
| ExplicitNone | Overlap8 | 6067.1 | 4568 |

**Finite/Inline CV30.84% is retained**, along with the other target/control
variation. No stable latency effect, cause of variation, uniform throughput
gain or extra sweep to erase the unfavorable first case.

Reported finite-minus-infinity allocations are **392B/Inline,400B/Deferred,
3200B/eight-call batch**. The first-row difference is not forced to400 or
given an unverified cause. All include actual runtime cancellation registration
and constructor/converter work, not isolated CTS layout. Infinity already
bypasses CTS and has no deadline; original finite still has distinct
pre-return cancellation, zero, token and validation contracts despite its
pending-deadline defect. These original policy differences are **not compatible
source-change savings**. Infinity and explicit None have equal reported
allocation in all three workloads.

Overlap8 is reported per eight-constructor batch, including task/call arrays
and actual public replies, not normalized per call. One original-only
in-process sweep: nine outcomes,72 retained results,27 actual console warmups,
nine exact owner/harness/PID/constructor/reference/material-control setup
receipts. Every mean,median,CV/allocation/raw sample remains in `comparison.md`
and full results. Raw GC totals/rounding and sample mean/variance/SD/SE,
min/max/median/CI arithmetic are audited; independent distribution quantiles
were not calculated.

All three frozen modes also retain three5000-call warmed and three20-fresh-
runtime calipers, counting each actual successfully constructed reference.
Warmed finite/control differences are approximately400B, not forced to an
identical value; fresh costs are approximately223KB/runtime here, with
additional phase/policy variation. They include actual serializer/runtime/
metadata initialization, not isolated cold CTS cost or cold throughput.
Exact rows remain in `resource-deltas.json`.

## Original lifetime failure and requirement evidence

| Requirement | Actual named producer / material outcome |
|---|---|
| Constructor result is real | `ActualConstructor_ConvertedReferenceDispatchesMaterialTarget`: actual IJSObjectReference consumer/type, owning converter-created reference, public fixture reply and actual target47/typed731 follow-up. `NearestTypedFunctionControl_ResultValuePreserved` separately returns731 with Default result; not the constructor benchmark's adapter. |
| Every original pending deadline row reaches the failure | Each of three `OriginalFiniteConstructorDeadline_FailsWhilePending` rows per frozen mode: real100ms CTS and a real600ms sentinel/5s watchdog, cancelable token remains unrequested and constructor task remains pending; only the subsequent actual reference reply completes it. `NearestAwaitedInvokeDeadline_CancelsPending` independently passes3/3, with exact requested token match and late-reply cancellation preservation. |
| Defaults and zero use real producers | `ConstructorOverride_DoesNotInheritDefault_Infinite` and `_ExplicitNone`: default100ms configured before dispatch, actual ordinary constructor cancels while each override stays pending with exactly None, then completes from reference reply. `ZeroConstructorTimeout_IsRequestedAtConsumerEntry`: token requested at public entry and zero dispatch. |
| Timers/serialization reveal the exact seam | `OriginalConstructorTimerLifetime_{Finite,Infinite,ExplicitNone}`: all have +0 timers while actually pending; finite still exposes cancelable token, controls use None, counts restored after completion. `ConstructorDeadline_CancelsDuringActualSerialization`: real getter gate holds source before return past its real deadline, public task cancels with matching token; actual dispatch count1, not a fabricated nondispatch guarantee. |
| Existing error timing is preserved | `NullRuntime_OriginalSynchronousConstructorError`, `InvalidTimeout_OriginalSynchronousConstructorError`, `ActualConstructorSerializationGetterFailure`, `ActualSynchronousConstructorTransportFailure`: actual synchronous types/jsRuntime/delay parameters and timer cleanup. `ActualAsynchronousConstructorProtocolFailure`: actual returned-task JSException. Simply adding async would change some of these existing timings. |
| Overlap and disposal are explicit | `OriginalOverlappingConstructors_DeadlinesGoneBeforeCompletion`: eight real requests/eight distinct tokens,one early reference success,seven still pending and zero deadline cancellations after sentinel,then all actual replies complete. `RuntimeDispose_PreservesOriginalPendingConstructor` keeps pending work through real reply. `ActualConstructedReferenceDispose_RejectsFurtherPublicCalls`: actual public disposal ID47/null protocol and synchronous ObjectDisposedException/no further dispatch. Not native JS release or every dispose race. |
| Borrowed tokens disprove generic reuse | `OriginalCompletedConstructorToken_RemainsUncanceledAtLaterDeadline`: original earlier successful token stays uncanceled,distinct later finite task/token remain pending/unrequested at deadline. Separate `GenericTryResetReuse_ChangesPreviouslyCompletedConstructorConsumerToken` performs real public reset/rearm/actual explicit-token constructor; earlier reused token becomes requested and later real task cancels. |
| Owning tests and identities are exact | All16 selected existing extension/runtime/object-reference Fact methods pass, positive durations/zero skips/exact result-definition-execution IDs. Existing compiled unchanged baseline tests run with --no-build; three actual test-source/PDB documents and local owner match frozen exercised owner.16 executable owner/producer/harness source/PDB docs include converter/worker/reference; pure void marker source is not an executable PDB claim. |
| No speculative performance source or PR | Maximum3 source comparisons,0 started/completed, one original-only9-case sweep,budget closed by compatibility rejection. All raw outcomes,original failures,variance,calipers,commands and copied audits are retained with actual fork branch/immutable receipt/index verification. |

Each frozen mode reaches **all24 observations**, three original deadline
failures,three awaited deadline controls and all six resource rows.
Characterization exits0; requiring original deadlines exits1 as expected;
requiring public generic-reuse equivalence exits1 as expected. These are
actual original/counterexample results, **not a shipping candidate's
red/green fix or a speedup**. A failing original deadline does not justify
removing zero/pre-return cancellation, validation or externally observable
tokens. Public TryReset documentation specifically warns about indirect
token holders observing the reset source's current state.

## Provenance, existing work and limits

All17 scoped current-default/baseline/working source/project/test/interface/
converter/worker/resolver blobs and canonical remote bytes match captured
default `d7870e7ec8da214eb96f96f5512aad0d89bfef11`, preserving a legitimate
UTF8 BOM and normalizing only CRLF for Git identity. Not a whole-default build.

Actual renamed-path history preserves2025 introduction
`8ddf53d847a8ce1cb0e0787f465ad1aa3ce3ecf1`
(dotnet/aspnetcore#61246) and constructor rename/property extension addition
`01c00d2beab16e3455de430043a616e5e28682d3`
(dotnet/aspnetcore#62588). The approved original user-facing proposal
dotnet/aspnetcore#62454 calls for equivalent timeout overloads and distinguishes
runtime-root vs object-root scope. No new API approval is claimed.

The bounded actual constructor/timeout existing-work query returned four
matches. Active AbortLink dotnet/aspnetcore#70045 was captured at actual head
`e1ed8f36869a9485ebc061d6762f9a47991ed43f`; its ten changed paths do not include
this timed constructor owner. Its body explicitly uses ordinary default-timeout
setup constructors, not this finite extension. This is scoped overlap
evidence, not proof that no related fix exists anywhere.

| Actual identity | SHA256 |
|---|---|
| Owning original source | `4AEBA66AAF88F28EE8A8E578FA2960A4EAA9E18BB4FDC82C72CCD368AFBC920B` |
| Loaded original owner | `9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5` |
| Identical actual constructor harness | `2E0BE0474A9D18B3445125C3527A18E008E66DF3FB75DC8BEA65367CF447E329` |

Standalone project pins BenchmarkDotNet0.13.0,C#13,net12.0/runtime
12.0.0-alpha.1.26562.105 and actual in-tree owner ProjectReference via
`AspNetCoreRoot`. Activated SDK12.0.100-alpha.1.26557.102,Release/x64/concurrent-
server-GC,in-process,3warmups/8results/requested100ms/DontRemove. Actual Unknown
processor/null core counts remain, separate earlier same-box read-only
inventory preserved without relabeling. Shared Windows machine; CPU-heavy
work serialized/max2 build nodes,power/priority/affinity/unrelated processes
untouched.

## Reproduce the recorded evidence

```powershell
node .\reproduce-analysis.mjs '<absolute-capsule-directory>' --verify
.\audit-owning-tests.ps1 -RunRoot '<absolute-capsule-directory>' -Verify
```

Both non-mutating commands passed on exact copied inputs; exact commands/
outcomes are in `validation-commands.md`. Source was formatted/verified before
first build,0 warnings/errors; no unfrozen diagnostic or benchmark substituted.
Original62-file/20-runtime-asset closure rehash passed before/after actual
sweep and before packaging.

DLL/PDB/output directories are omitted. Portable audits check actual recorded
proofs/closure and source bytes, **not omitted binary bytes**. Live closure
rehash requires original local binaries; a fresh rebuild does not promise
historical byte identity or authorize substituting identities into results.
Historical session-root orchestration scripts are records,not portable
entry points.

Generic managed Microsoft.JSInterop-only boundary per
`docs/BlazorComponentsGuidance.md`: actual public constructor/consumer,
runtime/converter/worker/CTS and public managed replies. No actual JS/browser/
UI/circuit/network/server/WebAssembly/NativeAOT/native object identity/release
or production frequency/throughput validation. No sibling correctness repair,
private pool redesign,new permanent product tests,shipping APIs or RTM claim.
