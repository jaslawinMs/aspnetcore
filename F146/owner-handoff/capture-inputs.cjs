const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const root = __dirname;
const repo = process.argv[2];
if (!repo || !fs.existsSync(path.join(root, 'ACCEPTANCE.md'))) {
  throw new Error('Usage: node capture-inputs.cjs <read-only-repository>; acceptance required');
}
const pins = {
  Original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
  ObservedDefault: 'ae89581dfd24c6277b4267a9779d05f7b9f047f1',
};
const sample = 'src\\Servers\\Kestrel\\samples\\WebTransportInteractiveSampleApp\\Program.cs';
const files = [
  sample,
  'src\\Servers\\Kestrel\\samples\\WebTransportInteractiveSampleApp\\WebTransportInteractiveSampleApp.csproj',
  'src\\Servers\\Kestrel\\samples\\WebTransportInteractiveSampleApp\\wwwroot\\index.html',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\WebTransport\\WebTransportSession.cs',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\WebTransport\\WebTransportStream.cs',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Connection.cs',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Stream.cs',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3PendingStream.cs',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3SettingType.cs',
  'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\Http3\\WebTransport\\WebTransportTestUtilities.cs',
  'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\Http3\\WebTransport\\WebTransportSessionTests.cs',
  'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\Http3\\Http3TestBase.cs',
  'src\\Servers\\Kestrel\\shared\\test\\Http3\\Http3InMemory.cs',
  'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\InMemory.FunctionalTests.csproj',
  'activate.ps1', 'global.json', 'docs\\BuildFromSource.md', 'docs\\CrossCuttingGuidance.md',
];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function write(relative, data) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data, { flag: 'wx' });
  return relative;
}
const commands = [];
function git(args, saved) {
  const argv = ['--no-pager', '-C', repo, ...args];
  const result = cp.spawnSync('git', argv, { maxBuffer: 8 * 1024 * 1024 });
  const row = {
    executable: 'git', argv, exitCode: result.status,
    stdoutSha256: hash(result.stdout || ''), stderr: String(result.stderr || ''),
  };
  if (saved) {
    row.stdoutPath = write(saved, result.stdout);
  } else {
    row.stdout = String(result.stdout || '');
  }
  commands.push(row);
  if (result.status !== 0) {
    write('capture-failure.json', JSON.stringify({ commands, error: result.error?.message }, null, 2));
    throw new Error(JSON.stringify(row));
  }
  return result.stdout;
}
function extract(text, name) {
  const start = text.indexOf(`static async Task ${name}(`);
  if (start < 0) throw new Error(`Missing exact method ${name}`);
  const brace = text.indexOf('{', start);
  let end = brace + 1;
  for (let depth = 1; depth; end++) {
    if (end === text.length) throw new Error(`Unterminated ${name}`);
    depth += Number(text[end] === '{') - Number(text[end] === '}');
    if (!depth) break;
  }
  return { text: text.slice(start, end + 1), firstLine: text.slice(0, start).split('\n').length };
}
function unifiedDiff(oldText, newText, relative) {
  const a = oldText.trimEnd().split('\n');
  const b = newText.trimEnd().split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) ops.push([' ', a[i++], ++j]);
    else if (j < b.length && (i === a.length || dp[i][j + 1] > dp[i + 1][j])) ops.push(['+', b[j++], null]);
    else ops.push(['-', a[i++], null]);
  }
  const changed = ops.map((op, index) => op[0] !== ' ' ? index : -1).filter(index => index >= 0);
  const groups = [];
  for (const index of changed) {
    const start = Math.max(0, index - 3), end = Math.min(ops.length, index + 4);
    if (groups.length && start <= groups.at(-1)[1]) groups.at(-1)[1] = end;
    else groups.push([start, end]);
  }
  let result = `--- a/${relative}\n+++ b/${relative}\n`;
  for (const [start, end] of groups) {
    const before = ops.slice(0, start), hunk = ops.slice(start, end);
    const oldStart = 1 + before.filter(op => op[0] !== '+').length;
    const newStart = 1 + before.filter(op => op[0] !== '-').length;
    result += `@@ -${oldStart},${hunk.filter(op => op[0] !== '+').length} +${newStart},${hunk.filter(op => op[0] !== '-').length} @@\n`;
    result += hunk.map(op => op[0] + op[1] + '\n').join('');
  }
  return result;
}

const coordinatorHeadAtCapture = String(git(['rev-parse', 'HEAD'])).trim();
const localDefaultRefAtCapture = String(git(['rev-parse', 'refs/remotes/origin/main'])).trim();
git(['status', '--short'], 'evidence\\coordinator-status-entry.txt');
git(['log', '-8', '--format=%H %aI %s', pins.ObservedDefault, '--', sample], 'evidence\\sample-history.txt');
git(['show', '--format=fuller', '03c314bbe77aa36fffe1c97e56edd8e548d3017c', '--',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\WebTransport\\WebTransportSession.cs'],
  'evidence\\session-cleanup-history.txt');
git(['diff', pins.Original, pins.ObservedDefault, '--',
  'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Stream.cs'],
  'evidence\\producer-original-default.diff');
git(['diff', pins.Original, pins.ObservedDefault, '--',
  'src\\Servers\\Kestrel\\shared\\test\\Http3\\Http3InMemory.cs',
  'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\Http3\\WebTransport\\WebTransportTestUtilities.cs'],
  'evidence\\fixture-original-default.diff');
const inputs = [], sources = {};
for (const [role, pin] of Object.entries(pins)) {
  git(['cat-file', '-e', `${pin}^{commit}`]);
  for (const relative of files) {
    const gitPath = relative.replaceAll('\\', '/');
    const savedPath = `evidence\\${role}\\${relative}`;
    const data = git(['show', `${pin}:${gitPath}`], savedPath);
    const blob = String(git(['rev-parse', `${pin}:${gitPath}`])).trim();
    inputs.push({ role, commit: pin, path: relative, blob, sha256: hash(data), savedPath });
    if (relative === sample) sources[role] = String(data);
  }
  const handler = extract(sources[role], 'handleUnidirectionalStream');
  const specialCommands = extract(sources[role], 'ApplySpecialCommands');
  const extracted = '// Artifact-only exact-method extraction; not a native producer.\n' +
    'using System;\nusing System.Text;\nusing System.Threading.Tasks;\n' +
    'using Microsoft.AspNetCore.Connections;\nusing Microsoft.AspNetCore.Http.Features;\n' +
    'namespace Microsoft.AspNetCore.Server.Kestrel.Core.Tests;\n' +
    'internal static class F146SampleHandler\n{\n' +
    '    internal static Task Run(IWebTransportSession session, ConnectionContext stream)\n' +
    '        => handleUnidirectionalStream(session, stream);\n\n' +
    handler.text + '\n\n' + specialCommands.text + '\n}\n';
  write(`prepared\\${role}\\F146SampleHandler.cs`, extracted);
  write(`prepared\\${role}\\extraction.json`, JSON.stringify({
    commit: pin, samplePath: sample, sourceSha256: hash(sources[role]),
    extractedSourceSha256: hash(extracted),
    methods: [
      { name: 'handleUnidirectionalStream', firstLine: handler.firstLine,
        lastLine: handler.firstLine + handler.text.split('\n').length - 1, sha256: hash(handler.text) },
      { name: 'ApplySpecialCommands', firstLine: specialCommands.firstLine,
        lastLine: specialCommands.firstLine + specialCommands.text.split('\n').length - 1, sha256: hash(specialCommands.text) },
    ],
  }, null, 2));
}
if (sources.Original !== sources.ObservedDefault) throw new Error('Pinned sample changed; cannot reuse extraction');
const original = sources.Original;
const old = extract(original, 'handleUnidirectionalStream').text;
const loopStart = old.indexOf('    while (!stream.ConnectionClosed.IsCancellationRequested)');
const loop = old.slice(loopStart, -2);
const proposed = old.slice(0, loopStart).replace(
  '    var memory = new Memory<byte>(new byte[4096]);\n',
  '    var buffer = ArrayPool<byte>.Shared.Rent(4096);\n' +
  '    var memory = buffer.AsMemory(0, 4096);\n' +
  '    try\n    {\n') +
  loop.split('\n').map(line => line.trim() ? '    ' + line : line).join('\n') +
  '\n    }\n    finally\n    {\n        ArrayPool<byte>.Shared.Return(buffer);\n    }\n}';
const candidateText = original.replace('using System.Net;', 'using System.Buffers;\nusing System.Net;').replace(old, proposed);
write('proposals\\F146-arraypool.diff', unifiedDiff(original, candidateText, sample.replaceAll('\\', '/')));
write('source-observations.json', JSON.stringify({
  schemaVersion: 1, coordinatorHeadAtCapture, localDefaultRefAtCapture,
  liveDefaultQueried: false,
  liveDefaultLimitation: 'Task prohibits GitHub/network operations; local observed default only.',
  pins, sampleIdenticalAcrossPinnedRoles: true,
  proposalAppliedToAnySourceGraph: false, candidateExecuted: false, nativeWorkStarted: false,
  acceptanceSha256: hash(fs.readFileSync(path.join(root, 'ACCEPTANCE.md'))), inputs, commands,
}, null, 2));
console.log(JSON.stringify({ capturedInputs: inputs.length, sampleIdentical: true,
  proposalArtifactOnly: true, nativeWorkStarted: false }));
