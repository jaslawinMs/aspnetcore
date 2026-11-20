'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const payload = path.dirname(__dirname);
const root = path.dirname(payload);
const phase = process.argv[2];
if (fs.existsSync(path.join(payload, 'MANIFEST.json'))) throw Error('Frozen payload');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function write(name, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2));
  fs.writeFileSync(path.join(payload, 'evidence', name), name.endsWith('.gz') ? zlib.gzipSync(bytes) : bytes);
}
function inventory(directory) {
  const entries = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(full);
        entries.push({ path: path.relative(directory, full), bytes: bytes.length, sha256: sha(bytes) });
      } else entries.push({ path: path.relative(directory, full), nonFile: true });
    }
  }
  if (fs.existsSync(directory)) walk(directory);
  return { directory, phase, everyEntryIncluded: true, prefixExclusions: [], entries };
}
for (const [role, pin, short] of [
  ['Original', '37e809ead5824bc753a1c3d56f11615bdb1296c5', 'o'],
  ['ObservedDefaultC97', 'c97a797f19154e97f9723634a8033ef8325cb277', 'd'],
  ['FreshestObservedDefault90F', '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d', 'f']
]) {
  const checkout = path.join(root, 'work', short);
  const tree = cp.execFileSync('git', ['-C', checkout, 'ls-tree', '-r', '-z', '--full-tree', pin], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
  const entries = tree.split('\0').filter(Boolean).map(line => {
    const [, mode, kind, blob, name] = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
    const physical = path.join(checkout, ...name.split('/'));
    if (kind === 'commit') return { path: name, mode, kind, blob, status: 'external-gitlink' };
    if (!fs.existsSync(physical)) return { path: name, mode, kind, blob, status: 'missing-physical-path' };
    const bytes = fs.readFileSync(physical);
    const rawGitBlob = gitBlob(bytes);
    const lfBytes = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    const lfGitBlob = gitBlob(lfBytes);
    return { path: name, mode, kind, blob, bytes: bytes.length, rawSha256: sha(bytes), rawGitBlob, gitLfSha256: sha(lfBytes), gitLfBlob: lfGitBlob, rawMatches: rawGitBlob === blob, lfMatches: lfGitBlob === blob };
  });
  write(`source-${role}-${phase}.json.gz`, { role, pin, checkout, phase, scope: 'all pinned Git tree entries; raw and CRLF-to-LF metadata, not compiler-input attestation', fullTreeMaterializationAttested: false, entries });
  if (phase === 'before') {
    const selected = [
      'global.json', 'eng\\Version.Details.props', 'eng\\Versions.props',
      'src\\Hosting\\TestHost\\src\\AsyncStreamWrapper.cs', 'src\\Hosting\\TestHost\\src\\ClientHandler.cs',
      'src\\Hosting\\TestHost\\src\\HttpContextBuilder.cs', 'src\\Hosting\\TestHost\\src\\TestServer.cs',
      'src\\Hosting\\TestHost\\src\\TestServerOptions.cs', 'src\\Hosting\\TestHost\\src\\ResponseBodyWriterStream.cs',
      'src\\Hosting\\TestHost\\src\\ResponseBodyReaderStream.cs', 'src\\Hosting\\TestHost\\src\\Microsoft.AspNetCore.TestHost.csproj',
      'src\\Hosting\\TestHost\\test\\ResponseBodyTests.cs', 'src\\Hosting\\TestHost\\test\\TestServerTests.cs',
      'src\\Hosting\\TestHost\\test\\ClientHandlerTests.cs', 'src\\Hosting\\TestHost\\test\\Microsoft.AspNetCore.TestHost.Tests.csproj'
    ];
    for (const name of selected) {
      const destination = path.join(payload, 'source', role, name);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(checkout, name), destination);
    }
  }
}
const originalBin = path.join(root, 'work', 'o', 'artifacts', 'bin');
for (const [label, directory] of [
  ['native-owner', path.join(originalBin, 'Microsoft.AspNetCore.TestHost', 'Release', 'net12.0')],
  ['native-tests', path.join(originalBin, 'Microsoft.AspNetCore.TestHost.Tests', 'Release', 'net12.0')],
  ['common', path.join(root, 'work', 'common', 'net12.0')],
  ['runtime62', 'C:\\src\\aspnetcore\\.dotnet\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26562.105'],
  ['sdk57', 'C:\\src\\aspnetcore\\.dotnet\\sdk\\12.0.100-alpha.1.26557.102']
]) {
  write(`all-image-${label}-${phase}.json.gz`, inventory(directory));
}
console.log(`Collected ${phase}: all source-tree metadata and every file in selected image/toolchain scopes; no content-image exemptions.`);
