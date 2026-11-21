$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$null = Assert-Current293Guard 'continuation-019-entry'
$pins = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-role-pins-007.json')) | ConvertFrom-Json
$index = @()
foreach ($file in [IO.Directory]::EnumerateFiles($PSScriptRoot,'capture-index-*.json'))
{
    $index += @([IO.File]::ReadAllText($file) | ConvertFrom-Json -Depth 40)
}
$treeRows = @{}
foreach ($binding in @(
    [ordered]@{ role = 'Original'; root = 'r004-original-tree-metadata' }
    [ordered]@{ role = 'ObservedDefault'; root = 'r005-default-tree-metadata' }
    [ordered]@{ role = 'Original'; root = 'r008-original-guidance-doc-metadata' }
    [ordered]@{ role = 'ObservedDefault'; root = 'r009-default-guidance-doc-metadata' }
))
{
    $raw = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot ($binding.root + '.stdout.bin')))
    foreach ($record in [Text.Encoding]::UTF8.GetString($raw).Split([char]0))
    {
        if ($record.Length -eq 0) { continue }
        if ($record -notmatch '(?s)^(?<mode>[0-7]{6}) (?<type>\S+) (?<oid>[0-9a-f]{40})\t(?<path>.+)$') { throw 'Raw native tree stream could not be independently parsed' }
        $key = $binding.role + ':' + $Matches.path
        if ($treeRows.ContainsKey($key)) { throw 'Duplicated role/path in native tree streams' }
        $treeRows[$key] = [ordered]@{ mode = $Matches.mode; type = $Matches.type; blob = $Matches.oid; provenanceRoot = $binding.root }
    }
}
$auditMembers = @()
foreach ($member in $index)
{
    $body = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $member.bodyFile))
    $stdout = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $member.stdoutFile))
    $headerLength = [int]$member.headerBytesIncludingLF - 1
    $header = [Text.Encoding]::ASCII.GetString($stdout,[int]$member.headerStartOffset,$headerLength)
    if ($header -cne ($member.blob + ' blob ' + $member.bytes)) { throw 'Independent native batch header mismatch' }
    if ($stdout[[int]$member.bodyStartOffset-1] -ne 10 -or $stdout[[int]$member.trailingFramingLfOffset] -ne 10) { throw 'Independent batch LF framing mismatch' }
    if ($body.Length -ne $member.bytes -or (Get-BytesSha256 $body) -cne $member.sha256) { throw 'Whole body changed after original capture' }
    $streamBody = [byte[]]::new($body.Length)
    [Array]::Copy($stdout,[int]$member.bodyStartOffset,$streamBody,0,$body.Length)
    if ((Get-BytesSha256 $streamBody) -cne $member.sha256) { throw 'Extracted body does not equal full native stream payload' }
    $prefix = [Text.Encoding]::ASCII.GetBytes('blob ' + $body.Length + [char]0)
    $gitBytes = [byte[]]::new($prefix.Length + $body.Length)
    [Array]::Copy($prefix,0,$gitBytes,0,$prefix.Length)
    [Array]::Copy($body,0,$gitBytes,$prefix.Length,$body.Length)
    $computedBlob = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitBytes)).ToLowerInvariant()
    $treeKey = $member.role + ':' + $member.path
    if (-not $treeRows.ContainsKey($treeKey)) { throw 'No raw native tree provenance for selected member' }
    $tree = $treeRows[$treeKey]
    if ($tree.blob -cne $member.blob -or $tree.mode -cne $member.mode -or $computedBlob -cne $member.blob) { throw 'Raw tree/mode/header/body Git identity mismatch' }
    if ($member.commit -cne $pins.($member.role) -or $member.commitPath -cne ($member.commit + ':' + $member.path)) { throw 'Immutable source role/spec mismatch' }
    $auditMembers += [ordered]@{ role = $member.role; ordinal = $member.inputOrdinal; commitPath = $member.commitPath; mode = $member.mode; blob = $member.blob; bytes = $body.Length; sha256 = $member.sha256; sourceFile = $member.bodyFile; nativeTreeRoot = $tree.provenanceRoot; nativeBodyRoot = $member.catFileRoot; headerAndFramingAndFullPayloadVerified = $true }
}
$perRole = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $members = @($index | Where-Object { $_.role -ceq $role } | Sort-Object inputOrdinal)
    if ($members.Count -ne 15 -or (($members.inputOrdinal -join ',') -cne ((1..15) -join ','))) { throw 'Exact whole-input count/ordinal sequence mismatch' }
    if (@($members.path | Select-Object -Unique).Count -ne 15) { throw 'Duplicate whole source input charged ambiguously' }
    $perRole += [ordered]@{ role = $role; commit = $pins.$role; completeWholeRepositoryInputs = 15; guidanceDocumentationInputs = 6; sourceTestDataConfigurationInputs = 9; commonInjectedContexts = 2; inclusiveLogicalInputs = 17; sourceBytes = ($members.bytes | Measure-Object -Sum).Sum; sourceBodyBudgetClosed = $true }
}
Save-NewJson 'source-input-inventory-019.json' $auditMembers
$rootAudit = @()
foreach ($startFile in [IO.Directory]::EnumerateFiles($PSScriptRoot,'*.start.json'))
{
    $start = [IO.File]::ReadAllText($startFile) | ConvertFrom-Json -Depth 50
    $receiptName = $start.label + '.receipt.json'
    $receipt = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $receiptName)) | ConvertFrom-Json -Depth 100
    foreach ($stream in @('stdout','stderr','stdin'))
    {
        $raw = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot ($start.label + '.' + $stream + '.bin')))
        $declaredLength = if ($stream -ceq 'stdin') { $start.stdinBytes } else { $receipt.($stream + 'Bytes') }
        $declaredSha = if ($stream -ceq 'stdin') { $start.stdinSha256 } else { $receipt.($stream + 'Sha256') }
        if ($raw.Length -ne $declaredLength -or (Get-BytesSha256 $raw) -cne $declaredSha) { throw 'Native stream bytes changed after custody receipt' }
    }
    if (-not $receipt.started -or -not $receipt.rootTerminalObserved -or $receipt.rootExitCode -ne 0 -or -not $receipt.stdoutCompleteObserved -or -not $receipt.stderrCompleteObserved) { throw 'Native root/stream completion not established' }
    $rootAudit += [ordered]@{ label = $start.label; ordinal = $start.rootOrdinal; executable = $start.executable; arguments = $start.arguments; cwd = $start.cwd; startFile = [IO.Path]::GetFileName($startFile); receiptFile = $receiptName; actualExitCode = $receipt.rootExitCode; rootTerminalAndStreamsObserved = $true; observerFailureInEnclosing007Preserved = ($start.label -ceq 'r002-reserved-repository-identity'); descendantClosureNotClaimed = $true }
}
$rootAudit = @($rootAudit | Sort-Object ordinal)
if ($rootAudit.Count -ne 18 -or $rootAudit.Count -gt 32) { throw 'Direct Git/gh count mismatch or ceiling exceeded' }
Save-NewJson 'direct-root-inventory-019.json' $rootAudit
$headText = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'r017-reserved-head-after.stdout.bin'))).Trim()
$before = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'r003-reserved-tracked-status-before.stdout.bin'))
$after = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'r018-reserved-tracked-status-after.stdout.bin'))
if ($headText -cne '24875ef5dabb55567870b39f6eb0002170435e2f' -or (Get-BytesSha256 $before) -cne (Get-BytesSha256 $after)) { throw 'Readonly repository observations no longer support captured boundary' }
$failures = [ordered]@{
    metadataDiscoveryFailures = @(
        [ordered]@{ tool = 'glob'; pattern = '*policy*'; outcome = '20-second timeout, recursive PAR metadata filenames returned; no listed file body used as source evidence' }
        [ordered]@{ tool = 'glob'; pattern = '*lease*'; outcome = '20-second timeout; tool-created spool retained byte-exact in tool-transport-observations' }
        [ordered]@{ tool = 'glob'; pattern = '*ledger*'; outcome = '20-second timeout, no useful result; no source body consumed' }
    )
    dataHelperFailures = @(
        [ordered]@{ helper = 'stage-007.ps1 / capture-library-006.ps1'; outerToolShellId = '4730'; actualOuterToolExit = 1; root = 'r002-reserved-repository-identity'; rootExit = 0; reason = 'Strict first observer could not retain two already-disappeared child processes; their exit codes remain unknown'; replayed = $false; originalHelpersAndNativeStreamsUnchanged = $true }
        [ordered]@{ helper = 'Attempted author-continuation-008 command'; outerToolShellId = '4731'; actualOuterToolExit = 1; scriptCreated = $false; GitGhRootsStarted = 0; reason = 'Nested same-delimiter here-string caused an outer PowerShell parser error before script creation'; consoleAsDisplayed = 'ParserError: Missing closing closing-brace in statement block or type definition.'; originalExactToolTransportBytesUnavailable = $true }
        [ordered]@{ helper = 'stage-018.ps1'; outerToolShellId = '4739'; actualOuterToolExit = 1; sourceRootsAlreadyCompleted = 18; sourceOrGitGhReplay = $false; failureAfter = 'All three final native roots, commit index, read-only status comparison, governance/spool captures, and injected-context accounting'; reason = 'A backslash-escaped quoted string in a diagnostic data literal was parsed as a nonexistent command. No executable for that name was launched.'; rawHelperStreams = @('stage-018.helper.stdout.bin','stage-018.helper.stderr.bin'); actualChildReceipt = 'stage-018.helper.receipt.json'; oldHelperNotEdited = $true; newContinuationIsDataOnly = $true }
    )
    consoleOnlySummaryLimits = @(
        'Initial library006 Select-Object on ordered dictionaries printed null console fields; saved native receipts/streams contain the real values.'
        'Body-helper Group-Object on ordered dictionaries printed blank console role names; original index entries retain correct roles/ordinals. This audit independently verifies 15 bodies per role from raw tree and full batch streams.'
    )
    outerToolTransportLimit = 'Decoded tool-transcript strings are not asserted to be native stdout bytes. Initial helper result JSON and later complete wrapper streams are preserved. Two known tool-created output spools are retained unchanged; the task did not create or edit those external spool files.'
    observerLimit = 'Retained Git/gh roots and both complete streams were observed. Child observation is sampled/direct only. The original r002 unknown child exits remain unknown. New absent child handles may have only a later PID-absence point, not recovered creation/exit identity. No universal descendant closure or shared-host idleness is claimed.'
    actualFinalEnclosingToolReceipt = $null
    parentMustAppendActualFinalReceiptAfterReturn = $true
}
Save-NewJson 'execution-failures-and-observer-limits-019.json' $failures
foreach ($finding in @('F255','F256'))
{
    $decision = [IO.File]::ReadAllText((Join-Path $PSScriptRoot ('decision-' + $finding + '-019.json'))) | ConvertFrom-Json -Depth 100
    if ($decision.findingId -cne $finding -or -not $decision.notMeasuredNoGain -or $decision.runtimeOrPerformanceQualified) { throw 'Decision identity/qualification scope invalid' }
}
$audit = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    ownerTaskId = $script:ScopeBinding.actualOwner
    scope = '293 SOURCE ONLY'
    perRole = $perRole
    completeWholeBodies = $auditMembers.Count
    inputRolePairsByteEqual = 15
    actualDirectGitGhRootsIncludingTheObserverFailedAttempt = $rootAudit.Count
    maximumDirectGitGhRoots = 32
    nativeNonzeroExitRoots = 0
    dataHelperFailuresPreserved = 3
    metadataGlobTimeoutsPreserved = 3
    reservedHeadBeforeAndAfter = $headText
    reservedBranchBefore = 'refs/heads/autoperf/F145-hoist-large-response-utf8-encoding'
    reservedHeadWasNeverUsedAsDefault = $true
    trackedStatusBeforeBytes = $before.Length
    trackedStatusAfterBytes = $after.Length
    trackedStatusBeforeAfterByteEqual = $true
    readonlyStatusIsNotAUniversalNoOtherUserWriteProof = $true
    sourceBodyBudgetClosedNoFurtherBodiesRead = $true
    noProductOrScenarioOrSdkOrTimingExecution = $true
    noCandidateOrSourceOrTestOrPackageManifestOrCacheEdits = $true
    noPolicyLeaseLedgerPublicationOrRemoteAuthorityUsed = $true
    staticHelpersDidNotExecuteCapturedRepositoryCode = $true
    unrunTest = 'Templates.Test.BaselineTest.Template_Produces_The_Right_Set_Of_FilesAsync'
    sourceDeclaredRowsNotExecuted = 75
    generatedOutputAndTestDiscoveryUnobserved = $true
    sourceDecisions = @('decision-F255-019.json','decision-F256-019.json')
    finiteUnreadProposal = 'finite-unread-source-proposal-017.json'
    failuresAndLimits = 'execution-failures-and-observer-limits-019.json'
    controlsCapturedSeparately = 'governance-read-inputs-index-018.json'
    exactFinalEnclosingToolReceiptNotSelfAttested = $true
}
Save-NewJson 'source-audit-019.json' $audit
[Console]::WriteLine(($audit | ConvertTo-Json -Depth 20))
