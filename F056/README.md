# F056: defer filtered unmet-requirement diagnostics

**All22 filtered targets lower heap every pair** (96-65817 B/op saved); 22 lower time medians (12.13-95.91% faster), 22 faster in all three pairs. Observed local comparisons, not significance or universal throughput.

**Tradeoffs retained:** 15 of15 enabled/F055/success control medians higher, 5 slower every pair. All37 cases/directions/heap/CVs below; no overall net-win or causal attribution claim.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/62. [Source 984e7bf602aa5155474568f073306f71f769208c](https://github.com/jaslawinMs/aspnetcore/commit/984e7bf602aa5155474568f073306f71f769208c), independent `autoperf/F056-unmet-requirements-log-guard`.

## Current source, actual owner and independent scope

Fresh upstream main37e809ead5824bc753a1c3d56f11615bdb1296c5. No F055 code
carried. Retained Error-level description was wrong: actual event2 is
**Information**. Actual source targets **net462;netstandard2.0;net12.0**, not
only retained net12.0. All three outputs built; runtime tests/measurements net12.
[Owner history](owner-history.log), [bounded prior-work search](existing-prs.json)
and [dotnet/aspnetcore#68572](existing-pr68572-details.json) preserved with
[its detailed-reason patch](reason-preservation-history.patch); no exhaustive
absence-of-prior-work claim.

Actual DI IAuthorizationService/DefaultAuthorizationServiceImpl with metrics
calls real handlers/context/default evaluator. Default context HashSet retains
pending original requirement instances; real handler Succeed removes originals.
Default evaluator exposes that same pending set as failure requirements. Owning
service then stringifies/joins/concatenates diagnostics before old generated
Information check, including NullLogger/real LoggerFactory filtering.

Actual empty direct requirements are reachable: no Succeed call means default
HasSucceededFalse, real evaluator returns FailCalledFalse/empty pending failure,
and original source still constructs the prefix,96 measured diagnostic bytes.
1/4/16 requirement rows observe152/360/984 bytes after real evaluator returns
before first Information check. Proposed0 each and complete post-evaluator-to-
public-return allocation interval lower, not merely moved past a check.

[Two-file proposal](source.patch) preserves existing reason local/ternary/else/
final invocation, strings/event2/Name/Information/template/Reason string.
Unmet branch checks Information **before** its computation. Sole private
generated helper SkipEnabledCheck only because **both successful caller
branches check Information once**. Explicit FailCalled branch checks **after
its original eager reason computation**: F055 is not optimized or combined.
Actual nonempty filtered-explicit resource control still allocates diagnostics.
No new API/default/level/options/cache/framework-assembly access changes.

## Whole-service corpus and intentional diagnostic observation

[Fresh BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj):
37 actual DI service cases,22 filtered unmet targets (including three empty
sets and partial/duplicate input), eight enabled unmet/partial controls, five
F055 explicit controls and two success controls. Reason/requirement text sizes
0/16/128/1024;0/1/4/16/64 cardinality, actual direct requirements/named policy
entry, bounded disabled/enabled loggers, real NullLogger and actual
LoggerFactory category/minimum-level filtering.

"Direct" is public requirements overload of real DI service, not a copied
diagnostic expression. Handler executes actual context.Succeed/Fail/Fail(reason)
and records original user/resource/context/invocation. Partial cases submit19
references/16 originals (three duplicates); handler Succeed on even indices
removes8, default evaluator returns original8 remaining in original order.
Success uses genuine pass-through assertion handler, not fabricated result.

Timed entry returns Task<AuthorizationResult> consumed by BDN. New context/
HashSet/evaluation/result/task/metrics processing per actual operation. Prebuilt
requirement text/reason objects reused outside timing; no claim that app's own
requirement creation was removed. Bounded logger counts/no growing history/
boxing/capture/formatting/sink I/O; full fields/format capture only in setup.
Timed requirement ToString returns original prebuilt text; a conditional setup
counter observes the actual call but never accumulates during timing.

[Original material contracts](contract-oracles.json), [producer reachability](original-reachability.json)
and [verified setups](setup-correctness.json) retain complete success/failure/
FailCalled/actual pending indices/text/original reason identity/order/log fields/
formatted messages/service/logger/category and handler/user/resource identities.
Each of222 printed original contracts follows **two complete matching actual
service workloads**,444 repeated workloads, no output normalization.

**Diagnostic-only side effects are intentionally different, not hidden:**
[444 actual separate observations](diagnostic-correctness.json) record each
original unique requirement's ToString calls and actual pending indices.
Before every pending requirement stringifies once even filtered; after
filtered unmet all0 while enabled pending counts remain1, satisfied and
F055/success requirements0. All source-specific observations validated.
They are not incorrectly combined into identical original side-effect receipts.

Original tested/harness/frozen source-owner hashes match. Proposed tree clones
entire original except independently tested owning DLL/PDB; all original
harness/runtime/deps/other outputs reused unchanged. Complete recursive
**66 DLL/JSON files**, owner DLL alone differs:
[closure](binary-closure.json). Actual loaded local PE MVID/path checked.
No binary/PDB/bin/obj published. AspNetCoreRoot overrides C:\src\aspnetcore
default; reproduce against exact source/SDK/package pins.

## Three unchanged-source comparisons, no tuning

First pair22 targets faster10.50-95.40%/96-65816 fewer B/op, seven at least50%.
But most common/small targets below50%,13 of15 controls higher, explicit16
+20.43% and unchanged success+7.70/+8.55%. [First-pair disposition](first-pair-disposition.json)
retains every outcome. Already one checked filter; no unsupported source/JIT
tune justified. Remaining two pairs bound smaller/control directions.

Exactly three pairs A/B, B/A, A/B, same source/owner/harness throughout.
222 outcomes/111 ratios/222 complete original contracts/444 actual diagnostic
workloads. Budget closed, no fourth comparison or outlier/case omission.
All37 medians/three ratios shown; negative time means faster. Three warmups,
eight100ms measured observations/side, DontRemove outliers. CV maximum is an
individual launch's standard-deviation/mean, not a comparison confidence bound.

| Case | Scope | Submitted | Pending | Pair1% | Pair2% | Pair3% | Median% | Before ns | After ns | Before B/op | After B/op | Max CV% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Direct_Fail_Disabled_0_0 | F055 control | 1 | 0 | 8.46 | -1.76 | 5.74 | 5.74 | 212.75 | 214.38 | 600.00 | 600.00 | 9.58 |
| Direct_Fail_Disabled_1_16 | F055 control | 1 | 0 | 5.76 | -4.29 | 4.26 | 4.26 | 320.13 | 323.89 | 936.00 | 936.00 | 4.14 |
| Direct_Fail_Disabled_16_16 | F055 control | 1 | 0 | 20.43 | -3.72 | 5.99 | 5.99 | 791.67 | 818.75 | 2320.00 | 2320.00 | 13.04 |
| Direct_Fail_Enabled_1_16 | F055 control | 1 | 0 | 7.75 | 7.17 | 13.09 | 7.75 | 341.61 | 366.10 | 936.00 | 936.00 | 4.32 |
| Direct_Partial_Disabled_16_16 | Target | 19 | 8 | -22.08 | -29.55 | -30.01 | -29.55 | 728.54 | 517.44 | 1728.00 | 1000.00 | 5.00 |
| Direct_Partial_Enabled_16_16 | Enabled control | 19 | 8 | 8.75 | 2.95 | 6.99 | 6.99 | 763.39 | 787.66 | 1728.00 | 1728.00 | 5.42 |
| Direct_Success_Disabled | Success control | 1 | 0 | 8.55 | -3.16 | 5.64 | 5.64 | 216.54 | 227.00 | 528.00 | 528.00 | 4.64 |
| Direct_Success_Enabled | Success control | 1 | 0 | 7.70 | 0.17 | 1.99 | 1.99 | 221.12 | 222.28 | 528.00 | 528.00 | 4.54 |
| Direct_Unmet_Disabled_0_0 | Target | 0 | 0 | -10.50 | -12.13 | -14.90 | -12.13 | 183.96 | 161.64 | 552.00 | 456.00 | 6.70 |
| Direct_Unmet_Disabled_1_0 | Target | 1 | 1 | -10.67 | -18.02 | -22.01 | -18.02 | 252.90 | 207.72 | 736.00 | 600.00 | 4.23 |
| Direct_Unmet_Disabled_1_1024 | Target | 1 | 1 | -52.72 | -61.45 | -61.74 | -61.45 | 549.95 | 217.79 | 2784.00 | 600.00 | 9.89 |
| Direct_Unmet_Disabled_1_128 | Target | 1 | 1 | -23.08 | -32.98 | -31.53 | -31.53 | 305.19 | 206.80 | 992.00 | 600.00 | 3.44 |
| Direct_Unmet_Disabled_1_16 | Target | 1 | 1 | -13.40 | -16.81 | -19.56 | -16.81 | 259.41 | 212.81 | 768.00 | 600.00 | 5.35 |
| Direct_Unmet_Disabled_16_1024 | Target | 16 | 16 | -95.40 | -96.11 | -95.91 | -95.91 | 9805.66 | 401.43 | 66697.00 | 880.00 | 12.32 |
| Direct_Unmet_Disabled_16_128 | Target | 16 | 16 | -77.38 | -81.75 | -82.41 | -81.75 | 2164.96 | 395.11 | 9352.00 | 880.00 | 8.71 |
| Direct_Unmet_Disabled_16_16 | Target | 16 | 16 | -41.14 | -48.15 | -49.28 | -48.15 | 773.16 | 400.46 | 2184.00 | 880.00 | 6.88 |
| Direct_Unmet_Disabled_4_16 | Target | 4 | 4 | -19.88 | -35.68 | -34.42 | -34.42 | 389.20 | 256.84 | 1120.00 | 680.00 | 7.15 |
| Direct_Unmet_Disabled_64_16 | Target | 64 | 64 | -52.84 | -57.63 | -55.64 | -55.64 | 2427.52 | 1051.46 | 6720.00 | 1960.00 | 3.72 |
| Direct_Unmet_Enabled_0_0 | Enabled control | 0 | 0 | 7.49 | 9.81 | 15.45 | 9.81 | 206.03 | 226.24 | 552.00 | 552.00 | 4.94 |
| Direct_Unmet_Enabled_1_16 | Enabled control | 1 | 1 | -0.46 | 8.72 | 19.16 | 8.72 | 276.88 | 303.17 | 768.00 | 768.00 | 4.30 |
| Direct_Unmet_Enabled_16_128 | Enabled control | 16 | 16 | 10.99 | -1.03 | 5.33 | 5.33 | 2143.69 | 2210.47 | 9352.00 | 9352.00 | 5.83 |
| Direct_Unmet_Enabled_16_16 | Enabled control | 16 | 16 | 9.72 | -0.60 | 7.76 | 7.76 | 798.73 | 824.26 | 2184.00 | 2184.00 | 5.21 |
| Direct_Unmet_Null_0_0 | Target | 0 | 0 | -18.96 | -27.85 | -21.30 | -21.30 | 197.51 | 155.43 | 552.00 | 456.00 | 13.57 |
| Direct_Unmet_Null_1_128 | Target | 1 | 1 | -32.86 | -35.06 | -31.77 | -32.86 | 311.45 | 208.72 | 992.00 | 600.00 | 3.57 |
| Direct_Unmet_Null_1_16 | Target | 1 | 1 | -18.99 | -21.87 | -18.65 | -18.99 | 268.04 | 213.92 | 768.00 | 600.00 | 3.14 |
| Direct_Unmet_Null_16_128 | Target | 16 | 16 | -80.31 | -82.05 | -81.46 | -81.46 | 2120.48 | 400.88 | 9352.00 | 880.00 | 5.54 |
| Direct_Unmet_Null_16_16 | Target | 16 | 16 | -48.60 | -50.50 | -48.64 | -48.64 | 782.06 | 396.17 | 2184.00 | 880.00 | 4.25 |
| Direct_Unmet_Null_4_16 | Target | 4 | 4 | -28.17 | -37.52 | -32.56 | -32.56 | 384.43 | 256.17 | 1120.00 | 680.00 | 6.02 |
| Factory_Fail_Filtered_16_128 | F055 control | 1 | 0 | 2.43 | -5.48 | 0.15 | 0.15 | 2338.17 | 2279.20 | 9488.00 | 9488.00 | 8.08 |
| Factory_Unmet_Enabled_0_0 | Enabled control | 0 | 0 | 0.24 | 5.07 | 10.45 | 5.07 | 239.32 | 245.98 | 552.00 | 552.00 | 5.50 |
| Factory_Unmet_Enabled_1_16 | Enabled control | 1 | 1 | -6.47 | 3.58 | 18.54 | 3.58 | 316.31 | 328.42 | 768.00 | 768.00 | 4.59 |
| Factory_Unmet_Enabled_16_16 | Enabled control | 16 | 16 | 2.03 | -1.39 | 8.59 | 2.03 | 848.04 | 881.46 | 2184.00 | 2184.00 | 6.64 |
| Factory_Unmet_Filtered_0_0 | Target | 0 | 0 | -21.36 | -20.76 | -19.64 | -20.76 | 200.90 | 159.20 | 552.00 | 456.00 | 5.38 |
| Factory_Unmet_Filtered_1_16 | Target | 1 | 1 | -22.80 | -22.65 | -23.67 | -22.80 | 270.58 | 207.28 | 768.00 | 600.00 | 4.26 |
| Factory_Unmet_Filtered_16_128 | Target | 16 | 16 | -82.00 | -82.05 | -80.92 | -82.00 | 2189.36 | 401.07 | 9352.00 | 880.00 | 5.53 |
| Factory_Unmet_Filtered_16_16 | Target | 16 | 16 | -49.31 | -51.37 | -48.68 | -49.31 | 778.12 | 392.99 | 2184.00 | 880.00 | 5.02 |
| Named_Unmet_Filtered_16_128 | Target | 16 | 16 | -75.31 | -75.77 | -78.12 | -75.77 | 2521.48 | 606.64 | 9352.00 | 880.00 | 9.15 |

Repeated higher-time controls: Direct_Fail_Enabled_1_16 +7.75%; Direct_Partial_Enabled_16_16 +6.99%; Direct_Success_Enabled +1.99%; Direct_Unmet_Enabled_0_0 +9.81%; Factory_Unmet_Enabled_0_0 +5.07%. Every other control direction/CV also retained; no causal attribution.

[All222 actual outcomes](raw-case-outcomes.json), [all111 pair directions](all-paired-outcomes.json),
six complete round directories/JSON/CSV/HTML/Markdown/logs. [Summarizer](summarize.ps1)
reproduces six derived files byte-identically, including all actual diagnostic
observations. All raw measurements preserved.

## Requirement coverage and every test result

Final236/236/all22 unique new rows. Original and exact original-owner final-test
shadow each226 pass/ten expected original failures; **708 actual outcomes,
688 pass/20 expected failures/no skips**. [Every row](all-test-outcomes.json),
[per-suite exact effects](test-correctness.json), all three TRX files/logs and
[full original-owner final reuse](original-final-test-reuse.json) retained.
Real original resource rows individually red96/152/360/984, six actual disabled
text/partial rows red Expected0/Actual1. Final same tests all green0. Twelve
enabled/explicit/success controls pass original/proposed, not falsely called red.

| Requirement | Evidence |
|---|---|
| Omit actual filtered diagnostic allocations and preserve complete real return boundary | `Authorize_InformationDisabled_DoesNotAllocateUnmetRequirementDiagnostics(requirementCount: 0)`, `Authorize_InformationDisabled_DoesNotAllocateUnmetRequirementDiagnostics(requirementCount: 1)`, `Authorize_InformationDisabled_DoesNotAllocateUnmetRequirementDiagnostics(requirementCount: 4)` and `Authorize_InformationDisabled_DoesNotAllocateUnmetRequirementDiagnostics(requirementCount: 16)` each original/shadow red96/152/360/984 and final green0, full post-evaluator-to-AuthorizeAsync-return enabled/disabled delta, one check/no output, actual returned requirement reference identity/order. Real default evaluator delegated, not event injection. |
| Preserve empty/duplicate/multiline/null-returning text, exact enabled fields and disabled omission | Ten `Authorize_ShouldPreserveUnmetRequirementResultAndLogFields` rows: safe kind IDs Single/EmptyText/DuplicateText/MultilineText/NullText x Information True/False. Actual data remains in method, not report labels. Five disabled rows original/shadow red ToString1 and final0; enabled rows preserve1 each, full result identities, Information event2/Name/Reason/template/formatted message/one filter. |
| Only stringify actual pending requirements after real success/removal/duplicates | `Authorize_ShouldLogOnlyActualPendingRequirements(informationEnabled: True)` and False; real handler Succeed removes submitted duplicated first, actual evaluator retains second/third identities. Satisfied ToString0 both; disabled pending original1/final0, enabled1; exact emitted diagnostics/user/resource/handler invocation. |
| Keep independent F055 eager computation and explicit data/literal | `Authorize_ShouldPreserveEagerExplicitFailureDiagnostics(reasonCount: 0, informationEnabled: True)`, `Authorize_ShouldPreserveEagerExplicitFailureDiagnostics(reasonCount: 2, informationEnabled: True)`, `Authorize_ShouldPreserveEagerExplicitFailureDiagnostics(reasonCount: 0, informationEnabled: False)` and `Authorize_ShouldPreserveEagerExplicitFailureDiagnostics(reasonCount: 2, informationEnabled: False)`. Real Fail()/Fail(original reasons), exact original reason/handler identity/order/empty failed requirements, literal/detailed fields/single filter and nonempty filtered explicit first-check bytes still positive. |
| Preserve real success path and Debug fields | `Authorize_ShouldPreserveSuccessWithUnmetDiagnosticGuard(informationEnabled: True)` and False; actual assertion producer succeeds/no Failure, Debug event1/Name/template/message/no Information checks. |
| Isolate source owner and validate platforms/naming/artifact integrity | All net462/netstandard2.0/net12.0 outputs present;66-file closure owner-only; exact original/current source and final tests; three parsed complete TRX outputs/safe kind labels; no generated test artifacts committed with shipping code. |

### Exact executed commands/results

From repository root, `. .\activate.ps1` before every .NET shell; `<RUN>` is
independent F056 directory. First test compilation CS8506/CS8131 in new tuple
collection-expression input reached zero tests; corrected only new input
construction to explicit arrays, invalid source/log retained. A wrapper later
mistook expected-red exit1 after successful per-row parser as an error; resumed
only downstream snapshot/setup work, not extra tests/comparisons. Bounded gh-
search query failed before successful API search; no absence claim. All
[preparation corrections](preparation-corrections.json) disclosed.
First public export used an unescaped session placeholder inside a shadow-TRX
attribute; XML-only placeholder escaping restored all three complete reparsed
suites. Original TRX/source/measurements unchanged; no extra test/comparison.

```powershell
dotnet test .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before'
# Actual original226 pass/10 expected failures/236 total,0 skips;all resource rows96/152/360/984 and six actual ToString1 effects verified.
dotnet test .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after'
# Passed236/236,exit0,all22 new rows/0 skips.
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Authorization.Test.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
# Exact original-owner shadow226 pass/10 individually expected failures/236 total,0 skips.
dotnet build .\src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Passed exit0;net462/netstandard2.0/net12.0 actual outputs/hashes verified.
dotnet format whitespace .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj --include .\src\Security\Authorization\Core\src\LoggingExtensions.cs .\src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs --no-restore --verify-no-changes --verbosity quiet
# Passed exit0;scoped only two files,no behavior-neutral existing edits.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both passed exit0 at original source;entire original executable reused unchanged.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
# Passed exit0,37 complete original contracts/111 actual original service workloads checked.
dotnet '<RUN>\binaries\<before|after>\AutoPerf.Benchmarks.dll' --verify-setups
# Both passed exit0,37 contracts/74 actual source-specific diagnostic workloads each.
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --filter '*RequirementsLogBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# Six serialized launches passed A/B,B/A,A/B;37 complete outcomes/material contracts/74 actual diagnostic observations each. Before/after source unchanged all three.
```

Pinned BDN0.13.0/C#13/concurrent server GC, SDK12.0.100-alpha.1.26557.102/
runtime12.0.0-alpha.1.26562.105/matching Extensions12.0.0-alpha.1.26562.105.
Shared Windows11 Enterprise/Xeon Platinum8473C guest8 cores/16 logical/~64GiB;
[SDK metadata](dotnet-info.txt), [bounded CIM hardware](hardware.json), raw
BDN environment preserved (CIM supplements Unknown processor). All builds/
tests/measurements serialized/-m:2, no power/affinity/unrelated process changes/
subagents/schedules/detached services.

Filtered diagnostic-only ToString intentionally omitted; normal material result
and enabled output preserved. Arbitrary faulting/side-effecting custom ToString,
concurrent filters,invalid null requirements,cold/JIT/pressure,other platforms/
runtimes,real server/middleware/application throughput and causal significance
unverified. net462/netstandard2.0 compiled,not runtime-tested/benchmarked.
No code-testing-extensions catalog supplied;actual SDK manifests and established
repository/nearby-test guidance used instead,not an invented reference bundle.
