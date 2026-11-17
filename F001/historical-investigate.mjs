import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';

const session=path.dirname(fileURLToPath(import.meta.url));
const root=String.raw`C:\src\aspnetcore`;
const run=path.join(session,'autoperf-runs','F001');
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch='autoperf/F001-webtransport-session-disposal';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'),'utf8');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
assert(!fs.existsSync(run),'Never overwrite an existing original investigation.');
fs.mkdirSync(path.join(run,'investigation'),{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'investigation','executed-source.mjs'));
fs.copyFileSync(path.join(session,'F001-acceptance.json'),path.join(run,'acceptance.json'));
const commands=[];
function execute(label,command,args){
    const startedAt=new Date().toISOString();
    const result=spawnSync(command,args,{cwd:root,encoding:null,maxBuffer:32*1024*1024,windowsHide:true});
    fs.writeFileSync(path.join(run,'investigation',`${label}.stdout`),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(run,'investigation',`${label}.stderr`),result.stderr??Buffer.alloc(0));
    commands.push({label,entryPoint:command,arguments:args,actualExitCode:result.status,startedAt,
        completedAt:new Date().toISOString(),stdout:`${label}.stdout`,stderr:`${label}.stderr`,
        ...(result.error?{error:String(result.error)}:{})});
    fs.writeFileSync(path.join(run,'investigation','execution.json'),JSON.stringify({candidate:'F001',commands},null,2)+'\n');
    assert(!result.error&&result.status===0,`Actual command failed:${label}`);
    return result.stdout;
}
assert(execute('tracked-status','git',['status','--porcelain','--untracked-files=no']).toString().trim()==='','Tracked source must be clean.');
const current=execute('fresh-default-api','gh',['api','repos/dotnet/aspnetcore/commits/main','--jq','.sha']).toString().trim();
assert(/^[0-9a-f]{40}$/.test(current),'Exact actual default SHA required.');
assert(execute('fetched-default-ref','git',['rev-parse','origin/main']).toString().trim()===current,'Fetched default and fresh API differ;capture before continuing.');
const prior=execute('prior-source-head','git',['rev-parse','HEAD']).toString().trim();
execute('independent-branch','git',['switch','-c',branch,baseline]);
assert(execute('independent-head','git',['rev-parse','HEAD']).toString().trim()===baseline,'Independent baseline required.');
const files=[
    String.raw`src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs`,
    String.raw`src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStream.cs`,
    String.raw`src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStreamType.cs`,
    String.raw`src\Servers\Kestrel\Core\src\Internal\Http3\Http3Connection.cs`,
    String.raw`src\Servers\Kestrel\Core\src\Internal\Http3\Http3Stream.cs`,
    String.raw`src\Servers\Kestrel\Transport.Quic\src\Internal\QuicStreamContext.cs`,
    String.raw`src\Servers\Kestrel\shared\CompletionPipeReader.cs`,
    String.raw`src\Servers\Kestrel\shared\CompletionPipeWriter.cs`,
    String.raw`src\Http\Http.Features\src\IWebTransportSession.cs`,
    String.raw`src\Http\Http.Features\src\IHttpWebTransportFeature.cs`,
    String.raw`src\Servers\Kestrel\Core\src\Microsoft.AspNetCore.Server.Kestrel.Core.csproj`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj`,
    String.raw`src\Servers\Kestrel\shared\test\Http3\Http3InMemory.cs`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\Http3TestBase.cs`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportSessionTests.cs`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportStreamTests.cs`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportHandshakeTests.cs`,
    String.raw`src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportTestUtilities.cs`,
];
const sources=[];
for(let index=0;index<files.length;index++){
    const relative=files[index],gitPath=relative.replaceAll('\\','/');
    const original=execute(`baseline-source-${index+1}`,'git',['show',`${baseline}:${gitPath}`]);
    const fresh=execute(`default-source-${index+1}`,'git',['show',`${current}:${gitPath}`]);
    const working=fs.readFileSync(path.join(root,relative));
    for(const [directory,bytes] of [['baseline-canonical',original],['current-default-canonical',fresh],['producer-source',working]]){
        const destination=path.join(run,directory,relative);
        fs.mkdirSync(path.dirname(destination),{recursive:true});
        fs.writeFileSync(destination,bytes);
    }
    const same=canonical(original).equals(canonical(fresh));
    assert(canonical(original).equals(canonical(working)),`Working baseline differs:${relative}`);
    sources.push({file:relative,baselineSha256:hash(original),currentDefaultSha256:hash(fresh),workingSha256:hash(working),
        canonicalBaselineSha256:hash(canonical(original)),canonicalDefaultSha256:hash(canonical(fresh)),
        canonicalWorkingSha256:hash(canonical(working)),baselineAndDefaultEquivalent:same,workingEqualsBaseline:true});
}
execute('session-history','git',['--no-pager','log','origin/main','-12','--format=%H %ad %s','--date=iso-strict','--',files[0].replaceAll('\\','/')]);
execute('stream-history','git',['--no-pager','log','origin/main','-12','--format=%H %ad %s','--date=iso-strict','--',files[1].replaceAll('\\','/')]);
execute('original-introduction','git',['--no-pager','show','b120cefca18a2000c93e5b297d7a4d68c6e89e47','--',files[0].replaceAll('\\','/'),files[1].replaceAll('\\','/')]);
execute('session-cleanup-history','git',['--no-pager','show','03c314bbe77aa36fffe1c97e56edd8e548d3017c','--',files[0].replaceAll('\\','/'),files[3].replaceAll('\\','/'),files[14].replaceAll('\\','/')]);
execute('session-cleanup-pr','gh',['pr','view','69708','--repo','dotnet/aspnetcore','--json','number,title,body,url,state,mergedAt,mergeCommit,files,comments,reviews']);
execute('original-introduction-pr','gh',['pr','view','42097','--repo','dotnet/aspnetcore','--json','number,title,body,url,state,mergedAt,mergeCommit']);
execute('related-pr-search','gh',['search','prs','WebTransportSession DisposeAsync','--repo','dotnet/aspnetcore','--limit','10','--json','number,title,state,url']);
const evidence={
    candidate:'F001',baseline,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),branch,sourceParent:baseline,priorHead:prior,
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(x=>x.baselineAndDefaultEquivalent).length,sources,
    currentDefaultFullIntegrationExecuted:false,shippingSourceChanged:false,maximumMeasuredComparisons:3,actualSourceComparisons:0,
    correctedScanBoundary:'Actual method is OnClientConnectionClosed,not a public or private session Dispose method.',
    sourceWaitPresent:true,sourceWaitAloneProvesBlockedThreadOrProductionRegression:false,
    codeIntelligence:{githubSemanticSearch:'Actual HTTP404 for dotnet/aspnetcore.',csharpLsp:'Actual workspaceSymbol WebTransportStream returned no symbols.',
        localFallback:'Bounded direct source,known-file literal searches and local Git history;no indexed call-graph completeness claim.'},
    observedSourceBoundary:'Actual stream DisposeAsync awaits cancellation-registration disposal and actual context pipe completion;it does not invoke QuicStreamContext.DisposeAsync.',
    excludedClaim:'Neither await syntax nor a hand-made incomplete task proves a real transport-produced blocking precondition.'
};
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({candidate:'F001',maximumComparisons:3,usedComparisons:0,
    sourceShapesMeasured:0,closed:false,rule:'No timing until original producer and compatible candidate are established.'},null,2)+'\n');
console.log(`F001 independent ${branch};${evidence.currentDefaultEquivalentFiles}/${sources.length} baseline/default sources equivalent;no shipping edit or timing.`);
