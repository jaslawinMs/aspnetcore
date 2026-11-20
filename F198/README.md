# F198: graceful transport-drain comparison inconclusive

**Disposition: administrative no-gain, subtype `inconclusive-control-drift`.**
This is not measured zero benefit or a verified performance regression. The
Original comparison completed, but its frozen baseline controls failed. Its
budget is **permanently closed at 1 of 3 authorizations**: no retry, excluded
parameter, threshold retuning, Default comparison, implementation PR or new
browser window.

The candidate changes only `Task.WhenAll(closeTasks.ToArray())` to
`Task.WhenAll(closeTasks)` in `CloseAllConnectionsAsync`. The independent F199
abort path is unchanged. This is a listener shutdown/reconfiguration path after
unbind, **not per-request throughput**. The fixture starts real Kestrel
connection application delegates, requests actual graceful close, then releases
its gate and awaits the real execution/completion path. It does not inject
private execution tasks or callbacks.

## Frozen protocol and actual result

[The frozen plan](plan.json) predates the candidate and counters. Original source
is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the historical observed Default
source is `d3483989953ae3cccd773aea5ea04cb0c7198531`.

The sole authorized comparison ran on the same host and exact Original
`12.0.0-alpha.1.26562.105` runtime for both variants. Each of seven blocks used
fresh BaselineBefore, Candidate and BaselineAfter processes. All four connection
counts, **0, 1, 16 and 256**, ran in every process: **21 hosts, 84 rows and 42,084
raw workload-result measurements**, with 501 unique one-operation results per
row. BenchmarkDotNet 0.13.0 used 31 warmups, 501 iterations, InvocationCount=1,
UnrollFactor=1, DontRemove outliers, MemoryDiagnoser, server GC, process-only
disabled tiering, no forced GC and no power-plan enforcement.

Block baselines and aggregate ratios use geometric means. The preselected
primary count 16 needed at least 5% elapsed or allocation reduction and at least
six directional blocks for that metric. Every parameter additionally needed
elapsed/allocation nonregression and every baseline control needed at most 10%
elapsed drift. Count 16 is representative, not a measured production workload
distribution.

| Observation | Actual retained result |
|---|---|
| Failed controls | Count 0 in blocks 1, 3, 4, 6 and 7: 13.2794%, 18.1719%, 17.2312%, 29.9568%, 13.4582% drift |
| Primary count 16 elapsed reduction | -0.0606031%; 4 of 7 directional blocks |
| Primary count 16 allocation reduction | 2.4111675%; 7 of 7 directional blocks; below 5% threshold |
| Final decision | `inconclusive-control-drift`; aggregate nonregression also false in the raw observations |

These observations **do not establish a benefit or regression** under failed
controls. All samples and failed controls remain in the
[complete Original output](raw/Original/outcome.json). The
[unchanged actual budget](diagnostic-budget.json) records the real terminal
status and one consumed authorization. The publication-only helper recognizes
this as a completed comparison with inconclusive controls, not a pre-engine
failure; it does not normalize or rewrite the executed budget.

## Correctness, identity and preserved failure

[Accepted compatibility](compatibility-173.json) binds all-file image inventories,
the exact fixture, loaded owner/fixture/CoreLib SHA256 and MVID, and actual
producer/configuration checks. Baseline and candidate each passed four real
producer cases, complete custom-toolchain configuration/support checks and
three negative controls without engine/counter execution. The two causal
images differ only in Kestrel Core DLL/PDB. The selected owner binaries, common
fixture and adapter are supplied under `selected-pe`; full images are not.

Both variants subsequently passed the owning
`Http1Connection_ServerShutdown_Graceful` and
`Http1Connection_ServerShutdown_Abort` rows with clean native exits when run
sequentially. The earlier overlapping candidate native run failed in
`LoggedTest.Initialize` before the useful logger/material assertion. Its raw
TRX and streams are preserved beside the later successful native records.
Shared file logging is a plausible explanation, **not a verified race**: the
original swallowed initialization exception was not recovered. No shipping or
test source was changed to obtain these native passes. Native test-case CLR or
MVID was not directly sampled; common producer and actual measurement processes
do directly bind the loaded runtime and relevant assemblies.

Historical Default native and untimed producer evidence is retained separately;
its executed runtime is `12.0.0-alpha.1.26569.107`. No Default candidate or timing
is authorized. The earlier source-equivalence receipt explicitly predates
those Default executions and is preserved without rewriting its historical
`actualDefaultAssemblyExecuted=false` field.

The global benchmark gateway and the stricter all-owned-native hold admitted
only this comparison. Both preparation owners acknowledged holds and were
released after the completed comparison and recognized-process/lease check.
Machines are shared; no dedicated isolation or 24/7 availability is asserted,
and no host priority, affinity or power settings were changed.

## Evidence boundary and audit

Run `node verify.mjs . --require-seal` from this folder to check supplied bytes,
native rows, actual loaded identities, all raw measurements and independently
recomputed controls/ratios against the sealed outcome. It does not build, start
an engine or run a benchmark. Exact historical commands are retained with the
raw lifecycle/stream records.

[The selection manifest](evidence-selection.json) maps supplied files to their
original paths and hashes. The publication seal also covers the audit and this
readme. Sources, four selected PE files, complete Original comparison outputs
and selected correctness/provenance are supplied, **not** a complete source,
native/perf image, SDK/runtime or compiler closure. Inventories/hashes alone do
not supply omitted binaries or make the study independently executable.

Only fork tracking/evidence/index publication is authorized. The fixed
118-finalized historical `REPORT.md` snapshot and its existing browser window
remain untouched.
