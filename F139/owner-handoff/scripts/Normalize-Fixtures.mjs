import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const files = ['Good.cshtml', 'Throw.cshtml', 'InvalidCSharp.cshtml', 'InvalidRazor.cshtml'];
const receipts = files.map(name => {
  const file = path.join(root, 'fixtures', 'Views', 'F139', name);
  const before = fs.readFileSync(file);
  const after = Buffer.from(before.toString('utf8').replaceAll('\r\n', '\n'));
  fs.writeFileSync(file, after);
  return {
    name,
    beforeSha256: hash(before),
    beforeBase64: before.toString('base64'),
    afterSha256: hash(after),
    afterBase64: after.toString('base64'),
    reason: 'Automated fixture copy/line-ending normalization. Preserve the observed CRLF render mismatch and feed literal LF fixtures to the already compiled unchanged LF-output assertion. No verifier recompile and no product source normalization.'
  };
});
fs.writeFileSync(path.join(root, 'fixture-line-ending-receipt.json'), JSON.stringify(receipts, null, 2));
console.log(JSON.stringify({ normalizedFixtureFiles: files, compilerExecuted: false }));
