import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F016');
const execution = path.join(run, 'investigation-execution', 'attempt-001');
if (fs.existsSync(execution)) throw new Error('Never overwrite actual investigation evidence.');
fs.mkdirSync(execution, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const acceptance = JSON.parse(fs.readFileSync(path.join(run, 'acceptance.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
let sequence = 0;
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
  if ((result.error || result.status !== 0) && !allowFailure) throw new Error('Actual investigation failed; preserve ' + stem);

  return result;
}
const text = result => result.stdout.toString('utf8').trim();
if (text(command('head', 'git', ['rev-parse', 'HEAD'])) !== acceptance.baseline ||
  text(command('branch', 'git', ['branch', '--show-current'])) !== acceptance.branch ||
  text(command('tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no']))) {
  throw new Error('Independent unchanged original F016 branch required.');
}
const current = JSON.parse(command('fresh-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']).stdout);
const present = command('default-object-check', 'git', ['cat-file', '-e', `${current.sha}^{commit}`], true);
if (present.status !== 0) command('fetch-default', 'git', ['fetch', '--no-tags', 'origin', 'main']);
command('owner-history', 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', 'sha=main',
  '-f', 'path=src/DataProtection/DataProtection/src/Managed/ManagedAuthenticatedEncryptor.cs', '-f', 'per_page=6']);
command('factory-history', 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', 'sha=main',
  '-f', 'path=src/DataProtection/DataProtection/src/AuthenticatedEncryption/ManagedAuthenticatedEncryptorFactory.cs', '-f', 'per_page=6']);
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
  for (const [role, revision] of [['baseline', acceptance.baseline], ['current-default', current.sha]]) {
    const bytes = command(`source-${String(index).padStart(2, '0')}-${role}`, 'git', ['show', `${revision}:${gitPath}`]).stdout;
    const destination = path.join(run, 'sources', role, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    const gitBlob = text(command(`blob-${String(index).padStart(2, '0')}-${role}`, 'git', ['rev-parse', `${revision}:${gitPath}`]));
    roles[role] = { revision, sha256: hash(bytes), bytes: bytes.length, gitBlob };
  }
  const absolute = path.join(root, relative);
  const bytes = fs.readFileSync(absolute);
  const destination = path.join(run, 'sources', 'working', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx' });
  const canonicalGitBlob = text(command(`canonical-working-${String(index).padStart(2, '0')}`, 'git', ['hash-object', `--path=${gitPath}`, absolute]));
  roles.working = { sha256: hash(bytes), bytes: bytes.length, canonicalGitBlob };
  triples.push({ path: relative, roles, workingMatchesBaselineCanonicalBlob: canonicalGitBlob === roles.baseline.gitBlob,
    currentDefaultMatchesBaselineCanonicalBlob: roles['current-default'].gitBlob === roles.baseline.gitBlob });
}
if (triples.some(entry => !entry.workingMatchesBaselineCanonicalBlob)) throw new Error('Actual working source differs from the accepted original.');
const owner = fs.readFileSync(path.join(run, 'sources', 'current-default', files[0]), 'utf8');
const start = owner.indexOf('public byte[] Decrypt(ArraySegment<byte> protectedPayload, ArraySegment<byte> additionalAuthenticatedData)');
const end = owner.indexOf('private byte[] CreateContextHeader()', start);
const method = owner.slice(start, end);
if (start < 0 || end < 0 || !method.includes('var outputStream = new MemoryStream();') ||
  !method.includes('cryptoStream.Write(protectedPayload.Array, ciphertextOffset, macOffset - ciphertextOffset);') ||
  !method.includes('cryptoStream.FlushFinalBlock();') || !method.includes('return outputStream.ToArray();')) {
  throw new Error('Current default no longer has the accepted original decryption seam.');
}
command('related-modern-pr', 'gh', ['pr', 'view', '70146', '--repo', 'dotnet/aspnetcore',
  '--json', 'number,title,body,url,mergedAt,mergeCommit,files']);
command('platform', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', ['-NoProfile', '-Command',
  "$ErrorActionPreference='Stop'; $p=Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full'; $f=Get-Item 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\mscorlib.dll'; [pscustomobject]@{Version=$p.Version;Release=$p.Release;CorelibPath=$f.FullName;CorelibFileVersion=$f.VersionInfo.FileVersion;CorelibSha256=(Get-FileHash $f.FullName -Algorithm SHA256).Hash;ExecutionClaimed=$false}|ConvertTo-Json"]);
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify({
  candidate: 'F016', baseline: acceptance.baseline, capturedDefault: current.sha,
  defaultCommittedAt: current.commit.committer.date, independentBranch: acceptance.branch,
  sourceTriples: triples, sourceTripleCount: triples.length, legacyDefaultCapacitySeamVerified: true,
  exactPlaintextSizeNotKnownFromPaddedCiphertextAlone: true, alignedAndPartialBlockControlsRequired: true,
  checkedActualDefaultNotJustCampaignSnapshot: true, sourceCandidateCreated: false,
  frameworkBoundary: 'Actual net472/x64 executable against real net462 product on installed Framework; optional net12 compatibility host against actual netstandard2.0. No modern-path timing claim.',
  producerBoundary: 'Actual public configuration/Secret.Random/descriptor/factory; public Encrypt produces fixed payload outside timing; actual Decrypt has no per-operation RNG claim.',
  historicalFindingNotRewritten: true, noPerformanceClaimBeforeActualNativeChecksAndPairedProfiles: true,
  capturedAt: new Date().toISOString(),
}, null, 2) + '\n');
console.log(JSON.stringify({ candidate: 'F016', sourceTriples: triples.length, baseline: acceptance.baseline,
  capturedDefault: current.sha, branch: acceptance.branch,
  changedOnDefault: triples.filter(item => !item.currentDefaultMatchesBaselineCanonicalBlob).map(item => item.path) }, null, 2));
