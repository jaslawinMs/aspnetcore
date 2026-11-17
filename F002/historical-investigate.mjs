import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`;
const run=path.join(session,'autoperf-runs','F002'),baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F002-webtransport-stream-removal';
const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
assert(!fs.existsSync(run),'Never overwrite an actual independent investigation.');
fs.mkdirSync(path.join(run,'investigation'),{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'investigation','executed-source.mjs'));
fs.copyFileSync(path.join(session,'F002-acceptance.json'),path.join(run,'acceptance.json'));
const commands=[];
function execute(label,entryPoint,args){
    const startedAt=new Date().toISOString(),result=spawnSync(entryPoint,args,{cwd:root,maxBuffer:32*1024*1024,windowsHide:true});
    for(const field of ['stdout','stderr'])fs.writeFileSync(path.join(run,'investigation',label+'.'+field),result[field]??Buffer.alloc(0));
    commands.push({label,entryPoint,arguments:args,actualExitCode:result.status,startedAt,completedAt:new Date().toISOString(),
        ...(result.error?{error:String(result.error)}:{})});
    fs.writeFileSync(path.join(run,'investigation','execution.json'),JSON.stringify({candidate:'F002',commands},null,2)+'\n');
    assert(!result.error&&result.status===0,'Actual command failed:'+label);
    return result.stdout;
}
assert.equal(execute('tracked-status','git',['status','--porcelain','--untracked-files=no']).toString().trim(),'');
execute('fetch-current-main','git',['fetch','--quiet','origin','main']);
const current=execute('fresh-default-api','gh',['api','repos/dotnet/aspnetcore/commits/main','--jq','.sha']).toString().trim();
assert.match(current,/^[\da-f]{40}$/);assert.equal(execute('current-default-ref','git',['rev-parse','origin/main']).toString().trim(),current);
const prior=execute('prior-head','git',['rev-parse','HEAD']).toString().trim();
execute('independent-branch','git',['switch','-c',branch,baseline]);
assert.equal(execute('independent-head','git',['rev-parse','HEAD']).toString().trim(),baseline);
const previous=path.join(session,'autoperf-runs','F001');
const priorSource=json(path.join(previous,'current-source-investigation.json'));
const priorContext=json(path.join(previous,'context-amendment.json'));
const files=[...priorSource.sources,...priorContext.additionalSources].map(row=>row.file).concat([
    String.raw`src\Servers\Kestrel\Transport.Quic\test\QuicTestHelpers.cs`,
    String.raw`src\Servers\Kestrel\Transport.Quic\test\QuicStreamContextTests.cs`,
    String.raw`src\Servers\Kestrel\Transport.Quic\test\Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.Tests.csproj`,
    String.raw`src\Servers\Kestrel\Transport.Quic\src\Internal\QuicConnectionContext.cs`,
    String.raw`src\Servers\Kestrel\Transport.Quic\src\Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.csproj`
]);
assert.equal(new Set(files).size,26);
const sources=[];
for(const [index,file] of files.entries()){
    const gitPath=file.replaceAll('\\','/'),original=execute('baseline-source-'+index,'git',['show',baseline+':'+gitPath]);
    const fresh=execute('default-source-'+index,'git',['show',current+':'+gitPath]),working=fs.readFileSync(path.join(root,file));
    assert.equal(canonical(original).equals(canonical(working)),true,file);
    for(const [directory,bytes] of [['baseline-canonical',original],['current-default-canonical',fresh],['producer-source',working]]){
        const target=path.join(run,directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
    }
    sources.push({file,baselineSha256:hash(original),currentDefaultSha256:hash(fresh),workingSha256:hash(working),
        baselineAndDefaultEquivalent:canonical(original).equals(canonical(fresh)),workingEqualsBaseline:true,
        identicalToPriorF001RawSource:fs.existsSync(path.join(previous,'producer-source',file))?hash(working)===hash(fs.readFileSync(path.join(previous,'producer-source',file))):null});
}
for(const [label,file] of [['session-history',files[0]],['stream-history',files[1]],['actual-quic-close-history',files[5]]])
    execute(label,'git',['--no-pager','log','origin/main','-10','--format=%H %ad %s','--date=iso-strict','--',file.replaceAll('\\','/')]);
execute('original-introduction','git',['--no-pager','show','b120cefca18a2000c93e5b297d7a4d68c6e89e47','--',files[0].replaceAll('\\','/'),files[1].replaceAll('\\','/')]);
execute('session-cleanup-history','git',['--no-pager','show','03c314bbe77aa36fffe1c97e56edd8e548d3017c','--',files[0].replaceAll('\\','/')]);
execute('cleanup-pr','gh',['pr','view','69708','--repo','dotnet/aspnetcore','--json','number,title,body,url,state,mergedAt,mergeCommit,files']);
execute('exact-removal-callsite-search','gh',['search','code','TryRemoveStream','--repo','dotnet/aspnetcore','--limit','30','--json','path,url']);
execute('webtransport-host-feature-search','gh',['search','code','EnableWebTransportAndH3Datagrams','--repo','dotnet/aspnetcore','--limit','35','--json','path,url']);
execute('quic-owner-test-search','gh',['search','code','QuicStreamContext','--repo','dotnet/aspnetcore','--limit','25','--json','path,url']);
const active=path.join(run,'harness');fs.mkdirSync(active);
const template=[];
for(const name of ['Program.cs','ProtocolFixture.cs','SettingsPreservingEmitToolchain.cs','AutoPerf.Benchmarks.csproj']){
    const source=path.join(previous,'harness',name);fs.copyFileSync(source,path.join(active,name));template.push({file:name,sha256:hash(fs.readFileSync(source))});
}
fs.writeFileSync(path.join(run,'harness-template-provenance.json'),JSON.stringify({
    candidate:'F002',reusedUnmodifiedStartingTemplate:'F001 original-prep2',f001FinalizedAndNotModified:true,files:template,
    requiredNextAction:'Adapt only F002 standalone harness before any build/freeze. Existing F001 original runs remain immutable.'
},null,2)+'\n');
const evidence={
    candidate:'F002',baseline,branch,priorHead:prior,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(row=>row.baselineAndDefaultEquivalent).length,sources,
    shippingSourceChanged:false,currentDefaultFullIntegrationExecuted:false,actualSourceComparisons:0,
    codeIntelligence:{githubSemanticSearch:'Actual HTTP404 for dotnet/aspnetcore.',csharpLsp:'Named TryRemoveStream resolved,but incomingCalls returned zero despite the source callback. No call-graph completeness claim.',
        fallback:'Actual targeted GitHub lexical searches,known-file source,local Git history.'},
    observedSourceBoundary:'TryRemoveStream removes one dictionary entry and synchronously joins WebTransportStream.DisposeAsync. Actual known WebTransportStream constructor registration calls it from context.StreamContext.ConnectionClosed;the in-memory TestStreamContext does not override its base uncancellable token. Actual QUIC creates a token lazily and cancels it after receive/send loops and stream-closed callbacks.',
    distinctionFromF001:'Different wait/callback. Reusing F001 producer EOF evidence does not establish F002 transport-cancellation callback reachability.',
    nativeProducerBoundaryToAttempt:'Normal loopback QuicTransportFactory/real QuicStreamContext stream FIN and HTTP/3 association through existing in-memory parent mux. If successful,hybrid lower boundary,not complete network HTTP/3/contended registration proof.',
    borrowedExistingTestEvidencePermittedOnlyAfterExactIdentity:true,
    tooling:'No microbenchmarking specialist is listed. Continue safely with existing pinned settings-preserving harness and C# semantics;optional dotnet-diag plugin is not required for this bounded local comparison.'
};
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({candidate:'F002',maximumComparisons:3,usedComparisons:0,
    sourceShapesMeasured:0,originalDiagnosticProfiles:0,candidateProfiles:0,closed:false},null,2)+'\n');
console.log(`F002:${evidence.currentDefaultEquivalentFiles}/${sources.length} scoped baseline/default sources equal,independent baseline branch and acceptance captured. No shipping change or timing.`);
