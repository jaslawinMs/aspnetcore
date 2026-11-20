import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const session = path.resolve(root, '..', '..');
const published = path.join(session, 'autoperf-published-results');
const folder = 'F201-F203-aliases';
const output = path.join(published, folder);
const run = path.join(session, 'autoperf-runs', folder, 'publication-181');
assert.equal(fs.existsSync(output), false);
assert.equal(fs.existsSync(run), false);
fs.mkdirSync(run, { recursive: true });
const write = (target, value) => fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const gitHash = (type, value) => crypto.createHash('sha1').update(`${type} ${value.length}\0`).update(value).digest('hex');
const calls = [];
function command(executable, args)
{
    const result = spawnSync(executable, args, { cwd: 'C:\\src\\aspnetcore', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    assert.ifError(result.error);
    calls.push({ executable, args, actualExit: result.status, stdoutBytes: result.stdout.length,
        stdoutSha256: sha256(result.stdout), stderr: result.stderr.toString('utf8') });
    write(path.join(run, `source-command-${String(calls.length).padStart(3, '0')}.json`), calls.at(-1));
    assert.equal(result.status, 0, result.stderr.toString('utf8'));
    return result.stdout;
}
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const observedDefault = command('gh', ['api', 'repos/dotnet/aspnetcore/git/ref/heads/main', '--jq', '.object.sha']).toString('utf8').trim();
assert.equal(observedDefault, 'd3483989953ae3cccd773aea5ea04cb0c7198531');
assert.equal(command('git', ['--no-pager', '-C', published, 'rev-parse', 'HEAD']).toString('utf8').trim(),
    '774898c42b96f4f7ed9e11ab37534a1b9ad2f237');
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8'));
for (const id of ['F201', 'F202', 'F203'])
{
    assert.equal(ledger.candidates.find(item => item.id === id).status, 'pending');
}
fs.mkdirSync(output);
fs.mkdirSync(path.join(output, 'git-objects'));
const cache = new Map();
function object(type, sha)
{
    const key = type + ':' + sha;
    if (cache.has(key)) { return cache.get(key); }
    const value = command('git', ['--no-pager', 'cat-file', type, sha]);
    assert.equal(gitHash(type, value), sha);
    const target = path.join(output, 'git-objects', sha);
    if (fs.existsSync(target)) { assert.deepEqual(fs.readFileSync(target), value); }
    else { fs.writeFileSync(target, value, { flag: 'wx' }); }
    cache.set(key, value);
    return value;
}
function treeEntries(value)
{
    const entries = [];
    for (let offset = 0; offset < value.length;)
    {
        const space = value.indexOf(32, offset), zero = value.indexOf(0, space + 1);
        assert.ok(space > offset && zero > space && zero + 21 <= value.length);
        entries.push({ mode: value.subarray(offset, space).toString('ascii'),
            name: value.subarray(space + 1, zero).toString('utf8'),
            sha: value.subarray(zero + 1, zero + 21).toString('hex') });
        offset = zero + 21;
    }
    return entries;
}
const emitter = 'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs';
const generator = 'src/OpenApi/gen/XmlCommentGenerator.cs';
const project = 'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests.csproj';
const ids = ['F201', 'F202', 'F203'];
const snapshots = ids.map(id => ledger.candidates.find(item => item.id === id).finding.file);
const records = [];
const helpers = [];
for (const [role, commit] of [['Original', original], ['ObservedDefault', observedDefault]])
{
    const commitBytes = object('commit', commit);
    const rootTree = commitBytes.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
    for (const repoPath of [emitter, generator, project, ...snapshots])
    {
        let current = rootTree;
        const parts = repoPath.split('/');
        for (let index = 0; index < parts.length; index++)
        {
            const matches = treeEntries(object('tree', current)).filter(item => item.name === parts[index]);
            assert.equal(matches.length, 1, repoPath);
            assert.equal(matches[0].mode, index === parts.length - 1 ? '100644' : '40000');
            current = matches[0].sha;
        }
        const value = object('blob', current);
        const logical = `sources/${role}/${repoPath}`;
        const target = path.join(output, ...logical.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, value, { flag: 'wx' });
        const record = { role, commit, repoPath, file: logical, blobSha1: current, sha256: sha256(value) };
        if (repoPath === emitter || snapshots.includes(repoPath))
        {
            const text = value.toString('utf8');
            const matches = [...text.matchAll(/^    file static class JsonNodeExtensions\r?\n[\s\S]*?^    \}\r?$/gm)];
            assert.equal(matches.length, 1);
            const helper = matches[0][0].replaceAll('\r\n', '\n');
            helpers.push(helper);
            Object.assign(record, { helperLfSha256: sha256(Buffer.from(helper)),
                helperStartLine: text.slice(0, matches[0].index).split('\n').length,
                helperLineCount: helper.split('\n').length });
        }
        if (repoPath === emitter)
        {
            assert.ok(value.toString('utf8').includes('context.AddSource("OpenApiXmlCommentSupport.generated.cs", GenerateXmlCommentSupportSource('));
        }
        if (repoPath === generator)
        {
            assert.ok(value.toString('utf8').includes('context.RegisterSourceOutput(result,'));
            assert.ok(value.toString('utf8').includes('Emit(context, compiledXmlFileComments, generatedCommentsFromCompilation, groupedAddOpenApiInvocations);'));
        }
        records.push(record);
    }
}
assert.equal(helpers.length, 8);
assert.ok(helpers.every(item => item === helpers[0]));
for (const name of ['README.md', 'verify.mjs', '.gitattributes', 'prepare.mjs'])
{
    fs.copyFileSync(path.join(root, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
}
write(path.join(output, 'source-records.json'), {
    recordedUtc: new Date().toISOString(), original, observedDefault, records,
    actualRawGitObjectCount: cache.size, actualHelperCopiesCompared: helpers.length,
    canonicalRetainedFinding: 'F201', canonicalDispositionAtAliasClosure: 'pending',
    duplicateFindings: ['F202', 'F203'], actualNoRuntimeOrPerformanceConclusion: true
});
const material = (directory = output, prefix = '') => fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? material(path.join(directory, entry.name), prefix + entry.name + '/') :
        [{ file: prefix + entry.name, bytes: fs.statSync(path.join(directory, entry.name)).size,
            sha256: sha256(fs.readFileSync(path.join(directory, entry.name))) }]);
write(path.join(output, 'evidence-inputs.json'), { files: material() });
write(path.join(run, 'publication-config.json'), {
    folder, run, expectedParentIndex: '774898c42b96f4f7ed9e11ab37534a1b9ad2f237',
    performancePrAuthorized: false, completedComparisons: [], subtype: 'generated-helper-alias-of-pending-F201',
    outcomes: ['F202', 'F203'].map(id => ({
        id, status: 'duplicate',
        note: 'Staticgenerated-helperaliasofretainedF201,NOTfalsepositiveorperformanceresult. Both37e809Originalandd348observedDefaultsameemitterandall3snapshotscontainidenticalLF-projectedJsonNodeExtensionsclass;12rawsourcefileswithcommit/tree/blobmembershipsupplied. GeneratorRegisterSourceOutput->Emit->GenerateXmlCommentSupportSource->fixedAddSourcefilenameboundbysource. Only2aliasesclose;F201canonicalremainsPENDINGforindependentbehavior/materiality/performancequalification. No newcandidate/native/compiler/counters/comparison,budget0.',
        readmeRow: `| ${id} | Duplicate generated helper | [jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}): same emitted JSON helper as still-pending F201; no separate fix or performance claim. [Evidence](${folder}/README.md) |`
    })),
    authoredMarkdown: ['README.md'],
    evidenceCommitTitle: 'Record F202 and F203 as generated-helper aliases of pending F201',
    evidenceCommitDescription: 'Preserve raw source and Git membership for both frozen source roles and the shared XML comment emitter. Close only two redundant snapshot findings, not the canonical F201 investigation. No performance result, native execution, candidate or report change.',
    indexCommitTitle: 'Finalize two OpenAPI snapshot aliases at 236 of 358',
    issueSearch: '"F202 F203" in:title',
    issueTitle: '[AutoPerf F202 F203] Redundant XML example helper snapshots; canonical F201 remains open'
});
console.log(JSON.stringify({ records: records.length, rawGitObjects: cache.size, helperCopies: helpers.length,
    duplicates: ['F202', 'F203'], canonicalStillPending: 'F201', actualNoBenchmark: true, run }));
