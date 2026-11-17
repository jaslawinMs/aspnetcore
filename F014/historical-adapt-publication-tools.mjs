import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const records = [];
for (const suffix of ['publish-source.ps1', 'package.ps1', 'publish-results.ps1', 'finalize-publication.ps1']) {
  const original = fs.readFileSync(path.join(session, 'F012-' + suffix));
  let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F014');
  const changes = [];
  function edit(before, after, count = 1) {
    assert.equal(content.split(before).length - 1, count, suffix + ': ' + before);
    content = content.replaceAll(before, after);
    changes.push({ before, after, actualOccurrences: count });
  }
  function line(prefix, replacement) {
    const matches = content.split('\n').filter(value => value.startsWith(prefix));
    assert.equal(matches.length, 1, prefix);
    edit(matches[0], replacement);
  }
  function section(start, end, replacement) {
    const first = content.indexOf(start);
    const last = content.indexOf(end, first + start.length);
    assert(first >= 0 && last > first);
    content = content.slice(0, first) + replacement + content.slice(last);
    changes.push({ sectionStart: start, sectionEnd: end, replacementSha256: hash(Buffer.from(replacement)) });
  }
  if (suffix === 'publish-source.ps1') {
    edit('Unvalidated exclusion snapshot', 'Unvalidated user-ID snapshot');
  }
  if (suffix === 'package.ps1') {
    edit('$audit.benchmarkOutcomes -ne 12', '$audit.benchmarkOutcomes -ne 14');
    edit('One actual original-only 12-case profile', 'One actual original-only 14-case user-send profile');
    line("$commands.Add('Original investigation final-metadata reader", `$commands.Add('No fresh reader/native/timing failure or rerun. Four new F014 native preparation commands exit0: one restore, one build, two independent19-check/14-wrapper user-send characterizations with actual default user-ID provider/principal setup. F01127-row owning-suite/current JSON bytes explicitly reused/rehashed, not rerun/rebuilt. Repository outputs unchanged. One14-shape original-only profile passes; zero paired comparisons/candidate profiles, no prior group/broadcast/connection timing reused. The guarded profiler also executes dotnet --info successfully before timing; its exact output is measurements/original-diagnostic-only/dotnet-info.log.')`);
    section("[ordered]@{\n    candidate = 'F014'; verified_copy_mappings", '$files = @(Get-ChildItem', `[ordered]@{
    candidate = 'F014'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true
    proposal_disposition = 'rejected/design-blocked'; performance_pr_created = $false; shipping_source_changed = $false
    paired_comparisons = 0; candidate_profiles = 0; original_only_profiles = 1
    benchmark_reports = $audit.benchmarkOutcomes; raw_actual_iterations = $audit.actualWorkloadIterations
    retained_results = $audit.retainedResults; upper_filtered_samples = $audit.upperFilteredSamples
    actual_warmups = $audit.actualWarmups; actual_overheads = $audit.actualOverheadIterations
    actual_area_rows = 27; explicitly_reused_original_area_rows = 27; actual_new_owning_test_runs = 0; repository_sentinel_rows = 0
    producer_records = $audit.producerRecordsAudited; validated_benchmark_records = $audit.validatedBenchmarkRecordsAudited
    actual_setup_preflights = $audit.actualTimedSetupPreflightsAudited; source_snapshots = $audit.sourceSnapshotsVerified
    pe_pdb_witnesses = $audit.pePdbBindings; source_document_checks = $audit.sourcePdbDocumentChecks
    settings_records = $audit.capturedSettingsRecords; omitted_entries = $omissions.Count
    raw_dll_pdb_build_images_binlogs_published = $false
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
`);
  }
  if (suffix === 'publish-results.ps1') {
    edit('Publish SignalR broadcast exclusion snapshot rejection and original-only diagnostics',
      'Publish SignalR user-target snapshot rejection and original-only diagnostics');
  }
  if (suffix === 'finalize-publication.ps1') {
    for (const [before, after] of [
      ['$audit.benchmarkOutcomes -ne 12', '$audit.benchmarkOutcomes -ne 14'],
      ['$audit.actualWorkloadIterations -ne 96', '$audit.actualWorkloadIterations -ne 112'],
      ['$audit.retainedResults -ne 91', '$audit.retainedResults -ne 107'],
      ['$audit.actualWarmups -ne 36', '$audit.actualWarmups -ne 42'],
      ['$audit.actualOverheadIterations -ne 223', '$audit.actualOverheadIterations -ne 267'],
      ['$audit.producerRecordsAudited -ne 34', '$audit.producerRecordsAudited -ne 38'],
      ['$audit.validatedBenchmarkRecordsAudited -ne 36', '$audit.validatedBenchmarkRecordsAudited -ne 42'],
      ['$audit.actualTimedSetupPreflightsAudited -ne 36', '$audit.actualTimedSetupPreflightsAudited -ne 42'],
      ['$audit.pePdbBindings -ne 19', '$audit.pePdbBindings -ne 21'],
      ['$audit.sourcePdbDocumentChecks -ne 52', '$audit.sourcePdbDocumentChecks -ne 57'],
      ['$audit.sourceSnapshotsVerified -ne 178', '$audit.sourceSnapshotsVerified -ne 180'],
      ['$audit.capturedSettingsRecords -ne 24', '$audit.capturedSettingsRecords -ne 28'],
      ['$finished.Count -ne 96', '$finished.Count -ne 98'],
      ['prior 96 finalized items', 'prior 98 finalized items'],
      ['**Progress: 96/358 finalized**: 62 drafts, 13 no-gain, 17 rejected and 4 duplicates;',
        '**Progress: 98/358 finalized**: 62 drafts, 14 no-gain, 18 rejected and 4 duplicates;'],
      ['262 findings remain unfinished.', '260 findings remain unfinished.'],
      ['$finished.Count -ne 97', '$finished.Count -ne 99'],
      ["status -CEQ 'no-gain').Count -ne 13", "status -CEQ 'no-gain').Count -ne 14"],
      ["status -CEQ 'rejected').Count -ne 18", "status -CEQ 'rejected').Count -ne 19"],
      ['**Progress: 97/358 finalized**: 62 drafts, 13 no-gain, 18 rejected and 4 duplicates;',
        '**Progress: 99/358 finalized**: 62 drafts, 14 no-gain, 19 rejected and 4 duplicates;'],
      ['261 findings remain unfinished.', '259 findings remain unfinished.'],
      ['SignalR broadcast exclusions', 'SignalR user-target membership'],
      ['benchmark_outcomes = 12; raw_actual_iterations = 96; retained_results = 91;',
        'benchmark_outcomes = 14; raw_actual_iterations = 112; retained_results = 107;'],
      ['actual_warmups = 36; actual_overheads = 223', 'actual_warmups = 42; actual_overheads = 267'],
      ['logical_untimed_checks_per_producer = 17; actual_timed_wrapper_preflights_per_producer = 12',
        'logical_untimed_checks_per_producer = 19; actual_timed_wrapper_preflights_per_producer = 14'],
      ['source_snapshots_each = 89', 'source_snapshots_each = 90'],
      ['campaign_finalized = 97; campaign_total = 358; campaign_unfinished = 261',
        'campaign_finalized = 99; campaign_total = 358; campaign_unfinished = 259'],
      ['Record broadcast exclusion snapshot rejection and 97 finalized findings',
        'Record user-target snapshot rejection and 99 finalized findings'],
      ['F014 persistent: 97/358 finalized, 62 drafts, 13 no-gain, 18 rejected, 4 duplicates, 261 unfinished;',
        'F014 persistent: 99/358 finalized, 62 drafts, 14 no-gain, 19 rejected, 4 duplicates, 259 unfinished;'],
      ['failed_preparation_sources_and_observations_retained = $true; initial_audit_scaffold_stderr_redirected_to_artifact_file = $false',
        'all_fresh_command_sources_and_outcomes_retained = $true; actual_new_reader_failures = 0; actual_native_preparation_failures = 0; actual_timing_failures = 0'],
    ]) edit(before, after, before === '262 findings remain unfinished.' ? 2 : 1);
    section("$bodyLines.Add('**Rejected/design-blocked", '$body = $bodyLines -join', `$bodyLines.Add('**Rejected/design-blocked: a simple per-send user-ID snapshot changes recipients. No shipping optimization or performance PR; not measured comparative no-gain.**')
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
$bodyLines.Add("Independent unchanged source branch: $($source.url), baseline \`\`$($source.commit)\`\`. Actual remote source ref and owner bytes verified.")
$bodyLines.Add('')
$bodyLines.Add('Related David Fowler work dotnet/aspnetcore#69189 changes small-target SendConnectionsAsync,not SendUsersAsync; no upstream numbers reused. The original scan remains; no claim that every alternative optimization is impossible.')
$bodyLines.Add('')
$bodyLines.Add('Shared Windows VM,SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105,settings-preserving executor; no deliberate power/priority/affinity changes or isolated-machine/general application-speedup claim.')
`);
    line("$title = ", "$title = '[AutoPerf F014] User-target snapshot rejected: live user-ID semantics'");
    line('$note = ', `$note = "Rejected/design-blocked per-send user-ID snapshot,not comparative no-gain. Original SendUsersAsync scan remains; no implemented index,shipping source change,performance PR or proof all alternatives impossible. Actual default user-ID provider on real principals yields null absent claims and supports multiple connections/user. Real JSON getter mutates same64-element array/List/read-only input:one recipient versus8 for copied-input controls using unchanged owner; custom/derived Contains dispatch preserved. Both actual JSON versions pass19 native checks+14 wrappers.80-file images/90sources each,only JSON DLL/PDB differ; F01127-row test/current JSON bytes explicitly reused/rehashed,0 new owning-suite/current-producer builds,no old method timing or whole-main claim. Sole14-case original-only profile112raw/107retained/5filtered/42warmups/267overheads;0 candidate profiles/comparisons,closed budget. Audits38producer/42setup/42delivery,21PE-PDB/57docs,180snapshots,28settings. No fresh reader/native/timing failure or rerun. Independent unchanged branch$($source.branch) at$($source.commit); immutable$immutable/$count files/all remote blobs verified. Tracking issue$($issue.html_url) actual body verified and browser launch requested,no visual confirmation."`);
  }
  const destination = path.join(session, 'F014-' + suffix);
  assert(!fs.existsSync(destination));
  fs.writeFileSync(destination, content);
  records.push({ template: 'F012-' + suffix, templateSha256: hash(original),
    destination: 'F014-' + suffix, resultSha256: hash(Buffer.from(content)), changes });
}
fs.writeFileSync(path.join(run, 'publication-tools-provenance.json'), JSON.stringify({
  candidate: 'F014', files: records,
  qualification: 'Checked source/immutable-evidence/receipt publication adaptations. Actual user-ID/default-provider/null/shared-user controls and14 original-only reports, dynamic evidence counts and98-to99 official progress; no inherited F012 failure, broadcast or timing claims. No push, issue creation or result mutation by this adapter.',
}, null, 2) + '\n');
console.log('F014 fork-only publication tools prepared with actual user-send evidence, derived capsule counts and guarded98-to99 progress.');
