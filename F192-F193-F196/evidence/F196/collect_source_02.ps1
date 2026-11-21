$ErrorActionPreference = 'Stop'
$Root = 'C:\src\aspnetcore'
$Out = $PSScriptRoot
Set-Location $Out
$script:CommandLog = [System.Collections.Generic.List[object]]::new()
$script:Membership = [System.Collections.Generic.List[object]]::new()
$Utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.Directory]::CreateDirectory((Join-Path $Out 'commands')) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $Out 'source')) | Out-Null

function WriteJson($Path, $Value)
{
    [System.IO.File]::WriteAllText($Path, (($Value | ConvertTo-Json -Depth 40) + "`n"), $Utf8)
}

function HashBytes([byte[]] $Bytes)
{
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try
    {
        return [System.Convert]::ToHexString($sha.ComputeHash($Bytes)).ToLowerInvariant()
    }
    finally
    {
        $sha.Dispose()
    }
}

function RunSource([string] $Label, [string] $Executable, [string[]] $Arguments)
{
    $prefix = Join-Path (Join-Path $Out 'commands') $Label
    $stdoutPath = $prefix + '.stdout'
    $stderrPath = $prefix + '.stderr'
    $stdout = [System.IO.File]::Open($stdoutPath, [System.IO.FileMode]::CreateNew)
    $stderr = [System.IO.File]::Open($stderrPath, [System.IO.FileMode]::CreateNew)
    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = (Get-Command $Executable -CommandType Application | Select-Object -First 1).Source
    $start.WorkingDirectory = $Root
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $start.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $start.Environment['GIT_PAGER'] = 'cat'
    $start.Environment['GH_PAGER'] = 'cat'
    $start.Environment['GH_PROMPT_DISABLED'] = '1'
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    $before = [DateTime]::UtcNow.ToString('o')
    try
    {
        $process.Start() | Out-Null
        $childId = $process.Id
        $outCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $errCopy = $process.StandardError.BaseStream.CopyToAsync($stderr)
        $process.WaitForExit()
        $outCopy.GetAwaiter().GetResult()
        $errCopy.GetAwaiter().GetResult()
        $code = $process.ExitCode
        $item = [ordered]@{
            label = $Label
            executable = $start.FileName
            argv = @($Arguments)
            cwd = $Root
            pid = $childId
            parentPid = $PID
            startedUtc = $before
            endedUtc = [DateTime]::UtcNow.ToString('o')
            exitCode = $code
            terminal = $process.HasExited
            redirectedStreamsDrained = $true
            stdout = "commands\$Label.stdout"
            stderr = "commands\$Label.stderr"
            classification = 'source-read-only'
        }
        $script:CommandLog.Add($item)
        WriteJson ($prefix + '.json') $item
        Write-Host "$Label PID=$childId exit=$code"
    }
    finally
    {
        $stdout.Dispose()
        $stderr.Dispose()
        $process.Dispose()
    }
    return [pscustomobject]@{ ExitCode = $code; Bytes = [System.IO.File]::ReadAllBytes($stdoutPath) }
}

function Git([string] $Label, [string[]] $GitArguments)
{
    return RunSource $Label 'git' (@('--no-pager', '-c', 'core.fsmonitor=false', '-C', $Root) + $GitArguments)
}

function Snapshot([string] $Revision, [string] $Role, [string] $Path)
{
    $gitPath = $Path.Replace('\', '/')
    $key = (HashBytes ([System.Text.Encoding]::UTF8.GetBytes($Path))).Substring(0, 12)
    $result = Git "source-$Role-$key" @('show', "${Revision}:$gitPath")
    $entry = [ordered]@{ role = $Role; revision = $Revision; path = $Path; gitPath = $gitPath; exitCode = $result.ExitCode }
    if ($result.ExitCode -eq 0)
    {
        $relative = "source\$Role\$Path"
        $target = Join-Path $Out $relative
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
        [System.IO.File]::WriteAllBytes($target, $result.Bytes)
        $entry.artifact = $relative
        $entry.sha256 = HashBytes $result.Bytes
        $entry.bytes = $result.Bytes.Length
    }
    $script:Membership.Add($entry)
}

$started = [DateTime]::UtcNow.ToString('o')
Git 'reserved-head' @('rev-parse', 'HEAD') | Out-Null
Git 'reserved-branch' @('symbolic-ref', '--short', 'HEAD') | Out-Null
Git 'reserved-status' @('status', '--porcelain=v2', '--untracked-files=all') | Out-Null
Git 'reserved-tracked-diff' @('diff', '--no-ext-diff', '--binary', 'HEAD', '--') | Out-Null
Git 'reserved-remotes' @('remote', '-v') | Out-Null
Git 'reserved-local-default' @('rev-parse', '--verify', 'refs/remotes/upstream/main') | Out-Null
RunSource 'upstream-repository' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore') | Out-Null
$headResult = RunSource 'upstream-main' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits/main')
$revisions = [ordered]@{
    original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    reportedDefault = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
    reserved = '24875ef5dabb55567870b39f6eb0002170435e2f'
}
if ($headResult.ExitCode -eq 0)
{
    $revisions.observedDefault = ([System.Text.Encoding]::UTF8.GetString($headResult.Bytes) | ConvertFrom-Json).sha
}
$available = [ordered]@{}
foreach ($role in $revisions.Keys)
{
    $revision = $revisions[$role]
    $result = Git "revision-$role" @('cat-file', '-e', "$revision^{commit}")
    $available[$role] = $result.ExitCode -eq 0
    if ($result.ExitCode -eq 0)
    {
        Git "metadata-$role" @('show', '-s', '--format=fuller', $revision) | Out-Null
    }
}
$initial = @(
    'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
    'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpersWebSite.csproj'
    'src\Mvc\test\WebSites\TagHelpersWebSite\Startup.cs'
    'src\Mvc\test\Mvc.FunctionalTests\Mvc.FunctionalTests.csproj'
    'src\Mvc\build.cmd'
    'src\Mvc\README.md'
    'docs\BuildFromSource.md'
    'docs\BuildErrors.md'
    'docs\CrossCuttingGuidance.md'
    'CONTRIBUTING.md'
    '.editorconfig'
)
foreach ($role in @('original', 'observedDefault'))
{
    if (-not $available[$role])
    {
        continue
    }
    foreach ($path in $initial)
    {
        Snapshot $revisions[$role] $role $path
    }
    $revision = $revisions[$role]
    Git "tagcloud-occurrences-$role" @('grep', '-n', '-i', '-E', 'TagCloud|tag-cloud|GetTagsAsync', $revision, '--', 'src/Mvc') | Out-Null
    Git "tagcloud-history-$role" @('log', '--follow', '--format=fuller', '--stat', $revision, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
    Git "tagcloud-blame-$role" @('blame', '-l', $revision, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
}
if ($available.reserved)
{
    Snapshot $revisions.reserved 'reserved' $initial[0]
}
$guidance = @()
foreach ($path in @('src\Mvc\AGENTS.md', '.github\instructions\cross-cutting-guidance.instructions.md', '.github\instructions\build.instructions.md'))
{
    $raw = [System.IO.File]::ReadAllBytes((Join-Path $Root $path))
    $relative = "source\reserved-working-guidance\$path"
    $target = Join-Path $Out $relative
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
    [System.IO.File]::WriteAllBytes($target, $raw)
    $guidance += [ordered]@{ path = $path; artifact = $relative; sha256 = (HashBytes $raw); bytes = $raw.Length; authority = 'working-tree guidance, not Default source evidence' }
}
WriteJson (Join-Path $Out 'membership_02.json') @($script:Membership)
WriteJson (Join-Path $Out 'guidance_02.json') $guidance
WriteJson (Join-Path $Out 'source_collection_02.json') ([ordered]@{
    startedUtc = $started
    endedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    powerShellVersion = $PSVersionTable.PSVersion.ToString()
    revisions = $revisions
    localObjectAvailability = $available
    commands = @($script:CommandLog)
    nativeCommandsStarted = 0
})
