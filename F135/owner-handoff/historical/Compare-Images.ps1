param(
    [Parameter(Mandatory)][string]$Baseline,
    [Parameter(Mandatory)][string]$Other,
    [Parameter(Mandatory)][string]$OutputPath,
    [switch]$CharacterizationOnly
)

$ErrorActionPreference = 'Stop'
$allowed = @('Microsoft.AspNetCore.OutputCaching.dll', 'Microsoft.AspNetCore.OutputCaching.pdb')
$common = @('F135.MiddlewareProbe.dll', 'F135.MiddlewareProbe.pdb', 'F135.MiddlewareProbe.deps.json', 'F135.MiddlewareProbe.runtimeconfig.json')
function Get-Image([string]$Path)
{
    $result = @{}
    foreach ($file in Get-ChildItem -LiteralPath $Path -File -Recurse -Force)
    {
        $relative = [IO.Path]::GetRelativePath($Path, $file.FullName)
        $result.Add($relative, [ordered]@{
            path = $relative
            length = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        })
    }
    return ,$result
}
$a = Get-Image $Baseline
$b = Get-Image $Other
$differences = @()
foreach ($key in @(@($a.Keys) + @($b.Keys) | Sort-Object -Unique))
{
    if (-not $a.ContainsKey($key) -or -not $b.ContainsKey($key) -or $a[$key].sha256 -ne $b[$key].sha256)
    {
        $differences += [ordered]@{
            path = $key
            baseline = $a[$key]
            other = $b[$key]
            predeclaredOwnerDifference = $a.ContainsKey($key) -and $b.ContainsKey($key) -and $key -cin $allowed
        }
    }
}
$forbidden = @($differences | Where-Object { -not $_.predeclaredOwnerDifference })
$missingCommon = @($common | Where-Object { -not $a.ContainsKey($_) -or -not $b.ContainsKey($_) })
$result = [ordered]@{
    baseline = $Baseline
    other = $Other
    baselineFiles = $a.Count
    otherFiles = $b.Count
    comparedEveryEntry = $true
    exclusions = @()
    permittedPairDifferences = $allowed
    characterizationOnly = [bool]$CharacterizationOnly
    commonConsumerFilesRequiredIdentical = $common
    missingCommonConsumerFiles = $missingCommon
    differences = $differences
    forbiddenPairDifferences = $forbidden.Count
    strictImageCompatibilityPassed = (-not $CharacterizationOnly) -and $forbidden.Count -eq 0 -and $missingCommon.Count -eq 0
    measurementPlanAdopted = $false
    baselineManifest = @($a.Values | Sort-Object path)
    otherManifest = @($b.Values | Sort-Object path)
}
$result | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $OutputPath
if ($missingCommon.Count -ne 0)
{
    throw "Image comparison rejected $($missingCommon.Count) missing common-consumer files."
}
if (-not $CharacterizationOnly -and $forbidden.Count -ne 0)
{
    throw "Image comparison rejected $($forbidden.Count) non-owner differences."
}
Write-Output "Image comparison: $($a.Count)/$($b.Count) files, $($differences.Count) differences; characterizationOnly=$([bool]$CharacterizationOnly)"
