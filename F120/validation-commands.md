# F120: exact commands and actual outcomes

Activate the appropriate repository-local SDK before every dotnet invocation. Historical commands below did so explicitly.
Managed builds use at most two workers, no shared compilation or node reuse; no host settings are changed.
These are evidence paths, not permission to replay closed measurement authorizations.

## Managed build, restore, format and characterization commands

| Actual invocation | Result | Exact activated script | Raw stdout | Raw stderr |
|---|---|---|---|---|
| candidate-characterize-001 | Passed; exit0 | [command](validation/candidate-characterize-001/command.ps1) | [stdout](validation/candidate-characterize-001/stdout.txt) | [stderr](validation/candidate-characterize-001/stderr.txt) |
| candidate-characterize-002 | Passed; exit0 | [command](validation/candidate-characterize-002/command.ps1) | [stdout](validation/candidate-characterize-002/stdout.txt) | [stderr](validation/candidate-characterize-002/stderr.txt) |
| candidate-core-build-001 | Passed; exit0 | [command](validation/candidate-core-build-001/command.ps1) | [stdout](validation/candidate-core-build-001/stdout.txt) | [stderr](validation/candidate-core-build-001/stderr.txt) |
| candidate-core-tests-001 | Passed; exit0 | [command](validation/candidate-core-tests-001/command.ps1) | [stdout](validation/candidate-core-tests-001/stdout.txt) | [stderr](validation/candidate-core-tests-001/stderr.txt) |
| candidate-pages-build-001 | Passed; exit0 | [command](validation/candidate-pages-build-001/command.ps1) | [stdout](validation/candidate-pages-build-001/stdout.txt) | [stderr](validation/candidate-pages-build-001/stderr.txt) |
| candidate-pages-tests-001 | Passed; exit0 | [command](validation/candidate-pages-tests-001/command.ps1) | [stdout](validation/candidate-pages-tests-001/stdout.txt) | [stderr](validation/candidate-pages-tests-001/stderr.txt) |
| candidate-source-whitespace-001 | Passed; exit0 | [command](validation/candidate-source-whitespace-001/command.ps1) | [stdout](validation/candidate-source-whitespace-001/stdout.txt) | [stderr](validation/candidate-source-whitespace-001/stderr.txt) |
| default-characterize-001 | Passed; exit0 | [command](validation/default-characterize-001/command.ps1) | [stdout](validation/default-characterize-001/stdout.txt) | [stderr](validation/default-characterize-001/stderr.txt) |
| default-characterize-002 | Passed; exit0 | [command](validation/default-characterize-002/command.ps1) | [stdout](validation/default-characterize-002/stdout.txt) | [stderr](validation/default-characterize-002/stderr.txt) |
| default-core-test-build-001 | Failed; exit1 | [command](validation/default-core-test-build-001/command.ps1) | [stdout](validation/default-core-test-build-001/stdout.txt) | [stderr](validation/default-core-test-build-001/stderr.txt) |
| default-core-test-build-002 | Passed; exit0 | [command](validation/default-core-test-build-002/command.ps1) | [stdout](validation/default-core-test-build-002/stdout.txt) | [stderr](validation/default-core-test-build-002/stderr.txt) |
| default-core-test-restore-001 | Failed; exit1 | [command](validation/default-core-test-restore-001/command.ps1) | [stdout](validation/default-core-test-restore-001/stdout.txt) | [stderr](validation/default-core-test-restore-001/stderr.txt) |
| default-core-test-restore-002 | Passed; exit0 | [command](validation/default-core-test-restore-002/command.ps1) | [stdout](validation/default-core-test-restore-002/stdout.txt) | [stderr](validation/default-core-test-restore-002/stderr.txt) |
| default-existing-tests-001 | Passed; exit0 | [command](validation/default-existing-tests-001/command.ps1) | [stdout](validation/default-existing-tests-001/stdout.txt) | [stderr](validation/default-existing-tests-001/stderr.txt) |
| default-testhost-build-001 | Failed; exit1 | [command](validation/default-testhost-build-001/command.ps1) | [stdout](validation/default-testhost-build-001/stdout.txt) | [stderr](validation/default-testhost-build-001/stderr.txt) |
| default-testhost-build-002 | Passed; exit0 | [command](validation/default-testhost-build-002/command.ps1) | [stdout](validation/default-testhost-build-002/stdout.txt) | [stderr](validation/default-testhost-build-002/stderr.txt) |
| default-testhost-restore-001 | Passed; exit0 | [command](validation/default-testhost-restore-001/command.ps1) | [stdout](validation/default-testhost-restore-001/stdout.txt) | [stderr](validation/default-testhost-restore-001/stderr.txt) |
| harness-build-001 | Failed; exit1 | [command](validation/harness-build-001/command.ps1) | [stdout](validation/harness-build-001/stdout.txt) | [stderr](validation/harness-build-001/stderr.txt) |
| harness-build-002 | Passed; exit0 | [command](validation/harness-build-002/command.ps1) | [stdout](validation/harness-build-002/stdout.txt) | [stderr](validation/harness-build-002/stderr.txt) |
| harness-build-003 | Passed; exit0 | [command](validation/harness-build-003/command.ps1) | [stdout](validation/harness-build-003/stdout.txt) | [stderr](validation/harness-build-003/stderr.txt) |
| harness-build-004 | Passed; exit0 | [command](validation/harness-build-004/command.ps1) | [stdout](validation/harness-build-004/stdout.txt) | [stderr](validation/harness-build-004/stderr.txt) |
| harness-build-005 | Passed; exit0 | [command](validation/harness-build-005/command.ps1) | [stdout](validation/harness-build-005/stdout.txt) | [stderr](validation/harness-build-005/stderr.txt) |
| harness-restore-001 | Passed; exit0 | [command](validation/harness-restore-001/command.ps1) | [stdout](validation/harness-restore-001/stdout.txt) | [stderr](validation/harness-restore-001/stderr.txt) |
| harness-restore-002 | Passed; exit0 | [command](validation/harness-restore-002/command.ps1) | [stdout](validation/harness-restore-002/stdout.txt) | [stderr](validation/harness-restore-002/stderr.txt) |
| harness-restore-003 | Passed; exit0 | [command](validation/harness-restore-003/command.ps1) | [stdout](validation/harness-restore-003/stdout.txt) | [stderr](validation/harness-restore-003/stderr.txt) |
| harness-restore-004 | Passed; exit0 | [command](validation/harness-restore-004/command.ps1) | [stdout](validation/harness-restore-004/stdout.txt) | [stderr](validation/harness-restore-004/stderr.txt) |
| original-characterize-001 | Failed; exit3762504530 | [command](validation/original-characterize-001/command.ps1) | [stdout](validation/original-characterize-001/stdout.txt) | [stderr](validation/original-characterize-001/stderr.txt) |
| original-characterize-002 | Passed; exit0 | [command](validation/original-characterize-002/command.ps1) | [stdout](validation/original-characterize-002/stdout.txt) | [stderr](validation/original-characterize-002/stderr.txt) |
| original-characterize-003 | Passed; exit0 | [command](validation/original-characterize-003/command.ps1) | [stdout](validation/original-characterize-003/stdout.txt) | [stderr](validation/original-characterize-003/stderr.txt) |
| original-core-test-build-001 | Passed; exit0 | [command](validation/original-core-test-build-001/command.ps1) | [stdout](validation/original-core-test-build-001/stdout.txt) | [stderr](validation/original-core-test-build-001/stderr.txt) |
| original-existing-tests-001 | Passed; exit0 | [command](validation/original-existing-tests-001/command.ps1) | [stdout](validation/original-existing-tests-001/stdout.txt) | [stderr](validation/original-existing-tests-001/stderr.txt) |
| original-preservation-build-001 | Failed; exit1 | [command](validation/original-preservation-build-001/command.ps1) | [stdout](validation/original-preservation-build-001/stdout.txt) | [stderr](validation/original-preservation-build-001/stderr.txt) |
| original-preservation-build-002 | Passed; exit0 | [command](validation/original-preservation-build-002/command.ps1) | [stdout](validation/original-preservation-build-002/stdout.txt) | [stderr](validation/original-preservation-build-002/stderr.txt) |
| original-preservation-build-003 | Passed; exit0 | [command](validation/original-preservation-build-003/command.ps1) | [stdout](validation/original-preservation-build-003/stdout.txt) | [stderr](validation/original-preservation-build-003/stderr.txt) |
| original-preservation-tests-001 | Failed; exit1 | [command](validation/original-preservation-tests-001/command.ps1) | [stdout](validation/original-preservation-tests-001/stdout.txt) | [stderr](validation/original-preservation-tests-001/stderr.txt) |
| original-preservation-tests-002 | Passed; exit0 | [command](validation/original-preservation-tests-002/command.ps1) | [stdout](validation/original-preservation-tests-002/stdout.txt) | [stderr](validation/original-preservation-tests-002/stderr.txt) |
| original-testhost-build-001 | Passed; exit0 | [command](validation/original-testhost-build-001/command.ps1) | [stdout](validation/original-testhost-build-001/stdout.txt) | [stderr](validation/original-testhost-build-001/stderr.txt) |

Preparation failures are retained, not counted as successful tests or hidden retries.
They include missing restore assets, an unreachable metadata feed, missing Hosting/Server dependency closure,
the xUnit collection-assert analyzer and a Moq verification-order fixture defect.
The final harness build005 has0warnings/0errors. A command-only NuGetAudit=false option follows the recorded metadata-feed failure; no configuration or SDK pin was edited.

## Individual passing test rows and exact commands

| Invocation | Passing rows | Focused preservation rows | Parsed XML | Independent audit |
|---|---:|---:|---|---|
| original-existing-tests-001 | 28 | 0 | [TRX](validation/original-existing-tests-001/test-results/F120-original-existing.trx) | [row inventory](validation/original-existing-tests-001/test-row-audit.json) |
| default-existing-tests-001 | 28 | 0 | [TRX](validation/default-existing-tests-001/test-results/F120-default-existing.trx) | [row inventory](validation/default-existing-tests-001/test-row-audit.json) |
| original-preservation-tests-002 | 35 | 7 | [TRX](validation/original-preservation-tests-002/test-results/F120-original-preservation.trx) | [row inventory](validation/original-preservation-tests-002/test-row-audit.json) |
| candidate-core-tests-001 | 35 | 7 | [TRX](validation/candidate-core-tests-001/test-results/F120-candidate-core.trx) | [row inventory](validation/candidate-core-tests-001/test-row-audit.json) |
| candidate-pages-tests-001 | 9 | 0 | [TRX](validation/candidate-pages-tests-001/test-results/F120-candidate-pages.trx) | [row inventory](validation/candidate-pages-tests-001/test-row-audit.json) |

These sum to135historical passing executions, not135unique tests. The seven new rows are green on unchanged source and candidate.
Every Boolean theory row is separately named and checked; no semantic-bug red/green claim is made.

### original-preservation-tests-002 - passed

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F120-original-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F120\validation\original-preservation-tests-002\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
```

### candidate-core-tests-001 - passed

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F120-candidate-core.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F120\validation\candidate-core-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
```

### candidate-pages-tests-001 - passed

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.RazorPages\test\Microsoft.AspNetCore.Mvc.RazorPages.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.PageInvokerProviderTest', '--logger', 'trx;LogFileName=F120-candidate-pages.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F120\validation\candidate-pages-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
```

### candidate-source-whitespace-001 - passed

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '--verify-no-changes', '--include', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\src\Infrastructure\CopyOnWriteList.cs', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Infrastructure\CopyOnWriteListTest.cs', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
```

The selected Pages class is PageInvokerProviderTest (not the longer filename). Nine rows pass; no compiled-page request is implied.

## Timing authorizations

| Attempt | Actual source execution | Result | Exact command record |
|---:|---|---|---|
| 1 | Original only | Failed before workload; slot consumed | [Original command](comparison-001/Original/command.json) |
| 2 | Candidate then Original | All16cases/source;256retained samples | [Candidate](comparison-002/Candidate/command.json), [Original](comparison-002/Original/command.json) |
| 3 | Original then Candidate | All16cases/source;256retained samples | [Original](comparison-003/Original/command.json), [Candidate](comparison-003/Candidate/command.json) |

No timing follows permanent budget closure. Only common untimed setup was repaired after attempt1; no performance profiles/gates or candidate source were retuned.

## Exact-input independent reconstruction

| Invocation | Result | Exact argument record | Raw output |
|---|---|---|---|
| Restore | Passed; exit0; no timing | [command](reconstruction-paired-001/Restore/command.json) | [stdout](reconstruction-paired-001/Restore/stdout.txt), [stderr](reconstruction-paired-001/Restore/stderr.txt) |
| Build | Passed; exit0; no timing | [command](reconstruction-paired-001/Build/command.json) | [stdout](reconstruction-paired-001/Build/stdout.txt), [stderr](reconstruction-paired-001/Build/stderr.txt) |
| Original-Characterize | Passed; exit0; no timing | [command](reconstruction-paired-001/Original-Characterize/command.json) | [stdout](reconstruction-paired-001/Original-Characterize/stdout.txt), [stderr](reconstruction-paired-001/Original-Characterize/stderr.txt) |
| Candidate-Characterize | Passed; exit0; no timing | [command](reconstruction-paired-001/Candidate-Characterize/command.json) | [stdout](reconstruction-paired-001/Candidate-Characterize/stdout.txt), [stderr](reconstruction-paired-001/Candidate-Characterize/stderr.txt) |

Eight byte-exact inputs are restored/rebuilt against the existing source-built product graph.
Both reconstructed328-file images hold measured owners and other dependencies fixed; only common harness DLL/PDB differ.
Each variant passes48actual HTTP requests,16public contracts,six equality/enumeration contracts and eight lifecycles.
No clean-machine framework rebuild, application throughput, full suite, packaging, browser or additional timing is claimed.

## Portable audit

```powershell
node .\F120-verify.mjs . --require-seal
```

Requires Node and PowerShell7. Actual live and copied-capsule audit results are retained. The XML helper escapes non-ASCII names losslessly through Windows pipes.
The initial arithmetic observer was corrected for BDN display-label abbreviation and console encoding; measured files and qualification gates were not changed.
