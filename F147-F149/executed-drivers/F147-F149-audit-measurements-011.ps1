$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$implementation = Join-Path $session 'autoperf-parallelism\finding-F147-F149-implementation-011'
$metadata = Get-Content -LiteralPath (Join-Path $implementation 'evidence\native-identity-acceptance-011.json') -Raw |
    ConvertFrom-Json -Depth 100
$fixture = @($metadata.actualSelectedPairsFreshlyParsed | Where-Object { $_.label -ceq 'common-fixture' })[0]
$audits = @()
foreach ($finding in @('F147', 'F149'))
{
    $root = Join-Path $session "autoperf-runs\$finding"
    $budget = Get-Content -LiteralPath (Join-Path $root 'diagnostic-budget.json') -Raw | ConvertFrom-Json -Depth 100
    if (-not $budget.closed -or $budget.authorizations.Count -ne 1 -or
        $budget.authorizations[0].status -cne 'completed' -or $budget.authorizations[0].sourceRole -cne 'Original')
    {
        throw 'Only the permanently closed completed Original comparison may be audited.'
    }
    $accepted = Get-Content -LiteralPath (Join-Path $root 'accepted-images.json') -Raw | ConvertFrom-Json -Depth 100
    $samplesFile = Join-Path $root 'comparisons\authorization-1-Original\paired-samples.json'
    $samples = Get-Content -LiteralPath $samplesFile -Raw | ConvertFrom-Json -Depth 100
    if ($samples.Count -ne 7)
    {
        throw 'The frozen seven paired observations are incomplete.'
    }
    $values = @()
    $checkedRows = @()
    foreach ($pair in $samples)
    {
        if ($pair.pair -ne $values.Count)
        {
            throw 'Observation order changed.'
        }
        $observed = @{}
        foreach ($variant in @('baseline', 'candidate'))
        {
            $saved = $pair.$variant
            if ((Get-FileHash -LiteralPath $saved.file -Algorithm SHA256).Hash -cne $saved.sha256)
            {
                throw 'An actual measured result changed.'
            }
            $result = Get-Content -LiteralPath $saved.file -Raw | ConvertFrom-Json -Depth 100
            if ($result.outcome -cne 'pass' -or -not $result.actualNativeTerminal -or
                $result.actualNativeExitCode -ne 0 -or -not $result.actualStdoutCompletelyDrained -or
                -not $result.actualStderrCompletelyDrained -or
                @($result.actualObservedDescendants | Where-Object { -not $_.actualTerminal }).Count -ne 0)
            {
                throw 'A measured native process or stream was not successfully terminal.'
            }
            if ((Get-FileHash -LiteralPath $result.actualNativeXml -Algorithm SHA256).Hash -cne $result.actualNativeXmlSha256)
            {
                throw 'An actual native runner XML changed.'
            }
            [xml]$xml = Get-Content -LiteralPath $result.actualNativeXml -Raw
            $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
            $ns.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
            $rows = @($xml.SelectNodes('//t:UnitTestResult', $ns))
            $definition = $xml.SelectSingleNode('//t:TestDefinitions/t:UnitTest', $ns)
            $counter = $xml.SelectSingleNode('//t:ResultSummary/t:Counters', $ns)
            if ($rows.Count -ne 1 -or $rows[0].outcome -cne 'Passed' -or
                $rows[0].testId -cne $definition.id -or $rows[0].executionId -cne $definition.Execution.id -or
                [int]$counter.total -ne 1 -or [int]$counter.passed -ne 1 -or [int]$counter.failed -ne 0)
            {
                throw 'Measured native XML rows/definitions/executions/counters did not reconcile.'
            }
            $stdout = [string]$rows[0].Output.StdOut
            $matches = [regex]::Matches($stdout, 'AUTOPERF_SAMPLE_WORKLOAD_JSON ([^\r\n]+)')
            if ($matches.Count -ne 1)
            {
                throw 'The actual native measurement marker is absent or duplicated.'
            }
            $actual = $matches[0].Groups[1].Value | ConvertFrom-Json -Depth 30
            $image = $accepted.images.Original.$variant
            $sourceVariant = if ($variant -ceq 'baseline') { 'Baseline' } else { $finding }
            $owner = @($metadata.actualSelectedPairsFreshlyParsed | Where-Object { $_.label -ceq "Original-$sourceVariant" })[0]
            if ($actual.mode -cne 'measure' -or $actual.finding -cne $finding -or $actual.pair -ne $pair.pair -or
                $actual.sampleSha256 -cne $image.actualOwnerSha256 -or $actual.commonCoreSha256 -cne $accepted.commonCoreSha256 -or
                $actual.observations.Count -ne 2 -or
                -not $stdout.Contains("sha256=$($owner.actualDllSha256) mvid=$($owner.actualParsedMvid)") -or
                -not $stdout.Contains("sha256=$($fixture.actualDllSha256) mvid=$($fixture.actualParsedMvid)") -or
                -not $stdout.Contains('12.0.0-alpha.1.26557.102') -or -not $stdout.Contains('rollForward=Disable'))
            {
                throw 'Actual measured workload/loaded identity differs from its accepted source image.'
            }
            foreach ($observation in $actual.observations)
            {
                if (-not $observation.ActualMeasurement -or $observation.Operations -ne 128 -or
                    $observation.PayloadBytes -ne 65536 -or $observation.AllocatedBytes -le 0 -or $observation.ElapsedMilliseconds -le 0)
                {
                    throw 'A measured row did not execute the frozen workload.'
                }
            }
            $primaryDirection = if ($finding -ceq 'F147') { 'unidirectional' } else { 'bidirectional' }
            $observed[$variant] = @{
                primary = @($actual.observations | Where-Object { $_.Direction -ceq $primaryDirection })[0]
                control = @($actual.observations | Where-Object { $_.Direction -cne $primaryDirection })[0]
            }
            $checkedRows += [ordered]@{
                pair = $pair.pair; variant = $variant; actualNativePid = $result.actualNativePid
                xml = $result.actualNativeXml; xmlSha256 = $result.actualNativeXmlSha256
                testName = [string]$rows[0].testName; testId = [string]$rows[0].testId
                executionId = [string]$rows[0].executionId; outcome = [string]$rows[0].outcome
                actualLoadedSourceOwnerMvidMatched = $true; actualMeasuredObservation = $actual
            }
        }
        $values += [ordered]@{
            allocation = $observed.candidate.primary.AllocatedBytes / $observed.baseline.primary.AllocatedBytes
            elapsed = $observed.candidate.primary.ElapsedMilliseconds / $observed.baseline.primary.ElapsedMilliseconds
            controlAllocation = $observed.candidate.control.AllocatedBytes / $observed.baseline.control.AllocatedBytes
            controlElapsed = $observed.candidate.control.ElapsedMilliseconds / $observed.baseline.control.ElapsedMilliseconds
            savedBytes = $observed.baseline.primary.AllocatedBytes - $observed.candidate.primary.AllocatedBytes
        }
    }
    function Geometric([string]$Key)
    {
        $sum = 0.0
        foreach ($value in $values)
        {
            $sum += [Math]::Log([double]$value[$Key])
        }

        return [Math]::Exp($sum / 7)
    }
    $decision = $budget.authorizations[0].decision
    $calculated = [ordered]@{
        primaryAllocation = Geometric 'allocation'; primaryElapsed = Geometric 'elapsed'
        controlAllocation = Geometric 'controlAllocation'; controlElapsed = Geometric 'controlElapsed'
        meanSavedBytes = ($values.savedBytes | Measure-Object -Average).Average
    }
    foreach ($binding in @(
        @('primaryAllocation', 'actualPrimaryAllocationGeometricMeanCandidateBaselineRatio'),
        @('primaryElapsed', 'actualPrimaryElapsedGeometricMeanCandidateBaselineRatio'),
        @('controlAllocation', 'actualUnchangedControlAllocationGeometricMeanCandidateBaselineRatio'),
        @('controlElapsed', 'actualUnchangedControlElapsedGeometricMeanCandidateBaselineRatio'),
        @('meanSavedBytes', 'actualMeanAbsoluteAllocatedBytesSavedPerObservation')))
    {
        if ([Math]::Abs($calculated[$binding[0]] - $decision.($binding[1])) -gt 0.00000001)
        {
            throw 'Independent native XML arithmetic differs from the saved driver decision.'
        }
    }
    if ($checkedRows.Count -ne 14 -or @($values | Where-Object { $_.allocation -lt 1 }).Count -ne 7 -or
        $decision.actualPrimaryAllocationPairsFavoringCandidate -ne 7 -or
        -not $decision.actualAllocationGatePassed -or -not $decision.actualElapsedGatePassed -or
        $decision.actualUnchangedControlGatePassed -or $decision.actualAllPredeclaredGatesPassed -or
        $calculated.controlElapsed -le 1.10)
    {
        throw 'The exact observed qualification failure was incorrectly characterized.'
    }
    $audits += [ordered]@{
        finding = $finding; actualXmlRowsFreshlyReconciled = $checkedRows
        actualIndependentlyRecomputed = $calculated; actualRecordedDecision = $decision
        actualObservedAllocationBenefit = $true; actualQualification = 'inconclusive-unchanged-control-elapsed-drift'
        actualRootCauseOfControlDriftEstablished = $false
        actualDefaultRoleNotMeasured = $true; actualBudgetClosedAuthorizations = 1
        actualUnusedAuthorizationsPermanentlyClosed = 2; actualRetimingOrNewCounterExecuted = $false
    }
}
$receipt = Join-Path $session 'F147-F149-independent-measurement-audit-011.json'
if (Test-Path -LiteralPath $receipt)
{
    throw 'Refusing to overwrite an independent measurement audit.'
}
[IO.File]::WriteAllText($receipt, ([ordered]@{
    recordedAt = [DateTimeOffset]::UtcNow.ToString('o')
    actualAudits = $audits; actualXmlParser = 'System.Xml.XmlDocument'
    actualTotalMeasuredNativeRows = 28; actualNoNativeTargetExecution = $true
    actualNoPhysicalConsoleQuicTlsBrowserThroughputClaimed = $true
} | ConvertTo-Json -Depth 50) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
Write-Output "Independent actual native XML/arithmetic audit passed:28rows;2closed1of3budgets;no retiming. $receipt"
