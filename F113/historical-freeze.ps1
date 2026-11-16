param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$destination=Join-Path $run "binaries\$Variant"
if ((Test-Path $destination) -or (Test-Path (Join-Path $run "$Variant-manifest.json"))) {throw 'Never overwrite frozen F113 image/receipt.'}
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F113-distributed-cache-encode') {throw 'Independent F113 branch required.'}
$owner='src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperService.cs'
if ($Variant -ceq 'original')
{
    git --no-pager diff --quiet -- $owner
    if ($LASTEXITCODE) {throw 'Original shipping owner must be unchanged.'}
}
$built=Join-Path $run 'harness\bin\Release\net12.0'
New-Item -ItemType Directory -Path $destination -Force|Out-Null
$copyFrom=if ($Variant -ceq 'original') {$built} else {Join-Path $run 'binaries\original'}
foreach ($entry in Get-ChildItem $copyFrom -Force) {Copy-Item $entry.FullName $destination -Recurse}
if ($Variant -cne 'original')
{
    foreach ($name in 'Microsoft.AspNetCore.Mvc.TagHelpers.dll','Microsoft.AspNetCore.Mvc.TagHelpers.pdb')
    {
        Copy-Item (Join-Path $built $name) (Join-Path $destination $name) -Force
    }
}
$audit=Get-Content (Join-Path $run "tests\$Variant\test-audit.json") -Raw|ConvertFrom-Json
$tested=@($audit.capturedTestAndOwnerImage|Where-Object file -CEQ 'Microsoft.AspNetCore.Mvc.TagHelpers.dll')
if ($tested.Count -ne 1 -or (Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.Mvc.TagHelpers.dll')).Hash -cne $tested[0].sha256) {throw 'Tested and frozen actual owner identities differ.'}
if ($Variant -cne 'original' -and $audit.actualControlRows -ne 19) {throw 'All19 selected preservation rows required.'}
$sourceRoot=Join-Path $run "frozen-source\$Variant"
New-Item -ItemType Directory -Path (Join-Path $sourceRoot 'harness') -Force|Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force) {Copy-Item $file.FullName (Join-Path $sourceRoot "harness\$($file.Name)")}
$sourceFiles=@(
    $owner,'src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperFormatter.cs',
    'src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperStorage.cs',
    'src\Mvc\Mvc.TagHelpers\src\Cache\CacheTagKey.cs','src\Mvc\Mvc.TagHelpers\src\DistributedCacheTagHelper.cs',
    'src\Mvc\Mvc.TagHelpers\src\CacheTagHelperBase.cs','src\Mvc\Mvc.TagHelpers\src\DependencyInjection\TagHelperExtensions.cs',
    'src\Mvc\Mvc.TagHelpers\src\Microsoft.AspNetCore.Mvc.TagHelpers.csproj'
)
$sources=@(foreach ($relative in $sourceFiles)
{
    $target=Join-Path $sourceRoot $relative;New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item $relative $target
    [ordered]@{file=$relative;sha256=(Get-FileHash $target).Hash;bytes=(Get-Item $target).Length}
})
git --no-pager diff --binary -- $owner|Set-Content (Join-Path $sourceRoot 'shipping-change.patch') -Encoding utf8
if ($LASTEXITCODE) {throw 'Source diff capture failed.'}
function Hash([string]$Name) {(Get-FileHash (Join-Path $destination $Name)).Hash}
[ordered]@{
    candidate='F113';variant=$Variant;branch='autoperf/F113-distributed-cache-encode';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
    sourceTrackedUnchanged=($Variant -ceq 'original');capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
    harnessSha256=(Hash 'AutoPerf.Benchmarks.dll');harnessPdbSha256=(Hash 'AutoPerf.Benchmarks.pdb')
    ownerSha256=(Hash 'Microsoft.AspNetCore.Mvc.TagHelpers.dll');ownerPdbSha256=(Hash 'Microsoft.AspNetCore.Mvc.TagHelpers.pdb')
    cacheSha256=(Hash 'Microsoft.Extensions.Caching.Memory.dll');runtimeConfigurationSha256=(Hash 'AutoPerf.Benchmarks.runtimeconfig.json')
    dependencyConfigurationSha256=(Hash 'AutoPerf.Benchmarks.deps.json');sourceFiles=$sources
    provenance='Frozen before later source publication commit;never relabel. Original matches executed owning tests;candidate clones every original execution asset except Mvc.TagHelpers DLL/PDB.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "$Variant-manifest.json") -Encoding utf8
node (Join-Path $PSScriptRoot 'F113-closure.mjs') $run $Variant
if ($LASTEXITCODE) {throw 'Frozen complete execution closure failed.'}
