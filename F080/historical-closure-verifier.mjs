import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F080');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inventory = directory =>
{
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
                assert.ok(entry.isFile(), 'Only regular copied execution files are expected.');
                files.push({ file: relative, sha256: hash(absolute), bytes: fs.statSync(absolute).size });
            }
        }
    };
    walk(directory);
    return files.sort((x, y) => x.file.localeCompare(y.file));
};
const beforeRoot = path.join(root, 'binaries', 'before');
const afterRoot = path.join(root, 'binaries', 'after');
const before = inventory(beforeRoot);
const after = inventory(afterRoot);
assert.deepEqual(before.map(row => row.file), after.map(row => row.file), 'Complete copied file sets must be identical.');
const differences = before.filter((row, index) => row.sha256 !== after[index].sha256).map(row => row.file);
assert.deepEqual(differences.sort(), ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'Microsoft.AspNetCore.Mvc.TagHelpers.pdb']);
for (const name of ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb',
    'AutoPerf.Benchmarks.deps.json', 'AutoPerf.Benchmarks.runtimeconfig.json'])
{
    assert.equal(hash(path.join(beforeRoot, name)), hash(path.join(afterRoot, name)));
}
const deps = JSON.parse(fs.readFileSync(path.join(beforeRoot, 'AutoPerf.Benchmarks.deps.json'), 'utf8'));
const target = deps.targets[deps.runtimeTarget.name];
assert.ok(target, 'Actual declared runtime target must exist.');
const runtimePaths = [...new Set(Object.values(target).flatMap(library =>
    [...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
        ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
            ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)]))].sort();
assert.ok(runtimePaths.length > 0, 'A zero-runtime-asset enumeration is not a valid closure proof.');
const runtimeAssets = runtimePaths.map(file =>
{
    const relative = fs.existsSync(path.join(beforeRoot, file)) ? file : path.basename(file);
    assert.ok(fs.existsSync(path.join(beforeRoot, relative)) && fs.existsSync(path.join(afterRoot, relative)),
        `Declared runtime asset must exist in both copied executions:${file}`);
    const left = hash(path.join(beforeRoot, relative));
    const right = hash(path.join(afterRoot, relative));
    assert.ok(left === right || relative === 'Microsoft.AspNetCore.Mvc.TagHelpers.dll');
    return { declared: file, copied: relative, before_sha256: left, after_sha256: right };
});
fs.writeFileSync(path.join(root, 'execution-closure.json'), JSON.stringify({
    candidate: 'F080',
    complete_recursive_file_sets_equal: true,
    copied_files: before.length,
    changed_files: differences,
    runtime_assets: runtimeAssets.length,
    before,
    after,
    runtimeAssets,
}, null, 2) + '\n');
console.log(`F080:complete ${before.length}-file execution sets;${runtimeAssets.length} runtime assets;only actual TagHelpers.dll/PDB differ.`);
