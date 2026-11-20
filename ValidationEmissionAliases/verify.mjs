import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const sha = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const bytes = file => fs.readFileSync(path.join(root, file));
const canonical = ['F343', 'F344', 'F345'];
const decision = read('alias-decision.json'), budgets = read('closed-alias-budgets.json');
assert.equal(decision.actualSourceEmissionAliases, 23);
assert.equal(decision.actualProductTestOrPerformanceRuns, 0);
assert.equal(decision.actualPerformancePrAuthorized, false);
assert.equal(decision.actualNoWholeFixtureOrGeneratedAssemblyRuntimeEquivalence, true);
assert.deepEqual(decision.actualCanonicalStudiesRemainPending, canonical);
assert.equal(budgets.length, 23);
assert.equal(new Set(budgets.map(item => item.findingId)).size, 23);
assert.deepEqual(budgets.map(item => item.findingId).sort(), decision.actualAliases.slice().sort());
for (const budget of budgets) {
    assert(!canonical.includes(budget.findingId));
    assert.equal(budget.maximumComparisons, 3);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.closed, true);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
    assert.equal(budget.actualCandidateWritten, false);
}
const copies = read('authoritative-copies.json');
for (const copy of copies) {
    assert.equal(bytes(copy.file).length, copy.bytes);
    assert.equal(sha(bytes(copy.file)), copy.sha256, copy.file);
}
for (const stage of ['capture', 'analyze', 'verify']) {
    const receipt = read('execution/' + stage + '.exit.json');
    assert.equal(receipt.actualExitCode, 0);
    assert.equal(receipt.actualRootTerminal, true);
    if (stage === 'capture') assert.equal(receipt.actualStreamsDrained, true);
    else {
        assert.equal(receipt.actualStdoutDrained, true);
        assert.equal(receipt.actualStderrDrained, true);
        assert.equal(receipt.actualSourceInputsReadOnly, true);
        assert.equal(receipt.actualNoProductCompilerTestConsumerOrPerformanceInvocation, true);
    }
}
const manifest = read('source-proof/source-manifest.json'), plan = read('source-proof/analysis-plan.json');
const source = (role, file) => {
    const rows = manifest.sources.filter(item => item.role === role && item.originalFile === 'src/Validation/gen/' + file);
    assert.equal(rows.length, 1);
    return bytes('source-proof/' + rows[0].file).toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
};
for (const role of ['Original', 'Default']) {
    const project = source(role, 'Microsoft.Extensions.Validation.ValidationsGenerator.csproj');
    assert(project.includes('<Compile Remove="Templates\\**\\*.cs" />'));
    assert(project.includes('<EmbeddedResource Include="Templates\\**\\*.cs" />'));
    const helper = source(role, 'Emitters/ValidationsGenerator.InfoClasses.Emitter.cs');
    assert(helper.includes('private static readonly Lazy<string> s_infoClasses = new(BuildInfoClasses);'));
    assert(helper.includes('internal static string EmitInfoClasses() => s_infoClasses.Value;'));
    assert(helper.includes('foreach (var template in s_infoClassTemplates)'));
    assert(helper.includes('n.EndsWith("." + template, StringComparison.Ordinal)'));
    assert(helper.includes('assembly.GetManifestResourceStream(resourceName)!'));
    assert(helper.includes('new StreamReader(stream, Encoding.UTF8)'));
    assert(helper.includes('foreach (var line in body.Replace("\\r\\n", "\\n").Split(\'\\n\'))'));
    assert(helper.includes('if (line.Length == 0)'));
    assert(helper.includes('sb.Append("    ").AppendLine(line);'));
    assert(helper.includes("return sb.ToString().TrimEnd('\\r', '\\n');"));
    const list = helper.match(/private static readonly string\[\] s_infoClassTemplates =\s*\[([\s\S]*?)\];/)?.[1];
    assert(list);
    assert.deepEqual([...list.matchAll(/"([^"]+\.cs)"/g)].map(item => item[1]), plan.templates);
    const emitter = source(role, 'Emitters/ValidationsGenerator.Emitter.cs');
    assert(emitter.includes('namespace Microsoft.Extensions.Validation.Generated'));
    assert(emitter.includes('{{EmitInfoClasses()}}'));
    assert(emitter.includes('context.AddSource("ValidatableInfoResolver.g.cs"'));
    assert(source(role, 'ValidationsGenerator.cs').includes('Emit(context, (emitInputs.Left, emitInputs.Right))'));
}
const base = read('source-proof/preservation-baseline.json');
assert.equal(base.actualPublishedHead, '7c8eccd84b536ee2a444b4bb536c364b4dce63d4');
assert.equal(base.actualFixedReportBlob, '73abf142464b1f81676e03a1eebc766c279cb47b');
assert.equal(base.actualProtectedGlobalJsonSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
const canonicalBefore = read('canonical-budget-preservation.json');
assert.deepEqual(canonicalBefore.actualCanonicalRecords.map(item => item.id).sort(), canonical);
assert(canonicalBefore.actualCanonicalRecords.every(item => item.status === 'pending'));
assert.equal(canonicalBefore.actualNoCanonicalBudgetCreatedOrModified, true);
const proofRoot = path.join(root, 'source-proof');
const args = ['--permission', '--allow-fs-read=' + proofRoot,
    path.join(proofRoot, 'tools', 'Validation-verify-alias-source-080.mjs'), proofRoot];
const audit = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(audit.error);
assert.equal(audit.status, 0, audit.stderr + audit.stdout);
const actual = JSON.parse(audit.stdout);
assert.equal(actual.actualAudit, 'PASS');
assert.equal(actual.actualIndependentlyMatchedWholeResourceAndReportedSeams, 52);
assert.equal(actual.actualIndependentMappingControlsPassed, 5);
assert.equal(actual.actualSourceEmissionAliases, 23);
assert.deepEqual(actual.actualCanonicalStudiesRemainPending, canonical);
let sealedFiles = null;
if (process.argv.includes('--require-seal')) {
    const seal = read('capsule-file-hashes.json');
    const inventory = (directory, prefix = '') => fs.readdirSync(directory, { withFileTypes: true })
        .flatMap(item => {
            assert(!item.isSymbolicLink());
            const relative = prefix ? prefix + '/' + item.name : item.name;
            return item.isDirectory() ? inventory(path.join(directory, item.name), relative) : [relative];
        });
    const actualFiles = inventory(root).filter(file => !['capsule-file-hashes.json', 'publication.json'].includes(file)).sort();
    assert.deepEqual(actualFiles, seal.files.map(item => item.file).sort());
    for (const file of seal.files) {
        assert.equal(bytes(file.file).length, file.bytes);
        assert.equal(sha(bytes(file.file)), file.sha256, file.file);
    }
    sealedFiles = seal.files.length;
}
console.log(JSON.stringify({ actualAudit: 'PASS', actualSourceOnly: true, actualCopiedFiles: copies.length,
    actualSourceSnapshots: actual.actualSourceSnapshots, actualRawGitObjects: actual.actualRawGitObjects,
    actualGitMemberships: actual.actualGitMemberships,
    actualIndependentWholeResourceAndReportedSeamObservations: 52,
    actualIndependentMappingControlsPassed: 5, actualPublicClosedAliasBudgets: 23,
    actualCanonicalStudiesRemainPending: canonical, actualSealedFiles: sealedFiles,
    actualProductCompilerTestConsumerOrPerformanceRuns: 0,
    actualNoCandidatePrWindowOrFixedReportChange: true,
    actualNotWholeFixtureOrGeneratedAssemblyRuntimeEquivalence: true }, null, 2));
