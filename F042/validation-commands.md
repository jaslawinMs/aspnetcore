# F042: actual commands and results

Managed commands use the activated repository-local .NET SDK, at most two MSBuild workers, no shared compilation or node reuse.
Every row below links the exact recorded argument array, working directory, timestamps and actual exit/launch result.
Historical absolute paths are evidence, not copy/paste replay permission.

| Boundary | Result | Exact command record | Raw stdout | Raw stderr |
|---|---|---|---|---|
| comparison-001/Candidate | Passed; exit0 | [arguments](comparison-001/Candidate/command.json) | [stdout](comparison-001/Candidate/stdout.txt) | [stderr](comparison-001/Candidate/stderr.txt) |
| comparison-001/Original | Passed; exit0 | [arguments](comparison-001/Original/command.json) | [stdout](comparison-001/Original/stdout.txt) | [stderr](comparison-001/Original/stderr.txt) |
| comparison-002/Candidate | Passed; exit0 | [arguments](comparison-002/Candidate/command.json) | [stdout](comparison-002/Candidate/stdout.txt) | [stderr](comparison-002/Candidate/stderr.txt) |
| comparison-002/Original | Passed; exit0 | [arguments](comparison-002/Original/command.json) | [stdout](comparison-002/Original/stdout.txt) | [stderr](comparison-002/Original/stderr.txt) |
| comparison-003/Candidate | Passed; exit0 | [arguments](comparison-003/Candidate/command.json) | [stdout](comparison-003/Candidate/stdout.txt) | [stderr](comparison-003/Candidate/stderr.txt) |
| comparison-003/Original | Passed; exit0 | [arguments](comparison-003/Original/command.json) | [stdout](comparison-003/Original/stdout.txt) | [stderr](comparison-003/Original/stderr.txt) |
| reproduction-paired-001/Build | Passed; exit0 | [arguments](reproduction-paired-001/Build/command.json) | [stdout](reproduction-paired-001/Build/stdout.txt) | [stderr](reproduction-paired-001/Build/stderr.txt) |
| reproduction-paired-001/Candidate-CharacterizeRun | Passed; exit0 | [arguments](reproduction-paired-001/Candidate-CharacterizeRun/command.json) | [stdout](reproduction-paired-001/Candidate-CharacterizeRun/stdout.txt) | [stderr](reproduction-paired-001/Candidate-CharacterizeRun/stderr.txt) |
| reproduction-paired-001/Original-CharacterizeRun | Passed; exit0 | [arguments](reproduction-paired-001/Original-CharacterizeRun/command.json) | [stdout](reproduction-paired-001/Original-CharacterizeRun/stdout.txt) | [stderr](reproduction-paired-001/Original-CharacterizeRun/stderr.txt) |
| reproduction-paired-001/Restore | Passed; exit0 | [arguments](reproduction-paired-001/Restore/command.json) | [stdout](reproduction-paired-001/Restore/stdout.txt) | [stderr](reproduction-paired-001/Restore/stderr.txt) |
| validation/candidate-dictionary-tests-001 | Passed; exit0 | [arguments](validation/candidate-dictionary-tests-001/command.json) | [stdout](validation/candidate-dictionary-tests-001/stdout.txt) | [stderr](validation/candidate-dictionary-tests-001/stderr.txt) |
| validation/candidate-format-whitespace-001 | Failed; exit1 | [arguments](validation/candidate-format-whitespace-001/command.json) | [stdout](validation/candidate-format-whitespace-001/stdout.txt) | [stderr](validation/candidate-format-whitespace-001/stderr.txt) |
| validation/candidate-format-whitespace-002 | Passed; exit0 | [arguments](validation/candidate-format-whitespace-002/command.json) | [stdout](validation/candidate-format-whitespace-002/stdout.txt) | [stderr](validation/candidate-format-whitespace-002/stderr.txt) |
| validation/candidate-public-characterization-001 | Passed; exit0 | [arguments](validation/candidate-public-characterization-001/command.json) | [stdout](validation/candidate-public-characterization-001/stdout.txt) | [stderr](validation/candidate-public-characterization-001/stderr.txt) |
| validation/default-bootstrap-and-owner-build-001 | Failed; exit1 | [arguments](validation/default-bootstrap-and-owner-build-001/command.json) | [combined output](validation/default-bootstrap-and-owner-build-001/combined-output.txt) | Combined at left |
| validation/default-bootstrap-and-owner-build-002 | Failed; exit1 | [arguments](validation/default-bootstrap-and-owner-build-002/command.json) | [combined output](validation/default-bootstrap-and-owner-build-002/combined-output.txt) | Combined at left |
| validation/default-bootstrap-and-owner-build-003 | Passed; exit0 | [arguments](validation/default-bootstrap-and-owner-build-003/command.json) | [combined output](validation/default-bootstrap-and-owner-build-003/combined-output.txt) | Combined at left |
| validation/default-harness-build-001 | Passed; exit0 | [arguments](validation/default-harness-build-001/command.json) | [stdout](validation/default-harness-build-001/stdout.txt) | [stderr](validation/default-harness-build-001/stderr.txt) |
| validation/default-harness-build-002 | Passed; exit0 | [arguments](validation/default-harness-build-002/command.json) | [stdout](validation/default-harness-build-002/stdout.txt) | [stderr](validation/default-harness-build-002/stderr.txt) |
| validation/default-owner-build-001 | Did not launch; invalid executable-array selection | [arguments](validation/default-owner-build-001/command.json) | Not launched | [launch failure](validation/default-owner-build-001/launch-failure.json) |
| validation/default-owner-build-002 | Failed; exit1 | [arguments](validation/default-owner-build-002/command.json) | [stdout](validation/default-owner-build-002/stdout.txt) | [stderr](validation/default-owner-build-002/stderr.txt) |
| validation/default-public-characterization-001 | Passed; exit0 | [arguments](validation/default-public-characterization-001/command.json) | [stdout](validation/default-public-characterization-001/stdout.txt) | [stderr](validation/default-public-characterization-001/stderr.txt) |
| validation/original-common-harness-build-001 | Passed; exit0 | [arguments](validation/original-common-harness-build-001/command.json) | [stdout](validation/original-common-harness-build-001/stdout.txt) | [stderr](validation/original-common-harness-build-001/stderr.txt) |
| validation/original-dictionary-tests-001 | Passed; exit0 | [arguments](validation/original-dictionary-tests-001/command.json) | [stdout](validation/original-dictionary-tests-001/stdout.txt) | [stderr](validation/original-dictionary-tests-001/stderr.txt) |
| validation/original-public-characterization-001 | Passed; exit0 | [arguments](validation/original-public-characterization-001/command.json) | [stdout](validation/original-public-characterization-001/stdout.txt) | [stderr](validation/original-public-characterization-001/stderr.txt) |

## Successful tests and formatting

The original and candidate each pass34selected tests,0failed,0skipped.
The identical filter combines DictionaryAdapterTest, IntegrationTests.DictionaryTest and DictionaryReplaceTest.
All five new execution identities, including clear:False and clear:True, are individually XML-parsed by F042-audit-trx.ps1.
The full selected command is reproduced below from the actual original record:

```powershell
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj' '--configuration' 'Release' '--no-restore' '--verbosity' 'quiet' '-m:2' '-nr:false' '-p:UseIisNativeAssets=false' '-p:UseSharedCompilation=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.DictionaryAdapterTest|FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.IntegrationTests.DictionaryTest|FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.IntegrationTests.DictionaryReplaceTest' '--logger' 'trx;LogFileName=results.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F042\validation\original-dictionary-tests-001\results'
```

Result:34passed,0failed,0skipped; the candidate command has the same filter and its own retained output/TRX.
The supported two-file whitespace002 command passes; unsupported whitespace001 is explicitly retained as failed.

## Independent arithmetic and runnable-project verification

Arithmetic audit001 failed a simple-name/root-DLL assumption;002 failed a fixed20overhead-samples assumption.
Their exact source versions and stderr remain. Corrected003 passes all576samples, allocations and both XML inventories.
Fresh project Restore and Build pass; Original-CharacterizeRun and Candidate-CharacterizeRun each pass16cases and12lifecycles.
No test is relabeled as bug-fix red/green, no whole repository/default suite or extra timing is claimed.

```powershell
node .\F042-verify.mjs . --require-seal
```

Portable audit requires Node and PowerShell7. The copied-capsule passing output is retained separately.
Source publication commands/results are in [source-publication-invocations.json](source-publication-invocations.json).
