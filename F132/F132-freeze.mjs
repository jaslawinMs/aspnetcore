import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F132');
const common = path.join(session, 'autoperf-runs', 'F132-common');
const role = process.argv[2];
assert.ok(['Original', 'Default', 'Candidate', 'RestoredOriginal'].includes(role));
const root = role === 'Default' ? String.raw`C:\src\autoperf-F042-default` : String.raw`C:\src\aspnetcore`;
const plan = JSON.parse(fs.readFileSync(path.join(run, 'plan.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(sha(fs.readFileSync(path.join(run, 'plan.json'))), JSON.parse(fs.readFileSync(path.join(run, 'plan-seal.json'))).sha256);
const target = path.join(run, 'images-v2', role);
assert.equal(fs.existsSync(target), false, 'Never refreeze an existing role');
const command = spawnSync('git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' });
assert.equal(command.status, 0);
if (role !== 'Candidate') assert.equal(command.stdout.trim(), '');
else
{
    const changed = command.stdout.trim().split(/\r?\n/).map(line => line.trim().slice(2).trim().replaceAll('/', '\\')).sort();
    assert.deepEqual(changed, [...plan.changedShippingFiles].sort());
}
const commonInputs = ['AutoPerf.CascadingHashes.csproj', 'Program.cs'].map(file =>
{
    const bytes = fs.readFileSync(path.join(common, file));
    return { file, bytes: bytes.length, sha256: sha(bytes) };
});
const originalManifest = role === 'Original' ? null : JSON.parse(fs.readFileSync(path.join(run, 'images-v2', 'Original', 'manifest.json')));
if (originalManifest) assert.deepEqual(commonInputs, originalManifest.commonInputs);
const commonBin = path.join(common, 'bin', 'Release', 'net12.0');
const bin = path.join(target, 'bin');
fs.mkdirSync(target, { recursive: true });
fs.cpSync(commonBin, bin, { recursive: true, errorOnExist: true, force: false });
const coreRoot = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Components.Tests', 'Release', 'net12.0');
const sourceOwners = [];
for (const suffix of ['.dll', '.pdb'])
{
    const file = 'Microsoft.AspNetCore.Components' + suffix;
    const source = path.join(coreRoot, file);
    if (role === 'Original') assert.ok(fs.readFileSync(source).equals(fs.readFileSync(path.join(bin, file))), 'Common project did not bind the genuine focused-test owner');
    else fs.copyFileSync(source, path.join(bin, file));
    sourceOwners.push({ file, actualSourcePath: source, sha256: sha(fs.readFileSync(source)) });
}
if (role === 'Default')
{
    for (const owner of ['Microsoft.AspNetCore.Components.Web', 'Microsoft.JSInterop'])
    {
        for (const suffix of ['.dll', '.pdb'])
        {
            const file = owner + suffix;
            const source = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Components.Media.Tests', 'Release', 'net12.0', file);
            fs.copyFileSync(source, path.join(bin, file));
            sourceOwners.push({ file, actualSourcePath: source, sha256: sha(fs.readFileSync(source)) });
        }
    }
}
const selected = [
    ...JSON.parse(fs.readFileSync(path.join(run, 'selected-source-manifest.json')))
        .filter(entry => entry.role === 'Original').map(entry => ({ ...entry, collection: 'selected-source' })),
    ...JSON.parse(fs.readFileSync(path.join(run, 'supplemental-source-manifest.json')))
        .filter(entry => entry.role === 'Original').map(entry => ({ ...entry, collection: 'supplemental-source' })),
];
const sources = selected.map(entry =>
{
    const bytes = fs.readFileSync(path.join(root, entry.file));
    const destination = path.join(target, 'source', entry.file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    if (role !== 'Candidate' || !plan.changedShippingFiles.includes(entry.file))
    {
        const normalized = bytes.toString('utf8').replaceAll('\r\n', '\n');
        const snapshotRole = role === 'Default' ? 'Default' : 'Original';
        const expected = fs.readFileSync(path.join(run, entry.collection, snapshotRole, entry.file), 'utf8').replaceAll('\r\n', '\n');
        assert.ok(normalized === expected, 'Unexpected selected source change: ' + entry.file);
    }
    return { file: entry.file, bytes: bytes.length, sha256: sha(bytes) };
});
function inventory(directory, prefix = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        const relative = prefix ? prefix + '/' + entry.name : entry.name;
        if (entry.isDirectory()) return inventory(path.join(directory, entry.name), relative);
        assert.ok(entry.isFile());
        const bytes = fs.readFileSync(path.join(directory, entry.name));
        return [{ file: relative, bytes: bytes.length, sha256: sha(bytes) }];
    });
}
const binaries = inventory(bin);
const differences = originalManifest ? binaries.filter(entry => originalManifest.binaries.find(old => old.file === entry.file)?.sha256 !== entry.sha256).map(entry => entry.file) : [];
if (role === 'Candidate') assert.deepEqual([...differences].sort(), ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']);
if (role === 'RestoredOriginal') assert.deepEqual(binaries, originalManifest.binaries);
const manifest = { role, recordedAt: new Date().toISOString(), actualSourceRoot: root, commonInputs, sourceOwners, sources,
    binaries, actualConsumerFiles: binaries.length, actualDifferencesFromOriginal: differences,
    actualNonOwnerBytesPreserved: role === 'Candidate' ? binaries.length - differences.length : null,
    limitation: 'Complete frozen consumer inventory and selected source associations, not complete compiler-input provenance.' };
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ role, files: binaries.length, selectedSources: sources.length, actualDifferencesFromOriginal: differences }, null, 2));
