# F047: exact executed commands and observed results

Every managed invocation activates the reviewed checkout-local SDK first. Builds use at most two workers, no shared compilation or node reuse.
Power-plan changes are disabled. Original observed process/thread priority and affinity are preserved.
These are historical commands, not authorization to rerun the permanently closed timing budget.

## Managed commands

| Boundary | Result | Exact activated script | Raw stdout | Raw stderr |
|---|---|---|---|---|
| candidate-characterize-001 | Passed; exit 0 | [actual script](validation/candidate-characterize-001/command.ps1) | [stdout](validation/candidate-characterize-001/stdout.txt) | [stderr](validation/candidate-characterize-001/stderr.txt) |
| candidate-endpoints-test-build-001 | Passed; exit 0 | [actual script](validation/candidate-endpoints-test-build-001/command.ps1) | [stdout](validation/candidate-endpoints-test-build-001/stdout.txt) | [stderr](validation/candidate-endpoints-test-build-001/stderr.txt) |
| candidate-preservation-tests-001 | Passed; exit 0 | [actual script](validation/candidate-preservation-tests-001/command.ps1) | [stdout](validation/candidate-preservation-tests-001/stdout.txt) | [stderr](validation/candidate-preservation-tests-001/stderr.txt) |
| candidate-sample-build-001 | Passed; exit 0 | [actual script](validation/candidate-sample-build-001/command.ps1) | [stdout](validation/candidate-sample-build-001/stdout.txt) | [stderr](validation/candidate-sample-build-001/stderr.txt) |
| candidate-selenium-build-001 | Passed; exit 0 | [actual script](validation/candidate-selenium-build-001/command.ps1) | [stdout](validation/candidate-selenium-build-001/stdout.txt) | [stderr](validation/candidate-selenium-build-001/stderr.txt) |
| candidate-source-whitespace-001 | Passed; exit 0 | [actual script](validation/candidate-source-whitespace-001/command.ps1) | [stdout](validation/candidate-source-whitespace-001/stdout.txt) | [stderr](validation/candidate-source-whitespace-001/stderr.txt) |
| default-characterize-001 | Passed; exit 0 | [actual script](validation/default-characterize-001/command.ps1) | [stdout](validation/default-characterize-001/stdout.txt) | [stderr](validation/default-characterize-001/stderr.txt) |
| default-endpoints-test-build-001 | Failed; exit 1 | [actual script](validation/default-endpoints-test-build-001/command.ps1) | [stdout](validation/default-endpoints-test-build-001/stdout.txt) | [stderr](validation/default-endpoints-test-build-001/stderr.txt) |
| default-endpoints-test-build-002 | Passed; exit 0 | [actual script](validation/default-endpoints-test-build-002/command.ps1) | [stdout](validation/default-endpoints-test-build-002/stdout.txt) | [stderr](validation/default-endpoints-test-build-002/stderr.txt) |
| default-endpoints-test-restore-001 | Passed; exit 0 | [actual script](validation/default-endpoints-test-restore-001/command.ps1) | [stdout](validation/default-endpoints-test-restore-001/stdout.txt) | [stderr](validation/default-endpoints-test-restore-001/stderr.txt) |
| default-existing-endpoints-tests-001 | Passed; exit 0 | [actual script](validation/default-existing-endpoints-tests-001/command.ps1) | [stdout](validation/default-existing-endpoints-tests-001/stdout.txt) | [stderr](validation/default-existing-endpoints-tests-001/stderr.txt) |
| original-characterize-001 | Passed; exit 0 | [actual script](validation/original-characterize-001/command.ps1) | [stdout](validation/original-characterize-001/stdout.txt) | [stderr](validation/original-characterize-001/stderr.txt) |
| original-endpoints-test-build-001 | Passed; exit 0 | [actual script](validation/original-endpoints-test-build-001/command.ps1) | [stdout](validation/original-endpoints-test-build-001/stdout.txt) | [stderr](validation/original-endpoints-test-build-001/stderr.txt) |
| original-existing-endpoints-tests-001 | Passed; exit 0 | [actual script](validation/original-existing-endpoints-tests-001/command.ps1) | [stdout](validation/original-existing-endpoints-tests-001/stdout.txt) | [stderr](validation/original-existing-endpoints-tests-001/stderr.txt) |
| original-harness-build-001 | Passed; exit 0 | [actual script](validation/original-harness-build-001/command.ps1) | [stdout](validation/original-harness-build-001/stdout.txt) | [stderr](validation/original-harness-build-001/stderr.txt) |
| original-harness-restore-001 | Passed; exit 0 | [actual script](validation/original-harness-restore-001/command.ps1) | [stdout](validation/original-harness-restore-001/stdout.txt) | [stderr](validation/original-harness-restore-001/stderr.txt) |
| original-preservation-build-001 | Passed; exit 0 | [actual script](validation/original-preservation-build-001/command.ps1) | [stdout](validation/original-preservation-build-001/stdout.txt) | [stderr](validation/original-preservation-build-001/stderr.txt) |
| original-preservation-build-002 | Passed; exit 0 | [actual script](validation/original-preservation-build-002/command.ps1) | [stdout](validation/original-preservation-build-002/stdout.txt) | [stderr](validation/original-preservation-build-002/stderr.txt) |
| original-preservation-tests-001 | Failed; exit 1 | [actual script](validation/original-preservation-tests-001/command.ps1) | [stdout](validation/original-preservation-tests-001/stdout.txt) | [stderr](validation/original-preservation-tests-001/stderr.txt) |
| original-preservation-tests-002 | Passed; exit 0 | [actual script](validation/original-preservation-tests-002/command.ps1) | [stdout](validation/original-preservation-tests-002/stdout.txt) | [stderr](validation/original-preservation-tests-002/stderr.txt) |
| original-sample-build-001 | Passed; exit 0 | [actual script](validation/original-sample-build-001/command.ps1) | [stdout](validation/original-sample-build-001/stdout.txt) | [stderr](validation/original-sample-build-001/stderr.txt) |

## Characterization, timing and independent reconstruction commands

| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |
|---|---|---|---|---|
| comparison-001/Candidate | Passed; exit 0 | [arguments](comparison-001/Candidate/command.json) | [stdout](comparison-001/Candidate/stdout.txt) | [stderr](comparison-001/Candidate/stderr.txt) |
| comparison-001/Original | Passed; exit 0 | [arguments](comparison-001/Original/command.json) | [stdout](comparison-001/Original/stdout.txt) | [stderr](comparison-001/Original/stderr.txt) |
| comparison-002/Candidate | Passed; exit 0 | [arguments](comparison-002/Candidate/command.json) | [stdout](comparison-002/Candidate/stdout.txt) | [stderr](comparison-002/Candidate/stderr.txt) |
| comparison-002/Original | Passed; exit 0 | [arguments](comparison-002/Original/command.json) | [stdout](comparison-002/Original/stdout.txt) | [stderr](comparison-002/Original/stderr.txt) |
| comparison-003/Candidate | Passed; exit 0 | [arguments](comparison-003/Candidate/command.json) | [stdout](comparison-003/Candidate/stdout.txt) | [stderr](comparison-003/Candidate/stderr.txt) |
| comparison-003/Original | Passed; exit 0 | [arguments](comparison-003/Original/command.json) | [stdout](comparison-003/Original/stdout.txt) | [stderr](comparison-003/Original/stderr.txt) |
| reconstruction-paired-001/Build | Passed; exit 0 | [arguments](reconstruction-paired-001/Build/command.json) | [stdout](reconstruction-paired-001/Build/stdout.txt) | [stderr](reconstruction-paired-001/Build/stderr.txt) |
| reconstruction-paired-001/Candidate-Characterize | Passed; exit 0 | [arguments](reconstruction-paired-001/Candidate-Characterize/command.json) | [stdout](reconstruction-paired-001/Candidate-Characterize/stdout.txt) | [stderr](reconstruction-paired-001/Candidate-Characterize/stderr.txt) |
| reconstruction-paired-001/Original-Characterize | Passed; exit 0 | [arguments](reconstruction-paired-001/Original-Characterize/command.json) | [stdout](reconstruction-paired-001/Original-Characterize/stdout.txt) | [stderr](reconstruction-paired-001/Original-Characterize/stderr.txt) |
| reconstruction-paired-001/Restore | Passed; exit 0 | [arguments](reconstruction-paired-001/Restore/command.json) | [stdout](reconstruction-paired-001/Restore/stdout.txt) | [stderr](reconstruction-paired-001/Restore/stderr.txt) |
| selenium-candidate-001 | Passed; exit 0 | [arguments](selenium-candidate-001/command.json) | [stdout](selenium-candidate-001/stdout.log) | [stderr](selenium-candidate-001/stderr.log) |
| validation/candidate-characterize-001 | Passed; exit 0 | [arguments](validation/candidate-characterize-001/command.json) | [stdout](validation/candidate-characterize-001/stdout.txt) | [stderr](validation/candidate-characterize-001/stderr.txt) |
| validation/candidate-endpoints-test-build-001 | Passed; exit 0 | [arguments](validation/candidate-endpoints-test-build-001/command.json) | [stdout](validation/candidate-endpoints-test-build-001/stdout.txt) | [stderr](validation/candidate-endpoints-test-build-001/stderr.txt) |
| validation/candidate-preservation-tests-001 | Passed; exit 0 | [arguments](validation/candidate-preservation-tests-001/command.json) | [stdout](validation/candidate-preservation-tests-001/stdout.txt) | [stderr](validation/candidate-preservation-tests-001/stderr.txt) |
| validation/candidate-sample-build-001 | Passed; exit 0 | [arguments](validation/candidate-sample-build-001/command.json) | [stdout](validation/candidate-sample-build-001/stdout.txt) | [stderr](validation/candidate-sample-build-001/stderr.txt) |
| validation/candidate-selenium-build-001 | Passed; exit 0 | [arguments](validation/candidate-selenium-build-001/command.json) | [stdout](validation/candidate-selenium-build-001/stdout.txt) | [stderr](validation/candidate-selenium-build-001/stderr.txt) |
| validation/candidate-source-whitespace-001 | Passed; exit 0 | [arguments](validation/candidate-source-whitespace-001/command.json) | [stdout](validation/candidate-source-whitespace-001/stdout.txt) | [stderr](validation/candidate-source-whitespace-001/stderr.txt) |
| validation/default-characterize-001 | Passed; exit 0 | [arguments](validation/default-characterize-001/command.json) | [stdout](validation/default-characterize-001/stdout.txt) | [stderr](validation/default-characterize-001/stderr.txt) |
| validation/default-endpoints-test-build-001 | Failed; exit 1 | [arguments](validation/default-endpoints-test-build-001/command.json) | [stdout](validation/default-endpoints-test-build-001/stdout.txt) | [stderr](validation/default-endpoints-test-build-001/stderr.txt) |
| validation/default-endpoints-test-build-002 | Passed; exit 0 | [arguments](validation/default-endpoints-test-build-002/command.json) | [stdout](validation/default-endpoints-test-build-002/stdout.txt) | [stderr](validation/default-endpoints-test-build-002/stderr.txt) |
| validation/default-endpoints-test-restore-001 | Passed; exit 0 | [arguments](validation/default-endpoints-test-restore-001/command.json) | [stdout](validation/default-endpoints-test-restore-001/stdout.txt) | [stderr](validation/default-endpoints-test-restore-001/stderr.txt) |
| validation/default-existing-endpoints-tests-001 | Passed; exit 0 | [arguments](validation/default-existing-endpoints-tests-001/command.json) | [stdout](validation/default-existing-endpoints-tests-001/stdout.txt) | [stderr](validation/default-existing-endpoints-tests-001/stderr.txt) |
| validation/original-characterize-001 | Passed; exit 0 | [arguments](validation/original-characterize-001/command.json) | [stdout](validation/original-characterize-001/stdout.txt) | [stderr](validation/original-characterize-001/stderr.txt) |
| validation/original-endpoints-test-build-001 | Passed; exit 0 | [arguments](validation/original-endpoints-test-build-001/command.json) | [stdout](validation/original-endpoints-test-build-001/stdout.txt) | [stderr](validation/original-endpoints-test-build-001/stderr.txt) |
| validation/original-existing-endpoints-tests-001 | Passed; exit 0 | [arguments](validation/original-existing-endpoints-tests-001/command.json) | [stdout](validation/original-existing-endpoints-tests-001/stdout.txt) | [stderr](validation/original-existing-endpoints-tests-001/stderr.txt) |
| validation/original-harness-build-001 | Passed; exit 0 | [arguments](validation/original-harness-build-001/command.json) | [stdout](validation/original-harness-build-001/stdout.txt) | [stderr](validation/original-harness-build-001/stderr.txt) |
| validation/original-harness-restore-001 | Passed; exit 0 | [arguments](validation/original-harness-restore-001/command.json) | [stdout](validation/original-harness-restore-001/stdout.txt) | [stderr](validation/original-harness-restore-001/stderr.txt) |
| validation/original-preservation-build-001 | Passed; exit 0 | [arguments](validation/original-preservation-build-001/command.json) | [stdout](validation/original-preservation-build-001/stdout.txt) | [stderr](validation/original-preservation-build-001/stderr.txt) |
| validation/original-preservation-build-002 | Passed; exit 0 | [arguments](validation/original-preservation-build-002/command.json) | [stdout](validation/original-preservation-build-002/stdout.txt) | [stderr](validation/original-preservation-build-002/stderr.txt) |
| validation/original-preservation-tests-001 | Failed; exit 1 | [arguments](validation/original-preservation-tests-001/command.json) | [stdout](validation/original-preservation-tests-001/stdout.txt) | [stderr](validation/original-preservation-tests-001/stderr.txt) |
| validation/original-preservation-tests-002 | Passed; exit 0 | [arguments](validation/original-preservation-tests-002/command.json) | [stdout](validation/original-preservation-tests-002/stdout.txt) | [stderr](validation/original-preservation-tests-002/stderr.txt) |
| validation/original-sample-build-001 | Passed; exit 0 | [arguments](validation/original-sample-build-001/command.json) | [stdout](validation/original-sample-build-001/stdout.txt) | [stderr](validation/original-sample-build-001/stderr.txt) |

Actual default submodule initialization also passed: [arguments/result](default-submodules-command.json), [stdout](default-submodules.stdout.txt), [stderr](default-submodules.stderr.txt).

## Exact selected managed test scripts and outcomes

- original, existing: **98 individual rows passed, zero failed/skipped**; [XML audit](original-existing-trx-audit.json), [actual XML](validation/original-existing-endpoints-tests-001/test-results/F047-original-existing.trx).
- original, multiple-fragments: **3 individual rows passed, zero failed/skipped**; [XML audit](original-multiple-fragments-trx-audit.json), [actual XML](validation/original-preservation-tests-002/test-results/F047-original-multiple-fragments.trx).
- default, existing: **98 individual rows passed, zero failed/skipped**; [XML audit](default-existing-trx-audit.json), [actual XML](validation/default-existing-endpoints-tests-001/test-results/F047-default-existing.trx).
- candidate, all: **101 individual rows passed, zero failed/skipped**; [XML audit](candidate-trx-audit.json), [actual XML](validation/candidate-preservation-tests-001/test-results/F047-candidate-preservation.trx).

The new `CanPrerender_MultipleRenderFragmentParameters` theory passes all Server/WebAssembly/Auto rows on untouched shipping code and the candidate.
The original final inventory is 98 existing plus 3 new rows; current default has 98 existing rows; candidate has 101 rows.
This is green/green preservation, not a claim that a functional bug was fixed.

## Real-browser producer boundaries

The original and candidate canonical per-page samples each pass Server/WebAssembly/Auto with prerendering enabled and disabled: six cases and six real clicks per source.
[Original browser records](sample-original/browser-result.json) and [candidate browser records](sample-candidate/browser-result.json) bind loaded owners, DOM state, asset responses, console/network observations and precise helper cleanup.
For prerendered cases, two distinct fragments and interleaved scalar/null parameters survive real activation and interaction.
Auto platform selection is recorded, not claimed to cover cached versus uncached selection.

The existing owning `RenderFragmentSerializationTest` suite passes **all 14 individual Server/WebAssembly rows**, zero skips/failures.
Its real nested component case includes outer and inner child interactions, beyond the harness nested-fragment/region check.
[Exact Selenium launch/result](selenium-candidate-001/command.json), [activated Selenium driver](executed-drivers/F047-selenium.ps1), [individual XML audit](selenium-candidate-001/all-trx-rows.json), [verified cleanup](selenium-candidate-001/verified-result.json).

## Preserved preparation failures and corrections

- `default-endpoints-test-build-001`: NETSDK1004 because restore assets were missing. The actual targeted restore and successful retry are retained.
- `CanPrerender_MultipleRenderFragmentParameters(mode: "auto")` in `original-preservation-tests-001` cannot reach its new assertion: the first fixture incorrectly invokes unsupported explicit root-result Auto prerendering. The existing producer throws NotImplementedException in UpdateSaveStateRenderMode. This is not a discovered product defect.
- The corrected fixture uses the real nested render-mode producer, matching the successful canonical sample. All three rows pass in `original-preservation-tests-002` before shipping edits; all candidate rows pass. The original failed 100/101 invocation and XML remain.
- The original characterization managed command passed. An initial controller post-parser counted the dictionary-contract record as a runtime record; the corrected filename selector audited the same successful run without relaunching it. No timing authorization was consumed.

## Independent checks

All 384 retained observations, adaptive overhead corrections, statistics and allocation rounding are recomputed independently.
The auditor reparses 314 individual passing XML rows and checks 22 runtime and 96 per-benchmark settings records.
The exact eight-file project is relocated, restored and rebuilt. Both fresh source variants repeat 24 renderer profiles, 12 invalid-delegate cases, 3 expected disabled-fragment serialization failures, one nested-fragment case and 8 real benchmark lifecycles, without timing.
Only the rebuilt common harness DLL/PDB differs from its measured image. All source owners/dependencies, measured images, source/tests, SDK/NuGet files, unrelated reports and the closed budget remain unchanged.

[Source publication commands/results](source-publication-invocations.json), [full audit](audit-summary.json), [reconstruction receipt](reconstruction-paired-001/verified-reproduction.json).

```powershell
node .\F047-verify.mjs . --require-seal
```

Packaging, AOT/trimming, global Router/template matrices, enhanced navigation/streaming overlap, cached Auto selection and HTTP/application throughput are unverified boundaries.
