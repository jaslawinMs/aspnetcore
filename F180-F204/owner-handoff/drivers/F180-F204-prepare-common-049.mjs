import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F180-F204-046');
const common = path.join(root, 'common-049');
assert(!fs.existsSync(common), 'Preserve an existing common compilation.');
assert(!fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')));
const { parsePe, hash } = await import(pathToFileURL(path.join(root, 'portable-metadata.mjs')).href);
fs.mkdirSync(common);
const write = (name, data) => fs.writeFileSync(path.join(common, name),
    Buffer.isBuffer(data) || typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
write('executed-prepare-common-049.mjs', fs.readFileSync(fileURLToPath(import.meta.url)));
write('Program.cs', fs.readFileSync(path.join(session, 'F180-F204-Probe-046.cs')));
const references = new Map();
const skipped = [];
for (const [role, directory] of [
    ['Original62-runtime-reference-image-not-compiler-runtime', String.raw`C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105`],
    ['inherited-native-original-source', path.join(root, 'inherited-original-source-native')]
]) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.dll')) continue;
        const file = path.join(directory, entry.name);
        const bytes = fs.readFileSync(file);
        const pe = parsePe(bytes);
        const record = { file, sourceRole: role, bytes: bytes.length, sha256: hash(bytes), parsedPe: pe };
        if (pe.mvid) references.set(entry.name.toLowerCase(), record);
        else skipped.push({ ...record, actualNotAManagedReference: true });
    }
}
assert(references.has('azureappservicessample.dll'));
assert(references.has('system.private.corelib.dll'));
assert(references.has('microsoft.aspnetcore.http.dll'));
assert(references.has('microsoft.extensions.logging.dll'));
const output = path.join(common, 'AzureSample.CommonProbe.dll');
const pdb = path.join(common, 'AzureSample.CommonProbe.pdb');
const lines = [
    '/nostdlib+', '/target:exe', '/langversion:13', '/nullable:enable',
    '/warnaserror+', '/debug:portable', '/deterministic+',
    `/out:"${output}"`, `/pdb:"${pdb}"`,
    ...[...references.values()].map(item => `/reference:"${item.file}"`),
    `"${path.join(common, 'Program.cs')}"`
];
write('compile.rsp', lines.join('\r\n') + '\r\n');
write('reference-inputs.json', { actualReferences: [...references.values()], actualSkippedNativeImages: skipped });
write('compile-plan.json', {
    actualActivationGraph: String.raw`C:\src\aspnetcore`,
    actualCompilerDll: String.raw`C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore\csc.dll`,
    actualResponseFile: path.join(common, 'compile.rsp'), actualOutput: output, actualPdb: pdb,
    actualSourceSha256: hash(fs.readFileSync(path.join(common, 'Program.cs'))),
    actualOneCommonCSharp13AssemblyIntendedForBothNativeRoles: true,
    actualNoCandidateOrPerformanceComparison: true
});
console.log(JSON.stringify({ actualPrepared: true, common, actualReferenceImages: references.size, skippedNativeImages: skipped.length }, null, 2));
