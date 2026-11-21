import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, campaign, original, write, guard, git, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  const bindings = [];
  const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  let sequence = 0;
  const captureApiSource = (repository, commit, gitPath, destination, role) => {
    const label = `005-api-source-${String(++sequence).padStart(3, '0')}`;
    const metadata = JSON.parse(text(gh(label, ['api', '--method', 'GET', `repos/${repository}/contents/${gitPath}?ref=${commit}`])));
    if (metadata.type !== 'file' || metadata.encoding !== 'base64' || typeof metadata.content !== 'string') {
      throw new Error(`Not a complete base64 public source file: ${repository} ${gitPath}`);
    }
    const bytes = Buffer.from(metadata.content, 'base64');
    const blob = gitBlob(bytes);
    if (blob !== metadata.sha || bytes.length !== metadata.size) {
      throw new Error(`Public dependency raw source integrity mismatch: ${repository} ${gitPath}`);
    }
    write(destination, bytes);
    bindings.push({ role, repository, commit, repositoryPath: gitPath.replaceAll('/', '\\'), artifact: destination, gitBlob: blob, gitBlobVerified: true, bytes: bytes.length, sha256: sha256(bytes), commandLabel: label, executingBinaryOrPackageObserved: false });
    return text(bytes);
  };
  const runtimePins = JSON.parse(fs.readFileSync(path.join(here, 'runtime-source-pins-004.json')));
  const runtimeFiles = ['Count.cs', 'Concat.cs', 'Concat.SpeedOpt.cs', 'AppendPrepend.cs', 'AppendPrepend.SpeedOpt.cs', 'Zip.cs', 'Iterator.cs', 'Enumerable.cs'];
  for (const pin of runtimePins) {
    for (const name of runtimeFiles) {
      captureApiSource('dotnet/dotnet', pin.sha, `src/runtime/src/libraries/System.Linq/src/System/Linq/${name}`, path.join('dependencies', `linq-${pin.role}`, name), pin.role);
    }
  }
  const selections = JSON.parse(fs.readFileSync(path.join(here, 'dependency-tag-selections-004.json')));
  if (selections.angleSharp.length !== 1 || selections.xunit.length !== 1) {
    throw new Error('Exactly one source tag is required for each declared package version.');
  }
  const anglePin = selections.angleSharp[0].commit.sha;
  const angleTree = JSON.parse(text(gh('005-anglesharp-source-tree', ['api', '--method', 'GET', `repos/AngleSharp/AngleSharp/git/trees/${anglePin}?recursive=1`])));
  if (angleTree.truncated) {
    throw new Error('AngleSharp dependency source tree was truncated.');
  }
  const angleFiles = angleTree.tree.filter(x => x.type === 'blob' &&
    /^src\/AngleSharp\/.*\/(?:HtmlDocument|IHtmlDocument|IDocument|HtmlCollection|IHtmlCollection|HtmlAnchorElement|HtmlParser)\.cs$/.test(x.path));
  if (!angleFiles.some(x => x.path.endsWith('/HtmlDocument.cs')) ||
      !angleFiles.some(x => x.path.endsWith('/HtmlCollection.cs'))) {
    throw new Error('Required AngleSharp collection owners were not resolved from the pinned tree.');
  }
  for (const item of angleFiles) {
    captureApiSource('AngleSharp/AngleSharp', anglePin, item.path, path.join('dependencies', 'anglesharp-1.5.2', item.path.replaceAll('/', '\\')), 'both');
  }
  const xunitPin = selections.xunit[0].commit.sha;
  const xunitTree = JSON.parse(text(gh('005-xunit-source-tree', ['api', '--method', 'GET', `repos/xunit/xunit/git/trees/${xunitPin}?recursive=1`])));
  if (xunitTree.truncated) {
    throw new Error('xUnit package source tree was truncated.');
  }
  const xunitAssertSubmodule = xunitTree.tree.filter(x => x.type === 'commit' && /(?:^|\/)Asserts$/.test(x.path));
  const xunitResolution = { package: 'xunit.assert', version: '2.9.2', packageRepository: 'xunit/xunit', packageSourceCommit: xunitPin };
  if (xunitAssertSubmodule.length === 1) {
    const submodule = xunitAssertSubmodule[0];
    const subMetadata = JSON.parse(text(gh('005-xunit-assert-submodule', ['api', '--method', 'GET', `repos/xunit/xunit/contents/${submodule.path}?ref=${xunitPin}`])));
    if (subMetadata.sha !== submodule.sha || !/^https:\/\/github\.com\/xunit\/assert\.xunit(?:\.git)?$/.test(subMetadata.submodule_git_url)) {
      throw new Error('Unexpected exact xUnit assertion submodule mapping.');
    }
    const assertTree = JSON.parse(text(gh('005-xunit-assert-source-tree', ['api', '--method', 'GET', `repos/xunit/assert.xunit/git/trees/${submodule.sha}?recursive=1`])));
    if (assertTree.truncated) {
      throw new Error('xUnit assertion dependency source tree was truncated.');
    }
    const assertionFiles = assertTree.tree.filter(x => x.type === 'blob' && /(?:^|\/)(?:BooleanAsserts|TrueException)\.cs$/.test(x.path));
    if (!assertionFiles.some(x => x.path.endsWith('BooleanAsserts.cs'))) {
      throw new Error('Actual BooleanAsserts owner absent from pinned assertion source.');
    }
    for (const item of assertionFiles) {
      captureApiSource('xunit/assert.xunit', submodule.sha, item.path, path.join('dependencies', 'xunit-assert-2.9.2', item.path.replaceAll('/', '\\')), 'both');
    }
    Object.assign(xunitResolution, { submodulePath: submodule.path, assertionRepository: 'xunit/assert.xunit', assertionCommit: submodule.sha, assertionFiles: assertionFiles.map(x => x.path) });
  } else {
    throw new Error(`Expected one assertion source submodule, found ${xunitAssertSubmodule.length}.`);
  }
  write('xunit-source-resolution-005.json', xunitResolution);
  write('dependency-source-bindings-005.json', bindings);
  const sourcePins = JSON.parse(fs.readFileSync(path.join(here, 'source-pins-002.json')));
  const supplementalBindings = [];
  for (const [role, commit] of [['original', original], ['default', sourcePins.defaultCommit]]) {
    const treeRows = text(fs.readFileSync(path.join(here, 'commands', `003-${role}-whole-tree.stdout.bin`))).split('\0').filter(Boolean);
    const tree = new Map(treeRows.map(row => {
      const m = /^([0-9]+) (\S+) ([a-f0-9]{40})\t([\s\S]*)$/.exec(row);
      return [m[4], m[3]];
    }));
    const selected = [...tree.keys()].filter(p =>
      /^src\/Identity\/UI\/src\/Areas\/Identity\/Pages\/V5\/(?:Account\/(?:Login|Register|ForgotPassword)\.cshtml|_Layout\.cshtml|_ViewStart\.cshtml)$/.test(p) ||
      /^src\/ProjectTemplates\/Web\.ProjectTemplates\/content\/(?:StarterWeb-CSharp|StarterWeb-FSharp|RazorPagesWeb-CSharp)\/(?:Controllers\/HomeController\.(?:cs|fs)|Program\.(?:cs|fs))$/.test(p) ||
      [
        'src/Identity/UI/src/UIFramework.cs',
        'src/Identity/UI/src/IdentityServiceCollectionUIExtensions.cs',
        'eng/targets/Test.targets',
        'eng/targets/Tests.props',
        'eng/targets/Testing.props',
        'eng/targets/Testing.targets',
      ].includes(p));
    let index = 0;
    for (const gitPath of selected) {
      const bytes = git(`005-${role}-supplement-${String(++index).padStart(2, '0')}`, ['show', `${commit}:${gitPath}`]);
      if (gitBlob(bytes) !== tree.get(gitPath)) {
        throw new Error(`Supplemental producer source blob mismatch: ${role} ${gitPath}`);
      }
      const repositoryPath = gitPath.replaceAll('/', '\\');
      const artifact = path.join('sources', role, repositoryPath);
      write(artifact, bytes);
      supplementalBindings.push({ role, repository: 'dotnet/aspnetcore', commit, repositoryPath, artifact, gitBlob: tree.get(gitPath), gitBlobVerified: true, bytes: bytes.length, sha256: sha256(bytes) });
    }
    git(`005-${role}-actual-assert-imports`, ['grep', '-n', '-i', '-E', 'PackageReference.*(xunit|Xunit)|Using.*Xunit|Include.*Test.*targets|Import.*Test.*targets', commit, '--', 'eng', 'Directory.Build.props', 'Directory.Build.targets', 'src/ProjectTemplates/Directory.Build.props', 'src/ProjectTemplates/Directory.Build.targets', 'src/Shared/E2ETesting/E2ETesting.props'], [0, 1]);
  }
  write('source-bindings-005.json', supplementalBindings);
  const handoffRoot = path.join(path.dirname(campaign), 'aspnetcore-autoperf-handoff-20261113-141834');
  write('historical-card-location-boundary-005.json', {
    taskCardId: 'ienumerable-count-before-reenumeration',
    historicalPrepareCardsDir: 'C:\\Users\\jaslawin\\AppData\\Local\\Temp\\fperf-antipattern-cards\\cards',
    historicalExactCardView: 'Tool returned path does not exist; no alternate read of that missing path, preparation script, restore or installation attempted.',
    handoffTopLevelNamesOnly: fs.readdirSync(handoffRoot),
    currentTaskIsNotANewScan: true,
    loadedSkillWorkflowNotInvoked: 'Explicit task limits prohibit broad scanning, permission escalation, installs, temporary output, telemetry persistence, report publication and remote writes.',
  });
  return { completeDependencySources: bindings.length, completeSupplementalAspNetCoreSources: supplementalBindings.length, anglePin, xunitResolution, finalGuard: guard('005-before-review') };
});
