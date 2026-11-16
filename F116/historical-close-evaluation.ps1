param([Parameter(Mandatory)][ValidateSet('draft-allocation','no-gain')][string]$Disposition)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$file=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $file -Raw|ConvertFrom-Json
if ($budget.closed -or $budget.startedSourceComparisons -ne 3 -or $budget.completedSourceComparisons -ne 3 -or
    $budget.candidateSourceShapes.Count -ne 1 -or $budget.originalProfilesStarted -ne 3 -or $budget.candidateProfilesStarted -ne 3 -or
    $budget.completedProfiles.Count -ne 6 -or (Test-Path (Join-Path $run 'final-evaluation.json'))) {throw 'Exactly six completed profiles/three comparisons/one source shape required;never repeat closure.'}
$manifest=Get-Content (Join-Path $run 'manifest-candidate1.json') -Raw|ConvertFrom-Json
if ((Get-FileHash 'src\Shared\ConnectionEndpointTags.cs').Hash -cne $manifest.sourceSha256 -or
    @(git diff --name-only).Count -ne 1 -or (git branch --show-current).Trim() -cne 'autoperf/F116-boxed-port-cache') {throw 'Only the actual measured selected source may close.'}
$all=[System.Collections.Generic.List[object]]::new()
foreach ($round in 1..3)
{
    $original=Get-Content (Join-Path $run "measurements\round$round-original\results\AutoPerf.PortBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
    $candidate=Get-Content (Join-Path $run "measurements\round$round-candidate1\results\AutoPerf.PortBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
    foreach ($row in $original.Benchmarks)
    {
        $other=@($candidate.Benchmarks|Where-Object Parameters -CEQ $row.Parameters)
        if ($other.Count -ne 1 -or $row.Statistics.N -ne 8 -or $other[0].Statistics.N -ne 8) {throw 'Every actual paired eight-sample identity required.'}
        $all.Add([pscustomobject]@{round=$round;label=$row.Parameters.Replace('Case=','');changePercent=100*($other[0].Statistics.Mean/$row.Statistics.Mean-1)
            originalMeanNs=$row.Statistics.Mean;candidateMeanNs=$other[0].Statistics.Mean
            originalBytes=$row.Memory.BytesAllocatedPerOperation;candidateBytes=$other[0].Memory.BytesAllocatedPerOperation
            originalCvPercent=100*$row.Statistics.StandardDeviation/$row.Statistics.Mean
            candidateCvPercent=100*$other[0].Statistics.StandardDeviation/$other[0].Statistics.Mean})
    }
}
if ($all.Count -ne 72) {throw 'All72 case comparisons required.'}
$red=Get-Content (Join-Path $run 'resource-original-original-prep2.json') -Raw|ConvertFrom-Json
$green=Get-Content (Join-Path $run 'resource-candidate1.json') -Raw|ConvertFrom-Json
if (-not $red.allExpectedRed -or -not $green.allGreen -or $red.goalsSha256 -cne $green.goalsSha256) {throw 'Every unchanged preselected goal must be expected-red/green.'}
$budget|ConvertTo-Json -Depth 9|Set-Content (Join-Path $run 'measurement-budget-before-close.json') -Encoding utf8
$budget.closed=$true
$budget.note='Closed after exactly3 actual comparisons/one unchanged source shape,six24-case profiles. Pair2 candidate-first,others original-first. Every latency/control regression and shared-machine variation retained;no more timing or source tuning permitted for F116.'
$budget|ConvertTo-Json -Depth 9|Set-Content $file -Encoding utf8
[ordered]@{
    candidate='F116';disposition=$Disposition;sourceChanged=$true;sourceComparisons=3;sourceShapes=1
    selectedSourceVariant='candidate1';sourceSha256=$manifest.sourceSha256;comparisonBudgetClosed=$true;unusedComparisons=0
    performancePrJustified=($Disposition -ceq 'draft-allocation')
    qualification='Qualified allocation-only two-port follow-on to merged69558,not a general latency optimization or merge-ready recommendation. Actual second-port get/tag/list24->0 B and queued stream48->0 B;unchanged25 absolute resource goals expected-red/green,not thresholds tuned to data. First-port/all-miss/control timing costs,all three comparisons and shared-VM variation remain visible. Parallel BDN memory is process-wide;per-worker calipers independently attribute real loops. One extra retained int box and one static reference per warmed participating linked owner;unused Http.Connections link is not claimed a third hot consumer. No HTTP,full hub,production-frequency,whole-application or cold-latency speedup claim.'
    claimedMaterialTimeSpeedup=$false;claimedWholeApplicationSpeedup=$false;publicApiDefaultDependencyTfmVisibilityChanged=$false
    benchmarkOutcomes=144;retainedResultSamples=1152;workloadWarmups=432;actualOwningRows=62;pdbDocuments=40
    activeFreshColdProcesses=6;archivedEarlierColdProcesses=3;allPreselectedResourceGoalSamplesGreen=$true
    sourceDefaultBoundary='21/22 captured current-default files exact;one current owning Kestrel metrics test adds an observation wait. This is component-source equivalence,not full latest-default integration execution.'
    candidatePreparationFailure='One pre-characterization PowerShell pipeline-parameter failure preserved;partial image audited and continued without recopying or rerunning a measurement.'
    preTimingAnnotations='Initial wrong scope expectation and main-thread-only BDN memory annotation preserved and corrected before shipping edit/timing;byte-identical original input fixtures reused.'
    comparisons=$all;closedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $run 'final-evaluation.json') -Encoding utf8
Write-Output "F116:$Disposition;closed3/3 comparisons,one source shape,all72 observed pair rows retained;no general latency/application claim."
