import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042');
const root = 'C:\\src\\aspnetcore';
const variant = process.argv[2];
const require = (condition, message) => { if (!condition) throw new Error(message); };
require(variant === 'Original' || variant === 'Candidate', 'Choose Original or Candidate explicitly.');
const lower = variant.toLowerCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const ownerName = 'Microsoft.AspNetCore.JsonPatch.SystemTextJson';
const ownerSource = 'src\\Features\\JsonPatch.SystemTextJson\\src\\Internal\\DictionaryAdapterOfTU.cs';
const newTest = 'src\\Features\\JsonPatch.SystemTextJson\\test\\IntegrationTests\\DictionaryReplaceTest.cs';
const consumer = path.join(run, `consumer-${lower}`);
const closurePath = path.join(run, `consumer-${lower}-closure.json`);
const receiptPath = path.join(run, `${lower}-image-preparation.json`);
require(!fs.existsSync(consumer) && !fs.existsSync(closurePath) && !fs.existsSync(receiptPath), 'Do not overwrite a frozen primary image.');
const inputs = read(path.join(run, 'source-inputs-original.json'));
const commands = [];
function git(args) {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
    commands.push({ executable: 'git', arguments: ['-C', root, ...args], status: result.status, stdout: result.stdout, stderr: result.stderr });
    require(result.status === 0, 'Primary Git verification failed.');
    return result.stdout.trim();
}
require(git(['rev-parse', 'HEAD']) === inputs.actualPrimaryBaseline && git(['branch', '--show-current']) === 'autoperf/F042-jsonpatch-dictionary-replace',
    'Require the independent original primary baseline/branch before publication.');
const changed = git(['diff', '--name-only']).split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('/', '\\'));
require(variant === 'Original' ? changed.length === 0 : changed.length === 1 && changed[0] === ownerSource, 'Unexpected tracked source edits.');
const protectedFiles = read(path.join(run, 'current-default-worktree-relocation.json')).actualPrimaryProtectedBefore;
for (const [file, expected] of Object.entries(protectedFiles)) {
    require(hash(path.join(root, file)) === expected, `Protected primary file changed: ${file}`);
}
for (const file of read(path.join(run, 'harness-source-hashes.json')).files) {
    require(hash(path.join(run, 'harness', file.path)) === file.sha256, `Common harness source changed: ${file.path}`);
}
const sourceFiles = inputs.sourceFiles.map(file => ({ ...file, sha256: hash(path.join(root, file.path)) }));
const sourceChanges = sourceFiles.filter((file, index) => file.sha256 !== inputs.sourceFiles[index].sha256);
require(variant === 'Original' ? sourceChanges.length === 0 : sourceChanges.length === 1 && sourceChanges[0].path === ownerSource,
    'Require the actual original or exactly one changed candidate source file.');
const bin = variant === 'Original' ? path.join(run, 'harness', 'bin', 'Release', 'net12.0') : path.join(run, 'consumer-original');
require(fs.existsSync(path.join(bin, 'AutoPerf.Benchmarks.dll')), 'Build the common original harness first.');
const dependencyNames = [
    ownerName,
    'Microsoft.AspNetCore.Http.Abstractions',
    'Microsoft.AspNetCore.Http.Features',
    'Microsoft.AspNetCore.Connections.Abstractions',
    'Microsoft.Net.Http.Headers',
    'Microsoft.Extensions.Features'
];
const projectOutputs = dependencyNames.map(name => {
    const expected = path.join(root, 'artifacts', 'bin', name, 'Release', 'net12.0', `${name}.dll`);
    require(fs.existsSync(expected), `Actual source-built output absent: ${name}`);
    if (variant === 'Original' || name !== ownerName) {
        require(hash(expected) === hash(path.join(bin, `${name}.dll`)), `Unexpected source-built dependency drift: ${name}`);
    }
    return { name, actualPrimaryOutput: expected, sha256: hash(expected) };
});
require(read(path.join(run, 'validation', `${lower}-dictionary-tests-001`, 'command.json')).actualExitCode === 0,
    'Require the passed actual original/candidate dictionary test command.');
if (variant === 'Original') {
    require(read(path.join(run, 'validation', 'original-common-harness-build-001', 'command.json')).actualExitCode === 0,
        'Require the passed common-harness build.');
}
const ownerBin = path.join(root, 'artifacts', 'bin', ownerName, 'Release', 'net12.0');
if (variant === 'Original') {
    require(hash(path.join(ownerBin, `${ownerName}.pdb`)) === hash(path.join(bin, `${ownerName}.pdb`)), 'Original owner PDB drift.');
}
fs.cpSync(bin, consumer, { recursive: true, errorOnExist: true, force: false });
if (variant === 'Candidate') {
    for (const extension of ['dll', 'pdb']) {
        fs.copyFileSync(path.join(ownerBin, `${ownerName}.${extension}`), path.join(consumer, `${ownerName}.${extension}`));
    }
}
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        require(!entry.isSymbolicLink(), 'Do not freeze symbolic-link dependencies.');
        return entry.isDirectory() ? files(file) : [file];
    });
}
const closure = {
    candidate: 'F042',
    actualVariant: variant,
    actualPrimaryBaseline: inputs.actualPrimaryBaseline,
    actualSourceModified: variant === 'Candidate',
    files: files(consumer).map(file => ({ path: path.relative(consumer, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) })).sort((a, b) => a.path.localeCompare(b.path))
};
let differences = [];
if (variant === 'Candidate') {
    const original = read(path.join(run, 'consumer-original-closure.json'));
    require(original.files.length === closure.files.length && original.files.every((file, index) => file.path === closure.files[index].path),
        'Require identical complete image file inventories.');
    differences = closure.files.filter((file, index) => file.sha256 !== original.files[index].sha256).map(file => file.path);
    require(differences.length === 2 && differences.includes(`${ownerName}.dll`) && differences.includes(`${ownerName}.pdb`),
        'Only the actual owner DLL/PDB may differ; the measured harness and every dependency must be byte-identical.');
}
write(closurePath, closure);
let sourceRoot = path.join(run, 'source-files');
if (variant === 'Candidate') {
    sourceRoot = path.join(run, 'source-files-candidate');
    require(!fs.existsSync(sourceRoot), 'Do not overwrite candidate source snapshots.');
    for (const file of sourceFiles) {
        const destination = path.join(sourceRoot, file.path);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(root, file.path), destination);
    }
    write(path.join(run, 'source-inputs-candidate.json'), { ...inputs, actualSourceOptimizationEditPerformed: true,
        actualPhysicalSelectedSnapshot: sourceRoot, actualChangedOwnerSource: ownerSource, sourceFiles });
}
const testSnapshot = path.join(run, `new-tests-${lower}.cs`);
fs.copyFileSync(path.join(root, newTest), testSnapshot, fs.constants.COPYFILE_EXCL);
if (variant === 'Candidate') {
    require(hash(testSnapshot) === hash(path.join(run, 'new-tests-original.cs')), 'Preservation tests must remain unchanged across source variants.');
}
const execution = path.join(run, `${lower}-characterization-001`);
fs.mkdirSync(path.join(execution, 'evidence'), { recursive: true });
fs.mkdirSync(path.join(execution, 'reports'));
const receipt = {
    candidate: 'F042',
    actualVariant: variant,
    actualPrimaryBaseline: inputs.actualPrimaryBaseline,
    actualCommonHarnessBuiltOnlyOnceForPair: true,
    actualSourceSnapshot: sourceRoot,
    actualFiles: closure.files.length,
    actualDifferencesFromOriginal: differences,
    actualNewTestSourceSha256: hash(testSnapshot),
    actualSelectedSourceInputs: sourceFiles.length,
    actualSourceBuiltProjectOutputs: projectOutputs,
    actualClosureSha256: hash(closurePath),
    actualSourceComparisonsAuthorizedByThisPreparation: 0,
    actualProtectedPrimaryHashesPreserved: true,
    commands
};
write(receiptPath, receipt);
console.log(JSON.stringify({ actualVariant: variant, actualFrozenFiles: closure.files.length, actualDifferencesFromOriginal: differences,
    actualSourceComparisonsAuthorizedByThisPreparation: 0 }, null, 2));
