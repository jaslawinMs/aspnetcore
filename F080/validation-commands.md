# Exact F080 validation commands and results

Executed from the repository root after `. .\activate.ps1`; two MSBuild workers. Preservation is green before/after, not functional-red bug-fix evidence. The rejected prototype is an unmeasured negative control.

## Original owner preservation:passed29/29,exit0

```powershell
dotnet 'test' 'src\Mvc\Mvc.TagHelpers\test\Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~GlobbingUrlBuilderTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected full-buffer prototype:expected1 failure/28 passes,exit1;filename-prefix row

```powershell
dotnet 'test' 'src\Mvc\Mvc.TagHelpers\test\Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~GlobbingUrlBuilderTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\tests-naive-unbounded' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected owner preservation:passed29/29,exit0

```powershell
dotnet 'test' 'src\Mvc\Mvc.TagHelpers\test\Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~GlobbingUrlBuilderTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original actual-owner untimed contracts:passed20 profiles/529 pairs,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\contracts-before.json'
```

## Selected actual-owner untimed contracts:passed20 profiles/529 pairs,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\binaries\after\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F080\contracts-after.json'
```

## Focused unchanged whitespace:passed,exit0

```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Mvc\Mvc.TagHelpers\src\GlobbingUrlBuilder.cs' 'src\Mvc\Mvc.TagHelpers\test\GlobbingUrlBuilderTest.cs' '--verify-no-changes' '--verbosity' 'quiet'
```
