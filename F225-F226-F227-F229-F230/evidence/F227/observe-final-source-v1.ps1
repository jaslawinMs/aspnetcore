$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = '.\observer-final-source-v1.json'
$indexPath = Join-Path $PSScriptRoot 'WHOLE-SEAL-v1.json'
if ([IO.File]::Exists($receiptPath) -or [IO.File]::Exists($indexPath)) { throw 'Single-use final outside observer cannot be replayed.' }
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$par = Split-Path -Parent $PSScriptRoot
function Get-Digest([string] $Path)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($Path)))
}
function Observe-Identity([int] $ProcessId)
{
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
}
function Get-Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        ownerId = $policy.independentFindingPreparationWorkers.F227
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F227
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        leasePath = Join-Path $par 'benchmark-exclusive.lease.json'
        leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    }
    [IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "$Label.policy.json"), $bytes)
    if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw "Fresh F227 exact-scope outside-observer guard denied at $Label." }
    return $guard
}
$record = [ordered]@{
    observerPid = $PID
    observerIdentity = Observe-Identity $PID
    observerScriptSha256 = Get-Digest $PSCommandPath
    startedUtc = [DateTime]::UtcNow.ToString('o')
    guard = $null
    sealGuard = $null
    rootPid = $null
    rootIdentity = $null
    executable = (Get-Command pwsh.exe -CommandType Application).Source
    argv = @('-NoProfile', '-NonInteractive', '-File', '.\collect-final-source-v1.ps1')
    workingDirectory = $PSScriptRoot
    helperSha256 = Get-Digest '.\collect-final-source-v1.ps1'
    stdoutPath = 'final-source-v1.stdout.bin'
    stderrPath = 'final-source-v1.stderr.bin'
    rootWaitMilliseconds = 300000
    rootWaitReturned = $false
    rootExitCode = $null
    stdoutDrainCompleted = $false
    stderrDrainCompleted = $false
    observedChildren = @()
    observedChildTerminals = @()
    failure = $null
    state = 'running'
    actualOuterToolExit = 'Not self-attested. Bind the actual enclosing tool completion after this observer and its seal return.'
    transportBoundary = 'Raw final-collector stdout/stderr are retained. The final observer tool transport is rendered by the caller and is not included as purported raw bytes in its own completed index.'
}
function Save-Receipt
{
    [IO.File]::WriteAllText($receiptPath, ($record | ConvertTo-Json -Depth 25) + "`n", $utf8)
}
$p = [Diagnostics.Process]::new()
$out = $null
$err = $null
try
{
    Save-Receipt
    $record.guard = Get-Guard 'observer-final-source-v1'
    $parseResults = @()
    foreach ($path in @('collect-final-source-v1.ps1', 'observe-final-source-v1.ps1'))
    {
        $tokens = $null
        $errors = $null
        $null = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $path), [ref]$tokens, [ref]$errors)
        $parseResults += @{ path = $path; sha256 = Get-Digest $path; parseErrors = @($errors | ForEach-Object { @{ message = $_.Message; extent = $_.Extent.Text } }) }
    }
    $jsonChecks = @()
    foreach ($path in @('acceptance-v1.json', 'assessment-v1.json', 'tool-observations-v1.json', 'outer-tool-return-observations-v1.json', 'collection-source-v1.json', 'collection-contract-history-v1.json', 'inspection-source-bindings-v1.json', 'navigation-mismatch-bindings-v1.json'))
    {
        $null = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $path)) | ConvertFrom-Json -ErrorAction Stop
        $jsonChecks += @{ path = $path; sha256 = Get-Digest $path; parsed = $true }
    }
    [IO.File]::WriteAllText('.\final-helper-parse-v1.json', (@{ processId = $PID; observedUtc = [DateTime]::UtcNow.ToString('o'); powershellSourceOnly = $parseResults; json = $jsonChecks; boundary = 'Language/JSON parsing only; no product compilation, SDK, test or runtime invocation.' } | ConvertTo-Json -Depth 12) + "`n", $utf8)
    if (@($parseResults | ForEach-Object parseErrors).Count -ne 0) { throw 'Final helper parse errors are retained; do not execute or replay.' }
    $p.StartInfo.FileName = $record.executable
    $p.StartInfo.WorkingDirectory = $PSScriptRoot
    $p.StartInfo.UseShellExecute = $false
    $p.StartInfo.RedirectStandardOutput = $true
    $p.StartInfo.RedirectStandardError = $true
    $p.StartInfo.CreateNoWindow = $true
    foreach ($arg in $record.argv) { $p.StartInfo.ArgumentList.Add($arg) }
    $out = [IO.File]::Open((Join-Path $PSScriptRoot $record.stdoutPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $err = [IO.File]::Open((Join-Path $PSScriptRoot $record.stderrPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $record.launchGuard = Get-Guard 'observer-final-source-launch-v1'
    if (-not $p.Start()) { throw 'Final source collector failed to start.' }
    $record.rootPid = $p.Id
    $ot = $p.StandardOutput.BaseStream.CopyToAsync($out)
    $et = $p.StandardError.BaseStream.CopyToAsync($err)
    $record.rootIdentity = Observe-Identity $p.Id
    $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
    $record.rootWaitReturned = $p.WaitForExit($record.rootWaitMilliseconds)
    if (-not $record.rootWaitReturned)
    {
        Stop-Process -Id $p.Id -Force
        $p.WaitForExit()
    }
    $null = $ot.GetAwaiter().GetResult()
    $record.stdoutDrainCompleted = $true
    $null = $et.GetAwaiter().GetResult()
    $record.stderrDrainCompleted = $true
    $record.rootExitCode = $p.ExitCode
    if (-not $record.rootWaitReturned) { throw 'Final collector exceeded the finite root wait; its owned root was stopped by exact PID.' }
    if ($record.rootExitCode -ne 0) { throw "Final collector exited $($record.rootExitCode); its raw failed outcome is retained." }
}
catch { $record.failure = $_.Exception.ToString(); $record.state = 'failed' }
finally
{
    if ($null -ne $out) { $out.Dispose() }
    if ($null -ne $err) { $err.Dispose() }
    $p.Dispose()
    foreach ($stream in @('stdout', 'stderr'))
    {
        $path = Join-Path $PSScriptRoot $record["${stream}Path"]
        if ([IO.File]::Exists($path))
        {
            $record["${stream}Bytes"] = ([IO.FileInfo]::new($path)).Length
            $record["${stream}Sha256"] = Get-Digest $path
        }
    }
    foreach ($child in $record.observedChildren)
    {
        $after = Observe-Identity $child.ProcessId
        $terminal = [ordered]@{
            processId = $child.ProcessId; originalCreationDate = $child.CreationDate
            observedUtc = [DateTime]::UtcNow.ToString('o')
            absentOrDifferentIdentity = ($null -eq $after -or $after.CreationDate -ne $child.CreationDate)
            handleWaitReturned = $false; handleExitCode = $null
            currentIdentity = $after
        }
        if (-not $terminal.absentOrDifferentIdentity)
        {
            $cp = [Diagnostics.Process]::GetProcessById($child.ProcessId)
            try
            {
                $terminal.handleWaitReturned = $cp.WaitForExit(30000)
                if ($terminal.handleWaitReturned) { $terminal.handleExitCode = $cp.ExitCode }
            }
            finally { $cp.Dispose() }
        }
        $record.observedChildTerminals += $terminal
    }
    $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
    Save-Receipt
}
if ($record.state -eq 'failed') { throw $record.failure }
if ($record.rootPid -eq $record.observerPid) { throw 'Final collector/outside-observer PIDs are not distinct.' }
foreach ($terminal in $record.observedChildTerminals)
{
    if (-not $terminal.absentOrDifferentIdentity -and -not $terminal.handleWaitReturned) { throw 'An observed final-collector child lacks a terminal bounded observation.' }
}
$record.sealGuard = Get-Guard 'observer-final-seal-v1'
$final = [IO.File]::ReadAllText('.\collection-final-source-v1.json') | ConvertFrom-Json
if ($final.state -cne 'completed' -or $null -ne $final.failure -or $final.nativeReadRootCount -ne 25 -or $final.scriptSha256 -cne $record.helperSha256) { throw 'Final source-closure result is not the bound expected successful result.' }
if ((Get-Digest $PSCommandPath) -cne $record.observerScriptSha256) { throw 'The executing final observer helper bytes changed.' }
$record.state = 'completed-root-observed-streams-drained-ready-to-index'
$record.finishedUtc = [DateTime]::UtcNow.ToString('o')
Save-Receipt
$assessment = [IO.File]::ReadAllText('.\assessment-v1.json') | ConvertFrom-Json
$sourceObserver = [IO.File]::ReadAllText('.\observer-source-v1.json') | ConvertFrom-Json
$contractObserver = [IO.File]::ReadAllText('.\observer-contract-history-v1.json') | ConvertFrom-Json
$pairs = @($sourceObserver, $contractObserver, [pscustomobject]$record)
$files = @()
foreach ($path in [IO.Directory]::EnumerateFiles($PSScriptRoot, '*', [IO.SearchOption]::AllDirectories))
{
    if ($path -ceq $indexPath) { continue }
    $files += [ordered]@{
        path = [IO.Path]::GetRelativePath($PSScriptRoot, $path)
        bytes = ([IO.FileInfo]::new($path)).Length
        sha256 = Get-Digest $path
    }
}
$files = @($files | Sort-Object path)
$index = [ordered]@{
    schemaVersion = 1
    finding = 'F227'
    scope = '257'
    ownerBackgroundId = $acceptance.ownerBackgroundId
    decision = $assessment.decision
    createdUtc = [DateTime]::UtcNow.ToString('o')
    indexSelfReferenceExclusion = 'WHOLE-SEAL-v1.json only. Its exact bytes/SHA256 are returned to the caller; no self-hash is claimed.'
    enclosingToolCompletion = 'Not claimed inside this index. The owner must report the actual returned final enclosing-tool result, without altering this sealed tree.'
    wholeTreeMembershipBoundary = 'All completed regular files recursively under finding-F227-257 except this index itself; no writes follow index creation. Raw source-reader/collector streams are included. Outer tool transport is rendered and is not invented as raw bytes.'
    verificationBoundary = 'Every listed size/hash and the full exact membership set are checked again after the one-time index write. Source-only process receipts, not universal descendant/runtime completion.'
    originalCommit = $assessment.identities.Original
    defaultBranch = $assessment.identities.defaultBranch
    defaultCommit = $assessment.identities.Default
    commonRuntimeReferenceCommitNotSelectedRuntime = $assessment.identities.commonRuntimeReferenceCommit
    assessmentPath = 'assessment-v1.json'
    assessmentSha256 = Get-Digest '.\assessment-v1.json'
    indexFileCount = $files.Count
    indexTotalBytes = ($files | Measure-Object bytes -Sum).Sum
    finalClosure = @{ path = 'collection-final-source-v1.json'; sha256 = Get-Digest '.\collection-final-source-v1.json'; sourceBindingsVerified = @($final.fileVerifications).Count; preFinalFilesVerified = $final.preFinalFilesVerified }
    bounds = $final.bounds
    nativeUtilityRootCount = $final.nativeReadRootCount
    nativeRootPids = $final.nativeRootPids
    nativeObservedChildCount = $final.nativeObservedChildCount
    nativeObservedChildTerminalCount = $final.nativeObservedChildTerminalCount
    collectorObserverPairs = @($pairs | ForEach-Object {
        @{
            collectorPid = $_.rootPid; collectorIdentity = $_.rootIdentity
            observerPid = $_.observerPid; observerIdentity = $_.observerIdentity
            rootWaitReturned = $_.rootWaitReturned; rootExitCode = $_.rootExitCode
            stdout = @{ path = $_.stdoutPath; bytes = $_.stdoutBytes; sha256 = $_.stdoutSha256; drainCompleted = $_.stdoutDrainCompleted }
            stderr = @{ path = $_.stderrPath; bytes = $_.stderrBytes; sha256 = $_.stderrSha256; drainCompleted = $_.stderrDrainCompleted }
            observedChildren = @($_.observedChildren); observedChildTerminals = @($_.observedChildTerminals)
        }
    })
    directOfflineToolProcessPids = @(26148, 53356)
    directOfflineToolBoundary = 'Their actual returned exit-0 tool observations and structured results are retained. No separate raw outer-tool transport is claimed for them.'
    processBoundary = 'Root handle waits and both stream drains establish the recorded roots, with bounded observed-child terminal receipts. Missing/reused identities are not observed child exit codes. There is no claim of observing every descendant or unrelated process.'
    preservedReports = $final.preservedReports
    reservedHead = $final.navigationHead
    reservedBranch = $final.navigationBranch
    navigationStatusExactlyMatchesInitialRawBytes = $final.navigationStatusExactlyMatchesInitialRawBytes
    finalGitIndexFingerprintInterval = $final.finalCheckIndexInterval
    sourceOnly = $true
    noCandidateOrRuntimeQualification = $true
    sharedStateOrPublicationChanges = $false
    files = $files
}
$stream = [IO.File]::Open($indexPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try { $stream.Write($utf8.GetBytes(($index | ConvertTo-Json -Depth 30) + "`n")) }
finally { $stream.Dispose() }
$serializedIndex = [IO.File]::ReadAllText($indexPath) | ConvertFrom-Json
if (@($serializedIndex.files).Count -ne $files.Count) { throw 'Serialized index membership count differs.' }
$afterPaths = @([IO.Directory]::EnumerateFiles($PSScriptRoot, '*', [IO.SearchOption]::AllDirectories) | Where-Object { $_ -cne $indexPath } | ForEach-Object { [IO.Path]::GetRelativePath($PSScriptRoot, $_) } | Sort-Object)
$expectedPaths = @($serializedIndex.files | ForEach-Object path | Sort-Object)
if ($afterPaths.Count -ne $expectedPaths.Count -or ($afterPaths -cjoin "`n") -cne ($expectedPaths -cjoin "`n")) { throw 'Finished tree membership changed during seal.' }
foreach ($file in $serializedIndex.files)
{
    $path = Join-Path $PSScriptRoot $file.path
    if (([IO.FileInfo]::new($path)).Length -ne $file.bytes -or (Get-Digest $path) -cne $file.sha256) { throw "Final indexed-file fingerprint mismatch: $($file.path)" }
}
[ordered]@{
    state = 'whole-tree-index-written-and-all-membership-and-fingerprints-verified'
    decision = $assessment.decision
    indexPath = $indexPath
    indexSha256 = Get-Digest $indexPath
    indexedFiles = $index.indexFileCount
    indexedBytes = $index.indexTotalBytes
    treeFilesIncludingIndex = $index.indexFileCount + 1
    nativeRootCount = $final.nativeReadRootCount
    nativeRootPids = $final.nativeRootPids
    nativeObservedChildren = $final.nativeObservedChildCount
    nativeObservedChildTerminals = $final.nativeObservedChildTerminalCount
    collectorObserverPairs = @($pairs | ForEach-Object { @{ collectorPid = $_.rootPid; observerPid = $_.observerPid; exit = $_.rootExitCode; rootWait = $_.rootWaitReturned; bothStreamsDrained = ($_.stdoutDrainCompleted -and $_.stderrDrainCompleted); observedChildren = @($_.observedChildren).Count; observedChildTerminals = @($_.observedChildTerminals).Count } })
    finalCollectorRawStreams = @{ stdoutBytes = $record.stdoutBytes; stdoutSha256 = $record.stdoutSha256; stderrBytes = $record.stderrBytes; stderrSha256 = $record.stderrSha256 }
    outerCompletionBoundary = 'This output does not self-attest the enclosing tool return; bind its actual returned result next.'
} | ConvertTo-Json -Depth 7
