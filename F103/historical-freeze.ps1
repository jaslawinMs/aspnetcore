param([Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
Set-Location $repo
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$built = Join-Path $run 'harness\bin\Release\net12.0'
$destination = Join-Path $run "binaries\$Variant"
if (Test-Path $destination) { throw 'Frozen variant exists;do not overwrite.' }
$tracked = @(git status --porcelain --untracked-files=no)
if ($Variant -eq 'original' -and $tracked.Count) { throw 'Original must be unchanged.' }
if ($Variant -ne 'original' -and
    ($tracked.Count -ne 1 -or $tracked[0] -cne ' M src/Components/Analyzers/src/StateHasChangedAnalyzer.cs'))
{
    throw 'Only the single F103 shipping source seam may differ.'
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
if ($Variant -eq 'original')
{
    Copy-Item -LiteralPath $built -Destination $destination -Recurse
}
else
{
    $original = Join-Path $run 'binaries\original'
    $builtIdentity = [Reflection.AssemblyName]::GetAssemblyName((Join-Path $built 'Microsoft.AspNetCore.Components.Analyzers.dll')).FullName
    $originalIdentity = [Reflection.AssemblyName]::GetAssemblyName((Join-Path $original 'Microsoft.AspNetCore.Components.Analyzers.dll')).FullName
    if ($builtIdentity -cne $originalIdentity) { throw 'Owner assembly identity changed;fixed harness cannot be substituted.' }
    Copy-Item -LiteralPath $original -Destination $destination -Recurse
    foreach ($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb')
    {
        Copy-Item -LiteralPath (Join-Path $built $name) -Destination (Join-Path $destination $name)
    }
}
$sources = @(
    'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs',
    'src\Components\Analyzers\src\ComponentFacts.cs',
    'src\Components\Analyzers\src\ComponentSymbols.cs',
    'src\Components\Analyzers\src\ComponentsApi.cs',
    'src\Components\Analyzers\src\DiagnosticDescriptors.cs',
    'src\Components\Analyzers\src\StateHasChangedCodeFixProvider.cs',
    'src\Components\Components\src\ComponentBase.cs',
    'src\Components\Components\src\EventCallback.cs',
    'src\Components\Components\src\EventCallbackFactory.cs')
$sourceRows = @(
    foreach ($source in $sources)
    {
        $target = Join-Path $run "variant-source\$Variant\$source"
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repo $source) -Destination $target
        [ordered]@{source=$source;copy="variant-source\$Variant\$source";sha256=(Get-FileHash $target).Hash}
    }
)
$sourceRows | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "source-copies-$Variant.json")
git --no-pager diff -- src/Components/Analyzers/src/StateHasChangedAnalyzer.cs > (Join-Path $run "source-$Variant.patch")
[ordered]@{
    candidate='F103';variant=$Variant;baselineSourceRevision=(git rev-parse HEAD).Trim();trackedSourceChanges=$tracked
    sourceTrackedUnchanged=($Variant -eq 'original');sourcePatchSha256=(Get-FileHash (Join-Path $run "source-$Variant.patch")).Hash
    ownerAssemblySha256=(Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash
    harnessSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    recompiledHarnessSha256=(Get-FileHash (Join-Path $built 'AutoPerf.Benchmarks.dll')).Hash
    exactOriginalHarnessUsed=$true
    freezeRecipe='Original:actual final build copied. Candidates:exact frozen original executable/PDB/metadata/compiler/config/dependencies with only freshly built same-identity owner DLL/PDB substituted;actual closure enforces those two changes. Recompiled harness is not measured.'
    runtimeConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependencyConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release';harnessFramework='net12.0';ownerFramework='netstandard2.0';shippingRoslynDependencyUnchanged='3.3.1'
    measuredCompilerHost='5.11.0-1.26420.103';capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "$Variant-manifest.json")
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -Filter '*.cs' -File)
{
    $a = @($tool,'pdb',(Join-Path $destination 'AutoPerf.Benchmarks.pdb'),$file.Name,$file.FullName)
    dotnet @a > (Join-Path $run "harness-$($file.BaseName)-pdb-$Variant.json")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$a;exitCode=$code;kind='harness';source=$file.Name})
    if ($code) { throw "Actual harness/PDB source mismatch:$($file.Name)" }
}
foreach ($source in $sourceRows)
{
    $name = Split-Path $source.source -Leaf
    if ($name -eq 'ComponentsApi.cs') { continue } # Pure constants;canonical source is retained,not executable PDB evidence.
    $assembly = if ($source.source.StartsWith('src\Components\Analyzers\')) { 'Microsoft.AspNetCore.Components.Analyzers' } else { 'Microsoft.AspNetCore.Components' }
    $a = @($tool,'pdb',(Join-Path $destination "$assembly.pdb"),$name,(Join-Path $run $source.copy))
    dotnet @a > (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($name))-pdb-$Variant.json")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$a;exitCode=$code;kind='owner-source';source=$source.source})
    if ($code) { throw "Actual owner/PDB source mismatch:$name" }
}
if ($commands.Count -ne 13) { throw 'Five harness/five executable analyzer/three actual Components source associations required.' }
$commands | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "pdb-$Variant-commands.json")
node (Join-Path $PSScriptRoot 'F103-closure.mjs') $run $Variant
if ($LASTEXITCODE) { throw 'Actual frozen closure/harness/reference/config identity failed.' }
Write-Output "F103 $Variant frozen/13 actual source-PDB associations;constant-only ComponentsApi source retained separately,not method-coverage proof."
