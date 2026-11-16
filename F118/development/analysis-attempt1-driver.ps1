param([ValidateRange(1,10)][int]$Attempt=1,[switch]$Verify)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$directory=Join-Path $run 'development'
$prefix="analysis-attempt$Attempt"
$script=Join-Path $PSScriptRoot 'F118-reproduce-analysis.mjs'
if(Test-Path (Join-Path $directory "$prefix-execution.json")){throw 'Never overwrite an actual analyzer attempt.'}
Copy-Item $script (Join-Path $directory "$prefix-source.mjs")
Copy-Item $PSCommandPath (Join-Path $directory "$prefix-driver.ps1")
$arguments=@($script,$run);if($Verify){$arguments+='--verify'}
$start=[DateTimeOffset]::UtcNow.ToString('o')
& node @arguments *> (Join-Path $directory "$prefix.log");$code=$LASTEXITCODE
[ordered]@{candidate='F118';entryPoint='node';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceSha256=(Get-FileHash $script).Hash;sourceCopy="$prefix-source.mjs";timingOrTestRerun=$false
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory "$prefix-execution.json") -Encoding utf8
Get-Content (Join-Path $directory "$prefix.log") -Tail 35
if($code){throw 'Independent evidence auditor failed;preserve this actual attempt,repair analysis only,never rerun successful experiments.'}
