# F102 - public property-write timeout: generic strategy rejected

**No shipping optimization or performance PR.** Removing the finite
CancellationTokenSource or unconditionally resetting/reusing it is not
equivalent for this public setter. Real consumer tokens, zero cancellation,
value serialization before return, errors and ownership remain observable.
The original extension also loses its timer while a setter is pending:
three actual finite deadline assertions fail in each frozen probe mode,
while three nearest awaited void-function controls cancel correctly.
That original correctness failure is preserved and **not repaired or credited
as a speedup**.

The independent fork branch is
`autoperf/F102-js-runtime-property-write-timeouts`, unchanged at
`37e809ead5824bc753a1c3d56f11615bdb1296c5`; its actual remote ref was verified.
One original nine-case sweep completed. Zero source comparisons were started;
the three-comparison budget is closed by this bounded generic rejection.
This does not disprove every possible private owner-specific redesign.

## Actual measured owner and boundary

The measured method returns **void**, consumes the real JSRuntime setter's
non-generic ValueTask, serializes input123 as `[123]`, emits
SetValue4/JSVoidResult3/target0/`actual.Property`, and consumes a public
`null` acknowledgment through DotNetDispatcher, the actual pending call and
serializer. It is not a function/constructor/GetValue adapter, integer731
return surrogate or object-reference setter.

Every setup executes two measured-shape invocations:2 scalar writes for
single-call cases,16 for Overlap8. It checks emitted123 checksums and consumed
acknowledgments, then separately serializes `[123,731]` as `[[123,731]]` and
consumes that control's null acknowledgment. Actual setup totals are3/17
requests. Nine exact console/state receipts match owner/harness/PID and both
enum-name and numeric protocol representations. The host fixture supplies
managed replies; **native JavaScript property mutation is not verified**.

Release/net12.0, C#13, BenchmarkDotNet0.13.0, in-process, concurrent-server GC;
requested100ms,3 warmups,8 retained results,`DontRemove`. Actual SDK
12.0.100-alpha.1.26557.102; runtime pack12.0.0-alpha.1.26562.105.
Raw BDN host says `Unknown processor`,null processor/core counts; retained
unchanged. Earlier read-only same-box inventory is separately labeled,
not substituted for these measured host fields.

## Original measurements - distinct policies, not optimization savings

| Policy | Workload | Mean ns | Median ns | CV % | Managed B/op |
|---|---|---:|---:|---:|---:|
| Finite | Inline | 1533.102 | 1464.793 | 45.94 | 856 |
| Finite | Deferred | 913.988 | 912.609 | 0.44 | 992 |
| Finite | Overlap8 | 7484.620 | 7493.081 | 1.61 | 8280 |
| Infinite | Inline | 579.842 | 578.664 | 0.77 | 456 |
| Infinite | Deferred | 707.585 | 705.753 | 0.71 | 592 |
| Infinite | Overlap8 | 5692.581 | 5694.999 | 0.58 | 5080 |
| ExplicitNone | Inline | 581.318 | 575.416 | 3.03 | 456 |
| ExplicitNone | Deferred | 704.488 | 703.740 | 0.71 | 592 |
| ExplicitNone | Overlap8 | 5645.955 | 5647.856 | 0.78 | 5080 |

All72 retained results,27 warmups,GC counts/bytes/operations and9 raw outcomes
remain available. Finite-minus-infinity is400B/single write and3200B/eight-write
batch; infinity/None allocation is equal in all3 shapes. These are different
timeout contracts, **not an equivalent-contract source-change gain**.
Overlap8 includes arrays/tasks/replies and is not normalized per write.
The first finite Inline CV is45.94260900721836%; all variation is retained
without a causal explanation, stable-latency claim or replacement sweep.
The harness, serialization, async wrapper and managed reply costs are included.

## Real producer and contract evidence

All three modes use the same frozen executable and reach25 observations,
3 warmed and3 fresh resource rows:characterization actual/expected0,
require-original-deadlines actual/expected1, and require-public-reuse-equivalence
actual/expected1. These are not compiled replacement/red-green fix results.

The actual scalar and array setter, nearest awaited void producer, three
100ms finite pending deadlines versus three awaited controls, configured
default cancellation, infinity/None overrides and requested zero-token
dispatch suppression all run. Eight overlapping setters retain eight distinct
tokens:one early null acknowledgment succeeds,seven remain pending past the
deadline with zero cancellations,then all actual late acknowledgments complete.
Runtime disposal preserves the original pending setter; earlier successful
tokens remain uncanceled while a later original finite setter remains pending.

Null runtime/invalid timeout are synchronous extension errors.
**JSRuntime's async setter captures real value-getter serialization and
synchronous transport exceptions in the returned task**, unlike F101's reader.
Actual protocol failure and incompatible integer731 reply to the void marker
also reach JSException; the latter has the actual JsonException inner producer.
Every expected error restores the process-local timer count.

An actual serializer property getter is held by an explicit bounded gate.
The real CTS cancels while the getter holds the extension before return and
before dispatch; after release,actual serialized `[{"value":123}]` dispatches
once and the public task cancels with the exact token. A late null acknowledgment
preserves cancellation. No arbitrary sleep or injected cancellation event
creates this precondition; this is a managed serializer boundary,not browser
scheduling. Separately,actual public TryReset/CancelAfter changes a previously
completed retaining consumer's token and cancels a real later explicit-token
setter. It is an external public counterexample,not a compiled shipping candidate.

## All resource phases retained

Each warmed row executes5000 successful setter acknowledgments and records
5000 actual scalar dispatches/checksum615000. Each fresh row uses20 newly
created runtimes,20 acknowledgments/actual dispatches/checksum2460.
Each policy is prewarmed by200 real operations outside its caliper.

| Frozen mode | Kind | Finite B/write | Infinite B/write | ExplicitNone B/write |
|---|---|---:|---:|---:|
| Characterization | Warm5000 | 832 | 431.3728 | 431.3728 |
| Original-deadline red | Warm5000 | 832 | 431.3728 | 431.3728 |
| Public-reuse red | Warm5000 | 832 | 431.3728 | 431.3728 |
| Characterization | Fresh20 | 195477.6 | 195081.2 | 192060.8 |
| Original-deadline red | Fresh20 | 196870.8 | 196510.4 | 193426.8 |
| Public-reuse red | Fresh20 | 196869.6 | 196339.2 | 193452.8 |

Fresh includes runtime/serializer metadata/current-thread allocations after
process/type warmup,not isolated cold CTS or native state. Approximately192-197KB
here is neither F101's approximately7KB reader boundary nor a forced constructor
cost. All phase/policy variation remains in `resource-deltas.json`.

## Source, controls, commands and portable audit

Nineteen current-defaultd7870e7/baseline/working source/Git/canonical-byte
identities were freshly verified,including UTF8 BOM preservation. Five harness
and11 recorded owner PDB documents match actual source hashes; three actual
executed test-source/PDB/local-owner associations also match. **PDB document
association is source/binary identity evidence,not method coverage.**
The62-file/20-declared-asset frozen closure was checked before/after execution.
Owning DLL SHA256:
`9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5`.
Harness:
`E3260EA6F43A7DADDD0EB76CFDDC0CDACABA2743895F825129333CFD80BBF376`.

First C# build:0 warnings/errors; format/apply and verify passed before build.
Sixteen exact existing baseline extension/runtime/object-reference controls
ran with --no-build,positive durations/exact result-definition-execution IDs,
zero skips. They are not existing dedicated timed-setter coverage.
`validation-commands.md` preserves exact recorded commands and actual exits.
Every fresh dotnet shell starts at `C:\src\aspnetcore` and activates
`. .\activate.ps1`; no global SDK/dependency/visibility/default setting changed.

```powershell
node .\reproduce-analysis.mjs <absolute-capsule> --verify
.\audit-owning-tests.ps1 -RunRoot <absolute-capsule> -Verify
```

The portable auditor rechecks all source hashes/Git identities,PDB records,
test records,25 observations in each mode,resources,72 console/JSON samples,
27 warmups,9 setup receipts,GC/rounding and sample mean/variance/SD/SE/median/
CI arithmetic. It does not independently compute confidence-distribution
quantiles or rehash omitted DLL/PDB bytes. The full pinned project and PDB
tool source are included for a new local run against the recorded checkout.

Historical underlying API:April2025,dotnet/aspnetcore#61246; timed setter:
July2025,dotnet/aspnetcore#62588 (`01c00d2beab16e3455de430043a616e5e28682d3`),
then relocation. Original proposal dotnet/aspnetcore#62454 is api-approved;
no new approval claim. Actual bounded `SetValueAsync timeout` query returned
five complete matches. Separately captured dotnet/aspnetcore#70045 head
e1ed8f3/ten paths does not touch this timed owner or mention SetValueAsync;
not exhaustive related-work absence proof.

No sibling/reference-setter repair,public API/default/dependency/visibility
change,private cross-assembly access,new permanent product tests,browser/UI/
circuit/server/network/native mutation,WASM/AOT or frequency/throughput claim.
Shared Windows CPU-heavy work remained serialized/max2 build nodes with no
power/priority/affinity/unrelated process changes.
