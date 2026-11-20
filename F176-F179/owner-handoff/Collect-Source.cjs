'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function write(name, bytes) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) assert(fs.readFileSync(file).equals(Buffer.from(bytes)), `Frozen ${name}`);
  else fs.writeFileSync(file, bytes);
}
function git(repo, args) {
  const result = cp.spawnSync('git', ['--no-pager', '-C', repo, ...args], { encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
const paths = [
  ...graphs.targetPaths,
  'src/Mvc/AGENTS.md',
  'src/Mvc/README.md',
  'src/Mvc/build.cmd',
  'src/Mvc/Directory.Build.props',
  'src/Mvc/Mvc.Core/src/Builder/ControllerActionEndpointConventionBuilder.cs',
  'src/Mvc/Mvc.Core/src/Routing/ControllerActionEndpointDataSource.cs',
  'src/Mvc/Mvc.Core/src/Routing/ControllerActionEndpointDataSourceFactory.cs',
  'src/Mvc/Mvc.Core/src/Routing/ActionEndpointDataSourceBase.cs',
  'src/Mvc/Mvc.Core/src/Routing/ActionEndpointFactory.cs',
  'src/Mvc/Mvc.Core/src/DependencyInjection/MvcCoreServiceCollectionExtensions.cs',
  'src/Mvc/Mvc.Core/src/ApplicationParts/ApplicationPartManager.cs',
  'src/Mvc/Mvc.Core/src/ApplicationParts/ApplicationPartFactory.cs',
  'src/Mvc/Mvc.Core/src/ApplicationParts/AssemblyPart.cs',
  'src/Mvc/Mvc.Core/src/Controllers/ControllerFeatureProvider.cs',
  'src/Mvc/Mvc.Core/src/ApplicationModels/ControllerActionDescriptorProvider.cs',
  'src/Mvc/Mvc.Core/test/Routing/ControllerActionEndpointDataSourceTest.cs',
  'src/Mvc/Mvc.Core/test/Routing/ActionEndpointDataSourceBaseTest.cs',
  'src/Mvc/Mvc.Core/test/Microsoft.AspNetCore.Mvc.Core.Test.csproj',
  'src/Mvc/Mvc.Core/src/Microsoft.AspNetCore.Mvc.Core.csproj',
  'src/Mvc/Mvc.Razor/src/ApplicationParts/CompiledRazorAssemblyPart.cs',
  'src/Mvc/Mvc.Razor/src/ApplicationParts/CompiledRazorAssemblyApplicationPartFactory.cs',
  'src/Mvc/Mvc.Razor/src/ApplicationParts/RazorCompiledItemFeatureProvider.cs',
  'src/Mvc/Mvc.Razor/src/Compilation/DefaultViewCompilerProvider.cs',
  'src/Mvc/Mvc.Razor/src/Compilation/DefaultRazorPageFactoryProvider.cs',
  'src/Mvc/Mvc.Razor/src/Compilation/CompiledViewDescriptor.cs',
  'src/Mvc/Mvc.Razor/src/Compilation/ViewsFeature.cs',
  'src/Mvc/Mvc.Razor/src/DependencyInjection/MvcRazorMvcCoreBuilderExtensions.cs',
  'src/Mvc/Mvc.Razor/src/ViewPath.cs',
  'src/Mvc/Mvc.Razor/src/RazorPage.cs',
  'src/Mvc/Mvc.Razor/src/RazorPageBase.cs',
  'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj',
  'src/Mvc/Mvc.Razor/test/Compilation/DefaultViewCompilerTest.cs',
  'src/Mvc/Mvc.Razor/test/ApplicationParts/RazorCompiledItemFeatureProviderTest.cs',
  'src/Mvc/Mvc.Razor/test/Microsoft.AspNetCore.Mvc.Razor.Test.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/Builder/ControllerActionEndpointConventionBuilderResourceCollectionExtensions.cs',
  'src/Shared/Components/ResourceCollectionResolver.cs',
  'src/StaticAssets/src/Infrastructure/StaticAssetsEndpointDataSourceHelper.cs',
  'src/Http/Routing/src/Builder/DefaultEndpointRouteBuilder.cs',
  'src/Http/Routing/src/Builder/EndpointRoutingApplicationBuilderExtensions.cs',
  'src/Razor/Razor.Runtime/src/Hosting/RazorCompiledItemLoader.cs',
  'src/Mvc/test/WebSites/Directory.Build.props',
  'src/Mvc/test/WebSites/Directory.Build.targets',
  'Directory.Build.props', 'Directory.Build.targets', 'Directory.Packages.props',
  'global.json', '.gitattributes', 'eng/Versions.props', 'eng/Common.props',
  'eng/targets/Test.targets', 'eng/targets/References.props',
  'eng/tools/GenerateFiles/GenerateFiles.csproj',
  'eng/tools/GenerateFiles/Directory.Build.props.in',
  'eng/tools/GenerateFiles/Directory.Build.targets.in',
  'docs/BuildFromSource.md', 'docs/BuildErrors.md', 'docs/CrossCuttingGuidance.md',
  '.github/instructions/cross-cutting-guidance.instructions.md',
  '.github/instructions/build.instructions.md', 'activate.ps1'
];
const records = [];
for (const role of ['original', 'default']) {
  const repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  const assets = git(repo, ['ls-tree', '-r', '--name-only', commit, '--', 'src/Mvc/test/WebSites/RazorBuildWebSite.Views']).toString('utf8').trim().split('\n').filter(Boolean);
  const instructions = git(repo, ['ls-tree', '-r', '--name-only', commit, '--', 'AGENTS.md', 'src/AGENTS.md', 'src/Mvc'])
    .toString('utf8').split('\n').filter(p => p === 'AGENTS.md' || p.endsWith('/AGENTS.md'));
  write(`docs/${role}-instruction-inventory.json`, JSON.stringify({ scope: ['AGENTS.md', 'src/AGENTS.md', 'src/Mvc/**'], paths: instructions }, null, 2) + '\n');
  for (const source of [...new Set([...paths, ...assets, ...instructions])]) {
    const listing = git(repo, ['ls-tree', commit, '--', source]).toString('utf8').trim();
    if (!listing) { records.push({ role, commit, source, absent: true }); continue; }
    const blob = listing.split(/\s+/)[2], bytes = git(repo, ['cat-file', 'blob', blob]);
    const selected = `source/${role}/${source}`;
    write(selected, bytes);
    records.push({ role, commit, source, blob, bytes: bytes.length, sha256: sha(bytes), selected });
  }
  for (const source of [...graphs.targetPaths, 'src/Mvc/Mvc.Core/src/Builder/ControllerActionEndpointConventionBuilder.cs']) {
    write(`docs/${role}-${path.posix.basename(source)}-history.txt`,
      git(repo, ['log', commit, '--follow', '-n', '4', '--date=iso-strict', '--format=fuller', '-p', '--', source]));
  }
  write(`docs/${role}-commit.txt`, git(repo, ['show', '-s', '--format=fuller', commit]));
  write(`docs/${role}-source-status.txt`, git(repo, ['status', '--porcelain=v1', '--untracked-files=no']));
}
const originals = new Map(records.filter(r => r.role === 'original' && !r.absent).map(r => [r.source, r.blob]));
const differences = records.filter(r => r.role === 'default' && !r.absent && originals.get(r.source) !== r.blob)
  .map(r => ({ source: r.source, originalBlob: originals.get(r.source) ?? null, defaultBlob: r.blob }));
write('source-records.json', JSON.stringify({ records, differences }, null, 2) + '\n');
for (const name of ['src\\Mvc\\AGENTS.md', '.github\\instructions\\cross-cutting-guidance.instructions.md', '.github\\instructions\\build.instructions.md', 'docs\\BuildFromSource.md', 'docs\\BuildErrors.md', 'docs\\CrossCuttingGuidance.md'])
  write(`docs/entry-instructions/${name.replaceAll('\\', '/')}`, fs.readFileSync(path.join('C:\\src\\aspnetcore', name)));
const coreClass = 'Microsoft.AspNetCore.Mvc.Routing.ControllerActionEndpointDataSourceTest';
const compilerClass = 'Microsoft.AspNetCore.Mvc.Razor.Compilation.DefaultViewCompilerTest';
const featureClass = 'Microsoft.AspNetCore.Mvc.ApplicationParts.RazorCompiledItemFeatureProviderTest';
const row = (className, method, parameters, findings, boundary) => ({ class: className, method, parameters, findings, boundary });
const coreRows = ['Endpoints_MultipledActions_MultipleRoutes', 'Endpoints_AppliesConventions', 'Endpoints_AppliesConventions_RouteSpecificMetadata']
  .map(method => row(coreClass, method, [], ['F176', 'F177', 'F178'], 'Native real data-source consumer; injected action descriptors, not extension-method/item insertion reachability.'));
const razorRows = [
  row(compilerClass, 'CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem', [], ['F179'], 'Native compiler behavior with test feature-provider input.'),
  row(compilerClass, 'CompileAsync_ReturnsCompiledViews', [], ['F179'], 'Native compiler descriptor identity; test feature-provider input.'),
  ...['/views/home/index.cshtml', '/VIEWS/HOME/INDEX.CSHTML', '/viEws/HoME/inDex.cshtml']
    .map(value => row(compilerClass, 'CompileAsync_PerformsCaseInsensitiveLookupsForCompiledViews', [{ name: 'lookupPath', value }], ['F179'], 'Individual InlineData row; test feature-provider input.')),
  row(compilerClass, 'CompileAsync_PerformsCaseInsensitiveLookupsForCompiledViews_WithNonNormalizedPaths', [], ['F179'], 'Native normalization/identity with test feature-provider input.'),
  row(featureClass, 'PopulateFeature_AllowsDuplicateItemsFromMultipleParts', [], ['F179'], 'Native part-feature duplicate ordering with mocked compiled-item providers.'),
  row(featureClass, 'PopulateFeature_ThrowsIfTwoItemsFromSamePart_OnlyDifferInCase', [], ['F179'], 'Native same-part rejection with mocked compiled-item providers; not claimed a native precompiled asset topology.')
];
const groups = [
  { kind: 'core', assembly: 'Microsoft.AspNetCore.Mvc.Core.Test', expected: coreRows },
  { kind: 'razor', assembly: 'Microsoft.AspNetCore.Mvc.Razor.Test', expected: razorRows }
];
for (const group of groups)
  group.filter = [...new Set(group.expected.map(r => `FullyQualifiedName=${r.class}.${r.method}`))].join('|');
write('native-selection.json', JSON.stringify({ boundary: 'Exact narrow unchanged native tests; supplemental consumer independently supplies real public producers. No skipped/broad unrelated/zero-discovery counts.', groups }, null, 2) + '\n');
console.log(JSON.stringify({ records: records.length, differences, nativeRowsPerRole: groups.reduce((n, g) => n + g.expected.length, 0) }));
