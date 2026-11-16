# Exact F092 commands and outcomes

From C:\src\aspnetcore, every fresh dotnet shell activated `. .\activate.ps1`. Builds requested -m:2; CPU-heavy commands ran serially. Three comparisons are closed.

## harness-restore-arguments.json: Passed, exit0; new external manifest restore
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## harness-build-before-arguments.json: Passed, exit0; corrected actual-owner original build, two recorded deprecation warnings
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## harness-build-after-arguments.json: Passed, exit0; candidate build, identical retained original harness
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-p:UseIisNativeAssets=false'
```

## test-before-arguments.json: Passed, exit0; all23 original actual tests, zero skips
```powershell
dotnet 'test' 'src\Hosting\TestHost\test\Microsoft.AspNetCore.TestHost.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~ResponseBodyTests|FullyQualifiedName~RequestLifetimeTests|FullyQualifiedName~ResponseResetTests|FullyQualifiedName~ResponseFeatureTests' '--logger' 'trx;LogFileName=F092-testhost-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-before-preservation-arguments.json: Passed, exit0; all26 original actual tests, including each of3 new theory rows
```powershell
dotnet 'test' 'src\Hosting\TestHost\test\Microsoft.AspNetCore.TestHost.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~ResponseBodyTests|FullyQualifiedName~RequestLifetimeTests|FullyQualifiedName~ResponseResetTests|FullyQualifiedName~ResponseFeatureTests' '--logger' 'trx;LogFileName=F092-testhost-before-preservation.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\tests-before-preservation' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-after-arguments.json: Passed, exit0; all26 selected actual tests, including each of3 new theory rows
```powershell
dotnet 'test' 'src\Hosting\TestHost\test\Microsoft.AspNetCore.TestHost.Tests.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~ResponseBodyTests|FullyQualifiedName~RequestLifetimeTests|FullyQualifiedName~ResponseResetTests|FullyQualifiedName~ResponseFeatureTests' '--logger' 'trx;LogFileName=F092-testhost-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## verify-before-arguments.json: Expected resource red: nonzero process exit; all24 actual cases/15 probes reach the strict assertion,72 extra B/read
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\before\AutoPerf.Benchmarks.dll' '--verify' '--assert-no-wrapper' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\verification-before'
```

## verify-after-arguments.json: Passed, exit0; all24 actual cases/15 probes; strict resource green,0 extra B/read
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\after\AutoPerf.Benchmarks.dll' '--verify' '--assert-no-wrapper' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\verification-after'
```

## Scoped whitespace verification: Passed, exit0, no changes
```powershell
dotnet 'format' 'whitespace' 'src\Hosting\TestHost\src\Microsoft.AspNetCore.TestHost.csproj' '--include' 'src\Hosting\TestHost\src\ResponseBodyReaderStream.cs' '--no-restore' '--verify-no-changes'
```

## Scoped whitespace verification: Passed, exit0, no changes
```powershell
dotnet 'format' 'whitespace' 'src\Hosting\TestHost\test\Microsoft.AspNetCore.TestHost.Tests.csproj' '--include' 'src\Hosting\TestHost\test\ResponseBodyTests.cs' '--no-restore' '--verify-no-changes'
```

## round-1-before: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: Passed, exit0; all24 cases,8 retained results and3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*ResponseBodyReadBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F092\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;144 outcomes,1152 console-linked results,432 actual warmups,144 actual setup receipts, GC totals/report rounding, source/PDB-record/full closure checks. `.\F092-xml-audit.ps1 -RunRoot . -Verify`: Passed;75 actual unskipped rows/definitions/durations, matching26/26 preservation identities and all3 new rows on each owner.
`git diff --check` and staged-source whitespace verification: Passed, exit0. Exact remote source comparison confirms only2 owner additions/1 deletion and27 test additions/0 deletions. Actual original-host owner/four harness-source portable-PDB inspections: Passed; public audit rechecks records/source, not omitted binaries/PDB bytes.
Three unmeasured setup failures are preserved, not claimed as resource red or successful coverage. The original strict resource failure reached its assertion only after corrected actual-owner setup. One mistaken upstream push failed without modifying upstream; corrected authorized fork source push Passed.
