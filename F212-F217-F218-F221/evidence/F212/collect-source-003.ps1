$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$ParentRoot = Split-Path $Root
$Repo = 'C:\src\aspnetcore'
$Agent = 'c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$Utf8 = [Text.UTF8Encoding]::new($false)
$Native = [Collections.Generic.List[object]]::new()
$Bindings = [Collections.Generic.List[object]]::new()
function Bytes([string] $Relative, [byte[]] $Value)
{
    $path = Join-Path $Root $Relative
    [void][IO.Directory]::CreateDirectory((Split-Path $path))
    $stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $stream.Write($Value, 0, $Value.Length) } finally { $stream.Dispose() }
    return $path
}
function Json([string] $Relative, $Value)
{
    $path = Bytes $Relative $Utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 100))
    $null = [IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}
function Hash([byte[]] $Value) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Value)) }
function Blob([byte[]] $Value)
{
    $header = $Utf8.GetBytes("blob $($Value.Length)`0")
    $all = [byte[]]::new($header.Length + $Value.Length)
    [Array]::Copy($header, 0, $all, 0, $header.Length)
    [Array]::Copy($Value, 0, $all, $header.Length, $Value.Length)
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($all)).ToLowerInvariant()
}
function Guard([string] $Label)
{
    $raw = [IO.File]::ReadAllBytes((Join-Path $ParentRoot 'policy.json'))
    $copy = Bytes "guards\003-$Label.policy.json" $raw
    $p = $Utf8.GetString($raw) | ConvertFrom-Json
    $lease = Test-Path -LiteralPath (Join-Path $ParentRoot 'benchmark-exclusive.lease.json')
    $approved = $p.independentFindingPreparationWorkers.F212 -ceq $Agent -and
        $p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope -and
        $p.actualWorkerBuildHoldActive -eq $false -and $p.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null = Json "guards\003-$Label.admission.json" ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O'); policySnapshot = $copy; policySha256 = Hash $raw
        actualAgent = $p.independentFindingPreparationWorkers.F212; expectedAgent = $Agent
        exactScopeMatches = ($p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope)
        actualWorkerBuildHoldActive = $p.actualWorkerBuildHoldActive; buildAndTestWorkQuiesced = $p.buildAndTestWorkQuiesced
        benchmarkLeasePresent = $lease; admittedThisStartOnly = $approved; purpose = 'Read-only provenance/source, no workload'
    })
    if (-not $approved) { throw "Fresh F212 admission denied: $Label" }
}
function Native([string] $Label, [string] $Exe, [string[]] $Argv)
{
    Guard $Label
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $Exe; $info.WorkingDirectory = $Repo; $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true; $info.CreateNoWindow = $true
    foreach ($arg in $Argv) { $info.ArgumentList.Add($arg) }
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'; $info.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $info.Environment['GIT_PAGER'] = 'cat'; $info.Environment['GH_PAGER'] = 'cat'; $info.Environment['GH_PROMPT_DISABLED'] = '1'
    $outPath = Join-Path $Root "native\003-$Label.stdout"; $errPath = Join-Path $Root "native\003-$Label.stderr"
    [void][IO.Directory]::CreateDirectory((Split-Path $outPath))
    $outStream = [IO.File]::Open($outPath, [IO.FileMode]::CreateNew)
    $errStream = [IO.File]::Open($errPath, [IO.FileMode]::CreateNew)
    $process = [Diagnostics.Process]::new(); $process.StartInfo = $info
    $record = [ordered]@{
        label = "003-$Label"; executable = $Exe; argv = $Argv; workingDirectory = $Repo; ownerAgentId = $Agent
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
        [void]$outTask.GetAwaiter().GetResult()
        [void]$errTask.GetAwaiter().GetResult()
        $record.exitCode = $process.ExitCode; $record.rootTerminal = $process.HasExited
        $record.stdoutDrained = $true; $record.stderrDrained = $true
    }
    finally
    {
        $outStream.Dispose(); $errStream.Dispose(); $process.Dispose()
        $Native.Add([pscustomobject]$record)
        $null = Json "native\003-$Label.process.json" $record
    }
    if ($record.exitCode -ne 0) { throw "003-$Label exit $($record.exitCode); full streams retained." }
    return $Utf8.GetString([IO.File]::ReadAllBytes($outPath))
}
$self = [Diagnostics.Process]::GetCurrentProcess()
$null = Json 'collector-003.invocation.json' ([ordered]@{
    helperPath = $PSCommandPath; helperSha256 = Hash ([IO.File]::ReadAllBytes($PSCommandPath))
    processId = $PID; processStartUtc = $self.StartTime.ToUniversalTime().ToString('O')
    argv = [Environment]::GetCommandLineArgs(); commandLine = [Environment]::CommandLine; oneExecutionOnly = $true
    correction = 'Suppress CopyToAsync VoidTaskResult pipeline output; immutable002 completed one read-only HEAD root before wrapper failure. No002 replay.'
})
$self.Dispose()
try
{
    $registrationRaw = [IO.File]::ReadAllBytes((Join-Path $ParentRoot 'owner-registrations-233-234.json'))
    $registration = $Utf8.GetString($registrationRaw) | ConvertFrom-Json
    $ExpectedScope = [string]$registration.registrationScopes.F212
    if ($registration.registeredOwners.F212 -cne $Agent -or -not $ExpectedScope.StartsWith('233 PhotinoWebViewManager ')) { throw 'Initial exact scope/registration mismatch.' }
    $null = Bytes 'registrations\233234-observed003.json' $registrationRaw
    $null = [IO.File]::ReadAllText((Join-Path $Root 'acceptance-001.json')) | ConvertFrom-Json
    $headRecord = [IO.File]::ReadAllText((Join-Path $Root 'native\002-before-head.process.json')) | ConvertFrom-Json
    if (-not $headRecord.rootTerminal -or $headRecord.exitCode -ne 0 -or -not $headRecord.stdoutDrained -or -not $headRecord.stderrDrained) { throw 'Prior HEAD observation is not terminal.' }
    $head = [IO.File]::ReadAllText((Join-Path $Root 'native\002-before-head.stdout')).Trim()
    $branch = (Native 'before-branch' 'git' @('--no-optional-locks','-C',$Repo,'symbolic-ref','-q','HEAD')).Trim()
    $gitDir = (Native 'before-gitdir' 'git' @('--no-optional-locks','-C',$Repo,'rev-parse','--absolute-git-dir')).Trim()
    $status = Native 'before-status' 'git' @('--no-optional-locks','-C',$Repo,'status','--porcelain=v1','-uall')
    $untracked = [Collections.Generic.List[object]]::new()
    foreach ($line in ($status -split "`n"))
    {
        if (-not $line.Trim()) { continue }
        if (-not $line.StartsWith('?? ')) { throw "Unexpected tracked reserved change: $line" }
        $relative = $line.Substring(3).TrimEnd("`r").Replace('/','\')
        if ($relative.StartsWith('"')) { throw 'Quoted path needs separately reviewed collector.' }
        $raw = [IO.File]::ReadAllBytes((Join-Path $Repo $relative))
        $copy = Bytes "reserved\before003\untracked\$relative" $raw
        $untracked.Add([pscustomobject]@{ path = $relative; bytes = $raw.Length; sha256 = Hash $raw; retainedCopy = $copy })
    }
    $headBytes = [IO.File]::ReadAllBytes((Join-Path $gitDir 'HEAD')); $indexBytes = [IO.File]::ReadAllBytes((Join-Path $gitDir 'index'))
    $null = Bytes 'reserved\before003\HEAD' $headBytes; $null = Bytes 'reserved\before003\index' $indexBytes
    $null = Json 'reserved\before003.snapshot.json' ([ordered]@{
        role = 'ReservedNavigationOnly_NotDefault'; head = $head; branch = $branch; gitDirectory = $gitDir; status = $status
        headFileSha256 = Hash $headBytes; indexSha256 = Hash $indexBytes; untracked = @($untracked.ToArray())
    })
    if ($head -cne '24875ef5dabb55567870b39f6eb0002170435e2f' -or
        $branch -cne 'refs/heads/autoperf/F145-hoist-large-response-utf8-encoding' -or $untracked.Count -ne 4)
    { throw 'Reserved HEAD/branch/four-report invariant mismatch.' }
    $main = (Native 'github-main' 'gh' @('api','--method','GET','repos/dotnet/aspnetcore/branches/main')) | ConvertFrom-Json
    $Default = [string]$main.commit.sha
    if ($Default -notmatch '^[0-9a-f]{40}$') { throw 'No exact main commit pin in GitHub response.' }
    $null = Json 'source-pins-003.json' ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O'); repository = 'dotnet/aspnetcore'; originalCommit = $Original
        defaultCommit = $Default; defaultTree = $main.commit.commit.tree.sha; defaultObservation = 'native\003-github-main.stdout'
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
    $parts = [Collections.Generic.List[string]]::new()
    foreach ($role in @(@('o',$Original),@('d',$Default)))
    {
        $prefix = $role[0]; $commit = $role[1]
        $parts.Add("${prefix}Commit:object(oid:`"$commit`"){... on Commit{oid tree{oid}}}")
        for ($i = 0; $i -lt $paths.Count; $i++) { $parts.Add("${prefix}${i}:object(expression:`"$($commit):$($paths[$i])`"){... on Blob{oid byteSize text}}") }
    }
    $query = 'query{repository(owner:"dotnet",name:"aspnetcore"){' + ($parts -join ' ') + '}}'
    $null = Bytes 'github-source-query-003.graphql' $Utf8.GetBytes($query)
    $data = (Native 'github-source-roles' 'gh' @('api','graphql','-f',"query=$query")) | ConvertFrom-Json
    if ($data.errors) { throw 'GraphQL returned errors; raw response retained without fallback.' }
    foreach ($role in @(@('Original','o',$Original),@('Default','d',$Default)))
    {
        $name = $role[0]; $prefix = $role[1]; $commit = $role[2]; $commitData = $data.data.repository.("${prefix}Commit")
        if ($commitData.oid -cne $commit) { throw "$name commit binding mismatch." }
        for ($i = 0; $i -lt $paths.Count; $i++)
        {
            $item = $data.data.repository.("${prefix}${i}"); $apiPath = $paths[$i]
            if ($null -eq $item)
            {
                $Bindings.Add([pscustomobject]@{ repository = 'dotnet/aspnetcore'; role = $name; commit = $commit; tree = $commitData.tree.oid; path = $apiPath; present = $false; evidence = 'native\003-github-source-roles.stdout' })
                continue
            }
            if ($null -eq $item.text) { throw "Missing full source text: $name $apiPath" }
            $raw = $Utf8.GetBytes([string]$item.text); $id = Blob $raw; $sha = Hash $raw
            if ($id -cne $item.oid -or $raw.Length -ne $item.byteSize) { throw "Source byte/blob mismatch: $name $apiPath" }
            $saved = Bytes ("sources\$name\" + $apiPath.Replace('/','\')) $raw
            $localPath = Join-Path $Repo $apiPath.Replace('/','\')
            $localSha = if ([IO.File]::Exists($localPath)) { Hash ([IO.File]::ReadAllBytes($localPath)) } else { $null }
            $Bindings.Add([pscustomobject]@{
                repository = 'dotnet/aspnetcore'; role = $name; commit = $commit; tree = $commitData.tree.oid; path = $apiPath; present = $true
                blob = $item.oid; recomputedGitBlob = $id; bytes = $raw.Length; sha256 = $sha; savedPath = $saved
                reservedNavigationBytesMatch = ($localSha -ceq $sha); evidence = 'native\003-github-source-roles.stdout'
            })
        }
    }
    $null = Json 'source-memberships-003.json' @($Bindings.ToArray())
    $manager = 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'
    foreach ($role in @(@('Original',$Original),@('Default',$Default)))
    {
        $endpoint = "repos/dotnet/aspnetcore/commits?sha=$($role[1])&path=$manager&per_page=6"
        $null = (Native "github-history-$($role[0])" 'gh' @('api','--method','GET',$endpoint)) | ConvertFrom-Json
    }
    $null = Json 'collector-003.result.json' ([ordered]@{
        state = 'SOURCE_ROLES_FROZEN'; originalCommit = $Original; defaultCommit = $Default; memberships = $Bindings.Count
        nativeRoots = @($Native.ToArray()); builds = @(); tests = @(); candidateCreated = $false; noRuntimeOrPerformanceClaim = $true
    })
    Write-Output "SOURCE_ROLES_FROZEN Original=$Original Default=$Default memberships=$($Bindings.Count) nativeRoots=$($Native.Count)"
}
catch
{
    $failure = $_ | Format-List * -Force | Out-String
    $null = Bytes 'collector-003.failure.txt' $Utf8.GetBytes($failure)
    $null = Json 'collector-003.failure.json' ([ordered]@{ state = 'FAILED_NO_SUCCESS_FALLBACK'; exception = $failure; nativeRoots = @($Native.ToArray()); retainedMemberships = @($Bindings.ToArray()) })
    Write-Error -ErrorAction Continue $failure
    exit 1
}
