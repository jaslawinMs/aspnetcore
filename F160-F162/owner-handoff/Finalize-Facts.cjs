'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = __dirname, payload = path.join(root, 'payload');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
function git(args) {
  const startedAt = new Date().toISOString(), process = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  const record = { executable: 'git', arguments: args, pid: process.pid, exitCode: process.status, signal: process.signal,
    startedAt, completedAt: new Date().toISOString(), stdout: process.stdout ?? '', stderr: process.stderr ?? '',
    bothStreamsDrained: process.status !== null, error: process.error?.message ?? null };
  if (record.exitCode !== 0) throw new Error(JSON.stringify(record));
  return record;
}
const upstream = git(['ls-remote', 'https://github.com/dotnet/aspnetcore.git', 'refs/heads/main']);
const closing = { observation: upstream, observedMain: upstream.stdout.trim().split(/\s+/)[0],
  builtDefaultUnchanged: '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d',
  olderBuildRelabeled: false, ownSource: {} };
for (const role of ['original', 'default']) {
  const checkout = path.join(root, 'work', role);
  const head = git(['-C', checkout, 'rev-parse', 'HEAD']);
  const status = git(['-C', checkout, '-c', 'core.longpaths=true', 'status', '--porcelain=v1', '--untracked-files=no']);
  if (status.stdout.trim()) throw new Error(`Unexpected own tracked changes ${role}: ${status.stdout}`);
  closing.ownSource[role] = { head, status };
}
write(path.join(root, 'closing.json'), closing);
const docs = [];
for (const relative of ['docs\\BuildFromSource.md', 'docs\\BuildErrors.md', 'docs\\CrossCuttingGuidance.md',
  'src\\Components\\AGENTS.md', '.github\\instructions\\components.instructions.md',
  '.github\\instructions\\cross-cutting-guidance.instructions.md', '.github\\instructions\\build.instructions.md']) {
  let source = path.join(root, 'work', 'original', relative);
  if (!fs.existsSync(source)) source = path.join('C:\\src\\aspnetcore', relative);
  if (!fs.existsSync(source)) { docs.push({ relative, available: false }); continue; }
  const bytes = fs.readFileSync(source), selected = path.join('docs', relative), target = path.join(payload, selected);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  docs.push({ relative, source, selected, bytes: bytes.length, sha256: hash(bytes), available: true });
}
write(path.join(payload, 'evidence', 'documentation.json'), { documents: docs,
  previouslyConsultedDictionaryComparerDocumentation: {
    url: 'https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.comparer?view=netstandard-2.0',
    docsCommitFromConsultedPage: '902d4bf22d28fd23fd6410ea9fe0e4bf3ce3d454',
    statement: 'No explicitly supplied comparer uses EqualityComparer<TKey>.Default.',
    fullWebPageArchived: false, concreteInternalComparerIntrospected: false
  } });
for (const name of ['HANDOFF.md', 'RESULTS.json', 'TERMINAL-RECEIPT.json', 'closing.json', 'Update-XmlReceipt.ps1', 'Finalize-Facts.cjs'])
  fs.copyFileSync(path.join(root, name), path.join(payload, name));
fs.copyFileSync(path.join(root, '..', 'hold-F147-F149-011-F160.json'), path.join(payload, 'evidence', 'hold-F147-F149-011-F160.json'));
console.log(JSON.stringify({ observedClosingMain: closing.observedMain, builtDefaultUnchanged: closing.builtDefaultUnchanged,
  ownTrackedSourceClean: true, selectedDocuments: docs.filter(item => item.available).length }, null, 2));
