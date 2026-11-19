# F121: exact validation commands and outcomes

The repository-pinned SDK was activated in every managed shell. Builds use at most two workers, no shared compilation or node reuse, and were serialized with measurement. The first broad managed graph stopped on missing native ANCM assets. Existing command-only `UseIisNativeAssets=false`, `BuildNodeJS=false` and `StaticWebAssetsEnabled=false` scope then passed. No source, package/feed configuration or SDK pin was changed to bypass that prerequisite. IIS/native, static-assets, browser, packaging and full-repository coverage are not claimed.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Items, null entries, offsets and post-copy source isolation | `CopyTo_PreservesItemsOffsetAndStoreIsolation`, both Boolean rows, original and candidate |
| Empty store remains no-op for null/invalid destinations | `CopyTo_EmptyStoreDoesNotValidateDestination`, both Boolean rows |
| Partial writes before a short-array bounds failure | `CopyTo_PreservesPartialWritesBeforeBoundsFailure`, both Boolean rows |
| Exact null and negative-offset exception types | `CopyTo_PreservesNullAndNegativeIndexFailures`, both Boolean rows |
| Covariant array failure preserves its successful prefix | `CopyTo_PreservesCovariantArrayPartialWrites`, both Boolean rows |
| Arbitrary source enumeration and disposal on success/failure | `CopyTo_UnmodifiedStoreEnumeratesAndDisposesSource`, both Boolean rows |
| Real controller producers and both invoker modes, without property substitution | [Original characterization](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json), [candidate](characterization-candidate-characterize-001/verified-characterization.json): 48 actual HTTP requests and 16 public profile contracts per variant |
| Exact source, PE/PDB associations and all measured observations | [Full audit](audit-summary.json): 117 historical passing XML rows, 22 runtime records, 192 settings records, 768 samples; these are executions, not 117 unique tests |
| Independently rebuilt exact eight-input project and both source variants | [Actual reconstruction](reconstruction-paired-001/verified-reproduction.json); no extra timing |

These are **green/green performance-preservation checks**, not proof of fixing a semantic bug. The managed boundary owns these collection effects; no browser test is required or claimed.

### candidate-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\consumer-candidate\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-candidate-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\closure-candidate.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-inputs-candidate.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-files-candidate', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-candidate-characterize-001\not-timed-reports', 'Candidate', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/candidate-characterize-001/command.json), [result](validation/candidate-characterize-001/result.json), [stdout](validation/candidate-characterize-001/stdout.txt), [stderr](validation/candidate-characterize-001/stderr.txt).

### candidate-core-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/candidate-core-build-001/command.json), [result](validation/candidate-core-build-001/result.json), [stdout](validation/candidate-core-build-001/stdout.txt), [stderr](validation/candidate-core-build-001/stderr.txt).

### candidate-core-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F121-candidate-core.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\validation\candidate-core-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 40 individual XML rows passed, including 12 new preservation rows; none failed or skipped.
[Raw command](validation/candidate-core-tests-001/command.json), [result](validation/candidate-core-tests-001/result.json), [stdout](validation/candidate-core-tests-001/stdout.txt), [stderr](validation/candidate-core-tests-001/stderr.txt), [individual-row audit](validation/candidate-core-tests-001/test-row-audit.json), [actual XML](validation/candidate-core-tests-001/test-results/F121-candidate-core.trx).

### candidate-pages-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/candidate-pages-build-001/command.json), [result](validation/candidate-pages-build-001/result.json), [stdout](validation/candidate-pages-build-001/stdout.txt), [stderr](validation/candidate-pages-build-001/stderr.txt).

### candidate-pages-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.PageInvokerProviderTest', '--logger', 'trx;LogFileName=F121-candidate-pages.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\validation\candidate-pages-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 9 individual XML rows passed, including 0 new preservation rows; none failed or skipped.
[Raw command](validation/candidate-pages-tests-001/command.json), [result](validation/candidate-pages-tests-001/result.json), [stdout](validation/candidate-pages-tests-001/stdout.txt), [stderr](validation/candidate-pages-tests-001/stderr.txt), [individual-row audit](validation/candidate-pages-tests-001/test-row-audit.json), [actual XML](validation/candidate-pages-tests-001/test-results/F121-candidate-pages.trx).

### candidate-source-whitespace-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '--verify-no-changes', '--include', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\src\Infrastructure\CopyOnWriteList.cs', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Infrastructure\CopyOnWriteListTest.cs', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/candidate-source-whitespace-001/command.json), [result](validation/candidate-source-whitespace-001/result.json), [stdout](validation/candidate-source-whitespace-001/stdout.txt), [stderr](validation/candidate-source-whitespace-001/stderr.txt).

### default-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\consumer-current-default\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-default-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\closure-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-inputs-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-files-current-default', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-default-characterize-001\not-timed-reports', 'Default', 'none')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/default-characterize-001/command.json), [result](validation/default-characterize-001/result.json), [stdout](validation/default-characterize-001/stdout.txt), [stderr](validation/default-characterize-001/stderr.txt).

### default-core-test-build-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/default-core-test-build-001/command.json), [result](validation/default-core-test-build-001/result.json), [stdout](validation/default-core-test-build-001/stdout.txt), [stderr](validation/default-core-test-build-001/stderr.txt).

### default-existing-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F121-default-existing.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\validation\default-existing-tests-001\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 28 individual XML rows passed, including 0 new preservation rows; none failed or skipped.
[Raw command](validation/default-existing-tests-001/command.json), [result](validation/default-existing-tests-001/result.json), [stdout](validation/default-existing-tests-001/stdout.txt), [stderr](validation/default-existing-tests-001/stderr.txt), [individual-row audit](validation/default-existing-tests-001/test-row-audit.json), [actual XML](validation/default-existing-tests-001/test-results/F121-default-existing.trx).

### default-testhost-build-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\autoperf-F042-default\src\Hosting\TestHost\src\Microsoft.AspNetCore.TestHost.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/default-testhost-build-001/command.json), [result](validation/default-testhost-build-001/result.json), [stdout](validation/default-testhost-build-001/stdout.txt), [stderr](validation/default-testhost-build-001/stderr.txt).

### harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-p:AspNetCoreRoot=C:\src\aspnetcore', '-p:UseIisNativeAssets=false', '-p:BuildProjectReferences=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/harness-build-001/command.json), [result](validation/harness-build-001/result.json), [stdout](validation/harness-build-001/stdout.txt), [stderr](validation/harness-build-001/stderr.txt).

### harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '-p:NuGetAudit=false', '-p:AspNetCoreRoot=C:\src\aspnetcore', '-p:UseIisNativeAssets=false', '-p:BuildProjectReferences=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/harness-restore-001/command.json), [result](validation/harness-restore-001/result.json), [stdout](validation/harness-restore-001/stdout.txt), [stderr](validation/harness-restore-001/stderr.txt).

### original-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\consumer-original\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-original-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\closure-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-inputs-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\source-files-original', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\characterization-original-characterize-001\not-timed-reports', 'Original', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/original-characterize-001/command.json), [result](validation/original-characterize-001/result.json), [stdout](validation/original-characterize-001/stdout.txt), [stderr](validation/original-characterize-001/stderr.txt).

### original-preservation-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed on the unrelated missing native ANCM DLL before the scoped correction.
[Raw command](validation/original-preservation-build-001/command.json), [result](validation/original-preservation-build-001/result.json), [stdout](validation/original-preservation-build-001/stdout.txt), [stderr](validation/original-preservation-build-001/stderr.txt).

### original-preservation-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/original-preservation-build-002/command.json), [result](validation/original-preservation-build-002/result.json), [stdout](validation/original-preservation-build-002/stdout.txt), [stderr](validation/original-preservation-build-002/stderr.txt).

### original-preservation-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F121-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F121\validation\original-preservation-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 40 individual XML rows passed, including 12 new preservation rows; none failed or skipped.
[Raw command](validation/original-preservation-tests-001/command.json), [result](validation/original-preservation-tests-001/result.json), [stdout](validation/original-preservation-tests-001/stdout.txt), [stderr](validation/original-preservation-tests-001/stderr.txt), [individual-row audit](validation/original-preservation-tests-001/test-row-audit.json), [actual XML](validation/original-preservation-tests-001/test-results/F121-original-preservation.trx).


## Independent reconstruction and audit

The exact activated restore/build/characterization commands and exit-zero results are in [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original](reconstruction-paired-001/Original-Characterize/command.json) and [Candidate](reconstruction-paired-001/Candidate-Characterize/command.json).

The full audit command and its actual successful result are in [full-live-audit.command.json](full-live-audit.command.json), with [stdout](full-live-audit.stdout.txt) and [stderr](full-live-audit.stderr.txt). The reconstruction changed only the rebuilt common harness DLL/PDB; measured owner/dependency bytes and the closed budget remained fixed.
