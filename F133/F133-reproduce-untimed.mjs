import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F133');
const common = path.join(session, 'autoperf-runs', 'F133-common');
const fresh = path.join(run, 'reconstruction-001');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
assert.equal(fs.existsSync(fresh), false);
const original = read(path.join(run, 'images', 'Original', 'manifest.json'));
const expected = new Map(original.commonInputs.map(file => [file.file, file]));
fs.mkdirSync(path.join(fresh, 'project'), { recursive: true });
for (const filename of ['AutoPerf.UnionMetadata.csproj', 'Program.cs'])
{
    const bytes = fs.readFileSync(path.join(common, filename));
    assert.equal(bytes.length, expected.get(filename).bytes);
    assert.equal(sha(bytes), expected.get(filename).sha256);
    fs.writeFileSync(path.join(fresh, 'project', filename), bytes, { flag: 'wx' });
}
const project = path.join(fresh, 'project', 'AutoPerf.UnionMetadata.csproj');
const beforeBudget = hash(path.join(run, 'diagnostic-budget.json'));
function managed(label, ...args)
{
    const result = spawnSync(process.execPath, [path.join(session, 'F133-managed-command.mjs'), label, String.raw`C:\src\aspnetcore`, ...args],
        { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    return result;
}
const references = '-p:ReferencePathRoot=' + path.join(run, 'images', 'Original', 'bin');
const buildArgs = ['build', project, '--no-restore', '--configuration', 'Release', references, '-p:UseSharedCompilation=false', '/m:2', '/nr:false'];
const first = managed('reconstruction-build-001', ...buildArgs);
assert.equal(first.status, 1, 'A genuinely fresh project is expected to lack assets before its first attempted build');
assert.match(fs.readFileSync(path.join(run, 'validation', 'reconstruction-build-001', 'stdout.txt'), 'utf8'), /NETSDK1004/);
assert.equal(managed('reconstruction-restore-001', 'restore', project, references, '-p:UseSharedCompilation=false', '/m:2', '/nr:false').status, 0);
assert.equal(managed('reconstruction-build-002', ...buildArgs).status, 0);
const compiled = path.join(fresh, 'project', 'bin', 'Release', 'net12.0');
const identities = [];
for (const role of ['Original', 'Default'])
{
    const base = path.join(run, 'images', role);
    const manifest = read(path.join(base, 'manifest.json'));
    const target = path.join(fresh, role);
    fs.mkdirSync(path.join(target, 'bin'), { recursive: true });
    const binaries = [];
    for (const entry of manifest.binaries)
    {
        const regenerated = entry.file.startsWith('AutoPerf.UnionMetadata.');
        const source = regenerated ? path.join(compiled, entry.file) : path.join(base, 'bin', ...entry.file.split('/'));
        const bytes = fs.readFileSync(source);
        const destination = path.join(target, 'bin', ...entry.file.split('/'));
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        binaries.push({ file: entry.file, bytes: bytes.length, sha256: sha(bytes), actualCopiedFrom: source });
    }
    const changed = binaries.filter(entry => entry.sha256 !== manifest.binaries.find(old => old.file === entry.file).sha256).map(entry => entry.file);
    assert.deepEqual(changed, ['AutoPerf.UnionMetadata.dll', 'AutoPerf.UnionMetadata.pdb']);
    for (const entry of manifest.sources)
    {
        const destination = path.join(target, 'source', entry.file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(base, 'source', entry.file), destination, fs.constants.COPYFILE_EXCL);
    }
    const derived = { ...manifest, role: role + 'Rebuilt', actualBaseImage: base, recordedAt: new Date().toISOString(),
        actualReferenceOwnerRoot: path.join(run, 'images', 'Original', 'bin'), actualFreshCompiledInputs: project,
        actualDifferencesFromCorrespondingBase: changed, binaries };
    fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(derived, null, 2) + '\n', { flag: 'wx' });
    const label = 'reconstruction-' + role.toLowerCase() + '-characterize-001';
    const output = path.join(run, 'validation', label, 'observations.json');
    assert.equal(managed(label, path.join(target, 'bin', 'AutoPerf.UnionMetadata.dll'), 'characterize', role + 'Rebuilt', output).status, 0);
    const observations = read(output);
    assert.equal(observations.ContractFailures, 0);
    assert.equal(observations.Rows.length, 28);
    identities.push({ role: derived.role, actualCorrespondingUnchangedFiles: binaries.length - changed.length, actualChanged: changed,
        actualConsumerFiles: binaries.length, actualRows: observations.Rows.length, actualSelectedSourceAssociations: observations.SourceBindings.length });
}
assert.equal(hash(path.join(run, 'diagnostic-budget.json')), beforeBudget);
const receipt = { findingId: 'F133', recordedAt: new Date().toISOString(), actualExactInputs: original.commonInputs,
    actualGenuinelyFreshProject: true, actualExplicitReferenceOwnerRoot: path.join(run, 'images', 'Original', 'bin'),
    actualAdditionalTiming: 0, actualBudgetUnchangedSha256: beforeBudget, actualRoles: identities,
    boundary: 'Fresh exact-two-input common-project rebuild and both untimed consumers, not a reconstruction of every historical owner/compiler input.' };
fs.writeFileSync(path.join(fresh, 'verified-reproduction.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
