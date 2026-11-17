import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`,run=path.join(session,'autoperf-runs','F004');
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F004-loop-iterator-symbol-membership';
assert(!fs.existsSync(run));fs.mkdirSync(path.join(run,'investigation'),{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'investigation','executed-source.mjs'));
fs.copyFileSync(path.join(session,'F004-acceptance.json'),path.join(run,'acceptance.json'));
const commands=[],hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
function capture(entryPoint,args,label){
    const result=spawnSync(entryPoint,args,{cwd:root,maxBuffer:32*1024*1024});
    fs.writeFileSync(path.join(run,'investigation',label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(run,'investigation',label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({entryPoint,arguments:args,actualExitCode:result.status,label});
    fs.writeFileSync(path.join(run,'investigation','execution.json'),JSON.stringify({candidate:'F004',commands},null,2)+'\n');
    assert.equal(result.status,0,label+':'+result.stderr?.toString());
    return result.stdout;
}
assert.equal(capture('git',['rev-parse','HEAD'],'prior-head').toString().trim(),baseline);
assert.equal(capture('git',['diff','--name-only'],'prior-tracked-diff').length,0);
assert.equal(capture('git',['diff','--cached','--name-only'],'prior-staged-diff').length,0);
assert.equal(capture('git',['branch','--list',branch],'prior-target-branch').length,0);
const defaultBranch=capture('gh',['api','repos/dotnet/aspnetcore','--jq','.default_branch'],'default-branch').toString().trim();
assert.equal(defaultBranch,'main');
const current=capture('gh',['api','repos/dotnet/aspnetcore/git/ref/heads/'+defaultBranch,'--jq','.object.sha'],'default-ref').toString().trim();
assert(/^[a-f0-9]{40}$/.test(current));
capture('git',['fetch','--quiet','origin',defaultBranch],'fetch-default');
capture('git',['switch','-c',branch,baseline],'create-independent-branch');
const files=[
    String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`,
    String.raw`src\Components\Analyzers\src\ComponentsApi.cs`,
    String.raw`src\Components\Analyzers\src\DiagnosticDescriptors.cs`,
    String.raw`src\Components\Analyzers\src\Resources.resx`,
    String.raw`src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj`,
    String.raw`src\Components\Analyzers\test\ForLoopIteratorInClosureAnalyzerTest.cs`,
    String.raw`src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj`
];
const sources=[];
for(const [index,file] of files.entries()){
    const original=capture('git',['show',baseline+':'+file.replaceAll('\\','/')],`baseline-source-${index}`);
    const fresh=capture('git',['show',current+':'+file.replaceAll('\\','/')],`default-source-${index}`);
    const working=fs.readFileSync(path.join(root,file));assert(canonical(original).equals(canonical(working)));
    for(const [directory,bytes] of [['baseline-canonical',original],['current-default-canonical',fresh],['producer-source',working]]){
        const target=path.join(run,directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
    }
    sources.push({file,baselineSha256:hash(original),currentDefaultSha256:hash(fresh),workingSha256:hash(working),
        baselineAndDefaultEquivalent:canonical(original).equals(canonical(fresh)),workingEqualsBaseline:true});
}
assert(sources[0].baselineAndDefaultEquivalent,'Target changed on current default;characterize before proposing a baseline-only fix.');
capture('git',['log',current,'--follow','--format=%H %ad %s','--date=iso-strict','--',files[0]],'current-default-owner-history');
for(const commit of ['70a531e2fccbd0d22f049e968604e3d62acc9558','cf0040c17ca3f506240b60ca4fc9219684a73302'])
    capture('git',['--no-pager','show',commit,'--',files[0]],'history-'+commit.slice(0,8));
capture('gh',['api','repos/dotnet/aspnetcore/pulls/67228'],'original-feature-pr');
capture('gh',['api','repos/dotnet/aspnetcore/issues/65234'],'original-feature-issue');
capture('gh',['search','code','ForLoopIteratorInClosureAnalyzer','--repo','dotnet/aspnetcore','--limit','10','--json','path'],'actual-test-source-lookup');
capture('gh',['search','prs','ForLoopIteratorInClosureAnalyzer','--repo','dotnet/aspnetcore','--limit','10','--json','number,title,state,url'],'related-work-bounded-query');
for(const file of [String.raw`src\Components\AGENTS.md`,String.raw`.github\instructions\components.instructions.md`,
    String.raw`docs\CrossCuttingGuidance.md`,String.raw`docs\BlazorComponentsGuidance.md`,String.raw`docs\BuildFromSource.md`]){
    const target=path.join(run,'guidance',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
}
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify({
    candidate:'F004',baseline,branch,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(row=>row.baselineAndDefaultEquivalent).length,sources,
    shippingSourceChanged:false,currentDefaultFullIntegrationExecuted:false,sourceComparisons:0,
    actualSourceBoundary:'Private Iterators is only read by IsIterator and added by AddIterator/OnPotentialIteratorChanged. LSP returned exactly4 local property references;no iteration/order consumer observed. F005/F006 lists and IteratorOccurrences remain distinct.',
    codeIntelligence:'GitHub semantic tool actual repository HTTP404. Targeted actual GitHub code lookup and known-file source used;LSP property references returned274/286/298/317. Earlier class-position reference/definition probes returned empty and are not graph-completeness evidence.',
    prototypeProposal:'Lazy SymbolEqualityComparer.Default-backed private iterator set may avoid per-lookup Any closures/linear scans and avoid allocating an empty iterator container for non-render/zero-loop blocks. Not implemented or claimed a win.',
    priorWork:'F103 same project is finalized on its own independent source branch. Its harness patterns may be inspected,but no finalized runs/images are rerun/relabelled;fresh original owner is required because F103 changed another analyzer in the same assembly.',
    componentsBoundary:'Compiler-owned performance-only change;actual CSharp compiler samples/real Roslyn driver/actual component metadata and exact existing20 tests. No runtime/browser/Server-Wasm-Auto behavior claim.'
},null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({
    candidate:'F004',maximumComparisons:3,usedComparisons:0,originalProfiles:0,candidateProfiles:0,sourceShapesMeasured:0,closed:false
},null,2)+'\n');
console.log(`F004:fresh current default${current.slice(0,8)},independent baseline branch,${sources.length} source triples,actual history/feature contract and preimplementation acceptance captured;no shipping edit/profile.`);
