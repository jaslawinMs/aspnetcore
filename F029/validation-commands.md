# F029 exact recorded commands and actual outcomes

Historical observations,not overwrite/replay instructions. One original-only four-case profile and zero source comparisons. Both budgets permanently closed. Expected native preparation failures and formatting failures are retained as failures,not relabeled passes. Activate the repository SDK before every dotnet command.

## profiles\original-diagnostic\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\consumer\AutoPerf.Benchmarks.dll' '--mode' 'diagnose' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\original-diagnostic' '--filter' '*'
```

## profiles\formatted-reproduction-characterized\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\formatted-reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\formatted-reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\formatted-reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\formatted-reproduction-characterized'
```

## reproduction-preparation\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\relocated-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## reproduction-preparation\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## reproduction-preparation\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '--check'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F029-sync-partial-source:refs/heads/autoperf/F029-sync-partial-source'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F029-sync-partial-source'
```

## validation\format-runnable\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\SettingsPreservingEmitToolchain.cs'
```

## validation\original-existing\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\validation\original-existing' '-v' 'minimal'
```

## validation\whitespace\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verify-no-changes' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\SettingsPreservingEmitToolchain.cs'
```

## validation\whitespace-folder\invocation.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness' '--no-restore' '--verify-no-changes' '--verbosity' 'minimal' '--folder' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\SettingsPreservingEmitToolchain.cs'
```

## profiles\reproduction-characterized\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\reproduction-characterized'
```

## validation\whitespace-folder-002\invocation.json: actual exit2
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness' '--verify-no-changes' '--verbosity' 'minimal' '--folder' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-004\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation-004\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-004\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-005\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation-005\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-005\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## profiles\characterize-original\invocation.json: actual exit-532462766
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\characterize-original'
```

## profiles\characterize-original-002\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-003\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-003\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-003\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\characterize-original-002'
```

## preparation-003\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-003\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-files' '--others' '--exclude-standard'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' 'c882d21133342f3e10ba346f4533a0189811207c^{commit}'
```

## initial-actual-invocations.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F029-sync-partial-source'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F029-sync-partial-source'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F029-sync-partial-source' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:global.json'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:global.json'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'c882d21133342f3e10ba346f4533a0189811207c:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..c882d21133342f3e10ba346f4533a0189811207c' '--' 'src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs' 'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt' 'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs' 'src/Mvc/Mvc.Razor/src/RazorView.cs' 'src/Mvc/Mvc.Razor/src/RazorPage.cs' 'src/Mvc/Mvc.Razor/src/RazorPageBase.cs' 'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj' 'src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs' 'src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs&per_page=8&sha=c882d21133342f3e10ba346f4533a0189811207c'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'HtmlHelperPartialExtensions' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'issues' 'Partial synchronous async' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'MVC1000' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/diagnostics/mvc1000.md?ref=6dfdff09330bd75429991b46b97d340b07cc5d6a'
```

## initial-actual-invocations.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/runtime/contents/src/libraries/System.Private.CoreLib/src/System/Runtime/CompilerServices/TaskAwaiter.cs?ref=dfd6ac738610ea05f42e704be82b386e71052e12'
```

## formatted-reproduction-preparation\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## formatted-reproduction-preparation\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## formatted-reproduction-preparation\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation\build-invocation.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-002\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation-002\Microsoft.AspNetCore.Mvc.Razor-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-002\Microsoft.AspNetCore.Mvc.ViewFeatures-build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '-c' 'Release' '--no-restore' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-v' 'minimal'
```

## preparation-003\build-invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\characterize-original-004\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-005\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\characterize-original-004'
```

## profiles\characterize-original-003\invocation.json: actual exit-532462766
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-004\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-004\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\preparation-004\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\profiles\characterize-original-003'
```

## validation\whitespace-runnable\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness' '--verify-no-changes' '--verbosity' 'minimal' '--folder' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\PartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F029\harness\SettingsPreservingEmitToolchain.cs'
```

## Interpretation and boundaries
Original existing owning scope:34passed,0failed,0skipped;all TRX identities and each required Partial theory row parsed. This is original preservation evidence,not an optimization red/green test.
Initial standalone build fails CS1503 with2CS8602warnings. Next154-file consumer builds but untimed native characterization fails missing Hosting.Abstractions,actual exit-532462766. Broader294-file closure has one EventLog warning;explicit package unification removes it before timing. A later untimed gate conjunction fails,actual exit-532462766;exact failed conjunct not recorded. Sampled pending-thread observation and raw precondition capture replace mutable-state resampling before timing.
Authoritative measured and byte-exact relocated builds:0warnings/0errors;each4completed and6pending actual HtmlHelper/RazorView/RazorPage producer contracts pass. Original-only diagnostic:4reports/32retained results,one profile,zero source comparisons. No optimization gain or API-ranking claim;largest CV exceeds33percent.
Initial project-based formatter exit0 has workspace warnings and is not direct five-file proof. Direct-folder invalid flag combination and actual whitespace failures remain. Only runnable copy is subsequently whitespace formatted;historical measured sources/images remain byte-exact. Final direct five-file whitespace check passes. Formatted build passes with7CA2007/CA1829analyzer warnings,0errors;formatted4/6producer characterization passes,no additional timing.
Original/byte-exact relocated live audit rehashes685unique physical files/984bindings,including588consumer and348loaded assembly bindings. Formatted consumer294files and loaded bindings separately rehashed. Portable audits rehash copied text/receipts,not omitted native bytes.

## Copied read-only audits: actual exit0,passed during packaging
```powershell
node .\F029-audit.mjs . --verify
node .\F029-audit-publication.mjs . --verify
```
Four means/32results,sample variance/SD/SE,34fresh TRX identities,original/relocated producer gates/settings/source-PDB receipts and formatted-runnable evidence verified. Allocation/CI values retained,not independently attributed or recomputed from GC/distribution primitives.
