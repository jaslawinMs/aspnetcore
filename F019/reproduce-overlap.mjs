import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [rootArgument, mode] = process.argv.slice(2);
if (!rootArgument || !['--live', '--verify'].includes(mode)) {
  throw new Error('Use an explicit evidence root and --live (first source capture) or --verify (offline replay).');
}
const root = path.resolve(rootArgument);
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const current = '49147673007a4b1d676694e2c5f85b83ad76c36f';
const upstream = '103b0800790e744fc017872386221e40f3e38534';
const branch = 'autoperf/F019-layoutview-parent-cache';
const ownerPath = 'src\\Components\\Components\\src\\LayoutView.cs';
const read = relative => fs.readFileSync(path.join(root, relative));
const text = relative => read(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
function enumerate(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? enumerate(absolute) : [absolute];
  });
}
const acceptance = json('acceptance.json');
const budget = json('measurement-budget.json');
const inventory = json('inventory.json');
const investigation = json('investigation.json');
requireCondition(acceptance.candidate === 'F019' && inventory.id === 'F019' &&
  inventory.finding.card_id === 'uncached-reflection-in-hot-path' &&
  inventory.finding.file.replaceAll('/', '\\') === ownerPath, 'Exact actual F019 inventory required.');
requireCondition(investigation.baseline === baseline && investigation.capturedDefault === current &&
  investigation.independentBranch === branch && investigation.sourceTriples.length === 19, 'Actual independent source contexts differ.');
requireCondition(budget.usedComparisons === 0 && budget.originalProfiles === 0 && budget.candidateProfiles === 0 &&
  budget.diagnosticProfiles === 0 && budget.sourceCandidateShapes === 0 && budget.closed === true &&
  budget.maximumComparisons === 3, 'Source-only duplicate budget must stay closed at zero.');

const recordedCommands = enumerate(path.join(root, 'investigation-execution')).filter(file => file.endsWith('.json'))
  .map(file => ({ file, value: JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) }))
  .filter(entry => Object.hasOwn(entry.value, 'actualExitCode'));
requireCondition(recordedCommands.length > 100 && recordedCommands.every(entry => entry.value.actualExitCode === 0 &&
  !entry.value.spawnError && ['git', 'gh'].includes(entry.value.executable)), 'Actual recorded source commands failed or differ.');
let snapshots = 0;
for (const entry of investigation.sourceTriples) {
  for (const role of ['baseline', 'current-default', 'working']) {
    const expected = entry.roles[role];
    const bytes = read(path.join('sources', role, entry.path));
    requireCondition(bytes.length === expected.bytes && sha256(bytes) === expected.sha256, 'Source snapshot differs: ' + role + ':' + entry.path);
    if (role !== 'working') {
      requireCondition(gitBlob(bytes) === expected.gitBlob, 'Actual native Git source/blob identity differs: ' + role + ':' + entry.path);
    }
    snapshots++;
  }
  const baselineBytes = read(path.join('sources', 'baseline', entry.path));
  const workingBytes = read(path.join('sources', 'working', entry.path));
  requireCondition(Buffer.from(workingBytes.toString('utf8').replaceAll('\r\n', '\n')).equals(baselineBytes),
    'Working text differs beyond the captured checkout line endings: ' + entry.path);
  const canonical = recordedCommands.filter(command =>
    command.value.executable === 'git' && command.value.arguments[0] === 'hash-object' &&
    command.value.arguments[1] === '--path=' + entry.path.replaceAll('\\', '/'));
  requireCondition(canonical.length === 1 &&
    fs.readFileSync(canonical[0].file.replace(/\.json$/, '.stdout'), 'utf8').trim() === entry.roles.working.canonicalGitBlob &&
    entry.roles.working.canonicalGitBlob === entry.roles.baseline.gitBlob, 'Captured actual canonical working Git witness differs.');
}
requireCondition(snapshots === 57, 'Exactly 57 actual campaign source snapshots required.');
const original = text(path.join('sources', 'baseline', ownerPath));
const actualDefault = text(path.join('sources', 'current-default', ownerPath));
requireCondition(original === actualDefault && original.includes('type.GetCustomAttribute<LayoutAttribute>()?.LayoutType') &&
  /parameters\.SetParameterProperties\(this\);\s+Render\(\);/.test(original) &&
  original.includes('layoutType = GetParentLayoutType(layoutType);'), 'Current-default named producer/seam no longer agrees.');
const refreshMethod = source => source.match(/    private async void RenderRootComponentsOnHotReload\(\)[\s\S]*?\n    }\n/)?.[0];
const rendererPath = 'src\\Components\\Components\\src\\RenderTree\\Renderer.cs';
requireCondition(refreshMethod(text(path.join('sources', 'baseline', rendererPath))) &&
  refreshMethod(text(path.join('sources', 'baseline', rendererPath))) ===
    refreshMethod(text(path.join('sources', 'current-default', rendererPath))), 'Relevant original/default renderer refresh methods differ.');

const sourceRoot = path.join('investigation', 'upstream-68299');
const provenance = json(path.join(sourceRoot, 'source-provenance.json'));
const supplemental = json(path.join(sourceRoot, 'source-link-provenance.json'));
const actualPr = json('investigation-execution\\attempt-003\\001-actual-pr-state.stdout');
requireCondition(actualPr.number === 68299 && actualPr.state === 'open' && actualPr.merged === false &&
  actualPr.head.sha === upstream && actualPr.changed_files === 183 &&
  provenance.actualHead === upstream && provenance.actualSourceFilesCaptured === 6 && supplemental.length === 2,
  'Pinned actual open/unmerged upstream source state differs.');
const sources = [...provenance.sourceManifest, ...supplemental];
requireCondition(new Set(sources.map(entry => entry.path)).size === 8, 'Eight unique actual upstream source files required.');
for (const [index, entry] of sources.entries()) {
  const bytes = read(path.join(sourceRoot, ...entry.path.split('/')));
  const responsePath = index < 6
    ? `investigation-execution\\attempt-003\\${String(index + 2).padStart(3, '0')}-source-${String(index).padStart(2, '0')}.stdout`
    : `investigation-execution\\attempt-004\\${path.basename(entry.path)}.response.stdout`;
  const response = json(responsePath);
  requireCondition(bytes.length === entry.bytes && sha256(bytes) === entry.sha256 && gitBlob(bytes) === entry.gitBlob &&
    response.path === entry.path && response.encoding === 'base64' && response.sha === entry.gitBlob &&
    response.size === bytes.length && Buffer.from(response.content, 'base64').equals(bytes) &&
    entry.pinnedSourceUrl.includes('/blob/' + upstream + '/'), 'Pinned upstream API/source identity differs: ' + entry.path);
}
const upstreamSource = filename => text(path.join(sourceRoot, 'src', 'Components', 'Components', 'src', filename));
const checks = [
  ['same-layout-parent-seam-replaced', upstreamSource('LayoutView.cs'), [
    'private Type? GetParentLayoutType(Type type)', '_renderHandle.ComponentTypeInfoResolver!',
    '.GetRequiredTypeInfo(type)', '.Metadata', '.OfType<LayoutAttribute>()', '.FirstOrDefault()', '?.LayoutType']],
  ['render-handle-uses-owning-renderer-resolver', upstreamSource('RenderHandle.cs'), [
    'internal IComponentTypeInfoResolver? ComponentTypeInfoResolver => _renderer?.ComponentTypeInfoResolver;']],
  ['renderer-default-resolver-construction', upstreamSource('RenderTree\\Renderer.cs'), [
    'var registeredTypeInfoResolver = serviceProvider.GetService<IComponentTypeInfoResolver>();',
    'ComponentTypeInfoResolver = registeredTypeInfoResolver', '?? ComponentTypeInfoResolverFactory.Create(serviceProvider);']],
  ['default-composite-includes-enabled-reflection-fallback', upstreamSource('ComponentTypeInfoResolverFactory.cs'), [
    'if (ComponentMetadataFeature.IsReflectionEnabledByDefault)',
    'resolvers.Add(new ReflectionComponentTypeInfoResolver());', 'return new CompositeComponentTypeInfoResolver(resolvers);']],
  ['required-type-info-forwards-type-lookup', upstreamSource('IComponentTypeInfoResolver.cs'), [
    'this IComponentTypeInfoResolver resolver,\n        Type componentType)', 'return resolver.GetTypeInfo(componentType)']],
  ['composite-caches-resolved-type-info', upstreamSource('CompositeComponentTypeInfoResolver.cs'), [
    'ConcurrentDictionary<Type, ComponentTypeInfo> _typeInfoCache = new();',
    'if (!_typeInfoCache.TryGetValue(componentType, out var typeInfo))',
    'typeInfo = ResolveTypeInfo(componentType);', '_typeInfoCache[componentType] = typeInfo;']],
  ['reflection-fallback-also-caches-type-info', upstreamSource('ReflectionComponentTypeInfoResolver.cs'), [
    'ConcurrentDictionary<Type, ComponentTypeInfo> _typeInfoCache = new();',
    'if (!_typeInfoCache.TryGetValue(componentType, out var typeInfo))',
    'typeInfo = CreateTypeInfo(componentType);', '_typeInfoCache.TryAdd(componentType, typeInfo);',
    '[.. componentType.GetCustomAttributes(inherit: true)]']],
  ['type-info-retains-materialized-metadata', upstreamSource('ComponentTypeInfo.cs'), [
    'private readonly ReadOnlyCollection<object> _metadata;',
    '_metadata = Array.AsReadOnly([.. metadata]);', 'internal IReadOnlyList<object> Metadata => _metadata;']],
  ['source-hot-reload-hooks-present-not-live-validated', upstreamSource('CompositeComponentTypeInfoResolver.cs'), [
    'HotReloadManager.Default.OnDeltaApplied += OnDeltaApplied;', 'private void OnDeltaApplied()',
    '_sourceGeneratedResolver.Disable();', '_typeInfoCache.Clear();', 'ClearCachesCore();']],
];
for (const [name, source, fragments] of checks) {
  requireCondition(fragments.every(fragment => source.includes(fragment)), 'Named source overlap check failed: ' + name);
}
requireCondition(!upstreamSource('LayoutView.cs').includes('GetCustomAttribute<LayoutAttribute>'),
  'Named per-render reflection unexpectedly remains in the pinned upstream owner.');

const liveExecution = path.join(root, 'audit-execution', 'attempt-001');
if (mode === '--live') {
  requireCondition(!fs.existsSync(liveExecution) && !fs.existsSync(path.join(root, 'source-audit.json')), 'Do not overwrite a completed source audit.');
  fs.mkdirSync(liveExecution, { recursive: true });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(liveExecution, 'executed-driver.mjs'));
  const witnesses = [];
  for (const [index, [label, args]] of [
    ['head', ['rev-parse', 'HEAD']],
    ['branch', ['branch', '--show-current']],
    ['tracked-status', ['status', '--porcelain', '--untracked-files=no']],
    ['complete-status', ['status', '--porcelain']],
  ].entries()) {
    const stem = path.join(liveExecution, `${String(index + 1).padStart(3, '0')}-${label}`);
    const started = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: 'C:\\src\\aspnetcore', encoding: null, windowsHide: true });
    fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
    fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
    const record = { executable: 'git', arguments: args, workingDirectory: 'C:\\src\\aspnetcore', started,
      completed: new Date().toISOString(), actualExitCode: result.status, spawnError: result.error?.message ?? null };
    fs.writeFileSync(stem + '.json', JSON.stringify(record, null, 2) + '\n');
    requireCondition(result.status === 0 && !result.error, 'Actual source preservation command failed.');
    witnesses.push({ label, stdoutSha256: sha256(result.stdout), result: result.stdout.toString('utf8').trim() });
  }
  fs.writeFileSync(path.join(root, 'source-preservation.json'), JSON.stringify(witnesses, null, 2) + '\n', { flag: 'wx' });
}
const witnesses = json('source-preservation.json');
requireCondition(witnesses.length === 4 && witnesses[0].result === baseline && witnesses[1].result === branch &&
  witnesses[2].result === '', 'Actual preserved source branch/tracked tree differs.');
const expectedReports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'].map(name => '?? ' + name).sort();
requireCondition(JSON.stringify(witnesses[3].result.split(/\r?\n/).sort()) === JSON.stringify(expectedReports),
  'Unrelated original untracked reports differ.');
for (const [index, witness] of witnesses.entries()) {
  const stem = `audit-execution\\attempt-001\\${String(index + 1).padStart(3, '0')}-${witness.label}`;
  const command = json(stem + '.json');
  requireCondition(sha256(read(stem + '.stdout')) === witness.stdoutSha256 &&
    text(stem + '.stdout').trim() === witness.result && command.actualExitCode === 0 && !command.spawnError,
    'Recorded actual native source-preservation witness differs.');
}
const result = {
  candidate: 'F019', disposition: 'duplicate', auditPassed: true, sourceOnly: true,
  baseline, currentDefault: current, trackingBranch: branch, shippingSourceChanges: 0,
  upstreamPr: actualPr.html_url, upstreamHead: upstream, upstreamOpen: true, upstreamMerged: false,
  totalUpstreamChangedFiles: 183, initialGraphQlReturnedFiles: 100, upstreamFilesIndividuallyAssessed: sources.length,
  wholeUpstreamProposalReviewedOrApproved: false, independentlyRehashedCampaignSourceSnapshots: snapshots,
  independentlyVerifiedUpstreamApiGitBlobs: sources.length, actualRecordedSourceCommands: recordedCommands.length,
  actualNativeSourcePreservationWitnesses: witnesses.length, namedSourceChecks: checks.map(([name]) => name),
  exactNamedRepeatedReflectionOpportunityAlreadyProposed: true,
  upstreamCompiledOrExecutedHere: false, liveMetadataDeltaValidated: false,
  speedupOrAllocationCountClaimed: false, benchmarkProjectCreated: false,
  sourceCandidateShapes: 0, pairedComparisons: 0, maximumComparisons: 3, budgetClosed: true,
  newDraftCreated: false, browserOpenNotApplicableWithoutNewDraft: true,
};
if (mode === '--verify') {
  requireCondition(JSON.stringify(json('source-audit.json')) === JSON.stringify(result), 'Portable replay differs from the frozen source audit.');
} else {
  fs.writeFileSync(path.join(root, 'source-audit.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(result, null, 2));
