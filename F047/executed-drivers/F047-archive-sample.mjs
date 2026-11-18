import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F047');
const root = 'C:\\src\\aspnetcore';
const browser = JSON.parse(fs.readFileSync(path.join(run, 'selenium-candidate-001', 'verified-result.json'), 'utf8'));
assert.equal(browser.actualPassed, 14);
assert.equal(browser.actualAllCapturedOwnedHelpersGone, true);
const files = [
  'src/Components/Samples/BlazorWebAppPerPage/Components/Pages/F047ParameterProbe.razor',
  'src/Components/Samples/BlazorWebAppPerPage.Client/Pages/F047ParameterChild.razor'
].map(relative => {
  const source = path.join(root, ...relative.split('/'));
  const bytes = fs.readFileSync(source);
  const destination = path.join(run, 'sample-sources', ...relative.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx' });
  return { path: relative, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() };
});
fs.writeFileSync(path.join(run, 'sample-source-archive.json'), JSON.stringify({
  candidate: 'F047', actualArchivedBeforeRemoval: true, actualPermanentBrowserRowsPassed: 14,
  actualOnlyTheseTwoTaskOwnedPathsMayBeRemoved: true, files
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualArchivedTemporaryFiles: files.length, actualOnlyTaskOwnedFilesSelected: true }, null, 2));
