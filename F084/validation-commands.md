# Exact F084 validation commands and results

Commands ran from C:\src\aspnetcore after `. .\activate.ps1`. CPU-heavy commands were serialized and builds used two workers. All20 new rows and78 existing directory-browser rows are validated individually;the unguarded prototype is an expected-red control.

## Original owning suite:passed98/98,all20 new rows,exit0

```powershell
dotnet 'test' 'src\Middleware\StaticFiles\test\UnitTests\Microsoft.AspNetCore.StaticFiles.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~HtmlDirectoryFormatterTests|FullyQualifiedName~DirectoryBrowserMiddlewareTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Rejected unguarded prototype:96 passes/2 expected custom-override failures,exit1

```powershell
dotnet 'test' 'src\Middleware\StaticFiles\test\UnitTests\Microsoft.AspNetCore.StaticFiles.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~HtmlDirectoryFormatterTests|FullyQualifiedName~DirectoryBrowserMiddlewareTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\tests-naive-defaultless' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## First guarded owning suite:passed98/98,all20 new rows,exit0

```powershell
dotnet 'test' 'src\Middleware\StaticFiles\test\UnitTests\Microsoft.AspNetCore.StaticFiles.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~HtmlDirectoryFormatterTests|FullyQualifiedName~DirectoryBrowserMiddlewareTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected depth-gated owning suite:passed98/98,all20 new rows,exit0

```powershell
dotnet 'test' 'src\Middleware\StaticFiles\test\UnitTests\Microsoft.AspNetCore.StaticFiles.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~HtmlDirectoryFormatterTests|FullyQualifiedName~DirectoryBrowserMiddlewareTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\tests-after-2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original harness build:passed,exit0;new external manifest justified restore

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## First guarded harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected harness build:passed,exit0

```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original complete response contracts:passed24/24,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\before\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-before.json' '--responses' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-before-responses'
```

## First guarded response contracts:passed24/24,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\after\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-after.json' '--responses' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-after-responses'
```

## Selected response contracts:passed24/24,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\after-2\AutoPerf.Benchmarks.dll' '--contracts' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-after-2.json' '--responses' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\contracts-after-2-responses'
```

## Focused whitespace:passed,exit0

```powershell
dotnet 'format' 'whitespace' '--folder' '--include' 'src\Middleware\StaticFiles\src\HtmlDirectoryFormatter.cs' 'src\Middleware\StaticFiles\test\UnitTests\HtmlDirectoryFormatterTests.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## before source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\before\Microsoft.AspNetCore.StaticFiles.pdb' 'HtmlDirectoryFormatter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\source-before.cs'
```

## harness-DirectoryFixture.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\before\AutoPerf.Benchmarks.pdb' 'DirectoryFixture.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\DirectoryFixture.cs'
```

## harness-DirectoryBenchmark.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\before\AutoPerf.Benchmarks.pdb' 'DirectoryBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\DirectoryBenchmark.cs'
```

## harness-Program.cs source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\harness\Program.cs'
```

## after source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\after\Microsoft.AspNetCore.StaticFiles.pdb' 'HtmlDirectoryFormatter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\source-after.cs'
```

## after-2 source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\binaries\after-2\Microsoft.AspNetCore.StaticFiles.pdb' 'HtmlDirectoryFormatter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\source-after-2.cs'
```

## test-source source/PDB:passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.StaticFiles.Tests\Release\net12.0\Microsoft.AspNetCore.StaticFiles.Tests.pdb' 'HtmlDirectoryFormatterTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F084\source-tests.cs'
```
