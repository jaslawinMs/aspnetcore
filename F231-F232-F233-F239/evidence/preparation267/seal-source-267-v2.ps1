$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$par = Split-Path -Parent $out
$self = Get-Process -Id $PID
$observer = [ordered]@{
    pid = $PID
    startUtc = $self.StartTime.ToUniversalTime().ToString('o')
    creationFileTimeUtc = $self.StartTime.ToFileTimeUtc()
    processPath = $self.Path
    role = 'Data-only final source sealer; actual outer tool return must be observed after this script returns'
}

function Require([bool]$Condition, [string]$Message)
{
    if (-not $Condition)
    {
        throw $Message
    }
}

function Write-NewJson([string]$Name, $Value)
{
    $path = Join-Path $out $Name
    Require (-not (Test-Path -LiteralPath $path)) "Refusing overwrite: $Name"
    [IO.File]::WriteAllText($path, (($Value | ConvertTo-Json -Depth 80) + "`n"), [Text.UTF8Encoding]::new($false))
}

function Metadata([string]$RelativePath)
{
    $path = [IO.Path]::GetFullPath((Join-Path $out $RelativePath))
    Require ($path.StartsWith($out + '\', [StringComparison]::OrdinalIgnoreCase)) 'Artifact path escaped output directory'
    $bytes = [IO.File]::ReadAllBytes($path)
    return [ordered]@{
        path = [IO.Path]::GetRelativePath($out, $path)
        bytes = $bytes.Length
        sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    }
}

function Read-Json([string]$RelativePath)
{
    return (Get-Content -LiteralPath (Join-Path $out $RelativePath) -Raw | ConvertFrom-Json)
}

try
{
    Require ((Split-Path -Leaf $out) -ceq 'finding-F231-F232-F233-267') 'Wrong isolated output directory'
    $initial = Read-Json 'initial-guard-267.json'
    $policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
    Require ($initial.ownerId -ceq 'ed471f5e-c998-47a0-a617-4b6bcd83121b') 'Unexpected actual owner'
    Require ($policy.independentFindingPreparationWorkers.F231 -ceq $initial.ownerId) 'Actual F231 registration changed'
    Require ($policy.activeWorkerPreparationScopes.F231 -ceq $initial.scope) 'Exact 267 scope changed'
    Require ($policy.actualWorkerBuildHoldActive -ceq $false -and $policy.buildAndTestWorkQuiesced -ceq $false) 'HOLD or quiescence active'
    Require (-not (Test-Path -LiteralPath (Join-Path $par 'benchmark-exclusive.lease.json'))) 'Benchmark-exclusive lease exists'
    Require ($policy.maximumRegisteredPreparationOwners -eq 4 -and @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -le 4) 'Owner budget exceeded'
    Require (-not (Test-Path -LiteralPath (Join-Path $out 'seal-policy-267-v2.json'))) 'Sealer was previously started'
    [IO.File]::WriteAllBytes((Join-Path $out 'seal-policy-267-v2.json'), $policyBytes)
    Write-NewJson 'seal-guard-267-v2.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        ownerId = $initial.ownerId
        exactScopeMatched = $true
        policy = Metadata 'seal-policy-267-v2.json'
        leaseAbsentAtObservation = $true
        actualWorkerBuildHoldActive = $false
        buildAndTestWorkQuiesced = $false
        observer = $observer
        pointOnly = $true
    })
    $campaignPath = Join-Path (Split-Path -Parent $par) 'autoperf-campaign.json'
    $campaignBytes = [IO.File]::ReadAllBytes($campaignPath)
    $campaign = [Text.Encoding]::UTF8.GetString($campaignBytes) | ConvertFrom-Json
    $selected = @($campaign.candidates | Where-Object { $_.id -cin @('F231', 'F232', 'F233') })
    Require ($selected.Count -eq 3 -and @($selected.id | Sort-Object -Unique).Count -eq 3) 'Canonical outer IDs missing or duplicated'
    Require (@($selected | Where-Object { $_.status -cne 'pending' }).Count -eq 0) 'Canonical outer status is not pending'
    Write-NewJson 'campaign-final-selected-267-v2.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        canonicalPath = $campaignPath
        canonicalWholeFileSha256AtObservation = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($campaignBytes))
        selectionAuthority = 'Outer candidates[].id/status; nested finding is metadata only'
        selected = $selected
        noCanonicalWrite = $true
        pointOnly = $true
        observer = $observer
    })
    $whole = Read-Json 'WHOLE-ROLE-BINDINGS-267.json'
    $analysis = Read-Json 'STATIC-SOURCE-ANALYSIS-267.json'
    $assessment = Read-Json 'ASSESSMENT-267.json'
    $discovery = Read-Json 'discovery-267.json'
    Require ($whole.totalWholeSourceBindings -eq 26 -and @($whole.files).Count -eq 26) 'Whole binding count mismatch'
    Require ($whole.rawGitBatchRequestsHeadersTypesSizesWholePayloadsSha1Sha256AndFramingRevalidated -ceq $true) 'Raw source revalidation is absent'
    foreach ($role in @('Original', 'Default'))
    {
        $roleFiles = @($whole.files | Where-Object role -CEQ $role)
        Require ($roleFiles.Count -eq 13 -and @($roleFiles.repositoryPath | Sort-Object -Unique).Count -eq 13) "Whole logical file budget mismatch for $role"
        Require (@($roleFiles | Where-Object { $_.commit -cne $discovery.$role }).Count -eq 0) "Immutable commit mismatch for $role"
    }
    foreach ($binding in $whole.files)
    {
        Require ($binding.commitPathExpression -ceq ($binding.commit + ':' + $binding.repositoryPath) -and $binding.objectType -ceq 'blob' -and $binding.wholeBlob -ceq $true) 'Invalid whole binding'
        $current = Metadata $binding.sourceFile
        Require ($current.bytes -eq $binding.bytes -and $current.sha256 -ceq $binding.sha256) 'Whole source bytes drifted after analysis'
        $payload = [IO.File]::ReadAllBytes((Join-Path $out $binding.sourceFile))
        $header = [Text.Encoding]::ASCII.GetBytes("blob $($payload.Length)`0")
        $gitObject = [byte[]]::new($header.Length + $payload.Length)
        [Array]::Copy($header, 0, $gitObject, 0, $header.Length)
        [Array]::Copy($payload, 0, $gitObject, $header.Length, $payload.Length)
        $sha1 = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitObject)).ToLowerInvariant()
        Require ($sha1 -ceq $binding.blobSha1 -and $sha1 -ceq $binding.calculatedGitBlobSha1) 'Whole Git object SHA-1 drifted'
        $rawMeta = Metadata $binding.rawStdout.path
        Require ($rawMeta.bytes -eq $binding.rawStdout.bytes -and $rawMeta.sha256 -ceq $binding.rawStdout.sha256) 'Exact raw batch stdout drifted'
    }
    Require (@($analysis.theoryRows).Count -eq 12 -and $analysis.noProductExecution -ceq $true -and $analysis.noRuntimeBehavioralCompilationOrPerformancePassClaimed -ceq $true) 'Source-only analysis boundary mismatch'
    Require ($assessment.overallSourceDecision -ceq 'bounded-source-only-no-material-candidate' -and @($assessment.findings).Count -eq 3) 'Separate source decisions missing'
    foreach ($id in @('F231', 'F232', 'F233'))
    {
        $decision = @($assessment.findings | Where-Object id -CEQ $id)
        Require ($decision.Count -eq 1 -and $decision[0].decision -ceq 'bounded-source-only-no-material-candidate' -and $decision[0].notDeduplicated -ceq $true -and $decision[0].candidateAuthored -ceq $false -and $decision[0].canonicalOuterStatusRemains -ceq 'pending') "Invalid source decision $id"
    }
    $beforeFiles = @(Get-ChildItem -LiteralPath (Join-Path $out 'roots') -Filter '*.before.json' -File | Sort-Object Name)
    $prestartFiles = @(Get-ChildItem -LiteralPath (Join-Path $out 'roots') -Filter '*.prestart-failure.json' -File | Sort-Object Name)
    Require ($beforeFiles.Count -eq 21 -and $prestartFiles.Count -eq 1 -and $beforeFiles.Count + $prestartFiles.Count -le 32) 'Source-root actual/failed-attempt budget mismatch'
    $rootSummaries = @()
    $observedChildCount = 0
    $stderrBytes = 0L
    foreach ($beforeFile in $beforeFiles)
    {
        $relativeBefore = [IO.Path]::GetRelativePath($out, $beforeFile.FullName)
        $before = Read-Json $relativeBefore
        $relativeReceipt = $relativeBefore.Replace('.before.json', '.receipt.json')
        $relativeStarted = $relativeBefore.Replace('.before.json', '.started.json')
        $receipt = Read-Json $relativeReceipt
        $started = Read-Json $relativeStarted
        Require ($receipt.terminalSuccess -ceq $true -and $receipt.rootExited -ceq $true -and $receipt.rootWaitCalledAndReturned -ceq $true -and $receipt.exitCode -eq 0) "Nonterminal or failed source root: $relativeReceipt"
        Require ($receipt.stdoutDrainCompletedAndEof -ceq $true -and $receipt.stderrDrainCompletedAndEof -ceq $true -and $receipt.allObservedChildrenTerminal -ceq $true) "Source streams/observed children not terminal: $relativeReceipt"
        Require ($started.root.pid -eq $receipt.root.pid -and $started.root.creationFileTimeUtc -eq $receipt.root.creationFileTimeUtc -and $receipt.root.identityBoundByOwnedProcessHandle -ceq $true) "Root creation identity mismatch: $relativeReceipt"
        Require (($before.argv -join "`0") -ceq ($receipt.argv -join "`0")) "Exact argv mismatch: $relativeReceipt"
        foreach ($streamName in @('stdin', 'stdout', 'stderr'))
        {
            $stream = $receipt.$streamName
            $streamMeta = Metadata $stream.path
            Require ($streamMeta.bytes -eq $stream.bytes -and $streamMeta.sha256 -ceq $stream.sha256) "Raw stream drifted: $relativeReceipt/$streamName"
        }
        $children = @($receipt.observedChildren)
        foreach ($child in $children)
        {
            Require ($null -ne $child.creationUtc -and $child.terminalEstablished -ceq $true) "Observed child is not creation-bound/terminal: $relativeReceipt"
        }
        $observedChildCount += $children.Count
        $stderrBytes += $receipt.stderr.bytes
        $rootSummaries += [ordered]@{
            sequence = $receipt.sequence
            label = $receipt.label
            root = $receipt.root
            observer = $receipt.observer
            exitCode = $receipt.exitCode
            rootWaitReturned = $receipt.rootWaitCalledAndReturned
            stdoutDrainCompletedAndEof = $receipt.stdoutDrainCompletedAndEof
            stderrDrainCompletedAndEof = $receipt.stderrDrainCompletedAndEof
            observedChildren = $children
            allObservedChildrenTerminal = $receipt.allObservedChildrenTerminal
            stdin = $receipt.stdin
            stdout = $receipt.stdout
            stderr = $receipt.stderr
            receipt = Metadata $relativeReceipt
            started = Metadata $relativeStarted
            before = Metadata $relativeBefore
            observationLimits = $receipt.observationLimits
        }
    }
    $prestart = Read-Json ([IO.Path]::GetRelativePath($out, $prestartFiles[0].FullName))
    Require ($prestart.sequence -eq 9 -and $prestart.actualRootStarted -ceq $false -and $null -eq $prestart.actualRootPid -and $prestart.countedConservativelyAgainst32SourceRootBudget -ceq $true) 'Prestart failure disposition mismatch'
    $aliasFailure = Read-Json 'outer-01-discovery-receipt.json'
    Require ($aliasFailure.rootExitCode -eq 9009 -and $aliasFailure.rootExited -ceq $true -and $aliasFailure.waitForExitReturned -ceq $true -and $aliasFailure.stdoutDrainCompleted -ceq $true -and $aliasFailure.stderrDrainCompleted -ceq $true) 'Interpreter-alias failure is not terminal'
    foreach ($streamName in @('stdout', 'stderr'))
    {
        $stream = $aliasFailure.$streamName
        $relative = [IO.Path]::GetRelativePath($out, $stream.path)
        $actual = Metadata $relative
        Require ($actual.bytes -eq $stream.bytes -and $actual.sha256 -ceq $stream.sha256) 'Failed interpreter raw stream drifted'
    }
    $failurePaths = @(
        'outer-01-discovery-tool-failure-observed.json',
        'outer-03-04-tool-failure-observed.json',
        'failure-04-support-inventory.json',
        'roots\09-original-support-and-instruction-inventory.prestart-failure.json',
        'failure-seal-source-267-v1.json',
        'outer-final-sealer-v1-tool-failure-observed.json'
    )
    $failureMetadata = @($failurePaths | ForEach-Object { Metadata $_ })
    $sourceObserverPids = @($rootSummaries | ForEach-Object { $_.observer.pid } | Sort-Object -Unique)
    $allObserverPids = [Collections.Generic.HashSet[int]]::new()
    $null = $allObserverPids.Add($PID)
    foreach ($jsonFile in (Get-ChildItem -LiteralPath $out -Filter '*.json' -Recurse -Force -File))
    {
        $records = @(Get-Content -LiteralPath $jsonFile.FullName -Raw | ConvertFrom-Json)
        foreach ($record in $records)
        {
            foreach ($observedObserver in @($record.observer))
            {
                foreach ($observedPid in @($observedObserver.pid))
                {
                    if ($null -ne $observedPid)
                    {
                        Require ([int]$observedPid -gt 0) 'Invalid recorded observer PID'
                        $null = $allObserverPids.Add([int]$observedPid)
                    }
                }
            }
            foreach ($observedPid in @($record.observerPid))
            {
                if ($null -ne $observedPid)
                {
                    Require ([int]$observedPid -gt 0) 'Invalid recorded observer PID'
                    $null = $allObserverPids.Add([int]$observedPid)
                }
            }
        }
    }
    Write-NewJson 'ROOT-AND-TERMINAL-SUMMARY-267-v2.json' ([ordered]@{
        actualGitGhSourceRootCount = $beforeFiles.Count
        conservativePrestartFailureCount = $prestartFiles.Count
        conservativeSourceRootBudgetUsed = $beforeFiles.Count + $prestartFiles.Count
        directGitGhSourceRootBudget = 32
        actualGitGhRootPids = @($rootSummaries | ForEach-Object { $_.root.pid } | Sort-Object -Unique)
        sourceObserverPids = $sourceObserverPids
        allRecordedUtilityObserverPidsIncludingSealer = @($allObserverPids | Sort-Object)
        sourceRootExitCodes = @(0)
        allDirectRootsWaitedAndBothRawStreamsClosed = $true
        totalGitGhStderrBytes = $stderrBytes
        totalObservedSourceDescendants = $observedChildCount
        allObservedSourceDescendantsTerminal = $true
        failedInterpreterUtilityRoot = $aliasFailure.root
        failedInterpreterUtilityActualExitCode = $aliasFailure.rootExitCode
        failedInterpreterUtilityBothStreamsAndWaitTerminal = $true
        preservedFailureArtifacts = $failureMetadata
        observedPriorOuterToolReturns = Metadata 'OBSERVED-OUTER-TOOL-RETURNS-267-v2.json'
        sources = $rootSummaries
        globalObservationLimit = 'Creation-bound owned roots and sampled descendants only; no job containment, no proof excluding short-lived/unobserved descendants or unrelated machine activity. Root deadline checks are 120s with a 50ms WaitForExit step; in-process CIM call latency is not hard-bounded. Each stream has a 15s completion wait and observed descendants a 15s closure check. No process was killed. No runtime/performance result is claimed.'
        finalSealerObserver = $observer
        finalOuterSealerToolReturnNotYetObserved = $true
    })
    Write-NewJson 'SEAL-INPUT-VALIDATION-267-v2.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        wholeRoleBindings = Metadata 'WHOLE-ROLE-BINDINGS-267.json'
        assessment = Metadata 'ASSESSMENT-267.json'
        assessmentSealSupplement = Metadata 'ASSESSMENT-SEAL-SUPPLEMENT-267-v2.json'
        staticSourceAnalysis = Metadata 'STATIC-SOURCE-ANALYSIS-267.json'
        rootAndTerminalSummary = Metadata 'ROOT-AND-TERMINAL-SUMMARY-267-v2.json'
        finalCampaignSelection = Metadata 'campaign-final-selected-267-v2.json'
        wholeSourceSha1Sha256SizeAndRawStreamChecksPassed = $true
        separateFindingDecisionsRetained = $true
        threeCanonicalOuterStatusesPendingAtObservation = $true
        noNativeTestsBuildsCandidateEditsOrTimings = $true
        completeWithinOriginalSourceBudgets = $true
        finalOuterSealerToolReturnNotYetObserved = $true
    })
    Require (-not (Test-Path -LiteralPath (Join-Path $out 'BYTE-INDEX-267-v2.json')) -and -not (Test-Path -LiteralPath (Join-Path $out 'HANDOFF-267-v2.json'))) 'Final seal outputs already exist'
    $entries = @(Get-ChildItem -LiteralPath $out -Recurse -Force -File | Sort-Object FullName | ForEach-Object {
        Metadata ([IO.Path]::GetRelativePath($out, $_.FullName))
    })
    Write-NewJson 'BYTE-INDEX-267-v2.json' ([ordered]@{
        format = 'Complete sealed source-handoff payload byte index, SHA-256'
        ownerId = $initial.ownerId
        scope = '267 SOURCE ONLY F231/F232/F233'
        payloadFileCount = $entries.Count
        payloadBytes = ($entries.bytes | Measure-Object -Sum).Sum
        entries = $entries
        onlyEnvelopeExclusions = @('BYTE-INDEX-267-v2.json', 'HANDOFF-267-v2.json')
        envelopeExplanation = 'The byte index cannot include its own hash. HANDOFF binds this index and is reported with its own SHA-256 after writing; those two envelope files are the only exclusions. All source, helper, failed attempt, raw stream, guard, analysis and terminal-receipt payload files are indexed.'
        finalOuterSealerToolReturnNotYetObserved = $true
    })
    foreach ($entry in $entries)
    {
        $current = Metadata $entry.path
        Require ($current.bytes -eq $entry.bytes -and $current.sha256 -ceq $entry.sha256) "Payload changed during final sealing: $($entry.path)"
    }
    $currentPaths = @(Get-ChildItem -LiteralPath $out -Recurse -Force -File | ForEach-Object { [IO.Path]::GetRelativePath($out, $_.FullName) } | Where-Object { $_ -cne 'BYTE-INDEX-267-v2.json' } | Sort-Object)
    Require (($currentPaths -join "`0") -ceq ((@($entries.path | Sort-Object)) -join "`0")) 'Payload file set changed during sealing'
    $handoff = [ordered]@{
        ownerId = $initial.ownerId
        findings = @('F231', 'F232', 'F233')
        sourceDecisionPerFinding = 'Three separate bounded-source-only-no-material-candidate decisions; not duplicates, measured no-gain or false-positive dispositions'
        canonicalOuterStatuses = @($selected | ForEach-Object { [ordered]@{ id = $_.id; status = $_.status } })
        Original = $discovery.Original
        Default = $discovery.Default
        upstreamDefaultBranch = $discovery.freshUpstream.defaultBranch
        sourceQualificationOnly = $true
        parentAcceptanceRetirementLedgerAndPublicationRequired = $true
        byteIndex = Metadata 'BYTE-INDEX-267-v2.json'
        wholeRoleBindings = Metadata 'WHOLE-ROLE-BINDINGS-267.json'
        assessment = Metadata 'ASSESSMENT-267.json'
        assessmentSealSupplement = Metadata 'ASSESSMENT-SEAL-SUPPLEMENT-267-v2.json'
        staticSourceAnalysis = Metadata 'STATIC-SOURCE-ANALYSIS-267.json'
        rootAndTerminalSummary = Metadata 'ROOT-AND-TERMINAL-SUMMARY-267-v2.json'
        sealInputValidation = Metadata 'SEAL-INPUT-VALIDATION-267-v2.json'
        payloadFileCount = $entries.Count
        totalFilesIncludingTwoSealEnvelopes = $entries.Count + 2
        wholeSourceBindings = 26
        wholeLogicalFilesPerRole = 13
        maximumWholeLogicalFilesPerRole = 15
        actualGitGhRootCount = $beforeFiles.Count
        conservativePrestartFailureCount = $prestartFiles.Count
        conservativeSourceRootBudgetUsed = $beforeFiles.Count + $prestartFiles.Count
        maximumSourceRootBudget = 32
        actualGitGhRootPids = @($rootSummaries | ForEach-Object { $_.root.pid } | Sort-Object -Unique)
        failedInterpreterUtilityRootPid = $aliasFailure.root.pid
        sourceObserverPids = $sourceObserverPids
        allRecordedUtilityObserverPidsIncludingSealer = @($allObserverPids | Sort-Object)
        observedSourceDescendants = $observedChildCount
        streamAndChildLimits = '15s per stream/15s observed-child closure; 120s root checks with 50ms waits plus CIM latency; sampled children only, no job/no unobserved-child exclusion'
        failureArtifacts = $failureMetadata
        finalSealerObserver = $observer
        finalOuterSealerToolExitCode = $null
        finalOuterSealerToolReturnNotYetObserved = $true
        finalOuterSealerToolReceiptProtocol = 'The actual final powershell tool shellId/exit code must be reported only after its call returns. This on-disk seal does not predict or assert that future return.'
        allPayloadBytesRecheckedAfterIndexWrite = $true
        generatedAt = [DateTime]::UtcNow.ToString('o')
    }
    Write-NewJson 'HANDOFF-267-v2.json' $handoff
    $handoffMeta = Metadata 'HANDOFF-267-v2.json'
    $indexMeta = Metadata 'BYTE-INDEX-267-v2.json'
    Write-Output "HANDOFF267 path=$($handoffMeta.path) sha256=$($handoffMeta.sha256) bytes=$($handoffMeta.bytes)"
    Write-Output "INDEX267 path=$($indexMeta.path) sha256=$($indexMeta.sha256) bytes=$($indexMeta.bytes) payloadFiles=$($entries.Count) totalFiles=$($entries.Count + 2)"
    Write-Output "BINDINGS267 path=$($handoff.wholeRoleBindings.path) sha256=$($handoff.wholeRoleBindings.sha256) count=26 filesPerRole=13"
    Write-Output "ASSESSMENT267 path=$($handoff.assessment.path) sha256=$($handoff.assessment.sha256)"
    Write-Output "ROOTS267 actual=$($beforeFiles.Count) prestartFailed=$($prestartFiles.Count) budget=$($beforeFiles.Count + $prestartFiles.Count)/32 pids=$($handoff.actualGitGhRootPids -join ',') aliasFailurePid=$($aliasFailure.root.pid)"
    Write-Output "OBSERVERS267 source=$($sourceObserverPids -join ',') all=$(@($allObserverPids | Sort-Object) -join ',') sealer=$PID observedChildren=$observedChildCount"
    Write-Output 'SEAL267 data-only payload sealed; finalOuterSealerToolReturnNotYetObserved=True'
}
catch
{
    Write-NewJson 'failure-seal-source-267-v2.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        exception = $_.Exception.ToString()
        scriptStackTrace = $_.ScriptStackTrace
        failureRethrown = $true
        noSuccessSubstitution = $true
    })
    throw
}
