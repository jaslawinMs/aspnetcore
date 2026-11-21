import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const owner = '640fc34c-7345-4501-b6b9-52b0379fb55a';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (name, value) => fs.writeFileSync(path.join(here, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const receipt = {
  operation: 'guard-and-prior-001',
  observedUtc: new Date().toISOString(),
  executable: process.execPath,
  argv: process.argv,
  cwd: process.cwd(),
  helperPidSelfObserved: process.pid,
  parentPidSelfObserved: process.ppid,
  helperSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  nativeProductExecution: false,
};
try {
  const policyPath = path.join(root, 'policy.json');
  const policyBytes = fs.readFileSync(policyPath);
  const p = JSON.parse(policyBytes);
  const leasePath = path.join(root, 'benchmark-exclusive.lease.json');
  const leaseExists = fs.existsSync(leasePath);
  const registrationPath = path.join(root, 'owner-registration-background-247.json');
  const registrationBytes = fs.readFileSync(registrationPath);
  const registration = JSON.parse(registrationBytes);
  receipt.guard = {
    observedUtc: new Date().toISOString(),
    policyPath,
    policySha256: sha(policyBytes),
    actualOwner: p.independentFindingPreparationWorkers?.F220,
    ownerCount: Object.keys(p.independentFindingPreparationWorkers ?? {}).length,
    scopeCount: Object.keys(p.activeWorkerPreparationScopes ?? {}).length,
    maximumRegisteredPreparationOwners: p.maximumRegisteredPreparationOwners,
    scope: p.activeWorkerPreparationScopes?.F220,
    leasePath,
    leaseExists,
    HOLD: p.actualWorkerBuildHoldActive,
    quiesced: p.buildAndTestWorkQuiesced,
    registrationPath,
    registrationSha256: sha(registrationBytes),
    registeredOwner: registration.actualRegisteredOwners?.F220,
  };
  fs.writeFileSync(path.join(here, 'policy-at-prior-001.json'), policyBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(here, 'registration-at-prior-001.json'), registrationBytes, { flag: 'wx' });
  if (receipt.guard.actualOwner !== owner || receipt.guard.registeredOwner !== owner ||
      receipt.guard.ownerCount > 4 || receipt.guard.scopeCount > 4 ||
      receipt.guard.maximumRegisteredPreparationOwners !== 4 ||
      leaseExists || receipt.guard.HOLD !== false || receipt.guard.quiesced !== false ||
      !receipt.guard.scope?.startsWith('243 only after GO243')) {
    throw new Error('Fresh F220 registration/lease/HOLD/quiescence/scope guard rejected.');
  }
  receipt.priorEntries = fs.readdirSync(root, { withFileTypes: true })
    .filter(x => /^(?:finding-)?F190(?:[-.]|$)/i.test(x.name))
    .map(x => ({
      name: x.name,
      directory: x.isDirectory(),
      files: x.isDirectory()
        ? fs.readdirSync(path.join(root, x.name), { withFileTypes: true })
          .map(f => ({ name: f.name, directory: f.isDirectory() }))
        : undefined,
    }));
  receipt.completedFileOperations = true;
  write('guard-and-prior-001.receipt.json', receipt);
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  receipt.failure = { name: error.name, message: error.message, stack: error.stack };
  write('guard-and-prior-001.failure.json', receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exitCode = 1;
}
