import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),root=path.join(session,'autoperf-runs','F010'),directory=path.join(root,'investigation');
const repo=String.raw`C:\src\aspnetcore`,record=path.join(root,'current-source-investigation.json'),commands=[];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),canonical=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n');
assert(!fs.existsSync(record));
function command(label,entryPoint,args){
    const result=spawnSync(entryPoint,args,{cwd:repo,maxBuffer:32*1024*1024});
    fs.writeFileSync(path.join(directory,label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(directory,label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({label,entryPoint,arguments:args,actualExitCode:result.status});
    fs.writeFileSync(path.join(directory,'execution.json'),JSON.stringify(commands,null,2)+'\n');
    assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
}
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F010-claims-allowed-values-membership';
assert.equal(command('transition-head','git',['rev-parse','HEAD']).toString().trim(),baseline);
assert.equal(command('transition-unstaged','git',['diff','--name-only']).length,0);
assert.equal(command('transition-staged','git',['diff','--cached','--name-only']).length,0);
command('create-independent-branch','git',['switch','-c',branch,baseline]);
const current=JSON.parse(command('current-default','gh',['api','repos/dotnet/aspnetcore/branches/main']).toString()).commit.sha;
command('current-present','git',['cat-file','-e',current+'^{commit}']);
const core='src\\Security\\Authorization\\Core\\src\\',tests='src\\Security\\Authorization\\test\\';
const selected=[
    ...['ClaimsAuthorizationRequirement.cs','AuthorizationPolicyBuilder.cs','AuthorizationServiceExtensions.cs','AuthorizationHandler.cs',
        'PassThroughAuthorizationHandler.cs','DefaultAuthorizationService.cs','DefaultAuthorizationServiceImpl.cs','AuthorizationHandlerContext.cs',
        'DefaultAuthorizationHandlerContextFactory.cs','DefaultAuthorizationHandlerProvider.cs','DefaultAuthorizationEvaluator.cs',
        'AuthorizationServiceCollectionExtensions.cs','AuthorizationPolicy.cs','AuthorizationMetrics.cs','Microsoft.AspNetCore.Authorization.csproj'].map(name=>core+name),
    ...['ClaimsAuthorizationRequirementTests.cs','DefaultAuthorizationServiceTests.cs','Microsoft.AspNetCore.Authorization.Test.csproj'].map(name=>tests+name),
    'src\\Security\\perf\\Microbenchmarks\\ClaimsAuthorizationRequirementBenchmark.cs'
];
const sources=selected.map((file,index)=>{
    const key=file.replaceAll('\\','/'),base=command('baseline-source-'+index,'git',['show',baseline+':'+key]);
    const latest=command('default-source-'+index,'git',['show',current+':'+key]),working=fs.readFileSync(path.join(repo,file));
    for(const[name,bytes]of[['baseline-canonical',base],['current-default-canonical',latest],['producer-source',working]]){
        const destination=path.join(root,name,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
    }
    assert.equal(canonical(base),canonical(latest),file+':inspect actual default difference.');
    assert.equal(canonical(base),canonical(working),file+':inspect working difference.');
    return{file,baselineSha256:hash(base),currentDefaultSha256:hash(latest),workingSha256:hash(working),canonicalEqual:true};
});
command('owner-history','git',['--no-pager','log','--format=%H %ad %s','--date=iso-strict','-n','8',current,'--',selected[0]]);
command('value-matching-history','git',['--no-pager','log','-p','-S','AllowedValues!.Contains','-n','3',current,'--',selected[0]]);
command('related-claims-prs','gh',['search','prs','ClaimsAuthorizationRequirement','--repo','dotnet/aspnetcore','--limit','12','--json','number,title,state,url,author']);
command('related-direct-set-prs','gh',['search','prs','RequireClaim HashSet','--repo','dotnet/aspnetcore','--limit','8','--json','number,title,state,url,author']);
command('current-sdk-context','git',['--no-pager','diff',baseline,current,'--','global.json','eng/Versions.props']);
const related=JSON.parse(fs.readFileSync(path.join(directory,'related-pr-70221.json'),'utf8').replace(/^\uFEFF/,''));
assert.equal(related.author.login,'davidfowl');assert.equal(related.state,'MERGED');
const patch=fs.readFileSync(path.join(directory,'related-pr-70221.patch'),'utf8');
assert(patch.includes('+            && (requirement._emptyAllowedValues || requirement.AllowedValues!.Contains(claim.Value, StringComparer.Ordinal));'));
fs.copyFileSync(path.join(session,'F010-acceptance.json'),path.join(root,'acceptance.json'));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(directory,'executed-source.mjs'));
fs.writeFileSync(path.join(root,'measurement-budget.json'),JSON.stringify({candidate:'F010',maximumComparisons:3,usedComparisons:0,
    originalProfiles:0,candidateProfiles:0,completedComparisonIds:[],failedComparisonIds:[],completedProfiles:0,closed:false,
    reason:'No source candidate implemented;original public-owner/deferred/comparer/multi-TFM validation required before implementation.'},null,2)+'\n');
fs.writeFileSync(record,JSON.stringify({candidate:'F010',baseline,branch,currentDefault:current,capturedAt:new Date().toISOString(),
    sources,scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.length,wholeSelectedOwnerCanonicalEqual:true,
    implementationStarted:false,sourceChanged:false,relatedUpstreamPr:related.url,relatedPrHead:related.headRefOid,
    overlap:'Merged70221 changes principal/identity/claim enumeration and explicitly retains exact explicit-Ordinal value Contains;not an existing direct known-comparer HashSet membership fast path.',
    proposedSeam:'Use existing exact HashSet only with reference-known Ordinal/default string comparer;preserve all other enumerable operations,no materialized startup snapshot.',
    ownerTargetFrameworks:['net462','netstandard2.0','net12.0'],existingUnitProjectTargetFrameworks:['net12.0'],
    framework462SupportedHostObserved:'Installed Windows .NET Framework4.8.1,Release534296,Version4.8.10008;actual execution not yet run.',
    codeIntelligenceBoundary:'GitHub semantic404 and C#workspace symbol0 are unavailable-index observations,not absence/completeness evidence. Exact known files,actual source/related diffs/history and narrow file discovery inspected.',
    contextBoundary:'Nineteen selected source/project/test/benchmark files and full owner equal;not whole dependency/SDK integration. Current SDK input delta retained without changing manifests.',
    acceptance:'acceptance.json',maximumBuildNodes:2,shippingSourceCandidateImplemented:false
},null,2)+'\n');
console.log(`F010 default${current.slice(0,8)}:${sources.length} selected canonical matches;independent baseline branch ready. Prior David Fowler70221 leaves explicit-Ordinal Contains unchanged;no new shipping candidate/timing yet.`);
