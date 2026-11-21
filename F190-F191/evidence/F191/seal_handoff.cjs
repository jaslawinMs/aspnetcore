const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = __dirname;
const REPO = String.raw`C:\src\aspnetcore`;
const OWNER = 'e051f4ea-f79b-4489-a81a-f4dac19b087d';
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GH_PAGER: '', PAGER: '' };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const readJson = relative => JSON.parse(read(relative).toString('utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const commands = [];
function save(relative, bytes) {
  const destination = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx' });
  return relative;
}
function json(relative, value) { return save(relative, JSON.stringify(value, null, 2) + '\n'); }
function git(label, args) {
  const argv = ['git', '-C', REPO, '--no-pager', ...args];
  const result = cp.spawnSync(argv[0], argv.slice(1), {
    cwd: REPO, env, encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
  });
  const stdout = result.stdout || Buffer.alloc(0);
  const stderr = result.stderr || Buffer.alloc(0);
  commands.push({
    label, argv, cwd: REPO, exitCode: result.status,
    stdout: save(path.join('final', label + '.stdout'), stdout),
    stderr: save(path.join('final', label + '.stderr'), stderr),
  });
  assert(!result.error && result.status === 0, label + ' failed');
  return stdout;
}
function fileBinding(relative) {
  const data = read(relative);
  return { path: relative, bytes: data.length, sha256: sha(data) };
}
function allFiles(directory = ROOT, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap(entry => {
      assert(!entry.isSymbolicLink(), 'Unexpected symbolic link in owned output');
      const relative = path.join(prefix, entry.name);
      return entry.isDirectory() ? allFiles(path.join(directory, entry.name), relative) : [relative];
    });
}

function main() {
  assert(path.resolve(process.cwd()) === path.resolve(ROOT), 'Wrong cwd');
  const roles = readJson('SOURCE_ROLES.json');
  const initial = readJson('reserved-initial.json');
  const analysis = readJson('RESULT_ANALYSIS.json');
  const callers = readJson('CANONICAL_CALLERS-002.json');
  const sources = readJson('SOURCE_FILES.json');
  const validations = [];

  for (const source of sources) {
    const bytes = read(source.artifact);
    assert(bytes.length === source.bytes && sha(bytes) === source.sha256, 'Source bytes changed: ' + source.artifact);
  }
  validations.push({ check: 'All raw role/guidance bytes match SOURCE_FILES.json', passed: true, entries: sources.length });

  const corePaths = [
    'src/Components/Analyzers/test/Verifiers/DiagnosticVerifier.cs',
    'src/Components/Analyzers/test/Helpers/DiagnosticVerifier.Helper.cs',
    'src/Components/Analyzers/test/Verifiers/CodeFixVerifier.cs',
    'src/Components/Analyzers/test/Helpers/CodeFixVerifier.Helper.cs',
  ];
  const coreBindings = corePaths.map(repositoryPath => {
    const original = sources.find(item => item.role === 'Original' && item.repositoryPath === repositoryPath);
    const currentDefault = sources.find(item => item.role === 'Default' && item.repositoryPath === repositoryPath);
    assert(original && currentDefault && original.sha256 === currentDefault.sha256, 'Core producer/consumer changed across roles: ' + repositoryPath);
    return { repositoryPath: repositoryPath.replaceAll('/', '\\'), Original: original, Default: currentDefault };
  });
  validations.push({ check: 'All four verifier/helper files are byte-identical across Original and Default', passed: true });

  for (const role of ['Original', 'Default']) {
    const summary = callers.summaries.find(item => item.role === role);
    const actual = callers.calls.filter(call => call.role === role && call.feedsTargetVerifier)
      .map(call => `${call.file}:${call.line}`).sort();
    const literal = read(`commands\\${role}-analyzers-caller-literals.stdout`).toString('utf8')
      .split(/\r?\n/).flatMap(line => {
        const match = line.match(/^[a-f0-9]+:(.+?):(\d+):(.*)$/);
        if (!match || !/\bVerify(?:CSharp|Basic)Diagnostic\s*\(/.test(match[3]) ||
          match[1].endsWith('/Verifiers/DiagnosticVerifier.cs')) return [];
        return [`${match[1].replaceAll('/', '\\')}:${match[2]}`];
      }).sort();
    assert(JSON.stringify(actual) === JSON.stringify(literal), role + ' source caller coverage mismatch');
    assert(summary.unresolvedExpectedCountCallSites.length === 0, role + ' has unresolved expected count');
    assert(summary.minimumExpectedCountSourceOnly === 0 && summary.maximumExpectedCountSourceOnly === 4,
      role + ' population source expectation differs');
    validations.push({
      check: role + ' canonical invocation inventory equals every bounded caller-literal location',
      passed: true, callSites: actual.length, unresolvedExpectedCounts: 0,
      limitation: 'Source coverage, not compiler test discovery or runtime evidence.',
    });
  }
  const original = callers.summaries.find(item => item.role === 'Original');
  const currentDefault = callers.summaries.find(item => item.role === 'Default');
  assert(original.targetCallSites === 189 && currentDefault.targetCallSites === 201, 'Unexpected source call-site count');

  const branch = git('reserved-final-branch', ['symbolic-ref', '--short', 'HEAD']).toString().trim();
  const head = git('reserved-final-head', ['rev-parse', 'HEAD']).toString().trim();
  const status = git('reserved-final-status', ['status', '--porcelain=v1', '--untracked-files=all'])
    .toString().trimEnd().split(/\r?\n/);
  const worktreeDiff = git('reserved-final-worktree-diff', ['diff', '--binary', '--no-ext-diff']);
  const indexDiff = git('reserved-final-index-diff', ['diff', '--cached', '--binary', '--no-ext-diff']);
  const reports = initial.untrackedReports.map(report => {
    const bytes = fs.readFileSync(path.join(REPO, report.path));
    assert(bytes.length === report.bytes && sha(bytes) === report.sha256, 'Inherited report bytes changed: ' + report.path);
    return { ...report, unchanged: true };
  });
  assert(branch === initial.branch && head === initial.head, 'Reserved branch/HEAD changed');
  assert(JSON.stringify(status) === JSON.stringify(initial.status), 'Reserved status changed');
  assert(worktreeDiff.length === 0 && indexDiff.length === 0, 'Reserved tracked diff is nonempty');
  const reservedFinal = {
    observedAtUtc: new Date().toISOString(), branch, head, status,
    trackedDiffBytes: worktreeDiff.length, stagedDiffBytes: indexDiff.length,
    untrackedReports: reports, initialSnapshot: 'reserved-initial.json',
    unchangedAgainstInitial: true,
  };
  json('reserved-final.json', reservedFinal);
  validations.push({ check: 'Reserved branch, HEAD, status and four inherited report bytes unchanged', passed: true });

  const defaultObservation = git('upstream-default-final', ['ls-remote', '--symref', 'origin', 'HEAD']).toString();
  const finalDefault = defaultObservation.trim().split(/\r?\n/)
    .find(line => line.endsWith('\tHEAD') && !line.startsWith('ref:')).split(/\s+/)[0];
  assert(finalDefault === roles.default, 'Upstream moved; do not silently relabel frozen Default evidence');
  validations.push({ check: 'Fresh upstream HEAD still equals frozen observed Default', passed: true, commit: finalDefault });
  json('final/COMMANDS.json', commands);

  const policy = fs.readFileSync(path.join(ROOT, '..', 'policy.json'));
  save('governance-final-policy.json', policy);
  const policyObject = JSON.parse(policy);
  const governance = {
    observedAtUtc: new Date().toISOString(), policySha256: sha(policy),
    findingOwner: policyObject.independentFindingPreparationWorkers?.F191,
    findingScope: policyObject.activeWorkerPreparationScopes?.F191,
    registeredOwners: Object.keys(policyObject.independentFindingPreparationWorkers || {}).length,
    maximumRegisteredPreparationOwners: policyObject.maximumRegisteredPreparationOwners,
    actualWorkerBuildHoldActive: policyObject.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policyObject.buildAndTestWorkQuiesced,
    actualBenchmarkExclusiveLeaseExists: fs.existsSync(path.join(ROOT, '..', 'benchmark-exclusive.lease.json')),
    nativeStartRequested: false, nativeStartCount: 0,
  };
  assert(governance.findingOwner === OWNER && governance.registeredOwners <= 4, 'Current registration differs');
  json('governance-final-observation.json', governance);
  validations.push({ check: 'Current F191 owner replaces retired slot within maximum four registered owners', passed: true });
  const privateGraphs = [String.raw`C:\src\ap-F191-o204`, String.raw`C:\src\ap-F191-d204`]
    .map(graph => ({ path: graph, exists: fs.existsSync(graph), createdByThisTask: false }));
  assert(privateGraphs.every(graph => !graph.exists), 'Unexpected private F191 graph exists');
  validations.push({ check: 'No private graph needed or created', passed: true });
  json('SOURCE_QUALIFICATION_CHECKS.json', {
    boundary: 'Read-only provenance/source qualification, not product tests or a red/green bug-fix verification.',
    allPassed: true, validations,
  });

  save('changes-Original.patch', Buffer.alloc(0));
  save('changes-Default.patch', Buffer.alloc(0));
  const diffs = {
    candidateCreated: false,
    explanation: 'Zero-byte source-change patches mean no proposed edits; they are not candidate graphs/images or a measured comparison.',
    sourceRoleBindings: coreBindings,
    originalProposedChanges: fileBinding('changes-Original.patch'),
    defaultProposedChanges: fileBinding('changes-Default.patch'),
    upstreamVerifierAndProducerDiff: fileBinding('commands\\Original-to-Default-verifier-diff.stdout'),
    upstreamAnalyzerAreaDiff: fileBinding('commands\\Original-to-Default-analyzers-diff.stdout'),
    defaultToReservedTargetDiff: fileBinding('commands\\Default-to-Reserved-target-diff.stdout'),
  };
  assert(diffs.upstreamVerifierAndProducerDiff.bytes === 0 && diffs.defaultToReservedTargetDiff.bytes === 0,
    'Unexpected core source delta');
  json('DIFF_INDEX.json', diffs);
  const sourceRoleCounts = Object.fromEntries(['Original', 'Default', 'ReservedGuidance'].map(role => [
    role, sources.filter(source => source.role === role).length,
  ]));
  const handoff = {
    schemaVersion: 1, findingId: 'F191', preparation: 204, owner: OWNER,
    sealedAtUtc: new Date().toISOString(), status: 'complete-no-candidate',
    decision: analysis.decision, reasonCode: analysis.reasonCode, summary: analysis.summary,
    requestedAcceptance: 'ACCEPTANCE.json',
    acceptanceResult: 'F191 no-candidate source-qualification branch satisfied; no behavioral fix or runtime test pass is claimed.',
    analysis: 'RESULT_ANALYSIS.json',
    sourceRoles: { ...roles, finalDefault, freshHeadUnchanged: true },
    rawEvidence: {
      sourceIndex: 'SOURCE_FILES.json', sourceRoleCounts,
      sourceCommands: 'COMMANDS-complete.json',
      canonicalCallers: 'CANONICAL_CALLERS-002.json',
      originalCanonicalCallSites: original.targetCallSites,
      defaultCanonicalCallSites: currentDefault.targetCallSites,
      sourceExpectationRange: [0, 4], runtimeDiagnosticCountsObserved: false,
      lspEvidence: ['LSP_EVIDENCE.json', 'LSP_EVIDENCE-002.json'],
      externalResources: 'external\\RESOURCES.json', externalCommands: 'external\\COMMANDS.json',
      historyCommands: 'history-detail\\COMMANDS.json',
      relatedUnmergedPrPatches: 'history-detail\\current-related-pr-67969-verifier-patches.stdout',
      qualificationChecks: 'SOURCE_QUALIFICATION_CHECKS.json',
      diffIndex: 'DIFF_INDEX.json', hashIndex: 'HASH_INDEX.json',
    },
    privateGraphs,
    candidate: { created: false, sourceChanges: 0, testChanges: 0, emptyPatchesAreNoChangesNotCandidateImages: true },
    nativeAndTests: analysis.nativeAndTests,
    materialityAndPerformanceLimits: analysis.materialityAndPerformanceLimits,
    preservedAttemptsAndLimits: analysis.preservedAttemptsAndLimits,
    processDisposition: {
      ownedNativeBuildTestRoots: [], observedOwnedNativeBuildTestChildren: [],
      ownedNativeBuildTestStreams: [], allOwnedNativeWorkTerminal: true,
      nativeLaunches: 0, comparisons: 0, closedBudgetsPreserved: true,
      readOnlyCollectors: 'All git/gh children use synchronous spawnSync with captured stdout/stderr. Collector shells 4420,4435,4436,4447,4448,4450 completed exit0. Python launch4414 completed exit9009 without starting its script. No persistent helper was started.',
      universalUnrelatedProcessInactivityClaim: false,
    },
    governance: { initial: 'governance-initial-observation.json', final: governance, sharedGovernanceWrittenByThisTask: false },
    reservedWorktree: { initial: 'reserved-initial.json', final: 'reserved-final.json', unchangedAgainstInitial: true },
    exclusions: [
      'No runtime population, passing analyzer suite, performance, allocation or exact loaded-runtime claim.',
      'No native build/test, restore/install, private graph, benchmark-like workload or browser execution.',
      'No remote/API write, publication, commit/push/PR/issue, policy/registry/lease/ledger or machine change.',
      'No other finding scope, public API/default/convention, cache, IVT/UnsafeAccessor, manifest or unrelated source change.',
    ],
  };
  json('HANDOFF.json', handoff);
  save('HANDOFF.sha256', `${sha(read('HANDOFF.json'))}  HANDOFF.json\n`);
  const excluded = ['HASH_INDEX.json', 'HASH_INDEX.sha256'];
  const files = allFiles().filter(relative => !excluded.includes(relative)).map(fileBinding);
  json('HASH_INDEX.json', {
    algorithm: 'SHA-256', pathBase: ROOT, sourceRoles: roles,
    includes: 'Every owned output file, including complete raw source/default evidence, command stdout/stderr, failed/superseded attempts, handoff and empty source-change patches.',
    exclusionsForSelfReferenceOnly: excluded, files,
  });
  const indexHash = sha(read('HASH_INDEX.json'));
  save('HASH_INDEX.sha256', `${indexHash}  HASH_INDEX.json\n`);
  for (const binding of files) {
    const bytes = read(binding.path);
    assert(bytes.length === binding.bytes && sha(bytes) === binding.sha256, 'Sealed file mismatch: ' + binding.path);
  }
  assert(JSON.parse(read('HANDOFF.json')).status === 'complete-no-candidate', 'Handoff readback failed');
  console.log(JSON.stringify({
    status: handoff.status, handoff: path.join(ROOT, 'HANDOFF.json'),
    handoffSha256: sha(read('HANDOFF.json')), indexSha256: indexHash,
    indexedFilesVerified: files.length, nativeStarts: 0, comparisons: 0,
    reservedWorktreeUnchanged: true,
  }, null, 2));
}

try { main(); } catch (error) {
  const destination = 'SEAL_FAILED.json';
  if (!fs.existsSync(path.join(ROOT, destination))) json(destination, { error: String(error), commands });
  console.error(error);
  process.exitCode = 1;
}
