. "$PSScriptRoot\Record.ps1"
Assert-NativeAllowed
$o = 'C:\src\ap-F169-o012'
$d = 'C:\src\ap-F169-d012'
$c = 'C:\src\ap-F169-c012'
foreach ($dir in @($o,$d,$c)) { if (Test-Path -LiteralPath $dir) { throw "Private root already exists: $dir" } }
Invoke-Recorded '001-upstream-entry-git' 'git' @('ls-remote','https://github.com/dotnet/aspnetcore.git','refs/heads/main')
Invoke-Recorded '002-upstream-entry-gh' 'gh' @('api','repos/dotnet/aspnetcore/branches/main','--jq','.commit.sha')
Invoke-Recorded '003-coordinator-entry' 'git' @('--no-pager','status','--porcelain=v2','--branch')
$sha = (Get-Content "$PSScriptRoot\commands\002-upstream-entry-gh.stdout.txt" -Raw).Trim()
if ($sha -notmatch '^[0-9a-f]{40}$') { throw 'Invalid upstream identity' }
if ((Get-Content "$PSScriptRoot\commands\001-upstream-entry-git.stdout.txt" -Raw).Split()[0] -ne $sha) { throw 'Git/gh entry observation differs' }
Invoke-Recorded '004-original-clone' 'git' @('clone','--shared','--no-checkout','C:\src\aspnetcore',$o)
Invoke-Recorded '005-original-checkout' 'git' @('-c','core.longpaths=true','checkout','--detach','37e809ead5824bc753a1c3d56f11615bdb1296c5') $o
Invoke-Recorded '006-default-clone' 'git' @('clone','--shared','--no-checkout','C:\src\aspnetcore',$d)
Invoke-Recorded '007-default-fetch' 'git' @('-c','core.longpaths=true','fetch','--no-tags','--depth=50','https://github.com/dotnet/aspnetcore.git',$sha) $d
Invoke-Recorded '008-default-checkout' 'git' @('-c','core.longpaths=true','checkout','--detach',$sha) $d
New-Item -ItemType Directory -Path $c | Out-Null
$links = @()
foreach ($role in @(@{name='original37';repo=$o},@{name='default';repo=$d}))
{
    $repo = $role.repo
    New-Item -ItemType Directory -Path "$repo\.dotnet\shared\Microsoft.NETCore.App" -Force | Out-Null
    Copy-Item -LiteralPath 'C:\src\aspnetcore\.dotnet\dotnet.exe' -Destination "$repo\.dotnet\dotnet.exe"
    foreach ($sub in @('host','sdk','packs','sdk-manifests'))
    {
        New-Item -ItemType Junction -Path "$repo\.dotnet\$sub" -Target "C:\src\aspnetcore\.dotnet\$sub" | Out-Null
        $links += @{role=$role.name;path="$repo\.dotnet\$sub";target="C:\src\aspnetcore\.dotnet\$sub";kind='read-only-use junction; target not modified by preparation'}
    }
    foreach ($runtime in Get-ChildItem 'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App' -Directory)
    {
        New-Item -ItemType Junction -Path "$repo\.dotnet\shared\Microsoft.NETCore.App\$($runtime.Name)" -Target $runtime.FullName | Out-Null
        $links += @{role=$role.name;path="$repo\.dotnet\shared\Microsoft.NETCore.App\$($runtime.Name)";target=$runtime.FullName;kind='read-only-use existing runtime junction'}
    }
    Invoke-LocalDotnet "009-$($role.name)-info" $repo @('--info')
}
@{
    original37=$o; default=$d; common=$c
    originalCommit='37e809ead5824bc753a1c3d56f11615bdb1296c5'; defaultCommit=$sha
    sdk='12.0.100-alpha.1.26557.102'; sharedSdkRoot='C:\src\aspnetcore\.dotnet'
    sharedPackageCache='C:\Users\jaslawin\.nuget\packages'
    objectAlternates='Each independent private clone explicitly borrows coordinator Git objects read-only; fetch and refs are private.'
    outputs='Each private checkout has its own artifacts, .autoperf CLI/scratch/HTTP/plugin caches. Common consumer has its own C:\src directory.'
    links=$links
} | ConvertTo-Json -Depth 10 | Set-Content "$PSScriptRoot\roles.json" -Encoding utf8NoBOM
