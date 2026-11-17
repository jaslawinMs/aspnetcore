param([Parameter(Mandatory)][ValidateSet('original','candidate-1','current-default-class')][string]$Variant,[int]$Attempt=1)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F005'
$image = Join-Path $run "binaries\$Variant"
$frozen = Join-Path $run "frozen-source\$Variant"
$destination = Join-Path $run "characterization\$Variant-attempt$Attempt"
if (Test-Path $destination) { throw 'Refusing to overwrite an actual compiler characterization attempt.' }
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$manifest = Get-Content (Join-Path $run "manifest-$Variant.json") -Raw | ConvertFrom-Json
foreach ($file in $manifest.files)
{
    $path = Join-Path $image $file.relativePath
    if ((Get-FileHash $path).Hash -cne $file.sha256 -or (Get-Item $path).Length -ne $file.bytes) { throw 'Actual frozen image changed.' }
}
$a = @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--characterize','--artifacts',$destination,'--sources',$frozen,'--context',$Variant)
if ($Variant -ne 'current-default-class')
{
    $a += @('--test-assembly',(Join-Path $run "tests\$Variant\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll"))
}
& dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{candidate='F005';variant=$Variant;attempt=$Attempt;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
    frozenImageFilesRehashed=$manifest.files.Count;notATimedComparison=$true;activation='. .\activate.ps1'} |
    ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'execution.json')
if ($code -ne 0)
{
    Get-Content (Join-Path $destination 'console.log') -Tail 45
    throw "Actual compiler producer/diagnostic characterization failed with exit$code."
}
$states = @(Get-ChildItem (Join-Path $destination 'states') -Filter '*-characterized.json' | ForEach-Object {Get-Content $_.FullName -Raw | ConvertFrom-Json})
if ($states.Count -ne 112 -or @($states | Where-Object passed -ne $true).Count) { throw 'Expected112 actual full-owner sample/boundary checks.' }
[ordered]@{candidate='F005';variant=$Variant;actualExitCode=$code;actualCompilerChecks=112;sourceLanguage='CSharp13';ordinaryAndGenerated=$true;
    serialAndConcurrent=$true;warmAndFreshCompilation=$true;actualExistingTestRows= $(if($Variant -eq 'current-default-class'){0}else{20});
    actualBL0014Observations=($states | ForEach-Object {$_.diagnostics.Count} | Measure-Object -Sum).Sum;separateAdjacentDefaultControlRetained=$true;
    noRuntimeOrBrowserClaim=$true;notATimedComparison=$true} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "ready-$Variant.json")
Get-Content (Join-Path $destination 'console.log') -Tail 1
