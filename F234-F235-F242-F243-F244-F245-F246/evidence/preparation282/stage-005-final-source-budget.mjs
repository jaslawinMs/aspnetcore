import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { output, sourceRoot, gitArguments, readJson, writeJson, writeNew, parseTree,
    captureWhole, gitOid, sha256 } from './source-core-v001.mjs';

writeJson('launches\\stage004\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4715', actualExitCodeAfterToolReturned: 0,
    observedOutput: { helperPid: 37564, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:43:36.5149206Z', observedUtc: '2026-11-21T04:43:37.2092902Z' },
    notProspectiveSelfExit: true
});
const roles = readJson('metadata\\roles.json');
const existingRecords = fs.readdirSync(path.join(output, 'inputs'))
    .filter(name => /^capture-.+\.json$/.test(name)).flatMap(name => readJson(`inputs\\${name}`));
for (const role of ['Original', 'Default']) {
    assert.equal(existingRecords.filter(record => record.role === role && record.type === 'blob').length, 12);
}
const docPath = 'docs/CrossCuttingGuidance.md';
const docTrees = {};
for (const role of ['Original', 'Default']) {
    const result = await sourceRoot(`crosscutting-doc-mode-${role.toLowerCase()}`, 'git', gitArguments(
        'ls-tree', '-z', roles[role], '--', docPath));
    const entries = parseTree(result.stdout);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].path, docPath);
    assert.equal(entries[0].type, 'blob');
    docTrees[role] = entries[0];
    writeJson(`metadata\\crosscutting-doc-tree-${role.toLowerCase()}.json`, entries);
}
const docRequests = ['Original', 'Default'].map(role => ({ role, commit: roles[role], path: docPath }));
const stdin = Buffer.from(docRequests.map(request => `${request.commit}:${request.path}`).join('\n') + '\n');
const batch = await sourceRoot('crosscutting-doc-whole-inputs', 'git', gitArguments('cat-file', '--batch'), stdin);
const docRecords = [];
let position = 0;
for (const request of docRequests) {
    const headerEnd = batch.stdout.indexOf(10, position);
    assert.ok(headerEnd >= position);
    const header = batch.stdout.subarray(position, headerEnd).toString('ascii');
    const match = /^([0-9a-f]{40}) blob ([0-9]+)$/.exec(header);
    assert.ok(match);
    const size = Number(match[2]), start = headerEnd + 1, end = start + size;
    assert.ok(end < batch.stdout.length);
    assert.equal(batch.stdout[end], 10);
    const bytes = batch.stdout.subarray(start, end);
    assert.equal(gitOid('blob', bytes), match[1]);
    assert.equal(docTrees[request.role].oid, match[1]);
    const rawPath = `inputs\\${request.role}\\docs\\CrossCuttingGuidance.md.raw`;
    writeNew(rawPath, bytes);
    docRecords.push({
        ...request, commitPath: `${request.commit}:${request.path}`, type: 'blob',
        mode: docTrees[request.role].mode, gitObjectId: match[1], bytes: size, sha256: sha256(bytes),
        rawPath, batchRoot: batch.relative,
        modeRoot: `metadata\\crosscutting-doc-tree-${request.role.toLowerCase()}.json`,
        frame: { headerStart: position, headerEndExclusive: headerEnd, header,
            bodyStart: start, bodyEndExclusive: end, trailingNewlineOffset: end },
        gitFramingAndIndependentObjectHashVerified: true, rawWholeBytesWithoutEolNormalization: true
    });
    position = end + 1;
}
assert.equal(position, batch.stdout.length);
writeJson('inputs\\capture-crosscutting-doc.json', docRecords);
const paths = [
    'src/Mvc/Mvc.Core/src/ApplicationModels/ControllerActionDescriptorBuilder.cs',
    'src/Mvc/Mvc.Core/src/ApplicationModels/DefaultApplicationModelProvider.cs'
];
const producerRecords = await captureWhole('final-descriptor-producer-whole-inputs', ['Original', 'Default'].flatMap(role =>
    paths.map(path => ({ role, commit: roles[role], path }))));
const history = await sourceRoot('website-removal-history-default', 'git', gitArguments(
    'log', '--max-count=12', '--name-status', '--format=%H%x09%aI%x09%an%x09%s', roles.Default, '--',
    'src/Mvc/test/WebSites/RoutingWebSite/StartupWithoutEndpointRouting.cs',
    'src/Mvc/test/WebSites/RoutingWebSite/Controllers/PageRouteController.cs'));
console.log(history.stdout.toString('utf8'));
const originalNames = await sourceRoot('provider-and-removal-type-reference-filenames-original', 'git', gitArguments(
    'grep', '-l', '-F', '-e', 'RemoveControllerActionDescriptorProvider', '-e', 'ControllerToRemove',
    roles.Original, '--', 'src/Mvc'));
writeJson('metadata\\provider-reference-filenames-original.json', {
    root: originalNames.relative, filenameOnlyDiscovery: true,
    filenames: originalNames.stdout.toString('utf8').trim().split(/\r?\n/)
});
console.log(originalNames.stdout.toString('utf8'));
const allRecords = [...existingRecords, ...docRecords, ...producerRecords];
const budget = {};
for (const role of ['Original', 'Default']) {
    const bodies = allRecords.filter(record => record.role === role && record.type === 'blob');
    assert.equal(bodies.length, 15);
    budget[role] = { wholeLogicalInputs: bodies.length, paths: bodies.map(record => record.path),
        totalRawBodyBytes: bodies.reduce((sum, record) => sum + record.bytes, 0) };
}
writeJson('metadata\\whole-input-budget-closed.json', {
    maximumPerRole: 15, used: budget, bodyCaptureClosed: true,
    noAdditionalBodiesWithoutParentExpansion: true,
    historyIsCommitAndFilenameMetadataOnly: true,
    directGitGhRootsUsed: fs.readdirSync(path.join(output, 'roots'), { withFileTypes: true })
        .filter(entry => entry.isDirectory()).length,
    maximumDirectGitGhRoots: 32
});
console.log(JSON.stringify({ records: [...docRecords, ...producerRecords].map(record => ({
    role: record.role, path: record.path, bytes: record.bytes, gitObjectId: record.gitObjectId, sha256: record.sha256
})), bodyBudgetClosedAt15PerRole: true }));
