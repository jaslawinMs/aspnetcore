import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, original, write, guard, git, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  const pins = JSON.parse(fs.readFileSync(path.join(here, 'source-pins-002.json')));
  const files = [
    'src\\ProjectTemplates\\Shared\\AspNetProcess.cs',
    'src\\ProjectTemplates\\Shared\\PageUrls.cs',
    'src\\ProjectTemplates\\Shared\\Project.cs',
    'src\\ProjectTemplates\\Shared\\AssemblyInfo.AssemblyFixtures.cs',
    'src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\MvcTemplateTest.cs',
    'src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\RazorPagesTemplateTest.cs',
    'src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\BlazorTemplateTest.cs',
    'src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\Templates.Mvc.Tests.csproj',
    'src\\ProjectTemplates\\TestInfrastructure\\PrepareForTest.targets',
    'src\\ProjectTemplates\\README.md',
    'src\\ProjectTemplates\\build.cmd',
    'eng\\Version.Details.xml',
    'eng\\Versions.props',
    'global.json',
    'Directory.Build.props',
    '.editorconfig',
    'docs\\BuildFromSource.md',
    'docs\\CrossCuttingGuidance.md',
  ];
  const bindings = [];
  const roleTrees = {};
  for (const [role, commit] of [['original', original], ['default', pins.defaultCommit]]) {
    const rawTree = git(`003-${role}-whole-tree`, ['ls-tree', '-r', '-z', '--full-tree', commit]);
    const tree = new Map(text(rawTree).split('\0').filter(Boolean).map(row => {
      const match = /^([0-9]+) (\S+) ([a-f0-9]{40})\t([\s\S]*)$/.exec(row);
      if (!match) {
        throw new Error(`Unrecognized exact Git tree row: ${row}`);
      }
      return [match[4], { mode: match[1], type: match[2], blob: match[3] }];
    }));
    roleTrees[role] = {
      commit,
      entries: tree.size,
      projectTemplatesTree: text(git(`003-${role}-templates-tree`, ['rev-parse', `${commit}:src/ProjectTemplates`])).trim(),
    };
    const inventories = [
      ['all-callers', ['grep', '-n', '-w', '-e', 'AssertPagesOk', '-e', 'ContainsLinks', commit, '--', '*.cs']],
      ['all-page-producer-shapes', ['grep', '-n', '-E', 'IEnumerable<Page>|List<Page>|new Page|Links[[:space:]]*=', commit, '--', 'src/ProjectTemplates']],
      ['all-helper-namespace-consumers', ['grep', '-n', '-F', 'Templates.Test.Helpers', commit, '--', '*.cs']],
      ['project-link-and-package-references', ['grep', '-n', '-i', '-E', 'AspNetProcess|xunit|AngleSharp|Shared', commit, '--', ':(glob)src/ProjectTemplates/**/*.csproj', ':(glob)src/ProjectTemplates/**/*.props', ':(glob)src/ProjectTemplates/**/*.targets']],
      ['xunit-package-and-build-pins', ['grep', '-n', '-i', '-E', 'xunit|AngleSharp|MicrosoftNETCoreAppRefPackageVersion|TargetFramework', commit, '--', 'eng/Versions.props', 'Directory.Build.props', 'eng/Dependencies.props', 'eng/Testing.props', 'src/ProjectTemplates/Directory.Build.props']],
      ['linq-switch-settings', ['grep', '-n', '-E', 'System\\.Linq\\.Enumerable\\.IsSizeOptimized|LinqIsSizeOptimized', commit, '--', 'src/ProjectTemplates', 'eng', 'Directory.Build.props', 'Directory.Build.targets']],
    ];
    for (const [name, args] of inventories) {
      const output = git(`003-${role}-${name}`, args, [0, 1]);
      write(path.join('inventories', `${role}-${name}.txt`), output);
    }
    write(path.join('inventories', `${role}-template-paths.txt`), [...tree.keys()].filter(p => p.startsWith('src/ProjectTemplates/')).join('\n') + '\n');
    let index = 0;
    for (const file of files) {
      const gitPath = file.replaceAll('\\', '/');
      const entry = tree.get(gitPath);
      if (entry?.type !== 'blob') {
        throw new Error(`Required complete source absent from pinned tree: ${role} ${file}`);
      }
      const bytes = git(`003-${role}-source-${String(++index).padStart(2, '0')}`, ['show', `${commit}:${gitPath}`]);
      const observedBlob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      if (observedBlob !== entry.blob) {
        throw new Error(`Complete raw source Git blob mismatch: ${role} ${file}`);
      }
      const artifact = path.join('sources', role, file);
      write(artifact, bytes);
      bindings.push({ role, commit, repository: 'dotnet/aspnetcore', repositoryPath: file, gitBlob: entry.blob, gitBlobVerified: true, artifact, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
  write('source-bindings-003.json', bindings);
  write('role-trees-003.json', roleTrees);
  const target = 'src/ProjectTemplates/Shared/AspNetProcess.cs';
  git('003-target-history', ['log', '--follow', '-n', '12', '--date=iso-strict', '--format=%H%x09%aI%x09%s', '--name-status', pins.defaultCommit, '--', target]);
  git('003-target-blame-count-zip', ['blame', '--line-porcelain', '-L', '158,166', pins.defaultCommit, '--', target]);
  git('003-count-assert-introduction', ['log', '--format=%H%x09%aI%x09%s', '--date=iso-strict', '-S', 'page.Links.Count()', pins.defaultCommit, '--', target]);
  git('003-link-validation-history', ['log', '--format=%H%x09%aI%x09%s', '--date=iso-strict', '-S', 'foreach ((var link, var expectedLink)', pins.defaultCommit, '--', target]);
  return {
    completeSources: bindings.length,
    roleTrees,
    identicalProjectTemplatesTree: roleTrees.original.projectTemplatesTree === roleTrees.default.projectTemplatesTree,
    finalGuard: guard('003-before-lsp-or-source-read'),
  };
});
