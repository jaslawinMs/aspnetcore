# F129: exact commands and observed results

All **19 managed commands** are retained, including four preparation failures and two expected semantic-failure executions. The four complete existing-test executions contain **28 individually parsed passing XML rows**: seven tests repeated on original, actual default, prototype and restored original. Passing the existing seven tests alone did not establish equivalence of the proposed replacement.

Builds and executions were serialized on a shared Windows box. Every fresh .NET shell activates its reviewed checkout first. No root SDK pin, package manifest, feed configuration, power setting, affinity, priority or machine configuration changed.

The first prototype spelling needed a System.Linq import. Rather than alter imports, the compiled prototype qualifies the identical static Enumerable.Where call. The failed source and CS1061 output remain [captured](validation/prototype-tests-001/source-snapshot/FileDownload.cs). This was a preparation correction, not timing or source-result selection.

The first reconstruction manifest retained its old PDB byte length although the new PDB hash was correct. [The correction](reconstruction-001/manifest-size-correction.json) refreshes only the two size fields from actual bytes; [both](reconstruction-001/Original/manifest-before-size-correction.json) [old manifests](reconstruction-001/Prototype/manifest-before-size-correction.json) and the [exact executed helper](reconstruction-001/executed-reproducer-before-manifest-size-correction.mjs) remain. No source, binary, raw observation, build or execution was changed or repeated by that correction. Current authored-driver source includes the size fix and must not be mistaken for those earlier executed bytes.

Initial optional related-PR filename queries used an unsupported gh --slurp/--jq combination. They did not execute a test or contact a product endpoint. The successful -002 path lists and actual FileDownload hunks in [research](research/) are the authority.

## default-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Default\consumer\AutoPerf.Characterization.dll', 'Default', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\default-characterize-001\observations.json')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All 27 actual component-rendering rows satisfy the original assertions.
[Exact command](validation/default-characterize-001/command.json), [receipt](validation/default-characterize-001/result.json), [stdout](validation/default-characterize-001/stdout.txt), [stderr](validation/default-characterize-001/stderr.txt).

## default-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** Restore succeeded.
[Exact command](validation/default-restore-001/command.json), [receipt](validation/default-restore-001/result.json), [stdout](validation/default-restore-001/stdout.txt), [stderr](validation/default-restore-001/stderr.txt).

## default-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Default.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\default-tests-001\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result: exit 1.** Missing assets NETSDK1004; restore occurred only after this actual failure.
[Exact command](validation/default-tests-001/command.json), [receipt](validation/default-tests-001/result.json), [stdout](validation/default-tests-001/stdout.txt), [stderr](validation/default-tests-001/stderr.txt).

## default-tests-002

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Default.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\default-tests-002\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All seven individual FileDownloadTest XML rows passed; none failed or skipped.
[Exact command](validation/default-tests-002/command.json), [receipt](validation/default-tests-002/result.json), [stdout](validation/default-tests-002/stdout.txt), [stderr](validation/default-tests-002/stderr.txt).

## harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129-common\AutoPerf.Characterization.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 1.** Missing assets NETSDK1004; restore occurred only after this actual failure.
[Exact command](validation/harness-build-001/command.json), [receipt](validation/harness-build-001/result.json), [stdout](validation/harness-build-001/stdout.txt), [stderr](validation/harness-build-001/stderr.txt).

## harness-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129-common\AutoPerf.Characterization.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** Build succeeded with zero warnings and zero errors.
[Exact command](validation/harness-build-002/command.json), [receipt](validation/harness-build-002/result.json), [stdout](validation/harness-build-002/stdout.txt), [stderr](validation/harness-build-002/stderr.txt).

## harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129-common\AutoPerf.Characterization.csproj', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** Restore succeeded.
[Exact command](validation/harness-restore-001/command.json), [receipt](validation/harness-restore-001/result.json), [stdout](validation/harness-restore-001/stdout.txt), [stderr](validation/harness-restore-001/stderr.txt).

## original-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Original\consumer\AutoPerf.Characterization.dll', 'Original', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\original-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All 27 actual component-rendering rows satisfy the original assertions.
[Exact command](validation/original-characterize-001/command.json), [receipt](validation/original-characterize-001/result.json), [stdout](validation/original-characterize-001/stdout.txt), [stderr](validation/original-characterize-001/stderr.txt).

## original-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Original.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\original-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All seven individual FileDownloadTest XML rows passed; none failed or skipped.
[Exact command](validation/original-tests-001/command.json), [receipt](validation/original-tests-001/result.json), [stdout](validation/original-tests-001/stdout.txt), [stderr](validation/original-tests-001/stderr.txt).

## prototype-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Prototype\consumer\AutoPerf.Characterization.dll', 'Prototype', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\prototype-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 2.** Expected negative preservation result: both changed profiles fail in all three repetitions; all other profiles retain the baseline behavior.
[Exact command](validation/prototype-characterize-001/command.json), [receipt](validation/prototype-characterize-001/result.json), [stdout](validation/prototype-characterize-001/stdout.txt), [stderr](validation/prototype-characterize-001/stderr.txt).

## prototype-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Prototype.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\prototype-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 1.** Compilation stopped at CS1061: this project does not import System.Linq. The same prototype was then compiled with a fully qualified Enumerable.Where call.
[Exact command](validation/prototype-tests-001/command.json), [receipt](validation/prototype-tests-001/result.json), [stdout](validation/prototype-tests-001/stdout.txt), [stderr](validation/prototype-tests-001/stderr.txt).

## prototype-tests-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Prototype.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\prototype-tests-002\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All seven individual FileDownloadTest XML rows passed; none failed or skipped.
[Exact command](validation/prototype-tests-002/command.json), [receipt](validation/prototype-tests-002/result.json), [stdout](validation/prototype-tests-002/stdout.txt), [stderr](validation/prototype-tests-002/stderr.txt).

## reconstruction-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\reconstruction-001\project\AutoPerf.Characterization.csproj', '--no-restore', '--configuration', 'Release', '-p:ReferencePathRoot=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Original\consumer', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 1.** Missing assets NETSDK1004; restore occurred only after this actual failure.
[Exact command](validation/reconstruction-build-001/command.json), [receipt](validation/reconstruction-build-001/result.json), [stdout](validation/reconstruction-build-001/stdout.txt), [stderr](validation/reconstruction-build-001/stderr.txt).

## reconstruction-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\reconstruction-001\project\AutoPerf.Characterization.csproj', '--no-restore', '--configuration', 'Release', '-p:ReferencePathRoot=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Original\consumer', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** Build succeeded with zero warnings and zero errors.
[Exact command](validation/reconstruction-build-002/command.json), [receipt](validation/reconstruction-build-002/result.json), [stdout](validation/reconstruction-build-002/stdout.txt), [stderr](validation/reconstruction-build-002/stderr.txt).

## reconstruction-original-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\reconstruction-001\Original\consumer\AutoPerf.Characterization.dll', 'OriginalRebuilt', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\reconstruction-original-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All 27 actual component-rendering rows satisfy the original assertions.
[Exact command](validation/reconstruction-original-characterize-001/command.json), [receipt](validation/reconstruction-original-characterize-001/result.json), [stdout](validation/reconstruction-original-characterize-001/stdout.txt), [stderr](validation/reconstruction-original-characterize-001/stderr.txt).

## reconstruction-prototype-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\reconstruction-001\Prototype\consumer\AutoPerf.Characterization.dll', 'PrototypeRebuilt', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\reconstruction-prototype-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 2.** Expected negative preservation result: both changed profiles fail in all three repetitions; all other profiles retain the baseline behavior.
[Exact command](validation/reconstruction-prototype-characterize-001/command.json), [receipt](validation/reconstruction-prototype-characterize-001/result.json), [stdout](validation/reconstruction-prototype-characterize-001/stdout.txt), [stderr](validation/reconstruction-prototype-characterize-001/stderr.txt).

## reconstruction-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\reconstruction-001\project\AutoPerf.Characterization.csproj', '-p:ReferencePathRoot=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\Original\consumer', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** Restore succeeded.
[Exact command](validation/reconstruction-restore-001/command.json), [receipt](validation/reconstruction-restore-001/result.json), [stdout](validation/reconstruction-restore-001/stdout.txt), [stderr](validation/reconstruction-restore-001/stderr.txt).

## restored-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\images\RestoredOriginal\consumer\AutoPerf.Characterization.dll', 'RestoredOriginal', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\restored-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All 27 actual component-rendering rows satisfy the original assertions.
[Exact command](validation/restored-characterize-001/command.json), [receipt](validation/restored-characterize-001/result.json), [stdout](validation/restored-characterize-001/stdout.txt), [stderr](validation/restored-characterize-001/stderr.txt).

## restored-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-RestoredOriginal.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\restored-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result: exit 0.** All seven individual FileDownloadTest XML rows passed; none failed or skipped.
[Exact command](validation/restored-tests-001/command.json), [receipt](validation/restored-tests-001/result.json), [stdout](validation/restored-tests-001/stdout.txt), [stderr](validation/restored-tests-001/stderr.txt).


## What this did not run

No sample server, browser, download, JS interop, performance benchmark, AOT/trimming, packaging or full-repository build. This explicitly throwaway investigation observes behavior fully produced below the browser by actual managed component rendering. No permanent test was added solely to satisfy the Components implementation workflow; no shipping implementation is retained.
