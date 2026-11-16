$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if ($budget.closed -or $budget.startedSourceComparisons -ne 3 -or $budget.completedSourceComparisons -ne 3 -or
    $budget.originalProfilesCompleted -ne 3 -or $budget.candidateProfilesCompleted -ne 3 -or $budget.completedProfiles.Count -ne 6)
{
    throw 'Exactly three completed actual comparisons are required;do not restart or extend.'
}
$audit=Get-Content (Join-Path $run 'tests\candidate2-green\test-audit.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'candidate2-manifest.json') -Raw|ConvertFrom-Json
if ($audit.passed -ne 10 -or $audit.failed -ne 0 -or $audit.skipped -ne 0 -or
    (Get-FileHash $manifest.source).Hash -cne $manifest.sourceSha256 -or
    (Get-FileHash 'src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs').Hash -cne
    (Get-FileHash (Join-Path $run 'tests\candidate2-green\source\DataProtectorTokenProviderTest.cs')).Hash)
{
    throw 'The exact selected source/ten green test rows must still match.'
}
foreach ($variant in 'original','candidate1','candidate2')
{
    node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run $variant --verify
    if ($LASTEXITCODE) { throw 'A final actual frozen execution closure changed.' }
}
git diff --check
if ($LASTEXITCODE) { throw 'Final exact shipping source whitespace differs.' }
$budget.closed=$true
$budget|Add-Member -NotePropertyName selectedVariant -NotePropertyValue candidate2
$budget|Add-Member -NotePropertyName closedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o'))
$budget.note+=' Selected candidate2 after retaining candidate1 whitespace cost;comparison3 repeats candidate2 with reversed pair order. All3 allowed comparisons consumed;no further profiling. Targeted malformed/no-ASCII-whitespace gain only;all valid/whitespace/crypto/parser/logging controls and contradictory process-wide calipers retained.'
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetPath -Encoding utf8
[ordered]@{
    candidate='F109';disposition='validated';selectedVariant='candidate2';sourceComparisons=3;maximumSourceComparisons=3
    comparisonBudgetClosed=$true;performancePrCreated=$false;shippingSourceFilesChanged=1;newTestClassFiles=1
    publicApiDefaultDependencyFrameworkVisibilityChanged=$false
    optimizationScope='Malformed Base64 without ASCII space/tab/CR/LF. Whitespace-containing inputs retain the original decoder/catch path and may still raise internally caught FormatException.'
    qualification='Conditional component win,not universally faster validation or a measured application/production-frequency improvement. Candidate1 and all adverse controls remain authoritative. Original BDN empty/whitespace failures report192B versus selected296B;original manual calipers also report about296B. No directly traced cause or pure-decoder allocation claim.'
    originalRedRows=7;originalExpectedFailureRows=4;selectedGreenRows=10;supplementalOriginalWhitespaceRows=3;testSkips=0
    actualPublicManagerGenerateVerifyAndPersistedDataProtection=$true
    actualObservedProtectorType='Microsoft.AspNetCore.DataProtection.KeyManagement.KeyRingBasedSpanDataProtector'
    sourcePdbAssociationsNotMethodCoverage=$true;privateSyntheticKeyBytesMustNotBePublished=$true
    generatedTokenLifespanDays=1;freshReplayMustRegenerateOneSharedFixture=$true
    sharedWindowsHost=$true;maximumBuildNodes=2;unrelatedProcessPowerPriorityAffinityNotChanged=$true
    completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'final-evaluation.json') -Encoding utf8
Write-Output 'F109 evaluation closed at3/3 comparisons;candidate2 selected with explicit unchanged-path costs and original-caliper contradiction retained.'
