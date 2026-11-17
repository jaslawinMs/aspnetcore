param([int]$Attempt=1,[switch]$Verify)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$directory=Join-Path $run 'development'
$prefix="analysis-attempt$Attempt"
$record=Join-Path $directory "$prefix-execution.json"
if((Test-Path $record) -or $Attempt -lt 1){throw 'Never overwrite an actual analysis attempt.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory "$prefix-driver.ps1")
Copy-Item (Join-Path $PSScriptRoot 'F002-reproduce-analysis.mjs') (Join-Path $directory "$prefix-source.mjs")
$arguments=@((Join-Path $PSScriptRoot 'F002-reproduce-analysis.mjs'),$run)
if($Verify){$arguments+='--verify'}
$start=[DateTimeOffset]::UtcNow.ToString('o')
node @arguments *> (Join-Path $directory "$prefix.log");$code=$LASTEXITCODE
[ordered]@{
    candidate='F002';entryPoint='node';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceSha256=(Get-FileHash (Join-Path $directory "$prefix-source.mjs")).Hash;timingOrTestsRerun=$false
}|ConvertTo-Json -Depth 7|Set-Content $record -Encoding utf8
Get-Content (Join-Path $directory "$prefix.log")
if($code){throw 'Actual independent auditor failed;preserve this source/log/exit and fix only diagnosed checker issues without repeating successful experiments.'}
