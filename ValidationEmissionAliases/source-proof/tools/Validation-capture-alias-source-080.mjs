import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-ValidationAliases-080');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitSha = (type, bytes) => crypto.createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const ledgerFile = path.join(session, 'autoperf-campaign.json');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const records = ledger.candidates.filter(item => Number(item.id.slice(1)) >= 343 && Number(item.id.slice(1)) <= 368);
assert.equal(records.length, 26);
assert(records.every(item => item.status === 'pending'));
assert(!fs.existsSync(root));
fs.mkdirSync(root);
for (const directory of ['git-native', 'git-objects', 'tools']) fs.mkdirSync(path.join(root, directory));
const toolNames = ['Validation-capture-alias-source-080.mjs', 'Validation-analyze-alias-source-080.mjs',
    'Validation-verify-alias-source-080.mjs'];
const tools = toolNames.map(file => {
    const bytes = fs.readFileSync(path.join(session, file));
    fs.writeFileSync(path.join(root, 'tools', file), bytes, { flag: 'wx' });
    return { file, bytes: bytes.length, sha256: sha(bytes) };
});
const templates = ['DisplayNameInfo.cs', 'LocalizationHelpers.cs', 'ValidatableInfo.cs', 'ValidatableTypeInfo.cs',
    'ValidatablePropertyInfo.cs', 'ValidatableParameterInfo.cs', 'RuntimeValidatableParameterInfoResolver.cs'];
const families = [
    { canonical: 'F343', ids: ['F343', 'F346', 'F349', 'F353', 'F356', 'F359', 'F364', 'F368'],
        template: 'RuntimeValidatableParameterInfoResolver.cs', kind: 'parameter-resolver-class',
        className: 'RuntimeValidatableParameterInfoResolver', scope: 'Whole identical file-local runtime resolver resource; reported range must contain the parameter validation-attribute reflection expression.' },
    { canonical: 'F344', ids: ['F344', 'F347', 'F351', 'F354', 'F357', 'F362', 'F366'],
        template: 'ValidatableTypeInfo.cs', kind: 'type-constructor', className: 'ValidatableTypeInfo',
        scope: 'Whole identical resource plus exact reported GetInterfaces assignment in its constructor.' },
    { canonical: 'F345', ids: ['F345', 'F348', 'F350', 'F352', 'F355', 'F358', 'F360', 'F361', 'F363', 'F365', 'F367'],
        template: 'ValidatablePropertyInfo.cs', kind: 'property-accessor', className: 'ValidatablePropertyInfo',
        scope: 'Whole identical resource plus exact two-line private Property declaration; reported range must intersect that declaration or its lookup, never an unrelated member.' }
];
assert.deepEqual(families.flatMap(item => item.ids).sort(), records.map(item => item.id).sort());
const plan = {
    schema: 'Validation-source-emission-alias-plan-080-v1', recordedAt: new Date().toISOString(),
    original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    observedDefault: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    sourceRoleGraphs: { Original: 'C:\\src\\ap-F198-o048', Default: 'C:\\src\\ap-F198-d048' },
    actualSourceOnly: true, actualNoProductCompilerTestConsumerOrPerformanceInvocation: true,
    actualNoCandidateOrCanonicalVerdict: true, actualCanonicalBudgetsUntouched: true,
    actualOriginalRecordsAndHumanAbbreviatedSnippetsPreserved: true,
    actualNotRequiringInventoryAbbreviationsToBeLiteralCSharp: true,
    actualNoWhitespaceOrIdentifierNormalizationForResourceIdentity: true,
    actualOnlyStreamReaderUtf8BomAndCrlfNewlineProjectionThenExactDocumentedFourSpaceEmission: true,
    actualAcceptanceRequiresUniqueEntireTemplateAndExactReportedOwnerSeamOnBothPins: true,
    actualNoWholeFixtureOrGeneratedAssemblyRuntimeEquivalence: true,
    proposedAliasesIfEveryPredeclaredProofPasses: 23, actualInputRecords: 26, families, templates, tools,
    actualNegativeControls: ['changed-resource-rejected', 'duplicated-resource-rejected',
        'wrong-reported-member-rejected', 'wrong-card-rejected', 'unrelated-fixture-trivia-retains-source-alias']
};
write(path.join(root, 'analysis-plan.json'), plan);
write(path.join(root, 'retained-findings.json'), records);
let sequence = 0;
function execute(cwd, executable, args) {
    const result = spawnSync(executable, args, { cwd, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    const label = String(++sequence).padStart(3, '0');
    const stdout = result.stdout ?? Buffer.alloc(0), stderr = result.stderr ?? Buffer.alloc(0);
    fs.writeFileSync(path.join(root, 'git-native', label + '.stdout'), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(root, 'git-native', label + '.stderr'), stderr, { flag: 'wx' });
    write(path.join(root, 'git-native', label + '.json'), {
        actualExecutable: executable, actualArguments: args, actualWorkingDirectory: cwd,
        actualExitCode: result.status, actualPid: result.pid ?? null,
        actualCreationAndDescendantsNotObserved: true, actualNoProcessStop: true,
        stdoutSha256: sha(stdout), stderrSha256: sha(stderr)
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, stderr.toString());
    return stdout;
}
const git = (cwd, ...args) => execute(cwd, 'git', ['--no-pager', ...args]);
assert.equal(execute('C:\\src\\aspnetcore', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'])
    .toString().trim(), plan.observedDefault);
const ownerFiles = [...templates.map(name => 'src/Validation/gen/Templates/' + name),
    'src/Validation/gen/Emitters/ValidationsGenerator.Emitter.cs',
    'src/Validation/gen/Emitters/ValidationsGenerator.InfoClasses.Emitter.cs',
    'src/Validation/gen/Microsoft.Extensions.Validation.ValidationsGenerator.csproj',
    'src/Validation/gen/ValidationsGenerator.cs'];
const files = [...new Set([...ownerFiles, ...records.map(item => item.finding.file)])].sort();
assert.equal(files.length, 22);
const objects = new Map(), memberships = [], sources = [];
function object(graph, type, id) {
    if (objects.has(id)) {
        assert.equal(objects.get(id).type, type);
        return fs.readFileSync(path.join(root, objects.get(id).file));
    }
    const bytes = git(graph, 'cat-file', type, id);
    assert.equal(gitSha(type, bytes), id);
    const file = path.join('git-objects', id + '.raw');
    fs.writeFileSync(path.join(root, file), bytes, { flag: 'wx' });
    objects.set(id, { type, id, file, bytes: bytes.length, sha256: sha(bytes) });
    return bytes;
}
function tree(bytes) {
    const entries = [];
    for (let offset = 0; offset < bytes.length;) {
        const space = bytes.indexOf(0x20, offset), zero = bytes.indexOf(0, space + 1);
        assert(space > offset && zero > space);
        entries.push({ mode: bytes.subarray(offset, space).toString('ascii'),
            name: bytes.subarray(space + 1, zero).toString('utf8'),
            id: bytes.subarray(zero + 1, zero + 21).toString('hex') });
        offset = zero + 21;
        assert(offset <= bytes.length);
    }
    return entries;
}
for (const role of ['Original', 'Default']) {
    const graph = plan.sourceRoleGraphs[role], commit = role === 'Original' ? plan.original : plan.observedDefault;
    assert.equal(git(graph, 'rev-parse', 'HEAD').toString().trim(), commit);
    assert.equal(git(graph, 'status', '--porcelain', '--untracked-files=no').toString().trim(), '');
    const rawCommit = object(graph, 'commit', commit);
    const rootTree = rawCommit.toString('utf8').match(/^tree ([a-f0-9]{40})\n/)?.[1];
    assert(rootTree);
    for (const [index, originalFile] of files.entries()) {
        let current = rootTree;
        const edges = [], parts = originalFile.split('/');
        for (const [partIndex, name] of parts.entries()) {
            const matches = tree(object(graph, 'tree', current)).filter(item => item.name === name);
            assert.equal(matches.length, 1, originalFile);
            const entry = matches[0], last = partIndex === parts.length - 1;
            assert.equal(entry.mode, last ? '100644' : '40000');
            edges.push({ tree: current, name, mode: entry.mode, target: entry.id });
            current = entry.id;
        }
        const bytes = object(graph, 'blob', current);
        const logical = path.join('source', role, String(index + 1).padStart(3, '0') + path.extname(originalFile));
        fs.mkdirSync(path.dirname(path.join(root, logical)), { recursive: true });
        fs.writeFileSync(path.join(root, logical), bytes, { flag: 'wx' });
        sources.push({ role, commit, originalFile, file: logical, bytes: bytes.length, sha256: sha(bytes), gitBlob: current });
        memberships.push({ role, commit, originalFile, rootTree, blob: current, edges });
    }
    for (const originalFile of ['src/Validation/gen/Emitters/ValidationsGenerator.InfoClasses.Emitter.cs',
        'src/Validation/gen/Templates/ValidatablePropertyInfo.cs',
        'src/Validation/gen/Templates/ValidatableTypeInfo.cs',
        'src/Validation/gen/Templates/RuntimeValidatableParameterInfoResolver.cs']) {
        git(graph, 'log', '-6', '--format=%H %cI %s', commit, '--', originalFile);
    }
}
write(path.join(root, 'source-manifest.json'), { actualSourceSnapshots: sources.length, actualDistinctSnapshotFiles: 11,
    sources, objects: [...objects.values()], memberships });
write(path.join(root, 'preservation-baseline.json'), {
    actualPrivateLedgerSha256: sha(fs.readFileSync(ledgerFile)),
    actualCoordinatorHead: git('C:\\src\\aspnetcore', 'rev-parse', 'HEAD').toString().trim(),
    actualProtectedGlobalJsonSha256: sha(fs.readFileSync('C:\\src\\aspnetcore\\global.json')),
    actualPublishedHead: git(path.join(session, 'autoperf-published-results'), 'rev-parse', 'HEAD').toString().trim(),
    actualFixedReportBlob: git(path.join(session, 'autoperf-published-results'), 'rev-parse', 'HEAD:REPORT.md').toString().trim()
});
write(path.join(root, 'plan-seal.json'), { actualBeforeSourceAnalysisExecution: true,
    actualPlanSha256: sha(fs.readFileSync(path.join(root, 'analysis-plan.json'))),
    actualFindingsSha256: sha(fs.readFileSync(path.join(root, 'retained-findings.json'))),
    actualSourceManifestSha256: sha(fs.readFileSync(path.join(root, 'source-manifest.json'))),
    recordedAt: new Date().toISOString() });
console.log(JSON.stringify({ actualCaptured: sources.length, actualRawGitObjects: objects.size,
    actualMemberships: memberships.length, actualReadOnlyGitGhCommands: sequence,
    actualPreAnalysisSealWritten: true, actualProductNativeOrPerformanceRuns: 0 }, null, 2));
