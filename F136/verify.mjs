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
const manifestPath = path.join(owner, 'manifest.json');
assert.equal(hash(manifestPath), 'E614D6939FBAF342933B3F624AE5B08C9563DF061A5C2ADE994A756CF80B19B2');
assert.equal(hash(path.join(owner, 'CHECKSUMS.sha256')), '8E45B240288F01B49E3D9685C27EAA59497D0C8191DCC431E9B0FA514F69D208');
const manifest = read(manifestPath);
assert.equal(manifest.files.length, 233);

function inventory(current, relative = '')
{
    return fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(current, entry.name);
        return entry.isDirectory() ? inventory(file, logical) : [logical];
    });
}

for (const item of manifest.files)
{
    const file = physical(owner, item.path);
    assert.equal(fs.statSync(file).size, item.bytes, item.path);
    assert.equal(hash(file), item.sha256.toUpperCase(), item.path);
}
assert.deepEqual(inventory(owner).sort(),
    [...manifest.files.map(item => item.path.replaceAll('\\', '/')), 'manifest.json', 'CHECKSUMS.sha256'].sort());
for (const item of read(path.join(directory, 'authoritative-copies.json')))
{
    const file = physical(directory, item.file);
    assert.equal(fs.statSync(file).size, item.bytes, item.file);
    assert.equal(hash(file), item.sha256.toUpperCase(), item.file);
}
const accepted = read(path.join(directory, 'coordinator-acceptance.json'));
assert.equal(accepted.finalDisposition, 'rejected');
assert.equal(accepted.subtype, 'test-infrastructure-material-workload-unestablished');
assert.equal(accepted.actualSelectedCapsuleFilesIndependentlyRehashed, 235);
assert.equal(accepted.actualSelectedCapsuleBytes, 20121654);
assert.equal(accepted.actualNoCandidateAppliedOrComparisonAuthorized, true);
assert.equal(accepted.actualCopiedCapsuleDeepAudit.actualExitCode, 0);
assert.equal(accepted.actualCopiedCapsuleDeepAudit.actualResult.status, 'passed');
const originalAudit = read(path.join(directory, 'coordinator-owner-audit.json'));
assert.equal(originalAudit.actualAuditorResult.status, 'passed');
assert.equal(originalAudit.actualAuditorResult.sealedFiles, 233);
assert.equal(originalAudit.externalOmittedTreesFreshlyRehashed, false);
assert.equal(originalAudit.dotnetOrBenchmarkStarted, false);

const nativeTests = read(path.join(owner, 'test-results.json'));
assert.equal(nativeTests.length, 2);
for (const result of nativeTests)
{
    assert.equal(hash(path.join(owner, 'results', result.trx)), result.sha256.toUpperCase());
    assert.equal(result.rows.length, 5);
    assert.equal(new Set(result.rows.map(row => row.executionId)).size, 5);
    assert.equal(new Set(result.rows.map(row => row.testId)).size, 5);
    assert.equal(result.rows.filter(row => row.testName.includes('frameworkEndpoint: "/_framework/opaque-redirect"')).length, 1);
    assert.ok(result.rows.every(row => row.outcome === 'Passed'));
}
const expectedCases = ['MissingAndRepeatPreserveIdentity', 'PublicChangedStateReplacesWithoutCallbacks',
    'ExplicitReplacementAndOrdinalFilters', 'FileMutationDoesNotProduceTokenChanges', 'RealEndpointFixtureReadsFilesWithoutWatch'];
let selectedNativeSourceDocuments = 0;
const images = {};
for (const role of ['Original37', 'Default'])
{
    const result = read(path.join(owner, 'evidence', role + '-verify.json'));
    assert.equal(result.succeeded, true);
    assert.deepEqual(result.cases.map(item => item.name).sort(), [...expectedCases].sort());
    assert.ok(result.cases.every(item => item.outcome === 'Passed'));
    const actualConsumer = result.cases.find(item => item.name === 'RealEndpointFixtureReadsFilesWithoutWatch').detail;
    assert.equal(actualConsumer.watchReachedByThisSetup, false);
    assert.deepEqual(actualConsumer.providerOperations, ['GetFileInfo:TestApplication.modules.json']);
    assert.equal(actualConsumer.route, '/f136');
    assert.equal(actualConsumer.resource, 'default.css');
    const changed = result.cases.find(item => item.name === 'PublicChangedStateReplacesWithoutCallbacks').detail;
    assert.equal(changed.producer, 'public TestFileChangeToken.HasChanged setter');
    assert.equal(changed.callbacksInvoked, false);
    assert.equal(changed.callbackReentryObserved, false);
    assert.equal(result.cases.find(item => item.name === 'FileMutationDoesNotProduceTokenChanges').detail.fileMutationSignalsToken, false);
    assert.ok(result.runtimeDirectory.includes(role === 'Original37' ? '12.0.0-alpha.1.26562.105' : '12.0.0-alpha.1.26568.110'));
    selectedNativeSourceDocuments += result.selectedMetadata.reduce((sum, item) => sum + item.selectedDocuments.length, 0);
    images[role] = new Map(read(path.join(owner, 'inventories', 'image-' + role + '.json')).files.map(item => [item.path, item.sha256]));
}
assert.equal(selectedNativeSourceDocuments, 16);
const keys = [...new Set([...images.Original37.keys(), ...images.Default.keys()])].sort();
assert.equal(keys.length, 292);
assert.equal(keys.filter(key => images.Original37.get(key) === images.Default.get(key)).length, 185);
assert.equal(keys.filter(key => images.Original37.get(key) !== images.Default.get(key)).length, 107);
const comparison = read(path.join(owner, 'image-comparison.json'));
assert.equal(comparison.everyImageFileCompared, true);
assert.equal(comparison.futureCausalPair, false);
assert.deepEqual(comparison.exemptions, []);
assert.deepEqual(comparison.files, keys.map(key => ({
    path: key, Original37: images.Original37.get(key) ?? null, Default: images.Default.get(key) ?? null
})));
for (const name of ['F136Verify.dll', 'F136Verify.pdb', 'F136Verify.deps.json', 'F136Verify.runtimeconfig.json'])
{
    assert.ok(images.Original37.has(name));
    assert.equal(images.Original37.get(name), images.Default.get(name), name);
}
const sources = read(path.join(owner, 'source-identities.json'));
assert.equal(sources.length, 62);
for (const source of sources)
{
    assert.equal(source.lfNormalizedMatchesRepositoryBlob, true);
    assert.equal(source.rawMatchesRepositoryBlob, false);
}
const budget = read(path.join(directory, 'closed-budget.json'));
assert.equal(budget.findingId, 'F136');
assert.equal(budget.maximumAuthorizations, 3);
assert.equal(budget.closed, true);
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
        const file = physical(directory, item.file);
        assert.equal(fs.statSync(file).size, item.bytes, item.file);
        assert.equal(hash(file), item.sha256.toUpperCase(), item.file);
    }
    const expected = [...seal.files.map(item => item.file), 'capsule-file-hashes.json'];
    if (fs.existsSync(path.join(directory, 'publication.json')))
    {
        expected.push('publication.json');
    }
    assert.deepEqual(inventory(directory).sort(), expected.sort());
}
console.log(JSON.stringify({ passed: true, finding: 'F136', disposition: 'rejected',
    actualSelectedCapsuleFilesChecked: 235, actualExistingSavedNativeRows: 10, actualSavedUntimedCases: 10,
    actualConsumingFixtureWatchObserved: false, actualAllImageEntriesCompared: 292,
    actualNoCandidateOrComparison: true, actualComparisonBudgetPermanentlyClosed: true,
    actualSourcePePdbAndXmlFreshlyParsedByThisNodeAudit: false,
    actualDeepPythonAuditsRetainedAndPassed: true, actualExternalOmittedTreesFreshlyRehashed: false,
    boundary: 'Read-only copied hashes, saved facts and all image entries. Deep PE/PDB/source/XML parsing is reproducible with owner-handoff/audit.py; this Node audit does not replay those native producers or parse those binary/XML formats.',
    sealed: fs.existsSync(sealPath) }, null, 2));
