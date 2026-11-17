import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F015');
const execution = path.join(run, 'investigation-execution', 'attempt-001');
if (fs.existsSync(execution)) throw new Error('The immutable investigation attempt already exists.');
fs.mkdirSync(execution, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
let sequence = 0;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function command(label, executable, args, allowFailure = false) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({
    executable, arguments: args, workingDirectory: root, started, completed: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
  }, null, 2) + '\n');
  if ((result.error || result.status !== 0) && !allowFailure) {
    throw new Error(`${label} failed; preserved actual command/output at ${stem}`);
  }
  return result;
}
const text = result => result.stdout.toString('utf8').trim();
const baseline = JSON.parse(fs.readFileSync(path.join(run, 'acceptance.json'), 'utf8')).baseline;
const head = text(command('head', 'git', ['rev-parse', 'HEAD']));
if (head !== baseline) throw new Error('Independent branch requires the accepted campaign baseline.');
if (text(command('tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no']))) {
  throw new Error('Unexpected tracked modifications before source investigation.');
}
const previousBranch = text(command('previous-branch', 'git', ['branch', '--show-current']));
const defaultResult = command('fresh-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']);
const current = JSON.parse(defaultResult.stdout);
const present = command('default-object-check', 'git', ['cat-file', '-e', `${current.sha}^{commit}`], true);
if (present.status !== 0) command('fetch-default', 'git', ['fetch', '--no-tags', 'origin', 'main']);
command('owner-history', 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits',
  '-f', 'sha=main', '-f', 'path=src/DataProtection/DataProtection/src/Managed/ManagedAuthenticatedEncryptor.cs', '-f', 'per_page=6']);
command('factory-history', 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits',
  '-f', 'sha=main', '-f', 'path=src/DataProtection/DataProtection/src/AuthenticatedEncryption/ManagedAuthenticatedEncryptorFactory.cs', '-f', 'per_page=6']);
command('open-owner-pr-search', 'gh', ['search', 'prs', 'ManagedAuthenticatedEncryptor', '--repo', 'dotnet/aspnetcore',
  '--state', 'open', '--limit', '30', '--json', 'number,title,url,updatedAt']);
const files = [
  'src\\DataProtection\\DataProtection\\src\\Managed\\ManagedAuthenticatedEncryptor.cs',
  'src\\DataProtection\\DataProtection\\src\\AuthenticatedEncryption\\ManagedAuthenticatedEncryptorFactory.cs',
  'src\\DataProtection\\DataProtection\\src\\AuthenticatedEncryption\\ConfigurationModel\\ManagedAuthenticatedEncryptorConfiguration.cs',
  'src\\DataProtection\\DataProtection\\src\\AuthenticatedEncryption\\ConfigurationModel\\ManagedAuthenticatedEncryptorDescriptor.cs',
  'src\\DataProtection\\DataProtection\\src\\AuthenticatedEncryption\\IAuthenticatedEncryptor.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\IKey.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\Key.cs',
  'src\\DataProtection\\DataProtection\\src\\Secret.cs',
  'src\\DataProtection\\DataProtection\\src\\Microsoft.AspNetCore.DataProtection.csproj',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\Microsoft.AspNetCore.DataProtection.Tests.csproj',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\Managed\\ManagedAuthenticatedEncryptorTests.cs',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\AuthenticatedEncryption\\ManagedAuthenticatedEncryptorFactoryTest.cs',
  'src\\DataProtection\\build.cmd',
  'Directory.Build.props',
  'eng\\Versions.props',
  '.editorconfig',
  '.github\\instructions\\cross-cutting-guidance.instructions.md',
  'docs\\CrossCuttingGuidance.md',
  'docs\\BuildFromSource.md',
];
const triples = [];
for (const [index, relative] of files.entries()) {
  const gitPath = relative.replaceAll('\\', '/');
  const roles = {};
  for (const [role, revision] of [['baseline', baseline], ['current-default', current.sha]]) {
    const bytes = command(`source-${String(index).padStart(2, '0')}-${role}`, 'git', ['show', `${revision}:${gitPath}`]).stdout;
    const destination = path.join(run, 'sources', role, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    const objectId = text(command(`blob-${String(index).padStart(2, '0')}-${role}`, 'git', ['rev-parse', `${revision}:${gitPath}`]));
    roles[role] = { revision, sha256: hash(bytes), bytes: bytes.length, gitBlob: objectId };
  }
  const absolute = path.join(root, relative);
  const bytes = fs.readFileSync(absolute);
  const destination = path.join(run, 'sources', 'working', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  const canonicalBlob = text(command(`canonical-working-${String(index).padStart(2, '0')}`, 'git', ['hash-object', `--path=${gitPath}`, absolute]));
  roles.working = { sha256: hash(bytes), bytes: bytes.length, canonicalGitBlob: canonicalBlob };
  triples.push({ path: relative, roles, workingMatchesBaselineCanonicalBlob: canonicalBlob === roles.baseline.gitBlob,
    currentDefaultMatchesBaselineCanonicalBlob: roles['current-default'].gitBlob === roles.baseline.gitBlob });
}
const owner = triples[0];
const defaultOwner = fs.readFileSync(path.join(run, 'sources', 'current-default', owner.path), 'utf8');
const marker = 'public byte[] Encrypt(ArraySegment<byte> plaintext, ArraySegment<byte> additionalAuthenticatedData)';
const legacyDefault = defaultOwner.slice(defaultOwner.indexOf(marker), defaultOwner.indexOf('#if NET\n    private bool ValidateMac'));
if (!legacyDefault.includes('var outputStream = new MemoryStream();')) {
  throw new Error('Current default no longer has the accepted original capacity seam.');
}
if (triples.some(entry => !entry.workingMatchesBaselineCanonicalBlob)) throw new Error('Working/source canonical baseline differs.');
command('platform', 'powershell.exe', ['-NoProfile', '-Command',
  "$ErrorActionPreference='Stop'; $p=Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full'; $f=Get-Item 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\mscorlib.dll'; [pscustomobject]@{Version=$p.Version;Release=$p.Release;CorelibPath=$f.FullName;CorelibFileVersion=$f.VersionInfo.FileVersion;CorelibSha256=(Get-FileHash $f.FullName -Algorithm SHA256).Hash;ExecutionClaimed=$false}|ConvertTo-Json"]);
const branch = 'autoperf/F015-managed-encryption-capacity';
command('create-independent-branch', 'git', ['switch', '-c', branch, baseline]);
const result = {
  candidate: 'F015', baseline, capturedDefault: current.sha, defaultCommittedAt: current.commit.committer.date,
  previousBranch, independentBranch: branch, sourceTriples: triples, sourceCandidateCreated: false,
  legacyDefaultCapacitySeamVerified: true, sourceTripleCount: triples.length,
  checkedActualDefaultNotJustCampaignSnapshot: true, capturedAt: new Date().toISOString(),
  producerBoundary: 'Actual public Secret.Random/managed descriptor/factory/backend. Only IKey descriptor carrier mocked during setup; no private access or copied backend.',
  frameworkBoundary: 'net472 owning tests against real net462 product on installed Framework; net12 benchmark must explicitly load real netstandard2.0 product. No Framework timing claim.',
  preliminaryTargetObservations: 'investigation\\preliminary-platform-observations.json',
  noPerformanceClaimBeforeActualNativeChecksAndPairedProfiles: true,
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sourceTriples: triples.length, baseline, capturedDefault: current.sha, branch,
  changedOnDefault: triples.filter(item => !item.currentDefaultMatchesBaselineCanonicalBlob).map(item => item.path) }, null, 2));
