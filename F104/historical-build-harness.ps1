param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label='initial',
    [switch]$NoRestore
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
if (Test-Path (Join-Path $run "harness-build-$Label-command.json")) { throw 'Build record exists; choose a new explicit label.' }
$arguments = @('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','-v:minimal')
if ($NoRestore) { $arguments += '--no-restore' }
$started = [DateTimeOffset]::UtcNow.ToString('o')
$sdk = dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
dotnet @arguments *> (Join-Path $run "harness-build-$Label.log")
$code = $LASTEXITCODE
[ordered]@{
    arguments=$arguments;exitCode=$code;sdk=$sdk
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    restoreRequestedBecauseNewDependencyManifestCreated=(-not $NoRestore);sourceComparisonStarted=$false
} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "harness-build-$Label-command.json") -Encoding utf8
Get-Content (Join-Path $run "harness-build-$Label.log") -Tail 55
if ($code) { throw "Actual initial F104 harness build failed with exit $code before measurement." }
$owner = Join-Path $run 'harness\bin\Release\net12.0\Microsoft.AspNetCore.App.Analyzers.dll'
$controls = Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw | ConvertFrom-Json
if ((Get-FileHash $owner).Hash -cne $controls.actualOwnerSha256)
{
    throw 'Actual initial harness owner differs from the original tested owner; resolve before freeze.'
}
Write-Output 'F104 initial actual-owner harness build passed and matches the tested original owner.'
