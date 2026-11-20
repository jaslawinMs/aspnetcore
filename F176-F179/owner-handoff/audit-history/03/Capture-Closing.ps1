$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$owner = Split-Path $root
$sessionFiles = Split-Path (Split-Path $owner)
$policyPath = Join-Path (Split-Path $owner) 'policy.json'
$policy = Get-Content $policyPath -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'Do not begin source-heavy closing while held.'
}
$env:GIT_OPTIONAL_LOCKS = '0'
$commands = [System.Collections.Generic.List[object]]::new()
function Write-AtomicJson([string]$Filename, $Value)
{
    $stage = "$Filename.$PID.stage"
    [IO.File]::WriteAllText($stage, ($Value | ConvertTo-Json -Depth 40), [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($stage, $Filename, $true)
}
function Read-Command([string]$Label, [string]$Executable, [string[]]$Arguments)
{
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    [void]$process.Start()
    $processId = $process.Id
    $creation = $process.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    [IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $stdout)
    [IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $stderr)
    $commands.Add([ordered]@{
        label = $Label
        executable = $Executable
        arguments = $Arguments
        processId = $processId
        creationUtc = $creation
        exitCode = $process.ExitCode
        exited = $process.HasExited
        bothStreamsDrained = $true
        completedAtUtc = [DateTime]::UtcNow.ToString('o')
    })
    if ($process.ExitCode -ne 0)
    {
        throw "$Label exited $($process.ExitCode): $stderr"
    }
    $process.Dispose()
    return $stdout.TrimEnd()
}
$graphs = Get-Content "$root\graph-creation.json" -Raw | ConvertFrom-Json
$entry = Get-Content "$root\entry.json" -Raw | ConvertFrom-Json
$observedAt = [DateTime]::UtcNow.ToString('o')
$upstream = Read-Command 'closing-upstream-repository' 'gh' @('api', 'repos/dotnet/aspnetcore', '--jq', '{default_branch,pushed_at,updated_at}')
$upstreamHead = Read-Command 'closing-ls-remote' 'git' @('--no-pager', 'ls-remote', 'https://github.com/dotnet/aspnetcore.git', 'refs/heads/main')
$coordinatorHead = Read-Command 'closing-coordinator-head' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'rev-parse', 'HEAD')
$coordinatorBranch = Read-Command 'closing-coordinator-branch' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'branch', '--show-current')
$coordinatorStatus = Read-Command 'closing-coordinator-status' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'status', '--porcelain=v1', '--untracked-files=no')
$private = [System.Collections.Generic.List[object]]::new()
foreach ($role in @('original', 'default'))
{
    $checkout = $graphs."${role}Path"
    $head = Read-Command "closing-$role-head" 'git' @('--no-pager', '-C', $checkout, 'rev-parse', 'HEAD')
    $status = Read-Command "closing-$role-status" 'git' @('--no-pager', '-C', $checkout, 'status', '--porcelain=v1', '--untracked-files=no')
    $alternates = Test-Path "$checkout\.git\objects\info\alternates"
    if ($head -ne $graphs."${role}Commit" -or $status -or $alternates)
    {
        throw "Private $role immutable source changed or alternates appeared."
    }
    $private.Add([ordered]@{
        role = $role
        checkout = $checkout
        head = $head
        trackedStatus = @($status -split '\r?\n' | Where-Object { $_ })
        alternatesExist = $alternates
        objectStore = "$checkout\.git\objects"
        independentObjectStoreCreationProof = 'graph-creation.json'
    })
}
$donors = [System.Collections.Generic.List[object]]::new()
foreach ($donor in @('C:\src\ap-F173-o013', 'C:\src\ap-F155-d010'))
{
    $name = [IO.Path]::GetFileName($donor)
    $head = Read-Command "closing-donor-$name-head" 'git' @('--no-pager', '-C', $donor, 'rev-parse', 'HEAD')
    $status = Read-Command "closing-donor-$name-status" 'git' @('--no-pager', '-C', $donor, 'status', '--porcelain=v1', '--untracked-files=no')
    $donors.Add([ordered]@{ path = $donor; head = $head; trackedStatus = @($status -split '\r?\n' | Where-Object { $_ }) })
}
$campaign = Get-Content "$sessionFiles\autoperf-campaign.json" -Raw | ConvertFrom-Json
$targets = @($campaign.candidates | Where-Object id -in @('F176', 'F177', 'F178', 'F179'))
if ($targets.Count -ne 4 -or @($targets | Where-Object status -ne 'pending').Count -ne 0)
{
    throw 'Target ledger entries are not the four required pending findings.'
}
$closing = [ordered]@{
    observedAtUtc = $observedAt
    upstreamRepository = $upstream | ConvertFrom-Json
    lsRemote = $upstreamHead
    buildDefaultCommit = $graphs.defaultCommit
    freshnessBoundary = 'Normal whole source graph built/tested at the exact independently observed entry Default. This closing observation never relabels or retargets the built tree.'
    coordinatorHead = $coordinatorHead
    coordinatorBranch = $coordinatorBranch
    coordinatorTrackedStatus = @($coordinatorStatus -split '\r?\n' | Where-Object { $_ })
    coordinatorIndexBoundary = 'Read-only Git with GIT_OPTIONAL_LOCKS=0. No initial all-file/index-byte inventory exists; none is claimed. Task made no coordinator/donor/source/config writes.'
    privateGraphs = $private.ToArray()
    donors = $donors.ToArray()
    donorBoundary = 'Final read-only tracked-source observations. SDK/runtime selected byte hashes are retained; no complete entry-vs-exit donor/distribution inventory or toolchain attestation is claimed.'
    candidates = $targets
    policyObserved = [ordered]@{
        sha256 = (Get-FileHash $policyPath -Algorithm SHA256).Hash
        workersMayBuildOrTest = $policy.workersMayBuildOrTest
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        mutation = $false
    }
    commands = $commands.ToArray()
}
Write-AtomicJson "$root\closing.json" $closing
$receipts = @(Get-ChildItem "$root\evidence" -Filter '*.receipt.json' -File | Sort-Object Name | ForEach-Object {
    [ordered]@{ file = $_.Name; data = (Get-Content $_.FullName -Raw | ConvertFrom-Json) }
})
$known = @{}
function Add-Known([int]$ProcessId, [string]$CreationUtc, [string]$Kind, [string]$Label)
{
    if ($ProcessId -le 0 -or !$CreationUtc)
    {
        throw "Missing known process identity $Label $Kind"
    }
    $key = "$ProcessId@$CreationUtc"
    if (!$known.ContainsKey($key))
    {
        $known[$key] = [ordered]@{ processId = $ProcessId; creationUtc = $CreationUtc; kinds = @(); labels = @() }
    }
    $known[$key].kinds = @($known[$key].kinds + $Kind | Sort-Object -Unique)
    $known[$key].labels = @($known[$key].labels + $Label | Sort-Object -Unique)
}
$commandStates = [System.Collections.Generic.List[object]]::new()
foreach ($item in $receipts)
{
    $receipt = $item.data
    if (!$receipt.nativeExited -or !$receipt.bothStreamsDrained -or !$receipt.observedDescendantsDrained)
    {
        throw "Unclosed recorded native command $($receipt.label)"
    }
    Add-Known $receipt.nativePid $receipt.nativeCreationUtc 'native-root' $receipt.label
    Add-Known $receipt.wrapperPid $receipt.wrapperCreationUtc 'native-wrapper' $receipt.label
    foreach ($process in $receipt.observedProcesses)
    {
        Add-Known $process.processId $process.creationUtc $(if ($process.direct) { 'native-root' } else { 'observed-child' }) $receipt.label
    }
    $commandStates.Add([ordered]@{
        label = $receipt.label
        receipt = "evidence/$($item.file)"
        exitCode = $receipt.exitCode
        tool = $receipt.tool
        startedAtUtc = $receipt.startedAtUtc
        exitedAtUtc = $receipt.exitedAtUtc
        nativeExited = $receipt.nativeExited
        bothStreamsDrained = $receipt.bothStreamsDrained
        observedDescendantsDrained = $receipt.observedDescendantsDrained
        stdout = [ordered]@{ selected = "evidence/$($receipt.label).stdout.txt"; bytes = (Get-Item "$root\evidence\$($receipt.label).stdout.txt").Length; state = 'fully-drained-and-persisted' }
        stderr = [ordered]@{ selected = "evidence/$($receipt.label).stderr.txt"; bytes = (Get-Item "$root\evidence\$($receipt.label).stderr.txt").Length; state = 'fully-drained-and-persisted' }
    })
}
foreach ($command in $commands)
{
    Add-Known $command.processId $command.creationUtc 'closing-read-only-cli' $command.label
}
$live = @{}
Get-CimInstance Win32_Process -Property ProcessId,CreationDate | ForEach-Object {
    $live[[int]$_.ProcessId] = $_.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
}
$observations = @($known.Values | Sort-Object processId,creationUtc | ForEach-Object {
    $actual = $live[[int]$_.processId]
    [ordered]@{
        processId = $_.processId
        creationUtc = $_.creationUtc
        kinds = $_.kinds
        labels = $_.labels
        checkedAtUtc = [DateTime]::UtcNow.ToString('o')
        observedCreationUtc = $actual
        terminalState = if (!$actual) { 'not-running' } elseif ($actual -eq $_.creationUtc) { 'matching-owned-process-still-running' } else { 'pid-reused-not-owned' }
    }
})
$stillOwned = @($observations | Where-Object terminalState -eq 'matching-owned-process-still-running')
if ($stillOwned.Count -ne 0)
{
    throw "Some owned PIDs remain: $($stillOwned.Count)"
}
$terminal = [ordered]@{
    observedAtUtc = [DateTime]::UtcNow.ToString('o')
    agentId = '06005641-57b2-4fa5-856c-b2bf4bf642e9'
    nativeCommandCount = $receipts.Count
    nativeSuccesses = @($receipts | Where-Object { $_.data.exitCode -eq 0 }).Count
    nativeFailuresPreserved = @($receipts | Where-Object { $_.data.exitCode -ne 0 }).Count
    commandStates = $commandStates.ToArray()
    knownProcessIdentityCount = $observations.Count
    processObservations = $observations
    actualRemainingOwnedNativeRoots = @()
    actualRemainingObservedChildren = @()
    actualRemainingOwnedWrappers = @()
    allRecordedNativeInvocationsTerminal = $true
    bothStreamsDrained = $true
    observedDescendantsDrained = $true
    exhaustiveHistoricalPidCensus = $false
    boundary = 'All recorded native roots/wrappers, sampled transitive descendants and closing CLI roots are re-observed by exact PID plus six-digit UTC creation identity. PID reuse is not owned. Very short-lived unsampled children and historical synchronous Git/Node helper PIDs are not a complete census. One early invalid-parameter common wrapper failed before native start and has saved wrapper exit/streams but no PID/creation receipt. All helpers used synchronous/awaited children; no watcher/service was started. Later read-only Node sealing/audit completion is separately recorded in the top-level sealed handoff.'
}
Write-AtomicJson "$root\TERMINAL.json" $terminal
New-Item -ItemType Directory -Force "$root\control" | Out-Null
foreach ($name in @('F140-HOLD-027-ack.json', 'F140-RELEASE-027-observed.json'))
{
    Copy-Item (Join-Path $owner $name) (Join-Path "$root\control" $name)
}
Write-Output ([ordered]@{
    original = $graphs.originalCommit
    defaultAtBuild = $graphs.defaultCommit
    defaultAtClosing = $upstreamHead
    coordinatorHead = $coordinatorHead
    privateGraphs = $private.ToArray()
    nativeCommands = $terminal.nativeCommandCount
    nativeSuccesses = $terminal.nativeSuccesses
    nativeFailuresPreserved = $terminal.nativeFailuresPreserved
    knownProcessIdentities = $observations.Count
    stillOwned = $stillOwned.Count
    closingCliCommands = $commands.Count
} | ConvertTo-Json -Depth 12)
