import { readJson, writeJson, captureWhole } from './source-core-v001.mjs';

writeJson('launches\\stage002\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4713', actualExitCodeAfterToolReturned: 0,
    observedOutput: { helperPid: 44780, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:42:22.6084553Z', observedUtc: '2026-11-21T04:42:23.7517450Z' },
    notProspectiveSelfExit: true
});
const roles = readJson('metadata\\roles.json');
const tree = readJson('metadata\\tree-default.json');
console.log(JSON.stringify({ filenameMetadataOnly: tree.filter(entry =>
    (/Mvc\.FunctionalTests\/.*Routing.*\.cs$/.test(entry.path)) ||
    (/WebSites\/RoutingWebSite\/Controllers\/[^/]+\.cs$/.test(entry.path)) ||
    (/ControllerActionDescriptorBuilder\.cs$|DefaultApplicationModelProvider\.cs$/.test(entry.path))
).map(entry => ({ path: entry.path, mode: entry.mode, oid: entry.oid })) }));
const paths = [
    'src/Mvc/test/WebSites/RoutingWebSite/StartupWithoutEndpointRouting.cs',
    'src/Mvc/Mvc.Core/src/ApplicationModels/ControllerActionDescriptorProvider.cs',
    'src/Mvc/Mvc.Core/src/Infrastructure/DefaultActionDescriptorCollectionProvider.cs'
];
const requests = ['Original', 'Default'].flatMap(role => paths.map(path => ({
    role, commit: roles[role], path
})));
const records = await captureWhole('website-and-descriptor-producers', requests);
console.log(JSON.stringify({ wholeInputsPerRoleNow: 6, records: records.map(record => ({
    role: record.role, path: record.path, bytes: record.bytes, gitObjectId: record.gitObjectId, sha256: record.sha256
})) }));
