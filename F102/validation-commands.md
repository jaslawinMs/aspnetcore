# F102 exact recorded commands and actual outcomes

Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. Owner remained37e809ead5824bc753a1c3d56f11615bdb1296c5 without shipping changes. CPU-heavy work serialized/max2 build nodes;one original9-case true-void setter sweep/zero source comparisons. Original deadline failure not repaired or credited as speedup. Actual value serialization/SetValue4/JSVoidResult3/[123]/null acknowledgment,not a reader or integer-reply surrogate.

## frozen-generic-reuse-equivalence-red-command.json / row1: Actual exit1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.dll' '--require-generic-reuse-equivalence' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\verification\frozen-generic-reuse-equivalence-red'
```

## frozen-original-characterization-command.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\verification\frozen-original-characterization'
```

## frozen-original-deadline-red-command.json / row1: Actual exit1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.dll' '--require-deadlines' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\verification\frozen-original-deadline-red'
```

## harness-build-final-command.json / row1: Actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '--verbosity' 'minimal'
```

## harness-restore-command.json / row1: Actual exit0
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\AutoPerf.Benchmarks.csproj' '--disable-parallel' '--verbosity' 'quiet' '-m:2' '-p:Configuration=Release'
```

## harness-whitespace-apply-command.json / row1: Actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verbosity' 'quiet'
```

## harness-whitespace-final-command.json / row1: Actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verify-no-changes' '--verbosity' 'quiet'
```

## owning-tests-original-command.json / row1: Actual exit0
```powershell
dotnet 'test' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~JSRuntimeExtensionsTest|FullyQualifiedName=Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout|FullyQualifiedName=Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CompletesSuccessfullyBeforeTimeout|FullyQualifiedName=Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires|FullyQualifiedName=Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested|FullyQualifiedName=Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_InvokeAsync_CallsUnderlyingJSRuntimeInvokeAsync|FullyQualifiedName=Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_Dispose_DisallowsFurtherInteropCalls|FullyQualifiedName=Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException|FullyQualifiedName=Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException_OnMultipleCalls' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\tests\original' '-v:q'
```

## owning-tests-source-pdb-commands.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0\Microsoft.JSInterop.Tests.pdb' 'JSRuntimeExtensionsTest.cs' 'C:\src\aspnetcore\src\Components\JSInterop\test\JSRuntimeExtensionsTest.cs'
```

## owning-tests-source-pdb-commands.json / row2: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0\Microsoft.JSInterop.Tests.pdb' 'JSRuntimeTest.cs' 'C:\src\aspnetcore\src\Components\JSInterop\test\JSRuntimeTest.cs'
```

## owning-tests-source-pdb-commands.json / row3: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0\Microsoft.JSInterop.Tests.pdb' 'JSObjectReferenceTest.cs' 'C:\src\aspnetcore\src\Components\JSInterop\test\JSObjectReferenceTest.cs'
```

## pdb-original-commands.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.pdb' 'CorelibEvidence.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\CorelibEvidence.cs'
```

## pdb-original-commands.json / row2: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\Program.cs'
```

## pdb-original-commands.json / row3: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.pdb' 'RuntimeBoundary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\RuntimeBoundary.cs'
```

## pdb-original-commands.json / row4: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.pdb' 'TimeoutBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\TimeoutBenchmark.cs'
```

## pdb-original-commands.json / row5: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.pdb' 'TimeoutProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\harness\TimeoutProbe.cs'
```

## pdb-original-commands.json / row6: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSRuntimeExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\JSRuntimeExtensions.cs'
```

## pdb-original-commands.json / row7: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'IJSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\IJSRuntime.cs'
```

## pdb-original-commands.json / row8: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\JSRuntime.cs'
```

## pdb-original-commands.json / row9: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'IJSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\IJSObjectReference.cs'
```

## pdb-original-commands.json / row10: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Implementation\JSObjectReference.cs'
```

## pdb-original-commands.json / row11: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSObjectReferenceJsonConverter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Infrastructure\JSObjectReferenceJsonConverter.cs'
```

## pdb-original-commands.json / row12: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSObjectReferenceJsonWorker.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Implementation\JSObjectReferenceJsonWorker.cs'
```

## pdb-original-commands.json / row13: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'PendingAsyncCall.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs'
```

## pdb-original-commands.json / row14: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSInvocationInfo.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs'
```

## pdb-original-commands.json / row15: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'DotNetDispatcher.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs'
```

## pdb-original-commands.json / row16: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\Microsoft.JSInterop.pdb' 'JSInteropJsonTypeInfoResolver.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\producer-source\src\Components\JSInterop\src\Infrastructure\JSInteropJsonTypeInfoResolver.cs'
```

## One actual original-only true-void setter BDN sweep: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*TimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F102\original-sweep' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

Format/apply and verify passed before first build;0 warnings/errors. Owning tests:actualexit0,16 exact passed/0 failed/0 skipped/positive durations,existing baseline --no-build controls/three test-source/PDB/local-owner associations,not dedicated timed-setter coverage.
Frozen characterization:actual/expected0;require-original-deadlines:actual/expected1;require-public-reuse-equivalence:actual/expected1. All modes reach25 observations/3 failed original deadlines/3 real awaited controls/3warm+3fresh rows. Actual async setter captures serializer/transport errors;real getter/timer/consumer cancellation reached. Not a compiled replacement/redgreen fix/speedup/native mutation.

## Actual independent unchanged source branch: Passed,exits0
```powershell
git --no-pager diff --check
git diff --quiet HEAD --
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F102-js-runtime-property-write-timeouts'
gh 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F102-js-runtime-property-write-timeouts'
```
Actual remote ref37e809ead5824bc753a1c3d56f11615bdb1296c5;no optimization commit or performance PR.

`node .\reproduce-analysis.mjs <absolute-capsule> --verify`:Passed,exit0 on exact copied inputs;9 true-void setter outcomes/72 results/27 warmups/9 owner-harness-PID/SetValue4/JSVoidResult3/[123]/null/array123+731 setups,19 source/Git identities,16 PDB document associations,25 observations in three modes/resources/real deadlines/retaining consumers/serializer/void result,16 exact controls/3 source proofs,all GC/rounding/sample statistics/CI arithmetic. Document association is not method coverage;not independent confidence quantiles or omitted binary/PDB rehash.
`.\audit-owning-tests.ps1 -RunRoot <absolute-capsule> -Verify`:Passed;16 exact result/definition/execution IDs,positive durations,zero skips.
`node F102-closure.mjs <absolute-actual-local-run> --verify`:Passed,exit0 before/after actual sweep and before packaging;62 frozen files/20 declared assets. Requires omitted original local binaries,not portable binary rehash.
