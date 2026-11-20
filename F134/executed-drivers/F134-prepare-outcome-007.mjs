import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F134-006');
const run = path.join(session, 'autoperf-runs', 'F134');
const target = path.join(session, 'autoperf-published-results', 'F134');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false); assert.equal(fs.existsSync(target), false);
assert.equal(hash(path.join(input, 'manifest.json')), '5EC386F62220CBB93F121CA7A9AD13D86322772A5CB360C2A04C914D1C1C4395');
const manifest = read(path.join(input, 'manifest.json'));
assert.equal(manifest.files.length, 837);
const copies = [], omitted = [];
fs.mkdirSync(run); fs.mkdirSync(target);
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
let bytes = 0;
function copy(source, relative)
{
    const info = { file: relative.replaceAll('\\', '/'), bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source };
    if (/\.(dll|pdb|exe|cache|binlog)$/i.test(source)) { omitted.push(info); return; }
    const destination = path.join(target, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), info.sha256);
    copies.push(info);
}
for (const file of manifest.files)
{
    const source = path.join(input, file.path);
    assert.equal(fs.statSync(source).size, file.bytes);
    assert.equal(hash(source).toLowerCase(), file.sha256);
    bytes += file.bytes;
    copy(source, path.join('owner-handoff', file.path));
}
for (const file of ['manifest.json', 'manifest.sha256']) { copy(path.join(input, file), 'owner-handoff/' + file); }
for (const file of ['F134-prepare-outcome-007.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
const codePath = 'src/Hosting/TestHost/src/WebSocketClient.cs', identities = [];
for (const revision of ['37e809ead5824bc753a1c3d56f11615bdb1296c5', 'ae89581dfd24c6277b4267a9779d05f7b9f047f1', '00560e2dd1954a2acf2bc54b35422b0f32484bf1'])
{
    const actualGitBlob = revision.startsWith('00560')
        ? execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'], { encoding: 'utf8', windowsHide: true }).trim()
        : execFileSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'rev-parse', revision + ':' + codePath], { encoding: 'utf8', windowsHide: true }).trim();
    identities.push({ revision, path: codePath, actualGitBlob });
}
assert.equal(new Set(identities.map(row => row.actualGitBlob)).size, 1);
write(path.join(target, 'coordinator-acceptance.json'), { recordedAt: new Date().toISOString(),
    actualFrozenPayloadFilesIndependentlyRehashed: manifest.files.length, actualFrozenPayloadBytes: bytes,
    actualFrozenManifestSha256: hash(path.join(input, 'manifest.json')), actualFrozenManifestNotEdited: true,
    boundedTargetGitIdentities: identities, targetFreshnessBoundary: 'Target file identity only, not a complete later00560 framework rebuild.',
    finalDisposition: 'rejected', subtype: 'material-optimization-unestablished',
    actualNoCandidateAppliedOrComparisonAuthorized: true, actualNoMeasuredNoGainOrJitEquivalenceClaim: true,
    rationale: 'Real owned List<string>, selected loaded LINQ image and its ICollection<T>.Count fast path do not establish the proposed enumeration/allocation mechanism. Residual dispatch/inlining cost is unmeasured; no material optimization proposal is established. This is not a literal no-op or zero-cost proof.' });
const budget = { findingId: 'F134', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(), closureReason: 'No material optimization established for the genuine owned List and observed Count-fast-path runtime; no candidate or comparison admitted. Not measured no-gain or proof of zero residual cost.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
write(path.join(target, 'authoritative-copies.json'), copies);
write(path.join(target, 'omitted-file-hashes.json'), { files: omitted,
    boundary: 'Exact compiled-image/build-cache hashes retained, source/probes/commands/JSON/TRX copied. Existing pinned owner/dependency/runtime inputs required; no turnkey fresh-clone claim.' });
write(path.join(run, 'publication-config.json'), {
    folder: 'F134', run, expectedParentIndex: '38de088606da9d9d54d476a926ebf365f99d7aa7', performancePrAuthorized: false,
    subtype: 'material-optimization-unestablished', authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F134] No material List emptiness optimization established',
    issueSearch: 'F134 in:title',
    evidenceCommitTitle: 'Publish bounded WebSocket owned-List emptiness study',
    evidenceCommitDescription: 'Retain837-file frozen owner handoff,10 genuine producer rows per pin,6 exact default repository-test executions with all theory rows, selected PE/PDB/source associations and loaded LINQ Count-fast-path identity. Common harness compiled once and byte-identical;47other Original/default image differences correctly reject a causal performance pair. No candidate/comparison or measured no-gain, zero-cost or JIT-equivalence claim. Later00560 target identity is bounded, no full graph rebuild.',
    indexCommitTitle: 'Index unestablished WebSocket emptiness proposal',
    outcomes: [{
        id: 'F134', status: 'rejected',
        note: 'No material optimization proposal established for SubProtocols.Any on actual owned List<string>.10 real TestHost WebSocket cases/pin pass including negotiation/header/order/payload/close and error controls;6 exact existing default ae89581 test executions on65, not6perpin. Actual loaded LINQ3ABB77... selected Count fast path supports absence of proposed enumeration mechanism, not zero residual cost/JIT equality/empirical no-gain.837 frozen payload files independently rehashed. Common consumer compiled once,4files byte-identical;47nonowner Original/default differences correctly prohibit causal timing. Target Git blob unchanged at00560; no complete later graph rebuild. Zero candidate changes/comparisons; closed0of3budget.',
        readmeRow: '| F134 | Not admitted: no material optimization established for the real owned List and loaded LINQ Count fast path.10 producer cases/pin,6 exact default test executions; residual cost unmeasured, not measured no-gain.0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [WebSocket emptiness evidence](F134/README.md), [verified publication](F134/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualCopiedFiles: copies.length, actualIndividuallyHashedOmissions: omitted.length, actualVerifiedPayloadFiles: manifest.files.length, actualVerifiedPayloadBytes: bytes, identities }, null, 2));
