$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'autoperf-parallelism\finding-F237-F238-059'
$out = Join-Path $root 'ownership-063'
if (Test-Path -LiteralPath $out)
{
    throw 'Preserve the previous ownership reconciliation.'
}
New-Item -ItemType Directory -Path $out | Out-Null
[IO.File]::Copy($PSCommandPath, (Join-Path $out 'executed-reconciliation-063.ps1'), $false)

function Write-Json([string] $Name, $Value)
{
    $Value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $out $Name) -Encoding utf8NoBOM
}

function Fingerprint([string] $File)
{
    [pscustomobject]@{
        file = $File
        bytes = (Get-Item -LiteralPath $File).Length
        sha256 = (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash
    }
}

function Read-AdoptionBlock([string] $File)
{
    $source = [IO.File]::ReadAllText($File).Replace("`r`n", "`n")
    $begin = $source.IndexOf('    $ownedPids = [Collections.Generic.HashSet[int]]::new()', [StringComparison]::Ordinal)
    if ($begin -lt 0)
    {
        throw 'The exact recorded adoption block start was not found.'
    }
    $end = $source.IndexOf("    foreach (`$row in `$rows)`n    {`n        if (!`$ownedPids.Contains(",
        $begin, [StringComparison]::Ordinal)
    if ($end -lt 0)
    {
        throw 'The exact recorded adoption block end was not found.'
    }
    [scriptblock]::Create($source.Substring($begin, $end - $begin) +
        "`n[pscustomobject]@{ Pids = @(`$ownedPids | Sort-Object) }")
}

$legacyFile = Join-Path $root 'native-Original-native-after-restored-assets\executed-native-command-060.ps1'
$futureFile = Join-Path $PSScriptRoot 'F237-F238-native-command-060.ps1'
$legacy = Read-AdoptionBlock $legacyFile
$future = Read-AdoptionBlock $futureFile
$epoch = [DateTimeOffset]::Parse('2026-11-20T15:00:00.0000000Z').UtcDateTime
function Row([int] $PidValue, [int] $ParentPid, [double] $OffsetSeconds)
{
    [pscustomobject]@{ ProcessId = $PidValue; ParentProcessId = $ParentPid; CreationDate = $epoch.AddSeconds($OffsetSeconds) }
}
$cases = @(
    @{ name = 'ValidChronologicalChain'; rows = @((Row 100 900 0), (Row 101 100 1), (Row 102 101 2)); rootPid = 100; creationOffset = 0.0; expected = @(100, 101, 102); legacyExpectedMatch = $true },
    @{ name = 'StaleNumericParentPidWithPreexistingChild'; rows = @((Row 100 900 0), (Row 200 100 -23280), (Row 201 200 -23000)); rootPid = 100; creationOffset = 0.0; expected = @(100); legacyExpectedMatch = $false },
    @{ name = 'ChildNewerThanRootButOlderThanIntermediateParent'; rows = @((Row 100 900 0), (Row 101 100 10), (Row 202 101 5)); rootPid = 100; creationOffset = 0.0; expected = @(100, 101); legacyExpectedMatch = $false },
    @{ name = 'WrongRootPidIsRejected'; rows = @((Row 100 900 0), (Row 101 100 1)); rootPid = 105; creationOffset = 0.0; expected = @(); legacyExpectedMatch = $true },
    @{ name = 'WrongRootCreationIsRejected'; rows = @((Row 100 900 0), (Row 101 100 1)); rootPid = 100; creationOffset = 2.0; expected = @(); legacyExpectedMatch = $true },
    @{ name = 'ExistingSubMillisecondToleranceIsPreserved'; rows = @((Row 100 900 0)); rootPid = 100; creationOffset = 0.0005; expected = @(100); legacyExpectedMatch = $true },
    @{ name = 'ExactlyOneMillisecondIsStillRejected'; rows = @((Row 100 900 0)); rootPid = 100; creationOffset = 0.001; expected = @(); legacyExpectedMatch = $true }
)
$regressions = foreach ($case in $cases)
{
    $rows = $case.rows
    $process = [pscustomobject]@{ Id = $case.rootPid }
    $creation = $epoch.AddSeconds($case.creationOffset).ToString('o')
    $oldResult = & $legacy
    $newResult = & $future
    $expected = $case.expected -join ','
    $oldMatch = ($oldResult.Pids -join ',') -ceq $expected
    $newMatch = ($newResult.Pids -join ',') -ceq $expected
    [pscustomobject]@{
        name = $case.name
        expectedSyntheticPids = $case.expected
        actualLegacySyntheticPids = $oldResult.Pids
        actualFutureSyntheticPids = $newResult.Pids
        actualLegacyMatchesExpectation = $oldMatch
        expectedLegacyMatch = $case.legacyExpectedMatch
        actualFutureMatchesExpectation = $newMatch
    }
}
Write-Json 'exact-block-regressions.json' ([ordered]@{
    actualLegacySource = Fingerprint $legacyFile
    actualFutureSource = Fingerprint $futureFile
    actualExtractedCodeExecutedNotAReimplementedProxy = $true
    actualSyntheticSnapshotRowsNotLiveProcessOwnershipEvidence = $true
    actualHistoricalWrapperAndObservedAncestryNotReattested = $true
    actualCases = @($regressions)
})
if (@($regressions | Where-Object { !$_.actualFutureMatchesExpectation -or
        $_.actualLegacyMatchesExpectation -ne $_.expectedLegacyMatch }).Count -ne 0)
{
    throw 'The exact legacy/new adoption-block regression contract failed; retain the written result.'
}

$summaries = foreach ($attempt in Get-ChildItem -LiteralPath $root -Directory -Filter 'native-*' | Sort-Object Name)
{
    $privateFile = Join-Path $attempt.FullName 'exit.json'
    $receipt = Get-Content -LiteralPath $privateFile -Raw | ConvertFrom-Json -DateKind String
    $rootTime = [DateTimeOffset]::Parse($receipt.actualRootCreationUtc)
    $observations = @($receipt.actualObservedDescendants)
    $olderThanRoot = @($observations | Where-Object { [DateTimeOffset]::Parse($_.creationUtc) -lt $rootTime.AddMilliseconds(-1) })
    $impossible = foreach ($row in $olderThanRoot)
    {
        $chain = [Collections.Generic.List[object]]::new()
        $seen = [Collections.Generic.HashSet[string]]::new()
        $current = $row
        $boundary = 'NoRecordedNumericParent'
        for ($step = 0; $step -lt 30; $step++)
        {
            $key = "$($current.pid)|$($current.creationUtc)"
            if (!$seen.Add($key))
            {
                $boundary = 'RecordedNumericCycle'
                break
            }
            $chain.Add([pscustomobject]@{
                pid = $current.pid; parentPid = $current.parentPid; creationUtc = $current.creationUtc
            })
            if ($current.pid -eq $receipt.actualRootPid)
            {
                $boundary = 'RecordedRootNumericPidReached'
                break
            }
            $parents = @($observations | Where-Object pid -EQ $current.parentPid)
            if ($parents.Count -ne 1)
            {
                $boundary = if ($parents.Count -eq 0) { 'NoRecordedNumericParent' } else { 'AmbiguousRecordedNumericParentInstances' }
                break
            }
            $current = $parents[0]
        }
        [pscustomobject]@{
            pid = $row.pid; parentPid = $row.parentPid; creationUtc = $row.creationUtc
            actualSecondsBeforeRecordedRoot = ($rootTime - [DateTimeOffset]::Parse($row.creationUtc)).TotalSeconds
            actualLegacyNumericChain = @($chain.ToArray())
            actualNumericChainBoundary = $boundary
            actualNotChronologicalOwnedAncestry = $true
        }
    }
    $derivative = [ordered]@{
        actualScopedDerivativeNotByteExactPrivateReceipt = $true
        actualPrivateReceipt = Fingerprint $privateFile
        role = $receipt.role; mode = $receipt.mode; attempt = $receipt.attempt
        actualGraph = $receipt.actualGraph; actualExecutable = $receipt.actualExecutable
        actualArguments = $receipt.actualArguments
        actualSelectedProcessEnvironment = $receipt.actualSelectedProcessEnvironment
        actualRootPid = $receipt.actualRootPid; actualRootCreationUtc = $receipt.actualRootCreationUtc
        actualRootTerminal = $receipt.actualRootTerminal; actualExitCode = $receipt.actualExitCode
        actualStdoutDrained = $receipt.actualStdoutDrained; actualStderrDrained = $receipt.actualStderrDrained
        actualHistoricalSampledIdentityCount = $observations.Count
        actualHistoricalPostRootMatchingIdentityCount = @($receipt.actualFinalObservedOwnedIdentitiesStillAlive).Count
        actualCertainPreexistingIdentityCount = $olderThanRoot.Count
        actualDescendantArraysAndCommandLinesOmitted = $true
        actualOmissionReason = 'Legacy numeric-parent-only recursion admitted unrelated preexisting processes. Full private receipts remain unmodified; no descendant ownership or universal closure is retrospectively attested.'
        actualOriginalNativeTestWrapperFailedPostRootOwnershipGuard = $receipt.role -ceq 'Original' -and
            $receipt.attempt -ceq 'native-after-restored-assets'
        actualNoNativeRerunOrStopOrComparisonAuthorization = $true
    }
    Write-Json ($attempt.Name + '.scoped-receipt.json') $derivative
    [pscustomobject]@{
        attempt = $attempt.Name; actualRootPid = $receipt.actualRootPid
        actualRootCreationUtc = $receipt.actualRootCreationUtc; actualRootExit = $receipt.actualExitCode
        actualRecordedIdentities = $observations.Count; actualCertainPreexistingIdentities = $olderThanRoot.Count
        actualPostRootRecordedMatchingIdentities = @($receipt.actualFinalObservedOwnedIdentitiesStillAlive).Count
        actualCertainInvalidNumericChains = @($impossible)
    }
}
Write-Json 'private-chronology-reconciliation.json' ([ordered]@{
    actualScope = 'Exact ten F237/F238 native attempt receipts; no historical case reopened.'
    actualAttempts = @($summaries)
    actualNoCommandLinesInThisDerivedReconciliation = $true
    actualSourceObservationHistoryUnmodified = $true
    actualNoNativeRerunNoStopNoClaimOfFullHistoricalAncestryClosure = $true
})
$followup = Join-Path $root 'original-post-root-identity-check-061.json'
$followupJson = Get-Content -LiteralPath $followup -Raw | ConvertFrom-Json -DateKind String
Write-Json 'followup-scoped-summary.json' ([ordered]@{
    actualPrivateSource = Fingerprint $followup
    actualObservedAt = $followupJson.observedAt
    actualNativeTestRootExit = $followupJson.actualNativeTestRootExit
    actualNativeWrapperHadPostRootIdentityFailure = $followupJson.actualNativeWrapperHadPostRootIdentityFailure
    actualRecordedFinalIdentityCount = @($followupJson.actualRecordedFinalIdentities).Count
    actualStillMatchingAtThatFollowupCount = @($followupJson.actualRecordedFinalIdentities |
        Where-Object actualSameIdentityStillObserved -EQ $true).Count
    actualRawIdentityRowsAndUnrelatedCommandLinesNotIncluded = $true
    actualNoStopPerformed = $followupJson.actualNoStopPerformed
    actualNoRerun = $followupJson.actualNoRerun
    actualNotProofOfOwnedAncestry = $true
})
[pscustomobject]@{
    actualExactSourceRegressionCases = @($regressions).Count
    actualLegacyRegressionsReproduced = @($regressions | Where-Object actualLegacyMatchesExpectation -EQ $false).Count
    actualFutureCasesPassed = @($regressions | Where-Object actualFutureMatchesExpectation -EQ $true).Count
    actualPrivateNativeReceiptsPreservedAndExplicitlyScoped = @($summaries).Count
    actualCertainPreexistingIdentities = ($summaries.actualCertainPreexistingIdentities | Measure-Object -Sum).Sum
    actualNoNativeRerunOrProcessStop = $true
    actualOutput = $out
} | ConvertTo-Json
