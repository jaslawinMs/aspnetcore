# Exact F091 commands and outcomes

Every fresh dotnet shell activated `. .\activate.ps1` from C:\src\aspnetcore. Builds request -m:2; CPU-heavy work is serialized. Three measured comparisons are complete and the budget is closed.

## bdn-discovery-before-command.json: Passed, exit 0; precise reached boundary in README and record

[bdn-discovery-before-command.json](bdn-discovery-before-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--list' 'flat' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\discovery-before'
```

## format-whitespace-command.json: Passed, exit 0; precise reached boundary in README and record

[format-whitespace-command.json](format-whitespace-command.json)
```powershell
dotnet 'format' 'whitespace' 'src\Security\Authentication\Google\src\Microsoft.AspNetCore.Authentication.Google.csproj' '--include' 'src\Security\Authentication\Google\src\GoogleHandler.cs' '--no-restore' '--verify-no-changes' '--verbosity' 'quiet'
```

## frozen-after-2-verify-command.json: Passed, exit 0; precise reached boundary in README and record

[frozen-after-2-verify-command.json](frozen-after-2-verify-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\after-2\AutoPerf.Benchmarks.dll' '--verify'
```

## frozen-after-verify-command.json: Passed, exit 0; precise reached boundary in README and record

[frozen-after-verify-command.json](frozen-after-verify-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\after\AutoPerf.Benchmarks.dll' '--verify'
```

## frozen-before-verify-command.json: Passed, exit 0; precise reached boundary in README and record

[frozen-before-verify-command.json](frozen-before-verify-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\before\AutoPerf.Benchmarks.dll' '--verify'
```

## harness-build-after-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-build-after-command.json](harness-build-after-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-build-before-attempt-1-command.json: Failed, exit 1; retained preparation failure, not successful coverage

[harness-build-before-attempt-1-command.json](harness-build-before-attempt-1-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-c' 'Release' '--no-restore'
```

## harness-build-before-attempt-2-command.json: Failed, exit 1; retained preparation failure, not successful coverage

[harness-build-before-attempt-2-command.json](harness-build-before-attempt-2-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-c' 'Release' '--no-restore'
```

## harness-build-before-attempt-3-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-build-before-attempt-3-command.json](harness-build-before-attempt-3-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-c' 'Release' '--no-restore'
```

## harness-build-before-attempt-4-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-build-before-attempt-4-command.json](harness-build-before-attempt-4-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false' '-c' 'Release' '--no-restore'
```

## harness-build-before-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-build-before-command.json](harness-build-before-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-build-before-initial-preservation-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-build-before-initial-preservation-command.json](harness-build-before-initial-preservation-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-restore-before-attempt-1-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-restore-before-attempt-1-command.json](harness-restore-before-attempt-1-command.json)
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-restore-before-attempt-2-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-restore-before-attempt-2-command.json](harness-restore-before-attempt-2-command.json)
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-restore-before-attempt-3-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-restore-before-attempt-3-command.json](harness-restore-before-attempt-3-command.json)
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-restore-before-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-restore-before-command.json](harness-restore-before-command.json)
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-verify-after-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-verify-after-command.json](harness-verify-after-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## harness-verify-before-attempt-3-command.json: Failed, exit -532462766; retained preparation failure, not successful coverage

[harness-verify-before-attempt-3-command.json](harness-verify-before-attempt-3-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## harness-verify-before-attempt-4-command.json: Failed, exit -532462766; retained preparation failure, not successful coverage

[harness-verify-before-attempt-4-command.json](harness-verify-before-attempt-4-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## harness-verify-before-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-verify-before-command.json](harness-verify-before-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## harness-verify-before-initial-preservation-command.json: Passed, exit 0; precise reached boundary in README and record

[harness-verify-before-initial-preservation-command.json](harness-verify-before-initial-preservation-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## preparation-field-source-harness-build-before-command.json: Passed, exit 0; precise reached boundary in README and record

[preparation-field-source-harness-build-before-command.json](preparation-field-source-harness-build-before-command.json)
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## preparation-field-source-harness-verify-before-command.json: Passed, exit 0; precise reached boundary in README and record

[preparation-field-source-harness-verify-before-command.json](preparation-field-source-harness-verify-before-command.json)
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify'
```

## tests-after-command.json: Passed, exit 0; precise reached boundary in README and record

[tests-after-command.json](tests-after-command.json)
```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Authentication.Google.GoogleTests' '--logger' 'trx;LogFileName=F091-google-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## tests-before-command.json: Passed, exit 0; precise reached boundary in README and record

[tests-before-command.json](tests-before-command.json)
```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Authentication.Google.GoogleTests' '--logger' 'trx;LogFileName=F091-google-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## round-1-before: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: Passed, exit 0; all 26 cases/eight retained results/three actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*GoogleChallengeBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F091\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

Original Google test selector: 50/50 actual cases passed; selected: 50/50 passed; zero skipped, matching actual TRX identities. The exact commands are tests-before-command.json and tests-after-command.json above. No new trivial Boolean test is substituted for the actual owner.
Both final frozen --verify commands pass all 26 complete query/state/PKCE contracts. The BDN declaration conversion failure occurred before any workload timing and is separately preserved. Missing reference/endpoint assumption failures are preparation records, not completed assertions.
Scoped `dotnet format whitespace ... --verify-no-changes` passes, exit 0. `git diff --check` and the exact one-file committed-source check pass. Recorded owner/harness portable-PDB checks pass; omitted binary/PDB bytes are not rehashed by the public audit.
`node .\reproduce-analysis.mjs . --verify` passes: 156 outcomes/setups, 1248 raw console-linked result samples, 468 warmups, exact GC totals/rounding, full source/PDB-record/closure checks. `F091-xml-audit.ps1 -RunRoot <package> -Verify` passes all 100 actual unskipped test rows without modifying records.
