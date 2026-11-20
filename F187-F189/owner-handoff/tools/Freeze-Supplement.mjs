import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sha = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, ''));
const paths = json('research/selected-source-supplement.json');
const roles = json('research/source-records.json').roles;
const save = (relative, bytes) => {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (fs.existsSync(filename) && !fs.readFileSync(filename).equals(bytes)) throw Error(`Refusing overwrite: ${relative}`);
  fs.writeFileSync(filename, bytes);
  return { path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
};
const result = [];
for (const { role, commit, checkout } of roles) {
  const queries = fs.readFileSync(path.join(root, `research/${role}-supplement-batch-input.txt`), 'utf8').trimEnd().split('\n');
  const raw = fs.readFileSync(path.join(root, `commands/raw/${role}-supplement-objects.stdout.txt`));
  const objects = new Map(), expressions = new Map();
  let cursor = 0;
  for (const expression of queries) {
    const end = raw.indexOf(10, cursor);
    if (end < 0) throw Error(`Missing header: ${expression}`);
    const match = /^([a-f0-9]{40}) (blob|tree|commit) ([0-9]+)$/.exec(raw.subarray(cursor, end).toString('ascii'));
    if (!match) throw Error(`Invalid header: ${expression}`);
    const [, id, type, lengthText] = match, length = Number(lengthText);
    cursor = end + 1;
    const bytes = raw.subarray(cursor, cursor + length);
    cursor += length;
    if (bytes.length !== length || raw[cursor++] !== 10 || sha(Buffer.concat([Buffer.from(`${type} ${length}\0`), bytes]), 'sha1') !== id) throw Error(`Raw Git checksum: ${expression}`);
    objects.set(id, { id, type, ...save(`git-objects/${id}.${type}`, bytes), raw: bytes });
    expressions.set(expression, id);
  }
  if (cursor !== raw.length) throw Error('Trailing raw batch bytes');
  const rootTree = /^tree ([a-f0-9]{40})\n/.exec(objects.get(commit).raw.toString('utf8'))?.[1];
  if (rootTree !== expressions.get(`${commit}^{tree}`)) throw Error('Commit/tree association');
  const entries = bytes => {
    const result = [];
    for (let cursor = 0; cursor < bytes.length;) {
      const space = bytes.indexOf(32, cursor), nul = bytes.indexOf(0, space + 1);
      if (space < 0 || nul < 0 || nul + 21 > bytes.length) throw Error('Invalid raw tree');
      result.push({ mode: bytes.subarray(cursor, space).toString('ascii'), name: bytes.subarray(space + 1, nul).toString('utf8'), id: bytes.subarray(nul + 1, nul + 21).toString('hex') });
      cursor = nul + 21;
    }
    return result;
  };
  const selected = paths.map(relative => {
    let current = rootTree;
    const proof = [];
    for (const part of relative.split('/')) {
      const object = objects.get(current);
      if (object?.type !== 'tree') throw Error(`Proof object missing: ${relative}`);
      const entry = entries(object.raw).find(entry => entry.name === part);
      if (!entry) throw Error(`Proof entry missing: ${relative}`);
      proof.push({ tree: current, ...entry });
      current = entry.id;
    }
    const blob = objects.get(current);
    if (blob?.type !== 'blob' || current !== expressions.get(`${commit}:${relative}`)) throw Error('Blob proof mismatch');
    const bytes = fs.readFileSync(path.join(checkout, relative));
    return {
      repositoryPath: relative,
      gitBlob: current,
      gitObject: { path: blob.path, bytes: blob.bytes, sha256: blob.sha256 },
      checkout: save(`source/${role}/${relative}`, bytes),
      rawCheckoutEqualsRawGitBlob: bytes.equals(blob.raw),
      checksumBoundary: 'Selected exact raw checkout and raw Git bytes independently retained; no newline normalization.',
      proof
    };
  });
  result.push({ role, commit, checkout, rootTree, objects: [...objects.values()].map(({ raw, ...value }) => value), selected });
}
fs.writeFileSync(path.join(root, 'research/source-records-supplement.json'), JSON.stringify({ findings: ['F187', 'F188', 'F189'], status: 'PENDING', roles: result }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', roles: result.map(role => ({ role: role.role, selectedSources: role.selected.length, rawObjects: role.objects.length })) }));
