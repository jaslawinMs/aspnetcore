param([Parameter(Mandatory)][ValidateSet('draft-allocation','no-gain')][string]$Disposition)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$file=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $file -Raw|ConvertFrom-Json
if($budget.closed -or $budget.startedSourceComparisons -ne 3 -or $budget.completedSourceComparisons -ne 3 -or
    $budget.candidateSourceShapes.Count -ne 1 -or $budget.originalProfilesStarted -ne 3 -or $budget.candidateProfilesStarted -ne 3 -or
    $budget.completedProfiles.Count -ne 6 -or (Test-Path (Join-Path $run 'final-evaluation.json'))){throw 'Exactly six completed profiles/three comparisons/one source shape required;never repeat closure.'}
$ready=Get-Content (Join-Path $run 'candidate1-ready.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run $ready.manifest) -Raw|ConvertFrom-Json
$source='src\Mvc\Mvc.Razor\src\TagHelpers\UrlResolutionTagHelper.cs'
if((Get-FileHash $source).Hash -cne $manifest.sourceSha256 -or @(git diff --name-only).Count -ne 1 -or
    (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer'){throw 'Only the actual measured selected source may close.'}
$all=[System.Collections.Generic.List[object]]::new()
foreach($round in 1..3)
{
    $original=Get-Content (Join-Path $run "measurements\round$round-original\results\AutoPerf.UrlBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
    $candidate=Get-Content (Join-Path $run "measurements\round$round-candidate1\results\AutoPerf.UrlBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
    foreach($row in $original.Benchmarks)
    {
        $other=@($candidate.Benchmarks|Where-Object FullName -CEQ $row.FullName)
        $identity=[regex]::Match($row.FullName,'^AutoPerf\.UrlBenchmark\.ProcessAttribute\(Case: "([^"]+)"\)$')
        if($other.Count -ne 1 -or $row.Statistics.N -ne 8 -or $other[0].Statistics.N -ne 8 -or
            -not $identity.Success){throw 'Every complete untruncated paired case/eight-sample identity required.'}
        $all.Add([pscustomobject]@{round=$round;label=$identity.Groups[1].Value;changePercent=100*($other[0].Statistics.Mean/$row.Statistics.Mean-1)
            originalMeanNs=$row.Statistics.Mean;candidateMeanNs=$other[0].Statistics.Mean
            originalBytes=$row.Memory.BytesAllocatedPerOperation;candidateBytes=$other[0].Memory.BytesAllocatedPerOperation
            originalCvPercent=100*$row.Statistics.StandardDeviation/$row.Statistics.Mean
            candidateCvPercent=100*$other[0].Statistics.StandardDeviation/$other[0].Statistics.Mean})
    }
}
if($all.Count -ne 72){throw 'All72 observed case comparisons required.'}
$red=Get-Content (Join-Path $run 'resource-original-original-prep2.json') -Raw|ConvertFrom-Json
$green=Get-Content (Join-Path $run 'resource-candidate1.json') -Raw|ConvertFrom-Json
if(-not $red.allExpectedRed -or -not $green.allGreen -or $red.goalsSha256 -cne $green.goalsSha256){throw 'Every unchanged preselected goal must be expected-red/green.'}
$budget|ConvertTo-Json -Depth 9|Set-Content (Join-Path $run 'measurement-budget-before-close.json') -Encoding utf8
$budget.closed=$true
$budget.note='Closed after exactly3 actual comparisons/one unchanged source shape,six24-case profiles. Pair2 candidate-first,others original-first. Every short/large/oversized/encoding/URL/concurrent/unchanged-Razor control and shared-machine variation retained;no more timing or source tuning permitted for F118.'
$budget|ConvertTo-Json -Depth 9|Set-Content $file -Encoding utf8
[ordered]@{
    candidate='F118';disposition=$Disposition;sourceChanged=$true;sourceComparisons=3;sourceShapes=1
    selectedSourceVariant='candidate1';sourceSha256=$manifest.sourceSha256;comparisonBudgetClosed=$true;unusedComparisons=0
    performancePrJustified=($Disposition -ceq 'draft-allocation');notMergeReady=$true
    qualification='Qualified allocation-focused custom/general-IHtmlContent component proposal,not a general latency or ordinary Razor-page optimization. Bounded warmed256/1024/2048-character rendering nearly halves allocation;15 immutable original expected-red/candidate-green samples. Real ordered tag-helper producer/runner benefit is distinct from ordinary RazorPageBase producer,which already publishes HtmlString and bypasses this seam. All oversized/encoding/URL/fast-path/concurrency costs and shared-VM control drift retained. Fresh StringWriter culture/newline/type/disposal and real error/reentrant output checked;post-disposal writer/builder retention or fresh capacity dependence is not established compatible. Extra retained cleared buffers bounded by existing policy;no precise total retained-heap or cold-latency claim.'
    claimedGeneralMaterialTimeSpeedup=$false;claimedWholeApplicationOrOrdinaryRazorSpeedup=$false
    publicApiDefaultDependencyTfmVisibilityChanged=$false;permanentCacheSpecificXunitTestsAdded=$false
    benchmarkOutcomes=144;retainedResultSamples=1152;workloadWarmups=432;actualOwningRows=76;pdbDocuments=48
    activeFreshColdProcesses=6;allPreselectedResourceGoalSamplesGreen=$true
    sourceDefaultBoundary='All20 captured current-default/baseline files exact at3cd798fe;two additional actual context sources frozen. This is scoped component-source equivalence,not full latest-default integration execution.'
    preparations='Preserved original40-vs38 discovery audit failure before test execution;explicit routing context correction before fixture execution;first real endpoint-metadata construction failed before any characterization/shipping edit/timing and was corrected without retuning expected output;one ad hoc preview parser failure never invoked timing or advanced budget. No actual completed test or timing rerun.'
    comparisons=$all;closedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $run 'final-evaluation.json') -Encoding utf8
Write-Output "F118:$Disposition;closed3/3 comparisons,one source shape,all72 observed pairs retained;ordinary Razor/application gain not claimed."
