import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, manifestName, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && manifestName && (!mode || mode === '--verify'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const manifest = read(path.join(root, manifestName)), directory = path.join(root, manifest.imageRelative), files = [];
assert.equal(manifest.candidate, 'F116');
function walk(folder, prefix = '')
{
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
    {
        assert(!entry.isSymbolicLink());
        const relative = prefix + entry.name, absolute = path.join(folder, entry.name);
        if (entry.isDirectory()) walk(absolute, relative + '\\');
        else
        {
            assert(entry.isFile());
            files.push({ file: relative, bytes: fs.statSync(absolute).size, sha256: hash(absolute) });
        }
    }
}
walk(directory); files.sort((a, b) => a.file.localeCompare(b.file));
for (const row of manifest.executionIdentities)
{
    assert.equal(files.find(file => file.file === row.file)?.sha256, row.sha256, 'Exact execution image identity:' + row.file);
}
const deps = read(path.join(directory, 'AutoPerf.Benchmarks.deps.json')), target = deps.targets[deps.runtimeTarget.name];
assert(target);
const assets = [...new Set(Object.values(target).flatMap(library => [
    ...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
    ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) => ['runtime', 'native'].includes(value.assetType)).map(([file]) => file)
]))].sort();
const runtimeAssets = assets.map(declared =>
{
    const relative = declared.replaceAll('/', '\\');
    const copied = fs.existsSync(path.join(directory, relative)) ? relative : path.win32.basename(relative);
    const row = files.find(file => file.file === copied); assert(row, 'Declared runtime asset not frozen:' + declared);

    return { declared, copied, sha256: row.sha256 };
});
const config = read(path.join(directory, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
const frameworks = config.frameworks ?? [config.framework];
assert.deepEqual([config.tfm, config.rollForward, frameworks.length, frameworks[0].name, frameworks[0].version,
    config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
['net12.0', 'Disable', 1, 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
const result = { candidate: 'F116', variant: manifest.variant, imageRelative: manifest.imageRelative,
    copiedFiles: files.length, declaredRuntimeAssets: assets.length, onlyMicrosoftNetCoreFramework: true, files, runtimeAssets };
const output = path.join(root, manifest.closureFile);
if (mode === '--verify' || fs.existsSync(output)) assert.deepEqual(read(output), result, 'Complete frozen application image changed.');
else fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(`F116:${manifest.variant}:${files.length} frozen files/${assets.length} declared runtime assets,all selected tested owner identities matched.`);
