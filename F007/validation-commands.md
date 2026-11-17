# F007 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three spent timing slots:failed original-only Setup in1,no samples;two final order-reversed identical-harness pairs in2/3,88 successful reports. No extra timing.

## audit-attempts\attempt-1\execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F007-reproduce-analysis.mjs'
```

## audit-attempts\attempt-2\execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F007-reproduce-analysis.mjs'
```

## build\original-attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\build\original-attempt1\harness-build.binlog'
```

## build\original-attempt2\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\build\original-attempt2\harness-build.binlog' '--no-restore'
```

## build\original-attempt3\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\build\original-attempt3\harness-build.binlog' '--no-restore'
```

## build\original-attempt4\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\build\original-attempt4\harness-build.binlog' '--no-restore' '-t:Rebuild' '--no-dependencies'
```

## characterization\candidate-1-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\characterization\candidate-1-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\candidate-1' '--context' 'candidate-1' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\candidate-1\test-image\Microsoft.AspNetCore.Components.Server.Tests.dll'
```

## characterization\candidate-1-attempt2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\characterization\candidate-1-attempt2' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\candidate-1' '--context' 'candidate-1' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\candidate-1\test-image\Microsoft.AspNetCore.Components.Server.Tests.dll'
```

## characterization\original-attempt1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\characterization\original-attempt1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\original\test-image\Microsoft.AspNetCore.Components.Server.Tests.dll'
```

## characterization\original-attempt2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\characterization\original-attempt2' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\original\test-image\Microsoft.AspNetCore.Components.Server.Tests.dll'
```

## investigation\execution.json: actual exit0
```powershell
git 'rev-parse' 'HEAD'
```

## investigation\execution.json: actual exit0
```powershell
git 'branch' '--show-current'
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
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/Circuits/ServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/Circuits/ServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/Circuits/IServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/Circuits/IServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/Microsoft.AspNetCore.Components.Server.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/Microsoft.AspNetCore.Components.Server.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/Circuits/ComponentParameterDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/Circuits/ComponentParameterDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/ComponentHub.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/ComponentHub.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/src/Circuits/CircuitPersistenceManager.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/src/Circuits/CircuitPersistenceManager.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Shared/src/RootComponentOperation.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Shared/src/RootComponentOperation.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Shared/src/RootComponentOperationBatch.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Shared/src/RootComponentOperationBatch.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Shared/src/RootComponentOperationType.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Shared/src/RootComponentOperationType.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Shared/src/RootTypeCache.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Shared/src/RootTypeCache.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Shared/Components/ServerComponentSerializationSettings.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Shared/Components/ServerComponentSerializationSettings.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Shared/Components/ServerComponentSerializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Shared/Components/ServerComponentSerializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/test/Circuits/ServerComponentDeserializerTest.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/test/Circuits/ServerComponentDeserializerTest.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/test/Circuits/ServerComponentDeserializerTest.Unions.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/test/Circuits/ServerComponentDeserializerTest.Unions.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Components/Server/test/Microsoft.AspNetCore.Components.Server.Tests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Components/Server/test/Microsoft.AspNetCore.Components.Server.Tests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'diff' '37e809ead5824bc753a1c3d56f11615bdb1296c5' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'log' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--max-count=12' '--follow' '--format=%H %ad %s' '--date=iso-strict' '--' 'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'log' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--max-count=5' '-p' '--' 'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
```

## investigation\execution.json: actual exit0
```powershell
gh 'search' 'prs' 'ServerComponentDeserializer' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,state,url'
```

## investigation\execution.json: actual exit0
```powershell
gh 'search' 'prs' '"Duplicate component ID"' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,state,url'
```

## measurements\comparison-1\execution.json: actual exit-532462766
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\original\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\measurements\comparison-1\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\original' '--context' 'original' '--filter' '*'
```

## measurements\comparison-2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\measurements\comparison-2\candidate-1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\candidate-1' '--context' 'candidate-1' '--filter' '*'
```

## measurements\comparison-2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\original\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\measurements\comparison-2\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\original' '--context' 'original' '--filter' '*'
```

## measurements\comparison-3\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\original\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\measurements\comparison-3\original' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\original' '--context' 'original' '--filter' '*'
```

## measurements\comparison-3\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\measurements\comparison-3\candidate-1' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\frozen-source\candidate-1' '--context' 'candidate-1' '--filter' '*'
```

## retired-harness\stale-output-during-repair\fresh-original-owner-execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\retired-harness\stale-output-during-repair\fresh-original-owner.binlog'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\candidate-1\fresh-owner-build.binlog'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\candidate-1\owning-test-build.binlog'
```

## tests\candidate-1\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~ServerComponentDeserializerTest' '--logger' 'trx;LogFileName=owning-candidate-1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\candidate-1'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\original\fresh-owner-build.binlog'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\original\owning-test-build.binlog'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~ServerComponentDeserializerTest' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F007\tests\original'
```

## Preserved preparation/setup/audit observations
Original build1 preceded larger-path controls;build2 metadata-freeze continuation encountered existing saved test-image bytes. Repair build3 retained the exact candidate owner under restored original source;hash guard rejected it before timing. Forced original owner/harness Rebuild restored exact tested bytes;clean inventory146 legitimately omitted a stale generator DLL versus147. Freeze metadata guard was corrected,not image bytes. Slot1 actual NullLogger GlobalSetup failure remains spent,zero samples. Final actual setup preflights pass. Read-only audit1 assumed lowercase enum wire text;typed serializer emits PascalCase,audit2 passes. No timing rerun or budget reset.

The first package attempt rejected the actual TypeScript producer source because its explicit allowlist omitted.ts. Its2508 byte-verified partial copies were preserved outside the run/results directories,then.ts was classified and a complete fresh capsule created. No experiment or raw source changed.

## Actual source publication: exit0,one file+9/-12,remote canonical source verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F007-root-operation-id-membership'
```

## Actual copied portable audit: exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F007\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F007' --verify
# Copied source/TRX/input/contract/raw timing/GC/settings/PDB-witness/statistics consistency passed;omitted DLL/PDB/native bytes not rehashed.
```
