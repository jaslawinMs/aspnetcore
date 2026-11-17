import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';

const session=path.dirname(fileURLToPath(import.meta.url));
const run=path.join(session,'autoperf-runs','F001');
const scope=JSON.parse(fs.readFileSync(path.join(run,'current-source-investigation.json'),'utf8'));
const output=path.join(run,'context-amendment.json');
if(fs.existsSync(output))throw Error('Never overwrite source amendment.');
const root=String.raw`C:\src\aspnetcore`;
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const commands=[],sources=[];
for(const file of [
    String.raw`src\Shared\runtime\Http3\Http3StreamType.cs`,
    String.raw`src\Servers\Kestrel\shared\test\TestServiceContext.cs`,
    String.raw`docs\WebTransport.md`
]){
    const bytesByKind={};
    for(const [kind,commit] of [['baseline-canonical',scope.baseline],['current-default-canonical',scope.currentDefault]]){
        const args=['show',commit+':'+file.replaceAll('\\','/')];
        const result=spawnSync('git',args,{cwd:root,encoding:null,maxBuffer:8*1024*1024,windowsHide:true});
        commands.push({entryPoint:'git',arguments:args,actualExitCode:result.status});
        if(result.error||result.status!==0)throw Error('Exact source amendment read failed:'+file);
        const destination=path.join(run,kind,file);
        fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,result.stdout);
        bytesByKind[kind]=result.stdout;
    }
    const working=fs.readFileSync(path.join(root,file));
    const destination=path.join(run,'producer-source',file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,working);
    sources.push({file,baselineSha256:hash(bytesByKind['baseline-canonical']),defaultSha256:hash(bytesByKind['current-default-canonical']),
        workingSha256:hash(working),baselineAndDefaultEquivalent:canonical(bytesByKind['baseline-canonical']).equals(canonical(bytesByKind['current-default-canonical'])),
        workingEqualsBaseline:canonical(working).equals(canonical(bytesByKind['baseline-canonical']))});
}
const file=String.raw`src\Servers\Kestrel\Core\src\Internal\Http3\Http3Stream.cs`;
function neighborhoods(kind){
    const lines=fs.readFileSync(path.join(run,kind,file),'utf8').replaceAll('\r\n','\n').split('\n');
    return lines.flatMap((line,index)=>line.includes('_context.WebTransportSession?.OnClientConnectionClosed();')?
        [{sourceLine:index+1,source:lines.slice(Math.max(0,index-9),index+10).join('\n')}]:[]);
}
const baseline=neighborhoods('baseline-canonical'),current=neighborhoods('current-default-canonical');
if(baseline.length!==2||current.length!==2||baseline.some((item,index)=>item.source!==current[index].source))throw Error('Both selected HTTP/3 cleanup neighborhoods must be exactly unchanged.');
const args=['--no-pager','diff',scope.baseline,scope.currentDefault,'--',file.replaceAll('\\','/')];
const diff=spawnSync('git',args,{cwd:root,encoding:null,maxBuffer:8*1024*1024,windowsHide:true});
commands.push({entryPoint:'git',arguments:args,actualExitCode:diff.status});
if(diff.error||diff.status!==0)throw Error('Actual producer diff capture failed.');
fs.writeFileSync(path.join(run,'investigation','http3-stream-current-default.diff'),diff.stdout);
fs.writeFileSync(output,JSON.stringify({candidate:'F001',commands,additionalSources:sources,selectedCleanupNeighborhoods:{baseline,current,exactlyEqual:true},
    initialScopedSourceFiles:18,initialDefaultEquivalent:17,totalScopedAndContextSources:21,
    totalDefaultEquivalent:17+sources.filter(x=>x.baselineAndDefaultEquivalent).length,
    currentDefaultFullIntegrationExecuted:false,
    actualProducerDifference:'Current default Http3Stream additionally retains/resets an incoming frame and validates fragments in request paths. Both selected session-cleanup call neighborhoods are byte-equivalent after CRLF canonicalization.',
    preparationCorrection:'Original preparation1 successfully reached actual session construction but failed resolving the enum under an incorrect namespace. Actual frozen shared source declares System.Net.Http.Http3StreamType. Preparation2 fixes that name;removes a redundant missing System.IO.Pipelines reference because net12 provides it;observes real EOF producer completion and records rather than mandates leaf synchronous completion. No expected output,shipping source,existing test,comparison or resource goal changed.',
    originalBuildWarningsPreserved:'Build1 exit0 with two redundant missing-reference warnings;build2 exit0 with zero warnings. Both exact sources and actual preparation1 negative child exit are retained.'
},null,2)+'\n');
console.log(`F001:${21} exact scoped/context source triples,${17+sources.filter(x=>x.baselineAndDefaultEquivalent).length} default-equivalent;both actual cleanup neighborhoods unchanged.`);
