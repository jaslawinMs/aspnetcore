$ErrorActionPreference = 'Stop'
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$commands = @(Get-ChildItem -LiteralPath "$PSScriptRoot\commands" -Filter '*.json' -File | Sort-Object Name | ForEach-Object {
    Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
})
$identities = @(Get-ChildItem -LiteralPath "$PSScriptRoot\identity" -Recurse -Filter '*.json' -File | ForEach-Object {
    $snapshot = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
    @{file=$_.FullName;pid=[int]$snapshot.pid;startUtc=$snapshot.processStartUtc;phase=$snapshot.phase;launchId=$snapshot.launchId}
})
$ids = @($commands | ForEach-Object { $_.rootPid; $_.descendants | ForEach-Object pid }) + @($identities | ForEach-Object pid)
$ids = @($ids | Where-Object { $_ } | Sort-Object -Unique)
$current = @{}
$filter = (@($ids | ForEach-Object { "ProcessId=$_" }) -join ' OR ')
if ($filter)
{
    foreach ($process in Get-CimInstance Win32_Process -Filter $filter)
    {
        $current[[string]$process.ProcessId] = @{
            pid=[int]$process.ProcessId;parentPid=[int]$process.ParentProcessId
            creationUtc=$process.CreationDate.ToUniversalTime().ToString('o')
            name=$process.Name;commandLine=$process.CommandLine
        }
    }
}
$rootRows = @()
$childRows = @()
foreach ($command in $commands)
{
    if (-not $command.rootAwaited -or -not $command.stdoutAwaited -or -not $command.stderrAwaited -or $null -eq $command.exitCode)
    {
        throw "Unfinished direct root or stream: $($command.id)"
    }
    $rootRows += @{
        command=$command.id;pid=$command.rootPid;exitCode=$command.exitCode
        rootAwaited=$command.rootAwaited;stdoutAwaited=$command.stdoutAwaited;stderrAwaited=$command.stderrAwaited
        nativeDotnet=($command.file -like '*\.dotnet\dotnet.exe')
        currentPidObservation=$current[[string]$command.rootPid]
        identityBoundary='Original process-object WaitForExit and stream awaits establish root completion. Earlier receipts do not save OS root-creation timestamps; any current reused numeric PID is not relabeled as the original process.'
    }
    foreach ($child in $command.descendants)
    {
        $now = $current[[string]$child.pid]
        $same = $now -and $now.creationUtc -eq $child.creationUtc
        if ($same) { throw "Known same-identity child still active: $($child.pid)" }
        $childRows += @{
            command=$command.id;original=$child;current=$now
            terminalState=if ($now) { 'numeric-pid-present-with-different-CIM-creation-identity' } else { 'pid-absent-at-fresh-CIM-check' }
        }
    }
}
$identityRows = @()
foreach ($identity in $identities)
{
    $now = $current[[string]$identity.pid]
    $same = $now -and [Math]::Abs(([DateTime]::Parse($now.creationUtc).ToUniversalTime() - [DateTime]::Parse($identity.startUtc).ToUniversalTime()).TotalMilliseconds) -lt 1
    if ($same) { throw "Known same-start hook process still active: $($identity.pid)" }
    $identityRows += @{
        identity=$identity;current=$now
        terminalState=if ($now) { 'numeric-pid-present-start-differs-by-at-least-one-millisecond' } else { 'pid-absent-at-fresh-CIM-check' }
        precision='Hook Process.StartTime and CIM CreationDate cross-check uses explicit <1ms tolerance; saved original timestamps remain unmodified.'
    }
}
$owned = @(Get-CimInstance Win32_Process -Filter "Name='dotnet.exe' OR Name='testhost.exe' OR Name='MSBuild.exe' OR Name='csc.exe'" | Where-Object {
    $line = $_.CommandLine
    $line -and ($line.Contains($roles.original37, [StringComparison]::OrdinalIgnoreCase) -or
        $line.Contains($roles.default, [StringComparison]::OrdinalIgnoreCase) -or
        $line.Contains($roles.common, [StringComparison]::OrdinalIgnoreCase))
} | ForEach-Object {
    @{pid=$_.ProcessId;creationUtc=$_.CreationDate.ToUniversalTime().ToString('o');commandLine=$_.CommandLine}
})
if ($owned.Count -ne 0) { throw 'Private-root native process remains active' }
@{
    observedUtc=[DateTime]::UtcNow.ToString('o');inspectorPid=$PID
    scope='Only owned private direct roots, observed descendants and hook processes. No machine-idleness, exhaustive-descendant or global-host census claim.'
    directRoots=$rootRows;knownChildren=$childRows;hookProcesses=$identityRows
    freshPrivateRootNativeProcesses=$owned
    nativeRoots=@($rootRows | Where-Object nativeDotnet).Count
    noOwnedNativeWorkRemaining=$true
    inspectorBoundary='This inspection process is excluded from its own prior-root snapshot; its caller retains and awaits the inspector root and both streams in command 068-terminal-native-work.'
    hold='No explicit HOLD received during this owner run; no new native builds/tests remain planned.'
    remoteWork='None'
} | ConvertTo-Json -Depth 40 | Set-Content "$PSScriptRoot\terminal-native-work.json" -Encoding utf8NoBOM
Write-Output "Terminal: $($rootRows.Count) prior recorded roots awaited/drained; $($childRows.Count) observed child records checked; $($identityRows.Count) hook records checked; zero active private-root native processes."
