param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$destination=Join-Path $run "binaries\$Variant"
if ((Test-Path $destination) -or (Test-Path (Join-Path $run "$Variant-manifest.json"))) { throw 'Never overwrite frozen F112 image/receipt.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F112-stored-value-buffer') { throw 'Independent F112 branch required.' }
$serializer='src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
if ($Variant -eq 'original')
{
    git --no-pager diff --quiet -- $serializer
    if ($LASTEXITCODE) { throw 'Original shipping serializer must be unchanged.' }
}
$built=Join-Path $run 'harness\bin\Release\net12.0'
New-Item -ItemType Directory -Path $destination -Force|Out-Null
$copyFrom=if ($Variant -eq 'original') {$built} else {Join-Path $run 'binaries\original'}
foreach ($entry in Get-ChildItem -LiteralPath $copyFrom -Force)
{
    Copy-Item -LiteralPath $entry.FullName -Destination $destination -Recurse
}
if ($Variant -ne 'original')
{
    foreach ($name in 'Microsoft.AspNetCore.Components.Endpoints.dll','Microsoft.AspNetCore.Components.Endpoints.pdb')
    {
        Copy-Item -LiteralPath (Join-Path $built $name) -Destination (Join-Path $destination $name) -Force
    }
}
$audit=Get-Content (Join-Path $run "tests\$Variant\test-audit.json") -Raw|ConvertFrom-Json
$tested=@($audit.capturedTestAndOwnerImage|Where-Object file -CEQ 'Microsoft.AspNetCore.Components.Endpoints.dll')
if ($tested.Count -ne 1 -or (Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.Components.Endpoints.dll')).Hash -cne $tested[0].sha256) { throw 'Exact executed owning-test and frozen owner identities differ.' }
if ($Variant -ne 'original' -and $audit.actualControlRows -ne 18) { throw 'All18 selected original+preservation rows required.' }
$sourceRoot=Join-Path $run "frozen-source\$Variant"
New-Item -ItemType Directory -Path (Join-Path $sourceRoot 'harness') -Force|Out-Null
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force)
{
    Copy-Item $file.FullName (Join-Path $sourceRoot "harness\$($file.Name)")
}
$sourceFiles=@(
    $serializer,'src\Components\Endpoints\src\Serialization\IStoredDataSerializer.cs',
    'src\Components\Endpoints\src\SessionCascadingValueSupplier.cs',
    'src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.cs',
    'src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.Prerendering.cs',
    'src\Components\Endpoints\src\Results\RazorComponentResultExecutor.cs',
    'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs',
    'src\Middleware\Session\src\DistributedSession.cs','src\Middleware\Session\src\DistributedSessionStore.cs',
    'src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj'
)
if ($Variant -ne 'original') { $sourceFiles+='src\Shared\PooledArrayBufferWriter.cs' }
$sources=@(foreach ($relative in $sourceFiles)
{
    $target=Join-Path $sourceRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item -LiteralPath $relative -Destination $target
    [ordered]@{file=$relative;sha256=(Get-FileHash $target).Hash;bytes=(Get-Item $target).Length}
})
git --no-pager diff --binary -- $serializer 'src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj' |
    Set-Content (Join-Path $sourceRoot 'shipping-change.patch') -Encoding utf8
if ($LASTEXITCODE) { throw 'Source diff capture failed.' }
function Hash([string]$Name) { (Get-FileHash (Join-Path $destination $Name)).Hash }
[ordered]@{
    candidate='F112';variant=$Variant;branch='autoperf/F112-stored-value-buffer'
    baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';sourceTrackedUnchanged=($Variant -eq 'original')
    capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
    harnessSha256=(Hash 'AutoPerf.Benchmarks.dll');harnessPdbSha256=(Hash 'AutoPerf.Benchmarks.pdb')
    ownerSha256=(Hash 'Microsoft.AspNetCore.Components.Endpoints.dll');ownerPdbSha256=(Hash 'Microsoft.AspNetCore.Components.Endpoints.pdb')
    sessionSha256=(Hash 'Microsoft.AspNetCore.Session.dll');runtimeConfigurationSha256=(Hash 'AutoPerf.Benchmarks.runtimeconfig.json')
    dependencyConfigurationSha256=(Hash 'AutoPerf.Benchmarks.deps.json');sourceFiles=$sources
    provenance='Frozen before the later source publication commit;never relabel. Original matches executed owning tests;candidate clones every original execution asset except Endpoints DLL/PDB.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "$Variant-manifest.json") -Encoding utf8
node (Join-Path $PSScriptRoot 'F112-closure.mjs') $run $Variant
if ($LASTEXITCODE) { throw 'Frozen full execution closure failed.' }
