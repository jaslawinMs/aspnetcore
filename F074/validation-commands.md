# Exact successful F074 validation commands

Commands executed after `. .\activate.ps1` from the repository root. Every command below exited0; original and proposed preservation are not functional-red bug-fix evidence.
## Original canonical sample build:passed,exit0

```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Proposed canonical sample build:passed,exit0

```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original managed preservation:passed47/47,exit0

```powershell
dotnet 'test' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ServerComponentDeserializerTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\tests-original' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Proposed managed preservation:passed47/47,exit0

```powershell
dotnet 'test' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ServerComponentDeserializerTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original owning Selenium preservation:passed15/15,exit0

```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~RenderFragmentSerializationTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\e2e-original-exact-utf16-v2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false' '-p:TestTrimmedApps=false'
```

## Proposed owning Selenium preservation:passed15/15,exit0

```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~RenderFragmentSerializationTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\e2e-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false' '-p:TestTrimmedApps=false'
```

## Original untimed actual-owner contracts:passed24/24,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\harness-original-contracts-v2\contracts.json'
```

## Proposed untimed actual-owner contracts:passed24/24,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\binaries\after\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F074\harness-after-contracts\contracts.json'
```
