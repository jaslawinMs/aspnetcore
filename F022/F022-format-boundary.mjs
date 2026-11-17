import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F022');
const directory = path.join(run, 'validation', 'whitespace-encoding-boundary');
if (fs.existsSync(directory)) throw new Error('Do not overwrite a formatter boundary reproduction.');
const original = execFileSync('git', ['show', 'HEAD:src/Mvc/Mvc.ViewFeatures/test/ExpressionHelperTest.cs'], { cwd: root });
const actualPath = path.join(root, 'src', 'Mvc', 'Mvc.ViewFeatures', 'test', 'ExpressionHelperTest.cs');
const actual = fs.readFileSync(actualPath);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
if (!original.subarray(0, 3).equals(bom) || !actual.subarray(0, 3).equals(bom)) {
  throw new Error('The charset diagnostic must be proved pre-existing,not explained away.');
}
fs.mkdirSync(directory, { recursive: true });
fs.copyFileSync(path.join(root, '.editorconfig'), path.join(directory, '.editorconfig'));
for (const [label, bytes] of [['original', original], ['selected-encoding-only-mirror', actual.subarray(3)]]) {
  const folder = path.join(directory, label);
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder, 'ExpressionHelperTest.cs'), bytes);
}
fs.writeFileSync(path.join(directory, 'source-encoding.json'), JSON.stringify({
  candidate: 'F022', actualSourcePath: actualPath, actualOriginalGitSourceSha256: hash(original),
  actualSelectedSourceSha256: hash(actual), actualOriginalAndSelectedPrefix: bom.toString('hex').toUpperCase(),
  actualOriginalBomPreserved: true, rootSourceChangedByThisDiagnostic: false,
  actualEditorConfigSha256: hash(fs.readFileSync(path.join(root, '.editorconfig'))),
  mirrorLimit: 'The derived selected mirror removes only the existing three BOM bytes to let the same formatter verify whitespace. It is not the shipping file or a proposed cleanup.',
}, null, 2) + '\n');
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-export.mjs'));
console.log(directory);
