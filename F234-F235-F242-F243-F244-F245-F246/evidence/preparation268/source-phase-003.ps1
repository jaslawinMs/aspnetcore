$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
. (Join-Path $PSScriptRoot 'blob-support-268.ps1')
$roles = [IO.File]::ReadAllText((Join-Path $Out 'roles.json')) | ConvertFrom-Json
$paths = @(
    '.github/copilot-instructions.md',
    '.github/instructions/cross-cutting-guidance.instructions.md',
    'src/Identity/test/InMemory.Test/InMemoryStore.cs',
    'src/Identity/test/InMemory.Test/Microsoft.AspNetCore.Identity.InMemory.Test.csproj',
    'src/Identity/test/InMemory.Test/InMemoryStoreTest.cs',
    'src/Identity/test/InMemory.Test/InMemoryUserStore.cs',
    'src/Identity/test/Shared/PocoModel/PocoUser.cs',
    'src/Identity/test/Shared/PocoModel/PocoRole.cs',
    'src/Identity/test/Shared/PocoModel/PocoUserPasskey.cs'
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
Invoke-WholeBlobBatch '003' $selections
Write-Host ('FRESH_DEFAULT=' + $roles.Default.branch + '@' + $roles.Default.commit)
