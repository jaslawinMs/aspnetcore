$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule = Join-Path $output 'F014'
$receipt = Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh receipt and clean results checkout required.'
}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F014-immutable-file-count.txt') -Raw)
$remote = @(Get-Content (Join-Path $PSScriptRoot 'F014-remote-blob-verification.json') -Raw | ConvertFrom-Json)
$immutable = (Get-Content (Join-Path $PSScriptRoot 'F014-results-commit.txt') -Raw).Trim()
$audit = Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw | ConvertFrom-Json
$copies = Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw | ConvertFrom-Json
if ($remote.Count -ne $count -or @($remote | Where-Object { -not $_.verified_remote_blob }).Count -or
    $copies.unique_authoritative_destinations + 4 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or -not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or
    $audit.performancePrJustified -or $audit.proposalDisposition -cne 'rejected/design-blocked' -or -not $audit.budgetClosed -or
    $audit.originalOnlyDiagnosticProfiles -ne 1 -or $audit.pairedComparisons -ne 0 -or $audit.candidateProfiles -ne 0 -or
    $audit.benchmarkOutcomes -ne 14 -or $audit.actualWorkloadIterations -ne 112 -or $audit.retainedResults -ne 107 -or
    $audit.actualWarmups -ne 42 -or $audit.actualOverheadIterations -ne 267 -or $audit.existingAreaRows -ne 27 -or
    $audit.repositoryAlwaysTestSentinelRows -ne 0 -or $audit.actualNewOwningTestRuns -ne 0 -or $audit.explicitlyReusedOriginalAreaRows -ne 27 -or $audit.producerRecordsAudited -ne 38 -or
    $audit.validatedBenchmarkRecordsAudited -ne 42 -or $audit.actualTimedSetupPreflightsAudited -ne 42 -or
    $audit.pePdbBindings -ne 21 -or $audit.sourcePdbDocumentChecks -ne 57 -or $audit.sourceSnapshotsVerified -ne 180 -or
    $audit.capturedSettingsRecords -ne 28 -or -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or
    $source.newSourceCommitCreated -or $source.performancePrCreated -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
{
    throw 'Exact audited rejection, unchanged source and persistent evidence required.'
}
$actual = gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
if ($LASTEXITCODE)
{
    throw 'Actual source ref lookup failed.'
}
$actualHead = $actual | ConvertFrom-Json
if ($actualHead.object.sha -cne $source.commit)
{
    throw 'Published source branch differs; do not overwrite user changes.'
}
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$entry = @($ledger.candidates | Where-Object id -CEQ 'F014')
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($entry.Count -ne 1 -or $entry[0].status -cne 'investigating' -or $entry[0].pr_url -or
    $ledger.candidates.Count -ne 358 -or $finished.Count -ne 98)
{
    throw 'Unique unfinished F014 and prior 98 finalized items required.'
}
$readmePath = Join-Path $output 'README.md'
$readme = Get-Content $readmePath -Raw
$old = '**Progress: 98/358 finalized**: 62 drafts, 14 no-gain, 18 rejected and 4 duplicates;'
if (-not $readme.Contains($old) -or -not $readme.Contains('260 findings remain unfinished.') -or $readme.Contains('| F014 |'))
{
    throw 'Unchanged preceding root index required.'
}
$anchor = [regex]::Matches($readme, '(?m)^\|---\|---\|---\|\r?\n')
if ($anchor.Count -ne 1)
{
    throw 'Unique root evaluation table anchor required.'
}
$issueReceipt = Join-Path $PSScriptRoot 'F014-tracking-issue.json'
if (Test-Path $issueReceipt)
{
    throw 'Preserve actual tracking issue; do not create a duplicate.'
}
$existing = gh issue list --repo jaslawinMs/aspnetcore --state all --search 'F014 in:title' --json number,title,url --limit 20
if ($LASTEXITCODE -or @($existing | ConvertFrom-Json).Count)
{
    throw 'No existing F014 tracking issue permitted for this new publication.'
}
$analysis = Get-Content (Join-Path $capsule 'analysis.json') -Raw | ConvertFrom-Json
$evidence = "https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F014/README.md"
$bodyLines = [System.Collections.Generic.List[string]]::new()
$bodyLines.Add('**Rejected/design-blocked: a simple per-send user-ID snapshot changes recipients. No shipping optimization or performance PR; not measured comparative no-gain.**')
$bodyLines.Add('')
$bodyLines.Add('Actual public SendUsersAsync scans the live requested user IDs for each registered connection. A real JsonHubProtocol argument getter replaces eight requested user IDs in the same64-element array/List/read-only-wrapper backing input: one of eight actual transports receives a frame. Explicit copied-input controls passed to the unchanged owner deliver to all eight. Custom/derived ICollection.Contains dispatch also matters. These are native producer/input-semantics controls, not an implemented indexed owner or optimization red/green test; other compatible designs remain unverified.')
$bodyLines.Add('')
$bodyLines.Add('User IDs come from actual public DefaultUserIdProvider.GetUserId on real connection principals during untimed setup, including absent-NameIdentifier nulls and multiple connections sharing a user. Case distinctions, duplicates, outside-group scope and per-connection send-once behavior are asserted. This warm-state boundary does not execute the internal protocol handshake. Unlike SendConnectionsAsync, this method has no16-target threshold.')
$bodyLines.Add('')
$bodyLines.Add("[Immutable runnable project, complete evidence and limitations]($evidence)")
$bodyLines.Add('')
$bodyLines.Add('## Original-only diagnostics on this box')
$bodyLines.Add('')
$bodyLines.Add('| Original shape | Mean ns | SD ns | Retained N | Process-wide B/op |')
$bodyLines.Add('|---|---:|---:|---:|---:|')
foreach ($case in $analysis.cases)
{
    $bodyLines.Add([string]::Format([Globalization.CultureInfo]::InvariantCulture,
        '| {0} | {1:F3} | {2:F3} | {3} | {4} |', $case.shape, $case.reportedMeanNs,
        $case.reportedSdNs, $case.reportedRetainedN, $case.allocatedProcessBytesPerOperation))
}
$bodyLines.Add('')
$bodyLines.Add('One original-only14-shape profile:112 raw samples,107 retained,five upper-filtered,42 warmups,267 actual overheads. Zero candidate profiles/paired comparisons; permanently closed budget. Different configured inputs and previous method timings are not before/after roles. Allocation is process-wide,not isolated owner/membership allocation. Empty-store4.76% CV and shared-user2.43% CV retained; an empty store executes no membership predicate.')
$bodyLines.Add('')
$bodyLines.Add('Actual public user sends,real HubConnectionContext/JSON serialization,fixed256-byte synchronous per-connection transports. User-ID provider/principal/connection/input/group construction,network,handshake,stateful reconnect and typical production traffic are outside timing. Two real Pipe completion/backpressure/cancellation controls pass separately,untimed. Instrumented native misses yield1/128/2048 target values at1x1/8x16/32x64 dimensions with zero Count/indexer reads.')
$bodyLines.Add('')
$bodyLines.Add('## Coverage and provenance')
$bodyLines.Add('')
$bodyLines.Add('Both actual JSON versions independently pass19 user-ID/provider/JSON/dispatch/Pipe checks+14 timed wrappers. First harness build and all four new native preparation commands exit0; no fresh reader/native/timing failure or rerun. Historical F01127-row owning-suite evidence is explicitly reused/rehashed with original commands/timestamps/TRX:23 Facts including12 inherited plus all four actual16/17 array/List Theory rows,which are not a user-send threshold. Zero new owning-suite runs/current JSON builds or whole-SignalR-suite claim.')
$bodyLines.Add('')
$bodyLines.Add('Two80-file images differ only in JSON DLL/PDB; both90-source catalogs contain provider/interface snapshots. Source/default/history captures are fresh; actual old owner/test/current JSON bytes explicitly reused. No F011/F012/F013 behavior/timing used as user-send proof,or whole-current-default SDK/dependency integration claim.')
$bodyLines.Add('')
$bodyLines.Add('Independent live and copied portable audits pass:38 producer/42 setup/42 delivery records,21 bounded PE/PDB bindings,57 selected document checks,180 source snapshots,28 unchanged settings-point records; all raw statistics/overhead/filtering/GC rounding recomputed. Portable mode cannot rehash omitted binaries or replay PE/PDB binding. Prior BDN source is rehashed against the identical measured DLL,not freshly fetched/instrumented/rebuilt or complete source-to-binary proof.')
$bodyLines.Add('')
$bodyLines.Add("Exact historical commands with actual outcomes: https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F014/validation-commands.md")
$bodyLines.Add('')
$bodyLines.Add("Independent unchanged source branch: $($source.url), baseline ``$($source.commit)``. Actual remote source ref and owner bytes verified.")
$bodyLines.Add('')
$bodyLines.Add('Related David Fowler work dotnet/aspnetcore#69189 changes small-target SendConnectionsAsync,not SendUsersAsync; no upstream numbers reused. The original scan remains; no claim that every alternative optimization is impossible.')
$bodyLines.Add('')
$bodyLines.Add('Shared Windows VM,SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105,settings-preserving executor; no deliberate power/priority/affinity changes or isolated-machine/general application-speedup claim.')
$body = $bodyLines -join "`n"
$bodyPath = Join-Path $PSScriptRoot 'F014-tracking-issue-body.md'
$body | Set-Content $bodyPath -Encoding utf8 -NoNewline
$title = '[AutoPerf F014] User-target snapshot rejected: live user-ID semantics'
$url = gh issue create --repo jaslawinMs/aspnetcore --title $title --body-file $bodyPath
if ($LASTEXITCODE -or $url.Trim() -cnotmatch '^https://github\.com/jaslawinMs/aspnetcore/issues/(\d+)$')
{
    throw 'Actual new fork tracking issue URL required.'
}
$number = [int]$Matches[1]
$actualIssue = gh api "repos/jaslawinMs/aspnetcore/issues/$number"
if ($LASTEXITCODE)
{
    throw 'Actual created issue lookup failed; do not recreate it.'
}
$issue = $actualIssue | ConvertFrom-Json
if ($issue.title -cne $title -or $issue.body -cne $body -or $issue.html_url -cne $url.Trim() -or $issue.pull_request)
{
    throw 'Actual remote tracking issue body/title/URL differs.'
}
[ordered]@{
    candidate = 'F014'; number = $number; url = $issue.html_url; title = $issue.title
    bodySha256 = (Get-FileHash $bodyPath).Hash; actualRemoteBodyExactlyVerified = $true
    immutableEvidenceCommit = $immutable; actualRemoteIssue = $issue
} | ConvertTo-Json -Depth 12 | Set-Content $issueReceipt
Start-Process $issue.html_url
$browser = [ordered]@{
    candidate = 'F014'; actualUrl = $issue.html_url; browserOpenRequested = $true
    launchReturnedWithoutError = $true; visualRenderingVerified = $false
    qualification = 'Actual verified fork tracking issue, not a speculative performance PR or visual browser confirmation.'
}
$browser | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'F014-browser-open.json')
$note = "Rejected/design-blocked per-send user-ID snapshot,not comparative no-gain. Original SendUsersAsync scan remains; no implemented index,shipping source change,performance PR or proof all alternatives impossible. Actual default user-ID provider on real principals yields null absent claims and supports multiple connections/user. Real JSON getter mutates same64-element array/List/read-only input:one recipient versus8 for copied-input controls using unchanged owner; custom/derived Contains dispatch preserved. Both actual JSON versions pass19 native checks+14 wrappers.80-file images/90sources each,only JSON DLL/PDB differ; F01127-row test/current JSON bytes explicitly reused/rehashed,0 new owning-suite/current-producer builds,no old method timing or whole-main claim. Sole14-case original-only profile112raw/107retained/5filtered/42warmups/267overheads;0 candidate profiles/comparisons,closed budget. Audits38producer/42setup/42delivery,21PE-PDB/57docs,180snapshots,28settings. No fresh reader/native/timing failure or rerun. Independent unchanged branch$($source.branch) at$($source.commit); immutable$immutable/$count files/all remote blobs verified. Tracking issue$($issue.html_url) actual body verified and browser launch requested,no visual confirmation."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F014 -Status rejected -Branch $source.branch -Note $note |
    Set-Content (Join-Path $PSScriptRoot 'F014-rejected-ledger-update.json')
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($finished.Count -ne 99 -or @($ledger.candidates | Where-Object status -CEQ 'drafted').Count -ne 62 -or
    @($ledger.candidates | Where-Object status -CEQ 'no-gain').Count -ne 14 -or
    @($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 19 -or
    @($ledger.candidates | Where-Object status -CEQ 'duplicate').Count -ne 4)
{
    throw 'Exact final campaign counts differ.'
}
$readme = $readme.Replace($old, '**Progress: 99/358 finalized**: 62 drafts, 14 no-gain, 19 rejected and 4 duplicates;').
    Replace('260 findings remain unfinished.', '259 findings remain unfinished.')
$row = "| F014 | Rejected live-input snapshot; [tracking jaslawinMs/aspnetcore#$number]($($issue.html_url)); original-only diagnostics, no source fix or gain | [SignalR user-target membership](F014/README.md) |"
$readme = $readme.Insert($anchor[0].Index + $anchor[0].Length, $row + "`n")
$readme | Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate = 'F014'; disposition = 'rejected/design-blocked'
    performance_pr_created = $false; performance_pr_justified = $false
    source_branch = $source.branch; source_commit = $source.commit; source_changed = $false; new_source_commit_created = $false
    actual_remote_source_ref = $actualHead; actual_remote_source_canonical_blob_verified = $true
    source_canonical_blob = $source.actualRemoteSourceBlob
    immutable_evidence_commit = $immutable; immutable_evidence_files = $count
    authoritative_copy_mappings = $copies.verified_copy_mappings; verified_remote_immutable_blobs = $count
    original_finding_linear_cost_still_present = $true; not_measured_comparative_no_gain = $true
    not_claiming_all_other_optimizations_impossible = $true
    paired_comparisons = 0; maximum_paired_comparisons = 3; original_only_diagnostic_profiles = 1
    candidate_profiles = 0; comparison_budget_closed = $true
    benchmark_outcomes = 14; raw_actual_iterations = 112; retained_results = 107; upper_filtered_samples = 5
    actual_warmups = 42; actual_overheads = 267
    existing_original_area_rows = 27; repository_sentinel_rows = 0; inherited_specification_rows = 12; actual_theory_rows = 4
    logical_untimed_checks_per_producer = 19; actual_timed_wrapper_preflights_per_producer = 14
    actual_producer_versions_characterized = 2; execution_image_files_each = 80; source_snapshots_each = 90
    original_repository_json_outputs_unchanged = $true; actual_new_owning_test_runs = 0; explicitly_reused_original_area_rows = 27; actual_new_current_producer_builds = 0; all_fresh_command_sources_and_outcomes_retained = $true; actual_new_reader_failures = 0; actual_native_preparation_failures = 0; actual_timing_failures = 0
    actual_live_and_copied_portable_audits_passed = $true; portable_omitted_binary_bytes_rehashed = $false
    raw_dll_pdb_native_images_binlogs_published = $false; whole_current_default_sdk_integration_claimed = $false
    actual_tracking_issue = $issue; tracking_issue_remote_body_exactly_verified = $true
    browser_open = $browser; full_independent_measurement_audit = $audit; raw_copy_verification = $copies
    campaign_finalized = 99; campaign_total = 358; campaign_unfinished = 259
    finalized_at = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 16 | Set-Content $receipt
git -C $output add -- F014/publication.json README.md campaign.json findings.md
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/root staging failed.'
}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE)
{
    throw 'Receipt/root whitespace failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F014 receipt-staged $count
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/index scope differs.'
}
git -C $output commit -q -m 'Record user-target snapshot rejection and 99 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Receipt/root commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F014-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE)
{
    throw 'Receipt/root push failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F014 receipt $count
if ($LASTEXITCODE)
{
    throw 'Actual immutable/receipt/index remote bytes or results ref differ.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must be clean.'
}
Write-Output "F014 persistent: 99/358 finalized, 62 drafts, 14 no-gain, 19 rejected, 4 duplicates, 259 unfinished; tracking $($issue.html_url)."
