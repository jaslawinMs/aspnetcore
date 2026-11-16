param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial',[switch]$Verify)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$directory=Join-Path $run "development\audit-$Label"
if (Test-Path $directory) { throw 'Preserve every actual arithmetic-auditor source/log/outcome.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
$source=Join-Path $PSScriptRoot 'F112-reproduce-analysis.mjs'
Copy-Item $source (Join-Path $directory 'executed-source.mjs')
$arguments=@($source,$run)
if ($Verify) { $arguments+='--verify' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
node @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F112';arguments=$arguments;exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    executedSourceSha256=(Get-FileHash $source).Hash;arithmeticOnlyNotAdditionalProfiles=$true
}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 16
if ($code) { throw "Actual all-row arithmetic audit failed:$code;preserve this exact attempt." }
