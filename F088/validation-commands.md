# Exact F088 commands and results

Dotnet ran from C:\src\aspnetcore after `. .\activate.ps1`. Builds/tests were serialized and requested `-m:2`; no fourth comparison.

## Original existing selected managed suites: 23/23 passed,exit0

Raw exact record: [tests-before-existing/command.json](tests-before-existing/command.json).
```powershell
dotnet 'test' 'src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~MessageListTests|FullyQualifiedName~RichTextContentTests|FullyQualifiedName~RichTextNodeTests|FullyQualifiedName~TextBlockHandlerParagraphTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before-existing' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original identical six new executions: 26 passed/3 expected Assert.Same failures/0 skip,exit1;every Left/Center/Right row reached

Raw exact record: [tests-before/command.json](tests-before/command.json).
```powershell
dotnet 'test' 'src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~MessageListTests|FullyQualifiedName~RichTextContentTests|FullyQualifiedName~RichTextNodeTests|FullyQualifiedName~TextBlockHandlerParagraphTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected identical managed suites: 29/29 passed,exit0,0 skip;all six new executions reached

Raw exact record: [tests-after/command.json](tests-after/command.json).
```powershell
dotnet 'test' 'src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-v:q' '--filter' 'FullyQualifiedName~MessageListTests|FullyQualifiedName~RichTextContentTests|FullyQualifiedName~RichTextNodeTests|FullyQualifiedName~TextBlockHandlerParagraphTests' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Actual unchanged real-browser matrix: 1/1 passed,exit0;actual default-Debug app prepared

Raw exact record: [tests-e2e-after-debug/command.json](tests-e2e-after-debug/command.json).

Shell-local environment:
```json
{
  "PW_INTERNAL_ADAPTER_SETTINGS": "{\"BrowserName\":\"chromium\",\"LaunchOptions\":{\"channel\":\"msedge\",\"headless\":true}}",
  "HEADED": "0",
  "BROWSER": "chromium",
  "DEBUG": "pw:browser"
}
```
```powershell
dotnet 'run' '--project' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '--no-build' '-c' 'Debug' '--' '--filter' 'FullyQualifiedName~RichTextTests.RichText_RendersTheStructuredContentMatrix' '--minimum-expected-tests' '1' '--timeout' '3m' '--report-trx' '--report-trx-filename' 'results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-e2e-after-debug' '--settings' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\existing-richtext-e2e.runsettings'
```

## Initial real matrix setup: failed initialization before assertion;default Chromium headless shell absent

Raw exact record: [tests-e2e-after/command.json](tests-e2e-after/command.json).

Shell-local environment:
```json
{
  "HEADED": "0",
  "BROWSER": "chromium"
}
```
```powershell
dotnet 'run' '--project' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '--' '--filter' 'FullyQualifiedName~RichTextTests.RichText_RendersTheStructuredContentMatrix' '--minimum-expected-tests' '1' '--timeout' '3m' '--report-trx' '--report-trx-filename' 'results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-e2e-after' '--settings' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\existing-richtext-e2e.runsettings'
```

## Second real matrix setup: failed initialization before assertion;uppercase nested Playwright channel ignored

Raw exact record: [tests-e2e-after-configured/command.json](tests-e2e-after-configured/command.json).

Shell-local environment:
```json
{
  "BROWSER": "chromium",
  "DEBUG": "pw:browser",
  "PW_INTERNAL_ADAPTER_SETTINGS": "{\"BrowserName\":\"chromium\",\"LaunchOptions\":{\"Channel\":\"msedge\",\"Headless\":true}}",
  "HEADED": "0"
}
```
```powershell
dotnet 'run' '--project' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '--' '--filter' 'FullyQualifiedName~RichTextTests.RichText_RendersTheStructuredContentMatrix' '--minimum-expected-tests' '1' '--timeout' '3m' '--report-trx' '--report-trx-filename' 'results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-e2e-after-configured' '--settings' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\existing-richtext-e2e.runsettings'
```

## Real matrix app-launch prerequisite: browser initialized but Debug AIApp.exe absent;assertion not reached

Raw exact record: [tests-e2e-after-final/command.json](tests-e2e-after-final/command.json).

Shell-local environment:
```json
{
  "BROWSER": "chromium",
  "DEBUG": "pw:browser",
  "HEADED": "0",
  "PW_INTERNAL_ADAPTER_SETTINGS": "{\"BrowserName\":\"chromium\",\"LaunchOptions\":{\"channel\":\"msedge\",\"headless\":true}}"
}
```
```powershell
dotnet 'run' '--project' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '--no-build' '-c' 'Release' '--' '--filter' 'FullyQualifiedName~RichTextTests.RichText_RendersTheStructuredContentMatrix' '--minimum-expected-tests' '1' '--timeout' '3m' '--report-trx' '--report-trx-filename' 'results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-e2e-after-final' '--settings' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\existing-richtext-e2e.runsettings'
```

## Original external harness restore: passed,exit0;new project manifests justify restore

Raw exact record: [harness-restore-command.json](harness-restore-command.json).
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Original external harness build: passed,exit0

Raw exact record: [harness-build-before-command.json](harness-build-before-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Corrected actual public producer build: passed,exit0;actual ordered user/assistant block preparation

Raw exact record: [harness-build-corrected-producer-command.json](harness-build-corrected-producer-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected external harness build: passed,exit0;--no-restore,same exact tested owner

Raw exact record: [harness-build-after-command.json](harness-build-after-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## First original oracle assumption: failed setup,unmeasured;incorrect one-block premise

Raw exact record: [capture-original-oracles-attempt-1-command.json](capture-original-oracles-attempt-1-command.json).
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--capture-oracles' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\contract-oracles.json'
```

## Second original oracle assumption: failed setup,unmeasured;actual producer result not yet selected

Raw exact record: [capture-original-oracles-attempt-2-command.json](capture-original-oracles-attempt-2-command.json).
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--capture-oracles' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\contract-oracles.json'
```

## Actual original repeated oracle capture: all11 profiles captured/repeated unchanged,exit0;unmeasured

Raw exact record: [capture-original-oracles-command.json](capture-original-oracles-command.json).
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--capture-oracles' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\contract-oracles.json'
```

## Original actual setups: all11 original oracles pass,exit0;unmeasured

Raw exact record: [verify-original-setups-command.json](verify-original-setups-command.json).

Shell-local environment:
```json
{
  "AUTOPERF_STATE_DIRECTORY": "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F088\\states-before-verification"
}
```
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify-setups'
```

## Selected actual setups: all11 unchanged original oracles pass,exit0;unmeasured

Raw exact record: [verify-selected-setups-command.json](verify-selected-setups-command.json).

Shell-local environment:
```json
{
  "AUTOPERF_STATE_DIRECTORY": "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F088\\states-after-verification"
}
```
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--verify-setups'
```

## Original canonical sample: passed,exit0,Debug

Raw exact record: [sample-build-before-command.json](sample-build-before-command.json).
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Selected canonical sample: passed,exit0,Debug

Raw exact record: [sample-build-after-command.json](sample-build-after-command.json).
```powershell
dotnet 'build' 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Missing actual E2E assets: failed NETSDK1004;actual prerequisite,not a test failure

Raw exact record: [existing-richtext-e2e-direct-build-before-restore-command.json](existing-richtext-e2e-direct-build-before-restore-command.json).
```powershell
dotnet 'build' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Targeted E2E restore: passed,exit0;actual missing-assets failure justified restore

Raw exact record: [existing-richtext-e2e-targeted-restore-command.json](existing-richtext-e2e-targeted-restore-command.json).
```powershell
dotnet 'restore' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Actual Debug E2E graph: passed,exit0;dependency-aware actual Debug app output

Raw exact record: [existing-richtext-e2e-debug-build-command.json](existing-richtext-e2e-debug-build-command.json).
```powershell
dotnet 'build' 'src\Components\AI\testassets\AIApp.E2E.Tests\AIApp.E2E.Tests.csproj' '--no-restore' '-c' 'Debug' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:CrossgenOutput=false' '-p:GenerateInstallers=false'
```

## Initial startup-probe compile: failed missing Microsoft.Bcl.AsyncInterfaces reference;not a browser/Blazor execution

Raw exact record: [playwright-startup-probe-build-attempt-1-command.json](playwright-startup-probe-build-attempt-1-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\playwright-startup-probe\PlaywrightStartupProbe.csproj' '-c' 'Release' '-m:2' '-v:q'
```

## Corrected actual-driver startup probe: passed,exit0

Raw exact record: [playwright-startup-probe-build-command.json](playwright-startup-probe-build-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\playwright-startup-probe\PlaywrightStartupProbe.csproj' '-c' 'Release' '-m:2' '-v:q'
```

## Actual .NET Edge adapter startup/click/cleanup: passed,exit0;prerequisite isolation only

Raw exact record: [playwright-startup-probe-command.json](playwright-startup-probe-command.json).

Shell-local environment:
```json
{
  "HEADED": "0",
  "PW_INTERNAL_ADAPTER_SETTINGS": "{\"BrowserName\":\"chromium\",\"LaunchOptions\":{\"channel\":\"msedge\",\"headless\":true}}",
  "DEBUG": "pw:browser",
  "BROWSER": "chromium"
}
```
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\playwright-startup-probe\bin\Release\net12.0\PlaywrightStartupProbe.dll'
```

## round-1-before: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-before: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-3-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-3-after: passed33/33 measured cases,eight result iterations each,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*TableClassBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\round-3-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Scoped selected owner/test whitespace: passed,exit0

```powershell
dotnet 'format' 'whitespace' 'src\Components\AI\src\Microsoft.AspNetCore.Components.AI.csproj' '--no-restore' '--include' 'C:\src\aspnetcore\src\Components\AI\src\Components\MessageListContext.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## Scoped selected owner/test whitespace: passed,exit0

```powershell
dotnet 'format' 'whitespace' 'src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj' '--no-restore' '--include' 'C:\src\aspnetcore\src\Components\AI\test\Components\MessageListTests.cs' '--verify-no-changes' '--verbosity' 'quiet'
```

## Actual  source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before\Microsoft.AspNetCore.Components.AI.pdb' 'MessageListContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before\owner-source.cs'
```

## Actual  source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before\Microsoft.AspNetCore.Components.AI.Tests.pdb' 'MessageListTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-before\test-source.cs'
```

## Actual  source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-after\Microsoft.AspNetCore.Components.AI.pdb' 'MessageListContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-after\owner-source.cs'
```

## Actual  source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-after\Microsoft.AspNetCore.Components.AI.Tests.pdb' 'MessageListTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\tests-after\test-source.cs'
```

## Actual snapshot-owner-before source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\Microsoft.AspNetCore.Components.AI.pdb' 'MessageListContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\source-before.cs'
```

## Actual snapshot-owner-after source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\after\Microsoft.AspNetCore.Components.AI.pdb' 'MessageListContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\source-after.cs'
```

## Actual harness-program source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\Program.cs'
```

## Actual harness-table source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.pdb' 'TableClassBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\TableClassBenchmark.cs'
```

## Actual harness-conversation source/PDB: passed,exit0

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\binaries\before\AutoPerf.Benchmarks.pdb' 'ConversationFixture.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F088\harness\ConversationFixture.cs'
```

## Canonical browser probes and preserved failed setup

Final original/selected `browser-before-command.json`/`browser-after-command.json` passed: actual send/release,2-to-8 rows,CSS,plain control,owner/PID,zero page errors/failed requests. Earlier socket-only and incorrect assistant-turn selector attempts failed before all assertions and are retained. `existing-richtext-e2e-build-command.json` returned zero without preparing any actual testasset output;it is not credited as successful preparation.

## Original-host and prepared-publication audits

`node F088-measurement-audit.mjs <original-run-root>` passed:198 outcomes/1584 actual-result rows/samples,198 exact states,204 owner markers,9 source/PDB proofs and89/31 full original-host owner-only closure. Initial console-section EOF parsing was corrected without remeasurement. The actual XML leaf-text parser was corrected and every expected original Assert.Same failure individually rechecked.

`node .\reproduce-analysis.mjs . --published-records --verify` passes against the copied raw records. It does not independently rehash omitted copied binaries/PDBs;their checks remain explicit original-host records. `F088-xml-audit.ps1 -RunRoot <package> -Verify` reparses82 actual XML executions without replacing their recorded JSON:79pass/3expectedresourcefailures/0skip. `git diff --check` and scoped formatter checks passed,exit0. All exact supporting command records/logs are retained.
