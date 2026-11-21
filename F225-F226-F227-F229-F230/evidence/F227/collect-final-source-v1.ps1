$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$repo = 'C:\src\aspnetcore'
$par = Split-Path -Parent $PSScriptRoot
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$initial = [IO.File]::ReadAllText('.\collection-source-v1.json') | ConvertFrom-Json
$contracts = [IO.File]::ReadAllText('.\collection-contract-history-v1.json') | ConvertFrom-Json
$inspection = [IO.File]::ReadAllText('.\inspection-source-bindings-v1.json') | ConvertFrom-Json
$navigation = [IO.File]::ReadAllText('.\navigation-mismatch-bindings-v1.json') | ConvertFrom-Json
$receiptPath = '.\collection-final-source-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use final source collector cannot be replayed.' }
$null = [IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot 'commands-final-source-v1'))
$result = [ordered]@{
    phase = 'final-source-v1'
    ownerId = $acceptance.ownerBackgroundId
    startedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    collectorIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    priorNativeReadRootCount = @($initial.commands).Count + @($contracts.commands).Count
    commands = @()
    fileVerifications = @()
    terminalVerifications = @()
    formerDirectToolProcessObservations = @()
    preservedReports = @()
    preFinalFilesVerified = 0
    state = 'running'
    failure = $null
}
function Save-Receipt
{
    [IO.File]::WriteAllText($receiptPath, ($result | ConvertTo-Json -Depth 30) + "`n", $utf8)
}
function Get-Digest([string] $Path)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($Path)))
}
function Verify-File([string] $Relative, [long] $Bytes, [string] $Sha256, [string] $Kind)
{
    $path = Join-Path $PSScriptRoot $Relative
    $actualBytes = ([IO.FileInfo]::new($path)).Length
    $actualHash = Get-Digest $path
    if ($actualBytes -ne $Bytes -or $actualHash -cne $Sha256) { throw "Retained-file mismatch: $Relative" }
    $result.fileVerifications += @{ path = $Relative; bytes = $actualBytes; sha256 = $actualHash; kind = $Kind; matched = $true }
}
function Get-Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
        ownerId = $policy.independentFindingPreparationWorkers.F227
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F227
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        leasePath = Join-Path $par 'benchmark-exclusive.lease.json'
        leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
    }
    [IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "commands-final-source-v1\$Label.policy.json"), $bytes)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "commands-final-source-v1\$Label.guard.json"), ($guard | ConvertTo-Json -Depth 8) + "`n", $utf8)
    if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw "Fresh F227 exact-scope guard denied before $Label." }
    return $guard
}
function Observe-Identity([int] $ProcessId)
{
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
}
function Read-Native([string] $Label, [string[]] $Argv)
{
    if (($result.priorNativeReadRootCount + $result.commands.Count) -ge $acceptance.bounds.maximumDirectGitGhSourceUtilityStarts) { throw 'Direct Git/gh source-utility bound reached.' }
    $guard = Get-Guard $Label
    $record = [ordered]@{
        label = $Label; guard = $guard
        executable = (Get-Command git.exe -CommandType Application).Source
        argv = $Argv; workingDirectory = $repo
        environmentOverrides = @{ GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GIT_PAGER = ''; GH_PAGER = ''; GH_PROMPT_DISABLED = '1' }
        startedUtc = [DateTime]::UtcNow.ToString('o')
        nativeRootPid = $null; nativeRootIdentity = $null
        observedChildren = @(); observedChildTerminals = @()
        waitForExitMilliseconds = 90000; waitForExitReturned = $false
        stdoutPath = "commands-final-source-v1\$Label.stdout.bin"
        stderrPath = "commands-final-source-v1\$Label.stderr.bin"
        stdoutDrainCompleted = $false; stderrDrainCompleted = $false
        exitCode = $null; failure = $null
    }
    $result.commands += $record
    Save-Receipt
    $p = [Diagnostics.Process]::new()
    $out = $null
    $err = $null
    try
    {
        $p.StartInfo.FileName = $record.executable
        $p.StartInfo.WorkingDirectory = $repo
        $p.StartInfo.UseShellExecute = $false
        $p.StartInfo.RedirectStandardOutput = $true
        $p.StartInfo.RedirectStandardError = $true
        $p.StartInfo.CreateNoWindow = $true
        foreach ($arg in $Argv) { $p.StartInfo.ArgumentList.Add($arg) }
        foreach ($key in $record.environmentOverrides.Keys) { $p.StartInfo.Environment[$key] = $record.environmentOverrides[$key] }
        $out = [IO.File]::Open((Join-Path $PSScriptRoot $record.stdoutPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $err = [IO.File]::Open((Join-Path $PSScriptRoot $record.stderrPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        if (-not $p.Start()) { throw 'Read-only final Git source utility did not start.' }
        $record.nativeRootPid = $p.Id
        $outTask = $p.StandardOutput.BaseStream.CopyToAsync($out)
        $errTask = $p.StandardError.BaseStream.CopyToAsync($err)
        $record.nativeRootIdentity = Observe-Identity $p.Id
        $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
        $record.waitForExitReturned = $p.WaitForExit($record.waitForExitMilliseconds)
        if (-not $record.waitForExitReturned) { Stop-Process -Id $p.Id -Force; $p.WaitForExit() }
        $null = $outTask.GetAwaiter().GetResult()
        $record.stdoutDrainCompleted = $true
        $null = $errTask.GetAwaiter().GetResult()
        $record.stderrDrainCompleted = $true
        $out.Dispose(); $out = $null
        $err.Dispose(); $err = $null
        $record.exitCode = $p.ExitCode
        foreach ($child in $record.observedChildren)
        {
            $now = Observe-Identity $child.ProcessId
            $terminal = [ordered]@{ processId = $child.ProcessId; creationDate = $child.CreationDate; observedUtc = [DateTime]::UtcNow.ToString('o'); state = $null; waited = $false; exitCode = $null }
            if ($null -eq $now) { $terminal.state = 'identity-absent-after-root-wait' }
            elseif ($now.CreationDate -ne $child.CreationDate) { $terminal.state = 'original-identity-absent-pid-reused' }
            else
            {
                $cp = [Diagnostics.Process]::GetProcessById($child.ProcessId)
                try
                {
                    $terminal.waited = $cp.WaitForExit(30000)
                    if ($terminal.waited) { $terminal.exitCode = $cp.ExitCode; $terminal.state = 'observed-handle-exited' }
                    else { $terminal.state = 'still-running'; throw "Observed owned utility child $($child.ProcessId) remains running." }
                }
                finally { $cp.Dispose() }
            }
            $record.observedChildTerminals += $terminal
        }
        if (-not $record.waitForExitReturned) { throw 'Final source utility exceeded its finite root wait.' }
        if ($record.exitCode -ne 0) { throw "Final source utility $Label exited $($record.exitCode)." }
    }
    catch { $record.failure = $_.Exception.ToString(); throw }
    finally
    {
        if ($null -ne $out) { $out.Dispose() }
        if ($null -ne $err) { $err.Dispose() }
        $p.Dispose()
        $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
        foreach ($stream in @('stdout', 'stderr'))
        {
            $path = Join-Path $PSScriptRoot $record["${stream}Path"]
            if ([IO.File]::Exists($path))
            {
                $record["${stream}Bytes"] = ([IO.FileInfo]::new($path)).Length
                $record["${stream}Sha256"] = Get-Digest $path
            }
        }
        Save-Receipt
    }
    return Join-Path $PSScriptRoot $record.stdoutPath
}
try
{
    Save-Receipt
    $null = Get-Guard '00-final-entry'
    if ($result.priorNativeReadRootCount -ne 22 -or $initial.state -cne 'completed' -or $contracts.state -cne 'completed') { throw 'Prior finite source collections are not the completed expected 22 reads.' }
    $assessment = [IO.File]::ReadAllText('.\assessment-v1.json') | ConvertFrom-Json
    if ($assessment.decision -cne 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE') { throw 'Unexpected source-only decision.' }
    $oldFiles = @()
    $mutableWhileRootRuns = @('collection-final-source-v1.json', 'observer-final-source-v1.json', 'final-source-v1.stdout.bin', 'final-source-v1.stderr.bin')
    foreach ($path in [IO.Directory]::EnumerateFiles($PSScriptRoot, '*', [IO.SearchOption]::AllDirectories))
    {
        $relative = [IO.Path]::GetRelativePath($PSScriptRoot, $path)
        if ($relative -in $mutableWhileRootRuns) { continue }
        $oldFiles += @{ path = $relative; bytes = ([IO.FileInfo]::new($path)).Length; sha256 = Get-Digest $path }
    }
    [IO.File]::WriteAllText('.\pre-final-files-v1.json', (@{ boundary = 'All already-existing stable evidence files at final-collector entry; only the four explicitly named live observer/collector receipt/stream paths are excluded.'; excludedLivePaths = $mutableWhileRootRuns; files = $oldFiles } | ConvertTo-Json -Depth 10) + "`n", $utf8)
    foreach ($binding in @($initial.files) + @($contracts.files) + @($contracts.referenceContracts))
    {
        Verify-File $binding.path $binding.bytes $binding.sha256 'whole-role-or-common-reference-source'
    }
    foreach ($binding in @($initial.guidance) + @($initial.reusedAdministrativeInputs))
    {
        Verify-File $binding.path $binding.bytes $binding.sha256 'captured-guidance-or-accepted-administrative-input'
    }
    foreach ($binding in $navigation.files)
    {
        Verify-File $binding.path $binding.bytes $binding.rawSha256 'preserved-navigation-raw-mismatch'
    }
    $accepted = [IO.File]::ReadAllText('.\reused-inputs\accepted-terminals-255.json') | ConvertFrom-Json
    if ((Get-Digest '.\reused-inputs\F206-WHOLE-SEAL-v1.json') -cne $accepted.F206.indexSha256) { throw 'Copied accepted F206 index digest changed.' }
    $oldIndex = [IO.File]::ReadAllText('.\reused-inputs\F206-WHOLE-SEAL-v1.json') | ConvertFrom-Json
    if (@($oldIndex.files).Count -ne 331) { throw 'Accepted F206 index membership count changed.' }
    $helperBindings = @(
        @{ path = 'collect-source-v1.ps1'; hash = '4164E32F78A55303C110D8DBB2B334D55B3101246055A91363C45EC684C9268C' },
        @{ path = 'observe-source-v1.ps1'; hash = 'BDBA634F45B286B79959257E693011764B362C3C4D60A15C6AD88B93C8A73F8C' },
        @{ path = 'collect-contract-history-v1.ps1'; hash = '1E12EBFFA67194E30D741501CE9686D0A0C7EE963253FD1A7FD4112531388AB2' },
        @{ path = 'observe-contract-history-v1.ps1'; hash = 'E6FA98EF20FA7B594DCF0CBFD4DA2C4AFF3FDB4FE75005D6FAB327C4D1F3DC02' },
        @{ path = 'inspect-source-bindings-v1.ps1'; hash = $inspection.scriptSha256 },
        @{ path = 'retain-navigation-mismatches-v1.ps1'; hash = $navigation.scriptSha256 }
    )
    foreach ($binding in $helperBindings)
    {
        if ((Get-Digest $binding.path) -cne $binding.hash) { throw "Executed helper bytes changed: $($binding.path)" }
    }
    $result.immutableExecutedHelpersVerified = $helperBindings
    foreach ($observerName in @('observer-source-v1.json', 'observer-contract-history-v1.json'))
    {
        $observer = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $observerName)) | ConvertFrom-Json
        if ($observer.rootExitCode -ne 0 -or -not $observer.rootWaitReturned -or -not $observer.stdoutDrainCompleted -or -not $observer.stderrDrainCompleted -or $observer.observerPid -eq $observer.rootPid -or $null -ne $observer.failure) { throw "Prior outside-observer terminal receipt is not successful: $observerName" }
        foreach ($stream in @('stdout', 'stderr'))
        {
            Verify-File $observer."${stream}Path" $observer."${stream}Bytes" $observer."${stream}Sha256" 'collector-raw-stream'
        }
        $result.terminalVerifications += @{ receipt = $observerName; observerPid = $observer.observerPid; rootPid = $observer.rootPid; rootWait = $observer.rootWaitReturned; rootExit = $observer.rootExitCode; bothStreamsDrained = $true; observedChildren = @($observer.observedChildren); observedChildTerminals = @($observer.observedChildTerminals) }
    }
    foreach ($prior in @($inspection, $navigation))
    {
        $now = Observe-Identity $prior.processId
        $same = $null -ne $now -and $now.CreationDate -eq $prior.processIdentity.CreationDate
        $result.formerDirectToolProcessObservations += @{ originalIdentity = $prior.processIdentity; observationUtc = [DateTime]::UtcNow.ToString('o'); sameIdentityPresent = $same; currentIdentity = $now; boundary = 'Bounded current identity observation; actual earlier direct-tool exit 0 is separately recorded from its returned tool result. Identity absence is not an observed process exit code.' }
        if ($same) { throw 'A prior directly executed inspection helper identity remains present despite its recorded completed tool return.' }
    }
    $gitIndexPath = Join-Path $repo '.git\index'
    $indexBefore = if ([IO.File]::Exists($gitIndexPath)) { @{ path = $gitIndexPath; bytes = ([IO.FileInfo]::new($gitIndexPath)).Length; sha256 = Get-Digest $gitIndexPath } } else { $null }
    $headPath = Read-Native '23-final-navigation-head' @('--no-pager', 'rev-parse', '--verify', 'HEAD')
    $result.navigationHead = [IO.File]::ReadAllText($headPath).Trim()
    if ($result.navigationHead -cne $acceptance.reservedNavigationHeadNotDefault) { throw 'Reserved navigation HEAD changed.' }
    $branchPath = Read-Native '24-final-navigation-branch' @('--no-pager', 'symbolic-ref', '--quiet', '--short', 'HEAD')
    $result.navigationBranch = [IO.File]::ReadAllText($branchPath).Trim()
    if ($result.navigationBranch -cne 'autoperf/F145-hoist-large-response-utf8-encoding') { throw 'Reserved navigation branch differs from the authorized context.' }
    $statusPath = Read-Native '25-final-navigation-status' @('--no-pager', '-c', 'core.fsmonitor=false', 'status', '--porcelain=v1', '--untracked-files=normal')
    $initialStatus = @($initial.commands | Where-Object label -eq '04-navigation-status')
    if ($initialStatus.Count -ne 1 -or (Get-Digest $statusPath) -cne $initialStatus[0].stdoutSha256 -or ([IO.FileInfo]::new($statusPath)).Length -ne $initialStatus[0].stdoutBytes) { throw 'Reserved navigation porcelain status differs from the initial raw observation.' }
    $result.navigationStatusExactlyMatchesInitialRawBytes = $true
    foreach ($report in $initial.preservedReports)
    {
        $path = Join-Path $repo $report.path
        $current = @{ path = $report.path; bytes = ([IO.FileInfo]::new($path)).Length; sha256 = Get-Digest $path }
        if ($current.bytes -ne $report.bytes -or $current.sha256 -cne $report.sha256) { throw "Pre-existing report changed: $($report.path)" }
        $result.preservedReports += $current
    }
    if ($null -ne $indexBefore)
    {
        $indexAfter = @{ path = $gitIndexPath; bytes = ([IO.FileInfo]::new($gitIndexPath)).Length; sha256 = Get-Digest $gitIndexPath }
        if ($indexBefore.bytes -ne $indexAfter.bytes -or $indexBefore.sha256 -cne $indexAfter.sha256) { throw 'Shared Git index bytes changed during the final read-only checks.' }
        $result.finalCheckIndexInterval = @{ before = $indexBefore; after = $indexAfter; exactFingerprintMatch = $true; boundary = 'Final-check interval only; an initial whole-preparation index fingerprint was not captured.' }
    }
    else { $result.finalCheckIndexInterval = @{ available = $false; boundary = 'No direct .git\index file observed; no universal index-integrity claim.' } }
    foreach ($logical in @('src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs', 'src\Components\Shared\src\CultureStateProvider.cs'))
    {
        $binding = @($navigation.files | Where-Object logicalPath -eq $logical)
        if ($binding.Count -ne 1 -or (Get-Digest (Join-Path $repo $logical)) -cne $binding[0].rawSha256) { throw 'Observed navigation-source mismatch bytes changed before final closure.' }
    }
    $allCommands = @($initial.commands) + @($contracts.commands) + @($result.commands)
    foreach ($record in $allCommands)
    {
        if ($record.exitCode -ne 0 -or -not $record.waitForExitReturned -or -not $record.stdoutDrainCompleted -or -not $record.stderrDrainCompleted -or $null -ne $record.failure -or $null -eq $record.nativeRootPid) { throw "Incomplete or unsuccessful native root: $($record.label)" }
        foreach ($stream in @('stdout', 'stderr'))
        {
            Verify-File $record."${stream}Path" $record."${stream}Bytes" $record."${stream}Sha256" 'native-source-utility-raw-stream'
        }
        $guard = $record.guard
        if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw 'A recorded native reader did not have the expected admission point.' }
        $directory = Split-Path -Parent $record.stdoutPath
        if ((Get-Digest (Join-Path $PSScriptRoot "$directory\$($record.label).policy.json")) -cne $guard.policySha256) { throw 'Historical per-start policy snapshot mismatch.' }
        $result.terminalVerifications += @{ label = $record.label; nativeRootPid = $record.nativeRootPid; nativeRootIdentity = $record.nativeRootIdentity; rootWait = $record.waitForExitReturned; exit = $record.exitCode; stdoutDrained = $record.stdoutDrainCompleted; stderrDrained = $record.stderrDrainCompleted; observedChildren = @($record.observedChildren); observedChildTerminals = @($record.observedChildTerminals) }
    }
    $result.nativeReadRootCount = @($allCommands | Where-Object { $null -ne $_.nativeRootPid }).Count
    $result.nativeReadAttemptCount = $allCommands.Count
    if ($result.nativeReadRootCount -ne 25 -or $result.nativeReadRootCount -gt 32) { throw 'Unexpected final finite root count.' }
    $result.nativeRootPids = @($allCommands | ForEach-Object nativeRootPid)
    $result.nativeObservedChildCount = @($allCommands | ForEach-Object observedChildren).Count
    $result.nativeObservedChildTerminalCount = @($allCommands | ForEach-Object observedChildTerminals).Count
    if ($result.nativeObservedChildCount -ne $result.nativeObservedChildTerminalCount) { throw 'A native observed child lacks its bounded terminal receipt.' }
    $result.bounds = @{
        directGitGhSourceUtilityRoots = $result.nativeReadRootCount; maximumDirectGitGhSourceUtilityStarts = 32
        wholeProductTestConfigurationFilesPerImmutableRole = 9; commonWholeReferenceContracts = 4
        wholeNavigationGuidanceDocuments = 2; navigationInstructionFiles = 4
        conservativeImmutableRoleFileCount = 15; maximumWholeProductDocTestFilesPerRole = 15
        additionalNavigationRawSnapshotsOfAlreadyCountedLogicalPaths = 2
    }
    foreach ($old in $oldFiles)
    {
        if (([IO.FileInfo]::new((Join-Path $PSScriptRoot $old.path))).Length -ne $old.bytes -or (Get-Digest (Join-Path $PSScriptRoot $old.path)) -cne $old.sha256) { throw "Previously retained evidence changed during closure: $($old.path)" }
        $result.preFinalFilesVerified++
    }
    $result.scopeActions = @{ candidateEdits = 0; sdkDotnetBuildTestRestoreRuntimeBrowserServerScenarioInvocations = 0; measurements = 0; delegationOrRemoteHostExecution = 0; publicationOrSharedAdministrativeChanges = 0; finalNativeCommands = 'Three guarded read-only Git HEAD/branch/status checks only.' }
    $result.processBoundary = '25 Process.Start reader roots and their bounded observed direct-child receipts; old collectors have separate outside observers. Identity absence is not a child exit code. This collector does not claim its own future exit, final observer completion, universal descendants, or unrelated-process absence.'
    $result.state = 'completed'
}
catch { $result.state = 'failed'; $result.failure = $_.Exception.ToString(); throw }
finally { $result.finishedUtc = [DateTime]::UtcNow.ToString('o'); Save-Receipt }
"F227 final-source-v1 $($result.state); collector=$PID; total Git/gh roots=$($result.nativeReadRootCount); preserved reports=$($result.preservedReports.Count); no candidate/runtime."
