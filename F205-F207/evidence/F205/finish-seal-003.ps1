$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

function Read-Json
{
    param([string] $Name)

    return Get-Content -LiteralPath (Join-Path $PSScriptRoot $Name) -Raw | ConvertFrom-Json -AsHashtable
}

function Write-NewJson
{
    param([string] $Name, [object] $Value)

    $absolute = [System.IO.Path]::GetFullPath($Name, $PSScriptRoot)
    if (-not $absolute.StartsWith($PSScriptRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase))
    {
        throw 'Artifact output escapes the dedicated evidence root.'
    }
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine)
    $stream = [System.IO.File]::Open($absolute, [System.IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Get-Metadata
{
    param([string] $Name)

    $file = Get-Item -LiteralPath (Join-Path $PSScriptRoot $Name)
    return [ordered]@{
        path = $Name
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}

try
{
    foreach ($name in @('HANDOFF.attempt-002.json', 'ARTIFACT-INDEX-003.json', 'SEAL-003.json'))
    {
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot $name))
        {
            throw "Refusing to overwrite an existing versioned artifact: $name"
        }
    }
    $environment = [ordered]@{}
    foreach ($key in @('PATH', 'PATHEXT', 'SYSTEMROOT', 'COMSPEC', 'DOTNET_ROOT', 'DOTNET_ROOT_X64', 'DOTNET_GENERATE_ASPNET_CERTIFICATE', 'DOTNET_ADD_GLOBAL_TOOLS_TO_PATH', 'MSBUILDDISABLENODEREUSE', 'NUGET_PACKAGES'))
    {
        $environment[$key] = [Environment]::GetEnvironmentVariable($key)
    }
    Write-NewJson -Name 'execution-seal-003.json' -Value ([ordered]@{
        startedUtc = [DateTime]::UtcNow.ToString('o')
        helper = $PSCommandPath
        helperSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
        argv = @('&', $PSCommandPath)
        cwd = $PSScriptRoot
        pid = $PID
        environment = $environment
        environmentScope = 'Execution-relevant allowlist; authentication and unrelated ambient values excluded.'
        operationClass = 'Synchronous artifact/source verification and local process-identity read; no child or product process launched.'
        replacementScope = 'Do not replay previous helpers. Adopt the successfully generated second source handoff, preserve its bytes, add the outer JSON parser failure, then finish the envelopes with case-sensitive hashtable JSON parsing.'
        nativeProductStarts = 0
    })

    $completed = Read-Json 'seal-helper-completed-002.json'
    $secondLauncher = Read-Json 'launcher-seal-002.json'
    $secondExecution = Read-Json 'execution-seal-002.json'
    $secondOuterFailure = Read-Json 'seal-outer-failure-002.json'
    $handoff = Read-Json 'HANDOFF.json'
    if ($secondLauncher['exitCode'] -ne 0 -or
        (Get-Metadata 'HANDOFF.json')['sha256'] -ne $completed['handoff']['sha256'] -or
        (Get-FileHash -LiteralPath $secondExecution['helper'] -Algorithm SHA256).Hash -ne $secondExecution['helperSha256'])
    {
        throw 'The second source handoff/helper is not the preserved successful inner-sealer output.'
    }
    if ($completed['rawSourceCopiesVerified'] -ne 104 -or $completed['readOnlyGitGithubReceipts'] -ne 48)
    {
        throw 'The source/receipt verification boundary differs from the completed inner sealer.'
    }
    $restoration = Read-Json 'reserved-restoration-005.json'
    if (-not $restoration['finalReservedStateRestored'] -or $restoration['wholePreparationNoWriteCompliance'])
    {
        throw 'The reserved-root incident/restoration qualification is missing.'
    }
    $baseline = Read-Json 'reserved-before-002.json'
    $reports = [System.Collections.Generic.List[object]]::new()
    foreach ($report in $baseline['untracked'])
    {
        $path = Join-Path 'C:\src\aspnetcore' $report['path']
        $file = Get-Item -LiteralPath $path
        $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        if ($file.Length -ne $report['bytes'] -or $hash -ne $report['sha256'])
        {
            throw "An original reserved report no longer matches: $($report['path'])"
        }
        $reports.Add([ordered]@{ path = $report['path']; bytes = $file.Length; sha256 = $hash })
    }
    $incident = Read-Json 'reserved-artifact-path-incident-005.json'
    foreach ($recovered in $incident['files'])
    {
        if ((Test-Path -LiteralPath $recovered['source']) -or
            (Get-FileHash -LiteralPath $recovered['destination'] -Algorithm SHA256).Hash -ne $recovered['sha256'])
        {
            throw "Recovered artifact custody differs: $($recovered['name'])"
        }
    }
    Write-NewJson -Name 'reserved-report-recheck-007.json' -Value ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        baseline = 'reserved-before-002.json'
        originalFourReports = $reports.ToArray()
        allOriginalReportBytesAndHashesMatch = $true
        threeRecoveredOwnedFilesAbsentFromReservedRoot = $true
        finalGitHeadBranchStatusDiffProof = 'reserved-restoration-005.json'
        laterWriterScope = 'All later artifact writes use checked absolute evidence-root paths; no later Git/checkout modification or product execution.'
        wholePreparationNoWriteCompliance = $false
    })

    $priorTerminal = Read-Json 'terminal-observation-002.json'
    $rootRecords = [System.Collections.Generic.List[object]]::new()
    foreach ($record in $priorTerminal['sourceRoots'])
    {
        $rootRecords.Add([pscustomobject]@{
            Kind = $record['classification']
            Receipt = $record['receipt']
            ProcessId = [int]$record['pid']
            Lower = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$record['lower']).UtcDateTime
            Upper = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$record['upper']).UtcDateTime
        })
    }
    $rootRecords.Add([pscustomobject]@{
        Kind = 'Second sealing Node helper, awaited exit 0'
        Receipt = 'execution-seal-002.json / launcher-seal-002.json'
        ProcessId = [int]$secondExecution['pid']
        Lower = ([DateTime]$secondExecution['startedUtc']).ToUniversalTime().AddSeconds(-2)
        Upper = ([DateTime]$secondLauncher['completedUtc']).ToUniversalTime().AddSeconds(2)
    })
    $rootRecords.Add([pscustomobject]@{
        Kind = 'Second outer PowerShell sealer, tool-reported exit 1'
        Receipt = 'seal-outer-failure-002.json / tool f205-seal-002 completed exit 1'
        ProcessId = [int]$secondExecution['parentPid']
        Lower = ([DateTime]$secondLauncher['startedUtc']).ToUniversalTime().AddSeconds(-15)
        Upper = ([DateTime]$secondOuterFailure['atUtc']).ToUniversalTime().AddSeconds(5)
    })
    $snapshotReceipt = Read-Json 'receipts-seal-002\process-identities.json'
    $rootRecords.Add([pscustomobject]@{
        Kind = 'Second seal process-identity PowerShell child, awaited exit 0 and EOF'
        Receipt = 'receipts-seal-002\process-identities.json'
        ProcessId = [int]$snapshotReceipt['pid']
        Lower = ([DateTime]$snapshotReceipt['startedUtc']).ToUniversalTime().AddSeconds(-2)
        Upper = ([DateTime]$snapshotReceipt['completedUtc']).ToUniversalTime().AddSeconds(2)
    })
    $snapshotAt = [DateTime]::UtcNow
    $processes = @(Get-CimInstance -ClassName Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate)
    $live = [System.Collections.Generic.Dictionary[int, object]]::new()
    $observations = [System.Collections.Generic.List[object]]::new()
    foreach ($record in $rootRecords)
    {
        $matches = @($processes | Where-Object {
            [int]$_.ProcessId -eq $record.ProcessId -and $_.CreationDate -and
            $_.CreationDate.ToUniversalTime() -ge $record.Lower -and $_.CreationDate.ToUniversalTime() -le $record.Upper
        })
        $observations.Add([ordered]@{
            kind = $record.Kind
            receipt = $record.Receipt
            pid = $record.ProcessId
            identityWindowStartUtc = $record.Lower.ToString('o')
            identityWindowEndUtc = $record.Upper.ToString('o')
            matchingLiveIdentityObserved = $matches.Count -gt 0
        })
        foreach ($process in $matches)
        {
            $live[[int]$process.ProcessId] = $process
        }
        foreach ($process in $processes)
        {
            if ([int]$process.ParentProcessId -eq $record.ProcessId -and $process.CreationDate -and
                $process.CreationDate.ToUniversalTime() -ge $record.Lower -and
                $process.CreationDate.ToUniversalTime() -le $record.Upper -and [int]$process.ProcessId -ne $PID)
            {
                $live[[int]$process.ProcessId] = $process
            }
        }
    }
    do
    {
        $added = $false
        foreach ($process in $processes)
        {
            if (-not $live.ContainsKey([int]$process.ProcessId) -and $live.ContainsKey([int]$process.ParentProcessId) -and
                $process.CreationDate -and $process.CreationDate -ge $live[[int]$process.ParentProcessId].CreationDate -and
                [int]$process.ProcessId -ne $PID)
            {
                $live[[int]$process.ProcessId] = $process
                $added = $true
            }
        }
    }
    while ($added)
    Write-NewJson -Name 'terminal-observation-003.json' -Value ([ordered]@{
        observedUtc = $snapshotAt.ToString('o')
        priorRecordedRootIdentities = $rootRecords.Count
        sourceRoots = $observations.ToArray()
        matchingLiveOwnedRootsOrObservedDescendants = @($live.Values)
        nativeProductStarts = 0
        serviceStarts = 0
        backgroundWork = @()
        currentMechanicalWriterPid = $PID
        currentWriterBoundary = 'This synchronous artifact writer launches no child and returns after full verification; final response must follow tool-reported terminal success.'
        limitations = @('No universal unobserved short-lived process-closure claim.', 'No unrelated-process absence, machine-dedication or continuing-quiescence claim.')
    })
    if ($live.Count -ne 0)
    {
        throw 'A recorded prior root or actually observed descendant survives.'
    }

    $validation = Read-Json 'validation-and-limitations-002.json'
    $validation['supersedesForFinalHandoff'] = 'validation-and-limitations-002.json remains preserved'
    $validation['failuresAndRecovery'] = @($validation['failuresAndRecovery']) + @([ordered]@{
        kind = 'Outer JSON readback parser limitation'
        nativeProductFailure = $false
        receipt = 'seal-outer-failure-002.json'
        toolReportedExitCode = 1
        detail = 'The second inner sealer completed successfully, including source bytes and a zero-live-root observation, but the outer default ConvertFrom-Json rejected distinct valid JSON environment keys SYSTEMROOT/SystemRoot.'
        recovery = 'A new immutable outer writer uses ConvertFrom-Json -AsHashtable to preserve case-sensitive JSON keys. It does not edit or replay either executed sealer. The second HANDOFF bytes are preserved under HANDOFF.attempt-002.json before the final metadata is written.'
        additionalReservedWrites = $false
    })
    $validation['terminalObservation'] = 'terminal-observation-003.json'
    Write-NewJson -Name 'validation-and-limitations-003.json' -Value $validation

    Move-Item -LiteralPath (Join-Path $PSScriptRoot 'HANDOFF.json') -Destination (Join-Path $PSScriptRoot 'HANDOFF.attempt-002.json')
    if ((Get-Metadata 'HANDOFF.attempt-002.json')['sha256'] -ne $completed['handoff']['sha256'])
    {
        throw 'Preserved second-attempt handoff bytes differ.'
    }
    $handoff['preparedAtUtc'] = [DateTime]::UtcNow.ToString('o')
    $handoff['evidence']['validationAllFailuresLimitations'] = Get-Metadata 'validation-and-limitations-003.json'
    $handoff['terminalState']['observation'] = Get-Metadata 'terminal-observation-003.json'
    $handoff['terminalState']['recordedPriorRootIdentities'] = $rootRecords.Count
    $handoff['terminalState']['mechanicalSealingBoundary'] = 'This final synchronous outer writer launches no child. All recorded prior roots and observed descendants are terminal; final response follows complete artifact/JSON verification and tool-reported terminal success.'
    $handoff['reservedCheckoutIncident']['finalOriginalReportRecheck'] = Get-Metadata 'reserved-report-recheck-007.json'
    $handoff['sealingRecovery'] = [ordered]@{
        preservedSecondHandoff = Get-Metadata 'HANDOFF.attempt-002.json'
        innerSecondSealerExitCode = 0
        outerSecondSealerToolExitCode = 1
        outerSecondFailure = Get-Metadata 'seal-outer-failure-002.json'
        finalParser = 'ConvertFrom-Json -AsHashtable; all distinct valid case-sensitive JSON keys retained'
        executedHelpersEditedOrReplayed = $false
    }
    $handoff['artifactIntegrity'] = [ordered]@{
        fullArtifactByteSha256Index = 'ARTIFACT-INDEX-003.json'
        finalSeal = 'SEAL-003.json'
        initialReadback = 'json-readback-003.json'
        postHandoffReadback = 'json-readback-005.json'
        selfReferenceRule = 'The full index excludes only itself and SEAL. SEAL records exact HANDOFF/index bytes and SHA256; final tool output supplies envelope digests. Both envelopes and all generated JSON are re-read before terminal success.'
    }
    Write-NewJson -Name 'HANDOFF.json' -Value $handoff
    $null = Read-Json 'HANDOFF.json'

    $readback = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force | Sort-Object FullName)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -AsHashtable
        $readback.Add((Get-Metadata ([System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName))))
    }
    Write-NewJson -Name 'json-readback-005.json' -Value ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        operation = 'Re-read every generated JSON with case-sensitive hashtable parsing, including every preserved failure and final HANDOFF.'
        count = $readback.Count
        files = $readback.ToArray()
        selfReferenceRule = 'This report and both subsequently created envelopes are re-read in final verification.'
    })
    $entries = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Force | Sort-Object FullName)
    {
        $entries.Add((Get-Metadata ([System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName))))
    }
    Write-NewJson -Name 'ARTIFACT-INDEX-003.json' -Value ([ordered]@{
        schemaVersion = 1
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        root = $PSScriptRoot
        count = $entries.Count
        files = $entries.ToArray()
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-003.json', 'SEAL-003.json')
        selfReferenceRule = 'Every retained file is indexed except these two envelopes. SEAL records exact HANDOFF/index bytes and SHA256; final tool output supplies envelope digests.'
    })
    $handoffMetadata = Get-Metadata 'HANDOFF.json'
    $indexMetadata = Get-Metadata 'ARTIFACT-INDEX-003.json'
    Write-NewJson -Name 'SEAL-003.json' -Value ([ordered]@{
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        handoff = $handoffMetadata
        fullArtifactIndex = $indexMetadata
        indexedFiles = $entries.Count
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-003.json', 'SEAL-003.json')
        priorRecordedRootsOrObservedDescendantsStillLive = 0
        nativeProductStarts = 0
        servicesStarted = 0
        performanceExecutions = 0
        finalReservedStateRestored = $true
        wholePreparationNoWriteCompliance = $false
        coordinatorDispositionPending = $true
        finalWriterBoundary = 'The current synchronous writer performs full JSON/index verification, then returns. Final response requires tool-reported terminal success, not a universal unrelated-process closure claim.'
    })

    $jsonCount = 0
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -AsHashtable
        $jsonCount++
    }
    $index = Read-Json 'ARTIFACT-INDEX-003.json'
    foreach ($entry in $index['files'])
    {
        $actual = Get-Metadata $entry['path']
        if ($actual['bytes'] -ne $entry['bytes'] -or $actual['sha256'] -ne $entry['sha256'])
        {
            throw "Final artifact integrity mismatch: $($entry['path'])"
        }
    }
    $retained = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Force)
    if ($retained.Count -ne ($index['count'] + 2))
    {
        throw 'Final file membership differs from the full index plus its two explicit envelopes.'
    }
    $seal = Read-Json 'SEAL-003.json'
    if ((Get-Metadata 'HANDOFF.json')['sha256'] -ne $seal['handoff']['sha256'] -or
        (Get-Metadata 'ARTIFACT-INDEX-003.json')['sha256'] -ne $seal['fullArtifactIndex']['sha256'])
    {
        throw 'Final envelope digest mismatch.'
    }
    [ordered]@{
        root = $PSScriptRoot
        handoffSha256 = $handoffMetadata['sha256']
        artifactIndexSha256 = $indexMetadata['sha256']
        sealSha256 = (Get-Metadata 'SEAL-003.json')['sha256']
        indexedFiles = $entries.Count
        totalRetainedFiles = $retained.Count
        generatedJsonReRead = $jsonCount
        readOnlyGitGithubReceipts = 48
        rawSourceCopiesPreviouslyVerified = 104
        priorRecordedRootIdentities = $rootRecords.Count
        matchingLivePriorRootsOrObservedDescendants = 0
        nativeProductStarts = 0
        finalReservedStateRestored = $true
        originalFourReportsPreserved = $true
        wholePreparationNoWriteCompliance = $false
        outcome = 'SOURCE_ONLY_NO_CANDIDATE'
        publicationOrCampaignFinalization = $false
    } | ConvertTo-Json -Depth 5
}
catch
{
    $path = Join-Path $PSScriptRoot 'seal-outer-failure-003.json'
    if (-not (Test-Path -LiteralPath $path))
    {
        Write-NewJson -Name 'seal-outer-failure-003.json' -Value ([ordered]@{
            atUtc = [DateTime]::UtcNow.ToString('o')
            message = $_.Exception.Message
            nativeProductStarts = 0
            sealedCompletionNotClaimed = $true
        })
    }
    throw
}
