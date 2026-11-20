$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$parallel = Join-Path $session 'autoperf-parallelism'
$run = Join-Path $session 'autoperf-runs\F219'
$comparison = Join-Path $run 'comparisons\001'
$leasePath = Join-Path $parallel 'benchmark-exclusive.lease.json'
$budgetPath = Join-Path $run 'diagnostic-budget.json'
$policyPath = Join-Path $parallel 'policy.json'
$token = '29fcd42d-5f9a-43a1-b332-05359b6fd2e4'
$lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json -AsHashtable
$stdout = Get-Content -LiteralPath (Join-Path $comparison 'block-1-BaselineBefore.stdout.txt') -Raw
$lifecycle = Get-Content -LiteralPath (Join-Path $comparison 'block-1-BaselineBefore.lifecycle.json') -Raw | ConvertFrom-Json
if ($lease.token -cne $token -or $lease.findingId -cne 'F219' -or $lease.gatePid -ne 26060 -or
    $budget.closed -ne $false -or $budget.authorizations.Count -ne 1 -or $budget.authorizations[0].status -cne 'failed-or-partial')
{
    throw 'The exact failed authorization/lease state changed.'
}
if ($lifecycle.actualOwnedChildPid -ne 38660 -or $lifecycle.actualExitCode -ne 1 -or $lifecycle.actualChildAwaitedToExit -ne $true -or
    ([regex]::Matches($stdout, 'cannot be run in-process\.')).Count -ne 3 -or
    $stdout -match '(?m)^(WorkloadWarmup|WorkloadActual|WorkloadResult|OverheadActual|OverheadWarmup)' -or
    (Test-Path -LiteralPath (Join-Path $comparison 'block-1-BaselineBefore-observation\measurement.json')))
{
    throw 'Actual pre-warmup failure evidence differs; do not normalize it.'
}
if ((Get-FileHash -LiteralPath $policyPath).Hash -cne '492E61E043CC988B4C927872D0E21D17D04C642E4112A475876F063597F01EB4')
{
    throw 'Policy changed before explicit failed-slot retirement.'
}
$events = @(Get-Content -LiteralPath (Join-Path $parallel 'benchmark-gate-events.jsonl') |
    ForEach-Object { $_ | ConvertFrom-Json } | Where-Object token -CEQ $token)
if (@($events | Where-Object { $_.event -eq 'child-started' -and $_.childPid -eq 50900 }).Count -ne 1 -or
    @($events | Where-Object { $_.event -eq 'child-ended' -and $_.actualExitCode -eq 1 -and $_.leaseMayRelease -eq $false }).Count -ne 1)
{
    throw 'Actual gateway-child terminal receipts differ.'
}
$observed = @(Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -in @(26060, 50900, 38660) -or
    ($_.ProcessId -ne $PID -and $_.Name -match '^(dotnet|node|pwsh|testhost|VBCSCompiler|MSBuild)\.exe$' -and
        $_.CommandLine -match '(?i)(causal-original-145|F219\.ExistingBenchmark|F219-Original-compare\.mjs)')
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine)
if ($observed.Count -ne 0)
{
    $observed | ConvertTo-Json -Depth 6 | Write-Output
    throw 'A recorded PID or known finding process is present; do not remove the failed lease.'
}
$mutex = [Threading.Mutex]::new($false, 'Global\AspNetCore.AutoPerf.ExclusiveBenchmark.v1')
$acquired = $false
try
{
    $acquired = $mutex.WaitOne(0)
    if (-not $acquired)
    {
        throw 'The global benchmark mutex is currently owned.'
    }
    if ((Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json).token -cne $token)
    {
        throw 'Lease changed during explicit review.'
    }
    [IO.File]::Copy($leasePath, (Join-Path $comparison 'gate-failed-lease.json'), $false)
    [IO.File]::Copy($budgetPath, (Join-Path $comparison 'diagnostic-budget-before-closure.json'), $false)
    [IO.File]::Copy($policyPath, (Join-Path $comparison 'policy-before-slot-retirement.json'), $false)
    $budget.authorizations[0].actualRecordedDriverStatusBeforeNormalization = 'failed-or-partial'
    $budget.authorizations[0].status = 'failed'
    $budget.authorizations[0].failureSubtype = 'pre-warmup-inprocess-toolchain-validation-rejected'
    $budget.authorizations[0].actualStartedNativeChildren = 1
    $budget.authorizations[0].actualWarmupExecutions = 0
    $budget.authorizations[0].actualCounterMeasurements = 0
    $budget.authorizations[0].actualCandidateOrDefaultExecuted = $false
    $budget.closed = $true
    $budget.closedAtUtc = [DateTime]::UtcNow.ToString('o')
    $budget.performanceOrAllocationMeasurementsPerformed = $false
    $budget.measurementBoundary = 'Actual first baseline process rejected all three cases during BDN in-process support validation before engine/warmup/counters. One authorization consumed, no measured pairs or controls.'
    $budget.closeReason = 'Inconclusive pre-warmup harness admission failure. Preserve frozen one-comparison-per-source-role/no-retry clause; Original did not qualify, so Default is prohibited. Permanently closed1of3; not measured no gain or zero benefit.'
    $budget | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $budgetPath -Encoding utf8NoBOM
    $policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json -AsHashtable
    $policy.approvedBenchmarkDrivers = @($policy.approvedBenchmarkDrivers | Where-Object findingId -CNE 'F219')
    $policy.buildAndTestWorkQuiesced = $false
    $policy.F219TimingAdmissionRetired = @{
        recordedAtUtc = [DateTime]::UtcNow.ToString('o'); actualClosedAuthorizations = 1
        actualNoWarmupOrMeasurements = $true; actualNoRetryOrReopening = $true
        actualFailure = 'Custom adapter is rejected by stock InProcessNoEmitToolchain support validator concrete-type rule.'
        actualOriginalDriverAndImagesPreserved = $true
    }
    $policy | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $policyPath -Encoding utf8NoBOM
    if ((Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json).token -cne $token)
    {
        throw 'Lease identity changed before explicit removal.'
    }
    Remove-Item -LiteralPath $leasePath
    $receipt = [ordered]@{
        recordedAtUtc = [DateTime]::UtcNow.ToString('o'); actualExplicitCoordinatorReview = $true
        actualLeaseToken = $token; actualRecordedGateDriverAndNativePidsAbsent = @(26060, 50900, 38660)
        actualKnownFindingProcessesRemaining = $observed; actualMutexAcquired = $true
        actualLeaseArchivedBeforeRemoval = $true; actualAutomaticStaleRecovery = $false
        actualClosedBudgetSha256 = (Get-FileHash -LiteralPath $budgetPath).Hash
        actualAfterPolicySha256 = (Get-FileHash -LiteralPath $policyPath).Hash
        actualNoProcessStopped = $true; actualNoMachineOrPriorityAffinityPowerChange = $true
    }
    $receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $comparison 'explicit-failed-slot-retirement.json') -Encoding utf8NoBOM
    [IO.File]::AppendAllText((Join-Path $parallel 'benchmark-gate-events.jsonl'),
        (([ordered]@{ event = 'explicit-failed-lease-archived-retired'; token = $token; findingId = 'F219'; recordedAt = $receipt.recordedAtUtc;
            actualNoAutomaticRecovery = $true; actualClosedBudget = $true } | ConvertTo-Json -Compress) + "`n"))
    $receipt | ConvertTo-Json -Depth 10
}
finally
{
    if ($acquired)
    {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
