import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat, same } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const expected = [
  ['F187_MissingDirectoryIdentityAndRegisteredState', 22],
  ['F187_PublicRazorEnumeration_UsesRealProvider', 10],
  ['F188_MissingFileContractAndMutableLookup', 35],
  ['F188_PublicRazorMissingItemAndCompilerCache', 16],
  ['F188_PublicFileVersionProvider_CacheAndHelperInvalidation', 12],
  ['F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl', 33]
];
const accepted = [], historical = [];
for (const [role, version] of [['original', '12.0.0-alpha.1.26562.105'], ['default', '12.0.0-alpha.1.26569.107']]) {
  for (const cohort of ['001', '002']) {
    const relative = `reports/${role}-common-${cohort}.json`, report = readJson(path.join(root, relative));
    const terminal = readJson(path.join(root, `commands/raw/${role}-common-${cohort}.terminal.json`));
    requireThat(report.role === role && report.status === 'PENDING', 'Actual common role/status');
    same(report.rows.map(row => row.Name), expected.map(([name]) => name), 'Every stable common case must actually execute');
    requireThat(report.identity.processId === terminal.root.processId && report.identity.creationUtc === terminal.root.creationUtc, 'Actual common identity matches creation-bound recorder root');
    requireThat(terminal.bothStreamsDrained && terminal.rootExited && terminal.observedDescendantsDrained, 'Common invocation did not drain');
    const corelib = report.identity.assemblies.filter(assembly => assembly.name === 'System.Private.CoreLib');
    const clr = report.identity.modules.filter(module => path.basename(module.path).toLowerCase() === 'coreclr.dll');
    requireThat(corelib.length === 1 && clr.length === 1 && corelib[0].path.includes(version) && clr[0].path.includes(version), 'Actual normal assertion runtime is separate from SDK57/hostfxr65');
    const data = {
      role, cohort, path: relative, sha256: sha256(fs.readFileSync(path.join(root, relative))),
      result: report.result, rows: report.rows.length,
      passedRows: report.rows.filter(row => row.Result === 'Passed').length,
      failedRows: report.rows.filter(row => row.Result === 'Failed').length,
      assertions: report.rows.reduce((sum, row) => sum + row.Assertions.length, 0),
      passedAssertions: report.rows.reduce((sum, row) => sum + row.Assertions.filter(assertion => assertion.Passed).length, 0),
      cases: report.rows.map(row => ({ name: row.Name, result: row.Result, assertions: row.Assertions.length, passedAssertions: row.Assertions.filter(assertion => assertion.Passed).length, failure: row.Failure })),
      processId: report.identity.processId, creationUtc: report.identity.creationUtc,
      common: report.identity.assemblies.find(assembly => assembly.name === 'AutoPerf.Mvc.HelperPreparation'),
      actualRuntime: { frameworkDescription: report.identity.runtime, environmentVersion: report.identity.environmentVersion, corelib: corelib[0], coreclr: clr[0] },
      selectedActualAssemblies: report.identity.assemblies
    };
    if (cohort === '002') {
      requireThat(terminal.exitCode === 0 && report.result === 'PASS', 'Accepted common cohort did not pass');
      for (const [index, [name, assertions]] of expected.entries()) {
        const row = report.rows[index];
        requireThat(row.Name === name && row.Result === 'Passed' && row.Failure === null && row.Assertions.length === assertions && row.Assertions.every(assertion => assertion.Passed) && row.Observations.length > 0, 'Actual accepted common case/assertion/producer observation is incomplete');
      }
      const hosted = report.rows[5].Observations[0];
      requireThat(hosted.events.length === 8 && hosted.events.every(event => event.Path === '/constructorinjection'), 'Hosted passive observations must come from the actual control producer, never negative target route');
      accepted.push(data);
    } else {
      requireThat(terminal.exitCode === 1 && data.failedRows === 1 && data.passedRows === 5 && data.assertions === 119 && data.passedAssertions === 118, 'Preserved earlier common failure cohort changed');
      historical.push(data);
    }
  }
}
same(accepted.map(item => item.common.sha256), [accepted[0].common.sha256, accepted[0].common.sha256], 'Accepted common image must be byte-identical across roles');
same(historical.map(item => item.common.sha256), [historical[0].common.sha256, historical[0].common.sha256], 'Earlier compiled common image must be byte-identical across its two role executions');
requireThat(accepted[0].common.sha256 !== historical[0].common.sha256, 'Separate repaired consumer cohorts were not preserved');
const compilationReceipts = fs.readdirSync(path.join(root, 'commands', 'raw')).filter(name => /^common-compile-[0-9]+\.terminal\.json$/.test(name)).sort().map(name => readJson(path.join(root, 'commands', 'raw', name)));
const compilations = compilationReceipts.map(receipt => ({ label: receipt.label, exitCode: receipt.exitCode, arguments: receipt.arguments, root: receipt.root, bothStreamsDrained: receipt.bothStreamsDrained }));
requireThat(compilations.length === 2 && compilations.every(receipt => receipt.exitCode === 0 && receipt.bothStreamsDrained), 'Every actual common compilation must be counted');
const result = {
  findingsStatus: 'PENDING', accepted, historical, compilations,
  successfulCommonCompilations: compilations.filter(receipt => receipt.exitCode === 0).length,
  failedCommonCompilations: compilations.filter(receipt => receipt.exitCode !== 0).length,
  acceptedRows: accepted.reduce((sum, item) => sum + item.rows, 0),
  acceptedAssertions: accepted.reduce((sum, item) => sum + item.assertions, 0),
  historicalRows: historical.reduce((sum, item) => sum + item.rows, 0),
  historicalAssertions: historical.reduce((sum, item) => sum + item.assertions, 0),
  boundary: 'Correctness-only separate actual role/cohort observations. Native assertion counts are not inferred. No allocation, timing, invocation-frequency, material-workload performance or disposition result.'
};
fs.writeFileSync(path.join(root, 'research', 'consumer-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', acceptedRows: result.acceptedRows, acceptedAssertions: result.acceptedAssertions, successfulCommonCompilations: result.successfulCommonCompilations, failedCommonCompilations: result.failedCommonCompilations, historicalRows: result.historicalRows, historicalAssertions: result.historicalAssertions }));
