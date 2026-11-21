$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-286.ps1')

function Assert-Data286([bool] $Condition, [string] $Message)
{
    if (-not $Condition)
    {
        throw $Message
    }
}

$guard = Get-FreshGuard286 'Data-only286 integrity/custody audit; both permitted source roots already consumed'
Save-Guard286 (Join-Path $Out286 'control') 'audit-003-' $guard
$baseline = [IO.File]::ReadAllText((Join-Path $Out286 'BASELINE-268-279-PINS.json')) | ConvertFrom-Json
Assert-Data286 ($baseline.exactPriorInventory.Count -eq 180) 'Expected exactly180 pinned prior artifacts.'
foreach ($group in $baseline.roots)
{
    $files = @(Get-ChildItem -LiteralPath $group.root -File -Recurse -Force)
    Assert-Data286 ($files.Count -eq $group.completeArtifactCount) 'A prior exact artifact inventory changed.'
}
foreach ($entry in $baseline.exactPriorInventory)
{
    Assert-Data286 ((Get-Item -LiteralPath $entry.path).Length -eq $entry.bytes) 'A prior artifact size changed.'
    Assert-Data286 ((Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash -ceq $entry.sha256) 'A prior artifact hash changed.'
}
$prior268Root = Join-Path $Par286 'finding-F234-F235-268'
$prior279Root = Join-Path $Par286 'finding-F234-F235-279'
$bootstrap = [IO.File]::ReadAllText((Join-Path $Out286 'control\bootstrap-286.json')) | ConvertFrom-Json
$discovery = [IO.File]::ReadAllText((Join-Path $Out286 'DISCOVERY-286-001.json')) | ConvertFrom-Json
$batchPlan = [IO.File]::ReadAllText((Join-Path $Out286 'RAW-BATCH-PLAN-286-002.json')) | ConvertFrom-Json
$bindings = [IO.File]::ReadAllText((Join-Path $Out286 'BINDINGS-286-002.json')) | ConvertFrom-Json
$actualOuters = [IO.File]::ReadAllText((Join-Path $Out286 'control\actual-outer-receipts-through-source-002.json')) | ConvertFrom-Json
$assessment = [IO.File]::ReadAllText((Join-Path $Out286 'ASSESSMENT-286.json')) | ConvertFrom-Json
$factory = [IO.File]::ReadAllText((Join-Path $Out286 'FACTORY-DISPATCH-286.json')) | ConvertFrom-Json
$expectedPath = 'src/Identity/Specification.Tests/src/UserManagerSpecificationTests.cs'
$expectedBodyHash = '10BC2D9F9ABA89EE9A15D74555C8113E4BC6EBEFB5653A473D5AF31B2CC25185'
Assert-Data286 ($discovery.uniqueActualNewPath -ceq $expectedPath -and $discovery.rawFilenames.Count -eq 1) 'Discovery is not the unique approved actual filename.'
Assert-Data286 ($batchPlan.selections.Count -eq 2 -and $bindings.responses.Count -eq 2) 'The final batch must contain exactly two members.'
Assert-Data286 ($bindings.completeWholeBodies -eq 2 -and $bindings.exactMissingResponses -eq 0) 'The final batch did not produce both complete bodies.'
Assert-Data286 (@($assessment.findings | Where-Object { $_.sourceDecision -cne 'source-only-no-material-candidate' -or $_.canonicalOuterStatus -cne 'pending' }).Count -eq 0 -and $assessment.findings.Count -eq 2) 'Separate source-only pending findings were changed.'
Assert-Data286 ($factory.qualification.inheritedNamedFactoryDispatchAndExplicitInstanceLifetimeEstablishedAtSource -ceq $true -and $factory.qualification.effectiveDiConstructionOrRuntimeSelectionExecuted -ceq $false) 'Factory source/runtime boundary changed.'
$rootDirectories = @(Get-ChildItem -LiteralPath (Join-Path $Out286 'roots') -Directory | Sort-Object Name)
Assert-Data286 ($rootDirectories.Count -eq 2 -and $rootDirectories[0].Name -ceq 'root-011' -and $rootDirectories[1].Name -ceq 'root-012') 'Exactly two286 source roots are permitted.'
$newReceipts = @(
    foreach ($directory in $rootDirectories)
    {
        $receiptPath = Join-Path $directory.FullName 'receipt.json'
        $receipt = [IO.File]::ReadAllText($receiptPath) | ConvertFrom-Json
        $launch = [IO.File]::ReadAllText((Join-Path $directory.FullName 'launch.json')) | ConvertFrom-Json
        $rootGuard = [IO.File]::ReadAllText((Join-Path $directory.FullName 'guard.json')) | ConvertFrom-Json
        $policyBytes = [IO.File]::ReadAllBytes((Join-Path $directory.FullName 'policy.raw.json'))
        $registrationBytes = [IO.File]::ReadAllBytes((Join-Path $directory.FullName 'registration.raw.json'))
        $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
        Assert-Data286 ($receipt.exitCode -eq 0 -and $receipt.explicitRootWaitReturned -ceq $true -and $receipt.rootTimedOut -ceq $false) 'A new source root was not cleanly terminal.'
        Assert-Data286 ($receipt.stdoutCopyAwaitedToEof -ceq $true -and $receipt.stderrCopyAwaitedToEof -ceq $true -and $receipt.streamFilesClosed -ceq $true) 'Both raw output streams must be awaited and closed.'
        Assert-Data286 (@($receipt.observedChildren | Where-Object { -not $_.observedIdentityWaitReturned }).Count -eq 0) 'An observed child remains outstanding.'
        Assert-Data286 ($rootGuard.actualOwner -ceq $Owner286 -and $rootGuard.scope -ceq $bootstrap.scope -and $rootGuard.registrationSha256 -ceq $bootstrap.registrationSha256) 'A root lacks its fresh exact-owner/scope guard.'
        Assert-Data286 ((Get-BytesHash286 $policyBytes) -ceq $rootGuard.policySha256 -and (Get-BytesHash286 $registrationBytes) -ceq $rootGuard.registrationSha256) 'Raw root guard hashes do not match.'
        Assert-Data286 ($policy.independentFindingPreparationWorkers.F234 -ceq $Owner286 -and $policy.activeWorkerPreparationScopes.F234 -ceq $bootstrap.scope -and $policy.actualWorkerBuildHoldActive -ceq $false -and $policy.buildAndTestWorkQuiesced -ceq $false) 'Saved source-start policy guard was not satisfied.'
        foreach ($kind in @('helper', 'support', 'controlSupport'))
        {
            Assert-Data286 ((Get-FileHash -LiteralPath $launch.$kind -Algorithm SHA256).Hash -ceq $launch.($kind + 'Sha256')) 'An executed source helper/support changed.'
        }
        foreach ($stream in @('stdin', 'stdout', 'stderr'))
        {
            $streamPath = Join-Path $directory.FullName ($stream + '.bin')
            $expectedHash = if ($stream -ceq 'stdin') { $launch.stdinSha256 } else { $receipt.($stream + 'Sha256') }
            $expectedBytes = if ($stream -ceq 'stdin') { $launch.stdinBytes } else { $receipt.($stream + 'Bytes') }
            Assert-Data286 ((Get-Item -LiteralPath $streamPath).Length -eq $expectedBytes -and (Get-FileHash -LiteralPath $streamPath -Algorithm SHA256).Hash -ceq $expectedHash) 'A retained exact raw stream changed.'
        }
        Assert-Data286 ($launch.observer.pid -eq $receipt.launch.observer.pid -and $launch.observer.creationFileTime -eq $receipt.launch.observer.creationFileTime -and $receipt.rootIdentity.creationFileTime -gt 0) 'Root/observer creation identity mismatch.'
        $receipt
    }
)
$expectedDiscoveryArgs = @('--no-pager', '-C', $Repo286, 'grep', '-l', '-z', '--fixed-strings', '-e', 'class UserManagerSpecificationTestBase', 'd3483989953ae3cccd773aea5ea04cb0c7198531', '--', 'src/Identity')
$expectedBatchArgs = @('--no-pager', '-C', $Repo286, 'cat-file', '--batch')
Assert-Data286 ((@($newReceipts[0].launch.argv | Select-Object -Skip 1) -join [char]0) -ceq ($expectedDiscoveryArgs -join [char]0)) 'Discovery argv exceeded its filename-only immutable scope.'
Assert-Data286 ((@($newReceipts[1].launch.argv | Select-Object -Skip 1) -join [char]0) -ceq ($expectedBatchArgs -join [char]0)) 'Final batch argv changed.'
$discoveryRaw = [IO.File]::ReadAllBytes((Join-Path $rootDirectories[0].FullName 'stdout.bin'))
$expectedDiscoveryRaw = [Text.UTF8Encoding]::new($false).GetBytes('d3483989953ae3cccd773aea5ea04cb0c7198531:' + $expectedPath + [char]0)
Assert-Data286 ((Get-BytesHash286 $discoveryRaw) -ceq (Get-BytesHash286 $expectedDiscoveryRaw)) 'Exact NUL-framed filename output mismatch.'
$expectedSelections = @(
    @{ role = 'Original'; commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5' },
    @{ role = 'Default'; commit = 'd3483989953ae3cccd773aea5ea04cb0c7198531' }
)
$expectedRequests = @($expectedSelections | ForEach-Object { $_.commit + ':' + $expectedPath })
$expectedInput = [Text.UTF8Encoding]::new($false).GetBytes(($expectedRequests -join "`n") + "`n")
$actualInput = [IO.File]::ReadAllBytes((Join-Path $rootDirectories[1].FullName 'stdin.bin'))
Assert-Data286 ((Get-BytesHash286 $expectedInput) -ceq (Get-BytesHash286 $actualInput)) 'The final batch requested another path, role or order.'
$raw = [IO.File]::ReadAllBytes((Join-Path $rootDirectories[1].FullName 'stdout.bin'))
$offset = 0
for ($ordinal = 0; $ordinal -lt 2; $ordinal++)
{
    $binding = $bindings.responses[$ordinal]
    $expected = $expectedSelections[$ordinal]
    $headerOffset = $offset
    $newline = [Array]::IndexOf($raw, [byte]10, $offset)
    Assert-Data286 ($newline -ge $offset) 'Missing binary batch header LF.'
    $header = [Text.Encoding]::ASCII.GetString($raw, $offset, $newline - $offset)
    Assert-Data286 ($header -match '^([0-9a-f]{40}) blob ([0-9]+)$') 'Unexpected final whole-blob header.'
    $blobId = $Matches[1]
    $size = [int]$Matches[2]
    $offset = $newline + 1
    $bodyOffset = $offset
    Assert-Data286 ($size -eq 83120 -and $offset + $size -lt $raw.Length -and $raw[$offset + $size] -eq 10) 'Whole-body size/trailing binary LF mismatch.'
    $body = [byte[]]::new($size)
    [Array]::Copy($raw, $offset, $body, 0, $size)
    $objectHeader = [Text.Encoding]::ASCII.GetBytes("blob $size$([char]0)")
    $objectBytes = [byte[]]::new($objectHeader.Length + $body.Length)
    [Array]::Copy($objectHeader, 0, $objectBytes, 0, $objectHeader.Length)
    [Array]::Copy($body, 0, $objectBytes, $objectHeader.Length, $body.Length)
    $sha1 = [Security.Cryptography.SHA1]::Create()
    try
    {
        $recomputedId = [BitConverter]::ToString($sha1.ComputeHash($objectBytes)).Replace('-', '').ToLowerInvariant()
    }
    finally
    {
        $sha1.Dispose()
    }
    Assert-Data286 ($recomputedId -ceq $blobId -and $binding.blobId -ceq $blobId -and $binding.recomputedGitObjectId -ceq $blobId) 'Recomputed exact Git blob identity mismatch.'
    Assert-Data286 ($binding.role -ceq $expected.role -and $binding.commit -ceq $expected.commit -and $binding.path -ceq $expectedPath -and $binding.commitPath -ceq $expectedRequests[$ordinal] -and $binding.status -ceq 'complete') 'Whole-body role/request association mismatch.'
    Assert-Data286 ($binding.headerOffset -eq $headerOffset -and $binding.bodyOffset -eq $bodyOffset -and $binding.headerAscii -ceq $header -and $binding.requestOrdinal -eq $ordinal) 'Raw whole-member framing offset mismatch.'
    Assert-Data286 ((Get-BytesHash286 $body) -ceq $expectedBodyHash -and $binding.sha256 -ceq $expectedBodyHash -and (Get-FileHash -LiteralPath $binding.capture -Algorithm SHA256).Hash -ceq $expectedBodyHash -and (Get-Item -LiteralPath $binding.capture).Length -eq $size) 'Whole source capture is not exact raw Git bytes.'
    $offset += $size + 1
    Assert-Data286 ($binding.trailingFramingLfOffset -eq $offset - 1 -and $binding.nextResponseOffset -eq $offset) 'Trailing member offsets mismatch.'
}
Assert-Data286 ($offset -eq $raw.Length -and $bindings.completeRawFramingConsumed -ceq $true) 'Final raw batch has extra/unconsumed bytes.'
$priorRoles = [IO.File]::ReadAllText((Join-Path $prior279Root 'ROLE-BINDINGS-279.json')) | ConvertFrom-Json
Assert-Data286 ($priorRoles.cumulativeBodyInventory.Count -eq 34 -and $priorRoles.newMissingResponses.Count -eq 2) 'Prior complete-versus-missing boundary changed.'
$bodyInventory = @($priorRoles.cumulativeBodyInventory) + @(
    foreach ($binding in $bindings.responses)
    {
        [ordered]@{
            role = $binding.role
            commit = $binding.commit
            path = $binding.path
            bytes = $binding.bytes
            sha256 = $binding.sha256
            capture = $binding.capture
            stage = 286
            boundary = 'Exact retained raw request/member binding; source-only, no independent commit/tree-chain/runtime/materiality expansion.'
        }
    }
)
$seen = @{}
foreach ($body in $bodyInventory)
{
    $key = $body.role + [char]0 + $body.path
    Assert-Data286 (-not $seen.ContainsKey($key)) 'Duplicate role/path whole-body inventory entry.'
    $seen[$key] = $true
    Assert-Data286 ((Get-FileHash -LiteralPath $body.capture -Algorithm SHA256).Hash -ceq $body.sha256 -and (Get-Item -LiteralPath $body.capture).Length -eq $body.bytes) 'A cumulative body binding changed.'
}
foreach ($role in @('Original', 'Default'))
{
    Assert-Data286 (@($bodyInventory | Where-Object { $_.role -ceq $role }).Count -eq 18) 'Cumulative per-role whole-body budget mismatch.'
}
Write-FreshJson286 (Join-Path $Out286 'ROLE-BINDINGS-286.json') ([ordered]@{
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    cumulativeBodyInventory = $bodyInventory
    cumulativeCompleteBodyCount = $bodyInventory.Count
    cumulativeRequestedPathsPerRole = 19
    cumulativeCompleteBodiesPerRole = 18
    newCompleteBodyBindings = $bindings.responses
    newCompleteBodyCount = 2
    newMissingResponses = @()
    prior279MissingResponsesPreserved = $priorRoles.newMissingResponses
    prior279SourceHelperOuterExitPreserved = 1
    prior279GitRootExitPreserved = 0
    oldByteAcceptanceNotUpgradedToRawTreeRuntimeOrMateriality = $true
    defaultMeaning = 'Pinned observed268Default only, not a fresh current head.'
    noFurtherSourceBodiesAuthorized = $true
})
$prior268TerminalPath = Join-Path $prior268Root 'SOURCE-TERMINAL-RECEIPTS.json'
$prior268Terminal = [IO.File]::ReadAllText($prior268TerminalPath) | ConvertFrom-Json
$prior279TerminalPath = Join-Path $prior279Root 'TERMINAL-RECEIPTS-279.json'
$prior279Terminal = [IO.File]::ReadAllText($prior279TerminalPath) | ConvertFrom-Json
Assert-Data286 ($prior268Terminal.roots.Count -eq 9 -and $prior279Terminal.newRoot.aggregateRootAttempt -eq 10 -and $prior279Terminal.sourceHelperOuterExit -eq 1 -and $prior279Terminal.gitRootExit -eq 0) 'The prior actual source-root/failure boundary changed.'
[long]$stdoutTotal = 0
[long]$stderrTotal = 0
$rootWaits = 0
$outputEofStreams = 0
$stdinStreams = 0
$observedChildWaits = 0
$observedChildren = 0
$observerPids = [Collections.Generic.List[int]]::new()
foreach ($root in $prior268Terminal.roots)
{
    Assert-Data286 ($root.exitCode -eq 0 -and $root.rootWaitReturned -ceq $true -and $root.bothStreamsAwaitedToEof -ceq $true) 'A preserved268 root summary is not terminal.'
    $stdoutTotal += [long]$root.stdoutBytes
    $stderrTotal += [long]$root.stderrBytes
    $rootWaits++
    $outputEofStreams += 2
    $stdinStreams++
    $observerPids.Add([int]$root.observer.pid)
    foreach ($child in $root.observedChildren)
    {
        $observedChildren++
        Assert-Data286 ($child.observedIdentityWaitReturned -ceq $true) 'A preserved268 observed-child wait is not terminal.'
        $observedChildWaits++
    }
}
foreach ($root in @($prior279Terminal.newRoot) + @($newReceipts))
{
    Assert-Data286 ($root.exitCode -eq 0 -and $root.explicitRootWaitReturned -ceq $true -and $root.stdoutCopyAwaitedToEof -ceq $true -and $root.stderrCopyAwaitedToEof -ceq $true) 'A root010/011/012 summary is not terminal.'
    $stdoutTotal += [long]$root.stdoutBytes
    $stderrTotal += [long]$root.stderrBytes
    $rootWaits++
    $outputEofStreams += 2
    $stdinStreams++
    $observerPids.Add([int]$root.launch.observer.pid)
    foreach ($child in $root.observedChildren)
    {
        $observedChildren++
        Assert-Data286 ($child.observedIdentityWaitReturned -ceq $true) 'A retained observed-child wait is not terminal.'
        $observedChildWaits++
    }
}
Assert-Data286 ($rootWaits -eq 12 -and $outputEofStreams -eq 24 -and $stdinStreams -eq 12 -and $observedChildWaits -eq 7 -and $observedChildren -eq 7) 'Aggregate root/stream/observed-child accounting mismatch.'
Assert-Data286 ($stdoutTotal -eq 919315 -and $stderrTotal -eq 0) 'Per-root recomputed raw byte totals mismatch.'
Assert-Data286 ($actualOuters.receipts.Count -eq 3 -and @($actualOuters.receipts | Where-Object { $_.actualExitCode -ne 0 }).Count -eq 0) 'Observed new outer source receipts were not all successful.'
Write-FreshJson286 (Join-Path $Out286 'TERMINAL-RECEIPTS-286.json') ([ordered]@{
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    newActualGitGhRoots = 2
    aggregateActualGitGhRoots = 12
    aggregateRootWaitsReturned = $rootWaits
    aggregateOutputStreamsAwaitedToEof = $outputEofStreams
    aggregateStdinStreamsRetained = $stdinStreams
    aggregateObservedChildren = $observedChildren
    aggregateObservedChildWaitsReturned = $observedChildWaits
    aggregateRawStdoutBytes = $stdoutTotal
    aggregateRawStderrBytes = $stderrTotal
    rawByteTotalBoundary = 'Recomputed from all12 retained per-root rows, not copied from the old null/incomplete268/279 aggregate-byte fields. Every prior artifact remains unchanged.'
    aggregateSourceObserverPids = @($observerPids | Sort-Object -Unique)
    newRoots = $newReceipts
    prior268Roots = $prior268Terminal.roots
    prior279Root = $prior279Terminal.newRoot
    priorTerminalPins = @(
        @{ path = $prior268TerminalPath; sha256 = (Get-FileHash -LiteralPath $prior268TerminalPath -Algorithm SHA256).Hash },
        @{ path = $prior279TerminalPath; sha256 = (Get-FileHash -LiteralPath $prior279TerminalPath -Algorithm SHA256).Hash }
    )
    prior279SourceHelperOuterExitPreserved = 1
    prior279GitRootExitPreserved = 0
    prior279MissingResponsesPreserved = 2
    observedChildLimit = 'Creation-checked live-parent CIM census; nominal100ms root waits; maximum64 observed descendants;10s total post-root observed-child waits. Prior unresolved census observations remain retained. No universal closure for short-lived/reparented/inaccessible/unobserved children.'
    dataOnlyAuditObserver = Get-ProcessIdentity286 (Get-Process -Id $PID)
    outerAuditCompletionKnownInsideHelper = $false
    actualPriorOuterReceipts = $actualOuters
    productTestsOrPerformanceMeasurements = $false
})
Write-FreshJson286 (Join-Path $Out286 'AUDIT-286-003.json') ([ordered]@{
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ProcessIdentity286 (Get-Process -Id $PID)
    checks = '180unchanged prior artifacts; exact filename-only argv/NUL stream; one2member raw batch; all raw framing/type/size/role/blob IDs/SHA256/captures; helper hashes; source-start guards;12roots/24EOF streams/12stdin/7retained observed-child waits.'
    integrityAndCustodyChecksCompleted = $true
    newCompleteBodies = 2
    newMissingResponses = 0
    cumulativeCompleteBodyBindings = 36
    cumulativeCompleteBodiesPerRole = 18
    cumulativeRequestedPathsPerRole = 19
    prior279HelperOuterExit1AndTwoMissingResponsesPreserved = $true
    priorByteInventoryAcceptanceNotUpgraded = $true
    productBehaviorOrPerformancePass = $false
    actualOuterCompletionMustBeObservedAfterReturn = $true
})
Write-Host ('AUDIT286_OBSERVER_PID=' + $PID)
Write-Host 'AUDIT286_COMPLETE=2exact whole bodies/0newmissing;18complete/19requested per role;36bindings;2new/12aggregate roots;180prior artifacts unchanged'
Write-Host ("CUSTODY286={0}/12root waits;{1}/24EOF streams;{2}stdin;{3}/{4}retained observed-child waits;stdout{5};stderr{6}" -f $rootWaits, $outputEofStreams, $stdinStreams, $observedChildWaits, $observedChildren, $stdoutTotal, $stderrTotal)
Write-Host ('SOURCE286_OBSERVER_PIDS=' + (@($observerPids | Sort-Object -Unique) -join ','))
