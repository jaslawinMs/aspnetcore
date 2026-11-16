$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$target=Join-Path $run 'cold-capture-repair'
if (Test-Path $target) {throw 'Never overwrite the independent materialized cold diagnostic.'}
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if (-not $budget.closed -or $budget.completedSourceComparisons -ne 3) {throw 'The original three-comparison timing budget must remain closed.'}
New-Item -ItemType Directory -Path $target|Out-Null
$source=@(foreach ($name in 'Program.cs','ColdProbe.csproj')
{
    $file=Join-Path $run "cold-probe\$name"
    [ordered]@{file="cold-probe\$name";sha256=(Get-FileHash $file).Hash}
})
$source|ConvertTo-Json -Depth 5|Set-Content (Join-Path $target 'source-manifest.json') -Encoding utf8
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string[]]$Arguments,[string]$Log)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $target $Log)
    $code=$LASTEXITCODE
    $commands.Add([ordered]@{entryPoint='dotnet';arguments=$Arguments;log=$Log;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    $commands|ConvertTo-Json -Depth 8|Set-Content (Join-Path $target 'execution.json') -Encoding utf8
    if ($code) {Get-Content (Join-Path $target $Log) -Tail 30;throw "Independent cold diagnostic child failed:$Log"}
}
Invoke-Dotnet @('build',(Join-Path $run 'cold-probe\ColdProbe.csproj'),'-c','Release','--nologo','-m:2','-v:quiet') 'build.log'
$probe=Join-Path $run 'cold-probe\bin\Release\net12.0\ColdProbe.dll'
$proof=[System.Collections.Generic.List[object]]::new()
foreach ($variant in 'original','candidate1')
{
    $ready=Get-Content (Join-Path $run "$variant-ready.json") -Raw|ConvertFrom-Json
    $manifest=Get-Content (Join-Path $run $ready.manifest) -Raw|ConvertFrom-Json
    $image=Join-Path $run $ready.imageRelative
    $fixture=Join-Path $run "$($ready.fixtureRelative)\ports.json"
    foreach ($sample in 1..3)
    {
        $relative="$variant-$sample.json"
        Invoke-Dotnet @($probe,$image,$fixture,(Join-Path $target $relative),$variant) "$variant-$sample.log"
        $actual=Get-Content (Join-Path $target $relative) -Raw|ConvertFrom-Json
        if (-not $actual.snapshotsMaterializedAtCapture -or $actual.shippingCacheFieldsWrittenByProbe -or $actual.actualTimingRerun) {throw 'Only independent materialized/read-only/non-timing diagnostics permitted.'}
        foreach ($owner in $actual.owners)
        {
            $expected=@($manifest.executionIdentities|Where-Object file -CEQ "$($owner.assembly).dll")
            if ($expected.Count -ne 1 -or $owner.sha256 -cne $expected[0].sha256 -or
                $owner.sha256 -cne (Get-FileHash $owner.file).Hash) {throw 'Independent probe must use the exact already-measured/tested owning DLL.'}
        }
        $proof.Add([ordered]@{variant=$variant;sample=$sample;processId=$actual.processId;file=$relative;sha256=(Get-FileHash (Join-Path $target $relative)).Hash;actualMeasuredOwnerHashesMatched=$true})
    }
}
if ((Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json).completedSourceComparisons -ne 3) {throw 'Timing budget changed unexpectedly.'}
[ordered]@{candidate='F116';actualFreshColdOnlyProcesses=6;exactMeasuredOwnersVerified=$true;source=$source;processes=$proof;actualSourceComparisonsRerun=0;measurementHarnessChanged=$false;shippingSourceChanged=$false;probeSha256=(Get-FileHash $probe).Hash}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $target 'completion.json') -Encoding utf8
Write-Output 'F116:six independent immediately-materialized cold diagnostics passed using exact measured owners;no timing rerun or frozen harness/source change.'
