$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$PolicyPath = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\policy.json'
$LeasePath = Join-Path (Split-Path $PolicyPath) 'benchmark-exclusive.lease.json'
$Repo = 'C:\src\aspnetcore'
$AgentId = 'c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$ExpectedScope = '233 PhotinoWebViewManager actual native browser-message callback/thread and managed MessageReceived/dispatcher ownership, reentrancy/lifetime/ordering, normal sample workload/default/history/materiality. Treat required off-UI dispatch as producer semantics, not an inlineable delegate. Smallest private candidate/native existing-test correctness only if justified after GO233 and fresh actual own-registration/no-lease/no-HOLD/exact graph activation; max2 nodes/no reuse/shared compilation. No fabricated message bursts, bridge/queue/harness, timing/warmup/allocation/profiling, threading/order/lifetime/API/cache/manifest/IVT/UnsafeAccessor changes, remote/API execution/subagents/shared writes. Follow Components guidance and applicable browser validation skill. Stop at complete sealed source/candidate evidence and actual terminal owned-work handoff.'
$Utf8 = [System.Text.UTF8Encoding]::new($false)
$NativeRecords = [System.Collections.Generic.List[object]]::new()
$Bindings = [System.Collections.Generic.List[object]]::new()
$Failure = $null

function Write-NewBytes([string] $RelativePath, [byte[]] $Bytes)
{
    $path = Join-Path $Root $RelativePath
    [void][System.IO.Directory]::CreateDirectory((Split-Path $path))
    $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    try { $stream.Write($Bytes, 0, $Bytes.Length) } finally { $stream.Dispose() }
    return $path
}

function Write-NewJson([string] $RelativePath, $Value)
{
    $path = Write-NewBytes $RelativePath $Utf8.GetBytes(($Value | ConvertTo-Json -Depth 100))
    $null = [System.IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}

function Get-Sha256([byte[]] $Bytes)
{
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($Bytes))
}

function Get-GitBlobId([byte[]] $Bytes)
{
    $header = $Utf8.GetBytes("blob $($Bytes.Length)`0")
    $all = [byte[]]::new($header.Length + $Bytes.Length)
    [Array]::Copy($header, 0, $all, 0, $header.Length)
    [Array]::Copy($Bytes, 0, $all, $header.Length, $Bytes.Length)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($all)).ToLowerInvariant()
}

function Assert-FreshAdmission([string] $Label)
{
    $bytes = [System.IO.File]::ReadAllBytes($PolicyPath)
    $policy = $Utf8.GetString($bytes) | ConvertFrom-Json
    $leasePresent = Test-Path -LiteralPath $LeasePath
    $approved = $policy.independentFindingPreparationWorkers.F212 -ceq $AgentId -and
        $policy.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope -and
        $policy.actualWorkerBuildHoldActive -eq $false -and
        $policy.buildAndTestWorkQuiesced -eq $false -and
        -not $leasePresent
    $snapshot = Write-NewBytes "guards\$Label.policy.json" $bytes
    $receipt = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O')
        label = $Label
        policySnapshot = $snapshot
        policySha256 = Get-Sha256 $bytes
        expectedAgentId = $AgentId
        actualAgentId = $policy.independentFindingPreparationWorkers.F212
        exactScopeMatches = ($policy.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope)
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
        benchmarkLeasePresent = $leasePresent
        admittedThisStartOnly = $approved
        purpose = 'Read-only source/provenance collection; no build, test, runtime workload or measurement'
    }
    $null = Write-NewJson "guards\$Label.admission.json" $receipt
    if (-not $approved) { throw "Fresh F212 admission denied for $Label." }
}

function Invoke-ReadOnlyNative([string] $Label, [string] $Executable, [string[]] $NativeArguments)
{
    Assert-FreshAdmission $Label
    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $Executable
    $info.WorkingDirectory = $Repo
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    foreach ($arg in $NativeArguments) { $info.ArgumentList.Add($arg) }
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $info.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $info.Environment['GIT_PAGER'] = 'cat'
    $info.Environment['GH_PAGER'] = 'cat'
    $info.Environment['GH_PROMPT_DISABLED'] = '1'
    $stdoutPath = Join-Path $Root "native\$Label.stdout"
    $stderrPath = Join-Path $Root "native\$Label.stderr"
    [void][System.IO.Directory]::CreateDirectory((Split-Path $stdoutPath))
    $stdout = [System.IO.File]::Open($stdoutPath, [System.IO.FileMode]::CreateNew)
    $stderr = [System.IO.File]::Open($stderrPath, [System.IO.FileMode]::CreateNew)
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $info
    $record = [ordered]@{
        label = $Label
        executable = $Executable
        argv = $NativeArguments
        workingDirectory = $Repo
        ownerAgentId = $AgentId
        processId = $null
        processStartUtc = $null
        exitCode = $null
        rootTerminal = $false
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
        stdoutDrained = $false
        stderrDrained = $false
        observedChildren = @()
        childObservationLimit = 'No descendant enumeration; direct read-only gh/git roots only. No universal descendant-closure claim.'
    }
    try
    {
        if (-not $process.Start()) { throw "Process.Start returned false for $Label." }
        $record.processId = $process.Id
        $record.processStartUtc = $process.StartTime.ToUniversalTime().ToString('O')
        $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
        $process.WaitForExit()
        $stdoutTask.GetAwaiter().GetResult()
        $stderrTask.GetAwaiter().GetResult()
        $record.exitCode = $process.ExitCode
        $record.rootTerminal = $process.HasExited
        $record.stdoutDrained = $true
        $record.stderrDrained = $true
    }
    finally
    {
        $stdout.Dispose()
        $stderr.Dispose()
        $process.Dispose()
        $NativeRecords.Add([pscustomobject]$record)
        $null = Write-NewJson "native\$Label.process.json" $record
    }
    if ($record.exitCode -ne 0) { throw "$Label failed with exit $($record.exitCode). Full stdout/stderr retained." }
    return $Utf8.GetString([System.IO.File]::ReadAllBytes($stdoutPath))
}

function Get-ReservedSnapshot([string] $Label)
{
    $head = (Invoke-ReadOnlyNative "$Label-head" 'git' @('--no-optional-locks', '-C', $Repo, 'rev-parse', '--verify', 'HEAD')).Trim()
    $branch = (Invoke-ReadOnlyNative "$Label-branch" 'git' @('--no-optional-locks', '-C', $Repo, 'symbolic-ref', '-q', 'HEAD')).Trim()
    $gitDir = (Invoke-ReadOnlyNative "$Label-gitdir" 'git' @('--no-optional-locks', '-C', $Repo, 'rev-parse', '--absolute-git-dir')).Trim()
    $status = Invoke-ReadOnlyNative "$Label-status" 'git' @('--no-optional-locks', '-C', $Repo, 'status', '--porcelain=v1', '-uall')
    $untracked = [System.Collections.Generic.List[object]]::new()
    foreach ($line in ($status -split "`n"))
    {
        if (-not $line.Trim()) { continue }
        if (-not $line.StartsWith('?? ')) { throw "Reserved worktree has an unexpected tracked change: $line" }
        $relative = $line.Substring(3).TrimEnd("`r").Replace('/', '\')
        if ($relative.StartsWith('"')) { throw 'Quoted untracked path requires a separately reviewed collector.' }
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $Repo $relative))
        $copy = Write-NewBytes "reserved\$Label\untracked\$relative" $bytes
        $untracked.Add([pscustomobject]@{ path = $relative; bytes = $bytes.Length; sha256 = Get-Sha256 $bytes; retainedCopy = $copy })
    }
    $headBytes = [System.IO.File]::ReadAllBytes((Join-Path $gitDir 'HEAD'))
    $indexBytes = [System.IO.File]::ReadAllBytes((Join-Path $gitDir 'index'))
    $null = Write-NewBytes "reserved\$Label\HEAD" $headBytes
    $null = Write-NewBytes "reserved\$Label\index" $indexBytes
    $snapshot = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O')
        role = 'ReservedNavigationOnly_NotDefault'
        head = $head
        branch = $branch
        gitDirectory = $gitDir
        status = $status
        headFileSha256 = Get-Sha256 $headBytes
        indexSha256 = Get-Sha256 $indexBytes
        untracked = @($untracked.ToArray())
    }
    $null = Write-NewJson "reserved\$Label.snapshot.json" $snapshot
    if ($head -cne '24875ef5dabb55567870b39f6eb0002170435e2f') { throw 'Reserved HEAD does not match assigned invariant.' }
    if ($branch -cne 'refs/heads/autoperf/F145-hoist-large-response-utf8-encoding') { throw 'Reserved branch does not match assigned invariant.' }
    if ($untracked.Count -ne 4) { throw "Expected four unrelated untracked reports; observed $($untracked.Count)." }
    return $snapshot
}

$current = [System.Diagnostics.Process]::GetCurrentProcess()
$null = Write-NewJson 'collector-001.invocation.json' ([ordered]@{
    helperPath = $PSCommandPath
    helperSha256 = Get-Sha256 ([System.IO.File]::ReadAllBytes($PSCommandPath))
    powershellProcessId = $PID
    powershellProcessStartUtc = $current.StartTime.ToUniversalTime().ToString('O')
    argv = [Environment]::GetCommandLineArgs()
    commandLine = [Environment]::CommandLine
    actualInvocation = '& <absolute helper path> through functions.powershell, mode=sync'
    sourceOnly = $true
    oneExecutionOnly = $true
})
$current.Dispose()

try
{
    $before = Get-ReservedSnapshot 'before'
    $branchResponse = Invoke-ReadOnlyNative 'github-main' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/branches/main')
    $branchData = $branchResponse | ConvertFrom-Json
    $Default = [string]$branchData.commit.sha
    if ($Default -notmatch '^[0-9a-f]{40}$') { throw 'GitHub main returned no exact full commit pin.' }
    $pins = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O')
        repository = 'dotnet/aspnetcore'
        originalCommit = $Original
        defaultCommit = $Default
        defaultTree = $branchData.commit.commit.tree.sha
        defaultObservation = 'native\github-main.stdout'
        defaultFrozenForThisFinding = $true
        bothSourceRolesPhysicalHost = [Environment]::MachineName
        reservedCheckoutIsDefault = $false
    }
    $null = Write-NewJson 'source-pins-001.json' $pins
    $paths = @(
        'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoDispatcher.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoSynchronizationContext.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/src/BlazorWindow.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/src/BlazorWindowRootComponents.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/src/Microsoft.AspNetCore.Components.WebView.Photino.csproj',
        'src/Components/WebView/Samples/PhotinoPlatform/testassets/PhotinoTestApp/Program.cs',
        'src/Components/WebView/Samples/PhotinoPlatform/testassets/PhotinoTestApp/PhotinoTestApp.csproj',
        'src/Components/WebView/Samples/PhotinoPlatform/testassets/PhotinoTestApp/wwwroot/webviewhost.html',
        'src/Components/WebView/WebView/src/WebViewManager.cs',
        'src/Components/WebView/WebView/src/IpcReceiver.cs',
        'src/Components/WebView/WebView/src/IpcSender.cs',
        'src/Components/WebView/WebView/src/IpcCommon.cs',
        'src/Components/WebView/WebView/src/PageContext.cs',
        'src/Components/WebView/WebView/src/WebViewRenderer.cs',
        'src/Components/Web.JS/src/Boot.WebView.ts',
        'src/Components/Web.JS/src/Platform/WebView/WebViewIpcSender.ts',
        'src/Components/Web.JS/src/Platform/WebView/WebViewIpcReceiver.ts',
        'src/Components/Web.JS/src/Platform/WebView/WebViewIpcCommon.ts',
        'src/Components/test/testassets/BasicTestApp/Index.razor',
        'src/Components/AGENTS.md',
        '.github/instructions/components.instructions.md',
        '.github/instructions/cross-cutting-guidance.instructions.md',
        'docs/BlazorComponentsGuidance.md',
        'docs/CrossCuttingGuidance.md',
        'docs/BuildFromSource.md',
        'eng/Versions.props',
        'eng/Dependencies.props',
        'src/Components/WebView/WebView/test/WebViewManagerTests.cs'
    )
    $expressions = [System.Collections.Generic.List[string]]::new()
    foreach ($role in @(@('o', $Original), @('d', $Default)))
    {
        $prefix = $role[0]
        $commit = $role[1]
        $expressions.Add("${prefix}Commit:object(oid:`"$commit`"){... on Commit{oid tree{oid}}}")
        for ($i = 0; $i -lt $paths.Count; $i++)
        {
            $expression = $commit + ':' + $paths[$i]
            $expressions.Add("${prefix}${i}:object(expression:`"$expression`"){... on Blob{oid byteSize text}}")
        }
    }
    $query = 'query{repository(owner:"dotnet",name:"aspnetcore"){' + ($expressions -join ' ') + '}}'
    $null = Write-NewBytes 'github-source-query-001.graphql' $Utf8.GetBytes($query)
    $sourceResponse = Invoke-ReadOnlyNative 'github-source-roles' 'gh' @('api', 'graphql', '-f', "query=$query")
    $sourceData = $sourceResponse | ConvertFrom-Json
    if ($sourceData.errors) { throw 'GitHub GraphQL source response contains errors; raw response retained.' }
    foreach ($role in @(@('Original', 'o', $Original), @('Default', 'd', $Default)))
    {
        $roleName = $role[0]
        $prefix = $role[1]
        $commit = $role[2]
        $commitData = $sourceData.data.repository.("${prefix}Commit")
        if ($commitData.oid -cne $commit) { throw "$roleName commit membership mismatch." }
        for ($i = 0; $i -lt $paths.Count; $i++)
        {
            $blob = $sourceData.data.repository.("${prefix}${i}")
            $apiPath = $paths[$i]
            if ($null -eq $blob)
            {
                $Bindings.Add([pscustomobject]@{ repository = 'dotnet/aspnetcore'; role = $roleName; commit = $commit; tree = $commitData.tree.oid; path = $apiPath; present = $false; evidence = 'native\github-source-roles.stdout' })
                continue
            }
            if ($null -eq $blob.text) { throw "No whole textual bytes for $roleName $apiPath." }
            $bytes = $Utf8.GetBytes([string]$blob.text)
            $actualBlob = Get-GitBlobId $bytes
            if ($actualBlob -cne $blob.oid -or $bytes.Length -ne $blob.byteSize) { throw "Blob byte/hash mismatch for $roleName $apiPath." }
            $relative = "sources\$roleName\" + $apiPath.Replace('/', '\')
            $saved = Write-NewBytes $relative $bytes
            $localPath = Join-Path $Repo $apiPath.Replace('/', '\')
            $localHash = if ([System.IO.File]::Exists($localPath)) { Get-Sha256 ([System.IO.File]::ReadAllBytes($localPath)) } else { $null }
            $Bindings.Add([pscustomobject]@{
                repository = 'dotnet/aspnetcore'
                role = $roleName
                commit = $commit
                tree = $commitData.tree.oid
                path = $apiPath
                present = $true
                blob = $blob.oid
                recomputedGitBlob = $actualBlob
                bytes = $bytes.Length
                sha256 = Get-Sha256 $bytes
                savedPath = $saved
                reservedNavigationBytesMatch = ($localHash -ceq (Get-Sha256 $bytes))
                evidence = 'native\github-source-roles.stdout'
            })
        }
    }
    $null = Write-NewJson 'source-memberships-001.json' @($Bindings.ToArray())
    $historyPath = 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'
    foreach ($role in @(@('Original', $Original), @('Default', $Default)))
    {
        $endpoint = "repos/dotnet/aspnetcore/commits?sha=$($role[1])&path=$historyPath&per_page=6"
        $null = Invoke-ReadOnlyNative "github-history-$($role[0])" 'gh' @('api', '--method', 'GET', $endpoint)
    }
    $null = Write-NewJson 'collector-001.result.json' ([ordered]@{
        state = 'SOURCE_ROLES_FROZEN'
        originalCommit = $Original
        defaultCommit = $Default
        memberships = $Bindings.Count
        nativeRoots = @($NativeRecords.ToArray())
        builds = @()
        tests = @()
        candidateCreated = $false
        noRuntimeOrPerformanceClaim = $true
    })
    Write-Output "SOURCE_ROLES_FROZEN Original=$Original Default=$Default memberships=$($Bindings.Count) nativeRoots=$($NativeRecords.Count)"
}
catch
{
    $Failure = ($_ | Format-List * -Force | Out-String)
    $null = Write-NewBytes 'collector-001.failure.txt' $Utf8.GetBytes($Failure)
    $null = Write-NewJson 'collector-001.failure.json' ([ordered]@{
        state = 'FAILED_NO_SUCCESS_FALLBACK'
        exception = $Failure
        nativeRoots = @($NativeRecords.ToArray())
        retainedMemberships = @($Bindings.ToArray())
    })
    Write-Error -ErrorAction Continue $Failure
    exit 1
}
