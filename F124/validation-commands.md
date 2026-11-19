# F124: exact validation commands, failures and outcomes

Every fresh managed shell activates its own repository-pinned SDK. Builds are serialized with timing, use at most two workers, no shared compilation or node reuse, and do not alter machine settings. Actual default required the existing command-scoped UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false. These managed analyzer tests **do not validate IIS/ANCM, Blazor JavaScript, static-asset production or packaging, hosted applications or browsers**.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Exactly one descendant stays non-diagnostic, including semicolon, escaped identifier and trivia; another real compiler tree supplies an entry point | `DoesNotFix_ProgramDeclarationInSeparateFile`: all four exact data rows pass on original and candidate |
| Exactly two descendants report at Program and the actual code fix removes only that class, preserving the sibling and trivia | `RemovesDeclarationIfItIsFound_WithOneOtherNode`: both exact data rows pass on original and candidate |
| Preserve existing guards, diagnostics and code fixes | All 17 existing `PublicPartialProgramClassTest` rows pass on original, actual default and candidate |
| Real parser/compiler/registered analyzer producer, exact diagnostics and private predicate | [Original](original-characterization-002/verified-characterization.json), [actual default](default-characterization-001/verified-characterization.json), [candidate](candidate-characterization-001/verified-characterization.json): 34 fresh drivers each, four profiles, six additional contracts, four actual benchmark-method contracts |
| Exactly-two, structured trivia, attribute, member, namespace and generated-code behavior | Six additional real-driver contracts per accepted source; generated source deliberately has true private predicate but zero diagnostics through the actual generated-code suppression policy |
| Common harness, nine selected inputs, matching loaded owner/PDB and exact one-expression change | [Premeasurement seal](premeasurement-validation.json), [seam](candidate-seam-verification.json), [complete audit](audit-summary.json): 235 of 237 measured image entries identical |
| Actual numerical and execution evidence | 576 independently recomputed samples, 216 timing settings records, 22 successful-boundary runtime records plus one separately audited failed-preparation runtime-before record |
| Exact-eight-input fresh common-project rebuild, both measured owner/dependency variants, no further timing | [Reconstruction receipt](reconstruction-paired-001/verified-reproduction.json) and its four exact activated successful commands |

These are **green/green preservation checks**, not a semantic-bug red/green claim. The accepted XML total is original 23 + actual default 17 + candidate 23 = **63 historical executions, not 63 unique tests**. Each new declaration datum was individually checked in the actual XML, not inferred from a Theory summary.

## Retained preparation and audit corrections

[Original/default corrections](preparation-correction.json) retain the ANCM prerequisite, invalid new C# fixture, missing metadata, missing current-default restore assets and static-asset prerequisites. The initial malformed `DoesNotFix_ProgramDeclarationInSeparateFile` row never reached its analyzer assertion because compiler diagnostic CS0267 blocked it. **Its failing XML is preserved.** The corrected escaped-identifier datum passes on original and candidate. The first MinimalProgram characterization stopped at CS0012 before its contract; the corrected real metadata closure is generation 002, with primary and profiles unchanged.

[Candidate formatter correction](candidate-preparation-correction.json) retains its actual rejected command. [Canonical string-name parsing correction](audit-history/string-parameter-fullname-001/correction.json) and [manifest-order correction](audit-history/reconstruction-manifest-order-003/correction.json) retain the failed auditor versions and output without changing measurements. The latter compares identical relative-path sets independently of locale versus ordinal manifest order, then still verifies every hash and exact two-file rebuilt-harness difference.

### candidate-analyzer-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/candidate-analyzer-build-001/command.json), [result](validation/candidate-analyzer-build-001/result.json), [stdout](validation/candidate-analyzer-build-001/stdout.txt), [stderr](validation/candidate-analyzer-build-001/stderr.txt).

### candidate-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\consumer-candidate-002\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\candidate-characterization-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\closure-candidate-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-inputs-candidate-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-files-candidate-002', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\candidate-characterization-001\reports', 'Candidate', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/candidate-characterization-001/command.json), [result](validation/candidate-characterization-001/result.json), [stdout](validation/candidate-characterization-001/stdout.txt), [stderr](validation/candidate-characterization-001/stderr.txt).

### candidate-format-whitespace-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('format', 'whitespace', '--folder', '--include', 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\WebApplicationBuilder\PublicPartialProgramClassAnalyzer.cs', 'src\Framework\AspNetCoreAnalyzers\test\WebApplicationBuilder\PublicPartialProgramClassTest.cs', '--verify-no-changes', '--no-restore', '--verbosity', 'normal')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; formatter rejected incompatible --folder and --no-restore options before source analysis; corrected folder-only verification passed in attempt 002.
[Command](validation/candidate-format-whitespace-001/command.json), [result](validation/candidate-format-whitespace-001/result.json), [stdout](validation/candidate-format-whitespace-001/stdout.txt), [stderr](validation/candidate-format-whitespace-001/stderr.txt).

### candidate-format-whitespace-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('format', 'whitespace', '--folder', '--include', 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\WebApplicationBuilder\PublicPartialProgramClassAnalyzer.cs', 'src\Framework\AspNetCoreAnalyzers\test\WebApplicationBuilder\PublicPartialProgramClassTest.cs', '--verify-no-changes', '--verbosity', 'normal')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/candidate-format-whitespace-002/command.json), [result](validation/candidate-format-whitespace-002/result.json), [stdout](validation/candidate-format-whitespace-002/stdout.txt), [stderr](validation/candidate-format-whitespace-002/stderr.txt).

### candidate-preservation-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-build', '--no-restore', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest', '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\validation\candidate-preservation-tests-001\test-results', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed all 23 individual XML rows, including 6 new threshold rows; none failed/skipped.
[Command](validation/candidate-preservation-tests-001/command.json), [result](validation/candidate-preservation-tests-001/result.json), [stdout](validation/candidate-preservation-tests-001/stdout.txt), [stderr](validation/candidate-preservation-tests-001/stderr.txt), [individual-row audit](validation/candidate-preservation-tests-001/individual-results.audit.json), [actual XML](validation/candidate-preservation-tests-001/test-results/results.trx).

### default-analyzer-build-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed NETSDK1004: absent actual-default project.assets.json; successful scoped restore retained.
[Command](validation/default-analyzer-build-001/command.json), [result](validation/default-analyzer-build-001/result.json), [stdout](validation/default-analyzer-build-001/stdout.txt), [stderr](validation/default-analyzer-build-001/stderr.txt).

### default-analyzer-build-002

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed on missing generated Blazor JavaScript, unrelated to the managed analyzer boundary.
[Command](validation/default-analyzer-build-002/command.json), [result](validation/default-analyzer-build-002/result.json), [stdout](validation/default-analyzer-build-002/stdout.txt), [stderr](validation/default-analyzer-build-002/stderr.txt).

### default-analyzer-build-003

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet', '-p:BuildNodeJS=false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed on missing static-web-asset manifest; inspected SDK enablement and used existing command-scoped StaticWebAssetsEnabled=false.
[Command](validation/default-analyzer-build-003/command.json), [result](validation/default-analyzer-build-003/result.json), [stdout](validation/default-analyzer-build-003/stdout.txt), [stderr](validation/default-analyzer-build-003/stderr.txt).

### default-analyzer-build-004

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/default-analyzer-build-004/command.json), [result](validation/default-analyzer-build-004/result.json), [stdout](validation/default-analyzer-build-004/stdout.txt), [stderr](validation/default-analyzer-build-004/stderr.txt).

### default-analyzer-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '--configfile', 'C:\src\autoperf-F042-default\NuGet.config', '--disable-parallel', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--verbosity', 'quiet')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/default-analyzer-restore-001/command.json), [result](validation/default-analyzer-restore-001/result.json), [stdout](validation/default-analyzer-restore-001/stdout.txt), [stderr](validation/default-analyzer-restore-001/stderr.txt).

### default-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\consumer-current-default-002\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\default-characterization-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\closure-current-default-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-inputs-current-default-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-files-current-default-002', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\default-characterization-001\reports', 'Default', 'none')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/default-characterization-001/command.json), [result](validation/default-characterization-001/result.json), [stdout](validation/default-characterization-001/stdout.txt), [stderr](validation/default-characterization-001/stderr.txt).

### default-existing-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-build', '--no-restore', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest', '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\validation\default-existing-tests-001\test-results', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed all 17 individual XML rows, including 0 new threshold rows; none failed/skipped.
[Command](validation/default-existing-tests-001/command.json), [result](validation/default-existing-tests-001/result.json), [stdout](validation/default-existing-tests-001/stdout.txt), [stderr](validation/default-existing-tests-001/stderr.txt), [individual-row audit](validation/default-existing-tests-001/individual-results.audit.json), [actual XML](validation/default-existing-tests-001/test-results/results.trx).

### original-analyzer-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed before the managed test boundary: missing ANCM native asset; existing command-scoped UseIisNativeAssets=false used for the successful successor.
[Command](validation/original-analyzer-build-001/command.json), [result](validation/original-analyzer-build-001/result.json), [stdout](validation/original-analyzer-build-001/stdout.txt), [stderr](validation/original-analyzer-build-001/stderr.txt).

### original-analyzer-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-analyzer-build-002/command.json), [result](validation/original-analyzer-build-002/result.json), [stdout](validation/original-analyzer-build-002/stdout.txt), [stderr](validation/original-analyzer-build-002/stderr.txt).

### original-analyzer-build-003

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-analyzer-build-003/command.json), [result](validation/original-analyzer-build-003/result.json), [stdout](validation/original-analyzer-build-003/stdout.txt), [stderr](validation/original-analyzer-build-003/stderr.txt).

### original-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\consumer-original\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\original-characterization-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\closure-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-inputs-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-files-original', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\original-characterization-001\reports', 'Original', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 3762504530; failed CS0012 before the first profile contract: missing real Hosting.Abstractions compiler metadata; entire 217-file image and five pre-failure states retained.
[Command](validation/original-characterization-001/command.json), [result](validation/original-characterization-001/result.json), [stdout](validation/original-characterization-001/stdout.txt), [stderr](validation/original-characterization-001/stderr.txt).

### original-characterization-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\consumer-original-002\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\original-characterization-002\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\closure-original-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-inputs-original-002.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\source-files-original-002', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\original-characterization-002\reports', 'Original', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-characterization-002/command.json), [result](validation/original-characterization-002/result.json), [stdout](validation/original-characterization-002/stdout.txt), [stderr](validation/original-characterization-002/stderr.txt).

### original-harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\harness\AutoPerf.Benchmarks.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-harness-build-001/command.json), [result](validation/original-harness-build-001/result.json), [stdout](validation/original-harness-build-001/stdout.txt), [stderr](validation/original-harness-build-001/stderr.txt).

### original-harness-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\harness\AutoPerf.Benchmarks.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-harness-build-002/command.json), [result](validation/original-harness-build-002/result.json), [stdout](validation/original-harness-build-002/stdout.txt), [stderr](validation/original-harness-build-002/stderr.txt).

### original-harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '--disable-parallel', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-harness-restore-001/command.json), [result](validation/original-harness-restore-001/result.json), [stdout](validation/original-harness-restore-001/stdout.txt), [stderr](validation/original-harness-restore-001/stderr.txt).

### original-harness-restore-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '--disable-parallel', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly stated boundary.
[Command](validation/original-harness-restore-002/command.json), [result](validation/original-harness-restore-002/result.json), [stdout](validation/original-harness-restore-002/stdout.txt), [stderr](validation/original-harness-restore-002/stderr.txt).

### original-preservation-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-build', '--no-restore', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest', '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\validation\original-preservation-tests-001\test-results', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; 22 passed, 1 failed compiler prerequisite CS0267: invalid newly authored partial public modifier order; actual failing XML and source retained, not an analyzer bug.
[Command](validation/original-preservation-tests-001/command.json), [result](validation/original-preservation-tests-001/result.json), [stdout](validation/original-preservation-tests-001/stdout.txt), [stderr](validation/original-preservation-tests-001/stderr.txt).

### original-preservation-tests-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-build', '--no-restore', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest', '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\validation\original-preservation-tests-002\test-results', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed all 23 individual XML rows, including 6 new threshold rows; none failed/skipped.
[Command](validation/original-preservation-tests-002/command.json), [result](validation/original-preservation-tests-002/result.json), [stdout](validation/original-preservation-tests-002/stdout.txt), [stderr](validation/original-preservation-tests-002/stderr.txt), [individual-row audit](validation/original-preservation-tests-002/individual-results.audit.json), [actual XML](validation/original-preservation-tests-002/test-results/results.trx).


## Reconstruction and authoritative complete audit

Each exited 0: [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original characterization](reconstruction-paired-001/Original-Characterize/command.json), [Candidate characterization](reconstruction-paired-001/Candidate-Characterize/command.json).

The accepted full audit has its [exact command and exit 0](full-live-audit-002.command.json), [stdout](full-live-audit-002.stdout.txt) and [stderr](full-live-audit-002.stderr.txt). The initial full auditor's ordering assertion failed and is retained; the accepted audit independently checks the same unchanged images and raw observations. The budget remains permanently closed.
