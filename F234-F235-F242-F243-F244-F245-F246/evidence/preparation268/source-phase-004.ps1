$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
$roles = [IO.File]::ReadAllText((Join-Path $Out 'roles.json')) | ConvertFrom-Json
foreach ($role in @('Original', 'Default'))
{
    $commit = $roles.$role.commit
    $names = Invoke-GitSource ($role + ' filename-only real store/caller/owner discovery') @(
        'grep', '-l', '-F',
        '-e', 'InMemoryStore<',
        '-e', 'GetUsersInRoleAsync',
        '-e', 'FindByPasskeyIdAsync',
        '-e', 'class IdentitySpecificationTestBase',
        $commit, '--', 'src/Identity'
    )
    Write-Host ($role + ' CALLER/OWNER FILENAMES ONLY')
    Write-Host ([Text.Encoding]::UTF8.GetString($names.bytes))
    $history = Invoke-GitSource ($role + ' bounded target history metadata') @(
        'log', '--follow', '-n', '5', '--format=fuller', '--stat',
        $commit, '--', 'src/Identity/test/InMemory.Test/InMemoryStore.cs'
    )
    Write-Host ($role + ' TARGET HISTORY')
    Write-Host ([Text.Encoding]::UTF8.GetString($history.bytes))
}
