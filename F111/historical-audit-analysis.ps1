param(
    [Parameter(Mandatory)][string]$Label,
    [switch]$Verify
)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$destination=Join-Path $run "development\audit-$Label"
if (Test-Path $destination) { throw 'Retain exact arithmetic-auditor source and failures;use a distinct attempt label.' }
New-Item -ItemType Directory -Path $destination|Out-Null
$source=Join-Path $PSScriptRoot 'F111-reproduce-analysis.mjs'
Copy-Item -LiteralPath $source -Destination (Join-Path $destination 'executed-source.mjs')
$arguments=@($source,$run)
if ($Verify) { $arguments+='--verify' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
node @arguments *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F111';arguments=@('node')+$arguments;exitCode=$code
    executedSourceSha256=(Get-FileHash $source).Hash;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    scope='Read-only recomputation over existing exact sources/fixtures/TRX/PDB documents/runtime/contracts/calipers/BDN console+JSON/browser records. No owning-code execution or further benchmark sweep.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
Get-Content (Join-Path $destination 'console.log') -Tail 45
if ($code) { throw 'Actual portable arithmetic/source/producer audit failed;retain failure and do not publish.' }
