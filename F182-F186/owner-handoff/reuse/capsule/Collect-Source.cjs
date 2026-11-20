'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const hash = (b, kind = 'sha256') => crypto.createHash(kind).update(b).digest('hex').toUpperCase();
const write = (p, b) => { const out = path.join(root, p); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, b); };
const records = [];
const paths = [
  'src/Identity/test/InMemory.Test/InMemoryStore.cs',
  'src/Identity/test/InMemory.Test/InMemoryUserStore.cs',
  'src/Identity/test/InMemory.Test/InMemoryStoreTest.cs',
  'src/Identity/test/InMemory.Test/InMemoryUserStoreTest.cs',
  'src/Identity/test/InMemory.Test/FunctionalTest.cs',
  'src/Identity/test/InMemory.Test/ControllerTest.cs',
  'src/Identity/test/InMemory.Test/Microsoft.AspNetCore.Identity.InMemory.Test.csproj',
  'src/Identity/testassets/Identity.DefaultUI.WebSite/PocoUserStartup.cs',
  'src/Identity/Specification.Tests/src/IdentitySpecificationTestBase.cs',
  'src/Identity/Specification.Tests/src/UserManagerSpecificationTests.cs',
  'src/Identity/Specification.Tests/src/Microsoft.AspNetCore.Identity.Specification.Tests.csproj',
  'src/Identity/Extensions.Core/src/UserManager.cs',
  'src/Identity/Extensions.Core/src/RoleManager.cs',
  'src/Identity/Extensions.Core/src/IdentityServiceCollectionExtensions.cs',
  'src/Identity/Extensions.Core/src/IdentityBuilder.cs',
  'src/Identity/Extensions.Core/src/Microsoft.Extensions.Identity.Core.csproj',
  'src/Identity/Core/src/IdentityServiceCollectionExtensions.cs',
  'src/Identity/Directory.Build.props',
  'src/Identity/build.cmd',
  'src/Identity/README.md',
  'Directory.Build.props',
  'Directory.Build.targets',
  'Directory.Packages.props',
  'global.json',
  'eng/Versions.props',
  'eng/Common.props',
  'eng/targets/Test.targets',
  'eng/targets/References.props',
  'eng/tools/GenerateFiles/GenerateFiles.csproj',
  'eng/tools/GenerateFiles/Directory.Build.props.in',
  'docs/BuildFromSource.md',
  'docs/BuildErrors.md',
  'docs/CrossCuttingGuidance.md',
  '.github/copilot-instructions.md',
  '.github/instructions/cross-cutting-guidance.instructions.md',
  'activate.ps1'
];
function git(repo, args) {
  const result = cp.spawnSync('git', ['--no-pager', '-C', repo, ...args], { encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
for (const role of ['original', 'default']) {
  const repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  const shared = git(repo, ['ls-tree', '-r', '--name-only', commit, '--', 'src/Identity/test/Shared']).toString('utf8').trim().split('\n').filter(Boolean);
  const instructionInventory = git(repo, ['ls-tree', '-r', '--name-only', commit, '--', 'AGENTS.md', 'src/AGENTS.md', 'src/Identity'])
    .toString('utf8').split('\n').filter(p => p === 'AGENTS.md' || p.endsWith('/AGENTS.md'));
  write(`docs/${role}-AGENTS-inventory.txt`, JSON.stringify({ scope: ['AGENTS.md', 'src/AGENTS.md', 'src/Identity/**'], found: instructionInventory }, null, 2) + '\n');
  for (const source of [...new Set([...paths, ...shared])]) {
    const listing = git(repo, ['ls-tree', commit, '--', source]).toString('utf8').trim();
    if (!listing) {
      records.push({ role, commit, source, absent: true });
      continue;
    }
    const blob = listing.split(/\s+/)[2];
    const bytes = git(repo, ['cat-file', 'blob', blob]);
    const selected = `source/${role}/${source}`;
    write(selected, bytes);
    records.push({ role, commit, source, blob, bytes: bytes.length, sha256: hash(bytes), selected });
    const computed = hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), 'sha1').toLowerCase();
    assert.equal(computed, blob);
  }
  for (const filename of ['InMemoryStore.cs', 'InMemoryUserStore.cs']) {
    const source = `src/Identity/test/InMemory.Test/${filename}`;
    const args = ['log', commit, '--follow', '-n', '4', '--date=iso-strict', '--format=fuller', '-p', '--', source];
    write(`docs/${role}-${filename}-history.txt`, git(repo, args));
  }
  write(`docs/${role}-commit.txt`, git(repo, ['show', '-s', '--format=fuller', commit]));
  write(`docs/${role}-source-status.txt`, git(repo, ['status', '--porcelain=v1']));
}
const originalSources = new Map(records.filter(r => r.role === 'original' && !r.absent).map(r => [r.source, r]));
const differences = records.filter(r => r.role === 'default' && !r.absent)
  .filter(r => originalSources.get(r.source)?.blob !== r.blob)
  .map(r => ({ source: r.source, originalBlob: originalSources.get(r.source)?.blob ?? null, defaultBlob: r.blob }));
write('source-records.json', JSON.stringify({ records, differences }, null, 2) + '\n');
const S = path.dirname(path.dirname(path.dirname(root)));
const helper = path.join(S, 'autoperf-parallelism', 'finding-F160-F162-011', 'payload');
for (const name of ['Metadata.cjs', 'Xml.cjs']) {
  const bytes = fs.readFileSync(path.join(helper, name));
  write(name, bytes);
}
const liveDocs = [
  '.github\\copilot-instructions.md',
  '.github\\instructions\\cross-cutting-guidance.instructions.md',
  '.github\\instructions\\build.instructions.md',
  'docs\\BuildFromSource.md',
  'docs\\CrossCuttingGuidance.md'
];
for (const filename of liveDocs) write(`docs/entry-instructions/${filename.replaceAll('\\', '/')}`, fs.readFileSync(path.join('C:\\src\\aspnetcore', filename)));
console.log(JSON.stringify({ records: records.length, differences }, null, 2));
