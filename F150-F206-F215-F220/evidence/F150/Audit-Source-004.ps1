$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
$base = Split-Path $PSScriptRoot -Parent
$policyPath = Join-Path $base 'policy.json'
$policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
$leaseExists = Test-Path -LiteralPath (Join-Path $base 'benchmark-exclusive.lease.json')
if ($policy.independentFindingPreparationWorkers.F150 -cne '0e68af4c-282e-499c-824b-253a9e5d389b' -or
    @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
    $leaseExists -or $policy.actualWorkerBuildHoldActive -ne $false -or
    $policy.buildAndTestWorkQuiesced -ne $false -or
    $policy.activeWorkerPreparationScopes.F150 -notmatch '^246 SOURCE ONLY')
{
    throw 'F150 source-only live guard rejected.'
}
$guard = [ordered]@{observedUtc=[DateTime]::UtcNow.ToString('o'); policySha256=(Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash; actualOwner=$policy.independentFindingPreparationWorkers.F150; registeredOwnerCount=@($policy.independentFindingPreparationWorkers.PSObject.Properties).Count; leaseExists=$leaseExists; actualHOLD=$policy.actualWorkerBuildHoldActive; quiesced=$policy.buildAndTestWorkQuiesced}
New-Item -ItemType Directory -Path 'audit-004' | Out-Null
$first = Get-Content -LiteralPath 'source-002\source-manifest.json' -Raw | ConvertFrom-Json
$closure = Get-Content -LiteralPath 'closure-003\source-manifest.json' -Raw | ConvertFrom-Json
$verified = [Collections.Generic.List[object]]::new()
foreach ($source in @($first.sources) + @($closure.sources) + @($closure.navigationGuidance))
{
    $item = Get-Item -LiteralPath $source.evidencePath
    $actualHash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
    if ($item.Length -ne $source.bytes -or $actualHash -cne $source.sha256)
    {
        throw "Whole source integrity rejected: $($source.evidencePath)"
    }
    $verified.Add([ordered]@{path=$source.evidencePath; bytes=$item.Length; sha256=$actualHash; wholeFile=$true})
}
$pairs = foreach ($group in ($closure.sources | Group-Object -Property repositoryPath))
{
    $original = @($group.Group | Where-Object role -CEQ 'Original')
    $default = @($group.Group | Where-Object role -CEQ 'Default')
    if ($original.Count -ne 1 -or $default.Count -ne 1)
    {
        throw "Role pairing rejected: $($group.Name)"
    }
    [ordered]@{repositoryPath=$group.Name; originalSha256=$original[0].sha256; defaultSha256=$default[0].sha256; identical=($original[0].sha256 -ceq $default[0].sha256)}
}
$preserved = foreach ($source in @(Get-Content -LiteralPath 'source-002\navigation-untracked-preservation.json' -Raw | ConvertFrom-Json))
{
    $actual = Get-Item -LiteralPath (Join-Path 'C:\src\aspnetcore' $source.path)
    $hash = (Get-FileHash -LiteralPath $actual.FullName -Algorithm SHA256).Hash
    if ($actual.Length -ne $source.bytes -or $hash -cne $source.sha256)
    {
        throw "Original untracked report changed: $($source.path)"
    }
    [ordered]@{path=$source.path; bytes=$actual.Length; sha256=$hash; unchanged=$true}
}
if (@($preserved).Count -ne 4)
{
    throw 'Expected four original untracked reports.'
}
$commands = [Collections.Generic.List[object]]::new()
foreach ($directory in @('source-001\commands', 'source-002\commands', 'closure-003\commands'))
{
    foreach ($item in (Get-ChildItem -LiteralPath $directory -Filter '*.result.json' -File))
    {
        $record = Get-Content -LiteralPath $item.FullName -Raw | ConvertFrom-Json
        $isFirst = $directory -ceq 'source-001\commands'
        $pidValue = if ($isFirst) { $record.nativeRootPid } else { $record.rootPid }
        $startValue = if ($isFirst) { $record.nativeRootStartTimeUtc } else { $record.rootStartTimeUtc }
        $exitValue = if ($isFirst) { $record.nativeRootExitCode } else { $record.rootExitCode }
        $waitReturned = if ($isFirst) { $record.nativeRootWaitReturned } else { $record.rootWaitReturned }
        if ($exitValue -ne 0 -or -not $waitReturned -or -not $record.stdoutCopyAwaited -or -not $record.stderrCopyAwaited)
        {
            throw "Source reader terminal evidence rejected: $($record.label)"
        }
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue"
        $stillPresent = $null -ne $current -and $current.CreationDate.ToUniversalTime().ToString('o') -ceq $startValue
        if ($stillPresent)
        {
            throw "Owned source reader still present: $pidValue"
        }
        $commands.Add([ordered]@{resultPath=$item.FullName; label=$record.label; rootPid=$pidValue; rootCreationTimeUtc=$startValue; rootExitCode=$exitValue; rootWaitReturned=$waitReturned; stdoutCopyAwaited=$record.stdoutCopyAwaited; stderrCopyAwaited=$record.stderrCopyAwaited; sameRootInstancePresentAtAudit=$stillPresent; observedChildInstances=@($record.observedChildInstances)})
    }
}
$helperResults = foreach ($path in @('source-001-launch.result.json', 'source-002-launch.result.json', 'closure-003-launch.result.json'))
{
    $record = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.helperRootPid)"
    $stillPresent = $null -ne $current -and $current.CreationDate.ToUniversalTime().ToString('o') -ceq $record.helperRootStartTimeUtc
    if ($stillPresent -or -not $record.helperRootWaitReturned -or -not $record.stdoutCopyAwaited -or -not $record.stderrCopyAwaited)
    {
        throw "Source helper terminal evidence rejected: $path"
    }
    [ordered]@{resultPath=$path; helperRootPid=$record.helperRootPid; helperRootStartTimeUtc=$record.helperRootStartTimeUtc; helperRootExitCode=$record.helperRootExitCode; helperRootWaitReturned=$record.helperRootWaitReturned; stdoutCopyAwaited=$record.stdoutCopyAwaited; stderrCopyAwaited=$record.stderrCopyAwaited; sameHelperInstancePresentAtAudit=$stillPresent; outerPowerShellPid=$record.outerPowerShellPid; outerToolBoundarySeparate=$true}
}
$toolObservations = @(
    [ordered]@{shellId='f150-246-source001'; toolCompleted=$true; actualToolExitCode=1; observedAfterToolReturned=$true; helperFailure='VoidTaskResult objects polluted the source response pipeline; failed before original metadata/default/source reads.'},
    [ordered]@{shellId='f150-246-source002'; toolCompleted=$true; actualToolExitCode=0; observedAfterToolReturned=$true},
    [ordered]@{shellId='f150-246-closure003'; toolCompleted=$true; actualToolExitCode=0; observedAfterToolReturned=$true}
)
$audit = [ordered]@{
    findingId = 'F150'
    originalCommit = $first.originalCommit
    defaultBranch = $first.defaultBranch
    defaultCommit = $first.defaultCommit
    defaultObservationUtc = $first.defaultObservationUtc
    guard = $guard
    verifiedWholeSourceEntries = @($verified.ToArray())
    correctedRolePairs = @($pairs)
    supersededDerivedSummaryOnly = 'closure-003/source-manifest.json roleComparisons grouped raw OrderedDictionary entries into an empty-name group. That derived summary is unusable, preserved unchanged, and superseded only by correctedRolePairs here after loading source entries as PSCustomObject. No source bytes or source commands changed.'
    originalUntrackedReports = @($preserved)
    sourceReaderRoots = @($commands.ToArray())
    sourceHelperRoots = @($helperResults)
    actualEarlierOuterToolCompletions = $toolObservations
    rootPowerShellPid = $PID
    rootPowerShellStartTimeUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
    script = $PSCommandPath
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    scriptArgv = @()
    nativeChildrenStartedByThisAudit = 0
    terminalLimit = 'Only owned, observed process identities checked; no universal descendant or unrelated-host inactivity claim.'
    productNativeStarts = 0
    scenarioExecutions = 0
    sdkActivations = 0
    builds = 0
    tests = 0
    measurements = 0
    sourceEdits = 0
}
$stream = [IO.File]::Open('audit-004\source-audit.json', [IO.FileMode]::CreateNew)
try
{
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($audit | ConvertTo-Json -Depth 30) + [Environment]::NewLine)
    $stream.Write($bytes, 0, $bytes.Length)
}
finally
{
    $stream.Dispose()
}
$different = @($pairs | Where-Object { -not $_.identical })
Write-Output ("SOURCE_AUDIT004_SCRIPT_RETURNING verifiedSourceEntries={0} rolePairs={1} differingPairs={2} sourceReaderRoots={3} preservedReports={4}; outer tool exit is separate" -f $verified.Count, @($pairs).Count, $different.Count, $commands.Count, @($preserved).Count)
foreach ($pair in $different)
{
    Write-Output ("ROLE_SOURCE_DIFFERENCE {0}" -f $pair.repositoryPath)
}
