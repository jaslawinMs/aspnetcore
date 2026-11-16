# F098 - explicit runtime timeout allocation: generic removal/reuse rejected

**No optimization PR or shipping change.** Finite calls really allocate a timeout
source, but removing it drops a public cancellation contract. Unconditional
reset/reuse also changes a token retained by an earlier successful public
`IJSRuntime` consumer. That incompatibility was observed through the actual
public consumer/runtime path, not inferred from a scanner match.

The independent fork branch `autoperf/F098-js-runtime-explicit-timeouts` points
to the unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`. Its actual
remote ref is preserved in `source-branch-publication.json`; it is not an
optimization commit. No public API, dependency, visibility, default, or sibling
timeout implementation was changed.

## Actual original costs, not a speedup

One original-only BenchmarkDotNet sweep exercised three timeout policies and
three real public-reply workloads. All nine outcomes, 72 retained samples,
27 console-observed warmups, nine actual owner/harness/PID-linked setup receipts,
and raw allocation/GC totals are retained. Requested iterations were 100 ms,
with three warmups, eight results, and `DontRemove`; this is one in-process
sweep, not an independent-process replication or equivalent-contract A/B.

| Original policy | Reply workload | Mean ns | Allocated B/op |
|---|---|---:|---:|
| Finite | Inline | 805.3 | 864 |
| Finite | Deferred | 919.8 | 1016 |
| Finite | Overlap8 | 7409.2 | 8472 |
| Infinite | Inline | 608.8 | 464 |
| Infinite | Deferred | 730.2 | 616 |
| Infinite | Overlap8 | 5728.5 | 5272 |
| ExplicitNone | Inline | 586.5 | 464 |
| ExplicitNone | Deferred | 612.5 | 464 |
| ExplicitNone | Overlap8 | 4854.7 | 4056 |

Overlap8 is an eight-request batch, including actual pending tasks, arrays, and
public completions; it is not normalized per call. Finite-minus-infinity is
400 reported B/single or 3200 B/batch, including the real runtime's cancellation
registration, not just the CTS's object size. **Infinity has no deadline and
already creates no CTS; the difference is not an optimization gain.**

The timed infinity extension still awaits its underlying pending `ValueTask`,
whereas the explicit-token extension returns it directly. Accordingly, the
original Deferred/Overlap8 adapters differ by 152/1216 B even without a timer.
That adjacent behavior is disclosed, not silently modified or credited as a
fix for this finite-CTS finding. `comparison.md` retains every mean, median,
CV, and allocation; maximum CV is 5.13%, without causal attribution.

Separate actual public-owner calipers run 5000 warmed calls and 20 genuinely
fresh runtimes per policy, with checksums 3655000 and 14620. Fresh-runtime
allocation includes real runtime/serializer initialization (approximately
221 KB/runtime here); it does not isolate CTS layout or first-call throughput.
All three probe phases and their exact resource variation remain in
`resource-deltas.json`, rather than forcing the warmed delta to exactly 400 B.

## Preimplementation requirements and observed boundaries

| Requirement | Exact evidence and outcome |
|---|---|
| Actual explicit deadlines cancel | `FiniteTimeout_CancelsActualPendingInvoke`, each of three rows in each original probe, passes. A real 100 ms CTS passes its token to the retaining public consumer and actual `JSRuntime`; after a real 600 ms sentinel, the public task is canceled with that same requested token. Late public cleanup replies cannot reverse cancellation. A 5 s watchdog is not the cancellation producer. |
| Infinity/None override the configured default | `ExplicitOverride_DoesNotInheritDefault_Infinite` and `_ExplicitNone` pass. The actual runtime default is configured to 100 ms before dispatch; its ordinary call cancels while the concurrent override stays pending beyond the real sentinel, uses exactly None, and completes with 731. |
| Exact zero is already requested at entry | `ZeroTimeout_IsCanceledAtPublicConsumerEntry` passes: the public consumer observes a requested/cancelable token before forwarding; actual runtime dispatch count is zero and its public task is canceled. |
| Lifetime covers work, success and real error cleanup | `ActualTimerLifetime_Finite`, `_Infinite`, `_ExplicitNone` pass: finite adds exactly one active pending timer; the controls add none; public completion restores the before count. `ExplicitDeadline_CoversActualSerialization` gates the real JSON serializer getter, expires the actual deadline before release and observes public cancellation. It does **not** establish no dispatch after serialization: actual dispatch count is one. |
| Validation and failure timing stay explicit | `NullRuntime_OriginalReturnedTaskError`, `InvalidTimeout_OriginalReturnedTaskError`, `ActualSerializationGetterFailure`, `SynchronousPublicTransportFailure`, `ActualPublicProtocolFailure` pass. Exact types, `jsRuntime`/`delay` parameters, returned-task timing and timer restoration are retained; transport/protocol failures use the real runtime producer and public reply path. |
| Concurrent operations keep independent ownership | `OverlappingExplicitCalls_IndependentTokensAndDeadlines` passes: eight actual pending calls, eight distinct tokens, one public success and seven real cancellations with matching tokens. `RuntimeDispose_PreservesPendingExplicitCall` passes: disposal does not cancel the owned pending explicit operation; its real public reply still returns 731. This is not a proof of every disposer race. |
| Earlier successful public tokens remain uncanceled | `OriginalCompletedConsumerToken_RemainsUncanceledAfterLaterDeadline` passes under the actual timed extension. `GenericTryResetReuse_ChangesPreviouslyCompletedPublicConsumerToken` observes successful public `TryReset`, then real `CancelAfter` cancellation of the later actual runtime call; the earlier retained reused token is now canceled while the original distinct token remains uncanceled. |
| Existing owner contracts and loaded source are real | All eight exact existing `JSRuntimeExtensionsTest` rows pass, with positive durations, zero skips and result/definition/execution-ID matching. Local test-output owner equals the actually exercised frozen owner; its source/PDB proof is retained. Eleven owning/producer/harness source/PDB documents and the actual 62-file/20-runtime-asset closure are verified. |
| Honest measurement/disposition and publication | Maximum source-comparison budget three; zero started/completed source comparisons, one completed original sweep, budget closed by the generic compatibility gate. No fabricated compiled replacement, green-after-fix, finite-versus-infinity speedup, or performance PR. Exact-byte capsule, commands, raw evidence, standalone audits and publication receipt preserve the rejection. |

Every original probe reaches all 18 semantic observations plus three warmed
and three fresh resource rows. The same frozen executable exits 0 in original
compatibility mode and **expected exit 1** when required to treat the generic
reuse control as equivalent. These are preservation and a public-token
counterexample, **not a compiled shipping candidate's red/green verification**.

The authoritative `CancellationTokenSource.TryReset` remarks explicitly warn
that indirect references holding its token continue polling the same source's
current state. This does not universally disprove an owner-specific lifecycle
or API redesign. F097's private default-timeout slot cannot simply be assumed
compatible with arbitrary public `IJSRuntime` consumers here.

## Source, history and reproducibility

Nine scoped source/project/test blobs match the baseline, working source and
captured current default `d7870e7ec8da214eb96f96f5512aad0d89bfef11`. Actual remote
canonical bytes were checked, preserving a legitimate UTF8 BOM and normalizing
only CRLF for Git identity. This is not a whole-current-branch build claim.

The renamed-path owner history and actual 2019 API migration diff
`9372816b7c436e06da6d6426e0863b3677aac83c` are included, alongside the actual
2025 sibling API diff. The siblings are not repaired or benchmarked as a
substitute for this timed generic `InvokeAsync` finding.

| Actual identity | SHA256 |
|---|---|
| Original owning source | `4AEBA66AAF88F28EE8A8E578FA2960A4EAA9E18BB4FDC82C72CCD368AFBC920B` |
| Loaded original Microsoft.JSInterop | `9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5` |
| Loaded identical final harness | `A445497854CE66C9F32BABA241D4AD1C87D32629B8D26EEB3171C1568CE26B29` |

The external `harness/AutoPerf.Benchmarks.csproj` pins BenchmarkDotNet 0.13.0,
C# 13, net12.0, and runtime pack 12.0.0-alpha.1.26562.105, and references actual
in-tree `Microsoft.JSInterop` using `AspNetCoreRoot`. The SDK was
12.0.100-alpha.1.26557.102. Reports retain their actual Unknown processor/null
core counts; the preserved separate same-machine read-only inventory is not
substituted into BDN metadata. CPU-heavy work was serialized/max two build
nodes on this shared Windows machine; power, priority, affinity, and unrelated
processes were untouched.

`validation-commands.md` contains exact recorded commands and actual outcomes,
including preparation failures. The initial harness built with zero warnings
and errors but failed whitespace verification **before any probe/benchmark**;
its five actually compiled source/PDB identities and source archive remain.
Formatting changed only the five external harness files; the final rebuild
and whitespace check passed. A canonical-source checker initially stripped a
legitimate BOM; its actual failure and the corrected nine-file byte proof are
retained. The auditor's initial single-object execution-schema assertion
failure is also preserved, not counted as a failed or rerun benchmark.

Portable non-mutating audits:

```powershell
node .\reproduce-analysis.mjs '<absolute-capsule-directory>' --verify
.\audit-owning-tests.ps1 -RunRoot '<absolute-capsule-directory>' -Verify
```

Both passed against the exact copied capsule. The statistical audit checks
every actual sample/console receipt, GC totals, allocation rounding,
mean/variance/SD/SE/min/max/median and reported CI arithmetic. It does not
independently calculate distribution quantiles.

Raw DLL/PDB/output directories are deliberately omitted from publication.
Portable audits check recorded actual binary/PDB/closure proofs and source
bytes, **not omitted binary/PDB bytes**. The live closure verifier requires the
original local frozen binaries and passed before and after the actual sweep.
Rebuilding the portable project does not promise byte-identical historical
binaries, or justify substituting new identities into these recorded results.

This is the generic managed Microsoft.JSInterop-library boundary documented
in `docs/BlazorComponentsGuidance.md`: actual extension, retaining public
consumer, runtime serializer/cancellation producer and public managed protocol
replies. The replies are supplied by the harness, not executed JavaScript.
No browser/UI/circuit/network/server/WebAssembly/NativeAOT or production
frequency/throughput result is claimed. No permanent product tests or modified
shipping APIs were added for an intentionally throwaway rejected control.
