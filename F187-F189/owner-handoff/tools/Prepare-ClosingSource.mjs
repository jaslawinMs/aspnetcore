import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const api = readJson(path.join(root, 'commands', 'raw', 'closing-main-api-final.stdout.txt'));
const remote = fs.readFileSync(path.join(root, 'commands', 'raw', 'closing-main-lsremote-final.stdout.txt'), 'utf8').trim();
requireThat(api.name === 'main' && /^[a-f0-9]{40}$/.test(api.sha) && remote.split(/\s+/)[0] === api.sha && remote.split(/\s+/)[1] === 'refs/heads/main', 'Independent closing default-head observations disagree');
const targets = [
  'src/Mvc/shared/Mvc.Views.TestCommon/TestFileProvider.cs',
  'src/Mvc/test/WebSites/ControllersFromServicesClassLibrary/NestedControllerOwner.cs'
];
const expressions = new Set([api.sha, `${api.sha}^{tree}`]);
for (const target of targets) {
  const parts = target.split('/');
  for (let count = 1; count < parts.length; count++) expressions.add(`${api.sha}:${parts.slice(0, count).join('/')}`);
  expressions.add(`${api.sha}:${target}`);
}
fs.writeFileSync(path.join(root, 'research', 'closing-source-batch-input.txt'), [...expressions].join('\n') + '\n');
fs.writeFileSync(path.join(root, 'research', 'closing-source-plan.json'), JSON.stringify({
  result: 'PASS', independentlyObservedHead: api.sha, defaultBranch: 'main', commitDate: api.commitDate,
  apiReceipt: 'commands/raw/closing-main-api-final.terminal.json',
  gitReceipt: 'commands/raw/closing-main-lsremote-final.terminal.json',
  apiSha256: sha256(fs.readFileSync(path.join(root, 'commands', 'raw', 'closing-main-api-final.stdout.txt'))),
  remoteSha256: sha256(fs.readFileSync(path.join(root, 'commands', 'raw', 'closing-main-lsremote-final.stdout.txt'))),
  targets, expressions: [...expressions], sourceOnly: true, wholeLatestMainBinariesTested: false
}, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', latestObservedHead: api.sha, targets: targets.length, wholeLatestMainBinariesTested: false }));
