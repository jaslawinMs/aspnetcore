# F099 exact recorded commands and actual outcomes

Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. Owning source stayed at37e809ead5824bc753a1c3d56f11615bdb1296c5 without shipping edits. CPU-heavy work serialized/max2 build nodes; one original9-case actual-void/null-reply sweep, zero source comparisons. Different deadline contracts/adapter costs are not equivalent-contract optimization variants.

## frozen-generic-reuse-equivalence-red-command.json / row1: Actual exit1
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.dll' '--require-generic-reuse-equivalence' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\verification\frozen-generic-reuse-equivalence-red'
```

## frozen-original-compatible-command.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\verification\frozen-original-compatible'
```

## harness-build-final-command.json / row1: Actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '--verbosity' 'minimal'
```

## harness-restore-command.json / row1: Actual exit0
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\AutoPerf.Benchmarks.csproj' '--disable-parallel' '--verbosity' 'quiet' '-m:2' '-p:Configuration=Release'
```

## harness-whitespace-apply-command.json / row1: Actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verbosity' 'quiet'
```

## harness-whitespace-final-command.json / row1: Actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verify-no-changes' '--verbosity' 'quiet'
```

## owning-tests-original-command.json / row1: Actual exit0
```powershell
dotnet 'test' 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~JSRuntimeExtensionsTest' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\tests\original' '-v:q'
```

## owning-tests-source-pdb-command.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0\Microsoft.JSInterop.Tests.pdb' 'JSRuntimeExtensionsTest.cs' 'C:\src\aspnetcore\src\Components\JSInterop\test\JSRuntimeExtensionsTest.cs'
```

## pdb-original-commands.json / row1: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.pdb' 'CorelibEvidence.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\CorelibEvidence.cs'
```

## pdb-original-commands.json / row2: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\Program.cs'
```

## pdb-original-commands.json / row3: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.pdb' 'RuntimeBoundary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\RuntimeBoundary.cs'
```

## pdb-original-commands.json / row4: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.pdb' 'TimeoutBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\TimeoutBenchmark.cs'
```

## pdb-original-commands.json / row5: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.pdb' 'TimeoutProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\harness\TimeoutProbe.cs'
```

## pdb-original-commands.json / row6: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'JSRuntimeExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\JSRuntimeExtensions.cs'
```

## pdb-original-commands.json / row7: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'IJSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\IJSRuntime.cs'
```

## pdb-original-commands.json / row8: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'JSRuntime.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\JSRuntime.cs'
```

## pdb-original-commands.json / row9: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'PendingAsyncCall.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs'
```

## pdb-original-commands.json / row10: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'JSInvocationInfo.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs'
```

## pdb-original-commands.json / row11: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'DotNetDispatcher.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs'
```

## pdb-original-commands.json / row12: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\Microsoft.JSInterop.pdb' 'JSInteropJsonTypeInfoResolver.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\producer-source\src\Components\JSInterop\src\Infrastructure\JSInteropJsonTypeInfoResolver.cs'
```

## One actual original-only true-void BDN sweep: Actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*TimeoutBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F099\original-sweep' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

Owning tests: exit0,8 actual passed/0 failed/0 skipped; exact definition/result/execution-ID/positive-duration audit. Existing compiled unchanged baseline was run with --no-build; actual test-source/PDB and local owner equal frozen owner, not assumed freshly compiled. Frozen compatibility: actual/expected exit0 with all20 observations; frozen public-void-reset-equivalence: expected/actual exit1 because earlier successful retained reused token becomes canceled. Not a shipping replacement/red-green fix/speedup. External source format/apply and verification passed before first build; build passed0 warnings/errors. No preparation failure or unfrozen execution was substituted into F099.

## Actual independent unchanged source branch: Passed, exits0
```powershell
git --no-pager diff --check
git diff --quiet HEAD --
git 'push' 'autoperf' 'autoperf/F099-js-runtime-explicit-void-timeouts'
gh 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F099-js-runtime-explicit-void-timeouts'
```
Actual remote ref is37e809ead5824bc753a1c3d56f11615bdb1296c5; no shipping source commit or performance PR.

`node .\reproduce-analysis.mjs <absolute-capsule> --verify`: Passed, exit0 against exact copied inputs;9 true-void/null-reply outcomes/72 samples/27 warmups/9 owner-harness-PID/protocol setup receipts,11 source/Git identities,12 executable PDB records plus pure-marker source/type binding,20 original observations per frozen mode/resources,8 owning tests and GC/sample/statistical/CI arithmetic. No independent confidence-distribution quantile or omitted DLL/PDB byte check.
`.\audit-owning-tests.ps1 -RunRoot <absolute-capsule> -Verify`: Passed;8 exact positive-duration results/definitions/execution IDs, zero skips.
`node F099-closure.mjs <absolute-actual-local-run> --verify`: Passed, exit0 before/after actual sweep and before packaging;62 frozen files/20 declared runtime assets. Requires omitted original local binaries, not portable binary rehash.
