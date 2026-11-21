import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const repo = String.raw`C:\src\aspnetcore`;
const roles = JSON.parse(readFileSync(join(root, "source-roles-002.json"), "utf8"));
const before = JSON.parse(readFileSync(join(root, "reserved-before-002.json"), "utf8"));
const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GH_PROMPT_DISABLED: "true", GH_NO_UPDATE_NOTIFIER: "1" };
const envKeys = [
  "PATH", "PATHEXT", "SYSTEMROOT", "COMSPEC", "GIT_OPTIONAL_LOCKS", "GIT_PAGER", "PAGER",
  "GH_PROMPT_DISABLED", "GH_NO_UPDATE_NOTIFIER", "GH_HOST", "DOTNET_ROOT", "DOTNET_ROOT_X64",
  "DOTNET_MULTILEVEL_LOOKUP", "DOTNET_GENERATE_ASPNET_CERTIFICATE",
  "DOTNET_ADD_GLOBAL_TOOLS_TO_PATH", "MSBUILDDISABLENODEREUSE", "NUGET_PACKAGES",
];
let receiptCount = 0;
const now = () => new Date().toISOString();
const sha = data => createHash("sha256").update(data).digest("hex").toUpperCase();
function write(relative, data) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, { flag: "wx" });
}
const json = (relative, data) => write(relative, JSON.stringify(data, null, 2) + "\n");
function git(label, args, stdin = null) {
  const argv = ["git", "--no-optional-locks", "--no-pager", "-C", repo, ...args];
  const startedUtc = now();
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: repo, env, input: stdin, encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  const receipt = {
    label, argv, cwd: repo, startedUtc, completedUtc: now(), pid: result.pid,
    exitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
    stdout: `receipts-004\\${label}.stdout.bin`, stderr: `receipts-004\\${label}.stderr.bin`,
    stdoutBytes: stdout.length, stderrBytes: stderr.length, stdoutSha256: sha(stdout), stderrSha256: sha(stderr),
    stdin: stdin === null ? null : `receipts-004\\${label}.stdin.bin`,
    stdinBytes: stdin?.length ?? 0, stdinSha256: stdin === null ? null : sha(stdin),
    environment: Object.fromEntries(envKeys.map(key => [key, env[key] ?? null])),
    environmentScope: "Execution-relevant allowlist; authentication and unrelated ambient values deliberately not captured.",
    rootAwaited: true, redirectedStreamsReachedEof: !result.error,
    operationClass: "Read-only source/evidence, not a product build/test/performance execution",
  };
  write(receipt.stdout, stdout);
  write(receipt.stderr, stderr);
  if (stdin !== null) write(receipt.stdin, stdin);
  json(`receipts-004\\${label}.json`, receipt);
  receiptCount++;
  if (result.status !== 0 || result.error) throw new Error(`${label} exited ${result.status}; full streams retained`);
  return stdout;
}

const paths = [
  "src/Hosting/Hosting/src/Builder/ApplicationBuilderFactory.cs",
  "src/Hosting/Hosting/src/Builder/IApplicationBuilderFactory.cs",
  "src/Hosting/Hosting/src/GenericHost/GenericWebHostService.cs",
  "src/Hosting/Hosting/src/GenericHost/GenericWebHostBuilder.cs",
  "src/Hosting/Hosting/src/GenericHost/SlimWebHostBuilder.cs",
  "src/Http/Routing/src/Builder/EndpointRoutingApplicationBuilderExtensions.cs",
];

try {
  json("execution-004.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid,
    scope: "Close the public hosting-factory -> custom IApplicationBuilder.New extension seam and reserved-checkout invariants. No native product command.",
  });
  const members = [];
  for (const [role, commit] of [["Original", roles.original.commit], ["Default", roles.default.commit]]) {
    const listing = git(`${role}-hosting-membership`, ["ls-tree", "-r", commit, "--", ...paths]);
    const entries = new Map(listing.toString("utf8").trim().split(/\r?\n/).filter(Boolean).map(line => {
      const match = /^([0-9]+) blob ([a-f0-9]{40})\t(.*)$/.exec(line);
      if (!match) throw new Error(`Unexpected ls-tree entry: ${line}`);
      return [match[3], { mode: match[1], blob: match[2] }];
    }));
    if (paths.some(path => !entries.has(path))) throw new Error("Hosting source path absent; no role substitution allowed");
    const stdin = Buffer.from(paths.map(path => `${commit}:${path}\n`).join(""), "utf8");
    const batch = git(`${role}-hosting-raw-batch`, ["cat-file", "--batch"], stdin);
    let offset = 0;
    for (const path of paths) {
      const end = batch.indexOf(10, offset);
      const header = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(batch.subarray(offset, end).toString("ascii"));
      if (!header || header[1] !== entries.get(path).blob) throw new Error(`Unexpected object for ${path}`);
      const bytes = Number(header[2]);
      const raw = batch.subarray(end + 1, end + 1 + bytes);
      if (raw.length !== bytes || batch[end + 1 + bytes] !== 10) throw new Error(`Truncated object: ${path}`);
      offset = end + 1 + bytes + 1;
      const rawArtifact = `source-004\\${role}\\${path.replaceAll("/", "\\")}`;
      write(rawArtifact, raw);
      members.push({ role, commit, path, gitBlob: header[1], bytes, sha256: sha(raw), rawArtifact });
    }
    if (offset !== batch.length) throw new Error("Unconsumed batch output");
  }
  json("source-membership-004.json", members);
  const changedPaths = paths.filter(path =>
    members.find(x => x.role === "Original" && x.path === path).sha256 !==
    members.find(x => x.role === "Default" && x.path === path).sha256);
  git("hosting-source-role-diff", ["diff", "--binary", roles.original.commit, roles.default.commit, "--", ...paths]);
  json("source-comparison-004.json", { paths: paths.length, changedPaths, nativeProductStarts: 0 });

  const head = git("reserved-head-after", ["rev-parse", "HEAD"]).toString().trim();
  const branch = git("reserved-branch-after", ["symbolic-ref", "--short", "HEAD"]).toString().trim();
  const status = git("reserved-status-after", ["status", "--porcelain=v1", "--untracked-files=all", "-z"]);
  const diff = git("reserved-working-diff-after", ["diff", "--binary", "HEAD", "--"]);
  const staged = git("reserved-staged-diff-after", ["diff", "--cached", "--binary", "HEAD", "--"]);
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
  json("reserved-after-004.json", after);
  const invariant = {
    headUnchanged: before.head === after.head, branchUnchanged: before.branch === after.branch,
    statusUnchanged: before.statusSha256 === after.statusSha256,
    workingDiffUnchanged: before.workingDiffSha256 === after.workingDiffSha256,
    stagedDiffUnchanged: before.stagedDiffSha256 === after.stagedDiffSha256,
    untrackedUnchanged: JSON.stringify(before.untracked) === JSON.stringify(after.untracked),
    untrackedCount: untracked.length, before: "reserved-before-002.json", after: "reserved-after-004.json",
    candidateCreated: false, privateWorktreesCreated: [], authoredChangedFiles: [],
  };
  json("reserved-invariants-004.json", invariant);
  if (Object.entries(invariant).some(([key, value]) => key.endsWith("Unchanged") && value !== true)) {
    throw new Error("Reserved checkout changed between observations; cannot attest unchanged");
  }
  write("Original-candidate.diff", Buffer.alloc(0));
  write("Default-candidate.diff", Buffer.alloc(0));
  json("empty-diffs-004.json", {
    files: ["Original-candidate.diff", "Default-candidate.diff"],
    bytesEach: 0, sha256Each: sha(Buffer.alloc(0)),
    meaning: "No candidate/source edits were authored, and no private candidate graph exists. These are explicit empty authored-change artifacts, not comparisons of nonexistent candidate branches.",
  });
  const policyRaw = readFileSync(join(root, "..", "policy.json"));
  write("policy-final-004.json", policyRaw);
  const policy = JSON.parse(policyRaw.toString("utf8").replace(/^\uFEFF/, ""));
  json("source-policy-final-004.json", {
    observedUtc: now(), policySha256: sha(policyRaw),
    ownerStillRegistered: policy.independentFindingPreparationWorkers.F205 === "e2ba3013-578f-4603-8c85-a43ba9a905b5",
    activeScope: policy.activeWorkerPreparationScopes.F205,
    registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
    leaseExists: existsSync(join(root, "..", "benchmark-exclusive.lease.json")),
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
    use: "Point-in-time source/ownership observation only; no native product start requested or authorized by this receipt.",
  });
  json("collection-completed-004.json", {
    completedUtc: now(), receiptCount, nativeProductStarts: 0,
    allCommandRootsAwaited: true, allRedirectedStreamsReachedEof: true,
    noObservedDescendantProcessLaunchedSeparately: true,
    noUniversalClaimAboutUnobservedShortLivedProcesses: true,
  });
  console.log(JSON.stringify({ receipts: receiptCount, sourceMembers: members.length, changedPaths, reservedInvariants: invariant, nativeProductStarts: 0 }, null, 2));
} catch (error) {
  json("collection-failure-004.json", { atUtc: now(), type: error.name, message: error.message, completedReceipts: receiptCount, nativeProductStarts: 0 });
  throw error;
}
