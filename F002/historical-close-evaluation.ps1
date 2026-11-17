$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
$execution=Get-Content (Join-Path $run 'measurements\original-diagnostic-only\execution.json') -Raw|ConvertFrom-Json
$ready=Get-Content (Join-Path $run 'original-ready.json') -Raw|ConvertFrom-Json
$native=Get-Content (Join-Path $run 'native-ready.json') -Raw|ConvertFrom-Json
$pdb=Get-Content (Join-Path $run 'pdb\original\document-audit.json') -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons -ne 0 -or $budget.originalDiagnosticProfiles -ne 1 -or $execution.actualExitCode -ne 0 -or
    -not $execution.originalOnly -or $execution.sourceComparisons -ne 0 -or $pdb.verifiedDocuments -ne 26 -or
    $ready.componentCases -ne 4 -or $ready.publicAbortControls -ne 1 -or $native.actualExitCode -ne 0 -or
    -not $native.namedNativeAssertionReached -or (Test-Path (Join-Path $run 'final-evaluation.json'))){throw 'Exact completed original evidence and open unused comparison budget required.'}
Copy-Item $budgetPath (Join-Path $run 'measurement-budget-before-close.json')
[ordered]@{
    candidate='F002';maximumComparisons=3;usedComparisons=0;sourceShapesMeasured=0;candidateProfiles=0
    originalDiagnosticProfiles=1;originalMonitoringCases=4;closed=$true;unusedComparisons=3;closedAt=[DateTimeOffset]::UtcNow.ToString('o')
    reason='Actual native FIN callback reachability and ordinary component behavior established,not a contended registration/incomplete disposal/blocking latency precondition or compatible local optimization. Reject unestablished/design-blocked proposal;not a measured comparative no-gain.'
}|ConvertTo-Json -Depth 7|Set-Content $budgetPath -Encoding utf8
[ordered]@{
    candidate='F002';disposition='rejected';specificDisposition='design-blocked-unestablished-performance-gain'
    sourceSite='WebTransportSession.TryRemoveStream(long)'
    performancePrJustified=$false;shippingSourceChanged=$false;newSourceCommitCreated=$false;sourceComparisons=0
    originalDiagnosticProfiles=1;candidateProfiles=0;comparativeNoGainOrProvenFalsePositive=$false
    actualNativeQuicProducerExecuted=$true;nativeBoundary='Loopback QUIC FIN/real QuicStreamContext cancellation ->real HTTP3 header parsing/association through in-memory parent ->automatic target removal before direct TryRemoveStream.'
    componentCases=4;publicAbortControls=1;nativeFinControls=1;nativeAssertionBlocked=$false
    fullNetworkHttp3Executed=$false;heartbeatOrPoolExpiryCallbacksDriven=$false
    contendedCancellationRegistrationScheduleExercised=$false;incompleteDisposalOrBlockingLatencyEstablished=$false
    reason='The sync join and real producer callback exist. Ordinary real native closure and component states pass unchanged. No faithful contended-registration/incomplete-disposal latency case or equivalent local async lifecycle proposal was established. Dropping/discarding the awaitable,async-void or detached Task.Run changes cleanup completion/error ownership. Do not invent a performance fix,comparative no-gain or all-schedules-harmless conclusion.'
    timedBoundary='Cached bound direct original component invocation plus Boolean result store;not FIN-trigger-to-removal latency. In-memory component tokens remain uncancellable;separate native control uses genuinely cancellable tokens.'
    existingOwningTests='17 exact borrowed F001 passing rows,0 skipped,0 newly executed existing-test rows;source/image identities checked.'
    sourceWitnesses='28 baseline/default/working triples,27 default-equivalent;current Http3Stream changes outside selected cleanup neighborhoods,not a full current-default integration execution.'
    sourcePdbWitnesses='26 documents:16 exact borrowed F001 owners,2 earlier fresh F002 QUIC,8 fresh final F002 owners/harness. Not independent PE/PDB binding or method coverage.'
    preservedPreparationFailures='Build1 failed CS0122;builds2..6 passed. Native2/3/4 failed TLS before association;native4 actual server exception proves platform does not support ephemeral keys. Existing TestResources fixture/import helper resolves that preparation. Native5 passed TLS but failed missing IConnectionHeartbeatFeature during alignment disposal;native6 follows QuicTestHelpers registration-only heartbeat pattern and reaches all named FIN assertions. No producer callback injected.'
    noDeliberateOsSettingsOrUnrelatedProcessChanges=$true;permanentTestsOrShippingApiDependencyVisibilityChanges=$false
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $run 'final-evaluation.json') -Encoding utf8
Write-Output 'F002 rejected/unestablished local optimization;actual native FIN passed,0/3 comparisons used,one original-only4-case profile.'
