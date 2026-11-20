import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb, parseTrx, readJson } from './capsule/evidence.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const roles = readJson(path.join(root, 'roles.json'));
for (const role of ['original37', 'default']) {
  const bin = path.join(roles[role], 'artifacts', 'bin', 'Microsoft.AspNetCore.Http.Abstractions.Tests', 'Debug', 'net12.0');
  const pe = parsePe(fs.readFileSync(path.join(bin, 'Microsoft.AspNetCore.Http.Abstractions.Tests.dll')));
  const pdb = parsePdb(fs.readFileSync(path.join(bin, 'Microsoft.AspNetCore.Http.Abstractions.Tests.pdb')));
  const doc = pdb.documents.find(d => d.name.endsWith('UseWhenExtensionsTests.cs'));
  console.log(JSON.stringify({ role, mvid: pe.mvid, codeView: pe.codeView, pdbGuid: pdb.guid, pdbStamp: pdb.stamp, documents: pdb.documentCount, useWhenDocument: doc }));
  for (const attempt of fs.readdirSync(path.join(root, 'native', role))) {
    const dir = path.join(root, 'native', role, attempt);
    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.trx'))) {
      const trx = parseTrx(fs.readFileSync(path.join(dir, name), 'utf8'));
      console.log(JSON.stringify({ role, attempt, runId: trx.runId, outcome: trx.outcome, counters: trx.counters, names: trx.rows.map(row => row.testName) }));
    }
  }
}
