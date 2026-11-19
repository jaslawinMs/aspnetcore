import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
const prior = path.join(session, 'autoperf-runs', 'F120', 'harness');
const harness = path.join(run, 'harness');
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
assert.equal(fs.existsSync(path.join(run, 'intake-completed.json')), true);
assert.deepEqual(fs.readdirSync(harness).sort(), ['Characterization.cs', 'CollectionBenchmarks.cs', 'CollectionScenario.cs']);
const copies = [];
for (const name of ['AutoPerf.Benchmarks.csproj', 'Program.cs', 'Evidence.cs', 'SettingsPreservingEmitToolchain.cs', 'HostedProducer.cs']) {
  const source = path.join(prior, name);
  const target = path.join(harness, name);
  let contents = fs.readFileSync(source, 'utf8').replaceAll('F120', 'F121').replaceAll('f120', 'f121');
  if (name === 'Program.cs') contents = contents.replace('nameof(CollectionBenchmarks.Contains)', 'nameof(CollectionBenchmarks.CopyTo)');
  fs.writeFileSync(target, contents, { flag: 'wx' });
  copies.push({ path: name, priorSha256: sha(source), currentSha256: sha(target) });
}
assert.equal(sha(path.join(harness, 'SettingsPreservingEmitToolchain.cs')),
  sha(path.join(session, 'autoperf-runs', 'F047', 'harness', 'SettingsPreservingEmitToolchain.cs')));
for (const name of ['freeze', 'compare']) {
  const source = path.join(session, `F120-${name}.mjs`);
  const target = path.join(session, `F121-${name}.mjs`);
  let contents = fs.readFileSync(source, 'utf8').replaceAll('F120', 'F121');
  if (name === 'freeze') {
    contents = contents.replaceAll('intake.actualCurrentDefault : intake.baseline', 'intake.actualCurrentDefault : intake.actualBaseline')
      .replaceAll('intake.protectedFiles', 'intake.actualProtectedPrimaryInputs')
      .replaceAll('intake.actualSelectedSources', 'intake.actualSelectedInputs');
  }
  fs.writeFileSync(target, contents, { flag: 'wx' });
}
const plan = JSON.parse(fs.readFileSync(path.join(run, 'acceptance-plan.json'), 'utf8'));
const profiles = [
  { key: 'CopiedDefault5', copied: true, factoryCount: 'default-five', offset: 0, role: 'primary' },
  { key: 'UnmodifiedDefault5', copied: false, factoryCount: 'default-five', offset: 0, role: 'ordinary-path control' },
  { key: 'CopiedDefault5Offset2', copied: true, factoryCount: 'default-five', offset: 2, role: 'offset secondary' },
  { key: 'UnmodifiedDefault5Offset2', copied: false, factoryCount: 'default-five', offset: 2, role: 'ordinary offset control' },
  { key: 'CopiedEmpty', copied: true, factoryCount: 0, offset: 0, role: 'empty control' },
  { key: 'CopiedOne', copied: true, factoryCount: 1, offset: 0, role: 'small copied secondary' },
  { key: 'CopiedEight', copied: true, factoryCount: 8, offset: 0, role: 'scaled copied secondary' },
  { key: 'CopiedEightOffset2', copied: true, factoryCount: 8, offset: 2, role: 'scaled offset secondary' }
];
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
fs.writeFileSync(path.join(run, 'profile-definitions.json'), JSON.stringify(profiles, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify({
  candidate: 'F121', maximum: 3, authorized: [], completed: [], failedOrPartialAttempts: [],
  permanentlyClosed: false, state: 'preparation', actualCreatedAt: new Date().toISOString(),
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualProfileDefinitionsSha256: sha(path.join(run, 'profile-definitions.json'))
}, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'harness-bootstrap.json'), JSON.stringify({
  candidate: 'F121', actualCreatedAt: new Date().toISOString(), copies,
  actualSettingsExecutorUnchanged: true, actualComparisonAuthorizationsConsumed: 0,
  actualPreviousFindingEvidenceNotChanged: true
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualCommonInputsPrepared: copies.length, actualProfiles: profiles.length, actualSettingsExecutorUnchanged: true }));
