import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const common = path.join(session, 'autoperf-runs', 'F129-common');
const role = process.argv[2];
assert.ok(['Original', 'Default', 'Prototype', 'RestoredOriginal'].includes(role));
const root = role === 'Default' ? String.raw`C:\src\autoperf-F042-default` : String.raw`C:\src\aspnetcore`;
const destination = path.join(run, 'images', role);
const consumer = path.join(destination, 'consumer');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function git(...args)
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
function inventory(directory, prefix = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const relative = prefix ? prefix + '/' + item.name : item.name;
        return item.isDirectory() ? inventory(path.join(directory, item.name), relative) :
            [{ path: relative, bytes: fs.statSync(path.join(directory, item.name)).size, sha256: hash(path.join(directory, item.name)) }];
    }).sort((a, b) => a.path.localeCompare(b.path));
}

assert.equal(hash(path.join(run, 'plan.json')), read(path.join(run, 'plan-seal.json')).sha256);
const plan = read(path.join(run, 'plan.json'));
assert.equal(git('rev-parse', 'HEAD'), role === 'Default' ? plan.actualDefaultCommit : plan.baselineCommit);
assert.equal(fs.existsSync(destination), false, 'Never overwrite a frozen role');
const dirty = git('diff', '--name-only').replaceAll('\\', '/');
assert.equal(dirty, role === 'Prototype' ? 'src/Components/Media/src/FileDownload.cs' : '');
assert.equal(git('diff', '--cached', '--name-only'), '');
const inputs = ['AutoPerf.Characterization.csproj', 'Program.cs'].map(file => ({
    path: file, bytes: fs.statSync(path.join(common, file)).size, sha256: hash(path.join(common, file))
}));
const inputsFile = path.join(run, 'common-inputs.json');
if (role === 'Original')
{
    write(inputsFile, inputs);
    fs.mkdirSync(path.join(run, 'harness'));
    for (const input of inputs)
    {
        fs.copyFileSync(path.join(common, input.path), path.join(run, 'harness', input.path), fs.constants.COPYFILE_EXCL);
    }
}
assert.deepEqual(inputs, read(inputsFile));
const original = path.join(run, 'images', 'Original', 'consumer');
fs.mkdirSync(destination, { recursive: true });
fs.cpSync(role === 'Original' ? path.join(common, 'bin', 'Release', 'net12.0') : original,
    consumer, { recursive: true, errorOnExist: true, force: false });
const replacements = [];
const builtTestOutput = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Components.Media.Tests', 'Release', 'net12.0');
if (role !== 'Original')
{
    const selected = inventory(consumer).filter(item => role === 'Default' ? /\.(dll|pdb)$/.test(item.path) :
        /^Microsoft\.AspNetCore\.Components\.Media\.(dll|pdb)$/.test(item.path));
    for (const item of selected)
    {
        const source = path.join(builtTestOutput, ...item.path.split('/'));
        if (role === 'Default' && !fs.existsSync(source))
        {
            assert.ok(item.path.startsWith('AutoPerf.Characterization.'), `Default dependency missing: ${item.path}`);
            continue;
        }
        fs.copyFileSync(source, path.join(consumer, ...item.path.split('/')));
        replacements.push({ path: item.path, source, sha256: hash(source) });
    }
}
const runtime = read(path.join(consumer, 'AutoPerf.Characterization.runtimeconfig.json')).runtimeOptions;
assert.equal(runtime.framework.name, 'Microsoft.NETCore.App');
assert.equal(runtime.framework.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.rollForward, 'Disable');
assert.equal(runtime.frameworks, undefined, 'Do not silently load an installed ASP.NET Core owner');
const sourceInputs = read(path.join(run, 'selected-source-manifest.json')).filter(item => item.role === 'Original').map(item =>
{
    const target = path.join(destination, 'source', item.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, item.file), target, fs.constants.COPYFILE_EXCL);
    return { path: item.file.replaceAll('\\', '/'), bytes: fs.statSync(target).size, sha256: hash(target) };
});
const files = inventory(consumer);
const before = role === 'Original' ? null : read(path.join(run, 'images', 'Original', 'manifest.json')).files;
if (before) assert.deepEqual(files.map(item => item.path), before.map(item => item.path));
const changed = before ? files.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path).sort() : [];
if (role === 'Prototype')
{
    assert.deepEqual(changed, ['Microsoft.AspNetCore.Components.Media.dll', 'Microsoft.AspNetCore.Components.Media.pdb']);
}
if (role === 'RestoredOriginal') assert.deepEqual(changed, [], 'Restored original must reproduce its original compiled image');
for (const name of ['Microsoft.AspNetCore.Components.Media', 'Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Web'])
{
    for (const extension of ['dll', 'pdb'])
    {
        const file = `${name}.${extension}`;
        assert.equal(hash(path.join(consumer, file)), hash(path.join(builtTestOutput, file)), `Actual built owner mismatch: ${file}`);
    }
}
write(path.join(destination, 'manifest.json'), {
    role, recordedAt: new Date().toISOString(), sourceRoot: root, sourceCommit: git('rev-parse', 'HEAD'),
    sourceStatus: git('status', '--short'), files, sourceInputs, commonInputs: inputs, replacements,
    changedFromOriginal: changed, timingComparisons: 0, completeCompilerProvenanceClaimed: false,
});
console.log(JSON.stringify({ role, files: files.length, sourceSnapshots: sourceInputs.length, changedFromOriginal: changed }, null, 2));
