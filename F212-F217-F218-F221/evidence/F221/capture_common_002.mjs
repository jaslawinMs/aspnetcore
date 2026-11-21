import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const REPO = String.raw`C:\src\aspnetcore`;
export const ORIGINAL = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
export const OWNER = 'ac5fbaab-9a69-42c1-81ff-6fdc625139ba';
export const utc = () => new Date().toISOString();
export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
export const readJson = relative => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

export function writeBytes(relative, data) {
    const target = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data, { flag: 'wx' });
    return target;
}

export function writeJson(relative, data) {
    return writeBytes(relative, JSON.stringify(data, null, 2) + '\n');
}

export function run(label, argv, acceptable = [0]) {
    const destination = path.join('commands', label);
    const overrides = { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PROMPT_DISABLED: '1' };
    const receipt = {
        label, argv, cwd: REPO, startedUtc: utc(), owningHelperPid: process.pid,
        parentPid: process.ppid, environmentOverrides: overrides,
        waitMethod: 'child_process.spawnSync, shell=false; synchronous child exit and stdout/stderr pipe collection',
        timeoutSeconds: null, maxBufferBytes: 32 * 1024 * 1024,
    };
    const result = spawnSync(argv[0], argv.slice(1), {
        cwd: REPO, env: { ...process.env, ...overrides }, shell: false,
        encoding: null, maxBuffer: receipt.maxBufferBytes, windowsHide: true,
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    Object.assign(receipt, {
        exitedUtc: utc(), pid: result.pid, exitCode: result.status, signal: result.signal,
        error: result.error ? String(result.error) : null,
        processWaited: result.status !== null, stdoutDrained: !result.error,
        stderrDrained: !result.error, handlesClosedBySpawnSync: true,
        stdoutBytes: stdout.length, stderrBytes: stderr.length,
        stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr),
        exitAcceptable: !result.error && acceptable.includes(result.status),
    });
    writeBytes(path.join(destination, 'stdout.bin'), stdout);
    writeBytes(path.join(destination, 'stderr.bin'), stderr);
    writeJson(path.join(destination, 'receipt.json'), receipt);
    console.log(`${label}: exit=${result.status} stdout=${stdout.length} stderr=${stderr.length}`);
    if (!receipt.exitAcceptable) {
        throw new Error(`${label}: unexpected exit ${result.status}; full streams preserved`);
    }
    return stdout;
}

export function localBlob(role, commit, gitPath) {
    const label = gitPath.replaceAll('/', '__').replaceAll('.', '_');
    const blob = run(`${role}-blobid-${label}`, ['git', '--no-pager', 'rev-parse', `${commit}:${gitPath}`]).toString().trim();
    const raw = run(`${role}-blob-${label}`, ['git', '--no-pager', 'cat-file', 'blob', blob]);
    const actual = crypto.createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
    if (actual !== blob) throw new Error(`Git blob mismatch: ${gitPath}`);
    const artifact = path.join('source', role, gitPath);
    writeBytes(artifact, raw);
    return { role, commit, path: gitPath, blob, bytes: raw.length, sha256: sha256(raw), artifact };
}

export function remoteBlob(role, commit, gitPath) {
    const label = gitPath.replaceAll('/', '__').replaceAll('.', '_');
    const content = JSON.parse(run(`${role}-contents-${label}`, [
        'gh', 'api', '--method', 'GET', `repos/dotnet/aspnetcore/contents/${gitPath}`, '-f', `ref=${commit}`,
    ]).toString());
    const raw = Buffer.from(content.content, 'base64');
    const actual = crypto.createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
    if (actual !== content.sha || raw.length !== content.size) throw new Error(`GitHub blob mismatch: ${gitPath}`);
    const artifact = path.join('source', role, gitPath);
    writeBytes(artifact, raw);
    return { role, commit, path: gitPath, blob: content.sha, bytes: raw.length, sha256: sha256(raw), artifact };
}

export function helperStart(name) {
    writeJson(`${name}-start.json`, {
        helper: name, utc: utc(), pid: process.pid, parentPid: process.ppid,
        argv: process.argv, executable: process.execPath, cwd: process.cwd(),
        scope: 'Read-only git/gh source capture; writes only this private evidence root. No builds/tests or performance work.',
    });
}

export function helperEnd(name) {
    writeJson(`${name}-terminal.json`, {
        helper: name, utc: utc(), pid: process.pid, allSubprocessCallsSynchronous: true,
        allRecordedChildrenWaitedAndStreamsDrained: true, outstandingOwnedChildren: [],
        buildsTestsBenchmarksStarted: 0,
    });
}
