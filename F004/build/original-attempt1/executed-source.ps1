param([Parameter(Mandatory)][ValidateSet('original','candidate-1')][string]$Variant,[int]$Attempt=1)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo = [string]$PWD
$run = Join-Path $PSScriptRoot 'autoperf-runs\F004'
$harness = Join-Path $run 'harness'
$build = Join-Path $run "build\$Variant-attempt$Attempt"
$image = Join-Path $run "binaries\$Variant"
$frozen = Join-Path $run "frozen-source\$Variant"
if ((Test-Path $build) -or (Test-Path $image) -or (Test-Path $frozen)) { throw 'Refusing to overwrite an actual build/image/source attempt.' }
New-Item $build -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$borrow = Join-Path $PSScriptRoot 'autoperf-runs\F002\harness\SettingsPreservingEmitToolchain.cs'
$target = Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
if (-not (Test-Path $target))
{
    Copy-Item $borrow $target
}
if ((Get-FileHash $borrow).Hash -cne (Get-FileHash $target).Hash) { throw 'Borrowed settings-preserving executor was unexpectedly altered.' }
[ordered]@{borrowedFrom=$borrow;sha256=(Get-FileHash $target).Hash;exactUnmodifiedCopy=$true;notARerunOfFinalizedF002=$true} |
    ConvertTo-Json | Set-Content (Join-Path $build 'executor-provenance.json')
Get-ChildItem $harness -File | Where-Object Extension -In '.cs','.csproj' | Copy-Item -Destination $build
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
$a = @('build',$project,'-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false',"-p:RestoreConfigFile=$repo\NuGet.config","-bl:$build\harness-build.binlog")
if ($Variant -ne 'original' -or $Attempt -ne 1) { $a += '--no-restore' }
& dotnet @a *> (Join-Path $build 'harness-build.log')
$code = $LASTEXITCODE
[ordered]@{candidate='F004';variant=$Variant;attempt=$Attempt;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
    activation='. .\activate.ps1';firstNewHarnessManifestMayRestore=($Variant -eq 'original' -and $Attempt -eq 1)} |
    ConvertTo-Json -Depth 7 | Set-Content (Join-Path $build 'execution.json')
if ($code -ne 0)
{
    Get-Content (Join-Path $build 'harness-build.log') -Tail 60
    throw "Actual harness build failed with exit$code."
}
New-Item $image -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $harness 'bin\Release\net12.0\*') $image -Recurse
New-Item (Join-Path $frozen 'harness'),(Join-Path $frozen 'owner'),(Join-Path $frozen 'test') -ItemType Directory -Force | Out-Null
Get-ChildItem $harness -File | Where-Object Extension -In '.cs','.csproj' | Copy-Item -Destination (Join-Path $frozen 'harness')
Get-ChildItem (Join-Path $repo 'src\Components\Analyzers\src') -File | Where-Object Extension -In '.cs','.csproj','.resx' |
    Copy-Item -Destination (Join-Path $frozen 'owner')
Copy-Item 'src\Components\Analyzers\test\ForLoopIteratorInClosureAnalyzerTest.cs' (Join-Path $frozen 'test')
$testDirectory = Join-Path $run "tests\$Variant"
$testAudit = Get-Content (Join-Path $testDirectory 'actual-test-audit.json') -Raw | ConvertFrom-Json
$ownerHash = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash
if ($ownerHash -cne $testAudit.binaryHashes[0].sha256) { throw 'Frozen actual owner differs from the original/final owning test output.' }
New-Item (Join-Path $testDirectory 'test-image') -ItemType Directory | Out-Null
foreach ($name in 'Microsoft.AspNetCore.Components.Analyzers.Tests.dll','Microsoft.AspNetCore.Components.Analyzers.Tests.pdb','Microsoft.AspNetCore.Components.Analyzers.Tests.deps.json','Microsoft.AspNetCore.Components.Analyzers.Tests.runtimeconfig.json')
{
    Copy-Item (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Components.Analyzers.Tests\Release\net12.0\$name") (Join-Path $testDirectory 'test-image')
}
$manifest = @(Get-ChildItem $image -File -Recurse | ForEach-Object {
    [ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}
})
$sources = @(Get-ChildItem $frozen -File -Recurse | ForEach-Object {
    [ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}
})
[ordered]@{candidate='F004';variant=$Variant;ownerSha256=$ownerHash;imageRoot=$image;files=$manifest;frozenSources=$sources;actualTestOutputOwnerMatched=$true} |
    ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run "manifest-$Variant.json")
Write-Output "F004 $Variant`:fresh actual harness built/frozen,$($manifest.Count) image files,$($sources.Count) exact source files;owning test owner matched."
