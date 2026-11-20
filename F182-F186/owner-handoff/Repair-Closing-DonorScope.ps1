$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$policyPath = Join-Path (Split-Path (Split-Path $root)) 'policy.json'
$env:GIT_OPTIONAL_LOCKS = '0'
$commands = [System.Collections.Generic.List[object]]::new()
function Read-Scoped([string]$Label, [string[]]$Arguments)
{
    $policy = Get-Content -Raw -LiteralPath $policyPath | ConvertFrom-Json
    if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
    {
        throw 'Actual HOLD blocks further starts.'
    }
    if (@($Arguments | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -ne 0)
    {
        throw 'Every scoped argument must be nonempty.'
    }
    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = 'git'
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
    $creationTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $outTask.GetAwaiter().GetResult()
    $stderr = $errTask.GetAwaiter().GetResult()
    [System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $stdout)
    [System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $stderr)
    $record = [ordered]@{
        label = $Label
        executable = 'git'
        arguments = $Arguments
        processId = $process.Id
        creationTimeUtc = $creationTimeUtc
        exitedAt = [DateTime]::UtcNow.ToString('o')
        exitCode = $process.ExitCode
        exited = $process.HasExited
        bothStreamsDrained = $true
    }
    $commands.Add($record)
    $record | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8NoBOM "$root\evidence\$Label.closing-command.json.stage"
    Move-Item -LiteralPath "$root\evidence\$Label.closing-command.json.stage" -Destination "$root\evidence\$Label.closing-command.json"
    if ($process.ExitCode -ne 0)
    {
        throw "$Label failed: $stderr"
    }
    $process.Dispose()
    return $stdout.TrimEnd()
}
$head = Read-Scoped 'closing-reused-default-head-v1' @('--no-pager', '-C', 'C:\src\ap-F173-d013', 'rev-parse', 'HEAD')
$status = Read-Scoped 'closing-reused-default-status-v1' @('--no-pager', '-C', 'C:\src\ap-F173-d013', 'status', '--porcelain=v1', '-uall')
if ($head -ne '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d' -or $status)
{
    throw 'Reused Default donor is not clean/pinned.'
}
$closing = Get-Content -Raw "$root\closing-attempt-v0\closing.json" | ConvertFrom-Json -AsHashtable
$closing.reusedDefaultGraph = [ordered]@{ checkout = 'C:\src\ap-F173-d013'; head = $head; status = @() }
$closing.commands += $commands.ToArray()
$closing.scopeCorrection = [ordered]@{
    observedAtUtc = [DateTime]::UtcNow.ToString('o')
    preservedPriorAttempt = 'closing-attempt-v0'
    cause = 'Donor path assignment accidentally remained function-local. Two original -C arguments were null; Git read coordinator cwd instead. Both raw invocations remain preserved and are superseded only for donor scope.'
    correctedCommands = @($commands.label)
    newDotnetInvocations = 0
    donorMutation = $false
}
$closing | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8NoBOM "$root\closing.json.stage"
Move-Item -LiteralPath "$root\closing.json.stage" -Destination "$root\closing.json" -Force
$terminal = Get-Content -Raw "$root\closing-attempt-v0\TERMINAL.json" | ConvertFrom-Json -AsHashtable
$stillOwned = [System.Collections.Generic.List[object]]::new()
foreach ($observation in $terminal.processObservations)
{
    $record = $observation.recorded
    $current = Get-Process -Id $record.processId -ErrorAction SilentlyContinue
    $observation.currentStart = $null
    $observation.state = 'not-running-at-recorded-PID'
    if ($current)
    {
        $currentStart = $current.StartTime.ToUniversalTime().ToString('o')
        $observation.currentStart = $currentStart
        $same = [DateTime]::Parse($currentStart).ToUniversalTime() -eq [DateTime]::Parse($record.creationDate).ToUniversalTime()
        $observation.state = if ($same) { 'possibly-still-owned' } else { 'PID-reused-by-later-process-not-owned' }
        if ($same)
        {
            $stillOwned.Add($record)
        }
        $current.Dispose()
    }
}
$terminal.observedAt = [DateTime]::UtcNow.ToString('o')
$terminal.stillOwned = $stillOwned.ToArray()
$terminal.allRecordedNativeInvocationsTerminal = $stillOwned.Count -eq 0
$terminal.closingReadOnlyCliInvocations = $closing.commands.Count
$terminal.closingScopeCorrection = 'Two additional creation-time identified, awaited read-only Git commands; thirteen closing CLI roots total, including two preserved wrong-scope observations.'
$terminal | ConvertTo-Json -Depth 25 | Set-Content -Encoding utf8NoBOM "$root\TERMINAL.json.stage"
Move-Item -LiteralPath "$root\TERMINAL.json.stage" -Destination "$root\TERMINAL.json" -Force
if ($stillOwned.Count -ne 0)
{
    throw 'An owned process remains; do not claim terminal.'
}
[ordered]@{ result = 'PASS'; reusedDonorHead = $head; clean = !$status; closingReadOnlyCliInvocations = $closing.commands.Count; ownedRemaining = $stillOwned.Count } | ConvertTo-Json -Compress
