# F142 validation commands and actual outcomes

**Final result: measurement-identity-inconclusive; no performance PR.** The common measurement DLL/PDB differ across the two measured images. [Final adjudication](final-qualification.json) preserves the raw numerical allocation result but rejects full qualification. The original pre-timing exclusion was too broad; the permanently closed budget is not reopened to repair it.

The following variables abbreviate the **actual recorded** Windows paths:

```powershell
$R = 'C:\src\aspnetcore'
$S = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$F = "$S\autoperf-runs\F142"
Set-Location $R
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
```

Activation was performed before each native dotnet command. Output directories below are historical and must not be overwritten. These are command/result records, not permission to replay the closed measurement budget.

## Real document producer and untimed captured workload

The exact executable, ArgumentList, source revision, activation, return code and native-process lifecycle for every restore/build/verification command are in:

| Source role | Exact command record | Actual result |
|---|---|---|
| Original 37e809 | [Original commands](canonical-preflight-005/Original/commands.json) | All native commands exit 0; seven complete provider-produced documents and seven verify-only workload rows pass |
| Observed default ae89581 | [Default commands](canonical-preflight-005/Default/commands.json) | All native commands exit 0; same seven complete documents and seven verify-only rows pass |
| Candidate c663c44 | [Candidate commands](canonical-candidate-001/Candidate/commands.json) | All native commands exit 0; same seven complete documents and seven verify-only rows pass |

All three used the frozen [eight-file input seal](harness/input-seal.json). Full assertions await the actual registered provider and compare descriptions, names, aliases, integer examples, omitted CancellationToken and genuine request-body documentation. Original/candidate complete documents and typed operation snapshots match byte for byte.

## Explicit existing-test build

```powershell
& "$R\.dotnet\dotnet.exe" build "$R\src\OpenApi\test\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests.csproj" -c Release --no-restore -t:Rebuild --verbosity minimal -p:BuildProjectReferences=false -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:StaticWebAssetsEnabled=false -p:UseSharedCompilation=false /m:2 /nr:false
```

**Passed: exit 0, zero warnings and zero errors.** [Exact invocation](existing-tests/Candidate-build-001/invocation.json), [stdout](existing-tests/Candidate-build-001/stdout.txt), [completion](existing-tests/Candidate-build-001/completion.json). Actual candidate generator image was checked against the measured candidate before testing.

## Existing source-generator suite

```powershell
& "$R\.dotnet\dotnet.exe" vstest "$F\existing-tests\Original-001\consumer\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests.dll" '--Logger:trx;LogFileName=Original.trx' "--ResultsDirectory:$F\existing-tests\Original-001\results"
```

**Passed: 25/25, zero failed/skipped.** [Invocation](existing-tests/Original-001/invocation.json), [actual XML](existing-tests/Original-001/results/Original.trx).

```powershell
& "$R\.dotnet\dotnet.exe" vstest "$F\existing-tests\Candidate-before-snapshots-001\consumer\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests.dll" '--Logger:trx;LogFileName=Candidate-before-snapshots.trx' "--ResultsDirectory:$F\existing-tests\Candidate-before-snapshots-001\results"
```

**Expected old-golden mismatch: 17 VerifyException failures, eight passed, zero skipped.** Every received file was checked before updating: its only difference was the two-line local-array seam emitted by the candidate. [Exact invocation](existing-tests/Candidate-before-snapshots-001/invocation.json), [strict update receipt and old/received files](existing-tests/snapshot-update-001/update.json). This failure history is retained, not relabeled as passing.

```powershell
& "$R\.dotnet\dotnet.exe" vstest "$F\existing-tests\Candidate-before-snapshots-001\consumer\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests.dll" '--Logger:trx;LogFileName=Candidate-after-snapshots.trx' "--ResultsDirectory:$F\existing-tests\Candidate-after-snapshots-001\results"
```

**Passed: the same 25/25 exact names, zero failed/skipped.** Same compiled candidate consumer as before; only 17 expected golden files changed. [Invocation](existing-tests/Candidate-after-snapshots-001/invocation.json), [actual XML](existing-tests/Candidate-after-snapshots-001/results/Candidate-after-snapshots.trx), [independent per-name audit](existing-tests/exact-row-verification.json).

`DiffEngine_Disabled=true` was process-only to suppress interactive diff windows. Existing tests requested installed runtime 12.0.0-alpha.1.26562.105, distinct from the measurement runtime 12.0.0-alpha.1.26565.104.

## Three actual performance comparisons

The fixed [request](benchmark-request-001.json), [exact synchronous driver](executed-drivers/F142-compare.mjs), [activated native launcher](executed-drivers/Invoke-MeasurementChild.ps1) and [gateway](executed-drivers/Invoke-AutoPerfBenchmark.ps1) were executed for all three authorizations. Every native invocation is recorded alongside its raw sample file:

| Comparison | Fixed order | Result |
|---|---|---|
| [001](comparisons/001/result.json) | Original, candidate | All 14 children exit 0; primary saves 168 B/op, 3.6334% less time |
| [002](comparisons/002/result.json) | Candidate, original | All 14 children exit 0; primary saves 168 B/op, 4.6695% less time |
| [003](comparisons/003/result.json) | Original, candidate | All 14 children exit 0; primary saves 168 B/op, 4.4260% less time |

The driver authorizes before timing, checks accepted input/image hashes, then awaits each launcher/native child to terminal exit. No build/test/host worker was active during these comparisons. This is a shared machine, not a guarantee of arbitrary third-party inactivity. [630-sample independent numerical evaluation](measurement-decision.json): numerical allocation gate passes, time gate fails, all secondary controls pass. **The final common-harness identity gate fails, so this is not a qualified performance improvement.** [Budget](diagnostic-budget.json) is permanently closed; **no extra timing is allowed**.

## Fresh paired untimed reconstruction

```powershell
& "$S\F142-reconstruct-untimed.ps1" -SourceRoot $R -InputDirectory "$F\canonical-preflight-inputs-005" -OriginalAttempt "$F\canonical-preflight-005\Original" -CandidateAttempt "$F\canonical-candidate-001\Candidate" -FreshOutputDirectory "$F\reconstruction-paired-001" -ClosedBudgetFile "$F\diagnostic-budget.json"
```

**Passed:** fresh restore/build exit 0; original/candidate verify-only children exit 0; all seven rows per role pass; three exact common source inputs and measured owner/other image bytes are unchanged; closed budget bytes unchanged; zero additional measurements. [Receipt](reconstruction-paired-001/verified-reproduction.json). This reuses measured generated-owner/dependency images; it is not fresh owner compilation or turnkey byte-identical fresh-clone replay. The newly identical common harness was not timed and does not repair the historical measurements.

## Historical portable audit

```powershell
node .\F142-verify.mjs . --require-seal
```

**Passed** on the assembled capsule: all sealed file bytes, all 630 raw observations, 42 serialized/terminal measurement children, primary/control arithmetic, the final failed common-harness identity qualification, both source copies, fresh 14-row reconstruction and each of the 75 historical XML executions are checked. XML outcomes are 25 pass, then eight pass/17 expected snapshot failures, then 25 pass. Passing this audit confirms the inconclusive historical disposition, not a performance improvement. The auditor performs no restores, builds or performance measurements.

Not verified: native/browser/deployment, AOT/trimming, declared runtime 12.0.0-alpha.1.26568.110, cold start, whole-document or application throughput. No related automated test was silently treated as skipped/pass when its prerequisites were missing.
