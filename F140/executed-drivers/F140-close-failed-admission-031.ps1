$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$parallel = Join-Path $session 'autoperf-parallelism'
$root = Join-Path $session 'autoperf-runs\F140'
$receiptPath = Join-Path $root 'failed-admission-closure-031.json'
if (Test-Path -LiteralPath $receiptPath)
{
    throw 'The failed-admission closure already exists; preserve it.'
}
$budgetPath = Join-Path $root 'diagnostic-budget.json'
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
if (-not $budget.closed -or $budget.authorizations.Count -ne 1 -or
    $budget.authorizations[0].status -cne 'failed' -or
    $budget.actualUnusedAuthorizationsPermanentlyClosed -ne 2)
{
    throw 'The failed authorization is not already permanently closed.'
}
$authorization = $budget.authorizations[0]
if ($authorization.windows.Count -ne 1 -or -not $authorization.windows[0].actualTerminal -or
    $authorization.windows[0].actualExitCode -ne 1 -or
    @(Get-ChildItem -LiteralPath (Join-Path $root 'executions') -Force).Count -ne 0)
{
    throw 'Unexpected execution state; no failed-lease cleanup is permitted.'
}
$leasePath = Join-Path $parallel 'benchmark-exclusive.lease.json'
$leaseHash = (Get-FileHash -LiteralPath $leasePath -Algorithm SHA256).Hash
$lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
if ($lease.findingId -cne 'F140' -or $lease.token -cne $authorization.gatewayLeaseToken -or
    $lease.gatePid -ne $authorization.gatePid -or $lease.arguments[2] -cne 'Original37')
{
    throw 'The persistent failed lease does not belong to this exact closed authorization.'
}
$events = @(Get-Content -LiteralPath (Join-Path $parallel 'benchmark-gate-events.jsonl') |
    ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.token -ceq $lease.token })
$start = @($events | Where-Object { $_.event -ceq 'child-started' })
$ended = @($events | Where-Object { $_.event -ceq 'child-ended' })
if ($start.Count -ne 1 -or $ended.Count -ne 1 -or $start[0].childPid -ne $authorization.driverPid -or
    $ended[0].actualExitCode -ne 1 -or $ended[0].leaseMayRelease -ne $false -or
    @($events | Where-Object { $_.event -ceq 'released' }).Count -ne 0)
{
    throw 'Actual gateway child start/awaited exit events do not prove this failed run terminal.'
}
$processes = @(Get-CimInstance Win32_Process)
$checks = @()
$window = $authorization.windows[0]
$identities = @(
    @{ kind = 'gate'; pid = $lease.gatePid; earliest = $lease.gateStartedAt; latest = $lease.gateStartedAt; exact = $true },
    @{ kind = 'driver'; pid = $authorization.driverPid; earliest = $lease.gateStartedAt; latest = $start[0].recordedAt; exact = $false },
    @{ kind = 'native-launcher-before-guard'; pid = $window.actualLauncherPid; earliest = $window.startedAt; latest = $window.completedAt; exact = $false }
)
foreach ($identity in $identities)
{
    $current = @($processes | Where-Object { $_.ProcessId -eq $identity.pid })
    $possible = $false
    if ($current.Count -eq 1)
    {
        $created = $current[0].CreationDate.ToUniversalTime()
        $first = [DateTimeOffset]::Parse($identity.earliest).UtcDateTime
        $last = [DateTimeOffset]::Parse($identity.latest).UtcDateTime
        $possible = if ($identity.exact)
        {
            [Math]::Abs(($created - $first).TotalMilliseconds) -lt 1
        }
        else
        {
            $created -ge $first.AddMilliseconds(-1) -and $created -le $last.AddMilliseconds(1)
        }
    }
    $checks += @{
        kind = $identity.kind; pid = $identity.pid
        actualSameOrPossiblyOwnedCreationIdentityLive = $possible
        actualPidReusedOutsideRecordedCreationBounds = $current.Count -eq 1 -and -not $possible
        currentName = if ($current.Count -eq 1) { $current[0].Name } else { $null }
        currentCreationUtc = if ($current.Count -eq 1) { $current[0].CreationDate.ToUniversalTime().ToString('o') } else { $null }
        actualStoppedOrWaitedUnrelatedProcess = $false
    }
}
$recognized = @($processes | Where-Object {
    $_.Name -match '^(dotnet|node|corerun|BenchmarkDotNet.*)[.]exe$' -and
        $_.CommandLine -match '(?i)(AutoPerf[.\\]|BenchmarkDotNet|F[0-9]{3}-(compare|benchmark)|[ .]measure[ .])'
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine)
if (@($checks | Where-Object { $_.actualSameOrPossiblyOwnedCreationIdentityLive }).Count -ne 0 -or $recognized.Count -ne 0)
{
    throw 'A known owned or recognizable process remains; preserve the lease and do not release workers.'
}
$policyPath = Join-Path $parallel 'policy.json'
$admission = Get-Content -LiteralPath (Join-Path $root 'timing-admission-030.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash -cne $admission.actualPolicyAfterSha256)
{
    throw 'The admitted policy changed unexpectedly.'
}
$policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
Copy-Item -LiteralPath $leasePath -Destination (Join-Path $root 'failed-gateway-lease-031.json') -ErrorAction Stop
Copy-Item -LiteralPath $policyPath -Destination (Join-Path $parallel 'policy-before-F140-release-031.json') -ErrorAction Stop
if ((Get-FileHash -LiteralPath $leasePath -Algorithm SHA256).Hash -cne $leaseHash)
{
    throw 'Lease changed during explicit terminal-owner review; do not remove it.'
}
Remove-Item -LiteralPath $leasePath
$policy.actualWorkerBuildHoldActive = $false
$policy.workersMayBuildOrTest = $true
$policy.buildAndTestWorkQuiesced = $false
$policy.explicitF140HoldState = 'Original authorization1 failed at the launcher ancestry/creation-identity guard before dotnet start, execution-directory creation or counters. Budget permanently closed1of3;no retry or Default timing. Exact gate/driver/launcher terminal and empty-executions reviewed; failed lease explicitly archived/removed. Workers may resume only after the coordinator RELEASE message.'
$policy | Add-Member -NotePropertyName explicitF140HoldReleasedAt -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
[IO.File]::WriteAllText($policyPath, ($policy | ConvertTo-Json -Depth 35) + "`n")
$receipt = @{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    findingId = 'F140'; actualExplicitHoldId = 'F140-027'
    actualAuthorizationConsumed = 1; actualBudgetPermanentlyClosed = $true
    actualUnusedAuthorizationsPermanentlyClosed = 2
    actualNativeDotnetOrWarmupOrAllocationOrStopwatchExecuted = $false
    actualReason = 'Frozen launcher failed at line37 ancestry/creation-identity guard, before execution directory and Process.Start.'
    actualIndividualAncestrySubcheckFailureCauseEstablished = $false
    actualEmptyExecutionsDirectoryObserved = $true
    actualCounterResultOrCompletedPairProduced = $false
    actualDefaultAuthorizationAttempted = $false
    actualRecordedBudgetNoTimingYetFalseMeansAuthorizationConsumedNotCounterEvidence = $true
    actualFailedLeaseSha256 = $leaseHash
    actualFailedLeaseArchivedAs = Join-Path $root 'failed-gateway-lease-031.json'
    actualGatewayEvents = $events
    actualKnownOwnerTerminalChecks = $checks
    actualRecognizedBenchmarkProcesses = $recognized
    actualFailedLeaseExplicitlyRemovedOnlyAfterTerminalOwnerReview = $true
    actualGatewayUnmodified = $true
    actualPolicyAfterReleaseSha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
    actualNoSharedHostIdlenessOrExhaustiveProcessClosureClaim = $true
    actualPerformancePrCreated = $false
}
$receipt | ConvertTo-Json -Depth 25 | Set-Content -LiteralPath $receiptPath -Encoding utf8
@{
    actualBudgetPermanentlyClosed = $true; actualAuthorizationConsumed = 1
    actualMeasuredNativeProcesses = 0; actualCompletedPairs = 0
    actualExactGateDriverLauncherTerminal = $true
    actualFailedLeaseExplicitlyRemoved = $true
    actualWorkersMayResumeAfterReleaseMessage = $true
    actualNoRetryOrDefaultAuthorization = $true
} | ConvertTo-Json
