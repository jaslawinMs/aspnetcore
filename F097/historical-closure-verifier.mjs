import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root), 'An absolute actual run root is required.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const inventories = [];
for (const variant of ['before', 'after'])
{
    const directory = path.join(root, 'binaries', variant);
    if (!fs.existsSync(directory))
    {
        assert.equal(variant, 'after', 'Original actual execution closure required.');
        continue;
    }
    const manifest = read(path.join(root, `${variant}-manifest.json`));
    const files = [];
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
                files.push({ file: relative, bytes: fs.statSync(absolute).size, sha256: hash(absolute) });
            }
        }
    };
    walk(directory);
    files.sort((a, b) => a.file.localeCompare(b.file));
    for (const [file, field] of [
        ['Microsoft.JSInterop.dll', 'target_assembly_sha256'],
        ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']
    ])
    {
        assert.equal(files.find(row => row.file === file)?.sha256, manifest[field], `Actual frozen identity differs:${variant}/${file}`);
    }
    const deps = read(path.join(directory, 'AutoPerf.Benchmarks.deps.json'));
    const target = deps.targets[deps.runtimeTarget.name];
    assert(target);
    const assets = [...new Set(Object.values(target).flatMap(library => [
        ...Object.keys(library.runtime ?? {}),
        ...Object.keys(library.native ?? {}),
        ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
            ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)
    ]))].sort();
    const runtimeAssets = assets.map(declared =>
    {
        const copied = fs.existsSync(path.join(directory, declared)) ? declared : path.basename(declared);
        const entry = files.find(row => row.file === copied);
        assert(entry, `Declared runtime asset not actually copied:${variant}/${declared}`);
        return { declared, copied, sha256: entry.sha256 };
    });
    const result = { candidate: 'F097', variant, copiedFiles: files.length, declaredRuntimeAssets: assets.length, files, runtimeAssets };
    const output = path.join(root, `execution-closure-${variant}.json`);
    if (mode === '--verify')
    {
        assert.deepEqual(read(output), result, 'Live frozen execution closure changed.');
    }
    else if (fs.existsSync(output))
    {
        assert.deepEqual(read(output), result, 'Refusing to replace different prior closure evidence.');
    }
    else
    {
        fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    }
    inventories.push(result);
}
if (inventories.length === 2)
{
    const [before, after] = inventories;
    assert.deepEqual(before.files.map(row => row.file), after.files.map(row => row.file));
    const changed = before.files.filter((row, index) => row.sha256 !== after.files[index].sha256).map(row => row.file);
    assert.deepEqual(changed.sort(), ['Microsoft.JSInterop.dll', 'Microsoft.JSInterop.pdb'],
        'Only actual measured owning assembly/PDB may differ; identical harness and full common closure required.');
}
console.log(`F097:verified ${inventories.map(row => `${row.variant}:${row.copiedFiles} files/${row.declaredRuntimeAssets} runtime assets`).join(', ')}; common closure and actual identity gate passed.`);
