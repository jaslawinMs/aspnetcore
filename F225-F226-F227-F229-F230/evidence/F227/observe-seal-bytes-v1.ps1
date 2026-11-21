$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = '.\observer-seal-bytes-v1.json'
$indexPath = Join-Path $PSScriptRoot 'WHOLE-SEAL-v1.json'
if ([IO.File]::Exists($receiptPath) -or [IO.File]::Exists($indexPath)) { throw 'Single-use byte-seal observer cannot be replayed or replace an index.' }
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$par = Split-Path -Parent $PSScriptRoot
function Digest([string] $Path)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($Path)))
}
function Identity([int] $ProcessId)
{
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
}
function Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $point = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o'); ownerId = $policy.independentFindingPreparationWorkers.F227
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F227
        hold = $policy.actualWorkerBuildHoldActive; quiesced = $policy.buildAndTestWorkQuiesced
        leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    }
    [IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "$Label.policy.json"), $bytes)
    if ($point.ownerId -cne $acceptance.ownerBackgroundId -or $point.scope -cne $acceptance.registeredScopeExact -or $point.ownerCount -gt 4 -or $point.hold -ne $false -or $point.quiesced -ne $false -or $point.leaseExists) { throw 'Fresh exact-scope byte-seal observer guard denied.' }
    return $point
}
$record = [ordered]@{
    observerPid = $PID; observerIdentity = Identity $PID; observerScriptSha256 = Digest $PSCommandPath
    startedUtc = [DateTime]::UtcNow.ToString('o'); guard = $null; launchGuard = $null; sealGuard = $null
    rootPid = $null; rootIdentity = $null
    executable = (Get-Command pwsh.exe -CommandType Application).Source
    argv = @('-NoProfile', '-NonInteractive', '-File', '.\verify-seal-bytes-v1.ps1')
    workingDirectory = $PSScriptRoot; helperSha256 = Digest '.\verify-seal-bytes-v1.ps1'
    stdoutPath = 'seal-bytes-v1.stdout.bin'; stderrPath = 'seal-bytes-v1.stderr.bin'
    rootWaitReturned = $false; rootExitCode = $null
    stdoutDrainCompleted = $false; stderrDrainCompleted = $false
    observedChildren = @(); observedChildTerminals = @()
    state = 'running'; failure = $null
    actualOuterToolExit = 'Not self-attested. The owner reports the actual completed enclosing byte-seal tool return after this script returns.'
    boundary = 'Byte-only verifier root; no Git/gh reader is replayed. Raw verifier streams are retained. The final observer tool transport is rendered, not invented as raw bytes in its own index.'
}
$p = [Diagnostics.Process]::new()
$out = $null
$err = $null
try
{
    $record.guard = Guard 'observer-seal-bytes-v1'
    $parseRecords = @()
    foreach ($path in @('verify-seal-bytes-v1.ps1', 'observe-seal-bytes-v1.ps1'))
    {
        $tokens = $null; $errors = $null
        $null = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $path), [ref]$tokens, [ref]$errors)
        $parseRecords += @{ path = $path; sha256 = Digest $path; errors = @($errors | ForEach-Object { $_.Message }) }
    }
    [IO.File]::WriteAllText('.\seal-bytes-helper-parse-v1.json', (@{ processId = $PID; parseOnly = $true; helpers = $parseRecords } | ConvertTo-Json -Depth 10) + "`n", $utf8)
    if (@($parseRecords | ForEach-Object errors).Count -ne 0) { throw 'New byte-seal helper parse error; retained without executing its root.' }
    $p.StartInfo.FileName = $record.executable; $p.StartInfo.WorkingDirectory = $PSScriptRoot
    $p.StartInfo.UseShellExecute = $false; $p.StartInfo.CreateNoWindow = $true
    $p.StartInfo.RedirectStandardOutput = $true; $p.StartInfo.RedirectStandardError = $true
    foreach ($arg in $record.argv) { $p.StartInfo.ArgumentList.Add($arg) }
    $out = [IO.File]::Open((Join-Path $PSScriptRoot $record.stdoutPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $err = [IO.File]::Open((Join-Path $PSScriptRoot $record.stderrPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $record.launchGuard = Guard 'observer-seal-bytes-launch-v1'
    if (-not $p.Start()) { throw 'Byte verifier did not start.' }
    $record.rootPid = $p.Id
    $ot = $p.StandardOutput.BaseStream.CopyToAsync($out); $et = $p.StandardError.BaseStream.CopyToAsync($err)
    $record.rootIdentity = Identity $p.Id
    $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
    $record.rootWaitReturned = $p.WaitForExit(120000)
    if (-not $record.rootWaitReturned) { Stop-Process -Id $p.Id -Force; $p.WaitForExit() }
    $null = $ot.GetAwaiter().GetResult(); $record.stdoutDrainCompleted = $true
    $null = $et.GetAwaiter().GetResult(); $record.stderrDrainCompleted = $true
    $record.rootExitCode = $p.ExitCode
    if (-not $record.rootWaitReturned -or $record.rootExitCode -ne 0) { throw "Byte verifier wait/exit failed: $($record.rootExitCode)." }
}
catch { $record.failure = $_.Exception.ToString(); $record.state = 'failed' }
finally
{
    if ($null -ne $out) { $out.Dispose() }
    if ($null -ne $err) { $err.Dispose() }
    $p.Dispose()
    foreach ($name in @('stdout', 'stderr'))
    {
        $path = Join-Path $PSScriptRoot $record["${name}Path"]
        if ([IO.File]::Exists($path)) { $record["${name}Bytes"] = ([IO.FileInfo]::new($path)).Length; $record["${name}Sha256"] = Digest $path }
    }
    foreach ($child in $record.observedChildren)
    {
        $after = Identity $child.ProcessId
        $terminal = @{ processId = $child.ProcessId; creationDate = $child.CreationDate; observedUtc = [DateTime]::UtcNow.ToString('o'); absentOrDifferentIdentity = ($null -eq $after -or $after.CreationDate -ne $child.CreationDate); handleWaitReturned = $false; handleExitCode = $null }
        if (-not $terminal.absentOrDifferentIdentity)
        {
            $cp = [Diagnostics.Process]::GetProcessById($child.ProcessId)
            try { $terminal.handleWaitReturned = $cp.WaitForExit(30000); if ($terminal.handleWaitReturned) { $terminal.handleExitCode = $cp.ExitCode } }
            finally { $cp.Dispose() }
        }
        $record.observedChildTerminals += $terminal
    }
    $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText($receiptPath, ($record | ConvertTo-Json -Depth 20) + "`n", $utf8)
}
if ($record.state -eq 'failed') { throw $record.failure }
if ($record.rootPid -eq $record.observerPid) { throw 'Byte-verifier and outside-observer PIDs are not distinct.' }
foreach ($terminal in $record.observedChildTerminals)
{
    if (-not $terminal.absentOrDifferentIdentity -and -not $terminal.handleWaitReturned) { throw 'Observed byte-verifier child lacks a bounded terminal receipt.' }
}
$record.sealGuard = Guard 'observer-seal-bytes-final-v1'
$verification = [IO.File]::ReadAllText('.\verification-seal-bytes-v1.json') | ConvertFrom-Json
if ($verification.state -cne 'completed' -or $verification.scriptSha256 -cne $record.helperSha256 -or $verification.nativeReadRootCount -ne 25 -or $verification.additionalGitGhStarts -ne 0) { throw 'Byte-verifier result is not the bound expected source-only result.' }
if ((Digest $PSCommandPath) -cne $record.observerScriptSha256) { throw 'Executing byte-seal observer helper changed.' }
$record.state = 'completed-root-observed-streams-drained-ready-to-index'
$record.finishedUtc = [DateTime]::UtcNow.ToString('o')
[IO.File]::WriteAllText($receiptPath, ($record | ConvertTo-Json -Depth 20) + "`n", $utf8)
$assessment = [IO.File]::ReadAllText('.\assessment-v1.json') | ConvertFrom-Json
$final = [IO.File]::ReadAllText('.\collection-final-source-v1.json') | ConvertFrom-Json
$pairs = @()
foreach ($path in @('observer-source-v1.json', 'observer-contract-history-v1.json', 'observer-final-source-v2.json'))
{
    $pair = [IO.File]::ReadAllText($path) | ConvertFrom-Json
    $pairs += @{ receipt = $path; collectorPid = $pair.rootPid; collectorIdentity = $pair.rootIdentity; observerPid = $pair.observerPid; observerIdentity = $pair.observerIdentity; rootWait = $pair.rootWaitReturned; rootExitCode = $pair.rootExitCode; stdoutPath = $pair.stdoutPath; stdoutBytes = $pair.stdoutBytes; stdoutSha256 = $pair.stdoutSha256; stdoutDrained = $pair.stdoutDrainCompleted; stderrPath = $pair.stderrPath; stderrBytes = $pair.stderrBytes; stderrSha256 = $pair.stderrSha256; stderrDrained = $pair.stderrDrainCompleted; observedChildren = @($pair.observedChildren); observedChildTerminals = @($pair.observedChildTerminals); actualReturnedOuterToolExit = $(if ($path -eq 'observer-final-source-v2.json') { 1 } else { 0 }) }
}
$files = @()
[long]$totalBytes = 0
foreach ($path in [IO.Directory]::EnumerateFiles($PSScriptRoot, '*', [IO.SearchOption]::AllDirectories))
{
    if ($path -ceq $indexPath) { continue }
    [long]$size = ([IO.FileInfo]::new($path)).Length
    $totalBytes += $size
    $files += [ordered]@{ path = [IO.Path]::GetRelativePath($PSScriptRoot, $path); bytes = $size; sha256 = Digest $path }
}
$files = @($files | Sort-Object { $_.path })
$index = [ordered]@{
    schemaVersion = 1; finding = 'F227'; scope = '257'; ownerBackgroundId = $acceptance.ownerBackgroundId
    decision = $assessment.decision; createdUtc = [DateTime]::UtcNow.ToString('o')
    indexSelfReferenceExclusion = 'WHOLE-SEAL-v1.json only. Exact index SHA256 is returned to caller; no self-hash.'
    enclosingToolCompletion = 'Not self-attested. Owner must report actual completed final byte-seal outer tool return after this script returns, without changing this sealed tree.'
    wholeTreeMembershipBoundary = 'All completed regular files recursively under finding-F227-257 except this index; no writes follow index creation. Raw source-reader/collector/verifier streams are included. Outer tool transport is rendered, not invented as raw bytes.'
    verificationBoundary = 'Success is emitted only after post-write exact membership, sizes and hashes of every serialized index entry are checked.'
    originalCommit = $assessment.identities.Original; defaultBranch = $assessment.identities.defaultBranch; defaultCommit = $assessment.identities.Default
    commonRuntimeReferenceCommitNotSelectedRuntime = $assessment.identities.commonRuntimeReferenceCommit
    assessment = @{ path = 'assessment-v1.json'; sha256 = Digest '.\assessment-v1.json' }
    finalSourceClosure = @{ path = 'collection-final-source-v1.json'; sha256 = Digest '.\collection-final-source-v1.json' }
    byteVerification = @{ path = 'verification-seal-bytes-v1.json'; sha256 = Digest '.\verification-seal-bytes-v1.json'; retainedBindingsVerified = @($verification.verifiedBindings).Count }
    finalOutsideObserver = @{ path = 'observer-seal-bytes-v1.json'; sha256 = Digest $receiptPath }
    indexedFiles = $files.Count; indexedBytes = $totalBytes
    bounds = $final.bounds; nativeRootCount = 25; nativeRootPids = $final.nativeRootPids
    nativeObservedChildren = $final.nativeObservedChildCount; nativeObservedChildTerminals = $final.nativeObservedChildTerminalCount
    sourceCollectorObserverPairs = $pairs
    finalByteVerifierObserver = @{ rootPid = $record.rootPid; rootIdentity = $record.rootIdentity; observerPid = $record.observerPid; observerIdentity = $record.observerIdentity; rootWait = $record.rootWaitReturned; rootExitCode = $record.rootExitCode; stdoutPath = $record.stdoutPath; stdoutBytes = $record.stdoutBytes; stdoutSha256 = $record.stdoutSha256; stdoutDrained = $record.stdoutDrainCompleted; stderrPath = $record.stderrPath; stderrBytes = $record.stderrBytes; stderrSha256 = $record.stderrSha256; stderrDrained = $record.stderrDrainCompleted; observedChildren = @($record.observedChildren); observedChildTerminals = @($record.observedChildTerminals); newGitGhStarts = 0 }
    actualPriorFailedOuterTools = @(@{ outcome = 'source-finalization-failed-attempt-v1.json'; exit = 1; phase = 'PowerShell parse before body'; gitGhStarts = 0; outerPid = $null }, @{ outcome = 'source-finalization-failed-attempt-v2.json'; exit = 1; phase = 'Index metadata construction after successful collector root closure'; rootAndObserver = 'observer-final-source-v2.json' })
    directOfflineToolProcessPids = @(26148, 53356)
    directOfflineBoundary = 'Their actual returned exit-0 tool observations and structured results are retained. No separate raw outer-tool transport is claimed.'
    processBoundary = 'Recorded root-handle waits, both raw stream drains and bounded observed-child terminal receipts only. Identity absence/reuse is not an observed exit code. No universal descendants, unrelated-process absence, browser or runtime completion claim.'
    reservedHead = $final.navigationHead; reservedBranch = $final.navigationBranch
    statusExactlyMatchesInitialRawBytes = $final.navigationStatusExactlyMatchesInitialRawBytes
    preservedReports = $final.preservedReports; finalGitIndexFingerprintInterval = $final.finalCheckIndexInterval
    sourceOnly = $true; candidateOrRuntimeQualification = $false; sharedOrPublicationWrites = $false
    files = $files
}
$stream = [IO.File]::Open($indexPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try { $stream.Write($utf8.GetBytes(($index | ConvertTo-Json -Depth 30) + "`n")) }
finally { $stream.Dispose() }
$serialized = [IO.File]::ReadAllText($indexPath) | ConvertFrom-Json
$after = @([IO.Directory]::EnumerateFiles($PSScriptRoot, '*', [IO.SearchOption]::AllDirectories) | Where-Object { $_ -cne $indexPath } | ForEach-Object { [IO.Path]::GetRelativePath($PSScriptRoot, $_) } | Sort-Object)
$expected = @($serialized.files | ForEach-Object { $_.path } | Sort-Object)
if ($after.Count -ne $expected.Count -or ($after -join "`n") -cne ($expected -join "`n")) { throw 'Exact final tree membership changed during seal.' }
[long]$checkedBytes = 0
foreach ($file in $serialized.files)
{
    $path = Join-Path $PSScriptRoot $file.path
    if (([IO.FileInfo]::new($path)).Length -ne $file.bytes -or (Digest $path) -cne $file.sha256) { throw "Indexed-file fingerprint mismatch: $($file.path)" }
    $checkedBytes += [long]$file.bytes
}
if ($checkedBytes -ne $totalBytes -or @($serialized.files).Count -ne $files.Count) { throw 'Final verified size/count differs.' }
[ordered]@{
    state = 'complete-tree-membership-and-every-byte-fingerprint-verified'
    decision = $assessment.decision; indexPath = $indexPath; indexSha256 = Digest $indexPath
    indexedFiles = $files.Count; indexedBytes = $checkedBytes; treeFilesIncludingIndex = $files.Count + 1
    nativeRootCount = 25; nativeRootPids = $final.nativeRootPids
    nativeObservedChildren = $final.nativeObservedChildCount; nativeObservedChildTerminals = $final.nativeObservedChildTerminalCount
    sourceCollectorObserverPairs = @($pairs | ForEach-Object { @{ rootPid = $_.collectorPid; observerPid = $_.observerPid; rootExit = $_.rootExitCode; rootWait = $_.rootWait; stdoutDrained = $_.stdoutDrained; stderrDrained = $_.stderrDrained; observedChildren = @($_.observedChildren).Count; observedChildTerminals = @($_.observedChildTerminals).Count; actualPriorOuterExit = $_.actualReturnedOuterToolExit } })
    byteVerifierObserver = @{ rootPid = $record.rootPid; observerPid = $record.observerPid; rootExit = $record.rootExitCode; rootWait = $record.rootWaitReturned; bothStreamsDrained = ($record.stdoutDrainCompleted -and $record.stderrDrainCompleted); observedChildren = @($record.observedChildren).Count; observedChildTerminals = @($record.observedChildTerminals).Count; stdoutBytes = $record.stdoutBytes; stdoutSha256 = $record.stdoutSha256; stderrBytes = $record.stderrBytes; stderrSha256 = $record.stderrSha256 }
    preservedFailedOuterFinalizations = 2; newGitGhStartsForByteSeal = 0
    actualOuterToolCompletion = 'Report only after this enclosing tool actually returns; not self-attested here.'
} | ConvertTo-Json -Depth 7
