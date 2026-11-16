import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, variant, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && /^(original|candidate-[123])$/.test(variant) && (!mode || mode === '--verify'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const directory = path.join(root, 'binaries', variant);
const files = [];
function walk(folder, prefix = '')
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
}
walk(directory);
files.sort((a, b) => a.file.localeCompare(b.file));
const manifest = read(path.join(root, `${variant}-manifest.json`));
assert.equal(manifest.candidate, 'F104');
assert.equal(manifest.variant, variant);
for (const [file, field] of [
    ['Microsoft.AspNetCore.App.Analyzers.dll', 'ownerAssemblySha256'], ['AutoPerf.Benchmarks.dll', 'harnessSha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'], ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
])
{
    assert.equal(files.find(row => row.file === file)?.sha256, manifest[field], `Actual declared identity differs:${file}`);
}
const deps = read(path.join(directory, 'AutoPerf.Benchmarks.deps.json'));
const target = deps.targets[deps.runtimeTarget.name];
assert(target);
const assets = [...new Set(Object.values(target).flatMap(library => [
    ...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
    ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
        ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)
]))].sort();
const runtimeAssets = assets.map(declared =>
{
    const copied = fs.existsSync(path.join(directory, declared)) ? declared : path.basename(declared);
    const row = files.find(row => row.file === copied);
    assert(row, `Declared runtime asset not copied:${declared}`);

    return { declared, copied, sha256: row.sha256 };
});
if (variant !== 'original')
{
    const original = read(path.join(root, 'execution-closure-original.json'));
    const changedFiles = files.filter(row => original.files.find(old => old.file === row.file)?.sha256 !== row.sha256).map(row => row.file);
    assert.deepEqual(changedFiles.sort(), ['Microsoft.AspNetCore.App.Analyzers.dll', 'Microsoft.AspNetCore.App.Analyzers.pdb'].sort(),
        'Only the real same-identity owner DLL/PDB may differ;not harness/compiler/metadata/config/dependencies.');
    assert.equal(files.length, original.files.length);
    assert.deepEqual(files.map(row => row.file), original.files.map(row => row.file), 'Actual closure file set differs.');
    assert.deepEqual(runtimeAssets.map(({ declared, copied }) => ({ declared, copied })),
        original.runtimeAssets.map(({ declared, copied }) => ({ declared, copied })));
}
const result = { candidate: 'F104', variant, copiedFiles: files.length, declaredRuntimeAssets: assets.length, files, runtimeAssets };
const output = path.join(root, `execution-closure-${variant}.json`);
if (mode === '--verify' || fs.existsSync(output))
{
    assert.deepEqual(read(output), result, 'Frozen execution closure changed.');
}
else
{
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(`F104:${variant} frozen ${files.length} files/${assets.length} assets;actual owner/harness/config/deps verified.`);
