param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$Development
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$destination = Join-Path $run "verification\$Label"
if (Test-Path $destination) { throw 'Probe record exists;retain it and use a new explicit label.' }
$library = if ($Development) {Join-Path $run 'harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll'} else {Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'}
if (-not $Development)
{
    node (Join-Path $PSScriptRoot 'F105-closure.mjs') $run --verify
    if ($LASTEXITCODE) { throw 'Frozen original closure differs before actual probe.' }
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$snapshot = Join-Path $run "probe-source\$Label"
New-Item -ItemType Directory -Path $snapshot -Force | Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File | Where-Object Extension -In '.cs','.csproj','.editorconfig')
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $snapshot $file.Name)
}
$arguments = @($library,'--characterize','--artifacts',$destination)
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate='F105';label=$Label;developmentImage=[bool]$Development;arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sourceComparisons=0
    expectedCompletedProfiles=24;expectedCaliperSamples=120
    harnessSha256=(Get-FileHash $library).Hash
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
Get-Content (Join-Path $destination 'console.log') -Tail 18
if ($code) { throw 'Actual F105 faithful original producer/control probe failed before measurement.' }
$data = Get-Content (Join-Path $destination 'states\original-contract-resources.json') -Raw | ConvertFrom-Json
if ($data.contracts.Count -ne 24 -or $data.resources.Count -ne 120 -or
    -not $data.semanticControls.shippedReturnPreserved -or
    @($data.resources | Where-Object {$_.checksum -ne $_.operations * [long]$_.expectedChecksum}).Count -or
    $data.harnessSha256 -cne (Get-FileHash $library).Hash)
{
    throw 'All24 actual completed owner profiles,120 calipers and executing harness identity are required.'
}
if (-not $Development)
{
    node (Join-Path $PSScriptRoot 'F105-closure.mjs') $run --verify
    if ($LASTEXITCODE) { throw 'Frozen original closure changed during actual probe.' }
}
Write-Output 'F105 actual public dictionary/factory/DI validator producers,24 contracts,120 warm calipers and actual public semantic controls passed.'
