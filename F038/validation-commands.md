# F038 exact validation and measurement commands

Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\src\aspnetcore` and `. .\activate.ps1`.
These receipts are evidence, not overwrite/replay instructions. The archived source-comparison budget is closed.

## validation\original-existing-1\command.json: test

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest' '--logger' 'trx;LogFileName=F038-original-1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\validation\original-existing-1'
```

## validation\candidate-existing-1\command.json: test

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj' '--configuration' 'Release' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest' '--logger' 'trx;LogFileName=F038-candidate-1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\validation\candidate-existing-1'
```

## formatting-candidate-001\command.json: format

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\Components\Components\src\Microsoft.AspNetCore.Components.csproj' '--no-restore' '--verify-no-changes' '--include' 'C:\src\aspnetcore\src\Components\Components\src\RenderTree\RenderTreeDiffBuilder.cs' '--verbosity' 'quiet'
```

## selenium-build-candidate-001\command.json: build

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false'
```

## selenium-candidate-producer-001\command.json: test

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanReorder' '--logger' 'trx;LogFileName=F038-KeyTest-producer.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\selenium-candidate-producer-001'
```

## selenium-candidate-remaining-001\command.json: test

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '--configuration' 'Debug' '--no-build' '--no-restore' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanInsert|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanDelete|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanInsertUnkeyed|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanDeleteUnkeyed|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanReorderInsertDeleteAndEdit_WithAndWithoutKeys|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanRetainFocusWhileMovingTextBox|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanUpdateCheckboxStateWhileMovingIt' '--logger' 'trx;LogFileName=F038-KeyTest-remaining.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\selenium-candidate-remaining-001'
```

## preparation-original-001\commands.json: restore

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\harness\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '--configfile' 'C:\src\aspnetcore\NuGet.config'
```

## preparation-original-001\commands.json: build

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\harness\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '--configuration' 'Release' '--no-restore'
```

## reproduction-candidate-001\build-commands.json: restore

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '--configfile' 'C:\src\aspnetcore\NuGet.config'
```

## reproduction-candidate-001\build-commands.json: build

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\reproduction-candidate-001\project\AutoPerf.Benchmarks.csproj' '-m:2' '-nr:false' '--verbosity' 'quiet' '-p:UseIisNativeAssets=false' '-p:BuildProjectReferences=false' '-p:UseSharedCompilation=false' '--configuration' 'Release' '--no-restore'
```

## measure-original-001\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-001\reports'
```

## measure-candidate-001\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-001\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-001\reports'
```

## measure-original-002\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-002\reports'
```

## measure-candidate-002\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-002\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-002\reports'
```

## measure-original-003\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'original' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-original-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-original-003\reports'
```

## measure-candidate-003\completion.json: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll

**Result: passed, native exit 0.**

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer\AutoPerf.Benchmarks.dll' 'measure' 'candidate' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-003\state' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\consumer-closure.json' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\preparation-candidate-001\sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F038\measure-candidate-003\reports'
```

The original and candidate sample builds each passed with 0 warnings/0 errors. Both actual browser-result.json receipts record five real InteractiveServer click transitions and 0 page/console errors.
The original startup-log buffering and missing bundled-browser prerequisites were isolated before assertions; actual owned listeners and installed Edge were used. No timing attempt failed and no fourth source comparison ran.
