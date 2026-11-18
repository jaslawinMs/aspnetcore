import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const session = path.dirname(script);
const run = path.join(session, 'autoperf-runs', 'F120');
const destination = path.join(session, 'autoperf-published-results', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(destination, file).replaceAll('\\', '/');
assert.equal(fs.existsSync(path.join(destination, 'capsule-file-hashes.json')), false);
assert.equal(fs.existsSync(path.join(run, 'capsule-preparation.json')), false);
assert.equal(read(path.join(destination, 'portable-capsule-audit-command.json')).actualExitCode, 0);
const copiesPath = path.join(destination, 'authoritative-copies.json');
const copies = read(copiesPath);
assert.equal(copies.actualByteExactCopies, copies.files.length);
for (const item of copies.files) {
  const file = path.join(destination, ...item.path.split('/'));
  assert.equal(sha(file), item.sha256);
  assert.equal(fs.statSync(file).size, item.bytes);
}
const preserved = path.join(destination, 'capsule-preparation-001', 'authoritative-copies-before-self-link-recovery.json');
fs.mkdirSync(path.dirname(preserved));
fs.copyFileSync(copiesPath, preserved, fs.constants.COPYFILE_EXCL);
const retainedScript = path.join(destination, 'executed-drivers', 'F120-finalize-capsule.mjs');
fs.copyFileSync(script, retainedScript, fs.constants.COPYFILE_EXCL);
for (const file of [preserved, retainedScript]) copies.files.push({
  path: relative(file), bytes: fs.statSync(file).size, sha256: sha(file)
});
copies.actualByteExactCopies = copies.files.length;
copies.actualGeneratedManifestBeforeRecoveryPreservedAt = relative(preserved);
copies.actualRecoveryChangedNoRawSourceRunOrTestEvidence = true;
fs.writeFileSync(copiesPath, JSON.stringify(copies, null, 2) + '\n');
const links = [];
for (const name of ['README.md', 'validation-commands.md', 'comparison-results.md', 'issue-template.md']) {
  const text = fs.readFileSync(path.join(destination, name), 'utf8');
  for (const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#|\{\{)/.test(target)) continue;
    const file = path.resolve(destination, path.dirname(name), ...decodeURIComponent(target.split('#')[0]).split('/'));
    const selfManifest = file === path.join(destination, 'capsule-file-hashes.json');
    assert.ok(selfManifest || fs.existsSync(file), 'Broken authored artifact link: ' + name + ' -> ' + target);
    links.push({ source: name, target, actualSelfManifestCreationDeferred: selfManifest, actualExistsAfterFinalSeal: true });
  }
}
write(path.join(destination, 'authored-link-audit.json'), {
  candidate: 'F120', actualCheckedLocalLinks: links.length, actualBrokenLocalLinks: 0,
  actualSelfManifestLinkCheckedAfterCreation: true,
  actualLateReceiptExternalLinkVerifiedOnlyAfterPublication: true, links
});
write(path.join(destination, 'capsule-preparation-recovery.json'), {
  candidate: 'F120',
  actualOriginalPreparationStoppedBeforeSeal: 'The local-link checker reached the manifest self-link before creating the self-excluded manifest. The copied-capsule data audit had already passed.',
  actualCorrection: 'Validate ordinary local targets now; create the self-excluded seal and then require its target to exist. Preserve the original generated copy manifest and original failed driver.',
  actualOriginalCopiedFileHashesAllReverified: true, actualOriginalFailedDriverPreserved: true,
  actualRawSourceRunTestAndReconstructionEvidenceUnchanged: true,
  actualAdditionalTimingSamples: 0, actualCountersAdvanced: false
});
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const file = path.join(directory, item.name);
    return item.isDirectory() ? files(file) : [file];
  });
}
const material = files(destination).map(file => ({
  path: relative(file), bytes: fs.statSync(file).size, sha256: sha(file)
})).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
write(path.join(destination, 'capsule-file-hashes.json'), {
  candidate: 'F120', actualSelfReferenceAndAdditiveReceiptExcluded: ['capsule-file-hashes.json', 'publication.json'], files: material
});
for (const link of links) assert.equal(fs.existsSync(path.resolve(destination, ...link.target.split('#')[0].split('/'))), true);
const args = [path.join(destination, 'F120-verify.mjs'), destination, '--require-seal'];
const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
write(path.join(run, 'sealed-capsule-audit-command.json'), {
  executable: process.execPath, arguments: args, actualExitCode: result.status, actualAdditionalTiming: 0
});
assert.equal(result.status, 0, result.stderr || result.stdout);
write(path.join(run, 'capsule-preparation.json'), {
  candidate: 'F120', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copies.actualByteExactCopies,
  actualOmittedCompiledRestoreFiles: read(path.join(destination, 'omitted-file-hashes.json')).actualOmittedFiles,
  actualCopiedCapsuleAuditPassed: true, actualSealedCapsuleAuditPassed: true,
  actualBrokenAuthoredArtifactLinks: 0, actualCheckedAuthoredLocalLinks: links.length,
  actualOriginalPreparationSelfLinkFailurePreserved: true,
  actualHistoricalTimingRerun: false, actualCountersAdvanced: false, actualReportChanged: false
});
console.log(JSON.stringify(read(path.join(run, 'capsule-preparation.json')), null, 2));
