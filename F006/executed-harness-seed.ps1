$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$seed=Join-Path $PSScriptRoot 'autoperf-runs\F005\harness-small-controls'
$destination=Join-Path $run 'harness'
if(-not(Test-Path (Join-Path $run 'current-source-investigation.json')) -or (Test-Path $destination)){throw 'Completed investigation and a fresh standalone harness directory required.'}
New-Item $destination -ItemType Directory|Out-Null
$rows=@(foreach($entry in Get-ChildItem $seed -File|Where-Object Extension -In '.cs','.csproj')
{
    Copy-Item $entry.FullName (Join-Path $destination $entry.Name)
    [ordered]@{file=$entry.Name;copiedFrom=$entry.FullName;seedSha256=(Get-FileHash $entry.FullName).Hash;
        initializationBytesEqual=((Get-FileHash $entry.FullName).Hash-ceq(Get-FileHash (Join-Path $destination $entry.Name)).Hash)}
})
if($rows.Count-ne5 -or @($rows|Where-Object initializationBytesEqual -NE $true)){throw 'Exact five-file standalone seed required.'}
[ordered]@{candidate='F006';seed='F005 version2 source only,not its binaries/results';files=$rows;subsequentF006InputAndWitnessEditsExpected=$true;newBenchmarkRun=$false}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'harness-seed-provenance.json') -Encoding utf8
Copy-Item $PSCommandPath (Join-Path $run 'executed-harness-seed.ps1')
Write-Output 'F006 five standalone source/project files initialized byte-exact from attributed F005 seed;no benchmark or shipping-source change.'
