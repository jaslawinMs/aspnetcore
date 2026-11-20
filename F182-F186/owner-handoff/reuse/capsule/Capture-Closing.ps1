$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$sessionFiles = Split-Path (Split-Path (Split-Path $root))
$env:GIT_OPTIONAL_LOCKS = '0'
$commands = [System.Collections.Generic.List[object]]::new()
function Read-Command([string]$Label, [string]$Executable, [string[]]$Arguments)
{
    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    [void]$process.Start()
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $outTask.GetAwaiter().GetResult()
    $stderr = $errTask.GetAwaiter().GetResult()
    [System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $stdout)
    [System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $stderr)
    $commands.Add([ordered]@{
        label = $Label
        executable = $Executable
        arguments = $Arguments
        processId = $process.Id
        exitCode = $process.ExitCode
        exited = $process.HasExited
        bothStreamsDrained = $true
    })
    if ($process.ExitCode -ne 0)
    {
        throw "$Label exited $($process.ExitCode): $stderr"
    }
    $process.Dispose()
    return $stdout.TrimEnd()
}
$observedAt = [DateTime]::UtcNow.ToString('o')
$upstream = Read-Command 'closing-upstream-repository' 'gh' @('api', 'repos/dotnet/aspnetcore', '--jq', '{default_branch,pushed_at,updated_at}')
$upstreamHead = Read-Command 'closing-ls-remote' 'git' @('--no-pager', 'ls-remote', 'https://github.com/dotnet/aspnetcore.git', 'refs/heads/main')
$head = Read-Command 'closing-coordinator-head' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'rev-parse', 'HEAD')
$branch = Read-Command 'closing-coordinator-branch' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'branch', '--show-current')
$status = Read-Command 'closing-coordinator-status' 'git' @('--no-pager', '-C', 'C:\src\aspnetcore', 'status', '--porcelain=v1', '-uall')
$graphs = Get-Content -Raw "$root\graph-creation.json" | ConvertFrom-Json
$private = [System.Collections.Generic.List[object]]::new()
foreach ($role in @('original', 'default'))
{
    $checkout = $graphs."${role}Path"
    $privateHead = Read-Command "closing-$role-head" 'git' @('--no-pager', '-C', $checkout, 'rev-parse', 'HEAD')
    $privateStatus = Read-Command "closing-$role-status" 'git' @('--no-pager', '-C', $checkout, 'status', '--porcelain=v1', '-uall')
    $private.Add([ordered]@{
        role = $role
        checkout = $checkout
        head = $privateHead
        status = @($privateStatus -split '\r?\n' | Where-Object { $_ })
    })
}
$campaign = Get-Content -Raw "$sessionFiles\autoperf-campaign.json" | ConvertFrom-Json
$policyPath = Join-Path (Split-Path (Split-Path $root)) 'policy.json'
$policy = Get-Content -Raw $policyPath | ConvertFrom-Json
$closing = [ordered]@{
    observedAt = $observedAt
    upstreamRepository = ($upstream | ConvertFrom-Json)
    lsRemote = $upstreamHead
    buildDefaultCommit = $graphs.defaultCommit
    freshnessBoundary = 'Builds are pinned to the independently observed entry Default. This is a separate closing observation, not a relabeling of built/tested source.'
    coordinatorHead = $head
    coordinatorBranch = $branch
    coordinatorStatus = @($status -split '\r?\n' | Where-Object { $_ })
    coordinatorIndexBoundary = 'Read-only closing Git commands use GIT_OPTIONAL_LOCKS=0. No initial binary index-file hash exists; no byte-for-byte index equivalence is claimed.'
    privateGraphs = $private.ToArray()
    candidates = @($campaign.candidates | Where-Object { $_.id -in @('F173', 'F174', 'F175') })
    policyObserved = [ordered]@{
        sha256 = (Get-FileHash $policyPath -Algorithm SHA256).Hash
        workersMayBuildOrTest = $policy.workersMayBuildOrTest
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        mutation = $false
    }
    commands = $commands.ToArray()
}
$closing | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8NoBOM "$root\closing.json"
$receipts = @(Get-ChildItem "$root\evidence" -Filter '*.receipt.json' -File | ForEach-Object {
    $record = Get-Content -Raw $_.FullName | ConvertFrom-Json
    if ($null -ne $record.nativePid)
    {
        $record
    }
})
$observed = @{}
foreach ($receipt in $receipts)
{
    foreach ($process in $receipt.observedProcesses)
    {
        $key = "$($process.processId)|$($process.creationDate)"
        if (!$observed.ContainsKey($key))
        {
            $observed[$key] = [ordered]@{
                processId = $process.processId
                creationDate = $process.creationDate
                invocationStart = $receipt.startedAt
                invocationEnd = $receipt.exitedAt
                role = if ($process.direct) { 'direct-dotnet-root' } else { 'sampled-descendant' }
            }
        }
    }
    $key = "$($receipt.wrapperPid)|wrapper"
    if (!$observed.ContainsKey($key))
    {
        $observed[$key] = [ordered]@{
            processId = $receipt.wrapperPid
            creationDate = $null
            invocationStart = $receipt.startedAt
            invocationEnd = $receipt.exitedAt
            role = 'finished-dotnet-recorder-wrapper'
        }
    }
}
$processObservations = [System.Collections.Generic.List[object]]::new()
$stillOwned = [System.Collections.Generic.List[object]]::new()
foreach ($record in $observed.Values)
{
    $current = Get-Process -Id $record.processId -ErrorAction SilentlyContinue
    $state = 'not-running-at-recorded-PID'
    $currentStart = $null
    if ($current)
    {
        $currentStart = $current.StartTime.ToUniversalTime().ToString('o')
        $start = [DateTime]::Parse($currentStart).ToUniversalTime()
        if ($record.creationDate)
        {
            $same = [Math]::Abs(($start - [DateTime]::Parse($record.creationDate).ToUniversalTime()).TotalSeconds) -lt 1
        }
        elseif ($record.role -eq 'finished-dotnet-recorder-wrapper')
        {
            $same = $start -le [DateTime]::Parse($record.invocationEnd).ToUniversalTime()
        }
        else
        {
            $same = $start -ge [DateTime]::Parse($record.invocationStart).ToUniversalTime().AddSeconds(-2) -and $start -le [DateTime]::Parse($record.invocationEnd).ToUniversalTime()
        }
        $state = if ($same) { 'possibly-still-owned' } else { 'PID-reused-by-later-process-not-owned' }
        if ($same)
        {
            $stillOwned.Add($record)
        }
        $current.Dispose()
    }
    $processObservations.Add([ordered]@{
        recorded = $record
        currentStart = $currentStart
        state = $state
    })
}
$terminal = [ordered]@{
    observedAt = [DateTime]::UtcNow.ToString('o')
    dotnetInvocationCount = $receipts.Count
    labels = @($receipts.label | Sort-Object)
    successes = @($receipts | Where-Object exitCode -eq 0).Count
    prerequisiteFailures = @($receipts | Where-Object exitCode -ne 0).Count
    allRecordedNativeInvocationsTerminal = (@($receipts | Where-Object { !$_.nativeExited }).Count -eq 0 -and $stillOwned.Count -eq 0)
    bothStreamsDrained = (@($receipts | Where-Object { !$_.bothStreamsDrained }).Count -eq 0)
    observedDescendantsDrained = (@($receipts | Where-Object { !$_.observedDescendantsDrained }).Count -eq 0)
    exhaustiveHistoricalPidCensus = $false
    boundary = 'Twenty-three recorded dotnet invocation roots (build/restore/test/compiler/consumer/evaluation), their recorder wrappers and sampled descendants only. Current PID/creation-time check distinguishes reuse. Very short-lived unsampled descendants and all historical synchronous git/Node helper child PIDs are not claimed as a complete census. Every completed helper used awaited/synchronous child execution. Closing read-only Git/GitHub children also exited and drained. No watchers or workloads started.'
    processObservations = $processObservations.ToArray()
    stillOwned = $stillOwned.ToArray()
    closingReadOnlyCliInvocations = $commands.Count
}
$terminal | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8NoBOM "$root\TERMINAL.json"
if ($stillOwned.Count -ne 0)
{
    throw "Some recorded PIDs require ownership review: $($stillOwned.Count)"
}
Write-Output ([ordered]@{
    defaultAtEntry = $graphs.defaultCommit
    defaultAtClosing = $upstreamHead
    coordinatorHead = $head
    coordinatorStatus = $closing.coordinatorStatus
    privateGraphs = $private.ToArray()
    dotnetInvocations = $receipts.Count
    successes = $terminal.successes
    prerequisiteFailures = $terminal.prerequisiteFailures
    stillOwned = $stillOwned.Count
    closingCliInvocations = $commands.Count
} | ConvertTo-Json -Depth 12)
