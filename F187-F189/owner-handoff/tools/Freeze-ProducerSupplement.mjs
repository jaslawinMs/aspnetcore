import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const paths = [
  'src/Mvc/Mvc.Core/src/Infrastructure/ControllerActionInvoker.cs',
  'src/Mvc/Mvc.Core/src/MvcCoreDiagnosticListenerExtensions.cs'
];
const primary = readJson(path.join(root, 'research', 'source-records.json'));
const supplementary = readJson(path.join(root, 'research', 'source-records-supplement.json'));
const records = [];
for (const role of primary.roles) {
  const objects = new Map(), newObjects = new Map(), expressions = new Map();
  for (const prior of [role, supplementary.roles.find(item => item.role === role.role)]) {
    for (const object of prior.objects) {
      const raw = fs.readFileSync(path.join(root, object.path));
      requireThat(sha256(raw) === object.sha256, 'Prior object changed');
      objects.set(object.id, { ...object, raw });
    }
  }
  const queries = fs.readFileSync(path.join(root, `research/${role.role}-producer-batch-input.txt`), 'utf8').trimEnd().split('\n');
  const raw = fs.readFileSync(path.join(root, `commands/raw/${role.role}-producer-objects.stdout.txt`));
  let cursor = 0;
  for (const expression of queries) {
    const end = raw.indexOf(10, cursor);
    requireThat(end >= 0, 'Raw producer batch header absent');
    const match = /^([a-f0-9]{40}) (blob|tree) ([0-9]+)$/.exec(raw.subarray(cursor, end).toString('ascii'));
    requireThat(!!match, 'Invalid raw producer batch header');
    const [, id, type, lengthText] = match, length = Number(lengthText);
    cursor = end + 1;
    const bytes = raw.subarray(cursor, cursor + length);
    cursor += length;
    requireThat(bytes.length === length && raw[cursor++] === 10, 'Truncated raw producer batch');
    const actual = crypto.createHash('sha1').update(Buffer.from(`${type} ${length}\0`)).update(bytes).digest('hex');
    requireThat(actual === id, 'Raw producer Git checksum');
    const relative = `git-objects/${id}.${type}`, filename = path.join(root, relative);
    if (fs.existsSync(filename)) requireThat(fs.readFileSync(filename).equals(bytes), 'Producer object overwrite');
    else fs.writeFileSync(filename, bytes);
    const object = { id, type, path: relative, bytes: bytes.length, sha256: sha256(bytes), raw: bytes };
    objects.set(id, object); newObjects.set(id, object); expressions.set(expression, id);
  }
  requireThat(cursor === raw.length, 'Trailing producer raw bytes');
  const parseTree = bytes => {
    const result = [];
    for (let cursor = 0; cursor < bytes.length;) {
      const space = bytes.indexOf(32, cursor), nul = bytes.indexOf(0, space + 1);
      requireThat(space > cursor && nul > space && nul + 21 <= bytes.length, 'Invalid tree');
      result.push({ mode: bytes.subarray(cursor, space).toString('ascii'), name: bytes.subarray(space + 1, nul).toString('utf8'), id: bytes.subarray(nul + 1, nul + 21).toString('hex') });
      cursor = nul + 21;
    }
    return result;
  };
  const selected = paths.map(relative => {
    let current = role.rootTree;
    const proof = [];
    for (const part of relative.split('/')) {
      const tree = objects.get(current);
      requireThat(tree?.type === 'tree', 'Missing producer proof tree');
      const entry = parseTree(tree.raw).find(item => item.name === part);
      requireThat(!!entry, 'Missing producer proof entry');
      proof.push({ tree: current, ...entry }); current = entry.id;
    }
    const blob = objects.get(current);
    requireThat(blob?.type === 'blob' && current === expressions.get(`${role.commit}:${relative}`), 'Producer blob proof mismatch');
    const bytes = fs.readFileSync(path.join(role.checkout, relative));
    const destination = `source/${role.role}/${relative}`;
    fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
    fs.writeFileSync(path.join(root, destination), bytes);
    return { repositoryPath: relative, gitBlob: current, gitObject: { path: blob.path, bytes: blob.bytes, sha256: blob.sha256 }, checkout: { path: destination, bytes: bytes.length, sha256: sha256(bytes) }, rawCheckoutEqualsRawGitBlob: bytes.equals(blob.raw), proof };
  });
  records.push({ role: role.role, commit: role.commit, checkout: role.checkout, rootTree: role.rootTree, objects: [...newObjects.values()].map(({ raw, ...value }) => value), selected });
}
fs.writeFileSync(path.join(root, 'research', 'source-records-producer.json'), JSON.stringify({ findings: ['F187', 'F188', 'F189'], status: 'PENDING', roles: records }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', roles: records.map(role => ({ role: role.role, selectedSources: role.selected.length, newObjects: role.objects.length })) }));
