import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [argument, mode] = process.argv.slice(2);
if (!argument || !['--write', '--verify'].includes(mode)) {
  throw new Error('Explicit alias capsule root and --write/--verify required; this tool performs no timing.');
}
const root = path.resolve(argument);
const read = relative => fs.readFileSync(path.join(root, ...relative.split(/[\\/]/)));
const json = relative => JSON.parse(read(relative).toString('utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const blob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const normalize = bytes => Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const findings = json('findings.json');
const provenance = json('provenance.json');
const budget = json('measurement-budget.json');
const decision = json('canonical-closed-budget.json');
const publication = json('canonical-publication.json');
const alias = findings.alias.finding;
const canonical = findings.canonical.finding;
requireValue(findings.alias.id === 'F020' && findings.canonical.id === 'F086' &&
  alias.card_id === canonical.card_id && alias.file === canonical.file &&
  alias.line_start === 198 && alias.line_end === 216 && canonical.line_start === 206 && canonical.line_end === 206,
  'Exact same-card/file/mechanism and contained original scan ranges required.');
requireValue(provenance.sourceOnly && provenance.duplicateOf === 'F086' && provenance.newComparisons === 0 &&
  provenance.newShippingChanges === 0 && provenance.canonicalReadOnlyRawAuditPassed &&
  provenance.canonicalHistoricalEvidenceUnmodified && provenance.historicalProcessThreadPriorityStateUnverified,
  'Actual source-only/read-only/historical boundaries differ.');
for (const entry of provenance.sourceIdentities) {
  const bytes = read(entry.path);
  requireValue(bytes.length === entry.bytes && sha(bytes) === entry.sha256 && blob(bytes) === entry.rawGitBlob,
    'Captured source identity differs: ' + entry.path);
}
requireValue(provenance.sourceIdentities.length === 5 &&
  read('baseline-owner.cs').equals(read('current-default-owner.cs')) &&
  normalize(read('canonical-original-snapshot.cs')).equals(read('baseline-owner.cs')) &&
  normalize(read('canonical-selected-snapshot.cs')).equals(read('canonical-proposal-owner.cs')),
  'Actual original/default/canonical text identities differ beyond declared checkout line endings.');
const original = read('baseline-owner.cs').toString('utf8');
const selected = read('canonical-proposal-owner.cs').toString('utf8');
const method = selected.slice(selected.indexOf('private static bool TryGetListTypeArgument('));
requireValue(original.includes('ClosedGenericMatcher.ExtractGenericInterface(listType, typeof(IList<>))') &&
  original.match(/TryGetListTypeArgument\(target,/g)?.length === 6 &&
  selected.includes('ConditionalWeakTable<Type, Type> _listTypeArguments = new();') &&
  ['if (listType.IsArray)', '_listTypeArguments.TryGetValue', 'ClosedGenericMatcher.ExtractGenericInterface',
    'listTypeArgument = genericList.GenericTypeArguments[0];', '_listTypeArguments.AddOrUpdate'].every(value => method.includes(value)) &&
  method.indexOf('if (listType.IsArray)') < method.indexOf('_listTypeArguments.TryGetValue') &&
  method.indexOf('_listTypeArguments.TryGetValue') < method.indexOf('ClosedGenericMatcher.ExtractGenericInterface') &&
  method.indexOf('listTypeArgument = genericList.GenericTypeArguments[0];') < method.indexOf('_listTypeArguments.AddOrUpdate'),
  'Canonical selected weak-key successful-type cache is not the same named mechanism.');
const actualPr = json('capture-execution\\012-actual-canonical-pr.stdout');
requireValue(actualPr.state === 'open' && actualPr.draft && actualPr.head.sha === provenance.canonicalSourceCommit &&
  actualPr.head.repo.full_name === 'jaslawinMs/aspnetcore' && actualPr.base.repo.full_name === 'jaslawinMs/aspnetcore' &&
  actualPr.changed_files === 2 && actualPr.additions === 171 && actualPr.deletions === 0 &&
  publication.source_commit === actualPr.head.sha && publication.draft.number === 91, 'Actual canonical fork draft identity differs.');
const response = json('capture-execution\\013-actual-canonical-api-owner.stdout');
requireValue(response.encoding === 'base64' && response.path === alias.file &&
  response.sha === blob(read('canonical-proposal-owner.cs')) &&
  Buffer.from(response.content, 'base64').equals(read('canonical-proposal-owner.cs')), 'Actual canonical API owner/source blob differs.');
const remote = json('capture-execution\\015-actual-canonical-evidence-files.stdout');
const nativeTree = read('capture-execution\\016-actual-local-canonical-evidence-tree.stdout').toString('utf8').trim().split(/\r?\n/);
const remoteFiles = new Map(remote.tree.filter(entry => entry.type === 'blob').map(entry => ['F086/' + entry.path, entry.sha]));
const localFiles = new Map(nativeTree.map(line => {
  const [metadata, file] = line.split('\t');

  return [file, metadata.split(' ')[2]];
}));
const verified = json('canonical-evidence-verification.json');
requireValue(!remote.truncated && remoteFiles.size === 171 && localFiles.size === 171 && verified.length === 171 &&
  verified.every(entry => entry.actualRemoteVerified && entry.gitBlob === remoteFiles.get(entry.path) &&
    entry.gitBlob === localFiles.get(entry.path)), 'Recorded actual complete canonical remote/native evidence receipt differs.');
for (const [file, canonicalFile] of [
  ['canonical-original-snapshot.cs', 'F086/source-before.cs'],
  ['canonical-selected-snapshot.cs', 'F086/source-after.cs'],
  ['canonical-closed-budget.json', 'F086/measurement-decision.json'],
]) {
  const entry = verified.find(row => row.path === canonicalFile);
  requireValue(entry && entry.sha256 === sha(read(file)) && entry.gitBlob === blob(read(file)),
    'Copied canonical bytes differ from actually verified immutable evidence: ' + canonicalFile);
}
requireValue(verified.some(entry => entry.path === 'F086/harness/AutoPerf.Benchmarks.csproj'),
  'Actually verified canonical runnable benchmark project required.');
const commands = fs.readdirSync(path.join(root, 'capture-execution')).filter(file => file.endsWith('.json')).map(file => json('capture-execution\\' + file));
requireValue(commands.length === 17 && commands.every(entry => entry.actualExitCode === 0 && !entry.spawnError &&
  ['git', 'gh', 'node'].includes(entry.executable)), 'Actual captured commands differ or failed.');
const replay = commands.find(entry => entry.executable === 'node');
requireValue(replay && replay.arguments.at(-1) === '--verify' &&
  read('capture-execution\\017-canonical-read-only-raw-replay.stdout').toString('utf8')
    .includes('F086:56 outcomes/28 pairs/448 actual results,249 actual XML rows'), 'Canonical read-only raw audit did not complete.');
requireValue(budget.newComparisons === 0 && budget.newSourceStrategies === 0 && budget.closed === true &&
  budget.canonicalBudgetStaysClosed === true && decision.comparison_budget_closed === true &&
  decision.measured_comparisons === 1 && decision.unused_comparisons === 2 && publication.measured_comparisons === 1,
  'Do not reopen or duplicate the canonical historical comparison budget.');
const audit = {
  candidate: 'F020', disposition: 'duplicate', duplicateOf: 'F086', sourceOnly: true, auditPassed: true,
  currentDefault: provenance.currentDefault, baseline: provenance.baseline, independentBranch: provenance.independentBranch,
  baselineOwnerGitBlob: blob(read('baseline-owner.cs')), exactSameSeamAndContainedScanRanges: true,
  verifiedCapturedSources: 5, capturedSuccessfulCommands: commands.length,
  actualCanonicalPr: actualPr.html_url, actualCanonicalSource: actualPr.head.sha,
  canonicalImmutableEvidence: provenance.canonicalEvidenceCommit, canonicalActualRemoteBlobsVerified: verified.length,
  canonicalHistoricalRawReplayExit: replay.actualExitCode, canonicalHistoricalEvidenceUnmodified: true,
  sourceCandidateShapes: 0, newBenchmarkProjects: 0, newComparisons: 0, newDraft: false,
  canonicalComparisons: 1, canonicalBudgetStaysClosed: true, canonicalUnusedComparisons: 2,
  aliasAddsNoNewMeasurementOrIndependentConfidence: true, historicalProcessThreadPrioritiesVerified: false,
  canonicalColdControlLifetimeAndFormatterCostsRetained: true, canonicalMergeReady: false,
  offlineScope: 'Replays alias/source/API/native-tree/captured-replay identities;does not rehash omitted canonical files or rerun canonical profiles.',
};
if (mode === '--write') {
  requireValue(!fs.existsSync(path.join(root, 'alias-audit.json')), 'Do not overwrite the actual source audit.');
  fs.writeFileSync(path.join(root, 'alias-audit.json'), JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
} else {
  requireValue(JSON.stringify(json('alias-audit.json')) === JSON.stringify(audit), 'Offline replay differs from the frozen source audit.');
}
console.log(JSON.stringify(audit, null, 2));
