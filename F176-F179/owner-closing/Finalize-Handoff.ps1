$ErrorActionPreference = 'Stop'
$owner = $PSScriptRoot
$capsule = Join-Path $owner 'capsule'
function ReadJson([string]$path)
{
    Get-Content $path -Raw | ConvertFrom-Json -DateKind String
}
function Hash([string]$path)
{
    (Get-FileHash $path -Algorithm SHA256).Hash
}
function Require([bool]$condition, [string]$message)
{
    if (!$condition)
    {
        throw $message
    }
}
function WriteAtomic([string]$path, $value)
{
    $stage = "$path.$PID.stage"
    [IO.File]::WriteAllText($stage, ($value | ConvertTo-Json -Depth 40), [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($stage, $path, $false)
}
$handoffPath = Join-Path $owner 'SEALED-HANDOFF.json'
$terminalPath = Join-Path $owner 'FINAL-TERMINAL.json'
Require (!(Test-Path $handoffPath) -and !(Test-Path $terminalPath)) 'Do not overwrite a final handoff/terminal record.'
$auditReceiptPath = Join-Path $owner 'offline-audit-04.receipt.json'
$audit = ReadJson $auditReceiptPath
$auditResult = ReadJson $audit.stdoutPath
$manifestPath = Join-Path $capsule 'MANIFEST.json'
$manifest = ReadJson $manifestPath
$manifestSha = Hash $manifestPath
$results = ReadJson (Join-Path $capsule 'RESULTS.json')
$terminal = ReadJson (Join-Path $capsule 'TERMINAL.json')
$closing = ReadJson (Join-Path $capsule 'closing.json')
$correctionPath = Join-Path $owner 'F140-HOLD-027-ack-correction.json'
$correction = ReadJson $correctionPath
Require ($audit.exitCode -eq 0 -and $audit.nativeExited -and $audit.bothStreamsDrained) 'Actual auditor/streams are not complete.'
Require ($auditResult.result -eq 'PASS') 'Actual auditor stdout does not report PASS.'
Require ((Hash $audit.stdoutPath) -eq $audit.stdoutSha256 -and (Hash $audit.stderrPath) -eq $audit.stderrSha256) 'Actual auditor output hash changed.'
Require ((Get-Item $audit.stderrPath).Length -eq 0) 'Successful auditor stderr is not empty.'
Require ($manifestSha -eq $audit.manifestSha256 -and $manifestSha -eq $auditResult.manifestSha256) 'Post-audit manifest changed.'
Require ($manifest.fileCount -eq $auditResult.selectedFiles -and $manifest.totalBytes -eq $auditResult.selectedBytes) 'Audit/manifest selected counts differ.'
Require ($auditResult.findings.Count -eq 4 -and ($auditResult.findings -join ',') -eq 'F176,F177,F178,F179') 'Wrong bounded scope.'
Require ($auditResult.status -eq 'PENDING' -and $auditResult.candidates -eq 0 -and $auditResult.comparisons -eq 0) 'No candidate/comparison/outcome is authorized.'
Require ($correction.historicalKnownIdentities -eq 591 -and $correction.historicalMatchingOwnedLive -eq 0) 'Historical exact identity correction is incomplete.'
Require ((Hash $correctionPath) -eq (Hash (Join-Path $capsule 'control\F140-HOLD-027-ack-correction.json'))) 'Portable correction differs from top-level correction.'
Require ((Hash (Join-Path $owner 'F140-HOLD-027-ack.json')) -eq $correction.originalAckSha256) 'Original HOLD acknowledgement changed.'
$known = @{}
function AddKnown([int]$processId_, [string]$creationUtc, [string]$kind, [string]$label)
{
    Require ($creationUtc -match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$') 'Expected process creation UTC lost its exact format.'
    $key = "$processId_@$creationUtc"
    if (!$known.ContainsKey($key))
    {
        $known[$key] = [ordered]@{
            processId = $processId_
            creationUtc = $creationUtc
            kinds = [Collections.Generic.HashSet[string]]::new()
            labels = [Collections.Generic.HashSet[string]]::new()
        }
    }
    [void]$known[$key].kinds.Add($kind)
    [void]$known[$key].labels.Add($label)
}
foreach ($record in $terminal.processObservations)
{
    foreach ($kind in $record.kinds)
    {
        foreach ($label in $record.labels)
        {
            AddKnown $record.processId $record.creationUtc $kind $label
        }
    }
}
$audits = @()
foreach ($number in @('01','02','03','04'))
{
    $path = Join-Path $owner "offline-audit-$number.receipt.json"
    $record = ReadJson $path
    Require ($record.nativeExited -and $record.bothStreamsDrained) 'A previous offline auditor did not finish/drain.'
    AddKnown $record.processId $record.creationUtc 'read-only-offline-auditor' $record.attempt
    AddKnown $record.wrapperPid $record.wrapperCreationUtc 'offline-auditor-wrapper' $record.attempt
    $audits += [ordered]@{
        attempt = $record.attempt
        receipt = [IO.Path]::GetFileName($path)
        receiptSha256 = Hash $path
        exitCode = $record.exitCode
        nativeExited = $record.nativeExited
        bothStreamsDrained = $record.bothStreamsDrained
        stdoutSha256 = Hash $record.stdoutPath
        stderrSha256 = Hash $record.stderrPath
    }
}
$snapshot = @{}
Get-CimInstance Win32_Process -Property ProcessId,CreationDate | ForEach-Object {
    if ($known.Values.processId -contains [int]$_.ProcessId)
    {
        $snapshot[[int]$_.ProcessId] = $_.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
    }
}
$checkedAt = [DateTime]::UtcNow.ToString('o')
$observations = @($known.Values | Sort-Object processId,creationUtc | ForEach-Object {
    $liveCreation = $snapshot[$_.processId]
    [ordered]@{
        processId = $_.processId
        creationUtc = $_.creationUtc
        kinds = @($_.kinds | Sort-Object)
        labels = @($_.labels | Sort-Object)
        checkedAtUtc = $checkedAt
        observedCreationUtc = $liveCreation
        terminalState = if (!$liveCreation) { 'not-running' } elseif ($liveCreation -ne $_.creationUtc) { 'pid-reused-not-the-recorded-owned-process' } else { 'matching-recorded-owned-process-live' }
    }
})
$remaining = @($observations | Where-Object terminalState -eq 'matching-recorded-owned-process-live')
Require ($remaining.Count -eq 0) 'A recorded native/child/wrapper/offline-auditor identity is still live.'
$terminalFinal = [ordered]@{
    observedAtUtc = $checkedAt
    agentId = '06005641-57b2-4fa5-856c-b2bf4bf642e9'
    scope = @('F176','F177','F178','F179')
    nativeTerminalSelected = 'capsule\TERMINAL.json'
    nativeTerminalSha256 = Hash (Join-Path $capsule 'TERMINAL.json')
    nativeCommandCount = $terminal.nativeCommandCount
    nativeSuccesses = $terminal.nativeSuccesses
    nativeFailuresPreserved = $terminal.nativeFailuresPreserved
    priorKnownNativeAndClosingCliIdentities = $terminal.knownProcessIdentityCount
    offlineAuditorReceipts = $audits
    knownPidCreationIdentityCount = $known.Count
    observations = $observations
    actualRemainingRecordedOwnedProcesses = $remaining
    actualRemainingOwnedNativeRoots = @()
    actualRemainingObservedChildren = @()
    actualRemainingSourceHeavyAuditors = @()
    actualNativeAndSourceHeavyIoQuiesced = $true
    bothStreamsDrained = $true
    smallMetadataWriter = [ordered]@{
        processId = $PID
        creationUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
        scope = 'This final small metadata-only write. The synchronous tool completion establishes its later exit; it is not a native build/test/source-heavy audit.'
    }
    boundary = 'Fresh sampled recheck of all 638 retained native/root/observed-child/wrapper/closing-CLI identities plus all four later offline auditor roots/wrappers, using exact raw six-fraction UTC strings. No process stopping, unrelated command-line serialization, exhaustive historical process census, or unsampled-descendant claim. Earlier synchronous offline helper without a separately captured PID is explicitly disclosed in the capsule.'
}
WriteAtomic $terminalPath $terminalFinal
$handoff = [ordered]@{
    schema = 'F176-F179-bounded-untimed-preparation-sealed-handoff-v1'
    sealedAtUtc = [DateTime]::UtcNow.ToString('o')
    agentId = '06005641-57b2-4fa5-856c-b2bf4bf642e9'
    scope = @('F176','F177','F178','F179')
    status = 'PENDING'
    candidates = 0
    comparisons = 0
    measurements = 0
    preparation = 'Sealed portable selected evidence; independent coordinator audit/acceptance still required.'
    capsulePath = $capsule
    capsuleRelative = 'capsule'
    report = [ordered]@{
        handoff = 'capsule\HANDOFF.md'
        handoffSha256 = Hash (Join-Path $capsule 'HANDOFF.md')
        results = 'capsule\RESULTS.json'
        resultsSha256 = Hash (Join-Path $capsule 'RESULTS.json')
        commands = 'capsule\COMMANDS.json'
        commandsSha256 = Hash (Join-Path $capsule 'COMMANDS.json')
    }
    source = $results.source
    manifest = [ordered]@{
        selected = 'capsule\MANIFEST.json'
        sha256 = $manifestSha
        selectedFiles = $manifest.fileCount
        selectedBytes = $manifest.totalBytes
        exclusions = @('Only root capsule MANIFEST.json','Only root capsule MANIFEST.sha256')
    }
    offlineAudit = [ordered]@{
        result = $auditResult.result
        exactExecutable = $audit.executable
        exactArguments = $audit.arguments
        workingDirectory = $audit.workingDirectory
        portableCommand = 'node Audit.cjs'
        receipt = [IO.Path]::GetFileName($auditReceiptPath)
        receiptSha256 = Hash $auditReceiptPath
        stdout = [IO.Path]::GetFileName($audit.stdoutPath)
        stdoutSha256 = Hash $audit.stdoutPath
        stderr = [IO.Path]::GetFileName($audit.stderrPath)
        stderrSha256 = Hash $audit.stderrPath
        processId = $audit.processId
        creationUtc = $audit.creationUtc
        wrapperPid = $audit.wrapperPid
        wrapperCreationUtc = $audit.wrapperCreationUtc
        exitCode = $audit.exitCode
        nativeExited = $audit.nativeExited
        bothStreamsDrained = $audit.bothStreamsDrained
        permissionBoundary = $audit.sourceHeavyScope
        priorFailedAudits = @('audit-history\01','audit-history\02','audit-history\03')
        reparseResult = $auditResult
    }
    nativeRows = [ordered]@{
        modes = @('unhooked bounded module observations','atomic identity hook plus bounded module observations')
        perRolePerMode = [ordered]@{ coreFacts = 3; razorRows = 8; caseLookupInlineDataRows = 3 }
        roles = @('Original37','whole independently observed entry Default')
        actualTrxCount = 8
        allAcceptedIndividualResults = 'Passed; actual structured XML definition/entry/execution IDs, each parameterized case and counters independently reconciled by offline auditor.'
        exactNamesCommandsResults = 'capsule\HANDOFF.md; capsule\COMMANDS.json; capsule\native-selection.json; selected real TRXs'
        reachabilityBoundary = 'Core descriptor and Razor provider mock-unit contracts are distinct from the supplemental actual public-producer evidence.'
    }
    supplemental = [ordered]@{
        scenariosPerRole = 9
        checksPerRole = 94
        accepted = 'Passed on both roles, exact same compiled consumer four-file artifact; actual public MVC producers/controller discovery/endpoint materialization, real native precompiled Razor asset/provider/compiler/page factory/view ExecuteAsync.'
        compileHistory = $results.compilation
        realNativeDependencyHandling = $results.dependencyRepair
        boundary = 'No HTTP host/request/browser, prevalence, application cardinality/frequency, request hotness, performance, concurrency, hot-reload refresh, or ALC-reclamation claim.'
    }
    runtime = $results.runtime
    selectedEvidence = $results.selectedEvidence
    producerBoundaries = $results.producerBoundaries
    semanticBoundaries = $results.semanticBoundaries
    failedAndSupersededStates = $results.priorFailures
    historicalHold = [ordered]@{
        originalAck = 'F140-HOLD-027-ack.json'
        originalAckSha256 = $correction.originalAckSha256
        originalAckUnmodified = $true
        exactIdentityCorrection = 'F140-HOLD-027-ack-correction.json'
        correctionSha256 = Hash $correctionPath
        historicalExactIdentities = $correction.historicalKnownIdentities
        historicalMatchingOwnedLive = $correction.historicalMatchingOwnedLive
        correction = $correction.correction
        explicitRelease = 'F140-RELEASE-027-observed.json'
    }
    finalTerminal = [ordered]@{
        selected = 'FINAL-TERMINAL.json'
        sha256 = Hash $terminalPath
        nativeCommands = $terminal.nativeCommandCount
        successfulNativeCommands = $terminal.nativeSuccesses
        failedNativeCommandsRetained = $terminal.nativeFailuresPreserved
        priorNativeAndClosingIdentities = $terminal.knownProcessIdentityCount
        finalKnownNativeClosingAndOfflineAuditorIdentities = $known.Count
        remainingRecordedOwned = 0
        bothStreamsDrained = $true
        actualNativeAndSourceHeavyIoQuiesced = $true
        watchersOrServicesStarted = $false
    }
    principalLimits = @(
        'Built Default is adf2e9d22addd1461c6c25e8a8f411be28b81100; closing main moved to 83d976704fa0f9aa4361327d1f9d929c93bd9256. Closing main was not built or relabeled as the build pin.',
        'Four actual native testhost managed ProcessExit snapshots are absent; actual initialization/owner-load events and bounded Process.Modules evidence do not provide full native managed exit closure. SDK exit snapshots are not substitutes.',
        'Six historical logical Razor Documents lack original raw bytes. Only real PDB checksum declarations plus pinned checked-in C# pragma witnesses are established for those six; no reconstruction/raw checksum-validation claim.',
        'Compiler host runtime was not separately sampled; actual accepted managed compiler/reference/response/source inputs, selected PE/PDB bytes and all-file inventories do not attest full uncopied SDK/runtime/distribution or native toolchain replay.',
        'All-file inventories include helpers, JSON, PDB, EXE, non-DLL and runtime-only differences without prefix exemptions; they are bounded hash observations, not proof of a pristine official runtime distribution.',
        'Historical HOLD expected-creation formatting defect and corrected ownership derivation are explicit; original ack bytes and original recorded actual PID absence/live-creation observations remain unchanged.',
        'All failed and superseded native/common/audit/preparation probes remain retained. One failed offline correction helper has a retained console transcript but no independently captured root PID receipt. No exhaustive historical process census is claimed.',
        'No shipping-source/permanent-test/public-API/tracked-config edits; no coordinator/donor, policy/ledger/publication, candidate, benchmark, metric-counter, commit, PR or issue writes were made.'
    )
    portablePackage = @(
        'capsule directory, unchanged after offline-audit-04 PASS',
        'SEALED-HANDOFF.json and SEALED-HANDOFF.sha256',
        'FINAL-TERMINAL.json',
        'offline-audit-04.stdout.txt; offline-audit-04.stderr.txt; offline-audit-04.receipt.json',
        'F140-HOLD-027-ack.json; F140-HOLD-027-ack-correction.json; F140-RELEASE-027-observed.json'
    )
}
Require ((Hash $manifestPath) -eq $manifestSha) 'Manifest changed during metadata-only finalization.'
WriteAtomic $handoffPath $handoff
$handoffSha = Hash $handoffPath
[IO.File]::WriteAllText((Join-Path $owner 'SEALED-HANDOFF.sha256'), "$handoffSha  SEALED-HANDOFF.json`n", [Text.UTF8Encoding]::new($false))
[ordered]@{
    handoff = $handoffPath
    handoffSha256 = $handoffSha
    manifestSha256 = $manifestSha
    selectedFiles = $manifest.fileCount
    selectedBytes = $manifest.totalBytes
    offlineAudit = $auditResult.result
    knownNativeClosingAndOfflineAuditorIdentities = $known.Count
    remainingOwned = $remaining.Count
    historicalHoldExactIdentityCorrectionSha256 = Hash $correctionPath
    status = 'PENDING'
    candidates = 0
    comparisons = 0
} | ConvertTo-Json -Depth 6
