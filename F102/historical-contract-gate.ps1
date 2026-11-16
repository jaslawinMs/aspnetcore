$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F102'
$destination = Join-Path $run 'contract-gate.json'
if (Test-Path -LiteralPath $destination) { throw 'Actual F102 contract gate already exists;inspect rather than overwrite.' }
$manifest = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
$counterexample = $null
foreach ($phase in @(
    @('frozen-original-characterization',0),
    @('frozen-original-deadline-red',1),
    @('frozen-generic-reuse-equivalence-red',1)
))
{
    $report = Get-Content (Join-Path $run "verification\$($phase[0])\states\explicit-property-write-timeout-contract-resources.json") -Raw | ConvertFrom-Json
    $command = Get-Content (Join-Path $run "$($phase[0])-command.json") -Raw | ConvertFrom-Json
    $failures = @($report.Observations | Where-Object Name -EQ 'OriginalFinitePropertyWriteDeadline_FailsWhilePending')
    $controls = @($report.Observations | Where-Object Name -EQ 'NearestAwaitedVoidDeadline_CancelsPending')
    $serialization = @($report.Observations | Where-Object Name -EQ 'PropertyWriteDeadline_CancelsDuringActualValueSerialization')
    $errors = @($report.Observations | Where-Object Name -in 'ActualPropertyWriteSerializationFailure_IsReturnedTaskError',
        'ActualPropertyWriteSynchronousTransportFailure_IsReturnedTaskError')
    $counterexample = $report.GenericReuseControl
    if ($command.actualExitCode -ne $phase[1] -or $command.expectedExitCode -ne $phase[1] -or
        $command.ownerSha256 -cne $manifest.target_assembly_sha256 -or $command.harnessSha256 -cne $manifest.benchmark_assembly_sha256 -or
        $report.Observations.Count -ne 25 -or $failures.Count -ne 3 -or $controls.Count -ne 3 -or
        $report.OriginalPropertyWriteDeadlineFailures -ne 3 -or -not $report.PropertyHasInputValueSerialization -or
        -not $report.ActualRuntimeSetterIsAsync -or $errors.Count -ne 2 -or
        @($errors | Where-Object { -not $_.Detail.returnedTask }).Count -or
        $serialization.Count -ne 1 -or -not $serialization[0].Detail.getterEntered -or
        -not $serialization[0].Detail.tokenRequestedWhileGetterHeld -or
        -not $serialization[0].Detail.extensionHadNotReturnedAtCancellation -or
        $serialization[0].Detail.dispatchesAtCancellation -ne 0 -or -not $serialization[0].Detail.actualExceptionTokenMatched -or
        -not $serialization[0].Detail.publicTaskCanceled -or $counterexample.GenericReuseEquivalent -or
        $counterexample.IsShippingCandidate -or $counterexample.IsBenchmarkSpeedup -or
        $counterexample.ActualOriginalRetainedTokenCanceled -or -not $counterexample.ActualReusedRetainedTokenCanceled -or
        -not $counterexample.ActualLaterCallCanceled -or -not $counterexample.ActualResetSucceeded)
    {
        throw 'Actual frozen setter/void/error/serialization/deadline/public-token evidence required for this bounded rejection.'
    }
}
[ordered]@{
    candidate='F102';disposition='rejected';actualOriginalObservations=25;originalPendingDeadlineFailures=3
    originalDeadlineFailureNotRepaired=$true;propertyHasInputValueSerialization=$true;actualRuntimeSetterIsAsync=$true
    actualBenchmarkReturn='System.Void';actualPublicAcknowledgment='null';actualSerializedScalarArguments='[123]'
    actualPublicConsumerReuseCounterexample=$counterexample;shippingSourceChanged=$false;compiledPerformanceCandidate=$false
    maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
    ownerSha256=$manifest.target_assembly_sha256;harnessSha256=$manifest.benchmark_assembly_sha256
    note='Generic finite CTS deletion/unconditional reset-reuse is not contract-equivalent:real retained setter tokens/zero/pre-return value serialization/errors/default overrides matter. Original pending deadline failure preserved/unfixed. Async runtime setter captures serializer/transport failures;null/timeout remain synchronous extension errors. Not a compiled candidate,no universal private-redesign disproof or native mutation/browser claim.'
} | ConvertTo-Json -Depth 8 | Set-Content $destination
Write-Output 'F102 generic setter CTS strategy rejected on actual public consumers/serialization/tokens;original deadline failure not repaired,0 source comparisons.'
