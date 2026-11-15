# F054: guard disabled function catch-up Debug arguments

**Repeated heap reduction, modest/mixed timing, not an overall timing win.**
All16 reached disabled/default targets save23-3076 B/op in every pair.
13 lower time medians (0.45-5.03%), only six faster in every pair.
Ten target directions are mixed. Calls_Disabled_8_1 median+1.01% and two-turn
median+0.30% are retained. Calls_Disabled_1_1 has ratios
**-74.79/+147.51/+183.43%, CV73.35%**: its+147.51% median is unreliable.
Do not advertise its first apparent75% win. All three unchanged-source
comparisons retained, no tune, fourth run or selective final subset.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/58. Source [cf669f276fed09622bb36453c66a6b338c9c4548](https://github.com/jaslawinMs/aspnetcore/commit/cf669f276fed09622bb36453c66a6b338c9c4548), independent `autoperf/F054-pipeline-catch-up-log-guard`.

## Actual producer, scope and history

Fresh upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Actual default FunctionInvocationHandler claims a FunctionCallContent and
emits a FunctionInvocationContentBlock. Pipeline phase2 immediately invokes
that real active entry again to catch up. It returns Pass for a call without
result; if a matching result arrived in the same update, the first invocation
consumes it and catch-up returns Complete. Result-before-call order is also
reachable. Registered handlers can produce Update, tested separately; the
default handler does not produce Update.

Original phase2 evaluates ResultKind.ToString before generated Debug event2
filters it. Six real delegated-handler rows observe24/96/384 bytes for1/4/16
calls, both Pass and Complete. The proposed first Debug checkpoint sums are0.
This is observed diagnostic allocation, **not proof of a fresh-string claim**.

The [two-file patch](source.patch) guards only that existing catch-up call.
CatchUpResult/Invoke, existing branches, keepActive, role/author, result
pairing, active-stack handling and emission remain unchanged. Enabled event2
keeps actual block HandlerType, ResultKind string, BlockId/template/Debug level.
The generated helper keeps its ordinary filter, so enabled catch-up checks
twice; separately retained phase1 F053 remains unchanged. F051-F053 work is
not included. No API/default/convention, cache or cross-assembly access change.

[History](owner-history.log), [bounded exact-name PR search](existing-prs.json),
same-baseline inspected [dotnet/aspnetcore#68672 patches](existing-pr68672-relevant-patches.json)
and [dotnet/aspnetcore#69385](existing-pr69385-details.json) are retained.
The latter stops obsolete package shipping on release/11.0, not current main;
[patches](existing-pr69385-patches.json) and real current-main owner build retained.
Search absence is bounded, not exhaustive; no RTM availability claim.

## Faithful whole-agent workload and reached/unreached cases

The [independent BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
was freshly built at original source. It reuses the real-owner streaming
recipe, not any F051-F053 optimization/results, with a new fixed31-case
function-focused corpus:1/4/16 calls,1/8 updates, same-update results,
result-first, mixed text/function, two-turn calls, Null/Disabled/Enabled/
producer-toggled logging, and zero-function text/empty/no-response/recordings.

Every operation creates real UIAgent, consumes real deterministic IChatClient
streams through SendMessageAsync/actual mapping/history/finalization, disposes
the agent and consumes a bounded returned-block checksum. Calls/results are
genuine AIContent objects, not direct log-helper invocations. This owns
provider-to-function-block mapping, **not actual server tool execution/DI**.
The default user input is text; no user-supplied function input claim.

[Fresh original receipts](contract-oracles.json) and [actual reachability](original-reachability.json)
show16 reached fully disabled/default cases: each real emitted function block
owns exactly one immediate phase2 catch-up. Seven cases have zero actual
function blocks (including Recorded_Enabled), so are unreached controls.
Seven function-shaped enabled controls and one partial Flip are retained.
Unlike F053, a single response update with a function call **does reach F054**.

Full actual finalized block type/ID/role/text/lifecycle plus serialized
function call/arguments/result and complete serialized next-turn input
content are checked against original receipts. Timed logger counts only,
without growing Moq history/capture/formatting/sink I/O. Full capture is setup
only. All186 measured setups print verified original contracts after **two
actual complete matching workloads**:372 workloads/396 actual IChatClient
streams because two cases have two turns. [Verified receipts](setup-correctness.json).
Only GUID block IDs are consistently symbolized per operation across blocks/
logs; identity/distinctness/order remain checked. Actual owner MVID/path and
pipeline logger category are checked.

Proposed entire output is cloned byte-exact from original except the separately
tested final owning DLL/PDB. Complete recursive75-file DLL/JSON closure,
including native/satellite/runtime subdirectories, is owner-only:
[hashes](binary-closure.json). Original tested/frozen owner bytes also match
[exactly](original-tested-owner.json). Harness/runtime/deps/other outputs stay
identical. No binary/PDB/bin/obj published. AspNetCoreRoot overrides the
harness's C:\src\aspnetcore default; reproducing requires matching source and
pinned repository SDK/packages, not only the data files.

## All31 cases/all three directions

Scope=Target (reached disabled/default), Enabled (function-shaped control),
Partial (toggled), Unreached (zero actual function blocks). Negative time
means faster; paired mean changes/three-ratio medians are not significance
or confidence intervals. Eight observations/side, three warmups,100ms
iterations, DontRemove outliers; maximum individual CV retained.

| Case | Scope | Actual function blocks | Median time% | Pair1% | Pair2% | Pair3% | Median before ns | Median after ns | Before B/op | After B/op | Max CV% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Calls_Disabled_1_1 | Target | 1 | 147.51 | -74.79 | 147.51 | 183.43 | 2181.31 | 5369.48 | 4952.00 | 4929.00 | 73.35 |
| Calls_Disabled_1_16 | Target | 16 | -4.77 | -6.20 | -3.90 | -4.77 | 9529.14 | 9157.50 | 15114.00 | 14729.00 | 4.83 |
| Calls_Disabled_1_4 | Target | 4 | -3.20 | -6.60 | -1.06 | -3.20 | 3508.17 | 3470.89 | 6993.00 | 6897.00 | 6.15 |
| Calls_Disabled_8_1 | Target | 8 | 1.01 | 1.01 | 5.04 | -1.10 | 7900.01 | 8253.07 | 14378.00 | 14186.00 | 4.54 |
| Calls_Disabled_8_16 | Target | 128 | -5.03 | -6.41 | -5.03 | -4.41 | 109956.95 | 102904.85 | 105942.00 | 102870.00 | 5.43 |
| Calls_Disabled_8_4 | Target | 32 | -3.87 | -5.54 | 1.32 | -3.87 | 23240.87 | 22341.83 | 33580.00 | 32812.00 | 2.88 |
| Calls_Enabled_1_1 | Enabled | 1 | 1.62 | 1.62 | -4.25 | 8.95 | 2514.80 | 2555.62 | 4953.00 | 4953.00 | 5.97 |
| Calls_Enabled_1_16 | Enabled | 16 | -0.93 | -0.21 | -0.99 | -0.93 | 10092.54 | 10071.13 | 15114.00 | 15114.00 | 4.52 |
| Calls_Enabled_8_1 | Enabled | 8 | 0.42 | -0.09 | 1.66 | 0.42 | 9822.01 | 9896.37 | 14378.00 | 14378.00 | 5.30 |
| Calls_Enabled_8_16 | Enabled | 128 | -0.33 | 0.17 | -3.09 | -0.33 | 122047.23 | 120675.35 | 105944.00 | 105944.00 | 5.92 |
| Calls_Flip_8_1 | Partial | 8 | -0.87 | 2.53 | -1.46 | -0.87 | 9289.46 | 9313.70 | 14378.00 | 14282.00 | 5.06 |
| Calls_Null_1_1 | Target | 1 | -1.55 | -4.02 | -1.55 | 1.02 | 1956.88 | 1926.57 | 4928.00 | 4904.00 | 4.18 |
| Calls_Null_8_1 | Target | 8 | -0.63 | -2.92 | -0.63 | 0.68 | 7759.84 | 7640.15 | 14353.00 | 14161.00 | 5.20 |
| Calls_Null_8_16 | Target | 128 | -4.52 | -5.96 | -3.27 | -4.52 | 104332.28 | 98119.12 | 105917.00 | 102845.00 | 1.69 |
| Empty_Disabled_8_0 | Unreached | 0 | 1.11 | 1.18 | -2.56 | 1.11 | 5171.85 | 5115.86 | 12129.00 | 12129.00 | 2.97 |
| Mixed_Disabled_8 | Target | 8 | -1.51 | -1.51 | 5.07 | -3.93 | 11263.43 | 11173.02 | 17698.00 | 17506.00 | 5.61 |
| Mixed_Enabled_8 | Enabled | 8 | 0.88 | 1.44 | 0.84 | 0.88 | 13035.74 | 13150.39 | 17698.00 | 17698.00 | 2.63 |
| NoResponse_Disabled | Unreached | 0 | -0.41 | 1.31 | -0.44 | -0.41 | 1339.84 | 1342.22 | 3424.00 | 3424.00 | 5.16 |
| Recorded_Disabled | Unreached | 0 | 1.65 | 2.17 | -2.03 | 1.65 | 10304.01 | 10419.77 | 21314.00 | 21314.00 | 5.02 |
| Recorded_Enabled | Unreached | 0 | -0.04 | 1.97 | -3.17 | -0.04 | 12382.92 | 12378.02 | 21314.00 | 21314.00 | 4.30 |
| RecordedTwo_Disabled | Unreached | 0 | -0.47 | 1.76 | -2.05 | -0.47 | 11285.56 | 11232.98 | 23194.00 | 23194.00 | 3.84 |
| ResultFirst_Disabled_1_4 | Target | 4 | -2.91 | -1.82 | -2.91 | -4.90 | 4214.83 | 4066.52 | 7953.00 | 7857.00 | 4.34 |
| ResultFirst_Enabled_1_4 | Enabled | 4 | 2.20 | 22.96 | 1.49 | 2.20 | 4514.79 | 4614.94 | 7953.00 | 7953.00 | 15.03 |
| SameUpdate_Disabled_1_1 | Target | 1 | -0.78 | 1.08 | -4.80 | -0.78 | 2388.69 | 2370.04 | 5321.00 | 5297.00 | 3.44 |
| SameUpdate_Disabled_1_16 | Target | 16 | -3.58 | -2.73 | -3.58 | -4.26 | 11149.56 | 10680.28 | 18586.00 | 18202.00 | 2.38 |
| SameUpdate_Disabled_1_4 | Target | 4 | -0.45 | 0.55 | -0.75 | -0.45 | 4132.19 | 4129.24 | 7953.00 | 7857.00 | 4.06 |
| SameUpdate_Enabled_1_4 | Enabled | 4 | 4.26 | 6.64 | 4.26 | 0.40 | 4485.69 | 4586.59 | 7953.00 | 7953.00 | 6.70 |
| SameUpdate_Null_1_4 | Target | 4 | -2.30 | -2.62 | 7.64 | -2.30 | 3884.55 | 3803.76 | 7929.00 | 7833.00 | 5.51 |
| Text_Disabled_8_1 | Unreached | 0 | -1.03 | 0.48 | -3.94 | -1.03 | 6303.77 | 6330.95 | 12817.00 | 12817.00 | 4.48 |
| Text_Null_8_16 | Unreached | 0 | 4.49 | 6.52 | 4.49 | 3.03 | 40587.93 | 42191.95 | 72758.00 | 72759.00 | 5.31 |
| TwoTurns_Calls_Disabled_8_1 | Target | 16 | 0.30 | -3.36 | 3.27 | 0.30 | 15692.76 | 15628.24 | 28347.00 | 27963.00 | 3.80 |

Repeated higher-time control medians: SameUpdate_Enabled_1_4+4.26%,
ResultFirst_Enabled_1_4+2.20% (pair1+22.96%/CV15.03%), Mixed_Enabled_8+0.88%,
and **unreached** Text_Null_8_16+4.49%. Tiny sampled heap differences retained.
Partial Flip saves96 B/op with mixed time. No causal explanation of enabled/
unreached shifts, first-case instability or broad-probe reversal is established.

[All186 raw outcomes](raw-case-outcomes.json), [all93 ratios](all-paired-outcomes.json)
and all six round directories include full JSON/CSV/HTML/Markdown/logs.
[Summary script](summarize.ps1) reproduces all five derived JSON files
byte-identically. No cases/outliers/runs omitted.

## Requirement coverage and failed-probe correction

Final150/150, original and exact-original-owner final-test shadow each144
pass/six independently expected24/96/384 failures. Three final valid suites:
450 outcomes438 pass/12 expected original failures, no skips. Eleven unique
added rows in existing pipeline class. [Original final-test reuse](original-final-test-reuse.json).

Initial proposed whole-Process allocation comparison failed one of150 rows:
`Process_DebugDisabled_CatchUpDoesNotAllocateDiagnostics(callCount: 16, completed: True)`
had enabled4904/disabled7640 despite zero first diagnostic checkpoint bytes.
Earlier construction/processing cannot attribute this small seam reliably;
no root-cause guess is asserted. Preserve [all600 execution outcomes](all-test-outcomes.json),
[all150 probe outcomes](all-probe-test-outcomes.json), probe TRX/log and
[exact probe source](tests-whole-process-probe.cs). Across all four runs:
587 pass/13 fail =12 expected original+one retained broad-probe failure.

The final additional false-pass guard measures the **entire actual catch-up
handler-return-to-following-Information-emitter-filter interval**. It contains
the whole argument/filter branch and following active-stack work, so a
discarded early Debug check cannot hide later eager arguments. Both real
checkpoint counts equal the call count. Complete outputs/finalization remain
asserted. Whole-agent resource behavior is measured separately, not inferred
from an unstable unit whole-Process comparison.

| Requirement | Evidence |
|---|---|
| Skip real disabled catch-up allocation without shifting it | `Process_DebugDisabled_CatchUpDoesNotAllocateDiagnostics(callCount: 1, completed: False)`, `(callCount: 4, completed: False)`, `(callCount: 16, completed: False)`, `(callCount: 1, completed: True)`, `(callCount: 4, completed: True)`, `(callCount: 16, completed: True)`: each original/shadow red for its exact24/96/384 bytes and final green0; real default producer, both checkpoint counts and full catch-up interval delta; exact call/argument/result identity/order/role/author/finalization. |
| Preserve enabled default Pass/Complete event2 and result-first pairing/lifecycle | `Process_DebugEnabled_PreservesCatchUpFieldsAndFunctionState(completed: False, resultFirst: False)`, `(completed: True, resultFirst: False)`, `(completed: True, resultFirst: True)` assert exact fields, call/result identity, initial lifecycle and real Finalize notification count. |
| Preserve registered Update catch-up | `Process_DebugEnabled_RegisteredCatchUpUpdatePreservesFieldsAndLifecycle`; real registration/delegated default producer, supported Update, exact event/state/final notification. Not a default-Update claim. |
| Preserve independently retained phase1 filter | `Process_DebugDisabled_ActiveHandlerStillFiltersResult`: genuine first/second text processing, exact accumulated block/finalization, no disabled event2. |
| Preserve real public producer/full function details and next-turn request history | All186 actual original contracts checked twice per measured setup; actual owner MVID/path/category; serialized call/result and complete input contents included. |
| Preserve independent final source and complete closure | Only Pipeline.cs and existing PipelineTests.cs; generated helper/phase1 unchanged,75 owner-only DLL/JSON hashes and unchanged final source in all three pairs. |

### Exact commands/results

From C:\src\aspnetcore, activate `. .\activate.ps1` before each .NET shell.
`<RUN>` is the separate F054 directory. Full TRX/correctness/logs retained.

```powershell
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before'
# Original150:144 pass/6 individual expected24/96/384 failures.
dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after'
# Initial broader probe149 pass/1 comparison failure, preserved; corrected final150/150 pass, exit0.
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Components.AI.Tests.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
# Exact original owner+final tests/other outputs:144 pass/6 individual expected24/96/384 failures.
dotnet format whitespace .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj --include .\src\Components\AI\src\Pipeline\BlockMappingPipeline.cs .\src\Components\AI\test\Pipeline\BlockMappingPipelineTests.cs --no-restore --verify-no-changes --verbosity quiet
# Passed, exit0.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both passed, exit0; actual original executable frozen, proposed full suite builds real owner.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\before\AutoPerf.Benchmarks.dll' --verify-setups
dotnet '<RUN>\binaries\after\AutoPerf.Benchmarks.dll' --verify-setups
#31 fresh original full contracts captured/repeat-verified;31 repeat-verified setups each variant, exit0.
dotnet '<RUN>\binaries\<variant>\AutoPerf.Benchmarks.dll' --filter '*StreamingLogBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# Six serialized launches passed A/B, B/A, A/B;31 results/verified contracts each, exit0.
```

Pinned BDN0.13.0/C#13/concurrent server GC,
SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105,
AI/Abstractions10.6.0. Shared Windows11 Enterprise/Xeon Platinum8473C guest,
8 cores/16 logical/~64GiB; [SDK](dotnet-info.txt), [hardware](hardware.json),
raw BDN environment retained; CIM supplements Unknown processor banner.
Builds use `-m:2`, all builds/tests/measurements serialized. No power/affinity/
process changes, detached services/schedules/subagents.

Managed/service ownership is fully observable at selected permanent boundary;
no renderer/JS/DOM/browser change. Cold/pressure/concurrent filter changes,
other runtimes/platforms, actual tool execution/DI, live network/model and
rendered UI/application throughput unverified. No significance or general gain.
