import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, campaign, original, write, guard, git, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  guard('006-source-entry');
  const bindings = [];
  const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const selections = JSON.parse(fs.readFileSync(path.join(here, 'dependency-tag-selections-004.json')));
  const anglePin = selections.angleSharp[0].commit.sha;
  const angleTree = JSON.parse(fs.readFileSync(path.join(here, 'commands', '005-anglesharp-source-tree.stdout.bin')));
  const requested = [
    'src/AngleSharp/Dom/Internal/Document.cs',
    'src/AngleSharp/Dom/NodeExtensions.cs',
    'src/AngleSharp/Dom/QueryExtensions.cs',
  ];
  let sequence = 0;
  for (const gitPath of requested.filter(p => angleTree.tree.some(x => x.type === 'blob' && x.path === p))) {
    const label = `006-angle-source-${String(++sequence).padStart(2, '0')}`;
    const metadata = JSON.parse(text(gh(label, ['api', '--method', 'GET', `repos/AngleSharp/AngleSharp/contents/${gitPath}?ref=${anglePin}`])));
    const bytes = Buffer.from(metadata.content, 'base64');
    if (metadata.encoding !== 'base64' || gitBlob(bytes) !== metadata.sha || bytes.length !== metadata.size) {
      throw new Error(`AngleSharp complete source mismatch: ${gitPath}`);
    }
    const artifact = path.join('dependencies', 'anglesharp-1.5.2', gitPath.replaceAll('/', '\\'));
    write(artifact, bytes);
    bindings.push({ role: 'both', repository: 'AngleSharp/AngleSharp', commit: anglePin, repositoryPath: gitPath.replaceAll('/', '\\'), artifact, gitBlob: metadata.sha, gitBlobVerified: true, bytes: bytes.length, sha256: sha256(bytes), commandLabel: label, executingBinaryOrPackageObserved: false });
  }
  write('dependency-source-bindings-006.json', bindings);
  const pins = JSON.parse(fs.readFileSync(path.join(here, 'source-pins-002.json')));
  const aspBindings = [];
  for (const [role, commit] of [['original', original], ['default', pins.defaultCommit]]) {
    const gitPath = 'eng/targets/CSharp.Common.targets';
    const bytes = git(`006-${role}-global-xunit-using`, ['show', `${commit}:${gitPath}`]);
    const artifact = path.join('sources', role, gitPath.replaceAll('/', '\\'));
    write(artifact, bytes);
    aspBindings.push({ role, repository: 'dotnet/aspnetcore', commit, repositoryPath: gitPath.replaceAll('/', '\\'), artifact, gitBlob: gitBlob(bytes), gitBlobVerifiedAgainstComputedObject: true, bytes: bytes.length, sha256: sha256(bytes) });
  }
  write('source-bindings-006.json', aspBindings);
  const filesRoot = path.dirname(campaign);
  const cardMetadataNames = fs.readdirSync(filesRoot, { withFileTypes: true })
    .filter(x => /card|fperf|ledger|candidate/i.test(x.name))
    .map(x => ({ name: x.name, directory: x.isDirectory() }));
  write('bounded-card-metadata-discovery-006.json', { root: filesRoot, nonrecursiveNamesOnly: true, entries: cardMetadataNames });
  return { completeAdditionalDependencySources: bindings.length, capturedAnglePaths: bindings.map(x => x.repositoryPath), completeAdditionalAspNetCoreSources: aspBindings.length, cardMetadataNames, finalGuard: guard('006-before-final-review') };
});
