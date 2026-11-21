import { sourceRoot, gitArguments, readJson, writeJson, captureWhole } from './source-core-v001.mjs';

writeJson('launches\\stage003\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4714', actualExitCodeAfterToolReturned: 0,
    observedOutput: { helperPid: 40508, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:42:57.6896257Z', observedUtc: '2026-11-21T04:42:58.0564200Z' },
    notProspectiveSelfExit: true
});
const roles = readJson('metadata\\roles.json');
const references = await sourceRoot('legacy-startup-reference-filenames-default', 'git', gitArguments(
    'grep', '-l', '-F', '-e', 'StartupWithoutEndpointRouting', roles.Default, '--', 'src/Mvc'));
writeJson('metadata\\legacy-startup-reference-filenames-default.json', {
    root: references.relative, filenameOnlyDiscovery: true,
    filenames: references.stdout.toString('utf8').trim().split(/\r?\n/)
});
console.log(references.stdout.toString('utf8'));
const paths = [
    'src/Mvc/test/WebSites/RoutingWebSite/Startup.cs',
    'src/Mvc/test/WebSites/RoutingWebSite/Controllers/PageRouteController.cs',
    'src/Mvc/test/WebSites/RoutingWebSite/Controllers/EndpointRoutingController.cs',
    'src/Mvc/test/Mvc.FunctionalTests/RoutingTests.cs',
    'src/Mvc/test/Mvc.FunctionalTests/RoutingTestsBase.cs',
    'src/Mvc/test/Mvc.FunctionalTests/Infrastructure/MvcTestFixture.cs'
];
const records = await captureWhole('real-setup-and-tests', ['Original', 'Default'].flatMap(role =>
    paths.map(path => ({ role, commit: roles[role], path }))));
console.log(JSON.stringify({ wholeInputsPerRoleNow: 12, records: records.map(record => ({
    role: record.role, path: record.path, bytes: record.bytes, gitObjectId: record.gitObjectId, sha256: record.sha256
})) }));
