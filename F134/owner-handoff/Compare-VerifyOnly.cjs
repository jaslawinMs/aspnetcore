const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const acceptance = JSON.parse(fs.readFileSync(path.join(root, 'acceptance.json')));
const commands = JSON.parse(fs.readFileSync(path.join(root, 'logs', 'commands.json')));
const expected = acceptance.cases.map(c => c.id).sort();
const builds = commands.filter(command => command.id.endsWith('-build'));
if (builds.length !== 1 || !builds[0].id.endsWith('-common-build') || builds[0].exitCode !== 0) throw Error('Common harness must have exactly one successful compilation.');
const commonHashes = {};
for (const name of ['AutoPerf.F134.Characterization.dll', 'AutoPerf.F134.Characterization.pdb', 'AutoPerf.F134.Characterization.deps.json', 'AutoPerf.F134.Characterization.runtimeconfig.json']) {
  const hashes = ['original', 'default'].map(variant => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'out', variant, 'bin', name))).digest('hex'));
  if (hashes[0] !== hashes[1]) throw Error(`Common image file differs: ${name}`);
  commonHashes[name] = hashes[0];
}
const outputs = {};
for (const variant of ['original', 'default']) {
  const command = commands.find(c => c.id.endsWith(`-${variant}-verify`));
  if (!command || command.exitCode !== 0 || !command.terminal) throw Error(`Missing successful ${variant} command`);
  const lines = fs.readFileSync(command.stdout, 'utf8').trim().split(/\r?\n/).map(x => JSON.parse(x));
  const rows = lines.filter(x => x.kind === 'case');
  if (rows.length !== expected.length || rows.some(x => x.passed !== true)) throw Error(`Incomplete ${variant} cases`);
  if (JSON.stringify(rows.map(x => x.id).sort()) !== JSON.stringify(expected)) throw Error(`Wrong ${variant} fixed case IDs`);
  const complete = lines.filter(x => x.kind === 'verification-complete');
  if (complete.length !== 1 || complete[0].cases !== expected.length || complete[0].skipped !== 0 || complete[0].mode !== 'verify-only') throw Error(`Missing completion ${variant}`);
  const proof = lines.find(x => x.kind === 'runtime-proof');
  if (!proof || !proof.runtime.includes('12.0.0-alpha.1.26565.104')) throw Error(`Wrong actual runtime ${variant}`);
  const owners = lines.filter(x => x.kind === 'assembly-provenance');
  const owner = owners.find(x => x.name === 'Microsoft.AspNetCore.TestHost');
  if (!owner) throw Error(`Missing source-built actual owner ${variant}`);
  const sourceProof = lines.filter(x => x.kind === 'owner-source-proof');
  if (sourceProof.length !== 1 || !sourceProof[0].pePdbGuidAndStampMatch || !sourceProof[0].pdbSourceChecksumMatches || !sourceProof[0].pinnedGitSourceEqualIgnoringLineEndings) throw Error(`Missing actual loaded owner PE/PDB/source proof ${variant}`);
  const payload = JSON.parse(fs.readFileSync(path.join(root, 'inputs', variant, 'payload.json')));
  if (sourceProof[0].sourceRevision !== payload.sourceRevision || sourceProof[0].ownerPeSha256.toLowerCase() !== payload.ownerPeSha256.toLowerCase()) throw Error(`Actual owner source pin differs ${variant}`);
  outputs[variant] = { commandId: command.id, processId: proof.processId, runtime: proof.runtime, linqSha256: proof.linqSha256, owner, sourceProof: sourceProof[0], rows };
}
for (const id of expected) {
  const original = outputs.original.rows.find(x => x.id === id).observation;
  const current = outputs.default.rows.find(x => x.id === id).observation;
  if (JSON.stringify(original) !== JSON.stringify(current)) throw Error(`Observed behavior differs: ${id}`);
}
const refusal = commands.find(c => c.id.endsWith('-refuse-unapproved-mode'));
if (!refusal || refusal.exitCode !== 2) throw Error('Verify-only gate was not tested');
const result = {
  findingId: 'F134',
  mode: 'verify-only',
  originalAndDefaultObservedEqual: true,
  expectedCaseIds: expected,
  actualPassedEachVariant: expected.length,
  skippedEachVariant: 0,
  refusalExitCode: refusal.exitCode,
  commonHarnessCompiledExactlyOnce: true,
  commonFilesByteIdentical: commonHashes,
  outputs,
  performanceEvidence: 'NONE. No candidate, timing, allocation or material-gain comparison was run.',
  dispositionsAndGainSuggestionsNotAdoptedOrSealed: true
};
fs.writeFileSync(path.join(root, 'evidence', 'verify-only-comparison.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passedEachVariant: expected.length, skippedEachVariant: 0, observationsEqual: true, mode: 'verify-only' }));
