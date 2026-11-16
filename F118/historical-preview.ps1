param([ValidateRange(1,3)][int]$Round=1)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$original=Get-Content (Join-Path $run "measurements\round$Round-original\results\AutoPerf.UrlBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
$candidate=Get-Content (Join-Path $run "measurements\round$Round-candidate1\results\AutoPerf.UrlBenchmark-report-full-compressed.json") -Raw|ConvertFrom-Json
$rows=foreach($first in $original.Benchmarks)
{
    $matched=@($candidate.Benchmarks|Where-Object Parameters -CEQ $first.Parameters)
    if($matched.Count -ne 1){throw 'Exactly one paired actual parameter identity required.'}
    $second=$matched[0]
    [pscustomobject]@{Case=$first.Parameters;TimeChange=[math]::Round(100*($second.Statistics.Mean/$first.Statistics.Mean-1),2)
        OriginalB=$first.Memory.BytesAllocatedPerOperation;CandidateB=$second.Memory.BytesAllocatedPerOperation
        OriginalCv=[math]::Round(100*$first.Statistics.StandardDeviation/$first.Statistics.Mean,2)
        CandidateCv=[math]::Round(100*$second.Statistics.StandardDeviation/$second.Statistics.Mean,2)}
}
$rows|Format-Table -AutoSize
