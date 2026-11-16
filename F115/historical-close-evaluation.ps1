$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$directory=Join-Path $run 'measurements\original'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if ($budget.closed -or $budget.actualSourceComparisons -ne 0 -or $budget.originalPressureProfilesStarted -ne 1 -or
    $budget.originalPressureParserFailures -ne 1 -or $budget.candidateSourceShapes.Count -ne 0 -or
    @(git status --porcelain --untracked-files=no).Count -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F115-list-element-boxing') {throw 'Expected unchanged independently characterized owner and exactly one actual pressure profile.'}
foreach ($file in 'final-evaluation.json','measurement-budget-before-close.json')
{
    if (Test-Path (Join-Path $run $file)) {throw 'Never overwrite evaluation evidence.'}
}
$execution=Get-Content (Join-Path $directory 'execution.json') -Raw|ConvertFrom-Json
$reports=@(Get-ChildItem (Join-Path $directory 'results') -Filter '*-report-full*.json')
if ($execution.exitCode -ne 0 -or $reports.Count -ne 1 -or
    ($execution.powerSchemeBefore -join "`n") -cne ($execution.powerSchemeAfter -join "`n")) {throw 'One actual successful profile and unchanged power observations required.'}
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
if ($report.Benchmarks.Count -ne 28 -or @($report.Benchmarks|Where-Object {@($_.Measurements|Where-Object {$_.IterationMode -eq 'Workload' -and $_.IterationStage -eq 'Result'}).Count -ne 8}).Count) {throw 'All actual 28 cases/eight retained each required.'}
$test=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
$typed=Get-Content (Join-Path $run 'characterization\original\states\typed-reader-diagnostics.json') -Raw|ConvertFrom-Json
$boundary=Get-Content (Join-Path $run 'characterization\original\states\object-boundary.json') -Raw|ConvertFrom-Json
if ($test.passed -ne 81 -or $test.failed -or $test.skipped -or
    @($typed.genericToObject|Where-Object bytesPerOperation -NE 24).Count -or
    @($typed.nativeTypedReturn|Where-Object bytesPerOperation -NE 0).Count -or
    $boundary.publicDivergentNonGenericValue -ne 1731 -or $boundary.genericIndexerValue -ne 731 -or
    $boundary.publicNonGenericReads -ne 2 -or -not $boundary.nearestOppositePublicTestFailed -or
    -not $boundary.boxedMutableStructIsolated -or -not $boundary.listMutationObserved) {throw 'Real producer/contract and resource evidence required.'}
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Frozen image changed.'}
Copy-Item $budgetPath (Join-Path $run 'measurement-budget-before-close.json')
Copy-Item $PSCommandPath (Join-Path $directory 'executed-postprocess-source.ps1')
[ordered]@{
    candidate='F115';outerHelperExitCode=1;actualChildDotnetExitCode=0;actualOutcomes=28;actualRetainedSamples=224
    originalIncorrectGlob='*-full.json';actualReport=$reports[0].Name;actualReportSha256=(Get-FileHash $reports[0].FullName).Hash
    correctedGlob='*-report-full*.json';benchmarksRerunToFixAuditor=$false
    originalExecutedSourceSha256=(Get-FileHash (Join-Path $directory 'executed-source.ps1')).Hash
    completeFrozenImageReverified=$true
    explanation='The child dotnet/BDN run completed all28 cases/eight retained each and exited0. The outer helper exited1 only because BDN0.13 names its full compressed export -report-full-compressed.json. Preserve exact original executed helper/log/data;perform audit-only recovery,no timing rerun.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'postprocess-first-failure.json') -Encoding utf8
$budget.closed=$true
$budget|Add-Member -NotePropertyName originalPressureProfilesCompleted -NotePropertyValue 1
$budget|Add-Member -NotePropertyName unusedComparisons -NotePropertyValue 3
$budget.note+=' Completed actual original28-case profile/eight retained each;outer report-glob checker failed after child exited0. Exact failed helper retained;postprocess recovery and frozen-closure verification only,no benchmark rerun. Reject blanket local unboxing rather than invent a contract-changing candidate.'
$budget|ConvertTo-Json -Depth 7|Set-Content $budgetPath -Encoding utf8
[ordered]@{
    candidate='F115';disposition='rejected-local-boxing-removal';sourceChanged=$false;sourceComparisons=0
    performancePrJustified=$false;branch='autoperf/F115-list-element-boxing'
    reason='Actual internal helper/adapter/visitor/deep-equality path is object-valued. Generic IList<int> read returning object still allocates24B;native int-return0B changes the result/escape contract and is not a candidate. Real public JSON Patch Test observes legal non-generic1731 rather than generic731. Mutable boxed structs must remain isolated from list storage,and current list mutation must stay visible. No compatible local source proposal or gain demonstrated.'
    qualification='This rejects the detected blanket/drop-in boxing-removal suggestion,not every future generic adapter/serializer redesign or caching strategy. The owning ListAdapter/IAdapter are internal,not public API. One original pressure profile is not a before/after comparison. No HTTP,production-frequency or application-wide improvement claimed.'
    resourceBoundary='Real helper,actual factory-selected adapter and converter-produced public JsonPatchDocument.ApplyTo;separate typed/native diagnostics explicitly different-contract.'
    attemptsPreserved=@('Initial test-auditor61/81 expansion failure;child tests all passed,no rerun.',
        'Initial invalid-exporter CLI rejection;zero benchmark workloads/setups/results.',
        'Completed profile outer filename-glob failure;child exited0,28cases/224results,no rerun.')
    evaluatedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'final-evaluation.json') -Encoding utf8
Write-Output 'F115:original28-case pressure profile complete;zero source comparisons;reject unsupported local boxing removal;all failed audit/parser attempts retained without rerunning tests or timings.'
