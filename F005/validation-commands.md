# F005 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three budgeted comparisons (first exploratory,different harness DLL/PDB;last two identical-harness controlled),six profiles with14/18/18 cases per role. No extra measurement.

## build\candidate-1-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\build\candidate-1-attempt1\harness-build.binlog' '--no-restore'
```

## build\original-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\build\original-attempt1\harness-build.binlog'
```

## build\small-controls-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\harness-small-controls\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\build\small-controls-attempt1\harness-build.binlog'
```

## characterization\candidate-1-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\characterization\candidate-1-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\candidate-1' '--context' 'candidate-1' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\candidate-1\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll'
```

## characterization\candidate-1-small-controls-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\candidate-1-small-controls\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\characterization\candidate-1-small-controls-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\candidate-1-small-controls' '--context' 'candidate-1-small-controls' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\candidate-1\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll'
```

## characterization\current-default-class-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\current-default-class\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\characterization\current-default-class-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\current-default-class' '--context' 'current-default-class'
```

## characterization\original-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\characterization\original-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\original\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll'
```

## characterization\original-small-controls-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\original-small-controls\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\characterization\original-small-controls-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\original-small-controls' '--context' 'original-small-controls' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\original\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll'
```

## current-default-class-probe-attempt1\execution.json: actual exit0
```powershell
dotnet 'msbuild' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '-nologo' '-getProperty:CustomAfterMicrosoftCommonTargets'
```

## current-default-class-probe-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:CustomAfterMicrosoftCommonTargets=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F005-current-default-class.targets' '-p:F005CapturedSource=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\current-default-canonical\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\current-default-class-probe-attempt1\captured-class-owner-build.binlog'
```

## current-default-class-probe-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\current-default-class-probe-attempt1\restore-baseline-owner-output.binlog'
```

## development\analysis-attempt1-execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F005-reproduce-analysis.mjs'
```

## development\analysis-attempt2-execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F005-reproduce-analysis.mjs'
```

## development\analysis-attempt3-execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F005-reproduce-analysis.mjs'
```

## development\analysis-attempt4-execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F005-reproduce-analysis.mjs'
```

## investigation\execution.json: actual exit0
```powershell
git 'rev-parse' 'HEAD'
```

## investigation\execution.json: actual exit0
```powershell
git 'diff' '--name-only'
```

## investigation\execution.json: actual exit0
```powershell
git 'diff' '--cached' '--name-only'
```

## investigation\execution.json: actual exit0
```powershell
git 'status' '--porcelain'
```

## investigation\execution.json: actual exit0
```powershell
git 'remote' 'get-url' 'origin'
```

## investigation\execution.json: actual exit0
```powershell
git 'branch' '--list' 'autoperf/F005-potential-iterator-symbol-membership'
```

## investigation\execution.json: actual exit0
```powershell
git 'switch' '-c' 'autoperf/F005-potential-iterator-symbol-membership' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## investigation\execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore' '--jq' '.default_branch'
```

## investigation\execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore/commits/main' '--jq' '.sha'
```

## investigation\execution.json: actual exit0
```powershell
git 'fetch' '--quiet' '--no-tags' 'origin' 'main'
```

## investigation\execution.json: actual exit0
```powershell
git 'cat-file' '-t' '49147673007a4b1d676694e2c5f85b83ad76c36f'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/src/ComponentsApi.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/src/ComponentsApi.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/src/DiagnosticDescriptors.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/src/DiagnosticDescriptors.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/src/Resources.resx'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/src/Resources.resx'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/src/Microsoft.AspNetCore.Components.Analyzers.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/src/Microsoft.AspNetCore.Components.Analyzers.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/test/ForLoopIteratorInClosureAnalyzerTest.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/test/ForLoopIteratorInClosureAnalyzerTest.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Analyzers/test/Microsoft.AspNetCore.Components.Analyzers.Tests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Analyzers/test/Microsoft.AspNetCore.Components.Analyzers.Tests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'diff' '37e809ead5824bc753a1c3d56f11615bdb1296c5' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'log' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--follow' '--format=%H %ad %s' '--date=iso-strict' '--' 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'show' '70a531e2fccbd0d22f049e968604e3d62acc9558' '--' 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'show' 'cf0040c17ca3f506240b60ca4fc9219684a73302' '--' 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'show' '1cb499475ebef1d44f9ab85a9f9fdc266a891a1d' '--' 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
```

## investigation\execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore/pulls/67228'
```

## investigation\execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore/issues/65234'
```

## investigation\execution.json: actual exit0
```powershell
gh 'search' 'prs' 'ForLoopIteratorInClosureAnalyzer' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,state,url'
```

## measurements\comparison-1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\original\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-1\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\original' '--context' 'original' '--filter' '*'
```

## measurements\comparison-1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-1\candidate-1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\candidate-1' '--context' 'candidate-1' '--filter' '*'
```

## measurements\comparison-2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\candidate-1-small-controls\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-2\candidate-1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\candidate-1-small-controls' '--context' 'candidate-1-small-controls' '--filter' '*'
```

## measurements\comparison-2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\original-small-controls\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-2\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\original-small-controls' '--context' 'original-small-controls' '--filter' '*'
```

## measurements\comparison-3\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\original-small-controls\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-3\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\original-small-controls' '--context' 'original-small-controls' '--filter' '*'
```

## measurements\comparison-3\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\binaries\candidate-1-small-controls\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\measurements\comparison-3\candidate-1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\frozen-source\candidate-1-small-controls' '--context' 'candidate-1-small-controls' '--filter' '*'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\candidate-1\fresh-owner-build.binlog'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\candidate-1\owning-test-build.binlog'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~ForLoopIteratorInClosureAnalyzerTest' '--logger' 'trx;LogFileName=owning-candidate-1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\candidate-1'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\original\fresh-owner-build.binlog'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\original\owning-test-build.binlog'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~ForLoopIteratorInClosureAnalyzerTest' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F005\tests\original'
```

## Preserved read-only inspection/audit observations
The initial PowerShell result-inspection parser exit1 is recorded in observed-inspection-error.json. Audit1 manifest-order assertion,Audit2 actual first-pair harness-byte difference andAudit3 assumed20-versus-actual19 overhead count are retained with executed source,console and exit1. Audit4 exit0. No failed build/characterization,no rewritten successful evidence and no benchmark rerun. Actual totals1999 overhead samples,not2000.

## Actual source publication: exit0,one file/four existing lines,remote canonical bytes verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F005-potential-iterator-symbol-membership'
```

## Actual copied portable audit: exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F005\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F005' --verify
# Passed copied source/TRX/compiler/raw timing/GC/settings/PDB-witness/statistics consistency. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.
```
