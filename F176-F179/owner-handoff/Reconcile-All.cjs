'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { reconcile } = require('./Reconcile.cjs');
const root = __dirname, mode = process.argv[2] ?? 'modules';
const selection = JSON.parse(fs.readFileSync(path.join(root, 'native-selection.json')));
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const runs = [];
for (const role of ['original', 'default']) for (const group of selection.groups) {
  const label = `${role}-${group.kind}-${mode}`;
  const trx = `evidence/native-${label}/${label}.trx`, receipt = `evidence/${label}.receipt.json`;
  const command = JSON.parse(fs.readFileSync(path.join(root, receipt)));
  assert.equal(command.exitCode, 0);
  const image = path.join(graphs[`${role}Path`], 'artifacts', 'bin', group.assembly, 'Release', 'net12.0');
  runs.push({ role, kind: group.kind, mode, trx, receipt,
    ...reconcile(fs.readFileSync(path.join(root, trx), 'utf8'), group, image) });
}
const output = path.join(root, `native-reconciled-${mode}.json`);
assert(!fs.existsSync(output));
fs.writeFileSync(output, JSON.stringify({ boundary: selection.boundary, runs }, null, 2) + '\n');
console.log(JSON.stringify(runs.map(run => ({ role: run.role, kind: run.kind, rows: run.rows.length, outcomes: run.rows.map(row => row.outcome) }))));
