# Exact F081 validation commands and results

Historical commands ran from C:\src\aspnetcore after `. .\activate.ps1`. Existing project suffix and two MSBuild workers are preserved. Original/selected preservation is green;the two raw-stream prototypes are expected-red compatibility controls,not measured optimizations.

## Original owner:passed41/41,15 encoding rows,exit0

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected unconditional raw stream:expected9 failures/32 passes,exit1

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-naive-stream' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial transcoding nullable compile:failedCS8604;no tests reached

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-decoding-stream' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Corrected nullable transcoding owner:passed41/41,exit0

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-decoding-stream-v2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Measured initial strategy owner:passed41/41,exit0

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original revised owner:passed43/43,17 encoding rows,exit0

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-before-tuned' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected gated raw stream:expectedInvalidUtf8Large failure/42 passes,exit1

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-gated-naive-stream' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected size-gated owner:passed43/43,17 encoding rows,exit0

```powershell
dotnet 'test' 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~FacebookTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\tests-after-tuned' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial strategy harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected strategy harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Large cancellation probe build:passed,exit0;new external manifest justified restore

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\cancellation-probe\CancellationProbe.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original standard contracts:passed20 ticket/3 small cancellation profiles,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\binaries\before\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\contracts-before.json'
```

## Initial strategy standard contracts:passed20 ticket/3 small cancellation profiles,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\binaries\after\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\contracts-after.json'
```

## Selected standard contracts:passed20 ticket/3 small cancellation profiles,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\binaries\after-2\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\contracts-after-2.json'
```

## Initial focused whitespace:passed,exit0

```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Security\Authentication\Facebook\src\FacebookHandler.cs' 'src\Security\Authentication\test\FacebookTests.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## Selected focused whitespace:passed,exit0

```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Security\Authentication\Facebook\src\FacebookHandler.cs' 'src\Security\Authentication\test\FacebookTests.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## before large cancellation:passed9/9,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\probe-binaries\before\CancellationProbe.dll' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\large-cancellation-before.json'
```

## after-2 large cancellation:passed9/9,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\probe-binaries\after-2\CancellationProbe.dll' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F081\large-cancellation-after-2.json'
```
