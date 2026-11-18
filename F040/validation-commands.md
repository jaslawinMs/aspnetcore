# F040 exact validation and measurement commands

Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\src\aspnetcore` and `. .\activate.ps1`.
These receipts are evidence, not replay/overwrite instructions. The source-comparison budget is permanently closed.

## validation\InitialManagedBuild-original-1\command.json

**Result: failed, preserved, native exit 1.**

```powershell
& 'C:\src\aspnetcore\eng\build.cmd' '-BuildManaged' '-NoRestore' '-NoBuildNative' '-NoBuildNodeJS' '-NoBuildJava' '-NoBuildInstallers' '-Configuration' 'Release' '-verbosity:quiet' '/p:UseIisNativeAssets=false' '/p:UseSharedCompilation=false' '/maxcpucount:2' '/nodeReuse:false'
```

## validation\Tests-original-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\validation\Tests-original-1'
```

## validation\Tests-original-2\command.json

**Result: failed, preserved, native exit 1.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\validation\Tests-original-2'
```

## validation\Tests-original-3\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\validation\Tests-original-3'
```

## validation\Tests-candidate-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\validation\Tests-candidate-1'
```

## validation\Format-candidate-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '--verify-no-changes' '--include' 'C:\src\aspnetcore\src\Components\Endpoints\src\TempData\TempData.cs' 'C:\src\aspnetcore\src\Components\Endpoints\test\TempData\TempDataTest.cs' '--verbosity' 'quiet'
```

## validation\SampleBuild-original-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## validation\SampleBuild-candidate-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## validation\HarnessRestore-original-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\harness\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## validation\HarnessBuild-original-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\harness\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## characterize-original-001\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'characterize' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\characterize-original-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\characterize-original-001\reports'
```

## characterize-candidate-001\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'characterize' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\characterize-candidate-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\characterize-candidate-001\reports'
```

## selenium-build-candidate-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## selenium-candidate-producer-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanRemoveTheElementWithRemove' '--logger' 'trx;LogFileName=F040-TempDataCookieTest-producer.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\selenium-candidate-producer-001'
```

## selenium-candidate-remaining-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataCanPersistThroughNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataCanPersistThroughDifferentPages|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataPeekDoesntDelete|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataKeepAllElements|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataKeepOneElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanCheckIfTempDataContainsKey|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataPreservesTypedArrays|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.SupplyParameterFromTempDataReadsAndSavesValues|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.StreamingSSR_CookieTempData_DoesNotPersistValuesWrittenAfterFirstFlush' '--logger' 'trx;LogFileName=F040-TempDataCookieTest-remaining.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\selenium-candidate-remaining-001'
```

## reproduction-candidate-001\build-commands.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## reproduction-candidate-001\build-commands.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## reproduction-candidate-001\characterize-command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'characterize' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\reproduction-candidate-001\reports'
```

## measure-original-001\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-001\reports'
```

## measure-candidate-001\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-001\reports'
```

## measure-original-002\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-002\reports'
```

## measure-candidate-002\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-002\reports'
```

## measure-original-003\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-original-003\reports'
```

## measure-candidate-003\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F040\measure-candidate-003\reports'
```

## Actual canonical browser sample: original

**Result: eight real cookie-backed navigations passed; framework JS 200; zero page/console errors; owned helpers stopped.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--configuration' 'Release' '--no-build' '--no-restore' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```
Executed browser driver: `node F040-browser-probe.mjs original`; exact server and browser state are retained under `raw\sample-original`.

## Actual canonical browser sample: candidate

**Result: eight real cookie-backed navigations passed; framework JS 200; zero page/console errors; owned helpers stopped.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--configuration' 'Release' '--no-build' '--no-restore' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```
Executed browser driver: `node F040-browser-probe.mjs candidate`; exact server and browser state are retained under `raw\sample-candidate`.

The broad initial managed build failed in unchanged Framework.App.Runtime packaging: MSB4057 CreateWixInstaller and NETSDK1094 ReadyToRun runtime package.
No global successful-initialization marker was created and no unrelated fix/config/restore change was made. Documented focused-project fallback was used; this is not a repository-wide or packaging pass.
The first added-theory compilation failed with CS8632 because its existing test project disables nullable annotations. Its exact failing source and output are retained; only the new theory adopted the existing oblivious-object style.
The later original and candidate runs each pass 73 rows, including all eight CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad cases, 0 skipped.
These are behavior-preserving optimization checks, not a semantic-bug red/green claim.
Ten existing nonquarantined TempDataCookieTest facts pass after the dependency-aware Debug E2E build. String-key Remove is adjacent coverage, not direct collection Remove proof.
TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is neither selected nor counted as passed.
The exact seven-file project independently restores/builds/characterizes, with no extra timing. All owned sample/Selenium helpers are gone.
