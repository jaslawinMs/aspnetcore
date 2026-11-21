$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
$query = 'query { repository(owner:"dotnet", name:"aspnetcore") { nameWithOwner defaultBranchRef { name target { oid } } } }'
$api = Invoke-SourceRoot 'Fresh upstream current-default branch and immutable SHA read-only query' 'gh.exe' @('api', 'graphql', '-f', ('query=' + $query))
$resolved = ([Text.Encoding]::UTF8.GetString($api.bytes) | ConvertFrom-Json).data.repository
if ($resolved.nameWithOwner -cne 'dotnet/aspnetcore' -or $resolved.defaultBranchRef.target.oid -notmatch '^[a-f0-9]{40}$')
{
    throw 'Unexpected upstream identity response.'
}

$defaultCommit = $resolved.defaultBranchRef.target.oid
Write-FreshJson (Join-Path $Out 'roles.json') ([ordered]@{
    Original = @{ commit = $Original; meaning = 'User-pinned immutable Original' }
    Default = @{
        commit = $defaultCommit
        branch = $resolved.defaultBranchRef.name
        meaning = 'Fresh upstream API observation, not reserved working-tree HEAD'
        rawApiRoot = $api.directory
        observedUtc = [DateTime]::UtcNow.ToString('o')
    }
    NavigationOnly = @{ commit = $Bootstrap.reservedNavigationHead; neverDefault = $true }
})
$treePaths = @('AGENTS.md', '.github/AGENTS.md', '.github/copilot-instructions.md', '.github/instructions', 'src/AGENTS.md', 'src/Identity')
foreach ($role in @('Original', 'Default'))
{
    $commit = if ($role -eq 'Original') { $Original } else { $defaultCommit }
    $tree = Invoke-GitSource ($role + ' bounded filename-only instruction/product/test inventory') (@('ls-tree', '-r', '--name-only', $commit, '--') + $treePaths)
    Write-Host ($role + ' INVENTORY')
    [Text.Encoding]::UTF8.GetString($tree.bytes).Split("`n") | Where-Object {
        $_ -match 'AGENTS\.md|InMemory\.Test/|test/Shared/' -or $_.StartsWith('.github/')
    } | ForEach-Object { Write-Host $_ }
}
