const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = __dirname;
const REPO = String.raw`C:\src\aspnetcore`;
const BASELINE = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const EXPECTED_HEAD = '24875ef5dabb55567870b39f6eb0002170435e2f';
const EXPECTED_BRANCH = 'autoperf/F145-hoist-large-response-utf8-encoding';
const EXPECTED_REPORTS = [
  'autoperf-issue-70219-deduplicated-report.html',
  'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md',
  'performance-antipattern-findings.md',
];
const ENV = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GH_PAGER: '', PAGER: '' };
const COMMANDS = [];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function save(relative, data) {
  const destination = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data, { flag: 'wx' });
  return relative;
}

function saveJson(relative, value) {
  return save(relative, JSON.stringify(value, null, 2) + '\n');
}

function run(label, argv, allowFailure = false) {
  const result = cp.spawnSync(argv[0], argv.slice(1), {
    cwd: REPO, env: ENV, encoding: null, maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = result.stdout || Buffer.alloc(0);
  const stderr = result.stderr || Buffer.alloc(0);
  COMMANDS.push({
    label, argv, cwd: REPO, exitCode: result.status,
    spawnError: result.error ? String(result.error) : null,
    stdout: save(path.join('commands', label + '.stdout'), stdout),
    stderr: save(path.join('commands', label + '.stderr'), stderr),
  });
  if ((result.error || result.status !== 0) && !allowFailure) {
    throw new Error(`${label} exited ${result.status}; raw streams preserved`);
  }
  return { ...result, stdout, stderr };
}

function git(label, args, allowFailure = false) {
  return run(label, ['git', '-C', REPO, '--no-pager', ...args], allowFailure);
}

function reservedSnapshot() {
  const branch = git('reserved-initial-branch', ['symbolic-ref', '--short', 'HEAD']).stdout.toString().trim();
  const head = git('reserved-initial-head', ['rev-parse', 'HEAD']).stdout.toString().trim();
  const status = git('reserved-initial-status', ['status', '--porcelain=v1', '--untracked-files=all']).stdout.toString().trimEnd().split(/\r?\n/);
  const tracked = git('reserved-initial-worktree-diff', ['diff', '--binary', '--no-ext-diff']).stdout;
  const staged = git('reserved-initial-index-diff', ['diff', '--cached', '--binary', '--no-ext-diff']).stdout;
  assert(branch === EXPECTED_BRANCH && head === EXPECTED_HEAD, 'Reserved identity changed');
  assert(tracked.length === 0 && staged.length === 0, 'Reserved tracked changes');
  assert(JSON.stringify(status.map(line => {
    assert(line.startsWith('?? '), 'Reserved status includes tracked changes');
    return line.slice(3);
  }).sort()) === JSON.stringify([...EXPECTED_REPORTS].sort()), 'Reserved untracked paths changed');
  return {
    branch, head, status, trackedDiffBytes: tracked.length, stagedDiffBytes: staged.length,
    untrackedReports: [...EXPECTED_REPORTS].sort().map(name => {
      const data = fs.readFileSync(path.join(REPO, name));
      return { path: name, bytes: data.length, sha256: sha(data) };
    }),
  };
}

function main() {
  assert(path.resolve(process.cwd()) === path.resolve(ROOT), 'Run inside the output directory');
  saveJson('reserved-initial.json', reservedSnapshot());
  const observedAtUtc = new Date().toISOString();
  const upstream = git('upstream-default-head', ['ls-remote', '--symref', 'origin', 'HEAD']).stdout.toString();
  const lines = upstream.trim().split(/\r?\n/);
  const defaultBranch = lines.find(line => line.startsWith('ref:')).split(/\s+/)[1];
  const defaultCommit = lines.find(line => line.endsWith('\tHEAD') && !line.startsWith('ref:')).split(/\s+/)[0];
  const repository = JSON.parse(run('upstream-repository', [
    'gh', 'api', 'repos/dotnet/aspnetcore', '--jq',
    '{full_name,default_branch,updated_at,pushed_at,html_url}',
  ]).stdout.toString());
  assert(defaultBranch === 'refs/heads/' + repository.default_branch, 'Default branch disagreement');
  git('upstream-object-presence', ['cat-file', '-t', defaultCommit]);
  saveJson('SOURCE_ROLES.json', {
    observedAtUtc, original: BASELINE, default: defaultCommit, defaultBranch,
    reserved: EXPECTED_HEAD,
    sourceAcquisition: 'Read-only existing local git objects; no fetch, checkout or graph creation.',
  });
  const contexts = [
    String.raw`.editorconfig`,
    String.raw`.github\instructions\components.instructions.md`,
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
    String.raw`.github\instructions\build.instructions.md`,
    String.raw`src\Components\AGENTS.md`,
    String.raw`docs\BuildFromSource.md`,
    String.raw`docs\BuildErrors.md`,
    String.raw`docs\BlazorComponentsGuidance.md`,
    String.raw`docs\CrossCuttingGuidance.md`,
    String.raw`Directory.Build.props`,
    String.raw`Directory.Build.targets`,
    String.raw`eng\Versions.props`,
    String.raw`global.json`,
    String.raw`src\Components\Directory.Build.props`,
    String.raw`src\Components\Directory.Build.targets`,
    String.raw`src\Components\build.cmd`,
    String.raw`src\Components\Analyzers\test\Directory.Build.props`,
  ];
  const sourceFiles = [];
  const missingContext = [];
  for (const [role, commit] of [['Original', BASELINE], ['Default', defaultCommit]]) {
    const tree = git(`${role}-analyzers-tree`, [
      'ls-tree', '-r', '--name-only', commit, '--', 'src/Components/Analyzers',
    ]).stdout.toString().trim().split(/\r?\n/);
    assert(tree.length > 0, 'Empty analyzer tree');
    const paths = [...new Set([...tree, ...contexts.map(item => item.replaceAll('\\', '/'))])];
    for (const [index, repositoryPath] of paths.entries()) {
      const exists = git(`${role}-exists-${String(index).padStart(3, '0')}`,
        ['cat-file', '-e', `${commit}:${repositoryPath}`], true);
      if (exists.status !== 0) {
        missingContext.push({ role, commit, repositoryPath });
        continue;
      }
      const data = git(`${role}-blob-${String(index).padStart(3, '0')}`,
        ['show', `${commit}:${repositoryPath}`]).stdout;
      const artifact = save(path.join('raw', role, repositoryPath.replaceAll('/', '\\')), data);
      sourceFiles.push({ role, commit, repositoryPath, artifact, bytes: data.length, sha256: sha(data) });
    }
  }
  for (const relative of contexts) {
    const source = path.join(REPO, relative);
    if (!fs.existsSync(source)) continue;
    const data = fs.readFileSync(source);
    const artifact = save(path.join('raw', 'ReservedGuidance', relative), data);
    sourceFiles.push({
      role: 'ReservedGuidance', commit: EXPECTED_HEAD,
      repositoryPath: relative.replaceAll('\\', '/'), artifact,
      bytes: data.length, sha256: sha(data),
    });
  }
  saveJson('SOURCE_FILES.json', sourceFiles);
  saveJson('missing-role-context.json', missingContext);
  const policy = fs.readFileSync(path.join(ROOT, '..', 'policy.json'));
  save('governance-initial-policy.json', policy);
  const governance = JSON.parse(policy);
  saveJson('governance-initial-observation.json', {
    observedAtUtc: new Date().toISOString(), policySha256: sha(policy),
    findingOwner: governance.independentFindingPreparationWorkers?.F191,
    registeredOwners: Object.keys(governance.independentFindingPreparationWorkers || {}).length,
    findingScope: governance.activeWorkerPreparationScopes?.F191,
    actualWorkerBuildHoldActive: governance.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: governance.buildAndTestWorkQuiesced,
    benchmarkExclusiveLeaseExists: fs.existsSync(path.join(ROOT, '..', 'benchmark-exclusive.lease.json')),
    nativeStartRequested: false,
  });
  const target = 'src/Components/Analyzers/test/Verifiers/DiagnosticVerifier.cs';
  const helper = 'src/Components/Analyzers/test/Helpers/DiagnosticVerifier.Helper.cs';
  for (const [role, commit] of [['Original', BASELINE], ['Default', defaultCommit]]) {
    git(`${role}-target-history`, ['log', '-20', '--follow', '--format=fuller', '--name-status', commit, '--', target]);
    git(`${role}-helper-history`, ['log', '-20', '--follow', '--format=fuller', '--name-status', commit, '--', helper]);
    git(`${role}-target-blame`, ['blame', '-L', '88,130', commit, '--', target]);
    git(`${role}-helper-blame`, ['blame', '-L', '30,103', commit, '--', helper]);
    git(`${role}-analyzers-caller-literals`, [
      'grep', '-n', '-E',
      'VerifyDiagnosticResults|GetSortedDiagnosticsFromDocuments|VerifyCSharpDiagnostic|VerifyBasicDiagnostic',
      commit, '--', 'src/Components/Analyzers',
    ], true);
    git(`${role}-repository-verifier-source-links`, [
      'grep', '-n', '-E', String.raw`DiagnosticVerifier(\.Helper)?\.cs`,
      commit, '--', '*.csproj', '*.props', '*.targets',
    ], true);
  }
  git('Original-to-Default-analyzers-diff', [
    'diff', '--no-ext-diff', '--no-renames', '--binary', BASELINE, defaultCommit,
    '--', 'src/Components/Analyzers',
  ]);
  git('Original-to-Default-verifier-diff', [
    'diff', '--no-ext-diff', '--no-renames', '--binary', BASELINE, defaultCommit,
    '--', target, helper, 'src/Components/Analyzers/test/Verifiers/CodeFixVerifier.cs',
  ]);
  git('Default-to-Reserved-target-diff', [
    'diff', '--no-ext-diff', '--no-renames', '--binary', defaultCommit, EXPECTED_HEAD,
    '--', target, helper,
  ]);
  saveJson('COMMANDS-complete.json', COMMANDS);
  console.log(JSON.stringify({
    original: BASELINE, default: defaultCommit, savedSourceFiles: sourceFiles.length,
    missingRoleContext: missingContext.length, nativeStarts: 0,
  }, null, 2));
}

try {
  main();
} finally {
  if (COMMANDS.length && !fs.existsSync(path.join(ROOT, 'COMMANDS-complete.json'))) {
    saveJson('COMMANDS-failed-002.json', COMMANDS);
  }
}
