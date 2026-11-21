. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
$script:Batch = '06'
$started = [DateTime]::UtcNow.ToString('o')
$head = RunSource '06-runtime-main-ref' 'gh' @('api', '--method', 'GET', 'repos/dotnet/runtime/git/ref/heads/main')
if ($head.ExitCode -ne 0)
{
    throw 'Unable to pin supporting runtime source; no runtime substitution permitted.'
}
$runtimeSha = ([System.Text.Encoding]::UTF8.GetString($head.Bytes) | ConvertFrom-Json).object.sha
$runtimePaths = @(
    'src\libraries\System.Private.CoreLib\src\System\String.Manipulation.cs'
    'src\libraries\System.Linq\src\System\Linq\Take.cs'
    'src\libraries\System.Linq\src\System\Linq\Take.SpeedOpt.cs'
    'src\libraries\System.Linq\src\System\Linq\ToCollection.cs'
    'src\libraries\System.Linq\src\System\Linq\SkipTake.SpeedOpt.cs'
)
$runtimeMembership = @()
$index = 0
foreach ($path in $runtimePaths)
{
    $index++
    $gitPath = $path.Replace('\', '/')
    $label = "06-runtime-source-$index"
    $result = RunSource $label 'gh' @('api', '--method', 'GET', '--header', 'Accept: application/vnd.github.raw+json', "repos/dotnet/runtime/contents/$gitPath", '-f', "ref=$runtimeSha")
    $entry = [ordered]@{
        repository = 'dotnet/runtime'
        revision = $runtimeSha
        path = $path
        gitPath = $gitPath
        command = "commands\$label.json"
        exitCode = $result.ExitCode
        role = 'Supporting current runtime source only; not identified as the installed SDK/runtime and not executed.'
    }
    if ($result.ExitCode -eq 0)
    {
        $relative = "source\runtime-support\$path"
        $target = Join-Path $Out $relative
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
        [System.IO.File]::WriteAllBytes($target, $result.Bytes)
        $entry.artifact = $relative
        $entry.bytes = $result.Bytes.Length
        $entry.sha256 = HashBytes $result.Bytes
    }
    $runtimeMembership += $entry
}
WriteJson (Join-Path $Out 'runtime_membership_06.json') $runtimeMembership
$members = @()
foreach ($file in (Get-ChildItem -LiteralPath $Out -Filter 'membership_0*.json' | Where-Object { $_.Name -match '^membership_0[2345]\.json$' } | Sort-Object Name))
{
    $members += @(Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json)
}
$goodMembers = @($members | Where-Object { $_.exitCode -eq 0 })
foreach ($group in ($goodMembers | Group-Object role))
{
    $revision = $group.Group[0].revision
    $arguments = @('ls-tree', '-r', '-l', '--full-tree', $revision, '--') + @($group.Group | ForEach-Object { $_.gitPath } | Sort-Object -Unique)
    Git "06-tree-membership-$($group.Name)" $arguments | Out-Null
}
$summary = [ordered]@{
    upstream = [ordered]@{
        repository = (Get-Content (Join-Path $Out 'commands\upstream-repository.stdout') -Raw | ConvertFrom-Json).full_name
        defaultBranch = (Get-Content (Join-Path $Out 'commands\upstream-repository.stdout') -Raw | ConvertFrom-Json).default_branch
        observedHead = (Get-Content (Join-Path $Out 'commands\upstream-main.stdout') -Raw | ConvertFrom-Json).sha
        observation = (Get-Content (Join-Path $Out 'commands\upstream-main.json') -Raw | ConvertFrom-Json)
    }
    fork = [ordered]@{
        repository = (Get-Content (Join-Path $Out 'commands\03-fork-repository.stdout') -Raw | ConvertFrom-Json).full_name
        defaultBranch = (Get-Content (Join-Path $Out 'commands\03-fork-repository.stdout') -Raw | ConvertFrom-Json).default_branch
        observedHead = (Get-Content (Join-Path $Out 'commands\03-fork-default-head.stdout') -Raw | ConvertFrom-Json).sha
        observation = (Get-Content (Join-Path $Out 'commands\03-fork-default-head.json') -Raw | ConvertFrom-Json)
    }
    runtimeSupport = [ordered]@{ repository = 'dotnet/runtime'; observedMain = $runtimeSha; actualInstalledRuntimeVerified = $false }
}
if ($summary.upstream.defaultBranch -ne 'main')
{
    throw 'Upstream default branch is no longer main; captured main must not be substituted for Default.'
}
WriteJson (Join-Path $Out 'revision_summary_06.json') $summary
FinishBatch $started ([ordered]@{ runtimeSupportRevision = $runtimeSha; nativeCommandsStarted = 0; completePinnedMvcSourceEntries = $goodMembers.Count })
