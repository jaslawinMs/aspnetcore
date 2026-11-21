$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Read-ArtifactJson([string] $relativePath)
{
    Get-Content -LiteralPath (Join-Path $root $relativePath) -Raw | ConvertFrom-Json
}

function Write-NewArtifactJson([string] $relativePath, $value)
{
    $destination = Join-Path $root $relativePath
    if (Test-Path -LiteralPath $destination)
    {
        throw "Refusing overwrite after preparation: $destination"
    }

    $json = ConvertTo-Json -InputObject $value -Depth 100
    [System.IO.File]::WriteAllText($destination, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

if (Test-Path -LiteralPath (Join-Path $root 'HANDOFF.json'))
{
    throw 'One handoff already exists. This preparation cannot reseal or replay.'
}

$initial = Read-ArtifactJson 'INITIAL.json'
$roles = Read-ArtifactJson 'SOURCE-ROLES.json'
$final = Read-ArtifactJson 'FINAL-OBSERVATIONS.json'
$gate = Read-ArtifactJson 'MATERIALITY-GATE.json'
$checks = Read-ArtifactJson 'SOURCE-CHECKS.json'

if ($gate.disposition -ne 'bounded-source-level-no-candidate' -or
    $gate.candidateQualified -or
    $gate.nativeDisposition.dotnetInvocations -ne 0)
{
    throw 'Unexpected gate/native state. Do not silently seal another disposition.'
}

if (-not $final.reserved.branchMatches -or
    -not $final.reserved.headMatches -or
    -not $final.reserved.statusSameCompleteBytesAsInitial -or
    -not $final.reserved.inheritedReportsUnchanged -or
    $final.reserved.trackedWorktreeDiffBytes -ne 0 -or
    $final.reserved.trackedIndexDiffBytes -ne 0)
{
    throw 'Reserved worktree or inherited report preservation check is not green.'
}

$commandRecords = @(
    Get-ChildItem -LiteralPath (Join-Path $root 'commands') -File -Filter '*.json' |
        Sort-Object Name |
        ForEach-Object {
            $record = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
            $classification = 'success'
            if ($record.returnCode -eq 1 -and $record.argv -contains '--no-index')
            {
                $classification = 'expected git diff differences, not a test failure'
            }
            elseif ($record.returnCode -eq 1 -and $record.argv -contains 'grep')
            {
                $classification = 'expected grep no-match result'
            }
            elseif ($record.returnCode -ne 0 -or $null -ne $record.spawnError)
            {
                $classification = 'retained command failure'
            }

            [ordered]@{
                artifact = [System.IO.Path]::GetRelativePath($root, $_.FullName)
                argv = $record.argv
                processId = $record.processId
                startedUtc = $record.startedUtc
                finishedUtc = $record.finishedUtc
                returnCode = $record.returnCode
                classification = $classification
                rootAwaited = $record.rootAwaited
                bothRedirectedStreamsAwaited = $record.bothRedirectedStreamsAwaited
                stdout = $record.stdout
                stderr = $record.stderr
            }
        }
)

$launcherNames = @(
    'collector.initial',
    'node.version',
    'collector.node.initial',
    'collector.trace',
    'collector.producer',
    'collector.edges',
    'collector.complete',
    'assessment',
    'collector.final'
)
$launchers = @(
    foreach ($name in $launcherNames)
    {
        $record = Read-ArtifactJson ($name + '.exit.json')
        $expectedExit = if ($name -eq 'collector.initial') { 9009 } else { 0 }
        if ($record.exitCode -ne $expectedExit)
        {
            throw "Unexpected source collector exit: $name = $($record.exitCode)"
        }

        [ordered]@{
            artifact = $name + '.exit.json'
            command = $record.command
            actualExitCode = $record.exitCode
            stdout = $record.stdout
            stderr = $record.stderr
            nativeBuildTestRestore = $false
        }
    }
)
Write-NewArtifactJson 'COMMANDS-INDEX.json' ([ordered]@{
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    childCommandCount = $commandRecords.Count
    childCommands = $commandRecords
    launcherInvocations = $launchers
    unexpectedChildFailures = @($commandRecords | Where-Object classification -eq 'retained command failure')
    bootstrapLimitation = 'The first read-only directory listing remains in tool history. BOOTSTRAP-TRANSCRIPTION.json preserves its exact command and material observations; all later executable source commands have stdout/stderr files.'
    nativeBuildTestRestoreCommands = @()
    benchmarkCounterOrWarmupCommands = @()
    navigationTools = 'navigation-tool-results.json'
})

$knownCollectorPids = @(
    [int] $initial.collectorPid
    [int] (Read-ArtifactJson 'collector.edges.stdout.txt').collectorPid
    [int] (Read-ArtifactJson 'collector.complete.stdout.txt').collectorPid
    [int] (Read-ArtifactJson 'assessment.stdout.txt').collectorPid
    [int] $final.collectorPid
) | Select-Object -Unique
$knownCommandPids = @($commandRecords | ForEach-Object { [int] $_.processId } | Where-Object { $_ -gt 0 } | Select-Object -Unique)
$queriedPids = @(@($knownCollectorPids) + @($knownCommandPids) | Select-Object -Unique)
$livePidObservations = @(
    foreach ($process in @(Get-Process -Id $queriedPids -ErrorAction SilentlyContinue))
    {
        $startUtc = $null
        $startReadError = $null
        try
        {
            $startUtc = $process.StartTime.ToUniversalTime().ToString('o')
        }
        catch
        {
            $startReadError = $_.Exception.Message
        }

        [ordered]@{
            processId = $process.Id
            observedStartUtc = $startUtc
            startReadError = $startReadError
            identityConclusion = 'A currently live numeric PID is not assumed to be the earlier awaited source root; Windows can reuse PIDs. No process was stopped.'
        }
    }
)
Write-NewArtifactJson 'OWNED-PROCESSES.json' ([ordered]@{
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    nativeWorkloadRootsStarted = @()
    nativeWorkloadDescendantsObserved = @()
    benchmarksOrServersStarted = @()
    dotnetCompilerBuildTestRestoreInvocations = 0
    synchronousSourceLauncherExits = $launchers
    allCapturedChildRootsAwaited = @($commandRecords | Where-Object { -not $_.rootAwaited }).Count -eq 0
    allCapturedRedirectedChildStreamsAwaited = @($commandRecords | Where-Object { -not $_.bothRedirectedStreamsAwaited }).Count -eq 0
    knownCollectorProcessIds = @($knownCollectorPids)
    exactCapturedChildCommandProcessIds = $knownCommandPids
    numericPidProbe = [ordered]@{
        exactCommand = 'Get-Process -Id $queriedPids -ErrorAction SilentlyContinue'
        queriedProcessIds = $queriedPids
        liveNumericPidObservations = $livePidObservations
        absentPidCountAtObservation = $queriedPids.Count - $livePidObservations.Count
    }
    collectorPidCoverageLimitation = 'Trace/producers/version-probe root PIDs were not separately captured; their synchronous launcher exits are retained. Git/gh child command PIDs and roots/streams are captured. No unobserved-descendant closure is claimed.'
    currentSourceOnlySealer = [ordered]@{
        powershellPid = $PID
        script = 'seal_213.ps1'
        launchesChildPrograms = $false
        stateAtArtifactWrite = 'Only this source/JSON hashing command is completing; no owned native workload exists.'
        completionEvidence = 'The outer tool reports the actual exit of this synchronous sealer; no prospective exit is represented as already observed.'
    }
    noHostWideQuiescenceOrDedicatedHostClaim = $true
    noArbitraryProcessStops = $true
})

$boundaryLimitations = @(
    'No real request, browser, compiler, native test, runtime allocation or performance observation was made.',
    'Actual browser/transport-added headers, native Headers coalescing, protocol, total header count and request frequency remain unobserved.',
    'Declared dependency source does not prove resolved SDK/package or loaded runtime image identity.',
    'This is a bounded source-level no-candidate gate, not a universal immateriality, optimality, no-benefit or runtime-equivalence claim.',
    'No behavioral regression or red/green theory-row result was fabricated.',
    'Initial full directory-listing output is retained only in tool history; its exact request and material results are transcribed.',
    'No universal unobserved-descendant, unrelated-process absence, broad host quiescence or dedicated-host claim is made.'
)
if (-not $final.upstreamDefault.sameAsSourcePin)
{
    $boundaryLimitations += 'Final upstream Default differs or could not be observed; this gate remains explicitly bounded to the initial recorded pin and observation time.'
}

Write-NewArtifactJson 'HANDOFF.json' ([ordered]@{
    schemaVersion = 1
    finding = 'F193'
    preparation = 213
    ownerAgentId = 'c1cf1d27-371f-40da-9895-3a099570e45e'
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    status = 'sealed-bounded-source-level-no-candidate'
    coordinatorAcceptance = 'Not self-accepted; coordinator review and acceptance remain required.'
    scope = 'PersonController DELETE request-header echo only, both source roles on this physical host'
    host = $initial.host
    sourceRoles = $roles.roles
    upstreamDefaultObservations = $final.upstreamDefault
    findingSource = 'src\Components\test\testassets\Components.TestServer\Controllers\PersonController.cs:54'
    conclusion = 'No candidate qualified. Array-backed StringValues is already reused by ToArray; scalar backing creates a one-element array, but inspected test-asset producers do not establish material need for a change. ToString changes general empty/null multi-array delimiter semantics; IEnumerable/bare removal is not assumed beneficial.'
    acceptance = @(
        [ordered]@{ id = 'pinned-source'; status = 'green-source-only'; evidence = @('SOURCE-ROLES.json', 'source-manifest.json', 'external-source-manifest.json', 'FINAL-OBSERVATIONS.json') },
        [ordered]@{ id = 'producer-consumer'; status = 'green-source-only-with-wire-runtime-limitations'; evidence = @('PRODUCER-SEMANTICS.json', 'producer-source-excerpts.json') },
        [ordered]@{ id = 'semantics'; status = 'green-source-derived-not-executed'; evidence = @('PRODUCER-SEMANTICS.json', 'SOURCE-CHECKS.json') },
        [ordered]@{ id = 'history-related-work'; status = 'green-bounded-reads'; evidence = @('PRODUCER-SEMANTICS.json', 'related-work-query-index.json', 'related-work-null-array-excerpts.json', 'instruction-read-manifest.json') },
        [ordered]@{ id = 'candidate-gate'; status = 'green-no-candidate-valid-outcome'; evidence = @('MATERIALITY-GATE.json', 'DIFF-INDEX.json') },
        [ordered]@{ id = 'native-conditional'; status = 'not-applicable-no-candidate-no-native-start'; evidence = @('MATERIALITY-GATE.json', 'OWNED-PROCESSES.json') },
        [ordered]@{ id = 'sealed-handoff'; status = 'sealed-and-indexed-by-this-script'; evidence = @('FINAL-OBSERVATIONS.json', 'COMMANDS-INDEX.json', 'OWNED-PROCESSES.json', 'ARTIFACT-INDEX.sha256.json') }
    )
    correctnessBoundary = 'Source-derived producer and contract analysis; no runtime correctness or bug-fix verification claim.'
    native = $gate.nativeDisposition
    candidateDiffIndex = 'DIFF-INDEX.json'
    privateGraphsCreated = $false
    reservedWorktreePreserved = $true
    fourInheritedUntrackedReportsUnchanged = $true
    policyRegistryLeaseLedgerChangedByOwner = $false
    commitsPushesPullRequestsIssuesOrOtherWrites = @()
    benchmarkAuthorizationsConsumed = 0
    failuresAndCorrections = @(
        [ordered]@{ attempt = 'python .\collect_source_213.py'; actualExit = 9009; cause = 'Unavailable Python Windows Store alias'; correction = 'Already-installed Node v26.13.0, no installation'; evidence = @('collector.initial.exit.json', 'collector.initial.stderr.txt', 'collect_source_213.py', 'node.version.exit.json', 'INITIAL.json') },
        [ordered]@{ attempt = 'LSP Join hover and Http1ParsingHandler definition lookup'; result = 'No semantic information; default lsp-csharp log lookup also unavailable'; correction = 'Retained pinned raw Git source and explicit dependency-revision blobs; no hypothetical compiler-binding claim'; evidence = @('navigation-tool-results.json') }
    )
    sourceIntegrity = [ordered]@{
        completeSourceEntriesReverified = $checks.presentSourceEntries
        originalDefaultControllerProducerConsumerSameBytes = $checks.findingControllerProducerConsumerSameCompleteBytesAcrossRoles
        stringValuesSameCompleteBytes = $checks.declaredStringValuesSameCompleteBytesAcrossRoles
        joinRegionSameBytes = $checks.joinRegionsSameBytes
        evidence = @('SOURCE-CHECKS.json', 'SOURCE-COMPARISON.json')
    }
    processTerminalState = 'No native workload, server or benchmark root was started. All executed collector invocations have recorded terminal exits; captured read-only child roots and redirected streams were awaited. See OWNED-PROCESSES.json for exact observation scope and PID-reuse limits.'
    limitations = $boundaryLimitations
    nextActor = 'Coordinator: review this bounded no-candidate gate, verify artifact index, accept/retire the owner if satisfied. No comparison, publication or performance claim requested.'
    seal = [ordered]@{
        artifactIndex = 'ARTIFACT-INDEX.sha256.json'
        coverage = 'Every regular file below this evidence root, including HANDOFF.json and all scripts/failures/source/command stdout and stderr. The hash index excludes only itself to avoid recursive self-hashing.'
        noArtifactWritesAfterIndex = $true
        outerToolExitIsFinalSealerCompletionEvidence = $true
    }
})

$indexPath = Join-Path $root 'ARTIFACT-INDEX.sha256.json'
$files = @(
    Get-ChildItem -LiteralPath $root -File -Recurse |
        Where-Object FullName -ne $indexPath |
        Sort-Object FullName
)
$entries = @(
    foreach ($file in $files)
    {
        [ordered]@{
            path = [System.IO.Path]::GetRelativePath($root, $file.FullName)
            bytes = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        }
    }
)
Write-NewArtifactJson 'ARTIFACT-INDEX.sha256.json' ([ordered]@{
    schemaVersion = 1
    algorithm = 'SHA256'
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    root = $root
    fileCount = $entries.Count
    totalBytes = ($entries | Measure-Object -Property bytes -Sum).Sum
    coverage = 'All regular files recursively, excluding only this index itself; HANDOFF.json is included.'
    selfExcluded = 'ARTIFACT-INDEX.sha256.json'
    files = $entries
})

$verifiedIndex = Read-ArtifactJson 'ARTIFACT-INDEX.sha256.json'
foreach ($entry in $verifiedIndex.files)
{
    $filePath = Join-Path $root $entry.path
    if ((Get-Item -LiteralPath $filePath).Length -ne $entry.bytes -or
        (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash -ne $entry.sha256)
    {
        throw "Sealed artifact changed: $($entry.path)"
    }
}
$finalFileCount = @(Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object FullName -ne $indexPath).Count
if ($finalFileCount -ne $verifiedIndex.fileCount)
{
    throw 'Index is not a complete regular-file inventory.'
}

[ordered]@{
    result = 'sealed-bounded-source-level-no-candidate'
    finding = 'F193'
    preparation = 213
    handoff = Join-Path $root 'HANDOFF.json'
    handoffSha256 = (Get-FileHash -LiteralPath (Join-Path $root 'HANDOFF.json') -Algorithm SHA256).Hash
    artifactIndex = $indexPath
    artifactIndexSha256 = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
    artifactFilesVerified = $verifiedIndex.fileCount
    nativeInvocations = 0
    reservedAndFourReportsUnchanged = $true
} | ConvertTo-Json -Depth 5
