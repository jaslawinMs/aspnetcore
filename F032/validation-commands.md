# F032 exact recorded commands and actual outcomes

Historical observations,not overwrite/replay instructions. Three attempt slots:one setup-only failed original,then two successful six-profile pairs;budget permanently closed. One compatible Flush guard. Producer/lifecycle/relocated reproduction is untimed. Activate the repository SDK before every dotnet command.

## profiles\round-2-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\round-2-original' '--filter' '*'
```

## profiles\round-2-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\round-2-candidate' '--filter' '*'
```

## profiles\round-1-original\invocation.json:actual exit -532462766
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\round-1-original' '--filter' '*'
```

## profiles\round-3-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\round-3-original' '--filter' '*'
```

## validation\original-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_StartAsync_LocksHeadersAndTriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_TriggersOnStartingAndLocksHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_FlushesThePipe|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_PipeAdapter_AutomaticallyFlushed|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteNoHeadersAndFlush_DefaultsToChunked|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_Write_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_BeginWrite_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteAsync_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_ZeroLengthTrailingWrite_Success|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_Empty_CallsOnStartingAndOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrows_StillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrowsAfterWrite_WriteThrowsAndStillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_SyncWriteDisabledByDefault_WorksWhenEnabled|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_FlushThenWrite_DefaultsToChunkedAndTerminates' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\validation\original-existing-1' '-v' 'minimal'
```

## validation\candidate-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_StartAsync_LocksHeadersAndTriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_TriggersOnStartingAndLocksHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_CompleteAsync_FlushesThePipe|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_PipeAdapter_AutomaticallyFlushed|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteNoHeadersAndFlush_DefaultsToChunked|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_Write_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_BeginWrite_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_WriteAsync_TriggersOnStarting|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseBodyTests.ResponseBody_ZeroLengthTrailingWrite_Success|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_Empty_CallsOnStartingAndOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrows_StillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseTests.Response_OnStartingThrowsAfterWrite_WriteThrowsAndStillCallsOnCompleted|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_SyncWriteDisabledByDefault_WorksWhenEnabled|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseBodyTests.ResponseBody_FlushThenWrite_DefaultsToChunkedAndTerminates' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\validation\candidate-existing-1' '-v' 'minimal'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '--check'
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
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F032-httpsys-flush-start:refs/heads/autoperf/F032-httpsys-flush-start'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F032-httpsys-flush-start'
```

## restored-owner-build\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '--no-incremental' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\SettingsPreservingEmitToolchain.cs'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## reproduction-preparation\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\relocated-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\round-3-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\round-3-candidate' '--filter' '*'
```

## profiles\characterize-candidate-002\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\characterize-candidate-002'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## lifecycle-original-owner-rebuild-002\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '--no-incremental' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## lifecycle-original-owner-rebuild\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## lifecycle-candidate-owner-rebuild\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj' '--no-restore' '--no-incremental' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
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

## initial-actual-invocations.json:actual exit 128
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' '90d90ff3574fb9b0b59838e9cebca908e6af93c5^{commit}'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'fetch' '--no-tags' 'origin' '90d90ff3574fb9b0b59838e9cebca908e6af93c5'
```

## initial-actual-invocations.json:actual exit 1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F032-httpsys-flush-start'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F032-httpsys-flush-start'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F032-httpsys-flush-start' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
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
& 'gh' 'search' 'issues' 'HttpSys Flush OnStarting' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
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

## candidate-shipping-whitespace.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\Servers\HttpSys\src' '--folder' '--include' 'src\Servers\HttpSys\src\ResponseStream.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## audit-finalize-001.invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F032-audit.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032' '--finalize'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-original-002\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\characterize-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\characterize-candidate'
```

## preparation-original-003\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-original-003\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\FlushContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\HttpSysRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-original-003\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\reproduction-characterized\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\reproduction-characterized'
```

## profiles\characterize-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\characterize-original'
```

## profiles\characterize-original-002\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\preparation-original-003\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F032\profiles\characterize-original-002'
```

## Interpretation and boundaries
Both native owning scopes:15passed,0failed,0skipped;same30exact TRX identities/outcomes parsed,including true/false theory rows. Thirteen full-host and two lower Listener rows per variant;lower rows bypass ResponseStream.
Corrected original,candidate and independently rebuilt relocated images each pass6completed+12additional actual OnStarting/default/error/cancel/wire contracts and6actual benchmark lifecycles. Earlier18-case images and initial11warning/0error uncharacterized preparation remain. Authoritative and relocated standalone builds have0warnings/0errors.
The first timed original attempt fails in async global setup before any statistical sample,null statistics and native exit-532462766retained. Void lifecycle adapters outside timing fix the harness;profile/source strategy/emitter/package unchanged. Only two pairs complete,not three;all3slots remain consumed.
A first incremental owner rebuild exits0but leaves the candidate product,so source/owner postcondition fails. Retain the wrapper failure;forced --no-incremental,BuildProjectReferences=false owner-only recompilation byte-matches tested original/candidate DLL/PDB without test reruns.
Four successful timed members:24reported rows,all192Workload.Result samples match stdout/JSON;mean/sample variance/SD/SE recomputed. Forty-eight successful plus two failed-attempt before/after settings observations match. Prepared Sync Flush regresses about1%in both pairs;ordinary target gains reverse,async controls move and allocations differ. No convincing overall gain or structural allocation/application-throughput claim.
Live physical audit:1259unique files/5795bindings,including1116consumer and4589loaded-assembly bindings. Measured harness DLL/PDB and184otherfiles identical;onlytested HTTP.sys DLL/PDB differ. Every successful listener(47)has stopped/disposed receipt;failed process has no graceful disposal receipt but its exit/absence is recorded. Copied audit rehashes text/receipts,not omitted native bytes.

## Copied read-only audit:actual exit0,passed during packaging
```powershell
node .\F032-audit.mjs . --verify
```
