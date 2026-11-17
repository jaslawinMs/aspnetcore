import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F022');
const execution = path.join(run, 'boundary-execution');
const investigation = JSON.parse(fs.readFileSync(path.join(run, 'investigation.json'), 'utf8'));
if (fs.existsSync(execution)) throw new Error('Do not overwrite the actual source-boundary capture.');
fs.mkdirSync(execution);
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
let sequence = 0;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const blob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function capture(label, args) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const result = spawnSync('git', args, { cwd: root, encoding: null, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({ executable: 'git', arguments: args, workingDirectory: root,
    actualExitCode: result.status, capturedAt: new Date().toISOString() }, null, 2) + '\n');
  if (result.status !== 0) throw new Error('Actual boundary source capture failed: ' + stem);

  return result.stdout;
}
if (capture('actual-baseline-head', ['rev-parse', 'HEAD']).toString('utf8').trim() !== investigation.baseline ||
  capture('actual-tracked-status', ['status', '--porcelain', '--untracked-files=no']).toString('utf8').trim()) {
  throw new Error('Original unchanged owner required before source-boundary capture.');
}
const files = [
  'src/Mvc/Mvc.ViewFeatures/src/ExpressionMetadataProvider.cs',
  'src/Mvc/Mvc.ViewFeatures/src/LambdaExpressionComparer.cs',
  'src/Mvc/Mvc.ViewFeatures/src/HtmlAttributePropertyHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
  'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
  'src/Servers/IIS/IIS/src/Microsoft.AspNetCore.Server.IIS.csproj',
];
const snapshots = [];
for (const [index, file] of files.entries()) {
  const baseline = capture(`baseline-${index + 1}`, ['show', `${investigation.baseline}:${file}`]);
  const current = capture(`current-default-${index + 1}`, ['show', `${investigation.capturedCurrentDefault}:${file}`]);
  for (const [variant, bytes] of [['baseline', baseline], ['current-default', current]]) {
    const relative = `${variant}-${path.basename(file)}`;
    fs.writeFileSync(path.join(run, relative), bytes, { flag: 'wx' });
    snapshots.push({ file, variant, path: relative, bytes: bytes.length, sha256: hash(bytes), rawGitBlob: blob(bytes) });
  }
}
fs.writeFileSync(path.join(run, 'producer-boundary.json'), JSON.stringify({
  candidate: 'F022', baseline: investigation.baseline, capturedCurrentDefault: investigation.capturedCurrentDefault,
  snapshots, exactAdditionalSourceFiles: files.length, actualAdditionalNativeSnapshots: snapshots.length,
  publicProducer: 'ModelExpressionProvider.GetExpressionText/CreateModelExpression',
  metadataOwnerCallers: ['ExpressionHelper.GetExpressionText', 'ExpressionMetadataProvider.FromLambdaExpression'],
  scopedFallbackReason: 'LSP references returned the declaration and ExpressionHelper caller but omitted the actual second caller,which is present in captured source.',
  expressionTextBehavior: 'Indexed values remain evaluated on each call;successful metadata classification is separate from cached expression text.',
  sameAssemblyHandlerPriorArt: 'HtmlAttributePropertyHelper is a metadata-update handler in the ViewFeatures assembly.',
  aggregationHandlerBoundary: 'MVC HotReloadService lives in another assembly;do not add cross-framework non-public access.',
  firstBaselineTestAttempt: 'Managed test graph stopped at Server.IIS ValidateNativeComponentsBuilt because ANCM was absent;no expression assertion reached.',
  supportedManagedOnlyValidation: 'UseIisNativeAssets=false disables only the observed native integration requirement;no source-build stubs selected and no IIS validation claim.',
  timingProfiles: 0,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F022', actualAdditionalNativeSnapshots: snapshots.length,
  currentDefaultParity: files.map(file => ({ file,
    equal: snapshots.find(row => row.file === file && row.variant === 'baseline').rawGitBlob ===
      snapshots.find(row => row.file === file && row.variant === 'current-default').rawGitBlob })) }, null, 2));
