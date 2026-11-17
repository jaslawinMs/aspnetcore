param(
    [Parameter(Mandatory)]
    [ValidateSet('Analyze', 'Audit')]
    [string] $Stage,
    [int] $Attempt = 1
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$family = if ($Stage -eq 'Analyze') { 'analysis-execution' } else { 'audit-execution' }
$directory = Join-Path $run ('{0}\attempt-{1:D3}' -f $family, $Attempt)
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite an actual reader attempt.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
$reader = Join-Path $PSScriptRoot $(if ($Stage -eq 'Analyze') { 'F016-analyze.mjs' } else { 'F016-audit.mjs' })
$snapshot = Join-Path $directory 'executed-reader.mjs'
Copy-Item -LiteralPath $reader -Destination $snapshot
if ($Stage -eq 'Audit')
{
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F016-analyze.mjs') -Destination (Join-Path $directory 'invoked-extractor.mjs')
}
$arguments = @($reader, $run)
if ($Stage -eq 'Audit')
{
    $arguments += '--live'
}
$started = [DateTimeOffset]::UtcNow.ToString('o')
& node @arguments *> (Join-Path $directory 'output.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate = 'F016'; stage = $Stage; executable = (Get-Command node).Source; arguments = $arguments
    readerSha256 = (Get-FileHash $snapshot).Hash; readerStillByteIdentical = (Get-FileHash $reader).Hash -ceq (Get-FileHash $snapshot).Hash
    started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
    outputSha256 = (Get-FileHash (Join-Path $directory 'output.log')).Hash; noNativeExecutionOrTiming = $true
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $directory 'actual-command.json') -Encoding utf8NoBOM
Get-Content (Join-Path $directory 'output.log') -Tail 80
if ($code -or (Get-FileHash $reader).Hash -cne (Get-FileHash $snapshot).Hash)
{
    throw "Actual $Stage reader failed or changed;preserve this actual attempt."
}
