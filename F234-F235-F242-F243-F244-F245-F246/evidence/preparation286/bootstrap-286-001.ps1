$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-286.ps1')
$control = Join-Path $Out286 'control'
if (Test-Path -LiteralPath $control)
{
    throw '286 bootstrap must be fresh; no replay.'
}
$guard = Get-FreshGuard286 'GO286 bootstrap and unchanged180-artifact baseline; no source utility' -Bootstrap
$prior279 = Join-Path $Par286 'finding-F234-F235-279'
$prior268 = Join-Path $Par286 'finding-F234-F235-268'
$expected279IndexHash = 'AB1616F1077AF36960BC085ECA7BC4B2BE7C1F83142C4B487D8F26B5D840FFA4'
$expected279SealHash = 'CB0EFC779F7D077DE046E099D9DD37F4DA4E394F15DDF5C836DD0411F9B85213'
$expected279HandoffHash = '361F0F2680035B6B222480D18DB4A07A029E6E896F137AB6E6D185B9812D22F1'
foreach ($pin in @(
    @{ path = (Join-Path $prior279 'EVIDENCE-INDEX.json'); sha256 = $expected279IndexHash },
    @{ path = (Join-Path $prior279 'FINAL-SEAL.json'); sha256 = $expected279SealHash },
    @{ path = (Join-Path $prior279 'HANDOFF.md'); sha256 = $expected279HandoffHash }
))
{
    if ((Get-FileHash -LiteralPath $pin.path -Algorithm SHA256).Hash -cne $pin.sha256)
    {
        throw 'A completed279 final pin changed.'
    }
}
$index279 = [IO.File]::ReadAllText((Join-Path $prior279 'EVIDENCE-INDEX.json')) | ConvertFrom-Json
$expected279 = @(
    foreach ($entry in $index279.entries)
    {
        @{ path = (Join-Path $prior279 $entry.path); bytes = $entry.bytes; sha256 = $entry.sha256; stage = 279 }
    }
    foreach ($leaf in @('EVIDENCE-INDEX.json', 'FINAL-SEAL.json'))
    {
        $path = Join-Path $prior279 $leaf
        @{ path = $path; bytes = (Get-Item -LiteralPath $path).Length; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash; stage = 279 }
    }
)
$expected268 = @(
    foreach ($entry in $index279.external268PinnedInventory)
    {
        @{ path = $entry.path; bytes = $entry.bytes; sha256 = $entry.sha256; stage = 268 }
    }
)
if ($expected279.Count -ne 44 -or $expected268.Count -ne 136 -or
    @(Get-ChildItem -LiteralPath $prior279 -File -Recurse -Force).Count -ne 44 -or
    @(Get-ChildItem -LiteralPath $prior268 -File -Recurse -Force).Count -ne 136)
{
    throw 'The exact accepted268/279 inventories changed.'
}
$inventory = @($expected268) + @($expected279)
foreach ($entry in $inventory)
{
    if ((Get-Item -LiteralPath $entry.path).Length -ne $entry.bytes -or
        (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw "An accepted prior artifact changed: $($entry.path)"
    }
}
$null = [IO.Directory]::CreateDirectory($control)
Save-Guard286 $control 'bootstrap-' $guard
Write-FreshJson286 (Join-Path $control 'bootstrap-286.json') ([ordered]@{
    createdUtc = [DateTime]::UtcNow.ToString('o')
    actualOwner = $Owner286
    scope = $guard.receipt.scope
    registrationSha256 = $guard.receipt.registrationSha256
    policySha256PointOnly = $guard.receipt.policySha256
    leasePathsAbsent = $guard.receipt.leasePathsAbsent
    observer = Get-ProcessIdentity286 (Get-Process -Id $PID)
    sourceRootsLaunched = 0
    originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    observed268DefaultCommit = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
    newUpstreamResolutionAuthorized = $false
    maxNewGitGhRoots = 2
    maxNewCompleteWholeBodiesPerRole = 1
    cumulativeMaxRoots = 12
    cumulativeMaxRequestedPathsPerRole = 19
    cumulativeMaxCompleteBodiesPerRole = 18
    acceptedPriorActualOuterReceipt = @{ shellId = 'f234-f235-279-seal-004'; actualExitCode = 0; provenance = 'Actual prior tool result and independently accepted parent registration.' }
})
Write-FreshJson286 (Join-Path $Out286 'BASELINE-268-279-PINS.json') ([ordered]@{
    createdUtc = [DateTime]::UtcNow.ToString('o')
    roots = @(@{ root = $prior268; completeArtifactCount = 136 }, @{ root = $prior279; completeArtifactCount = 44 })
    exactPriorInventory = $inventory
    completeArtifactCount = $inventory.Count
    acceptanceBoundary = 'Unchanged exact bytes/inventory only; no new raw commit/tree-chain/runtime/materiality qualification.'
    previousMissingResponses = 2
    previousSourceHelperActualOuterExit = 1
    previousGitRootActualExit = 0
    priorHelpersReplayedOrEdited = $false
})
Write-Host ('BOOTSTRAP286_OBSERVER_PID=' + $PID)
Write-Host 'BASELINE286=136prior268+44prior279=180exact artifacts unchanged; no Git-gh source utility launched'
Write-Host ('FRESH_POLICY_SHA256_POINT_ONLY=' + $guard.receipt.policySha256)
