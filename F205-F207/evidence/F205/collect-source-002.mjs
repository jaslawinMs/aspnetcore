import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const repo = String.raw`C:\src\aspnetcore`;
const owner = "e2ba3013-578f-4603-8c85-a43ba9a905b5";
const original = "37e809ead5824bc753a1c3d56f11615bdb1296c5";
const beforeDispatch = "d3483989953ae3cccd773aea5ea04cb0c7198531";
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
function run(label, executable, args) {
  const startedUtc = now();
  const result = spawnSync(executable, args, { cwd: repo, env, encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  const receipt = {
    label, argv: [executable, ...args], cwd: repo, startedUtc, completedUtc: now(),
    pid: result.pid, exitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
    stdout: `receipts-002\\${label}.stdout.bin`, stderr: `receipts-002\\${label}.stderr.bin`,
    stdoutBytes: stdout.length, stderrBytes: stderr.length, stdoutSha256: sha(stdout), stderrSha256: sha(stderr),
    environment: Object.fromEntries(envKeys.map(key => [key, env[key] ?? null])),
    environmentScope: "Execution-relevant allowlist; authentication and unrelated ambient values deliberately not captured.",
    rootAwaited: true, redirectedStreamsReachedEof: !result.error,
    operationClass: "Read-only source/evidence, not a product build/test/performance execution",
  };
  write(receipt.stdout, stdout);
  write(receipt.stderr, stderr);
  json(`receipts-002\\${label}.json`, receipt);
  receiptCount++;
  return { ...result, stdout, stderr };
}
function git(label, ...args) {
  return run(label, "git", ["--no-optional-locks", "--no-pager", "-C", repo, ...args]);
}
function required(label, ...args) {
  const result = git(label, ...args);
  if (result.status !== 0 || result.error) throw new Error(`${label} exited ${result.status}; full streams retained`);
  return result.stdout;
}

try {
  json("execution-002.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid, owner,
    go: "Explicit registered GO222 received 2026-11-21T01:01:57.209Z",
    scope: "Source/evidence only. No native product command, worktree, service, source edit, timing or publication.",
    precedingFailure: "launcher-001.json: python Windows Store alias missing, exit 9009; no Python helper executed; immutable helper and full launcher streams retained.",
  });
  const policyRaw = readFileSync(join(root, "..", "policy.json"));
  write("policy-admission-002.json", policyRaw);
  const policy = JSON.parse(policyRaw.toString("utf8").replace(/^\uFEFF/, ""));
  const admission = {
    observedUtc: now(), policySha256: sha(policyRaw),
    ownerMatches: policy.independentFindingPreparationWorkers.F205 === owner,
    activeScope: policy.activeWorkerPreparationScopes.F205,
    registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
    leaseExists: existsSync(join(root, "..", "benchmark-exclusive.lease.json")),
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced, nativeLaunchAuthorityExercised: false,
  };
  json("source-admission-002.json", admission);
  if (!admission.ownerMatches || !admission.activeScope) throw new Error("Owner not registered for source task");
  const head = required("reserved-head-before", "rev-parse", "HEAD").toString().trim();
  const branch = required("reserved-branch-before", "symbolic-ref", "--short", "HEAD").toString().trim();
  const status = required("reserved-status-before", "status", "--porcelain=v1", "--untracked-files=all", "-z");
  const diff = required("reserved-working-diff-before", "diff", "--binary", "HEAD", "--");
  const staged = required("reserved-staged-diff-before", "diff", "--cached", "--binary", "HEAD", "--");
  const untracked = status.toString("utf8").split("\0").filter(x => x.startsWith("?? ")).map(record => {
    const path = record.slice(3);
    const raw = readFileSync(join(repo, path));
    return { path, bytes: raw.length, sha256: sha(raw) };
  });
  json("reserved-before-002.json", {
    observedUtc: now(), head, branch, statusSha256: sha(status),
    workingDiffBytes: diff.length, workingDiffSha256: sha(diff),
    stagedDiffBytes: staged.length, stagedDiffSha256: sha(staged), untracked,
  });
  const response = run("upstream-actual-main-get", "gh", [
    "api", "--method", "GET", "--include", "-H", "Accept: application/vnd.github+json",
    "-H", "X-GitHub-Api-Version: 2022-11-28", "repos/dotnet/aspnetcore/git/ref/heads/main",
  ]);
  if (response.status !== 0 || response.error) throw new Error("Independent upstream GET failed; full receipt retained");
  const responseText = response.stdout.toString("utf8");
  let mainBody;
  for (const match of responseText.matchAll(/\r?\n\r?\n/g)) {
    try {
      const body = JSON.parse(responseText.slice(match.index + match[0].length));
      if (body.ref === "refs/heads/main") mainBody = body;
    } catch { }
  }
  const defaultCommit = mainBody?.object?.sha;
  if (!/^[0-9a-f]{40}$/.test(defaultCommit ?? "")) throw new Error("No full Default SHA parsed from retained GET response");
  json("source-roles-002.json", {
    original: { commit: original, role: "Independent campaign Original; no branch created" },
    default: {
      commit: defaultCommit, role: "Independently observed upstream dotnet/aspnetcore actual main; immutable source pin",
      getUrl: "https://api.github.com/repos/dotnet/aspnetcore/git/ref/heads/main",
      responseReceipt: "receipts-002\\upstream-actual-main-get.json",
      rawResponse: "receipts-002\\upstream-actual-main-get.stdout.bin",
      responseSha256: sha(response.stdout), separateFromReservedCheckout: true,
      dispatchObservation: beforeDispatch, matchesDispatchObservation: defaultCommit === beforeDispatch,
    },
    reserved: { head, branch, sourceRole: "Neither Original nor Default" },
  });
  const target = "src/Components/Endpoints/src/Builder/RazorComponentEndpointDataSource.cs";
  const members = [];
  for (const [role, commit] of [["Original", original], ["Default", defaultCommit]]) {
    const membership = git(`${role}-commit-membership`, "cat-file", "-e", `${commit}^{commit}`);
    if (membership.status !== 0) throw new Error(`${role} commit absent locally; no fetch attempted`);
    const raw = required(`${role}-target-raw`, "show", `${commit}:${target}`);
    const tree = required(`${role}-target-membership`, "ls-tree", commit, "--", target).toString().trim();
    const rawArtifact = `source-002\\${role}\\${target.replaceAll("/", "\\")}`;
    write(rawArtifact, raw);
    members.push({ role, commit, path: target, gitLsTree: tree, bytes: raw.length, sha256: sha(raw), rawArtifact });
    required(`${role}-producer-discovery`, "grep", "-n", "-E",
      "RenderModeEndpointProvider|ConfiguredRenderModes|AddInteractive(Server|WebAssembly)RenderMode",
      commit, "--", "src/Components/Endpoints", "src/Components/Server",
      "src/Components/WebAssembly", "src/Components/Samples");
  }
  required("target-history", "log", original, "--follow", "--format=fuller", "--name-status", "-12", "--", target);
  json("source-membership-002.json", members);
  json("collection-completed-002.json", {
    completedUtc: now(), receiptCount, allCommandRootsAwaited: true, allRedirectedStreamsReachedEof: true,
    nativeProductStarts: 0, sourceMutation: false,
    note: "No claim about arbitrary unrelated or unobserved short-lived processes.",
  });
  console.log(JSON.stringify({ default: defaultCommit, sourceMembers: members.length, receipts: receiptCount, reservedHead: head, untrackedReports: untracked.length }, null, 2));
} catch (error) {
  json("collection-failure-002.json", { atUtc: now(), type: error.name, message: error.message, completedReceipts: receiptCount, nativeProductStarts: 0 });
  throw error;
}
