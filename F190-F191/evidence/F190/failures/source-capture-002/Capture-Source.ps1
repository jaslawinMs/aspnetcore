$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
[Environment]::CurrentDirectory = (Get-Location).ProviderPath

$repo = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$default = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
$commands = [System.Collections.Generic.List[object]]::new()
$bindings = [System.Collections.Generic.List[object]]::new()
New-Item -ItemType Directory -Path '.\commands', '.\sources\original', '.\sources\default' -ErrorAction Stop | Out-Null

function Read-Command {
    param(
        [string] $Name,
        [string] $Tool,
        [string[]] $Argv,
        [int[]] $AllowedExitCodes = @(0)
    )

    $stdoutPath = ".\commands\$Name.stdout"
    $stderrPath = ".\commands\$Name.stderr"
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = (Get-Command $Tool -CommandType Application -ErrorAction Stop).Source
    $startInfo.WorkingDirectory = $repo
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $startInfo.Environment['GH_PAGER'] = ''
    $startInfo.Environment['GH_PROMPT_DISABLED'] = '1'
    foreach ($arg in $Argv)
    {
        $startInfo.ArgumentList.Add($arg)
    }

    $stdoutFile = [System.IO.File]::Open($stdoutPath, 'CreateNew', 'Write', 'Read')
    $stderrFile = [System.IO.File]::Open($stderrPath, 'CreateNew', 'Write', 'Read')
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $startedUtc = [DateTime]::UtcNow.ToString('o')
    try
    {
        if (-not $process.Start())
        {
            throw "Could not start read-only command $Name"
        }
        $rootPid = $process.Id
        $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdoutFile)
        $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderrFile)
        $process.WaitForExit()
        $stdoutTask.GetAwaiter().GetResult()
        $stderrTask.GetAwaiter().GetResult()
        $exitCode = $process.ExitCode
    }
    finally
    {
        $stdoutFile.Dispose()
        $stderrFile.Dispose()
        $process.Dispose()
    }

    $commands.Add([ordered]@{
        name = $Name
        classification = 'read-only-source-or-github-query; not a native build/test/runtime workload'
        executable = $startInfo.FileName
        argv = $Argv
        workingDirectory = $repo
        rootPid = $rootPid
        startedUtc = $startedUtc
        completedUtc = [DateTime]::UtcNow.ToString('o')
        exitCode = $exitCode
        allowedExitCodes = $AllowedExitCodes
        rootTerminal = $true
        stdoutTerminal = $stdoutTask.IsCompleted
        stderrTerminal = $stderrTask.IsCompleted
        stdout = $stdoutPath
        stderr = $stderrPath
        stdoutSha256 = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
        stderrSha256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
    })
    $commands | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath '.\source-command-receipts.json' -Encoding utf8
    if ($exitCode -notin $AllowedExitCodes)
    {
        throw "Read-only command $Name failed with exit $exitCode. Its exact streams were preserved."
    }
    return [System.IO.File]::ReadAllText($stdoutPath)
}

$statusBefore = Read-Command 'reserved-status-before' 'git' @('--no-optional-locks', 'status', '--porcelain=v1', '--branch', '--untracked-files=normal')
$headBefore = (Read-Command 'reserved-head-before' 'git' @('--no-optional-locks', 'rev-parse', 'HEAD')).Trim()
if ($headBefore -ne '24875ef5dabb55567870b39f6eb0002170435e2f')
{
    throw "Reserved worktree identity changed: $headBefore"
}

$policyPath = '..\policy.json'
$policyBytes = [System.IO.File]::ReadAllBytes($policyPath)
[System.IO.File]::WriteAllBytes('.\policy-observed.json', $policyBytes)
$policy = [System.Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
[ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    owner = $policy.independentFindingPreparationWorkers.F190
    registeredOwners = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    cap = $policy.maximumRegisteredPreparationOwners
    scope = $policy.activeWorkerPreparationScopes.F190
    actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
    buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
    benchmarkLeasePresent = Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'
    nativeWorkPlanned = $false
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.\policy-observation.json' -Encoding utf8
if ($policy.independentFindingPreparationWorkers.F190 -ne '0f21ad7f-ffb1-4ca5-9ee5-54f1e0543725')
{
    throw 'F190 registration does not match this owner.'
}

$repoMetadata = Read-Command 'upstream-repository' 'gh' @('api', 'repos/dotnet/aspnetcore', '--jq', '{full_name,default_branch,fork,pushed_at}')
$upstreamRepo = $repoMetadata | ConvertFrom-Json
$observedHead = Read-Command 'upstream-actual-default-ref' 'gh' @('api', "repos/dotnet/aspnetcore/git/ref/heads/$($upstreamRepo.default_branch)")
$upstreamRef = $observedHead | ConvertFrom-Json
if ($upstreamRef.object.sha -ne $default)
{
    throw "Actual default advanced to $($upstreamRef.object.sha); qualification must use the fresh pin."
}
$null = Read-Command 'upstream-pinned-commit' 'gh' @('api', "repos/dotnet/aspnetcore/commits/$default", '--jq', '{sha,html_url,commit:{message:.commit.message,committer:.commit.committer}}')
$forkMetadata = Read-Command 'fork-repository' 'gh' @('api', 'repos/jaslawinMs/aspnetcore', '--jq', '{full_name,default_branch,fork,pushed_at,parent:.parent.full_name}')
$forkRepo = $forkMetadata | ConvertFrom-Json
$null = Read-Command 'fork-actual-default-ref' 'gh' @('api', "repos/jaslawinMs/aspnetcore/git/ref/heads/$($forkRepo.default_branch)")

$paths = @(
    'src\ProjectTemplates\Shared\AspNetProcess.cs',
    'src\ProjectTemplates\Shared\PageUrls.cs',
    'src\ProjectTemplates\Shared\Project.cs',
    'src\ProjectTemplates\test\Templates.Mvc.Tests\MvcTemplateTest.cs',
    'src\ProjectTemplates\test\Templates.Mvc.Tests\RazorPagesTemplateTest.cs',
    'src\ProjectTemplates\test\Templates.Mvc.Tests\BlazorTemplateTest.cs',
    'src\ProjectTemplates\test\Templates.Mvc.Tests\Templates.Mvc.Tests.csproj',
    'src\ProjectTemplates\Shared\AssemblyInfo.AssemblyFixtures.cs',
    'src\ProjectTemplates\TestInfrastructure\PrepareForTest.targets',
    'src\ProjectTemplates\README.md',
    'src\ProjectTemplates\build.cmd',
    'eng\Version.Details.xml',
    'eng\Versions.props',
    'global.json',
    'Directory.Build.props',
    '.editorconfig',
    'docs\BuildFromSource.md',
    'docs\CrossCuttingGuidance.md'
)

foreach ($role in @('original', 'default'))
{
    $commit = if ($role -eq 'original') { $original } else { $default }
    $index = 0
    foreach ($path in $paths)
    {
        $index++
        $gitPath = $path.Replace('\', '/')
        $object = "${commit}:$gitPath"
        $blob = (Read-Command "$role-$index-blob" 'git' @('--no-optional-locks', 'rev-parse', $object)).Trim()
        $null = Read-Command "$role-$index-content" 'git' @('--no-optional-locks', 'show', $object)
        $destination = ".\sources\$role\$path"
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        [System.IO.File]::WriteAllBytes($destination, [System.IO.File]::ReadAllBytes(".\commands\$role-$index-content.stdout"))
        $bindings.Add([ordered]@{
            role = $role
            commit = $commit
            repository = 'dotnet/aspnetcore'
            repositoryPath = $path
            gitBlob = $blob
            artifact = $destination
            bytes = (Get-Item -LiteralPath $destination).Length
            sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        })
    }
    $null = Read-Command "$role-caller-inventory" 'git' @('--no-optional-locks', 'grep', '-n', '-F', 'AssertPagesOk', $commit, '--', '*.cs')
    $null = Read-Command "$role-containslinks-inventory" 'git' @('--no-optional-locks', 'grep', '-n', '-F', 'ContainsLinks(', $commit, '--', '*.cs')
    $null = Read-Command "$role-producer-inventory" 'git' @('--no-optional-locks', 'grep', '-n', '-E', '\<Links[[:space:]]*=|\.Links\b|new Page|IEnumerable<Page>|yield return new\(', $commit, '--', 'src\ProjectTemplates\*.cs', 'src\ProjectTemplates\**\*.cs')
    $null = Read-Command "$role-shared-source-consumers" 'git' @('--no-optional-locks', 'grep', '-n', '-F', '..\..\Shared\**', $commit, '--', 'src\ProjectTemplates\*.csproj', 'src\ProjectTemplates\**\*.csproj')
    $null = Read-Command "$role-namespace-file-inventory" 'git' @('--no-optional-locks', 'grep', '-l', '-F', 'Templates.Test.Helpers', $commit, '--', '*.cs')
    $null = Read-Command "$role-size-optimized-config" 'git' @('--no-optional-locks', 'grep', '-n', '-F', 'System.Linq.Enumerable.IsSizeOptimized', $commit, '--', 'src\ProjectTemplates', 'Directory.Build.props', 'Directory.Build.targets', 'eng') -AllowedExitCodes @(0, 1)
}
$bindings | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath '.\source-bindings.json' -Encoding utf8

$null = Read-Command 'identical-projecttemplates-tree-pins' 'git' @('--no-optional-locks', 'rev-parse', "${original}:src/ProjectTemplates", "${default}:src/ProjectTemplates")
$null = Read-Command 'projecttemplates-default-diff' 'git' @('--no-optional-locks', '--no-pager', 'diff', '--binary', $original, $default, '--', 'src\ProjectTemplates')
$null = Read-Command 'target-history' 'git' @('--no-optional-locks', '--no-pager', 'log', '--follow', '-n', '16', '--format=%H %aI %s', $default, '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs')
$null = Read-Command 'producer-history' 'git' @('--no-optional-locks', '--no-pager', 'log', '-n', '12', '--format=%H %aI %s', $default, '--', 'src\ProjectTemplates\test\Templates.Mvc.Tests\MvcTemplateTest.cs', 'src\ProjectTemplates\test\Templates.Mvc.Tests\RazorPagesTemplateTest.cs', 'src\ProjectTemplates\test\Templates.Mvc.Tests\BlazorTemplateTest.cs')
$null = Read-Command 'target-blame' 'git' @('--no-optional-locks', '--no-pager', 'blame', '-L', '112,122', $original, '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs')
$null = Read-Command 'guard-introduction-diff' 'git' @('--no-optional-locks', '--no-pager', 'show', '--format=fuller', '426b8b46f9c7cad8b2f0ab502902109ff09be9e6', '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs')
$null = Read-Command 'link-validation-flakiness-diff' 'git' @('--no-optional-locks', '--no-pager', 'show', '--format=fuller', '02e5cfb094800bb6592487dbe0ab116aa2c76831', '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs')
$null = Read-Command 'anglesharp-update-diff' 'git' @('--no-optional-locks', '--no-pager', 'show', '--format=fuller', 'fc4e6e0915a59f2e1a9bf18955df2eca1de8f96c', '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs')
$null = Read-Command 'original-validation-intent' 'gh' @('api', 'repos/dotnet/aspnetcore/pulls/8628', '--jq', '{number,state,title,merged_at,merge_commit_sha,html_url,body}')
$null = Read-Command 'null-guard-pr-intent' 'gh' @('api', 'repos/dotnet/aspnetcore/pulls/48285', '--jq', '{number,state,title,merged_at,merge_commit_sha,html_url,body}')
$null = Read-Command 'singlefile-pr-intent' 'gh' @('api', 'repos/dotnet/aspnetcore/pulls/39977', '--jq', '{number,state,title,merged_at,merge_commit_sha,html_url,body}')

$searches = @(
    @{ name = 'upstream-aspnetprocess'; repository = 'dotnet/aspnetcore'; query = 'AspNetProcess' },
    @{ name = 'upstream-assertpagesok'; repository = 'dotnet/aspnetcore'; query = '"AssertPagesOk"' },
    @{ name = 'upstream-page-links'; repository = 'dotnet/aspnetcore'; query = '"Page.Links"' },
    @{ name = 'upstream-pageurls'; repository = 'dotnet/aspnetcore'; query = 'PageUrls' },
    @{ name = 'upstream-count-template'; repository = 'dotnet/aspnetcore'; query = '"Count" "template"' },
    @{ name = 'fork-aspnetprocess'; repository = 'jaslawinMs/aspnetcore'; query = 'AspNetProcess' },
    @{ name = 'fork-f190'; repository = 'jaslawinMs/aspnetcore'; query = '"F190"' },
    @{ name = 'fork-card'; repository = 'jaslawinMs/aspnetcore'; query = '"enumerable-count-vs-any"' }
)
foreach ($search in $searches)
{
    $null = Read-Command $search.name 'gh' @('search', 'prs', $search.query, '--repo', $search.repository, '--limit', '30', '--json', 'number,title,state,url,updatedAt')
}
$null = Read-Command 'fork-f190-issues' 'gh' @('search', 'issues', 'F190', '--repo', 'jaslawinMs/aspnetcore', '--limit', '20', '--json', 'number,title,state,url,updatedAt')

$runtimePins = foreach ($role in @('original', 'default'))
{
    [xml] $details = Get-Content -Raw -LiteralPath ".\sources\$role\eng\Version.Details.xml"
    foreach ($dependency in $details.SelectNodes('//Dependency'))
    {
        if ($dependency.Name -eq 'Microsoft.NETCore.App.Ref')
        {
            [ordered]@{
                role = $role
                dependency = [string] $dependency.Name
                version = [string] $dependency.Version
                uri = [string] $dependency.Uri
                sha = [string] $dependency.Sha
                source = ".\sources\$role\eng\Version.Details.xml"
            }
        }
    }
}
$runtimePins | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.\runtime-source-pins.json' -Encoding utf8

[ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    classification = 'source qualification only'
    originalCommit = $original
    actualDefaultCommit = $upstreamRef.object.sha
    actualDefaultBranch = $upstreamRepo.default_branch
    sourceBindings = $bindings.Count
    sourceReadCommands = $commands.Count
    allSourceReadRootsAndBothStreamsTerminal = @($commands | Where-Object { -not $_.rootTerminal -or -not $_.stdoutTerminal -or -not $_.stderrTerminal }).Count -eq 0
    nativeBuildTestOrRuntimeStarts = 0
    comparisons = 0
    privateGraphsCreated = @()
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath '.\source-capture-completed.json' -Encoding utf8
Get-Content -Raw -LiteralPath '.\source-capture-completed.json'
Get-Content -Raw -LiteralPath '.\runtime-source-pins.json'
