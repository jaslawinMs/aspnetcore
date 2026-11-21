$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
$stage=[ordered]@{
    stage='fresh isolated-module source capture; no old controller replay'
    observerPid=$PID; startedUtc=[DateTime]::UtcNow.ToString('O')
    scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash; status='started'; error=$null
}
try
{
    $successfulReceipt=Get-Content -LiteralPath (Join-Path $PSScriptRoot '001-gh-repository.native.json') -Raw | ConvertFrom-Json
    $repoBytes=[System.IO.File]::ReadAllBytes((Join-Path $PSScriptRoot '001-gh-repository.stdout.bin'))
    if ($successfulReceipt.rootExitCode -ne 0 -or (Get-Hash256 $repoBytes) -cne $successfulReceipt.stdoutSha256) { throw 'Previously successful repo metadata binding failed.' }
    $observedRepository=[System.Text.Encoding]::UTF8.GetString($repoBytes) | ConvertFrom-Json
    if ($observedRepository.full_name -cne 'dotnet/aspnetcore') { throw 'Wrong repository identity.' }
    $defaultBranch=[string]$observedRepository.default_branch
    Invoke-Source256 -Label '010-gh-default-branch' -Program gh -Argv @('api','--hostname','github.com','--method','GET',"repos/dotnet/aspnetcore/branches/$([Uri]::EscapeDataString($defaultBranch))") | Out-Null
    $observedBranch=Get-Content -LiteralPath (Join-Path $PSScriptRoot '010-gh-default-branch.stdout.bin') -Raw | ConvertFrom-Json
    if ($observedBranch.name -cne $defaultBranch -or $observedBranch.commit.sha -notmatch '^[0-9a-f]{40}$') { throw 'Invalid default branch response.' }
    $originalCommit='37e809ead5824bc753a1c3d56f11615bdb1296c5'
    $defaultCommit=[string]$observedBranch.commit.sha
    Write-FreshJson256 (Join-Path $PSScriptRoot 'roles.json') ([ordered]@{
        Original=$originalCommit; Default=$defaultCommit; defaultBranch=$defaultBranch; defaultRepository='dotnet/aspnetcore'
        observedAtUtc=[DateTime]::UtcNow.ToString('O'); source=@('001-gh-repository.native.json','010-gh-default-branch.native.json')
        pointObservationNotPermanent=$true
    })
    Invoke-Source256 -Label '011-reserved-branch' -Program git -Argv @('--no-pager','symbolic-ref','--quiet','HEAD') | Out-Null
    Invoke-Source256 -Label '012-reserved-head' -Program git -Argv @('--no-pager','rev-parse','--verify','HEAD') | Out-Null
    $headObserved=(Get-Content -LiteralPath (Join-Path $PSScriptRoot '012-reserved-head.stdout.bin') -Raw).Trim()
    if ($headObserved -cne '24875ef5dabb55567870b39f6eb0002170435e2f') { throw "Reserved HEAD changed: $headObserved" }
    Invoke-Source256 -Label '013-role-commit-metadata' -Program git -Argv @('--no-pager','show','-s','--no-show-signature','--format=%H%n%T%n%P%n%aI%n%cI%n%s',$originalCommit,$defaultCommit,$headObserved) | Out-Null
    $paths=@(
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
    $selections=@()
    foreach ($roleName in @('Original','Default'))
    {
        $roleCommit=if ($roleName -eq 'Original') { $originalCommit } else { $defaultCommit }
        foreach ($path in $paths) { $selections += [pscustomobject]@{role=$roleName;commit=$roleCommit;repositoryPath=$path} }
    }
    $bindings=@(Save-Sources256 -Label '014-initial-whole-sources' -Selections $selections)
    Invoke-Source256 -Label '015-test-history-default' -Program git -Argv @('--no-pager','log','--follow','--name-status','--no-show-signature','--format=COMMIT %H%nPARENTS %P%nAUTHOR %aI%nCOMMITTER %cI%nSUBJECT %s%nBODY %b','-n','12',$defaultCommit,'--','src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs') | Out-Null
    Invoke-Source256 -Label '016-registration-history-default' -Program git -Argv @('--no-pager','log','--follow','--name-status','--no-show-signature','--format=COMMIT %H%nPARENTS %P%nAUTHOR %aI%nCOMMITTER %cI%nSUBJECT %s%nBODY %b','-n','10',$defaultCommit,'--','src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs') | Out-Null
    Invoke-Source256 -Label '017-role-target-diff' -Program git -Argv @('--no-pager','diff','--no-ext-diff','--no-textconv','--no-renames',$originalCommit,$defaultCommit,'--','src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs','src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs','src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj') | Out-Null
    $stage.status='complete immutable source capture; no product execution'
    $stage.roleBindings=$bindings.Count
    $stage.wholeSourceFiles=@($bindings | Where-Object status -eq 'whole exact git blob').Count
    $stage.missingAtRoleCommit=@($bindings | Where-Object status -eq 'missing at immutable commit').Count
}
catch { $stage.status='failed; stop without replay'; $stage.error=$_.Exception.ToString(); throw }
finally
{
    $stage.finishedUtc=[DateTime]::UtcNow.ToString('O')
    Write-FreshJson256 (Join-Path $PSScriptRoot 'capture-continuation-256b.stage.json') $stage
    $stage | ConvertTo-Json -Depth 10
}
