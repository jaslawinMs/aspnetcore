$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-observer.ps1')
$stage = [ordered]@{
    stage = 'initial immutable capture'
    observerPid = $PID
    observerStartUtc = $script:Observer.StartTime.ToUniversalTime().ToString('O')
    startedUtc = [DateTime]::UtcNow.ToString('O')
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    status = 'started'
    error = $null
}
try
{
    Assert-LiveSourceGuard '000-initial' | Out-Null
    Invoke-SourceUtility -Label '001-gh-repository' -Program gh -Arguments @('api', '--hostname', 'github.com', '--method', 'GET', 'repos/dotnet/aspnetcore') | Out-Null
    $repository = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot '001-gh-repository.stdout.bin')) | ConvertFrom-Json
    if ($repository.full_name -cne 'dotnet/aspnetcore') { throw 'Unexpected public repository identity.' }
    $branchName = [string]$repository.default_branch
    $encoded = [Uri]::EscapeDataString($branchName)
    Invoke-SourceUtility -Label '002-gh-default-branch' -Program gh -Arguments @('api', '--hostname', 'github.com', '--method', 'GET', "repos/dotnet/aspnetcore/branches/$encoded") | Out-Null
    $branch = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot '002-gh-default-branch.stdout.bin')) | ConvertFrom-Json
    if ($branch.name -cne $branchName -or $branch.commit.sha -notmatch '^[0-9a-f]{40}$') { throw 'Unexpected default-branch response.' }
    $original = $script:Acceptance.originalCommit
    $default = [string]$branch.commit.sha
    Write-NewJson (Join-Path $PSScriptRoot 'roles.json') ([ordered]@{
        Original = $original
        Default = $default
        defaultBranch = $branchName
        defaultRepository = $repository.full_name
        observedAtUtc = [DateTime]::UtcNow.ToString('O')
        source = @('001-gh-repository.native.json', '002-gh-default-branch.native.json')
        pointObservationNotPermanent = $true
    })
    Invoke-SourceUtility -Label '003-reserved-branch' -Program git -Arguments @('--no-pager', 'symbolic-ref', '--quiet', 'HEAD') | Out-Null
    Invoke-SourceUtility -Label '004-reserved-head' -Program git -Arguments @('--no-pager', 'rev-parse', '--verify', 'HEAD') | Out-Null
    $reservedHead = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot '004-reserved-head.stdout.bin')).Trim()
    if ($reservedHead -cne $script:Acceptance.expectedReservedHead) { throw "Reserved HEAD changed: $reservedHead" }
    Invoke-SourceUtility -Label '005-role-commit-metadata' -Program git -Arguments @('--no-pager', 'show', '-s', '--no-show-signature', '--format=%H%n%T%n%P%n%aI%n%cI%n%s', $original, $default, $reservedHead) | Out-Null
    $paths = @(
        'src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs',
        'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs',
        'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
        'src\Components\AGENTS.md',
        '.github\instructions\components.instructions.md',
        '.github\instructions\components.server.instructions.md',
        '.github\instructions\cross-cutting-guidance.instructions.md',
        'docs\BlazorComponentsGuidance.md',
        'docs\CrossCuttingGuidance.md'
    )
    $selections = @()
    foreach ($role in @('Original', 'Default'))
    {
        $commit = if ($role -eq 'Original') { $original } else { $default }
        foreach ($path in $paths) { $selections += [pscustomobject]@{ role = $role; commit = $commit; repositoryPath = $path } }
    }
    $bindings = @(Save-BatchSources -Label '006-initial-whole-sources' -Selections $selections)
    Invoke-SourceUtility -Label '007-test-history-default' -Program git -Arguments @('--no-pager', 'log', '--follow', '--name-status', '--no-show-signature', '--format=COMMIT %H%nPARENTS %P%nAUTHOR %aI%nCOMMITTER %cI%nSUBJECT %s%nBODY %b', '-n', '12', $default, '--', 'src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs') | Out-Null
    Invoke-SourceUtility -Label '008-registration-history-default' -Program git -Arguments @('--no-pager', 'log', '--follow', '--name-status', '--no-show-signature', '--format=COMMIT %H%nPARENTS %P%nAUTHOR %aI%nCOMMITTER %cI%nSUBJECT %s%nBODY %b', '-n', '10', $default, '--', 'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs') | Out-Null
    Invoke-SourceUtility -Label '009-role-target-diff' -Program git -Arguments @('--no-pager', 'diff', '--no-ext-diff', '--no-textconv', '--no-renames', $original, $default, '--', 'src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs', 'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs', 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj') | Out-Null
    $stage.status = 'complete source capture; no product execution'
    $stage.roleBindings = $bindings.Count
    $stage.wholeSourceFiles = @($bindings | Where-Object status -eq 'whole exact git blob').Count
    $stage.missingAtRoleCommit = @($bindings | Where-Object status -eq 'missing at immutable commit').Count
}
catch
{
    $stage.status = 'failed; preserved without editing or replay'
    $stage.error = $_.Exception.ToString()
    throw
}
finally
{
    $stage.finishedUtc = [DateTime]::UtcNow.ToString('O')
    Write-NewJson (Join-Path $PSScriptRoot 'capture-initial-256.stage.json') $stage
    $stage | ConvertTo-Json -Depth 10
}
