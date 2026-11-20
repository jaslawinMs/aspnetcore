'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pe } = require('./Metadata.cjs');
const { inspectPe } = require('./PeExtras.cjs');
const { describe, union, sha } = require('./Inventories.cjs');
const root = __dirname, policy = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'policy.json')));
assert(!policy.actualWorkerBuildHoldActive && policy.workersMayBuildOrTest);
function read(name) { return JSON.parse(fs.readFileSync(path.join(root, name))); }
function write(name, bytes) {
  const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) assert(fs.readFileSync(file).equals(Buffer.from(bytes)));
  else fs.writeFileSync(file, bytes);
}
const processes = [], moduleRuns = [], supplemental = [], runtimeInputs = {}, runnerInputs = {}, selectedModules = [];
for (const role of ['original', 'default']) {
  runtimeInputs[role] = {};
  for (const kind of ['core', 'razor']) {
    const label = `${role}-${kind}-hooked`, receipt = read(`evidence/${label}.receipt.json`);
    const directory = `evidence/${label}-identities`, files = fs.readdirSync(path.join(root, directory)).sort();
    const records = files.filter(name => name.endsWith('.json')).map(name => ({ selected: `${directory}/${name}`, value: read(`${directory}/${name}`) }));
    const hosts = receipt.observedProcesses.filter(process => process.name === 'testhost.exe');
    assert.equal(hosts.length, 1);
    const host = hosts[0], matches = records.filter(record => record.value.processId === host.processId && record.value.processCreationUtc === host.creationUtc);
    const initialize = matches.filter(record => record.value.phase === 'startup-hook-initialize');
    assert.equal(initialize.length, 1);
    const exit = matches.filter(record => record.value.phase === 'startup-hook-process-exit');
    const owners = matches.filter(record => record.value.phase === 'startup-hook-actual-owner-assembly-load');
    const names = owners.map(record => record.value.assembly.name);
    for (const expected of kind === 'core' ? ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Core.Test'] :
      ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.Razor.Test'])
      assert(names.includes(expected));
    processes.push({ role, kind, classification: 'actual-native-assertion-testhost', processId: host.processId, creationUtc: host.creationUtc,
      receipt: `evidence/${label}.receipt.json`, initialize: initialize[0].selected, exit: exit[0]?.selected ?? null,
      completeProcessExitSnapshotAvailable: exit.length === 1,
      ownerEvents: owners.map(record => record.selected),
      allIdentityFiles: files.map(name => ({ selected: `${directory}/${name}`, bytes: fs.statSync(path.join(root, directory, name)).size })),
      boundary: exit.length ? 'Actual native testhost managed exit snapshot plus initialize/targeted owner events and bounded Process.Modules data.' :
        'Actual native testhost atomic initialize and targeted owner assembly-load events persist, but no testhost ProcessExit snapshot was emitted. SDK exit snapshots are not substituted. No complete native managed-assembly identity closure is claimed.' });
    const currentRuntime = { snapshot: initialize[0].selected, value: initialize[0].value };
    if (!runtimeInputs[role].assertion) runtimeInputs[role].assertion = currentRuntime;
    else assert.equal(runtimeInputs[role].assertion.value.coreLib.sha256, currentRuntime.value.coreLib.sha256);
    const sdk = records.find(record => record.value.phase === 'startup-hook-initialize' && record.value.processId === receipt.nativePid &&
      record.value.processCreationUtc === receipt.nativeCreationUtc);
    assert(sdk);
    if (!runtimeInputs[role].sdk) runtimeInputs[role].sdk = { snapshot: sdk.selected, value: sdk.value };
    else assert.equal(runtimeInputs[role].sdk.value.coreLib.sha256, sdk.value.coreLib.sha256);
    for (const record of records.filter(record => record.value.phase === 'startup-hook-initialize' &&
      !(record.value.processId === host.processId && record.value.processCreationUtc === host.creationUtc))) {
      const owner = receipt.observedProcesses.find(process => process.processId === record.value.processId && process.creationUtc === record.value.processCreationUtc);
      assert(owner, 'Hook identity has recorded process ownership');
      processes.push({ role, kind, classification: 'sdk-or-vstest-runner-not-assertion-testhost', processId: owner.processId, creationUtc: owner.creationUtc,
        receipt: `evidence/${label}.receipt.json`, initialize: record.selected,
        exit: records.find(candidate => candidate.value.phase === 'startup-hook-process-exit' && candidate.value.processId === owner.processId &&
          candidate.value.processCreationUtc === owner.creationUtc)?.selected ?? null, boundary: 'SDK/VSTest runtime identity, not assertion-process evidence.' });
    }
    for (const mode of ['modules', 'hooked']) {
      const moduleLabel = `${role}-${kind}-${mode}`, data = read(`evidence/${moduleLabel}.modules.json`), command = read(`evidence/${moduleLabel}.receipt.json`);
      assert(data.completed);
      assert(data.observations.length > 0);
      const observedHost = command.observedProcesses.filter(process => process.name === 'testhost.exe');
      assert.equal(observedHost.length, 1);
      assert(data.observations.every(observation => observation.processId === observedHost[0].processId && observation.creationUtc === observedHost[0].creationUtc));
      const names = data.files.map(file => path.basename(file.path).toLowerCase());
      assert(names.includes('coreclr.dll') && names.includes('system.private.corelib.dll'));
      assert(data.files.some(file => file.path.toLowerCase() === initialize[0].value.coreLib.location.toLowerCase() &&
        file.sha256 === initialize[0].value.coreLib.sha256));
      moduleRuns.push({ role, kind, mode, selected: `evidence/${moduleLabel}.modules.json`, receipt: `evidence/${moduleLabel}.receipt.json`,
        observations: data.observations.length, fileCount: data.files.length, transientErrors: data.transientErrors.length,
        boundary: data.boundary });
      if (mode === 'hooked' && kind === 'core') runnerInputs[role] = data.files.filter(file => ['testhost.exe', 'testhost.dll'].includes(path.basename(file.path).toLowerCase()));
    }
  }
  const label = role === 'original' ? 'original-producer-02' : 'default-producer-01';
  const result = read(`evidence/${label}.result.json`), snapshot = read(`evidence/${label}.identity.json`), receipt = read(`evidence/${label}.receipt.json`);
  assert.equal(result.exitCode, 0); assert.equal(result.failure, null); assert.equal(result.rows.length, 9);
  assert(result.rows.every(row => row.outcome === 'Passed' && row.checks.length > 0 && row.checks.every(check => check.passed === true)));
  assert.equal(snapshot.processId, receipt.nativePid); assert.equal(snapshot.processCreationUtc, receipt.nativeCreationUtc);
  assert.equal(snapshot.coreLib.sha256, runtimeInputs[role].assertion.value.coreLib.sha256);
  supplemental.push({ role, label, result: `evidence/${label}.result.json`, identity: `evidence/${label}.identity.json`, receipt: `evidence/${label}.receipt.json`,
    processId: snapshot.processId, creationUtc: snapshot.processCreationUtc, rows: result.rows.map(row => ({ finding: row.finding, name: row.name, checks: row.checks.length, outcome: row.outcome })),
    totalChecks: result.rows.reduce((total, row) => total + row.checks.length, 0), boundary: result.boundary });
}
const images = { assertion: {}, sdk: {} }, unions = {}, differences = {};
for (const role of ['original', 'default']) for (const kind of ['assertion', 'sdk']) {
  const { snapshot, value } = runtimeInputs[role][kind], directory = path.dirname(value.coreLib.location);
  images[kind][role] = describe(directory, { role, classification: kind, snapshot, version: path.basename(directory) });
  const modules = [{ name: path.basename(value.coreLib.location), path: value.coreLib.location, sha256: value.coreLib.sha256, bytes: value.coreLib.bytes }, ...value.nativeModules];
  for (const module of modules) {
    const bytes = fs.readFileSync(module.path);
    assert.equal(sha(bytes), module.sha256);
    const selected = `selected/runtime/${kind}/${role}/${module.name}`, extra = inspectPe(bytes);
    write(selected, bytes);
    if (module.fileVersion) assert.equal(extra.version.fileVersion, module.fileVersion);
    if (module.productVersion) assert.equal(extra.version.productVersion, module.productVersion);
    selectedModules.push({ role, classification: kind, snapshot, name: module.name, source: module.path, selected,
      sha256: sha(bytes), bytes: bytes.length, managed: extra.managed, version: extra.version, mvid: extra.managed ? pe(bytes).mvid : null });
  }
}
for (const [kind, roles] of Object.entries(images)) {
  unions[kind] = union(roles.original.files, roles.default.files);
  differences[kind] = unions[kind].filter(file => file.relation !== 'same');
}
for (const role of ['original', 'default']) for (const module of runnerInputs[role]) {
  const bytes = fs.readFileSync(module.path), name = path.basename(module.path), selected = `selected/runner/${role}/${name}`, extra = inspectPe(bytes);
  assert.equal(sha(bytes), module.sha256); write(selected, bytes);
  selectedModules.push({ role, classification: 'native-test-runner', name, source: module.path, selected,
    sha256: sha(bytes), bytes: bytes.length, managed: extra.managed, mvid: extra.managed ? pe(bytes).mvid : null, version: extra.version });
}
write('runtime-images.json', JSON.stringify({
  boundary: 'All files recursively in each actual assertion and SDK CoreLib runtime directory, with full unions/differences and no filename/prefix exclusion. These complete hash inventories are not copied runtime distributions or a portable execution closure. Only named observed CoreLib/CoreCLR/hostpolicy/hostfxr and native runner bytes are selected; unselected runtime, SDK, OS and distribution bytes are not independently replay-attested.',
  images, unions, differences, selectedModules
}, null, 2) + '\n');
write('identity-index.json', JSON.stringify({ processes, moduleRuns, supplemental,
  boundary: 'Actual native assertion testhost, actual SDK/VSTest runner, and actual supplemental producer identities remain separate. Native testhost ProcessExit snapshots are absent; targeted real owner events and bounded all-exposed-module samples are retained instead. No SDK exit snapshot stands in for native managed identity closure.' }, null, 2) + '\n');
console.log(JSON.stringify({ nativeAssertionProcesses: processes.filter(process => process.classification === 'actual-native-assertion-testhost').length,
  missingNativeExitSnapshots: processes.filter(process => process.classification === 'actual-native-assertion-testhost' && !process.exit).length,
  supplemental: supplemental.map(run => ({ role: run.role, rows: run.rows.length, checks: run.totalChecks })),
  runtimeFiles: Object.fromEntries(Object.entries(images).map(([kind, roles]) => [kind, Object.fromEntries(Object.entries(roles).map(([role, image]) => [role, image.count]))])),
  selectedModuleFiles: selectedModules.length }));
