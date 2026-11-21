const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ROOT = __dirname;
const REPO = String.raw`C:\src\aspnetcore`;
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GH_PAGER: '', PAGER: '' };
const commands = [];
const blobs = [];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function save(relative, bytes) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relative)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relative), bytes, { flag: 'wx' });
  return relative;
}
function json(relative, value) { return save(relative, JSON.stringify(value, null, 2) + '\n'); }
function run(label, argv) {
  const result = cp.spawnSync(argv[0], argv.slice(1), {
    cwd: REPO, env, encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
  });
  const stdout = result.stdout || Buffer.alloc(0);
  const stderr = result.stderr || Buffer.alloc(0);
  commands.push({
    label, argv, exitCode: result.status,
    stdout: save(path.join('history-detail', label + '.stdout'), stdout),
    stderr: save(path.join('history-detail', label + '.stderr'), stderr),
  });
  if (result.error || result.status !== 0) throw new Error(label + ' failed: ' + result.error);
  return stdout;
}
try {
  const initial = '18b9a70dbe356dfebae2f42e1c129b50b71055f1';
  const oldPaths = [
    'test/Microsoft.AspNetCore.Blazor.Analyzers.Test/Helpers/DiagnosticVerifier.Helper.cs',
    'test/Microsoft.AspNetCore.Blazor.Analyzers.Test/Verifiers/DiagnosticVerifier.cs',
  ];
  run('initial-paths', ['git', '-C', REPO, '--no-pager', 'ls-tree', '-r', '--name-only', initial, '--', ...oldPaths]);
  for (const [index, repositoryPath] of oldPaths.entries()) {
    const bytes = run('initial-source-' + index, ['git', '-C', REPO, '--no-pager', 'show', initial + ':' + repositoryPath]);
    blobs.push({ commit: initial, repositoryPath, bytes: bytes.length, sha256: sha(bytes) });
  }
  const currentPaths = [
    'src/Components/Analyzers/test/Verifiers/DiagnosticVerifier.cs',
    'src/Components/Analyzers/test/Helpers/DiagnosticVerifier.Helper.cs',
  ];
  for (const [label, commit] of [
    ['file-scoped-namespaces', 'a450cb69b5e4549f5515cdb057a68771f56cefd7'],
    ['xunit-assertions', '92097249f384278f5b0f5309757e5f7fff4eb917'],
    ['remove-usings', 'c85baf8db0c72ae8e68643029d514b2e737c9fae'],
  ]) {
    run(label, ['git', '-C', REPO, '--no-pager', 'show', '--format=fuller', '--no-ext-diff', commit, '--', ...currentPaths]);
  }
  const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_ROLES.json'), 'utf8'));
  run('analyzer-changes-since-original', ['git', '-C', REPO, '--no-pager', 'log', '--format=fuller', '--name-status',
    roles.original + '..' + roles.default, '--', 'src/Components/Analyzers']);
  run('current-related-pr-67969', ['gh', 'api', 'repos/dotnet/aspnetcore/pulls/67969', '--jq',
    '{number,title,state,merged_at,html_url,body,head:.head.sha,base:.base.sha}']);
  run('current-related-pr-67969-files', ['gh', 'api', 'repos/dotnet/aspnetcore/pulls/67969/files?per_page=100', '--jq',
    '[.[]|{filename,status,additions,deletions}]']);
  json('history-detail/BLOBS.json', blobs);
  json('history-detail/COMMANDS.json', commands);
  console.log(JSON.stringify({ readOnlyCommands: commands.length, initialSourceBlobs: blobs.length }));
} catch (error) {
  json('history-detail/FAILED.json', { error: String(error), commands, blobs });
  console.error(error);
  process.exitCode = 1;
}
