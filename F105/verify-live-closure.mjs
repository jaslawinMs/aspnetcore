import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'));
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
assert.equal(manifest.candidate, 'F105');
assert.equal(manifest.variant, 'original');
assert.equal(manifest.sourceTrackedUnchanged, true);
for (const [file, field] of [
    ['AutoPerf.Benchmarks.dll', 'harnessSha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
    ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
])
{
    assert.equal(files.find(row => row.file === file)?.sha256, manifest[field], 'Actual image identity differs:' + file);
}
for (const owner of manifest.actualOwners)
{
    assert.equal(files.find(row => row.file === owner.assembly + '.dll')?.sha256, owner.sha256);
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
    const native = path.join(directory, ...declared.split('/'));
    const copied = fs.existsSync(native) ? declared : path.basename(declared);
    const row = files.find(row => row.file === copied);
    assert(row, 'Declared runtime asset is not copied:' + declared);

    return { declared, copied, sha256: row.sha256 };
});
const config = read(path.join(directory, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
const frameworks = config.frameworks ?? [config.framework];
assert.equal(config.tfm, 'net12.0');
assert.equal(config.rollForward, 'Disable');
assert.equal(frameworks.length, 1);
assert.equal(frameworks[0].name, 'Microsoft.NETCore.App', 'Actual in-tree MVC must not be substituted by an installed ASP.NET shared framework.');
assert.equal(frameworks[0].version, '12.0.0-alpha.1.26562.105');
assert.equal(config.configProperties['System.GC.Server'], true);
assert.equal(config.configProperties['System.GC.Concurrent'], true);
const result = { candidate: 'F105', variant: 'original', copiedFiles: files.length, declaredRuntimeAssets: assets.length,
    onlyMicrosoftNetCoreFramework: true, files, runtimeAssets };
const output = path.join(root, 'execution-closure-original.json');
if (mode === '--verify' || fs.existsSync(output))
{
    assert.deepEqual(read(output), result, 'Frozen original execution image changed.');
}
else
{
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(`F105:frozen original ${files.length} files/${assets.length} runtime assets;all three tested owners/harness/config/private MVC dependency image verified.`);
