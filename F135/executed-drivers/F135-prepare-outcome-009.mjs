import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F135-publication-008');
const run = path.join(session, 'autoperf-runs', 'F135');
const target = path.join(session, 'autoperf-published-results', 'F135');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(target).sort(), ['README.md', 'verify.mjs']);
assert.equal(hash(path.join(input, 'manifest.json')), '09324EECAB55082C39E27CD33104456D76601093C211709FF3EBEBBC39918482');
const manifest = read(path.join(input, 'manifest.json')), copies = [];
assert.equal(manifest.files.length, 206);
fs.mkdirSync(run);
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
let total = 0;
for (const item of [...manifest.files, ...['manifest.json', 'manifest.sha256'].map(file => ({ path: file, bytes: fs.statSync(path.join(input, file)).size, sha256: hash(path.join(input, file)) }))])
{
    const source = path.join(input, item.path), destination = path.join(target, 'owner-handoff', item.path);
    assert.equal(fs.statSync(source).size, item.bytes);
    assert.equal(hash(source), item.sha256);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), item.sha256);
    copies.push({ file: 'owner-handoff/' + item.path.replaceAll('\\', '/'), bytes: item.bytes, sha256: item.sha256, actualSourcePath: source });
    total += item.bytes;
}
assert.equal(copies.length, 208);
const audits = [];
for (const extra of [[], ['--self-test']])
{
    const result = spawnSync(process.execPath, [path.join(target, 'owner-handoff', 'audit.cjs'), ...extra],
        { encoding: 'utf8', windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    audits.push({ actualCommand: ['node', 'owner-handoff/audit.cjs', ...extra], actualExitCode: result.status,
        actualStdout: result.stdout, actualStderr: result.stderr, actualResult: JSON.parse(result.stdout.trim()) });
}
const codePath = 'src/Middleware/OutputCaching/src/CacheVaryByRules.cs';
const live = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.match(live, /^[a-f0-9]{40}$/);
const identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', '00560e2dd1954a2acf2bc54b35422b0f32484bf1', live])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    identities.push({ revision, path: codePath, actualGitBlob: blob });
}
assert.equal(new Set(identities.map(item => item.actualGitBlob)).size, 1, 'Reconsider the bounded verdict if live target source changed.');
write(path.join(target, 'coordinator-acceptance.json'), { recordedAt: new Date().toISOString(),
    actualSelectedCapsuleFilesIndependentlyRehashed: 208, actualSelectedCapsuleBytes: total,
    actualSelectedCapsuleManifestSha256: hash(path.join(input, 'manifest.json')),
    actualOriginalPreparationManifestSha256: '52CF17772FB82EC9E18C81E50924C753818771D6BEBB84D91E72B623821F6C09',
    actualOriginalPreparationFiles: 38648, actualEntireOriginalPayloadRehashedByCoordinator: false,
    actualSelectedCapsuleNotEdited: true, actualCopiedCapsuleAudits: audits,
    actualLoadedAssociationsHistoricallyChecked: 118, actualMiddlewareRows: 54, actualExistingTestExecutions: 6,
    actualSourcePePdbAssociationsHistoricallyChecked: 10, actualPhysicalAndGitSourceAssociations: 36,
    actualNonOwnerOriginalDefaultDifferences: 67, actualCausalPerformancePairAdmitted: false,
    boundedTargetGitIdentities: identities, actualLaterObservedMain: live,
    targetFreshnessBoundary: 'Target file identity only. Existing separately characterized graphs remain Original37 and observed00560; no complete later framework rebuild.',
    finalDisposition: 'rejected', subtype: 'material-optimization-unestablished',
    actualNoCandidateAppliedOrComparisonAuthorized: true, actualNoMeasuredNoGainOrJitEquivalenceClaim: true,
    rationale: 'Real owned Dictionary<string,string> implements ICollection<KeyValuePair<string,string>>; the actually selected loaded LINQ image records its Count fast path before enumeration. The claimed enumeration/allocation mechanism is not established. Residual dispatch/inlining cost is unmeasured, not empirically zero.',
    boundary: 'Portable acceptance verifies copied hashes/metadata and raw existing console/host/producer reports. Omitted PE/PDB/runtime bytes are not freshly parsed/rehash-attested; fullCompilerInputAttestation remains false.' });
const budget = { findingId: 'F135', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(), closureReason: 'No material optimization established for the genuine owned Dictionary and selected Count-fast-path LINQ image. No candidate/comparison admitted; residual cost unmeasured, not measured no-gain or zero-cost/JIT proof.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
for (const file of ['F135-prepare-outcome-009.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    const source = path.join(session, file), destination = path.join(target, 'executed-drivers', file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    copies.push({ file: 'executed-drivers/' + file, bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source });
}
write(path.join(target, 'authoritative-copies.json'), copies);
write(path.join(run, 'publication-config.json'), { folder: 'F135', run,
    expectedParentIndex: 'd12ebb832121983570e71a9cfafa638c98bc2d0c', performancePrAuthorized: false,
    subtype: 'material-optimization-unestablished', authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F135] No material cache-value dictionary emptiness optimization established',
    issueSearch: 'F135 in:title',
    evidenceCommitTitle: 'Publish bounded output-cache dictionary emptiness study',
    evidenceCommitDescription: 'Preserve208-file selected capsule of38648-file preparation seal,54real middleware/store/cache-replay rows and6exact existing console test executions. Both producers run68;Originalexistingtests62 andDefault68 distinguished.118loadedassociations,36physical/Gitsources,10historicalsourcePDBbindings;193imageentries/pin,67nonownerdifferences prohibitcausal timing. Actual selected LINQ Count fast path does not establish proposed enumeration/allocation mechanism; residual cost unmeasured, no empirical no-gain/JIT/zerocost claim. All failures and omittedbinary limits retained, fullcompilerattestationfalse. Zero candidate/comparison, fixed report unchanged.',
    indexCommitTitle: 'Index unestablished output-cache dictionary emptiness proposal',
    outcomes: [{ id: 'F135', status: 'rejected',
        note: 'No material optimization proposal established for real owned Dictionary<string,string> HasVaryByValues.Any(). Actual registered UseOutputCache/policies/key/store/response-replay yield27real rows perOriginal37/observed00560;118loadedassociations and36physical/Git source associations checked. Original3existingtests on62,Default3on68;bothproducerprobes on68,not conflated. Actual loaded LINQ2D478D... staticICollection<T>.Count fastpath plus genuine Dictionary interface do not establish the proposed enumeration/allocation mechanism; residualdispatch cost unmeasured,not zero/JITequivalence or measuredno-gain. Common consumer4files compiledonce/identical;193entries/pin,69differences(67nonowner)prohibit causal pair.208selectedfiles independentlyrehashed;original38648seal preserved but entireoldpayloadnotfreshlyrehashed;PEPDBbinaryidentity historicalreceipts,fullcompilerattestationfalse. Defaultnull kept distinct from deliberatelyempty/clearedcontrols. No candidate or comparison;closed0of3budget;targetGitfreshnessbounded,no laterfullgraphrebuild.',
        readmeRow: '| F135 | Not admitted: no material optimization established for genuine output-cache Dictionary and selected LINQ Count fast path; residual cost unmeasured, not measured no-gain.54 real middleware rows,6 exact existing tests with62/68 distinction,67 non-owner differences reject causal pairing;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Dictionary emptiness evidence](F135/README.md), [verified publication](F135/publication.json) |' }] });
console.log(JSON.stringify({ actualCopiedSelectedFiles: 208, actualCopiedFilesIncludingDrivers: copies.length,
    actualSelectedBytes: total, actualPortableAudits: audits.map(item => item.actualResult),
    actualZeroComparisonBudgetPermanentlyClosed: true, actualTargetIdentities: identities }, null, 2));
