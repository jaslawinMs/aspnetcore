import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const capsule = path.join(session, 'autoperf-published-results', 'F142');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(capsule), false);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).closed, true);
assert.equal(read(path.join(run, 'measurement-decision.json')).actualPredeclaredUsefulGainGatePassed, true);
fs.mkdirSync(capsule);
fs.writeFileSync(path.join(capsule, '.gitattributes'), '* -text\n', { flag: 'wx' });
const copies = [], omitted = [];
function copyTree(source, relative)
{
    const stat = fs.lstatSync(source);
    assert.equal(stat.isSymbolicLink(), false);
    if (stat.isDirectory())
    {
        for (const item of fs.readdirSync(source).sort()) { copyTree(path.join(source, item), path.join(relative, item)); }
        return;
    }
    const segments = relative.split(path.sep);
    const exclude = segments.some(item => /^(consumer|measurement-consumer|dependencies|generator|owner-bin|bin|build|obj(?:-.*)?|Original-consumer|Candidate-consumer)$/.test(item))
        || !/\.(json|txt|cs|csproj|ps1|mjs|md|trx|xml|config)$/i.test(source);
    const metadata = { file: relative.replaceAll('\\', '/'), bytes: stat.size, sha256: hash(source) };
    if (exclude) { omitted.push(metadata); return; }
    const target = path.join(capsule, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(target), metadata.sha256);
    copies.push({ ...metadata, actualSourcePath: source });
}
const files = [
    'canonical-characterization-plan.json', 'canonical-characterization-plan-seal.json',
    'canonical-preflight-005-verification.json', 'canonical-preflight-003-setup-correction.json',
    'plan.json', 'plan-seal.json', 'diagnostic-budget.json', 'measurement-decision.json',
    'accepted-images.json', 'accepted-images-seal.json', 'local-quiescence-001.json', 'benchmark-request-001.json'
];
for (const file of files) { copyTree(path.join(run, file), file); }
for (const entry of fs.readdirSync(run).filter(name =>
    /^canonical-(preflight-(?:inputs-)?00[1-5]|candidate-001|preparation-001|reference-diagnostic-003)$/.test(name)
    || ['comparisons', 'existing-tests', 'reconstruction-paired-001', 'lease-interop-probe-001'].includes(name)))
{
    copyTree(path.join(run, entry), entry);
}
copyTree(path.join(run, 'canonical-preflight-inputs-005'), 'harness');
for (const name of [
    'F142-compare.mjs', 'F142-seal-measurement-plan.mjs', 'F142-accept-candidate-images.mjs',
    'F142-evaluate-closed-comparisons.mjs', 'F142-accept-generated-snapshots.mjs', 'F142-reconstruct-untimed.ps1',
    'F142-build-capsule.mjs'
])
{
    copyTree(path.join(session, name), path.join('executed-drivers', name));
}
copyTree(path.join(session, 'autoperf-runs', 'F142-common', 'Invoke-MeasurementChild.ps1'), path.join('executed-drivers', 'Invoke-MeasurementChild.ps1'));
for (const name of ['Invoke-AutoPerfBenchmark.ps1', 'Invoke-AutoPerfBenchmark-before-native-reader-006.ps1', 'policy-before-F142-driver-006.json'])
{
    copyTree(path.join(session, 'autoperf-parallelism', name), path.join('executed-drivers', name));
}
const events = fs.readFileSync(path.join(session, 'autoperf-parallelism', 'benchmark-gate-events.jsonl'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const tokens = new Set(events.filter(event => event.findingId === 'F142').map(event => event.token).filter(Boolean));
write(path.join(capsule, 'actual-exclusive-gateway-events.json'), events.filter(event => tokens.has(event.token)));
const sourceFile = 'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs';
fs.mkdirSync(path.join(capsule, 'source'));
for (const [label, revision] of [['Original', '37e809ead5824bc753a1c3d56f11615bdb1296c5'],
    ['Candidate-measured', 'c663c44e4d0e1d5bed71200ab191a728f9f9c5d9'], ['Candidate-final', '81222347869a8c7dcd504f22b2234f9a126265f4']])
{
    fs.writeFileSync(path.join(capsule, 'source', label + '.Emitter.cs'),
        execFileSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'show', revision + ':' + sourceFile]), { flag: 'wx' });
}
assert.equal(hash(path.join(capsule, 'source', 'Candidate-measured.Emitter.cs')), hash(path.join(capsule, 'source', 'Candidate-final.Emitter.cs')));
fs.writeFileSync(path.join(capsule, 'source-commit.txt'), '81222347869a8c7dcd504f22b2234f9a126265f4\n', { flag: 'wx' });
write(path.join(capsule, 'source-qualification.json'), {
    measuredCandidate: 'c663c44e4d0e1d5bed71200ab191a728f9f9c5d9', finalCandidate: '81222347869a8c7dcd504f22b2234f9a126265f4',
    actualEmitterGitBytesIdenticalBetweenMeasuredAndFinal: true, finalCommitOnlyAdds17RequiredExpectedSnapshotUpdates: true,
    sourceCopies: 'Exact Git LF blobs, not claims that Git encoding alone attests compiler/PDB inputs.',
    actualSourcePublishedOnlyToFork: 'jaslawinMs/aspnetcore', actualPRBaseCommit: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualNoPublicOrProtectedFrameworkAPIChange: true, currentDefaultCheckedBeforeImplementation: 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
});
write(path.join(capsule, 'authoritative-copies.json'), copies);
write(path.join(capsule, 'omitted-file-hashes.json'), { reason: 'Compiled images, restore/intermediate graphs and non-source outputs omitted; hashes retained. Reconstructed common project reuses measured generated-owner/dependency images; turnkey byte-identical fresh-clone rebuilding is not promised.', files: omitted });
write(path.join(run, 'canonical-capsule-preparation.json'), { recordedAt: new Date().toISOString(), actualCopiedFiles: copies.length,
    actualIndividuallyHashedOmittedFiles: omitted.length, capsule, actualSourceCodeAndFrozenHistoryUnchanged: true });
console.log(JSON.stringify({ actualCopiedFiles: copies.length, actualIndividuallyHashedOmittedFiles: omitted.length, capsule }));
