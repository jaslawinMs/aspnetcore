$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$attempt=Join-Path $run 'audit-attempts\attempt-1'
if(Test-Path $attempt){throw 'Preserve every actual audit attempt.'}
New-Item $attempt -ItemType Directory -Force|Out-Null
$source=Join-Path $PSScriptRoot 'F008-reproduce-analysis.mjs'
Copy-Item $source (Join-Path $attempt 'executed-source.mjs')
$start=[DateTimeOffset]::UtcNow.ToString('o')
& node $source *> (Join-Path $attempt 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F008';entryPoint='node';arguments=@($source);actualExitCode=$code;startedUtc=$start;
    completedUtc=[DateTimeOffset]::UtcNow.ToString('o');auditorSourceSha256=(Get-FileHash $source).Hash}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $attempt 'execution.json')
Get-Content (Join-Path $attempt 'console.log') -Tail 30
if($code){throw 'Read-only raw audit failed;retain it and repair only the supported analysis assertion,no new timing.'}
