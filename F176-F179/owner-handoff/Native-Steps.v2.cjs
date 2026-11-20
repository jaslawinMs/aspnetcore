'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const role = process.argv[2], phase = process.argv[3];
assert(['original', 'default'].includes(role));
const checkout = graphs[`${role}Path`];
const projects = {
  core: 'src\\Mvc\\Mvc.Core\\test\\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
  razor: 'src\\Mvc\\Mvc.Razor\\test\\Microsoft.AspNetCore.Mvc.Razor.Test.csproj',
  assets: 'src\\Mvc\\test\\WebSites\\RazorBuildWebSite.Views\\RazorBuildWebSite.Views.csproj'
};
const settings = ['-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '/m:2', '/nr:false'];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function run(name, args, extra = '') {
  const label = `${role}-${name}`;
  assert(!fs.existsSync(path.join(root, 'evidence', label + '.receipt.json')), `No repeated label ${label}`);
  const command = `& ${quote(path.join(root, 'Run-Native.ps1'))} -Checkout ${quote(checkout)} -Label ${quote(label)} -NativeArguments @(${args.map(quote).join(',')}) ${extra}`;
  const result = cp.spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
    { cwd: checkout, windowsHide: true, encoding: null, maxBuffer: 128 * 1024 * 1024 });
  fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stdout.txt'), result.stdout ?? '');
  fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stderr.txt'), result.stderr ?? '');
  console.log(JSON.stringify({ label, status: result.status, error: result.error?.message ?? null }));
  return { ...result, text: String(result.stdout ?? '') + String(result.stderr ?? '') };
}
function required(name, args, extra) {
  const result = run(name, args, extra);
  assert.equal(result.status, 0, `${name}: ${result.text.slice(-12000)}`);
}
if (phase === 'generate') {
  const args = ['msbuild', 'eng\\tools\\GenerateFiles\\GenerateFiles.csproj', '-t:GenerateDirectoryBuildFiles', '-p:Configuration=Release', '-v:minimal', ...settings];
  const first = run('generate-initial', args);
  if (first.status !== 0) {
    assert(/NETSDK1004|project\.assets\.json|GenerateFileFromTemplate|MSB4036/.test(first.text), first.text);
    required('generate-restore', ['restore', 'eng\\tools\\GenerateFiles\\GenerateFiles.csproj', '-v:minimal', ...settings]);
    required('generate-after-restore', args);
  }
} else if (phase === 'build' || phase === 'build-after-prereqs') {
  for (const [kind, project] of Object.entries(projects)) {
    const args = ['build', project, '--no-restore', '-c', 'Release', '-v:minimal', ...settings];
    const first = run(kind === 'core' && phase === 'build-after-prereqs' ? 'core-build-after-prereqs' : `${kind}-build-initial`, args);
    if (first.status !== 0) {
      assert(/NETSDK1004|project\.assets\.json|NU1101|NU1102/.test(first.text), first.text.slice(-12000));
      required(`${kind}-restore`, ['restore', project, '-v:minimal', ...settings]);
      required(`${kind}-build`, args);
    }
    required(`${kind}-evaluation`, ['msbuild', project, '-p:Configuration=Release',
      '-getProperty:TargetFramework,RuntimeFrameworkVersion,LangVersion,IsTestProject,IsUnitTestProject,IsShipping,AssemblyName,TargetPath,ProjectAssetsFile,MSBuildProjectFullPath,UseIisNativeAssets,BuildProjectReferences,RunAnalyzers,RunAnalyzersDuringBuild,EnableNETAnalyzers,Configuration',
      '-getItem:ProjectReference,PackageReference', '/nr:false']);
  }
} else if (phase === 'test' || phase === 'modules') {
  const selection = JSON.parse(fs.readFileSync(path.join(root, 'native-selection.json')));
  for (const group of selection.groups) {
    const args = ['test', projects[group.kind], '--no-build', '--no-restore', '-c', 'Release', '-v:minimal', ...settings,
      '--filter', group.filter, '--logger', `trx;LogFileName=${role}-${group.kind}-${phase}.trx`,
      '--results-directory', path.join(root, 'evidence', `native-${role}-${group.kind}-${phase}`)];
    required(`${group.kind}-${phase}`, args, phase === 'modules' ? '-CaptureTesthostModules' : '');
  }
} else throw new Error(`Unknown phase ${phase}`);
