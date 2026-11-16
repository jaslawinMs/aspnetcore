param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label='initial',
    [switch]$CharacterizeOnly,
    [switch]$DescribeOnly
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$image = Join-Path $run 'harness\bin\Release\net12.0'
$owner = Join-Path $image 'Microsoft.AspNetCore.App.Analyzers.dll'
$controls = Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw | ConvertFrom-Json
if ((Get-FileHash $owner).Hash -cne $controls.actualOwnerSha256)
{
    throw 'Actual original prototype owner differs from the tested owner.'
}
$records = [System.Collections.Generic.List[object]]::new()
$steps = @(
    @{label='public-context';argument='--describe-context';folder='prototype-public-context'},
    @{label='real-owner';argument='--characterize';folder='initial-original-prototype'}
)
if ($CharacterizeOnly) { $steps = @($steps | Where-Object {$_.label -eq 'real-owner'}) }
if ($DescribeOnly) { $steps = @($steps | Where-Object {$_.label -eq 'public-context'}) }
foreach ($step in $steps)
{
    $folder = if ($Label -eq 'initial') {$step.folder} else {"prototype-$Label-$($step.label)"}
    $destination = Join-Path $run $folder
    $record = if ($Label -eq 'initial') {"prototype-$($step.label)-command.json"} else {"prototype-$Label-$($step.label)-command.json"}
    $recordFile = Join-Path $run $record
    if (Test-Path $recordFile) { throw 'Prototype command exists; retain it and use a distinct new invocation.' }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    $arguments = @((Join-Path $image 'AutoPerf.Benchmarks.dll'),$step.argument,'--artifacts',$destination)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @arguments *> (Join-Path $destination 'console.log')
    $code = $LASTEXITCODE
    [ordered]@{
        arguments=$arguments;exitCode=$code;sourceComparisonStarted=$false
        actualOwnerSha256=(Get-FileHash $owner).Hash
        actualHarnessSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash
        startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 5 | Set-Content $recordFile -Encoding utf8
    if ($code)
    {
        Get-Content (Join-Path $destination 'console.log') | Where-Object {$_.StartsWith('Unhandled') -or $_.StartsWith('   at')} |
            Select-Object -First 8 | ForEach-Object {$_.Substring(0,[Math]::Min(1000,$_.Length))}
        throw "Actual original prototype $($step.label) failed with exit $code before comparison."
    }
    Write-Output "F104 original prototype $($step.label) passed."
}
