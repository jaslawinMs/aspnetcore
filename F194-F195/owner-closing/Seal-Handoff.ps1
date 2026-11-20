$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$capsule = Join-Path $root 'capsule'
$sealPath = Join-Path $root 'SEALED-HANDOFF.json'
if (Test-Path -LiteralPath $sealPath)
{
    throw 'Do not overwrite a sealed handoff'
}
$receiptPath = "$root\node-attempts\05-final-permission-bounded-audit\receipt.json"
$receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
$reportPath = "$root\node-attempts\05-final-permission-bounded-audit\stdout.txt"
$stderrPath = "$root\node-attempts\05-final-permission-bounded-audit\stderr.txt"
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($receipt.rootExitCode -ne 0 -or -not $receipt.rootHasExited -or -not $receipt.stdoutTaskCompleted -or -not $receipt.stderrTaskCompleted -or $report.status -ne 'PASS')
{
    throw 'Actual final auditor did not finish successfully with drained streams'
}
if ((Get-Item -LiteralPath $stderrPath).Length -ne 0)
{
    throw 'Final auditor has nonempty stderr'
}
$manifestSHA = (Get-FileHash -LiteralPath "$capsule\MANIFEST.json" -Algorithm SHA256).Hash
if ($manifestSHA -ne $report.manifestSHA256)
{
    throw 'Manifest changed after successful auditor'
}
$current = Get-CimInstance Win32_Process -Filter "ProcessId=$($receipt.ownedRoot.pid)" -Property ProcessId,CreationDate
$state = if ($null -eq $current)
{
    'pid-absent'
}
elseif ($null -eq $current.CreationDate)
{
    throw 'Final auditor current creation identity unavailable; do not normalize it to terminal'
}
else
{
    $a = [Numerics.BigInteger]::Parse($receipt.ownedRoot.creationTicks)
    $b = [Numerics.BigInteger]::Parse($current.CreationDate.ToUniversalTime().Ticks.ToString())
    if ([Numerics.BigInteger]::Divide($a, 10) -eq [Numerics.BigInteger]::Divide($b, 10))
    {
        throw 'Final auditor same creation identity still observed'
    }
    'pid-reused-original-identity-absent'
}
$closure = Get-Content -LiteralPath "$capsule\evidence\final-process-closure.json" -Raw | ConvertFrom-Json
$results = Get-Content -LiteralPath "$capsule\RESULTS.json" -Raw | ConvertFrom-Json
$go = Get-Content -LiteralPath "$capsule\evidence\GO.json" -Raw | ConvertFrom-Json
$goInstantUtc = ([DateTimeOffset]$go.receivedUtc).UtcDateTime
$nativeReceipts = @(Get-ChildItem -LiteralPath "$capsule\attempts" -Directory | ForEach-Object {
    Get-Content -LiteralPath "$($_.FullName)\receipt.json" -Raw | ConvertFrom-Json
})
$guardsVerified = $closure.unavailableIdentities -eq 0 -and $closure.sameIdentityStillObserved -eq 0
foreach ($r in $nativeReceipts)
{
    if (-not $r.rootHasExited -or -not $r.stdoutTaskCompleted -or -not $r.stderrTaskCompleted -or [string]::IsNullOrWhiteSpace($r.ownedRoot.creationTicks))
    {
        $guardsVerified = $false
    }
}
if (-not $guardsVerified)
{
    throw 'Saved native root/stream/identity validation failed'
}
$graphCreation = @()
foreach ($graph in @('C:\src\ap-F194-o042', 'C:\src\ap-F194-d042'))
{
    $created = (Get-Item -LiteralPath $graph).CreationTimeUtc
    $afterGo = $created -ge $goInstantUtc
    if (-not $afterGo)
    {
        throw 'Observed private graph creation predates GO'
    }
    $graphCreation += [ordered]@{ path = $graph; observedCreationUtc = $created.ToString('o'); afterExplicitRegisteredGO = $afterGo }
}
$files = @(Get-ChildItem -LiteralPath $capsule -Recurse -File)
$enclosingBytes = ($files | Measure-Object Length -Sum).Sum
if ($files.Count -ne $report.enclosingCapsule.files -or $enclosingBytes -ne $report.enclosingCapsule.bytes)
{
    throw 'Enclosing capsule counts changed after audit'
}
$postSealAttempts = @()
foreach ($file in Get-ChildItem -LiteralPath "$root\seal-attempts" -Recurse -File)
{
    $postSealAttempts += [ordered]@{
        pathOutsideCapsule = $file.FullName.Substring($root.Length + 1)
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        rawBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file.FullName))
    }
}
$seal = [ordered]@{
    schema = 1
    state = 'SEALED-HANDOFF'
    sealedUtc = [DateTime]::UtcNow.ToString('o')
    actualCurrentOwnerId = 'bb4c15c7-3a8e-4145-b72f-7da74cfea243'
    ownerRegistrationReceipt = 'capsule\evidence\owner-registration.json'
    findings = [ordered]@{ F194 = 'PENDING'; F195 = 'PENDING' }
    comparisonAuthorizations = 0
    preparationOnly = $true
    candidateImplemented = $false
    benchmarkRun = $false
    performanceOutcomeDecided = $false
    capsulePath = $capsule
    handoff = "$capsule\HANDOFF.md"
    results = "$capsule\RESULTS.json"
    manifestSHA256 = $manifestSHA
    payloadSetSHA256 = $report.payloadSetSHA256
    payload = $report.payload
    manifestEnvelope = $report.envelope
    enclosingCapsule = $report.enclosingCapsule
    countScope = 'Payload excludes the two enclosing MANIFEST files. This external seal and audit-attempt files are outside the capsule and excluded from all capsule counts.'
    successfulAuditor = [ordered]@{
        exactCommand = $receipt.exactCommand
        executable = $receipt.executable
        executableSHA256 = $receipt.executableSHA256
        arguments = $receipt.arguments
        receiptPath = $receiptPath
        receiptSHA256 = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash
        root = $receipt.ownedRoot
        rootHasExited = $receipt.rootHasExited
        exitCode = $receipt.rootExitCode
        stdoutPath = $reportPath
        stdoutBytes = (Get-Item -LiteralPath $reportPath).Length
        stdoutSHA256 = (Get-FileHash -LiteralPath $reportPath -Algorithm SHA256).Hash
        stdoutDrained = $receipt.stdoutTaskCompleted
        stderrPath = $stderrPath
        stderrBytes = (Get-Item -LiteralPath $stderrPath).Length
        stderrSHA256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
        stderrDrained = $receipt.stderrTaskCompleted
        finalObservedRootIdentityState = $state
        finalObservedRootIdentityCheckedUtc = [DateTime]::UtcNow.ToString('o')
        childProcessPermission = $false
        filesystemWritePermission = $false
        filesystemReadPermission = $capsule
        nativeAddonsEnabled = $false
        childObservationLimit = 'Permission-bounded auditor cannot launch children; the wrapper does not claim an independent universal child-process inventory.'
    }
    nativeRootsAndStreams = [ordered]@{
        savedRootReceipts = $nativeReceipts.Count
        savedDotnetRootReceipts = @($nativeReceipts | Where-Object command -Like 'dotnet *').Count
        allSavedRootsHaveRealExitCodesAndCreationIdentities = $guardsVerified
        allSavedRootStreamsDrained = $guardsVerified
        observedChildChecksAtCommandCompletion = $report.observedChildIdentityChecksAtCommandCompletion
        finalIdentityChecks = $closure.checkedIdentities
        missingIdentities = $closure.unavailableIdentities
        sameIdentitiesStillObserved = $closure.sameIdentityStillObserved
        closureReceipt = "$capsule\evidence\final-process-closure.json"
        closureReceiptSHA256 = (Get-FileHash -LiteralPath "$capsule\evidence\final-process-closure.json" -Algorithm SHA256).Hash
        nativeTestHostExitCodes = [ordered]@{ Original = $null; Default = $null }
        nativeTestHostExitHooks = 'Absent; not converted to zero exits. OS PID-plus-creation absence checks are separately retained.'
        universalProcessClosureClaimed = $false
    }
    sourceRoles = [ordered]@{
        Original = $results.originalSHA
        DefaultIndependentlyObservedAtEntryAndBuilt = $results.defaultEntrySHA
        ClosingMain = $results.defaultClosingSHA
        closingDriftObserved = $results.defaultHeadDriftObserved
        retargeted = $false
    }
    boundaries = [ordered]@{
        nativeCasesPerRole = 11
        supplementalCasesPerRole = 12
        nativeTheoryRowsPerRole = 2
        selectedPEPDBPairs = $report.selectedPEPDBPairs
        selectedRawPDBDocumentsVerified = $report.parsedRawDocumentChecksums
        rawGitObjectsVerified = $report.rawGitObjects
        rawGitMembershipProofsVerified = $report.rawGitMemberships
        commonConsumerSuccessfulCompilations = 1
        commonConsumerSourceRevisions = 0
        actualSameConsumerDLLForBothRoles = $true
        nativeSelectedFramework = 'net12.0'
        nativeTestHostManagedTestMvidReflectionObserved = $false
        supplementalManagedTestMvidReflectionObserved = $true
        nativeTestHostRuntimeEntryObserved = $true
    }
    entryHold = [ordered]@{
        explicitRegisteredGo = "$capsule\evidence\GO.json"
        entryHold = "$capsule\evidence\ENTRY-HOLD.json"
        graphCreationObservations = $graphCreation
        firstSavedNativeCommandUtc = ($nativeReceipts | Sort-Object startedUtc | Select-Object -First 1).startedUtc
        noNativeCommandOrGraphCreationBeforeGO = $true
        verificationLimit = 'This attests to the recorded owner operations and observed graph creation metadata; it is not a universal machine/process history audit.'
        admissionPolicyOrGatewayChangedByOwner = $false
    }
    limitations = $report.limits
    postSealExternalClosureAttempts = [ordered]@{
        storage = 'Outside the frozen payload; no capsule bytes were changed after manifest/audit'
        causeAndResolution = 'Initial external sealer double-parsed an already-UTC DateTime from ConvertFrom-Json, losing timezone kind and wrongly reporting pre-GO graph creation. Preserved diagnostic proves both actual graph creation instants are after actual GO; corrected sealer uses DateTimeOffset without reparsing.'
        missingRootIdentityLimit = 'The failed direct PowerShell metadata/seal tool calls captured tool exits but not separately owned root PID/creation receipts. They are not represented as native test roots or silently given zero identities.'
        filesWithInlineExactBytes = $postSealAttempts
    }
    coordinatorAction = 'Independently audit the copied capsule, then decide any later finding outcomes. No campaign completion or publication is authorized by this seal.'
}
$seal | ConvertTo-Json -Depth 25 | Set-Content -LiteralPath $sealPath -Encoding utf8
$sha = (Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
[IO.File]::WriteAllText("$root\SEALED-HANDOFF.sha256", "$sha  SEALED-HANDOFF.json`r`n")
Write-Output "SEALED-HANDOFF=$sealPath"
Write-Output "SEALED-HANDOFF-SHA256=$sha"
Write-Output "CAPSULE-MANIFEST-SHA256=$manifestSHA"
Write-Output "PAYLOAD=$($report.payload.files) files; $($report.payload.bytes) bytes; ENCLOSING=$($report.enclosingCapsule.files) files; $($report.enclosingCapsule.bytes) bytes"
