# F033 exact recorded commands and actual outcomes

Historical observations,not overwrite/replay instructions. Three complete six-profile comparison pairs;timing budget permanently closed. One compatible Write-only guard. Original/candidate/relocated producer and actual benchmark lifecycles are characterized without timing. Activate repository SDK before every dotnet command.

## profiles\round-2-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-2-candidate' '--filter' '*'
```

## profiles\round-1-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-1-candidate' '--filter' '*'
```

## profiles\round-1-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-1-original' '--filter' '*'
```

## profiles\round-3-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-3-original' '--filter' '*'
```

## reproduction-original-owner-build\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '--no-incremental' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\WriteContracts.cs'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\WriteContracts.cs' '--verify-no-changes'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\relocated-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--cached' '--name-only'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'remote' 'get-url' 'autoperf'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--cached' '--name-only'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'remote' 'get-url' 'autoperf'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--name-only'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'add' '--' 'src/Servers/HttpSys/src/ResponseStream.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--cached' '--name-only'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--cached' '--check'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'commit' '-m' 'Guard completed HTTP.sys synchronous write startup' '-m' 'Retain synchronous completion and all start/error/argument/default-IO ordering. F033 records three measured pairs with scenario-specific no-callback benefit, mixed declared callback primary, tiny prepared-zero gain and all adverse controls.' '-m' 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
Copilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD^'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'diff' '--name-only' '37e809ead5824bc753a1c3d56f11615bdb1296c5..053d19c2a36d3402243016641f3907b834084137'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '053d19c2a36d3402243016641f3907b834084137:src/Servers/HttpSys/src/ResponseStream.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' '053d19c2a36d3402243016641f3907b834084137:src/Servers/HttpSys/src/ResponseStream.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'hash-object' '--path=src/Servers/HttpSys/src/ResponseStream.cs' 'src/Servers/HttpSys/src/ResponseStream.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F033-httpsys-write-start:refs/heads/autoperf/F033-httpsys-write-start'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F033-httpsys-write-start'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/compare/main...autoperf/F033-httpsys-write-start'
```

## validation\candidate-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_StartAsync_LocksHeadersAndTriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_TriggersOnStartingAndLocksHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_FlushesThePipe|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_PipeAdapter_AutomaticallyFlushed|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteNoHeadersAndFlush_DefaultsToChunked|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_Write_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_BeginWrite_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteAsync_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_ZeroLengthTrailingWrite_Success|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_Empty_CallsOnStartingAndOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrows_StillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrowsAfterWrite_WriteThrowsAndStillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_SyncWriteDisabledByDefault_WorksWhenEnabled|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_FlushThenWrite_DefaultsToChunkedAndTerminates' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\validation\candidate-existing-1' '-v' 'minimal'
```

## validation\original-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_StartAsync_LocksHeadersAndTriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_TriggersOnStartingAndLocksHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_FlushesThePipe|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_PipeAdapter_AutomaticallyFlushed|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteNoHeadersAndFlush_DefaultsToChunked|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_Write_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_BeginWrite_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteAsync_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_ZeroLengthTrailingWrite_Success|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_Empty_CallsOnStartingAndOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrows_StillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrowsAfterWrite_WriteThrowsAndStillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_SyncWriteDisabledByDefault_WorksWhenEnabled|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_FlushThenWrite_DefaultsToChunkedAndTerminates' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\validation\original-existing-1' '-v' 'minimal'
```

## profiles\round-2-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-2-original' '--filter' '*'
```

## profiles\round-3-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\round-3-candidate' '--filter' '*'
```

## profiles\characterize-original\invocation.json:actual exit -532462766
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\characterize-original'
```

## final-candidate-owner-build\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '--no-incremental' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteContracts.cs'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteContracts.cs' '--verify-no-changes'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteContracts.cs'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\HttpSysWriting.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\WriteContracts.cs' '--verify-no-changes'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 128
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' '783dc0474326adfac8edbe6a8e8b39d65ef24fca^{commit}'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'fetch' '--no-tags' 'origin' '783dc0474326adfac8edbe6a8e8b39d65ef24fca'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/ResponseStream.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/MessagePump.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/HttpSysOptions.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/PublicAPI.Shipped.txt'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/src/PublicAPI.Unshipped.txt'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/Utilities.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '783dc0474326adfac8edbe6a8e8b39d65ef24fca:src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj'
```

## prepublication-default-refresh\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '90d90ff3574fb9b0b59838e9cebca908e6af93c5..783dc0474326adfac8edbe6a8e8b39d65ef24fca' '--' 'src/Servers/HttpSys/src/ResponseStream.cs' 'src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs' 'src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs' 'src/Servers/HttpSys/src/MessagePump.cs' 'src/Servers/HttpSys/src/HttpSysOptions.cs' 'src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs' 'src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj' 'src/Servers/HttpSys/src/PublicAPI.Shipped.txt' 'src/Servers/HttpSys/src/PublicAPI.Unshipped.txt' 'src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/Utilities.cs' 'src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs' 'src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs' 'src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj'
```

## pr-template-inventory.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-files' '--' '.github/pull_request_template.md' '.github/PULL_REQUEST_TEMPLATE' '.github/PULL_REQUEST_TEMPLATE.md'
```

## candidate-shipping-whitespace.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '--check'
```

## candidate-source-format.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\Servers\HttpSys\src' '--folder' '--include' 'C:\src\aspnetcore\src\Servers\HttpSys\src\ResponseStream.cs' '--verify-no-changes' '--verbosity' 'minimal'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-files' '--others' '--exclude-standard'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' '90d90ff3574fb9b0b59838e9cebca908e6af93c5^{commit}'
```

## initial-actual-invocations.json:actual exit 1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F033-httpsys-write-start'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F033-httpsys-write-start'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F033-httpsys-write-start' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/ResponseStream.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/ResponseStream.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/MessagePump.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/MessagePump.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/HttpSysOptions.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/HttpSysOptions.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/Utilities.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/Utilities.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:global.json'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:global.json'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:eng/Versions.props'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '90d90ff3574fb9b0b59838e9cebca908e6af93c5:eng/Versions.props'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..90d90ff3574fb9b0b59838e9cebca908e6af93c5' '--' 'src/Servers/HttpSys/src/ResponseStream.cs' 'src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs' 'src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs' 'src/Servers/HttpSys/src/MessagePump.cs' 'src/Servers/HttpSys/src/HttpSysOptions.cs' 'src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs' 'src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj' 'src/Servers/HttpSys/src/PublicAPI.Shipped.txt' 'src/Servers/HttpSys/src/PublicAPI.Unshipped.txt' 'src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs' 'src/Servers/HttpSys/test/FunctionalTests/Utilities.cs' 'src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs' 'src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs' 'src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Servers/HttpSys/src/ResponseStream.cs&per_page=8&sha=90d90ff3574fb9b0b59838e9cebca908e6af93c5'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs&per_page=8&sha=90d90ff3574fb9b0b59838e9cebca908e6af93c5'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'ResponseStream HttpSys' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'issues' 'HttpSys Write OnStarting' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'ResponseStream IsCompletedSuccessfully' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/AspNetCore.Docs/branches/main'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/fundamentals/servers/httpsys.md?ref=33a0a8d8a51f4ac99b1aeb67ffaab69519d784dd'
```

## profiles\characterize-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\characterize-candidate'
```

## profiles\reproduction-characterized\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\reproduction-characterized'
```

## profiles\characterize-original-002\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F033\profiles\characterize-original-002'
```

## Interpretation and boundaries
Both native owning scopes:15passed,0failed,0skipped;same30exact TRX identities/outcomes parsed,including true/false theory rows. Thirteen full-host and two lower Listener rows per variant;lower rows bypass ResponseStream.
Corrected original,candidate and independently rebuilt relocated source each pass6completed+22additional actual OnStarting/default/error/cancel/ranged-byte/argument/first-zero contracts and6actual benchmark lifecycles. All52concrete semantic observations match,including native past-end ArgumentOutOfRangeException(count). All standalone builds have0warnings/0errors.
The first untimed original characterization fails an assumed exact base bounds-exception assertion;negative native exit and partial contracts retained. Corrected assertions and concrete error recording pass before shipping edit/timing. Runtime-reported public source-commit lookup returns404,not compiler provenance.
Both original/candidate owner-only forced --no-incremental,BuildProjectReferences=false rebuilds byte-match previously tested DLL/PDB/source without test/timing reruns. Initial null listener aggregation retained and corrected from original per-profile counts,not a new native/CIM observation.
Six successful timed members:36rows,all288Workload.Result samples match stdout/JSON;mean/sample variance/SD/SE recomputed. Seventy-two before/after settings observations match. No-callback supporting128B profile8.23/11.47/19.10%less time;declared callback primary+3.75/-4.99/+0.54%,preparedzero1.07-2.84%less,scaled/async mixed and allocation residuals retained. Not general/default/nonzero-throughput/structural-allocation/merge-ready gain.
Live physical audit:866unique files/6386bindings,including744consumer and5576loaded-assembly bindings. Each186-file measured consumer differs in2owner DLL/PDB;184unchanged total includes2harness files,leaving182other files. Every58started native listener has stopped/disposed receipt;10recorded native PIDs observed absent. Copied audit rehashes text/receipts,not omitted native bytes.
Initial source publication guard stops on advanced upstream main;fresh16source/history parity on783dc047 passes without new comparison. Published source053d19c LF-canonical text matches tested snapshot;historical measured build remains baseline37plus uncommitted guard.

## Copied read-only audit:actual exit0,passed during packaging
```powershell
node .\F033-audit.mjs . --verify
```
