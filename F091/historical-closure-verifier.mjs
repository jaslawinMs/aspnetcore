import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const [id, target, snapshot = 'after'] = process.argv.slice(2);
assert(/^F\d{3}$/.test(id) && /^[A-Za-z0-9.]+$/.test(target) && /^after(?:-[23])?$/.test(snapshot));
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', id);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inventory = directory =>
{
    const files = [];
    const walk = (folder, prefix = '') =>
    {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
        {
            const file = prefix + entry.name;
            const absolute = path.join(folder, entry.name);
            if (entry.isDirectory())
            {
                walk(absolute, file + '/');
            }
            else
            {
                assert(entry.isFile());
                files.push({ file, bytes: fs.statSync(absolute).size, sha256: hash(absolute) });
            }
        }
    };
    walk(directory);
    return files.sort((a, b) => a.file.localeCompare(b.file));
};
const beforeRoot = path.join(root, 'binaries', 'before');
const afterRoot = path.join(root, 'binaries', snapshot);
const before = inventory(beforeRoot);
const after = inventory(afterRoot);
assert.deepEqual(before.map(row => row.file), after.map(row => row.file), 'Recursive copied execution file sets must be identical.');
const changed = before.filter((row, i) => row.sha256 !== after[i].sha256).map(row => row.file).sort();
assert.deepEqual(changed, [`${target}.dll`, `${target}.pdb`].sort(), 'Only the owning assembly and its PDB may change.');
for (const [variant, files] of [['before', before], [snapshot, after]])
{
    const manifest = JSON.parse(fs.readFileSync(path.join(root, `${variant}-manifest.json`), 'utf8').replace(/^\uFEFF/, ''));
    for (const [file, field] of [
        [`${target}.dll`, 'target_assembly_sha256'],
        ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256'],
    ])
    {
        assert.equal(files.find(row => row.file === file)?.sha256.toUpperCase(), manifest[field]);
    }
}
const deps = JSON.parse(fs.readFileSync(path.join(beforeRoot, 'AutoPerf.Benchmarks.deps.json'), 'utf8'));
const runtimeTarget = deps.targets[deps.runtimeTarget.name];
assert(runtimeTarget, 'Actual declared runtime target required.');
const assets = [...new Set(Object.values(runtimeTarget).flatMap(library =>
    [...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
        ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
            ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)]))].sort();
assert(assets.length > 0, 'A zero-asset enumeration is not runtime closure evidence.');
const runtimeAssets = assets.map(file =>
{
    const copied = fs.existsSync(path.join(beforeRoot, file)) ? file : path.basename(file);
    assert(fs.existsSync(path.join(beforeRoot, copied)) && fs.existsSync(path.join(afterRoot, copied)));
    const a = hash(path.join(beforeRoot, copied));
    const b = hash(path.join(afterRoot, copied));
    assert(a === b || copied === `${target}.dll`);
    return { declared: file, copied, before_sha256: a, after_sha256: b };
});
fs.writeFileSync(path.join(root, `execution-closure${snapshot === 'after' ? '' : '-' + snapshot}.json`), JSON.stringify({
    candidate: id,
    selected_snapshot: snapshot,
    complete_recursive_file_sets_equal: true,
    copied_files: before.length,
    changed_files: changed,
    runtime_assets: runtimeAssets.length,
    before,
    after,
    runtimeAssets,
}, null, 2) + '\n');
console.log(`${id}:complete ${before.length}-file sets,${runtimeAssets.length} runtime assets;only ${target}.dll/PDB differ.`);
