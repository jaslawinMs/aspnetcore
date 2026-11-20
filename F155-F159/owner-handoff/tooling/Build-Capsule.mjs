import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { hash, readJson, parsePe, parsePdb, parseTrx, parseXunit } from './evidence.mjs';
const root = path.dirname(fileURLToPath(import.meta.url)), capsule = path.join(root, 'capsule');
assert(!fs.existsSync(path.join(capsule, 'manifest.json')), 'Refusing to mutate a manifested capsule');
const rel = p => path.relative(capsule, p).split(path.sep).join('\\');
const win = p => p.replaceAll('/', '\\').toLowerCase();
const write = (name, value) => {
  const p = path.join(capsule, ...name.split('\\'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  assert(!fs.existsSync(p), `Refusing overwrite: ${name}`);
  fs.writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  return name;
};
const copy = (source, name) => {
  const p = path.join(capsule, ...name.split('\\'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  assert(!fs.existsSync(p), `Refusing overwrite: ${name}`);
  fs.copyFileSync(source, p);
  return name;
};
const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(directory, e.name)) : e.isFile() ? [path.join(directory, e.name)] : []) : [];
const commands = path.join(root, 'commands');
const commandFiles = walk(commands).filter(p => Number(path.basename(p).slice(0, 3)) < 80);
const bundle = commandFiles.map(p => {
  const bytes = fs.readFileSync(p);
  return { relative: path.relative(root, p), bytes: bytes.length, sha256: hash(bytes), base64: bytes.toString('base64') };
});
const commandReceipts = bundle.filter(f => f.relative.endsWith('.json')).map(f => JSON.parse(Buffer.from(f.base64, 'base64').toString('utf8').replace(/^\uFEFF/, '')));
for (const receipt of commandReceipts.filter(r => r.state)) {
  assert.equal(receipt.state, 'terminal', `${receipt.name} still nonterminal`);
  assert.equal(receipt.streamsTerminal, true);
}
write('command-bundle.json', {
  encoding: 'Exact raw stdout/stderr/receipt bytes in base64 with independent SHA-256; no console-total-only summaries.',
  boundary: 'Includes all preparation command files numbered below 080. Capsule assembly/audit/seal invocations remain terminal external receipts. Initial Python shim probe did not capture its child PID/exit; outer tool reported exit 0 and its failure text is retained.',
  files: bundle
});
for (const name of ['Invoke-Recorded.ps1', 'Run-Native.ps1', 'Prepare-Sources.ps1', 'Prepare-ShortSources.ps1', 'Stage-ExactRuntime.ps1', 'Capture-Git.ps1', 'Check-Parsers.mjs', 'Build-Capsule.mjs', 'original37-identity.runsettings', 'observedDefault-identity.runsettings']) copy(path.join(root, name), `tooling\\${name}`);
copy(path.join(root, 'evidence.mjs'), 'evidence.mjs');
copy(path.join(root, 'audit.mjs'), 'audit.mjs');
for (const name of ['Identity.csproj', 'StartupHook.cs']) copy(path.join(root, 'identity', name), `identity\\${name}`);
const commonFiles = [];
for (const name of ['Identity.dll', 'Identity.pdb', 'Identity.deps.json', 'Identity.runtimeconfig.json']) {
  const source = path.join(root, 'identity', 'bin', 'Release', 'net12.0', name), bytes = fs.readFileSync(source);
  copy(source, `identity\\${name}`);
  commonFiles.push({ name, sha256: hash(bytes), bytes: bytes.length });
}
write('common-verifier.json', { successfulCompilationCommand: '042-identity-single-compile-original37', languageVersion: '13.0', files: commonFiles, reuse: 'Identical DLL/PDB/deps/runtimeconfig at the same common path across both source roles; no role-specific compilation. Identity only, not a product-code consumer, counter, profiler, workload or performance comparison.' });
copy(path.join(root, 'runtime-repair', 'exact-runtime-stage.json'), 'runtime69-stage.json');
copy(path.join(root, 'selected-source-paths.json'), 'selected-source-paths.json');
copy(path.join(root, 'roles.json'), 'roles.json');
const requirements = readJson(path.join(capsule, 'requirements-and-assertion-receipts.json'));
const roles = readJson(path.join(root, 'roles.json')), selectedPaths = readJson(path.join(root, 'selected-source-paths.json'));
const owners = ['Microsoft.AspNetCore.Mvc.Formatters.Xml.Test', 'Microsoft.AspNetCore.Mvc.Formatters.Xml', 'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Core.TestCommon'];
const sourceOwners = {
  'src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs': owners[0],
  'src/Mvc/Mvc.Formatters.Xml/src/ValidationProblemDetailsWrapper.cs': owners[1],
  'src/Mvc/Mvc.Formatters.Xml/src/ProblemDetailsWrapper.cs': owners[1],
  'src/Mvc/Mvc.Core/src/ValidationProblemDetails.cs': owners[2]
};
const facts = [], factsByRole = {}, inventories = {};
const parseExport = text => {
  for (let p = text.indexOf('{'); p >= 0; p = text.indexOf('{', p + 1)) {
    try { return JSON.parse(text.slice(p)); } catch {}
  }
  throw Error('No complete native JSON export');
};
for (const role of roles) {
  const prefix = role.name, sourceRows = [], selectedByOrigin = new Map(), binaryRows = [];
  const selectedCopy = (origin, destination) => {
    if (selectedByOrigin.has(win(origin))) return selectedByOrigin.get(win(origin));
    copy(origin, destination); selectedByOrigin.set(win(origin), destination);
    return destination;
  };
  const tree = fs.readFileSync(path.join(commands, `070-selected-git-blobs-${prefix}.stdout.txt`), 'utf8').trim().split(/\r?\n/);
  const blobs = new Map(tree.map(line => {
    const [header, filename] = line.split('\t');
    return [filename, header.split(' ')[2]];
  }));
  assert.equal(fs.readFileSync(path.join(commands, `071-tracked-source-status-${prefix}.stdout.txt`), 'utf8').trim(), '', 'Tracked source changed');
  assert.equal(fs.readFileSync(path.join(commands, `072-final-source-head-${prefix}.stdout.txt`), 'utf8').trim(), role.commit);
  for (const filename of selectedPaths) {
    const source = path.join(role.path, ...filename.split('/')), bytes = fs.readFileSync(source);
    const gitBytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
    const gitBlob = hash(Buffer.concat([Buffer.from(`blob ${gitBytes.length}\0`), gitBytes]), 'sha1');
    assert.equal(gitBlob, blobs.get(filename), `Not exact Git source: ${filename}`);
    const destination = `${prefix}\\source\\${filename.replaceAll('/', '\\')}`;
    selectedCopy(source, destination);
    sourceRows.push({ filename, capsulePath: destination, gitBlob, gitLfSha256: hash(gitBytes), physicalSha256: hash(bytes), physicalBytes: bytes.length, crlfCount: bytes.toString('utf8').split('\r\n').length - 1 });
  }
  for (const name of ['Directory.Build.props', 'Directory.Build.targets']) selectedCopy(path.join(role.path, 'artifacts', 'bin', 'GenerateFiles', name), `${prefix}\\generated\\${name}`);
  const testOutput = path.join(role.path, 'artifacts', 'bin', owners[0], 'Release', 'net12.0');
  const pePdb = [];
  for (const owner of owners) {
    const dll = path.join(testOutput, `${owner}.dll`), pdb = path.join(testOutput, `${owner}.pdb`);
    const dllDestination = selectedCopy(dll, `${prefix}\\binaries\\${owner}.dll`);
    const pdbDestination = selectedCopy(pdb, `${prefix}\\binaries\\${owner}.pdb`);
    const pe = parsePe(fs.readFileSync(dll)), parsedPdb = parsePdb(fs.readFileSync(pdb));
    assert.equal(pe.codeView[0].guid, parsedPdb.guid); assert.equal(pe.codeView[0].stamp, parsedPdb.stamp);
    const documents = [];
    for (const [filename, selectedOwner] of Object.entries(sourceOwners)) {
      if (selectedOwner !== owner) continue;
      const source = sourceRows.find(s => s.filename === filename);
      const document = parsedPdb.documents.find(d => d.name.replaceAll('\\', '/').endsWith(filename));
      assert(document, `PDB lacks selected document ${filename}`);
      assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
      assert.equal(document.checksum, source.physicalSha256);
      documents.push({ ...document, sourcePath: source.capsulePath });
    }
    pePdb.push({ owner, dllPath: dllDestination, pdbPath: pdbDestination, pe, pdb: { guid: parsedPdb.guid, stamp: parsedPdb.stamp, documentCount: parsedPdb.documentCount, documents } });
  }
  for (const name of [`${owners[0]}.deps.json`, `${owners[0]}.runtimeconfig.json`, 'testhost.exe', 'testhost.dll']) selectedCopy(path.join(testOutput, name), `${prefix}\\native-host\\${name}`);
  const runtimeconfig = readJson(path.join(testOutput, `${owners[0]}.runtimeconfig.json`));
  const reportFiles = walk(path.join(root, 'native', prefix)).filter(p => ['.trx', '.xml'].includes(path.extname(p).toLowerCase()));
  const reports = reportFiles.map(source => {
    const destination = selectedCopy(source, `${prefix}\\reports\\${path.basename(source)}`);
    const kind = path.extname(source) === '.trx' ? 'trx' : 'xunit';
    const parsed = kind === 'trx' ? parseTrx(fs.readFileSync(source, 'utf8')) : parseXunit(fs.readFileSync(source, 'utf8'));
    if (parsed.rows.length) {
      assert.equal(parsed.rows.length, 5);
      for (const requirement of requirements.findings) {
        const row = parsed.rows.find(r => (r.testName ?? r.name) === requirement.fullyQualifiedName);
        assert(row, `Missing exact native case ${requirement.id}`);
        assert(['Passed', 'Pass'].includes(row.outcome ?? row.result), `Non-passing native case ${requirement.id}`);
      }
    }
    return { kind, capsulePath: destination, parsed };
  });
  const requiredTrx = prefix === 'original37' ? 'original37.trx' : 'observedDefault-runtime69.trx';
  assert(reports.some(r => r.capsulePath.endsWith(requiredTrx) && r.parsed.rows.length === 5));
  assert(reports.some(r => r.kind === 'xunit' && r.parsed.rows.length === 5));
  const identityFiles = walk(path.join(root, 'native', prefix)).filter(p => /identity-\d+\.json$/.test(p));
  const identities = identityFiles.map(source => {
    const destination = selectedCopy(source, `${prefix}\\identities\\${path.basename(source)}`);
    return { capsulePath: destination, receipt: readJson(source) };
  });
  const consoleIdentity = identities.find(i => i.receipt.commandLine.includes('xunit.console.dll') && i.receipt.assemblies.some(a => a.name.startsWith(`${owners[0]},`)));
  assert(consoleIdentity, 'No actual loaded native test/target identity');
  assert.equal(consoleIdentity.receipt.errors.length, 0);
  assert(consoleIdentity.receipt.framework.includes(runtimeconfig.runtimeOptions.framework.version));
  const managedNames = [owners[0] + '.dll', owners[1] + '.dll', owners[2] + '.dll', 'System.Private.CoreLib.dll', 'System.Private.DataContractSerialization.dll', 'System.Private.Xml.dll', 'Identity.dll'];
  const nativeNames = ['dotnet.exe', 'hostfxr.dll', 'hostpolicy.dll', 'coreclr.dll'];
  for (const image of [...consoleIdentity.receipt.assemblies, ...consoleIdentity.receipt.modules]) {
    const name = path.basename(image.path);
    if (!managedNames.includes(name) && !nativeNames.includes(name) && !name.startsWith('xunit.')) continue;
    const bytes = fs.readFileSync(image.path);
    assert.equal(hash(bytes), image.sha256, 'Loaded file changed after capture');
    const destination = name === 'Identity.dll' ? 'identity\\Identity.dll' : selectedCopy(image.path, `${prefix}\\loaded\\${name}`);
    if (!binaryRows.some(r => win(r.sourcePath) === win(image.path))) binaryRows.push({ sourcePath: image.path, capsulePath: destination, sha256: image.sha256, mvid: image.mvid ?? null, pe: parsePe(bytes), witnessPath: consoleIdentity.capsulePath });
  }
  const graphText = fs.readFileSync(path.join(commands, `055-native-reference-graph-${prefix}.stdout.txt`), 'utf8');
  const graph = parseExport(graphText);
  write(`${prefix}\\reference-graph.json`, graph);
  const inputImages = ['ReferencePath', 'Analyzer'].flatMap(kind => (graph.Items[kind] ?? []).map(item => {
    const origin = item.Identity;
    assert(fs.existsSync(origin), `Missing resolved ${kind}: ${origin}`);
    const bytes = fs.readFileSync(origin);
    return { kind, path: origin, bytes: bytes.length, sha256: hash(bytes) };
  }));
  for (const name of ['project.assets.json', `${owners[0]}.csproj.nuget.dgspec.json`]) selectedCopy(path.join(role.path, 'artifacts', 'obj', owners[0], name), `${prefix}\\restore\\${name}`);
  const restoreGraphs = walk(path.join(role.path, 'artifacts', 'obj')).filter(p => path.basename(p) === 'project.assets.json').map(p => {
    const bytes = fs.readFileSync(p), parsed = readJson(p);
    return { relative: path.relative(role.path, p), sha256: hash(bytes), bytes: bytes.length, projectPath: parsed.project?.restore?.projectPath, projectReferences: parsed.project?.restore?.frameworks, projectLibraries: Object.entries(parsed.libraries ?? {}).filter(([, value]) => value.type === 'project').map(([name, value]) => ({ name, ...value })) };
  });
  const allBinFiles = walk(path.join(role.path, 'artifacts', 'bin')).map(origin => {
    const bytes = fs.readFileSync(origin);
    return { relative: path.relative(path.join(role.path, 'artifacts', 'bin'), origin), bytes: bytes.length, sha256: hash(bytes), selectedPath: selectedByOrigin.get(win(origin)) ?? null, executableImage: ['.dll', '.exe'].includes(path.extname(origin).toLowerCase()) };
  });
  const loadedFiles = [...consoleIdentity.receipt.assemblies, ...consoleIdentity.receipt.modules].map(image => ({ ...image, selectedPath: selectedByOrigin.get(win(image.path)) ?? (path.basename(image.path) === 'Identity.dll' ? 'identity\\Identity.dll' : null) }));
  inventories[prefix] = { boundary: 'Every file recursively under this isolated artifacts\\bin (no filename/prefix exceptions); every resolved ReferencePath/Analyzer image; every image in the actual native console exit snapshot. Omitted payload files remain hash-only saved receipts, not freshly byte-verifiable offline.', allBinFiles, resolvedInputImages: inputImages, loadedFiles, restoreGraphs };
  write(`${prefix}\\inventory.json`, inventories[prefix]);
  factsByRole[prefix] = { role, sourceRows, pePdb, runtimeconfig, reports, identitySnapshots: identities.map(i => i.capsulePath), consoleIdentityPath: consoleIdentity.capsulePath, consoleIdentityPid: consoleIdentity.receipt.pid, binaries: binaryRows, resolvedProperties: graph.Properties };
  write(`${prefix}\\facts.json`, factsByRole[prefix]);
  facts.push({ role: prefix, commit: role.commit, runtime: runtimeconfig.runtimeOptions.framework.version, nativeCaseCount: 5, consoleIdentityPid: consoleIdentity.receipt.pid, reports: reports.map(r => ({ path: r.capsulePath, rows: r.parsed.rows.length, outcome: r.parsed.outcome ?? r.parsed.assembly.passed })) });
}
const [a, b] = roles.map(r => inventories[r.name]);
const differences = [];
function compare(scope, rowsA, rowsB, key) {
  const left = new Map(rowsA.map(row => [key(row), row])), right = new Map(rowsB.map(row => [key(row), row]));
  for (const name of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const l = left.get(name), r = right.get(name);
    if (l?.sha256 !== r?.sha256 || !l || !r) differences.push({ scope, name, original37: l ?? null, observedDefault: r ?? null });
  }
}
compare('artifacts-bin-complete', a.allBinFiles, b.allBinFiles, r => r.relative);
const normalize = (origin, role) => {
  if (win(origin).startsWith(win(role.path) + '\\')) return 'checkout\\' + origin.slice(role.path.length + 1);
  const packages = 'C:\\.tools\\.nuget\\packages\\';
  if (win(origin).startsWith(win(packages))) return 'nuget\\' + origin.slice(packages.length);
  return origin;
};
compare('resolved-reference-and-analyzer-images', a.resolvedInputImages, b.resolvedInputImages, r => `${r.kind}\\${normalize(r.path, roles[r.path.toLowerCase().startsWith(roles[0].path.toLowerCase()) ? 0 : 1])}`);
compare('actual-console-loaded-images', a.loadedFiles, b.loadedFiles, r => normalize(r.path, roles[r.path.toLowerCase().startsWith(roles[0].path.toLowerCase()) ? 0 : 1]));
compare('restore-assets-graphs', a.restoreGraphs, b.restoreGraphs, r => r.relative);
compare('selected-raw-sources', factsByRole.original37.sourceRows.map(r => ({ ...r, sha256: r.physicalSha256 })), factsByRole.observedDefault.sourceRows.map(r => ({ ...r, sha256: r.physicalSha256 })), r => r.filename);
write('all-differences.json', { policy: 'Every differing or role-only filename/hash within each declared inventory scope. No owner-ish, fixture, shared-name or framework-prefix exceptions. This is identity inventory, not a performance or diagnostic comparison. Cross-source graphs are not a causal pair.', differences });
write('summary.json', { allFindingIdsRemainPending: requirements.findings.map(f => f.id), facts, differences: differences.length, nativeInvocations: commandReceipts.filter(r => r.name && /050-native|057-native|061-native|062-native|063-native/.test(r.name)).map(r => ({ name: r.name, pid: r.pid, exitCode: r.exitCode, streamsTerminal: r.streamsTerminal })) });
console.log(JSON.stringify({ assembled: true, roles: facts, differences: differences.length, currentSelectedFiles: walk(capsule).length }, null, 2));
