import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { record, sha, pe, pdb, source, trx, differences } from './evidence.mjs';
const root = path.dirname(fileURLToPath(import.meta.url)), cap = path.join(root, 'capsule');
const roles = JSON.parse(fs.readFileSync(path.join(root, 'roles.json')));
const json = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const posix = p => p.replaceAll('\\', '/');
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
    e.isDirectory() ? files(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
}
function copy(from, relative) {
  const to = path.join(cap, relative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); return posix(relative);
}
function normal(file, repo) {
  const value = posix(file);
  for (const [prefix, token] of [[posix(repo), '$REPO'], ['C:/src/aspnetcore/.dotnet', '$SHARED_DOTNET'], ['C:/.tools/.nuget/packages', '$NUGET']]) {
    if (value.toLowerCase().startsWith(prefix.toLowerCase() + '/')) return token + value.slice(prefix.length);
  }
  return value;
}
const commands = [];
for (const f of files(path.join(root, 'commands')).filter(f => f.endsWith('.json'))) {
  const receipt = read(f), base = path.dirname(f), entry = { receipt };
  for (const stream of ['stdout', 'stderr']) {
    const p = path.join(base, receipt[stream]);
    entry[stream] = fs.existsSync(p) ? { ...record(p), utf8: fs.readFileSync(p, 'utf8') } : { missing: true };
  }
  commands.push(entry);
}
json(path.join(cap, 'command-bundle.json'), commands);
for (const f of fs.readdirSync(root)) {
  if (/\.(ps1|py|mjs)$/.test(f) && !['Build-Capsule.mjs', 'Seal.mjs'].includes(f)) copy(path.join(root, f), path.join('preparation', f));
}
copy(path.join(root, 'evidence.mjs'), 'evidence.mjs');
copy(path.join(root, 'audit.mjs'), 'audit.mjs');
copy(path.join(root, 'acceptance.json'), 'acceptance.json');
copy(path.join(root, 'roles.json'), 'roles.json');
copy(path.join(root, 'selected-sources.json'), 'selected-sources.json');
for (const f of ['repair.json', 'reference-package-source.json', 'public-feed-index.json']) {
  const from = path.join(root, 'runtime-repair', f);
  if (fs.existsSync(from)) copy(from, path.join('runtime-repair', f));
}
for (const f of files(path.join(root, 'native'))) {
  if (/\.(trx|runsettings|log)$/.test(f)) copy(f, path.join('native', path.relative(path.join(root, 'native'), f)));
}
const loaded = files(path.join(root, 'identity')).filter(f => f.endsWith('.json')).map(f => ({
  file: posix(path.relative(root, f)), receipt: read(f)
}));
const hookErrors = files(path.join(root, 'identity')).filter(f => f.endsWith('.txt')).map(f => ({ file: posix(path.relative(root, f)), text: fs.readFileSync(f, 'utf8') }));
json(path.join(cap, 'loaded-images.json'), { loaded, hookErrors });
const commonBin = path.join(root, 'common', 'bin', 'Debug', 'net12.0'), common = {};
for (const suffix of ['.dll', '.pdb', '.deps.json', '.runtimeconfig.json']) {
  const f = path.join(commonBin, 'ContractIdentity' + suffix);
  const dest = copy(f, path.join('common', 'ContractIdentity' + suffix));
  common[dest] = record(f);
}
for (const f of ['Program.cs', 'ContractIdentity.csproj']) copy(path.join(root, 'common', f), path.join('common', f));
const commonCommand = commands.find(c => c.receipt.id === '061-common-resolved-inventory');
if (!commonCommand || commonCommand.receipt.exitCode !== 0) throw Error('Missing declared common reference/analyzer inventory');
const commonText = commonCommand.stdout.utf8;
const commonResolved = JSON.parse(commonText.slice(commonText.indexOf('{'), commonText.lastIndexOf('}') + 1));
json(path.join(cap, 'common', 'resolved-inventory.json'), commonResolved);
const commonDeclared = {};
for (const [group, items] of Object.entries(commonResolved.Items ?? {})) {
  for (const item of items) {
    const f = item.FullPath || path.resolve(path.dirname(commonResolved.Properties.MSBuildProjectFullPath), item.Identity);
    const key = `${group}/${normal(f, roles.original37).replace(posix(root), '$COMMON_ROOT')}`;
    commonDeclared[key] = fs.existsSync(f) && fs.statSync(f).isFile() ? record(f) : { missing: true };
  }
}
const facts = { roles: {}, reports: [], common, commonSuccessfulCompilations: commands.filter(c =>
  c.receipt.id.includes('common') && c.receipt.arguments[0] === 'build' && c.receipt.exitCode === 0).length,
  runtimeWitnessBoundary: 'Actual startup-hook process observations retain command line, PID, start time, phase and launch ID. Testhost and supplemental console witnesses are separate; no retroactive relabeling.' };
const inventories = {}, inventoryDetails = {};
for (const role of ['original37', 'default']) {
  const repo = roles[role], roleFacts = { sources: {}, images: [], sourceDocumentChecks: [], runtimeConfigurations: [], testhostWitnesses: [] };
  const scopes = { build: {}, references: {}, analyzers: {}, declaredCompile: {}, declaredOtherInputs: {}, loadedAssemblies: {}, loadedNativeModules: {}, common: { ...common }, commonDeclared: { ...commonDeclared }, runtime: {} };
  const details = { resolvedProjects: [], missingDeclaredFiles: [], rawBuildRoot: path.join(repo, 'artifacts', 'bin'), boundary: 'Complete declared bin scope plus four owner/test ResolveReferences evaluations; not a full compiler-input or every-transitive-project analyzer attestation. Omitted payload is hash-only saved receipts.' };
  for (const f of files(path.join(cap, 'sources', role))) roleFacts.sources[posix(path.relative(path.join(cap, 'sources', role), f))] = source(f);
  const index = commands.find(c => c.receipt.id === `016-${role}-source-identities`).stdout.utf8;
  for (const [relative, s] of Object.entries(roleFacts.sources)) {
    const line = index.split(/\r?\n/).find(l => l.endsWith('\t' + relative));
    if (line) {
      s.savedIndexBlobSha1 = line.split(' ')[1];
      if (s.gitLfBlobSha1 !== s.savedIndexBlobSha1) throw Error(`Source differs from Git/LF index: ${role} ${relative}`);
    } else throw Error(`No Git index record: ${role} ${relative}`);
  }
  for (const project of ['Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Tests', 'Microsoft.AspNetCore.Components.Endpoints', 'Microsoft.AspNetCore.Components.Endpoints.Tests']) {
    const bin = path.join(repo, 'artifacts', 'bin', project, 'Debug', 'net12.0');
    const dll = path.join(bin, project + '.dll'), debug = path.join(bin, project + '.pdb');
    const dllRel = copy(dll, path.join('images', role, project + '.dll'));
    const pdbRel = copy(debug, path.join('images', role, project + '.pdb'));
    const image = pe(dll), symbols = pdb(debug);
    if (!image.codeView.some(c => c.guid === symbols.idGuid && c.stamp === symbols.idStamp && c.age === 1)) throw Error('PE/PDB content ID mismatch');
    roleFacts.images.push({ project, dll: dllRel, pdb: pdbRel, image, symbols });
    for (const suffix of ['.deps.json', '.runtimeconfig.json', '.runtimeconfig.dev.json']) {
      const f = path.join(bin, project + suffix);
      if (fs.existsSync(f)) {
        const selected = copy(f, path.join('images', role, project + suffix));
        if (suffix === '.runtimeconfig.json') roleFacts.runtimeConfigurations.push({ file: selected, value: read(f) });
      }
    }
    for (const [relative, s] of Object.entries(roleFacts.sources)) {
      const document = symbols.documents.find(d => posix(d.name).toLowerCase().endsWith('/' + relative.toLowerCase()));
      if (document) {
        const passed = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' && document.checksum === s.sha256;
        if (!passed) throw Error(`Raw source/PDB checksum mismatch: ${role} ${relative}`);
        roleFacts.sourceDocumentChecks.push({ source: `sources/${role}/${relative}`, image: dllRel, pdb: pdbRel, documentRow: document.row, rawSha256: s.sha256, passed });
      }
    }
  }
  for (const f of files(path.join(repo, 'artifacts', 'bin'))) scopes.build[posix(path.relative(path.join(repo, 'artifacts', 'bin'), f))] = record(f);
  for (const project of ['components', 'componentsTests', 'endpoints', 'endpointsTests']) {
    const command = commands.find(c => c.receipt.id === `060-${role}-${project}-resolved-inventory`);
    if (!command || command.receipt.exitCode !== 0) throw Error(`Missing resolved inventory ${role}/${project}`);
    const text = command.stdout.utf8, evaluated = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    details.resolvedProjects.push({ project, commandId: command.receipt.id, evaluated });
    for (const [group, items] of Object.entries(evaluated.Items ?? {})) {
      for (const item of items) {
        const f = item.FullPath || path.resolve(path.dirname(evaluated.Properties.MSBuildProjectFullPath), item.Identity);
        const scope = group === 'Analyzer' ? 'analyzers' : group.startsWith('Reference') ? 'references' : group === 'Compile' ? 'declaredCompile' : 'declaredOtherInputs';
        const key = `${project}/${group}/${normal(f, repo)}`;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) scopes[scope][key] = record(f);
        else { scopes[scope][key] = { missing: true }; details.missingDeclaredFiles.push({ project, group, file: f }); }
      }
    }
  }
  const roleLoaded = loaded.filter(x => x.file.startsWith(`identity/${role}/`));
  for (const { file, receipt: r } of roleLoaded) {
    for (const a of r.assemblies) if (a.location) scopes.loadedAssemblies[normal(a.location, repo)] = { sha256: a.sha256, mvid: a.mvid };
    for (const m of r.modules) scopes.loadedNativeModules[normal(m.path, repo)] = { sha256: m.sha256 };
    if (/testhost/i.test(r.processPath ?? '') || /testhost\.(dll|exe)/i.test(r.commandLine)) {
      roleFacts.testhostWitnesses.push({ receipt: file, pid: r.pid, phase: r.phase, launchId: r.launchId, processStartUtc: r.processStartUtc, runtimeDirectory: r.runtimeDirectory, framework: r.framework,
        loadedOwnerAndTestNames: r.assemblies.filter(a => a.name.startsWith('Microsoft.AspNetCore.Components')).map(a => ({ name: a.name, sha256: a.sha256, mvid: a.mvid, location: a.location })) });
    }
  }
  const runtime = roleFacts.testhostWitnesses.find(w => w.loadedOwnerAndTestNames.length)?.runtimeDirectory;
  if (!runtime) throw Error(`No actual testhost owner/runtime witness: ${role}`);
  for (const f of files(runtime)) scopes.runtime[posix(path.relative(runtime, f))] = record(f);
  roleFacts.actualTestRuntimeDirectory = runtime;
  facts.roles[role] = roleFacts; inventories[role] = scopes; inventoryDetails[role] = details;
}
for (const f of files(path.join(cap, 'native')).filter(f => f.endsWith('.trx'))) facts.reports.push({ file: posix(path.relative(cap, f)), parsed: trx(f) });
facts.supplemental = commands.filter(c => /^041-/.test(c.receipt.id)).map(c => ({ commandId: c.receipt.id, exitCode: c.receipt.exitCode, parsed: JSON.parse(c.stdout.utf8.trim()) }));
facts.nativePassed = facts.reports.reduce((n, r) => n + r.parsed.results.filter(x => x.outcome === 'Passed').length, 0);
facts.nativeFailed = facts.reports.reduce((n, r) => n + r.parsed.results.filter(x => x.outcome !== 'Passed').length, 0);
facts.supplementalPassed = facts.supplemental.reduce((n, r) => n + r.parsed.results.filter(x => x.passed).length, 0);
if (facts.commonSuccessfulCompilations !== 1) throw Error('Common verifier was not compiled successfully exactly once');
if (facts.nativePassed !== 58 || facts.nativeFailed !== 0 || facts.supplementalPassed !== 14 || hookErrors.length) throw Error('Expected native assertions or identity capture incomplete');
json(path.join(cap, 'facts.json'), facts);
json(path.join(cap, 'inventories.json'), inventories);
json(path.join(cap, 'resolved-inventory-details.json'), inventoryDetails);
const allDiffs = differences(inventories.original37, inventories.default);
json(path.join(cap, 'all-differences.json'), allDiffs);
json(path.join(cap, 'inventory-boundaries.json'), {
  scopes: Object.keys(inventories.original37),
  keyNormalization: 'Only role repository root, shared .dotnet root and common NuGet root tokenized; original paths and every item metadata retained. No fixture/shared/bootstrap filename exemptions.',
  savedReceiptsOnly: 'Omitted files are not freshly rehashed by the portable auditor. It verifies saved complete declared-scope enumeration/differences, not all compiler inputs.',
  counts: Object.fromEntries(Object.entries(inventories).map(([role, scopes]) => [role, Object.fromEntries(Object.entries(scopes).map(([k, v]) => [k, Object.keys(v).length]))])),
  differenceCount: allDiffs.length
});
console.log(JSON.stringify({ nativePassed: facts.nativePassed, supplementalPassed: facts.supplementalPassed, differences: allDiffs.length, filesBeforeHandoffAndSeal: files(cap).length }));
