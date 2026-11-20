import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sha = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const paths = readJson('research\\selected-source-paths.json');
const roles = [
  { role: 'original', commit: '37e809ead5824bc753a1c3d56f11615bdb1296c5', checkout: 'C:\\src\\ap-F187-o038' },
  { role: 'default', commit: '83d976704fa0f9aa4361327d1f9d929c93bd9256', checkout: 'C:\\src\\ap-F187-d038' }
];
const save = (relative, bytes) => {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(bytes)) throw Error(`Refusing overwrite: ${relative}`);
  fs.writeFileSync(destination, bytes);
  return { path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
};
const records = [];
for (const role of roles) {
  const queries = fs.readFileSync(path.join(root, `research\\${role.role}-git-batch-input.txt`), 'utf8').trimEnd().split('\n');
  const raw = fs.readFileSync(path.join(root, `commands\\raw\\${role.role}-source-objects.stdout.txt`));
  const objects = new Map(), expressions = new Map();
  let cursor = 0;
  for (const expression of queries) {
    const end = raw.indexOf(10, cursor);
    if (end < 0) throw Error(`Missing cat-file header: ${expression}`);
    const header = raw.subarray(cursor, end).toString('ascii').match(/^([a-f0-9]{40}) (blob|tree|commit) ([0-9]+)$/);
    if (!header) throw Error(`Bad cat-file header: ${expression}`);
    const [, id, type, lengthText] = header;
    const length = Number(lengthText);
    cursor = end + 1;
    const bytes = raw.subarray(cursor, cursor + length);
    cursor += length;
    if (bytes.length !== length || raw[cursor++] !== 10) throw Error(`Truncated raw object: ${expression}`);
    const actual = sha(Buffer.concat([Buffer.from(`${type} ${length}\0`), bytes]), 'sha1');
    if (actual !== id) throw Error(`Git object digest: ${expression}`);
    const file = save(`git-objects\\${id}.${type}`, bytes);
    objects.set(id, { id, type, ...file, raw: bytes });
    expressions.set(expression, id);
  }
  if (cursor !== raw.length) throw Error('Trailing cat-file data');
  const commit = objects.get(role.commit);
  if (!commit || commit.type !== 'commit') throw Error('Pinned commit object absent');
  const rootTree = /^tree ([a-f0-9]{40})\n/.exec(commit.raw.toString('utf8'))?.[1];
  if (rootTree !== expressions.get(`${role.commit}^{tree}`)) throw Error('Commit/root tree association');
  const parseTree = bytes => {
    const entries = [];
    for (let p = 0; p < bytes.length;) {
      const space = bytes.indexOf(32, p), nul = bytes.indexOf(0, space + 1);
      if (space < 0 || nul < 0 || nul + 21 > bytes.length) throw Error('Malformed raw tree');
      entries.push({ mode: bytes.subarray(p, space).toString('ascii'), name: bytes.subarray(space + 1, nul).toString('utf8'), id: bytes.subarray(nul + 1, nul + 21).toString('hex') });
      p = nul + 21;
    }
    return entries;
  };
  const selected = paths.map(relative => {
    let current = rootTree;
    const proof = [];
    const parts = relative.split('/');
    for (let i = 0; i < parts.length; i++) {
      const tree = objects.get(current);
      if (!tree || tree.type !== 'tree') throw Error(`Missing proof tree: ${relative}`);
      const entry = parseTree(tree.raw).find(item => item.name === parts[i]);
      if (!entry) throw Error(`Missing proof segment: ${relative}`);
      proof.push({ tree: current, name: entry.name, mode: entry.mode, id: entry.id });
      current = entry.id;
    }
    const blob = objects.get(current);
    if (!blob || blob.type !== 'blob' || current !== expressions.get(`${role.commit}:${relative}`)) throw Error(`Blob proof mismatch: ${relative}`);
    const checkoutBytes = fs.readFileSync(path.join(role.checkout, relative));
    const checkoutFile = save(`source\\${role.role}\\${relative.replaceAll('/', '\\')}`, checkoutBytes);
    return {
      repositoryPath: relative,
      gitBlob: current,
      gitObject: { path: blob.path, bytes: blob.bytes, sha256: blob.sha256 },
      checkout: checkoutFile,
      rawCheckoutEqualsRawGitBlob: checkoutBytes.equals(blob.raw),
      checksumBoundary: 'Both raw byte streams retained and hashed independently. No newline-normalized checksum is used.',
      proof
    };
  });
  records.push({
    ...role,
    rootTree,
    objects: [...objects.values()].map(({ raw: _, ...record }) => record),
    selected
  });
}

const guidancePaths = [
  '.github\\instructions\\cross-cutting-guidance.instructions.md',
  '.github\\instructions\\build.instructions.md',
  '.editorconfig',
  'src\\Mvc\\AGENTS.md',
  'docs\\BuildFromSource.md',
  'docs\\BuildErrors.md',
  'docs\\CrossCuttingGuidance.md'
];
const guidance = guidancePaths.map(relative => ({
  origin: `C:\\src\\aspnetcore\\${relative}`,
  boundary: 'Actual contributor guidance read at preparation; not asserted present at the pinned Original commit.',
  ...save(`guidance\\${relative}`, fs.readFileSync(path.join('C:\\src\\aspnetcore', relative)))
}));
const result = {
  findings: ['F187', 'F188', 'F189'],
  status: 'PENDING',
  rawChecksumOnly: true,
  sourceScope: 'Selected immutable Git objects and selected actual checkout documents, not all repository files.',
  roles: records,
  guidance
};
fs.writeFileSync(path.join(root, 'research\\source-records.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', roles: records.map(role => ({ role: role.role, selectedSources: role.selected.length, rawObjects: role.objects.length })), guidance: guidance.length }));
