import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, write, guard, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  const selections = JSON.parse(fs.readFileSync(path.join(here, 'dependency-tag-selections-004.json')));
  const pin = selections.angleSharp[0].commit.sha;
  const tree = JSON.parse(fs.readFileSync(path.join(here, 'commands', '005-anglesharp-source-tree.stdout.bin')));
  const search = JSON.parse(text(gh('007-getnodes-source-owner-search', [
    'api', '--method', 'GET',
    'search/code?q=GetNodes%20repo%3AAngleSharp%2FAngleSharp%20language%3AC%23&per_page=20',
  ])));
  const candidates = [...new Set(search.items.map(x => x.path))]
    .filter(p => p.startsWith('src/AngleSharp/') && p.endsWith('.cs') && tree.tree.some(x => x.type === 'blob' && x.path === p));
  const matches = [];
  let index = 0;
  for (const gitPath of candidates) {
    const label = `007-source-owner-${String(++index).padStart(2, '0')}`;
    const metadata = JSON.parse(text(gh(label, ['api', '--method', 'GET', `repos/AngleSharp/AngleSharp/contents/${gitPath}?ref=${pin}`])));
    const bytes = Buffer.from(metadata.content, 'base64');
    const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (metadata.encoding !== 'base64' || blob !== metadata.sha || bytes.length !== metadata.size) {
      throw new Error(`Pinned DOM producer raw source mismatch: ${gitPath}`);
    }
    const artifact = path.join('dependencies', 'dom-producer-007', gitPath.replaceAll('/', '\\'));
    write(artifact, bytes);
    matches.push({ role: 'both', repository: 'AngleSharp/AngleSharp', commit: pin, repositoryPath: gitPath.replaceAll('/', '\\'), artifact, gitBlob: blob, gitBlobVerified: true, bytes: bytes.length, sha256: sha256(bytes), commandLabel: label, containsGetNodesText: text(bytes).includes('GetNodes'), executingBinaryOrPackageObserved: false });
  }
  write('dependency-source-bindings-007.json', matches);
  write('dom-producer-search-boundary-007.json', {
    currentIndexUsedOnlyAsPathLead: true,
    behavioralEvidenceOnlyFromExactDeclaredVersionSource: pin,
    searchTotal: search.total_count,
    sourceCandidatesReadAtPinnedVersion: candidates,
    noRuntimeOrPerformanceObservation: true,
  });
  return { completePinnedDomOwnerCandidates: matches.length, paths: matches.map(x => x.repositoryPath), finalGuard: guard('007-before-dom-review') };
});
