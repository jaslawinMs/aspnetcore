import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F133');
const common = path.join(session, 'autoperf-runs', 'F133-common');
const role = process.argv[2];
assert.ok(['Original', 'Default'].includes(role));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
assert.equal(hash(path.join(run, 'plan.json')), read(path.join(run, 'plan-seal.json')).sha256);
const checkout = role === 'Original' ? String.raw`C:\src\aspnetcore` : String.raw`C:\src\autoperf-F042-default`;
const owners = path.join(checkout, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.IntegrationTests', 'Release', 'net12.0');
const consumer = path.join(common, 'bin', 'Release', 'net12.0');
const target = path.join(run, 'images', role);
assert.equal(fs.existsSync(target), false, 'Never rewrite a frozen consumer');
fs.mkdirSync(path.join(target, 'bin'), { recursive: true });
const files = directory =>
{
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        if (entry.isDirectory()) result.push(...files(path.join(directory, entry.name)).map(file => entry.name + '/' + file));
        else { assert.ok(entry.isFile()); result.push(entry.name); }
    }
    return result.sort();
};
const binaries = [];
for (const file of files(consumer))
{
    const ownerFile = path.join(owners, ...file.split('/'));
    const source = fs.existsSync(ownerFile) ? ownerFile : path.join(consumer, ...file.split('/'));
    assert.ok(!file.startsWith('AutoPerf.UnionMetadata.') || source.startsWith(consumer), 'Common harness must remain identical');
    const destination = path.join(target, 'bin', ...file.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const bytes = fs.readFileSync(source);
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    binaries.push({ file, bytes: bytes.length, sha256: sha(bytes), actualCopiedFrom: source });
}
for (const name of ['Microsoft.AspNetCore.Mvc.Core.pdb', 'Microsoft.AspNetCore.Mvc.Abstractions.pdb'])
{
    assert.ok(binaries.some(file => file.file === name), `Actual source owner PDB is required: ${name}`);
}
const sources = read(path.join(run, 'plan.json')).actualPhysicalSnapshots.filter(source => source.role === role);
for (const source of sources)
{
    const original = path.join(run, 'selected-source', role, source.file);
    assert.equal(hash(original), source.sha256);
    assert.equal(hash(path.join(checkout, source.file)), source.sha256);
    const destination = path.join(target, 'source', source.file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(original, destination, fs.constants.COPYFILE_EXCL);
}
const commonInputs = ['AutoPerf.UnionMetadata.csproj', 'Program.cs'].map(file =>
{
    const bytes = fs.readFileSync(path.join(common, file));
    return { file, bytes: bytes.length, sha256: sha(bytes) };
});
const identity = inventory => inventory.map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 }));
let differencesFromOriginal = [];
if (role === 'Default')
{
    const original = read(path.join(run, 'images', 'Original', 'manifest.json'));
    assert.deepEqual(original.commonInputs, commonInputs);
    assert.deepEqual(original.binaries.map(file => file.file), binaries.map(file => file.file));
    differencesFromOriginal = binaries.filter(file => file.sha256 !== original.binaries.find(old => old.file === file.file).sha256).map(file => file.file);
    for (const name of ['AutoPerf.UnionMetadata.dll', 'AutoPerf.UnionMetadata.pdb', 'AutoPerf.UnionMetadata.deps.json', 'AutoPerf.UnionMetadata.runtimeconfig.json'])
    {
        assert.deepEqual(identity(binaries.filter(file => file.file === name)), identity(original.binaries.filter(file => file.file === name)));
    }
}
const manifest = { role, recordedAt: new Date().toISOString(), actualTiming: false, actualOwnersFrom: owners,
    commonInputs, binaries, sources, differencesFromOriginal,
    provenanceScope: 'Complete frozen consumer inventory and eight selected physical inputs; runtime PE/PDB associations check six selected Core/Abstractions documents, not complete compiler inputs.' };
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ role, actualConsumerFiles: binaries.length, selectedSources: sources.length,
    actualCommonHarnessIdentical: true, actualDifferencesFromOriginal: differencesFromOriginal }, null, 2));
