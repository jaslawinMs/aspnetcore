# F123: exact validation commands and outcomes

Every managed shell activates its repository-pinned SDK. Builds use at most two workers, no shared compilation or node reuse, serialized with measurement. Existing command-only managed scope excludes native IIS/static-assets prerequisites; no SDK pin, source or feed configuration was changed to evade a prerequisite. No IIS/native, browser, packaging or full-repository coverage is claimed.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| First match, misses, empty/null/duplicate references and source/copy isolation | `IndexOf_PreservesFirstMatchNullsAndSourceIsolation`, both Boolean rows, original and candidate |
| Preserve object.Equals rather than differing IEquatable equality, reference and value types | `IndexOf_UsesLegacyObjectEquality`, both Boolean rows |
| Stored-left equality order and short-circuiting | `IndexOf_PreservesStoredLeftEqualityOrderAndShortCircuit`, both Boolean rows |
| Actual copied-list mutation throws on next MoveNext, but not after a matching early return | `IndexOf_CopiedStorePreservesMutationDetection`, both Boolean rows |
| Arbitrary source enumeration, no Count/indexer assumption, disposal on match/completion | `IndexOf_ArbitrarySourceDisposesOnMatchOrCompletion`, both Boolean rows |
| Current/equality failures propagate the exact instance and dispose the actual enumerator | `IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure`, both Boolean rows |
| Actual MVC producer and consumer, both invoker modes, IndexOf observed in HTTP response | [Original](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json), [candidate](characterization-candidate-characterize-001/verified-characterization.json): 72 requests, 24 public contracts and twelve additional semantic contracts per variant |
| Source/PE-PDB/owner/settings bindings and actual numerical observations | [Full audit](audit-summary.json): 117 accepted passing XML executions, 22 runtime records, 288 settings records and 1,152 observations |
| Fresh exact-eight-input restore/build and both measured owner/dependency variants | [Actual reconstruction](reconstruction-paired-001/verified-reproduction.json); no extra timing |

These are **green/green preservation checks**, not a semantic-bug red/green claim. The managed collection boundary owns the disputed equality, mutation, disposal and index effects. A real HTTP application also executes the actual public IList.IndexOf and exposes -1/0/4 in its response; no typical framework call frequency is inferred.

## Preparation corrections and XML boundary

The first new fixture used Moq with a private generic argument; two rows never reached IndexOf or their assertion. The corrected fixture keeps the helper private and uses public `IEnumerator<object>`/`IReadOnlyList<object>` interfaces returning the same real equality objects. No access mechanism or shipping behavior changed. All twelve successor rows then passed.

A reused results path in the first successful rerun overwrote the initial failing TRX. **That initial failing XML is not preserved.** Its raw stdout/stderr and exit are preserved, and the misdirected successful XML is not counted as accepted evidence. A subsequent fresh-directory original run supplies forty individually parsed passing rows. The accepted total is original 40 + actual default 28 + candidate Core 40 + candidate Pages 9 = **117 executions, not 117 unique tests**. [Correction receipt](preparation-correction.json) and [initial fixture snapshot](preparation-history/original-test-source-before-moq-visibility-correction.cs) retain this limitation. A command guard now rejects results paths outside their unique attempt directory.

### candidate-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\consumer-candidate\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-candidate-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\closure-candidate.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-inputs-candidate.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-files-candidate', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-candidate-characterize-001\not-timed-reports', 'Candidate', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the stated scope.
[Command](validation/candidate-characterize-001/command.json), [result](validation/candidate-characterize-001/result.json), [stdout](validation/candidate-characterize-001/stdout.txt), [stderr](validation/candidate-characterize-001/stderr.txt).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/candidate-core-build-001/command.json), [result](validation/candidate-core-build-001/result.json), [stdout](validation/candidate-core-build-001/stdout.txt), [stderr](validation/candidate-core-build-001/stderr.txt).

### candidate-core-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F123-candidate-core.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\candidate-core-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 40 individual XML rows passed, including 12 new preservation rows; none failed or skipped.
[Command](validation/candidate-core-tests-001/command.json), [result](validation/candidate-core-tests-001/result.json), [stdout](validation/candidate-core-tests-001/stdout.txt), [stderr](validation/candidate-core-tests-001/stderr.txt), [row audit](validation/candidate-core-tests-001/test-row-audit.json), [actual XML](validation/candidate-core-tests-001/test-results/F123-candidate-core.trx).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/candidate-pages-build-001/command.json), [result](validation/candidate-pages-build-001/result.json), [stdout](validation/candidate-pages-build-001/stdout.txt), [stderr](validation/candidate-pages-build-001/stderr.txt).

### candidate-pages-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.PageInvokerProviderTest', '--logger', 'trx;LogFileName=F123-candidate-pages.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\candidate-pages-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 9 individual XML rows passed, including 0 new preservation rows; none failed or skipped.
[Command](validation/candidate-pages-tests-001/command.json), [result](validation/candidate-pages-tests-001/result.json), [stdout](validation/candidate-pages-tests-001/stdout.txt), [stderr](validation/candidate-pages-tests-001/stderr.txt), [row audit](validation/candidate-pages-tests-001/test-row-audit.json), [actual XML](validation/candidate-pages-tests-001/test-results/F123-candidate-pages.trx).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/candidate-source-whitespace-001/command.json), [result](validation/candidate-source-whitespace-001/result.json), [stdout](validation/candidate-source-whitespace-001/stdout.txt), [stderr](validation/candidate-source-whitespace-001/stderr.txt).

### default-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\consumer-current-default\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-default-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\closure-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-inputs-current-default.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-files-current-default', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-default-characterize-001\not-timed-reports', 'Default', 'none')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the stated scope.
[Command](validation/default-characterize-001/command.json), [result](validation/default-characterize-001/result.json), [stdout](validation/default-characterize-001/stdout.txt), [stderr](validation/default-characterize-001/stderr.txt).

### default-existing-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F123-default-existing.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\default-existing-tests-001\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 28 individual XML rows passed, including 0 new preservation rows; none failed or skipped.
[Command](validation/default-existing-tests-001/command.json), [result](validation/default-existing-tests-001/result.json), [stdout](validation/default-existing-tests-001/stdout.txt), [stderr](validation/default-existing-tests-001/stderr.txt), [row audit](validation/default-existing-tests-001/test-row-audit.json), [actual XML](validation/default-existing-tests-001/test-results/F123-default-existing.trx).

### harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-p:BuildProjectReferences=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the stated scope.
[Command](validation/harness-build-001/command.json), [result](validation/harness-build-001/result.json), [stdout](validation/harness-build-001/stdout.txt), [stderr](validation/harness-build-001/stderr.txt).

### harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '-p:NuGetAudit=false', '-p:RestoreBuildInParallel=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the stated scope.
[Command](validation/harness-restore-001/command.json), [result](validation/harness-restore-001/result.json), [stdout](validation/harness-restore-001/stdout.txt), [stderr](validation/harness-restore-001/stderr.txt).

### original-characterize-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\consumer-original\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-original-characterize-001\states', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\closure-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-inputs-original.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\source-files-original', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\characterization-original-characterize-001\not-timed-reports', 'Original', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the stated scope.
[Command](validation/original-characterize-001/command.json), [result](validation/original-characterize-001/result.json), [stdout](validation/original-characterize-001/stdout.txt), [stderr](validation/original-characterize-001/stderr.txt).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/original-preservation-build-001/command.json), [result](validation/original-preservation-build-001/result.json), [stdout](validation/original-preservation-build-001/stdout.txt), [stderr](validation/original-preservation-build-001/stderr.txt).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/original-preservation-build-002/command.json), [result](validation/original-preservation-build-002/result.json), [stdout](validation/original-preservation-build-002/stdout.txt), [stderr](validation/original-preservation-build-002/stderr.txt).

### original-preservation-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F123-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\original-preservation-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; failed: two rows stopped before IndexOf/assertion because Moq could not proxy a private generic argument; raw failure streams remain, but the initial failing TRX was subsequently overwritten.
[Command](validation/original-preservation-tests-001/command.json), [result](validation/original-preservation-tests-001/result.json), [stdout](validation/original-preservation-tests-001/stdout.txt), [stderr](validation/original-preservation-tests-001/stderr.txt).

### original-preservation-tests-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F123-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\original-preservation-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 40 rows passed according to the raw runner output, but a reused results directory overwrote the first attempt TRX; this misdirected report is excluded from accepted XML evidence; attempt 003 supplies fresh individual-row proof.
[Command](validation/original-preservation-tests-002/command.json), [result](validation/original-preservation-tests-002/result.json), [stdout](validation/original-preservation-tests-002/stdout.txt), [stderr](validation/original-preservation-tests-002/stderr.txt).

### original-preservation-tests-003

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F123-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F123\validation\original-preservation-tests-003\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; all 40 individual XML rows passed, including 12 new preservation rows; none failed or skipped.
[Command](validation/original-preservation-tests-003/command.json), [result](validation/original-preservation-tests-003/result.json), [stdout](validation/original-preservation-tests-003/stdout.txt), [stderr](validation/original-preservation-tests-003/stderr.txt), [row audit](validation/original-preservation-tests-003/test-row-audit.json), [actual XML](validation/original-preservation-tests-003/test-results/F123-original-preservation.trx).

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

**Result:** exit 0; passed within the stated scope.
[Command](validation/preservation-format-001/command.json), [result](validation/preservation-format-001/result.json), [stdout](validation/preservation-format-001/stdout.txt), [stderr](validation/preservation-format-001/stderr.txt).


## Independent reconstruction and full audit

Exact activated commands and successful outcomes: [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original](reconstruction-paired-001/Original-Characterize/command.json), [Candidate](reconstruction-paired-001/Candidate-Characterize/command.json).

The authoritative final recomputation has its [exact command and exit](full-live-audit.command.json), [stdout](full-live-audit.stdout.txt) and [stderr](full-live-audit.stderr.txt). Rebuilding changed only the common harness DLL/PDB; measured owner/dependency images and the closed budget remained fixed. Interim audits remain historical; the final audit recomputes all three comparisons.
