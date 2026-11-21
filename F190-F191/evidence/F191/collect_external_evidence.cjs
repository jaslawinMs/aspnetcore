const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = __dirname;
const commands = [];
const resources = [];
const env = { ...process.env, GH_PAGER: '', PAGER: '', GIT_OPTIONAL_LOCKS: '0' };
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
function save(relative, data) {
  const destination = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data, { flag: 'wx' });
  return relative;
}
function json(relative, value) { return save(relative, JSON.stringify(value, null, 2) + '\n'); }
function gh(label, args, allowFailure = false) {
  const result = cp.spawnSync('gh', args, {
    cwd: ROOT, env, encoding: null, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  });
  const stdout = result.stdout || Buffer.alloc(0);
  const stderr = result.stderr || Buffer.alloc(0);
  commands.push({
    label, argv: ['gh', ...args], cwd: ROOT, exitCode: result.status,
    spawnError: result.error ? String(result.error) : null,
    stdout: save(path.join('external', label + '.stdout'), stdout),
    stderr: save(path.join('external', label + '.stderr'), stderr),
  });
  if ((result.error || result.status !== 0) && !allowFailure) throw new Error(label + ' failed');
  return { ...result, stdout, stderr };
}
function source(label, repo, commit, file) {
  const result = gh(label, ['api', `repos/${repo}/contents/${file}?ref=${commit}`]);
  const body = JSON.parse(result.stdout.toString());
  if (body.encoding !== 'base64') throw new Error(label + ' was not base64');
  const data = Buffer.from(body.content.replace(/\s+/g, ''), 'base64');
  const artifact = save(path.join('external', 'source', label + '.cs'), data);
  resources.push({
    label, repository: repo, commit, repositoryPath: file, url: body.html_url,
    gitBlobSha: body.sha, artifact, bytes: data.length, sha256: sha(data),
  });
}
async function main() {
  if (path.resolve(process.cwd()) !== path.resolve(ROOT)) throw new Error('Wrong cwd');
  const runtime = JSON.parse(gh('runtime-default-commit', [
    'api', 'repos/dotnet/runtime/commits/main', '--jq',
    '{sha,html_url,commit:{message:.commit.message,committer:.commit.committer}}',
  ]).stdout.toString());
  json('external/runtime-source-role.json', {
    observedAtUtc: new Date().toISOString(), repository: 'dotnet/runtime',
    commit: runtime.sha,
    limitation: 'Authoritative source inspection only, not a loaded or measured local runtime image.',
  });
  for (const name of ['ElementAt', 'Count', 'AnyAll', 'ToCollection']) {
    source(`runtime-${name}`, 'dotnet/runtime', runtime.sha,
      `src/libraries/System.Linq/src/System/Linq/${name}.cs`);
  }
  source('runtime-Array-CoreCLR', 'dotnet/runtime', runtime.sha,
    'src/coreclr/System.Private.CoreLib/src/System/Array.CoreCLR.cs');
  for (const [label, command, query] of [
    ['related-pr-verifier', 'prs', 'DiagnosticVerifier'],
    ['related-pr-elementat-analyzers', 'prs', 'ElementAt analyzers'],
    ['related-issue-verifier', 'issues', 'DiagnosticVerifier'],
    ['related-issue-elementat-analyzers', 'issues', 'ElementAt analyzers'],
  ]) {
    gh(label, ['search', command, query, '--repo', 'dotnet/aspnetcore', '--limit', '20',
      '--json', 'number,title,url,state,updatedAt']);
  }
  for (const number of [57303, 39176, 33041, 6698]) {
    gh('history-pr-' + number, ['api', `repos/dotnet/aspnetcore/pulls/${number}`, '--jq',
      '{number,title,state,merged_at,html_url,body,head:.head.sha,base:.base.sha}']);
  }
  for (const [label, url] of [
    ['learn-elementat', 'https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.elementat?view=net-11.0'],
    ['learn-count', 'https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.count?view=net-11.0'],
    ['learn-orderby', 'https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.orderby?view=net-11.0'],
    ['learn-toarray', 'https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.toarray?view=net-11.0'],
    ['learn-analyzer-diagnostics', 'https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.diagnostics.compilationwithanalyzers.getanalyzerdiagnosticsasync'],
  ]) {
    const response = await fetch(url);
    const data = Buffer.from(await response.arrayBuffer());
    const artifact = save(path.join('external', label + '.html'), data);
    resources.push({
      label, requestedUrl: url, finalUrl: response.url, status: response.status,
      contentType: response.headers.get('content-type'), artifact, bytes: data.length,
      sha256: sha(data), observedAtUtc: new Date().toISOString(),
    });
    if (!response.ok) throw new Error(label + ' HTTP ' + response.status);
  }
  json('external/RESOURCES.json', resources);
  json('external/COMMANDS.json', commands);
  console.log(JSON.stringify({ runtimeSourceCommit: runtime.sha, resources: resources.length, readOnlyGhCommands: commands.length }));
}
main().catch(error => {
  json('external/FAILED.json', { error: String(error), commands, resources });
  console.error(error);
  process.exitCode = 1;
});
