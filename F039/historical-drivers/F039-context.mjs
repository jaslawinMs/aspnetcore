import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F039');
const investigation = JSON.parse(fs.readFileSync(path.join(run, 'investigation.json'), 'utf8'));
const output = path.join(run, 'context');
fs.mkdirSync(output);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(output, 'executed-driver.mjs'));
const calls = [];
function capture(name, executable, args) {
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(output, `${name}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(output, `${name}.stderr`), result.stderr ?? Buffer.alloc(0));
  calls.push({ name, executable, arguments: args, actualStartedUtc: started,
    actualFinishedUtc: new Date().toISOString(), actualExitCode: result.status });
  fs.writeFileSync(path.join(output, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  return result.stdout;
}
const target = 'src/Components/Endpoints/src/TempData/TempData.cs';
capture('lazy-load-contract-fix', 'git', ['--no-pager', 'show', '--format=fuller',
  'e55796c6188a4b94f79129aa0a4eb7dafd2b31f6', '--', target,
  'src/Components/Endpoints/test/TempData/TempDataTest.cs']);
capture('serialization-owner-history', 'git', ['--no-pager', 'show', '--format=fuller',
  '2daa22c6508224fcc2f6d0d8fa576d0148545c46', '--', target]);
const proposal = JSON.parse(capture('feature-design-proposal', 'gh',
  ['api', 'repos/dotnet/aspnetcore/issues/65039']).toString());
const openIds = investigation.actualBoundedExistingWorkQueries
  .find(query => query.query === 'repo:dotnet/aspnetcore is:pr is:open TempData').items.map(item => item.number);
const work = [];
for (const id of openIds) {
  const pages = JSON.parse(capture(`open-${id}-all-files`, 'gh',
    ['api', '--paginate', '--slurp', `repos/dotnet/aspnetcore/pulls/${id}/files?per_page=100`]).toString());
  const files = pages.flat();
  work.push({ number: id, actualChangedFilesChecked: files.length,
    actualOwnerFileChanges: files.filter(file => file.filename === target),
    actualTempDataRelatedFiles: files.filter(file => /TempData|StoredDataSerializer/.test(file.filename))
      .map(file => ({ filename: file.filename, status: file.status, patch: file.patch })) });
}
const selected = [
  'src/Components/Endpoints/src/Results/RazorComponentResult.cs',
  'src/Components/Endpoints/src/Results/RazorComponentResultOfT.cs',
  'src/Components/Endpoints/src/Results/RazorComponentResultExecutor.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.Prerendering.cs',
  'src/Components/Endpoints/src/RazorComponentEndpointInvoker.cs',
  'src/Components/Endpoints/src/DependencyInjection/RazorComponentsServiceCollectionExtensions.cs',
  'src/Components/Endpoints/src/TempData/CookieTempDataProvider.cs',
  'src/Components/test/E2ETest/Tests/TempDataCookieTest.cs',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const pairs = selected.map((file, index) => {
  const prefix = String(index + 1).padStart(3, '0');
  const baseline = capture(`${prefix}-baseline`, 'git', ['show', `${investigation.baseline}:${file}`]);
  const current = capture(`${prefix}-default`, 'git', ['show', `${investigation.actualFreshDefault}:${file}`]);
  if (!baseline.equals(current))
    capture(`${prefix}-excluded-default-drift`, 'git',
      ['--no-pager', 'diff', investigation.baseline, investigation.actualFreshDefault, '--', file]);
  return { file, actualBaselineBlobSha256: sha(baseline), actualDefaultBlobSha256: sha(current),
    actualDefaultEqualsBaseline: baseline.equals(current) };
});
const result = {
  candidate: 'F039', actualHistoryAndAuthoritativeDesignCaptured: true,
  actualFeatureProposal: proposal.html_url,
  actualInitiallySelectedPairs: investigation.actualSelectedSourcePairs.length,
  actualAdditionalSelectedPairs: pairs,
  actualAllSelectedPairs: [...investigation.actualSelectedSourcePairs, ...pairs],
  actualAllSelectedBaselineMatches: investigation.actualSelectedBaselineMatches + pairs.filter(pair => pair.actualDefaultEqualsBaseline).length,
  actualOpenProposalsAudited: work,
  actualBoundedOpenWorkChangesTargetOwner: work.some(item => item.actualOwnerFileChanges.length),
  actualNoGlobalAbsenceOrNoveltyClaim: true,
  actualKeyCompatibilityConstraint: 'Public IDictionary.TryGetValue consumes retained keys. Use private Data.TryGetValue, never the public consuming member, for a candidate.',
  actualPublicOwnerFactory: 'RazorComponentResult + real EndpointHtmlRenderer + registered ITempData cascading value + TempDataService.CreateEmpty',
  actualRazorComponentResultDoesNotExecuteEndpointInvokerTempDataPersistence: true,
  actualPersistenceBoundary: 'Actual routed canonical sample via RazorComponentEndpointInvoker.Persist; cookie state across real navigations, not a manually called callback.',
  actualExistingPermanentSuite: 'TempDataCookieTest adjacent persistence/Peek/Keep/ContainsKey coverage',
  actualPreexistingQuarantineExcludedFromPlannedPassingCount: 'TempDataCookieTest.TempDataPersistWithoutAccessing, dotnet/aspnetcore#70085',
  actualShippingCodeChanged: false, actualSourceComparisons: 0,
};
fs.writeFileSync(path.join(run, 'context.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F039', actualAllSelectedPairs: result.actualAllSelectedPairs.length,
  actualBaselineMatches: result.actualAllSelectedBaselineMatches,
  actualOpenProposalsAudited: work.map(item => ({ number: item.number,
    actualChangedFilesChecked: item.actualChangedFilesChecked,
    actualTargetOwnerChanged: item.actualOwnerFileChanges.length > 0 })),
  actualPublicResultCaptureBoundaryIdentified: true, actualCookiePersistenceRequiresActualRoutedEndpoint: true,
  actualPreexistingQuarantine: result.actualPreexistingQuarantineExcludedFromPlannedPassingCount }, null, 2));
