import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const now = () => new Date().toISOString();
const sha = data => createHash("sha256").update(data).digest("hex").toUpperCase();
const parse = path => JSON.parse(readFileSync(join(root, path), "utf8").replace(/^\uFEFF/, ""));
const writeJson = (path, data) => writeFileSync(join(root, path), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
function files(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected artifact link: ${path}`);
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
  writeJson("execution-seal-001.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid,
    operationClass: "Synchronous artifact/source-byte integrity sealing only; no child process or native product command.",
    nativeProductStarts: 0,
  });
  const roles = parse("source-roles-002.json");
  const assessment = parse("assessment-001.json");
  const validation = parse("validation-and-limitations-001.json");
  const terminal = parse("terminal-observation-001.json");
  const terminalLauncher = parse("launcher-terminal-001.json");
  const invariants = parse("reserved-invariants-004.json");
  const upstream = apiBody("receipts-002\\upstream-actual-main-get.stdout.bin");
  ensure(roles.original.commit === "37e809ead5824bc753a1c3d56f11615bdb1296c5", "Original role changed");
  ensure(upstream.ref === "refs/heads/main" && upstream.object.sha === roles.default.commit, "Default pin does not match independent upstream GET");
  ensure(roles.default.commit === "d3483989953ae3cccd773aea5ea04cb0c7198531", "Unexpected observed Default");
  ensure(roles.reserved.head === "24875ef5dabb55567870b39f6eb0002170435e2f", "Reserved checkout identity changed");
  ensure(assessment.outcome === "SOURCE_ONLY_NO_CANDIDATE", "Unexpected candidate state");
  ensure(validation.nativeProductStarts === 0 && validation.performanceExecutions === 0, "Native/performance work is not zero");
  ensure(terminal.nativeProductStarts === 0 && terminal.matchingLiveOwnedRootsOrObservedDescendants.length === 0, "Owned source work was not terminal at observation");
  ensure(terminalLauncher.exitCode === 0, "Terminal observer did not complete successfully");
  for (const [key, value] of Object.entries(invariants)) {
    if (key.endsWith("Unchanged")) ensure(value === true, `Reserved invariant failed: ${key}`);
  }
  ensure(invariants.untrackedCount === 4 && invariants.authoredChangedFiles.length === 0 && invariants.privateWorktreesCreated.length === 0, "Unexpected reserved/candidate state");
  ensure(parse("launcher-001.json").exitCode === 9009, "Missing preserved Python alias failure");

  let commandCount = 0;
  for (const version of ["002", "003", "004"]) {
    const execution = parse(`execution-${version}.json`);
    ensure(execution.helperSha256 === sha(readFileSync(execution.helper)), `Executed helper changed: ${version}`);
    ensure(parse(`launcher-${version}.json`).exitCode === 0, `Source helper did not complete: ${version}`);
    for (const path of files(join(root, `receipts-${version}`)).filter(path => path.endsWith(".json"))) {
      const receipt = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
      ensure(["git", "gh"].includes(receipt.argv[0]), `Unexpected source executable: ${receipt.argv[0]}`);
      ensure(receipt.exitCode === 0 && receipt.rootAwaited && receipt.redirectedStreamsReachedEof, `Nonterminal source command: ${path}`);
      for (const stream of ["stdout", "stderr", "stdin"]) {
        if (receipt[stream] == null) continue;
        const raw = readFileSync(join(root, receipt[stream]));
        ensure(raw.length === receipt[`${stream}Bytes`] && sha(raw) === receipt[`${stream}Sha256`], `Stream mismatch: ${receipt[stream]}`);
      }
      commandCount++;
    }
  }
  ensure(commandCount === 42 && terminal.successfulSourceCommandReceipts === commandCount, "Source command receipt count mismatch");
  ensure(terminal.observerScriptSha256 === sha(readFileSync(terminal.observerScript)), "Executed terminal observer changed");
  const membershipPaths = ["source-membership-002.json", "source-membership-003.json", "source-membership-004.json"];
  const members = membershipPaths.flatMap(path => parse(path));
  const identities = new Map();
  for (const member of members) {
    ensure(member.commit === (member.role === "Original" ? roles.original.commit : roles.default.commit), "Source membership role substitution");
    ensure(member.present !== false, `Expected source path absent: ${member.path}`);
    const raw = readFileSync(join(root, member.rawArtifact));
    ensure(raw.length === member.bytes && sha(raw) === member.sha256, `Source byte mismatch: ${member.rawArtifact}`);
    const blob = member.gitBlob ?? /\bblob ([a-f0-9]{40})\t/.exec(member.gitLsTree)?.[1];
    const actualBlob = createHash("sha1").update(`blob ${raw.length}\0`).update(raw).digest("hex");
    ensure(actualBlob === blob, `Git blob mismatch: ${member.path}`);
    const identity = `${member.role}:${member.path}`;
    if (identities.has(identity)) ensure(identities.get(identity).sha256 === member.sha256, `Duplicate membership differs: ${identity}`);
    identities.set(identity, member);
  }
  const uniquePaths = [...new Set(members.map(member => member.path))];
  ensure(uniquePaths.length === 51 && identities.size === 102, "Pinned source trace dimensions changed");
  const roleDifferences = uniquePaths.filter(path =>
    identities.get(`Original:${path}`).sha256 !== identities.get(`Default:${path}`).sha256).sort();
  ensure(JSON.stringify(roleDifferences) === JSON.stringify([...assessment.sourceRoles.roleDifferences].sort()), "Unreported source-role differences");
  for (const path of ["Original-candidate.diff", "Default-candidate.diff"]) ensure(statSync(join(root, path)).size === 0, "Authored candidate diff is not empty");
  const related = apiBody("receipts-003\\related-source-pr-search.stdout.bin");
  ensure(related.total_count === 3 && !related.incomplete_results, "Related-work search receipt summary mismatch");

  const jsonReadback = files().filter(path => path.endsWith(".json")).sort().map(path => {
    JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
    return metadata(relative(root, path));
  });
  writeJson("json-readback-001.json", {
    observedUtc: now(), operation: "Re-read and parsed every existing generated JSON artifact before HANDOFF creation",
    files: jsonReadback, count: jsonReadback.length,
    selfReferenceRule: "This report, the subsequently written HANDOFF/envelope and final launcher receipt are parsed again by the outer sealing script.",
    sourceRawByteCopiesVerified: members.length, uniqueSourceRoleMembershipsVerified: identities.size,
    sourceCommandStreamsVerified: commandCount, nativeProductCommands: 0,
  });
  const handoff = {
    schemaVersion: 1,
    findingId: "F205",
    preparation: 222,
    ownerAgentId: "e2ba3013-578f-4603-8c85-a43ba9a905b5",
    preparedAtUtc: now(),
    state: "SEALED_SOURCE_HANDOFF_FOR_COORDINATOR",
    outcome: "SOURCE_ONLY_NO_CANDIDATE",
    sourceBoundary: "Commit-pinned source/history and explicit extension contracts only; no dynamic correctness or materiality claim",
    coordinatorDisposition: { accepted: false, timed: false, published: false, campaignFinalized: false, nextActor: "Coordinator" },
    rationale: {
      realEagerWork: true,
      standardProducer: "Zero to two configured endpoint-mode families and zero to two standard provider implementations; canonical Auto-capable samples configure both families/providers.",
      ordinaryLargestLoop: "Four builder creations, of which two correspond to unsupported pairs, per initialized/refreshed data source; independent of page-route count.",
      boundary: "Lazy endpoint initialization and actual metadata-update refresh, not steady-state per-request work.",
      gate: "No material effect established without prohibited workload amplification. Known built-in Supports methods are type tests; arbitrary public builder/factory/property/provider order safety is unverified.",
      claimLimits: "Not measured no-gain, zero-benefit, performance-impossibility, a reproduced compatibility break or a verified fix.",
    },
    sourceRoles: {
      original: roles.original,
      default: roles.default,
      reserved: roles.reserved,
      rolesReceipt: metadata("source-roles-002.json"),
      upstreamFullHttpResponse: metadata("receipts-002\\upstream-actual-main-get.stdout.bin"),
      targetPath: assessment.sourceRoles.target,
      targetGitBlobBothRoles: assessment.sourceRoles.targetGitBlobBothRoles,
      targetRawBytesEach: assessment.sourceRoles.targetBytesEach,
      targetSha256Each: assessment.sourceRoles.targetSha256Each,
      membershipManifests: membershipPaths.map(metadata),
      rawSourceCopiesVerified: members.length,
      uniqueRoleMembershipsVerified: identities.size,
      uniquePathsVerified: uniquePaths.length,
      changedPathsBetweenRoles: roleDifferences,
    },
    detailedEvidence: {
      producerSemanticsHistoryMateriality: metadata("assessment-001.json"),
      validationFailuresLimitations: metadata("validation-and-limitations-001.json"),
      navigationAndApplicableGuidance: metadata("navigation-observations-001.json"),
      sourceCommandReceipts: { directories: ["receipts-002", "receipts-003", "receipts-004"], count: commandCount, fullArgvStreamsExitsRetained: true, environmentScope: "Explicit execution-relevant allowlist; authentication and unrelated ambient values excluded." },
    },
    implementation: {
      candidateCreated: false, privateWorktrees: [], branchesCreated: [], authoredChangedFiles: [],
      acceptanceForImplementation: "Not entered; source/materiality gate rejected candidate preparation before any shipping edit.",
      explicitEmptyAuthoredChangeDiffs: ["Original-candidate.diff", "Default-candidate.diff"].map(metadata),
      emptyDiffMeaning: "No edits authored; not a comparison of nonexistent candidate branches.",
      reservedUnchanged: metadata("reserved-invariants-004.json"),
      reservedBefore: metadata("reserved-before-002.json"),
      reservedAfter: metadata("reserved-after-004.json"),
      fourUntrackedReportsUnchanged: true,
    },
    nativeFacts: {
      productCommandReceipts: [], productStarts: 0, builds: "NOT_RUN", tests: "NOT_RUN", restores: "NOT_RUN",
      sdkActivatedOrGraphSdkHostVerified: false, runtimeImages: [], browserOrServiceStarts: 0,
      performanceExecutions: 0, benchmarkBudgetConsumed: 0, timingAuthority: false,
      blockedAssertions: validation.blockedAssertions,
    },
    hotReload: {
      skillUsed: "support-hot-reload",
      owningMechanism: "Existing Endpoints.HotReloadService metadata-update handler -> exchanged/cancelled change token -> UpdateEndpoints -> replayed component configuration -> routing change-token consumers",
      actualRuntimeDeltaExecuted: false, cachesOrHandlersAdded: false,
      relatedFix: "https://github.com/dotnet/aspnetcore/pull/63972",
    },
    ownershipAndTerminalState: {
      priorSourceWorkObservation: metadata("terminal-observation-001.json"),
      terminalObserverLauncher: metadata("launcher-terminal-001.json"),
      priorRootIdentitiesObserved: terminal.recordedPriorSourceRootIdentities,
      survivingMatchingRecordedRootsOrObservedDescendants: 0,
      backgroundWork: [], services: [], nativeProductWork: [],
      mechanicalSealing: "This synchronous artifact writer and its launcher must finish successfully before handoff emission; outer launcher records actual child exit/EOF and completes artifact index, seal and final JSON readback.",
      limitations: terminal.limitations,
      finalPolicyObservation: metadata("source-policy-final-004.json"),
      policyObservationsArePointInTimeOnly: true,
      sharedPolicyRegistryLeaseCampaignWrites: false,
    },
    failures: validation.failuresAndRecovery,
    artifactIntegrity: {
      fullArtifactByteSha256Index: "ARTIFACT-INDEX-001.json",
      finalSeal: "SEAL-001.json",
      jsonReadbackBeforeHandoff: "json-readback-001.json",
      jsonReadbackAfterHandoff: "json-readback-002.json",
      selfReferenceRule: "Full index covers all retained files except the index and SEAL envelopes themselves. SEAL records exact HANDOFF/index bytes and SHA256; final tool output also supplies envelope digests. Both envelopes are re-read after creation.",
      finalStep: "Outer synchronous sealer re-reads all generated JSON, checks every indexed file, and returns terminal exit 0 before final response.",
    },
    authorityLimits: "No commits, pushes, PRs/issues/reviews, shared campaign changes, remote/Azure work, subagents, services, benchmarks, publication or campaign finalization.",
  };
  writeJson("HANDOFF.json", handoff);
  JSON.parse(readFileSync(join(root, "HANDOFF.json"), "utf8"));
  writeJson("seal-helper-completed-001.json", {
    completedUtc: now(), sourceRawCopiesVerified: members.length, uniqueRoleMemberships: identities.size,
    sourceCommandReceiptsVerified: commandCount, nativeProductStarts: 0,
    handoff: metadata("HANDOFF.json"),
    remainingMechanicalStep: "Outer sealer records actual helper exit/streams and emits/verifies full artifact index and SEAL; no product work remains.",
  });
  console.log(JSON.stringify({ handoff: metadata("HANDOFF.json"), sourceCommandReceipts: commandCount, rawSourceCopiesVerified: members.length, nativeProductStarts: 0 }, null, 2));
} catch (error) {
  writeJson("seal-helper-failure-001.json", { failedAtUtc: now(), type: error.name, message: error.message, nativeProductStarts: 0 });
  throw error;
}
