const fs = require("node:fs");
const path = require("node:path");
const { ROOT, OUT, receipts, utc, hash, put, json, run } = require("./source-io-v1.cjs");

function readJson(file) {
    return JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8"));
}

function listFiles(directory, relative = "") {
    return fs.readdirSync(directory, { withFileTypes: true })
        .flatMap(entry => {
            const name = path.join(relative, entry.name);
            return entry.isDirectory() ? listFiles(path.join(directory, entry.name), name) : [name];
        }).sort();
}

if (fs.existsSync(path.join(OUT, "HANDOFF.json"))) {
    throw new Error("HANDOFF.json already exists; no overwrite or replay is allowed.");
}

const indexes = [
    "initial-command-index.json",
    "source-command-index-v1.json",
    "producer-command-index-v1.json",
    "runtime-command-index-v1.json",
    "msbuild-command-index-v1.json",
    "final-source-command-index-v1.json"
];
const rows = indexes.flatMap(readJson);
const audit = readJson("source-audit-v1.json");
const analysis = readJson("source-analysis.json");
const roles = readJson("source-roles.json");
const preservation = readJson("reserved-checkout-preservation.json");
const policy = readJson("final-policy-observation.json");
const go = readJson("registry-GO212.json");

if (!audit.allPassed || analysis.decision !== "bounded-source-only-no-candidate"
    || !preservation.identicalHead || !preservation.identicalBranch
    || !preservation.identicalStatus || !preservation.allFourReportsUnchanged
    || !preservation.unstagedDiffEmpty || !preservation.stagedDiffEmpty) {
    throw new Error("Source qualification or reserved-checkout preservation is not green.");
}
if (rows.some(row => row.exitCode !== 0 || row.launchError
    || !row.rootWaited || !row.redirectedStdoutAndStderrFullyCollected)) {
    throw new Error("Unexpected retained source command failure or incomplete stream.");
}
for (const row of rows) {
    for (const stream of [row.stdout, row.stderr]) {
        const bytes = fs.readFileSync(path.join(OUT, stream.path));
        if (bytes.length !== stream.bytes || hash(bytes) !== stream.sha256) {
            throw new Error("Changed command stream: " + stream.path);
        }
    }
}

const recentRows = readJson("final-source-command-index-v1.json");
const recentPids = [...new Set(recentRows.flatMap(row => [row.helperPid, row.childPid]).filter(Number.isInteger))];
const terminal = run("post-source-audit-exact-pid-identity", [
    "powershell", "-NoProfile", "-NonInteractive", "-Command",
    `$ids=@(${recentPids.join(",")}); $p=@(Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{Id=$_.Id;StartTimeUtc=$_.StartTime.ToUniversalTime().ToString('o');Path=$_.Path} }); [pscustomobject]@{ObservedUtc=[DateTime]::UtcNow.ToString('o');KnownPriorIds=$ids;CurrentlyObserved=$p;Scope='Exact final-source helper/child identities only; no process stops or unrelated-machine activity claim.'} | ConvertTo-Json -Depth 4 -Compress`
], true);
const latestObservation = JSON.parse(terminal.stdout.toString("utf8").trim());
const priorObservation = JSON.parse(fs.readFileSync(
    path.join(OUT, "commands", "known-prior-source-process-identities-final.stdout"), "utf8").trim());

function classifyObservation(observation, historicalRows) {
    return (observation.CurrentlyObserved || []).map(processRow => {
        const matchingRows = historicalRows.filter(row =>
            row.helperPid === processRow.Id || row.childPid === processRow.Id);
        const latestHistoricalCompletionUtc = matchingRows.map(row => row.completedUtc).sort().at(-1);
        const creationAfterAllHistoricalCompletions = latestHistoricalCompletionUtc
            && Date.parse(processRow.StartTimeUtc) > Date.parse(latestHistoricalCompletionUtc);
        return {
            ...processRow,
            latestHistoricalCompletionUtc,
            creationAfterAllHistoricalCompletions: Boolean(creationAfterAllHistoricalCompletions),
            disposition: creationAfterAllHistoricalCompletions
                ? "Reused PID; current process is not the previously completed source command."
                : "Current PID ownership is not established by this observation alone.",
            stopped: false
        };
    });
}

const priorClassifications = classifyObservation(priorObservation, rows);
const latestClassifications = classifyObservation(latestObservation, recentRows);
if (latestClassifications.some(row => !row.creationAfterAllHistoricalCompletions)) {
    throw new Error("An exact final-source PID is still observed without a proven post-completion reuse boundary.");
}
const processState = {
    recordedUtc: utc(),
    nativeBuildTestRestoreRootsStarted: 0,
    nativeRoots: [],
    observedNativeChildren: [],
    persistentServicesStarted: [],
    nativeOwnedWorkTerminal: true,
    allRetainedSourceCommandRootsWaited: true,
    allRetainedSourceCommandStdoutStderrCollected: true,
    priorSourceIdentityObservation: priorObservation,
    priorSourceIdentityClassifications: priorClassifications,
    finalSourceIdentityObservation: latestObservation,
    finalSourceIdentityClassifications: latestClassifications,
    noProcessStopsPerformed: true,
    limit: "Only directly retained source-command roots, observed PIDs and redirected streams are attested. No unobserved-descendant, unrelated-process, dedicated-host or machine-wide quiescence claim.",
    sealer: {
        helperPid: process.pid,
        parentPid: process.ppid,
        synchronous: true,
        nativeWorkloadStarted: false,
        note: "The sealer launches only this synchronous identity query. Its own terminal exit is reported by the containing tool invocation, outside its self-indexed handoff."
    }
};
json("source-process-terminal.json", processState);
json("terminal-command-index-v1.json", receipts);

json("tool-launch-receipts.json", {
    sourceOnly: true,
    noDotnetCommands: true,
    sourceCollectionLaunchers: [
        {
            shellId: "4469", exitCode: 9009,
            command: String.raw`python 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\capture-initial-v1.py'`,
            result: "Python execution alias unavailable. No helper body ran; failed/superseded helper preserved."
        },
        { shellId: "4470", exitCode: 0, command: "Get-Command node; Get-Command gh,git (Name,Source only)", result: "Already installed Node, gh and git located; no installation." },
        {
            shellId: "4471", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\capture-initial-v2.cjs'`,
            result: "Complete command streams and receipts retained individually; all source children exit 0."
        },
        {
            shellId: "4474", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\collect-source-v1.cjs' | ForEach-Object { $r = $_ | ConvertFrom-Json; "$($r.id) exit=$($r.exitCode) $($r.launchError)" }`,
            result: "Actual task registrations/consumers, history and related-work reads retained; all source children exit 0."
        },
        {
            shellId: "4484", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\collect-producers-v1.cjs' | ForEach-Object { $r = $_ | ConvertFrom-Json; "$($r.id) exit=$($r.exitCode) $($r.launchError)" }`,
            result: "Pinned producer/consumer raw files, SDK byte/file metadata and historical PR details retained; all source children exit 0."
        },
        {
            shellId: "4489", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\collect-runtime-v1.cjs' | ForEach-Object { $r = $_ | ConvertFrom-Json; "$($r.id) exit=$($r.exitCode) $($r.launchError)" }`,
            result: "Authoritative pinned VMR runtime/LINQ raw source and verified Git blob memberships retained; all source children exit 0."
        },
        {
            shellId: "4491", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\collect-msbuild-v1.cjs' | ForEach-Object { $r = $_ | ConvertFrom-Json; "$($r.id) exit=$($r.exitCode) $($r.launchError)" }`,
            result: "Pinned MSBuild producer source retained and Git blobs verified; all source children exit 0."
        },
        {
            shellId: "4503", exitCode: 0,
            command: String.raw`node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F192-212\final-source-checks-v1.cjs' | ForEach-Object { $r = $_ | ConvertFrom-Json; if ($r.kind) { $_ } else { "$($r.id) exit=$($r.exitCode) $($r.launchError)" } }`,
            result: "29 static checks passed, 54 role source blobs verified plus historical source, current upstream reobserved, protected checkout unchanged. No native correctness assertion."
        }
    ],
    rawCommandReceipts: [...indexes, "terminal-command-index-v1.json"],
    note: "All direct git/gh/PowerShell child argv, UTC boundaries, PIDs, stdout/stderr bytes, SHA256 and exit codes are in the indexed command receipts. View/rg and read-only JSON browsing do not execute the task."
});

const jsonFiles = listFiles(OUT).filter(file => file.endsWith(".json"));
for (const file of jsonFiles) {
    readJson(file);
}
json("sealing-validation.json", {
    recordedUtc: utc(),
    nativeCorrectnessClaimed: false,
    parsedEvidenceJsonFilesBeforeThisRecord: jsonFiles.length,
    staticSourceChecksPassed: audit.checks.length,
    allPriorSourceCommandsExitedZero: rows.every(row => row.exitCode === 0),
    allPriorSourceCommandStreamsRehashed: true,
    allCurrentSealerChildrenWaitedAndStreamsCollected: receipts.every(row =>
        row.exitCode === 0 && row.rootWaited && row.redirectedStdoutAndStderrFullyCollected),
    failedPythonAliasAttemptRetained: true,
    sealerUsesCreateNewOnly: true
});

const artifacts = listFiles(OUT).map(file => {
    const bytes = fs.readFileSync(path.join(OUT, file));
    return { path: file, bytes: bytes.length, sha256: hash(bytes) };
});
const finalDefaultReceipt = readJson(path.join("commands", "upstream-main-final.json"));
const handoff = {
    schemaVersion: 1,
    finding: "F192",
    preparation: 212,
    ownerAgentId: go.ownerAgentId,
    recordedUtc: utc(),
    status: "SEALED_SOURCE_ONLY_NO_CANDIDATE",
    coordinatorAcceptance: "Not performed; coordinator alone accepts/finalizes.",
    summary: "Normal tracked installer producers supply two or three scalar items. ToArray feeds a specialized string-array Join path; direct enumerable joining uses iterator/builder code. No useful improvement is established on this cold bounded path, so no change or native workload is proposed.",
    sourceRoles: {
        Original: roles.original,
        Default: roles.observedDefault,
        defaultIsIndependentlyObservedUpstreamMain: true,
        initialObservation: readJson(path.join("commands", "upstream-main.json")),
        finalObservation: finalDefaultReceipt,
        reservedCheckoutIsNotABaseline: true,
        forkMainIsNotDefaultAuthority: true
    },
    acceptance: {
        criteriaDefinedBeforeImplementation: "acceptance.json",
        sourceQualification: { status: "MET_AT_SOURCE_BOUNDARY", detail: "source-analysis.json", checks: "source-audit-v1.json" },
        candidateGate: { status: "NO_CANDIDATE_QUALIFIED", codeChanged: false,
            reason: "Tiny cold-path inputs plus array-versus-enumerable join tradeoff do not support automatic ToArray removal." },
        nativeGate: { status: "NOT_ACTIVATED_AFTER_SOURCE_NO_CANDIDATE", explicitGoReceived: true,
            goReceipt: "registry-GO212.json", builds: 0, tests: 0, restores: 0, compilerInvocations: 0,
            assertionsReached: 0, runtimeCorrectnessVerified: false },
        sourceArtifactAudit: { passed: audit.checks.length, failed: 0, roleRawGitBlobsVerified: 54 },
        repositoryPreservation: { status: "PASSED", detail: "reserved-checkout-preservation.json" },
        relatedWorkAndHistory: { status: "BOUNDED_READS_COMPLETE", detail: "source-analysis.json" }
    },
    primaryEvidence: {
        sourceAndMateriality: "source-analysis.json",
        sourceRoleMemberships: "source-membership-index.json",
        historicalSourceMembership: "historical-source-membership.json",
        sdkRuntimeSourceMemberships: "runtime-source-index-v1.json",
        msbuildProducerSourceMemberships: "msbuild-source-index-v1.json",
        installedSdkMetadataNotRuntimeExecution: "installed-source-identity.json",
        changedFilesAndEmptyDiffs: "diff-index.json",
        commandIndexes: [...indexes, "terminal-command-index-v1.json"],
        launcherResults: "tool-launch-receipts.json",
        nativeAndSourceProcessState: "source-process-terminal.json",
        policyReadOnlySnapshots: "policy-snapshots",
        finalPolicyObservation: "final-policy-observation.json"
    },
    changes: {
        repositoryChangedFiles: [],
        candidateRevisions: [],
        graphsCreated: [],
        commitsPushesPullRequestsIssuesOrGithubWrites: [],
        policyRegistryLeaseLedgerOrMachineChanges: [],
        fourReservedReportsUnchanged: true
    },
    materialityAndValidationLimits: [
        "Cardinalities are source-defined shapes under tracked scalar properties, not evaluated/runtime-observed Values.",
        "No elapsed-time, allocation, profiling, counter or benchmark evidence exists, and no gain/no-gain claim is made.",
        "The pinned runtime sources describe available implementation paths; actual task-host runtime loading is not observed.",
        "No automated test was selected or started after the source gate; no failed prerequisite is disguised as a passing test.",
        "External properties/imports, explicit private targets, source-build hosts and installer upgrade execution are unverified.",
        "This bounded no-candidate decision does not assert that every possible alternative is unhelpful."
    ],
    failuresAndNonfatalReadLimits: [
        { kind: "SOURCE_HELPER_LAUNCH_FAILURE", evidence: "initial-v1-launch-failure.json",
            exitCode: 9009, detail: "Python alias unavailable; body did not run. Immutable failed helper preserved, fresh Node helper used." },
        { kind: "MISSING_OPTIONAL_INSTRUCTION_FILE", detail: "Root AGENTS.md view returned absent; pinned area instruction memberships also retained." },
        { kind: "VIEW_SIZE_LIMIT", detail: "First policy view was too large; a deliberate complete read and raw snapshots followed." }
    ],
    ownedProcessTerminalState: {
        nativeRootsStarted: 0,
        observedNativeChildren: [],
        persistentServices: [],
        nativeOwnedWorkTerminal: true,
        previousSourceCommandsWaitedAndStreamsCollected: true,
        exactSourceIdentityReceipt: "source-process-terminal.json",
        earlierPidReuseObserved: priorClassifications,
        latestObservedPriorSourceIdentities: latestClassifications,
        noProcessStops: true,
        noUniversalUnrelatedProcessOrMachineQuiescenceClaim: true,
        sourceSealerTerminalExitReportedByContainingToolInvocation: true
    },
    finalReadOnlyPolicyState: policy,
    artifactIndex: {
        algorithm: "SHA256",
        root: OUT,
        coverage: "Every assigned-root artifact existing before this HANDOFF.json is created, including immutable helpers, failed attempt, raw streams, source bytes, JSON evidence and empty diffs.",
        selfExcluded: ["HANDOFF.json"],
        files: artifacts
    }
};
const payloadBytes = Buffer.from(JSON.stringify(handoff, null, 2) + "\n");
handoff.seal = {
    algorithm: "SHA256",
    canonicalization: "Remove only top-level seal; JSON.stringify(value, null, 2) + LF encoded as UTF-8.",
    payloadSha256: hash(payloadBytes),
    artifactIndexSha256: hash(Buffer.from(JSON.stringify(handoff.artifactIndex.files))),
    immutableCreateNewWrite: true,
    signatureOrCoordinatorApproval: false
};
const finalBytes = Buffer.from(JSON.stringify(handoff, null, 2) + "\n");
put("HANDOFF.json", finalBytes);
const persistedBytes = fs.readFileSync(path.join(OUT, "HANDOFF.json"));
const persisted = JSON.parse(persistedBytes.toString("utf8"));
const persistedSeal = persisted.seal;
delete persisted.seal;
if (hash(persistedBytes) !== hash(finalBytes)
    || hash(Buffer.from(JSON.stringify(persisted, null, 2) + "\n")) !== persistedSeal.payloadSha256
    || hash(Buffer.from(JSON.stringify(persisted.artifactIndex.files))) !== persistedSeal.artifactIndexSha256) {
    throw new Error("Persisted HANDOFF seal did not verify.");
}
const remainingFiles = listFiles(OUT).filter(file => file !== "HANDOFF.json");
if (JSON.stringify(remainingFiles) !== JSON.stringify(artifacts.map(row => row.path))) {
    throw new Error("Artifact index does not cover the complete persisted assigned root.");
}
for (const artifact of artifacts) {
    const bytes = fs.readFileSync(path.join(OUT, artifact.path));
    if (bytes.length !== artifact.bytes || hash(bytes) !== artifact.sha256) {
        throw new Error("Persisted artifact changed: " + artifact.path);
    }
}
console.log(JSON.stringify({
    handoff: path.join(OUT, "HANDOFF.json"),
    fileSha256: hash(finalBytes),
    payloadSha256: handoff.seal.payloadSha256,
    artifactCount: artifacts.length,
    persistedSealAndCompleteArtifactIndexReverified: true,
    status: handoff.status,
    nativeCommands: 0,
    repositoryChangedFiles: 0
}));
