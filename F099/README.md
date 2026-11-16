# F099 - timed public void invocation: generic CTS removal/reuse rejected

**No shipping change or optimization PR.** The real finite `InvokeVoidAsync`
source preserves a public deadline and a separately owned token. Generic
removal loses cancellation; unconditional reset/reuse changes a token retained
by an earlier successful public `IJSRuntime` consumer. The actual void
producer/token counterexample is established, not inferred from generic F098.

The independent fork branch `autoperf/F099-js-runtime-explicit-void-timeouts`
remains at unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
`source-branch-publication.json` records its actual verified remote ref. There
is no optimization commit, public API/default/dependency/visibility change,
or sibling timeout repair.

## Actual original void costs, not a performance improvement

The benchmark method really returns **void**, invokes the actual public
nongeneric `ValueTask` extension, and completes the actual `IJSVoidResult`
pending call with a public **JSON null** reply. It is not an integer-returning
adapter or F098's measurements relabeled. Nine fresh original outcomes,
72 retained results, 27 console-observed warmups and nine exact
owner/harness/PID/protocol-linked setup receipts are retained.

| Original policy | Actual null reply workload | Mean ns | Allocated B/op |
|---|---|---:|---:|
| Finite | Inline | 2878.1 | 840 |
| Finite | Deferred | 1012.3 | 992 |
| Finite | Overlap8 | 8083.5 | 8280 |
| Infinite | Inline | 626.2 | 440 |
| Infinite | Deferred | 796.0 | 592 |
| Infinite | Overlap8 | 6188.6 | 5080 |
| ExplicitNone | Inline | 626.7 | 440 |
| ExplicitNone | Deferred | 761.8 | 584 |
| ExplicitNone | Overlap8 | 6089.7 | 5016 |

**First Finite/Inline is volatile: CV 40.22%.** Its mean and all eight samples
remain; no stable latency effect, causal explanation, or uniform speedup is
claimed. No extra sweep was run to erase that variability after the generic
compatibility gate rejected a source replacement.

Finite-minus-infinity is 400 reported B/single or 3200 B/eight-request batch,
including the actual runtime cancellation registration, **not just CTS size**.
Infinity already creates no CTS and has no deadline; this difference between
original contracts is **not an optimization gain**. Both original no-deadline
void extensions await their underlying operation; their pending adapter
allocation still differs by 8 B/single or 64 B/batch. That adjacent difference
is disclosed, not silently fixed or attributed to finite timer removal.

Overlap8 includes actual eight pending tasks, arrays and public null replies;
it is reported per batch, not normalized per call. `comparison.md` retains
every mean, median, CV and allocation. Raw console and full JSON validate all
samples, GC counts/total bytes, allocation rounding, mean/variance/SD/SE,
min/max/median and reported confidence-interval arithmetic. Distribution
quantiles were not independently calculated.

Separate calipers count **actual successful void completions**, not a
fictional returned731: 5000 warmed and20 fresh runtimes per policy in each
frozen probe. Warmed finite/control differences are approximately400 B but
not forced to exactly400; fresh-runtime allocations are approximately225-226
KB/runtime here and have additional phase/policy variation. They include
actual runtime/serializer/type-metadata startup, not isolated CTS layout or
cold throughput. All exact rows remain in `resource-deltas.json`.

## Requirement and faithful evidence

| Requirement | Exact actual evidence and outcome |
|---|---|
| The void producer/result boundary is real | `ActualVoidMarker_NullProtocolCompletesWithoutValue` passes: the actual timed extension delivers framework `IJSVoidResult` from the loaded owner to the public consumer, declares FunctionCall/JSVoidResult/target0/real args/positive handle, and its actual public null reply completes the void task. `NearestTypedInvokeControl_ResultValuePreserved` separately declares Default and really returns731; it is diagnostic, not the benchmark's return adapter. |
| Finite deadlines independently cancel | Each of three `FiniteTimeout_CancelsActualPendingVoid` rows passes in each frozen mode. Real100ms CTS, exact requested consumer token in the canceled public task, real600ms sentinel and5s watchdog; a later public null reply cannot undo cancellation. |
| Actual default overrides and zero remain correct | `ExplicitVoidOverride_DoesNotInheritDefault_Infinite` and `_ExplicitNone` pass after configuring the real100ms default before dispatch: ordinary default void cancels while override remains pending with exactly None, then succeeds from null. `ZeroTimeout_IsCanceledAtPublicVoidConsumerEntry` passes with requested/cancelable token at entry and zero actual runtime dispatches. |
| Await-owned source lives through work/cleanup | `ActualVoidTimerLifetime_Finite`, `_Infinite`, `_ExplicitNone` pass: +1 pending finite timer/+0 controls, before count restored after public completion. `ExplicitVoidDeadline_CoversActualSerialization` gates the real JSON getter, expires the actual deadline before release and observes public cancellation. Actual dispatch count is1, not a fabricated nondispatch guarantee. |
| Real errors retain contract and timer cleanup | `NullRuntime_OriginalReturnedVoidTaskError`, `InvalidTimeout_OriginalReturnedVoidTaskError`, `ActualVoidSerializationGetterFailure`, `SynchronousPublicVoidTransportFailure`, `ActualPublicVoidProtocolFailure` pass: exact types, jsRuntime/delay parameters, returned-task timing and timer restoration. Getter/transport/protocol cases exercise real producers, not injected cancellation callbacks. |
| Concurrent ownership and disposal are explicit | `OverlappingExplicitVoidCalls_IndependentTokensAndDeadlines` passes: eight actually pending calls/eight distinct tokens, one public success/seven real cancellations with exact token matches, late null replies preserve cancellation and successful token stays uncanceled. `RuntimeDispose_PreservesPendingExplicitVoidCall` passes through a subsequent real null reply; it is not every disposer race. |
| Earlier successful borrowed tokens do not change | `OriginalCompletedVoidConsumerToken_RemainsUncanceledAfterLaterDeadline` passes under actual timed void calls. Separate `GenericTryResetReuse_ChangesPreviouslyCompletedVoidConsumerToken` observes actual successful public reset, then real CancelAfter cancellation via actual public void/consumer/runtime; earlier reused token becomes canceled while original distinct token remains uncanceled. |
| Existing owner checks and source/binary association are exact | All eight existing `JSRuntimeExtensionsTest` rows pass with positive durations, zero skips and exact definition/result/execution-ID matching. `--no-build` reuses the compiled unchanged baseline test assembly; its actual source/PDB and local owning DLL equal the frozen exercised owner. Twelve executable owner/producer/harness source/PDB documents and62-file/20-runtime-asset closure are verified; pure marker source/Git/type binding is separate. |
| Measurement/disposition stay honest | Maximum3 source comparisons;0 started/completed, one original-only9-case sweep, budget closed by compatibility rejection. Actual void/no-value method and null replies, all raw outcomes/variation/commands/audits, exact-copy capsule and actual fork branch/publication receipt. No source candidate, fabricated green-after-fix or performance PR. |

Each frozen mode reaches **all20 semantic observations**, three warm rows and
three fresh-runtime rows. Original preservation exits0; requiring the public
generic-reuse control to be equivalent gives expected/actual exit1. This is a
real token-consumer/reset counterexample, **not a compiled replacement's
red/green fix or speedup**. Public `TryReset` documentation warns that indirect
token holders observe the same reset source's current state. This does not
disprove every owner-specific redesign or make F097's private default slot
compatible with arbitrary public consumers.

## Provenance and reproduction

Eleven scoped source/project/test/void-marker/resolver blobs and canonical
remote bytes match baseline, working source and captured current default
`d7870e7ec8da214eb96f96f5512aad0d89bfef11`, preserving a legitimate UTF8 BOM and
normalizing only CRLF for Git identity. Not a whole-current-branch build claim.

Actual renamed-path history preserves2019 timed-void API introduction
`9372816b7c436e06da6d6426e0863b3677aac83c` and2021 void return-shape change
`3fa23307b5bf5335004ffb91c76611e57f3b5cf0`. The latter replaces the old
object-valued call with `IJSVoidResult`; current framework resolver explicitly
owns JSON null. Testing historical generic731 as a void reply would therefore
be the wrong current boundary.

| Actual identity | SHA256 |
|---|---|
| Owning original source | `4AEBA66AAF88F28EE8A8E578FA2960A4EAA9E18BB4FDC82C72CCD368AFBC920B` |
| Loaded original owner | `9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5` |
| Identical actual void harness | `3807FCFEACA059D8C66D2F83F7BC46A24BA8327D932E1EB7F3DF4D8244C31B4D` |

The standalone project pins BenchmarkDotNet0.13.0, C#13, net12.0/runtime pack
12.0.0-alpha.1.26562.105 and references actual in-tree Microsoft.JSInterop via
`AspNetCoreRoot`. SDK12.0.100-alpha.1.26557.102, Release/x64/concurrent-server-GC,
in-process,3 warmups/8 results/requested100ms/DontRemove. Actual Unknown
processor/null core counts are retained; earlier separately captured same-box
read-only inventory is preserved without relabeling or replacing BDN metadata.

Every actual dotnet command activates the repository SDK from its root.
`validation-commands.md` records exact commands/outcomes. New external source
was formatted/verified **before first compile**; build passed with0 warnings
and errors. No unfrozen source/probe/measurement was substituted into frozen
results. CPU-heavy work serialized/max2 build nodes on the shared Windows
machine; power, priority, affinity and unrelated processes untouched.

```powershell
node .\reproduce-analysis.mjs '<absolute-capsule-directory>' --verify
.\audit-owning-tests.ps1 -RunRoot '<absolute-capsule-directory>' -Verify
```

Both non-mutating audits passed against the exact copied capsule. Raw DLL/PDB/
output directories are omitted; portable audits check recorded actual proofs/
closure and source bytes, **not omitted binary bytes**. Live62/20 closure was
rehash-verified before/after measurement; that command requires original local
binaries. Rebuilding a portable project does not promise historical byte
identity or authorize substituting new identities into these recorded results.

Generic managed Microsoft.JSInterop-only boundary from
`docs/BlazorComponentsGuidance.md`: real public void extension/consumer,
runtime serializer/cancellation producer and public managed null replies.
The harness supplies protocol replies; JavaScript/browser/circuit/network/
server/WebAssembly/NativeAOT and production frequency/throughput are not
validated. No new permanent product tests or shipping APIs were added for a
deliberately rejected throwaway compatibility control.
