$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$out=Join-Path $run 'compatibility-gates\candidate'
if(Test-Path $out){throw 'Preserve actual postmeasurement unchanged API/reference output observation.'}
$original=Get-Content (Join-Path $run 'compatibility-gates\original\gates.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'manifest-candidate.json') -Raw|ConvertFrom-Json
$owner='C:\src\aspnetcore\src\Security\Authorization\Core\src'
$rows=@()
foreach($entry in $original.apiFiles)
{
    $current=Join-Path $owner $entry.path
    $hash=(Get-FileHash $current).Hash
    if($hash-cne$entry.sha256){throw 'Actual candidate API baseline changed.'}
    $target=Join-Path $out $entry.path
    New-Item (Split-Path $target) -ItemType Directory -Force|Out-Null
    Copy-Item $current $target
    $rows+=@{path=$entry.path;sha256=$hash}
}
$reference=@($original.ownerTargets|Where-Object targetFramework -CEQ 'net12.0')[0]
$currentReference=$reference.evaluated.TargetRefPath
$referenceHash=(Get-FileHash $currentReference).Hash
if($referenceHash-cne$reference.referenceAssemblySha256){throw 'Actual candidate net12 reference assembly changed.'}
New-Item (Join-Path $out 'net12.0') -ItemType Directory -Force|Out-Null
Copy-Item $currentReference (Join-Path $out 'net12.0\Microsoft.AspNetCore.Authorization.dll')
[ordered]@{candidate='F010';observedUtc=[DateTimeOffset]::UtcNow.ToString('o');
    phase='Postmeasurement read-only preservation of existing candidate API/reference outputs;no rebuild,test,timing or new property evaluation.';
    ownerSourceSha256=(Get-FileHash (Join-Path $owner 'ClaimsAuthorizationRequirement.cs')).Hash;ownerTargets=$manifest.ownerTargets;
    apiFiles=$rows;net12ReferenceAssemblySha256=$referenceHash;apiOrReferenceChanged=$false;timingRepeated=$false;budgetReset=$false}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $out 'gates.json')
Copy-Item $PSCommandPath (Join-Path $out 'executed-source.ps1')
Write-Output 'F010 all6 actual per-TFM candidate API files/net12 reference DLL remain byte-identical;existing outputs preserved without rebuilding.'
