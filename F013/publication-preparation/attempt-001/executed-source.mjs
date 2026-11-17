import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const records = [];
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
function one(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, `Unique publication seam required: ${before.slice(0, 100)}`);
  return source.replace(before, after);
}
function template(name) {
  const filename = path.join(session, `F012-${name}.ps1`);
  const data = fs.readFileSync(filename);
  return { name, template: path.basename(filename), templateSha256: hash(data),
    content: data.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F013') };
}
function save(record, content) {
  assert(!content.includes('F012'));
  const destination = path.join(session, `F013-${record.name}.ps1`);
  assert(!fs.existsSync(destination));
  fs.writeFileSync(destination, content);
  records.push({ template: record.template, templateSha256: record.templateSha256,
    destination: path.basename(destination), sha256: hash(fs.readFileSync(destination)) });
}
{
  const record = template('publish-source');
  let content = record.content;
  content = one(content, "$audit.pairedComparisons -ne 0", "$audit.pairedComparisons -ne 3");
  content = one(content, "$audit.proposalDisposition -cne 'rejected/design-blocked'", "$audit.proposalDisposition -cne 'no-gain'");
  content = one(content, "throw 'Audited rejected proposal and unchanged independent baseline branch required.'",
    "throw 'Audited three-comparison no-gain outcome and unchanged independent baseline branch required.'");
  content = one(content, "$before = @(git ls-remote", `$restored = Get-Content (Join-Path $run 'repository-restoration.json') -Raw | ConvertFrom-Json
if ($restored.originalSourceFilesVerified -ne 20 -or $restored.trackedChangesRemaining -ne 0 -or
    $restored.outputIdentitiesVerified -ne 8 -or -not $restored.noGain)
{
    throw 'Exact original source and known output restoration required.'
}
$before = @(git ls-remote`);
  content = one(content,
    "qualification = 'Unchanged independent baseline branch, not a performance fix. Unvalidated exclusion snapshot is design-blocked; original-only diagnostics, not comparative no-gain.'",
    "qualification = 'Unchanged independent baseline branch, not a performance fix. Two compatible constant-factor specializations evaluated in three actual pairs: no justified gain. Both proposal/test snapshots and all unfavorable results retained in immutable evidence; no shipping source/test change recommended.'");
  save(record, content);
}
{
  const record = template('publish-results');
  let content = one(record.content, 'Publish SignalR broadcast exclusion snapshot rejection and original-only diagnostics',
    'Publish targeted SignalR membership no-gain comparisons and native contract evidence');
  content = one(content, 'no shipping fix, performance PR or gain claim.', 'two tested variants, three comparisons, no shipping fix or performance-win PR.');
  save(record, content);
}
{
  const record = template('package');
  let content = record.content;
  const start = content.indexOf('if (-not $audit.auditPassed');
  const end = content.indexOf('$copies = ', start);
  assert(start >= 0 && end > start);
  content = content.slice(0, start) + `if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.proposalDisposition -cne 'no-gain' -or -not $audit.budgetClosed -or
    $audit.pairedComparisons -ne 3 -or $audit.originalProfiles -ne 3 -or $audit.candidateProfiles -ne 3 -or
    $audit.sourceCandidateShapesMeasured -ne 2 -or $audit.benchmarkOutcomes -ne 84 -or
    $audit.actualFreshOwningTestRuns -ne 3 -or $audit.actualFreshOwningRows -ne 84 -or
    -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or $source.performancePrCreated)
{
    throw 'Audited two-variant/three-comparison no-gain data and unchanged published source required.'
}
` + content.slice(end);
  content = one(content, "foreach ($role in 'original', 'captured-default-json')",
    "foreach ($role in 'original', 'captured-default-json', 'native-specialization-001', 'native-specialization-001-current-json', 'native-specialization-002', 'native-specialization-002-current-json')");
  content = one(content,
    "Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual original timestamps/outcomes; they did not run again under F013. Every fresh .NET shell activates `. .\\activate.ps1` from `C:\\src\\aspnetcore`. One actual original-only 12-case profile completed; zero paired comparisons/candidate profiles, no shipping fix or improvement percentage. These guarded historical commands preserve actual paths, not replay/overwrite instructions.",
    "Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual timestamps/outcomes and were not rerun. Fresh unchanged-original and each candidate actually ran28 rows. Every fresh .NET shell activates `. .\\activate.ps1` from `C:\\src\\aspnetcore`. Three actual14-case comparisons: variant1 once, array-only variant2 twice, six profiles total. No shipping fix or selected gain. Budget permanently closed. These guarded historical commands preserve actual paths, not replay/overwrite instructions.");
  content = one(content,
    "$records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } else { @($data) }",
    "$records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } elseif ($data.profiles) { @($data.profiles) } else { @($data) }");
  content = one(content,
    "Original investigation final-metadata reader exits1 on an invalid nested Windows drive path after source captures; corrected reader resumes byte-identical captures. Audit-scaffold reader expects LF but actual template has540 CRLFs; exact failed source/observations retained, original tool stderr not separately redirected. Corrected scaffold logged. Four new F013 native commands exit0: one restore, one build, two complete independent broadcast characterizations. Original F01127-row owning-suite and current JSON producer bytes are explicitly reused/rehashed, not rerun/rebuilt. Repository JSON outputs unchanged. One new12-shape original-only profile, no paired comparisons or F011 timing reuse.",
    "One new preservation-test helper was initially placed inside an existing method: test build exits1 with CS1513/CS1519, before any owning test/assertion. Exact failed source/log/binlog hash retained; premature test-run plan marker explicitly qualified. Distinct corrected original attempt passes28 rows. Both candidate suites pass28 rows each. Two auditor readers exit1 on actual-row schema and exact padding-ID expectations, then corrected independent audit passes; exact failed sources/full stderr retained. Preparation:17 actual native commands,16 successful/one failed build, plus4 successful changed-file whitespace checks; six independent18+14 producer contexts. First original successful runner has one display-only interpolation typo; actual TRX/audit correct. Original owner/current JSON and initial old27-row evidence explicitly reused/rehashed, not new builds/runs. Three actual comparisons, no borrowed group/broadcast timing. Twenty source files restored byte-exact and eight known output identities verified; six files actually restored, no new test/build claimed.");
  content = one(content,
    "Copied source/TRX/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.",
    "Copied source/111 separated fresh-borrowed TRX rows/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.");
  const verificationStart = content.indexOf('[ordered]@{\n    candidate =');
  const verificationEnd = content.indexOf('$files = @(', verificationStart);
  assert(verificationStart >= 0 && verificationEnd > verificationStart);
  content = content.slice(0, verificationStart) + `[ordered]@{
    candidate = 'F013'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true
    proposal_disposition = 'no-gain'; performance_pr_created = $false; shipping_source_changed = $false
    source_candidate_shapes = $audit.sourceCandidateShapesMeasured; paired_comparisons = $audit.pairedComparisons
    original_profiles = $audit.originalProfiles; candidate_profiles = $audit.candidateProfiles; original_only_profiles = 0
    benchmark_reports = $audit.benchmarkOutcomes; raw_actual_iterations = $audit.actualWorkloadIterations
    retained_results = $audit.retainedResults; upper_filtered_samples = $audit.upperFilteredSamples
    actual_warmups = $audit.actualWarmups; actual_overheads = $audit.actualOverheadIterations
    actual_fresh_owning_test_runs = $audit.actualFreshOwningTestRuns; actual_fresh_owning_rows = $audit.actualFreshOwningRows
    explicitly_reused_original_area_rows = $audit.explicitlyReusedOriginalAreaRows; repository_sentinel_rows = 0
    producer_records = $audit.producerRecordsAudited; validated_benchmark_records = $audit.validatedBenchmarkRecordsAudited
    actual_setup_preflights = $audit.actualTimedSetupPreflightsAudited; source_snapshots = $audit.sourceSnapshotsVerified
    pe_pdb_witnesses = $audit.pePdbBindings; source_document_checks = $audit.sourcePdbDocumentChecks
    settings_records = $audit.capturedSettingsRecords; observed_allocation_changes = $audit.observedProcessWideAllocationChanges
    omitted_entries = $omissions.Count; raw_dll_pdb_build_images_binlogs_published = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
` + content.slice(verificationEnd);
  save(record, content);
}
const attributes = path.join(session, 'F013-package-gitattributes.txt');
assert(!fs.existsSync(attributes));
fs.copyFileSync(path.join(session, 'F012-package-gitattributes.txt'), attributes);
fs.writeFileSync(path.join(session, 'autoperf-runs', 'F013', 'publication-tools-provenance.json'), JSON.stringify({
  candidate: 'F013', checkedTemplateAdaptations: records,
  qualification: 'Prior fork-only guarded transport/packaging scaffolding adapted at checked seams. All F013 comparison/source-variant/fresh-test/audit values and command collection are independent; no F012 original-only counters or rejection disposition reused.',
}, null, 2) + '\n');
console.log('F013 publication tools prepared: three checked adaptations, independent no-gain guards and derived capsule counts; nothing published yet.');
