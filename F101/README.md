# F101 - timed public property read: generic CTS removal/reuse rejected

**No shipping change or performance PR.** Generic CTS deletion or unconditional
reset/reuse changes actual public property tokens,zero-timeout,validation and
pre-return cancellation contracts. The original timed Get also loses its
deadline while the actual property result remains pending. That original
failure is reproduced and documented,**not repaired or counted as a speedup**.

Independent fork branch `autoperf/F101-js-runtime-property-read-timeouts` stays
at unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`,verified from
the actual remote ref. No optimization commit,new API/default/dependency/
visibility change,sibling F102 repair or speculative draft.

## The benchmark returns a real property value

The new benchmark really returns **int731**,obtained through the actual timed
public runtime `GetValueAsync<int>` -> JSRuntime -> PendingAsyncCall<int> ->
public reply decoder. GetValue opcode3,Default result0,root target0,real
identifier and `[]` are checked;this is not F098's function opcode or F100's
constructor/reference-returning adapter.

Each setup consumes two real invocations,2/16 typed property values. Two
additional diagnostic controls read an actual reference-valued property,
decode `{"__jsObjectId":47}` with the owning converter/worker,then perform a
public property read on the actual returned reference,target47,value731.
Those reference controls are outside timed measurement. Fixed fixture ID47
does not prove native JavaScript identity generation,property access or release.

**GetValue has no input arguments or value serialization.** No constructor
argument getter or setter-value serializer is substituted into its producer.
The pre-return control instead holds a test host's synchronous BeginInvokeJS
entry while the real CTS/runtime cancellation fires. This is a managed
transport-gate contract observation,not evidence of a production browser
host stall.

## All nine original measurements

| Original policy | Property workload | Mean ns | Median ns | CV % | B/op |
|---|---|---:|---:|---:|---:|
| Finite | Inline | 1340.2 | 977.9 | 59.03 | 784 |
| Finite | Deferred | 651.1 | 650.2 | 0.88 | 792 |
| Finite | Overlap8 | 5184.4 | 5169.8 | 0.60 | 6680 |
| Infinite | Inline | 439.1 | 432.5 | 4.57 | 392 |
| Infinite | Deferred | 445.3 | 443.1 | 1.86 | 392 |
| Infinite | Overlap8 | 3676.1 | 3677.6 | 0.61 | 3480 |
| ExplicitNone | Inline | 455.4 | 464.5 | 4.36 | 392 |
| ExplicitNone | Deferred | 440.4 | 439.5 | 0.85 | 392 |
| ExplicitNone | Overlap8 | 3663.2 | 3654.2 | 0.76 | 3480 |

**First finite Inline CV59.03% is retained**,with its large mean/median
difference and all other target/control variation. No cause of variation,
reliable uniform latency/throughput gain or extra sweep to remove unfavorable
samples is claimed.

Finite-minus-infinity allocations are **392B/Inline,400B/Deferred,
3200B/eight-read batch**. Do not force singles to a uniform400B or attribute
the difference to an unmeasured mechanism. Runtime cancellation registration
and property/protocol work are included;these are not isolated CTS layout.
Infinity/None have equal reported allocation in all three workloads.
Different original policies,zero/pre-return/token contracts and a pre-existing
pending-deadline defect are **not equivalent-contract source-change savings**.

One original in-process sweep,nine outcomes,72 retained results,27 actual
console warmups,nine exact owner/harness/PID/GetValue/typed-value/reference-
scope setup receipts. All raw GC totals/rounding and sample mean/variance/
SD/SE/min/max/median/CI arithmetic are audited. No independent confidence-
distribution quantiles were calculated. Overlap8 includes eight real
requests/tasks,arrays and public replies;reported per batch,not per call.

Every frozen mode retains three5000-read warm and three20-fresh-runtime rows,
all actual returned-value counts and731 checksums. First characterization
warm rows are768B/read finite vs367.3728B/read infinity/None. Fresh rows are
approximately6.9-7.2KB/runtime in that phase,**not the constructor sibling's
approximately223KB**. All phase/policy variation remains in
`resource-deltas.json`;these include actual runtime/serializer metadata and
current-thread allocations,not isolated cold CTS or cold throughput.

## Faithful requirements and observed outcomes

| Requirement | Named producer and actual material outcome |
|---|---|
| Actual typed property result | `ActualPropertyRead_ConsumesTypedPublicReply`: pending actual int consumer,GetValue/root0/`[]`,public731 reply and returned731. `ActualReferenceProperty_ConvertedReferenceReadsMaterialTarget`: actual reference-valued Get/converter/worker,public object-root Get target47/731. Separate nearest no-args FunctionCall control returns731;not substituted for the timed Get opcode. |
| Every disputed original deadline reaches the failure | Three `OriginalFinitePropertyDeadline_FailsWhilePending` rows per frozen mode: real100ms CTS and600ms sentinel/5s watchdog,cancelable token unrequested/task pending beyond deadline,only subsequent actual value reply completes. Three `NearestAwaitedInvokeDeadline_CancelsPending` rows cancel with exact requested token match and late-reply cancellation preserved. |
| Defaults,zero and timers | Two `PropertyOverride_DoesNotInheritDefault_{Infinite,ExplicitNone}` rows configure default100ms before dispatch: ordinary actual Get cancels,override stays pending with exact None,then returns731. `ZeroPropertyTimeout_IsRequestedAtConsumerEntry`: already requested public token,zero dispatch. All three `OriginalPropertyTimerLifetime_*` rows: +0 active timers while pending,finite token still cancelable,controls None,counts restored. |
| Error timing and real result decoding | `NullRuntime_OriginalSynchronousPropertyError`, `InvalidTimeout_OriginalSynchronousPropertyError`, `ActualSynchronousPropertyTransportFailure`: exact original synchronous types/jsRuntime/delay/timer cleanup. `ActualAsynchronousPropertyProtocolFailure` and `ActualPropertyResultDeserializationFailure`: actual pending public reply -> faulted task JSException,including actual JsonException inner for an incompatible JSON string/int result. No input serializer getter scenario exists here. |
| Pre-return source ownership is real and bounded | `PropertyDeadline_CancelsDuringManagedPreReturnTransportGate`: actual BeginInvokeJS entry,test host gate holds before source return,real token/task cancellation with exact token match,actual dispatch1 and later reply cleanup. Not a browser stall,argument serializer or nondispatch guarantee. |
| Overlap and disposal retain originals | `OriginalOverlappingProperties_DeadlinesGoneBeforeCompletion`: eight real pending reads/distinct tokens,one early731,seven still pending/zero deadline cancels,all later public replies consumed. `RuntimeDispose_PreservesOriginalPendingProperty`: actual pending Get survives Dispose until actual reply. `ActualPropertyReferenceDispose_RejectsFurtherPublicPropertyReads`: actual ID47/null disposal protocol,then synchronous ObjectDisposedException/no property dispatch. Not native release or every disposal race. |
| Generic reset cannot preserve borrowed tokens | `OriginalCompletedPropertyToken_RemainsUncanceledAtLaterDeadline`: earlier successful token unrequested,distinct later task/token remain pending/unrequested at original deadline. Separate `GenericTryResetReuse_ChangesPreviouslyCompletedPropertyConsumerToken`: actual public reset/rearm,real explicit-token Get and cancellation change the earlier retained reused token while original token stays unrequested. |
| Tests and executable/source identities | All16 exact existing baseline extension/runtime/object-reference controls pass,positive durations/zero skips/exact definition/result/execution IDs. Existing compiled baseline reused with --no-build,three actual test-source/PDB proofs/local owner=frozen owner. These existing tests are not dedicated timed-property coverage;25 new owning observations establish that boundary.16 executable owner/producer/harness PDB docs,pure void/enum/flags source separate. |
| No speculative source comparison or PR | Maximum3 source comparisons,0 started/completed,one original9-case sweep,budget closed by generic compatibility rejection. Source remains unchanged,all raw/control/resource/variance/outcomes retained,actual fork branch/immutable blobs and final receipt/index verified. |

All three modes reach **25 observations**,three original deadline failures,
three awaited deadline controls and six actual resource rows.
Characterization exits0;require-original-deadlines exits1 as expected;
require-public-reuse-equivalence exits1 as expected. The original deadline
assertion is still **false**,not a green shipping fix or a speedup. Public
TryReset documentation warns about indirect token holders observing the
source's current state. No universal owner-specific redesign disproof.

## Provenance and preparation failure retained

All19 scoped source/interface/runtime/converter/worker/resolver/project/test/
enum/linker-flag Git identities and current-default/baseline/working canonical
bytes match captured default
`d7870e7ec8da214eb96f96f5512aad0d89bfef11`;UTF8 BOM retained,only CRLF
normalized for Git identity. Not a whole-default build.

Actual followed relocated paths establish April2025 underlying property API
introduction `8ddf53d847a8ce1cb0e0787f465ad1aa3ce3ecf1`
(dotnet/aspnetcore#61246),July2025 timed Get overload
`01c00d2beab16e3455de430043a616e5e28682d3`
(dotnet/aspnetcore#62588),and later directory relocation. Original
dotnet/aspnetcore#62454 is closed/api-approved and describes equivalent
timeouts,typed values and runtime-root vs object-root scope;no new approval
or RTM claim.

Actual bounded GetValueAsync/timeout query returned **seven complete matches**,
not proof of exhaustive absence. Separately captured AbortLink
dotnet/aspnetcore#70045 at head
`e1ed8f36869a9485ebc061d6762f9a47991ed43f`:ten changed paths do not touch this
timed owner;body uses ordinary default-timeout constructor/property setup.

**One preparation script parser error occurred before any execution.** A
newline separated PowerShell redirection from its target. Exact original
script/hash/error/exit1 and unchanged pre-failure branch/no run are retained
in `preparation-parser-failure.json` and
`F101-prepare-original-parser-error.ps1`. Corrected before C# build;not a
discarded benchmark or source comparison. New C# was formatted/verified
before its first build,0 warnings/errors,no unfrozen diagnostic execution.

| Actual identity | SHA256 |
|---|---|
| Owning original source | `4AEBA66AAF88F28EE8A8E578FA2960A4EAA9E18BB4FDC82C72CCD368AFBC920B` |
| Loaded original owner | `9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5` |
| Actual property harness | `3BC51F877D8ED9F632BD63CAD6387B77AD08611EFA48667CE86D2E317F617B44` |

Activated SDK12.0.100-alpha.1.26557.102,runtime
12.0.0-alpha.1.26562.105,BenchmarkDotNet0.13.0,net12/C#13,Release/x64/
concurrent-server-GC,in-process,3warmups/8results/requested100ms/DontRemove.
Unknown processor/null core counts preserved;earlier public docs/read-only
same-box inventory kept with actual prior provenance,not relabeled as fresh.
Shared Windows CPU-heavy work serialized/max2 build nodes;power/priority/
affinity/unrelated processes unchanged.

## Portable analysis

```powershell
node .\reproduce-analysis.mjs '<absolute-capsule-directory>' --verify
.\audit-owning-tests.ps1 -RunRoot '<absolute-capsule-directory>' -Verify
```

Both passed against exact copied inputs;exact recorded commands/outcomes are
in `validation-commands.md`.62-file/20-runtime-asset live closure rehash passed
before/after sweep and before packaging. DLL/PDB/output directories omitted.
Portable audits verify recorded proofs/source/results,**not omitted binary
bytes**. Live closure rehash requires original local binaries;fresh rebuild
does not promise historical hashes. Historical session-root scripts and the
known failed script are evidence,not portable runnable entry points.

Managed generic Microsoft.JSInterop-only boundary per
`docs/BlazorComponentsGuidance.md`. No shipping change/permanent product tests,
sibling repair,private cross-assembly access,actual JS/UI/browser/circuit/
server/network/native identity/release/WASM/AOT/production frequency or
throughput validation.
