import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { campaign, repo, original, write, guard, git, gh, text, copyBound, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  guard('002-prior-footprint');
  const prior = path.join(campaign, 'finding-F190-207');
  const bindings = [
    'HANDOFF.json', 'assessment.json', 'acceptance.json', 'candidate.diff',
    'producer-matrix.json', 'HASHES.json', 'HASHES.sha256',
    'parent-integrity-audit.json', 'source-tool-boundary.json',
    'runtime-source-pins.json', 'source-bindings.json', 'linq-source-bindings.json',
  ].map(name => copyBound(path.join(prior, name), path.join('prior-F190', name)));
  write('prior-F190-bindings.json', bindings);
  const localInstructions = [
    'src\\ProjectTemplates\\AGENTS.md',
    '.github\\instructions\\project-templates.instructions.md',
    '.github\\instructions\\cross-cutting-guidance.instructions.md',
    '.github\\instructions\\build.instructions.md',
  ].map(name => copyBound(path.join(repo, name), path.join('navigation-instructions', name)));
  write('navigation-instruction-bindings.json', localInstructions);
  const upstreamRepositoryBytes = gh('002-upstream-repository', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore']);
  const upstreamRepository = JSON.parse(text(upstreamRepositoryBytes));
  const defaultBranch = upstreamRepository.default_branch;
  if (defaultBranch !== 'main') {
    throw new Error(`Unexpected actual default branch: ${defaultBranch}`);
  }
  const upstreamCommitBytes = gh('002-upstream-main', ['api', '--method', 'GET', `repos/dotnet/aspnetcore/commits/${defaultBranch}`]);
  const upstreamCommit = JSON.parse(text(upstreamCommitBytes));
  const defaultCommit = upstreamCommit.sha;
  if (!/^[0-9a-f]{40}$/.test(defaultCommit)) {
    throw new Error('Actual default commit was not a full SHA.');
  }
  const head = text(git('002-reserved-head', ['rev-parse', 'HEAD'])).trim();
  const branch = text(git('002-reserved-branch', ['symbolic-ref', 'HEAD'])).trim();
  const status = text(git('002-reserved-status', ['status', '--porcelain=v1', '--untracked-files=normal']));
  const originalObject = text(git('002-original-object', ['cat-file', '-t', original])).trim();
  const defaultObject = text(git('002-default-object', ['cat-file', '-t', defaultCommit], [0, 128])).trim();
  const pins = {
    observedUtc: new Date().toISOString(),
    repository: 'dotnet/aspnetcore',
    defaultBranch,
    defaultCommit,
    defaultTree: upstreamCommit.commit.tree.sha,
    original,
    originalObject,
    defaultObject,
    reserved: { path: repo, head, branch, status, role: 'navigation/object store only; never Default' },
    priorFootprint: {
      finding: 'F190',
      card: 'enumerable-count-vs-any',
      editTargetLine: 117,
      disposition: 'bounded-no-candidate',
      candidateDiffBytes: fs.statSync(path.join(prior, 'candidate.diff')).size,
      overlap: 'F190 also discussed the Count/Zip consumer, but proposed no edit there. F220 has a distinct card and seam; filename overlap is not an exact duplicate proof.',
    },
  };
  write('source-pins-002.json', pins);
  return { defaultBranch, defaultCommit, original, reservedHead: head, originalObject, defaultObject, priorBoundFiles: bindings.length, preLspGuard: guard('002-before-first-lsp') };
});
