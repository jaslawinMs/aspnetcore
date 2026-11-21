import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const now = () => new Date().toISOString();
const sha = data => createHash("sha256").update(data).digest("hex").toUpperCase();
const parse = path => JSON.parse(readFileSync(join(root, path), "utf8").replace(/^\uFEFF/, ""));
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
function write(path, data) {
  const absolute = join(root, path);
  ensure(isAbsolute(absolute) && !relative(root, absolute).startsWith(".."), "Output escapes evidence root");
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, data, { flag: "wx" });
}
const json = (path, data) => write(path, JSON.stringify(data, null, 2) + "\n");
function files(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    ensure(!entry.isSymbolicLink(), `Unexpected artifact link: ${path}`);
    return entry.isDirectory() ? files(path) : [path];
  });
}
function metadata(path) {
  const raw = readFileSync(join(root, path));
  return { path, bytes: raw.length, sha256: sha(raw) };
}
function apiBody(path) {
  const text = readFileSync(join(root, path), "utf8");
  ensure(/^HTTP\/[^\r\n]+ 200 /m.test(text), `${path} has no retained HTTP 200 response`);
  for (const match of text.matchAll(/\r?\n\r?\n/g)) {
    try { return JSON.parse(text.slice(match.index + match[0].length)); } catch { }
  }
  throw new Error(`No JSON response body in ${path}`);
}

try {
  json("execution-seal-002.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid, nativeProductStarts: 0,
    operationClass: "Source/artifact verification and one bounded local process-identity snapshot; no product execution.",
    replaces: "Failed immutable seal-handoff-001.mjs is retained and is not replayed.",
  });
  const roles = parse("source-roles-002.json");
  const assessment = parse("assessment-001.json");
  const supplement = parse("assessment-supplement-002.json");
  const validation = parse("validation-and-limitations-001.json");
  const restoration = parse("reserved-restoration-005.json");
  ensure(restoration.finalReservedStateRestored && !restoration.wholePreparationNoWriteCompliance, "Incident/restoration disclosure missing");
  for (const [key, value] of Object.entries(restoration)) {
    if (key.endsWith("Baseline") || key === "recoveredFilesPreservedExactly") ensure(value === true, `Restoration invariant failed: ${key}`);
  }
  const incident = parse("reserved-artifact-path-incident-005.json");
  for (const file of incident.files) {
    ensure(!existsSync(file.source), `Owned misplaced artifact remains in reserved checkout: ${file.name}`);
    const raw = readFileSync(file.destination);
    ensure(raw.length === file.bytes && sha(raw) === file.sha256, `Recovered artifact differs: ${file.name}`);
  }
  ensure(supplement.artifactPathIncident.wholePreparationNeverTouchedReservedUntrackedContent === false, "Historical no-write violation was hidden");
  ensure(parse("launcher-001.json").exitCode === 9009 && parse("launcher-seal-001.json").exitCode === 1, "Failed attempts are not retained");
  const upstream = apiBody("receipts-002\\upstream-actual-main-get.stdout.bin");
  ensure(roles.original.commit === "37e809ead5824bc753a1c3d56f11615bdb1296c5", "Original role changed");
  ensure(upstream.ref === "refs/heads/main" && upstream.object.sha === roles.default.commit, "Default differs from independent upstream GET");
  ensure(roles.default.commit === "d3483989953ae3cccd773aea5ea04cb0c7198531", "Unexpected observed Default");
  ensure(assessment.outcome === "SOURCE_ONLY_NO_CANDIDATE" && validation.nativeProductStarts === 0 && validation.performanceExecutions === 0, "Candidate/native/performance state changed");

  const priorRoots = [];
  function addHelperRoots(version, execution, launcher, classification) {
    priorRoots.push({
      classification, receipt: `execution-${version}.json`, pid: execution.pid,
      lower: Date.parse(execution.startedUtc) - 2000, upper: Date.parse(launcher.completedUtc) + 2000,
    });
    priorRoots.push({
      classification: "Synchronous PowerShell launcher", receipt: `execution-${version}.json parentPid`, pid: execution.parentPid,
      lower: Date.parse(launcher.startedUtc) - 15000, upper: Date.parse(launcher.completedUtc) + 2000,
    });
  }
  let commandCount = 0;
  for (const version of ["002", "003", "004", "005"]) {
    const execution = parse(`execution-${version}.json`);
    const launcher = parse(`launcher-${version}.json`);
    ensure(execution.helperSha256 === sha(readFileSync(execution.helper)), `Executed helper changed: ${version}`);
    ensure(launcher.exitCode === 0, `Source/recovery helper did not finish: ${version}`);
    addHelperRoots(version, execution, launcher, "Source/recovery Node helper");
    for (const path of files(join(root, `receipts-${version}`)).filter(path => path.endsWith(".json"))) {
      const receipt = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
      ensure(["git", "gh"].includes(receipt.argv[0]) && receipt.exitCode === 0 && receipt.rootAwaited && receipt.redirectedStreamsReachedEof, `Source receipt is not successful/terminal: ${path}`);
      for (const stream of ["stdout", "stderr", "stdin"]) {
        if (receipt[stream] == null) continue;
        const raw = readFileSync(join(root, receipt[stream]));
        ensure(raw.length === receipt[`${stream}Bytes`] && sha(raw) === receipt[`${stream}Sha256`], `Stream mismatch: ${receipt[stream]}`);
      }
      priorRoots.push({
        classification: "Read-only Git/GitHub source command", receipt: relative(root, path), pid: receipt.pid,
        lower: Date.parse(receipt.startedUtc) - 2000, upper: Date.parse(receipt.completedUtc) + 2000,
      });
      commandCount++;
    }
  }
  ensure(commandCount === 48, "Unexpected read-only Git/GitHub receipt count");
  const firstSealExecution = parse("execution-seal-001.json");
  const firstSealLauncher = parse("launcher-seal-001.json");
  ensure(firstSealExecution.helperSha256 === sha(readFileSync(firstSealExecution.helper)), "Failed sealer helper was changed");
  ensure(firstSealLauncher.outerMechanicalWriterSha256 === sha(readFileSync(firstSealLauncher.outerMechanicalWriter)), "Failed outer sealer was changed");
  addHelperRoots("seal-001", firstSealExecution, firstSealLauncher, "Failed first sealing helper, awaited exit 1");
  const oldTerminal = parse("terminal-observation-001.json");
  const oldTerminalLauncher = parse("launcher-terminal-001.json");
  ensure(oldTerminal.observerScriptSha256 === sha(readFileSync(oldTerminal.observerScript)), "Executed first terminal observer changed");
  ensure(oldTerminalLauncher.exitCode === 0, "First terminal observer did not finish");
  priorRoots.push({
    classification: "First terminal observation PowerShell writer", receipt: "terminal-observation-001.json",
    pid: oldTerminal.observerPid, lower: Date.parse(oldTerminal.observerStartedUtc) - 15000,
    upper: Date.parse(oldTerminalLauncher.completedUtc) + 2000,
  });

  const powershell = join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? String.raw`C:\Windows`,
    "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const snapshotCommand = "$ErrorActionPreference='Stop'; @(Get-CimInstance -ClassName Win32_Process | ForEach-Object { [pscustomobject]@{ pid=[int]$_.ProcessId; parentPid=[int]$_.ParentProcessId; creationUtc=if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null } } }) | ConvertTo-Json -Depth 3 -Compress";
  const snapshotArgs = ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", snapshotCommand];
  const snapshotStarted = now();
  const snapshotResult = spawnSync(powershell, snapshotArgs, { cwd: root, env: process.env, encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  const snapshotOut = snapshotResult.stdout ?? Buffer.alloc(0);
  const snapshotErr = snapshotResult.stderr ?? Buffer.alloc(0);
  write("receipts-seal-002\\process-identities.stdout.bin", snapshotOut);
  write("receipts-seal-002\\process-identities.stderr.bin", snapshotErr);
  json("receipts-seal-002\\process-identities.json", {
    argv: [powershell, ...snapshotArgs], cwd: root, pid: snapshotResult.pid,
    startedUtc: snapshotStarted, completedUtc: now(), exitCode: snapshotResult.status,
    spawnError: snapshotResult.error?.message ?? null,
    stdout: "receipts-seal-002\\process-identities.stdout.bin", stderr: "receipts-seal-002\\process-identities.stderr.bin",
    stdoutBytes: snapshotOut.length, stderrBytes: snapshotErr.length,
    stdoutSha256: sha(snapshotOut), stderrSha256: sha(snapshotErr),
    environment: Object.fromEntries(["PATH", "PATHEXT", "SYSTEMROOT", "SystemRoot", "COMSPEC"].map(key => [key, process.env[key] ?? null])),
    environmentScope: "Execution-relevant allowlist; no authentication or unrelated ambient values.",
    rootAwaited: true, redirectedStreamsReachedEof: !snapshotResult.error,
    operationClass: "One local read-only PID/parent/creation-time snapshot, not performance counters or product execution.",
  });
  ensure(snapshotResult.status === 0 && !snapshotResult.error, "Process identity snapshot failed; full streams retained");
  const snapshotBody = JSON.parse(snapshotOut.toString("utf8").replace(/^\uFEFF/, ""));
  const processes = (Array.isArray(snapshotBody) ? snapshotBody : [snapshotBody]).map(item => ({ ...item, birth: Date.parse(item.creationUtc) }));
  const live = new Map();
  const rootObservations = priorRoots.map(record => {
    const matches = processes.filter(item => item.pid === record.pid && item.birth >= record.lower && item.birth <= record.upper);
    for (const item of matches) live.set(item.pid, item);
    for (const item of processes.filter(item => item.parentPid === record.pid && item.birth >= record.lower && item.birth <= record.upper)) live.set(item.pid, item);
    return {
      ...record, identityWindowStartUtc: new Date(record.lower).toISOString(),
      identityWindowEndUtc: new Date(record.upper).toISOString(), matchingLiveIdentityObserved: matches.length !== 0,
    };
  });
  let added;
  do {
    added = false;
    for (const item of processes) {
      const parent = live.get(item.parentPid);
      if (parent && item.birth >= parent.birth && !live.has(item.pid)) { live.set(item.pid, item); added = true; }
    }
  } while (added);
  json("terminal-observation-002.json", {
    observedUtc: now(), priorRecordedRootIdentities: priorRoots.length,
    readOnlyGitGithubCommands: commandCount, sourceRoots: rootObservations,
    matchingLiveOwnedRootsOrObservedDescendants: [...live.values()],
    snapshotCommand: "receipts-seal-002\\process-identities.json",
    snapshotCommandAndBothStreamsTerminal: true,
    previousFailedSealerTerminal: true, recoveryHelperTerminal: true,
    nativeProductStarts: 0, servicesStarted: 0, backgroundWork: [],
    mechanicalWriter: { pid: process.pid, parentPid: process.ppid, state: "Active only for synchronous sealing; inner/outer completion must be observed before final response." },
    limitations: ["No universal unobserved short-lived ancestry claim.", "No unrelated-process absence, machine dedication or continuing quiescence claim.", "PID identity windows distinguish currently reused PIDs; the missing Python alias has no recorded interpreter PID."],
  });
  ensure(live.size === 0, "A recorded source/recovery root or actually observed descendant survives");

  const membershipPaths = ["source-membership-002.json", "source-membership-003.json", "source-membership-004.json"];
  const members = membershipPaths.flatMap(parse);
  const identities = new Map();
  for (const member of members) {
    ensure(member.commit === (member.role === "Original" ? roles.original.commit : roles.default.commit), "Source role substitution");
    const raw = readFileSync(join(root, member.rawArtifact));
    ensure(raw.length === member.bytes && sha(raw) === member.sha256, `Source raw bytes differ: ${member.rawArtifact}`);
    const blob = member.gitBlob ?? /\bblob ([a-f0-9]{40})\t/.exec(member.gitLsTree)?.[1];
    ensure(createHash("sha1").update(`blob ${raw.length}\0`).update(raw).digest("hex") === blob, `Git blob differs: ${member.path}`);
    const key = `${member.role}:${member.path}`;
    if (identities.has(key)) ensure(identities.get(key).sha256 === member.sha256, "Duplicate role membership differs");
    identities.set(key, member);
  }
  ensure(members.length === 104 && identities.size === 102, "Unexpected source membership dimensions");
  const uniquePaths = [...new Set(members.map(member => member.path))];
  const roleDifferences = uniquePaths.filter(path => identities.get(`Original:${path}`).sha256 !== identities.get(`Default:${path}`).sha256).sort();
  ensure(JSON.stringify(roleDifferences) === JSON.stringify([...assessment.sourceRoles.roleDifferences].sort()), "Unreported role differences");
  for (const path of ["Original-candidate.diff", "Default-candidate.diff"]) ensure(statSync(join(root, path)).size === 0, "Nonempty authored candidate diff");
  const policyRaw = readFileSync(join(root, "..", "policy.json"));
  write("policy-final-006.json", policyRaw);
  const policy = JSON.parse(policyRaw.toString("utf8").replace(/^\uFEFF/, ""));
  json("source-policy-final-006.json", {
    observedUtc: now(), policySha256: sha(policyRaw),
    ownerStillRegistered: policy.independentFindingPreparationWorkers.F205 === "e2ba3013-578f-4603-8c85-a43ba9a905b5",
    activeScope: policy.activeWorkerPreparationScopes.F205,
    registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
    leaseExists: existsSync(join(root, "..", "benchmark-exclusive.lease.json")),
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive, buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
    nativeProductStarts: 0, meaning: "Point-in-time source handoff observation only, never native-start authorization.",
  });
  const revisedValidation = {
    ...validation,
    supersedesForFinalHandoff: "validation-and-limitations-001.json remains preserved",
    failuresAndRecovery: [...validation.failuresAndRecovery, {
      kind: "Reserved-root artifact path incident and failed first seal",
      nativeProductFailure: false, actualConstraintViolation: true,
      detail: supplement.artifactPathIncident.effect,
      cause: supplement.artifactPathIncident.cause,
      failureReceipts: ["seal-helper-failure-001.json", "launcher-seal-001.json", "launcher-seal-001.stderr.txt", "seal-outer-failure-001.json"],
      recoveryReceipts: ["reserved-artifact-path-incident-005.json", "reserved-restoration-005.json", "launcher-005.json"],
      recoveredFiles: incident.files,
      originalReportsPreserved: true, finalReservedStateRestored: true, wholePreparationNoWriteCompliance: false,
    }],
    terminalObservation: "terminal-observation-002.json",
    additionalBlockedAssertion: "Do not claim that the reserved root was untouched throughout preparation; final state restoration is established instead.",
  };
  json("validation-and-limitations-002.json", revisedValidation);
  const readback = files().filter(path => path.endsWith(".json")).sort().map(path => {
    JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
    return metadata(relative(root, path));
  });
  json("json-readback-003.json", {
    observedUtc: now(), count: readback.length, files: readback,
    rawSourceCopiesVerified: members.length, uniqueSourceRoleMemberships: identities.size,
    readOnlyGitGithubReceiptsVerified: commandCount,
    selfReferenceRule: "This report, HANDOFF and all later envelopes are re-read by the outer absolute-path writer.",
  });
  const handoff = {
    schemaVersion: 1, findingId: "F205", preparation: 222,
    ownerAgentId: "e2ba3013-578f-4603-8c85-a43ba9a905b5", preparedAtUtc: now(),
    state: "SEALED_SOURCE_HANDOFF_FOR_COORDINATOR", outcome: "SOURCE_ONLY_NO_CANDIDATE",
    preparationException: "DISCLOSED_RESERVED_ROOT_ARTIFACT_PATH_VIOLATION_RESTORED",
    coordinatorDisposition: { accepted: false, timed: false, published: false, campaignFinalized: false, nextActor: "Coordinator" },
    rationale: {
      realEagerWork: true,
      standardProducer: "Zero to two configured endpoint-mode families, zero to two standard provider implementations. Canonical Auto-capable samples configure both families/providers.",
      ordinaryLargestLoop: "Four builder creations, two for unsupported pairs, per initialized/refreshed data source; independent of page-route count.",
      boundary: "Lazy endpoint initialization and real metadata-update refresh, not steady-state per-request work.",
      gate: "No material effect established without prohibited workload amplification; known built-in Supports methods are type tests, but arbitrary public factory/builder/property/provider ordering safety is not proven harmless.",
      notClaimed: "Measured no-gain, zero-benefit, performance impossibility, a reproduced custom-extension break or a verified fix.",
    },
    sourceRoles: {
      original: roles.original, default: roles.default, reserved: roles.reserved,
      rolePin: metadata("source-roles-002.json"),
      upstreamFullHttpResponse: metadata("receipts-002\\upstream-actual-main-get.stdout.bin"),
      targetPath: assessment.sourceRoles.target,
      targetGitBlobBothRoles: assessment.sourceRoles.targetGitBlobBothRoles,
      targetRawBytesEach: assessment.sourceRoles.targetBytesEach, targetSha256Each: assessment.sourceRoles.targetSha256Each,
      memberships: membershipPaths.map(metadata), rawSourceCopiesVerified: members.length,
      uniqueRoleMembershipsVerified: identities.size, uniquePaths: uniquePaths.length, differences: roleDifferences,
    },
    evidence: {
      producerSemanticsHistoryMateriality: metadata("assessment-001.json"),
      mandatoryIncidentQualification: metadata("assessment-supplement-002.json"),
      validationAllFailuresLimitations: metadata("validation-and-limitations-002.json"),
      navigationAndApplicableGuidance: metadata("navigation-observations-001.json"),
      readOnlyGitGithubCommandReceipts: { directories: ["receipts-002", "receipts-003", "receipts-004", "receipts-005"], count: commandCount },
      terminalIdentityCommand: metadata("receipts-seal-002\\process-identities.json"),
      commandReceiptScope: "Full argv/stdout/stderr/stdin where applicable/exits retained; environment is an explicit execution-relevant allowlist excluding authentication and unrelated ambient values.",
    },
    implementation: {
      candidateCreated: false, privateWorktrees: [], branchesCreated: [], authoredShippingChangedFiles: [],
      implementationAcceptance: "Not entered; no candidate survived the source/materiality gate.",
      explicitEmptyAuthoredChangeDiffs: ["Original-candidate.diff", "Default-candidate.diff"].map(metadata),
      emptyDiffMeaning: "No edits authored; not comparisons against nonexistent candidate branches.",
    },
    reservedCheckoutIncident: {
      wholePreparationNoWriteCompliance: false,
      finalReservedStateRestored: true, originalFourReportsPreservedByteForByte: true,
      incident: metadata("reserved-artifact-path-incident-005.json"),
      restoration: metadata("reserved-restoration-005.json"),
      finalBaselineObservation: metadata("reserved-after-recovery-005.json"),
      recoveredOwnedFiles: incident.files,
      disclosure: supplement.artifactPathIncident.effect,
      actionRequired: "Coordinator reviews this procedural exception; do not describe the preparation as never touching reserved untracked content.",
    },
    nativeFacts: {
      productCommandReceipts: [], productStarts: 0, builds: "NOT_RUN", tests: "NOT_RUN", restores: "NOT_RUN",
      sdkOrExactHostActivatedVerified: false, runtimeImages: [], browserOrServiceStarts: 0,
      performanceExecutions: 0, benchmarkBudgetConsumed: 0, timingAuthority: false,
      blockedAssertions: [...validation.blockedAssertions, revisedValidation.additionalBlockedAssertion],
    },
    hotReload: {
      skillUsed: "support-hot-reload",
      owningMechanism: "Existing Endpoints.HotReloadService metadata-update handler -> exchanged/cancelled token -> UpdateEndpoints -> replayed component configuration -> routing change-token consumers",
      actualRuntimeDeltaExecuted: false, cachesOrHandlersAdded: false,
      relatedFix: "https://github.com/dotnet/aspnetcore/pull/63972",
    },
    terminalState: {
      observation: metadata("terminal-observation-002.json"),
      recordedPriorRootIdentities: priorRoots.length, matchingLiveRecordedRootsOrObservedDescendants: 0,
      currentSnapshotChildRootAndBothStreamsAwaited: true,
      noOwnedNativeProductWork: true, backgroundWork: [], services: [],
      mechanicalSealingBoundary: "Inner and outer sealing writers are synchronous; their actual terminal exit/EOF must be observed before the final handoff response. The outer launcher records child completion and re-verifies all artifacts.",
      limitations: ["No universal unobserved short-lived process-closure claim.", "No unrelated-process absence, continuing quiescence or machine-dedication claim."],
      policyObservation: metadata("source-policy-final-006.json"),
    },
    artifactIntegrity: {
      fullArtifactByteSha256Index: "ARTIFACT-INDEX-002.json", finalSeal: "SEAL-002.json",
      initialReadback: "json-readback-003.json", postHandoffReadback: "json-readback-004.json",
      selfReferenceRule: "Full index excludes only itself and SEAL. SEAL records exact HANDOFF/index bytes and SHA256; final tool output supplies envelope digests. Both envelopes and all generated JSON are re-read before terminal success.",
    },
    authorityLimits: "No commits, pushes, PRs/issues/reviews, shared campaign changes, remote/Azure work, subagents, services, benchmarks, publication or campaign finalization.",
  };
  json("HANDOFF.json", handoff);
  parse("HANDOFF.json");
  json("seal-helper-completed-002.json", {
    completedUtc: now(), handoff: metadata("HANDOFF.json"), readOnlyGitGithubReceipts: commandCount,
    rawSourceCopiesVerified: members.length, nativeProductStarts: 0,
    remainingMechanicalStep: "Outer absolute-path writer records this helper's actual exit/EOF, emits full artifact index/SEAL, re-reads all JSON, verifies the full set and terminates before final response.",
  });
  console.log(JSON.stringify({ handoff: metadata("HANDOFF.json"), priorRootIdentities: priorRoots.length, matchingLivePriorRootsOrObservedDescendants: 0, nativeProductStarts: 0, reservedStateRestored: true, historicalNoWriteCompliance: false }, null, 2));
} catch (error) {
  json("seal-helper-failure-002.json", { failedAtUtc: now(), type: error.name, message: error.message, nativeProductStarts: 0 });
  throw error;
}
