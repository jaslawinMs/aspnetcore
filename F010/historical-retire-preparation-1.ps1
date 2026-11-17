$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$retired=Join-Path $run 'preparation-attempts\attempt-1'
if(Test-Path $retired){throw 'Preserve first original preparation retirement.'}
$execution=Get-Content (Join-Path $run 'builds\original\execution.json') -Raw|ConvertFrom-Json
if($execution.commands.Count-ne6 -or $execution.commands[-1].label-cne'legacy-characterization' -or
    $execution.commands[-1].actualExitCode-ne-532462766){throw 'Only actual failed legacy preparation1 may be retired.'}
New-Item $retired -ItemType Directory -Force|Out-Null
$mappings=@()
foreach($relative in 'builds\original','images\original','images\legacy-original','images\standard-original','sources\original','characterization\legacy-original')
{
    $from=Join-Path $run $relative;$to=Join-Path $retired $relative
    if(-not(Test-Path $from)){throw "Actual preparation source missing:$relative"}
    $files=@(Get-ChildItem $from -Recurse -File|ForEach-Object{
        @{path=[IO.Path]::GetRelativePath($from,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    New-Item (Split-Path $to) -ItemType Directory -Force|Out-Null
    Move-Item $from $to
    foreach($file in $files)
    {if((Get-FileHash (Join-Path $to $file.path)).Hash-cne$file.sha256){throw 'Actual failed preparation bytes changed during retirement.'}}
    $mappings+=@{from=$relative;to=[IO.Path]::GetRelativePath($run,$to);files=$files}
}
[ordered]@{candidate='F010';preparation=1;outcome='Native net462 consumer reached25 public-pipeline records then failed an incorrect harness assertion about deferred enumeration count.';
    nativeExitCode=-532462766;shippingCodeChanged=$false;timingLaunches=0;pairedComparisons=0;byteExactMovedMappings=$mappings;
    diagnosis='Actual default service failure logging eagerly formats FailedRequirements via string.Join and requirement.ToString even with no logger provider. The full public boundary therefore additionally enumerates retained allowed values on failure. Fix harness expectations,not production behavior.';
    secondary='Compatibility manifest incorrectly named an unused Microsoft.AspNetCore.Http.Metadata reference;actual owner references Microsoft.AspNetCore.Metadata. Both compiles succeeded with one MSB3245 warning each;exact logs/images retained.'}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $retired 'retirement.json')
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
$additional=@()
foreach($file in 'src\Security\Authorization\Core\src\LoggingExtensions.cs','src\Http\Metadata\src\Microsoft.AspNetCore.Metadata.csproj')
{
    $key=$file.Replace('\','/')
    $base=@(git show "$($investigation.baseline):$key");if($LASTEXITCODE){throw 'Actual baseline additional source unavailable.'}
    $current=@(git show "$($investigation.currentDefault):$key");if($LASTEXITCODE){throw 'Actual fresh default additional source unavailable.'}
    $working=Get-Content $file
    if(($base-join"`n")-cne($current-join"`n") -or ($base-join"`n")-cne($working-join"`n")){throw 'Inspect actual additional producer difference.'}
    $snapshot=Join-Path $run "investigation\additional-producer-source\$file"
    New-Item (Split-Path $snapshot) -ItemType Directory -Force|Out-Null
    Copy-Item $file $snapshot
    $additional+=@{file=$file;workingSha256=(Get-FileHash $file).Hash;baselineDefaultWorkingCanonicalEqual=$true}
}
[ordered]@{candidate='F010';originalInvestigationCount=19;additionalCanonicalEqualSources=$additional;
    actualNativeProducerDiscovered='DefaultAuthorizationService._logger.UserAuthorizationFailed(result.Failure) ->LoggingExtensions.UserAuthorizationFailed(AuthorizationFailure) builds reason eagerly ->string.Join(FailedRequirements) ->ClaimsAuthorizationRequirement.ToString ->string.Join(AllowedValues).';
    expectedDeferredCountsAfterConstructorCounterReset=@{firstMiss=2;nextHitCumulative=3;nextTypeMissCumulative=4};
    notIsolatedLeafEnumerationCounts=$true;noSourceCandidateOrTiming=$true}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'logging-investigation-addendum.json')
Write-Output 'F010 preparation1 exact sources/images/25 completed native records/logs retained;producer-owned failure formatting explains wrong harness counter assertion,no shipping change or timing.'
