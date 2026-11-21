const fs = require("node:fs");
const path = require("node:path");
const { ROOT, OUT, receipts, utc, hash, put, json, run, git } = require("./source-io-v1.cjs");
const PAR = path.dirname(OUT);
const ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5";
const EXPECTED_DEFAULT = "d3483989953ae3cccd773aea5ea04cb0c7198531";

function main() {
    json("initial-v1-launch-failure.json", {
        command: String.raw`python 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\capture-initial-v1.py'`,
        shellId: "4469", exitCode: 9009,
        output: "Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.",
        helperBodyExecuted: false, executedHelperPreservedUnchanged: true,
        correction: "Use already installed Node.js for source-only collection; no dependency installation.",
        toolDiscovery: {
            shellId: "4470", exitCode: 0,
            node: String.raw`C:\Program Files\nodejs\node.exe`,
            gh: String.raw`C:\Program Files\GitHub CLI\gh.exe`,
            git: String.raw`C:\Program Files\Git\cmd\git.exe`
        }
    });
    json("initial-owner.json", {
        recordedUtc: utc(), finding: "F192", preparation: 212,
        ownerAgentId: "f8228d2e-3cae-4e79-8751-2baa68591d80",
        helperPid: process.pid, parentPid: process.ppid, argv: process.argv,
        nativeBuildTestRestoreStarted: false,
        registryGoReceived: true, registryGoReceipt: "registry-GO212.json",
        initialToolObservations: {
            utc: "2026-11-21T00:34:36.3582590Z",
            head: "24875ef5dabb55567870b39f6eb0002170435e2f",
            branch: "refs/heads/autoperf/F145-hoist-large-response-utf8-encoding",
            rootAgentsView: String.raw`C:\src\aspnetcore\AGENTS.md does not exist`,
            engAgentsExists: false,
            policyFirstView: "Exceeded view size; full deliberate read followed.",
            benchmarkExclusiveLeaseExists: false,
            optionalGraphsExist: false,
            evidenceRootPreviouslyExisted: false,
            registryGoReceivedAtFirstProbe: false,
            command: "Read-only PowerShell initial identity/status/remote probe; shellId 4466, exit 0.",
            untrackedReports: [
                "autoperf-issue-70219-deduplicated-report.html",
                "autoperf-issue-70219-duplicate-report.html",
                "autoperf-scan-report.md",
                "performance-antipattern-findings.md"
            ]
        }
    });
    for (const name of ["policy.json", "benchmark-exclusive.lease.json"]) {
        const file = path.join(PAR, name);
        if (fs.existsSync(file)) {
            put(path.join("policy-snapshots", "initial-" + name), fs.readFileSync(file));
        } else {
            json(path.join("policy-snapshots", "initial-" + name + ".absence.json"),
                { observedUtc: utc(), path: file, exists: false });
        }
    }
    for (const [name, args] of [
        ["initial-head", ["rev-parse", "HEAD"]],
        ["initial-branch", ["symbolic-ref", "--quiet", "HEAD"]],
        ["initial-status", ["status", "--porcelain=v1", "--untracked-files=all"]],
        ["initial-unstaged", ["diff", "--no-ext-diff", "--binary"]],
        ["initial-staged", ["diff", "--cached", "--no-ext-diff", "--binary"]],
        ["remotes", ["remote", "-v"]],
        ["original-commit-present", ["cat-file", "-e", ORIGINAL + "^{commit}"]],
        ["expected-default-commit-present", ["cat-file", "-e", EXPECTED_DEFAULT + "^{commit}"]]
    ]) {
        git(name, ...args);
    }
    json("initial-reserved-reports.json", [
        "autoperf-issue-70219-deduplicated-report.html",
        "autoperf-issue-70219-duplicate-report.html",
        "autoperf-scan-report.md",
        "performance-antipattern-findings.md"
    ].map(name => {
        const file = path.join(ROOT, name);
        const bytes = fs.readFileSync(file);
        return { path: file, bytes: bytes.length, sha256: hash(bytes) };
    }));
    const gh = ["gh", "api", "--method", "GET"];
    run("upstream-repository", [...gh, "repos/dotnet/aspnetcore"], true);
    const response = run("upstream-main", [...gh, "repos/dotnet/aspnetcore/branches/main"], true);
    const observedDefault = JSON.parse(response.stdout.toString("utf8")).commit.sha;
    run("fork-repository", [...gh, "repos/jaslawinMs/aspnetcore"]);
    run("fork-main", [...gh, "repos/jaslawinMs/aspnetcore/branches/main"]);
    const local = git("observed-default-commit-present", "cat-file", "-e", observedDefault + "^{commit}");
    json("source-roles.json", {
        recordedUtc: utc(), original: ORIGINAL, observedDefault, expectedDefault: EXPECTED_DEFAULT,
        defaultMatchesParentObservation: observedDefault === EXPECTED_DEFAULT,
        defaultLocalCommitPresent: local.status === 0,
        defaultBranchAuthority: "repos/dotnet/aspnetcore/branches/main and upstream-repository raw responses",
        reservedCheckoutIsDefault: false, forkMainIsDefaultAuthority: false
    });
    if (local.status !== 0) {
        console.log("BLOCKED: observed Default is not locally present; no fetch or old-role substitution.");
        return;
    }
    for (const [role, revision] of [["original", ORIGINAL], ["default", observedDefault]]) {
        git(`${role}-commit`, "show", "-s", "--format=fuller", revision);
        git(`${role}-task-directory`, "ls-tree", "-r", revision, "--", "eng/tools/RepoTasks");
        git(`${role}-area-instructions`, "ls-tree", "-r", "--name-only", revision, "--",
            "AGENTS.md", "eng/AGENTS.md", "eng/tools/AGENTS.md",
            "eng/tools/RepoTasks/AGENTS.md", ".github/instructions/build.instructions.md");
        git(`${role}-generate-guid-mentions`, "grep", "-n", "-I", "-e", "GenerateGuid", revision, "--");
        for (const [label, file] of [
            ["task", "eng/tools/RepoTasks/GenerateGuid.cs"],
            ["build-instructions", ".github/instructions/build.instructions.md"],
            ["build-doc", "docs/BuildFromSource.md"],
            ["build-errors-doc", "docs/BuildErrors.md"],
            ["global-json", "global.json"]
        ]) {
            git(`${role}-${label}-membership`, "ls-tree", revision, "--", file);
            git(`${role}-${label}-raw`, "show", `${revision}:${file}`);
        }
    }
}

try {
    main();
} finally {
    json("initial-command-index.json", receipts);
}
