import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F012');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const copies = [];
for (const name of ['publish-source.ps1', 'package.ps1', 'publish-results.ps1']) {
  const source = fs.readFileSync(path.join(session, 'F011-' + name));
  let text = source.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F011', 'F012');
  if (name === 'package.ps1') {
    const replace = (before, after) => {
      assert.equal(text.split(before).length - 1, 1, before);
      text = text.replace(before, after);
    };
    replace('retained_results = 87; upper_filtered_samples = 9', 'retained_results = 91; upper_filtered_samples = 5');
    replace('actual_overheads = 227;', 'actual_overheads = 223;');
    replace('actual_area_rows = 27; repository_sentinel_rows = 0',
      'actual_area_rows = 27; explicitly_reused_original_area_rows = 27; actual_new_owning_test_runs = 0; repository_sentinel_rows = 0');
    const old = text.match(/^\$commands\.Add\('Source-triple reader exits1 .*$/m);
    assert(old);
    text = text.replace(old[0], "$commands.Add('Original investigation final-metadata reader exits1 on an invalid nested Windows drive path after source captures; corrected reader resumes byte-identical captures. Audit-scaffold reader expects LF but actual template has540 CRLFs; exact failed source/observations retained, original tool stderr not separately redirected. Corrected scaffold logged. Four new F012 native commands exit0: one restore, one build, two complete independent broadcast characterizations. Original F01127-row owning-suite and current JSON producer bytes are explicitly reused/rehashed, not rerun/rebuilt. Repository JSON outputs unchanged. One new12-shape original-only profile, no paired comparisons or F011 timing reuse.')");
    replace('Every fresh .NET shell activates', 'Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual original timestamps/outcomes; they did not run again under F012. Every fresh .NET shell activates');
  }
  if (name === 'publish-results.ps1') {
    assert(text.includes('SignalR group exclusion snapshot rejection'));
    text = text.replace('SignalR group exclusion snapshot rejection', 'SignalR broadcast exclusion snapshot rejection');
  }
  const destination = path.join(session, 'F012-' + name);
  assert(!fs.existsSync(destination));
  fs.writeFileSync(destination, text);
  copies.push({ source: 'F011-' + name, destination: 'F012-' + name, sourceSha256: sha(source), resultSha256: sha(Buffer.from(text)) });
}
const attributes = fs.readFileSync(path.join(session, 'F011-package-gitattributes.txt'));
assert(!fs.existsSync(path.join(session, 'F012-package-gitattributes.txt')));
fs.writeFileSync(path.join(session, 'F012-package-gitattributes.txt'), attributes);
fs.writeFileSync(path.join(run, 'publication-tools-attribution.json'), JSON.stringify({
  candidate: 'F012', files: copies,
  changes: 'Checked ID, independent broadcast labeling, actual91-retained/223-overhead observations and explicit original owning-suite/current-producer reuse. Fork-only source/evidence guards unchanged.',
}, null, 2) + '\n');
console.log('F012 fork-only source/package/evidence drivers prepared from checked prior art; no publication launched.');
