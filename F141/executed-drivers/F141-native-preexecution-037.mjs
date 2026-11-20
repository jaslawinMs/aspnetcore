import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F141-nativeaot-035');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const plan = read(path.join(root, 'acceptance-before-nativeaot-035.json'));
for (const item of plan.actualCopiedInputs)
{
    assert.equal(hash(fs.readFileSync(path.join(root, ...item.file.split('/')))), item.sha256);
}
const publishExit = read(path.join(root, 'invocations', 'publish-after-restore-036', 'exit.json'));
assert.equal(publishExit.actualExitCode, 0);
assert.ok(publishExit.actualRootTerminal && publishExit.actualStdoutDrained && publishExit.actualStderrDrained);
assert.ok(publishExit.actualObservedDescendantTerminalChecks.every(item => !item.actualSameCreationLive));
const exe = path.join(plan.actualPublishDirectory, 'AutoPerf.SignalR.NativeUploadProbe.exe');
const bytes = fs.readFileSync(exe), offset = bytes.readUInt32LE(0x3c);
assert.equal(bytes.readUInt32LE(offset), 0x4550);
assert.equal(bytes.readUInt16LE(offset + 4), 0x8664);
const optional = offset + 24;
assert.equal(bytes.readUInt16LE(optional), 0x20b);
assert.equal(bytes.readUInt32LE(optional + 112 + 14 * 8), 0);
assert.equal(bytes.readUInt32LE(optional + 112 + 14 * 8 + 4), 0);
const artifacts = [];
function walk(directory)
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        const file = path.join(directory, entry.name);
        assert.equal(entry.isSymbolicLink(), false);
        if (entry.isDirectory()) { walk(file); }
        else if (entry.name.endsWith('.rsp'))
        {
            const data = fs.readFileSync(file);
            artifacts.push({ file, sha256: hash(data),
                actualClientReferenceLines: data.toString('utf8').split(/\r?\n/).filter(line => line.includes('Microsoft.AspNetCore.SignalR.Client.Core.dll')) });
        }
    }
}
walk(path.join(root, 'testassets', 'NativeUploadProbe', 'obj'));
assert.ok(artifacts.some(item => item.actualClientReferenceLines.length > 0));
const receipt = { recordedAt: new Date().toISOString(), actualOriginalClientInputMvid: plan.actualOwnerIlInputs[0].actualPe.mvid,
    actualNativeExecutable: exe, actualNativeExecutableSha256: hash(bytes), actualNativeExecutableBytes: bytes.length,
    actualAmd64Pe32PlusWithNoClrDirectory: true, actualPublishRootAndObservedChildrenTerminalAndBothStreamsDrained: true,
    actualResponseFiles: artifacts, actualGeneratedNativeCodeLogPresent: true,
    actualRuntimeCapabilityAndWireAssertionsNotExecutedYet: true, actualNoBenchmarkOrCounter: true };
assert.match(fs.readFileSync(path.join(root, 'invocations', 'publish-after-restore-036', 'stdout.txt'), 'utf8'), /Generating native code/);
fs.writeFileSync(path.join(root, 'native-preexecution-037.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualNativePeAccepted: true, actualNativeExeBytes: bytes.length,
    actualNativeRuntimeAssertionsNotYetRun: true, actualReferenceResponseFiles: artifacts.length }, null, 2));
