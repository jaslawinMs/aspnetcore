import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, variant = 'original', mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && ['original', 'candidate1', 'candidate2', 'candidate3'].includes(variant));
assert(!mode || mode === '--verify');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const directory = path.join(root, 'binaries', variant), files = [];
function walk(folder, prefix = '')
{
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
    {
        assert(!entry.isSymbolicLink(), 'No linked execution assets.');
        const relative = prefix + entry.name, absolute = path.join(folder, entry.name);
        if (entry.isDirectory()) walk(absolute, relative + '/');
        else
        {
            assert(entry.isFile());
            files.push({ file: relative, bytes: fs.statSync(absolute).size, sha256: hash(absolute) });
        }
    }
}
walk(directory); files.sort((a, b) => a.file.localeCompare(b.file));
const manifest = read(path.join(root, `${variant}-manifest.json`));
assert.equal(manifest.candidate, 'F113'); assert.equal(manifest.variant, variant);
for (const [file, field] of [
    ['AutoPerf.Benchmarks.dll', 'harnessSha256'], ['AutoPerf.Benchmarks.pdb', 'harnessPdbSha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'], ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256'],
    ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'ownerSha256'], ['Microsoft.AspNetCore.Mvc.TagHelpers.pdb', 'ownerPdbSha256'],
    ['Microsoft.Extensions.Caching.Memory.dll', 'cacheSha256']
]) assert.equal(files.find(row => row.file === file)?.sha256, manifest[field], 'Execution identity differs:' + file);
const deps = read(path.join(directory, 'AutoPerf.Benchmarks.deps.json')), target = deps.targets[deps.runtimeTarget.name];
assert(target);
const assets = [...new Set(Object.values(target).flatMap(library => [
    ...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
    ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) => ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)
]))].sort();
const runtimeAssets = assets.map(declared =>
{
    const copied = fs.existsSync(path.join(directory, ...declared.split('/'))) ? declared : path.basename(declared);
    const row = files.find(row => row.file === copied); assert(row, 'Declared runtime asset not frozen:' + declared);

    return { declared, copied, sha256: row.sha256 };
});
const config = read(path.join(directory, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
const frameworks = config.frameworks ?? [config.framework];
assert.deepEqual([config.tfm, config.rollForward, frameworks.length, frameworks[0].name, frameworks[0].version,
    config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
['net12.0', 'Disable', 1, 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
let differences = [];
if (variant === 'original') assert.equal(manifest.sourceTrackedUnchanged, true);
else
{
    const original = read(path.join(root, 'execution-closure-original.json'));
    assert.deepEqual(files.map(row => row.file), original.files.map(row => row.file));
    differences = files.filter(row => row.sha256 !== original.files.find(old => old.file === row.file).sha256);
    assert.deepEqual(differences.map(row => row.file).sort(), ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'Microsoft.AspNetCore.Mvc.TagHelpers.pdb']);
    assert.equal(manifest.harnessSha256, read(path.join(root, 'original-manifest.json')).harnessSha256);
}
const result = { candidate: 'F113', variant, copiedFiles: files.length, declaredRuntimeAssets: assets.length,
    onlyMicrosoftNetCoreFramework: true, differences, files, runtimeAssets };
const output = path.join(root, `execution-closure-${variant}.json`);
if (mode === '--verify' || fs.existsSync(output)) assert.deepEqual(read(output), result, 'Frozen complete execution image changed.');
else fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(`F113:${variant}:${files.length} frozen files/${assets.length} runtime assets/${differences.length} intended differences.`);
