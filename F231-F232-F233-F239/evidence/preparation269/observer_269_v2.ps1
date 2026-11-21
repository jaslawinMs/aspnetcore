param(
    [Parameter(Mandatory)][string]$Directory,
    [Parameter(Mandatory)][int]$RootPid,
    [Parameter(Mandatory)][long]$RootCreationFileTime
)
$ErrorActionPreference = 'Stop'
function Write-NewJson([string]$Path, $Value)
{
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 30) + "`n")
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew)
    try { $stream.Write($bytes) } finally { $stream.Dispose() }
}
$own = [Diagnostics.Process]::GetCurrentProcess()
$root = Get-Process -Id $RootPid
if ($root.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $RootCreationFileTime)
{
    throw 'Observer root creation identity mismatch'
}
$identity = @{
    pid = $PID
    creationUtc = $own.StartTime.ToUniversalTime().ToString('o')
    creationFileTime100ns = $own.StartTime.ToUniversalTime().ToFileTimeUtc()
}
Write-NewJson (Join-Path $Directory 'observer-ready.json') @{
    observer = $identity
    rootPid = $RootPid
    rootCreationFileTime100ns = $RootCreationFileTime
    observedUtc = [DateTime]::UtcNow.ToString('o')
}
$seen = @{}
$samples = 0
$maximum = 0
$started = [DateTime]::UtcNow.ToString('o')
while ($true)
{
    $rows = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId, CreationDate, Name)
    $descendants = [Collections.Generic.HashSet[int]]::new()
    $null = $descendants.Add($RootPid)
    do
    {
        $changed = $false
        foreach ($row in $rows)
        {
            if ($descendants.Contains([int]$row.ParentProcessId) -and $descendants.Add([int]$row.ProcessId))
            {
                $changed = $true
            }
        }
    } while ($changed)
    $selected = @($rows | Where-Object { $descendants.Contains([int]$_.ProcessId) })
    $count = @($selected | Where-Object { $_.ProcessId -ne $RootPid -and $_.ProcessId -ne $PID }).Count
    $maximum = [Math]::Max($maximum, $count)
    $samples++
    foreach ($row in $selected)
    {
        $creation = $row.CreationDate.ToUniversalTime().ToString('o')
        $key = "$($row.ProcessId):$creation"
        if (-not $seen.ContainsKey($key))
        {
            $seen[$key] = @{
                pid = [int]$row.ProcessId
                parentPid = [int]$row.ParentProcessId
                imageName = $row.Name
                creationUtc = $creation
                firstSeenUtc = [DateTime]::UtcNow.ToString('o')
                samples = 0
            }
        }
        $seen[$key].lastSeenUtc = [DateTime]::UtcNow.ToString('o')
        $seen[$key].samples++
    }
    if ([IO.File]::Exists((Join-Path $Directory 'observer-stop.json')))
    {
        break
    }
    $currentRoot = Get-Process -Id $RootPid -ErrorAction SilentlyContinue
    if ($null -eq $currentRoot -or $currentRoot.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $RootCreationFileTime)
    {
        break
    }
    Start-Sleep -Milliseconds 50
}
Write-NewJson (Join-Path $Directory 'observer-result.json') @{
    observer = $identity
    rootPid = $RootPid
    rootCreationFileTime100ns = $RootCreationFileTime
    startedUtc = $started
    finishedUtc = [DateTime]::UtcNow.ToString('o')
    samples = $samples
    nominalInterSnapshotSleepMilliseconds = 50
    maximumSampledSourceDescendantsExcludingObserver = $maximum
    observedProcesses = @($seen.Values)
    limits = @(
        'CIM snapshots plus 50ms sleeps are sampled observations, not complete descendant discovery.'
        'Short-lived, intersample, reparented or otherwise unobserved descendants may be missed.'
        'Creation-bound direct process handles, full binary pipes and actual waits are separately recorded.'
        'No global idleness, unobserved-child absence or benchmark exclusion claim is made.'
    )
}
