# F055: defer filtered explicit-failure diagnostics

**All18 nonempty disabled/Null/LoggerFactory-filtered targets lower heap in both final pairs** (216-65904 B/op saved). 18 lower time medians (16.39-95.88% faster), 18 faster in both final pairs. All32 cases/control costs retained below. No significance or universal throughput claim.

**Tradeoff not cured by the tune:** all five enabled-reason medians higher 3.92-31.52%; 4 slower in both final pairs. Three literal no-reason controls also repeatedly slower. This is a filtered-diagnostic proposal, not an overall net-win claim.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/60. [Source abf787fe45d6d4441da65600efcbeeb276e50785](https://github.com/jaslawinMs/aspnetcore/commit/abf787fe45d6d4441da65600efcbeeb276e50785), independent `autoperf/F055-authorization-failure-log-guard`.

## Actual source, producer and bounded history

Fresh upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Retained scanner's Error-level description was incorrect: actual generated
event2 is **Information**. Source assembly targets **net462;netstandard2.0;
net12.0**, not only the retained scanner's net12.0. All three outputs built;
runtime tests/measurements are net12.0 only.

Actual DI-registered IAuthorizationService (DefaultAuthorizationServiceImpl,
including real metrics wrapper) invokes real handlers/context/evaluator.
Handler calls context.Fail(reason), which retains original reason instances
in order. Default evaluator returns failure reasons; real service then
eagerly constructs the joined diagnostic before the old generated filter.
Three actual source-owned rows observe248/496/1264 bytes after the real
evaluator returns and before Information filtering for1/4/16 reasons.
Proposed first-check bytes0, full returned reason/handler identities preserved.

[History](owner-history.log), [bounded existing PR search](existing-prs.json)
and [dotnet/aspnetcore#68572](existing-pr68572-details.json) retained.
That change added actual detailed reason output; [exact patch](reason-preservation-history.patch)
is preserved, not reverted. Search is bounded, not exhaustive proof of absence.

The [two-file proposal](source.patch) keeps existing reason local/ternary/else,
original detailed strings, Information event2/Name/template/Reason string and
service return behavior. Explicit branch checks Information **before** its
reason computation. The sole private generated helper skips its redundant
filter only because **both successful wrapper branches check once**.
Unmet branch checks **after its original eager requirement join**: F056 is
not optimized or combined; original ToString work/filter/output retained.
No new API/default/level/options/cache/framework-assembly access changes.

## One measured tune, three comparisons, source versions not mixed

Initial pair1 had18 target gains23.20-96.44%/lower heap (ten exceeded50%),
but all five enabled-reason controls slower2.84-29.11% with unchanged heap.
[First-pair disposition](first-pair-disposition.json) retains every cost;
no causal attribution of timing to a particular check/JIT effect is asserted.
It justified one source tune instead of early stopping: move the private
generated filter to each branch's checked caller position as described above.

Pairs2/3 use final `after-2` source unchanged. Initial [source](source-after.cs),
final [source](source-after-2.cs), all raw pair1 data and both hash closures
retained. Final medians use **only pairs2/3**, never initial-source values.
All-paired summary groups by case **and source snapshot**. Three-comparison
budget closed: no fourth run or selectively omitted case.

## Faithful whole-service corpus and owner isolation

[Fresh BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj):
32 fixed cases with1/4/16/64 original reason instances,0/16/128/1024-character
messages, direct requirements/named policy entry, bounded Information-
disabled/enabled loggers, real NullLogger and real LoggerFactory category/
minimum-level filtering. Success, literal Fail() with no reasons, enabled
logging and independently eager unmet-requirement controls are included.
"Direct" means the requirements overload of the real DI service, not a copied
helper expression. Handler prebuilt reasons are reused as allowed by actual
Fail(reason); new real context/failure/task/metrics processing each operation.
No claim that reason construction/formatting in application handlers was removed.

Timed entry returns actual Task<AuthorizationResult>, consumed by BDN, with
fresh real context/actual handlers/evaluator/result processing. Bounded logger
counts only, no growing Moq history/capture/formatting/sink I/O. Full formatted
structured state captured only in setup. Setup verifies actual user/resource
identity/handler invocation, original reason/handler reference identity/order,
failed-requirement identity/order, success/failure discriminator, log counts/
event/template/fields and actual named-policy/LoggerFactory behavior.

[Original contracts](contract-oracles.json), [reachability](original-reachability.json)
and [verified setups](setup-correctness.json) show18 actual nonempty disabled
targets. Every one of192 printed measured contracts follows **two actual
complete matching service workloads**,384 setup workloads. Five enabled
nonempty controls, three no-reason literal controls, four F056/unmet controls
and two success controls are retained. No result normalization or masking.

Original tested/frozen owning DLL hashes match. Proposed outputs clone the
entire original tree except separately tested owning DLL/PDB; harness/runtime/
deps/all other files identical. Both initial and final complete recursive
**66 DLL/JSON files** verified: [initial](binary-closure.json),
[final](binary-closure-after-2.json). Actual loaded PE MVID/local source-owner
path checked. No binary/PDB/bin/obj published. AspNetCoreRoot overrides the
project's C:\src\aspnetcore default; reproduce with the pinned repo/SDK/packages.

## All32 cases/all three directions

Initial1 is prior prototype; Final2/3 and median use final `after-2` only.
Negative time means faster. Eight observations/side, three warmups,100ms
iterations, DontRemove outliers. Maximum final individual CV retained.
Two-pair ratio median is not a significance/confidence interval.

| Case | Scope | Reasons | Initial1% | Final2% | Final3% | Final median% | Final before ns | Final after ns | Before B/op | After B/op | Final max CV% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Direct_Empty_Disabled | Literal control | 0 | -0.08 | 3.08 | 5.31 | 4.19 | 191.20 | 199.05 | 600.00 | 600.00 | 7.95 |
| Direct_Empty_Enabled | Literal control | 0 | 4.01 | 9.28 | 15.25 | 12.26 | 201.54 | 225.87 | 600.00 | 600.00 | 5.85 |
| Direct_Empty_Null | Literal control | 0 | 0.11 | 10.72 | 0.78 | 5.75 | 188.19 | 199.14 | 600.00 | 600.00 | 5.88 |
| Direct_Fail_Disabled_1_0 | Target | 1 | -23.20 | -3.61 | -29.16 | -16.39 | 259.31 | 216.17 | 904.00 | 688.00 | 4.51 |
| Direct_Fail_Disabled_1_1024 | Target | 1 | -56.33 | -46.35 | -59.36 | -52.85 | 454.70 | 213.92 | 2952.00 | 688.00 | 8.50 |
| Direct_Fail_Disabled_1_128 | Target | 1 | -39.19 | -16.67 | -37.80 | -27.23 | 293.95 | 213.65 | 1160.00 | 688.00 | 5.89 |
| Direct_Fail_Disabled_1_16 | Target | 1 | -26.36 | -10.01 | -27.90 | -18.96 | 258.08 | 208.77 | 936.00 | 688.00 | 5.23 |
| Direct_Fail_Disabled_16_1024 | Target | 16 | -96.44 | -95.52 | -96.23 | -95.88 | 8439.02 | 347.51 | 66832.00 | 928.00 | 6.33 |
| Direct_Fail_Disabled_16_128 | Target | 16 | -80.07 | -76.56 | -79.42 | -77.99 | 1537.31 | 338.60 | 9488.00 | 928.00 | 6.42 |
| Direct_Fail_Disabled_16_16 | Target | 16 | -50.44 | -41.25 | -53.49 | -47.37 | 649.47 | 340.10 | 2320.00 | 928.00 | 3.68 |
| Direct_Fail_Disabled_4_16 | Target | 4 | -38.13 | -25.77 | -40.54 | -33.15 | 334.20 | 222.97 | 1216.00 | 688.00 | 6.39 |
| Direct_Fail_Disabled_64_16 | Target | 64 | -67.66 | -59.17 | -67.60 | -63.39 | 1705.15 | 621.68 | 6592.00 | 1744.00 | 4.27 |
| Direct_Fail_Enabled_1_16 | Enabled control | 1 | 4.55 | 21.16 | 11.97 | 16.57 | 288.46 | 336.38 | 936.00 | 936.00 | 8.37 |
| Direct_Fail_Enabled_16_128 | Enabled control | 16 | 11.14 | 48.00 | 15.04 | 31.52 | 1560.28 | 2053.28 | 9488.00 | 9488.00 | 4.87 |
| Direct_Fail_Enabled_16_16 | Enabled control | 16 | 29.11 | 31.24 | 30.33 | 30.79 | 698.42 | 913.45 | 2320.00 | 2320.00 | 7.47 |
| Direct_Fail_Null_1_128 | Target | 1 | -37.26 | -25.28 | -39.71 | -32.50 | 302.70 | 204.40 | 1160.00 | 688.00 | 6.84 |
| Direct_Fail_Null_1_16 | Target | 1 | -28.71 | -8.94 | -24.46 | -16.70 | 269.26 | 224.15 | 936.00 | 688.00 | 7.30 |
| Direct_Fail_Null_16_128 | Target | 16 | -80.81 | -76.08 | -80.25 | -78.16 | 1510.69 | 329.04 | 9488.00 | 928.00 | 8.20 |
| Direct_Fail_Null_16_16 | Target | 16 | -56.01 | -42.76 | -50.05 | -46.41 | 657.87 | 351.93 | 2320.00 | 928.00 | 6.72 |
| Direct_Fail_Null_4_16 | Target | 4 | -41.50 | -30.76 | -45.03 | -37.90 | 350.32 | 217.03 | 1216.00 | 688.00 | 2.88 |
| Direct_Success_Disabled | Success control | 0 | -3.82 | 9.28 | -7.73 | 0.78 | 185.30 | 186.75 | 528.00 | 528.00 | 6.43 |
| Direct_Success_Enabled | Success control | 0 | 0.34 | 9.44 | -3.04 | 3.20 | 180.82 | 186.65 | 528.00 | 528.00 | 5.14 |
| Direct_Unmet_Disabled_1 | F056 control | 0 | -2.16 | 17.61 | -8.02 | 4.80 | 214.58 | 224.84 | 760.00 | 760.00 | 5.45 |
| Direct_Unmet_Disabled_16 | F056 control | 0 | -7.39 | 11.43 | -12.09 | -0.33 | 839.27 | 832.10 | 2016.00 | 2016.00 | 4.79 |
| Direct_Unmet_Enabled_16 | F056 control | 0 | -7.32 | 16.19 | -2.68 | 6.76 | 792.27 | 844.68 | 2016.00 | 2016.00 | 6.16 |
| Factory_Fail_Enabled_1_16 | Enabled control | 1 | 2.84 | 11.65 | -3.81 | 3.92 | 353.24 | 366.73 | 936.00 | 936.00 | 8.08 |
| Factory_Fail_Enabled_16_16 | Enabled control | 16 | 16.42 | 29.36 | 20.12 | 24.74 | 729.77 | 910.99 | 2320.00 | 2320.00 | 8.36 |
| Factory_Fail_Filtered_1_16 | Target | 1 | -30.01 | -20.86 | -32.48 | -26.67 | 285.10 | 208.82 | 936.00 | 688.00 | 6.39 |
| Factory_Fail_Filtered_16_128 | Target | 16 | -80.69 | -77.56 | -79.21 | -78.38 | 1591.26 | 344.32 | 9488.00 | 928.00 | 16.58 |
| Factory_Fail_Filtered_16_16 | Target | 16 | -53.93 | -45.94 | -55.93 | -50.94 | 694.72 | 339.20 | 2320.00 | 928.00 | 5.55 |
| Factory_Unmet_Filtered_16 | F056 control | 0 | -2.95 | 8.39 | -0.32 | 4.04 | 812.27 | 843.99 | 2016.00 | 2016.00 | 6.04 |
| Named_Fail_Filtered_16_128 | Target | 16 | -77.31 | -74.98 | -76.86 | -75.92 | 1703.42 | 409.45 | 9488.00 | 928.00 | 8.25 |

Retained higher-time final medians: Direct_Empty_Disabled +4.19%; Direct_Empty_Enabled +12.26%; Direct_Empty_Null +5.75%; Direct_Fail_Enabled_1_16 +16.57%; Direct_Fail_Enabled_16_128 +31.52%; Direct_Fail_Enabled_16_16 +30.79%; Direct_Success_Disabled +0.78%; Direct_Success_Enabled +3.20%; Direct_Unmet_Disabled_1 +4.80%; Direct_Unmet_Enabled_16 +6.76%; Factory_Fail_Enabled_1_16 +3.92%; Factory_Fail_Enabled_16_16 +24.74%; Factory_Unmet_Filtered_16 +4.04%. All pair directions/CVs shown, including unchanged controls; no causal attribution of shifts.

[All192 raw outcomes](raw-case-outcomes.json), [all96 ratios](all-paired-outcomes.json)
and six round directories retain complete JSON/CSV/HTML/Markdown/logs.
[Summarizer](summarize.ps1) reproduces five derived JSON files byte-identically,
with source-version-separated groups. No cases/outliers/results omitted.

## Requirement coverage and every test/prototype outcome

Final229/229/15 unique new rows. Initial original and both original-owner
test shadows each226 pass/three exact248/496/1264 failures. Initial prototype
229/229 under initial assertions; final prototype229/229 includes explicit
one-Information-check assertions on enabled/disabled branches.

Final tests with exact initial prototype owner produce222 pass/seven expected
Expected1/Actual2 duplicate-filter failures:1/4/16 resource rows, three enabled
empty/duplicate/multiline reason rows and enabled no-reason row. Preserved,
not a passing suite or unrecognized failure. Total **1374 actual outcomes:
1358 pass/9 expected original failures/7 expected initial-prototype failures**,
zero skips. [Every row](all-test-outcomes.json), [per-suite evidence](correctness.json),
all six TRX files/logs and [exact original-owner final reuse](original-final-test-reuse.json).
The first-prototype shadow's other final outputs are unchanged as well.

| Requirement | Evidence |
|---|---|
| Defer actual disabled reason diagnostics and do not hide allocations behind an early check | `Authorize_InformationDisabled_DoesNotAllocateExplicitFailureDiagnostics(reasonCount: 1)`, `(reasonCount: 4)`, `(reasonCount: 16)` each actual original/shadows red248/496/1264 and final green0. Real delegated evaluator marks after Evaluate returns; full post-evaluator-to-public-return enabled/disabled delta, exactly one Information check each/no disabled log and full actual reason/handler identity. |
| Preserve detailed enabled/disabled fields and actual reason data, including empty/duplicate/multiline content | Six `Authorize_ShouldPreserveExplicitFailureReasonsAndLogFields` rows: message `""`, `"duplicate"`, `"first\nsecond"` x Information True/False. Exact original references/order, Information event2 Name/template/Reason string/formatted text; one check each and zero disabled output. |
| Preserve Fail() literal/empty reason result | `Authorize_ShouldPreserveExplicitFailureWithoutReasons(informationEnabled: True)` and False: exact result/empty reasons/literal/one check/filter. |
| Keep F056 eager computation and filtering independent | `Authorize_ShouldPreserveUnmetRequirementDiagnostics(informationEnabled: True)` and False: actual default producer/result requirement references, both original ToString calls1 even when filtered, exact enabled event/fields and zero disabled output/one Information check. |
| Preserve success path | `Authorize_ShouldPreserveSuccessDiagnostics(informationEnabled: True)` and False: genuine pass-through assertion producer, succeeded/no Failure, exact Debug event1/template and zero Information checks. |
| Ensure final filter tune is not an unchecked logger | Seven distinct Expected1/Actual2 rows with first-prototype owner, final229/229; final unmet disabled/enabled rows verify moved check does not omit original computation/filter. |
| Build all shipping frameworks and isolate source ownership | All net462/netstandard2.0/net12.0 outputs present; actual original/tested/frozen owner hashes; both recursive66-file closures owner-only; final source snapshots/current commit match. |

### Exact commands and results

From repository root, `. .\activate.ps1` before every .NET shell; `<RUN>` is
the independent F055 directory. First NETSDK1004 missing assets was preparation,
fixed by focused restore; it did not reach tests. String-key JSON metadata
serialization correction likewise is not a test/benchmark result.

```powershell
dotnet restore .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Passed, exit0 after initial missing-assets check.
dotnet test .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before'
# Original226 pass/three individually248/496/1264 expected failures/229 total.
dotnet test .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after'
# Initial prototype229/229 pass, exit0; initial assertion source retained.
dotnet test .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-after-2'
# Final229/229 pass, exit0, exact single-filter checks included.
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Authorization.Test.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
dotnet test '<RUN>\tests-original-final-binaries-2\Microsoft.AspNetCore.Authorization.Test.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final-2'
# Each exact original owner shadow226 pass/three expected248/496/1264 failures.
dotnet test '<RUN>\tests-first-prototype-final-binaries\Microsoft.AspNetCore.Authorization.Test.dll' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-first-prototype-final'
#222 pass/seven expected duplicate-check failures(Expected1/Actual2).
dotnet build .\src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Passed for initial/final proposal, net462/netstandard2.0/net12.0 outputs verified.
dotnet format whitespace .\src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj --include .\src\Security\Authorization\Core\src\LoggingExtensions.cs .\src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs --no-restore --verify-no-changes --verbosity quiet
# Passed for initial/final, exit0.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both passed, exit0 at original source; original executable reused unchanged.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --verify-setups
#32 fresh original contracts/repeated full workloads and32 setups each before/after/after-2, exit0.
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --filter '*FailureLogBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# Six serialized launches passed A/B, B/A, A/B;32 outcomes/contracts each.
# Snapshot after only pair1; finalafter-2 pairs2/3, exact originals all three.
```

Pinned BDN0.13.0/C#13/concurrent server GC;
SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105, matching
Extensions12.0.0-alpha.1.26562.105. Shared Windows11 Enterprise/Xeon
Platinum8473C guest8 cores/16 logical/~64GiB. [SDK](dotnet-info.txt),
[hardware](hardware.json), full raw BDN environment retained; CIM supplements
Unknown processor banner. Builds use `-m:2`, all builds/tests/measurements
serialized, no power/affinity/unrelated process changes/detached services.

Disabled diagnostic-only reason enumeration intentionally omitted; returned
failure sequence/normal producer behavior preserved. Arbitrary side-effecting/
throwing custom reason enumerables, invalid null data, concurrent filter
changes, cold/JIT/pressure, other runtimes/platforms, real server/middleware/
application throughput and causal significance are unverified. net462/
netstandard2 outputs compiled, not runtime-benchmarked or behavior-tested.
