param([Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$built = Join-Path $run 'harness\bin\Release\net12.0'
$destination = Join-Path $run "binaries\$Variant"
$ownerName = 'Microsoft.AspNetCore.App.Analyzers'
if (Test-Path $destination) { throw 'Frozen variant exists;do not overwrite.' }
$tracked = @(git status --porcelain --untracked-files=no)
if ($Variant -eq 'original' -and $tracked.Count) { throw 'Original must be unchanged.' }
if ($Variant -ne 'original' -and
    ($tracked.Count -ne 1 -or $tracked[0] -cne ' M src/Framework/AspNetCoreAnalyzers/src/Analyzers/RouteHandlers/RouteHandlerAnalyzer.cs'))
{
    throw 'Only the single F104 shipping source seam may differ.'
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
if ($Variant -eq 'original')
{
    $test = Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw | ConvertFrom-Json
    if ((Get-FileHash (Join-Path $built "$ownerName.dll")).Hash -cne $test.actualOwnerSha256)
    {
        throw 'Actual original built owner differs from the executed test output.'
    }
    Copy-Item -LiteralPath $built -Destination $destination -Recurse
}
else
{
    $original = Join-Path $run 'binaries\original'
    $freshOwner = 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.App.Analyzers\Release\netstandard2.0'
    $builtIdentity = [Reflection.AssemblyName]::GetAssemblyName((Join-Path $freshOwner "$ownerName.dll")).FullName
    $originalIdentity = [Reflection.AssemblyName]::GetAssemblyName((Join-Path $original "$ownerName.dll")).FullName
    if ($builtIdentity -cne $originalIdentity) { throw 'Owner identity changed;do not substitute another executable harness.' }
    Copy-Item -LiteralPath $original -Destination $destination -Recurse
    foreach ($name in "$ownerName.dll","$ownerName.pdb")
    {
        Copy-Item -LiteralPath (Join-Path $freshOwner $name) -Destination (Join-Path $destination $name)
    }
}
$primary = Get-Content (Join-Path $run 'producer-source-copies.json') -Raw | ConvertFrom-Json
$supplemental = @(Get-ChildItem $run -Filter 'metadata-*-source-proof.json' -File |
    ForEach-Object {Get-Content $_.FullName -Raw | ConvertFrom-Json})
$sources = @($primary | ForEach-Object {$_.path}) + @($supplemental | ForEach-Object {$_.path})
$sources = @($sources | Sort-Object -Unique)
if ($sources.Count -ne 28) { throw 'All28 actual current/baseline scoped source identities are required.' }
$sourceRows = @(
    foreach ($source in $sources)
    {
        $target = Join-Path $run "variant-source\$Variant\$source"
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $target
        [pscustomobject][ordered]@{source=$source;copy="variant-source\$Variant\$source";sha256=(Get-FileHash $target).Hash}
    }
)
$sourceRows | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "source-copies-$Variant.json") -Encoding utf8
git --no-pager diff -- src/Framework/AspNetCoreAnalyzers/src/Analyzers/RouteHandlers/RouteHandlerAnalyzer.cs > (Join-Path $run "source-$Variant.patch")
if ($LASTEXITCODE) { throw 'Actual source patch capture failed.' }
[ordered]@{
    candidate='F104';variant=$Variant;baselineSourceRevision=(git rev-parse HEAD).Trim();trackedSourceChanges=$tracked
    sourceTrackedUnchanged=($Variant -eq 'original');sourcePatchSha256=(Get-FileHash (Join-Path $run "source-$Variant.patch")).Hash
    ownerAssemblySha256=(Get-FileHash (Join-Path $destination "$ownerName.dll")).Hash
    harnessSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    exactOriginalHarnessUsed=$true
    freezeRecipe='Original:actual final build copied,owner equals executed original control output. Candidates:exact original executable/PDB/compiler/metadata/config/dependencies cloned,then freshly built same-identity owner DLL/PDB substituted. Recompiled harness is not measured.'
    runtimeConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependencyConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release';harnessFramework='net12.0';ownerFramework='netstandard2.0'
    shippingRoslynDependencyUnchanged='5.11.0-1.26420.103';measuredCompilerHost='5.11.0-1.26420.103'
    scopedSourceIdentities=$sources.Count;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "$Variant-manifest.json") -Encoding utf8
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -Filter '*.cs' -File)
{
    $arguments = @($tool,'pdb',(Join-Path $destination 'AutoPerf.Benchmarks.pdb'),$file.Name,$file.FullName)
    dotnet @arguments > (Join-Path $run "harness-$($file.BaseName)-pdb-$Variant.json")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject][ordered]@{arguments=$arguments;exitCode=$code;kind='harness';source=$file.Name})
    if ($code) { throw "Actual harness/source-PDB mismatch:$($file.Name)" }
}
$associations = @($sourceRows | Where-Object {
    $_.source.EndsWith('.cs') -and (
        $_.source.StartsWith('src\Framework\AspNetCoreAnalyzers\src\') -or
        $_.source.StartsWith('src\Shared\RoslynUtils\'))
} | ForEach-Object {[pscustomobject]@{row=$_;assembly=$ownerName}})
foreach ($pair in @(
    @('src\Http\Routing\src\Builder\EndpointRouteBuilderExtensions.cs','Microsoft.AspNetCore.Routing'),
    @('src\Http\Routing\src\RouteGroupBuilder.cs','Microsoft.AspNetCore.Routing'),
    @('src\Http\Routing.Abstractions\src\RouteData.cs','Microsoft.AspNetCore.Routing.Abstractions'),
    @('src\Mvc\Mvc.Core\src\BindAttribute.cs','Microsoft.AspNetCore.Mvc.Core')
))
{
    $row = @($sourceRows | Where-Object {$_.source -ceq $pair[0]})
    if ($row.Count -ne 1) { throw 'Resolved metadata source mapping is missing.' }
    $associations += [pscustomobject]@{row=$row[0];assembly=$pair[1]}
}
foreach ($association in $associations)
{
    $name = Split-Path $association.row.source -Leaf
    $arguments = @($tool,'pdb',(Join-Path $destination "$($association.assembly).pdb"),$name,
        (Join-Path $run $association.row.copy))
    dotnet @arguments > (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($name))-pdb-$Variant.json")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject][ordered]@{arguments=$arguments;exitCode=$code;kind='actual-owner-or-metadata-source';source=$association.row.source})
    if ($code) { throw "Actual owning/metadata source-PDB association failed:$name" }
}
$commands | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "pdb-$Variant-commands.json") -Encoding utf8
if ($commands.Count -ne 25) { throw 'All5 harness/16 analyzer/4 actual executable metadata source-PDB associations required.' }
node (Join-Path $PSScriptRoot 'F104-closure.mjs') $run $Variant
if ($LASTEXITCODE) { throw 'Actual frozen closure/reference/config/harness identity failed.' }
Write-Output "F104 $Variant frozen with25 source/PDB associations;declarative interface/delegate/resource/project/test sources retained separately,not executable coverage proof."
