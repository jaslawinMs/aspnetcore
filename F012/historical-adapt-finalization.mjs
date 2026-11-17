import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F012');
const source = fs.readFileSync(path.join(session, 'F011-finalize-publication.ps1'));
let text = source.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F011', 'F012');
const changes = [];
function edit(before, after, expected = 1) {
  const count = text.split(before).length - 1;
  assert.equal(count, expected, 'Finalization adaptation seam: ' + before);
  text = text.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
function line(prefix, replacement) {
  const matches = text.split('\n').filter(value => value.startsWith(prefix));
  assert.equal(matches.length, 1, 'Unique line: ' + prefix);
  edit(matches[0], replacement);
}
edit('$audit.retainedResults -ne 87', '$audit.retainedResults -ne 91');
edit('$audit.actualOverheadIterations -ne 227', '$audit.actualOverheadIterations -ne 223');
edit('$audit.repositoryAlwaysTestSentinelRows -ne 0 -or',
  '$audit.repositoryAlwaysTestSentinelRows -ne 0 -or $audit.actualNewOwningTestRuns -ne 0 -or $audit.explicitlyReusedOriginalAreaRows -ne 27 -or');
edit('$ledger.candidates.Count -ne 358 -or $finished.Count -ne 95)',
  '$ledger.candidates.Count -ne 358 -or $finished.Count -ne 96)');
edit('prior 95 finalized items', 'prior 96 finalized items');
line('$old = ', "$old = '**Progress: 96/358 finalized**: 62 drafts, 13 no-gain, 17 rejected and 4 duplicates;'");
edit("$readme.Contains('263 findings remain unfinished.')", "$readme.Contains('262 findings remain unfinished.')");
line("$bodyLines.Add('The real SignalR owner", "$bodyLines.Add('Actual public SendAllExceptAsync repeatedly scans exclusions over the real registered connection store. A real JsonHubProtocol-serialized argument getter changes the same array/List/read-only-wrapper backing input during first serialization: one of eight actual transports receives a frame. Explicit copied-input controls passed to the unchanged broadcast owner deliver to all eight. Custom ICollection.Contains comparison/dispatch differs too. These are native producer/input-semantics controls, not an implemented indexed owner or red/green optimization. Other compatible designs remain unverified.')");
line("$bodyLines.Add('One original-only 12-shape", "$bodyLines.Add('One independently executed original-only12-shape profile:96 raw samples,91 retained,five upper-filtered,36 warmups,223 actual overheads. Zero candidate profiles/paired comparisons; closed budget,no additional F012 timing. Different configured inputs and F011 group sends are not before/after roles. Allocation is process-wide,not isolated membership/enumerator allocation; all raw data and4.74% empty-store CV retained.')");
line("$bodyLines.Add('Actual public group sends", "$bodyLines.Add('Actual public broadcast sends,real HubConnectionContext/JSON serialization,fixed256-byte synchronous per-connection transport buffers. Connections registered before timing without group creation; an untimed scope control includes an outside-group connection. Connection creation,network,handshake,stateful reconnect and typical production traffic are not measured. Actual Pipe backpressure/completion/cancellation characterized separately,untimed.')");
line("$bodyLines.Add('All 27 discovered", "$bodyLines.Add('All27 explicitly reused original F011 DefaultHubLifetimeManagerTests rows passed:23 Facts including12 inherited specification Facts plus4 actual Theory payloads,including broadcast cancellation coverage; zero new F012 owning-suite runs,not the whole SignalR project. Original commands/timestamps/TRX retained and identical owner/test bytes rehashed. New F01217 producer checks+12 timed wrappers independently pass under both original/current JSON producers. Only JSON DLL/PDB differ across80-file images; current JSON bytes explicitly reused/rehashed from F011,not freshly rebuilt. Repository original JSON outputs unchanged; no whole-current-default integration.')");
line("$bodyLines.Add('Independent live and copied", "$bodyLines.Add('Independent live and copied portable audits pass:34 producer/36 setup/36 delivery records,19 bounded PE/PDB bindings,52 selected document checks,178 source snapshots,24 unchanged settings point records. Portable mode cannot rehash omitted binaries/replay PE/PDB bindings. Both failed reader sources/observations and all raw timing/GC records retained; first audit-scaffold tool stderr not separately redirected into an artifact. No F011 group behavior/timing reused as broadcast proof.')");
line("$bodyLines.Add('Related David Fowler", "$bodyLines.Add('Related David Fowler work dotnet/aspnetcore#69189 changes small-target SendConnectionsAsync,not SendAllExceptAsync; no upstream numbers reused. F011 is the separate completed group path; F013/F014 remain independent.')");
line('$title = ', "$title = '[AutoPerf F012] Broadcast exclusion snapshot rejected: live-input semantics'");
line('$note = ', `$note = "Rejected/design-blocked unvalidated per-send broadcast exclusion snapshot,not comparative no-gain. Original scan remains. Independent actual SendAllExceptAsync/real JSON getter changes same-count array/List/read-only-wrapper input:one recipient versus8 for explicit copied-input controls using unchanged owner; custom ICollection.Contains dispatch differs. No implemented index or compatible shipping candidate. Both actual producer versions pass17 native checks+12 timed wrappers; only JSON DLL/PDB differ across80-file images/89snapshots each. Identical original F011 owner/tests/current producer bytes explicitly reused/rehashed,0 new owning-suite runs/current producer builds; prior27rows=23Facts including12 inherited+4Theory rows,commands/timestamps/TRX retained,no F011 group behavior/timing reuse. Repository outputs unchanged,no whole-current-default integration. Sole12-case original-only profile/96raw/91retained/5filtered/36warmups/223overheads,0 comparisons/candidate profiles,closed budget. Live+portable audit34producer/36setup/36delivery,19PE-PDB/52docs,178snapshots,24settings. Two failed reader sources/observations retained; initial audit-scaffold stderr not separately redirected. Related upstream69189 changes targeted sends,not broadcast exclusions. Independent unchanged branch$($source.branch) at$($source.commit); immutable$immutable/$count files/all remote blobs verified. Tracking issue$($issue.html_url) actual body verified and browser launch requested,no visual confirmation."`);
edit('if ($finished.Count -ne 96 -or', 'if ($finished.Count -ne 97 -or');
edit("@($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 17 -or",
  "@($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 18 -or");
line('$readme = $readme.Replace(', "$readme = $readme.Replace($old, '**Progress: 97/358 finalized**: 62 drafts, 13 no-gain, 18 rejected and 4 duplicates;').");
edit("    Replace('263 findings remain unfinished.', '262 findings remain unfinished.')",
  "    Replace('262 findings remain unfinished.', '261 findings remain unfinished.')");
edit('SignalR group exclusions', 'SignalR broadcast exclusions');
edit('retained_results = 87; upper_filtered_samples = 9', 'retained_results = 91; upper_filtered_samples = 5');
edit('actual_overheads = 227', 'actual_overheads = 223');
edit('original_repository_json_outputs_restored_byte_exact = $true;',
  'original_repository_json_outputs_unchanged = $true; actual_new_owning_test_runs = 0; explicitly_reused_original_area_rows = 27; actual_new_current_producer_builds = 0;');
edit('all_failed_preparation_evidence_retained = $true',
  'failed_preparation_sources_and_observations_retained = $true; initial_audit_scaffold_stderr_redirected_to_artifact_file = $false');
edit('campaign_finalized = 96; campaign_total = 358; campaign_unfinished = 262',
  'campaign_finalized = 97; campaign_total = 358; campaign_unfinished = 261');
edit('Record group exclusion snapshot rejection and 96 finalized findings',
  'Record broadcast exclusion snapshot rejection and 97 finalized findings');
line('Write-Output "F012 persistent:', 'Write-Output "F012 persistent: 97/358 finalized, 62 drafts, 13 no-gain, 18 rejected, 4 duplicates, 261 unfinished; tracking $($issue.html_url)."');
const destination = path.join(session, 'F012-finalize-publication.ps1');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, text);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'finalization-tools-attribution.json'), JSON.stringify({
  candidate: 'F012', source: 'F011-finalize-publication.ps1', sourceSha256: sha(source),
  resultSha256: sha(Buffer.from(text)), changes,
  qualification: 'Checked fork-only issue/receipt/root-index publication adaptation; actual new F012 data/explicit reuse boundaries and97/358 counts. No issue, browser, ledger finalization or remote write launched by this scaffolder.',
}, null, 2) + '\n');
console.log('F012 guarded fork-only finalization prepared for actual broadcast evidence and explicit original test/producer reuse.');
