import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const file = path.join(run, 'compiled-fixture-inputs.json');
const prior = path.join(run, 'preparation', 'direct-base-compiler-001', 'compiled-fixture-inputs.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(fs.existsSync(prior), false);
const bytes = fs.readFileSync(file);
const inputs = JSON.parse(bytes.toString('utf8'));
for (const fixture of inputs.fixtures) {
  const previous = fs.readFileSync(path.join(path.dirname(prior), fixture.path));
  assert.equal(hash(previous), fixture.sha256);
  const current = fs.readFileSync(path.join(run, 'harness', fixture.path));
  const text = current.toString('utf8');
  assert.ok(text.includes('@inherits Microsoft.AspNetCore.Mvc.Razor.RazorPageBase'));
  assert.ok(text.includes('public override void BeginContext') && text.includes('public override void EndContext')
    && text.includes('public override void EnsureRenderedBodyOrSections()'));
  assert.equal(text.includes('override void DefineSection'), false);
  assert.deepEqual([...text.matchAll(/@section (\w+)\{/g)].map(match => match[1]), fixture.names);
  fixture.sha256 = hash(current);
}
fs.writeFileSync(prior, bytes, { flag: 'wx' });
inputs.actualUntimedCompilerInputRevision = 2;
inputs.previousInputManifestSha256 = hash(bytes);
inputs.previousInputManifest = path.relative(run, prior);
inputs.requiredAbstractMembers = {
  contextHooks: 'Explicit empty overrides match RazorPage.BeginContext/EndContext.',
  layoutValidation: 'Reject treating these custom content fixtures as layouts. Actual RazorView validates the real RazorPage layout, which consumes every registered section.',
  registration: 'No fixture overrides or copies DefineSection; the inherited concrete implementation remains RazorPageBase.'
};
fs.writeFileSync(file, JSON.stringify(inputs, null, 2) + '\n');
console.log('Updated only the untimed compiler-input revision; original failed input manifest preserved.');
