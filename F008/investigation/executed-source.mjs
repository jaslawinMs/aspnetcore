import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F008');
const repo=String.raw`C:\src\aspnetcore`,directory=path.join(run,'investigation'),record=path.join(run,'current-source-investigation.json');
assert(!fs.existsSync(record));const commands=[];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n');
function command(label,entryPoint,args){
    const result=spawnSync(entryPoint,args,{cwd:repo,maxBuffer:32*1024*1024});
    fs.writeFileSync(path.join(directory,label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(directory,label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({label,entryPoint,arguments:args,actualExitCode:result.status});
    fs.writeFileSync(path.join(directory,'execution.json'),JSON.stringify(commands,null,2)+'\n');
    assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
}
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F008-request-localization-culture-membership';
assert.equal(command('working-head','git',['rev-parse','HEAD']).toString().trim(),baseline);
assert.equal(command('working-branch','git',['branch','--show-current']).toString().trim(),branch);
assert.equal(command('working-diff','git',['diff','--name-only']).length,0);
const current=JSON.parse(command('current-default','gh',['api','repos/dotnet/aspnetcore/branches/main']).toString()).commit.sha;
command('default-commit-present','git',['cat-file','-e',current+'^{commit}']);
const selected=[
    'src\\Middleware\\Localization\\src\\RequestLocalizationMiddleware.cs',
    'src\\Middleware\\Localization\\src\\RequestLocalizationOptions.cs',
    'src\\Middleware\\Localization\\src\\QueryStringRequestCultureProvider.cs',
    'src\\Middleware\\Localization\\src\\AcceptLanguageHeaderRequestCultureProvider.cs',
    'src\\Middleware\\Localization\\src\\ProviderCultureResult.cs',
    'src\\Middleware\\Localization\\src\\RequestCultureProvider.cs',
    'src\\Middleware\\Localization\\src\\RequestCulture.cs',
    'src\\Middleware\\Localization\\src\\RequestCultureFeature.cs',
    'src\\Middleware\\Localization\\src\\IRequestCultureFeature.cs',
    'src\\Middleware\\Localization\\src\\RequestCultureProviderLoggerExtensions.cs',
    'src\\Middleware\\Localization\\src\\Microsoft.AspNetCore.Localization.csproj',
    'src\\Middleware\\Localization\\test\\UnitTests\\RequestLocalizationMiddlewareTest.cs',
    'src\\Middleware\\Localization\\test\\UnitTests\\RequestLocalizationOptionsTest.cs',
    'src\\Middleware\\Localization\\test\\UnitTests\\QueryStringRequestCultureProviderTest.cs',
    'src\\Middleware\\Localization\\test\\UnitTests\\AcceptLanguageHeaderRequestCultureProviderTest.cs',
    'src\\Middleware\\Localization\\test\\UnitTests\\Microsoft.AspNetCore.Localization.Tests.csproj'
];
const sources=selected.map((file,index)=>{
    const key=file.replaceAll('\\','/'),base=command('baseline-source-'+index,'git',['show',baseline+':'+key]);
    const latest=command('default-source-'+index,'git',['show',current+':'+key]),working=fs.readFileSync(path.join(repo,file));
    for(const[name,bytes]of[['baseline-canonical',base],['current-default-canonical',latest],['producer-source',working]]){
        const destination=path.join(run,name,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
    }
    assert.equal(canonical(base),canonical(latest),file+':inspect actual default difference.');
    assert.equal(canonical(base),canonical(working),file+':inspect working difference.');
    return{file,baselineSha256:hash(base),currentDefaultSha256:hash(latest),workingSha256:hash(working),canonicalEqual:true};
});
command('owner-history','git',['log','--format=%H %ad %s','--date=iso-strict','-n','8',current,'--',selected[0]]);
command('membership-history','git',['log','-p','-S','supportedCultures.FirstOrDefault','-n','3',current,'--',selected[0]]);
const sdk=command('current-sdk-delta','git',['diff',baseline,current,'--','global.json','eng/Versions.props']);
fs.writeFileSync(path.join(directory,'current-sdk-context.patch'),sdk);
const related=JSON.parse(fs.readFileSync(path.join(directory,'related-pr-70155.json'),'utf8').replace(/^\uFEFF/,''));
assert.equal(related.author.login,'davidfowl');assert.equal(related.state,'OPEN');
const patch=fs.readFileSync(path.join(directory,'related-pr-70155.patch'),'utf8');
assert(patch.includes('-        var culture = supportedCultures.FirstOrDefault('));
assert(patch.includes('+        var culture = FindSupportedCulture(name, supportedCultures);'));
assert(patch.includes('+    private static CultureInfo? FindSupportedCulture(StringSegment name, IList<CultureInfo> supportedCultures)'));
fs.copyFileSync(path.join(session,'F008-acceptance.json'),path.join(run,'acceptance.json'));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(directory,'executed-source.mjs'));
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({candidate:'F008',maximumComparisons:3,usedComparisons:0,
    originalProfiles:0,candidateProfiles:0,maximumOriginalOnlyDiagnosticProfiles:1,originalOnlyDiagnosticProfiles:0,
    sourceCandidateShapes:0,closed:false,reason:'Original behavior and overlap investigation;no compatible source candidate selected.'},null,2)+'\n');
fs.writeFileSync(record,JSON.stringify({candidate:'F008',baseline,branch,currentDefault:current,capturedAt:new Date().toISOString(),
    sources,scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.length,wholeSelectedOwnerCanonicalEqual:true,
    sourceChanged:false,implementationStarted:false,predeclaredAcceptance:'acceptance.json',
    relatedUpstreamPr:related.url,relatedPrHead:related.headRefOid,relatedPrAuthor:related.author.login,
    overlap:'PR70155 replaces exact FirstOrDefault closure/enumerator seam with List/array loops and fallback enumeration;it does not precompute an index or remove O(N*M). No upstream performance numbers are reused as this machine evidence.',
    liveOwnershipQuestion:'Options retains caller IList<CultureInfo> properties. Establish real downstream effects of sequential element/backing/property changes before selecting an index.',
    buildContextBoundary:'Sixteen selected source/project/test files and entire owner canonically equal;not whole dependency/SDK integration. Current SDK input delta retained without changing manifests.',
    codeIntelligenceBoundary:'GitHub semantic search returned404;LSP workspace symbol search returned none. Neither is repo completeness evidence. Known exact files and actual Git source/history/related diffs inspected directly.',
    guidance:['docs/BuildFromSource.md','docs/CrossCuttingGuidance.md','src/Middleware/build.cmd']
},null,2)+'\n');
console.log(`F008 current/default${current.slice(0,8)}:16 selected canonical matches;David Fowler PR70155 overlaps safe allocation seam but not index complexity. Original-contract evidence required,no source candidate/timing yet.`);
