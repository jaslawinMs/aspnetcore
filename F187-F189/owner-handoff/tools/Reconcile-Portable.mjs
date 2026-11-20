import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileNative } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const receipt = reconcileNative(root);
fs.writeFileSync(path.join(root, 'research', 'xml-portable-reconciliation.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', reports: receipt.reports.length, actualRowExecutions: receipt.actualRowExecutions, byRole: receipt.byRole }));
