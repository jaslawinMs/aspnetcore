# F039 exact validation and measurement commands

Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\src\aspnetcore` and `. .\activate.ps1`.
These receipts are evidence, not replay/overwrite instructions. The source-comparison budget is permanently closed.

## validation\Tests-original-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\validation\Tests-original-1'
```

## validation\Tests-original-2\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\validation\Tests-original-2'
```

## validation\Tests-candidate-1\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~TempData' '--logger' 'trx;LogFileName=TempData.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\validation\Tests-candidate-1'
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

## validation\HarnessBuild-original-1\command.json

**Result: failed, preserved, native exit 1.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\harness\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## validation\HarnessBuild-original-2\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\harness\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## harness-build-v2\restore-command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\harness-v2\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## harness-build-v2\build-command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\harness-v2\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## selenium-build-candidate-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## selenium-candidate-producer-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanCheckIfTempDataContainsKey' '--logger' 'trx;LogFileName=F039-TempDataCookieTest-producer.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\selenium-candidate-producer-001'
```

## selenium-candidate-remaining-001\command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataCanPersistThroughNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataCanPersistThroughDifferentPages|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataPeekDoesntDelete|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataKeepAllElements|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataKeepOneElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanRemoveTheElementWithRemove|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.TempDataPreservesTypedArrays|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.SupplyParameterFromTempDataReadsAndSavesValues|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.StreamingSSR_CookieTempData_DoesNotPersistValuesWrittenAfterFirstFlush' '--logger' 'trx;LogFileName=F039-TempDataCookieTest-remaining.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\selenium-candidate-remaining-001'
```

## reproduction-candidate-001\build-commands.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## reproduction-candidate-001\build-commands.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## reproduction-candidate-001\characterize-command.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'characterize' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\reproduction-candidate-001\reports'
```

## measure-original-001\completion.json

**Result: failed, preserved, native exit -532462766.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-001\reports'
```

## measure-original-002\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-002\reports'
```

## measure-candidate-002\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-candidate-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-candidate-002\reports'
```

## measure-original-003\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-original-002\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-original-003\reports'
```

## measure-candidate-003\completion.json

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-candidate-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\preparation-candidate-002\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F039\measure-candidate-003\reports'
```

The untimed original harness first failed to compile with CS0136 (shadowed local); all seven failing source inputs and output are retained.
Attempt 1 then failed before timing because BDN rejects a sealed fixture. It consumed an authorization. The corrected non-sealed fixture adds actual untimed public BenchmarkConverter discovery of all 40 cases.
Both source variants pass 74 managed rows, 0 skipped, including all eight new theory rows and the consumed-value fact. These are preservation checks, not a semantic-bug red/green claim.
Actual canonical static-SSR browser results pass eight full cookie-backed transitions on each source version, with zero page/console errors.
Ten existing nonquarantined TempDataCookieTest facts pass after the dependency-aware Debug E2E build. TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is not selected or counted.
The exact corrected seven-file project independently restores/builds/characterizes without extra timing. All owned sample/Selenium helpers are stopped.
