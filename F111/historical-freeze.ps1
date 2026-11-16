param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$destination=Join-Path $run "binaries\$Variant"
if ((Test-Path $destination) -or (Test-Path (Join-Path $run "$Variant-manifest.json")))
{
    throw 'Do not overwrite a frozen image or receipt.'
}
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F111-stored-data-buffer') { throw 'Independent F111 branch required.' }
$serializer='src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
$unchanged=$false
if ($Variant -eq 'original')
{
    git --no-pager diff --quiet -- $serializer
    if ($LASTEXITCODE) { throw 'The original shipping serializer must be unchanged.' }
    $unchanged=$true
}
$built=Join-Path $run 'harness\bin\Release\net12.0'
New-Item -ItemType Directory -Path $destination -Force|Out-Null
if ($Variant -eq 'original')
{
    foreach ($entry in Get-ChildItem -LiteralPath $built -Force)
    {
        Copy-Item -LiteralPath $entry.FullName -Destination $destination -Recurse
    }
    $audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
    $tested=@($audit.capturedTestAndOwnerImage|Where-Object file -CEQ 'Microsoft.AspNetCore.Components.Endpoints.dll')
    if ($tested.Count -ne 1 -or
        (Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.Components.Endpoints.dll')).Hash -cne $tested[0].sha256)
    {
        throw 'Original executed test owner and frozen harness owner differ.'
    }
}
else
{
    foreach ($entry in Get-ChildItem -LiteralPath (Join-Path $run 'binaries\original') -Force)
    {
        Copy-Item -LiteralPath $entry.FullName -Destination $destination -Recurse
    }
    foreach ($name in 'Microsoft.AspNetCore.Components.Endpoints.dll','Microsoft.AspNetCore.Components.Endpoints.pdb')
    {
        Copy-Item -LiteralPath (Join-Path $built $name) -Destination (Join-Path $destination $name) -Force
    }
    $testedCandidate=Get-Content (Join-Path $run "tests\$Variant\test-audit.json") -Raw|ConvertFrom-Json
    $testedOwner=@($testedCandidate.capturedTestAndOwnerImage|Where-Object file -CEQ 'Microsoft.AspNetCore.Components.Endpoints.dll')
    if ($testedCandidate.actualControlRows -ne 12 -or $testedOwner.Count -ne 1 -or
        (Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.Components.Endpoints.dll')).Hash -cne $testedOwner[0].sha256)
    {
        throw 'Selected owning tests and actual frozen candidate owner must agree.'
    }
}
$sourceRoot=Join-Path $run "frozen-source\$Variant"
New-Item -ItemType Directory -Path (Join-Path $sourceRoot 'harness') -Force|Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force)
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $sourceRoot "harness\$($file.Name)")
}
$sourceFiles=@(
    $serializer,
    'src\Components\Endpoints\src\Serialization\IStoredDataSerializer.cs',
    'src\Components\Endpoints\src\TempData\SessionStorageTempDataProvider.cs',
    'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs',
    'src\Middleware\Session\src\DistributedSession.cs',
    'src\Middleware\Session\src\DistributedSessionStore.cs',
    'src\Middleware\Session\src\EncodedKey.cs',
    'src\Middleware\Session\src\DefaultDistributedSessionStore.cs',
    'src\Middleware\Session\src\Microsoft.AspNetCore.Session.csproj',
    'src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj'
)
if ($Variant -in 'candidate2','candidate3')
{
    $sourceFiles+='src\Shared\PooledArrayBufferWriter.cs'
}
$sources=@(foreach ($relative in $sourceFiles)
{
    $target=Join-Path $sourceRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item -LiteralPath $relative -Destination $target
    [ordered]@{file=$relative;sha256=(Get-FileHash $target).Hash;bytes=(Get-Item $target).Length}
})
git --no-pager diff --binary -- $serializer | Set-Content (Join-Path $sourceRoot 'shipping-change.patch') -Encoding utf8
if ($LASTEXITCODE) { throw 'Exact shipping diff capture failed.' }
function Hash([string]$Name) { (Get-FileHash (Join-Path $destination $Name)).Hash }
[ordered]@{
    candidate='F111';variant=$Variant;branch='autoperf/F111-stored-data-buffer'
    baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';sourceTrackedUnchanged=$unchanged
    capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
    harnessSha256=(Hash 'AutoPerf.Benchmarks.dll');harnessPdbSha256=(Hash 'AutoPerf.Benchmarks.pdb')
    ownerSha256=(Hash 'Microsoft.AspNetCore.Components.Endpoints.dll')
    ownerPdbSha256=(Hash 'Microsoft.AspNetCore.Components.Endpoints.pdb')
    sessionSha256=(Hash 'Microsoft.AspNetCore.Session.dll')
    runtimeConfigurationSha256=(Hash 'AutoPerf.Benchmarks.runtimeconfig.json')
    dependencyConfigurationSha256=(Hash 'AutoPerf.Benchmarks.deps.json')
    sourceFiles=$sources
    provenance='Frozen before the later source publication commit;do not relabel as built from that commit. Original matches exact owning tests;candidate clones every original execution asset except Endpoints DLL/PDB.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "$Variant-manifest.json") -Encoding utf8
node (Join-Path $PSScriptRoot 'F111-closure.mjs') $run $Variant
if ($LASTEXITCODE) { throw 'Complete frozen application closure failed.' }
