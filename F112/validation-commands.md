# F112 exact historical commands and actual outcomes

Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. Exactly two28-case profiles form one closed comparison;two allowed comparisons are intentionally unused. Recorded absolute paths identify the actual run;historical guards prevent overwrites and reruns.

## browser\candidate1-build\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## browser\candidate1-server\execution.json: actual responsive HTTP200 owner endpoint;both exact own PIDs stopped;natural exit code not captured
```powershell
dotnet 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-build' '--no-restore' '-c' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```

## browser\original-build\execution.json: actual exit0
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## browser\original-build\restore-execution.json: actual exit0
```powershell
.\restore.cmd '-projects' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '-NoBuildNative' '-NoBuildNodeJS' '-NoBuildJava' '-NoBuildInstallers' '/m:2' '-verbosity:quiet'
```

## browser\original-server\execution.json: actual responsive HTTP200 owner endpoint;both exact own PIDs stopped;natural exit code not captured
```powershell
dotnet 'run' '--project' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-build' '--no-restore' '-c' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:0'
```

## characterization\candidate1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\AutoPerf.Benchmarks.dll' '--characterize' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\fixture' '--variant' 'candidate1' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\characterization\candidate1'
```

## characterization\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\fixture' '--variant' 'original' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\characterization\original'
```

## characterization\original\fixture-execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.dll' '--create-fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\fixture'
```

## development\audit-initial\execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F112-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112'
```

## format-execution.json: actual exit0
```powershell
dotnet 'format' 'whitespace' '--folder' '--verify-no-changes' '--include' 'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs' 'src\Components\Endpoints\test\TempData\JsonStoredDataSerializerTest.cs' '--verbosity' 'minimal'
```

## harness-build-candidate1-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-build-configured-await-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-build-initial-command.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## measurements\comparison1\candidate1\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\AutoPerf.Benchmarks.dll' '--filter' '*StoredValueBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\measurements\comparison1\candidate1' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\fixture' '--variant' 'candidate1'
```

## measurements\comparison1\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*StoredValueBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\measurements\comparison1\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove' '--fixture' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\fixture' '--variant' 'original'
```

## source-fetch-command.json: actual exit0
```powershell
git 'fetch' '--quiet' '--no-tags' '--no-recurse-submodules' 'origin' 'main'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\harness\Program.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Cases.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\harness\Cases.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\harness\Workload.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'JsonStoredDataSerializer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'SessionCascadingValueSupplier.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\SessionCascadingValueSupplier.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'EndpointHtmlRenderer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'EndpointHtmlRenderer.Prerendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.Prerendering.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentResultExecutor.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\Results\RazorComponentResultExecutor.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentsServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Session.pdb' 'DistributedSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Middleware\Session\src\DistributedSession.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Session.pdb' 'DistributedSessionStore.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Middleware\Session\src\DistributedSessionStore.cs'
```

## symbols\candidate1\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\candidate1\Microsoft.AspNetCore.Components.Endpoints.pdb' 'PooledArrayBufferWriter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\candidate1\src\Shared\PooledArrayBufferWriter.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\harness\Program.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.pdb' 'Cases.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\harness\Cases.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\harness\Workload.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'JsonStoredDataSerializer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'SessionCascadingValueSupplier.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\SessionCascadingValueSupplier.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'EndpointHtmlRenderer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'EndpointHtmlRenderer.Prerendering.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.Prerendering.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentResultExecutor.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\Results\RazorComponentResultExecutor.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Components.Endpoints.pdb' 'RazorComponentsServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Session.pdb' 'DistributedSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Middleware\Session\src\DistributedSession.cs'
```

## symbols\original\commands.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\binaries\original\Microsoft.AspNetCore.Session.pdb' 'DistributedSessionStore.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\frozen-source\original\src\Middleware\Session\src\DistributedSessionStore.cs'
```

## tests\candidate1\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTrips_ToDeclaredType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumToItsOwnType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsCollection_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumList_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumDictionary_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsNullableEnumArray_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_SetsValueInSession|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_RemovesKey_WhenCallbackReturnsNull|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_ContinuesOnCallbackException|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_Preserves' '--logger' 'trx;LogFileName=owning-candidate1.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\tests\candidate1' '-v:minimal'
```

## tests\original-new-controls\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTrips_ToDeclaredType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumToItsOwnType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsCollection_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumList_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumDictionary_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsNullableEnumArray_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_SetsValueInSession|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_RemovesKey_WhenCallbackReturnsNull|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_ContinuesOnCallbackException|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_Preserves' '--logger' 'trx;LogFileName=owning-original-new-controls.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\tests\original-new-controls' '-v:minimal'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTrips_ToDeclaredType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumToItsOwnType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsCollection_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumList_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsEnumDictionary_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsNullableEnumArray_ToSourceType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.SerializeValue_RoundTripsObjectArrayRecursively|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_SetsValueInSession|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_RemovesKey_WhenCallbackReturnsNull|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_Throws_ForUnsupportedType|FullyQualifiedName=Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest.PersistAllValues_ContinuesOnCallbackException' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F112\tests\original' '-v:minimal'
```

## Actual canonical browser original: exit0,six exact transitions passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F112-browser.mjs' 'original' 'http://127.0.0.1:59579'
```

## Resource goals original: passed0,failed7;all35 expected rows inspected
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F112-resource-check.mjs' 'original' --initialize
```

## Actual canonical browser candidate1: exit0,six exact transitions passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F112-browser.mjs' 'candidate1' 'http://127.0.0.1:53418'
```

## Resource goals candidate1: passed7,failed0;all35 expected rows inspected
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F112-resource-check.mjs' 'candidate1'
```

## Independent source publication: actual push/ref/all3 canonical blobs passed;commit03ccc90e1b18f4ec3d888f617019349bf6c65310
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F112-stored-value-buffer'
```

## Copied portable audit: actual exit0;56 outcomes/448 results/168 warmups/1000 overheads/112 contracts/280 calipers/48 passing TRX rows/23 PDB document checks
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F112\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F112' --verify
```
