$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$logRoot = Join-Path $scope 'logs'
$receipts = @(Get-ChildItem $logRoot -Filter '*.json' -File |
    Where-Object { !$_.Name.EndsWith('.started.json') } |
    ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.executable })
$unmatched = @(Get-ChildItem $logRoot -Filter '*.started.json' -File |
    ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.pid -ne $PID -and !(Test-Path (Join-Path $logRoot "$($_.id).json")) } |
    ForEach-Object { $_.id })
$terminal = @($receipts | Where-Object { !$_.terminal -or !$_.finishedUtc -or $null -eq $_.exitCode }).Count -eq 0
$ids = @($receipts | ForEach-Object { $_.pid; $_.wrapperPid } | Sort-Object -Unique)
$filter = (@($ids | ForEach-Object { "ProcessId=$_ OR ParentProcessId=$_" }) -join ' OR ')
$candidates = @(Get-CimInstance Win32_Process -Filter $filter -Property ProcessId, ParentProcessId, CreationDate)
$activeNative = @()
$activeChildren = @()
foreach ($receipt in $receipts)
{
    $start = [DateTime]::Parse($receipt.startedUtc).ToUniversalTime().AddSeconds(-1)
    $finish = [DateTime]::Parse($receipt.finishedUtc).ToUniversalTime().AddSeconds(1)
    foreach ($candidate in $candidates)
    {
        if ($candidate.ProcessId -eq $PID)
        {
            continue
        }
        $created = $candidate.CreationDate.ToUniversalTime()
        if ($created -lt $start -or $created -gt $finish)
        {
            continue
        }
        if ($candidate.ProcessId -eq $receipt.pid)
        {
            $activeNative += [ordered]@{ receipt = $receipt.id; pid = $candidate.ProcessId; createdUtc = $created.ToString('O') }
        }
        if ($candidate.ParentProcessId -in @($receipt.pid, $receipt.wrapperPid))
        {
            $activeChildren += [ordered]@{ receipt = $receipt.id; pid = $candidate.ProcessId; parentPid = $candidate.ParentProcessId; createdUtc = $created.ToString('O') }
        }
    }
}
$state = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('O')
    finalPreparationReceiptCount = $receipts.Count
    allFinalReceiptsTerminal = $terminal
    recordedWrapperAwaitsProcessAndBothRedirectedStreams = $true
    unmatchedPreparationStarts = $unmatched
    activeOwnedNativeProcesses = $activeNative
    activeOwnedDirectChildren = $activeChildren
    boundedProcessCheck = 'Only known receipt PIDs and their direct parent IDs; creation intervals disambiguate PID reuse. Not a machine-wide process inventory.'
    currentBarrierPidExcluded = $PID
    subsequentFinalizationBoundary = 'This barrier excludes its own process and subsequent staging/sealing/self-audit. Their final native receipts remain beside the immutable capsule in the private logs directory.'
    explicitHoldReceived = $false
    holdReleaseReceipts = @()
}
$state | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $scope 'terminal-state.json') -Encoding utf8
$state | ConvertTo-Json -Depth 10
if (!$terminal -or $unmatched.Count -or $activeNative.Count -or $activeChildren.Count)
{
    throw 'Preparation has an unfinished recorded process or an active owned process/child.'
}
