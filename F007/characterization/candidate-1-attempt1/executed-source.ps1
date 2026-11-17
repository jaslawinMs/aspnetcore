param([Parameter(Mandatory)][ValidateSet('original','candidate-1')][string]$Variant,[int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$image=Join-Path $run "binaries\$Variant"
$frozen=Join-Path $run "frozen-source\$Variant"
$destination=Join-Path $run "characterization\$Variant-attempt$Attempt"
if(Test-Path $destination){throw 'Never overwrite an actual full-owner characterization.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$manifest=Get-Content (Join-Path $run "manifest-$Variant.json") -Raw|ConvertFrom-Json
function VerifyFrozen
{
    foreach($group in @(@{root=$image;rows=$manifest.files},@{root=$frozen;rows=$manifest.frozenSources}))
    {
        foreach($file in $group.rows)
        {
            $path=Join-Path $group.root $file.relativePath
            if((Get-FileHash $path).Hash-cne$file.sha256 -or (Get-Item $path).Length-ne$file.bytes){throw 'Actual frozen image/source changed.'}
        }
    }
}
VerifyFrozen
$a=@((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--characterize','--artifacts',$destination,'--sources',$frozen,'--context',$Variant,
    '--test-assembly',(Join-Path $run "tests\$Variant\test-image\Microsoft.AspNetCore.Components.Server.Tests.dll"))
& dotnet @a *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F007';variant=$Variant;attempt=$Attempt;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
    frozenImageFilesRehashed=$manifest.files.Count;frozenSourceFilesRehashed=$manifest.frozenSources.Count;
    notATimedComparison=$true;activation='. .\activate.ps1'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'execution.json')
if($code-ne0)
{
    Get-Content (Join-Path $destination 'console.log') -Tail 45
    throw "Actual owner/JSON/marker characterization failed with exit$code."
}
VerifyFrozen
$states=@(Get-ChildItem (Join-Path $destination 'states') -Filter '*-validated.json'|ForEach-Object {Get-Content $_.FullName -Raw|ConvertFrom-Json})
$completion=@(Get-ChildItem (Join-Path $destination 'states') -Filter '*-characterization-completed.json'|ForEach-Object {Get-Content $_.FullName -Raw|ConvertFrom-Json})
if($states.Count-ne129 -or @($states|Where-Object passed -NE $true).Count -or $completion.Count-ne1 -or $completion[0].actualChecks-ne129){throw 'Exactly129 actual full-owner characterizations required.'}
$proofs=@(Get-ChildItem (Join-Path $destination 'states') -Filter '*-producer.json')
if($proofs.Count-ne107){throw 'Exactly107 actual source/JSON producer proofs required.'}
[ordered]@{candidate='F007';variant=$Variant;actualExitCode=$code;actualOwnerChecks=$states.Count;actualProducerProofs=$proofs.Count;
    actualExistingTestRows=33;newExistingTestExecutions=0;owningTestEvidenceFrom=$Variant;largeSparseExtremeAndRealDescriptorStateCharacterized=$true;
    actualSmallAnd128BoundaryAndLargeInputs=$true;actualFirstInvalidLogsAndSequentialState=$true;
    noRuntimeOrBrowserIntegrationClaim=$true;notATimedComparison=$true}|
    ConvertTo-Json -Depth 5|Set-Content (Join-Path $run "ready-$Variant.json")
Get-Content (Join-Path $destination 'console.log') -Tail 1
