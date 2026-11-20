. "$PSScriptRoot\Record.ps1"
$o = 'C:\src\ap163o011'
$d = 'C:\src\ap163d011'
Assert-NativeAllowed
Invoke-Recorded '001-upstream-entry-gh' 'gh' @('api','repos/dotnet/aspnetcore/branches/main','--jq','.commit.sha')
Invoke-Recorded '002-upstream-entry-git' 'git' @('ls-remote','https://github.com/dotnet/aspnetcore.git','refs/heads/main')
Invoke-Recorded '003-coordinator-entry' 'git' @('--no-pager','status','--porcelain=v2','--branch')
$sha = (Get-Content "$PSScriptRoot\commands\001-upstream-entry-gh.stdout.txt" -Raw).Trim()
if ($sha -notmatch '^[0-9a-f]{40}$') { throw 'Invalid actual upstream identity' }
Invoke-Recorded '004-private-clone' 'git' @('clone','--shared','--no-checkout','C:\src\aspnetcore',$o)
if ($LASTEXITCODE -and -not (Test-Path "$o\.git")) { throw 'Clone failed' }
Invoke-Recorded '005-original-checkout' 'git' @('-c','core.longpaths=true','checkout','--detach','37e809ead5824bc753a1c3d56f11615bdb1296c5') $o
Invoke-Recorded '006-default-fetch' 'git' @('-c','core.longpaths=true','fetch','--no-tags','--depth=50','https://github.com/dotnet/aspnetcore.git',$sha) $o
Invoke-Recorded '007-default-worktree' 'git' @('-c','core.longpaths=true','worktree','add','--detach',$d,$sha) $o
foreach ($role in @(@{name='original37';repo=$o},@{name='default';repo=$d}))
{
    $repo = $role.repo
    Invoke-Recorded "008-$($role.name)-submodules" 'git' @('-c','core.longpaths=true','submodule','update','--init','--recursive') $repo
    if (-not (Test-Path "$repo\.dotnet")) { New-Item -ItemType Junction -Path "$repo\.dotnet" -Target 'C:\src\aspnetcore\.dotnet' | Out-Null }
    Invoke-LocalDotnet "009-$($role.name)-info" $repo @('--info')
}
@{ original37=$o; default=$d; originalCommit='37e809ead5824bc753a1c3d56f11615bdb1296c5'; defaultCommit=$sha; sdk='C:\src\aspnetcore\.dotnet'; sourceBorrowing='Private clone uses explicit read-only Git object alternates; outputs and restore assets are private per checkout.' } | ConvertTo-Json | Set-Content "$PSScriptRoot\roles.json" -Encoding utf8NoBOM
