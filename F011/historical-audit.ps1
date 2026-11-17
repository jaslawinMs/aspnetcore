$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$destination = Join-Path $run 'analysis-attempts\independent-audit\attempt-001'
if (Test-Path $destination)
{
    throw 'Preserve the actual independent reader attempt.'
}
New-Item $destination -ItemType Directory -Force | Out-Null
$script = Join-Path $PSScriptRoot 'F011-reproduce-analysis.mjs'
Copy-Item $script (Join-Path $destination 'executed-source.mjs')
$start = [DateTimeOffset]::UtcNow.ToString('o')
& node $script *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate = 'F011'; entryPoint = 'node'; arguments = @($script); actualExitCode = $code
    startedUtc = $start; completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    sourceSha256 = (Get-FileHash $script).Hash
} | ConvertTo-Json | Set-Content (Join-Path $destination 'execution.json')
Get-Content (Join-Path $destination 'console.log')
if ($code)
{
    throw 'The independent audit failed; retain its exact source and output, never alter raw evidence.'
}
