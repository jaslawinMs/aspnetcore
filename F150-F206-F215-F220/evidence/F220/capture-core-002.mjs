import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const campaign = path.dirname(here);
export const repo = 'C:\\src\\aspnetcore';
export const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
export const owner = '640fc34c-7345-4501-b6b9-52b0379fb55a';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
export const text = bytes => bytes.toString('utf8');
export function write(name, value) {
  const destination = path.join(here, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return destination;
}
export function guard(label) {
  const policyPath = path.join(campaign, 'policy.json');
  const policyBytes = fs.readFileSync(policyPath);
  const p = JSON.parse(policyBytes);
  const policySha256 = sha256(policyBytes);
  const snapshot = path.join('guards', `policy-${policySha256}.json`);
  if (!fs.existsSync(path.join(here, snapshot))) {
    write(snapshot, policyBytes);
  }
  const registrationPath = path.join(campaign, 'owner-registration-background-247.json');
  const registrationBytes = fs.readFileSync(registrationPath);
  const registration = JSON.parse(registrationBytes);
  const leasePath = path.join(campaign, 'benchmark-exclusive.lease.json');
  const receipt = {
    label,
    observedUtc: new Date().toISOString(),
    policyPath,
    policySha256,
    policySnapshot: snapshot,
    owner: p.independentFindingPreparationWorkers?.F220,
    ownerCount: Object.keys(p.independentFindingPreparationWorkers ?? {}).length,
    scopeCount: Object.keys(p.activeWorkerPreparationScopes ?? {}).length,
    maximumRegisteredPreparationOwners: p.maximumRegisteredPreparationOwners,
    scope: p.activeWorkerPreparationScopes?.F220,
    registrationPath,
    registrationSha256: sha256(registrationBytes),
    registrationOwner: registration.actualRegisteredOwners?.F220,
    leasePath,
    leaseExists: fs.existsSync(leasePath),
    HOLD: p.actualWorkerBuildHoldActive,
    quiesced: p.buildAndTestWorkQuiesced,
  };
  write(path.join('guards', `${label}.json`), receipt);
  if (receipt.owner !== owner || receipt.registrationOwner !== owner ||
      receipt.ownerCount > 4 || receipt.scopeCount > 4 ||
      receipt.maximumRegisteredPreparationOwners !== 4 ||
      receipt.leaseExists || receipt.HOLD !== false || receipt.quiesced !== false ||
      !receipt.scope?.startsWith('243 only after GO243')) {
    throw new Error(`Fresh registration/lease/HOLD/quiescence/scope guard rejected: ${label}`);
  }
  return receipt;
}
export function run(label, executable, args, allowedExitCodes = [0]) {
  if (!['git.exe', 'gh.exe'].includes(executable)) {
    throw new Error(`Only finite read-only Git/GitHub source commands permitted: ${executable}`);
  }
  const g = guard(label);
  const stem = path.join('commands', label);
  const request = {
    label,
    observedBeforeStartUtc: new Date().toISOString(),
    executable,
    argv: args,
    cwd: repo,
    shell: false,
    environmentOverrides: {
      GIT_OPTIONAL_LOCKS: '0',
      GIT_TERMINAL_PROMPT: '0',
      GCM_INTERACTIVE: 'Never',
      GH_PROMPT_DISABLED: '1',
      GH_PAGER: '',
    },
    guard: path.join('guards', `${label}.json`),
    policySha256: g.policySha256,
    helperPidSelfObserved: process.pid,
    allowedExitCodes,
    productNativeCommand: false,
  };
  write(`${stem}.request.json`, request);
  const child = spawnSync(executable, args, {
    cwd: repo,
    shell: false,
    env: { ...process.env, ...request.environmentOverrides },
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = child.stdout ?? Buffer.alloc(0);
  const stderr = child.stderr ?? Buffer.alloc(0);
  write(`${stem}.stdout.bin`, stdout);
  write(`${stem}.stderr.bin`, stderr);
  const receipt = {
    ...request,
    observedAfterSynchronousWaitUtc: new Date().toISOString(),
    childRootPidObservedBySpawnSync: child.pid ?? null,
    status: child.status,
    signal: child.signal,
    error: child.error ? { name: child.error.name, message: child.error.message, code: child.error.code, stack: child.error.stack } : null,
    stdoutBytes: stdout.length,
    stdoutSha256: sha256(stdout),
    stderrBytes: stderr.length,
    stderrSha256: sha256(stderr),
    synchronousRootAndBothStreamsReturned: true,
    universalDescendantCensusClaimed: false,
  };
  write(`${stem}.receipt.json`, receipt);
  console.log(JSON.stringify({ label, pid: receipt.childRootPidObservedBySpawnSync, status: child.status, stdoutBytes: stdout.length, stderrBytes: stderr.length }));
  if (child.error || child.signal || !allowedExitCodes.includes(child.status)) {
    throw new Error(`Read-only source command failed: ${label}; inspect preserved full streams/receipt.`);
  }
  return stdout;
}
export function git(label, args, allowedExitCodes = [0]) {
  return run(label, 'git.exe', ['--no-pager', ...args], allowedExitCodes);
}
export function gh(label, args) {
  return run(label, 'gh.exe', args);
}
export function copyBound(source, destination) {
  const bytes = fs.readFileSync(source);
  write(destination, bytes);
  return { source, destination, bytes: bytes.length, sha256: sha256(bytes) };
}
export function execute(entryPath, body) {
  const identity = {
    entryPath,
    entrySha256: sha256(fs.readFileSync(entryPath)),
    corePath: fileURLToPath(import.meta.url),
    coreSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    executable: process.execPath,
    argv: process.argv,
    cwd: process.cwd(),
    helperPidSelfObserved: process.pid,
    parentPidSelfObserved: process.ppid,
    observedStartUtc: new Date().toISOString(),
    productBuildTestRuntimeStarts: 0,
    comparisonCount: 0,
  };
  try {
    const result = body();
    write(`${path.basename(entryPath, '.mjs')}.result.json`, { ...identity, observedBodyReturnUtc: new Date().toISOString(), bodyReturned: true, result, ownProcessFutureExitNotAttested: true });
    console.log(JSON.stringify({ entry: path.basename(entryPath), bodyReturned: true, result }, null, 2));
  } catch (error) {
    write(`${path.basename(entryPath, '.mjs')}.failure.json`, { ...identity, observedFailureUtc: new Date().toISOString(), error: { name: error.name, message: error.message, stack: error.stack } });
    console.error(error.stack);
    process.exitCode = 1;
  }
}
