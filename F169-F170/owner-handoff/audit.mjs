import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { hash, parsePe, parsePdb, parseXml, parseTrx } from './evidence.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function local(relative) {
  assert.equal(typeof relative, 'string');
  assert(!path.win32.isAbsolute(relative) && !path.posix.isAbsolute(relative), 'Only capsule-relative inputs');
  const parts = relative.split(/[\\/]/);
  assert(parts.every(part => part && part !== '.' && part !== '..'), 'Invalid capsule-relative path');
  return path.join(root, ...parts);
}
const buffer = relative => fs.readFileSync(local(relative));
const text = relative => buffer(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const zipped = relative => JSON.parse(zlib.gunzipSync(buffer(relative)).toString('utf8'));
const record = value => ({ bytes: value.length, sha256: hash(value) });
const stable = value => value === null || typeof value !== 'object' ? value :
  Array.isArray(value) ? value.map(stable) :
    Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
const equal = (actual, expected, message) => assert.deepEqual(stable(actual), stable(expected), message);
const windowsKey = value => value.replaceAll('/', '\\').toLowerCase();
function walk(directory, relative = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const key = relative ? `${relative}\\${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), 'Selected capsule contains an unexpected link');
    return entry.isDirectory() ? walk(path.join(directory, entry.name), key) : [key];
  });
}

const manifest = json('manifest.json');
const files = walk(root);
equal(files.slice().sort(), [...manifest.files.map(file => file.path), 'manifest.json', 'SHA256SUMS.txt'].sort(), 'Manifest selection must be exact');
let selectedBytes = 0;
for (const item of manifest.files) {
  const actual = buffer(item.path);
  equal(record(actual), { bytes: item.bytes, sha256: item.sha256 }, `Selected bytes changed: ${item.path}`);
  selectedBytes += actual.length;
}
selectedBytes += buffer('manifest.json').length + buffer('SHA256SUMS.txt').length;
const hashLines = text('SHA256SUMS.txt').trimEnd().split(/\r?\n/).map(line => {
  const separator = line.indexOf('  ');
  assert.equal(separator, 64);
  return { sha256: line.slice(0, separator), path: line.slice(separator + 2) };
});
equal(hashLines, [...manifest.files.map(file => ({ path: file.path, sha256: file.sha256 })),
  { path: 'manifest.json', sha256: hash(buffer('manifest.json')) }].sort((a, b) => a.path.localeCompare(b.path, 'en')), 'Hash-list mismatch');

const roles = json('roles.json'), requirements = json('requirements-and-boundaries.json');
const candidates = json('candidate-records.json');
equal(candidates.map(candidate => ({ id: candidate.id, status: candidate.status })).sort((a, b) => a.id.localeCompare(b.id)),
  [{ id: 'F169', status: 'pending' }, { id: 'F170', status: 'pending' }], 'Only exact pending records');
assert(candidates.every(candidate => candidate.finding.file === 'src/Http/Http.Abstractions/test/UseWhenExtensionsTests.cs'));
equal(candidates.map(candidate => candidate.finding.line_start), [127, 151]);

const bundle = zipped('command-bundle.json.gz');
const commands = bundle.commands;
const commandById = Object.fromEntries(commands.map(command => [command.receipt.id, command]));
assert.equal(commands.length, Object.keys(commandById).length, 'Duplicate command IDs');
for (const command of commands) {
  const receipt = command.receipt;
  assert(receipt.rootAwaited && receipt.stdoutAwaited && receipt.stderrAwaited && Number.isInteger(receipt.exitCode), `Unawaited command: ${receipt.id}`);
  for (const stream of ['stdout', 'stderr']) {
    equal(record(Buffer.from(command[stream].text)), { bytes: command[stream].bytes, sha256: command[stream].sha256 }, `Raw command stream mismatch: ${receipt.id}`);
  }
  if (receipt.file.endsWith('\\.dotnet\\dotnet.exe')) {
    assert.equal(receipt.file, `${receipt.cwd}\\.dotnet\\dotnet.exe`);
    const env = receipt.environmentOverrides;
    equal([env.DOTNET_GENERATE_ASPNET_CERTIFICATE, env.DOTNET_ADD_GLOBAL_TOOLS_TO_PATH, env.MSBUILDDISABLENODEREUSE], ['false', 'false', '1']);
    assert.equal(env.DOTNET_ROOT, `${receipt.cwd}\\.dotnet`);
    assert([roles.original37, roles.default].includes(receipt.cwd));
    for (const name of ['DOTNET_CLI_HOME', 'TEMP', 'TMP', 'NUGET_HTTP_CACHE_PATH', 'NUGET_PLUGINS_CACHE_PATH']) {
      assert([roles.original37, roles.default, roles.common].some(roleRoot => env[name].startsWith(`${roleRoot}\\.autoperf\\`)), `Nonprivate ${name}`);
    }
    assert.equal(env.NUGET_PACKAGES, roles.sharedPackageCache);
    assert(!receipt.arguments.some(arg => /(?:RunAnalyzers|EnableNETAnalyzers)=false|LangVersion=|StaticWebAssetsEnabled=false|BuildNodeJS=false/i.test(arg)), 'Native defaults unexpectedly suppressed');
  }
}
const nativeFailures = commands.filter(command => command.receipt.file.endsWith('\\.dotnet\\dotnet.exe') && command.receipt.exitCode !== 0).map(command => command.receipt.id).sort();
equal(nativeFailures, [
  '020-original37-initial-build', '020-default-initial-build',
  '023-original37-build-normal', '023-default-build-normal',
  '030-default-test-initial-runtime', '040-common-initial-no-restore'
].sort(), 'All and only actual native failed attempts must be retained');
for (const role of ['original37', 'default']) {
  assert(commandById[`020-${role}-initial-build`].stdout.text.includes('MSB4019'));
  assert(commandById[`023-${role}-build-normal`].stdout.text.includes('Required dll from ANCM has not been built'));
  assert.equal(commandById[`023-${role}-build-without-ancm`].receipt.exitCode, 0);
  assert(commandById[`023-${role}-build-without-ancm`].receipt.arguments.includes('/p:UseIisNativeAssets=false'));
  const defaults = JSON.parse(commandById[`060-${role}-native-defaults`].stdout.text).Properties;
  equal([defaults.TargetFramework, defaults.TargetFrameworks, defaults.LangVersion, defaults.CheckForOverflowUnderflow, defaults.Nullable, defaults.EnableNETAnalyzers],
    ['net12.0', '', 'preview', 'false', 'enable', 'true']);
  const status = commandById[role === 'original37' ? '063-original37-closing-tracked-status' : '064-default-closing-tracked-status'].stdout.text;
  assert(status.split(/\r?\n/).every(line => line === '' || line.startsWith('#')), 'Private tracked source changed');
}
equal(commandById['003-coordinator-entry'].stdout.text, commandById['065-coordinator-closing-status'].stdout.text, 'Coordinator branch/worktree status changed');
equal(commandById['001-upstream-entry-git'].stdout.text.trim().split(/\s+/)[0], roles.defaultCommit);
equal(commandById['002-upstream-entry-gh'].stdout.text.trim(), roles.defaultCommit);
equal(commandById['066-upstream-closing-git'].stdout.text.trim().split(/\s+/)[0], commandById['067-upstream-closing-gh'].stdout.text.trim());
const commonSuccessfulBuilds = commands.filter(command => command.receipt.exitCode === 0 &&
  command.receipt.arguments[0] === 'build' && command.receipt.arguments.some(arg => arg.endsWith('\\UseWhenPreparation.csproj')));
equal(commonSuccessfulBuilds.map(command => command.receipt.id), ['042-common-compile']);
assert(commandById['040-common-initial-no-restore'].stdout.text.includes('NETSDK1004'));
assert.equal(commandById['041-common-restore-after-missing-assets'].receipt.exitCode, 0);
assert(commandById['030-default-test-initial-runtime'].stderr.text.includes('12.0.0-alpha.1.26569.107'));
assert(commandById['031-default-private-runtime-stage'].receipt.startUtc > commandById['030-default-test-initial-runtime'].receipt.exitUtc);
assert(commandById['030-default-test-loaded'].receipt.startUtc > commandById['031-default-private-runtime-stage'].receipt.exitUtc);

const sources = json('source-facts.json');
for (const source of sources) {
  const raw = buffer(source.capsulePath), utf8 = raw.toString('utf8'), lf = Buffer.from(utf8.replaceAll('\r\n', '\n'));
  equal(record(raw), { bytes: source.bytes, sha256: source.sha256 }, 'Raw source identity mismatch');
  assert.equal((utf8.match(/\r\n/g) ?? []).length, source.crlfPairs);
  equal([lf.length, hash(lf)], [source.lfBytes, source.lfSha256]);
  const gitBlob = hash(Buffer.concat([Buffer.from(`blob ${lf.length}\0`), lf]), 'sha1');
  assert.equal(gitBlob, source.computedGitLfBlobSha1);
  if (source.gitBlobSha1) assert.equal(gitBlob, source.gitBlobSha1);
}
const selection = json('binary-selection.json'), binaryFacts = zipped('binary-facts.json.gz');
const parsedBinaries = new Map();
for (const item of selection) equal(record(buffer(item.path)), { bytes: item.bytes, sha256: item.sha256 });
equal(binaryFacts.binaries.map(item => item.path).sort(), selection.filter(item => /\.(?:dll|exe|pdb)$/.test(item.path)).map(item => item.path).sort());
for (const item of binaryFacts.binaries) {
  const actual = item.pdb ? { pdb: parsePdb(buffer(item.path)) } : { pe: parsePe(buffer(item.path)) };
  equal(actual, item.pdb ? { pdb: item.pdb } : { pe: item.pe }, `Fresh binary metadata mismatch: ${item.path}`);
  parsedBinaries.set(item.path, { ...item, ...actual });
}
const actualAssociations = [];
for (const item of parsedBinaries.values()) {
  if (!item.pdb) continue;
  const dllPath = item.path.replace(/\.pdb$/, '.dll'), dll = parsedBinaries.get(dllPath);
  assert(dll?.pe.codeView.some(cv => cv.guid === item.pdb.guid && cv.stamp === item.pdb.stamp), 'PE CodeView/PDB ID mismatch');
  for (const document of item.pdb.documents) {
    const source = sources.find(source => windowsKey(source.originalPath) === windowsKey(document.name));
    if (!source) continue;
    const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
      document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
    assert(algorithm, 'Unknown raw Document checksum algorithm');
    const checksum = hash(buffer(source.capsulePath), algorithm);
    assert.equal(checksum, document.checksum, 'Raw PDB Document checksum mismatch');
    actualAssociations.push({
      pdbPath: item.path, dllPath, pdbDocumentRow: document.row, documentName: document.name,
      checksumAlgorithmGuid: document.algorithm, algorithm, expectedChecksum: document.checksum,
      selectedSourcePath: source.capsulePath, rawChecksum: checksum
    });
  }
}
equal(actualAssociations, binaryFacts.documentAssociations, 'Raw source/PDB association completeness mismatch');
for (const role of ['original37', 'default']) {
  assert(actualAssociations.some(a => a.pdbPath === `images\\${role}\\native\\Microsoft.AspNetCore.Http.Abstractions.Tests.pdb` &&
    a.selectedSourcePath === `sources\\${role}\\src\\Http\\Http.Abstractions\\test\\UseWhenExtensionsTests.cs`));
}
const helperSources = sources.filter(source => source.sourcePath.endsWith('UseWhenExtensionsTests.cs'));
equal(helperSources.map(source => source.gitBlobSha1), [helperSources[0].gitBlobSha1, helperSources[0].gitBlobSha1], 'Unchanged helper Git identity differs');

const tests = json('native-tests.json'), systemXml = json('system-xml-validation.json');
assert.equal(tests.runs.length, 3);
let executions = 0;
const localName = node => node.name.split(':').at(-1);
const child = (node, name) => node.children.find(item => localName(item) === name);
for (const run of tests.runs) {
  const raw = buffer(run.path), actual = parseTrx(raw.toString('utf8')), xml = parseXml(raw.toString('utf8'));
  assert.equal(xml.attributes.xmlns, 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');
  equal(record(raw), { bytes: run.bytes, sha256: run.sha256 });
  equal(actual, run.parsed, 'Fresh native TRX parse mismatch');
  const independent = systemXml.runs.find(item => item.capsulePath === run.path);
  assert(independent, 'Independent System.Xml run absent');
  assert.equal(independent.sha256, hash(raw));
  assert.equal(independent.run.id, actual.runId);
  equal(independent.counters, actual.counters);
  equal(independent.rows, (child(xml, 'Results')?.children ?? []).filter(node => localName(node) === 'UnitTestResult').map(node => node.attributes));
  equal(independent.definitions.map(d => ({ ...d.attributes, method: d.method, execution: d.execution })), actual.definitions);
  equal(independent.entries, actual.entries);
  const command = commandById[`030-${run.role}-test-${run.attempt}`];
  assert(command, 'Native invocation receipt absent');
  const filterIndex = command.receipt.arguments.indexOf('--filter');
  assert.equal(command.receipt.arguments[filterIndex + 1], requirements.nativeFilter);
  if (run.attempt === 'initial-runtime') {
    assert.equal(run.role, 'default');
    assert.equal(actual.outcome, 'Failed');
    assert.equal(actual.rows.length, 0);
    assert.equal(command.receipt.exitCode, 1);
    assert(independent.summaryXml.includes('12.0.0-alpha.1.26569.107'));
  } else {
    assert.equal(command.receipt.exitCode, 0);
    assert.equal(actual.outcome, 'Completed');
    equal(actual.rows.map(row => row.testName).sort(), requirements.nativeCases.slice().sort(), 'Chosen Fact names/rows changed');
    assert(actual.rows.every(row => row.outcome === 'Passed'));
    executions += actual.rows.length;
  }
}
assert.equal(executions, 8);
assert.equal(systemXml.executions, 8);
equal(tests.distinctNativeNames, requirements.nativeCases.slice().sort());
for (const log of json('compressed-logs.json')) equal(record(zlib.gunzipSync(buffer(log.path))), log.raw);

const rawIdentities = zipped('loaded-images.json.gz');
assert.equal(rawIdentities.nonJsonFiles.length, 0);
const identities = rawIdentities.snapshots.map(item => {
  equal(record(Buffer.from(item.rawUtf8)), { bytes: item.bytes, sha256: item.sha256 });
  return { relativePath: item.relativePath, snapshot: JSON.parse(item.rawUtf8) };
});
const processFacts = zipped('process-identities.json.gz');
const nativeOwners = ['Microsoft.AspNetCore.Http.Abstractions.Tests', 'Microsoft.AspNetCore.Http.Abstractions', 'Microsoft.AspNetCore.Http', 'Microsoft.AspNetCore.Http.Features'];
const selectionForObservedPath = absolute => selection.find(item => [item.originalPath, ...(item.originalPathAliases ?? [])].some(candidate => windowsKey(candidate) === windowsKey(absolute)));
const supplemental = json('supplemental-results.json');
for (const role of ['original37', 'default']) {
  const nativeCandidates = identities.filter(item => item.relativePath.startsWith(`${role}\\native\\`) &&
    path.win32.basename(item.snapshot.processPath).toLowerCase() === 'testhost.exe' &&
    item.snapshot.assemblies.some(a => a.name.startsWith('Microsoft.AspNetCore.Http.Abstractions.Tests,')));
  equal([...new Set(nativeCandidates.map(item => item.snapshot.pid))], [processFacts.nativeHosts[role].snapshot.pid]);
  const host = nativeCandidates.sort((a, b) => a.snapshot.observedUtc.localeCompare(b.snapshot.observedUtc)).at(-1);
  equal(host, processFacts.nativeHosts[role]);
  const runtime = role === 'original37' ? '12.0.0-alpha.1.26562.105' : '12.0.0-alpha.1.26569.107';
  assert.equal(host.snapshot.framework, `.NET ${runtime}`);
  const config = json(`images\\${role}\\native\\Microsoft.AspNetCore.Http.Abstractions.Tests.runtimeconfig.json`);
  assert.equal(config.runtimeOptions.framework.version, runtime);
  for (const name of [...nativeOwners, 'UseWhenPreparation', 'System.Private.CoreLib']) {
    const assembly = host.snapshot.assemblies.find(assembly => assembly.name.startsWith(`${name},`));
    assert(assembly, `Actual native testhost did not observe ${name}`);
    const selected = selectionForObservedPath(assembly.location);
    assert(selected, `Loaded file not in the selected mapping: ${name}`);
    assert.equal(assembly.sha256, selected.sha256);
    assert.equal(assembly.mvid, parsedBinaries.get(selected.path).pe.mvid);
  }
  for (const name of ['coreclr.dll', 'hostpolicy.dll', 'hostfxr.dll']) {
    const module = host.snapshot.modules.find(module => module.name.toLowerCase() === name), selected = selectionForObservedPath(module?.path ?? '');
    assert(module && selected, `Actual native runtime module absent: ${name}`);
    assert.equal(module.sha256, selected.sha256);
    if (name !== 'hostfxr.dll') assert(windowsKey(module.path).includes(`\\${runtime}\\`));
    else assert(windowsKey(module.path).includes('\\12.0.0-alpha.1.26565.104\\'));
  }
  equal(JSON.parse(commandById[`050-${role}-supplemental`].stdout.text), supplemental[role]);
  assert.equal(commandById[`050-${role}-supplemental`].receipt.exitCode, 0);
  equal(supplemental[role].results.map(result => result.Name).sort(), requirements.supplementalCases.slice().sort());
  assert(supplemental[role].results.every(result => result.Passed === true && result.Error === null));
  const consoleSnapshots = identities.filter(item => item.relativePath.startsWith(`${role}\\supplemental\\`))
    .sort((a, b) => a.snapshot.observedUtc.localeCompare(b.snapshot.observedUtc));
  const consoleHost = consoleSnapshots.at(-1);
  equal(consoleHost, processFacts.supplementalHosts[role]);
  assert.equal(consoleHost.snapshot.pid, supplemental[role].pid);
  assert.equal(consoleHost.snapshot.framework, '.NET 12.0.0-alpha.1.26557.102');
  assert.notEqual(consoleHost.snapshot.pid, host.snapshot.pid);
  for (const helper of supplemental[role].helpers) {
    assert.equal(helper.mvid, parsedBinaries.get(`images\\${role}\\native\\Microsoft.AspNetCore.Http.Abstractions.Tests.dll`).pe.mvid);
    assert.equal(windowsKey(helper.assembly), windowsKey(path.win32.join(roles[role], 'artifacts', 'bin', 'Microsoft.AspNetCore.Http.Abstractions.Tests', 'Debug', 'net12.0', 'Microsoft.AspNetCore.Http.Abstractions.Tests.dll')));
    assert(['Increment', 'Count'].includes(helper.Name));
  }
}
const commonProject = parseXml(text('common\\inputs\\UseWhenPreparation.csproj'));
const properties = commonProject.children.filter(node => node.name === 'PropertyGroup').flatMap(node => node.children);
assert.equal(properties.find(node => node.name === 'LangVersion').text, '13');
assert.equal(properties.find(node => node.name === 'EnableNETAnalyzers').text, 'true');
assert.equal(json('common\\image\\UseWhenPreparation.runtimeconfig.json').runtimeOptions.framework.version, '12.0.0-alpha.1.26557.102');

const staging = zipped('runtime69-staging.json.gz');
assert.equal(staging.fileCount, 198);
equal(staging.sourceInventory, staging.destinationInventory);
assert.equal(staging.expectedCoreLibSha256, '09dc73d8b850905f8250c160732cedeb532349827e59267bf04b0f59b0d55af8');
assert.equal(hash(buffer('images\\default\\assertion-runtime\\System.Private.CoreLib.dll')), staging.expectedCoreLibSha256);

const inventories = zipped('inventories.json.gz'), declaredDiff = zipped('all-differences.json.gz');
const union = [], differences = [];
for (const scope of [...new Set(Object.values(inventories.roles).flatMap(value => Object.keys(value)))].sort()) {
  const a = inventories.roles.original37[scope]?.files ?? {}, b = inventories.roles.default[scope]?.files ?? {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const original37 = a[key] ?? null, currentDefault = b[key] ?? null;
    const status = original37 === null ? 'only-default' : currentDefault === null ? 'only-original37' :
      JSON.stringify(original37) === JSON.stringify(currentDefault) ? 'identical' : 'different';
    const item = { scope, key, status, original37, default: currentDefault };
    union.push(item);
    if (status !== 'identical') differences.push(item);
  }
}
equal(union, declaredDiff.union, 'Declared all-file union not complete');
equal(differences, declaredDiff.differences, 'Declared differences not complete');
assert.equal(declaredDiff.noPrefixExemptions, true);
for (const role of ['original37', 'default']) {
  const fixture = inventories.roles[role].commonFixtureImage.files;
  equal(Object.keys(fixture).sort(), selection.filter(item => item.category === 'common-image').map(item => path.win32.basename(item.path)).sort(), 'Common/helper image names were exempted');
  for (const item of selection.filter(item => item.category === 'common-image')) equal(fixture[path.win32.basename(item.path)], { bytes: item.bytes, sha256: item.sha256 });
  for (const item of selection.filter(item => item.role === role && ['native-owner-or-test', 'native-support-or-config'].includes(item.category))) {
    equal(inventories.roles[role].nativeTestImage.files[path.win32.basename(item.path)], { bytes: item.bytes, sha256: item.sha256 });
  }
  for (const item of selection.filter(item => item.role === role && item.category === 'actual-native-assertion-runtime')) {
    equal(inventories.roles[role].assertionRuntimeImage.files[path.win32.basename(item.path)], { bytes: item.bytes, sha256: item.sha256 });
  }
  const observed = {};
  for (const { snapshot } of identities.filter(item => item.relativePath.startsWith(`${role}\\`))) {
    for (const item of [
      ...snapshot.assemblies.filter(a => a.location).map(a => ({ key: a.location, sha256: a.sha256 })),
      ...snapshot.modules.map(m => ({ key: m.path, sha256: m.sha256 }))
    ]) {
      if (observed[item.key]) assert.equal(observed[item.key].sha256, item.sha256);
      observed[item.key] = { sha256: item.sha256, origin: 'Saved actual loaded-file hash observation, not rehashed by the portable auditor' };
    }
  }
  equal(observed, inventories.roles[role].observedLoadedFiles.files);
}
equal(inventories.roles.original37.commonFixtureImage.files, inventories.roles.default.commonFixtureImage.files, 'Fixture bytes must be common');
equal(inventories.roles.original37.commonFixtureInputs.files, inventories.roles.default.commonFixtureInputs.files, 'Fixture inputs must be common');

const terminal = json('terminal-native-work.json');
assert.equal(terminal.noOwnedNativeWorkRemaining, true);
equal(terminal.freshPrivateRootNativeProcesses, []);
assert(terminal.directRoots.every(item => item.rootAwaited && item.stdoutAwaited && item.stderrAwaited));
equal(terminal.directRoots.map(item => item.command).sort(), commands.filter(command => command.receipt.id !== '068-terminal-native-work').map(command => command.receipt.id).sort());
assert.equal(commandById['068-terminal-native-work'].receipt.exitCode, 0);
assert.equal(terminal.hookProcesses.length, identities.length);
assert(terminal.knownChildren.every(item => item.terminalState === 'pid-absent-at-fresh-CIM-check' ||
  item.terminalState === 'numeric-pid-present-with-different-CIM-creation-identity'));
assert(terminal.hookProcesses.every(item => item.terminalState === 'pid-absent-at-fresh-CIM-check' ||
  item.terminalState === 'numeric-pid-present-start-differs-by-at-least-one-millisecond'));

const summary = json('summary.json');
equal(summary.status, { F169: 'PENDING', F170: 'PENDING' });
equal(summary.nativeFailedCommandIds.slice().sort(), nativeFailures);
assert.equal(summary.commonCompile.count, 1);
assert.equal(summary.nativeWorkTerminal, true);
assert.equal(summary.selectedRawDocumentAssociations, actualAssociations.length);
console.log(JSON.stringify({
  auditPassed: true,
  selectedFiles: files.length, selectedBytes,
  manifestSha256: hash(buffer('manifest.json')), handoffSha256: hash(buffer('HANDOFF.md')),
  nativeFactsPerRole: 4, nativeSuccessfulExecutions: 8, nativeDistinctNames: 4,
  defaultInitialRuntimeAttempt: 'Failed before 0 rows; not a pass',
  supplementalChecksPerRole: 12, supplementalSuccessfulExecutions: 24, commonSuccessfulCompiles: 1,
  nativeRuntimes: Object.fromEntries(Object.entries(processFacts.nativeHosts).map(([role, host]) => [role, host.snapshot.framework])),
  supplementalRuntime: '.NET 12.0.0-alpha.1.26557.102',
  freshlyParsedPEs: binaryFacts.binaries.filter(item => item.pe).length,
  freshlyParsedPDBs: binaryFacts.binaries.filter(item => item.pdb).length,
  rawDocumentAssociations: actualAssociations.length, declaredImageUnionRows: union.length, declaredImageDifferenceRows: differences.length,
  status: { F169: 'PENDING', F170: 'PENDING' },
  boundary: 'Read-only Node stdlib audit of selected capsule-relative bytes and saved receipts only. No child process, .NET, counters, benchmark, assertion rerun, external graph access, omitted-file rehash or runnable-closure claim.'
}));
