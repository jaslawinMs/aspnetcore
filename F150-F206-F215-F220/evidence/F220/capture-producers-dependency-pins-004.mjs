import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, campaign, original, write, guard, git, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  const pins = JSON.parse(fs.readFileSync(path.join(here, 'source-pins-002.json')));
  const previous = JSON.parse(fs.readFileSync(path.join(here, 'source-bindings-003.json')));
  const bindings = [];
  const discoveries = {};
  const runtimePins = [];
  for (const [role, commit] of [['original', original], ['default', pins.defaultCommit]]) {
    const rawTree = fs.readFileSync(path.join(here, 'commands', `003-${role}-whole-tree.stdout.bin`));
    const tree = new Map(text(rawTree).split('\0').filter(Boolean).map(row => {
      const m = /^([0-9]+) (\S+) ([a-f0-9]{40})\t([\s\S]*)$/.exec(row);
      return [m[4], { mode: m[1], type: m[2], blob: m[3] }];
    }));
    const csInventory = git(`004-${role}-csharp-producer-inventory`, ['grep', '-n', '-E', 'IEnumerable<Page>|List<Page>|new Page|Links[[:space:]]*=', commit, '--', ':(glob)src/ProjectTemplates/**/*.cs']);
    write(path.join('inventories', `${role}-csharp-producer-inventory.txt`), csInventory);
    git(`004-${role}-assert-package-owner`, ['grep', '-n', '-w', '-e', 'XunitAssertVersion', '-e', 'xunit.assert', '-e', 'XunitV3Version', commit, '--', '*.props', '*.targets', 'src/ProjectTemplates/*.csproj'], [0, 1]);
    git(`004-${role}-identity-ui-framework`, ['grep', '-n', '-w', '-e', 'Bootstrap5', '-e', 'AddDefaultUI', '-e', 'UIFramework', commit, '--', ':(glob)src/Identity/UI/**/*.cs'], [0, 1]);
    const selected = [...tree.keys()].filter(p =>
      /^src\/ProjectTemplates\/Web\.ProjectTemplates\/content\/(StarterWeb-CSharp|StarterWeb-FSharp|RazorPagesWeb-CSharp)\/(?:.*\/)?(?:_Layout\.cshtml|_LoginPartial\.Identity\.cshtml|Index\.cshtml|Privacy\.cshtml|_ViewStart\.cshtml|_ViewImports\.cshtml)$/.test(p) ||
      /^src\/ProjectTemplates\/Web\.ProjectTemplates\/content\/(StarterWeb-CSharp|StarterWeb-FSharp|RazorPagesWeb-CSharp)\/\.template\.config\/template\.json$/.test(p) ||
      /^src\/Identity\/UI\/Areas\/Identity\/Pages\/V5\/(?:Account\/(?:Login|Register|ForgotPassword)\.cshtml|(?:Shared\/)?(?:_Layout|_LoginPartial|_ViewStart)\.cshtml)$/.test(p) ||
      [
        'Directory.Build.targets',
        'Directory.Packages.props',
        'eng/Dependencies.props',
        'eng/Testing.props',
        'src/ProjectTemplates/Directory.Build.props',
        'src/ProjectTemplates/Directory.Build.targets',
        'src/ProjectTemplates/test/Directory.Build.props',
        'src/ProjectTemplates/test/Directory.Build.targets',
        'src/ProjectTemplates/Shared/ProjectFactoryFixture.cs',
        'src/Shared/E2ETesting/E2ETesting.props',
        'src/Identity/UI/src/IdentityDefaultUIConfigureOptions.cs',
        'src/Identity/UI/src/IdentityBuilderUIExtensions.cs',
        'src/Identity/UI/src/Microsoft.AspNetCore.Identity.UI.csproj',
        'src/ProjectTemplates/Web.ProjectTemplates/Microsoft.DotNet.Web.ProjectTemplates.csproj',
      ].includes(p));
    discoveries[role] = {
      selected,
      buildFiles: [...tree.keys()].filter(p => /^eng\/[^/]+\.(props|targets)$/.test(p)),
      identityAccountViews: [...tree.keys()].filter(p => /^src\/Identity\/UI\/.*\/(?:Login|Register|ForgotPassword|_Layout|_LoginPartial|_ViewStart)\.cshtml$/.test(p)),
    };
    let index = 0;
    for (const gitPath of selected) {
      const file = gitPath.replaceAll('/', '\\');
      if (previous.some(b => b.role === role && b.repositoryPath === file)) {
        continue;
      }
      const bytes = git(`004-${role}-source-${String(++index).padStart(2, '0')}`, ['show', `${commit}:${gitPath}`]);
      const observedBlob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      if (observedBlob !== tree.get(gitPath).blob) {
        throw new Error(`Complete raw producer source blob mismatch: ${role} ${gitPath}`);
      }
      const artifact = path.join('sources', role, file);
      write(artifact, bytes);
      bindings.push({ role, commit, repository: 'dotnet/aspnetcore', repositoryPath: file, gitBlob: observedBlob, gitBlobVerified: true, artifact, bytes: bytes.length, sha256: sha256(bytes) });
    }
    const versions = text(fs.readFileSync(path.join(here, 'sources', role, 'eng', 'Version.Details.xml')));
    const dep = /<Dependency Name="Microsoft\.NETCore\.App\.Ref" Version="([^"]+)"[^>]*>([\s\S]*?)<\/Dependency>/.exec(versions);
    if (!dep) {
      throw new Error(`Runtime reference dependency source pin missing: ${role}`);
    }
    const uri = /<Uri>([^<]+)<\/Uri>/.exec(dep[2])?.[1];
    const sha = /<Sha>([^<]+)<\/Sha>/.exec(dep[2])?.[1];
    if (uri !== 'https://github.com/dotnet/dotnet' || !/^[0-9a-f]{40}$/.test(sha)) {
      throw new Error(`Unexpected dependency source identity: ${role}`);
    }
    runtimePins.push({ role, dependency: 'Microsoft.NETCore.App.Ref', version: dep[1], uri, sha, actualExecutingRuntimeObserved: false });
  }
  write('source-bindings-004.json', bindings);
  write('producer-and-build-discoveries-004.json', discoveries);
  write('runtime-source-pins-004.json', runtimePins);
  const angleTags = JSON.parse(text(gh('004-anglesharp-tags', ['api', '--method', 'GET', 'repos/AngleSharp/AngleSharp/tags?per_page=100'])));
  const xunitTags = JSON.parse(text(gh('004-xunit-tags', ['api', '--method', 'GET', 'repos/xunit/xunit/tags?per_page=100'])));
  const dependencyTagSelections = {
    angleSharp: angleTags.filter(t => /(?:^v)?1\.5\.2$/.test(t.name)),
    xunit: xunitTags.filter(t => /(?:^|[-v])2\.9\.2$/.test(t.name)),
    tagListBounds: 'First 100 tags per exact public upstream repository; no package restored or installed.',
  };
  write('dependency-tag-selections-004.json', dependencyTagSelections);
  const artifactRoot = path.join(path.dirname(campaign), 'aspnetcore-autoperf-handoff-20261113-141834', 'artifacts');
  const artifactNames = fs.readdirSync(artifactRoot).filter(n => /cards|prepare|provenance|candidate/i.test(n));
  write('card-artifact-name-discovery-004.json', { artifactRoot, names: artifactNames, noRecursiveSessionWalk: true });
  const target = 'src/ProjectTemplates/Shared/AspNetProcess.cs';
  for (const [label, commit] of [
    ['count-diagnostic-introduction', 'd6409371aeeca6df7e126b1e0c51410544fc2869'],
    ['external-link-validation-order', '02e5cfb094800bb6592487dbe0ab116aa2c76831'],
    ['nullable-links-guard', '426b8b46f9c7cad8b2f0ab502902109ff09be9e6'],
    ['parser-update', 'fc4e6e0915a59f2e1a9bf18955df2eca1de8f96c'],
  ]) {
    git(`004-history-${label}`, ['show', '--format=fuller', '--no-ext-diff', commit, '--', target]);
  }
  return { completeAdditionalSources: bindings.length, runtimePins, dependencyTagSelections, artifactNames, finalGuard: guard('004-before-source-review') };
});
