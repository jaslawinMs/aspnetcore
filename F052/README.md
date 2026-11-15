# F052: guard mapping-pipeline Debug diagnostics

**Measured unnecessary-logging-work/heap reduction, not a universal time win.**
All23 fully disabled/default targets allocate less in each of three comparisons.
22 have lower time medians (3.18-10.36%), but only15 are faster in every pair.
`Disabled_1_4` has a+1.85% time median despite271-272 fewer B/op.
Eight target timings are mixed; enabled/control costs and extreme no-response
case variance are retained below. Exactly three comparisons, unchanged final
source in all three; budget closed, no fourth run or selective final subset.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/54. Source [cb4f5a79246711e3b5bd13ef170bad1dba170fd9](https://github.com/jaslawinMs/aspnetcore/commit/cb4f5a79246711e3b5bd13ef170bad1dba170fd9), independent branch `autoperf/F052-pipeline-disabled-log-guard`.

## Actual producer, scope and history

Fresh upstream main is `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Real `BlockMappingPipeline.Process` originally joins content type names before
generated Debug event1 `ProcessingUpdate` filters logging. Three actual
iterator tests show1/4/16 positive content reads at its first real Debug check.
The [three-file source patch](source.patch) guards only the existing
contentTypes local/event1 call; its sole generated helper skips the now-outer
enabled check. Role/count/type list/template, category, handler phases,
notifications and finalization remain unchanged. No public API/default,
metadata cache or cross-assembly private-access addition.
F051's UIAgent guard and F053's handler-result diagnostics are **not included**;
their original work remains in this independent branch and measurement.

[Owner history](owner-history.log), [bounded PR search](existing-prs.json) and
inspected [dotnet/aspnetcore#68672 patches](existing-pr68672-relevant-patches.json)
retain the target seam. [dotnet/aspnetcore#69385](existing-pr69385-details.json)
stops shipping obsolete Components.AI on **release/11.0**, not current main;
[its patches](existing-pr69385-patches.json) and current owning-source build
are retained. No exhaustive duplicate absence or RTM availability claim.

## Faithful whole-agent workload and complete immutable closure

The [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj) reuses F051's
actual-owner workload recipe, not its improvement or measurements.
31 uniquely identified cases create real UIAgent instances, fresh genuine
IChatClient update streams, fully consume SendMessageAsync, actual pipeline
handlers/mapping/history and finalization, dispose the agent and consume
returned-block checksums. Default NullLoggerFactory, disabled
Debug/Information-enabled logger, enabled Debug and producer-toggled logging
cover1/8/32 updates,0/1/4/16 contents, text/function mixed content, two turns
and actual checked-in provider recordings. Recorded update fields/shapes are
cloned; no live model/network or browser throughput claim.

**No assistant response updates still maps the user update**, so Disabled_0_1
is an affected F052 target, not F051's unaffected control. Fully Null/Disabled
workloads are the23 targets; Flip remains a partly affected control.

The timed logger has a bounded count, no growing Moq history, state capture,
formatting/boxing or sink I/O. Full generated fields/blocks/request history are
checked in setup only. A separately built original owner captured fresh
[original contracts](contract-oracles.json) before edits.
All186 measured setups print verified original contracts **only after two
actual complete runs match**:372 actual workloads,408 actual IChatClient
stream calls because three cases have two turns. [Verified records](setup-correctness.json).
Only GUID block IDs receive consistent per-operation symbolic names in blocks
and logs; distinctness/nonempty/reference/order remain checked, not masked.
The actual loaded owning-module MVID/path is also verified.

Both snapshots contain the exact original harness DLL/PDB/runtime/deps and
all other original outputs; only the separately tested final owning DLL/PDB
is substituted. The **complete recursive75-file DLL/JSON closure**, including
satellite/native/runtime subdirectories, differs only in the owner:
[byte hashes](binary-closure.json). The preparation check initially inherited
a top-level38-file expectation and stopped before measurements; it was
corrected to the recursive set without any extra comparison.
No binary/PDB/bin/obj files are published.

## All31 final outcomes, all three pairs

Negative time change means faster. Ratios are paired mean changes;
medians are over three ratios, not significance/confidence intervals.
Eight observations/pair side, three warmups,100ms iterations, DontRemove
outliers. CV is the maximum individual observed coefficient of variation.

| Case | Median time% | Pair1% | Pair2% | Pair3% | Median before ns | Median after ns | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Disabled_0_1 | -3.78 | 171.74 | -58.75 | -3.78 | 1471.35 | 1292.49 | 3424.00 | 3352.00 | 40.23 |
| Disabled_1_0 | -4.77 | -3.62 | -7.30 | -4.77 | 2141.42 | 1985.03 | 4768.00 | 4624.00 | 3.53 |
| Disabled_1_1 | -7.23 | -9.13 | -7.23 | -2.19 | 2608.27 | 2419.71 | 5304.00 | 5160.00 | 3.75 |
| Disabled_1_16 | -3.18 | -6.21 | 0.21 | -3.18 | 8676.91 | 8582.21 | 15281.00 | 14697.00 | 3.72 |
| Disabled_1_4 | 1.85 | 1.85 | 2.66 | -5.67 | 3970.11 | 4075.58 | 7425.00 | 7153.00 | 8.39 |
| Disabled_32_0 | -3.77 | -9.44 | -3.77 | -1.68 | 17220.70 | 16552.67 | 37803.00 | 35427.00 | 6.77 |
| Disabled_32_1 | -6.42 | -6.45 | -6.42 | 1.91 | 23647.79 | 23839.13 | 41652.00 | 39276.00 | 7.02 |
| Disabled_32_16 | -5.14 | -3.88 | -5.14 | -6.32 | 188439.84 | 178755.19 | 296561.00 | 280101.00 | 4.58 |
| Disabled_32_4 | -8.76 | -8.76 | -7.80 | -8.91 | 55877.57 | 51521.03 | 95209.00 | 88736.00 | 3.49 |
| Disabled_8_0 | -5.64 | -7.11 | -5.11 | -5.64 | 5569.25 | 5255.09 | 12169.00 | 11521.00 | 4.61 |
| Disabled_8_1 | -4.41 | -4.37 | -4.41 | -9.53 | 7358.53 | 6904.63 | 13177.00 | 12529.00 | 5.08 |
| Disabled_8_16 | -7.98 | -8.76 | -7.98 | -6.51 | 43714.76 | 40225.55 | 73143.00 | 68975.00 | 3.07 |
| Disabled_8_4 | -4.04 | -9.13 | -1.59 | -4.04 | 14266.04 | 13698.57 | 25795.00 | 24122.00 | 4.00 |
| Enabled_1_0 | 1.70 | 3.47 | 1.70 | 0.10 | 2451.12 | 2453.59 | 4768.00 | 4768.00 | 3.87 |
| Enabled_8_0 | -0.14 | 1.54 | -0.14 | -5.43 | 7117.03 | 7040.07 | 12169.00 | 12169.00 | 3.88 |
| Enabled_8_1 | 2.78 | 1.65 | 3.84 | 2.78 | 8198.94 | 8514.01 | 13177.00 | 13177.00 | 2.88 |
| Enabled_8_16 | 1.76 | -0.58 | 2.60 | 1.76 | 47953.37 | 48629.72 | 73144.00 | 73144.00 | 4.82 |
| Flip_8_1 | -0.55 | -0.47 | -2.15 | -0.55 | 7538.62 | 7376.82 | 13177.00 | 12817.00 | 3.15 |
| Mixed_Disabled_8 | -6.01 | -5.26 | -6.66 | -6.01 | 13571.14 | 12666.83 | 18058.00 | 16706.00 | 2.03 |
| Mixed_Enabled_8 | 2.22 | 2.22 | 3.61 | -0.20 | 16057.94 | 16513.27 | 18059.00 | 18059.00 | 3.10 |
| Null_1_0 | -3.74 | 0.13 | -3.74 | -6.34 | 1867.71 | 1797.82 | 4744.00 | 4600.00 | 6.32 |
| Null_1_1 | -3.78 | -4.01 | -3.78 | -3.47 | 2300.09 | 2207.87 | 5280.00 | 5136.00 | 2.43 |
| Null_32_1 | -4.74 | -6.89 | 5.89 | -4.74 | 22649.14 | 22334.37 | 41628.00 | 39252.00 | 2.22 |
| Null_8_0 | -4.46 | -3.01 | -4.46 | -8.98 | 5530.81 | 5180.30 | 12145.00 | 11497.00 | 4.62 |
| Null_8_1 | -5.28 | -5.42 | -5.28 | -4.46 | 7053.13 | 6738.17 | 13153.00 | 12505.00 | 5.05 |
| Null_8_16 | -5.74 | -5.74 | -0.82 | -10.87 | 43054.66 | 40584.91 | 73119.00 | 68950.00 | 3.26 |
| Recorded_Disabled | -9.86 | -9.86 | 3.20 | -21.00 | 12525.87 | 11290.59 | 21834.00 | 20754.00 | 18.86 |
| Recorded_Enabled | 0.34 | 0.34 | 10.16 | -3.20 | 14003.70 | 14582.47 | 21835.00 | 21834.00 | 2.93 |
| RecordedTwo_Disabled | -3.99 | -6.98 | -0.85 | -3.99 | 12651.77 | 12150.38 | 23635.00 | 22555.00 | 3.51 |
| RecordedTwo_Enabled | -1.02 | -1.02 | 3.68 | -7.52 | 15648.16 | 15471.63 | 23635.00 | 23635.00 | 2.50 |
| TwoTurns_Disabled_8_1 | -10.36 | -11.76 | 1.17 | -10.36 | 14223.03 | 13349.34 | 25947.00 | 24650.00 | 3.02 |

`Disabled_0_1` ratios+171.74/-58.75/-3.78% and CV40.23% make its time
unreliable; its71-73 B/op reduction is repeated. `Recorded_Disabled` and
`TwoTurns_Disabled_8_1` have faster medians but slower pair2, not repeatable
time wins. Enabled_1_0+1.70% and Enabled_8_1+2.78% are slower each pair;
Enabled_8_16+1.76%, Mixed_Enabled_8+2.22% and Recorded_Enabled+0.34%
have higher medians. Tiny sampled heap differences in enabled controls are
preserved. No causal JIT/layout/scheduling explanation is established.

[All186 raw outcomes](raw-case-outcomes.json), [all93 paired rows](all-paired-outcomes.json)
and all six round directories retain original full JSON/CSV/HTML/Markdown
reports and logs, including regressions. The [summary script](summarize.ps1)
reproduces all five published derived JSON files byte-identically.

## Requirement coverage and red/green preservation

Focused existing BlockMappingPipelineTests only; seven distinct added rows.
All original/proposed existing provider-replay/managed suite outcomes retained
in [correctness](correctness.json), [all438 outcomes](all-test-outcomes.json)
and all three TRX reports.432 pass/six expected original failures, no skips.
Proposed146/146; original and exact original-owner final-test shadow143 pass
with exactly three failures Expected0/Actual1/4/16. [Test-output reuse hashes](original-final-test-reuse.json).

| Requirement | Evidence |
|---|---|
| Skip actual disabled diagnostic reads without skipping mapping/finalization | `Process_DebugDisabled_DoesNotReadContentsForDiagnostics(contentCount: 1)`, `(contentCount: 4)`, `(contentCount: 16)` each independently red for its positive original count and green; exact final text/lifecycle plus complete enabled-minus-disabled read delta exactly one per item guards against a discarded early check. |
| Preserve enabled structured event1 Debug Role/count/type list/template and actual blocks | `Process_DebugEnabled_PreservesProcessingUpdateFields(scenario: "Text")`, `(scenario: "Mixed")`, `(scenario: "Empty")`, including null role/empty list and actual mixed block count/text/lifecycle. |
| Preserve disabled-first/enabled-second live continuation and notification | `Process_DebugEnabledAfterFirstUpdate_PreservesActiveBlockAndNotification` proves exact accumulated text/identity, one real continuation notification and final deactivation/second notification, only one enabled event1. |
| Keep actual owning producer, logger category, generated fields, finalized blocks and next-turn history equivalent | All186 setup receipts compare fresh actual complete streams twice against original contracts; actual loaded module/correct category checks; original source untouched in snapshots. |
| Preserve independent scope and final source identity | Only Pipeline.cs, PipelineLog.cs and existing PipelineTests.cs;75 recursive DLL/JSON hashes owner-only; unchanged source shape in all three comparisons. |

### Exact validation and measurement commands/results

Run from `C:\src\aspnetcore`; activate `. .\activate.ps1` **before each .NET
shell**. `<RUN>` is the separate F052 run directory, not a shipping project.

```powershell
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before'
# Original+final seven new rows:143 passed, exactly3 expected individual failures, total146.
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after'
# Proposed:146 passed/0 failed/0 skipped, exit0.
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Components.AI.Tests.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
# Exact original owner+final tests/other binaries:143 passed, exactly3 expected positive-read failures.
dotnet format whitespace .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj --include .\src\Components\AI\src\Pipeline\BlockMappingPipeline.cs .\src\Components\AI\src\Pipeline\BlockMappingPipelineLog.cs .\src\Components\AI\test\Pipeline\BlockMappingPipelineTests.cs --no-restore --verify-no-changes --verbosity quiet
# Passed, exit0.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both passed, exit0. Original executable is frozen; proposed full suite builds its real owning source.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\before\AutoPerf.Benchmarks.dll' --verify-setups
dotnet '<RUN>\binaries\after\AutoPerf.Benchmarks.dll' --verify-setups
# Passed:31 captured original contracts and31 repeat-verified setups per variant.
dotnet '<RUN>\binaries\<variant>\AutoPerf.Benchmarks.dll' --filter '*StreamingLogBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# All six launches passed: A/B, B/A, A/B;31 results and31 actual verified contracts per launch.
```

Pinned BDN0.13.0, C#13, concurrent server GC, SDK12.0.100-alpha.1.26557.102,
runtime12.0.0-alpha.1.26562.105, Microsoft.Extensions.AI/Abstractions10.6.0.
Shared Windows11 Enterprise guest/Xeon Platinum8473C,8 guest cores/16 logical,
approximately64GiB; [SDK](dotnet-info.txt), [hardware](hardware.json) and raw
BDN environment preserved. BDN's processor banner is supplemented by CIM.
Builds use `-m:2`; builds/tests/measurements serialized. No affinity/power/process
changes, detached services, schedules or subagents.

Managed/service owner and producers are completely observable at the selected
permanent boundary; no renderer/JS/DOM or browser-owned change is made.
Concurrent filter changes within a call/concurrent use, cold/JIT/pressure,
other runtimes/platforms, live model/network and rendered UI/application
throughput remain unverified. No significance or universal improvement claim.
