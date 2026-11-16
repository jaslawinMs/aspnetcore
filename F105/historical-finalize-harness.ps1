$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$harness = Join-Path $run 'harness'
if (Test-Path (Join-Path $run 'harness-format-commands.json')) { throw 'Final format evidence exists;retain it.' }
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
$baselineConfig = (git rev-parse HEAD:.editorconfig).Trim()
$defaultConfig = (git rev-parse "$($investigation.currentDefaultRevision):.editorconfig").Trim()
$workingConfig = (git hash-object '.editorconfig').Trim()
if ($LASTEXITCODE -or $baselineConfig -cne $defaultConfig -or $defaultConfig -cne $workingConfig)
{
    throw 'The actual current/default/baseline formatting configuration differs.'
}
Copy-Item -LiteralPath 'C:\src\aspnetcore\.editorconfig' -Destination (Join-Path $harness '.editorconfig')
[ordered]@{
    source='.editorconfig';baselineGitBlob=$baselineConfig;currentDefaultGitBlob=$defaultConfig;workingGitBlob=$workingConfig
    rawSourceSha256=(Get-FileHash 'C:\src\aspnetcore\.editorconfig').Hash
    rawHarnessCopySha256=(Get-FileHash (Join-Path $harness '.editorconfig')).Hash;exactCopy=$true
} | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $run 'format-config-source-identity.json') -Encoding utf8
$include = @(Get-ChildItem $harness -Filter '*.cs' -File | Sort-Object Name | ForEach-Object FullName)
if ($include.Count -ne 4) { throw 'Exactly four authored harness C# files are required.' }
$commands = [System.Collections.Generic.List[object]]::new()
function Invoke-Formatting([string]$Label,[bool]$Verify)
{
    $arguments = @('format','whitespace',(Join-Path $harness 'AutoPerf.Benchmarks.csproj'),'--no-restore','--include') + $include
    if ($Verify) { $arguments += '--verify-no-changes' }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @arguments *> (Join-Path $run "harness-format-$Label.log")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;arguments=$arguments;exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    $commands | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'harness-format-commands.json') -Encoding utf8

    return $code
}
$code = Invoke-Formatting 'initial-check' $true
if ($code -eq 2)
{
    if ((Invoke-Formatting 'apply' $false) -ne 0) { throw 'Scoped existing formatter application failed.' }
    if ((Invoke-Formatting 'final-check' $true) -ne 0) { throw 'Scoped final formatter check failed.' }
}
elseif ($code -ne 0)
{
    throw 'Actual scoped formatter could not verify the harness.'
}
& (Join-Path $PSScriptRoot 'F105-build-harness.ps1') -Label 'final-formatted' -NoRestore
Write-Output 'F105 exact repo formatting configuration/scoped formatter/final source build are recorded.'
