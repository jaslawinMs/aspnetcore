# F030 exact recorded commands and actual outcomes

Historical observations,not overwrite/replay instructions. One original-only four-case profile,zero source comparisons,both budgets permanently closed. Native pending gates are untimed. Activate the repository SDK before every dotnet command.

## profiles\reproduction-characterized\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\profiles\reproduction-characterized'
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
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F030-sync-render-partial-source:refs/heads/autoperf/F030-sync-render-partial-source'
```

## source-publication\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F030-sync-render-partial-source'
```

## reproduction-preparation\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\SettingsPreservingEmitToolchain.cs'
```

## reproduction-preparation\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## reproduction-preparation\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\relocated-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\characterize-original\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\profiles\characterize-original'
```

## preparation-002\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-002\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-002\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation\actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\RenderPartialRendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation\actual-invocations.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
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

## initial-actual-invocations.json: actual exit128
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' '25c0a37129f0b855634604704b4989638d59021d^{commit}'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'fetch' '--no-tags' 'origin' '25c0a37129f0b855634604704b4989638d59021d'
```

## initial-actual-invocations.json: actual exit1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F030-sync-render-partial-source'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F030-sync-render-partial-source'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F030-sync-render-partial-source' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
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
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:global.json'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:global.json'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..25c0a37129f0b855634604704b4989638d59021d' '--' 'src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs' 'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt' 'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs' 'src/Mvc/Mvc.Razor/src/RazorView.cs' 'src/Mvc/Mvc.Razor/src/RazorPage.cs' 'src/Mvc/Mvc.Razor/src/RazorPageBase.cs' 'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj' 'src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs' 'src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs&per_page=8&sha=25c0a37129f0b855634604704b4989638d59021d'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'RenderPartial' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'issues' 'RenderPartial synchronous' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
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

## validation\original-existing\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\validation\original-existing' '-v' 'minimal'
```

## profiles\original-diagnostic\invocation.json: actual exit0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\consumer\AutoPerf.Benchmarks.dll' '--mode' 'diagnose' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\preparation-002\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F030\profiles\original-diagnostic' '--filter' '*'
```

## Interpretation and boundaries
Fresh existing owning scope:34passed,0failed,0skipped. Every actual TRX identity/result is parsed. Four synchronous immediate exception rows;both three-row expected-argument methods use async MemberData and are not claimed as pending/synchronous-success evidence.
First standalone preparation:direct formatting passes,build exits1 with two CS0136 diagnostic-local pattern-variable collisions;exact failed formatted sources remain. Names corrected before any native run or timing. Measured preparation-002 and byte-exact relocated reproduction:direct five-file whitespace checks and Release builds pass,0warnings/0errors.
Both native characterizations pass4completed wrappers/6pending success/failure/cancellation producer contracts through actual parent RazorView/CSharp page,public helper,actual partial RazorView/page and real scoped MVC buffer. The pending synchronous outer render has not returned a task,excluding a harness-side GetResult as the observed wait. Ordered caller output,exact errors/cancellation,ViewData,view disposal and caller writer lifetime checked.
One original-only native diagnostic passes4reports/32retained results;every Workload.Result sample matches native stdout and JSON,means/variance/SD/SE recomputed. Eight before/after settings observations match. All variability/outlier results retained,no API-ranking or optimization gain. Allocation/CI values retained,not independent GC/distribution derivation.
Live audit physically rehashes685unique files/984bindings,including588consumer and348loaded assembly bindings. Portable audit rehashes copied text/receipts,not omitted DLL/PDB/native bytes. Source/PDB witnesses are associations,not complete provenance/coverage.

## Copied read-only audit: actual exit0,passed during packaging
```powershell
node .\F030-audit.mjs . --verify
```
