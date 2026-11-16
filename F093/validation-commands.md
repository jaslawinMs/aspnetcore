# Exact F093 commands and outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serial/max2 build nodes. Three unchanged-strategy comparisons are closed.

## harness-restore-arguments.json: Passed, exit0; new/changed external manifest restore
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## harness-build-before-arguments.json: Passed, exit0; final original, two deprecation warnings retained
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## harness-build-after-arguments.json: Passed, exit0; selected, identical retained original harness
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## test-before-arguments.json: Passed, exit0; all3 actual original request-services rows
```powershell
dotnet 'test' 'src\Http\Http\test\Microsoft.AspNetCore.Http.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultHttpContextTests.RequestServicesAre' '--logger' 'trx;LogFileName=F093-http-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-after-arguments.json: Passed, exit0; all3 actual candidate request-services rows
```powershell
dotnet 'test' 'src\Http\Http\test\Microsoft.AspNetCore.Http.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultHttpContextTests.RequestServicesAre' '--logger' 'trx;LogFileName=F093-http-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## verify-before-arguments.json: Passed, exit0; all28 actual cases/10 probes/four genuine waits/4x5000 zero-byte disposal batches
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\verification-before'
```

## verify-after-arguments.json: Passed, exit0; identical actual producer/functional/resource observations; green/green, not red/green
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\verification-after'
```

## format-whitespace-arguments.json: Passed, exit0; scoped whitespace/no changes
```powershell
dotnet 'format' 'whitespace' 'src\Http\Http\src\Microsoft.AspNetCore.Http.csproj' '--include' 'src\Http\Http\src\Features\RequestServicesFeature.cs' '--no-restore' '--verify-no-changes'
```

## build-restored-arguments.json: Passed, exit0; actual Http DLL restored byte-identically
```powershell
dotnet 'build' 'src\Http\Http\src\Microsoft.AspNetCore.Http.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-restored-arguments.json: Passed, exit0; all3 actual restored rows, matching identities/no skips
```powershell
dotnet 'test' 'src\Http\Http\test\Microsoft.AspNetCore.Http.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultHttpContextTests.RequestServicesAre' '--logger' 'trx;LogFileName=F093-http-restored.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\tests-restored' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\Microsoft.AspNetCore.Http.pdb' 'RequestServicesFeature.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\source-before.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\Program.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.pdb' 'RequestServicesLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesLifecycle.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.pdb' 'RequestServicesBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesBenchmark.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.pdb' 'RequestServicesProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesProbe.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\Microsoft.AspNetCore.Http.pdb' 'RequestServicesFeature.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\source-after.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\Program.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.pdb' 'RequestServicesLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesLifecycle.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.pdb' 'RequestServicesBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesBenchmark.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.pdb' 'RequestServicesProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\harness\RequestServicesProbe.cs'
```

## round-1-before: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: Passed, exit0; all28 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*RequestServicesBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F093\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;168 outcomes/84 pairs/1344 actual console results/504 warmups/168 hash-linked setup receipts, actual GC totals/rounding, source/PDB-record/full closure/resource/lifetime/restoration checks.
`.\F093-xml-audit.ps1 -RunRoot . -Verify`: Passed; all9 actual original/candidate/restored rows/definitions/positive durations and all3 exact matching identities/no skips. Original6 remain in actual-test-audit.json; restored3 are separately preserved in restored-test-audit.json/restoration.json. Source and actual owner DLL/PDB match measured original hashes.
`git diff --check`: Passed, exit0; source was restored clean. BDN declaration discovery: final4 exact public non-sealed methods found; earlier sealed-class command exited0 with no benchmarks and is not treated as a successful measurement. Corrected WebEncoders warning/metadata-host failure/prior logical verification are retained; no additional timed comparison.
