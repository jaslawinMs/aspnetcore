import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [directory, mode] = process.argv.slice(2);
assert.ok(directory && ['--write', '--verify'].includes(mode), 'Explicit evidence directory and --write/--verify required.');
const root = path.resolve(directory);
const read = name => fs.readFileSync(path.join(root, name));
const json = name => JSON.parse(read(name).toString().replace(/^\uFEFF/, ''));
const provenance = json('provenance.json');
const metadata = json('upstream-pr-metadata.json');
const response = json('upstream-owner-response.json');
const before = read('baseline-owner.cs');
const after = read('upstream-owner.cs');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
for (const [bytes, identity] of [[before, provenance.baseline_source], [after, provenance.upstream_source]])
{
    assert.equal(bytes.length, identity.bytes);
    assert.equal(sha256(bytes), identity.sha256);
    assert.equal(blob(bytes), identity.git_blob);
}
assert.ok(after.equals(Buffer.from(response.content, 'base64')), 'Source must equal the actual API blob bytes.');
assert.equal(response.sha, provenance.upstream_source.git_blob);
assert.equal(metadata.headRefOid, provenance.upstream_head);
assert.equal(metadata.state, 'OPEN');
assert.equal(metadata.changedFiles, provenance.upstream_files_retrieved);
assert.equal(provenance.tracking_branch_commit, provenance.baseline_commit);
assert.equal(provenance.proposed_source_changes, 0);
assert.equal(provenance.new_measured_comparisons, 0);
assert.equal(provenance.benchmark_gain_claimed, false);
assert.equal(read('baseline-main-ref.txt').toString().trim(), `${provenance.baseline_commit}\trefs/heads/main`);
const finding = json('finding.json');
assert.equal(finding.id, provenance.candidate);
assert.equal(finding.finding.file, provenance.source_path);
assert.equal(finding.finding.card_id, 'roundtrip-through-throwaway-intermediate');
const normalized = bytes => bytes.toString().replace(/\r\n/g, '\n');
const extract = (text, start, end, last = false) =>
{
    const first = last ? text.lastIndexOf(start) : text.indexOf(start);
    const limit = text.indexOf(end, first);
    assert.ok(first >= 0 && limit > first, 'Exact inspected source region required.');
    return { line: text.slice(0, first).split('\n').length, text: text.slice(first, limit) };
};
let original;
let proposed;
let seam;
if (provenance.candidate === 'F075')
{
    seam = 'typed component parameter branch;not top-level SerializedRenderFragment';
    const start = 'var value = (JsonElement)parameterValues[i];';
    const end = 'parametersDictionary.Add(definition.Name, parameterValue);';
    original = extract(normalized(before), start, end, true);
    proposed = extract(normalized(after), start, end, true);
    assert.ok(original.text.includes('value.GetRawText(),'));
    assert.ok(original.text.includes('parameterType,'));
    assert.ok(original.text.includes('ServerComponentSerializationSettings.JsonSerializationOptions'));
    assert.ok(proposed.text.includes('var typeInfo = _jsonOptions.GetTypeInfo(parameterType);'));
    assert.ok(proposed.text.includes('parameterValue = JsonSerializer.Deserialize(value, typeInfo);'));
    assert.ok(!proposed.text.includes('GetRawText'));
    assert.equal((normalized(before).match(/GetRawText\(\)/g) ?? []).length, 2);
    assert.equal((normalized(after).match(/GetRawText\(\)/g) ?? []).length, 1,
        'Independent F074 top-level intermediate remains in the upstream owner.');
}
else
{
    assert.equal(provenance.candidate, 'F076');
    seam = 'nested SerializedRenderFragment attribute JsonElement arm;not typed value conversion';
    const start = 'var serialized = attr.Value switch';
    const end = 'return Deserialize(serialized!.Nodes';
    original = extract(normalized(before), start, end);
    proposed = extract(normalized(after), start, end);
    assert.ok(original.text.includes('JsonSerializer.Deserialize<SerializedRenderFragment>(je.GetRawText(), jsonOptions)'));
    assert.ok(proposed.text.includes('JsonElement je => JsonSerializer.Deserialize('));
    assert.ok(proposed.text.includes('je,'));
    assert.ok(proposed.text.includes('jsonOptions!.GetTypeInfo(typeof(SerializedRenderFragment))) as SerializedRenderFragment'));
    assert.ok(!proposed.text.includes('GetRawText'));
    assert.ok(original.text.includes('SerializedRenderFragment sf => sf,'));
    assert.ok(proposed.text.includes('SerializedRenderFragment sf => sf,'));
}
const diff = read('upstream-owner-diff.txt').toString();
assert.ok(diff.split('\n').some(line => line.startsWith('-') && line.includes('GetRawText()')),
    'Actual scoped REST diff must include the observed intermediate removal.');
const audit = {
    candidate: provenance.candidate,
    source_only: true,
    exact_named_allocation_opportunity_in_active_upstream_proposal: true,
    inspected_seam: seam,
    baseline_line: original.line,
    upstream_line: proposed.line,
    baseline_source: provenance.baseline_source,
    upstream_source: provenance.upstream_source,
    baseline_commit: provenance.baseline_commit,
    upstream_head: provenance.upstream_head,
    upstream_diff_base: provenance.upstream_diff_base,
    source_snapshot_and_api_git_blob_bytes_equal: true,
    upstream_state_at_capture: metadata.state,
    proposed_source_changes: 0,
    measured_comparisons: 0,
    entire_77_file_proposal_behavior_equivalence_or_approval_claimed: false,
    performance_gain_claimed: false,
};
const expected = Buffer.from(JSON.stringify(audit, null, 2) + '\n');
if (mode === '--write')
{
    fs.writeFileSync(path.join(root, 'source-audit.json'), expected);
}
else
{
    assert.ok(read('source-audit.json').equals(expected), 'Derived overlap audit must reproduce exactly.');
}
console.log(`${provenance.candidate}:exact scoped source overlap verified;0 source changes,0 comparisons,no benchmark or full-proposal equivalence claim.`);
