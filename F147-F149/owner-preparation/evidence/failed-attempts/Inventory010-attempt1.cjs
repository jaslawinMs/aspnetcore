'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = __dirname;
if (fs.existsSync(path.join(root, 'MANIFEST.json'))) {
  throw new Error('Frozen capsule: use the read-only auditor.');
}
const hash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (relative, value) => fs.writeFileSync(path.join(root, relative), JSON.stringify(value, null, 2) + '\n');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { throw new Error(`Unexpected junction/symlink in image: ${full}`); }
    return entry.isDirectory() ? walk(full) : [full];
  }).sort();
const pins = {
  Original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
  CurrentDefault: '00560e2dd1954a2acf2bc54b35422b0f32484bf1'
};
const sourceResults = [];
for (const [role, pin] of Object.entries(pins)) {
  const tree = cp.execFileSync('git', ['--no-pager', '-C', 'C:\\src\\aspnetcore', 'ls-tree', '-r', '-z', pin],
    { maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
  const files = [];
  for (const row of tree) {
    const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(row);
    if (!match) { throw new Error('Unexpected raw git tree record'); }
    const [, mode, kind, expectedGitBlob, gitPath] = match;
    const relative = gitPath.replaceAll('/', '\\');
    const absolute = path.join(root, 'graphs', role, ...gitPath.split('/'));
    if (kind !== 'blob') {
      files.push({ path: relative, mode, kind, expectedGitBlob, externalGitlinkNotAttested: true });
      continue;
    }
    if (!fs.existsSync(absolute)) {
      files.push({ path: relative, mode, kind, expectedGitBlob, missing: true });
      continue;
    }
    const bytes = fs.readFileSync(absolute);
    const rawGitBlob = hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), 'sha1').toLowerCase();
    const text = bytes.toString('utf8');
    const isUtf8Text = !bytes.includes(0) && Buffer.from(text, 'utf8').equals(bytes);
    const lfBytes = isUtf8Text ? Buffer.from(text.replaceAll('\r\n', '\n'), 'utf8') : bytes;
    const lfGitBlob = hash(Buffer.concat([Buffer.from(`blob ${lfBytes.length}\0`), lfBytes]), 'sha1').toLowerCase();
    files.push({
      path: relative, mode, kind, expectedGitBlob,
      bytes: bytes.length, rawSha256: hash(bytes), rawGitBlob,
      rawGitBlobMatches: rawGitBlob === expectedGitBlob,
      utf8Text: isUtf8Text, crlfPresent: isUtf8Text && text.includes('\r\n'),
      lfCanonicalGitBlob: lfGitBlob, lfCanonicalMatches: lfGitBlob === expectedGitBlob
    });
  }
  const summary = {
    role, pin, trackedEntries: files.length,
    blobCount: files.filter(file => file.kind === 'blob').length,
    missing: files.filter(file => file.missing),
    rawBlobMismatches: files.filter(file => file.kind === 'blob' && !file.missing && !file.rawGitBlobMatches),
    lfCanonicalMismatches: files.filter(file => file.kind === 'blob' && !file.missing && !file.lfCanonicalMatches),
    externalGitlinks: files.filter(file => file.externalGitlinkNotAttested),
    scope: 'Every git-tree entry, not untracked/generated files or external toolchains.',
    fullCompilerInputAttestation: false
  };
  writeJson(`evidence\\${role}-complete-git-source-map.json`, { summary, files });
  sourceResults.push(summary);
  console.log(`${role} source entries=${files.length} missing=${summary.missing.length} rawMismatch=${summary.rawBlobMismatches.length}`);
}
writeJson('evidence\\SOURCE-GRAPH-BOUNDARY.json', sourceResults);
const selected = new Map(walk(path.join(root, 'evidence', 'selected-images')).map(file => {
  const bytes = fs.readFileSync(file);
  return [`${path.basename(file)}:${hash(bytes)}`, path.relative(root, file)];
}));
const imageRoots = {
  CommonConsumer: path.join(root, 'graphs', 'Original', 'artifacts', 'bin', 'InMemory.FunctionalTests', 'Release', 'net12.0'),
  OriginalSample: path.join(root, 'graphs', 'Original', 'artifacts', 'bin', 'WebTransportInteractiveSampleApp', 'Release', 'net12.0'),
  CurrentDefaultSample: path.join(root, 'graphs', 'CurrentDefault', 'artifacts', 'bin', 'WebTransportInteractiveSampleApp', 'Release', 'net12.0'),
  Runtime57: 'C:\\src\\aspnetcore\\.dotnet\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26557.102'
};
const images = {};
for (const [id, directory] of Object.entries(imageRoots)) {
  const files = walk(directory).map(file => {
    const bytes = fs.readFileSync(file);
    const sha256 = hash(bytes);
    return { path: path.relative(directory, file), bytes: bytes.length, sha256,
      selectedPortablePath: selected.get(`${path.basename(file)}:${sha256}`) ?? null };
  });
  images[id] = {
    physicalDirectory: directory, completeFileInventory: true, prefixExclusions: [],
    fileCount: files.length, byteCount: files.reduce((total, file) => total + file.bytes, 0), files
  };
  console.log(`${id} image files=${files.length}`);
}
writeJson('evidence\\COMPLETE-IMAGE-HASH-MAPS.json', images);
const original = new Map(images.OriginalSample.files.map(file => [file.path, file]));
const current = new Map(images.CurrentDefaultSample.files.map(file => [file.path, file]));
const differences = [...new Set([...original.keys(), ...current.keys()])].sort()
  .filter(name => original.get(name)?.sha256 !== current.get(name)?.sha256)
  .map(name => ({ path: name, originalSha256: original.get(name)?.sha256 ?? null,
    currentDefaultSha256: current.get(name)?.sha256 ?? null }));
const commonMaps = fs.readdirSync(path.join(root, 'evidence')).filter(name => /-consumer-\d+-(before|after)\.json$/.test(name));
const canonical = image => JSON.stringify(image.files.map(file => [file.path, file.bytes, file.sha256]));
const baseline = canonical(images.CommonConsumer);
const commonChecks = commonMaps.map(file => ({ map: `evidence\\${file}`, identicalToCommonOnceImage: canonical(readJson(`evidence\\${file}`)) === baseline }));
if (!commonChecks.every(check => check.identicalToCommonOnceImage)) {
  throw new Error('Common-once output changed across discovery or actual test roles.');
}
writeJson('evidence\\IMAGE-COMPATIBILITY-BOUNDARY.json', {
  commonOnce: true, commonConsumerSuccessfulBuild: 'Original-Fixture-build-3',
  earlierCompileFailuresPreserved: ['Original-Fixture-build-1', 'Original-Fixture-build-2'],
  commonPhysicalOutputDirectoryReused: images.CommonConsumer.physicalDirectory,
  allCommonFileChecks: commonChecks,
  commonActualProducerSourceRole: 'Original',
  currentDefaultSampleExecutedAgainstOriginalCommonManagedProducer: true,
  currentDefaultWholeKestrelRuntimeGraphClaimed: false,
  sampleGraphDifferences: differences,
  nonSampleOwnerDifferences: differences.filter(file => !['WebTransportInteractiveSampleApp.dll', 'WebTransportInteractiveSampleApp.pdb'].includes(file.path)),
  originalAndDefaultAreCausalPerformancePair: false,
  candidateExists: false,
  reason: 'Two unchanged-source historical characterizations, not an optimization pair; full fresh sample output graphs have non-owner differences.',
  prefixExclusions: []
});
console.log(`Common-once checks=${commonChecks.length}; sample graph differing files=${differences.length}`);
