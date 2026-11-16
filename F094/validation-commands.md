# Exact F094 commands and outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serial/max2 build nodes. Three unchanged-strategy comparisons are closed; no extra timed preparation attempt.

## harness-restore-arguments.json: Passed, exit0; new pinned external manifest restore
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '--disable-parallel' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-build-before-arguments.json: Passed, exit0; final original,0 warnings/errors after archived nullability correction
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## harness-build-after-arguments.json: Passed, exit0; selected,0 warnings/errors, identical retained original harness
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-before-arguments.json: Passed, exit0; all14 actual original owning RazorPage test rows
```powershell
dotnet 'test' 'src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~RazorPageTest.RenderSection|FullyQualifiedName~RazorPageTest.ExecuteAsync_RendersSectionsAndBody|FullyQualifiedName~RazorPageTest.EnsureRenderedBodyOrSections|FullyQualifiedName~RazorPageTest.DefineSection' '--logger' 'trx;LogFileName=F094-razor-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## test-after-arguments.json: Passed, exit0; all14 selected owning RazorPage test rows, matching actual identities/no skips
```powershell
dotnet 'test' 'src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '--filter' 'FullyQualifiedName~RazorPageTest.RenderSection|FullyQualifiedName~RazorPageTest.ExecuteAsync_RendersSectionsAndBody|FullyQualifiedName~RazorPageTest.EnsureRenderedBodyOrSections|FullyQualifiedName~RazorPageTest.DefineSection' '--logger' 'trx;LogFileName=F094-razor-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## verify-before-arguments.json: Passed, exit0; all36 actual cases,4 real full-view faults, public entry/task/token and4x5000-owner calipers
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\verification-before'
```

## verify-after-arguments.json: Passed, exit0; identical actual36 signatures/4 faults, synchronous72to0B resource effect, async72B/missing0B retained
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.dll' '--verify' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\verification-after'
```

## zero-wrapper-before-arguments.json: Expected red, actual exit-532462766; assertion reached,360000 extra completed-sync wrapper bytes across5000 real primed owners
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--assert-no-completed-wrapper' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\zero-wrapper-before'
```

## zero-wrapper-after-arguments.json: Passed, exit0; identical real-producer resource assertion green,0 completed-sync wrapper bytes
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.dll' '--assert-no-completed-wrapper' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\zero-wrapper-after'
```

## format-whitespace-arguments.json: Passed, exit0; exact RazorPage whitespace seam verified without changes
```powershell
dotnet 'format' 'whitespace' 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj' '--include' 'src\Mvc\Mvc.Razor\src\RazorPage.cs' '--no-restore' '--verify-no-changes'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\Microsoft.AspNetCore.Mvc.Razor.pdb' 'RazorPage.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\source-before.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\Program.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.pdb' 'SectionLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionLifecycle.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.pdb' 'SectionBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionBenchmark.cs'
```

## Actual before portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.pdb' 'SectionProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionProbe.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\Microsoft.AspNetCore.Mvc.Razor.pdb' 'RazorPage.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\source-after.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\Program.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.pdb' 'SectionLifecycle.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionLifecycle.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.pdb' 'SectionBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionBenchmark.cs'
```

## Actual after portable-PDB source document: Passed, exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.pdb' 'SectionProbe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\harness\SectionProbe.cs'
```

## round-1-before: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: Passed, exit0; all36 actual cases,8 results/3 warmups
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*SectionBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F094\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;216 actual outcomes/108 pairs/1728 console-linked retained results/648 warmups/216 owner-harness-PID-linked setups, raw GC totals/rounding and sample mean/variance/SD/SE/median/CI-internal arithmetic; three exact source seams, actual committed canonical source bytes (only Git CRLF-to-LF differs from preserved measured source), PDB records, complete266/98 closure, real producer/HTML/pending/fault and resource red/green checks. CI distribution quantiles are not independently recomputed.
`.\F094-xml-audit.ps1 -RunRoot . -Verify`: Passed; all28 actual original/selected rows/definitions/positive durations and all14 exact matching identities/no skips. Existing tests and functional probes are green/green preservation, not fabricated correctness red.
`git diff --check` and staged check: Passed, exit0; exact one-file8 additions/3 deletions, no unrelated existing edits. Actual fork comparison and source bytes verified. Final declaration discovery: all4 exact public non-sealed benchmark methods. Initial three nullable-interface warnings and source archive retained; corrected before freeze, no extra timed comparison.
Razor compiler, hosted HTTP/server, browser, application throughput/frequency and isolated pending task-size checks were not run or claimed. No requested automated test was blocked before its assertion. Public audits cannot rehash omitted actual binary/PDB bytes.
