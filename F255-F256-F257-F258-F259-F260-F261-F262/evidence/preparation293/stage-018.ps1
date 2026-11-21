$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$pins = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-role-pins-007.json')) | ConvertFrom-Json
$stdin = [Text.Encoding]::ASCII.GetBytes($pins.Original + "`n" + $pins.ObservedDefault + "`n")
$raw = Invoke-SourceRoot 'r016-raw-role-commit-metadata' 'git' @('--no-pager','cat-file','--batch') $stdin
$offset = 0
$commitIndex = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $headerStart = $offset
    while ($offset -lt $raw.Length -and $raw[$offset] -ne 10) { $offset++ }
    if ($offset -ge $raw.Length) { throw 'Truncated raw commit header' }
    $header = [Text.Encoding]::ASCII.GetString($raw,$headerStart,$offset-$headerStart)
    if ($header -notmatch '^(?<oid>[0-9a-f]{40}) commit (?<size>[0-9]+)$') { throw 'Unexpected raw commit metadata type/header' }
    $commitId = $Matches.oid
    $length = [int]$Matches.size
    $offset++
    $bodyStart = $offset
    if ($offset + $length -ge $raw.Length) { throw 'Truncated whole commit object' }
    $body = [byte[]]::new($length)
    [Array]::Copy($raw,$offset,$body,0,$length)
    $offset += $length
    if ($raw[$offset] -ne 10) { throw 'Missing raw commit trailing framing LF' }
    $offset++
    $prefix = [Text.Encoding]::ASCII.GetBytes('commit ' + $length + [char]0)
    $hashInput = [byte[]]::new($prefix.Length + $length)
    [Array]::Copy($prefix,0,$hashInput,0,$prefix.Length)
    [Array]::Copy($body,0,$hashInput,$prefix.Length,$length)
    $computed = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($hashInput)).ToLowerInvariant()
    if ($commitId -cne $pins.$role -or $computed -cne $commitId) { throw 'Role commit object ID mismatch' }
    $text = [Text.Encoding]::UTF8.GetString($body)
    if ($text -notmatch '^tree ([0-9a-f]{40})\n') { throw 'Raw commit tree identity missing' }
    $tree = $Matches[1]
    if ($role -ceq 'ObservedDefault' -and $tree -cne $pins.defaultTree) { throw 'Fresh upstream/default raw commit tree mismatch' }
    $relative = 'commit-metadata\' + $role + '.commit.raw'
    Save-NewBytes $relative $body
    $commitIndex += [ordered]@{ role = $role; commit = $commitId; computedGitCommit = $computed; tree = $tree; bytes = $length; sha256 = (Get-BytesSha256 $body); bodyFile = $relative; root = 'r016-raw-role-commit-metadata'; headerStartOffset = $headerStart; headerAscii = $header; bodyStartOffset = $bodyStart; trailingFramingLfOffset = $offset-1; commitIsMetadataNotAnotherProductBody = $true }
}
if ($offset -ne $raw.Length) { throw 'Unconsumed whole commit batch suffix' }
Save-NewJson 'commit-metadata-index-018.json' $commitIndex
$afterHead = Invoke-SourceRoot 'r017-reserved-head-after' 'git' @('--no-pager','rev-parse','HEAD')
$afterStatus = Invoke-SourceRoot 'r018-reserved-tracked-status-after' 'git' @('--no-pager','status','--porcelain=v1','-z','--untracked-files=no')
$headText = [Text.Encoding]::ASCII.GetString($afterHead).Trim()
if ($headText -cne '24875ef5dabb55567870b39f6eb0002170435e2f') { throw 'Reserved HEAD changed during source-only observation' }
$beforeStatus = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'r003-reserved-tracked-status-before.stdout.bin'))
if ((Get-BytesSha256 $beforeStatus) -cne (Get-BytesSha256 $afterStatus)) { throw 'Reserved tracked status changed during observation' }
$externalControls = @(
    (Join-Path $script:ParallelBase 'campaign-progress-288.json')
    (Join-Path $script:ParallelBase 'Refresh-Progress-288.mjs')
    (Join-Path $script:SessionBase 'autoperf-benchmarks.ps1')
    (Join-Path $script:SessionBase 'F145-compare-008.mjs')
)
$controlIndex = @()
foreach ($file in $externalControls)
{
    $bytes = [IO.File]::ReadAllBytes($file)
    $relative = 'governance-read-inputs\' + [IO.Path]::GetFileName($file) + '.raw'
    Save-NewBytes $relative $bytes
    $controlIndex += [ordered]@{ source = $file; captured = $relative; bytes = $bytes.Length; sha256 = (Get-BytesSha256 $bytes); role = 'Session governance/path-discovery input, not a repository product/source/doc role'; notUsedForPerformanceDecision = $true; lateByteSnapshotDoesNotProveEarlierViewTransportBytes = $true }
}
Save-NewJson 'governance-read-inputs-index-018.json' $controlIndex
$spoolFiles = @(
    [ordered]@{ source = 'C:\Users\jaslawin\AppData\Local\Temp\copilot-tool-output-1795237475471-109.txt'; name = 'initial-glob-lease-timeout-spool.raw.txt' }
    [ordered]@{ source = 'C:\Users\jaslawin\AppData\Local\Temp\1795237783290-copilot-tool-output-2356-1b7b1fc2-cabb-4dce-88d8-061dbd843c4b.txt'; name = 'stage-011-rendered-output-spool.raw.txt' }
)
$spoolIndex = @()
foreach ($entry in $spoolFiles)
{
    $exists = [IO.File]::Exists($entry.source)
    $saved = $null
    $length = $null
    $sha = $null
    if ($exists)
    {
        $bytes = [IO.File]::ReadAllBytes($entry.source)
        $saved = 'tool-transport-observations\' + $entry.name
        Save-NewBytes $saved $bytes
        $length = $bytes.Length
        $sha = Get-BytesSha256 $bytes
    }
    $spoolIndex += [ordered]@{ source = $entry.source; existedAtRead = $exists; captured = $saved; bytes = $length; sha256 = $sha; createdByToolNotThisTaskHelper = $true; sourceReadOnly = $true; transportNotProductSourceEvidence = $true }
}
Save-NewJson 'tool-spool-observation-index-018.json' $spoolIndex
Save-NewJson 'injected-context-accounting-018.json' ([ordered]@{
    commonInjectedContextsPerRole = 2
    contexts = @(
        [ordered]@{ ordinal = 1; name = 'Common injected repository/CLI instructions and skill-availability context'; chargedTo = @('Original','ObservedDefault'); exactTransportBytesNotAvailable = $true }
        [ordered]@{ ordinal = 2; name = 'Loaded common-anti-pattern-scan skill context'; chargedTo = @('Original','ObservedDefault'); exactTransportBytesNotAvailable = $true; preparationFinalizationTelemetryAndPublicationWorkflowNotRun = $true; reason = 'Explicit bounded source-only task forbids those operations' }
    )
    repositoryWholeInputsPerRole = 15
    inclusiveLogicalInputsPerRole = 17
    noSkillExemptionOrRetroactiveWaiver = $true
    sessionGovernanceInputsReportedSeparatelyNotUsedAsProductEvidence = $true
})
Save-NewJson 'execution-failures-and-observer-limits-018.json' ([ordered]@{
    metadataDiscoveryFailures = @(
        [ordered]@{ tool = 'glob'; pattern = '*policy*'; outcome = '20-second timeout, recursive PAR metadata filenames returned; no listed file body used as source evidence' }
        [ordered]@{ tool = 'glob'; pattern = '*lease*'; outcome = '20-second timeout, 45339-byte tool spool preserved if still present' }
        [ordered]@{ tool = 'glob'; pattern = '*ledger*'; outcome = '20-second timeout, no useful result; no source body consumed' }
    )
    dataHelperFailures = @(
        [ordered]@{ helper = 'stage-007.ps1 / capture-library-006.ps1'; outerToolShellId = '4730'; actualOuterToolExit = 1; root = 'r002-reserved-repository-identity'; rootExit = 0; reason = 'Initial strict observer could not retain two already-disappeared child processes; actual child exits remain unknown'; replayed = $false; originalHelpersAndNativeStreamsUnchanged = $true }
        [ordered]@{ helper = 'Attempted author-continuation-008 command'; outerToolShellId = '4731'; actualOuterToolExit = 1; scriptCreated = $false; GitGhRootsStarted = 0; reason = 'Nested same-delimiter here-string caused outer PowerShell parser error before script creation or execution'; consoleAsDisplayed = \"ParserError: Missing closing '}' in statement block or type definition.\"; originalExactToolTransportBytesUnavailable = $true }
    )
    initialConsoleSummaryLimit = 'capture-library-006 selected dictionary values through Select-Object and printed null fields. Actual saved root receipts/raw streams are authoritative; new helper009 prints explicit dictionary values.'
    wholeBodyConsoleSummaryLimit = 'capture-bodies-012/015 Group-Object over ordered dictionaries printed blank per-role grouping. Selected/indexed body roles and ordinals are intact; exact role counts verified from parsed whole capture indexes, not that summary.'
    outerToolTransportLimit = 'Tool-transcript strings are not claimed to be byte-for-byte native stdout. Initial PowerShell helper result JSON files and later wrapper raw streams are retained. The final enclosing tool exit must be appended by parent after return.'
    observationBoundary = 'Retained Git/gh roots and complete native streams are observed; sampled direct children only. Older r002 child exit unknown is preserved. New missing child handles can have only later PID-absence evidence, not recovered creation/exit identity. No universal descendant closure or shared-host idleness claim.'
    temporarySpoolLimit = 'Two known tool-created output spools were only read and retained under this finding. This task did not create, edit, or remove files in the tool spool directory.'
})
$result = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); directGitGhRootsConsumed = 18; sourceBodyBudgetClosed = $true; reservedHead = $headText; beforeTrackedStatusBytes = $beforeStatus.Length; afterTrackedStatusBytes = $afterStatus.Length; trackedStatusByteEqual = $true; noCheckoutOrRepositoryWrites = $true; rawCommitObjects = $commitIndex; externalGovernanceReadSnapshots = $controlIndex.Count; knownToolSpools = $spoolIndex; actualEnclosingHelperExitNotSelfAttested = $true }
Save-NewJson 'readonly-and-provenance-018.json' $result
[Console]::WriteLine(($result | ConvertTo-Json -Depth 15))
