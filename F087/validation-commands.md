# Exact F087 validation commands and results

Dotnet ran after `. .\activate.ps1` from C:\src\aspnetcore. Heavy work serialized,explicit builds/tests use `-m:2`. Baseline/current source whitespace both exit0. No fourth comparison.

## Original focused unit suite: 54pass/0fail/0skip,exit0;new lifetime assertion reached

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest|FullyQualifiedName~DefaultComplexObjectValidationStrategyTest|FullyQualifiedName~DefaultObjectValidatorTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-before-unit' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial Namesake expectation: 38pass/1 incorrect new expectation,exit1;original shared-key suppression preserved

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~UnionValidationIntegrationTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-before-integration' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Corrected original union integration: 39pass/0fail/0skip,exit0;all5 new rows reached

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~UnionValidationIntegrationTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-before-integration-corrected' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original hosted HTTP union suite: 26pass/0fail/0skip,exit0

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\test\Mvc.FunctionalTests\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~SystemTextJsonInputFormatterTest.UnionValidation_' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-before-functional-corrected' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected strong cache: 0pass/1 expected actual collectible-Type failure,exit1;unmeasured

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest.IsUnionValueProperty_DoesNotRetainCollectibleUnionType' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-strong-unit' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial empty invalidation mutation: exit1,analyzers blocked assertions;not an executed test

```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest.ClearCache_ReplacesPopulatedInterfaceMapCache' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-no-invalidation-unit' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Second invalidation setup: exit1,new nullable test context blocked assertions;not an executed test

```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest.ClearCache_ReplacesPopulatedInterfaceMapCache' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-no-invalidation-unit-corrected' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Actual no-invalidation mutation: bothfalse/true rows failed exactly atAssert.NotSame,exit1;unmeasured

```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest.ClearCache_ReplacesPopulatedInterfaceMapCache' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-no-invalidation-unit-corrected2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected focused unit suite: 56pass/0fail/0skip,exit0;all3 new rows reached

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~DefaultUnionValidationStrategyTest|FullyQualifiedName~DefaultComplexObjectValidationStrategyTest|FullyQualifiedName~DefaultObjectValidatorTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-after-unit' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected actual union integration: 39pass/0fail/0skip,exit0;all5 new rows reached

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~UnionValidationIntegrationTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-after-integration' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected hosted HTTP union suite: 26pass/0fail/0skip,exit0

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'test' 'src\Mvc\test\Mvc.FunctionalTests\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~SystemTextJsonInputFormatterTest.UnionValidation_' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\tests-after-functional' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial original harness build: exit0,4 nullable warnings;corrected before snapshots/timing

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Observed original harness build: exit0,0warnings/0errors;actual cold getter counters

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected harness build: exit0,0warnings/0errors;--no-restore

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial depth contract: 17 completed profiles thenoriginal internalstate-depth32 blocksinvalidDepth64;failed,not32/32

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-before-attempt1.json' '--states' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-before-attempt1-states'
```

## Observed original actual contracts: all32 actual profiles pass,exit0;128 actual cold getter calls

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-before-observed.json' '--states' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-before-observed-states'
```

## Controlled proposal contracts: all32 actual profiles pass,exit0;64 authoritative state files equal

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\after-2\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-after-2.json' '--states' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\contracts-after-2-states'
```

## Original whole-file whitespace: passed,exit0

Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\formatting-baseline.
```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs' 'src\Mvc\test\Mvc.IntegrationTests\UnionValidationIntegrationTest.cs' '--verify-no-changes' '--verbosity' 'quiet' '--report' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\formatting-before-report'
```

## Selected whole-file whitespace: passed,exit0

Working directory: C:\src\aspnetcore.
```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs' 'src\Mvc\test\Mvc.IntegrationTests\UnionValidationIntegrationTest.cs' 'src\Mvc\Mvc.Core\test\ModelBinding\Validation\DefaultUnionValidationStrategyTest.cs' '--verify-no-changes' '--verbosity' 'quiet' '--report' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\formatting-after-report'
```

## Initial real-watch helper: exit0,2 legacy/generatorreference warnings;corrected before realwatch

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\hot-reload-app\AutoPerf.HotReload.csproj' '-c' 'Debug' '-m:2' '-v:q'
```

## Controlled real-watch helper: exit0,0warnings/0errors,exactcontrolledowner/dependencies

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\hot-reload-app\AutoPerf.HotReload.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q'
```

## Actual real watcher: getter-bodydelta/modelstate/cache/no-restart verified;ownerPID30140,one launch;stoppedownedattachedhelper;attribute/interface-remapping probes remainunverified

Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\hot-reload-app.
```powershell
dotnet 'watch' '--project' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\hot-reload-app\AutoPerf.HotReload.csproj' '--verbose' '--non-interactive' 'run' '--no-restore'
```

## round-1-before:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\after-2\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\after-2\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after:passed32/32 measuredprofiles,8 resultiterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\after-2\AutoPerf.Benchmarks.dll' '--filter' '*Union*Benchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## owner-before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultUnionValidationStrategy.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-before.cs'
```

## unit-before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.Test.pdb' 'DefaultUnionValidationStrategyTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-unit.cs'
```

## integration-before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.IntegrationTests\Release\net12.0\Microsoft.AspNetCore.Mvc.IntegrationTests.pdb' 'UnionValidationIntegrationTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-integration.cs'
```

## functional-before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.FunctionalTests\Release\net12.0\Microsoft.AspNetCore.Mvc.FunctionalTests.pdb' 'SystemTextJsonInputFormatterTest.UnionValidation.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-functional.cs'
```

## harness-UnionFixture.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.pdb' 'UnionFixture.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\UnionFixture.cs'
```

## harness-UnionBenchmark.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.pdb' 'UnionBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\UnionBenchmark.cs'
```

## harness-Program.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\harness\Program.cs'
```

## owner-after-2 source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\binaries\after-2\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultUnionValidationStrategy.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-after.cs'
```

## unit-after source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.Test.pdb' 'DefaultUnionValidationStrategyTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-unit-after.cs'
```

## integration-after source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.IntegrationTests\Release\net12.0\Microsoft.AspNetCore.Mvc.IntegrationTests.pdb' 'UnionValidationIntegrationTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-integration.cs'
```

## functional-after source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.FunctionalTests\Release\net12.0\Microsoft.AspNetCore.Mvc.FunctionalTests.pdb' 'SystemTextJsonInputFormatterTest.UnionValidation.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-functional.cs'
```

## owner-strong source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultUnionValidationStrategy.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-strong.cs'
```

## owner-no-invalidation source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultUnionValidationStrategy.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F087\source-no-invalidation.cs'
```

## Prepared-package raw audit:passed,exit0

`node .\reproduce-analysis.mjs . --verify` verifies192 outcomes/1536 result samples/282 distinct XML executions,actual cold producer batches,64 exact states,198 owner markers,13 PDB proofs and292/121 controlled closure.

Historical `node autoperf-check-closure.mjs F087 Microsoft.AspNetCore.Mvc.Core after-2` passed,exit0. `git diff --check` andstaged source check passed,exit0. Initial rawauditor duplicate-display-name assumption was corrected without any newtiming.
