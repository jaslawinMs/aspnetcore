# Exact F095 commands and actual outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serialized; builds use max2 nodes. Three unchanged-strategy AB/BA/AB comparisons are closed3/3. The guarded prototype is not retained in shipping source.

## harness-restore-command.json: Passed, exit0; New external manifest restore
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-preparation1-command.json: Passed, exit0; Initial preparation build only; not producer verification
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-preparation2-command.json: Failed, exit1; Failed preparation compile:CS0173; corrected before freeze
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-preparation3-command.json: Passed, exit0; Corrected preparation build only
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## original-preparation-verify-command.json: Failed, exit-532462766; Failed initial producer setup:incomplete normal RazorPages service registration; not a passing behavioral check
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\original-preparation-verify'
```

## harness-preparation4-command.json: Passed, exit0; Final original harness build:0 warnings/errors
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## original-preparation2-verify-command.json: Passed, exit0; Corrected actual original producer:12 cases/4 pending fault-cancel callers/4x5000 zero-byte batches
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\original-preparation2-verify'
```

## test-before-command.json: Passed, exit0; All6 actual original owning test rows
```powershell
dotnet 'test' 'src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultPageLoaderTest' '--logger' 'trx;LogFileName=F095-loader-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-after-command.json: Passed, exit0; All6 actual prototype owning test rows
```powershell
dotnet 'test' 'src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultPageLoaderTest' '--logger' 'trx;LogFileName=F095-loader-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-build-after-command.json: Passed, exit0; Prototype build:0 warnings/errors; identical retained original harness
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## verify-before-command.json: Passed, exit0; Frozen original:12 actual cases/4 actual pending faults-cancellation/4x5000 zero-byte batches
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\verify-before'
```

## verify-after-command.json: Passed, exit0; Frozen prototype:matching actual producer/functional/resource observations; green/green, not allocation red/green
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\verify-after'
```

## build-restored-command.json: Passed, exit0; Actual original shipping owner rebuilt byte-identically:0 warnings/errors
```powershell
dotnet 'build' 'src\Mvc\Mvc.RazorPages\src\Microsoft.AspNetCore.Mvc.RazorPages.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-restored-command.json: Passed, exit0; All6 actual restored owning test rows; test-loaded owner DLL matches measured original
```powershell
dotnet 'test' 'src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~DefaultPageLoaderTest' '--logger' 'trx;LogFileName=F095-loader-restored.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\tests-restored' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'PageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\source-before\PageLoader.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\Program.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.pdb' 'LoaderLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderLifecycle.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.pdb' 'LoaderBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderBenchmark.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.pdb' 'LoaderProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderProbe.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'DefaultPageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\Infrastructure\DefaultPageLoader.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'IPageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\Infrastructure\IPageLoader.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'DefaultPageApplicationModelProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\ApplicationModels\DefaultPageApplicationModelProvider.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.Razor.pdb' 'DefaultViewCompiler.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.Razor\src\Compilation\DefaultViewCompiler.cs'
```

## Actual before source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\Microsoft.AspNetCore.Mvc.Razor.pdb' 'CompiledRazorAssemblyPart.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'PageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\source-after\PageLoader.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\Program.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.pdb' 'LoaderLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderLifecycle.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.pdb' 'LoaderBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderBenchmark.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.pdb' 'LoaderProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\harness\LoaderProbe.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'DefaultPageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\Infrastructure\DefaultPageLoader.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'IPageLoader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\Infrastructure\IPageLoader.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.RazorPages.pdb' 'DefaultPageApplicationModelProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.RazorPages\src\ApplicationModels\DefaultPageApplicationModelProvider.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.Razor.pdb' 'DefaultViewCompiler.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.Razor\src\Compilation\DefaultViewCompiler.cs'
```

## Actual after source portable-PDB inspection: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\Microsoft.AspNetCore.Mvc.Razor.pdb' 'CompiledRazorAssemblyPart.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\producer-source\src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs'
```

## round-1-before: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: Passed, exit0; all12 actual cases/8 retained results/3 actual warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*LoaderBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F095\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

`node .\reproduce-analysis.mjs . --verify`: Passed, exit0; all72 raw outcomes/36 pairs/576 actual console-linked results/216 warmups/72 hash-PID-linked setups, GC/statistics/CI arithmetic, actual source/PDB-record/full recorded closure/default-blob/producer/resource/test/restoration checks. Distribution quantiles and omitted DLL/PDB bytes are not independently revalidated by this public command.
`.\F095-xml-audit.ps1 -RunRoot . -Variants before,after,restored -Verify`: Passed; all18 actual rows/definitions/positive durations/6 exact matching identities per variant, no skips.
`git diff --check` and `git diff --quiet`: Passed, exit0; shipping source restored clean while unrelated untracked reports remain.
`git push autoperf autoperf/F095-sync-page-loader`: Passed, exit0; fork-only independent unchanged baseline branch.
`gh api repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F095-sync-page-loader`: Passed, exit0; actual source ref is37e809ead5824bc753a1c3d56f11615bdb1296c5.
