$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

function Write-NewJson
{
    param([string] $Path, [object] $Value)

    $text = ($Value | ConvertTo-Json -Depth 30) + [Environment]::NewLine
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

$started = [DateTime]::UtcNow
$roots = [System.Collections.Generic.List[object]]::new()
$commandReceipts = [System.Collections.Generic.List[object]]::new()
foreach ($version in @('002', '003', '004'))
{
    $execution = Get-Content -LiteralPath ".\execution-$version.json" -Raw | ConvertFrom-Json
    $launcher = Get-Content -LiteralPath ".\launcher-$version.json" -Raw | ConvertFrom-Json
    $roots.Add([pscustomobject]@{
        Kind = 'Node source evidence helper'
        Receipt = "execution-$version.json"
        ProcessId = [int]$execution.pid
        StartLowerUtc = ([DateTime]::Parse($execution.startedUtc).ToUniversalTime()).AddSeconds(-2)
        EndUpperUtc = ([DateTime]::Parse($launcher.completedUtc).ToUniversalTime()).AddSeconds(2)
        TerminalEvidence = "launcher-$version.json plus tool completed exit 0"
    })
    $roots.Add([pscustomobject]@{
        Kind = 'PowerShell source helper launcher'
        Receipt = "execution-$version.json parentPid"
        ProcessId = [int]$execution.parentPid
        StartLowerUtc = ([DateTime]::Parse($launcher.startedUtc).ToUniversalTime()).AddSeconds(-15)
        EndUpperUtc = ([DateTime]::Parse($launcher.completedUtc).ToUniversalTime()).AddSeconds(2)
        TerminalEvidence = 'PowerShell tool reported completed exit 0'
    })
    foreach ($file in Get-ChildItem -LiteralPath ".\receipts-$version" -Filter '*.json' -File)
    {
        $receipt = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $commandReceipts.Add($receipt)
        if ($receipt.exitCode -ne 0 -or -not $receipt.rootAwaited -or -not $receipt.redirectedStreamsReachedEof)
        {
            throw "Source command is not successfully awaited with stream EOF: $($file.Name)"
        }
        $roots.Add([pscustomobject]@{
            Kind = 'Read-only Git/GitHub source command'
            Receipt = "receipts-$version\$($file.Name)"
            ProcessId = [int]$receipt.pid
            StartLowerUtc = ([DateTime]::Parse($receipt.startedUtc).ToUniversalTime()).AddSeconds(-2)
            EndUpperUtc = ([DateTime]::Parse($receipt.completedUtc).ToUniversalTime()).AddSeconds(2)
            TerminalEvidence = 'spawnSync returned exit 0 and both redirected streams reached EOF'
        })
    }
}

$snapshotAt = [DateTime]::UtcNow
$processes = @(Get-CimInstance -ClassName Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate, Name, ExecutablePath)
$identityObservations = [System.Collections.Generic.List[object]]::new()
$liveOwned = [System.Collections.Generic.Dictionary[int, object]]::new()
foreach ($root in $roots)
{
    $matches = @($processes | Where-Object {
        [int]$_.ProcessId -eq $root.ProcessId -and
        $_.CreationDate -and
        $_.CreationDate.ToUniversalTime() -ge $root.StartLowerUtc -and
        $_.CreationDate.ToUniversalTime() -le $root.EndUpperUtc
    })
    $identityObservations.Add([pscustomobject]@{
        Kind = $root.Kind
        Receipt = $root.Receipt
        ProcessId = $root.ProcessId
        IdentityWindowStartUtc = $root.StartLowerUtc.ToString('o')
        IdentityWindowEndUtc = $root.EndUpperUtc.ToString('o')
        MatchingLiveIdentityObserved = $matches.Count -gt 0
        TerminalEvidence = $root.TerminalEvidence
    })
    foreach ($match in $matches)
    {
        $liveOwned[[int]$match.ProcessId] = $match
    }
    foreach ($child in $processes)
    {
        if ([int]$child.ParentProcessId -eq $root.ProcessId -and
            $child.CreationDate -and
            $child.CreationDate.ToUniversalTime() -ge $root.StartLowerUtc -and
            $child.CreationDate.ToUniversalTime() -le $root.EndUpperUtc -and
            [int]$child.ProcessId -ne $PID)
        {
            $liveOwned[[int]$child.ProcessId] = $child
        }
    }
}

do
{
    $added = $false
    foreach ($process in $processes)
    {
        if (-not $liveOwned.ContainsKey([int]$process.ProcessId) -and
            $liveOwned.ContainsKey([int]$process.ParentProcessId) -and
            $process.CreationDate -and
            $process.CreationDate -ge $liveOwned[[int]$process.ParentProcessId].CreationDate -and
            [int]$process.ProcessId -ne $PID)
        {
            $liveOwned[[int]$process.ProcessId] = $process
            $added = $true
        }
    }
}
while ($added)

$failedAliasLauncher = Get-Content -LiteralPath '.\launcher-001.json' -Raw | ConvertFrom-Json
$result = [ordered]@{
    finding = 'F205'
    preparation = 222
    observedUtc = $snapshotAt.ToString('o')
    observerStartedUtc = $started.ToString('o')
    observerScript = $PSCommandPath
    observerScriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    observerPid = $PID
    observerStateAtWrite = 'This synchronous evidence writer is active only until its tool call returns; it is not a product/service process. Final handoff reply must follow successful terminal tool completion.'
    successfulSourceCommandReceipts = $commandReceipts.Count
    recordedPriorSourceRootIdentities = $roots.Count
    sourceRoots = $identityObservations.ToArray()
    matchingLiveOwnedRootsOrObservedDescendants = @($liveOwned.Values)
    allRecordedSourceCommandRootsAwaited = $true
    allRecordedSourceCommandStreamsReachedEof = $true
    sourceHelperLaunchersCompleted = $true
    pythonAliasFailure = @{
        receipt = 'launcher-001.json'
        exitCode = $failedAliasLauncher.exitCode
        toolReportedTerminal = $true
        interpreterPidAvailable = $false
        helperExecuted = $false
    }
    nativeProductStarts = 0
    serviceStarts = 0
    independentlyLaunchedBackgroundWork = @()
    processStops = @()
    ownedWorkBoundary = 'All recorded source collection roots completed; no matching recorded identity or actually observed descendant survives this snapshot. No native product or service work was launched. Mechanical JSON/index sealing remains synchronous and must finish before the final reply.'
    limitations = @(
        'No universal claim about unobserved short-lived process ancestry.',
        'No claim that unrelated processes are absent or the machine is dedicated.',
        'CIM identity windows distinguish currently reused PIDs; the Python alias has no recorded interpreter PID.',
        'This is a point-in-time owned-work observation, not continuing machine or benchmark quiescence.'
    )
}
Write-NewJson -Path '.\terminal-observation-001.json' -Value $result
if ($liveOwned.Count -ne 0)
{
    throw "Recorded source root or observed descendant remains active: $($liveOwned.Count)"
}

[ordered]@{
    successfulSourceCommandReceipts = $commandReceipts.Count
    priorRootIdentities = $roots.Count
    matchingLiveOwnedRootsOrObservedDescendants = $liveOwned.Count
    nativeProductStarts = 0
    services = 0
} | ConvertTo-Json
