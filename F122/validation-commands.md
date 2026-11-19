# F122: requirement coverage, exact commands and outcomes

These are preservation checks on an **unchanged shipping implementation**, not semantic-bug red/green evidence. All 40 original and 28 actual-current-default XML executions were individually parsed: **68 historical passing executions**, not 68 unique tests. The twelve new Boolean rows execute only in the original checkout; they were not copied into the current-default checkout.

| Requirement | Evidence |
|---|---|
| Ordered references, null entries, generic/nongeneric parity and copy isolation | `GetEnumerator_PreservesItemsAndStoreIsolation`, copied false/true |
| Cursor, Reset and nongeneric Current invalid states | `GetEnumerator_PreservesCursorResetAndNonGenericCurrent`, copied false/true |
| Enumerator captured before first write keeps its old source | `GetEnumerator_KeepsCapturedStoreWhenCopyIsCreated`, nongeneric false/true |
| Already-copied list detects subsequent mutation | `GetEnumerator_CopiedStoreDetectsMutation`, nongeneric false/true |
| Actual arbitrary source forwarding/identity without Count/indexer | `GetEnumerator_ForwardsArbitrarySourceWithoutIndexing`, nongeneric false/true |
| Actual source enumerator disposal on early break/consumer failure | `Foreach_DisposesSourceOnBreakOrFailure`, throw false/true |
| Actual MVC producer, both controller invoker modes, public write and request/source isolation | [Original characterization](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json): 48 actual HTTP requests, 16 public profile contracts and ten extra enumeration contracts per execution |
| Concrete-pattern selection gate at the real public/compiled boundary | [Original IL/property records](characterization-original-characterize-001/states/0006-bounded-shipping-il-audit.json), [sealed baseline](baseline-validation.json), [full audit](audit-summary.json): fourteen inspected MVC modules per role; only nongeneric self-forwarding reaches concrete GetEnumerator |
| Exact eight-input rebuild and owner/dependency preservation | [Actual reconstruction](reconstruction-original-and-default-001/verified-reproduction.json), original/default untimed execution; zero extra timing |
| Every absolute observation, source/owner binding and process setting | [Full audit](audit-summary.json): 256 samples, ten runtime records, 64 per-benchmark settings records and 68 individually reparsed XML executions |

Every managed shell activates its repository-pinned SDK. Builds and timing were serialized, with at most two MSBuild workers and no shared compilation/node reuse. Existing command-only IIS/native, Node and static-assets exclusions bound the managed graph; they are not coverage of those omitted features. No SDK pin, package manifest or feed configuration changed.

### default-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\consumer-current-default\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\characterization-default-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\closure-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\source-inputs-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\source-files-current-default', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\characterization-default-characterize-001\not-timed-reports', 'Default', 'none')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/default-characterize-001/command.json), [result](validation/default-characterize-001/result.json), [stdout](validation/default-characterize-001/stdout.txt), [stderr](validation/default-characterize-001/stderr.txt).

### default-existing-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F122-default-existing.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\validation\default-existing-tests-001\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed; all 28 individual XML rows, including 0 new preservation rows; none failed or skipped.
[Raw command](validation/default-existing-tests-001/command.json), [result](validation/default-existing-tests-001/result.json), [stdout](validation/default-existing-tests-001/stdout.txt), [stderr](validation/default-existing-tests-001/stderr.txt), [individual-row audit](validation/default-existing-tests-001/test-row-audit.json), [actual XML](validation/default-existing-tests-001/test-results/F122-default-existing.trx).

### harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-p:BuildProjectReferences=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/harness-build-001/command.json), [result](validation/harness-build-001/result.json), [stdout](validation/harness-build-001/stdout.txt), [stderr](validation/harness-build-001/stderr.txt).

### harness-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-p:BuildProjectReferences=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/harness-build-002/command.json), [result](validation/harness-build-002/result.json), [stdout](validation/harness-build-002/stdout.txt), [stderr](validation/harness-build-002/stderr.txt).

### harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '-p:NuGetAudit=false', '-p:RestoreBuildInParallel=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
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
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\consumer-original\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\characterization-original-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\closure-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\source-inputs-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\source-files-original', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\characterization-original-characterize-001\not-timed-reports', 'Original', 'none')
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
$arguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed.
[Raw command](validation/original-preservation-build-001/command.json), [result](validation/original-preservation-build-001/result.json), [stdout](validation/original-preservation-build-001/stdout.txt), [stderr](validation/original-preservation-build-001/stderr.txt).

### original-preservation-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F122-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\validation\original-preservation-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed; all 40 individual XML rows, including 12 new preservation rows; none failed or skipped.
[Raw command](validation/original-preservation-tests-001/command.json), [result](validation/original-preservation-tests-001/result.json), [stdout](validation/original-preservation-tests-001/stdout.txt), [stderr](validation/original-preservation-tests-001/stderr.txt), [individual-row audit](validation/original-preservation-tests-001/test-row-audit.json), [actual XML](validation/original-preservation-tests-001/test-results/F122-original-preservation.trx).

### preservation-format-001

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
[Raw command](validation/preservation-format-001/command.json), [result](validation/preservation-format-001/result.json), [stdout](validation/preservation-format-001/stdout.txt), [stderr](validation/preservation-format-001/stderr.txt).


## Independent reconstruction and audit

Actual exit-zero commands: [Restore](reconstruction-original-and-default-001/Restore/command.json), [Build](reconstruction-original-and-default-001/Build/command.json), [Original](reconstruction-original-and-default-001/Original-Characterize/command.json), [Default](reconstruction-original-and-default-001/Default-Characterize/command.json). The exact copied eight-input project rebuilt a fresh common harness; consumers retained their corresponding frozen source-built owners/dependencies. Only the new harness DLL/PDB differed. Only relocated absolute frozen-image paths were normalized when comparing untimed observations.

[Full independent audit command/result](audit-executions/full-live-001/command.json), [stdout](audit-executions/full-live-001/stdout.txt), [stderr](audit-executions/full-live-001/stderr.txt).
