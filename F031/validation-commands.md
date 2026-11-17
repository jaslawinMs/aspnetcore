# F031 exact recorded commands and actual outcomes

Historical observations, not overwrite/replay instructions. Three actual source comparisons, six timed members, one compatible success-guard strategy. Budget permanently closed. Producer gates and relocated reproduction are untimed. Activate the repository SDK before every dotnet command.

## profiles\round-2-original\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-2-original' '--filter' '*'
```

## profiles\round-2-candidate\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-2-candidate' '--filter' '*'
```

## validation\original-existing\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.TemplateRendererTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultDisplayTemplatesTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultEditorTemplatesTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperDisplayExtensionsTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperEditorExtensionsTest' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\validation\original-existing' '-v' 'minimal'
```

## validation\candidate-existing\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.TemplateRendererTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultDisplayTemplatesTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultEditorTemplatesTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperDisplayExtensionsTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperEditorExtensionsTest' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\validation\candidate-existing' '-v' 'minimal'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '--check'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F031-template-completed-task:refs/heads/autoperf/F031-template-completed-task'
```

## source-publication\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F031-template-completed-task'
```

## restored-owner-build\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' '--no-restore' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '-v' 'minimal'
```

## reproduction-preparation\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateRendering.cs'
```

## reproduction-preparation\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\TemplateRendering.cs' '--verify-no-changes'
```

## reproduction-preparation\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\relocated-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\round-3-original\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-3-original' '--filter' '*'
```

## profiles\round-3-candidate\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-3-candidate' '--filter' '*'
```

## profiles\characterize-original\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\characterize-original'
```

## profiles\characterize-candidate\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\characterize-candidate'
```

## preparation-original\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateRendering.cs'
```

## preparation-original\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateContracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\TemplateRendering.cs' '--verify-no-changes'
```

## preparation-original\actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain' '--untracked-files=no'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-files' '--others' '--exclude-standard'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' '25c0a37129f0b855634604704b4989638d59021d^{commit}'
```

## initial-actual-invocations.json: actual exit 1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F031-template-completed-task'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F031-template-completed-task'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F031-template-completed-task' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/TemplateRendererTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/TemplateRendererTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/DefaultDisplayTemplatesTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/DefaultDisplayTemplatesTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/DefaultEditorTemplatesTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/DefaultEditorTemplatesTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperDisplayExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperDisplayExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperEditorExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperEditorExtensionsTest.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBuffer.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBuffer.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBufferTextWriter.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBufferTextWriter.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Buffers/PagedBufferedTextWriter.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.ViewFeatures/src/Buffers/PagedBufferedTextWriter.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorView.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorPage.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/RazorPageBase.cs'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:global.json'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:global.json'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '25c0a37129f0b855634604704b4989638d59021d:eng/Versions.props'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..25c0a37129f0b855634604704b4989638d59021d' '--' 'src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs' 'src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs' 'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt' 'src/Mvc/Mvc.ViewFeatures/test/TemplateRendererTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/DefaultDisplayTemplatesTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/DefaultEditorTemplatesTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperDisplayExtensionsTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperEditorExtensionsTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBuffer.cs' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBufferTextWriter.cs' 'src/Mvc/Mvc.ViewFeatures/src/Buffers/PagedBufferedTextWriter.cs' 'src/Mvc/Mvc.Razor/src/RazorView.cs' 'src/Mvc/Mvc.Razor/src/RazorPage.cs' 'src/Mvc/Mvc.Razor/src/RazorPageBase.cs' 'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs&per_page=8&sha=25c0a37129f0b855634604704b4989638d59021d'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'TemplateRenderer' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'issues' 'DisplayFor async' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'TemplateRenderer IsCompletedSuccessfully' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/AspNetCore.Docs/branches/main'
```

## initial-actual-invocations.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/views/display-templates.md?ref=33a0a8d8a51f4ac99b1aeb67ffaab69519d784dd'
```

## initial-actual-invocations.json: actual exit 1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/views/editor-templates.md?ref=33a0a8d8a51f4ac99b1aeb67ffaab69519d784dd'
```

## profiles\round-1-original\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-1-original' '--filter' '*'
```

## profiles\round-1-candidate\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\round-1-candidate' '--filter' '*'
```

## profiles\reproduction-characterized\invocation.json: actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\reproduction-preparation\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\reproduction-preparation\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\reproduction-preparation\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F031\profiles\reproduction-characterized'
```

## Interpretation and boundaries
Both fresh owning scopes: 525 passed, 0 failed, 0 skipped. All1050 actual TRX identities/outcomes parsed. Original test runner exits0 but its first wrapper exits1 after tests due an ordered-dictionary Measure-Object null Sum. Old wrapper and unchanged native/TRX/outcome bytes retained; corrected numeric-value aggregation reverifies the same invocation without a native test rerun.
Original measured and byte-exact relocated source preparations: direct five-file whitespace checks before freeze and Release builds pass, 0 warnings/0 errors. The candidate does not rebuild the harness: copy the original consumer and replace only actually tested ViewFeatures DLL/PDB. All other292files and measured harness DLL/PDB are identical. Restored original product DLL/PDB match original tested owner; restored owner build0warnings/0errors.
Each of original, candidate and relocated images: 6 completed profiles, 2 FindView fallbacks, 4 already-faulted/canceled real producers and 6 pending producer outcomes pass. Actual public Display/Editor, TemplateBuilder/TemplateRenderer and real RazorView/page produce the wait; no harness task wait. Ordered consumed content, encoding, exact errors/tokens, ViewData/model/prefix/additional data, view disposal and caller writer lifetime checked.
All6 timed native members succeed: 36 reported rows, all288 Workload.Result samples match native stdout and JSON; mean/sample variance/SD/SE recomputed. Seventy-two before/after settings observations match. Maximum CV32.92%; favorable long Display observations, target regressions, control movement and allocation residuals retained. No convincing overall gain, structural allocation or application-throughput claim.
Live physical audit: 1000 unique files/5200 bindings, including882consumer and4242loaded-assembly bindings. Matching frozen consumers hold both historical tested owner variants; current original product verified separately. Copied portable audit rehashes text/receipts, not omitted native bytes. Source/PDB witnesses are selected associations, not complete provenance/coverage.

## Copied read-only audit: actual exit 0, passed during packaging
```powershell
node .\F031-audit.mjs . --verify
```
