# Exact F096 commands and actual outcomes

Each fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. Source stayed on the untouched baseline. CPU-heavy work was serialized/max2 build nodes. One original-only20-case sweep, zero source A/B comparisons; finite/infinity are different cancellation contracts, not a compatible optimization.

## New external manifest restore: Passed, exit0
```powershell
dotnet restore 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\AutoPerf.Benchmarks.csproj' --disable-parallel --verbosity quiet -m:2 -p:Configuration=Release
```

## Original and final external builds: Passed, exit0;0 warnings/errors
```powershell
dotnet build 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\AutoPerf.Benchmarks.csproj' --no-restore -c Release -m:2 --verbosity minimal
```
Initial build/setup inputs and exact actual four-source PDB checks remain under preparation/initial-harness. The final frozen build follows the default/infinity controls and whitespace fixes.

## Existing actual owning tests: Passed, exit0;18 passed/0 failed/0 skipped
```powershell
dotnet test 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' --no-restore -c Release -m:2 --filter 'FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CompletesSuccessfullyBeforeTimeout|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires|FullyQualifiedName~JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested' --logger 'trx;LogFileName=owning-before.trx' --results-directory 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\tests\before'
```
Every actual result/definition identity and positive duration is checked by the strict18-row TRX audit; this passing completed/mock/runtime coverage does not repair the red object-reference TimeSpan deadline cases.

## Initial whitespace verification: Failed, exit2; object-initializer line formatting, not behavior
```powershell
dotnet format whitespace 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\AutoPerf.Benchmarks.csproj' --no-restore --verify-no-changes --verbosity quiet
```
The actual12 formatting diagnostics remain in harness-whitespace-before.log. The initial TRX audit also had an actual PowerShell parser failure (exit1, a leading -or line continuation); corrected before successful row auditing. Neither failed preparation is counted as a passing validation.

## External whitespace application and final verification: Passed, exit0 each
```powershell
dotnet format whitespace 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\AutoPerf.Benchmarks.csproj' --no-restore --verbosity quiet
dotnet format whitespace 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\AutoPerf.Benchmarks.csproj' --no-restore --verify-no-changes --verbosity quiet
```

## Initial actual original deadline gate: Expected failure, exit1; exactly9 of15 finite deadline rows did not cancel
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --require-deadlines --artifacts 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\verification\initial'
```
All constructor/get/set rows reach real pending tasks and fail before their later public cleanup reply; invoke/void controls cancel all6 rows. No green-after-fix or verified performance gain exists. The frozen run also observes all5 live runtime-default/infinity pairs.

## Frozen actual original deadline gate: Expected failure, exit1; exactly9 of15 finite deadline rows did not cancel
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.dll' '--require-deadlines' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\verify-before'
```
All constructor/get/set rows reach real pending tasks and fail before their later public cleanup reply; invoke/void controls cancel all6 rows. No green-after-fix or verified performance gain exists. The frozen run also observes all5 live runtime-default/infinity pairs.

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReferenceExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\JSObjectReferenceExtensions.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'JSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\JSRuntime.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\Implementation\JSObjectReference.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReferenceJsonConverter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\Infrastructure\JSObjectReferenceJsonConverter.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'DotNetDispatcher.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'JSInvocationInfo.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'PendingAsyncCall.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\Microsoft.JSInterop.pdb' 'IJSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\producer-source\src\Components\JSInterop\src\IJSObjectReference.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\Program.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.pdb' 'RuntimeBoundary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\RuntimeBoundary.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.pdb' 'TimeoutBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\TimeoutBenchmark.cs'
```

## Actual frozen source/PDB document inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.pdb' 'TimeoutProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\harness\TimeoutProbe.cs'
```

## Actual original profile sweep: Passed, exit0; all20 cases/8 retained results/3 actual warmups per case
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*TimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F096\measurements\original-profiles' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

`node .\reproduce-analysis.mjs <absolute-F096-directory> --verify`: Passed, exit0; every original outcome/sample/GC/statistics/CI arithmetic, source/Git/PDB-record/recorded closure, initial/frozen contract/control and resource observation. No omitted binary byte or distribution-quantile validation is claimed.
`.\audit-owning-tests.ps1 -RunRoot <absolute-F096-directory> -Verify`: Passed; all18 exact actual results/definitions and positive durations, zero skips.
`node F096-closure.mjs <absolute-actual-run-directory> --verify`: Passed, exit0 before and after actual measurements; all62 recursively copied files and20 declared runtime assets. This live command requires the local omitted binaries.
`git diff --check` and `git diff --quiet HEAD --`: Passed, exit0; no shipping changes.
`git push autoperf autoperf/F096-js-object-reference-timeouts`: Passed, exit0; authorized independent unchanged fork baseline.
`gh api repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F096-js-object-reference-timeouts`: Passed, exit0; actual source ref37e809ead5824bc753a1c3d56f11615bdb1296c5.
