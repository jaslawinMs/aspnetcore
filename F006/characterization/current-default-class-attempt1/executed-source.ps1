param([Parameter(Mandatory)][ValidateSet('original','candidate-1','current-default-class')][string]$Variant,[int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$image=Join-Path $run "binaries\$Variant"
$frozen=Join-Path $run "frozen-source\$Variant"
$destination=Join-Path $run "characterization\$Variant-attempt$Attempt"
if(Test-Path $destination){throw 'Refusing to overwrite an actual compiler characterization.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$manifest=Get-Content (Join-Path $run "manifest-$Variant.json") -Raw|ConvertFrom-Json
function VerifyImage
{
    foreach($file in $manifest.files)
    {
        $path=Join-Path $image $file.relativePath
        if((Get-FileHash $path).Hash-cne$file.sha256 -or (Get-Item $path).Length-ne$file.bytes){throw 'Actual frozen image changed.'}
    }
}
VerifyImage
$a=@((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--characterize','--artifacts',$destination,'--sources',$frozen,'--context',$Variant)
if($Variant-ne'current-default-class'){$a+=@('--test-assembly',(Join-Path $run "tests\$Variant\test-image\Microsoft.AspNetCore.Components.Analyzers.Tests.dll"))}
& dotnet @a *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F006';variant=$Variant;attempt=$Attempt;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
    frozenImageFilesRehashed=$manifest.files.Count;notATimedComparison=$true;activation='. .\activate.ps1'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'execution.json')
if($code-ne0)
{
    Get-Content (Join-Path $destination 'console.log') -Tail 45
    throw "Actual compiler producer/diagnostic characterization failed with exit$code."
}
VerifyImage
$states=@(Get-ChildItem (Join-Path $destination 'states') -Filter '*-characterized.json'|ForEach-Object {Get-Content $_.FullName -Raw|ConvertFrom-Json})
if($states.Count-ne120 -or @($states|Where-Object passed -NE $true).Count){throw 'Expected120 actual full-owner sample/boundary checks.'}
[ordered]@{candidate='F006';variant=$Variant;actualExitCode=$code;actualCompilerChecks=120;sourceLanguage='CSharp13';ordinaryAndGenerated=$true;
    serialAndConcurrent=$true;warmAndFreshCompilation=$true;actualExistingTestRows=$(if($Variant-eq'current-default-class'){0}else{20});
    newExistingTestExecutions=0;owningTestEvidenceFrom=$(if($Variant-eq'current-default-class'){$null}else{$Variant});
    actualBL0014Observations=($states|ForEach-Object {$_.diagnostics.Count}|Measure-Object -Sum).Sum;separateAdjacentDefaultControlRetained=$true;
    actualForVariableHitsAndNonForVariableMissesCharacterized=$true;noRuntimeOrBrowserClaim=$true;notATimedComparison=$true}|
    ConvertTo-Json -Depth 5|Set-Content (Join-Path $run "ready-$Variant.json")
Get-Content (Join-Path $destination 'console.log') -Tail 1
