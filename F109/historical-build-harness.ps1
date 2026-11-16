param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial',
    [switch]$NoRestore
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
if (Test-Path (Join-Path $run "harness-build-$Label-command.json")) { throw 'Retain completed build attempts;choose a new explicit label.' }
Copy-Item -LiteralPath 'C:\src\aspnetcore\.editorconfig' -Destination (Join-Path $run 'harness\.editorconfig')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F109-acceptance.md') -Destination (Join-Path $run 'acceptance.md')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','-v:minimal')
if ($NoRestore) { $arguments+='--no-restore' }
$sdk=dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $run "harness-build-$Label.log")
$code=$LASTEXITCODE
[ordered]@{
    arguments=$arguments;exitCode=$code;sdk=$sdk;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    newHarnessManifestPermitsInitialRestore=(-not $NoRestore);sourceComparisons=0
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run "harness-build-$Label-command.json") -Encoding utf8
Get-Content (Join-Path $run "harness-build-$Label.log") -Tail 30
if ($code) { throw "Actual F109 harness build failed exit$code before any source comparison." }
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
foreach ($owner in $audit.actualOwners)
{
    $built=Join-Path $run "harness\bin\Release\net12.0\$($owner.assembly).dll"
    if ((Get-FileHash $built).Hash -cne $owner.sha256) { throw "Actual original tested owner changed:$($owner.assembly)" }
}
Write-Output 'F109 actual public manager/provider/real Data Protection harness built;all three tested original owner identities agree.'
