$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$receipts = @(Get-ChildItem "$root\commands" -Filter '*.json' | ForEach-Object {
    $item = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($item.name -and $item.state -and [int]$item.name.Substring(0, 3) -lt 82) { $item }
})
$nonterminal = @($receipts | Where-Object { $_.state -ne 'terminal' -or $_.streamsTerminal -ne $true })
if ($nonterminal.Count -ne 0) { throw 'A recorded preparation command is not terminal' }
$self = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
$matches = @(Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%ap-F155-o010%' OR CommandLine LIKE '%ap-F155-d010%' OR CommandLine LIKE '%finding-F155-F159-010%'")
$otherMatches = @($matches | Where-Object { $_.ProcessId -ne $PID -and $_.ProcessId -ne $self.ParentProcessId })
if ($otherMatches.Count -ne 0) { throw "Still-running scoped processes: $($otherMatches.ProcessId -join ',')" }
[ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    observerPid = $PID
    observerParentPid = $self.ParentProcessId
    recordedNativeAndPreparationCommands = @($receipts | ForEach-Object {
        [ordered]@{ name = $_.name; pid = $_.pid; exitCode = $_.exitCode; streamsTerminal = $_.streamsTerminal; endedUtc = $_.endedUtc }
    })
    currentScopedNonObserverMatches = @($otherMatches | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine)
    scope = 'Point-in-time CommandLine match for both private checkout roots and this private preparation root, excluding this observer and its awaited parent.'
    boundaries = @(
        'Not an exhaustive historical child-process census.',
        'VSTest testhost PIDs and normal-exit loaded-image receipts were not captured; native console test PIDs 42920 and 42140 are directly captured and terminal.',
        'Initial failed Python shim probe did not capture its child PID/exit; its retained text and outer wrapper exit 0 do not establish that child exit code.',
        'The observer and parent become terminal when the separately recorded 082 wrapper returns; that receipt is copied only after return.'
    )
} | ConvertTo-Json -Depth 10 | Set-Content "$root\capsule\terminal-native-work.json" -Encoding utf8
'All recorded preparation/native commands and both streams terminal; no matching non-observer process in the stated bounded snapshot.'
