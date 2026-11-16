import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const directory = path.join(root, 'binaries', 'original');
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
const manifest = read(path.join(root, 'original-manifest.json'));
for (const [file, field] of [
    ['Microsoft.JSInterop.dll', 'target_assembly_sha256'], ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'], ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']
])
{
    assert.equal(files.find(row => row.file === file)?.sha256, manifest[field]);
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
    assert(row, `Declared asset not actually copied:${declared}`);

    return { declared, copied, sha256: row.sha256 };
});
const result = { candidate: 'F098', variant: 'original', copiedFiles: files.length, declaredRuntimeAssets: assets.length, files, runtimeAssets };
const output = path.join(root, 'execution-closure-original.json');
if (mode === '--verify' || fs.existsSync(output))
{
    assert.deepEqual(read(output), result, 'Original actual execution closure changed.');
}
else
{
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(`F098:original frozen${files.length} files/${assets.length} declared runtime assets and owner/harness/config/deps hashes verified.`);
