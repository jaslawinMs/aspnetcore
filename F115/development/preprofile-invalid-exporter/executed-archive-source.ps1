$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$source=Join-Path $run 'measurements\original'
$archive=Join-Path $run 'development\preprofile-invalid-exporter'
$record=Join-Path $run 'preprofile-exporter-correction.json'
if (-not (Test-Path $source) -or (Test-Path $archive) -or (Test-Path $record)) {throw 'Exact known failed preprofile attempt required without replacement.'}
$execution=Get-Content (Join-Path $source 'execution.json') -Raw|ConvertFrom-Json
$console=Get-Content (Join-Path $source 'console.log') -Raw
$states=@(Get-ChildItem (Join-Path $source 'states') -File|Sort-Object Name)
if ($execution.exitCode -ne -532462766 -or 'jsonfull' -cnotin $execution.arguments -or
    -not $console.Contains('The provided exporter "jsonfull" is invalid.') -or
    $console -match '(?m)^// Benchmark: |^(Workload|Overhead)(Warmup|Actual|Result|Pilot)' -or
    ($states.Name -join ',') -cne 'object-boundary.json,runtime.json' -or
    (Test-Path (Join-Path $source 'results'))) {throw 'Only proven zero-workload CLI rejection may be reclassified as preprofile.'}
$manifest=Get-Content (Join-Path $run 'original-manifest.json') -Raw|ConvertFrom-Json
$runtime=Get-Content (Join-Path $source 'states\runtime.json') -Raw|ConvertFrom-Json
if ($runtime.owner.sha256 -cne $manifest.ownerSha256 -or $runtime.harness.sha256 -cne $manifest.harnessSha256) {throw 'No different harness/owner may be hidden in this correction.'}
$files=@(Get-ChildItem $source -Recurse -File|ForEach-Object {
    [pscustomobject]@{relative=[IO.Path]::GetRelativePath($source,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}
})
Move-Item -LiteralPath $source -Destination $archive
foreach ($file in $files)
{
    if ((Get-FileHash (Join-Path $archive $file.relative)).Hash -cne $file.sha256) {throw 'Every exact archived byte must remain.'}
}
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if ($budget.actualSourceComparisons -ne 0 -or $budget.originalPressureProfilesStarted -ne 1 -or $budget.closed) {throw 'Expected first invocation claim only.'}
$budget.originalPressureProfilesStarted=0
$budget|Add-Member -NotePropertyName originalPressureParserFailures -NotePropertyValue 1
$budget.note+=' First launch rejected invalid exporter jsonfull before any workload/setup/result;all exact bytes preserved under development\preprofile-invalid-exporter. Reuse identical frozen image with known BDN0.13 json/csv arguments;one actual original-pressure profile remains permitted.'
$budget|ConvertTo-Json -Depth 7|Set-Content $budgetPath -Encoding utf8
[ordered]@{
    candidate='F115';failedLaunchExitCode=$execution.exitCode;actualWorkloadOutcomesBeforeCorrection=0
    actualBenchmarkSetupsBeforeCorrection=0;actualSourceComparisonsBeforeCorrection=0
    archive='development\preprofile-invalid-exporter';archivedFiles=$files;allArchivedBytesVerified=$true
    ownerSha256=$manifest.ownerSha256;harnessSha256=$manifest.harnessSha256;frozenImageChanged=$false
    correction='Use known BDN0.13 exporter json/csv arguments;remove unneeded memory/join/markdown CLI additions. No source,fixture,job,warmup,retained-count,iteration-time or shared-machine setting changes.'
    firstLaunchIsNotClaimedAsCompletedTimingProfile=$true
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Copy-Item $PSCommandPath (Join-Path $archive 'executed-archive-source.ps1')
Write-Output 'F115:invalid-exporter launch preserved byte-for-byte;zero actual workload/setups/results;identical frozen image and one original-pressure sweep still permitted.'
