'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const graphs = read('graph-creation.json'), selected = read('selected-records.json');
const native = read('native-reconciliation.json'), terminal = read('TERMINAL.json');
const receipts = fs.readdirSync(path.join(root, 'evidence')).filter(name => name.endsWith('.receipt.json'))
  .map(name => ({ file: `evidence/${name}`, ...read(`evidence/${name}`) })).filter(record => Number.isInteger(record.nativePid))
  .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const results = {
  state: 'BOUNDED_UNTIMED_PREPARATION',
  findings: ['F173', 'F174', 'F175'].map(id => ({ id, status: 'pending', implemented: false, timed: false, outcomeDecision: null })),
  source: { original: graphs.originalCommit, defaultAtEntry: graphs.defaultCommit, closingObservation: 'closing.json', ownership: 'OWNERSHIP.json' },
  nativeBoundary: 'Actual existing nonshipping net12.0 VSTest project, unchanged native source-built dependencies. Native here does not mean NativeAOT.',
  native: native.reports.map(report => ({
    role: report.role, invocation: report.invocation, rawReport: report.report, discoveredExecuted: report.rows.length,
    passed: Number(report.counters.passed), failed: Number(report.counters.failed), notExecuted: Number(report.counters.notExecuted),
    rows: report.rows.map(row => ({ name: row.name, parameters: row.parameters, findings: row.findings, outcome: row.outcome }))
  })),
  nativeUniqueNames: new Set(native.reports.flatMap(report => report.rows.map(row => row.name))).size,
  nativeRowExecutions: native.reports.reduce((sum, report) => sum + report.rows.length, 0),
  supplemental: ['original', 'default'].map(role => {
    const result = read(`evidence/${role}-supplemental-v1.json`);
    return {
      role, boundary: result.boundary, sourceGraph: 'Whole role normal dependency/runtime graph; not target-only',
      rows: result.rows.map(row => ({ name: row.name, finding: row.finding, ownerType: row.ownerType, outcome: row.outcome, assertions: row.checks.length })),
      assertions: result.rows.reduce((sum, row) => sum + row.checks.length, 0),
      owner: result.owner, managerProducer: result.managerProducer, coreLib: result.coreLib, consumer: result.consumer
    };
  }),
  compilation: {
    acceptedCSharpCompilations: receipts.filter(record => record.label === 'common-consumer-v1-compile').length,
    failedCSharpCompilations: 0,
    failedPreCompilationInputPreparations: 1,
    failedPreparation: 'consumer/preparation-failure-v0/failure.json',
    failureStreamBoundary: 'Initial Node preparation failure was observed in the tool response; original OS stdout/stderr were not separately redirected. Preserved original script/partial inputs and diagnostic summary, not a fabricated original stream.',
    language: 'C#13',
    explicitReferences: 179,
    explicitFrameworkReferences: 176,
    normalOriginalReferences: 3,
    inputs: 'consumer/inputs.json',
    acceptedFourFileCopies: 'consumer/copies.json'
  },
  actualIdentityBoundaries: {
    normalNative: 'Sampled actual owned testhost CoreCLR/CoreLib/testhost.exe/testhost.dll and host modules; exact module paths, hashes and versions. Managed owner/manager were not present in the early native module snapshot.',
    nativeOwnerFileProvenance: 'Exact command/TRX codeBase/full normal inventory and selected PE/PDB bytes, not a claim of native in-process observed managed owner MVID.',
    supplemental: 'Actual in-process common consumer, role owner, role public manager producer and CoreLib identities, plus four-name-bounded native module observations.',
    sdkStartupHook: 'SDK/VSTest runtime57 only; no native testhost receipt obtained. Kept distinct from the subsequent unhooked native replay at runtime62/runtime69.',
    runtimeHostDistinction: 'Both native hosts loaded hostfxr65; actual CoreCLR/CoreLib are Original62 and Default69. Host/SDK identity is not substituted for assertion-runtime identity.'
  },
  selectedAttestation: {
    files: selected.files.length, managedImages: selected.images.length, completePortablePdbPairs: selected.pairs.length,
    allRawDocumentsOfSelectedPdbs: selected.documents.length,
    gitSourceProofs: read('git-source-proofs.json').proofs.length,
    gitCommitTreeObjects: read('git-source-proofs.json').objects.length,
    boundaries: selected.boundary,
    peOnlyPdbsNotSelected: 'Other selected PE-only dependencies/compiler references/CoreLib/native modules have no selected PDBs; no source-document claim for their unselected PDBs.',
    fullNativeInventories: 'native-images.json and native-images-final.json',
    fullRuntimeInventories: 'runtime-images.json',
    declaredNormalProjectsAndPackages: 'native-declarations.json'
  },
  commands: receipts.map(record => ({
    label: record.label, receipt: record.file, checkout: record.checkout, activation: record.activation,
    executable: record.executable, arguments: record.arguments, exitCode: record.exitCode,
    stdout: `evidence/${record.label}.stdout.txt`, stderr: `evidence/${record.label}.stderr.txt`
  })),
  terminal: {
    receipt: 'TERMINAL.json', dotnetInvocations: terminal.dotnetInvocationCount, successes: terminal.successes,
    prerequisiteFailures: terminal.prerequisiteFailures, allRecordedNativeInvocationsTerminal: terminal.allRecordedNativeInvocationsTerminal,
    bothStreamsDrained: terminal.bothStreamsDrained, observedDescendantsDrained: terminal.observedDescendantsDrained,
    exhaustiveHistoricalPidCensus: false, stillOwned: terminal.stillOwned.length
  },
  exclusions: read('supplemental-selection.json').unverified,
  portableAudit: 'node .\\Audit.cjs',
  seal: 'MANIFEST.json lists capsule files except itself and MANIFEST.sha256; the sidecar hashes the manifest without self-reference.'
};
assert.equal(results.nativeUniqueNames, 11);
assert.equal(results.nativeRowExecutions, 44);
assert(results.supplemental.every(role => role.rows.length === 6 && role.assertions === 156));
const destination = path.join(root, 'RESULTS.json');
assert(!fs.existsSync(destination), 'Do not silently overwrite a different summary');
fs.writeFileSync(destination, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ nativeReports: results.native.length, nativeRowExecutions: results.nativeRowExecutions, supplemental: results.supplemental.map(r => ({ role: r.role, rows: r.rows.length, assertions: r.assertions })), dotnetInvocations: receipts.length }));
