// Proposed file-identity gate only. No process launch, compilation, timing or performance verdict.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ownerFiles = new Set([
  'WebTransportInteractiveSampleApp.dll',
  'WebTransportInteractiveSampleApp.pdb',
]);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function inventory(root) {
  const result = {};
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Image links are not accepted: ${child}`);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) result[child] = hash(fs.readFileSync(path.join(root, child)));
      else throw new Error(`Non-regular image entry: ${child}`);
    }
  }
  visit('');
  return result;
}
function compare(left, right, common) {
  const problems = [], differences = [];
  for (const file of ownerFiles) {
    if (!(file in left) || !(file in right)) problems.push(`Missing required owner file: ${file}`);
  }
  for (const file of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    if (!(file in left) || !(file in right)) {
      problems.push(`Image file-set mismatch: ${file}`);
    } else if (left[file] !== right[file]) {
      differences.push(file);
      if (!ownerFiles.has(file)) problems.push(`Non-owner image difference: ${file}`);
    }
  }
  for (const [file, expected] of Object.entries(common)) {
    if (ownerFiles.has(file)) problems.push(`Owner cannot be a common image: ${file}`);
    if (left[file] !== expected || right[file] !== expected) {
      problems.push(`Common-once image not reused exactly: ${file}`);
    }
  }
  for (const file of ['F146.Common.dll', 'F146.Common.pdb', 'F146.Common.deps.json', 'F146.Common.runtimeconfig.json']) {
    if (!(file in common)) problems.push(`Missing required compile-once common input: ${file}`);
  }
  return { imageIdentityAccepted: problems.length === 0, differences, problems };
}
function selfCheck() {
  const common = {
    'F146.Common.dll': hash('single-build-dll'),
    'F146.Common.pdb': hash('single-build-pdb'),
    'F146.Common.deps.json': hash('single-build-deps'),
    'F146.Common.runtimeconfig.json': hash('single-build-runtimeconfig'),
  };
  const left = { ...common,
    'WebTransportInteractiveSampleApp.dll': hash('left-owner-dll'),
    'WebTransportInteractiveSampleApp.pdb': hash('left-owner-pdb'),
    'Dependency.dll': hash('unchanged-dependency'),
  };
  const right = { ...left,
    'WebTransportInteractiveSampleApp.dll': hash('right-owner-dll'),
    'WebTransportInteractiveSampleApp.pdb': hash('right-owner-pdb'),
  };
  const checks = [];
  function check(name, value, expected) {
    assert.equal(value.imageIdentityAccepted, expected, JSON.stringify(value));
    checks.push({ name, passed: true, expectedAccepted: expected });
  }
  check('OwnerDllAndPdbOnlyAccepted', compare(left, right, common), true);
  for (const file of Object.keys(common)) {
    check(`CommonImageDifferenceRejected:${file}`, compare(left, { ...right, [file]: hash('recompiled') }, common), false);
  }
  check('AdditionalFileRejected', compare(left, { ...right, 'unexpected.dll': hash('extra') }, common), false);
  check('NonOwnerDependencyDifferenceRejected',
    compare(left, { ...right, 'Dependency.dll': hash('changed-dependency') }, common), false);
  const missing = { ...right };
  delete missing['WebTransportInteractiveSampleApp.pdb'];
  check('MissingOwnerPdbRejected', compare(left, missing, common), false);
  const nested = { ...right, ['subdirectory\\WebTransportInteractiveSampleApp.dll']: hash('not-the-allowlisted-path') };
  check('NestedOwnerNameDoesNotWidenAllowlist', compare(left, nested, common), false);
  return { status: 'passed', boundary: 'In-memory file-hash fixtures only; no native .NET work', checks };
}

if (require.main === module) {
  if (process.argv[2] === '--self-check') {
    console.log(JSON.stringify(selfCheck(), null, 2));
  } else if (process.argv[2] === '--verify-only' && process.argv.length === 6) {
    const [leftRoot, rightRoot, commonRoot] = process.argv.slice(3);
    const result = compare(inventory(leftRoot), inventory(rightRoot), inventory(commonRoot));
    console.log(JSON.stringify({
      mode: 'verify-only', adoptedCampaignGate: false,
      sourceBuiltOwnerProvenanceIndependentlyRequired: true, ...result,
    }, null, 2));
    if (!result.imageIdentityAccepted) process.exitCode = 1;
  } else {
    console.error('Use --self-check or --verify-only <left-image> <right-image> <compile-once-common-image>. No execution mode exists.');
    process.exitCode = 2;
  }
}
module.exports = { hash, inventory, compare, selfCheck };
