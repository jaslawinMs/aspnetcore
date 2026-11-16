# F103 actual commands and outcomes

Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. CPU-heavy work serialized/max2 build nodes. Three actual source comparisons/six preserved10-case sweeps;the exact original harness is used in every image. Final source was built from37e809e plus the recorded patch before its later source commit.

## harness-build-candidate-1-command.json/row1: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--verbosity' 'minimal'
```

## harness-build-candidate-2-command.json/row1: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--verbosity' 'minimal'
```

## harness-build-candidate-3-command.json/row1: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--verbosity' 'minimal'
```

## harness-build-final-command.json/row1: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--verbosity' 'minimal'
```

## harness-whitespace-apply-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verbosity' 'quiet'
```

## harness-whitespace-verify-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--verify-no-changes' '--verbosity' 'quiet'
```

## pdb-candidate-1-commands.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'AnalyzerBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerBenchmark.cs'
```

## pdb-candidate-1-commands.json/row2: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'AnalyzerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerProbe.cs'
```

## pdb-candidate-1-commands.json/row3: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'CompilationWorkload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\CompilationWorkload.cs'
```

## pdb-candidate-1-commands.json/row4: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'ProducerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\ProducerProbe.cs'
```

## pdb-candidate-1-commands.json/row5: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\Program.cs'
```

## pdb-candidate-1-commands.json/row6: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedAnalyzer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
```

## pdb-candidate-1-commands.json/row7: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentFacts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\ComponentFacts.cs'
```

## pdb-candidate-1-commands.json/row8: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentSymbols.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\ComponentSymbols.cs'
```

## pdb-candidate-1-commands.json/row9: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'DiagnosticDescriptors.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\DiagnosticDescriptors.cs'
```

## pdb-candidate-1-commands.json/row10: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedCodeFixProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs'
```

## pdb-candidate-1-commands.json/row11: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'ComponentBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\ComponentBase.cs'
```

## pdb-candidate-1-commands.json/row12: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'EventCallback.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\EventCallback.cs'
```

## pdb-candidate-1-commands.json/row13: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'EventCallbackFactory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\EventCallbackFactory.cs'
```

## pdb-candidate-2-commands.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.pdb' 'AnalyzerBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerBenchmark.cs'
```

## pdb-candidate-2-commands.json/row2: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.pdb' 'AnalyzerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerProbe.cs'
```

## pdb-candidate-2-commands.json/row3: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.pdb' 'CompilationWorkload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\CompilationWorkload.cs'
```

## pdb-candidate-2-commands.json/row4: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.pdb' 'ProducerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\ProducerProbe.cs'
```

## pdb-candidate-2-commands.json/row5: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\Program.cs'
```

## pdb-candidate-2-commands.json/row6: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedAnalyzer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
```

## pdb-candidate-2-commands.json/row7: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentFacts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Analyzers\src\ComponentFacts.cs'
```

## pdb-candidate-2-commands.json/row8: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentSymbols.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Analyzers\src\ComponentSymbols.cs'
```

## pdb-candidate-2-commands.json/row9: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.Analyzers.pdb' 'DiagnosticDescriptors.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Analyzers\src\DiagnosticDescriptors.cs'
```

## pdb-candidate-2-commands.json/row10: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedCodeFixProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs'
```

## pdb-candidate-2-commands.json/row11: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.pdb' 'ComponentBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Components\src\ComponentBase.cs'
```

## pdb-candidate-2-commands.json/row12: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.pdb' 'EventCallback.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Components\src\EventCallback.cs'
```

## pdb-candidate-2-commands.json/row13: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\Microsoft.AspNetCore.Components.pdb' 'EventCallbackFactory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-2\src\Components\Components\src\EventCallbackFactory.cs'
```

## pdb-candidate-3-commands.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.pdb' 'AnalyzerBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerBenchmark.cs'
```

## pdb-candidate-3-commands.json/row2: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.pdb' 'AnalyzerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerProbe.cs'
```

## pdb-candidate-3-commands.json/row3: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.pdb' 'CompilationWorkload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\CompilationWorkload.cs'
```

## pdb-candidate-3-commands.json/row4: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.pdb' 'ProducerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\ProducerProbe.cs'
```

## pdb-candidate-3-commands.json/row5: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\Program.cs'
```

## pdb-candidate-3-commands.json/row6: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedAnalyzer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
```

## pdb-candidate-3-commands.json/row7: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentFacts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Analyzers\src\ComponentFacts.cs'
```

## pdb-candidate-3-commands.json/row8: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentSymbols.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Analyzers\src\ComponentSymbols.cs'
```

## pdb-candidate-3-commands.json/row9: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.Analyzers.pdb' 'DiagnosticDescriptors.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Analyzers\src\DiagnosticDescriptors.cs'
```

## pdb-candidate-3-commands.json/row10: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedCodeFixProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs'
```

## pdb-candidate-3-commands.json/row11: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.pdb' 'ComponentBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Components\src\ComponentBase.cs'
```

## pdb-candidate-3-commands.json/row12: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.pdb' 'EventCallback.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Components\src\EventCallback.cs'
```

## pdb-candidate-3-commands.json/row13: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\Microsoft.AspNetCore.Components.pdb' 'EventCallbackFactory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-3\src\Components\Components\src\EventCallbackFactory.cs'
```

## pdb-original-commands.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.pdb' 'AnalyzerBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerBenchmark.cs'
```

## pdb-original-commands.json/row2: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.pdb' 'AnalyzerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerProbe.cs'
```

## pdb-original-commands.json/row3: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.pdb' 'CompilationWorkload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\CompilationWorkload.cs'
```

## pdb-original-commands.json/row4: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.pdb' 'ProducerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\ProducerProbe.cs'
```

## pdb-original-commands.json/row5: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\Program.cs'
```

## pdb-original-commands.json/row6: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedAnalyzer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
```

## pdb-original-commands.json/row7: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentFacts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Analyzers\src\ComponentFacts.cs'
```

## pdb-original-commands.json/row8: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentSymbols.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Analyzers\src\ComponentSymbols.cs'
```

## pdb-original-commands.json/row9: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.Analyzers.pdb' 'DiagnosticDescriptors.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Analyzers\src\DiagnosticDescriptors.cs'
```

## pdb-original-commands.json/row10: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedCodeFixProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs'
```

## pdb-original-commands.json/row11: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.pdb' 'ComponentBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Components\src\ComponentBase.cs'
```

## pdb-original-commands.json/row12: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.pdb' 'EventCallback.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Components\src\EventCallback.cs'
```

## pdb-original-commands.json/row13: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\Microsoft.AspNetCore.Components.pdb' 'EventCallbackFactory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\original\src\Components\Components\src\EventCallbackFactory.cs'
```

## portable-audit-development-2-command.json/row1: actual exit1
```powershell
node F103-reproduce-analysis.mjs <absolute-actual-run>
```

## portable-audit-development-3-command.json/row1: actual exit1
```powershell
node F103-reproduce-analysis.mjs <absolute-actual-run>
```

## portable-audit-development-4-command.json/row1: actual exit1
```powershell
node F103-reproduce-analysis.mjs <absolute-actual-run>
```

## portable-audit-development-5-command.json/row1: actual exit0
```powershell
node F103-reproduce-analysis.mjs <absolute-actual-run>
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'AnalyzerBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerBenchmark.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row2: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'AnalyzerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AnalyzerProbe.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row3: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'CompilationWorkload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\CompilationWorkload.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row4: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'ProducerProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\ProducerProbe.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row5: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\Program.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row6: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedAnalyzer.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row7: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentFacts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\ComponentFacts.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row8: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'ComponentSymbols.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\ComponentSymbols.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row9: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'DiagnosticDescriptors.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\DiagnosticDescriptors.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row10: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.Analyzers.pdb' 'StateHasChangedCodeFixProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row11: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'ComponentBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\ComponentBase.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row12: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'EventCallback.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\EventCallback.cs'
```

## premeasurement-rejected-pdb-candidate-1-commands.json/row13: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\Microsoft.AspNetCore.Components.pdb' 'EventCallbackFactory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\variant-source\candidate-1\src\Components\Components\src\EventCallbackFactory.cs'
```

## premeasurement-unavailable-three-argument-harness-build-candidate-2-command.json/row1: actual exit1
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--verbosity' 'minimal'
```

## premeasurement-unavailable-three-argument-source-whitespace-candidate-2-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--verify-no-changes' '--include' 'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs' '--verbosity' 'quiet'
```

## source-whitespace-candidate-1-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--verify-no-changes' '--include' 'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs' '--verbosity' 'quiet'
```

## source-whitespace-candidate-2-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--verify-no-changes' '--include' 'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs' '--verbosity' 'quiet'
```

## source-whitespace-candidate-3-command.json/row1: actual exit0
```powershell
dotnet 'format' 'whitespace' 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj' '--no-restore' '--verify-no-changes' '--include' 'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs' '--verbosity' 'quiet'
```

## verification-candidate-1-command.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\verification\candidate-1'
```

## verification-candidate-2-command.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\verification\candidate-2'
```

## verification-candidate-3-command.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\verification\candidate-3'
```

## verification-original-command.json/row1: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\verification\original'
```

## Actual retained original ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual retained candidate-1 ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-1\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\candidate-1' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual retained original-2 ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\original-2' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual retained candidate-2 ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-2\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\candidate-2' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual retained original-3 ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\original-3' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual retained candidate-3 ten-case BDN sweep: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\binaries\candidate-3\AutoPerf.Benchmarks.dll' '--filter' '*AnalyzerBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\measurements\candidate-3' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual original thirty owning controls: actual exit0
Original control record preserves exact filter `FullyQualifiedName~StateHasChangedAnalyzerTest|FullyQualifiedName~StateHasChangedCodeFixProviderTest`, source revision and actual exit;full original argv was not retained in this record and is not invented. Actual original30-row TRX/source/PDB/owner/compiler proof is included.

## Actual candidate-3 thirty owning controls: actual exit0
```powershell
dotnet 'test' 'src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~StateHasChangedAnalyzerTest|FullyQualifiedName~StateHasChangedCodeFixProviderTest' '--logger' 'trx;LogFileName=owning-candidate-3.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F103\tests\candidate-3' '-v:minimal'
```

Actual final controls:30 passed/0 failed/0 skipped,positive durations/exact result-definition-execution IDs/two source-PDB associations/test-output owner matches the measured image. Existing diagnostic/code-fix controls are not red-green performance tests.
Final standalone harness build:actual0 errors/4 known warnings CS0618/RS1038/RS1041/RS1036. Later incremental0-warning output is not treated as resolving those warnings. Failed three-argument netstandard2.0 build:actualexit1/six CS1503 errors,premeasurement;not a consumed source comparison.

## Exact measured source branch:passed,actual push/ref/blob retrieval exits0
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F103-statehaschanged-component-caches'
gh 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F103-statehaschanged-component-caches'
```
Actual source commit `a9f0ee96b218a16ec41513580535c0beb8388e7c`/parent37e809e/canonical remote bytes verified;one tracked source file changed.

`node .\reproduce-analysis.mjs <absolute-capsule> --verify`:passed,exit0 against exact copied/deduplicated artifacts;60 outcomes/480 results/180 workload warmups/20 overhead samples/60 hash-PID setups/128 input proofs/9472 input-byte mappings/20 source identities/13 source-PDB associations per image/17 observations/10 producers/10 process-wide calipers/30 original+30 final controls. Actual median-overhead subtraction/GC rounding/sample/R7 percentile/recorded CI arithmetic checked;confidence critical values/omitted DLL/PDB/runtime-pack bytes/method coverage/causal speedup not claimed.
`node F103-closure.mjs <absolute-actual-local-run> <variant> --verify`:passed before/after actual sweeps;98 copied application files/29 declared assets/exact two-file candidate differences. Requires omitted local binary images;not a portable binary rehash.
