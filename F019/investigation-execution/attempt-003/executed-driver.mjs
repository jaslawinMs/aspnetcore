import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F019');
const execution = path.join(run, 'investigation-execution', 'attempt-003');
const destination = path.join(run, 'investigation', 'upstream-68299');
const expectedHead = '103b0800790e744fc017872386221e40f3e38534';
if (fs.existsSync(execution) || fs.existsSync(destination)) {
  throw new Error('Do not overwrite actual upstream source capture.');
}
fs.mkdirSync(execution, { recursive: true });
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
let sequence = 0;
function command(label, args) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync('gh', args, { cwd: root, encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({
    executable: 'gh', arguments: args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
  }, null, 2) + '\n');
  if (result.error || result.status !== 0) {
    throw new Error('Actual upstream capture failed; preserve ' + stem);
  }

  return JSON.parse(result.stdout.toString('utf8'));
}
const pr = command('actual-pr-state', ['api', 'repos/dotnet/aspnetcore/pulls/68299']);
if (pr.number !== 68299 || pr.head.sha !== expectedHead || pr.state !== 'open' || pr.merged !== false) {
  throw new Error('Upstream state/head changed; inspect actual evidence before classifying.');
}
const files = [
  'src/Components/Components/src/LayoutView.cs',
  'src/Components/Components/src/ComponentTypeInfo.cs',
  'src/Components/Components/src/CompositeComponentTypeInfoResolver.cs',
  'src/Components/Components/src/ReflectionComponentTypeInfoResolver.cs',
  'src/Components/Components/src/ComponentTypeInfoResolverFactory.cs',
  'src/Components/Components/src/RenderTree/Renderer.cs',
];
const manifest = [];
for (const [index, gitPath] of files.entries()) {
  const response = command(`source-${String(index).padStart(2, '0')}`,
    ['api', `repos/dotnet/aspnetcore/contents/${gitPath}?ref=${expectedHead}`]);
  if (response.encoding !== 'base64' || response.type !== 'file' || response.path !== gitPath) {
    throw new Error('Unexpected actual upstream content response for ' + gitPath);
  }
  const bytes = Buffer.from(response.content, 'base64');
  const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if (blob !== response.sha || bytes.length !== response.size) {
    throw new Error('Actual upstream source/blob identity failed: ' + gitPath);
  }
  const local = path.join(destination, ...gitPath.split('/'));
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, bytes, { flag: 'wx' });
  manifest.push({ path: gitPath, bytes: bytes.length, gitBlob: blob,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    pinnedSourceUrl: `https://github.com/dotnet/aspnetcore/blob/${expectedHead}/${gitPath}` });
}
const receipt = {
  candidate: 'F019', actualPr: pr.html_url, actualPrState: pr.state, actualDraft: pr.draft,
  actualMerged: pr.merged, actualHead: expectedHead, actualBase: pr.base.sha,
  actualChangedFiles: pr.changed_files,
  earlierGraphQlFileListReturned: 100, earlierGraphQlListMustNotBeClaimedComplete: true,
  actualSourceFilesCaptured: manifest.length, sourceManifest: manifest,
  upstreamChangesCompiledOrExecutedHere: false, performanceOrHotReloadCorrectnessClaimedFromSourceOnly: false,
  capturedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(destination, 'source-provenance.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPr: receipt.actualPr, actualState: receipt.actualPrState, actualHead: expectedHead,
  totalChangedFiles: pr.changed_files, verifiedPinnedSourceFiles: manifest.length, compiledOrTimed: false }, null, 2));
