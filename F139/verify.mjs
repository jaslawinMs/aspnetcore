import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] && !process.argv[2].startsWith('--')
    ? process.argv[2] : fileURLToPath(new URL('.', import.meta.url)));
const local = logical => path.join(root, ...logical.replaceAll('\\', '/').split('/'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), logical) : [logical];
    });
}
assert.equal(hash(local('owner-handoff/MANIFEST.json')), '3E6124B7CB8F62B4C45C54DAF862C5B7E5B8CE7154B58388DC3F897C5C2666A3');
const child = spawnSync(process.execPath, [local('owner-handoff/audit.mjs')], {
    cwd: local('owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audited = JSON.parse(child.stdout.trim());
assert.equal(audited.audit, 'PASS');
assert.equal(audited.files, 247);
assert.equal(audited.bytes, 40207210);
assert.equal(audited.nativeRows, 52);
for (const item of read(local('authoritative-copies.json')))
{
    assert.equal(hash(local(item.file)), item.sha256, item.file);
    assert.equal(fs.statSync(local(item.file)).size, item.bytes, item.file);
}
const original = read(local('coordinator-owner-audit.json'));
assert.equal(original.actualAuditorResult.audit, 'PASS');
assert.equal(original.actualParsedXmlRows.length, 52);
assert.ok(original.actualParsedXmlRows.every(row => row.outcome === 'Passed' && row.actualDefinitionExecutionMatched));
assert.equal(original.actualCiCleanlinessAccepted, false);
const accepted = read(local('coordinator-acceptance.json'));
assert.equal(accepted.finalDisposition, 'rejected');
assert.equal(accepted.actualCopiedAudit.actualExitCode, 0);
assert.equal(accepted.actualCopiedAudit.actualResult.audit, 'PASS');
assert.equal(accepted.actualComparisonAuthorized, false);
assert.equal(accepted.actualCiCleanlinessAccepted, false);
const images = read(local('owner-handoff/image-inventories.json'));
const first = new Map(images.find(item => item.role === 'original').files.map(item => [item.path, item.sha256]));
const second = new Map(images.find(item => item.role === 'default').files.map(item => [item.path, item.sha256]));
const comparison = read(local('coordinator-image-comparison.json'));
assert.deepEqual(comparison.prefixExclusions, []);
assert.equal(comparison.entries.length, 59);
assert.deepEqual(comparison.counts, { same: 5, different: 54 });
assert.deepEqual(comparison.entries.map(item => item.path).sort(), [...new Set([...first.keys(), ...second.keys()])].sort());
for (const item of comparison.entries)
{
    assert.equal(item.originalSha256, first.get(item.path) ?? null, item.path);
    assert.equal(item.defaultSha256, second.get(item.path) ?? null, item.path);
    assert.equal(item.status, first.get(item.path) === second.get(item.path) ? 'same' : 'different', item.path);
}
assert.equal(comparison.nonTargetOwnerDifferences.length, 52);
const budget = read(local('closed-budget.json'));
assert.equal(budget.findingId, 'F139');
assert.equal(budget.maximumAuthorizations, 3);
assert.deepEqual(budget.authorizations, []);
assert.equal(budget.closed, true);
const sealPath = local('capsule-file-hashes.json');
if (process.argv.includes('--require-seal'))
{
    assert.ok(fs.existsSync(sealPath));
}
if (fs.existsSync(sealPath))
{
    const seal = read(sealPath);
    for (const item of seal.files)
    {
        assert.equal(hash(local(item.file)), item.sha256.toUpperCase(), item.file);
        assert.equal(fs.statSync(local(item.file)).size, item.bytes, item.file);
    }
    const expected = [...seal.files.map(item => item.file), 'capsule-file-hashes.json'];
    if (fs.existsSync(local('publication.json')))
    {
        expected.push('publication.json');
    }
    assert.deepEqual(inventory(root).sort(), expected.sort());
}
console.log(JSON.stringify({ passed: true, finding: 'F139', disposition: 'rejected',
    actualSelectedCapsuleFiles: 247, actualSelectedBytes: 40207210, actualNativePassedRows: 52,
    actualCommonConsumerAssertions: 52, actualRoleImageEntriesComparedWithoutExemptions: 59,
    actualRoleImageDifferences: 54, actualNonTargetOwnerDifferences: 52,
    actualFreshCopiedPePdbAndSelectedRawDocumentParsingPassed: true,
    actualNativeXmlRegexReconciliationAugmentedByIndependentRealXmlReceipt: true,
    actualCiCleanlinessAccepted: false, actualNoCandidateOrComparison: true,
    actualNoFullCompilerOrAllFileClosureClaim: true, actualNoDotnetOrTestReplayStarted: true,
    sealed: fs.existsSync(sealPath) }, null, 2));
