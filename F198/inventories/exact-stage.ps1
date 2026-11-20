$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot 'autoperf-parallelism\finding-F198-158'
if ((Get-FileHash -LiteralPath (Join-Path $base 'plan.json') -Algorithm SHA256).Hash -cne
    '448B26429F40AD582CB9C72F327549D24238974A82E8B060CA9C977CFDAB611F')
{
    throw 'Frozen pre-candidate plan changed.'
}
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'autoperf-parallelism\benchmark-exclusive.lease.json'))
{
    throw 'A benchmark lease blocks preparation.'
}
$record = Join-Path $base 'images-169'
if (Test-Path -LiteralPath $record) { throw 'Preserve existing causal images.' }
$null = New-Item -ItemType Directory -Path $record
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $record 'exact-stage.ps1')
$original = 'C:\src\ap-F198-o158'
$candidate = 'C:\src\ap-F198-c168'
$ownerName = 'Microsoft.AspNetCore.Server.Kestrel.Core'
$fixtureName = 'Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks'
$candidateOwner = Join-Path $candidate "artifacts\bin\$ownerName\Release\net12.0"
$coreLib = Join-Path $original '.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105\System.Private.CoreLib.dll'

function Get-ImagePin([string]$Path)
{
    $stream = [IO.File]::OpenRead($Path)
    $pe = [Reflection.PortableExecutable.PEReader]::new($stream)
    try
    {
        $metadata = [Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
        $module = $metadata.GetModuleDefinition()
        return [ordered]@{
            Path = $Path
            Sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
            Mvid = $metadata.GetGuid($module.Mvid).ToString()
        }
    }
    finally
    {
        $pe.Dispose()
        $stream.Dispose()
    }
}

$inventories = [ordered]@{}
foreach ($kind in @('Perf', 'Native'))
{
    $assembly = if ($kind -eq 'Perf') { $fixtureName } else { 'InMemory.FunctionalTests' }
    $source = Join-Path $original "artifacts\bin\$assembly\Release\net12.0"
    foreach ($variant in @('Baseline', 'Candidate'))
    {
        $directory = Join-Path $record "$kind\$variant"
        $null = New-Item -ItemType Directory -Path $directory
        foreach ($entry in Get-ChildItem -LiteralPath $source -Force)
        {
            Copy-Item -LiteralPath $entry.FullName -Destination $directory -Recurse
        }
        if ($variant -eq 'Candidate')
        {
            foreach ($extension in @('dll', 'pdb'))
            {
                Copy-Item -LiteralPath (Join-Path $candidateOwner "$ownerName.$extension") -Destination (Join-Path $directory "$ownerName.$extension")
            }
        }
        $files = @(foreach ($file in Get-ChildItem -LiteralPath $directory -File -Recurse | Sort-Object FullName)
        {
            [ordered]@{ path = $file.FullName.Substring($directory.Length + 1); bytes = $file.Length
                sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash }
        })
        $inventories["$kind-$variant"] = $files
        $files | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $record "$kind-$variant-inventory.json") -Encoding utf8NoBOM
        if ($kind -eq 'Perf')
        {
            $spec = [ordered]@{
                Role = "Original-$variant"; Runtime = '12.0.0-alpha.1.26562.105'
                Output = Join-Path $base "causal-acceptance-169\$variant\inspection"
                Owner = Get-ImagePin (Join-Path $directory "$ownerName.dll")
                Fixture = Get-ImagePin (Join-Path $directory "$fixtureName.dll")
                CoreLib = Get-ImagePin $coreLib
            }
            $spec | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $record "$variant-inspection-spec.json") -Encoding utf8NoBOM
        }
    }
    $left = $inventories["$kind-Baseline"]
    $right = $inventories["$kind-Candidate"]
    if ($left.Count -ne $right.Count) { throw 'Causal image membership differs.' }
    $differences = @(foreach ($file in $left)
    {
        $matches = @($right | Where-Object { $_.path -ceq $file.path })
        if ($matches.Count -ne 1) { throw 'Causal image path set differs.' }
        if ($file.sha256 -cne $matches[0].sha256) { $file.path }
    })
    if (@(Compare-Object @("$ownerName.dll", "$ownerName.pdb") $differences).Count -ne 0)
    {
        throw 'Causal images must differ only in the owning DLL/PDB pair.'
    }
    [ordered]@{ kind = $kind; actualFilesPerVariant = $left.Count; actualDifferentFiles = $differences
        actualAllOtherFileBytesEqual = $true; actualNoEngineOrCounters = $true } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $record "$kind-causal-diff.json") -Encoding utf8NoBOM
}
[ordered]@{
    planSha256 = '448B26429F40AD582CB9C72F327549D24238974A82E8B060CA9C977CFDAB611F'
    stageSourceSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    baseline = Get-ImagePin (Join-Path $record "Perf\Baseline\$ownerName.dll")
    candidate = Get-ImagePin (Join-Path $record "Perf\Candidate\$ownerName.dll")
    fixture = Get-ImagePin (Join-Path $record "Perf\Baseline\$fixtureName.dll")
    coreLib = Get-ImagePin $coreLib
    actualNoMeasurementAuthorization = $true
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $record 'staged-images.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $record 'staged-images.json')
