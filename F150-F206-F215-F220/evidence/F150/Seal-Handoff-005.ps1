$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
$base = Split-Path $PSScriptRoot -Parent
$policyPath = Join-Path $base 'policy.json'
$leasePath = Join-Path $base 'benchmark-exclusive.lease.json'
$utf8 = [Text.UTF8Encoding]::new($false)

function New-Json([string] $Path, [object] $Value)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $bytes = $utf8.GetBytes(($Value | ConvertTo-Json -Depth 40) + [Environment]::NewLine)
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Guard
{
    $p = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $leaseExists = Test-Path -LiteralPath $leasePath
    if ($p.independentFindingPreparationWorkers.F150 -cne '0e68af4c-282e-499c-824b-253a9e5d389b' -or
        @($p.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $leaseExists -or $p.actualWorkerBuildHoldActive -ne $false -or
        $p.buildAndTestWorkQuiesced -ne $false -or
        $p.activeWorkerPreparationScopes.F150 -notmatch '^246 SOURCE ONLY')
    {
        throw 'F150 source-only live guard rejected.'
    }
    return [ordered]@{observedUtc=[DateTime]::UtcNow.ToString('o'); policySha256=(Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash; actualOwner=$p.independentFindingPreparationWorkers.F150; registeredOwnerCount=@($p.independentFindingPreparationWorkers.PSObject.Properties).Count; leaseExists=$leaseExists; actualHOLD=$p.actualWorkerBuildHoldActive; quiesced=$p.buildAndTestWorkQuiesced}
}

function Hash-Text([string] $Value)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($utf8.GetBytes($Value)))
}

function Slice([string] $Text, [string] $Start, [string] $End)
{
    $startIndex = $Text.IndexOf($Start, [StringComparison]::Ordinal)
    if ($startIndex -lt 0 -or $Text.IndexOf($Start, $startIndex + $Start.Length, [StringComparison]::Ordinal) -ge 0)
    {
        throw "Source start anchor missing or ambiguous: $Start"
    }
    $endIndex = $Text.IndexOf($End, $startIndex + $Start.Length, [StringComparison]::Ordinal)
    if ($endIndex -lt 0)
    {
        throw "Source end anchor missing: $End"
    }
    return $Text.Substring($startIndex, $endIndex - $startIndex)
}

$entryGuard = Guard
New-Item -ItemType Directory -Path 'seal-005-evidence' | Out-Null
New-Json 'seal-005-evidence\helper-start.json' ([ordered]@{script=$PSCommandPath; scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash; argv=@(); rootPowerShellPid=$PID; rootPowerShellStartTimeUtc=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o'); guard=$entryGuard; nativeScope='One read-only git status plus file/hash/process-identity checks only.'; productNativeAuthorized=$false})
$handoff = Get-Content -LiteralPath 'HANDOFF-F150-246.json' -Raw | ConvertFrom-Json
$first = Get-Content -LiteralPath 'source-002\source-manifest.json' -Raw | ConvertFrom-Json
$closure = Get-Content -LiteralPath 'closure-003\source-manifest.json' -Raw | ConvertFrom-Json
$audit = Get-Content -LiteralPath 'audit-004\source-audit.json' -Raw | ConvertFrom-Json
if ($handoff.findingId -cne 'F150' -or $handoff.roles.Original -cne $first.originalCommit -or
    $handoff.roles.Default -cne $first.defaultCommit -or
    $handoff.disposition -cne 'SOURCE_ONLY_BOUNDED_NO_MATERIAL_CANDIDATE_ESTABLISHED')
{
    throw 'Handoff role/disposition binding rejected.'
}
foreach ($source in $audit.verifiedWholeSourceEntries)
{
    $item = Get-Item -LiteralPath $source.path
    if ($item.Length -ne $source.bytes -or (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash -cne $source.sha256)
    {
        throw "Whole source changed after audit: $($source.path)"
    }
}
$pairs = @($closure.sources | Group-Object -Property repositoryPath)
if ($pairs.Count -ne 55)
{
    throw 'Expected 55 independent Original/Default source pairs.'
}
foreach ($pair in $audit.correctedRolePairs)
{
    $entries = @($closure.sources | Where-Object repositoryPath -CEQ $pair.repositoryPath)
    $originalEntry = @($entries | Where-Object role -CEQ 'Original')
    $defaultEntry = @($entries | Where-Object role -CEQ 'Default')
    if ($originalEntry.Count -ne 1 -or $defaultEntry.Count -ne 1 -or
        $originalEntry[0].sha256 -cne $pair.originalSha256 -or $defaultEntry[0].sha256 -cne $pair.defaultSha256 -or
        ($originalEntry[0].sha256 -ceq $defaultEntry[0].sha256) -ne $pair.identical)
    {
        throw "Corrected role comparison rejected: $($pair.repositoryPath)"
    }
}
$originalRenderer = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'closure-003\sources\Original\src\Components\Components\src\RenderTree\Renderer.cs'))
$defaultRenderer = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'closure-003\sources\Default\src\Components\Components\src\RenderTree\Renderer.cs'))
$definitions = @(
    @('root-render completion', '    protected Task RenderRootComponentAsync(int componentId)', '    protected internal void RemoveRootComponent(int componentId)'),
    @('parameter quiescence', '    private async Task WaitForQuiescence()', '    private ComponentState AttachAndInitComponent('),
    @('pending task ownership', '    internal void AddToPendingTasksWithErrorHandling(', '    internal void AssignEventHandlerId('),
    @('render queue and completed display callbacks', '    private void ProcessRenderQueue()', '    private async Task InvokeRenderCompletedCallsAfterUpdateDisplayTask('),
    @('completed callback task handling', '    private void NotifyRenderCompleted(', '    private void RenderInExistingBatch('),
    @('asynchronous error-task handling', '    private async Task GetErrorHandledTask(', '    private void UpdateRenderTreeToMatchClientState(')
)
$blocks = foreach ($definition in $definitions)
{
    $left = Slice $originalRenderer $definition[1] $definition[2]
    $right = Slice $defaultRenderer $definition[1] $definition[2]
    if ($left -cne $right)
    {
        throw "Relevant renderer source block differs and requires review: $($definition[0])"
    }
    [ordered]@{name=$definition[0]; startAnchor=$definition[1]; endAnchorExclusive=$definition[2]; originalTextSha256=(Hash-Text $left); defaultTextSha256=(Hash-Text $right); byteEquivalentUtf8Text=$true; behaviorOrRuntimeTest=$false}
}
foreach ($source in $audit.sourceReaderRoots)
{
    $current = Get-Process -Id $source.rootPid -ErrorAction SilentlyContinue
    if ($null -ne $current -and $current.StartTime.ToUniversalTime().ToString('o') -ceq $source.rootCreationTimeUtc)
    {
        throw "Observed owned source-reader root still live: $($source.rootPid)"
    }
    $record = Get-Content -LiteralPath $source.resultPath -Raw | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath $record.stdoutPath -Algorithm SHA256).Hash -cne $record.stdoutSha256 -or
        (Get-FileHash -LiteralPath $record.stderrPath -Algorithm SHA256).Hash -cne $record.stderrSha256)
    {
        throw "Raw source reader streams changed: $($source.label)"
    }
}
foreach ($relativePath in @('source-001-launch.result.json', 'source-002-launch.result.json', 'closure-003-launch.result.json', 'audit-004-launch.result.json'))
{
    $record = Get-Content -LiteralPath $relativePath -Raw | ConvertFrom-Json
    $current = Get-Process -Id $record.helperRootPid -ErrorAction SilentlyContinue
    if ($null -ne $current -and $current.StartTime.ToUniversalTime().ToString('o') -ceq $record.helperRootStartTimeUtc)
    {
        throw "Observed source helper still live: $relativePath"
    }
    if (-not $record.helperRootWaitReturned -or -not $record.stdoutCopyAwaited -or -not $record.stderrCopyAwaited)
    {
        throw "Source helper root/streams were not awaited: $relativePath"
    }
}
$immutableHelpers = @(
    @('Collect-Source-001.ps1', 'source-001\helper-start.json'),
    @('Collect-Source-002.ps1', 'source-002\helper-start.json'),
    @('Collect-Closure-003.ps1', 'closure-003\helper-start.json'),
    @('Audit-Source-004.ps1', 'audit-004-launch.invocation.json')
)
foreach ($binding in $immutableHelpers)
{
    $record = Get-Content -LiteralPath $binding[1] -Raw | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath $binding[0] -Algorithm SHA256).Hash -cne $record.scriptSha256)
    {
        throw "Executed helper was edited: $($binding[0])"
    }
}
$git = (Get-Command git.exe -CommandType Application).Source
$argv = @('--no-pager', '--no-optional-locks', '-C', 'C:\src\aspnetcore', 'status', '--porcelain=v1', '--untracked-files=normal')
$statusGuard = Guard
$statusRecord = [ordered]@{executable=$git; argv=$argv; workingDirectory=$PSScriptRoot; guard=$statusGuard}
New-Json 'seal-005-evidence\git-status.invocation.json' $statusRecord
$stdoutPath = Join-Path $PSScriptRoot 'seal-005-evidence\git-status.stdout.bin'
$stderrPath = Join-Path $PSScriptRoot 'seal-005-evidence\git-status.stderr.bin'
$outStream = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew)
$errStream = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew)
$process = [Diagnostics.Process]::new()
$children = [Collections.Generic.List[object]]::new()
try
{
    $process.StartInfo.FileName = $git
    $process.StartInfo.WorkingDirectory = $PSScriptRoot
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.Environment['GIT_PAGER'] = ''
    $process.StartInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    foreach ($argument in $argv)
    {
        $process.StartInfo.ArgumentList.Add($argument)
    }
    if (-not $process.Start())
    {
        throw 'Final source-only git status reader failed to start.'
    }
    $statusRecord['rootPid'] = $process.Id
    $statusRecord['rootStartTimeUtc'] = $process.StartTime.ToUniversalTime().ToString('o')
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
    do
    {
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)"))
        {
            $identity = '{0}|{1}' -f $child.ProcessId, $child.CreationDate.ToUniversalTime().ToString('o')
            if (-not @($children | Where-Object { $_.identity -ceq $identity }).Count)
            {
                $children.Add([ordered]@{identity=$identity; pid=[int]$child.ProcessId; creationTimeUtc=$child.CreationDate.ToUniversalTime().ToString('o'); parentPid=[int]$child.ParentProcessId; name=$child.Name; commandLine=$child.CommandLine})
            }
        }
    }
    while (-not $process.WaitForExit(50))
    $process.WaitForExit()
    $outTask.GetAwaiter().GetResult() | Out-Null
    $errTask.GetAwaiter().GetResult() | Out-Null
    $statusRecord['rootExitCode'] = $process.ExitCode
    $statusRecord['rootExitTimeUtc'] = $process.ExitTime.ToUniversalTime().ToString('o')
    $statusRecord['rootWaitReturned'] = $true
    $statusRecord['stdoutCopyAwaited'] = $true
    $statusRecord['stderrCopyAwaited'] = $true
    foreach ($child in $children)
    {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)"
        $child['sameInstancePresentAfterRootWait'] = $null -ne $current -and $current.CreationDate.ToUniversalTime().ToString('o') -ceq $child.creationTimeUtc
        if ($child.sameInstancePresentAfterRootWait)
        {
            throw 'Observed final source reader child remains live.'
        }
    }
    $statusRecord['observedChildInstances'] = @($children.ToArray())
}
catch
{
    $statusRecord['failure'] = $_.ToString()
    throw
}
finally
{
    $outStream.Dispose()
    $errStream.Dispose()
    $statusRecord['stdoutPath'] = $stdoutPath
    $statusRecord['stderrPath'] = $stderrPath
    $statusRecord['stdoutSha256'] = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
    $statusRecord['stderrSha256'] = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
    New-Json 'seal-005-evidence\git-status.result.json' $statusRecord
    $process.Dispose()
}
if ($statusRecord.rootExitCode -ne 0 -or
    $statusRecord.stdoutSha256 -cne (Get-FileHash -LiteralPath 'source-001\commands\002-navigation-status.stdout.bin' -Algorithm SHA256).Hash)
{
    throw 'Final source-only git status did not match the initial four-report working-tree state.'
}
$reports = foreach ($report in $audit.originalUntrackedReports)
{
    $item = Get-Item -LiteralPath (Join-Path 'C:\src\aspnetcore' $report.path)
    $hash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
    if ($item.Length -ne $report.bytes -or $hash -cne $report.sha256)
    {
        throw "Original report bytes changed: $($report.path)"
    }
    [ordered]@{path=$report.path; bytes=$item.Length; sha256=$hash; unchanged=$true}
}
$exitGuard = Guard
$excluded = @('seal-005-launch.stdout.bin', 'seal-005-launch.stderr.bin', 'seal-005-launch.result.json', 'seal-005.json')
$files = foreach ($item in (Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Sort-Object FullName))
{
    if ($item.Name -cnotin $excluded)
    {
        [ordered]@{path=[IO.Path]::GetRelativePath($PSScriptRoot, $item.FullName); bytes=$item.Length; sha256=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash}
    }
}
$seal = [ordered]@{
    findingId = 'F150'
    scope = '246 SOURCE ONLY'
    disposition = $handoff.disposition
    originalCommit = $first.originalCommit
    defaultCommit = $first.defaultCommit
    defaultBranch = $first.defaultBranch
    defaultObservationUtc = $first.defaultObservationUtc
    entryGuard = $entryGuard
    exitGuard = $exitGuard
    verifiedWholeSourceEntries = @($audit.verifiedWholeSourceEntries).Count
    uniqueRoleSourceFiles = @($closure.sources).Count
    sourceRolePairs = $pairs.Count
    equalRolePairs = @($audit.correctedRolePairs | Where-Object identical -EQ $true).Count
    differingRolePairs = @($audit.correctedRolePairs | Where-Object identical -EQ $false).Count
    exactRelevantRendererBlockComparisons = @($blocks)
    originalUntrackedReports = @($reports)
    finalGitStatusRecord = 'seal-005-evidence\git-status.result.json'
    finalGitStatusEqualsInitial = $true
    sourceReaderRootsBeforeFinalSeal = @($audit.sourceReaderRoots).Count
    finalAdditionalSourceReaderRoots = 1
    allSourceReaderRootWaitsAndStreamsTerminal = $true
    observedDescendantLimit = 'Only owned, observed immediate child identities are covered. No universal descendant-closure or unrelated-user inactivity claim.'
    priorFailedHelperAndUnusableDerivedSummaryPreserved = $true
    executedHelpersUnchanged = $true
    actualEarlierOuterTools = @(
        'f150-246-source001 completed with exit code 1',
        'f150-246-source002 completed with exit code 0',
        'f150-246-closure003 completed with exit code 0',
        'f150-246-audit004 completed with exit code 0'
    )
    productNativeStarts = 0
    sdkActivations = 0
    builds = 0
    tests = 0
    benchmarkScenarioExecutions = 0
    measurements = 0
    productOrCandidateSourceEdits = 0
    canonicalStatusOrCampaignWrites = 0
    sealerPowerShellPid = $PID
    sealerPowerShellStartTimeUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
    sealerOwnExitNotYetObservable = $true
    finalBoundary = 'The separate outer launcher must actually wait for this sealer and both raw streams. Its result and the tool completion marker must be inspected after this script returns; this seal does not pre-assert either exit.'
    files = @($files)
    excludedLiveOrSelfFiles = $excluded
}
New-Json 'seal-005.json' $seal
Write-Output ("F150_SOURCE_ONLY_SEAL_WRITTEN sha256={0} files={1} wholeSourceEntries={2} rolePairs={3} exactRendererBlocks={4}" -f (Get-FileHash -LiteralPath 'seal-005.json' -Algorithm SHA256).Hash, @($files).Count, $seal.verifiedWholeSourceEntries, $seal.sourceRolePairs, @($blocks).Count)
Write-Output ("F150_FINAL_STATUS_READER_WAITED pid={0} exit={1} stdout=awaited stderr=awaited" -f $statusRecord.rootPid, $statusRecord.rootExitCode)
Write-Output ("F150_SEALER_SCRIPT_RETURNING pid={0}; its actual native root exit and outer tool completion remain separately observable after return" -f $PID)
