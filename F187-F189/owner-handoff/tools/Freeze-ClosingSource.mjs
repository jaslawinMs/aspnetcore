import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const plan = readJson(path.join(root, 'research', 'closing-source-plan.json'));
const baseline = readJson(path.join(root, 'research', 'source-records.json'));
const raw = fs.readFileSync(path.join(root, 'commands', 'raw', 'closing-source-objects.stdout.txt'));
const objects = new Map(), expressions = new Map();
let cursor = 0;
for (const expression of plan.expressions) {
  const end = raw.indexOf(10, cursor);
  requireThat(end >= 0, 'Closing raw Git header absent');
  const match = /^([a-f0-9]{40}) (blob|tree|commit) ([0-9]+)$/.exec(raw.subarray(cursor, end).toString('ascii'));
  requireThat(!!match, 'Closing raw Git header invalid');
  const [, id, type, lengthText] = match, length = Number(lengthText);
  cursor = end + 1;
  const bytes = raw.subarray(cursor, cursor + length);
  cursor += length;
  requireThat(bytes.length === length && raw[cursor++] === 10, 'Closing raw Git object truncated');
  const actual = crypto.createHash('sha1').update(Buffer.from(`${type} ${length}\0`)).update(bytes).digest('hex');
  requireThat(actual === id, 'Closing immutable Git object checksum');
  const relative = `git-objects/${id}.${type}`, filename = path.join(root, relative);
  if (fs.existsSync(filename)) requireThat(fs.readFileSync(filename).equals(bytes), 'Closing Git object overwrite');
  else fs.writeFileSync(filename, bytes);
  objects.set(id, { id, type, path: relative, bytes: bytes.length, sha256: sha256(bytes), raw: bytes });
  expressions.set(expression, id);
}
requireThat(cursor === raw.length, 'Trailing closing raw Git bytes');
const head = plan.independentlyObservedHead;
const rootTree = /^tree ([a-f0-9]{40})\n/.exec(objects.get(head).raw.toString('utf8'))?.[1];
requireThat(rootTree === expressions.get(`${head}^{tree}`), 'Closing commit/root-tree association');
const entries = bytes => {
  const result = [];
  for (let cursor = 0; cursor < bytes.length;) {
    const space = bytes.indexOf(32, cursor), nul = bytes.indexOf(0, space + 1);
    requireThat(space > cursor && nul > space && nul + 21 <= bytes.length, 'Invalid raw closing tree');
    result.push({ mode: bytes.subarray(cursor, space).toString('ascii'), name: bytes.subarray(space + 1, nul).toString('utf8'), id: bytes.subarray(nul + 1, nul + 21).toString('hex') });
    cursor = nul + 21;
  }
  return result;
};
const targets = plan.targets.map(repositoryPath => {
  let current = rootTree;
  const proof = [];
  for (const segment of repositoryPath.split('/')) {
    const tree = objects.get(current);
    requireThat(tree?.type === 'tree', 'Missing closing proof tree');
    const entry = entries(tree.raw).find(entry => entry.name === segment);
    requireThat(!!entry, 'Missing closing path proof');
    proof.push({ tree: current, ...entry }); current = entry.id;
  }
  const originalBlob = baseline.roles.find(role => role.role === 'original').selected.find(source => source.repositoryPath === repositoryPath).gitBlob;
  const testedDefaultBlob = baseline.roles.find(role => role.role === 'default').selected.find(source => source.repositoryPath === repositoryPath).gitBlob;
  requireThat(current === originalBlob && current === testedDefaultBlob && current === expressions.get(`${head}:${repositoryPath}`), 'Target source changed; coordinator acceptance requires fresh scope, not relabeling binaries');
  return { repositoryPath, originalBlob, testedDefaultBlob, closingBlob: current, proof };
});
const result = {
  result: 'PASS', findingsStatus: 'PENDING',
  original: baseline.roles.find(role => role.role === 'original').commit,
  testedDefault: baseline.roles.find(role => role.role === 'default').commit,
  latestObservedHead: head, rootTree, targets,
  sourceOnly: true, wholeLatestMainBinariesTested: false,
  observations: plan,
  objects: [...objects.values()].map(({ raw, ...value }) => value),
  boundary: 'Independent closing GitHub API and git ls-remote observation plus raw commit/tree/blob membership proves only the two targets are unchanged at that exact observed newer main head. Default binaries tested remain frozen at 83d976704fa0f9aa4361327d1f9d929c93bd9256.'
};
fs.writeFileSync(path.join(root, 'research', 'closing-source-freshness.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', latestObservedHead: head, unchangedTargets: targets.length, testedDefault: result.testedDefault, wholeLatestMainBinariesTested: false }));
