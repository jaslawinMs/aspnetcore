$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$root=Join-Path $run 'audit-attempts'
New-Item $root -ItemType Directory -Force|Out-Null
$number=1
while(Test-Path (Join-Path $root "attempt-$number")){$number++}
$destination=Join-Path $root "attempt-$number"
New-Item $destination -ItemType Directory|Out-Null
$analyzer=Join-Path $PSScriptRoot 'F007-reproduce-analysis.mjs'
Copy-Item $PSCommandPath (Join-Path $destination 'executed-driver.ps1')
Copy-Item $analyzer (Join-Path $destination 'executed-source.mjs')
$started=[DateTimeOffset]::UtcNow.ToString('o')
node $analyzer *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F007';attempt=$number;entryPoint='node';arguments=@($analyzer);actualExitCode=$code;
    startedUtc=$started;completedUtc=[DateTimeOffset]::UtcNow.ToString('o');additionalTimingPerformed=$false}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'execution.json')
Get-Content (Join-Path $destination 'console.log')
if($code){throw "Read-only F007 audit attempt$number failed;preserve output and repair only the analysis assertion,never rerun timing."}
