. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$before = Get-Content -LiteralPath 'reserved-root\before.json' -Raw | ConvertFrom-Json
$after = Save-F217RootSnapshot 'after'
$beforeByPath = @{}
foreach ($entry in $before.entries) {
    $beforeByPath["$($entry.membership):$($entry.path)"] = $entry
}
$differences = @()
foreach ($entry in $after.entries) {
    $key = "$($entry.membership):$($entry.path)"
    if (-not $beforeByPath.ContainsKey($key)) {
        $differences += @{ path = $entry.path; difference = 'new-membership' }
        continue
    }
    $old = $beforeByPath[$key]
    if ($old.kind -ne $entry.kind -or $old.length -ne $entry.length -or $old.sha256 -ne $entry.sha256) {
        $differences += @{ path = $entry.path; difference = 'entry-bytes-or-kind'; before = $old; after = $entry }
    }
    $beforeByPath.Remove($key)
}
foreach ($entry in $beforeByPath.Values) {
    $differences += @{ path = $entry.path; difference = 'removed-membership' }
}
$identityProperties = @('head','branch','indexSha256','statusSha256','trackedMembershipSha256','untrackedMembershipSha256','fileCount')
foreach ($property in $identityProperties) {
    if ($before.$property -ne $after.$property) {
        $differences += @{ property = $property; before = $before.$property; after = $after.$property }
    }
}
Write-EvidenceJson 'reserved-root\preservation.json' @{
    passed = $differences.Count -eq 0
    initial = 'reserved-root\before.json'
    terminal = 'reserved-root\after.json'
    trackedAndUntrackedEntries = $after.fileCount
    regularFileCount = @($after.entries | Where-Object kind -eq 'file').Count
    directoryOrSubmoduleCount = @($after.entries | Where-Object kind -eq 'directory-or-submodule').Count
    absentEntryCount = @($after.entries | Where-Object kind -eq 'absent').Count
    untrackedFiles = @($after.entries | Where-Object membership -eq 'untracked' | ForEach-Object { $_.path })
    differences = $differences
    boundary = $after.boundary
}
if ($differences.Count -ne 0) {
    throw 'Reserved-root preservation check failed; no repair or source mutation authorized'
}

$terminals = @()
$identities = @()
$nonzero = @()
$expectedScope = (Get-Content -LiteralPath 'owner-registration-237.json' -Raw | ConvertFrom-Json).scope
foreach ($directory in Get-ChildItem -LiteralPath 'native' -Directory | Sort-Object Name) {
    $relative = "native\$($directory.Name)"
    $terminal = Get-Content -LiteralPath (Join-Path $directory.FullName 'terminal.json') -Raw | ConvertFrom-Json
    $invocation = Get-Content -LiteralPath (Join-Path $directory.FullName 'invocation.json') -Raw | ConvertFrom-Json
    $admission = Get-Content -LiteralPath (Join-Path $PSScriptRoot "guards\$($directory.Name)\admission.json") -Raw | ConvertFrom-Json
    $policy = Get-Content -LiteralPath (Join-Path $PSScriptRoot "guards\$($directory.Name)\policy.json") -Raw | ConvertFrom-Json
    if (-not $terminal.rootExited -or -not $terminal.waitForExitCompleted -or -not $terminal.stdoutCompleted -or -not $terminal.stderrCompleted -or $terminal.failure) {
        throw "Native root/stream incomplete: $($directory.Name)"
    }
    if (-not $admission.allowed -or $admission.owner -ne $script:OwnerId -or $admission.scope -ne $expectedScope -or
        $admission.benchmarkLeasePresent -or $admission.actualWorkerBuildHoldActive -ne $false -or
        $admission.buildAndTestWorkQuiesced -ne $false -or $policy.independentFindingPreparationWorkers.F217 -ne $script:OwnerId -or
        $policy.activeWorkerPreparationScopes.F217 -ne $expectedScope -or $policy.actualWorkerBuildHoldActive -ne $false) {
        throw "Admission provenance failed: $($directory.Name)"
    }
    if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot "guards\$($directory.Name)\policy.json") -Algorithm SHA256).Hash -ne $admission.policySha256) {
        throw "Admission policy hash mismatch: $($directory.Name)"
    }
    $identities += @{
        kind = 'native-root'
        label = $terminal.label
        processId = [int]$terminal.rootPid
        creationUtc = [DateTime]::Parse($terminal.rootStartUtc).ToUniversalTime()
    }
    foreach ($child in $terminal.observedChildren) {
        $identities += @{
            kind = 'observed-child'
            label = $terminal.label
            processId = [int]$child.ProcessId
            creationUtc = ([DateTime]$child.CreationDate).ToUniversalTime()
        }
    }
    foreach ($child in $terminal.postExitObservedChildren) {
        if (-not $child.exited -and -not $child.exitedAtObservation) {
            throw "Observed child lacks terminal receipt: $($terminal.label)"
        }
    }
    if ($terminal.exitCode -ne 0) {
        $nonzero += @{
            label = $terminal.label
            exitCode = $terminal.exitCode
            invocation = "$relative\invocation.json"
            stdout = "$relative\stdout.bin"
            stderr = "$relative\stderr.bin"
            terminal = "$relative\terminal.json"
            stderrAsText = [System.IO.File]::ReadAllText((Join-Path $directory.FullName 'stderr.bin'))
            stdoutAsText = [System.IO.File]::ReadAllText((Join-Path $directory.FullName 'stdout.bin'))
        }
    }
    $terminals += @{
        label = $terminal.label
        executable = $invocation.executable
        argv = $invocation.argv
        rootPid = $terminal.rootPid
        rootStartUtc = $terminal.rootStartUtc
        rootExited = $terminal.rootExited
        waitForExitCompleted = $terminal.waitForExitCompleted
        stdoutCompleted = $terminal.stdoutCompleted
        stderrCompleted = $terminal.stderrCompleted
        exitCode = $terminal.exitCode
        observedChildren = $terminal.observedChildren
        postExitObservedChildren = $terminal.postExitObservedChildren
        invocation = "$relative\invocation.json"
        terminal = "$relative\terminal.json"
        policyReceipt = "guards\$($directory.Name)\admission.json"
    }
}
$filter = (@($identities.processId | Sort-Object -Unique | ForEach-Object { "ProcessId=$_" })) -join ' OR '
$now = [DateTime]::UtcNow.ToString('o')
$actual = @(Get-CimInstance Win32_Process -Filter $filter | Select-Object ProcessId,CreationDate)
$stillOwned = @()
$reusedPids = @()
foreach ($process in $actual) {
    $known = @($identities | Where-Object { $_.processId -eq $process.ProcessId })
    $matches = @($known | Where-Object { [Math]::Abs(($_.creationUtc - $process.CreationDate.ToUniversalTime()).Ticks) -le [TimeSpan]::TicksPerMillisecond })
    if ($matches.Count -gt 0) {
        $owned = [System.Diagnostics.Process]::GetProcessById([int]$process.ProcessId)
        $owned.WaitForExit()
        $stillOwned += @{ processId = $process.ProcessId; waited = $true; exited = $owned.HasExited; matches = $matches }
        $owned.Dispose()
    } else {
        $reusedPids += @{ processId = $process.ProcessId; creationUtc = $process.CreationDate.ToUniversalTime().ToString('o'); action = 'not-owned; not waited or stopped' }
    }
}
Write-EvidenceJson 'native-terminal-summary.json' @{
    observedUtc = $now
    nativeRoots = $terminals.Count
    observedChildIdentities = @($identities | Where-Object kind -eq 'observed-child').Count
    allRootsWaitsAndBothStreamsTerminal = $true
    allRecordedObservedChildrenTerminal = $true
    finalIdentityCheck = @{
        scope = 'Only actual recorded root/observed-child PIDs and creation times; no unrelated process inventory or stop.'
        trackedIdentities = $identities.Count
        currentPidMatches = $actual
        stillOwnedAtPointObservation = $stillOwned
        unrelatedPidReuse = $reusedPids
        universalDescendantAbsenceClaim = $false
    }
    nonzeroNativeCount = $nonzero.Count
    nonzeroNativeResults = $nonzero
    roots = $terminals
    buildRoots = @()
    testRoots = @()
    dotnetRoots = @()
    outstandingOwnedWork = @()
}
Write-EvidenceJson 'failures\index.json' @{
    sourceValidationFailure = 'failures\source-provenance-001.json'
    outerHelperFailures = @(
        @{ helper = '02-pinned-discovery.ps1'; shellId = 'F217-237-discovery'; exitCode = 1 },
        @{ helper = '04-consumer-and-docs.ps1'; shellId = 'F217-237-consumer-docs'; exitCode = 1 },
        @{ helper = '06-qualified-documentation.ps1'; shellId = 'F217-237-qualified-docs'; exitCode = 1 }
    )
    nonzeroNativeResults = $nonzero
    otherObservations = @('tool-observations.json','tool-observations-continued.json')
    parentFailureNotOwnedHere = 'owner-registration-237.json contains coordinator malformed-comma preflight failure and repair before GO237.'
    failedHelpersEditedOrReplayed = $false
}
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'candidate.diff'), [byte[]]::new(0))

$sourceMembers = @()
foreach ($index in @('raw-discovery\Original.json','raw-discovery\Default.json','raw-discovery\supplement.json')) {
    $document = Get-Content -LiteralPath $index -Raw | ConvertFrom-Json
    foreach ($member in $document.sourceMembers) {
        $path = Join-Path $PSScriptRoot $member.evidencePath
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $header = $script:Utf8.GetBytes("blob $($bytes.Length)`0")
        $blob = [byte[]]::new($header.Length + $bytes.Length)
        [Buffer]::BlockCopy($header, 0, $blob, 0, $header.Length)
        [Buffer]::BlockCopy($bytes, 0, $blob, $header.Length, $bytes.Length)
        $actualBlob = [Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($blob)).ToLowerInvariant()
        $sha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes))
        if ($actualBlob -ne $member.gitBlob -or $actualBlob -ne $member.actualGitBlob -or $sha256 -ne $member.sha256 -or $bytes.Length -ne $member.length) {
            throw "Raw pinned source failed final requalification: $($member.evidencePath)"
        }
        $sourceMembers += $member
    }
}
Write-EvidenceJson 'raw-discovery\verified-members.json' @{
    sourceCount = $sourceMembers.Count
    roleCounts = @($sourceMembers | Group-Object role | Select-Object Name,Count)
    allGitBlobAndSha256AndLengthChecksPassed = $true
    sources = $sourceMembers
}

$queries = @()
foreach ($role in @('original','default')) {
    foreach ($suffix in @('exact-names','endpoint-collection-leads','framework-properties','endpoint-history','framework-history')) {
        $label = "$role-$suffix"
        $invocation = Get-Content -LiteralPath "native\$label\invocation.json" -Raw | ConvertFrom-Json
        $text = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot "native\$label\stdout.bin"))
        $queries += @{
            role = $role
            label = $label
            argv = $invocation.argv
            stdout = "native\$label\stdout.bin"
            lineCount = $text.Split("`n", [System.StringSplitOptions]::RemoveEmptyEntries).Count
            sha256 = (Get-FileHash -LiteralPath "native\$label\stdout.bin" -Algorithm SHA256).Hash
        }
    }
}
Write-EvidenceJson 'query-index.json' @{
    queries = $queries
    evidenceScope = 'Pinned lexical leads and finite history, not complete resolved relationships or absence proof.'
    priorApplicableLsp = @('tool-observations.json','tool-observations-continued.json')
}
Write-EvidenceJson 'acceptance-evaluation.json' @{
    disposition = 'source-only-no-material-candidate'
    qualified = @(
        'Relevant local guidance read/retained; no narrower ancestor area AGENTS found.',
        'Exact equality/hash/field semantics and normal/source-only target-framework selection qualified from whole raw pinned sources.',
        'Applicable local LSP attempted before pinned lexical fallback; unresolved/broad/editor-context boundaries retained.',
        'Upstream default main independently frozen by read-only gh; all84 selected role-source files rehashed and git-blob validated.',
        'Real producers/value shapes, owner storage, generic dictionary lead and bounded history/documentation reviewed.',
        'No material owning named-pipe endpoint hash workload established; no candidate/build/test/performance authorization exercised.',
        'Reserved tracked/nonignored-untracked byte manifests, HEAD, branch, status/memberships and index match.',
        'All owned native roots, recorded children and stdout/stderr terminal, nonzero exits retained.',
        'No subagents, graph creation, shared/policy/lease/ledger writes, source/root edits, API/default changes, commits/push/PR or publication.'
    )
    intentionallyNotClaimed = @('runtime verification','performance gain or measured no gain','universal consumer absence','universal immateriality','complete external or untyped call graph')
    testsRun = @()
    rowsRun = @()
    coordinatorAcceptance = 'pending'
}
Write-Output ("Terminal preparation complete: preserved entries={0}; raw pinned sources={1}; native roots={2}; nonzero native exits={3}" -f $after.fileCount, $sourceMembers.Count, $terminals.Count, $nonzero.Count)
