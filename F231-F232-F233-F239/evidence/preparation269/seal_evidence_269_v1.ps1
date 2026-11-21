$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$par = Split-Path -Parent $base
$owner = 'ec444276-1562-48a8-8655-bc9a7c90de94'
function New-Bytes([string]$Path, [byte[]]$Bytes)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew)
    try { $stream.Write($Bytes) } finally { $stream.Dispose() }
}
function New-Json([string]$Path, $Value)
{
    New-Bytes $Path ([Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 60) + "`n"))
}
function Hash([byte[]]$Bytes)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}
function Identity([Diagnostics.Process]$Process)
{
    return @{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime100ns = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
    }
}
function Read-Json([string]$Relative)
{
    return [IO.File]::ReadAllText((Join-Path $base $Relative)) | ConvertFrom-Json -AsHashtable
}
$runDir = Join-Path $base 'seal-observation'
if (Test-Path -LiteralPath $runDir) { throw 'Fresh seal observation directory already exists' }
$null = New-Item -ItemType Directory -Path $runDir
$root = Identity ([Diagnostics.Process]::GetCurrentProcess())
$parentRow = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$PID" -Property ParentProcessId
$parentIdentity = Identity (Get-Process -Id $parentRow.ParentProcessId)
$observerStart = [Diagnostics.ProcessStartInfo]::new((Get-Command pwsh).Source)
$observerStart.WorkingDirectory = $base
$observerStart.UseShellExecute = $false
$observerStart.RedirectStandardOutput = $true
$observerStart.RedirectStandardError = $true
$observerArgv = @('-NoLogo', '-NoProfile', '-File', (Join-Path $base 'observer_269_v2.ps1'), '-Directory', $runDir, '-RootPid', "$PID", '-RootCreationFileTime', "$($root.creationFileTime100ns)")
foreach ($arg in $observerArgv) { $observerStart.ArgumentList.Add($arg) }
$observer = [Diagnostics.Process]::new()
$observer.StartInfo = $observerStart
$null = $observer.Start()
$observerIdentity = Identity $observer
$observerOut = [IO.File]::Open((Join-Path $runDir 'observer.stdout.raw.bin'), [IO.FileMode]::CreateNew)
$observerErr = [IO.File]::Open((Join-Path $runDir 'observer.stderr.raw.bin'), [IO.FileMode]::CreateNew)
$observerOutTask = $observer.StandardOutput.BaseStream.CopyToAsync($observerOut)
$observerErrTask = $observer.StandardError.BaseStream.CopyToAsync($observerErr)
New-Json (Join-Path $runDir 'root-start.json') @{
    root = $root; parent = $parentIdentity; observer = $observerIdentity
    observerArgv = $observerArgv; argv = [Environment]::GetCommandLineArgs()
    cwd = (Get-Location).Path
    scope = 'F239 269 artifact-only final sealing; no new source inputs or Git/gh roots.'
}
$deadline = [DateTime]::UtcNow.AddSeconds(15)
while (-not [IO.File]::Exists((Join-Path $runDir 'observer-ready.json')))
{
    if ($observer.HasExited -or [DateTime]::UtcNow -gt $deadline) { throw 'Sealer observer did not become ready' }
    Start-Sleep -Milliseconds 50
}
$failure = $null
$analysis = $null
$processes = $null
try
{
    $policyRaw = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $registrationRaw = [IO.File]::ReadAllBytes((Join-Path $par 'owner-registrations-267-268-269.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyRaw) | ConvertFrom-Json -AsHashtable
    $registration = [Text.Encoding]::UTF8.GetString($registrationRaw) | ConvertFrom-Json -AsHashtable
    $checks = @{
        actualOwnRegistration = $policy.independentFindingPreparationWorkers.F239 -ceq $owner -and $registration.actualOwners.F239 -ceq $owner
        exactScope = $policy.activeWorkerPreparationScopes.F239 -ceq $registration.scopes.F239 -and $registration.scopes.F239.StartsWith('269 SOURCE ONLY after GO269')
        ownerLimit = $policy.independentFindingPreparationWorkers.Count -le 4 -and $policy.maximumRegisteredPreparationOwners -eq 4
        noLease = -not [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
        noHold = $policy.actualWorkerBuildHoldActive -ceq $false
        nonquiesced = $policy.buildAndTestWorkQuiesced -ceq $false
    }
    New-Bytes (Join-Path $runDir 'policy.raw.json') $policyRaw
    New-Bytes (Join-Path $runDir 'registration.raw.json') $registrationRaw
    New-Json (Join-Path $runDir 'guard.json') @{
        observedUtc = [DateTime]::UtcNow.ToString('o'); checks = $checks
        policySha256 = Hash $policyRaw; registrationSha256 = Hash $registrationRaw; pointOnly = $true
    }
    if ($checks.Values -contains $false) { throw 'Fresh final source-only scope guard failed' }
    $analysis = Read-Json 'analysis-result-v2.json'
    $processes = Read-Json 'source-process-summary-v2.json'
    $assessment = Read-Json 'assessment.json'
    $bindings = Read-Json 'whole-source-bindings-v2.json'
    $pairs = Read-Json 'role-byte-comparison-v2.json'
    $objects = Read-Json 'all-git-object-bindings-v2.json'
    $analysisWait = Read-Json 'analysis-v2.outer-wait.json'
    $analysisRoot = Read-Json 'analysis-v2-observation\root-result.json'
    if ($analysis.actualOwnerId -cne $owner -or
        $analysis.gitGhSourceRoots -ne 22 -or $analysis.wholeLogicalFileCounts.Original -ne 14 -or $analysis.wholeLogicalFileCounts.Default -ne 14 -or
        $bindings.Count -ne 28 -or $objects.Count -ne 36 -or $pairs.Count -ne 14 -or
        -not $analysis.immutableBinaryFramingAndPreimageChecksPassed -or
        $analysis.behavioralTestsRun -ne 0 -or $analysis.benchmarksRun -ne 0 -or $analysis.candidateEdits -ne 0 -or
        $assessment.disposition -cne 'source-only-no-material-candidate' -or
        $analysisWait.childExitCode -ne 0 -or -not $analysisWait.childWaitComplete -or
        $analysisRoot.failure -or $analysisRoot.observerExitCode -ne 0 -or -not $analysisRoot.observerWaitComplete -or
        $analysisWait.childPid -ne $analysisRoot.root.pid -or
        ([DateTime]$analysisWait.childCreationUtc).ToUniversalTime().ToFileTimeUtc() -ne $analysisRoot.root.creationFileTime100ns)
    {
        throw 'Final analysis, scope, count or actual-wait validation failed'
    }
    foreach ($source in $bindings)
    {
        $bytes = [IO.File]::ReadAllBytes((Join-Path $base $source.output))
        if ($bytes.Length -ne $source.size -or (Hash $bytes) -cne $source.contentSha256)
        {
            throw 'Whole source payload changed after analysis'
        }
    }
    foreach ($run in $processes.sourceRuns)
    {
        $outer = Read-Json "$($run.run).outer-wait.json"
        $inside = Read-Json "runs\$($run.run)\root-result.json"
        if ($outer.childExitCode -ne 0 -or -not $outer.childWaitComplete -or
            $inside.observerExitCode -ne 0 -or -not $inside.observerWaitComplete -or $inside.failure -or
            $outer.childPid -ne $inside.root.pid -or
            ([DateTime]$outer.childCreationUtc).ToUniversalTime().ToFileTimeUtc() -ne $inside.root.creationFileTime100ns)
        {
            throw 'A prior source root is not actually terminal'
        }
    }
    foreach ($command in $processes.gitGhCommands)
    {
        $exe = [IO.Path]::GetFileNameWithoutExtension($command.argv[0])
        if ($command.exitCode -ne 0 -or -not $command.waitComplete -or $command.cwd -cne 'C:\src\aspnetcore')
        {
            throw 'Source utility terminal/working-directory evidence failed'
        }
        if ($exe -ieq 'git')
        {
            if ($command.argv[1] -cne '--no-pager' -or $command.argv[2] -notin @('cat-file', 'grep', 'log', 'ls-tree'))
            {
                throw 'An unexpected Git verb was recorded'
            }
        }
        elseif ($exe -ieq 'gh')
        {
            if ($command.argv[1] -cne 'api' -or $command.argv[2] -notin @('repos/dotnet/aspnetcore', 'repos/dotnet/aspnetcore/git/ref/heads/main'))
            {
                throw 'An unexpected gh operation was recorded'
            }
        }
        else
        {
            throw 'An unexpected source utility executable was recorded'
        }
    }
    $failedPython = Read-Json 'run-01.outer-wait.json'
    $failedAnalysis = Read-Json 'analysis.outer-wait.json'
    $failedAnalysisRoot = Read-Json 'analysis-observation\root-result.json'
    if ($failedPython.childExitCode -ne 9009 -or -not $failedPython.childWaitComplete -or
        $failedAnalysis.childExitCode -ne 1 -or -not $failedAnalysis.childWaitComplete -or
        $failedAnalysisRoot.observerExitCode -ne 0 -or -not $failedAnalysisRoot.observerWaitComplete)
    {
        throw 'A preserved failure is not actually terminal'
    }
    $stages = @(
        @{stage = 'failed interpreter alias'; rootPid = $failedPython.childPid; observerPid = $null; actualWaitedExit = $failedPython.childExitCode; observerAbsentReason = 'Source helper never began execution'},
        @{stage = 'failed artifact analysis v1'; rootPid = $failedAnalysis.childPid; observerPid = $failedAnalysisRoot.observer.pid; actualWaitedExit = $failedAnalysis.childExitCode; observerExitCode = $failedAnalysisRoot.observerExitCode},
        @{stage = 'successful artifact analysis v2'; rootPid = $analysisWait.childPid; observerPid = $analysisRoot.observer.pid; actualWaitedExit = $analysisWait.childExitCode; observerExitCode = $analysisRoot.observerExitCode}
    )
    New-Json (Join-Path $runDir 'preseal-validation.json') @{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        priorSourceRootAndObserverWaitsValidated = 9
        directGitGhSourceWaitsValidated = $processes.sourceRootCount
        wholeSourcePayloadHashesRevalidated = $bindings.Count
        failedAndSuccessfulArtifactStages = $stages
        noNewGitGhRoots = $true; noNewWholeLogicalSourceInputs = $true
        preservedFailureFiles = @('launcher-failure-01.json', 'analysis-failure-01.json', 'analysis-v2-derivation.json')
        canonicalStatusUnchanged = $true
    }
}
catch
{
    $failure = @{error = $_.ToString(); scriptStackTrace = $_.ScriptStackTrace}
}
finally
{
    New-Json (Join-Path $runDir 'observer-stop.json') @{requestedUtc = [DateTime]::UtcNow.ToString('o'); root = $root}
    if (-not $observer.WaitForExit(15000)) { throw 'Sealer observer outstanding; not blindly killed' }
    $null = $observerOutTask.GetAwaiter().GetResult()
    $null = $observerErrTask.GetAwaiter().GetResult()
    $observerOut.Dispose()
    $observerErr.Dispose()
    New-Json (Join-Path $runDir 'root-observed-work-complete.json') @{
        root = $root; parent = $parentIdentity; observer = $observerIdentity
        observerWaitComplete = $true; observerExitCode = $observer.ExitCode
        observedUtc = [DateTime]::UtcNow.ToString('o'); failure = $failure
        rootExitClaimed = $false
        qualification = 'This root is still running. Its eventual exit is established only by the external waiter and actual tool return.'
    }
}
if ($null -ne $failure -or $observer.ExitCode -ne 0)
{
    [Console]::WriteLine((@{failure = $failure; observerExitCode = $observer.ExitCode} | ConvertTo-Json -Depth 15 -Compress))
    exit 1
}
$excluded = @(
    'seal.byte-index.json',
    'seal.receipt.json',
    'seal.outer.stdout.raw.bin',
    'seal.outer.stderr.raw.bin',
    'seal.outer-wait.json'
)
$entries = [Collections.Generic.List[object]]::new()
$totalBytes = [long]0
foreach ($file in Get-ChildItem -LiteralPath $base -Recurse -File -Force | Sort-Object FullName)
{
    $relative = [IO.Path]::GetRelativePath($base, $file.FullName)
    if ($relative -in $excluded) { continue }
    if ($relative.StartsWith('..') -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint))
    {
        throw 'Payload path escaped the fresh evidence root or was a reparse point'
    }
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $entries.Add(@{path = $relative; size = $bytes.Length; sha256 = Hash $bytes})
    $totalBytes += $bytes.Length
}
$indexPath = Join-Path $base 'seal.byte-index.json'
New-Json $indexPath @{
    schema = 'F239-269-complete-payload-byte-index-v1'
    evidenceRoot = $base; recordedUtc = [DateTime]::UtcNow.ToString('o')
    hashAlgorithm = 'SHA256 of complete original file bytes'
    payloadFileCount = $entries.Count; payloadTotalBytes = $totalBytes
    excludedClosureFiles = $excluded
    closureCoverage = 'The separate outer-wait receipt binds the index, seal receipt, complete sealer stdout/stderr, and handoff after the sealer actually exits. Its own hash is supplied only after the actual outer tool return.'
    files = $entries.ToArray()
}
foreach ($entry in $entries)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $base $entry.path))
    if ($bytes.Length -ne $entry.size -or (Hash $bytes) -cne $entry.sha256)
    {
        throw 'Payload changed while sealing'
    }
}
$currentNames = @(Get-ChildItem -LiteralPath $base -Recurse -File -Force | ForEach-Object { [IO.Path]::GetRelativePath($base, $_.FullName) } | Where-Object { $_ -notin $excluded } | Sort-Object)
$indexedNames = @($entries | ForEach-Object { $_.path } | Sort-Object)
if ($currentNames.Count -ne $entries.Count -or
    -not [Collections.StructuralComparisons]::StructuralEqualityComparer.Equals($currentNames, $indexedNames))
{
    throw 'Payload file coverage changed while sealing'
}
$indexBytes = [IO.File]::ReadAllBytes($indexPath)
$handoffPath = Join-Path $base 'HANDOFF.md'
$handoffBytes = [IO.File]::ReadAllBytes($handoffPath)
$observed = Read-Json 'seal-observation\observer-result.json'
$receipt = @{
    schema = 'F239-269-seal-receipt-v1'
    recordedUtc = [DateTime]::UtcNow.ToString('o'); actualOwnerId = $owner
    disposition = 'source-only-no-material-candidate; canonical F239 unchanged/pending parent'
    byteIndex = @{path = $indexPath; size = $indexBytes.Length; sha256 = Hash $indexBytes}
    handoff = @{path = $handoffPath; size = $handoffBytes.Length; sha256 = Hash $handoffBytes}
    payloadFilesIndexedAndReverified = $entries.Count; payloadBytesIndexedAndReverified = $totalBytes
    wholeBlobBindings = 28; gitObjectsVerified = 36; exactRoleBytePairs = 14
    wholeLogicalFilesPerRole = @{Original = 14; Default = 14}; gitGhSourceRoots = 22
    root = $root; parent = $parentIdentity; observer = $observerIdentity
    observerWaitComplete = $true; observerExitCode = $observer.ExitCode
    sealerMaximumSampledDescendantsExcludingRootAndObserver = $observed.maximumSampledSourceDescendantsExcludingObserver
    sourceMaximumSampledDescendantsExcludingRootAndObserver = $processes.maximumSampledDescendantsExcludingEachRootAndObserver
    sourceMaximumActualStdoutBytes = $processes.maximumActualStdoutBytes
    sourceMaximumActualStderrBytes = $processes.maximumActualStderrBytes
    sourceDeclaredPerStreamLimitBytes = $processes.sourceStreamDeclaredLimitBytesPerStream
    streamQualification = 'All streams complete; 32MiB source limit checked after capture, not used to truncate.'
    sourceCommandWaitDeadlineSeconds = 120; observerReadyAndClosureDeadlinesSeconds = 15
    observerQualification = 'CIM snapshots plus 50ms sleeps are sampled observations, not complete descendant-absence or global-idleness proof.'
    excludedClosureFiles = $excluded
    outerTerminalReceipt = 'seal.outer-wait.json'
    rootExitClaimed = $false
    terminalQualification = 'This root does not attest its own future exit. The separate waiter records its actual completed wait and hashes this receipt, index, handoff and streams. The actual outer tool return must be observed before reporting completion.'
    candidateEdits = 0; behavioralTestsRun = 0; benchmarksRun = 0; newSourceInputsDuringSeal = 0; newGitGhRootsDuringSeal = 0
}
New-Json (Join-Path $base 'seal.receipt.json') $receipt
[Console]::WriteLine((@{
    byteIndex = $receipt.byteIndex; handoff = $receipt.handoff
    payloadFilesIndexedAndReverified = $entries.Count; payloadBytesIndexedAndReverified = $totalBytes
    rootPid = $root.pid; observerPid = $observerIdentity.pid; observerActuallyWaitedExitCode = $observer.ExitCode
    wholeLogicalFilesPerRole = $receipt.wholeLogicalFilesPerRole; wholeBlobBindings = 28; gitObjectsVerified = 36
    gitGhSourceRoots = 22; actualMaxSourceStdout = $processes.maximumActualStdoutBytes; actualMaxSourceStderr = $processes.maximumActualStderrBytes
    maxSampledSourceDescendants = $processes.maximumSampledDescendantsExcludingEachRootAndObserver
    declaredPerStreamLimitBytes = 33554432; sourceWaitDeadlineSeconds = 120; observerReadyAndClosureSeconds = 15
    rootExitNotSelfAttested = $true
} | ConvertTo-Json -Depth 15 -Compress))
exit 0
