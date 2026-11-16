param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial',
    [switch]$NoRestore
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
if (Test-Path (Join-Path $run "harness-build-$Label-command.json")) { throw 'Retain completed build attempts;choose a new exact label.' }
Copy-Item -LiteralPath 'C:\src\aspnetcore\.editorconfig' -Destination (Join-Path $run 'harness\.editorconfig')
$sourceArchive=Join-Path $run "development\harness-build-$Label"
New-Item -ItemType Directory -Path $sourceArchive -Force|Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force)
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $sourceArchive $file.Name)
}
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','-v:minimal')
if ($NoRestore) { $arguments+='--no-restore' }
$sdk=dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $run "harness-build-$Label.log")
$code=$LASTEXITCODE
[ordered]@{
    candidate='F111';arguments=$arguments;exitCode=$code;sdk=$sdk;startedAt=$started
    completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    newHarnessManifestPermitsInitialRestore=(-not $NoRestore);measuredComparisons=0
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run "harness-build-$Label-command.json") -Encoding utf8
Get-Content (Join-Path $run "harness-build-$Label.log") -Tail 35
if ($code) { throw "Actual F111 harness build failed exit$code before any source comparison." }
$owner=Join-Path $run 'harness\bin\Release\net12.0\Microsoft.AspNetCore.Components.Endpoints.dll'
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
$tested=@($audit.capturedTestAndOwnerImage|Where-Object file -CEQ 'Microsoft.AspNetCore.Components.Endpoints.dll')
if ($Label -eq 'initial' -and ($tested.Count -ne 1 -or (Get-FileHash $owner).Hash -cne $tested[0].sha256))
{
    throw 'The original tested owning serializer differs from the actual harness dependency.'
}
Write-Output 'F111 actual public DI/owning serializer/real DistributedSession harness built.'
