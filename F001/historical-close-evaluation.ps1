$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
$execution=Get-Content (Join-Path $run 'measurements\original-diagnostic-only\execution.json') -Raw|ConvertFrom-Json
$pdb=Get-Content (Join-Path $run 'pdb\original\document-audit.json') -Raw|ConvertFrom-Json
$tests=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons -ne 0 -or $execution.actualExitCode -ne 0 -or
    -not $execution.originalOnly -or $execution.sourceComparisons -ne 0 -or $pdb.verifiedDocuments -ne 19 -or
    $tests.actualRows -ne 17 -or -not $tests.allPassed -or $tests.skipped){throw 'Exact completed original evidence and open unused comparison budget required.'}
Copy-Item $budgetPath (Join-Path $run 'measurement-budget-before-close.json')
[ordered]@{
    candidate='F001';maximumComparisons=3;usedComparisons=0;sourceShapesMeasured=0;candidateProfiles=0
    originalDiagnosticProfiles=1;originalMonitoringCases=3;closed=$true;unusedComparisons=3
    closedAt=[DateTimeOffset]::UtcNow.ToString('o')
    reason='Original-only protocol/pipe characterization did not establish the disputed live-transport blocking precondition or a compatible local optimization. Reject unestablished/design-blocked proposal;do not invent a comparative no-gain result.'
}|ConvertTo-Json -Depth 6|Set-Content $budgetPath -Encoding utf8
Write-Output 'F001 comparison budget closed at0/3;one original-only3-case diagnostic,no candidate/source change.'
