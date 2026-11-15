# F051: guard streamed UIAgent update diagnostics

**Measured managed logging-work reduction, not a universal net-performance win.**
The final two comparisons have lower heap and lower time medians for all22
disabled/default-logger targets;20 improve in both pairs. Median target time
gains are0.96-9.78%. Two target timings and several enabled/control results
are mixed. The unchanged no-update control is slower in both final pairs.
All costs, raw observations and earlier source-shape results remain below.

Exactly three comparisons are consumed. Final claims use only **pairs2/3**,
the guarded caller plus the generated helper's skipped redundant check.
Do not pool pair1's guard-only shape into the final medians. No fourth run.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/52. Source [898e7919bebeb8c61dcdf09d6853722d39406f55](https://github.com/jaslawinMs/aspnetcore/commit/898e7919bebeb8c61dcdf09d6853722d39406f55), independent branch `autoperf/F051-uiagent-disabled-log-guard`.
Fresh upstream baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Real production seam and preserved behavior

The actual public `UIAgent.SendMessageAsync` consumes
`IChatClient.GetStreamingResponseAsync`, tracks response/history and runs the
unchanged `BlockMappingPipeline`. Originally it joins every update's
`Contents.Select(c => c.GetType().Name)` before generated Debug event101
`ReceivedUpdate` checks whether logging is enabled. Three actual-stream
tests prove1/4/16 content values were already read at that first real check.

The [exact three-file proposal](source.patch) places only the contentTypes
local and ReceivedUpdate call behind Debug IsEnabled. `updateIndex++`
remains outside the guard, so disabled updates still advance the stream index.
The sole generated helper skips its now-redundant enabled check. Its existing
Debug level, event101, template and structured fields remain unchanged.
The real logger category is **BlockMappingPipeline**, not UIAgent.
F052/F053's eager pipeline diagnostics remain unchanged and contribute to
every whole-agent operation. No new API, cache, default, category, handler,
cross-assembly private-access mechanism or browser/renderer change.

The [owner history](owner-history.log) and bounded existing-PR search are
retained. Inspected [dotnet/aspnetcore#68672 patches](existing-pr68672-relevant-patches.json)
rewrite streaming lifetime/indentation but retain this exact eager join/call.
No exhaustive duplicate absence claim.

## Faithful workload and immutable owner

The pinned [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
fixes31 uniquely identifiable cases. Every operation creates the actual
UIAgent, generates updates through a genuine deterministic IChatClient
producer, completely consumes real SendMessageAsync and disposes the agent.
Content allocation, mapping/handlers, paragraph rebuilding, history accumulation,
enabled generated logging and finalization are included. A bounded checksum
consumes real returned blocks. No copied logging expression, helper-only
measurement, direct event injection, reflection invocation or renderer copy.

Default NullLoggerFactory, Debug-disabled/Information-enabled logger,
Debug-enabled logger, producer-toggled logging, empty updates,1/4/16 contents,
1/8/32 updates, text/function mixed content, two-turn history and actual
checked-in single/multi-turn provider recordings are represented.
Recorded content and observed update metadata are cloned into fresh updates;
this replays provider shapes, not live network/model latency.

The timed logger keeps only a bounded count: no growing Moq invocation list,
state boxing/formatting, sink I/O or recording collection in timing.
Full structured logs, finalized blocks and next-turn request history are
captured only during setup. The [original oracle](contract-oracles.json) is
captured before shipping edits. Each printed verified contract follows two
actual complete workload executions matching it exactly. All186 measured
case setups validate372 complete workloads and408 real IChatClient stream
calls, including the three two-turn cases. See [verified contracts](setup-correctness.json).

Actual user-block IDs are generated inside the pipeline even if a user input
has a MessageId. Repeated setup therefore uses a per-operation symbolic map
only for GUID block IDs, consistently in blocks and their emitted logs.
Nonempty IDs, distinctness/order and identity references stay observable;
other strings, fields and complete records are not masked.

The loaded Components.AI path/MVID is checked against its actual PE module.
Complete38-file DLL/JSON closures differ only in Components.AI:
[guard-only](binary-closure.json), [final](binary-closure-final.json).
The original harness DLL/PDB is explicitly frozen into both proposed measured
snapshots after checking identical runtime/deps/other assemblies.
The uncompared rebuilt `after` harness snapshot remains in the manifest trail;
its hash change was not interpreted as a performance result.
No binaries/PDB/bin/obj are published.

## All31 final outcomes: pairs2/3 only

Negative time percentage means faster. Each pair uses eight observations,
three warmups,100ms iteration time and DontRemove outliers. Medians are over
two paired mean ratios, not confidence intervals, significance or production
throughput. CV is the maximum observed coefficient of variation.

| Case | Median time% | Pair2% | Pair3% | Median before ns | Median after ns | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Disabled_0_1 | 3.81 | 4.69 | 2.93 | 1561.52 | 1621.07 | 3424.00 | 3424.00 | 5.06 |
| Disabled_1_0 | -0.96 | -0.77 | -1.16 | 2361.60 | 2338.87 | 4768.00 | 4696.00 | 3.67 |
| Disabled_1_1 | -6.30 | -7.40 | -5.20 | 2997.24 | 2808.32 | 5304.00 | 5232.00 | 7.70 |
| Disabled_1_16 | -7.12 | -8.76 | -5.47 | 9839.29 | 9136.08 | 15281.00 | 14769.00 | 6.43 |
| Disabled_1_4 | -4.32 | -4.60 | -4.05 | 4295.07 | 4109.42 | 7425.00 | 7225.00 | 1.59 |
| Disabled_32_0 | -4.63 | -5.02 | -4.23 | 19257.77 | 18366.34 | 37803.00 | 35499.00 | 2.69 |
| Disabled_32_1 | -4.24 | -4.95 | -3.54 | 25614.81 | 24526.66 | 41652.00 | 39348.00 | 4.94 |
| Disabled_32_16 | -6.10 | -6.49 | -5.70 | 203528.69 | 191119.51 | 296554.00 | 280176.00 | 4.66 |
| Disabled_32_4 | -5.81 | -7.32 | -4.31 | 60585.13 | 57027.05 | 95210.50 | 88809.50 | 4.54 |
| Disabled_8_0 | -5.09 | -5.58 | -4.60 | 6411.28 | 6084.88 | 12169.00 | 11593.00 | 3.34 |
| Disabled_8_1 | -4.55 | -5.18 | -3.91 | 7936.52 | 7574.85 | 13177.00 | 12601.00 | 4.81 |
| Disabled_8_16 | -9.78 | -10.73 | -8.83 | 47486.70 | 42835.42 | 73144.00 | 69047.00 | 4.08 |
| Disabled_8_4 | -8.04 | -9.22 | -6.86 | 16085.05 | 14787.52 | 25795.00 | 24194.50 | 3.31 |
| Enabled_1_0 | -3.25 | -2.45 | -4.05 | 2752.83 | 2663.59 | 4768.00 | 4768.00 | 3.13 |
| Enabled_8_0 | 2.04 | 4.43 | -0.35 | 7794.55 | 7950.04 | 12169.00 | 12169.00 | 5.14 |
| Enabled_8_1 | 0.10 | 0.97 | -0.76 | 9042.36 | 9051.18 | 13177.00 | 13177.50 | 2.77 |
| Enabled_8_16 | -0.90 | -0.48 | -1.32 | 51797.57 | 51332.31 | 73144.00 | 73144.00 | 2.66 |
| Flip_8_1 | -0.86 | 1.14 | -2.86 | 8380.12 | 8308.35 | 13177.00 | 12889.00 | 3.51 |
| Mixed_Disabled_8 | -7.17 | -7.26 | -7.09 | 14674.13 | 13621.51 | 18058.00 | 16778.00 | 3.33 |
| Mixed_Enabled_8 | -0.51 | 0.62 | -1.65 | 16724.25 | 16636.46 | 18058.00 | 18058.00 | 1.30 |
| Null_1_0 | -1.23 | -1.34 | -1.12 | 2205.64 | 2178.51 | 4744.00 | 4672.00 | 4.74 |
| Null_1_1 | -1.68 | -0.10 | -3.26 | 2615.82 | 2571.17 | 5280.00 | 5208.00 | 3.26 |
| Null_32_1 | -4.67 | -4.94 | -4.40 | 25610.04 | 24413.00 | 41628.00 | 39324.00 | 1.56 |
| Null_8_0 | -1.06 | 0.80 | -2.92 | 6308.40 | 6243.71 | 12145.00 | 11569.00 | 6.98 |
| Null_8_1 | -3.85 | -4.63 | -3.06 | 7735.96 | 7437.76 | 13153.00 | 12577.00 | 3.27 |
| Null_8_16 | -8.73 | -10.12 | -7.34 | 46879.83 | 42770.20 | 73119.50 | 69023.00 | 1.30 |
| Recorded_Disabled | -2.55 | 0.76 | -5.86 | 12999.76 | 12665.96 | 21834.00 | 20826.00 | 6.06 |
| Recorded_Enabled | 2.24 | 6.79 | -2.32 | 14830.92 | 15149.54 | 21834.00 | 21834.50 | 3.56 |
| RecordedTwo_Disabled | -5.68 | -7.23 | -4.14 | 14058.74 | 13257.40 | 23635.00 | 22698.00 | 2.55 |
| RecordedTwo_Enabled | -0.12 | 2.57 | -2.80 | 16417.21 | 16387.01 | 23634.50 | 23635.00 | 4.19 |
| TwoTurns_Disabled_8_1 | -2.56 | -2.82 | -2.30 | 15533.73 | 15135.54 | 25947.00 | 24795.00 | 4.28 |

Representative whole-operation targets:
Disabled_8_16 is9.78% faster median and73144 to69047 B/op;
the actual default-logger Null_8_16 is8.73% faster and73119.5 to69023 B/op.
Disabled_8_4 is8.04% faster with25795 to24194.5 B/op.
Ordinary one-content/empty updates avoid about72 B each, four text contents
about200 B,16 text contents about512 B; sample-rounding differences are retained.

**Mixed boundaries:** Null_8_0 is+0.80/-2.92% and Recorded_Disabled
is+0.76/-5.86%. Their lower medians do not establish repeatable timing gains.
RecordedTwo_Disabled is5.68% faster median and23635 to22698 B/op.

**Retained controls:** Disabled_0_1 executes no affected update and is3.81%
slower median in both final pairs,3424 B unchanged. Enabled_8_0 is+2.04%,
Enabled_8_1+0.10%, Recorded_Enabled+2.24%. Other enabled/toggled controls have
small or mixed directions; tiny sampled half-byte differences are shown,
not claimed as structural allocation changes. No causal attribution of those
shifts to the guard, duplicate check, compiler layout or scheduling.

## Earlier shape: pair1 retained separately

Guard-only pair1 saved heap in all22 targets but produced mixed timing.
All eight enabled/partially enabled controls were slower, up to15.26%
for the empty enabled update. That motivated the one-line helper tune,
not a proved attribution to the redundant check. The final caller/log-helper
shape uses the same original harness; its two pairs alone support final claims.

<details><summary>Pair1: all31 guard-only outcomes</summary>

| Case | Time change% | Before ns | After ns | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|---:|---:|
| Disabled_0_1 | -0.78 | 1535.61 | 1523.71 | 3424.00 | 3424.00 | 3.30 |
| Disabled_1_0 | -2.18 | 2433.62 | 2380.56 | 4768.00 | 4696.00 | 4.98 |
| Disabled_1_1 | -13.45 | 3277.35 | 2836.48 | 5304.00 | 5232.00 | 6.71 |
| Disabled_1_16 | 5.44 | 9192.51 | 9692.75 | 15281.00 | 14769.00 | 5.21 |
| Disabled_1_4 | -0.82 | 4175.86 | 4141.61 | 7425.00 | 7225.00 | 4.71 |
| Disabled_32_0 | -1.56 | 18984.29 | 18688.05 | 37803.00 | 35499.00 | 1.72 |
| Disabled_32_1 | -4.29 | 26291.83 | 25162.65 | 41652.00 | 39348.00 | 4.61 |
| Disabled_32_16 | -1.45 | 197617.77 | 194749.70 | 296562.00 | 280175.00 | 3.75 |
| Disabled_32_4 | -3.32 | 60539.13 | 58531.29 | 95211.00 | 88810.00 | 1.91 |
| Disabled_8_0 | 4.27 | 6025.06 | 6282.30 | 12169.00 | 11593.00 | 2.08 |
| Disabled_8_1 | 5.99 | 7646.11 | 8103.75 | 13177.00 | 12601.00 | 4.35 |
| Disabled_8_16 | -3.05 | 46235.58 | 44826.98 | 73144.00 | 69048.00 | 2.89 |
| Disabled_8_4 | -3.26 | 15876.54 | 15358.23 | 25795.00 | 24195.00 | 3.56 |
| Enabled_1_0 | 15.26 | 2492.50 | 2872.83 | 4768.00 | 4768.00 | 7.37 |
| Enabled_8_0 | 6.88 | 7625.18 | 8149.44 | 12169.00 | 12169.00 | 3.72 |
| Enabled_8_1 | 6.54 | 8919.33 | 9502.24 | 13177.00 | 13177.00 | 2.09 |
| Enabled_8_16 | 1.53 | 51217.65 | 52001.78 | 73144.00 | 73144.00 | 3.75 |
| Flip_8_1 | 3.34 | 8265.44 | 8541.34 | 13177.00 | 12889.00 | 1.27 |
| Mixed_Disabled_8 | -2.46 | 14416.35 | 14061.20 | 18058.00 | 16778.00 | 1.24 |
| Mixed_Enabled_8 | 3.52 | 16629.26 | 17214.86 | 18059.00 | 18058.00 | 1.62 |
| Null_1_0 | 3.87 | 2148.70 | 2231.82 | 4744.00 | 4672.00 | 5.84 |
| Null_1_1 | 4.09 | 2556.00 | 2660.45 | 5280.00 | 5208.00 | 2.88 |
| Null_32_1 | -5.67 | 26751.51 | 25234.43 | 41628.00 | 39324.00 | 1.82 |
| Null_8_0 | -3.22 | 6303.86 | 6101.13 | 12145.00 | 11569.00 | 1.87 |
| Null_8_1 | -3.27 | 7990.81 | 7729.81 | 13153.00 | 12577.00 | 2.92 |
| Null_8_16 | -7.41 | 48662.17 | 45057.86 | 73120.00 | 69023.00 | 6.14 |
| Recorded_Disabled | -5.79 | 13499.95 | 12718.50 | 21834.00 | 20826.00 | 3.89 |
| Recorded_Enabled | 4.37 | 15258.42 | 15925.00 | 21834.00 | 21834.00 | 1.99 |
| RecordedTwo_Disabled | -0.85 | 13775.73 | 13658.81 | 23635.00 | 22698.00 | 3.49 |
| RecordedTwo_Enabled | 3.02 | 16632.36 | 17133.83 | 23635.00 | 23635.00 | 6.42 |
| TwoTurns_Disabled_8_1 | -4.70 | 16286.19 | 15520.74 | 25947.00 | 24795.00 | 2.40 |

</details>

[Raw outcomes](raw-case-outcomes.json) contain all186 measured means/SDs/heap/
iteration counts; [paired outcomes](all-paired-outcomes.json) retain93 rows
and exact source identities. **Do not use [all-paired-summary.json](all-paired-summary.json)'s
mixed-shape history medians as final results.** [final-paired-summary.json](final-paired-summary.json)
selects only after-3 pairs2/3. Every raw JSON/CSV/HTML/console report is retained.
All five derived JSON files reproduce byte-identically with summarize.ps1.

## Correctness and permanent boundary

Final full Components.AI coverage is145/145, with six distinct new rows.
Exact original owning DLL/PDB with those final test binaries passes142 and
fails exactly the1/4/16 actual eager-read rows, each for its expected positive
read count. This is individually checked red/green, not an aggregate inference.
The strengthened resource test also compares complete enabled/disabled
streams and proves exactly one saved content read per item; merely moving
an ignored IsEnabled check earlier cannot satisfy that assertion.

Six valid original/prototype/original-final/tuned/final/original-strong suites
retain869 outcomes:860 pass and nine expected original eager-read failures,
no skips. Final test DLL/deps/other outputs are unchanged in the
[original-owner reuse closure](original-final-test-reuse.json).
See [full test outcomes](all-test-outcomes.json) and [focused correctness](correctness.json).

| Requirement | Evidence |
|---|---|
| Actual stream removes disabled diagnostic work, not just a reordered check | `UIAgentTests.SendMessageAsync_DebugDisabled_DoesNotReadContentsBeforeFiltering` (1/4/16 individually red/green rows and complete-stream enabled/disabled read delta) |
| Enabled mixed fields/template/event/category and blocks preserved | `UIAgentTests.SendMessageAsync_DebugEnabled_PreservesReceivedUpdateFields` |
| Empty update preserves null role, empty content types and actual user block | `UIAgentTests.SendMessageAsync_DebugEnabled_EmptyUpdatePreservesNullRoleAndContentTypes` |
| Index advances through disabled/enabled/disabled/enabled real updates | `UIAgentTests.SendMessageAsync_DebugEnabledAfterFirstUpdate_PreservesUpdateIndex` (received indices1/3, exact accumulated text) |
| Existing real-provider replay/thread/history/handler behavior | Full Components.AI suite; `UIAgentTests.SendMessageAsync_SecondTurn_SendsPreviousMessagesAsHistory`, `UIAgentBaselineTests.SingleTurnRecording_ProducesOneCompletedTextBlock` and existing thread tests |
| Complete real agent output/log/history liveness during each benchmark |31 original contracts,186 validated setup records,372 actual full workloads/408 IChatClient stream calls |

Behavior owner is the managed UIAgent stream/logging service, producer the
real IChatClient update stream plus unchanged mapping pipeline, observable
resource work and generated logs/final blocks/history. Selected permanent
surface is the existing Components.AI managed unit/replay suite. A direct
logger/helper invocation would false-pass producer reachability; none is used.
This change owns no renderer/JS/DOM/DI boundary. Browser rendering/sample E2E,
external network/model latency and user-visible rendering success are not claimed.

Preparation is retained: missing original test assets prompted a permitted
restore; original receipt comparisons found actual user GUIDs and were corrected
with relationship-preserving normalization before measurements; initial
uncompared rebuilt harness hash mismatch prompted explicit original-harness
equalization. Final focused assertion strengthening changed tests only, then
new final/original-owner red/green was completed without a fourth benchmark.

## Exact commands and observed results

Each shell begins at repository root with `. .\activate.ps1`.
`$run` denotes the archived local F051 run directory; published manifests
redact its user-specific prefix as `<SESSION_FILES>`.

```powershell
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-after-final"
# PASSED:145/145, all six distinct final new rows.

dotnet test "$run\tests-original-final-2-binaries\Microsoft.AspNetCore.Components.AI.Tests.dll" --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-before-final-2"
# EXPECTED RED:142 pass/3 fail, exactly the1/4/16 actual positive-read rows.

dotnet format whitespace .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj --include .\src\Components\AI\src\Engine\UIAgent.cs .\src\Components\AI\src\Engine\UIAgentLog.cs .\src\Components\AI\test\Engine\UIAgentTests.cs --no-restore --verify-no-changes --verbosity quiet
# PASSED: exact changed files; git diff --check also PASSED.

dotnet restore "$run\harness\AutoPerf.Benchmarks.csproj" --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# PASSED after creating the new independent dependency manifest.

dotnet build "$run\harness\AutoPerf.Benchmarks.csproj" -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# PASSED for original, guarded and final generated-helper shapes.

dotnet "$run\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$run\binaries\after-3\AutoPerf.Benchmarks.dll" --verify-setups
# PASSED:31 original and31 final setups; each verifies two actual complete workloads.

dotnet "$run\binaries\<snapshot>\AutoPerf.Benchmarks.dll" --filter '*StreamingLogBenchmark*' --inProcess --exporters json csv --artifacts "$run\round-<round>-<variant>" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# PASSED: all six archived launches,31 measured cases/eight observations each.
# Pair1 A/B before/after-2; pair2 B/A after-3/before; pair3 A/B before/after-3.
```

## Reproduction, host and limits

Use separate baseline/final worktrees at the exact commits above, not reset/
clean of a shared checkout. Set the standalone project's
`-p:AspNetCoreRoot=<absolute owning worktree>` and activate that repository SDK.
The checked-in provider recordings are linked by the project. Published
contract-oracles.json is linked into runtime output. Build original/final
owners, use the same original harness DLL/runtime/deps for each pair, check
the complete executable closure and `--verify-setups`, then run the direct
BenchmarkDotNet command. Archive runners describe the original spent budget
and are not an instruction to schedule a fourth campaign measurement.
Use `.\summarize.ps1 -RunRoot <absolute exported F051 directory>` to reproduce
all five summaries from public raw reports.

SDK12.0.100-alpha.1.26557.102, pinned runtime12.0.0-alpha.1.26562.105,
BenchmarkDotNet0.13.0, AI/AI.Abstractions10.6.0,
Logging.Abstractions12.0.0-alpha.1.26562.105, C#13, Release/in-process,
concurrent server GC. Shared Windows11 Enterprise10.0.26300,
Xeon Platinum8473C guest,8 cores/16 logical/~64GiB; CIM supplements BDN's
Unknown processor banner. [Environment](environment.json), [SDK](dotnet-info.log),
manifests and raw banners are retained. Serial builds/tests/measurements,
build maximum two nodes; no manual power/affinity changes or unrelated process
termination. This is not a dedicated or noise-free machine.

No verified external model/network/UI latency gain, cold/JIT behavior,
concurrent filter changes between IsEnabled and Log, pressure/concurrency,
other platform/runtime behavior, or compiler/native-code attribution.
No sample/browser assertion was attempted and described as passed.
