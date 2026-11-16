param([Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$record = Join-Path $run "verification-$Variant-command.json"
if (Test-Path $record) { throw 'Actual frozen probe already executed;retain it.' }
node (Join-Path $PSScriptRoot 'F104-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen closure differs before probe.' }
$manifest = Get-Content (Join-Path $run "$Variant-manifest.json") -Raw | ConvertFrom-Json
$arguments = @((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--characterize',
    '--artifacts',(Join-Path $run "verification\$Variant"))
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $run "verification-$Variant-console.log")
$code = $LASTEXITCODE
[ordered]@{
    candidate='F104';variant=$Variant;arguments=$arguments;exitCode=$code
    expectedObservations=33;expectedResourceCases=10;expectedFreshCompilationCases=10;expectedRealProducerCases=10
    actualOwnerSha256=$manifest.ownerAssemblySha256;actualHarnessSha256=$manifest.harnessSha256
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content $record -Encoding utf8
if ($code)
{
    Get-Content (Join-Path $run "verification-$Variant-console.log") |
        Where-Object {$_.StartsWith('Unhandled') -or $_.StartsWith('   at')} |
        Select-Object -First 8 | ForEach-Object {$_.Substring(0,[Math]::Min(1000,$_.Length))}
    throw 'Actual frozen owner controls failed;no measurement.'
}
$probe = Get-Content (Join-Path $run "verification\$Variant\states\actual-analyzer-contract-resources.json") -Raw | ConvertFrom-Json
if ($probe.observations.Count -ne 33 -or $probe.resources.Count -ne 10 -or
    $probe.freshCompilationResources.Count -ne 10 -or $probe.producers.Count -ne 10 -or
    $probe.ownerSha256 -cne $manifest.ownerAssemblySha256 -or $probe.harnessSha256 -cne $manifest.harnessSha256)
{
    throw 'Actual frozen control counts or owner/harness identity differ.'
}
node (Join-Path $PSScriptRoot 'F104-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual closure changed during controls.' }
Get-Content (Join-Path $run "verification-$Variant-console.log") -Tail 1
