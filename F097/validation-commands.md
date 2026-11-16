# Exact F097 commands and outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work serial/max2 build nodes. Three unchanged final-candidate comparisons are closed; prototype1 resource failure is retained, not a fabricated timed run.

## owning-tests-before: actual exit0
```powershell
dotnet 'test' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~JSRuntimeTest|FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest' '--logger' 'trx;LogFileName=owning-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\tests\before'
```

## owning-tests-baseline-newtests: actual exit0
```powershell
dotnet 'test' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~JSRuntimeTest|FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest' '--logger' 'trx;LogFileName=owning-baseline-newtests.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\tests\baseline-newtests'
```

## owning-tests-baseline-tunedtests: actual exit0
```powershell
dotnet 'vstest' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\preparation\baseline-tunedtests-binaries\Microsoft.JSInterop.Tests.dll' '--TestCaseFilter:FullyQualifiedName~JSRuntimeTest|FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest' '--Logger:trx;LogFileName=owning-baseline-tunedtests.trx' '--ResultsDirectory:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\tests\baseline-tunedtests'
```

## owning-tests-after: actual exit0
```powershell
dotnet 'test' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~JSRuntimeTest|FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest' '--logger' 'trx;LogFileName=owning-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\tests\after'
```

## baseline-reuse-red: actual exit1; originally expected1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\baseline-reuse-red'
```

## complete-baseline-red: actual exit1; originally expected1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\complete-baseline-red'
```

## candidate-reuse-green: actual exit1; originally expected0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\candidate-reuse-green'
```

## frozen-baseline-reuse-red: actual exit1; originally expected1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\frozen-baseline-reuse-red'
```

## frozen-prototype1-reuse-red: actual exit1; originally expected1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\preparation\prototype1\binaries\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\frozen-prototype1-reuse-red'
```

## frozen-candidate-reuse-green: actual exit0; originally expected0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.dll' '--require-reuse' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\verification\frozen-candidate-reuse-green'
```

## surgical-whitespace-format-verify: actual exit0
```powershell
dotnet 'format' 'whitespace' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '--include' 'C:\src\aspnetcore\src\Components\JSInterop\src\JSRuntime.cs' 'C:\src\aspnetcore\src\Components\JSInterop\test\JSRuntimeTest.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.pdb' 'CorelibEvidence.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\CorelibEvidence.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.pdb' 'DefaultTimeoutBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\DefaultTimeoutBenchmark.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\Program.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.pdb' 'RuntimeBoundary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\RuntimeBoundary.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.pdb' 'RuntimeProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\RuntimeProbe.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'JSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\source-before\JSRuntime.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'IJSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\IJSRuntime.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'IJSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\IJSObjectReference.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReferenceExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\JSObjectReferenceExtensions.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Implementation\JSObjectReference.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'JSObjectReferenceJsonConverter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\JSObjectReferenceJsonConverter.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'DotNetDispatcher.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'JSInvocationInfo.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs'
```

## Actual before portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\Microsoft.JSInterop.pdb' 'PendingAsyncCall.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.pdb' 'CorelibEvidence.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\CorelibEvidence.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.pdb' 'DefaultTimeoutBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\DefaultTimeoutBenchmark.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\Program.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.pdb' 'RuntimeBoundary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\RuntimeBoundary.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.pdb' 'RuntimeProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\harness\RuntimeProbe.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'JSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\source-after\JSRuntime.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'IJSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\IJSRuntime.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'IJSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\IJSObjectReference.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'JSObjectReferenceExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\JSObjectReferenceExtensions.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'JSObjectReference.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Implementation\JSObjectReference.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'JSObjectReferenceJsonConverter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\JSObjectReferenceJsonConverter.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'DotNetDispatcher.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'JSInvocationInfo.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs'
```

## Actual after portable-PDB source document: passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\Microsoft.JSInterop.pdb' 'PendingAsyncCall.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\producer-source\src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs'
```

## round-1-before: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: passed, exit0;50 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*DefaultTimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F097\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Source-associated final audits: passed
`node .\reproduce-analysis.mjs <absolute-capsule-path> --verify`: exit0;300 outcomes/150 pairs/2400 raw console-linked retained results/900 warmups/300 owner-harness-PID setups, raw GC/report rounding and sample mean/variance/SD/SE/median/CI-internal arithmetic,28 actual owner/producer/harness PDB proofs and one final test source proof, identical62/20 closures differing only owner DLL/PDB, same actual test assembly/original-proposed41-case owner associations, actual53 semantic rows and unchanged strict100B resource objective red/green; current-default14 blobs and later committed canonical source verified. CI distribution quantiles and omitted binary/PDB bytes are not independently recomputed.
`.\F097-xml-audit.ps1 -RunRoot <absolute-capsule-path> -Phase before -Verify`: passed; all34 exact actual definitions/results, positive durations/no skips.
`.\F097-xml-audit.ps1 -RunRoot <absolute-capsule-path> -Phase baseline-newtests -IncludeProposedTests -Verify`: passed; all40 exact actual definitions/results, positive durations/no skips.
`.\F097-xml-audit.ps1 -RunRoot <absolute-capsule-path> -Phase baseline-tunedtests -IncludeProposedTests -IncludeExplicitTokenTest -Verify`: passed; all41 exact actual definitions/results, positive durations/no skips.
`.\F097-xml-audit.ps1 -RunRoot <absolute-capsule-path> -Phase after -IncludeProposedTests -IncludeExplicitTokenTest -Verify`: passed; all41 exact actual definitions/results, positive durations/no skips.
Semantic probes and original/proposed41-case suites are green/green preservation; same frozen original/final-harness resource test is genuinely expected exit1/red to exit0/green. Prototype1 preserved112B failure, final96B <100B; shutdown difference288B >=200B. The candidate-reuse-green attempt originally expected0 but actually exited1 on a rebuilt harness; frozen-prototype1 repeats the same failure using the actual unchanged measured harness.
Exact final external harness build log: passed,0 warnings/errors, `harness-build-tuned-after.log`. Earlier original/final builds and initial nullable-preparation adjustments remain in raw logs; no invented argument/exit-code record for uninstrumented builds. For a fresh reproduction from the repository root after activation: `dotnet build <absolute-capsule-path>\harness\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false`; this portable-path example is not an additional measured comparison or claimed new execution.
`git diff --check` and staged source check: passed, exit0; only JSRuntime54 additions/8 deletions and JSRuntimeTest132 additions, no behavior-neutral existing cleanup. `F097-verify-source.ps1`: passed, actual remote independent source/source blobs match; only permitted Git CRLF-to-LF differs from preserved measured/PDB source. Exact whitespace command above passed, exit0.
No requested automated test was blocked before its assertion. Browser/UI/JavaScript/circuit/transport/server/WebAssembly interoperability, every-disposal-race, application frequency/hot-path/throughput and isolated object-layout/first-use performance are intentionally unverified. Public audits recheck recorded proofs/closure, not omitted raw executables.
