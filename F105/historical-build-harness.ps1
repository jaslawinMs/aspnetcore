param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial',
    [switch]$NoRestore
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
if (Test-Path (Join-Path $run "harness-build-$Label-command.json")) { throw 'Build record exists;retain it and use a new explicit label.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F105-acceptance.md') -Destination (Join-Path $run 'acceptance.md')
$arguments = @('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','-v:minimal')
if ($NoRestore) { $arguments += '--no-restore' }
$sdk = dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $run "harness-build-$Label.log")
$code = $LASTEXITCODE
[ordered]@{
    arguments=$arguments;exitCode=$code;sdk=$sdk;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    restoreRequestedBecauseNewDependencyManifestCreated=(-not $NoRestore);sourceComparisonStarted=$false
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "harness-build-$Label-command.json") -Encoding utf8
Get-Content (Join-Path $run "harness-build-$Label.log") -Tail 35
if ($code) { throw "Actual F105 harness build failed with exit$code before any source comparison." }
$audit = Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw | ConvertFrom-Json
foreach ($owner in $audit.actualOwners)
{
    $built = Join-Path $run "harness\bin\Release\net12.0\$($owner.assembly).dll"
    if ((Get-FileHash -LiteralPath $built).Hash -cne $owner.sha256) { throw "Actual tested owner changed:$($owner.assembly)" }
}
Write-Output 'F105 actual public-owner harness build passed;all three shipping owner DLLs equal the original executed controls.'
