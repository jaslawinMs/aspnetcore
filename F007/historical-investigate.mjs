import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`;
const run=path.join(session,'autoperf-runs','F007'),directory=path.join(run,'investigation');
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F007-root-operation-id-membership';
assert(!fs.existsSync(run),'Never overwrite an actual investigation.');
fs.mkdirSync(directory,{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(directory,'executed-source.mjs'));
fs.copyFileSync(path.join(session,'F007-acceptance.json'),path.join(run,'acceptance.json'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n'),commands=[];
function capture(entryPoint,args,label){
    const result=spawnSync(entryPoint,args,{cwd:root,maxBuffer:32*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
    fs.writeFileSync(path.join(directory,label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(directory,label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({entryPoint,arguments:args,actualExitCode:result.status,label});
    fs.writeFileSync(path.join(directory,'execution.json'),JSON.stringify({candidate:'F007',commands},null,2)+'\n');
    assert.equal(result.status,0,label+':'+result.stderr?.toString());return result.stdout;
}
assert.equal(capture('git',['rev-parse','HEAD'],'working-head').toString().trim(),baseline);
assert.equal(capture('git',['branch','--show-current'],'independent-branch').toString().trim(),branch);
assert.equal(capture('git',['diff','--name-only'],'working-diff').length,0);
assert.equal(capture('git',['diff','--cached','--name-only'],'working-staged-diff').length,0);
capture('git',['status','--porcelain'],'working-status');
assert.match(capture('git',['remote','get-url','origin'],'upstream-url').toString().trim(),/^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
const defaultBranch=capture('gh',['api','repos/dotnet/aspnetcore','--jq','.default_branch'],'default-branch').toString().trim();
assert.equal(defaultBranch,'main');
const current=capture('gh',['api',`repos/dotnet/aspnetcore/commits/${defaultBranch}`,'--jq','.sha'],'default-ref').toString().trim();
assert.match(current,/^[a-f0-9]{40}$/);capture('git',['fetch','--quiet','--no-tags','origin',defaultBranch],'fetch-current-default');
capture('git',['cat-file','-t',current],'default-commit-present');
const owner=String.raw`src\Components\Server\src\Circuits\ServerComponentDeserializer.cs`;
const files=[owner,String.raw`src\Components\Server\src\Circuits\IServerComponentDeserializer.cs`,
    String.raw`src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj`,
    String.raw`src\Components\Server\src\Circuits\ComponentParameterDeserializer.cs`,
    String.raw`src\Components\Server\src\ComponentHub.cs`,String.raw`src\Components\Server\src\Circuits\CircuitPersistenceManager.cs`,
    ...['RootComponentOperation.cs','RootComponentOperationBatch.cs','RootComponentOperationType.cs','RootTypeCache.cs'].map(name=>path.win32.join('src','Components','Shared','src',name)),
    ...['ServerComponentSerializationSettings.cs','ServerComponentSerializer.cs'].map(name=>path.win32.join('src','Shared','Components',name)),
    ...['ServerComponentDeserializerTest.cs','ServerComponentDeserializerTest.Unions.cs'].map(name=>path.win32.join('src','Components','Server','test','Circuits',name)),
    String.raw`src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj`];
const sources=files.map((file,index)=>{
    const gitPath=file.replaceAll('\\','/'),before=capture('git',['show',`${baseline}:${gitPath}`],`baseline-source-${index}`);
    const after=capture('git',['show',`${current}:${gitPath}`],`default-source-${index}`),working=fs.readFileSync(path.join(root,file));
    equalCanonical(before,working,file);
    for(const[name,bytes]of[['baseline-canonical',before],['current-default-canonical',after],['producer-source',working]]){
        const output=path.join(run,name,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
    }
    return{file,baselineSha256:sha(before),currentDefaultSha256:sha(after),workingSha256:sha(working),
        baselineAndDefaultEquivalent:canonical(before)===canonical(after),workingEqualsBaseline:true};
});
function equalCanonical(before,after,label){assert.equal(canonical(before),canonical(after),'Independent baseline differs:'+label);}
const before=canonical(fs.readFileSync(path.join(run,'baseline-canonical',owner))),after=canonical(fs.readFileSync(path.join(run,'current-default-canonical',owner)));
const start='    public bool TryDeserializeRootComponentOperations(',end='    private static partial class Log';
const selected=source=>source.slice(source.indexOf(start),source.indexOf(end));
assert(selected(before).length>2000);assert.equal(selected(before),selected(after),'Selected current-default batch method changed;inspect before implementation.');
capture('git',['--no-pager','diff',baseline,current,'--',owner],'exact-default-owner-delta');
capture('git',['log',current,'--max-count=12','--follow','--format=%H %ad %s','--date=iso-strict','--',owner],'owner-history');
capture('git',['log',current,'--max-count=5','-p','--',owner],'recent-owner-patches');
for(const query of ['ServerComponentDeserializer','"Duplicate component ID"'])
    capture('gh',['search','prs',query,'--repo','dotnet/aspnetcore','--limit','10','--json','number,title,state,url'],'related-work-'+(query.startsWith('"')?'duplicate-id':'owner'));
const guidance=[String.raw`src\Components\AGENTS.md`,String.raw`.github\instructions\components.instructions.md`,
    String.raw`.github\instructions\components.server.instructions.md`,String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
    String.raw`docs\CrossCuttingGuidance.md`,String.raw`docs\BlazorComponentsGuidance.md`,String.raw`docs\BuildFromSource.md`]
    .map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify({
    candidate:'F007',baseline,branch,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),sources,
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(row=>row.baselineAndDefaultEquivalent).length,
    selectedBatchMethodCanonicalEqual:true,selectedBatchMethodSha256:sha(Buffer.from(selected(before))),
    wholeDefaultOwnerCanonicalEqual:before===after,sourceChanged:false,sourceComparisons:0,
    actualCallersSourceRead:['ComponentHub.UpdateRootComponents:normal descriptor-enabled route','CircuitPersistenceManager.ToRootComponentOperationBatch:existing descriptor-disabled resume route'],
    owningProducerBoundary:'Actual JsonSerializer.Deserialize creates Server-assembly batch/operation array;real full owner validation yields Boolean/batch/log/state effects. Large wire inputs are stress,not measured browser queue frequency.',
    codeIntelligenceBoundary:'Known owner document symbols resolved;incoming-call and workspace-symbol probes returned no rows and are not completeness evidence. Narrow exact source search then located actual callers/tests/shared DTOs. Configured Azure DevOps graph is not this GitHub repository.',
    assemblyBoundary:'Use actual internal types from measured Server assembly,not duplicated linked Endpoints types. No new shipping IVT/UnsafeAccessor or public bridge.',
    consultedGuidance:guidance,predeclaredAcceptance:true,implementationStarted:false
},null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({candidate:'F007',maximumComparisons:3,usedComparisons:0,
    originalProfiles:0,candidateProfiles:0,sourceShapesMeasured:0,closed:false},null,2)+'\n');
console.log(`F007 fresh default${current.slice(0,8)},${sources.length} source triples/${sources.filter(row=>row.baselineAndDefaultEquivalent).length} fully equal;selected whole batch method unchanged. Acceptance captured,0 comparisons,no shipping change.`);
