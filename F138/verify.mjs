import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(process.argv[2] && !process.argv[2].startsWith('--')
    ? process.argv[2] : fileURLToPath(new URL('.', import.meta.url)));
const physical = (base, logical) => path.join(base, ...logical.replaceAll('\\', '/').split('/'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const owner = path.join(directory, 'owner-handoff');
function inventory(current, relative = '')
{
    return fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(current, entry.name), logical) : [logical];
    });
}
assert.equal(hash(path.join(owner, 'MANIFEST.json')), 'D0273C0482DF6B7F1C78917C678EAA5A4BF9BDDEA2EFE72D12844112355DCD19');
const manifest = read(path.join(owner, 'MANIFEST.json'));
assert.equal(manifest.files.length, 241);
for (const item of manifest.files)
{
    const file = physical(owner, item.path);
    assert.equal(fs.statSync(file).size, item.bytes, item.path);
    assert.equal(hash(file), item.sha256.toUpperCase(), item.path);
}
assert.deepEqual(inventory(owner).sort(), [...manifest.files.map(item => item.path.replaceAll('\\', '/')), 'MANIFEST.json', 'MANIFEST.sha256'].sort());
for (const item of read(path.join(directory, 'authoritative-copies.json')))
{
    const file = physical(directory, item.file);
    assert.equal(fs.statSync(file).size, item.bytes, item.file);
    assert.equal(hash(file), item.sha256, item.file);
}
const accepted = read(path.join(directory, 'coordinator-acceptance.json'));
assert.equal(accepted.finalDisposition, 'rejected');
assert.equal(accepted.subtype, 'uniqueness-preserving-metadata-benefit-unestablished');
assert.equal(accepted.actualSelectedCapsuleFilesIndependentlyRehashed, 243);
assert.equal(accepted.actualSelectedCapsuleBytes, 11730526);
assert.equal(accepted.actualNoCandidateAppliedOrComparisonAuthorized, true);
assert.equal(accepted.actualCopiedCapsuleDeepAudit.actualExitCode, 0);
assert.equal(accepted.actualCopiedCapsuleDeepAudit.actualResult.pass, true);
const originalAudit = read(path.join(directory, 'coordinator-owner-audit.json'));
assert.equal(originalAudit.actualAuditorResult.pass, true);
assert.equal(originalAudit.actualAuditorResult.capsuleFilesChecked, 241);
assert.equal(originalAudit.externalOmittedTreesFreshlyRehashed, false);
const facts = read(path.join(owner, 'facts.json'));
assert.equal(facts.officialState, 'PENDING');
assert.equal(facts.sourceRewriteApplied, false);
assert.equal(facts.candidateAdopted, false);
assert.equal(facts.performanceMeasurements, false);
assert.equal(facts.commonConsumer.languageVersion, '13.0');
assert.equal(facts.commonConsumer.runtime, '12.0.0-alpha.1.26568.110');
assert.equal(facts.commonConsumer.rawSourceDocuments.length, 4);
for (const item of facts.commonConsumer.files)
{
    assert.equal(hash(path.join(owner, 'consumer', 'built', path.win32.basename(item.path))), item.sha256);
}
for (const role of ['baseline', 'default'])
{
    assert.deepEqual(facts.existingTests[role], { Passed: 105, NotExecuted: 2 });
    const rows = read(path.join(owner, 'results', role + '-producer', 'assertions.json'));
    assert.equal(rows.length, 29);
    assert.ok(rows.every(row => row.pass));
    assert.equal(rows.filter(row => row.name === 'isolated-public-metadata-multiple-control').length, 1);
    const boundary = read(path.join(owner, 'results', role + '-producer', 'source-role-boundary.json'));
    assert.equal(boundary.passes, true);
    assert.deepEqual(boundary.nonRoleFrameworkAssemblies, []);
}
const sources = read(path.join(owner, 'source-catalog.json'));
assert.equal(sources.length, 66);
for (const source of sources)
{
    const raw = fs.readFileSync(physical(owner, source.snapshot));
    const lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex').toUpperCase(), source.rawSha256);
    assert.equal(crypto.createHash('sha1').update(`blob ${lf.length}\0`).update(lf).digest('hex'), source.gitBlobSha1);
}
const first = new Map(read(path.join(owner, 'results', 'baseline-execution-images.json')).map(item => [item.key, item.sha256]));
const second = new Map(read(path.join(owner, 'results', 'default-execution-images.json')).map(item => [item.key, item.sha256]));
const comparison = read(path.join(owner, 'image-comparison.json'));
const keys = [...new Set([...first.keys(), ...second.keys()])].sort();
assert.equal(keys.length, 626);
assert.deepEqual(comparison.entries.map(item => item.key).sort(), keys);
assert.deepEqual(comparison.prefixExclusions, []);
assert.deepEqual(comparison.counts, { same: 330, different: 296 });
for (const item of comparison.entries)
{
    assert.equal(item.baselineSha256, first.get(item.key) ?? null, item.key);
    assert.equal(item.defaultSha256, second.get(item.key) ?? null, item.key);
    assert.equal(item.status, first.get(item.key) === second.get(item.key) ? 'same' : 'different', item.key);
}
assert.equal(comparison.nonOwnerDifferences.length, 295);
const budget = read(path.join(directory, 'closed-budget.json'));
assert.equal(budget.findingId, 'F138');
assert.equal(budget.closed, true);
assert.equal(budget.maximumAuthorizations, 3);
assert.deepEqual(budget.authorizations, []);
const sealPath = path.join(directory, 'capsule-file-hashes.json');
if (process.argv.includes('--require-seal'))
{
    assert.ok(fs.existsSync(sealPath));
}
if (fs.existsSync(sealPath))
{
    const seal = read(sealPath);
    for (const item of seal.files)
    {
        assert.equal(hash(physical(directory, item.file)), item.sha256.toUpperCase(), item.file);
        assert.equal(fs.statSync(physical(directory, item.file)).size, item.bytes, item.file);
    }
    const expected = [...seal.files.map(item => item.file), 'capsule-file-hashes.json'];
    if (fs.existsSync(path.join(directory, 'publication.json')))
    {
        expected.push('publication.json');
    }
    assert.deepEqual(inventory(directory).sort(), expected.sort());
}
console.log(JSON.stringify({ passed: true, finding: 'F138', disposition: 'rejected',
    actualSelectedCapsuleFilesChecked: 243, actualSavedExistingRows: 214, actualSavedExistingPassed: 210,
    actualPreexistingSkippedRows: 4, actualProducerAssertions: 56, actualIsolatedMultiplicityControls: 2,
    actualAllExecutableImageEntriesCompared: 626, actualNonOwnerDifferences: 295,
    actualSourcePePdbAndXmlFreshlyParsedByThisNodeAudit: false,
    actualIndependentDeepPythonAuditsRetainedAndPassed: true, actualNewComparisons: 0,
    boundary: 'Copied hashes, saved facts, raw/Git sources and every inventoried executable-image entry; selected binary/XML parsing is reproducible with owner-handoff/audit_capsule.py. Two named skipped scenarios, full compiler inputs and omitted complete image/tree closure remain unverified.',
    sealed: fs.existsSync(sealPath) }, null, 2));
