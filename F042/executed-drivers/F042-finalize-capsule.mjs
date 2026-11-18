import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042'), directory = path.join(session, 'autoperf-published-results', 'F042');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const archive = path.join(run, 'publication-preparation-001');
assert.equal(fs.existsSync(path.join(directory, 'prepublication-corrections.json')), false);
const previous = read(path.join(archive, 'capsule-file-hashes.json'));
const permittedChanges = new Set(['validation-commands.md', 'authoritative-copies.json',
  'capsule-build-001.stdout.txt', 'capsule-build-001.stderr.txt']);
for (const file of previous.files) {
  if (!permittedChanges.has(file.path)) assert.equal(sha(path.join(directory, ...file.path.split('/'))), file.sha256);
}
assert.equal(sha(path.join(directory, 'validation-commands.md')), sha(path.join(run, 'validation-commands.md')));
const copies = read(path.join(directory, 'authoritative-copies.json'));
copies.files = copies.files.filter(file => !file.path.startsWith('capsule-build-001.'));
const doc = copies.files.find(file => file.path === 'validation-commands.md');
doc.sha256 = sha(path.join(run, doc.path));
doc.bytes = fs.statSync(path.join(run, doc.path)).size;
for (const [fromName, toName] of [
  ['capsule-build-001.stdout.txt', 'assembly-initial-completion.stdout.txt'],
  ['capsule-build-001.stderr.txt', 'assembly-initial-completion.stderr.txt'],
  ['capsule-preparation.json', 'assembly-initial-completion.json']
]) {
  const from = path.join(run, fromName), to = path.join(directory, toName);
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  copies.files.push({ path: toName, sourcePath: fromName, bytes: fs.statSync(from).size, sha256: sha(from) });
}
copies.actualByteExactCopies = copies.files.length;
write(path.join(directory, 'authoritative-copies.json'), copies);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-drivers', 'F042-finalize-capsule.mjs'), fs.constants.COPYFILE_EXCL);
write(path.join(directory, 'prepublication-corrections.json'), {
  candidate: 'F042', actualBeforeAnyEvidenceCommit: true,
  actualGeneratedCommandRowsCorrected: 4, actualBrokenLocalLinksCorrected: 8,
  actualBootstrapOutputIsCombinedNotSeparateStreams: true,
  actualUnlaunchedExecutableArrayFailureNowLinkedDirectly: true,
  actualPrematureEmptyAssemblySnapshotsOmitted: 2,
  actualCompletedAssemblyOutputAndPhaseReceiptRetained: true,
  actualHistoricalTimingSourceInputsResultsAndExecutionRecordsChanged: false,
  initialUnpublishedSealSha256: sha(path.join(archive, 'capsule-file-hashes.json')),
  actualInitialMetadataArchivedPrivately: true
});
const files = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  assert.equal(entry.isSymbolicLink(), false);
  const file = path.join(root, entry.name);
  return entry.isDirectory() ? files(file) : [file];
});
const material = files(directory).filter(file => path.basename(file) !== 'capsule-file-hashes.json')
  .map(file => ({ path: path.relative(directory, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: sha(file) }))
  .sort((a, b) => a.path.localeCompare(b.path));
write(path.join(directory, 'capsule-file-hashes.json'), {
  candidate: 'F042', actualSelfReferenceExcluded: 'capsule-file-hashes.json', files: material
});
const broken = [], allowed = [];
for (const name of ['README.md', 'comparison-results.md', 'validation-commands.md', 'issue-template.md']) {
  for (const match of fs.readFileSync(path.join(directory, name), 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^(https?:|mailto:|#)/.test(link) || link.includes('{{')) continue;
    if (!fs.existsSync(path.resolve(directory, link.split('#')[0]))) {
      if (link === 'publication.json') allowed.push({ name, link, reason: 'Explicitly added in final receipt phase' });
      else broken.push({ name, link });
    }
  }
}
assert.equal(broken.length, 0, JSON.stringify(broken));
const audit = spawnSync(process.execPath, [path.join(directory, 'F042-verify.mjs'), directory, '--require-seal'],
  { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), audit.stdout);
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), audit.stderr);
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
const result = { candidate: 'F042', actualFinalImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copies.actualByteExactCopies, actualOmittedCompiledRestoreFiles: 581,
  actualSealedCapsuleAuditPassed: true, actualBrokenAuthoredArtifactLinks: broken.length,
  actualExplicitlyPendingReceiptLinks: allowed, actualHistoricalTimingRerun: false,
  actualCountersAdvanced: false, actualReportChanged: false };
fs.writeFileSync(path.join(run, 'capsule-finalization.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
