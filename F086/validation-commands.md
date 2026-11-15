# Exact F086 validation commands andresults

Dotnet ran after `. .\activate.ps1` fromC:\src\aspnetcore. CPU-heavy work serialized,MSBuild two workers. Full-file formatter isnot green:baseline/current both reportthe same3 untouched diagnostics;actual changed-line audit isgreen.

## Initial new-test compile:exit1,missing System import,no assertions reached;corrected before original proof

```powershell
dotnet 'test' 'src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ListAdapterTest|FullyQualifiedName~ObjectVisitorTest|FullyQualifiedName~AdapterFactoryTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original owning suite:passed83/83,all7 new rows,exit0

```powershell
dotnet 'test' 'src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ListAdapterTest|FullyQualifiedName~ObjectVisitorTest|FullyQualifiedName~AdapterFactoryTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected strong-cache prototype:82pass/1 expected real list-Type lifetime failure,exit1;following element-Type assertion not reached

```powershell
dotnet 'test' 'src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ListAdapterTest|FullyQualifiedName~ObjectVisitorTest|FullyQualifiedName~AdapterFactoryTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\tests-naive-strong' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected weak-cache owning suite:passed83/83,all7 new rows,exit0

```powershell
dotnet 'test' 'src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~ListAdapterTest|FullyQualifiedName~ObjectVisitorTest|FullyQualifiedName~AdapterFactoryTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original harness build:passed,exit0,new external manifest justifies restore

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected harness build:passed,exit0,--no-restore

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original actual public/state/cold contracts:passed28/28,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\before\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\contracts-before.json' '--states' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\contracts-before-states'
```

## Selected actual public/state/cold contracts:passed28/28,exit0;56 exact state files equal

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\after\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\contracts-after.json' '--states' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\contracts-after-states'
```

## Actual main full-file formatter reproduction:exit2,three original test-file whitespace diagnostics

Working directory:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\formatting-baseline.
```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs' 'src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs' '--verify-no-changes' '--verbosity' 'quiet' '--report' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\formatting-before-report'
```

## Selected full-file formatter:exit2,same three original diagnostics;zero added-line violations

```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs' 'src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs' '--verify-no-changes' '--verbosity' 'quiet' '--report' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\formatting-after-report'
```

## before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\before\Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb' 'ListAdapter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\source-before.cs'
```

## test-source source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests\Release\net12.0\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.pdb' 'ListAdapterTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\source-tests.cs'
```

## harness-JsonPatchFixture.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\before\AutoPerf.Benchmarks.pdb' 'JsonPatchFixture.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\harness\JsonPatchFixture.cs'
```

## harness-JsonPatchBenchmark.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\before\AutoPerf.Benchmarks.pdb' 'JsonPatchBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\harness\JsonPatchBenchmark.cs'
```

## harness-Program.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\harness\Program.cs'
```

## naive-strong source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests\Release\net12.0\Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb' 'ListAdapter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\source-naive-strong.cs'
```

## selected-test-source source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests\Release\net12.0\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.pdb' 'ListAdapterTest.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\source-tests.cs'
```

## after source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\binaries\after\Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb' 'ListAdapter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F086\source-after.cs'
```

## Raw arithmetic/XML/fresh-type/source/closure/changed-line audit:passed,exit0

`node .\reproduce-analysis.mjs . --verify`

`node .\formatting-audit.mjs . --verify` passed,exit0:baseline-only violations mapped exactly. `git diff --check` passed,exit0. Complete closure verifier passed,exit0:152 files/70 runtime assets,owner DLL/PDB only.
