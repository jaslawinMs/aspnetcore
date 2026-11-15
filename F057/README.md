# F057: generic null-check boxing - no warmed local gain

**No supported warmed improvement.** Allocation counts are unchanged in 114 of 114 pairs; 12 of 14 nonnullable target time medians are higher, 2 lower. Only 2 of five actual nonnullable renderer targets have lower medians, and no target is faster in every pair. All 38 cases and every direction/CV are retained below.

**The Tier0 reduction is real but not the warmed result:** the original native probe boxes two int values before testing null; the prototype skips those boxes. The warmed BenchmarkDotNet whole-renderer/helper results do not establish a useful optimization. Exact original source restored; no source proposal/draft fabricated.

## Default branch, actual owners and rejected experiment

Fresh upstream main: 37e809ead5824bc753a1c3d56f11615bdb1296c5.
Independent `autoperf/F057-component-null-boxing`;no authorization source
carried. [Current source](source-original.cs), [throwaway source](source-prototype.cs),
[two-line patch](prototype.patch), [baseline proof](baseline-proof.json)
and [before-edit acceptance](acceptance.md).
[Owner history](owner-history.log), [null-check history](null-check-history.log),
[bounded search](existing-work.json) and its actual
[dotnet/aspnetcore#31756](existing-pr31756.json) /
[changed files](existing-pr31756-files.json) preserved. That proposal concerns
delegate capture/equality rather than this two-line null-check seam;no
exhaustive absence-of-prior-work claim.

The retained "confirmed/high confidence" allocation claim must be scoped to
the runtime and tier. ParameterView.DefinitelyEquals supplies **object/object**
from already-object-valued render frames. CascadingValue<TValue> supplies
actual typed previous/current values only after a real non-fixed subscriber
has been registered. No claim that every value-type component parameter
reboxes at these two null checks on the warmed path.

The experiment tests non-nullable value-type kind before each value's null
test,using typeof(T).IsValueType and Nullable.GetUnderlyingType;normal
nullable/reference tests remain. Original explanatory locals and the full
type/immutability/Equals branches preserved. No new API,cache,flags or
assembly access. Existing immutable-type cache/hot-reload subscription
unchanged. No tune justified after the first warmed pair's non-win.

## Faithful managed corpus,not a browser claim

[Standalone pinned BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj):
38 fixed cases,18 actual owning-method helpers,eight actual public
ParameterView.FromDictionary/private comparer cases and12 real renderer
cascading cases. Helper delegates bind the real owning assembly outside
timing;no copied diagnostic expression/private-member forwarding in shipping
code,no new IVT or UnsafeAccessor. Mixed int/object helper has no located
production caller and is a labelled control,not a claimed live optimization.

Real root parent -> CascadingValue<T> -> consumer uses actual render-tree
frames,parameter binding,diffing,subscription registration and notification.
IsFixedFalse explicitly produced. Actual subscriber count1 observed after
real construction,never injected. Original priming consumer parameter count1
and original bound value identity checked. Each timed operation performs two
complete updates,second value then first. Immutable/equal controls produce
no consumer update;changed/unknown-mutable cases produce two. Actual batches2,
updated-component entries4 or6 and latest original typed/reference value
verified after each captured operation.

Bounded Renderer consumes batches with scalar counters,no growing batch or
exception collection,sink/DOM/string-formatting I/O. Display is synchronous
and the workload rejects incomplete tasks rather than silently bypassing
work. Param views created with public FromDictionary retain their own unbound
frames,not renderer-pooled views. Prebuilt input boxing/oracles outside timing;
actual renderer forwarding/binding boxing remains inside timed operations.
Compare like-for-like per case,not one helper call versus two renderer updates.

[38 full original contracts](contract-oracles.json) and
[228 verified setup contracts](setup-correctness.json) retain complete
declared/runtime value types/data,original-reference relations,actual
subscriber/result/consumer identity/batch counts. Each printed contract
follows two complete matching workloads:456 actual workloads over six
launches. Helper-only calls are not producer-reachability evidence;the twelve
renderer cases independently establish the live-subscription precondition.

Fresh original test/harness/frozen owner hashes match. [61-file recursive
DLL/JSON closure](binary-closure.json):original runtime/dependencies/harness/
oracle bytes reused;only actual source-owner DLL differs,plus its PDB
privately. Loaded local owner path/PE MVID and method IL emitted.
No binaries/PDB/bin/obj published.

## Tier0 native/resource evidence retained

[Original native listing](jit-before.asm) is explicitly **Tier0 minopt**.
For int/int it contains two fresh allocations immediately followed by null
comparisons;GetType becomes known type handles,and a third box supplies
Equals(object). [Prototype listing](jit-after.asm) branches past the first
two allocations when underlying nullable type is absent,but adds metadata
calls/code size. Original int native270 bytes/prototype349 bytes.

[Original resources](resource-before.json), [prototype resources](resource-after.json)
and [all156 individual samples](resource-correctness.json):each of26
non-renderer cases has three100,000-call samples/side after100,000 warm calls.
Full typed int/long/bool/DateOnly/TimeOnly about72 ->24 B/op;Guid96 ->32;
enum96 ->48;unknown128-byte struct288 ->0;helper-only int/object24 ->0.
Nullable equal-zero remains72;nullable early-return/null/reference/frame
controls remain0. All samples within0.02 B/op of the stated effects;
minor periodic runtime bytes retained,not rounded out of raw evidence.

These are separately captured Tier0 resource observations,not extra timed
BenchmarkDotNet comparisons or proof of cold startup improvement.
The exact tier during timed BDN was not recorded;do not attribute every
warm result causally to Tier1 solely from these native listings.

## Three identical-source measured comparisons

First pair:all38 warmed heap counts unchanged;13/14 nonnullable target
times higher,four/five actual renderer targets higher. Nullable-only helper
controls +83.81/+94.52/+99.54%,not hidden.
[Complete first-pair disposition](first-pair-disposition.json).
The targeted boxing was absent from warmed nonnullable helper allocation
counts; no cache/JIT tune was justified. Two additional
unchanged-source comparisons bound the small/no-gain directions.

Exactly three serialized pairs A/B,B/A,A/B,228 outcomes/114 ratios,
three warmups/eight100ms measured observations per side,DontRemove outliers.
Every38-case ratio/mean/heap/CV shown. Negative time means faster.
Individual-launch max CV is not a confidence bound or significance claim.

| Case | Target | Pair1% | Pair2% | Pair3% | Median% | Before ns | After ns | Before B/op | After B/op | Max CV% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Cascade_Enum_Equal | Real renderer target | 2.94 | -6.09 | -6.19 | -6.09 | 1019.49 | 977.69 | 344.00 | 344.00 | 9.58 |
| Cascade_Guid_Equal | Real renderer target | 0.64 | 3.40 | 0.13 | 0.64 | 1019.67 | 1051.43 | 360.00 | 360.00 | 1.49 |
| Cascade_Int_Different | Real renderer target | 2.31 | -0.05 | 1.13 | 1.13 | 1244.16 | 1258.25 | 392.00 | 392.00 | 1.86 |
| Cascade_Int_Equal | Real renderer target | -0.20 | 0.89 | 8.29 | 0.89 | 1018.39 | 1028.09 | 344.00 | 344.00 | 5.20 |
| Cascade_MutableReference_Same | Control | 0.34 | 2.60 | 4.35 | 2.60 | 1270.48 | 1303.47 | 296.00 | 296.00 | 1.32 |
| Cascade_NullableInt_BothNull | Control | 4.79 | 4.15 | -2.01 | 4.15 | 972.38 | 1004.39 | 296.00 | 296.00 | 4.78 |
| Cascade_NullableInt_EqualZero | Control | 2.83 | -1.93 | 1.62 | 1.62 | 1128.22 | 1147.94 | 488.00 | 488.00 | 9.04 |
| Cascade_NullableInt_NullToZero | Control | 0.93 | 9.92 | 1.46 | 1.46 | 1260.32 | 1279.78 | 344.00 | 344.00 | 8.25 |
| Cascade_NullableInt_ZeroToNull | Control | -0.04 | 5.73 | 0.73 | 0.73 | 1267.28 | 1270.11 | 344.00 | 344.00 | 2.31 |
| Cascade_String_Different | Control | 0.41 | -2.05 | 2.54 | 0.41 | 1237.29 | 1242.42 | 296.00 | 296.00 | 2.04 |
| Cascade_String_Equal | Control | 0.32 | -0.35 | -0.52 | -0.35 | 1011.96 | 1006.65 | 296.00 | 296.00 | 3.55 |
| Cascade_WideStruct_Equal | Real renderer target | 2.81 | -2.53 | -2.62 | -2.53 | 1404.80 | 1390.18 | 872.00 | 872.00 | 6.26 |
| Helper_Bool_Equal | Helper-only target | 22.73 | 6.53 | 7.38 | 7.38 | 7.37 | 7.88 | 0.00 | 0.00 | 1.09 |
| Helper_DateOnly_Equal | Helper-only target | 11.38 | 7.37 | 8.77 | 8.77 | 10.20 | 11.15 | 0.00 | 0.00 | 14.23 |
| Helper_Enum_Equal | Helper-only target | 7.50 | 9.08 | 8.17 | 8.17 | 9.58 | 10.30 | 0.00 | 0.00 | 1.53 |
| Helper_Guid_Equal | Helper-only target | 16.88 | 5.63 | 3.52 | 5.63 | 10.81 | 11.42 | 0.00 | 0.00 | 2.89 |
| Helper_Int_Different | Helper-only target | 12.80 | 9.72 | 15.07 | 12.80 | 6.71 | 7.41 | 0.00 | 0.00 | 1.73 |
| Helper_Int_Equal | Helper-only target | 11.88 | 9.35 | 13.86 | 11.88 | 6.72 | 7.39 | 0.00 | 0.00 | 1.53 |
| Helper_Int_Object_Equal | Control | -0.54 | 9.35 | -3.82 | -0.54 | 8.67 | 9.29 | 0.00 | 0.00 | 1.06 |
| Helper_Long_Equal | Helper-only target | 9.86 | 10.50 | 20.34 | 10.50 | 6.41 | 7.38 | 0.00 | 0.00 | 1.12 |
| Helper_MutableReference_Same | Control | 0.05 | 3.04 | 9.63 | 3.04 | 9.47 | 9.98 | 0.00 | 0.00 | 1.85 |
| Helper_NullableInt_BothNull | Control | 99.54 | 108.09 | 114.30 | 108.09 | 5.47 | 10.96 | 0.00 | 0.00 | 3.86 |
| Helper_NullableInt_EqualZero | Control | 2.35 | 19.72 | 15.86 | 15.86 | 46.56 | 49.47 | 72.00 | 72.00 | 9.43 |
| Helper_NullableInt_NullToZero | Control | 83.81 | 107.19 | 113.61 | 107.19 | 5.87 | 11.66 | 0.00 | 0.00 | 3.29 |
| Helper_NullableInt_ZeroToNull | Control | 94.52 | 96.21 | 97.61 | 96.21 | 5.82 | 11.50 | 0.00 | 0.00 | 3.53 |
| Helper_String_BothNull | Control | 0.26 | -4.95 | 4.94 | 0.26 | 6.38 | 6.38 | 0.00 | 0.00 | 1.38 |
| Helper_String_Different | Control | 3.29 | -3.16 | 4.25 | 3.29 | 8.97 | 9.04 | 0.00 | 0.00 | 6.14 |
| Helper_String_Equal | Control | 3.71 | -0.85 | 3.82 | 3.71 | 8.97 | 9.03 | 0.00 | 0.00 | 1.04 |
| Helper_TimeOnly_Equal | Helper-only target | 2.14 | 16.65 | 13.41 | 13.41 | 9.85 | 11.28 | 0.00 | 0.00 | 4.03 |
| Helper_WideStruct_Equal | Helper-only target | 9.43 | 2.62 | 4.34 | 4.34 | 11.37 | 11.77 | 0.00 | 0.00 | 5.81 |
| ParameterView_Guid_Equal | Control | 2.41 | -3.19 | 1.58 | 1.58 | 14.28 | 14.51 | 0.00 | 0.00 | 2.61 |
| ParameterView_Int_Different | Control | -0.85 | -0.89 | -0.73 | -0.85 | 11.07 | 10.99 | 0.00 | 0.00 | 2.42 |
| ParameterView_Int_Equal | Control | -1.31 | 0.35 | 0.67 | 0.35 | 11.62 | 11.65 | 0.00 | 0.00 | 1.27 |
| ParameterView_MutableReference_Same | Control | 0.29 | -0.21 | 5.54 | 0.29 | 11.48 | 11.50 | 0.00 | 0.00 | 2.64 |
| ParameterView_NameChanged | Control | 1.73 | -0.16 | -0.40 | -0.16 | 8.09 | 8.11 | 0.00 | 0.00 | 1.58 |
| ParameterView_NullableInt_BothNull | Control | 0.04 | -0.10 | 0.03 | 0.03 | 7.10 | 7.10 | 0.00 | 0.00 | 0.61 |
| ParameterView_NullableInt_ZeroToNull | Control | 0.65 | 2.90 | -0.54 | 0.65 | 6.13 | 6.16 | 0.00 | 0.00 | 0.81 |
| ParameterView_String_Equal | Control | 4.38 | 2.31 | 2.82 | 2.82 | 10.07 | 10.32 | 0.00 | 0.00 | 1.59 |

[All228 raw outcomes](raw-case-outcomes.json), [all114 pair directions](all-paired-outcomes.json),
[complete source-specific summary](final-paired-summary.json),six complete
round directories/JSON/CSV/HTML/Markdown/logs. [Summarizer](summarize.ps1)
reproduces five derived files byte-identically after publication redaction.

## Requirement coverage and exact executed commands

| Requirement | Evidence |
|---|---|
| Preserve real update notifications and original bound values | Existing `CascadingParameterTest.NotifiesDescendantsOfUpdatedCascadingParameterValuesAndPreservesDirectParameters` and `CascadingParameterTest.DoesNotNotifyDescendantsIfCascadingParameterValuesAreImmutableAndUnchanged`,plus all twelve exact real-renderer corpus contracts/actual subscriber counts and batch/result/value identities. |
| Preserve typed/null/zero/reference/unknown-struct/frame semantics | Every38 original/setup contract;existing complete95-case CascadingParameterTest/ParameterViewTest suites pass before/prototype/restored. Individual names/outcomes retained,not a claimed red functional defect or new permanent coverage. |
| Verify real resource effect at its boundary | Actual full owning-method native listings/all156 original-prototype resource samples;warmed owner/render comparisons separately retain every non-win. |
| Restore unsupported experiment and preserve independent baseline | Exact original source/restored tested owner hashes match before manifest;285 actual outcomes all pass;no shipping source proposal or new API/cache/metadata handler. |
| Preserve evidence/budget/fidelity | Original61-file closure owner-only,38 fixed cases/three pairs/228 raw outcomes/456 actual repeated workloads;all raw code/project/data/JIT/commands retained. |

[All285 test outcomes](all-test-outcomes.json) and three complete TRXs/logs.
[Test parser](check-tests.ps1), [resource parser](check-resources.ps1).
[Preparation correction](preparation-corrections.json) records a pre-staging
path scan encountering an empty quiet-command log; the scan guard was fixed,
and all empty/raw files remain preserved. No tests or measurements rerun.
No newly added permanent tests,source proposal,issue or draft for this no-gain
experiment. The source restored before evidence publication.

From C:\src\aspnetcore,`. .\activate.ps1` before each .NET shell:

```powershell
dotnet test .\src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~CascadingParameterTest|FullyQualifiedName~ParameterViewTest' --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<before|after|restored>'
# All three actual commands pass95/95,exit0,no skips;285 total rows parsed.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Both exit0;build0 warnings/errors;original tested owner and harness owner bytes identical.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
# Exit0;38 complete original contracts/76 actual repeated workloads.
dotnet '<RUN>\binaries\<before|after>\AutoPerf.Benchmarks.dll' --verify-setups
# Both exit0;38 contracts/76 repeated actual workloads per side.
$env:DOTNET_JitDisasm='*MayHaveChanged*'
$env:DOTNET_JitStdOutFile='<RUN>\jit-<before|after>.asm'
dotnet '<RUN>\binaries\<before|after>\AutoPerf.Benchmarks.dll' --probe-resources
# Both exit0;26 actual resource cases/all156 samples verified;native Tier0 captured.
Remove-Item Env:\DOTNET_JitDisasm,Env:\DOTNET_JitStdOutFile
dotnet format whitespace .\src\Components\Components\src\Microsoft.AspNetCore.Components.csproj --include .\src\Components\Components\src\ChangeDetection.cs --no-restore --verify-no-changes --verbosity quiet
# Exit0;only exact changed seam;all other source unchanged.
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --filter '*ChangeDetectionBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# All six exact launches exit0;38 outcomes/original contracts each,76 actual workload executions each.
```

Pinned BDN0.13.0/C#13/concurrent server GC,SDK12.0.100-alpha.1.26557.102/
runtime12.0.0-alpha.1.26562.105. [SDK metadata](dotnet-info.txt),
[same-machine F056 bounded CIM snapshot](hardware.json) reused;shared
Windows11 Enterprise/Xeon Platinum8473C guest8 cores/16 logical/~64GiB.
No power/affinity changes,unrelated process termination,subagents,schedules
or detached services. All builds/tests/measurements serialized/-m:2.

This is the explicitly throwaway managed-owner boundary permitted by the
Components prototype/design-research exception,not completed production
implementation workflow. First-build sentinel/JS bundles absent;no bootstrap,
sample/browser/DOM/E2E,Server/WebAssembly/Auto hosts,Native AOT/trimming,
metadata deltas,cold/pressure or application throughput claimed verified.
Tier0 diagnostic reduction is retained;meaningful cold startup gain and
other-runtime behavior remain unmeasured. Pending source-level findings
are not universally verified defects.
