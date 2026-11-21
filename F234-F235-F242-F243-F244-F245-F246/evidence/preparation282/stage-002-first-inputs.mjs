import { sourceRoot, gitArguments, readJson, writeJson, captureWhole } from './source-core-v001.mjs';

writeJson('launches\\stage001\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4712', actualExitCodeAfterToolReturned: 0,
    observedOutput: {
        helperPid: 22288, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:41:53.5422032Z', observedUtc: '2026-11-21T04:41:55.8270962Z'
    },
    notProspectiveSelfExit: true
});
const roles = readJson('metadata\\roles.json');
const references = await sourceRoot('provider-reference-filenames-default', 'git', gitArguments(
    'grep', '-l', '-F', '-e', 'RemoveControllerActionDescriptorProvider', roles.Default, '--', 'src/Mvc'));
writeJson('metadata\\provider-reference-filenames-default.json', {
    root: references.relative, filenameOnlyDiscovery: true,
    filenames: references.stdout.toString('utf8').trim().split(/\r?\n/)
});
console.log(references.stdout.toString('utf8'));
const history = await sourceRoot('target-history-default', 'git', gitArguments(
    'log', '--max-count=12', '--format=%H%x09%aI%x09%an%x09%s', roles.Default, '--',
    'src/Mvc/test/WebSites/RoutingWebSite/RemoveControllerActionDescriptorProvider.cs'));
console.log(history.stdout.toString('utf8'));
const paths = [
    'src/Mvc/AGENTS.md',
    '.github/instructions/cross-cutting-guidance.instructions.md',
    'src/Mvc/test/WebSites/RoutingWebSite/RemoveControllerActionDescriptorProvider.cs'
];
const requests = Object.entries(roles).filter(([role]) => role === 'Original' || role === 'Default')
    .flatMap(([role, commit]) => [{ role, commit }, ...paths.map(path => ({ role, commit, path }))]);
const records = await captureWhole('first-whole-inputs', requests);
console.log(JSON.stringify({ records: records.map(record => ({
    role: record.role, path: record.path ?? '(commit)', bytes: record.bytes,
    gitObjectId: record.gitObjectId, sha256: record.sha256
})) }));
