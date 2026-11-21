import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const repo = String.raw`C:\src\aspnetcore`;
const sha = data => createHash("sha256").update(data).digest("hex").toUpperCase();
const now = () => new Date().toISOString();
const parse = path => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };
let receiptCount = 0;
function write(path, data) {
  const absolute = join(root, path);
  ensure(isAbsolute(absolute), "Artifact output is not absolute");
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, data, { flag: "wx" });
}
const json = (path, data) => write(path, JSON.stringify(data, null, 2) + "\n");
function git(label, args) {
  const argv = ["git", "--no-optional-locks", "--no-pager", "-C", repo, ...args];
  const startedUtc = now();
  const result = spawnSync(argv[0], argv.slice(1), { cwd: repo, env, encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  const receipt = {
    label, argv, cwd: repo, startedUtc, completedUtc: now(), pid: result.pid,
    exitCode: result.status, spawnError: result.error?.message ?? null,
    stdout: `receipts-005\\${label}.stdout.bin`, stderr: `receipts-005\\${label}.stderr.bin`,
    stdoutBytes: stdout.length, stderrBytes: stderr.length, stdoutSha256: sha(stdout), stderrSha256: sha(stderr),
    environment: Object.fromEntries(["PATH", "PATHEXT", "SYSTEMROOT", "COMSPEC", "GIT_OPTIONAL_LOCKS", "GIT_PAGER", "PAGER"].map(key => [key, env[key] ?? null])),
    environmentScope: "Execution-relevant allowlist; authentication and unrelated ambient values excluded.",
    rootAwaited: true, redirectedStreamsReachedEof: !result.error,
    operationClass: "Read-only reserved-checkout restoration verification, not a product build/test/performance execution",
  };
  write(receipt.stdout, stdout);
  write(receipt.stderr, stderr);
  json(`receipts-005\\${label}.json`, receipt);
  receiptCount++;
  ensure(result.status === 0 && !result.error, `${label} failed; streams preserved`);
  return stdout;
}

try {
  json("execution-005.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid,
    scope: "Preserve and move exactly three positively identified F205-generated JSON receipts out of the reserved root, then verify baseline state. This repairs a disclosed artifact-writer mistake; it is not permission for any other checkout write.",
    nativeProductStarts: 0,
  });
  const baseline = parse(join(root, "reserved-before-002.json"));
  const names = ["terminal-observation-001.json", "launcher-seal-001.json", "seal-outer-failure-001.json"];
  const beforeStatus = git("reserved-status-before-owned-artifact-recovery", ["status", "--porcelain=v1", "--untracked-files=all", "-z"]);
  const beforeUntracked = beforeStatus.toString("utf8").split("\0").filter(x => x.startsWith("?? ")).map(x => x.slice(3));
  const expected = [...baseline.untracked.map(x => x.path), ...names].sort();
  ensure(JSON.stringify([...beforeUntracked].sort()) === JSON.stringify(expected), "Reserved pre-recovery untracked set is not exactly baseline plus the three owned receipts");
  const recovered = [];
  for (const name of names) {
    ensure(!baseline.untracked.some(x => x.path === name), `Refusing to move an original report: ${name}`);
    const source = join(repo, name);
    const destination = join(root, name);
    ensure(existsSync(source) && !existsSync(destination), `Recovery source/target state differs for ${name}`);
    const raw = readFileSync(source);
    const value = JSON.parse(raw.toString("utf8").replace(/^\uFEFF/, ""));
    if (name === names[0]) {
      ensure(value.finding === "F205" && value.preparation === 222 && value.observerScript === join(root, "observe-terminal-001.ps1"), "Terminal receipt is not this task's file");
    } else if (name === names[1]) {
      ensure(value.cwd === root && value.argv[1] === ".\\seal-handoff-001.mjs" && value.exitCode === 1, "Failed seal launcher is not this task's file");
    } else {
      ensure(value.nativeProductStarts === 0 && value.sealedCompletionNotClaimed === true &&
        value.message.includes("Immutable sealing helper failed with exit 1"), "Outer seal failure is not this task's file");
    }
    recovered.push({ name, source, destination, bytes: raw.length, sha256: sha(raw) });
  }
  json("reserved-artifact-path-incident-005.json", {
    recordedUtc: now(), finding: "F205", preparation: 222,
    incident: "Relative System.IO.File.Open paths in observe-terminal-001.ps1 and finish-seal-001.ps1 resolved against the PowerShell process's unchanged .NET current directory, C:\\src\\aspnetcore, not its Set-Location location. Three F205-owned JSON receipts were inadvertently created in the reserved checkout.",
    ruleViolation: "The reserved checkout no-write requirement was transiently violated; do not describe the whole preparation as never touching untracked content.",
    firstObserved: "seal-handoff-001.mjs could not find terminal-observation-001.json in the evidence root; it and its outer launcher failed with exit 1.",
    plannedRecovery: "Move only these three positively identified new files, byte-for-byte, into the dedicated evidence root. Do not edit or delete the four original reports.",
    originalReports: baseline.untracked,
    files: recovered,
    nativeProductStarts: 0,
  });
  for (const item of recovered) {
    renameSync(item.source, item.destination);
    ensure(!existsSync(item.source) && sha(readFileSync(item.destination)) === item.sha256, `Recovery verification failed: ${item.name}`);
  }
  const head = git("reserved-head-after-recovery", ["rev-parse", "HEAD"]).toString().trim();
  const branch = git("reserved-branch-after-recovery", ["symbolic-ref", "--short", "HEAD"]).toString().trim();
  const status = git("reserved-status-after-recovery", ["status", "--porcelain=v1", "--untracked-files=all", "-z"]);
  const diff = git("reserved-working-diff-after-recovery", ["diff", "--binary", "HEAD", "--"]);
  const staged = git("reserved-staged-diff-after-recovery", ["diff", "--cached", "--binary", "HEAD", "--"]);
  const untracked = status.toString("utf8").split("\0").filter(x => x.startsWith("?? ")).map(record => {
    const path = record.slice(3);
    const raw = readFileSync(join(repo, path));
    return { path, bytes: raw.length, sha256: sha(raw) };
  });
  const after = {
    observedUtc: now(), head, branch, statusSha256: sha(status),
    workingDiffBytes: diff.length, workingDiffSha256: sha(diff),
    stagedDiffBytes: staged.length, stagedDiffSha256: sha(staged), untracked,
  };
  json("reserved-after-recovery-005.json", after);
  const restored = {
    observedUtc: now(), baseline: "reserved-before-002.json", after: "reserved-after-recovery-005.json",
    headMatchesBaseline: head === baseline.head, branchMatchesBaseline: branch === baseline.branch,
    statusMatchesBaseline: sha(status) === baseline.statusSha256,
    workingDiffMatchesBaseline: sha(diff) === baseline.workingDiffSha256,
    stagedDiffMatchesBaseline: sha(staged) === baseline.stagedDiffSha256,
    originalFourReportsMatchBaseline: JSON.stringify(untracked) === JSON.stringify(baseline.untracked),
    recoveredFilesPreservedExactly: recovered.every(item => !existsSync(item.source) && sha(readFileSync(item.destination)) === item.sha256),
    originalUntrackedCount: untracked.length, incident: "reserved-artifact-path-incident-005.json",
    wholePreparationNoWriteCompliance: false,
    finalReservedStateRestored: true,
    shippingSourceChangedFiles: [], nativeProductStarts: 0,
  };
  ensure(Object.entries(restored).every(([key, value]) => !(key.endsWith("Baseline") || key === "recoveredFilesPreservedExactly") || value === true), "Reserved baseline was not restored");
  json("reserved-restoration-005.json", restored);
  json("collection-completed-005.json", {
    completedUtc: now(), receiptCount, allCommandRootsAwaited: true,
    allRedirectedStreamsReachedEof: true, nativeProductStarts: 0, reservedStateRestored: true,
  });
  console.log(JSON.stringify({ receipts: receiptCount, recoveredFiles: names, finalReservedStateRestored: true, originalFourReportsUnchanged: true, nativeProductStarts: 0 }, null, 2));
} catch (error) {
  json("recovery-failure-005.json", { atUtc: now(), type: error.name, message: error.message, nativeProductStarts: 0 });
  throw error;
}
