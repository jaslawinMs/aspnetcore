param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='initial')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$directory=Join-Path $run "development\harness-build-$Label"
if (Test-Path $directory) {throw 'Preserve every actual harness compiler attempt.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force) {Copy-Item $file.FullName (Join-Path $directory "source\$($file.Name)")}
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:BuildProjectReferences=false','-p:UseIisNativeAssets=false','-v:quiet')
$sdk=dotnet --version
if ($LASTEXITCODE) {throw 'Activated SDK identity failed.'}
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F113';label=$Label;arguments=$arguments;exitCode=$code;sdk=$sdk;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    newStandaloneManifestPermitsInitialRestore=$true;actualOwningDependenciesPreviouslyBuilt=$true
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run "harness-build-$Label-command.json") -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code) {throw 'Actual harness build failed;preserve this source/log attempt.'}
