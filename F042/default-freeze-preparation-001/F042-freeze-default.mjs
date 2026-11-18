import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const run = path.join(session, 'autoperf-runs', 'F042');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const require = (condition, message) => { if (!condition) throw new Error(message); };
const worktree = read(path.join(run, 'current-default-worktree.json'));
const inputs = read(path.join(run, 'source-inputs-investigation.json'));
const root = worktree.actualVerificationRoot;
const output = path.join(run, 'default-validation');
require(!fs.existsSync(output), 'Do not overwrite a frozen default-validation image.');
const commands = [];
function git(args) {
    const result = spawnSync('git', ['-c', 'core.longpaths=true', '-C', root, ...args], { encoding: 'utf8', windowsHide: true });
    commands.push({ executable: 'git', arguments: ['-c', 'core.longpaths=true', '-C', root, ...args], status: result.status, stdout: result.stdout, stderr: result.stderr });
    require(result.status === 0, 'Actual-default Git verification failed.');
    return result.stdout.trim();
}
require(git(['rev-parse', 'HEAD']) === worktree.actualCapturedDefault, 'Actual default commit changed.');
require(git(['status', '--porcelain', '--untracked-files=no']) === '', 'Actual default tracked source changed.');
require(inputs.sourceFiles.length === 13, 'Require the selected source inventory.');
for (const file of inputs.sourceFiles) {
    require(hash(path.join(root, file.path)) === file.sha256, `Actual default source changed: ${file.path}`);
}
const project = path.join(session, 'F042-sourcebench');
const bin = path.join(project, 'bin', 'Release', 'net12.0');
require(fs.existsSync(path.join(bin, 'AutoPerf.Benchmarks.dll')), 'Build the actual-owner harness first.');
const ownerName = 'Microsoft.AspNetCore.JsonPatch.SystemTextJson';
const projectOutputs = [
    ownerName,
    'Microsoft.AspNetCore.Http.Abstractions',
    'Microsoft.AspNetCore.Http.Features',
    'Microsoft.AspNetCore.Connections.Abstractions',
    'Microsoft.Net.Http.Headers',
    'Microsoft.Extensions.Features'
].map(name => {
    const expected = path.join(root, 'artifacts', 'bin', name, 'Release', 'net12.0', `${name}.dll`);
    const consumer = path.join(bin, `${name}.dll`);
    require(fs.existsSync(expected) && fs.existsSync(consumer) && hash(expected) === hash(consumer), `Require actual source-built dependency: ${name}`);
    return { name, actualDefaultOutput: expected, sha256: hash(expected) };
});
const sourcePdb = path.join(root, 'artifacts', 'bin', ownerName, 'Release', 'net12.0', `${ownerName}.pdb`);
require(hash(sourcePdb) === hash(path.join(bin, `${ownerName}.pdb`)), 'Require the actual built owner PDB.');
fs.mkdirSync(output);
const consumer = path.join(output, 'consumer');
fs.cpSync(bin, consumer, { recursive: true, errorOnExist: true, force: false });
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        require(!entry.isSymbolicLink(), 'Do not freeze symbolic-link dependencies.');
        return entry.isDirectory() ? files(file) : [file];
    });
}
const closure = {
    candidate: 'F042',
    actualVariant: 'CurrentDefault',
    actualSourceCommit: worktree.actualCapturedDefault,
    actualSourceComparison: false,
    files: files(consumer).map(file => ({ path: path.relative(consumer, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) })).sort((a, b) => a.path.localeCompare(b.path))
};
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
write(path.join(output, 'closure.json'), closure);
write(path.join(output, 'source-inputs.json'), { ...inputs, actualCurrentDefaultVerificationRoot: root, actualPurpose: 'Unmodified actual-current-default build and untimed public-producer characterization; no paired timing.', sourceFiles: inputs.sourceFiles });
fs.mkdirSync(path.join(output, 'state'));
fs.mkdirSync(path.join(output, 'reports'));
const receipt = {
    candidate: 'F042',
    actualSourceCommit: worktree.actualCapturedDefault,
    actualSourceRoot: root,
    actualFiles: closure.files.length,
    actualSelectedSourceInputs: inputs.sourceFiles.length,
    actualSourceBuiltProjectOutputs: projectOutputs,
    actualClosureSha256: hash(path.join(output, 'closure.json')),
    actualAllSourceAndImageInputsVerified: true,
    actualDefaultOwnerBuildPassed: read(path.join(run, 'validation', 'default-bootstrap-and-owner-build-003', 'command.json')).actualExitCode === 0,
    actualRuntimeCharacterizationPassed: false,
    actualTimingAuthorized: false,
    commands
};
require(receipt.actualDefaultOwnerBuildPassed, 'Require a successful actual-default build, not only emitted DLLs from a failed invocation.');
write(path.join(output, 'preparation.json'), receipt);
console.log(JSON.stringify({ actualFrozenFiles: closure.files.length, actualSourceBuiltDependencyBindings: projectOutputs.length, actualTimingAuthorized: false, actualNextGate: 'Execute the real public-producer characterization.' }, null, 2));
