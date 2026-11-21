const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, OUT, receipts, utc, hash, put, json, run, git } = require("./source-io-v1.cjs");
const roles = require("./source-roles.json");
const PAR = path.dirname(OUT);
const checks = [];
const memberships = [];

function check(name, passed, detail) {
    checks.push({ name, passed: Boolean(passed), detail, boundary: "Source/artifact check, not runtime correctness." });
}

function text(name) {
    return fs.readFileSync(path.join(OUT, "commands", name + ".stdout"), "utf8");
}

try {
    for (const role of ["original", "default"]) {
        const files = fs.readdirSync(path.join(OUT, "commands"))
            .filter(name => name.startsWith(role + "-") && name.endsWith("-membership.stdout"));
        for (const file of files) {
            const label = file.slice(0, -"-membership.stdout".length);
            const membership = fs.readFileSync(path.join(OUT, "commands", file), "utf8").trim();
            const match = /^100644 blob ([0-9a-f]{40})\t(.+)$/.exec(membership);
            const rawName = label + "-raw.stdout";
            if (!match || !fs.existsSync(path.join(OUT, "commands", rawName))) {
                memberships.push({ role, label, passed: false, membership });
                continue;
            }
            const bytes = fs.readFileSync(path.join(OUT, "commands", rawName));
            const computed = crypto.createHash("sha1")
                .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
            memberships.push({
                role, revision: role === "original" ? roles.original : roles.observedDefault,
                sourcePath: match[2], gitBlobSha1: match[1], computedGitBlobSha1: computed,
                rawArtifact: path.join("commands", rawName), bytes: bytes.length,
                sha256: hash(bytes), passed: computed === match[1]
            });
        }
        const task = text(role + "-task-raw");
        check(role + "-reported-statement", task.includes(
            'var value = string.Join(",", Values.Select(o => o.ItemSpec).ToArray()).ToLowerInvariant();'),
            "Exact reported statement is present in the pinned source.");
        check(role + "-values-array", task.includes("public ITaskItem[] Values { get; set; }"),
            "The Values input is a concrete array type.");
        const wix = text(role + "-wix-targets-raw");
        const calls = [...wix.matchAll(/<GenerateGuid(?=\s)/g)];
        check(role + "-six-in-tree-wix-sites", calls.length === 6,
            { syntacticSites: calls.length, sourcePath: "src\\Installers\\Windows\\Wix.targets" });
        check(role + "-host-options-scalar-producer", [
            "<ProductNameShort>AspNetCore.HostOptions</ProductNameShort>",
            "<OutputType>Package</OutputType>", "<Platform>x86</Platform>"
        ].every(value => text(role + "-host-options-project-raw").includes(value)),
        "Tracked HostOptions producer has fixed scalar properties.");
        check(role + "-bundle-scalar-producer", [
            "<OutputType>Bundle</OutputType>", "<Platform>x86</Platform>"
        ].every(value => text(role + "-bundle-project-raw").includes(value))
            && wix.includes("<BundleGuidInputs>$(AspNetCoreMajorMinorVersion);$(Platform)</BundleGuidInputs>"),
        "Tracked bundle producer uses exactly two scalar property slots.");
        check(role + "-ancm-normal-entry-disabled", ["ancm-project", "ancm-express-project"]
            .every(label => text(`${role}-${label}-raw`).includes("<DisableGuidGeneration>true</DisableGuidGeneration>")),
        "Both tracked non-HostOptions package projects disable the normal GUID-generation entry point.");
        git(`${role}-generate-guid-case-insensitive-mentions`, "grep", "-n", "-i", "-I",
            "-e", "GenerateGuid", role === "original" ? roles.original : roles.observedDefault, "--");
    }
    check("all-retained-role-source-blobs-complete", memberships.length > 0 && memberships.every(row => row.passed),
        { sourceBlobCount: memberships.length, membershipIndex: "source-membership-index.json" });
    for (const label of ["task", "task-project", "task-registration", "uuid", "wix-targets",
        "wix-props", "host-options-project", "bundle-project", "ancm-project", "ancm-express-project"]) {
        check("both-roles-identical-" + label,
            fs.readFileSync(path.join(OUT, "commands", "original-" + label + "-raw.stdout"))
                .equals(fs.readFileSync(path.join(OUT, "commands", "default-" + label + "-raw.stdout"))),
            "Byte comparison of retained pinned role sources.");
    }
    const runtimeIndex = require("./runtime-source-index-v1.json");
    const stringSources = runtimeIndex.filter(row => row.label.includes("string-manipulation"));
    check("three-installed-version-source-join-blobs-identical",
        stringSources.length === 3 && new Set(stringSources.map(row => row.gitBlobSha1)).size === 1,
        stringSources.map(row => ({ commit: row.commit, gitBlobSha1: row.gitBlobSha1 })));
    check("api-source-memberships-verified",
        [...runtimeIndex, ...require("./msbuild-source-index-v1.json")]
            .every(row => row.verifiedGitBlobAndByteLength === true),
        "Raw decoded source files were checked against GitHub's exact blob SHA1 and byte size.");
    json("source-membership-index.json", memberships);
    git("historical-initial-task-membership", "ls-tree", "b67a14126326cec4c74ff844500b3bd830dde880",
        "--", "src/Installers/Windows/tasks/GenerateGuid.cs");
    git("historical-initial-task-raw", "show",
        "b67a14126326cec4c74ff844500b3bd830dde880:src/Installers/Windows/tasks/GenerateGuid.cs");
    const historicalMembership = /^100644 blob ([0-9a-f]{40})\t(.+)$/
        .exec(text("historical-initial-task-membership").trim());
    const historicalBytes = fs.readFileSync(path.join(OUT, "commands", "historical-initial-task-raw.stdout"));
    const historicalBlob = crypto.createHash("sha1")
        .update(Buffer.from(`blob ${historicalBytes.length}\0`)).update(historicalBytes).digest("hex");
    check("historical-introduction-source-blob-complete",
        historicalMembership && historicalBlob === historicalMembership[1],
        { revision: "b67a14126326cec4c74ff844500b3bd830dde880",
            gitBlobSha1: historicalMembership?.[1], computedGitBlobSha1: historicalBlob });
    json("historical-source-membership.json", {
        revision: "b67a14126326cec4c74ff844500b3bd830dde880",
        sourcePath: historicalMembership?.[2], gitBlobSha1: historicalMembership?.[1],
        computedGitBlobSha1: historicalBlob, sha256: hash(historicalBytes),
        bytes: historicalBytes.length, artifact: "commands\\historical-initial-task-raw.stdout"
    });
    const response = run("upstream-main-final", [
        "gh", "api", "--method", "GET", "repos/dotnet/aspnetcore/branches/main"
    ], true);
    const finalDefault = JSON.parse(response.stdout.toString("utf8")).commit.sha;
    check("upstream-default-unchanged-at-final-observation", finalDefault === roles.observedDefault,
        { initial: roles.observedDefault, final: finalDefault, response: "commands\\upstream-main-final.stdout" });
    for (const [name, args] of [
        ["final-head", ["rev-parse", "HEAD"]],
        ["final-branch", ["symbolic-ref", "--quiet", "HEAD"]],
        ["final-status", ["status", "--porcelain=v1", "--untracked-files=all"]],
        ["final-unstaged", ["diff", "--no-ext-diff", "--binary"]],
        ["final-staged", ["diff", "--cached", "--no-ext-diff", "--binary"]]
    ]) {
        git(name, ...args);
    }
    const reports = require("./initial-reserved-reports.json").map(row => {
        const bytes = fs.readFileSync(row.path);
        return { ...row, finalBytes: bytes.length, finalSha256: hash(bytes),
            unchanged: bytes.length === row.bytes && hash(bytes) === row.sha256 };
    });
    const preservation = {
        recordedUtc: utc(),
        root: ROOT,
        head: text("final-head").trim(),
        branch: text("final-branch").trim(),
        identicalHead: text("initial-head") === text("final-head"),
        identicalBranch: text("initial-branch") === text("final-branch"),
        identicalStatus: text("initial-status") === text("final-status"),
        unstagedDiffEmpty: text("final-unstaged").length === 0,
        stagedDiffEmpty: text("final-staged").length === 0,
        reports,
        allFourReportsUnchanged: reports.length === 4 && reports.every(row => row.unchanged),
        graphPaths: [String.raw`C:\src\ap-F192-o212`, String.raw`C:\src\ap-F192-d212`]
            .map(graph => ({ path: graph, exists: fs.existsSync(graph), createdByOwner: false }))
    };
    check("reserved-checkout-preserved", preservation.identicalHead && preservation.identicalBranch
        && preservation.identicalStatus && preservation.unstagedDiffEmpty && preservation.stagedDiffEmpty
        && preservation.allFourReportsUnchanged,
        "Exact head/branch/status/diff and four report byte hashes match the initial capture.");
    check("no-private-graphs-created", preservation.graphPaths.every(row => !row.exists),
        preservation.graphPaths);
    json("reserved-checkout-preservation.json", preservation);
    const policyFile = path.join(PAR, "policy.json");
    const policyBytes = fs.readFileSync(policyFile);
    const policy = JSON.parse(policyBytes);
    const lease = path.join(PAR, "benchmark-exclusive.lease.json");
    put(path.join("policy-snapshots", "final-policy.json"), policyBytes);
    const policyObservation = {
        recordedUtc: utc(),
        ownerRegisteredAs: policy.independentFindingPreparationWorkers?.F192 ?? null,
        actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
        buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
        benchmarkLeaseExists: fs.existsSync(lease),
        nativeBuildTestRestoreStarted: false,
        nativeStartRequested: false,
        sourceDecision: "No candidate qualified; these observations do not constitute a native/timing admission."
    };
    if (policyObservation.benchmarkLeaseExists) {
        put(path.join("policy-snapshots", "final-benchmark-exclusive.lease.json"), fs.readFileSync(lease));
    }
    json("final-policy-observation.json", policyObservation);
    const priorIndexes = [
        "initial-command-index.json", "source-command-index-v1.json",
        "producer-command-index-v1.json", "runtime-command-index-v1.json", "msbuild-command-index-v1.json"
    ];
    const priorRows = priorIndexes.flatMap(file => JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8")));
    const priorPids = [...new Set(priorRows.flatMap(row => [row.helperPid, row.childPid]).filter(Number.isInteger))];
    run("known-prior-source-process-identities-final", [
        "powershell", "-NoProfile", "-NonInteractive", "-Command",
        `$ids=@(${priorPids.join(",")}); $p=@(Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{Id=$_.Id;StartTimeUtc=$_.StartTime.ToUniversalTime().ToString('o');Path=$_.Path} }); [pscustomobject]@{ObservedUtc=[DateTime]::UtcNow.ToString('o');KnownPriorIds=$ids;CurrentlyObserved=$p;Scope='Only exact previously observed source-helper/child PIDs. A reused PID is not ownership evidence; no unrelated process assertion or stops.';NativeBuildTestRestoreRootsStarted=0} | ConvertTo-Json -Depth 4 -Compress`
    ]);
    json("source-audit-v1.json", {
        recordedUtc: utc(), helperPid: process.pid, parentPid: process.ppid,
        argv: process.argv, checks, allPassed: checks.every(row => row.passed),
        checkBoundary: "Static source, exact raw bytes and repository-preservation checks only; no task/runtime correctness claim.",
        nativeCommandsStarted: 0,
        nativeAssertionReached: false
    });
    put(path.join("diffs", "original-no-candidate.diff"), Buffer.alloc(0));
    put(path.join("diffs", "default-no-candidate.diff"), Buffer.alloc(0));
    json("diff-index.json", {
        finding: "F192", preparation: 212, candidateImplemented: false,
        repositoryChangedFiles: [],
        sourceRoles: [
            { role: "Original", baselineRevision: roles.original,
                candidateRevision: null, privateGraph: null, changedFiles: [],
                emptyDiffArtifact: "diffs\\original-no-candidate.diff" },
            { role: "Default", baselineRevision: roles.observedDefault,
                candidateRevision: null, privateGraph: null, changedFiles: [],
                emptyDiffArtifact: "diffs\\default-no-candidate.diff" }
        ],
        emptyDiffMeaning: "No candidate or implementation files exist. These empty artifacts are an explicit absence-of-change index, not fictitious baseline/candidate checkout comparisons.",
        reservedCheckoutDiffs: [
            "commands\\final-unstaged.stdout", "commands\\final-staged.stdout"
        ]
    });
    if (checks.some(row => !row.passed)) {
        process.exitCode = 1;
    }
    console.log(JSON.stringify({ kind: "source-audit-summary", exitCode: process.exitCode || 0,
        passed: checks.filter(row => row.passed).length,
        failed: checks.filter(row => !row.passed).map(row => row.name),
        sourceBlobs: memberships.length, nativeCommands: 0 }));
} finally {
    json("final-source-command-index-v1.json", receipts);
}
