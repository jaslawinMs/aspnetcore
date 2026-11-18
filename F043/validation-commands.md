# F043: actual commands and results

Every managed invocation activates the reviewed repository-local .NET environment.
Builds use at most two workers, no shared compilation or node reuse. No machine priority, affinity or power setting is changed.
Historical absolute paths are observations, not a claim that frozen binaries or old private paths are published.

| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |
|---|---|---|---|---|
| comparison-001/Candidate | Passed; exit 0 | [arguments](comparison-001/Candidate/command.json) | [stdout](comparison-001/Candidate/stdout.txt) | [stderr](comparison-001/Candidate/stderr.txt) |
| comparison-001/Original | Passed; exit 0 | [arguments](comparison-001/Original/command.json) | [stdout](comparison-001/Original/stdout.txt) | [stderr](comparison-001/Original/stderr.txt) |
| comparison-002/Candidate | Passed; exit 0 | [arguments](comparison-002/Candidate/command.json) | [stdout](comparison-002/Candidate/stdout.txt) | [stderr](comparison-002/Candidate/stderr.txt) |
| comparison-002/Original | Passed; exit 0 | [arguments](comparison-002/Original/command.json) | [stdout](comparison-002/Original/stdout.txt) | [stderr](comparison-002/Original/stderr.txt) |
| comparison-003/Candidate | Passed; exit 0 | [arguments](comparison-003/Candidate/command.json) | [stdout](comparison-003/Candidate/stdout.txt) | [stderr](comparison-003/Candidate/stderr.txt) |
| comparison-003/Original | Passed; exit 0 | [arguments](comparison-003/Original/command.json) | [stdout](comparison-003/Original/stdout.txt) | [stderr](comparison-003/Original/stderr.txt) |
| reproduction-paired-001/Build | Passed; exit 0 | [arguments](reproduction-paired-001/Build/command.json) | [stdout](reproduction-paired-001/Build/stdout.txt) | [stderr](reproduction-paired-001/Build/stderr.txt) |
| reproduction-paired-001/Candidate-CharacterizeRun | Passed; exit 0 | [arguments](reproduction-paired-001/Candidate-CharacterizeRun/command.json) | [stdout](reproduction-paired-001/Candidate-CharacterizeRun/stdout.txt) | [stderr](reproduction-paired-001/Candidate-CharacterizeRun/stderr.txt) |
| reproduction-paired-001/Original-CharacterizeRun | Passed; exit 0 | [arguments](reproduction-paired-001/Original-CharacterizeRun/command.json) | [stdout](reproduction-paired-001/Original-CharacterizeRun/stdout.txt) | [stderr](reproduction-paired-001/Original-CharacterizeRun/stderr.txt) |
| reproduction-paired-001/Restore | Passed; exit 0 | [arguments](reproduction-paired-001/Restore/command.json) | [stdout](reproduction-paired-001/Restore/stdout.txt) | [stderr](reproduction-paired-001/Restore/stderr.txt) |
| validation/candidate-characterization-001 | Passed; exit 0 | [arguments](validation/candidate-characterization-001/command.json) | [stdout](validation/candidate-characterization-001/stdout.txt) | [stderr](validation/candidate-characterization-001/stderr.txt) |
| validation/candidate-format-whitespace-001 | Passed; exit 0 | [arguments](validation/candidate-format-whitespace-001/command.json) | [stdout](validation/candidate-format-whitespace-001/stdout.txt) | [stderr](validation/candidate-format-whitespace-001/stderr.txt) |
| validation/candidate-managed-razor-test-build-001 | Passed; exit 0 | [arguments](validation/candidate-managed-razor-test-build-001/command.json) | [stdout](validation/candidate-managed-razor-test-build-001/stdout.txt) | [stderr](validation/candidate-managed-razor-test-build-001/stderr.txt) |
| validation/candidate-razor-page-tests-001 | Passed; exit 0 | [arguments](validation/candidate-razor-page-tests-001/command.json) | [stdout](validation/candidate-razor-page-tests-001/stdout.txt) | [stderr](validation/candidate-razor-page-tests-001/stderr.txt) |
| validation/common-harness-build-001 | Failed; exit 1 | [arguments](validation/common-harness-build-001/command.json) | [stdout](validation/common-harness-build-001/stdout.txt) | [stderr](validation/common-harness-build-001/stderr.txt) |
| validation/common-harness-build-002 | Passed; exit 0 | [arguments](validation/common-harness-build-002/command.json) | [stdout](validation/common-harness-build-002/stdout.txt) | [stderr](validation/common-harness-build-002/stderr.txt) |
| validation/common-harness-restore-001 | Passed; exit 0 | [arguments](validation/common-harness-restore-001/command.json) | [stdout](validation/common-harness-restore-001/stdout.txt) | [stderr](validation/common-harness-restore-001/stderr.txt) |
| validation/current-default-characterization-001 | Passed; exit 0 | [arguments](validation/current-default-characterization-001/command.json) | [stdout](validation/current-default-characterization-001/stdout.txt) | [stderr](validation/current-default-characterization-001/stderr.txt) |
| validation/default-managed-assets-build-001 | Passed; exit 0 | [arguments](validation/default-managed-assets-build-001/command.json) | [stdout](validation/default-managed-assets-build-001/stdout.txt) | [stderr](validation/default-managed-assets-build-001/stderr.txt) |
| validation/default-managed-razor-build-005 | Passed; exit 0 | [arguments](validation/default-managed-razor-build-005/command.json) | [stdout](validation/default-managed-razor-build-005/stdout.txt) | [stderr](validation/default-managed-razor-build-005/stderr.txt) |
| validation/default-razor-build-001 | Failed; exit 1 | [arguments](validation/default-razor-build-001/command.json) | [stdout](validation/default-razor-build-001/stdout.txt) | [stderr](validation/default-razor-build-001/stderr.txt) |
| validation/default-razor-build-002 | Failed; exit 1 | [arguments](validation/default-razor-build-002/command.json) | [stdout](validation/default-razor-build-002/stdout.txt) | [stderr](validation/default-razor-build-002/stderr.txt) |
| validation/default-razor-build-003 | Failed; exit 1 | [arguments](validation/default-razor-build-003/command.json) | [stdout](validation/default-razor-build-003/stdout.txt) | [stderr](validation/default-razor-build-003/stderr.txt) |
| validation/default-razor-build-004 | Failed; exit 1 | [arguments](validation/default-razor-build-004/command.json) | [stdout](validation/default-razor-build-004/stdout.txt) | [stderr](validation/default-razor-build-004/stderr.txt) |
| validation/original-characterization-001 | Passed; exit 0 | [arguments](validation/original-characterization-001/command.json) | [stdout](validation/original-characterization-001/stdout.txt) | [stderr](validation/original-characterization-001/stderr.txt) |
| validation/original-managed-razor-test-prerequisites-build-002 | Passed; exit 0 | [arguments](validation/original-managed-razor-test-prerequisites-build-002/command.json) | [stdout](validation/original-managed-razor-test-prerequisites-build-002/stdout.txt) | [stderr](validation/original-managed-razor-test-prerequisites-build-002/stderr.txt) |
| validation/original-razor-page-tests-001 | Passed; exit 0 | [arguments](validation/original-razor-page-tests-001/command.json) | [stdout](validation/original-razor-page-tests-001/stdout.txt) | [stderr](validation/original-razor-page-tests-001/stderr.txt) |
| validation/original-razor-test-prerequisites-build-001 | Failed; exit 1 | [arguments](validation/original-razor-test-prerequisites-build-001/command.json) | [stdout](validation/original-razor-test-prerequisites-build-001/stdout.txt) | [stderr](validation/original-razor-test-prerequisites-build-001/stderr.txt) |

## Passed owning tests

Original and candidate each pass all 59 RazorPageTest cases, 0 failed and 0 skipped.
The two new DefineSection_RejectsCaseInsensitiveDuplicateWithoutReplacingWriter rows, scripts and SCRIPTS,
are individually XML-parsed and passed in each version. This is green/green preservation, not bug-fix red/green.

The actual original command is:

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj' '--no-restore' '-c' 'Release' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:StaticWebAssetsEnabled=false' '-p:UseSharedCompilation=false' '/m:2' '/nr:false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Razor.RazorPageTest' '--logger' 'trx;LogFileName=F043-original-razor.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F043\validation\original-razor-page-tests-001\test-results' '--nologo'
```

Result: 59 passed, 0 failed, 0 skipped. The candidate uses the same class selection, after an explicit passed owning-graph build.
The candidate --no-build test command does not mutate frozen build inputs.

## Scope and retained preparation failures

The actual current-default managed owner build is default-managed-razor-build-005, with 0 warnings/errors.
Earlier missing restore/JS/static-web-asset attempts are retained as failures, not relabeled successful full builds.
UseIisNativeAssets=false resolves the managed test graph native ANCM prerequisite; no native IIS validation is claimed.
BuildNodeJS=false and StaticWebAssetsEnabled=false intentionally exclude JS/static-web-assets.
The first compiler fixtures failed RZ2005 because section directives shared a line. The failed generator and exact fixture sources are retained under preparation/compiler-fixture-001.
The corrected real compiler fixtures and common-harness-build-002 pass with 0 warnings/errors.
The first unflagged-long-path intake and its exact script remain under preparation/intake-001; explicit per-command longpaths permits the subsequent clean intake.

## Independent checks

Arithmetic audit 001 passes all 576 retained observations, adaptive overhead, statistics, allocations and both XML inventories.
Fresh project Restore and Build pass; both independently rebuilt consumers pass 9 contracts and 12 real registration/rendering boundaries.
The closed budget, measured images, shipping source, tests, protected manifests and unrelated reports remain unchanged.
The final audit checks 22 runtime records and 144 per-benchmark settings records. No extra timing is performed.

[Source publication commands/results](source-publication-invocations.json) and [full independent audit](audit-summary.json) remain available.

```powershell
node .\F043-verify.mjs . --require-seal
```
