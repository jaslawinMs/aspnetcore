const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.dirname(__dirname);
const old = path.join(path.dirname(root), 'finding-F135-007');
const seal = '52CF17772FB82EC9E18C81E50924C753818771D6BEBB84D91E72B623821F6C09';
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const canonical = value => value.replaceAll('\\', '/');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (relative, data) => {
  const file = path.join(root, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};
const fullBytes = fs.readFileSync(path.join(old, 'manifest.json'));
if (hash(fullBytes) !== seal) throw new Error('Original immutable seal changed.');
const full = JSON.parse(fullBytes);
const indexed = new Map(full.files.map(item => [canonical(item.path), item]));
const selected = [];
function copy(from, to) {
  if (selected.some(item => item.copied === to)) throw new Error('Duplicate selection ' + to);
  const bytes = fs.readFileSync(path.join(old, ...canonical(from).split('/')));
  const sha256 = hash(bytes);
  const source = indexed.get(canonical(from));
  if (source && (source.sha256 !== sha256 || source.bytes !== bytes.length)) throw new Error('Original sealed input changed: ' + from);
  if (!source && !['manifest.json', 'manifest.sha256', 'manifest-verification.json'].includes(from)) throw new Error('Unsealed source selection ' + from);
  const dest = path.join(root, ...to.split('/'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  selected.push({ original: canonical(from), copied: to, bytes: bytes.length, sha256, originalManifestEntry: !!source });
}
copy('manifest.json', 'manifests/preparation-007.json');
copy('manifest.sha256', 'manifests/preparation-007.sha256');
copy('manifest-verification.json', 'manifests/preparation-007-verification.json');
copy('graphs/original/.git/HEAD', 'pins/original-head.txt');
copy('graphs/default/.git/HEAD', 'pins/main-head.txt');
const facts = {
  'handoff.json': 'preparation-handoff.json',
  'acceptance-before-execution.json': 'acceptance.json',
  'entry-identity.json': 'entry.json',
  'github-main.json': 'main-initial.json',
  'results/github-main-recheck.json': 'main-recheck.json',
  'results/original-http-producer.json': 'rows-original.json',
  'results/default-http-producer.json': 'rows-main.json',
  'results/source-provenance.json': 'source-associations.json',
  'results/loaded-closure-validation.json': 'loaded-assemblies.json',
  'results/common-consumer-identity.json': 'common-consumer.json',
  'results/original-default-whole-image-comparison.json': 'images-original-main.json',
  'results/common-consumer-original-copy-verification.json': 'image-original-copy.json',
  'results/image-comparator-controls.json': 'image-controls.json',
  'results/image-comparator-equal-control.json': 'image-equal.json',
  'results/image-comparator-extra-fixture.json': 'image-extra-fixture.json',
  'results/image-comparator-missing-owner.json': 'image-missing-owner.json',
  'results/selected-runtime-Any-IL.json': 'runtime-any-il.json',
  'results/selected-runtime-AnyAll-api.json': 'runtime-source-404.json',
  'results/failed-prerequisites.json': 'failed-prerequisites.json',
  'results/existing-test-results.json': 'existing-tests.json',
  'results/owned-process-audit.json': 'terminal-processes.json',
  'results/unadopted-preparation.json': 'unadopted.json',
  'results/external-read-only-identities.json': 'external-inputs.json',
  'results/original-full-final-tracked-status.txt': 'original-tracked-status.txt',
  'results/default-full-final-tracked-status.txt': 'main-tracked-status.txt',
  'results/retained-default-to-fresh-bounded-diff.txt': 'retained-default-diff.txt',
  'results/target-history.txt': 'target-history.txt',
  'results/adjacent-pr70148.json': 'adjacent-work.json'
};
for (const [from, to] of Object.entries(facts)) copy(from, 'facts/' + to);
const commandAliases = {
  '006-original-tests-no-restore': 'missing-import',
  '007-generate-original': 'generate-original',
  '007-generate-default': 'generate-main',
  '008-original-tests-build': 'build-original',
  '009-default-tests-build': 'build-main',
  '010-common-harness-build': 'build-prototype',
  '011-original-http-producer': 'prototype-failure',
  '012-existing-test-runner-help': 'runner-help',
  '013-common-harness-corrected-build': 'build-consumer',
  '014-original-http-producer-corrected': 'producer-original',
  '015-original-existing-tests': 'tests-original',
  '016-fresh-default-http-producer': 'producer-main',
  '017-fresh-default-existing-tests': 'main-missing-runtime',
  '018-default-existing-tests-explicit-runtime': 'tests-main',
  '018-original-existing-tests-explicit-runtime': 'original-runtime-mismatch',
  '019-runtime-inspector-build': 'build-il-inspector',
  '020-selected-runtime-Any-IL': 'inspect-runtime-il',
  '021-actual-sdk-info': 'sdk-info'
};
const commands = [];
for (const [label, alias] of Object.entries(commandAliases)) {
  const prefix = 'logs/' + label + '/';
  copy(prefix + 'result.json', 'runs/' + alias + '/command.json');
  for (const name of ['stdout.txt', 'stderr.txt', 'host-resolution.txt']) {
    if (indexed.has(prefix + name)) copy(prefix + name, 'runs/' + alias + '/' + name);
  }
  commands.push({ label, alias, command: json(path.join(old, 'logs', label, 'result.json')) });
}
const associations = json(path.join(old, 'results', 'source-provenance.json'));
for (const item of associations) {
  let name = path.win32.basename(item.relative);
  if (name === '.globalconfig') name = 'globalconfig.txt';
  for (const [folder, from] of [
    ['physical', 'sources/' + item.role + '/' + canonical(item.relative)],
    ['git', 'sources/' + item.role + '-git-blobs/' + canonical(item.relative)]
  ]) copy(from, 'source/' + item.role + '/' + folder + '/' + name);
}
for (const [from, to] of [
  ['harness/Program.cs', 'consumer/Program.cs'],
  ['harness/F135.MiddlewareProbe.csproj', 'consumer/F135.MiddlewareProbe.csproj'],
  ['runtime-inspector/Program.cs', 'consumer/RuntimeInspector.cs'],
  ['runtime-inspector/F135.RuntimeInspector.csproj', 'consumer/F135.RuntimeInspector.csproj'],
  ['failed-attempts/011-original-http-producer/Program.cs', 'failures/prototype-Program.cs'],
  ['failed-attempts/011-original-http-producer/F135.MiddlewareProbe.csproj', 'failures/prototype.csproj'],
  ['failed-attempts/011-original-http-producer/failure.json', 'failures/prototype.json'],
  ['scripts/Invoke-Recorded.ps1', 'historical/Invoke-Recorded.ps1'],
  ['scripts/Compare-Images.ps1', 'historical/Compare-Images.ps1']
]) copy(from, to);
for (const role of ['original', 'default']) {
  for (const name of ['Microsoft.AspNetCore.OutputCaching.Tests.deps.json', 'Microsoft.AspNetCore.OutputCaching.Tests.runtimeconfig.json']) {
    copy(`graphs/${role}/artifacts/bin/Microsoft.AspNetCore.OutputCaching.Tests/Release/net12.0/${name}`, `test-config/${role}/${name}`);
  }
  for (const name of ['F135.MiddlewareProbe.deps.json', 'F135.MiddlewareProbe.runtimeconfig.json']) {
    copy(`images/${role}/${name}`, `consumer-config/${role}/${name}`);
  }
}
selected.sort((a, b) => a.copied.localeCompare(b.copied, 'en'));
write('selection.json', { originalRoot: old, originalManifestSha256: seal, copiedFiles: selected });
const chosen = new Set(selected.filter(item => item.originalManifestEntry).map(item => item.original));
const omitted = full.files.filter(item => !chosen.has(canonical(item.path))).map(item => ({
  path: canonical(item.path), bytes: item.bytes, sha256: item.sha256
})).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const keyOmitted = omitted.filter(item =>
  /^images\/(original|default)\/(F135\.MiddlewareProbe\.(dll|pdb)|Microsoft\.AspNetCore\.OutputCaching\.(dll|pdb))$/.test(item.path) ||
  /^failed-attempts\/011-original-http-producer\/.*\.(dll|pdb)$/.test(item.path) ||
  /^graphs\/(original|default)\/artifacts\/bin\/Microsoft.AspNetCore.OutputCaching.Tests\/Release\/net12.0\/Microsoft.AspNetCore.OutputCaching.Tests\.(dll|pdb)$/.test(item.path)
);
const handoff = json(path.join(old, 'handoff.json'));
write('omissions.json', {
  originalFileCount: full.files.length, selectedSealedOriginalFiles: chosen.size,
  omittedFileCount: omitted.length, exactOmittedEntries: 'manifests/preparation-007.json',
  omittedSetSha256: hash(Buffer.from(JSON.stringify(omitted))),
  omittedSetDigestRecipe: 'SHA256 of UTF-8 JSON.stringify of omitted entries {path,bytes,sha256}, paths slash-normalized and ordinal-sorted.',
  importantOmittedBinaries: keyOmitted,
  noBinaryCopied: true,
  externalPrerequisites: {
    originalPin: handoff.sourcePins.original, observedMainPin: handoff.sourcePins.observedCurrentDefault,
    graphRoots: ['graphs\\original', 'graphs\\default'].map(relative => path.join(old, relative)),
    sdk: '12.0.100-alpha.1.26557.102',
    producerRuntime: '12.0.0-alpha.1.26568.110', producerRuntimeRoot: handoff.selectedRuntime.privateRuntimeRoot,
    originalExistingTestRuntime: '12.0.0-alpha.1.26562.105',
    mainExistingTestRuntime: '12.0.0-alpha.1.26568.110',
    binaryIdentityRecords: 'facts/loaded-assemblies.json',
    originalTestRuntime62BinaryHashCaptured: false,
    originalTestRuntime62Evidence: 'Recorded runtimeconfig and actual host resolution, not a separately captured CoreLib62 file hash.'
  },
  boundary: 'Portable audit verifies selected copies and historical source/PE/PDB/image/runtime receipts. Omitted binaries, full graphs and external SDK/runtime files are not reread, reconstructed, executed or freshly attested.'
});
write('command-index.json', commands.map(({ label, alias, command }) => ({ label, alias, commandFile: `runs/${alias}/command.json`, exitCode: command.exitCode, terminal: command.terminal })));
const quote = value => '"' + String(value).replaceAll('"', '\\"') + '"';
const commandTable = [
  '# Recorded validation commands',
  '',
  'These are historical executions from accepted preparation007, not commands run while packaging. Original tests used runtime62; main tests and both middleware producer probes used runtime68. Console outcomes are retained as console output; no XML was generated.',
  '',
  '| Recorded command | Result | Recorded boundary / runtime |',
  '|---|---|---|',
  ...commands.map(({ alias, command }) => `| [${alias}](runs/${alias}/command.json) · [stdout](runs/${alias}/stdout.txt) · [stderr](runs/${alias}/stderr.txt) | exit ${command.exitCode}; terminal ${command.terminal} | ${alias === 'tests-original' ? '3 exact xUnit tests; runtime62' : alias === 'tests-main' ? '3 exact xUnit tests; runtime68' : alias.startsWith('producer-') ? '27 real middleware rows; runtime68' : 'Setup / metadata / preserved failed prerequisite; not counted as test passes'} |`),
  '',
  ...commands.flatMap(({ alias, command }) => [
    `## ${alias}`, '', '```text',
    `Working directory: ${command.workingDirectory}`,
    'Activation: . .\\activate.ps1',
    [command.executable, ...command.arguments].map(quote).join(' '),
    `Result: exit ${command.exitCode}; PID ${command.pid}; terminal ${command.terminal}`,
    `DOTNET_GENERATE_ASPNET_CERTIFICATE=${command.certificateGeneration}; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=${command.globalToolPath}; MSBUILDDISABLENODEREUSE=${command.nodeReuse}; DOTNET_ROLL_FORWARD=${command.runtimeRollForward || '(not recorded)'}`,
    '```', ''
  ])
];
write('commands.md', commandTable.join('\n'));
write('handoff.json', {
  finding: 'F135', purpose: 'Small publication-ready historical evidence selection only',
  disposition: 'PENDING', preparationStageAccepted: true, finalDispositionCreated: false,
  copiedFiles: selected.length, originalFilesInImmutableManifest: full.files.length,
  originalManifestSha256: seal, originalCapsuleUnmodified: true,
  audit: 'node audit.cjs', manifest: 'manifest.json', manifestHash: 'manifest.sha256',
  facts: { producerRowsPerPin: 27, existingTestExecutions: 6, imageEntriesPerRole: 193, physicalSourceAssociations: 36, fullCompilerInputAttestation: false },
  binariesIncluded: false, newDotnetStarts: 0, producerReruns: 0,
  performanceMeasurements: 0, candidateOrUsefulGateOrPrAdopted: false,
  limits: 'Original/default closures are not an isolated causal performance pair. Residual cost is unmeasured; IL is static image evidence only. All original exclusions and failures remain.',
  entry: 'README.md'
});
console.log(JSON.stringify({ copiedFiles: selected.length, omittedOriginalFiles: omitted.length, totalCopiedBytes: selected.reduce((sum, item) => sum + item.bytes, 0), originalSealVerified: true }));
