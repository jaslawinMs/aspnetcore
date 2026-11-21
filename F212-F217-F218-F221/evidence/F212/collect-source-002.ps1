$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$Policy = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\policy.json'
$Repo = 'C:\src\aspnetcore'
$Agent = 'c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$ExpectedScope = '233 PhotinoWebViewManager actual native browser-message callback/thread and managed MessageReceived/dispatcher ownership, reentrancy/lifetime/ordering, normal sample workload/default/history/materiality. Treat required off-UI dispatch as producer semantics, not an inlineable delegate. Smallest private candidate/native existing-test correctness only if justified after GO233 and fresh actual own-registration/no-lease/no-HOLD/exact graph activation; max2 nodes/no reuse/shared compilation. No fabricated message bursts, bridge/queue/harness, timing/warmup/allocation/profiling, threading/order/lifetime/API/cache/manifest/IVT/UnsafeAccessor changes, remote/API execution/subagents/shared writes. Follow Components guidance and applicable browser validation skill. Stop at complete sealed source/candidate evidence and actual terminal owned-work handoff.'
$Utf8 = [System.Text.UTF8Encoding]::new($false)
$Native = [System.Collections.Generic.List[object]]::new()
$Bindings = [System.Collections.Generic.List[object]]::new()

function SaveBytes([string] $Relative, [byte[]] $Bytes)
{
    $path = Join-Path $Root $Relative
    [void][IO.Directory]::CreateDirectory((Split-Path $path))
    $stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $stream.Write($Bytes, 0, $Bytes.Length) } finally { $stream.Dispose() }
    return $path
}
function SaveJson([string] $Relative, $Value)
{
    $path = SaveBytes $Relative $Utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 100))
    $null = [IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}
function Sha256([byte[]] $Bytes) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes)) }
function BlobId([byte[]] $Bytes)
{
    $header = $Utf8.GetBytes("blob $($Bytes.Length)`0")
    $all = [byte[]]::new($header.Length + $Bytes.Length)
    [Array]::Copy($header, 0, $all, 0, $header.Length)
    [Array]::Copy($Bytes, 0, $all, $header.Length, $Bytes.Length)
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($all)).ToLowerInvariant()
}
function Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes($Policy)
    $copy = SaveBytes "guards\002-$Label.policy.json" $bytes
    $p = $Utf8.GetString($bytes) | ConvertFrom-Json
    $lease = Test-Path -LiteralPath (Join-Path (Split-Path $Policy) 'benchmark-exclusive.lease.json')
    $admitted = $p.independentFindingPreparationWorkers.F212 -ceq $Agent -and
        $p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope -and
        $p.actualWorkerBuildHoldActive -eq $false -and $p.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null = SaveJson "guards\002-$Label.admission.json" ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O'); policySnapshot = $copy; policySha256 = Sha256 $bytes
        actualAgent = $p.independentFindingPreparationWorkers.F212; expectedAgent = $Agent
        exactScopeMatches = ($p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope)
        actualWorkerBuildHoldActive = $p.actualWorkerBuildHoldActive; buildAndTestWorkQuiesced = $p.buildAndTestWorkQuiesced
        benchmarkLeasePresent = $lease; admittedThisStartOnly = $admitted
        purpose = 'Read-only provenance/source, not a build/test/runtime workload'
    })
    if (-not $admitted) { throw "Fresh F212 admission denied: $Label" }
}
function RunNative([string] $Label, [string] $Exe, [string[]] $Argv)
{
    Guard $Label
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $Exe; $info.WorkingDirectory = $Repo; $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true; $info.CreateNoWindow = $true
    foreach ($arg in $Argv) { $info.ArgumentList.Add($arg) }
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'; $info.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $info.Environment['GIT_PAGER'] = 'cat'; $info.Environment['GH_PAGER'] = 'cat'; $info.Environment['GH_PROMPT_DISABLED'] = '1'
    $outPath = Join-Path $Root "native\002-$Label.stdout"
    $errPath = Join-Path $Root "native\002-$Label.stderr"
    [void][IO.Directory]::CreateDirectory((Split-Path $outPath))
    $outStream = [IO.File]::Open($outPath, [IO.FileMode]::CreateNew)
    $errStream = [IO.File]::Open($errPath, [IO.FileMode]::CreateNew)
    $process = [Diagnostics.Process]::new(); $process.StartInfo = $info
    $record = [ordered]@{
        label = "002-$Label"; executable = $Exe; argv = $Argv; workingDirectory = $Repo; ownerAgentId = $Agent
        processId = $null; processStartUtc = $null; exitCode = $null; rootTerminal = $false
        stdoutPath = $outPath; stderrPath = $errPath; stdoutDrained = $false; stderrDrained = $false
        observedChildren = @(); childObservationLimit = 'Direct gh/git roots only; no child enumeration or universal descendant-closure claim.'
    }
    try
    {
        if (-not $process.Start()) { throw "Process.Start returned false: $Label" }
        $record.processId = $process.Id; $record.processStartUtc = $process.StartTime.ToUniversalTime().ToString('O')
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult(); $errTask.GetAwaiter().GetResult()
        $record.exitCode = $process.ExitCode; $record.rootTerminal = $process.HasExited
        $record.stdoutDrained = $true; $record.stderrDrained = $true
    }
    finally
    {
        $outStream.Dispose(); $errStream.Dispose(); $process.Dispose()
        $Native.Add([pscustomobject]$record)
        $null = SaveJson "native\002-$Label.process.json" $record
    }
    if ($record.exitCode -ne 0) { throw "002-$Label exit $($record.exitCode); complete streams retained." }
    return $Utf8.GetString([IO.File]::ReadAllBytes($outPath))
}

$self = [Diagnostics.Process]::GetCurrentProcess()
$null = SaveJson 'collector-002.invocation.json' ([ordered]@{
    helperPath = $PSCommandPath; helperSha256 = Sha256 ([IO.File]::ReadAllBytes($PSCommandPath))
    processId = $PID; processStartUtc = $self.StartTime.ToUniversalTime().ToString('O')
    argv = [Environment]::GetCommandLineArgs(); commandLine = [Environment]::CommandLine
    correctedFrom = 'collector001 blocked before first native root by parent-confirmed malformed shared policy; original helper/failure immutable'
    oneExecutionOnly = $true; sourceOnly = $true
})
$self.Dispose()
try
{
    $null = [IO.File]::ReadAllText((Join-Path $Root 'acceptance-001.json')) | ConvertFrom-Json
    $head = (RunNative 'before-head' 'git' @('--no-optional-locks','-C',$Repo,'rev-parse','--verify','HEAD')).Trim()
    $branch = (RunNative 'before-branch' 'git' @('--no-optional-locks','-C',$Repo,'symbolic-ref','-q','HEAD')).Trim()
    $gitDir = (RunNative 'before-gitdir' 'git' @('--no-optional-locks','-C',$Repo,'rev-parse','--absolute-git-dir')).Trim()
    $status = RunNative 'before-status' 'git' @('--no-optional-locks','-C',$Repo,'status','--porcelain=v1','-uall')
    $untracked = [System.Collections.Generic.List[object]]::new()
    foreach ($line in ($status -split "`n"))
    {
        if (-not $line.Trim()) { continue }
        if (-not $line.StartsWith('?? ')) { throw "Unexpected tracked reserved change: $line" }
        $relative = $line.Substring(3).TrimEnd("`r").Replace('/', '\')
        if ($relative.StartsWith('"')) { throw 'Quoted path needs separately reviewed collector.' }
        $bytes = [IO.File]::ReadAllBytes((Join-Path $Repo $relative))
        $copy = SaveBytes "reserved\before002\untracked\$relative" $bytes
        $untracked.Add([pscustomobject]@{ path = $relative; bytes = $bytes.Length; sha256 = Sha256 $bytes; retainedCopy = $copy })
    }
    $headBytes = [IO.File]::ReadAllBytes((Join-Path $gitDir 'HEAD'))
    $indexBytes = [IO.File]::ReadAllBytes((Join-Path $gitDir 'index'))
    $null = SaveBytes 'reserved\before002\HEAD' $headBytes
    $null = SaveBytes 'reserved\before002\index' $indexBytes
    $null = SaveJson 'reserved\before002.snapshot.json' ([ordered]@{
        role = 'ReservedNavigationOnly_NotDefault'; head = $head; branch = $branch; gitDirectory = $gitDir; status = $status
        headFileSha256 = Sha256 $headBytes; indexSha256 = Sha256 $indexBytes; untracked = @($untracked.ToArray())
    })
    if ($head -cne '24875ef5dabb55567870b39f6eb0002170435e2f' -or
        $branch -cne 'refs/heads/autoperf/F145-hoist-large-response-utf8-encoding' -or $untracked.Count -ne 4)
    { throw 'Reserved checkout precondition differs from assigned HEAD/branch/four untracked reports.' }

    $main = (RunNative 'github-main' 'gh' @('api','--method','GET','repos/dotnet/aspnetcore/branches/main')) | ConvertFrom-Json
    $Default = [string]$main.commit.sha
    if ($Default -notmatch '^[0-9a-f]{40}$') { throw 'No exact main commit pin in GitHub response.' }
    $null = SaveJson 'source-pins-002.json' ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O'); repository = 'dotnet/aspnetcore'; originalCommit = $Original
        defaultCommit = $Default; defaultTree = $main.commit.commit.tree.sha; defaultObservation = 'native\002-github-main.stdout'
        defaultFrozenForThisFinding = $true; bothSourceRolesPhysicalHost = [Environment]::MachineName; reservedCheckoutIsDefault = $false
    })
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
    $parts = [System.Collections.Generic.List[string]]::new()
    foreach ($role in @(@('o',$Original),@('d',$Default)))
    {
        $prefix = $role[0]; $commit = $role[1]
        $parts.Add("${prefix}Commit:object(oid:`"$commit`"){... on Commit{oid tree{oid}}}")
        for ($i = 0; $i -lt $paths.Count; $i++)
        { $parts.Add("${prefix}${i}:object(expression:`"$($commit):$($paths[$i])`"){... on Blob{oid byteSize text}}") }
    }
    $query = 'query{repository(owner:"dotnet",name:"aspnetcore"){' + ($parts -join ' ') + '}}'
    $null = SaveBytes 'github-source-query-002.graphql' $Utf8.GetBytes($query)
    $data = (RunNative 'github-source-roles' 'gh' @('api','graphql','-f',"query=$query")) | ConvertFrom-Json
    if ($data.errors) { throw 'GraphQL returned errors; raw response retained without fallback.' }
    foreach ($role in @(@('Original','o',$Original),@('Default','d',$Default)))
    {
        $name = $role[0]; $prefix = $role[1]; $commit = $role[2]
        $commitData = $data.data.repository.("${prefix}Commit")
        if ($commitData.oid -cne $commit) { throw "$name commit binding mismatch." }
        for ($i = 0; $i -lt $paths.Count; $i++)
        {
            $blob = $data.data.repository.("${prefix}${i}"); $apiPath = $paths[$i]
            if ($null -eq $blob)
            {
                $Bindings.Add([pscustomobject]@{ repository = 'dotnet/aspnetcore'; role = $name; commit = $commit; tree = $commitData.tree.oid; path = $apiPath; present = $false; evidence = 'native\002-github-source-roles.stdout' })
                continue
            }
            if ($null -eq $blob.text) { throw "Missing whole text: $name $apiPath" }
            $bytes = $Utf8.GetBytes([string]$blob.text); $id = BlobId $bytes; $hash = Sha256 $bytes
            if ($id -cne $blob.oid -or $bytes.Length -ne $blob.byteSize) { throw "Source byte/blob mismatch: $name $apiPath" }
            $saved = SaveBytes ("sources\$name\" + $apiPath.Replace('/','\')) $bytes
            $localPath = Join-Path $Repo $apiPath.Replace('/','\')
            $localHash = if ([IO.File]::Exists($localPath)) { Sha256 ([IO.File]::ReadAllBytes($localPath)) } else { $null }
            $Bindings.Add([pscustomobject]@{
                repository = 'dotnet/aspnetcore'; role = $name; commit = $commit; tree = $commitData.tree.oid; path = $apiPath; present = $true
                blob = $blob.oid; recomputedGitBlob = $id; bytes = $bytes.Length; sha256 = $hash; savedPath = $saved
                reservedNavigationBytesMatch = ($localHash -ceq $hash); evidence = 'native\002-github-source-roles.stdout'
            })
        }
    }
    $null = SaveJson 'source-memberships-002.json' @($Bindings.ToArray())
    $managerPath = 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'
    foreach ($role in @(@('Original',$Original),@('Default',$Default)))
    {
        $endpoint = "repos/dotnet/aspnetcore/commits?sha=$($role[1])&path=$managerPath&per_page=6"
        $history = RunNative "github-history-$($role[0])" 'gh' @('api','--method','GET',$endpoint)
        $null = $history | ConvertFrom-Json
    }
    $null = SaveJson 'collector-002.result.json' ([ordered]@{
        state = 'SOURCE_ROLES_FROZEN'; originalCommit = $Original; defaultCommit = $Default; memberships = $Bindings.Count
        nativeRoots = @($Native.ToArray()); builds = @(); tests = @(); candidateCreated = $false; noRuntimeOrPerformanceClaim = $true
    })
    Write-Output "SOURCE_ROLES_FROZEN Original=$Original Default=$Default memberships=$($Bindings.Count) nativeRoots=$($Native.Count)"
}
catch
{
    $failure = $_ | Format-List * -Force | Out-String
    $null = SaveBytes 'collector-002.failure.txt' $Utf8.GetBytes($failure)
    $null = SaveJson 'collector-002.failure.json' ([ordered]@{
        state = 'FAILED_NO_SUCCESS_FALLBACK'; exception = $failure; nativeRoots = @($Native.ToArray()); retainedMemberships = @($Bindings.ToArray())
    })
    Write-Error -ErrorAction Continue $failure
    exit 1
}
