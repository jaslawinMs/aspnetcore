$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
. (Join-Path $PSScriptRoot 'blob-support-268.ps1')
$roles = [IO.File]::ReadAllText((Join-Path $Out 'roles.json')) | ConvertFrom-Json
$paths = @(
    'docs/CrossCuttingGuidance.md',
    'src/Identity/Specification.Tests/src/IdentitySpecificationTestBase.cs',
    'src/Identity/Extensions.Core/src/UserManager.cs',
    'src/Identity/test/InMemory.Test/FunctionalTest.cs',
    'src/Identity/Extensions.Core/src/IUserRoleStore.cs',
    'src/Identity/Extensions.Core/src/IUserPasskeyStore.cs'
)
$selections = @(
    foreach ($role in @('Original', 'Default'))
    {
        foreach ($path in $paths)
        {
            @{ role = $role; commit = $roles.$role.commit; path = $path }
        }
    }
)
Invoke-WholeBlobBatch '005' $selections
Write-Host 'SOURCE_INPUT_BUDGET_CLOSED=15 whole logical files per immutable role; no broadening.'
