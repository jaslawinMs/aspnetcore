const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const args = process.argv.slice(2);
const left = path.resolve(args[0] || path.join(root, 'out', 'original', 'bin'));
const right = path.resolve(args[1] || path.join(root, 'out', 'default', 'bin'));
const output = path.resolve(args[2] || path.join(root, 'evidence', 'image-pair-audit.json'));
if (!output.startsWith(root + path.sep)) throw Error('Audit output must remain in this finding artifact root.');
const allowlist = new Set(['Microsoft.AspNetCore.TestHost.dll', 'Microsoft.AspNetCore.TestHost.pdb']);
const requiredCommon = [
  'AutoPerf.F134.Characterization.dll',
  'AutoPerf.F134.Characterization.pdb',
  'AutoPerf.F134.Characterization.deps.json',
  'AutoPerf.F134.Characterization.runtimeconfig.json'
];
function inventory(folder, prefix = '') {
  const result = {};
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    const full = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Image cannot contain symbolic links: ${full}`);
    if (entry.isDirectory()) Object.assign(result, inventory(full, relative));
    else result[relative] = {
      sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
      bytes: fs.statSync(full).size
    };
  }
  return result;
}
const files = { left: inventory(left), right: inventory(right) };
const differences = [];
for (const name of [...new Set([...Object.keys(files.left), ...Object.keys(files.right)])].sort()) {
  const a = files.left[name], b = files.right[name];
  if (!a || !b || a.sha256 !== b.sha256) differences.push({ name, left: a || null, right: b || null, ownerOnlyAllowlisted: allowlist.has(name) && !!a && !!b });
}
const commonFailures = requiredCommon.filter(name => !files.left[name] || !files.right[name] || files.left[name].sha256 !== files.right[name].sha256);
const ownerFilesMissing = [...allowlist].filter(name => !files.left[name] || !files.right[name]);
const nonOwnerDifferences = differences.filter(file => !file.ownerOnlyAllowlisted);
const eligible = commonFailures.length === 0 && ownerFilesMissing.length === 0 && nonOwnerDifferences.length === 0;
const report = {
  findingId: 'F134',
  left,
  right,
  wholeImageHashedWithoutPrefixExclusions: true,
  ownerDifferenceAllowlist: [...allowlist],
  requiredCommon,
  commonFailures,
  ownerFilesMissing,
  commonFilesByteIdentical: commonFailures.length === 0,
  eligibleForFutureOwnerOnlyPerformancePair: eligible,
  nonOwnerDifferenceCount: nonOwnerDifferences.length,
  differences,
  files,
  boundary: 'Original/default are different full source/dependency graphs, not an authorized candidate experiment. Unallowlisted differences fail the future owner-only identity gate even when untimed producer assertions agree. No gain, primary or budget is adopted.'
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ commonFilesByteIdentical: report.commonFilesByteIdentical, filesEach: [Object.keys(files.left).length, Object.keys(files.right).length], nonOwnerDifferences: nonOwnerDifferences.length, futureOwnerOnlyGate: eligible ? 'PASS' : 'FAIL' }));
process.exitCode = eligible ? 0 : 3;
