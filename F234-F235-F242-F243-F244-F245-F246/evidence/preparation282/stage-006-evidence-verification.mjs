import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { output, owner, guard, sourceRoot, gitArguments, readJson, writeJson, parseTree, gitOid, sha256 } from './source-core-v001.mjs';

writeJson('launches\\stage005\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4716', actualExitCodeAfterToolReturned: 0,
    observedOutput: { helperPid: 38148, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:44:26.3880186Z', observedUtc: '2026-11-21T04:44:28.0078122Z' },
    notProspectiveSelfExit: true
});
const reserved = await sourceRoot('reserved-checkout-final-identity', 'git', gitArguments('log', '-1', '--format=%H%n%D', 'HEAD'));
const reservedLines = reserved.stdout.toString('utf8').trim().split(/\r?\n/);
assert.equal(reservedLines[0], '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.ok(reservedLines[1].includes('HEAD -> autoperf/F145-hoist-large-response-utf8-encoding'));
guard('source-capture-closed');
const roles = readJson('metadata\\roles.json');
const records = fs.readdirSync(path.join(output, 'inputs')).filter(name => /^capture-.+\.json$/.test(name))
    .flatMap(name => readJson(`inputs\\${name}`));
assert.equal(records.length, 32);
const originalTree = parseTree(fs.readFileSync(path.join(output, 'roots\\004-tree-original\\stdout.bin')));
const defaultTree = parseTree(fs.readFileSync(path.join(output, 'roots\\005-tree-default\\stdout.bin')));
assert.deepEqual(originalTree, readJson('metadata\\tree-original.json'));
assert.deepEqual(defaultTree, readJson('metadata\\tree-default.json'));
const verifiedInputs = [];
for (const record of records) {
    assert.equal(record.commit, roles[record.role]);
    const raw = fs.readFileSync(path.join(output, record.rawPath));
    assert.equal(raw.length, record.bytes);
    assert.equal(sha256(raw), record.sha256);
    assert.equal(gitOid(record.type, raw), record.gitObjectId);
    const framed = fs.readFileSync(path.join(output, record.batchRoot, 'stdout.bin'));
    const frame = record.frame;
    assert.equal(framed.subarray(frame.headerStart, frame.headerEndExclusive).toString('ascii'), frame.header);
    assert.equal(framed[frame.headerEndExclusive], 10);
    assert.equal(framed[frame.trailingNewlineOffset], 10);
    assert.ok(raw.equals(framed.subarray(frame.bodyStart, frame.bodyEndExclusive)));
    if (record.type === 'blob') {
        let tree = record.role === 'Original' ? originalTree : defaultTree;
        if (record.path === 'docs/CrossCuttingGuidance.md') {
            const number = record.role === 'Original' ? '012-crosscutting-doc-mode-original' : '013-crosscutting-doc-mode-default';
            tree = parseTree(fs.readFileSync(path.join(output, 'roots', number, 'stdout.bin')));
        }
        const entry = tree.find(item => item.path === record.path);
        assert.ok(entry);
        assert.equal(entry.mode, record.mode);
        assert.equal(entry.oid, record.gitObjectId);
        assert.equal(entry.type, 'blob');
    } else {
        assert.equal(record.gitObjectId, record.commit);
    }
    verifiedInputs.push({ role: record.role, commitPath: record.commitPath, type: record.type,
        mode: record.mode, bytes: raw.length, sha256: record.sha256, gitObjectId: record.gitObjectId,
        rawPath: record.rawPath, batchRoot: record.batchRoot, independentlyReverifiedAgainstSavedRawGitOutput: true });
}
const roots = fs.readdirSync(path.join(output, 'roots'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert.equal(roots.length, 18);
const verifiedRoots = [];
for (const name of roots) {
    const command = readJson(`roots\\${name}\\command.json`);
    const terminal = readJson(`roots\\${name}\\terminal.json`);
    const stdin = fs.readFileSync(path.join(output, 'roots', name, 'stdin.bin'));
    const stdout = fs.readFileSync(path.join(output, 'roots', name, 'stdout.bin'));
    const stderr = fs.readFileSync(path.join(output, 'roots', name, 'stderr.bin'));
    assert.ok(command.executable === 'git' || command.executable === 'gh');
    assert.equal(stdin.length, command.stdinBytes);
    assert.equal(sha256(stdin), command.stdinSha256);
    assert.equal(stdout.length, terminal.stdoutBytes);
    assert.equal(sha256(stdout), terminal.stdoutSha256);
    assert.equal(stderr.length, terminal.stderrBytes);
    assert.equal(sha256(stderr), terminal.stderrSha256);
    assert.equal(terminal.actualDirectRootSuccess, true);
    assert.equal(terminal.exitCode, 0);
    assert.equal(terminal.exitObserved, true);
    assert.equal(terminal.closeObserved, true);
    assert.equal(terminal.stdoutEndObserved, true);
    assert.equal(terminal.stderrEndObserved, true);
    assert.equal(terminal.deadlineExpired, false);
    const guardRecord = readJson(`controls\\${name}-guard.json`);
    const policyBytes = fs.readFileSync(path.join(output, `controls\\${name}-policy.raw.json`));
    const registrationBytes = fs.readFileSync(path.join(output, `controls\\${name}-registration.raw.json`));
    const campaignBytes = fs.readFileSync(path.join(output, `controls\\${name}-campaign.raw.json`));
    assert.equal(sha256(policyBytes), guardRecord.policySha256);
    assert.equal(sha256(registrationBytes), guardRecord.registrationSha256);
    assert.equal(sha256(campaignBytes), guardRecord.campaignSha256);
    const policy = JSON.parse(policyBytes), registration = JSON.parse(registrationBytes), campaign = JSON.parse(campaignBytes);
    assert.equal(policy.independentFindingPreparationWorkers.F242, owner);
    assert.equal(policy.activeWorkerPreparationScopes.F242, registration.exactScopes.F242);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
    assert.equal(campaign.candidates.find(candidate => candidate.id === 'F242').status, 'pending');
    assert.equal(guardRecord.leaseAbsent, true);
    verifiedRoots.push({ directory: name, pid: terminal.pid, exitCode: terminal.exitCode,
        completePipesObserved: terminal.completePipesObserved,
        creationBoundExpired: terminal.deadlineExpired,
        guardRawFileSha256: sha256(fs.readFileSync(path.join(output, `controls\\${name}-guard.json`))),
        leaseAbsenceIsRecordedPointObservationNotReconstructedHistoricalFilesystemProof: true });
}
const roleBodies = {};
for (const role of ['Original', 'Default']) {
    roleBodies[role] = records.filter(record => record.role === role && record.type === 'blob');
    assert.equal(roleBodies[role].length, 15);
    assert.equal(new Set(roleBodies[role].map(record => record.path)).size, 15);
}
const sameSelectedRawInputs = roleBodies.Original.map(record => {
    const other = roleBodies.Default.find(candidate => candidate.path === record.path);
    assert.ok(other);
    assert.equal(record.gitObjectId, other.gitObjectId);
    assert.equal(record.sha256, other.sha256);
    assert.equal(record.bytes, other.bytes);
    assert.equal(record.mode, other.mode);
    return { path: record.path, gitObjectId: record.gitObjectId, sha256: record.sha256, bytes: record.bytes,
        mode: record.mode, sameSelectedRawBytesOnlyNotRuntimeOrBinaryEquivalence: true };
});

const anchorDefinitions = [
    ['src/Mvc/test/WebSites/RoutingWebSite/RemoveControllerActionDescriptorProvider.cs', [
        ['retained-array-and-order', 'public RemoveControllerActionDescriptorProvider', 2, 7],
        ['loop-and-membership', 'foreach (var item in context.Results.ToList())', 2, 16],
        ['mutable-rule-properties', 'public class ControllerToRemove', 0, 5]
    ]],
    ['src/Mvc/test/WebSites/RoutingWebSite/StartupWithoutEndpointRouting.cs', [
        ['legacy-pipeline', 'public override void Configure(IApplicationBuilder app)', 0, 8],
        ['legacy-options-and-retained-rules', 'protected override void ConfigureMvcOptions', 1, 26]
    ]],
    ['src/Mvc/test/WebSites/RoutingWebSite/Startup.cs', [
        ['real-service-setup', 'public void ConfigureServices', 0, 25]
    ]],
    ['src/Mvc/test/WebSites/RoutingWebSite/Controllers/PageRouteController.cs', [
        ['declared-two-page-actions', 'public class PageRouteController', 0, 30]
    ]],
    ['src/Mvc/test/WebSites/RoutingWebSite/Controllers/EndpointRoutingController.cs', [
        ['declared-endpoint-actions', 'public class EndpointRoutingController', 1, 34]
    ]],
    ['src/Mvc/Mvc.Core/src/ApplicationModels/ControllerActionDescriptorProvider.cs', [
        ['provider-order-and-add', 'public int Order => -1000;', 0, 16],
        ['controller-feature-to-model-to-descriptor', 'internal IEnumerable<ControllerActionDescriptor> GetDescriptors()', 0, 18]
    ]],
    ['src/Mvc/Mvc.Core/src/ApplicationModels/ControllerActionDescriptorBuilder.cs', [
        ['flatten-and-descriptor-fields', 'public static IList<ControllerActionDescriptor> Build', 0, 32]
    ]],
    ['src/Mvc/Mvc.Core/src/ApplicationModels/DefaultApplicationModelProvider.cs', [
        ['reflection-action-producer', 'foreach (var controllerType in context.ControllerTypes)', 0, 45],
        ['action-name-producer', 'var actionName = attributes.OfType<ActionNameAttribute>().FirstOrDefault();', 0, 11],
        ['async-suffix-canonicalization', 'private string CanonicalizeActionName', 0, 14],
        ['is-action', 'internal static bool IsAction', 0, 62],
        ['selector-shape', 'if (routeProviders.Count == 0 && !createSelectorForSilentRouteProviders)', 1, 64]
    ]],
    ['src/Mvc/Mvc.Core/src/Infrastructure/DefaultActionDescriptorCollectionProvider.cs', [
        ['provider-sort-and-change-subscription', 'public DefaultActionDescriptorCollectionProvider(', 0, 24],
        ['cached-descriptor-getter', 'public override ActionDescriptorCollection ActionDescriptors', 0, 15],
        ['lazy-initialization', 'private void Initialize()', 0, 22],
        ['ordered-update-calls', 'private void UpdateCollection()', 0, 26],
        ['cache-publication', '_collection = new ActionDescriptorCollection(', 3, 17]
    ]],
    ['src/Mvc/test/Mvc.FunctionalTests/RoutingTests.cs', [
        ['legacy-test-startup-and-endpoint-assertion', 'public class RoutingTests : RoutingTestsBase<RoutingWebSite.StartupWithoutEndpointRouting>', 0, 19]
    ]],
    ['src/Mvc/test/Mvc.FunctionalTests/RoutingTestsBase.cs', [
        ['fixture-creation-and-disposal-hook', 'protected override void Initialize(', 3, 16],
        ['page-controller-http-contract-test', 'public async Task ConventionalRoutedAction_RouteContainsPage_RouteNotMatched()', 1, 17],
        ['after-routing-http-test', 'public async Task CanRunMiddlewareAfterRouting()', 1, 12],
        ['page-parameter-link-test', 'public async Task CanUseLinkGeneration_To_ConventionalActionWithPageParameter()', 1, 12]
    ]],
    ['src/Mvc/test/Mvc.FunctionalTests/Infrastructure/MvcTestFixture.cs', [
        ['host-environment', 'protected override void ConfigureWebHost', 0, 25],
        ['real-host-factory-boundary', 'protected override IHost CreateHost', 0, 20]
    ]],
    ['docs/CrossCuttingGuidance.md', [
        ['performance-guidance', '### Performance, allocations, caching, and pooling', 0, 6],
        ['test-guidance', '### Tests, determinism, and test utilities', 0, 8]
    ]]
];
const anchors = [];
for (const [sourcePath, definitions] of anchorDefinitions) {
    const record = roleBodies.Original.find(candidate => candidate.path === sourcePath);
    assert.ok(record);
    const bytes = fs.readFileSync(path.join(output, record.rawPath));
    const starts = [0];
    for (let index = 0; index < bytes.length; index++) if (bytes[index] === 10 && index + 1 < bytes.length) starts.push(index + 1);
    const fileAnchors = [];
    for (const [key, literal, before, after] of definitions) {
        const at = bytes.indexOf(Buffer.from(literal));
        assert.ok(at >= 0, `Missing anchor ${key}`);
        const containingLine = starts.findLastIndex(offset => offset <= at) + 1;
        const startLine = Math.max(1, containingLine - before);
        const endLine = Math.min(starts.length, containingLine + after);
        const startByte = starts[startLine - 1];
        const endByteExclusive = endLine < starts.length ? starts[endLine] : bytes.length;
        fileAnchors.push({ key, startLine, endLine, startByte, endByteExclusive,
            spanSha256: sha256(bytes.subarray(startByte, endByteExclusive)) });
    }
    anchors.push({ path: sourcePath, OriginalRawPath: record.rawPath,
        DefaultRawPath: roleBodies.Default.find(candidate => candidate.path === sourcePath).rawPath,
        gitObjectId: record.gitObjectId, wholeRawSha256: record.sha256,
        identicalSelectedBytesAcrossRoles: true, anchors: fileAnchors });
}
writeJson('EVIDENCE-ANCHORS.json', { lineNumbering: '1-based LF boundaries over exact saved whole raw bytes; no rewritten source views',
    primarySourceEvidence: 'Saved raw git cat-file frame plus independent object hash and ls-tree mode, not this derived index alone',
    inputs: anchors });
const optionalPaths = [
    'src/Mvc/Mvc.Core/src/ApplicationModels/ApplicationModelFactory.cs',
    'src/Mvc/Mvc.Core/src/Controllers/ControllerActionDescriptor.cs',
    'src/Mvc/Mvc.Core/src/DependencyInjection/MvcCoreServiceCollectionExtensions.cs',
    'src/Mvc/Mvc.Testing/src/WebApplicationFactory.cs'
];
const proposalFilenameMetadata = optionalPaths.map(sourcePath => ({
    path: sourcePath,
    Original: originalTree.find(entry => entry.path === sourcePath) ?? null,
    Default: defaultTree.find(entry => entry.path === sourcePath) ?? null,
    bodyNotCapturedOrRead: true
}));
writeJson('SOURCE-VERIFICATION.json', {
    finding: 'F242', turn: 282, owner, sourceOnly: true, roles,
    selectedWholeBodyBudget: { maximumPerRole: 15, Original: 15, Default: 15, commonGuidanceChargedPerRole: 3 },
    verifiedInputs, selectedRawInputIdentity: sameSelectedRawInputs,
    directGitGhSourceRoots: { used: roots.length, maximum: 32, failures: 0, verifiedRoots },
    completeCapturedSourceFrameAndRawBodyProvenance: true,
    sourceBodyCaptureClosed: true, noFurtherSourceBodiesAuthorized: true,
    reservedBranchAndHeadMatchedAtStartAndEndOfSourceRoots: true,
    reservedWorkingTreeFilesNotAttested: 'No working-tree content was used for either immutable source role. No working-tree write operation was executed.',
    executionBoundary: 'No SDK, dotnet, restore/build/test, C# producer execution, selected binaries, scenario, host/server/browser, measurement, allocation, profiler, subagent, remote helper, candidate, shared/policy/lease/ledger/publication write.',
    terminalLimit: 'Direct source roots have actual exit and both pipe endings. Node/PowerShell stage roots are separately recorded after return. Descendants were not exhaustively enumerated; no universal descendant or unrelated-process absence claim.',
    optionalUncapturedFilenameMetadata: proposalFilenameMetadata,
    thisStageOwnOuterExitNotYetKnown: true
});
console.log(JSON.stringify({ directGitGhRoots: roots.length, wholeBodiesPerRole: 15,
    sourceRolePins: roles, selectedRawInputsIdentical: sameSelectedRawInputs.length,
    anchors: anchors.map(item => ({ path: item.path, anchors: item.anchors.map(anchor => ({
        key: anchor.key, lines: `${anchor.startLine}-${anchor.endLine}`
    })) })), optionalUncapturedFilenameMetadata: proposalFilenameMetadata }));
