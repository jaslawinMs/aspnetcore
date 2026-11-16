import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root), 'An absolute actual run root is required.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const binaries = path.join(root, 'binaries', 'before');
const manifest = read(path.join(root, 'before-manifest.json'));
const inventory = [];
const walk = (folder, prefix = '') =>
{
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
    {
        const relative = prefix + entry.name;
        const absolute = path.join(folder, entry.name);
        if (entry.isDirectory())
        {
            walk(absolute, relative + '/');
        }
        else
        {
            assert(entry.isFile());
            inventory.push({ file: relative, bytes: fs.statSync(absolute).size, sha256: hash(absolute) });
        }
    }
};
walk(binaries);
inventory.sort((a, b) => a.file.localeCompare(b.file));
for (const [file, field] of [
    ['Microsoft.JSInterop.dll', 'target_assembly_sha256'],
    ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
    ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']
])
{
    assert.equal(inventory.find(row => row.file === file)?.sha256, manifest[field], `Frozen original identity changed:${file}`);
}
assert.equal(manifest.source_revision, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
const deps = read(path.join(binaries, 'AutoPerf.Benchmarks.deps.json'));
const runtimeTarget = deps.targets[deps.runtimeTarget.name];
assert(runtimeTarget);
const assets = [...new Set(Object.values(runtimeTarget).flatMap(library => [
    ...Object.keys(library.runtime ?? {}),
    ...Object.keys(library.native ?? {}),
    ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
        ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)
]))].sort();
assert(assets.length > 0);
const runtimeAssets = assets.map(declared =>
{
    const copied = fs.existsSync(path.join(binaries, declared)) ? declared : path.basename(declared);
    const entry = inventory.find(row => row.file === copied);
    assert(entry, `Declared runtime asset not actually copied:${declared}`);
    return { declared, copied, sha256: entry.sha256 };
});
const result = {
    candidate: 'F096', snapshot: 'before', type: 'original-only-no-source-comparison',
    copied_files: inventory.length, runtime_assets: runtimeAssets.length, before: inventory, runtimeAssets
};
const output = path.join(root, 'execution-closure.json');
if (mode === '--verify')
{
    assert.deepEqual(read(output), result, 'Live frozen original closure changed.');
}
else
{
    assert(!fs.existsSync(output), 'Refusing to replace original closure evidence.');
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(`F096:full actual original ${inventory.length}-file and ${runtimeAssets.length}-runtime-asset closure verified; no fabricated A/B.`);
