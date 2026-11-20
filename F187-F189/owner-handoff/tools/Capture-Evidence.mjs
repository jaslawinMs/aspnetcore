import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb } from './evidence.mjs';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const normalize = value => value.replaceAll('\\', '/').toLowerCase();
const retained = [], pairs = [], actualLoads = [], nativeObservations = [];
const roleSources = {};
for (const filename of ['source-records.json', 'source-records-supplement.json', 'source-records-producer.json']) {
  for (const role of readJson(path.join(root, 'research', filename)).roles) (roleSources[role.role] ??= []).push(...role.selected);
}
const save = (origin, relative, kind, role, graph, expected) => {
  const bytes = fs.readFileSync(origin), filename = path.join(root, relative);
  if (expected) requireThat(sha256(bytes) === expected.toLowerCase(), `Observed selected input changed: ${origin}`);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (fs.existsSync(filename)) requireThat(fs.readFileSync(filename).equals(bytes), 'Refusing selected-input overwrite');
  else fs.writeFileSync(filename, bytes);
  const record = { origin, path: relative.replaceAll('\\', '/'), kind, role, graph, bytes: bytes.length, sha256: sha256(bytes) };
  if (/\.(dll|exe)$/i.test(origin)) record.pe = parsePe(bytes);
  retained.push(record);
  return record;
};
const pair = (origin, relative, role, graph, sources) => {
  const pe = save(origin, relative, 'selected-managed-owner-or-test', role, graph);
  const pdbOrigin = origin.replace(/\.dll$/i, '.pdb');
  const result = { role, graph, name: path.basename(origin), pe, pdb: null, documentCount: null, selectedDocuments: [], sourceCoverage: 'Only explicitly matched retained raw source documents are checksum-verified; no all-document/raw-source closure claim.' };
  if (fs.existsSync(pdbOrigin)) {
    const pdbRecord = save(pdbOrigin, relative.replace(/\.dll$/i, '.pdb'), 'selected-portable-pdb', role, graph);
    const parsed = parsePdb(fs.readFileSync(path.join(root, pdbRecord.path)));
    requireThat(pe.pe.codeView.some(view => view.guid === parsed.guid && view.stamp === parsed.stamp && view.age === 1), `PE/portable PDB association: ${origin}`);
    result.pdb = { ...pdbRecord, parsed };
    result.documentCount = parsed.documentCount;
    for (const source of sources) {
      const documents = parsed.documents.filter(document => normalize(document.name).endsWith('/' + normalize(source.repositoryPath)));
      requireThat(documents.length <= 1, 'Selected PDB document identity is ambiguous');
      if (!documents.length) continue;
      const document = documents[0], bytes = fs.readFileSync(path.join(root, source.checkout.path));
      const algorithm = ({ '8829d00f-11b8-4213-878b-770e8597ac16': 'sha256', 'ff1816ec-aa5e-4d10-87f7-6f4963833460': 'sha1' })[document.algorithm];
      requireThat(!!algorithm, 'Unsupported selected PDB source checksum algorithm');
      const checksum = crypto.createHash(algorithm).update(bytes).digest('hex');
      requireThat(checksum === document.checksum, `Actual raw source/PDB checksum: ${role}/${graph}/${source.repositoryPath}`);
      result.selectedDocuments.push({ document, source: source.checkout, repositoryPath: source.repositoryPath, algorithm, actualRawChecksum: checksum, rawBytesOnly: true });
    }
  }
  pairs.push(result);
  return result;
};
const nativeNames = [
  'Microsoft.AspNetCore.Mvc.Views.TestCommon', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test',
  'Microsoft.AspNetCore.Mvc.FunctionalTests', 'ControllersFromServicesClassLibrary', 'ControllersFromServicesWebSite',
  'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation', 'Microsoft.AspNetCore.Mvc.Core',
  'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.ViewFeatures', 'Microsoft.AspNetCore.Mvc.Testing',
  'Microsoft.AspNetCore.TestHost', 'Microsoft.AspNetCore.Mvc.Core.TestCommon'
];
const nativeTestNames = {
  runtimecompilation: 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test',
  functional: 'Microsoft.AspNetCore.Mvc.FunctionalTests'
};
for (const role of [
  { role: 'original', checkout: 'C:\\src\\ap-F187-o038' },
  { role: 'default', checkout: 'C:\\src\\ap-F187-d038' }
]) {
  for (const [graph, test] of Object.entries(nativeTestNames)) {
    const directory = path.join(role.checkout, 'artifacts', 'bin', test, 'Release', 'net12.0');
    for (const name of nativeNames) {
      const origin = path.join(directory, name + '.dll');
      if (fs.existsSync(origin)) pair(origin, `selected/${role.role}/native-${graph}/${name}.dll`, role.role, `native-${graph}`, roleSources[role.role]);
    }
    for (const extension of ['deps.json', 'runtimeconfig.json']) save(path.join(directory, test + '.' + extension), `selected/${role.role}/native-${graph}/${test}.${extension}`, 'actual-native-config', role.role, `native-${graph}`);
    const label = graph === 'functional' ? `${role.role}-functional-pinned-prerequisite` : `${role.role}-runtimecompilation-compiler-only`;
    const modules = readJson(path.join(root, `commands/raw/${label}.modules.json`));
    const observed = [];
    for (const name of [test + '.dll', 'Microsoft.AspNetCore.Mvc.Views.TestCommon.dll', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll', 'ControllersFromServicesClassLibrary.dll', 'ControllersFromServicesWebSite.dll', 'Microsoft.AspNetCore.Mvc.Core.dll', 'System.Private.CoreLib.dll', 'coreclr.dll', 'hostfxr.dll']) {
      const files = modules.files.filter(file => path.basename(file.path).toLowerCase() === name.toLowerCase());
      const matches = files.map(file => {
        const selected = retained.filter(item => item.role === role.role && item.graph === `native-${graph}` && item.sha256 === file.sha256.toLowerCase() && normalize(item.origin) === normalize(file.path));
        return { actualObservedFile: file, selectedPeMatches: selected.filter(item => item.pe).map(item => ({ path: item.path, mvid: item.pe.mvid, sha256: item.sha256 })) };
      });
      observed.push({ name, actuallyObserved: files.length > 0, observations: matches, boundary: files.length ? 'Actual native testhost Process.Modules path/hash observation; MVID only supplied when an exact retained PE matches that native path/hash.' : 'Not observed in bounded native snapshots. Static files or supplemental reflection are not substituted.' });
    }
    nativeObservations.push({ role: role.role, graph, label, snapshots: modules.observations.map(snapshot => ({ processId: snapshot.processId, creationUtc: snapshot.creationUtc, observedUtc: snapshot.observedUtc })), observed });
  }
  const report = readJson(path.join(root, `reports/${role.role}-common-002.json`));
  for (const assembly of report.identity.assemblies) {
    let matching = retained.filter(item => item.role === role.role && item.sha256 === assembly.sha256.toLowerCase() && item.pe?.mvid?.toLowerCase() === assembly.mvid.toLowerCase());
    if (!matching.length && assembly.name !== 'AutoPerf.Mvc.HelperPreparation') {
      const record = save(assembly.path, `selected/${role.role}/actual-common-loads/${path.basename(assembly.path)}`, 'actual-supplemental-managed-load', role.role, 'common-accepted', assembly.sha256);
      matching = [record];
    }
    if (assembly.name !== 'AutoPerf.Mvc.HelperPreparation') requireThat(matching.some(item => item.pe.mvid.toLowerCase() === assembly.mvid.toLowerCase()), 'Actual selected supplemental MVID does not match retained PE');
    actualLoads.push({ role: role.role, mechanism: 'Supplemental in-process reflection only; not a native-testhost substitute', ...assembly, retainedPePaths: matching.map(item => item.path) });
  }
  for (const name of ['coreclr.dll', 'hostpolicy.dll', 'hostfxr.dll', 'dotnet.exe', 'System.Runtime.dll', 'Microsoft.Extensions.DependencyInjection.dll', 'Microsoft.Extensions.DependencyInjection.Abstractions.dll', 'Microsoft.Extensions.FileProviders.Abstractions.dll']) {
    const observations = report.identity.modules.filter(module => path.basename(module.path).toLowerCase() === name.toLowerCase());
    for (const module of observations) save(module.path, `selected/${role.role}/runtime/${name}`, 'actual-supplemental-process-module-input', role.role, 'normal-runtime', module.sha256);
  }
  const image = readJson(path.join(root, 'research', 'consumer-images.json')).images.find(image => image.role === role.role);
  save(image.mergedDeps.path, `selected/${role.role}/common-config/consumerGraph.deps.json`, 'actual-common-dependency-config', role.role, 'common-accepted', image.mergedDeps.sha256);
  save(image.runtimeConfig, `selected/${role.role}/common-config/${path.basename(image.runtimeConfig)}`, 'actual-common-runtimeconfig-override', role.role, 'common-accepted');
}
for (const [cohort, directory, source] of [
  ['common-001', path.join(root, 'preparation-history', 'common-cohort-001', 'bin'), 'preparation-history/common-cohort-001/Program.cs'],
  ['common-002', path.join(root, 'testassets', 'PreparationConsumer', 'bin'), 'testassets/PreparationConsumer/Program.cs']
]) {
  const sources = [{ repositoryPath: 'testassets/PreparationConsumer/Program.cs', checkout: { path: source, bytes: fs.statSync(path.join(root, source)).size, sha256: sha256(fs.readFileSync(path.join(root, source))) } }];
  const result = pair(path.join(directory, 'AutoPerf.Mvc.HelperPreparation.dll'), `selected/common/${cohort}/AutoPerf.Mvc.HelperPreparation.dll`, 'common', cohort, sources);
  requireThat(result.selectedDocuments.length === 1 && result.documentCount === 1, 'Real common portable PDB must match its exact cohort raw source');
  for (const load of actualLoads.filter(load => load.name === 'AutoPerf.Mvc.HelperPreparation' && cohort === 'common-002')) {
    requireThat(load.sha256.toLowerCase() === result.pe.sha256 && load.mvid.toLowerCase() === result.pe.pe.mvid, 'Actual common load MVID/hash does not match accepted retained cohort');
    load.retainedPePaths.push(result.pe.path);
  }
}
for (const role of ['original', 'default']) {
  requireThat(pairs.some(pair => pair.role === role && pair.name === 'Microsoft.AspNetCore.Mvc.Views.TestCommon.dll' && pair.selectedDocuments.some(document => document.repositoryPath.endsWith('/TestFileProvider.cs'))), 'Actual target provider PE/PDB/raw source not associated');
  requireThat(pairs.some(pair => pair.role === role && pair.name === 'ControllersFromServicesClassLibrary.dll' && pair.selectedDocuments.some(document => document.repositoryPath.endsWith('/NestedControllerOwner.cs'))), 'Actual nested-controller target PE/PDB/raw source not associated');
}
for (const native of nativeObservations) {
  for (const selected of native.observed) {
    for (const observation of selected.observations) {
      observation.selectedPeMatches = retained.filter(item => item.role === native.role && item.pe &&
        normalize(item.origin) === normalize(observation.actualObservedFile.path) &&
        item.sha256 === observation.actualObservedFile.sha256.toLowerCase())
        .map(item => ({ path: item.path, mvid: item.pe.mvid, sha256: item.sha256 }));
      observation.mvidBoundary = 'MVID parsed from exact path/hash-bound retained PE, not from native in-memory reflection. Only an actually observed native file is correlated; missing native load observations remain missing.';
    }
  }
}
const summary = {
  status: 'PENDING', retained, pairs, actualLoads, nativeObservations,
  counts: {
    retainedFiles: retained.length,
    uniqueRetainedPaths: new Set(retained.map(record => record.path)).size,
    peRecords: retained.filter(record => record.pe).length,
    managedMvidRecords: retained.filter(record => record.pe?.mvid).length,
    portablePdbPairs: pairs.filter(pair => pair.pdb).length,
    selectedRawDocumentChecks: pairs.reduce((sum, pair) => sum + pair.selectedDocuments.length, 0),
    totalPdbDocumentMetadataRows: pairs.reduce((sum, pair) => sum + (pair.documentCount ?? 0), 0)
  },
  boundary: 'Fresh parsing of retained real PE/portable PDB associations and only explicitly selected raw source checksums. Counts can include the same source document in distinct native source-built image cohorts. Native and supplemental mechanisms remain separate. Selected tools/dependencies/runtime files are not the complete compiler, SDK, runtime or OS closure.'
};
fs.writeFileSync(path.join(root, 'research', 'metadata-records.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', counts: summary.counts, actualSupplementalManagedLoads: actualLoads.length }));
