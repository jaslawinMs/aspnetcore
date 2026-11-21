import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const original = String.raw`C:\src\ap-F208-o193`;
const current = String.raw`C:\src\ap-F208-d193`;
const originalPin = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const defaultPin = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
const files = [
    String.raw`src\Middleware\Spa\SpaServices.Extensions\src\Npm\NodeScriptRunner.cs`,
    String.raw`src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj`,
    String.raw`src\Middleware\Spa\SpaServices.Extensions\test\NodeScriptRunnerTests.cs`,
    String.raw`src\Middleware\Spa\SpaServices.Extensions\testassets\NodeScriptRunner\run`
];
const test = 'Microsoft.AspNetCore.SpaServices.Extensions.Tests.NodeScriptRunnerTests.AttachToLogger_FiltersAndNormalizesRealNodeOutput';
const text = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const read = file => JSON.parse(text(file));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function git(graph, args, allowMissing = false) {
    try {
        return execFileSync('git', ['--no-optional-locks', '-C', graph, ...args],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (error) {
        if (allowMissing) { return null; }
        throw error;
    }
}
assert.equal(fs.existsSync('HANDOFF.json'), false);
const xmlRows = read('source-test-rows.json');
const rows = attempt => xmlRows[attempt]?.rows ?? [];
const commands = [];
for (const directory of fs.readdirSync('.', { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const recordPath = path.join(directory.name, 'record.json');
    if (!fs.existsSync(recordPath)) { continue; }
    const record = read(recordPath);
    assert.ok(record.root.terminal && record.stdoutTerminal && record.stderrTerminal && record.allObservedOwnedNativeTerminal);
    assert.equal(record.performanceAuthorizations, 0);
    const number = Number(directory.name.split('-').find(part => /^\d+$/.test(part)));
    const wrapper = number <= 5 ? String.raw`red-005-native\inputs\invoke-native.ps1`
        : number <= 10 ? String.raw`red-006-filter-boundary\inputs\invoke-native.ps1`
        : String.raw`default-011-red-cached-runtime\invoke-native.ps1`;
    if (record.runnerSha256) { assert.equal(hash(wrapper), record.runnerSha256); }
    commands.push({
        attempt: directory.name, record: recordPath, recordSha256: hash(recordPath),
        host: record.hostPath, workingDirectory: record.graph, arguments: record.arguments,
        environment: record.environment, exitCode: record.exitCode, root: record.root,
        observedChildCount: record.observedChildren.length, observedChildrenTerminal: true,
        redirectedStreamsTerminal: true, wrapper, wrapperSha256: hash(wrapper),
        applicationRuntime: record.applicationRuntime ?? null, actualRows: rows(directory.name)
    });
}
assert.equal(commands.length, 15);
write('COMMANDS.json', commands);
const rowProof = [];
const testRows = {};
for (const [role, before, after] of [
    ['original', 'red-006-filter-boundary', 'original-014-final-green'],
    ['default', 'default-011-red-cached-runtime', 'default-015-final-green']
]) {
    assert.equal(rows(before).length, 4);
    assert.equal(rows(after).length, 18);
    assert.ok(rows(after).every(row => row.outcome === 'Passed'));
    testRows[role] = { baseline: rows(before), candidate: rows(after) };
    for (const level of ['Information', 'Error', 'Critical', 'None']) {
        const testName = `${test}(minimumLevel: ${level})`;
        const red = rows(before).find(row => row.testName === testName);
        const green = rows(after).find(row => row.testName === testName);
        assert.ok(red && green);
        if (['Critical', 'None'].includes(level)) {
            assert.equal(red.outcome, 'Failed');
            assert.ok(red.failureMessage.includes('Collections differ') && red.failureMessage.includes('progress\\rfirst error'));
        } else { assert.equal(red.outcome, 'Passed'); }
        rowProof.push({ role, testName, baselineTestId: red.testId, candidateTestId: green.testId,
            testIdUnchanged: red.testId === green.testId, baselineExecutionId: red.executionId,
            baselineOutcome: red.outcome, candidateExecutionId: green.executionId,
            candidateOutcome: green.outcome, baselineAttempt: before, candidateAttempt: after });
    }
}
write('test-rows.json', testRows);
write('red-green-row-proof.json', rowProof);
const fixtureProof = [], changed = [];
for (const [role, graph, pin, baselineInputs] of [
    ['original', original, originalPin, String.raw`red-006-filter-boundary\inputs`],
    ['default', current, defaultPin, String.raw`default-010-red-native\inputs`]
]) {
    assert.equal(git(graph, ['rev-parse', 'HEAD']), pin);
    const finalFixture = text(path.join(graph, files[2]));
    const strippedFixture = finalFixture.replace('[Collection(nameof(NodeScriptRunnerTests))]\n', '')
        .replace('    [CollectionDefinition(nameof(NodeScriptRunnerTests), DisableParallelization = true)]\n'
            + '    public sealed class ConsoleCollection\n    {\n    }\n\n', '');
    assert.equal(strippedFixture, text(path.join(baselineInputs, 'NodeScriptRunnerTests.cs')));
    const expectedSource = text(path.join(baselineInputs, 'NodeScriptRunner.cs'))
        .replace('StdErr.OnReceivedLine += line =>\n        {\n            if (!string.IsNullOrWhiteSpace(line))',
            'StdErr.OnReceivedLine += line =>\n        {\n            if (!string.IsNullOrWhiteSpace(line) && logger.IsEnabled(LogLevel.Error))');
    assert.equal(text(path.join(graph, files[0])), expectedSource);
    fixtureProof.push({ role, baselineFixtureSha256: hash(path.join(baselineInputs, 'NodeScriptRunnerTests.cs')),
        finalFixtureSha256: hash(path.join(graph, files[2])), identicalProducerAndAssertions: true,
        onlyFixtureDifference: 'Named nonparallel collection metadata isolates Console.SetOut.',
        shippingSourceOnlyOneGuardChanged: true });
    changed.push({ role, graph, sourceCommit: pin, patch: `${role}.patch`, patchSha256: hash(`${role}.patch`),
        gitDiffCheckExit: 0, gitReverseApplyCheckExit: 0,
        files: files.map(file => ({ path: file, baselineGitBlob: git(graph,
            ['rev-parse', `${pin}:${file.replaceAll('\\', '/')}`], true),
        candidateRawSha256: hash(path.join(graph, file)),
        candidateRawGitBlob: git(graph, ['hash-object', '--no-filters', '--', file]),
        bytes: fs.statSync(path.join(graph, file)).size })) });
}
write('fixture-source-proof.json', fixtureProof);
write('changed-files.json', changed);
const reserved = String.raw`C:\src\aspnetcore`;
const head = git(reserved, ['rev-parse', 'HEAD']);
const branch = git(reserved, ['branch', '--show-current']);
const status = git(reserved, ['status', '--porcelain=v1', '--untracked-files=normal']).split(/\r?\n/);
assert.equal(head, '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(branch, 'autoperf/F145-hoist-large-response-utf8-encoding');
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(status.map(line => line.slice(3)).sort(), [...reports].sort());
assert.ok(status.every(line => line.startsWith('?? ')));
write('reserved-root-final.json', { head, branch, status, ownerWroteReservedWorktree: false,
    reports: reports.map(file => ({ path: file, finalSha256: hash(path.join(reserved, file)) })),
    limit: 'Initial report byte hashes were not captured; initial/final branch, HEAD, names and tracked status match.' });
assert.equal(read('upstream-source-pin.json').defaultCommit, defaultPin);
assert.equal(read('upstream-default-recheck.json').sha, defaultPin);
const terminal = read('owned-terminal-check-016.json');
assert.ok(terminal.allObservedOwnedIdentitiesTerminal && !terminal.actualBenchmarkLeasePresent);
assert.equal(terminal.nativeRoots, 15);
const acceptance = read('ACCEPTANCE.json');
write('ACCEPTANCE-defined-before-implementation.json', acceptance);
write('ACCEPTANCE-result.json', { ...acceptance, status: 'passed-at-declared-producer-correctness-boundary',
    finalNativeProjectRowsPerRole: 18, redGreenEvidence: 'red-green-row-proof.json', performanceQualified: false });
write('HANDOFF.json', {
    schema: 1, finding: 'F208', card: 'expensive-branch-result-computed-eagerly', sealedAtUtc: new Date().toISOString(),
    state: 'private-candidate-correctness-qualified-only', coordinatorOwnsFinalDispositionTimingAndPublication: true,
    sourcePins: { original: originalPin, actualUpstreamDefault: defaultPin,
        freshSourceReceipt: 'upstream-source-pin.json', finalDefaultRecheck: 'upstream-default-recheck.json',
        graphs: [original, current] },
    change: { shipping: 'Only add logger.IsEnabled(LogLevel.Error) to the existing non-whitespace stderr-line condition.',
        tests: 'One four-row real-Node theory in the existing SpaServices.Extensions.Tests project, a gated Node asset, and its content-copy item.',
        publicApiDefaultsOrConventionsChanged: false, exactDiffAndHashIndex: 'changed-files.json',
        indexSha256: hash('changed-files.json'), privateGitState: 'Detached source pins; two new test files have intent-to-add entries only. No commit/push/PR/issue.' },
    rationale: 'Real Node stderr generated five already-normalized ILogger.Log attempts even when the real LoggerFactory discarded Error. The guard avoids preparing that unused branch and matches stdout. This is a conditional mechanism improvement, not evidence of a worthwhile performance win.',
    evidenceBoundary: {
        producer: 'Actual NodeScriptRunner Process.Start -> Node fixture process.stderr -> redirected StandardError -> EventedStreamReader.Run -> AttachToLogger.',
        filter: 'Real LoggerFactory category Microsoft.AspNetCore.SpaServices; Information/Error/Critical/None thresholds. Recording logger forwards to that real factory.',
        observable: 'Normalized attempted messages before the factory filter, real provider sink output, exact raw error capture, progress Console forwarding, EOF and exit code.',
        covered: ['ANSI SGR and ANSI-only lines', 'CRLF/LF multiline, empty and whitespace-only lines',
            'literal braces and final unterminated stderr', 'partial stderr Console forwarding regardless of threshold',
            'raw EventedStreamStringReader capture independent of filtering',
            'each fixture awaits runner exit 0 and both stream-closed events'],
        notBypassed: 'No synthetic event/delegate invocation, uninitialized runner, standalone compiler or replacement stream reader.',
        limits: ['Node is passed directly as package-manager command to the extensionless run fixture; complete npm/Angular/React CLI applications were not installed or exercised.',
            'Windows only; no cross-OS or long-running CLI workload qualification.',
            'No incidence, realistic volume, CPU, throughput, latency, allocation or materiality evidence.'] },
    correctness: { nativeProject: files[1], test, regressions: ['Critical', 'None'],
        nearestControls: ['Information', 'Error'], baselinePerRole: 'Two expected failing disabled rows; both enabled controls passed.',
        candidatePerRole: 'All 18 native project rows passed; 4 producer rows and 14 existing controls; no skips.',
        exactRowsAndExecutionIdentities: 'test-rows.json', redGreenIdentityProof: 'red-green-row-proof.json',
        assertionsUnchangedProof: 'fixture-source-proof.json', acceptance: 'ACCEPTANCE-result.json' },
    historyAndRelatedWork: {
        stdoutGuardPrecedent: '103560b3d4b322779638e4f3e127f59a98a41847 / upstream PR47837; history-2023-guard.diff.',
        newDefaultProcessChange: '0328b915263b84541e57b75f824e79a75f2d5ed3 / PR70669 only changes ProcessStartInfo to InheritedHandles=[] at this file; untouched.',
        duplicateChecks: 'No F208 fork branch or matching F208/NodeScriptRunner fork PR found; current upstream remains eager. Search receipts preserved, not an exhaustive unpublished-branch claim.',
        scope: 'No F200/F201/F214/F236/F345 code, graph, policy or ledger changes.' },
    exceptionSemantics: {
        sourceOnly: 'No catch, regex, timeout, process-start wrapping or stream-reader implementation changed. Enabled output retains one-second regex replacement then LogError, now after IsEnabled. Disabled output intentionally skips both operations. New IsEnabled exceptions, stateful filters and RegexMatchTimeoutException were not forced. EventedStreamReader.Run does not catch callback exceptions; no universal exception-equivalence claim.',
        rawStartupErrorDiagnostics: 'Production Angular/React readers subscribe independently to StdErr; exact raw capture is preserved in the theory.' },
    nativeExecution: {
        allCommandsArgumentsEnvironmentExits: 'COMMANDS.json', commandManifestSha256: hash('COMMANDS.json'),
        nativeRoots: 15, allObservedOwnedRootsChildrenAndStreamsTerminal: true,
        terminalReceipt: 'owned-terminal-check-016.json', forcedOwnedProcessStops: 0,
        sdk: '12.0.100-alpha.1.26557.102; each command activated its exact graph and refused ambient SDK fallback.',
        constraints: 'max2 build nodes; concurrent final role builds used one each; no node reuse/shared compilation.',
        defaultRuntime: 'Exact cached 12.0.0-alpha.1.26569.107 materialized privately; no download/install/downgrade. 200 file hashes in cached-default-runtime.json. SDK activation remains graph-local; explicit DOTNET_ROOT_X64 selects private application runtime.',
        originalRuntimeLimit: 'Runtimeconfig requires 12.0.0-alpha.1.26562.105; selected Original runtime was not separately instrumented. No exact performance-runtime pairing claim.',
        preservedFailures: [
            'red-001-no-restore: missing generated imports, exit1; recovered by bounded GenerateFiles target.',
            'red-003-no-assets and default-008-no-assets: NETSDK1004, exit1; only then restored each native test graph.',
            'red-005-native and red-006-filter-boundary: expected Original disabled-row assertion failures, exit1.',
            'default-010-red-native: testhost missing runtime69, exit1 and zero rows. All four producer cases blocked before assertions; recovered from exact existing cache in default-011.',
            'default-011-red-cached-runtime: expected Default disabled-row assertion failures, exit1.',
            'default-010 rows.json: failed null-row parser output retained, superseded by actual-rows.json, COMMANDS.json and real TRX.',
            'seal-017-python-missing: source-only sealing interpreter alias exited9009 before script execution. No Python install; replaced with existing Node/PowerShell tooling.' ] },
    performanceAndMateriality: { comparisonsAuthorized: 0, benchmarksWarmupsCountersProfilersExecuted: 0,
        performanceQualified: false, limits: 'Developer CLI output only; Error normally enabled. Added enabled-path IsEnabled cost and real-world benefit unmeasured. No performance or false-positive disposition.' },
    reservedWorktree: 'reserved-root-final.json; expected branch/HEAD and four unrelated untracked reports retained; no owner writes.',
    policyLeaseRegistryLedgerWrites: false, publicationOrBrowserActions: false, artifactHashIndex: 'ARTIFACTS.sha256.json'
});
const artifacts = [];
function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) { walk(file); }
        else if (entry.isFile() && file !== 'ARTIFACTS.sha256.json') {
            artifacts.push({ path: file, bytes: fs.statSync(file).size, sha256: hash(file) });
        }
    }
}
walk('.');
write('ARTIFACTS.sha256.json', artifacts);
console.log(JSON.stringify({ handoff: path.join(root, 'HANDOFF.json'), handoffSha256: hash('HANDOFF.json'),
    changedFileIndexSha256: hash('changed-files.json'), artifactIndexSha256: hash('ARTIFACTS.sha256.json'),
    nativeBuildTestRootsTerminal: 15, candidateNativeRowsPassedPerRole: 18, performanceAuthorizations: 0 }, null, 2));
