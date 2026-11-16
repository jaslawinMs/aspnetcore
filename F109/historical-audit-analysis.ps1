param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial',[switch]$Verify)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$directory=Join-Path $run "audit-runs\$Label"
if (Test-Path $directory) { throw 'Retain actual arithmetic-auditor attempts and exact executed source.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
$script=Join-Path $PSScriptRoot 'F109-reproduce-analysis.mjs'
Copy-Item -LiteralPath $script -Destination (Join-Path $directory 'executed-reproduce-analysis.mjs')
$arguments=@($script,$run)
if ($Verify) { $arguments+='--verify' }
$start=[DateTimeOffset]::UtcNow.ToString('o')
node @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    arguments=@('node')+$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    executedSourceSha256=(Get-FileHash $script).Hash;newBenchmarkOrTestRun=$false
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code) { throw 'Actual portable evidence/arithmetic audit failed;retain failure/source/raw data without rerunning profiles.' }
Write-Output "F109 actual$Label recorded-source/input/contract/log/TRX/PDB/raw-overhead/GC/statistical audit passed."
