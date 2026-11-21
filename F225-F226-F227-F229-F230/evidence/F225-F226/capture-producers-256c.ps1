$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
$stage=[ordered]@{
    stage='bounded producer and history capture; final initial-budget source batch'
    observerPid=$PID; startedUtc=[DateTime]::UtcNow.ToString('O')
    scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash; status='started'; error=$null
}
try
{
    $roleBindings=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'roles.json') -Raw | ConvertFrom-Json
    $paths=@(
        'eng\Versions.props',
        'src\Components\Components\src\RegisterPersistentComponentStateServiceCollectionExtensions.cs',
        'src\Components\Components\src\RegisterRenderingMetricsServiceCollectionExtensions.cs',
        'src\Components\Components\src\SupplyParameterFromQueryProviderServiceCollectionExtensions.cs',
        'src\Components\Web\src\Forms\Mapping\SupplyParameterFromFormServiceCollectionExtensions.cs',
        'src\Antiforgery\src\AntiforgeryServiceCollectionExtensions.cs'
    )
    $selections=@()
    foreach ($roleName in @('Original','Default'))
    {
        foreach ($path in $paths) { $selections += [pscustomobject]@{role=$roleName;commit=$roleBindings.$roleName;repositoryPath=$path} }
    }
    $bindings=@(Save-Sources256 -Label '018-producer-whole-sources' -Selections $selections)
    Invoke-Source256 -Label '019-relevant-test-history-patches' -Program git -Argv @(
        '--no-pager','show','--no-ext-diff','--no-textconv','--no-renames','--no-show-signature',
        '--format=COMMIT %H%nPARENTS %P%nAUTHOR %aI%nCOMMITTER %cI%nSUBJECT %s%nBODY %b',
        '0e14788a0a0d07ac1134887a6ced80de12478530','76e4d1838d5cf777429c9ed1dd5c9ccd937e20e4',
        '--','src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs'
    ) | Out-Null
    Invoke-Source256 -Label '020-reserved-final-head' -Program git -Argv @('--no-pager','rev-parse','--verify','HEAD') | Out-Null
    Invoke-Source256 -Label '021-reserved-final-branch' -Program git -Argv @('--no-pager','symbolic-ref','--quiet','HEAD') | Out-Null
    $headNow=(Get-Content -LiteralPath (Join-Path $PSScriptRoot '020-reserved-final-head.stdout.bin') -Raw).Trim()
    $branchNow=(Get-Content -LiteralPath (Join-Path $PSScriptRoot '021-reserved-final-branch.stdout.bin') -Raw).Trim()
    $headBefore=(Get-Content -LiteralPath (Join-Path $PSScriptRoot '012-reserved-head.stdout.bin') -Raw).Trim()
    $branchBefore=(Get-Content -LiteralPath (Join-Path $PSScriptRoot '011-reserved-branch.stdout.bin') -Raw).Trim()
    if ($headNow -cne $headBefore -or $branchNow -cne $branchBefore) { throw 'Reserved navigation identity changed between source observations.' }
    $stage.status='complete source-only producer capture; no product execution'
    $stage.newWholeSourceBindings=$bindings.Count
    $stage.newWholeFilesPerRole=6
    $stage.totalWholeFilesPerRole=15
    $stage.reservedHead=$headNow
    $stage.reservedBranch=$branchNow
}
catch { $stage.status='failed; stop without replay'; $stage.error=$_.Exception.ToString(); throw }
finally
{
    $stage.finishedUtc=[DateTime]::UtcNow.ToString('O')
    Write-FreshJson256 (Join-Path $PSScriptRoot 'capture-producers-256c.stage.json') $stage
    $stage | ConvertTo-Json -Depth 10
}
