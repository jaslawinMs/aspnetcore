# F044: actual commands and results

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
| validation/default-managed-razor-build-001 | Passed; exit 0 | [arguments](validation/default-managed-razor-build-001/command.json) | [stdout](validation/default-managed-razor-build-001/stdout.txt) | [stderr](validation/default-managed-razor-build-001/stderr.txt) |
| validation/original-characterization-001 | Passed; exit 0 | [arguments](validation/original-characterization-001/command.json) | [stdout](validation/original-characterization-001/stdout.txt) | [stderr](validation/original-characterization-001/stderr.txt) |
| validation/original-managed-razor-test-build-001 | Passed; exit 0 | [arguments](validation/original-managed-razor-test-build-001/command.json) | [stdout](validation/original-managed-razor-test-build-001/stdout.txt) | [stderr](validation/original-managed-razor-test-build-001/stderr.txt) |
| validation/original-razor-page-tests-001 | Passed; exit 0 | [arguments](validation/original-razor-page-tests-001/command.json) | [stdout](validation/original-razor-page-tests-001/stdout.txt) | [stderr](validation/original-razor-page-tests-001/stderr.txt) |

## Passed owning tests

Original and candidate each pass all59 RazorPageTest cases,0failed/0skipped.
Each scripts/SCRIPTS row of DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter is independently XML-parsed.
The new Mock<RazorPageBase> CallBase rows target the base body; existing override coverage is adjacent, not real base-producer proof.
This is green/green preservation, not bug-fix red/green.

The actual original command is:

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj' '--no-build' '--no-restore' '-c' 'Release' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Razor.RazorPageTest' '--logger' 'trx;LogFileName=F044-original-razor.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F044\validation\original-razor-page-tests-001\test-results'
```

Result:59passed,0failed,0skipped. Candidate uses the same class selection after an explicit passed owning-graph build.

## Actual compiler and build boundaries

default-managed-razor-build-001 passes on observed current default31c15331c03714b7a602e1817e65881474c29e2e,0warnings/errors.
The original/candidate managed test-graph builds pass,0warnings/errors, as does common-harness-build-002.
common-harness-build-001 fails CS0534 with21errors: the direct-base fixtures initially lacked three required abstract member implementations.
Its actual13input files and initial fixture manifest are preserved in preparation/direct-base-compiler-001.
Corrected fixture-only context hooks match real RazorPage no-ops; EnsureRenderedBodyOrSections explicitly rejects a layout role.
No fixture overrides or copies DefineSection. Actual RazorPage layouts consume every registered section through actual RazorView and scoped pooled buffers.
UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false intentionally exclude native IIS and JS/static assets.
No full-repository, native IIS, packaging, browser or application pass is claimed.

## Independent checks

The arithmetic audit reconstructs all576 actual-minus-overhead observations, statistics, allocations and both XML inventories.
Fresh project Restore and Build pass; both independently rebuilt consumers pass10contracts and12real registration/rendering boundaries without timing.
The closed budget, measured images, shipping source/tests, manifests and unrelated reports remain unchanged.
The final audit checks22runtime records and144per-benchmark settings records.

[Source publication commands/results](source-publication-invocations.json) and [full audit](audit-summary.json).

```powershell
node .\F044-verify.mjs . --require-seal
```
