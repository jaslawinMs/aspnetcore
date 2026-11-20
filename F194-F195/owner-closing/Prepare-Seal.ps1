$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$capsule = Join-Path $root 'capsule'
if (Test-Path -LiteralPath "$capsule\MANIFEST.json")
{
    throw 'Payload already sealed'
}
foreach ($name in @('Audit.cjs', 'HANDOFF.md', 'Metadata.cjs', 'Xml.cjs'))
{
    Copy-Item -LiteralPath "$root\$name" -Destination "$capsule\$name"
}
foreach ($name in @(
    'source-diff-receipt.json', 'original-default-embedded.diff.stderr.txt',
    'preparation-read-failures.json', 'closing-head.json', 'closing-head.stdout.txt',
    'closing-head.stderr.txt', 'source-integrity-final.json', 'Run-Node.ps1', 'Prepare-Seal.ps1', 'Seal-Payload.cjs'
))
{
    Copy-Item -LiteralPath "$root\$name" -Destination "$capsule\evidence\$name"
}
Copy-Item -LiteralPath "$root\node-attempts" -Destination "$capsule\preseal-node-attempts" -Recurse
$commands = @()
$identities = [Collections.Generic.List[object]]::new()
foreach ($attempt in Get-ChildItem -LiteralPath "$root\attempts" -Directory)
{
    $receipt = Get-Content -LiteralPath "$($attempt.FullName)\receipt.json" -Raw | ConvertFrom-Json
    $commands += [ordered]@{
        id = $receipt.id
        command = $receipt.command
        exactScript = "attempts\$($receipt.id)\command.ps1"
        graph = $receipt.graph
        pid = $receipt.ownedRoot.pid
        creationUtc = $receipt.ownedRoot.creationUtc
        creationTicks = $receipt.ownedRoot.creationTicks
        exitCode = $receipt.rootExitCode
        stdout = "attempts\$($receipt.id)\stdout.txt"
        stderr = "attempts\$($receipt.id)\stderr.txt"
        receipt = "attempts\$($receipt.id)\receipt.json"
    }
    $identities.Add([ordered]@{
        source = "attempts\$($receipt.id)\receipt.json:ownedRoot"
        pid = [int]$receipt.ownedRoot.pid
        creationTicks = $receipt.ownedRoot.creationTicks
        creationUtc = $receipt.ownedRoot.creationUtc
        precision = 'Process.StartTime native Windows creation identity'
    })
    foreach ($child in $receipt.observedChildChecks)
    {
        $identities.Add([ordered]@{
            source = "attempts\$($receipt.id)\receipt.json:observedChildChecks"
            pid = [int]$child.observed.pid
            creationTicks = $child.observed.creationTicks
            creationUtc = $child.observed.creationUtc
            precision = 'Win32_Process CreationDate microsecond precision'
        })
    }
}
foreach ($file in Get-ChildItem -LiteralPath "$root\native","$root\supplemental" -Recurse -Filter '*-entry.json')
{
    $identity = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $identities.Add([ordered]@{
        source = $file.FullName.Substring($root.Length + 1)
        pid = [int]$identity.pid
        creationTicks = $identity.creationTicks
        creationUtc = $identity.creationUtc
        precision = 'In-process Process.StartTime native Windows creation identity'
    })
}
foreach ($attempt in Get-ChildItem -LiteralPath "$root\node-attempts" -Directory)
{
    $receipt = Get-Content -LiteralPath "$($attempt.FullName)\receipt.json" -Raw | ConvertFrom-Json
    $identities.Add([ordered]@{
        source = "preseal-node-attempts\$($attempt.Name)\receipt.json:ownedRoot"
        pid = [int]$receipt.ownedRoot.pid
        creationTicks = $receipt.ownedRoot.creationTicks
        creationUtc = $receipt.ownedRoot.creationUtc
        precision = 'Process.StartTime native Windows creation identity'
    })
}
$closing = Get-Content -LiteralPath "$root\closing-head.json" -Raw | ConvertFrom-Json
$identities.Add([ordered]@{
    source = 'evidence\closing-head.json:root'
    pid = [int]$closing.root.pid
    creationTicks = $closing.root.creationTicks
    creationUtc = $closing.root.creationUtc
    precision = 'Process.StartTime native Windows creation identity'
})
$all = @(Get-CimInstance Win32_Process -Property ProcessId,CreationDate)
$checkedUtc = [DateTime]::UtcNow.ToString('o')
$checks = @()
$unique = @{}
$missing = 0
$stillObserved = 0
foreach ($identity in $identities)
{
    if ($identity.pid -le 0 -or [string]::IsNullOrWhiteSpace($identity.creationTicks))
    {
        $missing++
        $checks += [ordered]@{ source = $identity.source; pid = $identity.pid; originalCreationTicks = $identity.creationTicks; state = 'original-identity-unavailable' }
        continue
    }
    $key = "$($identity.pid):$($identity.creationTicks)"
    if ($unique.ContainsKey($key))
    {
        continue
    }
    $unique[$key] = $true
    $current = $all | Where-Object ProcessId -eq $identity.pid | Select-Object -First 1
    $state = if ($null -eq $current)
    {
        'pid-absent'
    }
    elseif ($null -eq $current.CreationDate)
    {
        $missing++
        'current-creation-identity-unavailable'
    }
    else
    {
        $originalTicks = [Numerics.BigInteger]::Parse($identity.creationTicks)
        $currentTicks = [Numerics.BigInteger]::Parse($current.CreationDate.ToUniversalTime().Ticks.ToString())
        if ([Numerics.BigInteger]::Divide($originalTicks, 10) -ne [Numerics.BigInteger]::Divide($currentTicks, 10))
        {
            'pid-reused-original-identity-absent'
        }
        else
        {
            $stillObserved++
            'same-identity-still-observed'
        }
    }
    $checks += [ordered]@{
        source = $identity.source
        pid = $identity.pid
        originalCreationTicks = $identity.creationTicks
        originalCreationUtc = $identity.creationUtc
        originalPrecision = $identity.precision
        state = $state
        currentCreationUtc = if ($null -ne $current -and $null -ne $current.CreationDate) { $current.CreationDate.ToUniversalTime().ToString('o') } else { $null }
        comparison = 'Compare exact observed PID plus creation timestamp at WMI microsecond precision; missing identity never maps to zero or terminal'
    }
}
$closure = [ordered]@{
    checkedUtc = $checkedUtc
    checks = $checks
    unavailableIdentities = $missing
    sameIdentityStillObserved = $stillObserved
    receiptIdentitiesBeforeExactDeduplication = $identities.Count
    checkedIdentities = $checks.Count
    rootExitCodes = 'Read real command receipts; PID absence does not invent an exit code'
    nativeTestHostExitHooks = 'Both absent; native testhost exit codes remain unknown'
    scope = 'All recorded native/preparation runner roots, their sampled children, managed entry identities, preseal assembler Node roots and the closing Git root; not universal process closure or unsampled descendants'
}
$closure | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath "$root\final-process-closure.json" -Encoding utf8
Copy-Item -LiteralPath "$root\final-process-closure.json" -Destination "$capsule\evidence\final-process-closure.json"
$cohort = Get-Content -LiteralPath "$root\contract-checklist.json" -Raw | ConvertFrom-Json
[ordered]@{
    ownerId = $cohort.ownerId
    selection = 'evidence\NATIVE-SELECTION.json'
    frozenCohort = 'evidence\contract-checklist.json'
    nativeMethodNames = $cohort.nativeMethods
    nativeTheoryRows = $cohort.theoryRows
    expectedNativeRowsPerRole = 11
    supplementalCases = $cohort.supplementalCases
    commands = $commands
    unchangedCommonConsumerBuild = '08-common-consumer-restore-build'
    sourcePreparationGitCommandLimits = 'Some earliest Git/tool reads lack owned PID/creation receipts; retained raw logs are not promoted to complete native process receipts.'
    offlineAudit = 'node --permission --allow-fs-read=<capsule> --no-addons <capsule>\Audit.cjs'
} | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath "$capsule\COMMANDS.json" -Encoding utf8
$results = Get-Content -LiteralPath "$capsule\RESULTS.json" -Raw | ConvertFrom-Json -AsHashtable
Copy-Item -LiteralPath "$capsule\RESULTS.json" -Destination "$capsule\evidence\RESULTS-before-closing-observation.json"
$results['defaultClosingSHA'] = $closing.sha
$results['defaultHeadDriftObserved'] = $closing.sha -ne $results.defaultEntrySHA
$results['retargetedAfterClosingObservation'] = $false
$results['nativeDependencyIdentity'] = [ordered]@{ xunit = '2.9.2'; Moq = '4.20.72'; MicrosoftNETTestSdk = '18.0.1'; VSTestAdapter = '3.1.3'; unchangedPinnedRepositoryConventions = $true }
$results['finalProcessClosure'] = [ordered]@{ path = 'evidence\final-process-closure.json'; checkedIdentities = $checks.Count; unavailableIdentities = $missing; sameIdentityStillObserved = $stillObserved; universalProcessClosure = $false }
$results | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath "$capsule\RESULTS.json" -Encoding utf8
if ($missing -ne 0 -or $stillObserved -ne 0)
{
    throw "Do not seal: unavailable identities=$missing; same identities still observed=$stillObserved"
}
Write-Output "PREPARED payload; final observed identities=$($checks.Count), missing=$missing, same-identity-running=$stillObserved"
