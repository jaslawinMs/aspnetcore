# F111 exact historical commands and actual outcomes

Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. Exactly six28-case profiles constitute3 closed comparisons;no fourth run. Failed compiler/formatter-argument/auditor attempts remain failures,not passing tests or extra source comparisons.

## browser\candidate2-build\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## browser\candidate2-server\execution.json: actual HTTP200 readiness;both exact own PIDs observed stopped;natural exit code not captured
```powershell
dotnet 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-build' '--no-restore' '-c' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```

## browser\original-build\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## browser\original-server\execution.json: actual HTTP200 readiness;both exact own PIDs observed stopped;natural exit code not captured
```powershell
dotnet 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-build' '--no-restore' '-c' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```

## characterization\candidate1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\AutoPerf.Benchmarks.dll' '--characterize' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'candidate1' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\characterization\candidate1'
```

## characterization\candidate2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.dll' '--characterize' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'candidate2' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\characterization\candidate2'
```

## characterization\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'original' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\characterization\original'
```

## characterization\original\fixture-execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.dll' '--create-fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture'
```

## development\audit-initial\execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F111-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111'
```

## development\audit-marker-shape-corrected\execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F111-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111'
```

## format-execution.json: actual exit1
```powershell
dotnet 'format' 'whitespace' '--folder' '--no-restore' '--verify-no-changes' '--include' 'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs' 'src\Components\Endpoints\test\TempData\JsonStoredDataSerializerTest.cs' '--verbosity' 'minimal'
```

## format2-execution.json: actual exit0
```powershell
dotnet 'format' 'whitespace' '--folder' '--verify-no-changes' '--include' 'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs' 'src\Components\Endpoints\test\TempData\JsonStoredDataSerializerTest.cs' '--verbosity' 'minimal'
```

## harness-build-candidate1-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-build-candidate2-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-build-initial-command.json: actual exit1
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## harness-build-original-compile2-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## measurements\comparison1\candidate1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison1\candidate1' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'candidate1'
```

## measurements\comparison1\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison1\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'original'
```

## measurements\comparison2\candidate2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison2\candidate2' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'candidate2'
```

## measurements\comparison2\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison2\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'original'
```

## measurements\comparison3\candidate2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison3\candidate2' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'candidate2'
```

## measurements\comparison3\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*StoredDataBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\measurements\comparison3\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\fixture' '--variant' 'original'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\harness\Program.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Cases.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\harness\Cases.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\harness\Workload.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'JsonStoredDataSerializer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'SessionStorageTempDataProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\src\Components\Endpoints\src\TempData\SessionStorageTempDataProvider.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentsServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\Microsoft.AspNetCore.Session.pdb' 'DistributedSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\src\Middleware\Session\src\DistributedSession.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate1\Microsoft.AspNetCore.Session.pdb' 'DistributedSessionStore.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate1\src\Middleware\Session\src\DistributedSessionStore.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\harness\Program.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.pdb' 'Cases.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\harness\Cases.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\harness\Workload.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Components.Endpoints.pdb' 'JsonStoredDataSerializer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Components.Endpoints.pdb' 'SessionStorageTempDataProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Components\Endpoints\src\TempData\SessionStorageTempDataProvider.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentsServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Session.pdb' 'DistributedSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Middleware\Session\src\DistributedSession.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Session.pdb' 'DistributedSessionStore.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Middleware\Session\src\DistributedSessionStore.cs'
```

## symbols\candidate2\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\candidate2\Microsoft.AspNetCore.Components.Endpoints.pdb' 'PooledArrayBufferWriter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\candidate2\src\Shared\PooledArrayBufferWriter.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\harness\Program.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.pdb' 'Cases.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\harness\Cases.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\harness\Workload.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'JsonStoredDataSerializer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'SessionStorageTempDataProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\src\Components\Endpoints\src\TempData\SessionStorageTempDataProvider.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentsServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\Microsoft.AspNetCore.Session.pdb' 'DistributedSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\src\Middleware\Session\src\DistributedSession.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\binaries\original\Microsoft.AspNetCore.Session.pdb' 'DistributedSessionStore.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\frozen-source\original\src\Middleware\Session\src\DistributedSessionStore.cs'
```

## tests\candidate1\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.ReserializingDeserializedData_IsByteIdentical|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.RoundTrip_SaveAndLoad_WorksCorrectly|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_ThrowsForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_RemovesSessionEntry_WhenNoDataToSave|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeData_Preserves' '--logger' 'trx;LogFileName=owning-candidate1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\tests\candidate1' '-v:minimal'
```

## tests\candidate2\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.ReserializingDeserializedData_IsByteIdentical|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.RoundTrip_SaveAndLoad_WorksCorrectly|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_ThrowsForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_RemovesSessionEntry_WhenNoDataToSave|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeData_Preserves' '--logger' 'trx;LogFileName=owning-candidate2.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\tests\candidate2' '-v:minimal'
```

## tests\original-new-controls\execution.json: actual exit1
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.ReserializingDeserializedData_IsByteIdentical|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.RoundTrip_SaveAndLoad_WorksCorrectly|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_ThrowsForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_RemovesSessionEntry_WhenNoDataToSave|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeData_Preserves' '--logger' 'trx;LogFileName=owning-original-new-controls.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\tests\original-new-controls' '-v:minimal'
```

## tests\original-new-controls2\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.ReserializingDeserializedData_IsByteIdentical|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.RoundTrip_SaveAndLoad_WorksCorrectly|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_ThrowsForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_RemovesSessionEntry_WhenNoDataToSave|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeData_Preserves' '--logger' 'trx;LogFileName=owning-original-new-controls2.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\tests\original-new-controls2' '-v:minimal'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.ReserializingDeserializedData_IsByteIdentical|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.RoundTrip_SaveAndLoad_WorksCorrectly|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_ThrowsForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest.Save_RemovesSessionEntry_WhenNoDataToSave' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F111\tests\original' '-v:minimal'
```

## Actual canonical browser original: exit0,ready/stored/read/consumed passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F111-browser.mjs' 'original' 'http://127.0.0.1:56747'
```

## Actual canonical browser candidate2: exit0,ready/stored/read/consumed passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F111-browser.mjs' 'candidate2' 'http://127.0.0.1:63161'
```

## Independent fork source publication: actual push/ref/all three canonical blobs passed
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F111-stored-data-buffer'
gh 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F111-stored-data-buffer'
```
Actual fork commit:c007585c146990fce6d320dc01dfc68ecd153cc1. Measured binaries predate it and retain their captured identities.

## Copied portable audit: actual exit0, passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F111\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F111' --verify
```
168 outcomes/1344 retained results/504 warmups/3088 actual overheads/168 hash-PID setup state files/252 complete contracts/420 calipers/42 passing exact TRX rows0skips/25 source-PDB document checks verified. Console markers echo label+contract only;no missing binary/runtime rehash,PE/PDB binding,method coverage,cold/retained memory or application-speedup proof is claimed.
