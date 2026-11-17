$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule = Join-Path $output 'F012'
$receipt = Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh receipt and clean results checkout required.'
}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F012-immutable-file-count.txt') -Raw)
$remote = @(Get-Content (Join-Path $PSScriptRoot 'F012-remote-blob-verification.json') -Raw | ConvertFrom-Json)
$immutable = (Get-Content (Join-Path $PSScriptRoot 'F012-results-commit.txt') -Raw).Trim()
$audit = Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw | ConvertFrom-Json
$copies = Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw | ConvertFrom-Json
if ($remote.Count -ne $count -or @($remote | Where-Object { -not $_.verified_remote_blob }).Count -or
    $copies.unique_authoritative_destinations + 4 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or -not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or
    $audit.performancePrJustified -or $audit.proposalDisposition -cne 'rejected/design-blocked' -or -not $audit.budgetClosed -or
    $audit.originalOnlyDiagnosticProfiles -ne 1 -or $audit.pairedComparisons -ne 0 -or $audit.candidateProfiles -ne 0 -or
    $audit.benchmarkOutcomes -ne 12 -or $audit.actualWorkloadIterations -ne 96 -or $audit.retainedResults -ne 91 -or
    $audit.actualWarmups -ne 36 -or $audit.actualOverheadIterations -ne 223 -or $audit.existingAreaRows -ne 27 -or
    $audit.repositoryAlwaysTestSentinelRows -ne 0 -or $audit.actualNewOwningTestRuns -ne 0 -or $audit.explicitlyReusedOriginalAreaRows -ne 27 -or $audit.producerRecordsAudited -ne 34 -or
    $audit.validatedBenchmarkRecordsAudited -ne 36 -or $audit.actualTimedSetupPreflightsAudited -ne 36 -or
    $audit.pePdbBindings -ne 19 -or $audit.sourcePdbDocumentChecks -ne 52 -or $audit.sourceSnapshotsVerified -ne 178 -or
    $audit.capturedSettingsRecords -ne 24 -or -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or
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
$entry = @($ledger.candidates | Where-Object id -CEQ 'F012')
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($entry.Count -ne 1 -or $entry[0].status -cne 'investigating' -or $entry[0].pr_url -or
    $ledger.candidates.Count -ne 358 -or $finished.Count -ne 96)
{
    throw 'Unique unfinished F012 and prior 96 finalized items required.'
}
$readmePath = Join-Path $output 'README.md'
$readme = Get-Content $readmePath -Raw
$old = '**Progress: 96/358 finalized**: 62 drafts, 13 no-gain, 17 rejected and 4 duplicates;'
if (-not $readme.Contains($old) -or -not $readme.Contains('262 findings remain unfinished.') -or $readme.Contains('| F012 |'))
{
    throw 'Unchanged preceding root index required.'
}
$anchor = [regex]::Matches($readme, '(?m)^\|---\|---\|---\|\r?\n')
if ($anchor.Count -ne 1)
{
    throw 'Unique root evaluation table anchor required.'
}
$issueReceipt = Join-Path $PSScriptRoot 'F012-tracking-issue.json'
if (Test-Path $issueReceipt)
{
    throw 'Preserve actual tracking issue; do not create a duplicate.'
}
$existing = gh issue list --repo jaslawinMs/aspnetcore --state all --search 'F012 in:title' --json number,title,url --limit 20
if ($LASTEXITCODE -or @($existing | ConvertFrom-Json).Count)
{
    throw 'No existing F012 tracking issue permitted for this new publication.'
}
$analysis = Get-Content (Join-Path $capsule 'analysis.json') -Raw | ConvertFrom-Json
$evidence = "https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F012/README.md"
$bodyLines = [System.Collections.Generic.List[string]]::new()
$bodyLines.Add('**Rejected/design-blocked for an unvalidated per-send exclusion snapshot. No shipping optimization or performance PR; not measured comparative no-gain.**')
$bodyLines.Add('')
$bodyLines.Add('Actual public SendAllExceptAsync repeatedly scans exclusions over the real registered connection store. A real JsonHubProtocol-serialized argument getter changes the same array/List/read-only-wrapper backing input during first serialization: one of eight actual transports receives a frame. Explicit copied-input controls passed to the unchanged broadcast owner deliver to all eight. Custom ICollection.Contains comparison/dispatch differs too. These are native producer/input-semantics controls, not an implemented indexed owner or red/green optimization. Other compatible designs remain unverified.')
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
$bodyLines.Add('One independently executed original-only12-shape profile:96 raw samples,91 retained,five upper-filtered,36 warmups,223 actual overheads. Zero candidate profiles/paired comparisons; closed budget,no additional F012 timing. Different configured inputs and F011 group sends are not before/after roles. Allocation is process-wide,not isolated membership/enumerator allocation; all raw data and4.74% empty-store CV retained.')
$bodyLines.Add('')
$bodyLines.Add('Actual public broadcast sends,real HubConnectionContext/JSON serialization,fixed256-byte synchronous per-connection transport buffers. Connections registered before timing without group creation; an untimed scope control includes an outside-group connection. Connection creation,network,handshake,stateful reconnect and typical production traffic are not measured. Actual Pipe backpressure/completion/cancellation characterized separately,untimed.')
$bodyLines.Add('')
$bodyLines.Add('## Coverage and provenance')
$bodyLines.Add('')
$bodyLines.Add('All27 explicitly reused original F011 DefaultHubLifetimeManagerTests rows passed:23 Facts including12 inherited specification Facts plus4 actual Theory payloads,including broadcast cancellation coverage; zero new F012 owning-suite runs,not the whole SignalR project. Original commands/timestamps/TRX retained and identical owner/test bytes rehashed. New F01217 producer checks+12 timed wrappers independently pass under both original/current JSON producers. Only JSON DLL/PDB differ across80-file images; current JSON bytes explicitly reused/rehashed from F011,not freshly rebuilt. Repository original JSON outputs unchanged; no whole-current-default integration.')
$bodyLines.Add('')
$bodyLines.Add('Independent live and copied portable audits pass:34 producer/36 setup/36 delivery records,19 bounded PE/PDB bindings,52 selected document checks,178 source snapshots,24 unchanged settings point records. Portable mode cannot rehash omitted binaries/replay PE/PDB bindings. Both failed reader sources/observations and all raw timing/GC records retained; first audit-scaffold tool stderr not separately redirected into an artifact. No F011 group behavior/timing reused as broadcast proof.')
$bodyLines.Add('')
$bodyLines.Add("Exact historical commands with observed exits: https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F012/validation-commands.md")
$bodyLines.Add('')
$bodyLines.Add("Independent unchanged source branch: $($source.url), baseline ``$($source.commit)``. Actual remote source ref and owner bytes verified.")
$bodyLines.Add('')
$bodyLines.Add('Related David Fowler work dotnet/aspnetcore#69189 changes small-target SendConnectionsAsync,not SendAllExceptAsync; no upstream numbers reused. F011 is the separate completed group path; F013/F014 remain independent.')
$bodyLines.Add('')
$bodyLines.Add('Shared Windows VM, SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105, settings-preserving executor; no deliberate power/priority/affinity changes or isolated-machine/general application-speedup claim.')
$body = $bodyLines -join "`n"
$bodyPath = Join-Path $PSScriptRoot 'F012-tracking-issue-body.md'
$body | Set-Content $bodyPath -Encoding utf8 -NoNewline
$title = '[AutoPerf F012] Broadcast exclusion snapshot rejected: live-input semantics'
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
    candidate = 'F012'; number = $number; url = $issue.html_url; title = $issue.title
    bodySha256 = (Get-FileHash $bodyPath).Hash; actualRemoteBodyExactlyVerified = $true
    immutableEvidenceCommit = $immutable; actualRemoteIssue = $issue
} | ConvertTo-Json -Depth 12 | Set-Content $issueReceipt
Start-Process $issue.html_url
$browser = [ordered]@{
    candidate = 'F012'; actualUrl = $issue.html_url; browserOpenRequested = $true
    launchReturnedWithoutError = $true; visualRenderingVerified = $false
    qualification = 'Actual verified fork tracking issue, not a speculative performance PR or visual browser confirmation.'
}
$browser | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'F012-browser-open.json')
$note = "Rejected/design-blocked unvalidated per-send broadcast exclusion snapshot,not comparative no-gain. Original scan remains. Independent actual SendAllExceptAsync/real JSON getter changes same-count array/List/read-only-wrapper input:one recipient versus8 for explicit copied-input controls using unchanged owner; custom ICollection.Contains dispatch differs. No implemented index or compatible shipping candidate. Both actual producer versions pass17 native checks+12 timed wrappers; only JSON DLL/PDB differ across80-file images/89snapshots each. Identical original F011 owner/tests/current producer bytes explicitly reused/rehashed,0 new owning-suite runs/current producer builds; prior27rows=23Facts including12 inherited+4Theory rows,commands/timestamps/TRX retained,no F011 group behavior/timing reuse. Repository outputs unchanged,no whole-current-default integration. Sole12-case original-only profile/96raw/91retained/5filtered/36warmups/223overheads,0 comparisons/candidate profiles,closed budget. Live+portable audit34producer/36setup/36delivery,19PE-PDB/52docs,178snapshots,24settings. Two failed reader sources/observations retained; initial audit-scaffold stderr not separately redirected. Related upstream69189 changes targeted sends,not broadcast exclusions. Independent unchanged branch$($source.branch) at$($source.commit); immutable$immutable/$count files/all remote blobs verified. Tracking issue$($issue.html_url) actual body verified and browser launch requested,no visual confirmation."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F012 -Status rejected -Branch $source.branch -Note $note |
    Set-Content (Join-Path $PSScriptRoot 'F012-rejected-ledger-update.json')
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($finished.Count -ne 97 -or @($ledger.candidates | Where-Object status -CEQ 'drafted').Count -ne 62 -or
    @($ledger.candidates | Where-Object status -CEQ 'no-gain').Count -ne 13 -or
    @($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 18 -or
    @($ledger.candidates | Where-Object status -CEQ 'duplicate').Count -ne 4)
{
    throw 'Exact final campaign counts differ.'
}
$readme = $readme.Replace($old, '**Progress: 97/358 finalized**: 62 drafts, 13 no-gain, 18 rejected and 4 duplicates;').
    Replace('262 findings remain unfinished.', '261 findings remain unfinished.')
$row = "| F012 | Rejected live-input snapshot; [tracking jaslawinMs/aspnetcore#$number]($($issue.html_url)); original-only diagnostics, no source fix or gain | [SignalR broadcast exclusions](F012/README.md) |"
$readme = $readme.Insert($anchor[0].Index + $anchor[0].Length, $row + "`n")
$readme | Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate = 'F012'; disposition = 'rejected/design-blocked'
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
    benchmark_outcomes = 12; raw_actual_iterations = 96; retained_results = 91; upper_filtered_samples = 5
    actual_warmups = 36; actual_overheads = 223
    existing_original_area_rows = 27; repository_sentinel_rows = 0; inherited_specification_rows = 12; actual_theory_rows = 4
    logical_untimed_checks_per_producer = 17; actual_timed_wrapper_preflights_per_producer = 12
    actual_producer_versions_characterized = 2; execution_image_files_each = 80; source_snapshots_each = 89
    original_repository_json_outputs_unchanged = $true; actual_new_owning_test_runs = 0; explicitly_reused_original_area_rows = 27; actual_new_current_producer_builds = 0; failed_preparation_sources_and_observations_retained = $true; initial_audit_scaffold_stderr_redirected_to_artifact_file = $false
    actual_live_and_copied_portable_audits_passed = $true; portable_omitted_binary_bytes_rehashed = $false
    raw_dll_pdb_native_images_binlogs_published = $false; whole_current_default_sdk_integration_claimed = $false
    actual_tracking_issue = $issue; tracking_issue_remote_body_exactly_verified = $true
    browser_open = $browser; full_independent_measurement_audit = $audit; raw_copy_verification = $copies
    campaign_finalized = 97; campaign_total = 358; campaign_unfinished = 261
    finalized_at = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 16 | Set-Content $receipt
git -C $output add -- F012/publication.json README.md campaign.json findings.md
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/root staging failed.'
}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE)
{
    throw 'Receipt/root whitespace failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F012 receipt-staged $count
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/index scope differs.'
}
git -C $output commit -q -m 'Record broadcast exclusion snapshot rejection and 97 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Receipt/root commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F012-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE)
{
    throw 'Receipt/root push failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F012 receipt $count
if ($LASTEXITCODE)
{
    throw 'Actual immutable/receipt/index remote bytes or results ref differ.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must be clean.'
}
Write-Output "F012 persistent: 97/358 finalized, 62 drafts, 13 no-gain, 18 rejected, 4 duplicates, 261 unfinished; tracking $($issue.html_url)."
