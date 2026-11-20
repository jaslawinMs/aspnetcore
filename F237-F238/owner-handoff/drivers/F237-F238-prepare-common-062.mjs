import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F237-F238-059');
const common = path.join(root, 'common-062');
const { parsePe } = await import(pathToFileURL(path.join(session, 'autoperf-parallelism', 'finding-F180-F204-046', 'portable-metadata.mjs')));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
assert(!fs.existsSync(common));
assert(!fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')));
fs.mkdirSync(common);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(common, 'executed-prepare-common-062.mjs'));
fs.copyFileSync(path.join(session, 'F237-F238-Probe-061.cs'), path.join(common, 'Program.cs'));
const selector = (Template, PageRoute, RouteTemplate = null, SuppressLinkGeneration = false) => ({
    Template, SuppressLinkGeneration, SuppressPathMatching: false, Name: null, Order: null, PageRoute, RouteTemplate
});
const model = (RelativePath, ViewEnginePath, AreaName, Selectors) => ({
    RelativePath, ViewEnginePath, AreaName,
    RouteValues: [...(AreaName === null ? [] : [{ Key: 'area', Value: AreaName }]), { Key: 'page', Value: ViewEnginePath }],
    Selectors
});
const normalIndex = rootPath => model('/Pages/Index.cshtml', rootPath === '/' ? '/Pages/Index' : '/Index', null,
    rootPath === '/' ? [selector('Pages/Index', '/Pages/Index', null, true), selector('Pages', '/Pages')] :
        [selector('Index', '/Index', null, true), selector('', '')]);
const areaIndex = model('/Areas/Admin/Pages/Index.cshtml', '/Index', 'Admin',
    [selector('Admin/Index', '/Admin/Index', null, true), selector('Admin', '/Admin')]);
const areaManage = model('/Areas/Admin/Pages/Manage.cshtml', '/Manage', 'Admin',
    [selector('absolute', '/Admin/Manage', '/absolute')]);
const areaCatalog = model('/Areas/Shop/Pages/Catalog.cshtml', '/Catalog', 'Shop',
    [selector('Shop/Catalog', '/Shop/Catalog')]);
const mixedFiles = {
    'Pages\\Index.cshtml': '@page\n<p>normal index</p>\n',
    'Pages\\Details.cshtml': '@page "{id:int}"\n<p>details</p>\n',
    'Pages\\Shared\\WithoutDirective.cshtml': '<p>not a page</p>\n',
    'Areas\\Admin\\Pages\\Index.cshtml': '@page\n<p>area index</p>\n',
    'Areas\\Admin\\Pages\\Manage.cshtml': '@page "/absolute"\n<p>area override</p>\n',
    'Areas\\Shop\\Pages\\Catalog.cshtml': '@page\n<p>catalog</p>\n',
    'Areas\\Admin\\Pages\\_Layout.cshtml': '<p>not a page</p>\n',
    'Areas\\Admin\\Other.cshtml': '@page\n<p>unsupported area shape</p>\n',
    'Other\\Index.cshtml': '@page "~/outside"\n<p>outside</p>\n',
    'ignored.txt': '@page\nnot a razor item\n'
};
const fixture = (Name, RootDirectory, ExpectedAreaItems, ExpectedPageItems, ExpectedUnsupportedAreaWarnings, Models, Files) => ({
    Name, RootDirectory, ExpectedAreaItems, ExpectedPageItems, ExpectedUnsupportedAreaWarnings,
    ExpectedMalformedWarnings: 0, Models, Files
});
const fixtures = [
    fixture('EmptyPhysicalPages', '/Pages', 0, 0, 0, [], {}),
    fixture('SingletonNormalIndex', '/Pages', 0, 1, 0, [normalIndex('/Pages')],
        { 'Pages\\Index.cshtml': mixedFiles['Pages\\Index.cshtml'] }),
    fixture('SingletonAreaIndex', '/Pages', 1, 0, 0, [areaIndex],
        { 'Areas\\Admin\\Pages\\Index.cshtml': mixedFiles['Areas\\Admin\\Pages\\Index.cshtml'] }),
    fixture('MixedSeparatePagesRoot', '/Pages', 5, 3, 1, [
        areaIndex, areaManage, areaCatalog, normalIndex('/Pages'),
        model('/Pages/Details.cshtml', '/Details', null, [selector('Details/{id:int}', '/Details', '{id:int}')])
    ], mixedFiles),
    fixture('MixedOverlappingRoot', '/', 5, 9, 1, [
        areaIndex, areaManage, areaCatalog, normalIndex('/'),
        model('/Pages/Details.cshtml', '/Pages/Details', null, [selector('Pages/Details/{id:int}', '/Pages/Details', '{id:int}')]),
        model('/Areas/Admin/Other.cshtml', '/Areas/Admin/Other', null, [selector('Areas/Admin/Other', '/Areas/Admin/Other')]),
        model('/Other/Index.cshtml', '/Other/Index', null, [selector('outside', '/Other/Index', '~/outside')])
    ], mixedFiles),
    fixture('CaseVariantAreaRoot', '/areas', 5, 5, 1, [
        areaIndex, areaManage, areaCatalog,
        model('/areas/Admin/Other.cshtml', '/Admin/Other', null, [selector('Admin/Other', '/Admin/Other')])
    ], mixedFiles)
];
const plan = fixtures.map(({ Files, ...rest }) => rest);
fs.writeFileSync(path.join(common, 'fixture-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
const files = [];
for (const fixture of fixtures) {
    const directory = path.join(common, 'fixture-inputs', fixture.Name);
    fs.mkdirSync(directory, { recursive: true });
    for (const [relative, content] of Object.entries(fixture.Files)) {
        const destination = path.join(directory, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, content, { flag: 'wx' });
        const raw = fs.readFileSync(destination);
        files.push({ fixture: fixture.Name, relative, bytes: raw.length, sha256: hash(raw) });
    }
}
fs.writeFileSync(path.join(common, 'fixture-input-inventory.json'), JSON.stringify(files, null, 2) + '\n', { flag: 'wx' });
const nativeBin = String.raw`C:\src\ap-F237-o059\artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Release\net12.0`;
const referenceMap = new Map(), skipped = [];
for (const [sourceRole, directory] of [
    ['Original62-reference-image-not-observed-compiler-or-assertion-runtime',
        String.raw`C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105`],
    ['actual-Original-native-test-output', nativeBin]
]) {
    for (const name of fs.readdirSync(directory).filter(name => name.toLowerCase().endsWith('.dll')).sort()) {
        const file = path.join(directory, name), bytes = fs.readFileSync(file);
        const pe = parsePe(bytes);
        const record = { file, sourceRole, bytes: bytes.length, sha256: hash(bytes), parsedPe: pe };
        if (!pe.mvid) {
            skipped.push({ ...record, actualNotAManagedReference: true });
            continue;
        }
        referenceMap.set(name.toLowerCase(), record);
    }
}
const references = [...referenceMap.values()];
assert(referenceMap.has('system.private.corelib.dll'));
assert(references.some(item => path.basename(item.file) === 'Moq.dll'));
assert(references.some(item => path.basename(item.file) === 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll'));
fs.writeFileSync(path.join(common, 'reference-inputs.json'), JSON.stringify({ actualReferences: references, actualNonManagedSkipped: skipped }, null, 2) + '\n', { flag: 'wx' });
const response = ['/nostdlib+', '/target:exe', '/langversion:13', '/nullable:enable', '/warnaserror+',
    '/debug:portable', '/deterministic+', `/out:"${path.join(common, 'RuntimePageDiscovery.CommonProbe.dll')}"`,
    `/pdb:"${path.join(common, 'RuntimePageDiscovery.CommonProbe.pdb')}"`,
    ...references.map(item => `/reference:"${item.file}"`), `"${path.join(common, 'Program.cs')}"`].join('\r\n') + '\r\n';
fs.writeFileSync(path.join(common, 'compile.rsp'), response, { flag: 'wx' });
fs.writeFileSync(path.join(common, 'compile-plan.json'), JSON.stringify({
    recordedAt: new Date().toISOString(), actualSourceSha256: hash(fs.readFileSync(path.join(common, 'Program.cs'))),
    actualFixturePlanSha256: hash(fs.readFileSync(path.join(common, 'fixture-plan.json'))),
    actualResponseFileSha256: hash(Buffer.from(response)), actualReferences: references.length, actualNonManagedSkipped: skipped.length,
    actualFixturesFrozenBeforeFirstCompiler: fixtures.map(item => item.Name),
    actualExpectedNativeModelCounts: fixtures.map(item => item.Models.length),
    actualMalformedDirectiveAndCompiledPageProducerNotSelectedOrClaimedByThisCharacterization: true,
    actualNoCandidateOrPerformanceDatasetOrAuthorization: true
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPrepared: true, actualFixtures: fixtures.length, actualFixtureFiles: files.length,
    actualReferences: references.length, actualNonManagedSkipped: skipped.length, actualNoCompilerStarted: true }, null, 2));
