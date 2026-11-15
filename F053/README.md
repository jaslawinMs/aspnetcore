# F053: guard disabled active-handler Debug arguments

**Repeated allocation reduction, modest/mixed timing, not a universal time win.**
All13 actually reached fully disabled/default targets allocate less in each of
three comparisons (168-11909 B/op saved).12 have lower time medians
(0.05-5.36%), but only six are faster in every pair. Seven target time
directions are mixed or worse; RecordedTwo_Disabled is slower in every pair,
median+1.43%, despite168-169 fewer B/op. Enabled/control costs are retained.
Exactly three comparisons, unchanged final source, no tune or fourth run.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/56. Source [fcca51f2375d8adee6db82891b25832015f7c180](https://github.com/jaslawinMs/aspnetcore/commit/fcca51f2375d8adee6db82891b25832015f7c180), independent branch `autoperf/F053-pipeline-handler-log-guard`.

## Actual producer, narrow scope and history

Fresh upstream main: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Real `BlockMappingPipeline.Process` phase1 invokes an actual active handler,
then evaluates arguments before generated Debug event2 `ActiveHandlerResult`
filters logging. Three real delegated TextBlockHandler tests measure24 bytes
from its active return to the first real Debug filter; the caller guard
reduces that interval to0. Full enabled-minus-disabled allocation over
completely consumed active processing and exact outputs/lifecycle also prove
the work was skipped, not merely shifted behind a discarded early check.
The observed interval does **not** prove the scanner's fresh-string claim.

The [two-file source patch](source.patch) guards only the existing phase1
event2 invocation. `active`, `result`, Invoke and surrounding switch remain
unchanged. HandlerType is the actual block type (e.g. RichContentBlock);
ResultKind remains a string, and BlockId/template/Debug level stay identical.
The generated helper retains its normal enabled filter: enabled calls check
twice. Its second actual catch-up caller is separately retained **F054** and
is untouched. No global SkipEnabledCheck, F051/F052 changes, public API/default,
metadata cache or cross-assembly private-access addition.

[Owner history](owner-history.log), [bounded exact-name PR search](existing-prs.json)
and inspected [dotnet/aspnetcore#68672 patches](existing-pr68672-relevant-patches.json)
retain the seam. [dotnet/aspnetcore#69385](existing-pr69385-details.json)
stops shipping obsolete Components.AI on **release/11.0**, not current main;
[patches](existing-pr69385-patches.json) and actual current-main owner build
are retained. Search returned no exact-name matches, not exhaustive absence.
No RTM availability claim.

## Reachability correction:13 targets, not every disabled response

Actual UIAgent finalizes/clears user blocks before consuming assistant streams.
One assistant update only emits fresh initial blocks; all-empty updates never
produce an active block. Only later continuations of real active blocks reach
F053 phase1. Real TextBlockHandler consumes/appends text and returns its state;
actual pipeline invokes and logs active results before applying kind/lifecycle.

The fixed corpus therefore has13 reached fully disabled/default targets:
multi-update nonempty text (8/32 x1/4/16), Null equivalents, mixed content,
the two recordings and two-turn continuations. Ten no-response/single-update/
all-empty disabled/default cases are **unreached controls** with unchanged
heap, not target gains/regressions. Seven enabled cases are controls; Flip is
partly affected and saves72 B/op with mixed timing.

The inherited Updates>0 target flag was corrected after the first comparison
by reading the real owning producer and fixed corpus. Earlier derived analysis
is preserved privately. Source/harness/corpus/raw results did not change;
the same original/proposed snapshots were used for all three comparisons.
Allocation reductions support active counts (24 x7 x16 =2688 B for eight
16-content updates, with sampled whole-workload variation); heap/timing alone
is not used to invent producer reachability.

## Faithful workload, contracts and immutable closure

[BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj), independently
built at original source, reuses the actual-owner F051 workload recipe, not
its improvement or measurements.31 unique cases create real UIAgent instances,
yield fresh genuine deterministic IChatClient updates, fully consume
SendMessageAsync, actual handlers/mapping/history/finalization, dispose the
agent and consume returned-block checksums. NullLoggerFactory, disabled
Debug/Information-enabled logger, enabled Debug and producer-toggled logging
cover1/8/32 updates,0/1/4/16 contents, mixed text/function, two turns and
cloned actual checked-in provider recordings. No live network/model workload.

Timed logger uses only a bounded count: no growing Moq history, state capture,
formatting/boxing or sink I/O. Full structured fields/blocks/request histories
are captured in setup only. Fresh [original contracts](contract-oracles.json)
were captured through real complete original workloads before source edits.
All186 measured setups print verified contracts **only after two actual
complete matching runs**:372 workloads/408 actual IChatClient streams because
three cases have two turns. [Verified receipts](setup-correctness.json).
GUID block IDs alone receive consistent symbolic names across blocks/logs
per operation; distinctness/nonempty/reference/order are retained.
Actual owning-module path/MVID and pipeline logger category are checked.

Proposed outputs clone the entire immutable original harness output except
the separately tested final owning DLL/PDB. The complete recursive75-file
DLL/JSON closure includes satellite/native/runtime subdirectories and differs
only in the owning DLL: [hashes](binary-closure.json). Original harness,
runtime/deps and every other executable dependency are byte-identical.
No binary/PDB/bin/obj files are published. `AspNetCoreRoot` can override the
harness's default `C:\src\aspnetcore`; rerunning requires the pinned repository
SDK/packages and matching source snapshots, not just the published data.

## All31 cases and all three pair directions

Target=reached disabled/default; Unreached=no active phase1; Enabled=control;
Partial=producer-toggled Debug. Negative time means faster. Ratios compare
paired means; three-ratio medians are not significance/confidence intervals.
Eight observations per side, three warmups,100ms iterations, DontRemove
outliers. Max CV is the maximum individual coefficient of variation.

| Case | Scope | Median time% | Pair1% | Pair2% | Pair3% | Median before ns | Median after ns | Before B/op | After B/op | Max CV% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Disabled_0_1 | Unreached | 3.38 | 3.38 | -2.04 | 22.62 | 1533.33 | 1502.04 | 3424.00 | 3424.00 | 44.17 |
| Disabled_1_0 | Unreached | 1.59 | 1.59 | -1.18 | 1.70 | 2327.63 | 2300.23 | 4768.00 | 4768.00 | 4.59 |
| Disabled_1_1 | Unreached | 1.63 | 3.94 | 1.63 | -1.76 | 2784.01 | 2829.48 | 5304.00 | 5304.00 | 4.68 |
| Disabled_1_16 | Unreached | -0.93 | -1.83 | -0.93 | 1.21 | 9546.35 | 9457.84 | 15281.00 | 15281.00 | 1.95 |
| Disabled_1_4 | Unreached | -0.25 | -2.54 | -0.25 | 1.05 | 4194.28 | 4183.78 | 7424.00 | 7424.00 | 4.57 |
| Disabled_32_0 | Unreached | 0.89 | -2.47 | 1.37 | 0.89 | 19081.95 | 19343.74 | 37803.00 | 37803.00 | 5.07 |
| Disabled_32_1 | Target | -0.05 | 1.60 | -0.05 | -1.49 | 25270.31 | 25258.53 | 41652.00 | 40908.00 | 3.74 |
| Disabled_32_16 | Target | -3.84 | -4.06 | -2.93 | -3.84 | 201228.91 | 195332.93 | 296558.00 | 284651.00 | 4.49 |
| Disabled_32_4 | Target | -3.68 | -3.68 | -4.48 | -3.40 | 62019.57 | 59242.18 | 95211.00 | 92233.00 | 2.42 |
| Disabled_8_0 | Unreached | 0.94 | -0.34 | 0.94 | 3.33 | 6091.50 | 6148.66 | 12169.00 | 12169.00 | 3.10 |
| Disabled_8_1 | Target | -2.76 | -4.75 | -2.76 | 0.14 | 7840.12 | 7624.08 | 13177.00 | 13009.00 | 3.26 |
| Disabled_8_16 | Target | -3.22 | -3.22 | -4.21 | -2.73 | 46939.95 | 44963.50 | 73144.00 | 70455.00 | 3.96 |
| Disabled_8_4 | Target | -0.47 | -0.47 | -4.67 | 2.90 | 16263.78 | 15504.29 | 25795.00 | 25122.00 | 4.50 |
| Enabled_1_0 | Enabled | 1.69 | 1.69 | 2.54 | 1.57 | 2584.13 | 2649.80 | 4768.00 | 4768.00 | 3.34 |
| Enabled_8_0 | Enabled | 1.15 | 0.78 | 1.15 | 4.48 | 7449.54 | 7535.30 | 12169.00 | 12169.00 | 3.72 |
| Enabled_8_1 | Enabled | -0.52 | -0.52 | -3.59 | 1.75 | 9037.57 | 8887.02 | 13177.00 | 13177.00 | 7.54 |
| Enabled_8_16 | Enabled | 2.26 | 2.26 | -1.49 | 4.87 | 51316.86 | 51002.80 | 73144.00 | 73144.00 | 2.52 |
| Flip_8_1 | Partial | -0.02 | 2.90 | -0.02 | -0.17 | 8377.81 | 8375.77 | 13177.00 | 13105.00 | 3.90 |
| Mixed_Disabled_8 | Target | -4.85 | -4.85 | -6.56 | -3.44 | 14491.32 | 13612.25 | 18058.00 | 17218.00 | 3.38 |
| Mixed_Enabled_8 | Enabled | 2.59 | 2.59 | 1.00 | 3.12 | 16386.87 | 16551.25 | 18058.00 | 18058.00 | 3.02 |
| Null_1_0 | Unreached | 0.36 | 2.14 | 0.36 | 0.31 | 2150.45 | 2158.29 | 4744.00 | 4744.00 | 3.86 |
| Null_1_1 | Unreached | -0.74 | -1.29 | -0.74 | 0.71 | 2599.14 | 2579.98 | 5280.00 | 5280.00 | 2.88 |
| Null_32_1 | Target | -5.15 | -3.36 | -5.15 | -9.05 | 26254.22 | 24901.03 | 41628.00 | 40883.00 | 3.32 |
| Null_8_0 | Unreached | -1.71 | -3.55 | -1.71 | 2.60 | 6201.92 | 6095.86 | 12145.00 | 12145.00 | 7.32 |
| Null_8_1 | Target | -0.83 | -0.83 | -2.51 | 0.63 | 7763.28 | 7591.65 | 13153.00 | 12985.00 | 4.19 |
| Null_8_16 | Target | -5.36 | -8.17 | -5.04 | -5.36 | 46999.16 | 44632.40 | 73119.00 | 70430.00 | 4.80 |
| Recorded_Disabled | Target | -0.61 | -0.61 | -4.22 | 1.15 | 12890.56 | 12380.94 | 21834.00 | 21570.00 | 2.35 |
| Recorded_Enabled | Enabled | -1.00 | -1.00 | -1.13 | 4.19 | 14826.80 | 14697.71 | 21834.00 | 21835.00 | 3.15 |
| RecordedTwo_Disabled | Target | 1.43 | 1.43 | 0.05 | 1.61 | 13717.39 | 13724.07 | 23635.00 | 23466.00 | 3.97 |
| RecordedTwo_Enabled | Enabled | 0.31 | -0.00 | 0.31 | 3.25 | 16061.36 | 16111.60 | 23635.00 | 23635.00 | 2.48 |
| TwoTurns_Disabled_8_1 | Target | -0.88 | -0.88 | -1.91 | 0.39 | 15629.11 | 15330.08 | 25947.00 | 25610.00 | 6.13 |

RecordedTwo_Disabled+1.43%, Enabled_1_0+1.69% and Mixed_Enabled_8+2.59%
are slower in every pair. Enabled_8_16+2.26% has mixed ratios
(+2.26/-1.49/+4.87%). A report-preparation gate rejected an incorrect
all-pairs claim for that control before evidence publication; corrected
from the three actual ratios without another measurement.
Disabled_32_1 median-0.05% and several sub-one-percent
changes are not strong timing evidence. Most small/unreached/enabled time
directions are mixed. Disabled_0_1 Max CV44.17% makes its timing unreliable;
it is an **unaffected F053 control**, unlike F052's user-diagnostic target.
The enabled path retains both filters; no causal attribution of unchanged/
enabled timing shifts is established. Small sampled heap differences retained.

[All186 raw outcomes](raw-case-outcomes.json), [all93 ratios](all-paired-outcomes.json)
and all six round directories retain complete JSON/CSV/HTML/Markdown reports
and logs including controls/regressions. [Summary script](summarize.ps1)
reproduces all five published derived JSON files byte-identically.

## Requirement coverage and red/green preservation

Focused existing BlockMappingPipelineTests; seven distinct added rows.
Proposed146/146; original and exact-original-owner final-test shadow each143
pass/three independently expected24-byte failures, no skips. All438 valid
suite outcomes:432 pass/six expected original failures. Full managed/provider
recording suite retained in [correctness](correctness.json), [all test rows](all-test-outcomes.json),
three TRX files and [exact original final-test reuse](original-final-test-reuse.json).
Initial preparation compilation used nonexistent RegisterHandler and LINQ Any
on a pattern enumerable; corrected to established AddBlockHandler/foreach
before valid suites/measurements. Failed preparation log retained, not counted
as a valid passing test suite.

| Requirement | Evidence |
|---|---|
| Skip actual disabled active-result diagnostic allocation without shifting it | `Process_DebugDisabled_ActiveResultDoesNotAllocateDiagnostics(contentCount: 1)`, `(contentCount: 4)`, `(contentCount: 16)` each red Expected0/Actual24 on original and green0 on proposed. Real delegated TextBlockHandler; full consumed enabled-minus-disabled allocation strictly positive; exact text/final lifecycle on both sides. |
| Preserve enabled event2 Debug fields, actual Pass/Update/Complete, notifications and finalization | `Process_DebugEnabled_PreservesActiveResultFieldsAndLifecycle(kind: "Pass")`, `(kind: "Update")`, `(kind: "Complete")` assert exact RichContentBlock HandlerType, ResultKind string, BlockId/template, text, notification counts and active/inactive states before/after actual Finalize. |
| Preserve the separately retained F054 catch-up filter | `Process_DebugDisabled_FunctionCatchUpStillFiltersActiveResult` produces real FunctionCallContent/catch-up, emits/finalizes its actual function block, observes no disabled event2. |
| Preserve real public producer, logger category, generated fields, finalized blocks and next-turn history | All186 actual original contracts checked twice per setup, through real UIAgent/IChatClient streams; actual owner path/MVID/category checked. |
| Preserve independent source and all final measured identities | Only Pipeline.cs and existing PipelineTests.cs; helper/F054 unchanged,75 recursive owner-only DLL/JSON identities; unchanged source in all three pairs. |

### Exact commands/results

Run from `C:\src\aspnetcore`, activate `. .\activate.ps1` before each .NET
shell. `<RUN>` is the separate F053 run directory, not a shipping project.

```powershell
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before'
# Original+seven final new rows:143 passed, exactly3 expected24-byte failures, total146.
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after'
# Proposed:146 passed/0 failed/0 skipped, exit0.
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Components.AI.Tests.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
# Exact original owner+final tests/other outputs:143 passed, exactly3 expected24-byte failures.
dotnet format whitespace .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj --include .\src\Components\AI\src\Pipeline\BlockMappingPipeline.cs .\src\Components\AI\test\Pipeline\BlockMappingPipelineTests.cs --no-restore --verify-no-changes --verbosity quiet
# Passed, exit0.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both passed, exit0. Original executable frozen; full proposed suite builds its actual owner.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\before\AutoPerf.Benchmarks.dll' --verify-setups
dotnet '<RUN>\binaries\after\AutoPerf.Benchmarks.dll' --verify-setups
#31 fresh original contracts captured and31 actual repeat-verified setups per variant, exit0.
dotnet '<RUN>\binaries\<variant>\AutoPerf.Benchmarks.dll' --filter '*StreamingLogBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# Six launches passed A/B, B/A, A/B;31 results/31 verified contracts each, exit0.
```

Pinned BDN0.13.0, C#13, concurrent server GC, SDK12.0.100-alpha.1.26557.102,
runtime12.0.0-alpha.1.26562.105, Microsoft.Extensions.AI/Abstractions10.6.0.
Shared Windows11 Enterprise guest/Xeon Platinum8473C,8 cores/16 logical,
approximately64GiB; [SDK](dotnet-info.txt), [hardware](hardware.json), raw BDN
environment retained (CIM supplements Unknown processor banner). Builds use
`-m:2`; builds/tests/measurements serialized. No affinity/power/process changes,
detached services, schedules or subagents.

Managed/service owner and producers fully observable at the selected permanent
boundary; no renderer/JS/DOM/browser-owned change. Concurrent filter changes
within a call/concurrent use, cold/JIT/pressure, other runtimes/platforms,
live model/network and rendered UI/application throughput remain unverified.
No universal time gain or significance/causal-layout claim.
