# F126: exact commands, individual rows and real lifetime evidence

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Preserve root and both real redirect results | `DefaultReturns200`, `MinimumAge10RedirectsWhenNotLoggedIn`, `MinimumAge50RedirectsWhenNotLoggedIn`: pass on original, actual default and candidate |
| Preserve different users and per-request requirement evaluation | `MinimumAge10WorksIfOldEnough`, `MinimumAge10FailsIfNotOldEnough`, `MinimumAge50WorksIfOldEnough`, `MinimumAge50FailsIfNotOldEnough`: pass on all three source roles |
| Real owning endpoint producer reaches the cache opt-in | `MinimumAgePolicyIsCachedBetweenRequests(policyName: "MinimumAge10")` and `MinimumAgePolicyIsCachedBetweenRequests(policyName: "MinimumAge50")`: EACH specifically red with two real original calls, then green with one candidate call after both original real302 responses |
| Policy contents, direct construction, configured delegation and cultures | [Original/default/candidate seal](premeasurement-validation.json), [actual characterization source](harness/Characterization.cs): real MVC metadata, fresh direct instances, older/younger handler evaluation, named/default/fallback options, malformed/unknown/overflow names and 50 name/culture cases per owner |
| Real supported metadata update without restart | [Live-edit audit](hot-reload-verified.json), [actual successful watch command](hot-reload/actual-sample-003/watch-command.json), [raw watch log](hot-reload/actual-sample-003/watch.stdout.txt): age10 ->11 ->10, same app PID34008, two applied batches, one startup, six real302s, handler ages10/10/11/11/10/10, exact controller restore and owned cleanup |
| Measured owner isolation | [Original](images/Original/closure.json) and [candidate](images/Candidate/closure.json): 352 entries, 350 identical INCLUDING compiled common harness DLL/PDB; only actual sample owner DLL/PDB differ. Six selected documents match actual owner PE/PDB |
| Runnable exact-input reconstruction | [Receipt](reconstruction-paired-001/verified-reproduction.json): eight byte-exact inputs freshly rebuilt with zero warnings, both measured owners characterized with identical stable observations, no additional timing |
| All numerical and execution evidence | [Native-inclusive audit](native-inclusive-audit.stdout.txt): 288 samples, 36 raw GC records, actual overhead arithmetic and 72 before/after normal-priority settings records; [independent arithmetic](independent-numerical-audit.json) |

The **32 XML executions** are original-existing7 + original-with-new-rows9 + actual-default7 + candidate9 = **30 passed and two individually expected original failures**, not32 unique passing tests. The old and young HTTP cases remain genuine handler/page tests. The new strict forwarding spy forwards the actual registered provider and real owner flag; it does not inject a cached policy or synthetic endpoint.

## Retained failed prerequisites and corrections

All failed commands and outputs below remain. The first current-default restore forced the wrong global TargetFramework; its corrected restore/build has zero warnings/errors and all seven HTTP tests pass. The initial benchmark build accidentally included generator references and deprecated host constructors, producing four warnings. The accepted common harness excludes generators and uses supported generic HostBuilder/ConfigureWebHost/UseTestServer, with async creation/warmup completed in Main before synchronous GlobalSetup. Its exact earlier inputs and logs are retained; all corrections precede timing.

Watch attempts001/002 never reached a running app or controller edit: short -p properties conflict with --project; properties after the child delimiter do not bind the initial watch build and hit the existing ANCM prerequisite. Attempt003 uses proven long --property:Name=value options before the delimiter. No machine setting, framework callback or private cache was manually altered. Its [baseline](hot-reload/actual-sample-003/baseline-warmed.json), [after actual edit](hot-reload/actual-sample-003/after-controller-attribute-edit.json), [after exact restore](hot-reload/actual-sample-003/after-exact-controller-restore.json) and [owned stop](hot-reload/actual-sample-003/watch-stopped.json) are preserved.

The rebuilt Original characterization succeeded before an overstrict location audit incorrectly demanded that Microsoft.Extensions runtime abstractions load from the copied image. [The initial audit failure](reconstruction-paired-001/audit-failure-001.json) and exact executed driver remain. The corrected audit requires measured image-relative relocation for copied image assemblies and identical absolute paths/bytes for measured pinned-runtime assemblies, then completes Candidate using the SAME successful rebuild. It does not replace observations or consume timing.

### actual-watch-global-property-discovery-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('watch', '--list', '--project', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\CustomPolicyProvider.csproj', '--verbose', '--property:UseIisNativeAssets=false', '--property:BuildNodeJS=false', '--property:StaticWebAssetsEnabled=false', '--property:UseSharedCompilation=false', '--property:BuildInParallel=false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/actual-watch-global-property-discovery-001/command.json), [result](validation/actual-watch-global-property-discovery-001/result.json), [stdout](validation/actual-watch-global-property-discovery-001/stdout.txt), [stderr](validation/actual-watch-global-property-discovery-001/stderr.txt).

### actual-watch-usage-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('watch', '--help')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/actual-watch-usage-001/command.json), [result](validation/actual-watch-usage-001/result.json), [stdout](validation/actual-watch-usage-001/stdout.txt), [stderr](validation/actual-watch-usage-001/stderr.txt).

### candidate-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Candidate\image\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\candidate-characterization-001\state', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Candidate\closure.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Candidate\source-inputs.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Candidate\source', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\candidate-characterization-001\reports-not-timed', 'Candidate', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/candidate-characterization-001/command.json), [result](validation/candidate-characterization-001/result.json), [stdout](validation/candidate-characterization-001/stdout.txt), [stderr](validation/candidate-characterization-001/stderr.txt).

### candidate-functional-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/candidate-functional-build-001/command.json), [result](validation/candidate-functional-build-001/result.json), [stdout](validation/candidate-functional-build-001/stdout.txt), [stderr](validation/candidate-functional-build-001/stderr.txt).

### candidate-functional-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-build', '--no-restore', '-c', 'Release', '-f', 'net12.0', '--filter', 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests', '--logger', 'trx;LogFileName=results.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\validation\candidate-functional-tests-001\test-results', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; 9 individual XML rows passed; zero skipped.
[Command](validation/candidate-functional-tests-001/command.json), [result](validation/candidate-functional-tests-001/result.json), [stdout](validation/candidate-functional-tests-001/stdout.txt), [stderr](validation/candidate-functional-tests-001/stderr.txt), [individual-row audit](validation/candidate-functional-tests-001/individual-results.audit.json), [actual XML](validation/candidate-functional-tests-001/test-results/results.trx).

### candidate-hot-reload-debug-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\CustomPolicyProvider.csproj', '--no-restore', '-c', 'Debug', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/candidate-hot-reload-debug-build-001/command.json), [result](validation/candidate-hot-reload-debug-build-001/result.json), [stdout](validation/candidate-hot-reload-debug-build-001/stdout.txt), [stderr](validation/candidate-hot-reload-debug-build-001/stderr.txt).

### candidate-whitespace-check-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Security', '--folder', '--include', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\Authorization\MinimumAgePolicyProvider.cs', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\CustomPolicyProviderTests.cs', '--verify-no-changes', '--verbosity', 'minimal')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/candidate-whitespace-check-001/command.json), [result](validation/candidate-whitespace-check-001/result.json), [stdout](validation/candidate-whitespace-check-001/stdout.txt), [stderr](validation/candidate-whitespace-check-001/stderr.txt).

### common-harness-clean-initial-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('clean', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\harness\AutoPerf.Benchmarks.csproj', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:BuildProjectReferences=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/common-harness-clean-initial-001/command.json), [result](validation/common-harness-clean-initial-001/result.json), [stdout](validation/common-harness-clean-initial-001/stdout.txt), [stderr](validation/common-harness-clean-initial-001/stderr.txt).

### default-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Default\image\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\default-characterization-001\state', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Default\closure.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Default\source-inputs.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Default\source', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\default-characterization-001\reports-not-timed', 'Default', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/default-characterization-001/command.json), [result](validation/default-characterization-001/result.json), [stdout](validation/default-characterization-001/stdout.txt), [stderr](validation/default-characterization-001/stderr.txt).

### default-existing-functional-build-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; NETSDK1004: absent actual-default functional assets; the subsequent scoped restore was required.
[Command](validation/default-existing-functional-build-001/command.json), [result](validation/default-existing-functional-build-001/result.json), [stdout](validation/default-existing-functional-build-001/stdout.txt), [stderr](validation/default-existing-functional-build-001/stderr.txt).

### default-existing-functional-build-002

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; NETSDK1005: the first restore incorrectly forced global net12.0 and omitted a required netstandard2.0 MSBuild-task target; restoring without the global TargetFramework fixed the prerequisite.
[Command](validation/default-existing-functional-build-002/command.json), [result](validation/default-existing-functional-build-002/result.json), [stdout](validation/default-existing-functional-build-002/stdout.txt), [stderr](validation/default-existing-functional-build-002/stderr.txt).

### default-existing-functional-build-003

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/default-existing-functional-build-003/command.json), [result](validation/default-existing-functional-build-003/result.json), [stdout](validation/default-existing-functional-build-003/stdout.txt), [stderr](validation/default-existing-functional-build-003/stderr.txt).

### default-existing-functional-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-build', '--no-restore', '-c', 'Release', '-f', 'net12.0', '--filter', 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests', '--logger', 'trx;LogFileName=results.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\validation\default-existing-functional-tests-001\test-results', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; 7 individual XML rows passed; zero skipped.
[Command](validation/default-existing-functional-tests-001/command.json), [result](validation/default-existing-functional-tests-001/result.json), [stdout](validation/default-existing-functional-tests-001/stdout.txt), [stderr](validation/default-existing-functional-tests-001/stderr.txt), [individual-row audit](validation/default-existing-functional-tests-001/individual-results.audit.json), [actual XML](validation/default-existing-functional-tests-001/test-results/results.trx).

### default-functional-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--disable-parallel', '-v', 'minimal', '-p:TargetFramework=net12.0', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/default-functional-restore-001/command.json), [result](validation/default-functional-restore-001/result.json), [stdout](validation/default-functional-restore-001/stdout.txt), [stderr](validation/default-functional-restore-001/stderr.txt).

### default-functional-restore-002

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--disable-parallel', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/default-functional-restore-002/command.json), [result](validation/default-functional-restore-002/result.json), [stdout](validation/default-functional-restore-002/stdout.txt), [stderr](validation/default-functional-restore-002/stderr.txt).

### original-cache-contract-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/original-cache-contract-build-001/command.json), [result](validation/original-cache-contract-build-001/result.json), [stdout](validation/original-cache-contract-build-001/stdout.txt), [stderr](validation/original-cache-contract-build-001/stderr.txt).

### original-cache-contract-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-build', '--no-restore', '-c', 'Release', '-f', 'net12.0', '--filter', 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests', '--logger', 'trx;LogFileName=results.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\validation\original-cache-contract-tests-001\test-results', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; expected red: seven existing rows passed and EACH of the two new rows reached the final Moq assertion and failed specifically because two actual lookups occurred instead of one.
[Command](validation/original-cache-contract-tests-001/command.json), [result](validation/original-cache-contract-tests-001/result.json), [stdout](validation/original-cache-contract-tests-001/stdout.txt), [stderr](validation/original-cache-contract-tests-001/stderr.txt), [individual-row audit](validation/original-cache-contract-tests-001/individual-results.audit.json), [actual XML](validation/original-cache-contract-tests-001/test-results/results.trx).

### original-characterization-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Original\image\AutoPerf.Benchmarks.dll', 'characterize', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\original-characterization-001\state', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Original\closure.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Original\source-inputs.json', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\images\Original\source', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\characterization\original-characterization-001\reports-not-timed', 'Original', 'none')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/original-characterization-001/command.json), [result](validation/original-characterization-001/result.json), [stdout](validation/original-characterization-001/stdout.txt), [stderr](validation/original-characterization-001/stderr.txt).

### original-common-harness-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 1; NETSDK1004: absent new harness assets; the scoped restore followed this actual missing-dependency failure.
[Command](validation/original-common-harness-build-001/command.json), [result](validation/original-common-harness-build-001/result.json), [stdout](validation/original-common-harness-build-001/stdout.txt), [stderr](validation/original-common-harness-build-001/stderr.txt).

### original-common-harness-build-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; build completed with four premeasurement warnings; exact initial inputs/warning output retained and corrected before the accepted zero-warning build.
[Command](validation/original-common-harness-build-002/command.json), [result](validation/original-common-harness-build-002/result.json), [stdout](validation/original-common-harness-build-002/stdout.txt), [stderr](validation/original-common-harness-build-002/stderr.txt).

### original-common-harness-build-003

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\harness\AutoPerf.Benchmarks.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/original-common-harness-build-003/command.json), [result](validation/original-common-harness-build-003/result.json), [stdout](validation/original-common-harness-build-003/stdout.txt), [stderr](validation/original-common-harness-build-003/stderr.txt).

### original-common-harness-restore-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\harness\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '--disable-parallel', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/original-common-harness-restore-001/command.json), [result](validation/original-common-harness-restore-001/result.json), [stdout](validation/original-common-harness-restore-001/stdout.txt), [stderr](validation/original-common-harness-restore-001/stderr.txt).

### original-existing-functional-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('test', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-build', '--no-restore', '-c', 'Release', '-f', 'net12.0', '--filter', 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests', '--logger', 'trx;LogFileName=results.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\validation\original-existing-functional-tests-001\test-results', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; 7 individual XML rows passed; zero skipped.
[Command](validation/original-existing-functional-tests-001/command.json), [result](validation/original-existing-functional-tests-001/result.json), [stdout](validation/original-existing-functional-tests-001/stdout.txt), [stderr](validation/original-existing-functional-tests-001/stderr.txt), [individual-row audit](validation/original-existing-functional-tests-001/individual-results.audit.json), [actual XML](validation/original-existing-functional-tests-001/test-results/results.trx).

### original-functional-build-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$arguments = @('build', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
```

**Result:** exit 0; passed within the explicitly documented boundary.
[Command](validation/original-functional-build-001/command.json), [result](validation/original-functional-build-001/result.json), [stdout](validation/original-functional-build-001/stdout.txt), [stderr](validation/original-functional-build-001/stderr.txt).


## Exact untimed reconstruction command outcomes

[First no-restore build](reconstruction-paired-001/Build-NoRestore-First/command.json): expected NETSDK1004 before the fresh assets existed.
[Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original characterization](reconstruction-paired-001/Original-Characterize/command.json), and [Candidate characterization](reconstruction-paired-001/Candidate-Characterize/command.json): EACH exit0; build zero warnings. Every command preserves executable, exact arguments, activated root, timestamps and raw stdout/stderr.

Managed-only command-scoped exclusions UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false do not validate native IIS/ANCM, browser/JavaScript, static-asset production or packaging, legacy TFMs, full-repository builds, AOT/trimming or network throughput. The actual-default graph was separately source-built; its owner-only common-image characterization is explicitly not full-default binary isolation.
