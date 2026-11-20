import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { hash, parsePe, parsePdb, parseTrx, readJson } from './capsule/evidence.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const capsule = path.join(root, 'capsule');
if (fs.existsSync(path.join(root, 'seal.json'))) throw Error('Sealed capsule must not be changed');
const roles = readJson(path.join(root, 'roles.json'));
const terminal = readJson(path.join(root, 'terminal-native-work.json'));
if (!terminal.noOwnedNativeWorkRemaining) throw Error('Native terminal receipt required');
const policyFile = path.join(path.dirname(root), 'policy.json');
if (fs.existsSync(policyFile)) {
  const policy = readJson(policyFile);
  if (policy.actualWorkerBuildHoldActive || policy.workersMayBuildOrTest === false) throw Error('HOLD: no new heavy IO');
}
const relParts = relative => relative.split(/[\\/]/);
const full = relative => path.join(capsule, ...relParts(relative));
const bytesRecord = buffer => ({ bytes: buffer.length, sha256: hash(buffer) });
const write = (relative, value) => {
  const destination = full(relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, typeof value === 'string' || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const copy = (source, relative) => {
  const buffer = fs.readFileSync(source);
  write(relative, buffer);
  return { path: relative, originalPath: source, ...bytesRecord(buffer) };
};
const gzipJson = (relative, value) => write(relative, zlib.gzipSync(Buffer.from(JSON.stringify(value)), { level: 9 }));
function walk(directory, relative = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap(entry => {
      const child = path.join(directory, entry.name), key = relative ? `${relative}\\${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw Error(`Undeclared nested link in image: ${child}`);
      return entry.isDirectory() ? walk(child, key) : [{ file: child, key }];
    });
}
const windowsKey = value => value.replaceAll('/', '\\').toLowerCase();
const selection = [];
function select(source, relative, metadata = {}) {
  if (!fs.existsSync(source)) throw Error(`Selected file absent: ${source}`);
  const item = { ...copy(source, relative), ...metadata };
  selection.push(item);
  return item;
}

for (const name of [
  'acceptance.json', 'candidate-records.json', 'roles.json', 'requirements-and-boundaries.json',
  'terminal-native-work.json', 'system-xml-validation.json'
]) copy(path.join(root, name), name);
const catalog = readJson(full('candidate-records.json'));
if (catalog.length !== 2 || catalog.some(c => !['F169', 'F170'].includes(c.id) || c.status !== 'pending')) throw Error('Wrong candidate scope/state');

const instructions = [
  '.github\\copilot-instructions.md',
  '.github\\instructions\\cross-cutting-guidance.instructions.md',
  '.github\\instructions\\build.instructions.md',
  'docs\\BuildFromSource.md',
  'docs\\BuildErrors.md',
  'docs\\CrossCuttingGuidance.md'
];
for (const relative of instructions) {
  copy(path.join('C:\\src\\aspnetcore', ...relParts(relative)), `context\\${relative}`);
}
write('context\\instruction-observations.json', {
  applicable: instructions,
  absentAtInspection: [
    'C:\\src\\aspnetcore\\AGENTS.md',
    'C:\\src\\aspnetcore\\src\\AGENTS.md',
    'C:\\src\\aspnetcore\\src\\Http\\AGENTS.md',
    'C:\\src\\aspnetcore\\src\\Http\\Http.Abstractions\\AGENTS.md',
    'C:\\src\\aspnetcore\\src\\Http\\Http.Abstractions\\test\\AGENTS.md'
  ],
  intelligence: 'Bluebird configured msazure/One scope is unrelated and was not queried. Two local LSP definitions returned no result and the advertised lsp-csharp log ID was unavailable; trace therefore used the exact known local source files, not unrelated graph evidence.',
  earlyInspectionLimit: 'Initial read-only shell inspections preceded the detailed recorder. In particular git show of 90f48 before private fetch failed with bad object, and an optional image-count PowerShell inspection had a parser error (empty pipe after foreach). Neither executed a native build/test, changed source, or supplied passing evidence. Their OS root PIDs/full stream files were not captured; no exhaustive pre-recorder command-attestation claim.'
});

const sourceMetadata = readJson(path.join(root, 'selected-sources.json'));
for (const role of ['original37', 'default']) {
  const generated = 'artifacts\\bin\\GenerateFiles\\Directory.Build.props';
  const originalPath = path.join(roles[role], ...relParts(generated));
  const capsulePath = `generated\\${role}\\Directory.Build.props`;
  copy(originalPath, capsulePath);
  sourceMetadata.push({ role, sourcePath: generated, capsulePath, originalPath, kind: 'Native generated build prerequisite; not a Git source blob' });
}
for (const relative of ['Program.cs', 'UseWhenPreparation.csproj', 'obj\\project.assets.json', 'obj\\UseWhenPreparation.csproj.nuget.g.props', 'obj\\UseWhenPreparation.csproj.nuget.g.targets']) {
  const originalPath = path.join(roles.common, ...relParts(relative)), capsulePath = `common\\inputs\\${relative}`;
  select(originalPath, capsulePath, { category: 'common-input', role: 'common' });
  sourceMetadata.push({ role: 'common', sourcePath: relative, capsulePath, originalPath, kind: 'Common consumer input; no Git blob' });
}
const commonBin = path.join(roles.common, 'bin', 'Debug', 'net12.0');
const commonPdb = parsePdb(fs.readFileSync(path.join(commonBin, 'UseWhenPreparation.pdb')));
for (const document of commonPdb.documents) {
  const originalPath = document.name;
  const relative = path.win32.relative(roles.common, originalPath);
  if (relative.startsWith('..') || path.win32.isAbsolute(relative)) throw Error('Unexpected common PDB source outside private common graph');
  const capsulePath = `common\\inputs\\${relative}`;
  if (!fs.existsSync(full(capsulePath))) {
    select(originalPath, capsulePath, { category: 'common-generated-source', role: 'common' });
    sourceMetadata.push({ role: 'common', sourcePath: relative, capsulePath, originalPath, kind: 'Actual common PDB generated source; no Git blob' });
  }
}
const sources = sourceMetadata.map(item => {
  const originalPath = item.originalPath ?? path.join(roles[item.role], ...relParts(item.sourcePath));
  const buffer = fs.readFileSync(full(item.capsulePath));
  const text = buffer.toString('utf8'), lf = Buffer.from(text.replaceAll('\r\n', '\n'));
  const facts = {
    ...item, originalPath, ...bytesRecord(buffer), crlfPairs: (text.match(/\r\n/g) ?? []).length,
    lfBytes: lf.length, lfSha256: hash(lf), computedGitLfBlobSha1: hash(Buffer.concat([Buffer.from(`blob ${lf.length}\0`), lf]), 'sha1')
  };
  if (item.gitBlobSha1 && item.gitBlobSha1 !== facts.computedGitLfBlobSha1) throw Error(`Git/LF identity mismatch: ${item.capsulePath}`);
  return facts;
});
write('source-facts.json', sources);

const ownerNames = [
  'Microsoft.AspNetCore.Http.Abstractions.Tests',
  'Microsoft.AspNetCore.Http.Abstractions',
  'Microsoft.AspNetCore.Http',
  'Microsoft.AspNetCore.Http.Features'
];
const nativeBins = {};
for (const role of ['original37', 'default']) {
  const bin = path.join(roles[role], 'artifacts', 'bin', ownerNames[0], 'Debug', 'net12.0');
  nativeBins[role] = bin;
  for (const name of ownerNames) {
    for (const extension of ['dll', 'pdb']) select(path.join(bin, `${name}.${extension}`), `images\\${role}\\native\\${name}.${extension}`, { role, category: 'native-owner-or-test', assemblyName: name });
  }
  for (const name of [
    `${ownerNames[0]}.deps.json`, `${ownerNames[0]}.runtimeconfig.json`, `${ownerNames[0]}.runtimeconfig.dev.json`,
    'testhost.dll', 'testhost.exe', 'testhost.deps.json', 'testhost.runtimeconfig.json',
    'Microsoft.AspNetCore.Http.Tests.dll', 'Microsoft.AspNetCore.Http.Tests.pdb',
    'Microsoft.AspNetCore.Testing.dll', 'Microsoft.AspNetCore.Testing.pdb'
  ]) {
    if (fs.existsSync(path.join(bin, name))) select(path.join(bin, name), `images\\${role}\\native\\${name}`, { role, category: 'native-support-or-config' });
  }
  for (const name of ownerNames.slice(1)) {
    const ownerBin = path.join(roles[role], 'artifacts', 'bin', name, 'Debug', 'net12.0');
    for (const file of walk(ownerBin).filter(f => /(?:\.deps|\.runtimeconfig(?:\.dev)?)\.json$/.test(f.key))) {
      select(file.file, `images\\${role}\\owner-config\\${name}\\${file.key}`, { role, category: 'native-owner-config' });
    }
  }
}
for (const file of walk(commonBin)) select(file.file, `common\\image\\${file.key}`, { role: 'common', category: 'common-image' });

const rawIdentityFiles = walk(path.join(root, 'identity'));
const rawIdentities = rawIdentityFiles.filter(f => f.key.endsWith('.json')).map(file => {
  const buffer = fs.readFileSync(file.file);
  return { relativePath: file.key, ...bytesRecord(buffer), rawUtf8: buffer.toString('utf8') };
});
const identityErrors = rawIdentityFiles.filter(f => !f.key.endsWith('.json')).map(file => ({
  relativePath: file.key, ...bytesRecord(fs.readFileSync(file.file)), rawUtf8: fs.readFileSync(file.file, 'utf8')
}));
gzipJson('loaded-images.json.gz', { snapshots: rawIdentities, nonJsonFiles: identityErrors, boundary: 'Actual bounded startup-hook snapshots. Full raw JSON bytes are reconstructed from rawUtf8; no exhaustive execution/loaded-image census is claimed.' });
if (identityErrors.length) throw Error('Identity errors must be investigated, not dropped');
const identities = rawIdentities.map(item => ({ relativePath: item.relativePath, snapshot: JSON.parse(item.rawUtf8) }));
const nativeHosts = {}, supplementalHosts = {}, processSummaries = [];
for (const role of ['original37', 'default']) {
  const nativeSnapshots = identities.filter(item => item.relativePath.startsWith(`${role}\\native\\`));
  const hostCandidates = nativeSnapshots.filter(item => path.win32.basename(item.snapshot.processPath).toLowerCase() === 'testhost.exe' &&
    item.snapshot.assemblies.some(a => a.name.startsWith(`${ownerNames[0]},`)));
  const hostIds = [...new Set(hostCandidates.map(item => item.snapshot.pid))];
  if (hostIds.length !== 1) throw Error(`Expected one actual successful native assertion host for ${role}`);
  nativeHosts[role] = hostCandidates.sort((a, b) => a.snapshot.observedUtc.localeCompare(b.snapshot.observedUtc)).at(-1);
  supplementalHosts[role] = identities.filter(item => item.relativePath.startsWith(`${role}\\supplemental\\`))
    .sort((a, b) => a.snapshot.observedUtc.localeCompare(b.snapshot.observedUtc)).at(-1);
  if (!supplementalHosts[role]) throw Error('Supplemental console observation absent');
  for (const [pid, values] of Object.entries(Object.groupBy(identities.filter(item => item.relativePath.startsWith(`${role}\\`)), item => item.snapshot.pid))) {
    const latest = values.sort((a, b) => a.snapshot.observedUtc.localeCompare(b.snapshot.observedUtc)).at(-1);
    processSummaries.push({
      role, pid: +pid, relativePath: latest.relativePath,
      classification: +pid === hostIds[0] ? 'VSTest-native-assertion-testhost' :
        latest.relativePath.includes('\\supplemental\\') ? 'separate-supplemental-console' : 'SDK-or-VSTest-runner-not-assertion-runtime',
      snapshot: latest.snapshot
    });
  }
  const runtime = nativeHosts[role].snapshot.runtimeDirectory;
  for (const name of ['System.Private.CoreLib.dll', 'coreclr.dll', 'hostpolicy.dll']) select(
    path.join(runtime, name), `images\\${role}\\assertion-runtime\\${name}`, { role, category: 'actual-native-assertion-runtime' });
}
const diagnosticRuntime = supplementalHosts.original37.snapshot.runtimeDirectory;
if (supplementalHosts.default.snapshot.framework !== supplementalHosts.original37.snapshot.framework) throw Error('Unexpected supplemental runtime difference');
for (const name of ['System.Private.CoreLib.dll', 'coreclr.dll', 'hostpolicy.dll']) {
  select(path.join(diagnosticRuntime, name), `common\\diagnostic-runtime\\${name}`, {
    role: 'common', category: 'actual-separate-console-and-runner-runtime',
    originalPathAliases: [path.join(supplementalHosts.default.snapshot.runtimeDirectory, name)]
  });
}
const hostFxrPaths = Object.fromEntries(['original37', 'default'].map(role => {
  const module = nativeHosts[role].snapshot.modules.find(m => m.name.toLowerCase() === 'hostfxr.dll');
  if (!module) throw Error('Actual hostfxr module observation absent');
  return [role, module.path];
}));
select(hostFxrPaths.original37, 'common\\loader\\hostfxr.dll', {
  role: 'common', category: 'loader-not-assertion-CoreCLR', originalPathAliases: [hostFxrPaths.default]
});
gzipJson('process-identities.json.gz', { nativeHosts, supplementalHosts, processes: processSummaries });

const binaryFacts = selection.filter(item => /\.(?:dll|exe|pdb)$/.test(item.path)).map(item => {
  const buffer = fs.readFileSync(full(item.path));
  return { ...item, ...(item.path.endsWith('.pdb') ? { pdb: parsePdb(buffer) } : { pe: parsePe(buffer) }) };
});
const associations = [];
for (const item of binaryFacts.filter(item => item.pdb)) {
  const dllPath = item.path.replace(/\.pdb$/, '.dll'), dll = binaryFacts.find(candidate => candidate.path === dllPath);
  if (!dll?.pe.codeView.some(cv => cv.guid === item.pdb.guid && cv.stamp === item.pdb.stamp)) throw Error(`CodeView/PDB association missing: ${item.path}`);
  for (const document of item.pdb.documents) {
    const source = sources.find(source => windowsKey(source.originalPath) === windowsKey(document.name));
    if (!source) continue;
    const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
      document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
    if (!algorithm) throw Error(`Unknown PDB source checksum algorithm: ${document.algorithm}`);
    const checksum = hash(fs.readFileSync(full(source.capsulePath)), algorithm);
    if (checksum !== document.checksum) throw Error(`Raw Windows/PDB source checksum mismatch: ${source.capsulePath}`);
    associations.push({
      pdbPath: item.path, dllPath, pdbDocumentRow: document.row, documentName: document.name,
      checksumAlgorithmGuid: document.algorithm, algorithm, expectedChecksum: document.checksum,
      selectedSourcePath: source.capsulePath, rawChecksum: checksum
    });
  }
}
for (const role of ['original37', 'default']) {
  if (!associations.some(item => item.selectedSourcePath === `sources\\${role}\\src\\Http\\Http.Abstractions\\test\\UseWhenExtensionsTests.cs`)) throw Error('Actual helper source/PDB association absent');
}
write('binary-selection.json', selection);
gzipJson('binary-facts.json.gz', { binaries: binaryFacts, documentAssociations: associations, boundary: 'Every selected PE/PDB is freshly parsed. Only selected raw source documents are checksum-verified; other Document rows remain parsed checksum/name evidence without their source bytes.' });

const nativeRuns = [], logs = [];
for (const file of walk(path.join(root, 'native'))) {
  const relative = `native\\${file.key}`, buffer = fs.readFileSync(file.file);
  if (file.key.endsWith('.trx')) {
    copy(file.file, relative);
    const [role, attempt] = file.key.split('\\');
    nativeRuns.push({ role, attempt, path: relative, ...bytesRecord(buffer), parsed: parseTrx(buffer.toString('utf8')) });
  } else if (file.key.endsWith('.runsettings')) copy(file.file, relative);
  else {
    const compressedPath = `${relative}.gz`;
    write(compressedPath, zlib.gzipSync(buffer, { level: 9 }));
    logs.push({ sourcePath: file.file, path: compressedPath, raw: bytesRecord(buffer) });
  }
}
write('native-tests.json', {
  runs: nativeRuns, successfulExecutions: nativeRuns.reduce((sum, run) => sum + +run.parsed.counters.passed, 0),
  distinctNativeNames: [...new Set(nativeRuns.flatMap(run => run.parsed.rows.map(row => row.testName)))].sort(),
  rowBoundary: 'All actual TRX results/definitions/entries/execution IDs/counters retained. Four Facts per successful role, no theory/fixture/skip rows. Default initial-runtime failed with exactly zero rows; never counted as a pass.'
});
write('compressed-logs.json', logs);
const supplemental = Object.fromEntries(['original37', 'default'].map(role => {
  const output = fs.readFileSync(path.join(root, 'commands', `050-${role}-supplemental.stdout.txt`), 'utf8').trim();
  return [role, JSON.parse(output)];
}));
write('supplemental-results.json', supplemental);

const commands = walk(path.join(root, 'commands')).filter(file => file.key.endsWith('.json') && +file.key.split('-')[0] <= 68).map(file => {
  const receipt = readJson(file.file), stem = file.file.slice(0, -5);
  const stream = extension => {
    const buffer = fs.readFileSync(`${stem}.${extension}.txt`);
    return { file: `${receipt.id}.${extension}.txt`, ...bytesRecord(buffer), text: buffer.toString('utf8') };
  };
  return { receipt, stdout: stream('stdout'), stderr: stream('stderr') };
});
if (commands.some(command => !command.receipt.rootAwaited || !command.receipt.stdoutAwaited || !command.receipt.stderrAwaited)) throw Error('An incomplete root or stream cannot be sealed');
gzipJson('command-bundle.json.gz', {
  commands,
  activation: 'Every recorded .NET call uses Invoke-LocalDotnet: Set-Location exact private checkout, required three environment flags, dot-source .\\activate.ps1 immediately before the recorded native dotnet.exe command. Common consumer compilation uses original private checkout activation and its own common CLI/scratch/output graph.',
  boundary: 'Complete stdout/stderr and recorded argv/env/PID/exit/await receipts for preparation commands 001-068, including all native .NET attempts. Later capsule construction/audit/seal process receipts remain outside the selected capsule to avoid self-inclusion. Pre-recorder read-only shell inspection limitations are explicitly retained in context/instruction-observations.json.'
});
gzipJson('runtime69-staging.json.gz', readJson(path.join(root, 'runtime69-staging.json')));

function directoryInventory(directory) {
  return Object.fromEntries(walk(directory).map(file => [file.key, bytesRecord(fs.readFileSync(file.file))]));
}
const inventories = { observedUtc: new Date().toISOString(), roles: {} };
for (const role of ['original37', 'default']) {
  const scopes = {};
  const addDirectory = (scope, directory) => {
    scopes[scope] = { root: directory, origin: 'Fresh all-file directory hash inventory at capsule construction; every filename/extension included', files: directoryInventory(directory) };
  };
  addDirectory('nativeTestImage', nativeBins[role]);
  for (const [scope, name] of [
    ['httpOwnerImage', 'Microsoft.AspNetCore.Http'],
    ['abstractionsOwnerImage', 'Microsoft.AspNetCore.Http.Abstractions'],
    ['featuresOwnerImage', 'Microsoft.AspNetCore.Http.Features']
  ]) addDirectory(scope, path.join(roles[role], 'artifacts', 'bin', name, 'Debug', 'net12.0'));
  addDirectory('commonFixtureImage', commonBin);
  addDirectory('assertionRuntimeImage', nativeHosts[role].snapshot.runtimeDirectory);
  addDirectory('diagnosticRuntimeImage', supplementalHosts[role].snapshot.runtimeDirectory);
  addDirectory('hostFxrImage', path.dirname(hostFxrPaths[role]));
  scopes.selectedSourceFiles = {
    origin: 'The exact selected Git/raw source set only; not all compiler inputs or a whole repository inventory',
    files: Object.fromEntries(sources.filter(source => source.role === role).map(source => [source.sourcePath, { bytes: source.bytes, sha256: source.sha256 }]))
  };
  scopes.commonFixtureInputs = {
    origin: 'Every selected common input and generated PDB document, included identically across roles; not a full SDK/compiler-input closure',
    files: Object.fromEntries(sources.filter(source => source.role === 'common').map(source => [source.sourcePath, { bytes: source.bytes, sha256: source.sha256 }]))
  };
  const observed = {};
  for (const { snapshot } of identities.filter(item => item.relativePath.startsWith(`${role}\\`))) {
    for (const item of [
      ...snapshot.assemblies.filter(a => a.location).map(a => ({ key: a.location, sha256: a.sha256, kind: 'managed-assembly-saved-observation' })),
      ...snapshot.modules.map(m => ({ key: m.path, sha256: m.sha256, kind: 'native-module-saved-observation' }))
    ]) {
      if (observed[item.key] && observed[item.key].sha256 !== item.sha256) throw Error(`Observed path changed between identity snapshots: ${item.key}`);
      observed[item.key] = { sha256: item.sha256, origin: 'Saved actual loaded-file hash observation, not rehashed by the portable auditor' };
    }
  }
  scopes.observedLoadedFiles = { origin: 'Every nonempty managed location and native module path observed by the retained snapshots, no filename exemptions. Dynamic/location-less assemblies remain in raw snapshots, not fabricated as files.', files: observed };
  inventories.roles[role] = scopes;
}
const union = [], differences = [];
for (const scope of [...new Set(Object.values(inventories.roles).flatMap(value => Object.keys(value)))].sort()) {
  const a = inventories.roles.original37[scope]?.files ?? {}, b = inventories.roles.default[scope]?.files ?? {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const original37 = a[key] ?? null, currentDefault = b[key] ?? null;
    const status = original37 === null ? 'only-default' : currentDefault === null ? 'only-original37' :
      JSON.stringify(original37) === JSON.stringify(currentDefault) ? 'identical' : 'different';
    const row = { scope, key, status, original37, default: currentDefault };
    union.push(row);
    if (status !== 'identical') differences.push(row);
  }
}
gzipJson('inventories.json.gz', inventories);
gzipJson('all-differences.json.gz', { union, differences, noPrefixExemptions: true });
write('inventory-boundaries.json', {
  counts: Object.fromEntries(Object.entries(inventories.roles).map(([role, scopes]) => [role, Object.fromEntries(Object.entries(scopes).map(([name, value]) => [name, Object.keys(value.files).length]))])),
  unionRows: union.length, differenceRows: differences.length,
  selection: 'Only binary-selection.json payloads, selected source documents and raw evidence are portable bytes; full directory images are saved keyed hash inventories.',
  omissions: 'No portable runnable whole image, full compiler inputs, dependency closure, fresh omitted-file rehash or causal optimization pair is claimed.',
  exclusions: 'No filename/prefix exemptions in declared image inventories or union/differences; common fixture, testhost/bootstrap/support files and every non-DLL name are included.',
  sdk: roles.sharedSdkRoot, caches: roles.sharedPackageCache, links: roles.links
});

const scriptNames = [
  'Record.ps1', 'Prepare.ps1', 'Native.ps1', 'Common.ps1', 'Capture-Sources.ps1', 'Stage-Runtime.ps1',
  'Inspect-Evidence.mjs', 'Inspect-Defaults.ps1', 'Check-Xml.ps1', 'Close.ps1', 'Build-Capsule.mjs',
  'Seal.mjs'
];
for (const name of scriptNames) if (fs.existsSync(path.join(root, name))) copy(path.join(root, name), `scripts\\${name}`);
write('summary.json', {
  status: { F169: 'PENDING', F170: 'PENDING' },
  commits: { original37: roles.originalCommit, default: roles.defaultCommit },
  native: Object.fromEntries(['original37', 'default'].map(role => [role, {
    assertionPid: nativeHosts[role].snapshot.pid, runtime: nativeHosts[role].snapshot.framework,
    successfulFacts: nativeRuns.filter(run => run.role === role).reduce((sum, run) => sum + +run.parsed.counters.passed, 0),
    distinctFactNames: [...new Set(nativeRuns.filter(run => run.role === role).flatMap(run => run.parsed.rows.map(row => row.testName)))].sort(),
    failedRuntimeAttempts: nativeRuns.filter(run => run.role === role && run.parsed.outcome === 'Failed').length
  }])),
  supplemental: Object.fromEntries(['original37', 'default'].map(role => [role, {
    pid: supplemental[role].pid, runtime: supplementalHosts[role].snapshot.framework,
    names: supplemental[role].results.map(result => result.Name), passed: supplemental[role].results.filter(result => result.Passed).length
  }])),
  commonCompile: { initialMissingAssetsAttempt: '040-common-initial-no-restore', successfulCompileCommands: ['042-common-compile'], count: 1 },
  nativeFailedCommandIds: commands.filter(command => command.receipt.file.endsWith('\\.dotnet\\dotnet.exe') && command.receipt.exitCode !== 0).map(command => command.receipt.id),
  selectedPEs: binaryFacts.filter(item => item.pe).length, selectedPDBs: binaryFacts.filter(item => item.pdb).length,
  selectedRawDocumentAssociations: associations.length, nativeWorkTerminal: true,
  parserReuse: 'evidence.mjs is copied unchanged from finding-F155-F159-010/capsule/evidence.mjs, including actual ECMA PE/PDB and recursive XML parsers.'
});
console.log(JSON.stringify({
  prepared: true, sourceFiles: sources.length, selectedBinariesAndInputs: selection.length,
  rawDocumentAssociations: associations.length, nativeRuns: nativeRuns.length,
  nativeFactsPerRole: 4, supplementalChecksPerRole: 12, imageUnionRows: union.length,
  imageDifferenceRows: differences.length, selectedFilesBeforeManifest: walk(capsule).length
}));
