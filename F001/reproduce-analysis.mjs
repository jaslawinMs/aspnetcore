import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root,mode]=process.argv.slice(2);
assert(root&&path.isAbsolute(root)&&(!mode||mode==='--verify'));
const local=relative=>path.join(root,...relative.split(/[\\/]/));
const textAt=file=>fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
const jsonAt=file=>JSON.parse(textAt(file));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const copies=fs.existsSync(local('authoritative-copy-manifest.json'))?jsonAt(local('authoritative-copy-manifest.json')):null;
const mappings=new Map((copies??[]).filter(row=>row.kind.startsWith('run')).map(row=>[row.original.replaceAll('/','\\'),row]));
const equal=(a,b,message='Evidence differs.')=>assert.deepEqual(a,b,message);
const unique=values=>equal(new Set(values).size,values.length);
const near=(a,b)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-12),'Numerical evidence differs.');
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
function file(relative){
    if(!copies)return local(relative);
    const row=mappings.get(relative.replaceAll('/','\\'));assert(row,'Missing authoritative artifact:'+relative);
    return local(row.destination);
}
const text=relative=>textAt(file(relative)),read=relative=>jsonAt(file(relative)),hash=relative=>digest(fs.readFileSync(file(relative)));
function list(relative){
    if(copies)return [...mappings.keys()].filter(name=>name.startsWith(relative+'\\')&&!name.slice(relative.length+1).includes('\\')).sort();
    return fs.readdirSync(local(relative),{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>relative+'\\'+entry.name).sort();
}
if(copies){
    unique(copies.map(row=>row.destination));unique([...mappings.keys()]);
    for(const row of copies)equal([digest(fs.readFileSync(local(row.destination))),fs.statSync(local(row.destination)).size],[row.sha256,row.bytes],row.original);
}
const scope=read('current-source-investigation.json'),context=read('context-amendment.json');
equal([scope.baseline,scope.currentDefault,scope.sources.length,scope.currentDefaultEquivalentFiles],
    ['37e809ead5824bc753a1c3d56f11615bdb1296c5','49147673007a4b1d676694e2c5f85b83ad76c36f',18,17]);
equal([context.additionalSources.length,context.totalScopedAndContextSources,context.totalDefaultEquivalent,context.selectedCleanupNeighborhoods.exactlyEqual],[3,21,20,true]);
for(const row of [...scope.sources,...context.additionalSources]){
    const original=fs.readFileSync(file('baseline-canonical\\'+row.file));
    const fresh=fs.readFileSync(file('current-default-canonical\\'+row.file));
    const working=fs.readFileSync(file('producer-source\\'+row.file));
    equal(digest(original),row.baselineSha256);
    equal(digest(fresh),row.currentDefaultSha256??row.defaultSha256);
    equal(digest(working),row.workingSha256);
    equal(canonical(working),canonical(original));
    equal(canonical(fresh).equals(canonical(original)),row.baselineAndDefaultEquivalent);
}
equal(context.selectedCleanupNeighborhoods.baseline.map(row=>row.source),context.selectedCleanupNeighborhoods.current.map(row=>row.source));
for(const [kind,key] of [['baseline-canonical','baseline'],['current-default-canonical','current']]){
    const lines=text(kind+'\\src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Stream.cs').replaceAll('\r\n','\n').split('\n');
    const neighborhoods=lines.flatMap((line,index)=>line.includes('_context.WebTransportSession?.OnClientConnectionClosed();')?
        [{sourceLine:index+1,source:lines.slice(Math.max(0,index-9),index+10).join('\n')}]:[]);
    equal(neighborhoods,context.selectedCleanupNeighborhoods[key]);equal(neighborhoods.length,2);
}
const budget=read('measurement-budget.json'),disposition=read('final-evaluation.json');
equal([budget.maximumComparisons,budget.usedComparisons,budget.sourceShapesMeasured,budget.candidateProfiles,budget.originalDiagnosticProfiles,budget.closed],[3,0,0,0,1,true]);
equal([disposition.disposition,disposition.performancePrJustified,disposition.shippingSourceChanged,disposition.sourceComparisons,
    disposition.liveQuicTransportExecuted,disposition.contendedCancellationRegistrationScheduleExercised],['rejected',false,false,0,false,false]);
const ready=read('original-ready.json');equal(ready.tag,'original-prep2');
const manifest=read(ready.manifest),imageRelative='binaries\\'+ready.tag,sourceRelative='frozen-source\\'+ready.tag;
unique(manifest.files.map(row=>row.file));
const images=new Map(manifest.files.map(row=>[row.file,row]));
if(!copies)for(const row of manifest.files)equal([hash(imageRelative+'\\'+row.file),fs.statSync(file(imageRelative+'\\'+row.file)).size],[row.sha256,row.bytes]);
for(const name of ['Program.cs','ProtocolFixture.cs','SettingsPreservingEmitToolchain.cs','AutoPerf.Benchmarks.csproj'])
    equal(hash('harness\\'+name),hash(sourceRelative+'\\'+name));
const config=read(imageRelative+'\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
equal([config.tfm,config.rollForward,config.framework.name,config.framework.version,config.configProperties['System.GC.Server'],config.configProperties['System.GC.Concurrent']],
    ['net12.0','Disable','Microsoft.NETCore.App','12.0.0-alpha.1.26562.105',true,true]);
assert(text('harness\\Program.cs').includes('.WithPowerPlan(Guid.Empty)'));
assert(!/(?:\.PriorityClass|Thread\.CurrentThread\.Priority|\.ProcessorAffinity)\s*=(?!=)/.test(text('harness\\SettingsPreservingEmitToolchain.cs')));
const tests=read('tests\\original\\test-audit.json');
equal([tests.actualRows,tests.allPassed,tests.skipped,tests.runtimeUniqueTestAndExecutionIds],[17,true,0,17]);
const decode=value=>value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>entity[0]==='#'?
    String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1))):
    ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity.toLowerCase()]);
const attributes=value=>Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
const xml=text('tests\\original\\'+tests.trx);
equal(hash('tests\\original\\'+tests.trx),tests.trxSha256);
const rows=[...xml.matchAll(/<UnitTestResult\s+([^>]+)>/g)].map(match=>attributes(match[1]));
const definitions=[...xml.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({...attributes(match[1]),execution:attributes(match[2].match(/<Execution\s+([^>]+)\/>/)[1]).id}));
const entries=[...xml.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match=>attributes(match[1]));
const discovered=[...text('tests\\original\\'+tests.discoveryLog).matchAll(/^\s+(Microsoft\.AspNetCore\..+)$/gm)].map(match=>match[1].trim());
equal([rows.length,definitions.length,entries.length,discovered.length,new Set(discovered).size],[17,17,17,17,16]);
unique(rows.map(row=>row.testId));unique(rows.map(row=>row.executionId));
equal(discovered.sort(),definitions.map(row=>row.name).sort());
for(const row of rows){
    equal(row.outcome,'Passed');assert(Number(row.duration.split(':').at(-1))>0);
    const definition=definitions.filter(item=>item.id===row.testId),entry=entries.filter(item=>item.testId===row.testId&&item.executionId===row.executionId);
    equal([definition.length,entry.length,definition[0].name,definition[0].execution],[1,1,row.testName,row.executionId]);
    assert(tests.rows.some(item=>item.testId===row.testId&&item.executionId===row.executionId&&item.testName===row.testName&&item.outcome==='Passed'));
}
for(const [name,count] of Object.entries(tests.classRows))equal(rows.filter(row=>row.testName.includes('.'+name+'.')).length,count);
for(const name of ['Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.Http.Features','InMemory.FunctionalTests'])
    for(const extension of ['.dll','.pdb'])equal(images.get(name+extension)?.sha256,tests.capturedFlatTestAndOwnerImage.find(row=>row.file===name+extension)?.sha256);
const pdb=read('pdb\\original\\document-audit.json');equal([pdb.verifiedDocuments,pdb.rows.length],[19,19]);
for(const row of pdb.rows){
    const relative=row.owner==='AutoPerf.Benchmarks'?sourceRelative+'\\'+path.win32.basename(row.source):'producer-source\\'+row.source;
    const actualHash=hash(relative);
    equal([row.sourceSha256,row.actual.verified,row.actual.source_sha256,row.actual.actual_pdb_document_sha256],[actualHash,true,actualHash,actualHash]);
    equal(row.pdbSha256,images.get(row.owner+'.pdb')?.sha256);
}
equal(read('tests\\original\\discovery-checker-failure.json').owningTestCommandInvokedBeforeFailure,false);
equal(read('development\\original-prep1\\execution.json').actualExitCode,-532462766);
assert(text('development\\original-prep1\\console.log').includes('System.TypeLoadException'));
equal(read('development\\original-prep2\\execution.json').actualExitCode,0);
for(const attempt of [1,2])equal(read(`build\\attempt${attempt}\\execution.json`).actualExitCode,0);
assert(text('build\\attempt1\\console.log').includes('2 Warning(s)'));
assert(text('build\\attempt2\\console.log').includes('0 Warning(s)'));
function streamState(stream,closed,output=false){
    equal(stream.concreteType,'Microsoft.AspNetCore.Server.Kestrel.Core.Internal.WebTransport.WebTransportStream');
    equal([stream.canRead,stream.canWrite,stream.connectionClosedCanBeCanceled],[!closed&&!output,!closed&&output,false]);
    assert(stream.inputType.startsWith('Microsoft.AspNetCore.Connections.CompletionPipeReader, InMemory.FunctionalTests,'));
    assert(stream.outputType.startsWith('Microsoft.AspNetCore.Connections.CompletionPipeWriter, InMemory.FunctionalTests,'));
    equal([stream.inputCompleted,stream.outputCompleted],[closed&&!output,closed&&output]);
}
function snapshot(value,count,closed){
    equal([value.openStreams,value.registeredSessions,value.pendingAcceptCompleted,value.streams.length],[closed?0:count,closed?0:1,closed,count]);
    value.streams.forEach(stream=>streamState(stream,closed));
}
const controls=list('characterization\\original-prep2\\states').filter(name=>name.endsWith('.json')).map(read);
equal(controls.map(row=>row.kind),['process','protocol-eof','protocol-eof','protocol-eof','actual-input-leaf-disposal','actual-output-leaf-disposal','public-abort-control']);
unique(controls.map(row=>row.sequence));equal(new Set(controls.map(row=>row.pid)).size,1);
for(const count of [0,1,16]){
    const row=controls.find(row=>row.kind==='protocol-eof'&&row.value.streams===count);assert(row);
    snapshot(row.value.before,count,false);snapshot(row.value.after,count,true);
}
const input=controls.find(row=>row.kind==='actual-input-leaf-disposal').value;
equal(input.completedSynchronously,true);snapshot(input.before,1,false);
equal([input.after.openStreams,input.after.registeredSessions,input.after.pendingAcceptCompleted],[1,1,false]);
streamState(input.after.streams[0],true);
const output=controls.find(row=>row.kind==='actual-output-leaf-disposal').value;
equal(output.completedSynchronously,true);equal([output.after.openStreams,output.after.registeredSessions,output.after.pendingAcceptCompleted],[1,1,false]);
equal(output.after.streams.length,1);streamState(output.after.streams[0],true,true);
snapshot(controls.find(row=>row.kind==='public-abort-control').value,1,true);
const measurement='measurements\\original-diagnostic-only',execution=read(measurement+'\\execution.json');
equal([execution.actualExitCode,execution.originalOnly,execution.sourceChanged,execution.sourceComparisons,execution.candidateProfiles],[0,true,false,0,0]);
const stateRoot=measurement+'\\states',states=list(stateRoot).filter(name=>name.endsWith('.json')).map(read);
unique(states.map(row=>row.sequence));equal(new Set(states.map(row=>row.pid)).size,1);
const setups=states.filter(row=>row.kind==='prepared-close'),closes=states.filter(row=>row.kind==='closed-before-cleanup');
equal([setups.length,closes.length],[36,36]);
for(const count of [0,1,16]){
    equal([setups.filter(row=>row.value.Streams===count).length,closes.filter(row=>row.value.Streams===count).length],[12,12]);
    for(const row of setups.filter(row=>row.value.Streams===count)){
        snapshot(row.value.snapshot,count,false);
        const close=closes.find(item=>item.sequence===row.sequence+1);assert(close);equal(close.value.Streams,count);snapshot(close.value.snapshot,count,true);
        equal(row.value.identities.length,7);
        for(const identity of row.value.identities){
            const name=path.win32.basename(identity.path),image=images.get(name);
            if(image)equal(identity.sha256,image.sha256);
            else{
                assert(['System.IO.Pipelines.dll','System.Private.CoreLib.dll'].includes(name));
                assert(identity.path.includes('\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26562.105\\'));
                if(!copies)equal(digest(fs.readFileSync(identity.path)),identity.sha256);
            }
        }
    }
}
for(const kind of ['settings-before','settings-after']){
    const settings=states.filter(row=>row.kind===kind);equal(settings.length,3);
    for(const row of settings)equal(row.value,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});
}
equal(states.filter(row=>row.kind==='original-only-completed').map(row=>row.value),[{outcomes:3,sourceComparisons:0,optimizationGainEstablished:false}]);
const log=text(measurement+'\\console.log');
const parts=log.split('// Benchmark: SessionCloseBenchmark.CloseSession:').slice(1);equal(parts.length,3);
const reportRelative=list(stateRoot+'\\artifacts\\results').filter(name=>/-report-full.*\.json$/.test(name));equal(reportRelative.length,1);
const report=read(reportRelative[0]);equal(report.Benchmarks.length,3);
const percentile=(sorted,p)=>{const rank=(sorted.length-1)*p/100,lower=Math.floor(rank),upper=Math.ceil(rank);return sorted[lower]+(sorted[upper]-sorted[lower])*(rank-lower);};
const outcomes=[];
for(const count of [0,1,16]){
    const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Streams=${count}]`));assert(part);
    assert(part.includes('RunStrategy=Monitoring')&&part.includes('OutlierMode=DontRemove')&&part.includes('InvocationCount=1'));
    function raw(kind){return [...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))].map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));}
    const warmups=raw('WorkloadWarmup'),actual=raw('WorkloadActual'),retained=raw('WorkloadResult');
    equal([warmups.length,actual.length,retained.length],[3,8,8]);equal(actual,retained);
    assert(!/^Overhead(?:Actual|Warmup)/m.test(part));
    const benchmark=report.Benchmarks.find(row=>row.FullName===`AutoPerf.SessionCloseBenchmark.CloseSession(Streams: ${count})`);assert(benchmark);
    equal(benchmark.Measurements.map(row=>[row.IterationMode,row.IterationStage,row.IterationIndex,row.Operations,row.Nanoseconds]),
        retained.map(row=>['Workload','Result',row.index,1,row.ns]));
    const values=retained.map(row=>row.ns),mean=values.reduce((sum,value)=>sum+value,0)/8;
    const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/7,sd=Math.sqrt(variance),sorted=[...values].sort((a,b)=>a-b),statistics=benchmark.Statistics;
    equal(statistics.N,8);equal([...statistics.OriginalValues].sort((a,b)=>a-b),sorted);
    for(const [name,value] of Object.entries({Mean:mean,Variance:variance,StandardDeviation:sd,StandardError:sd/Math.sqrt(8),Min:sorted[0],Max:sorted.at(-1),Q1:percentile(sorted,25),Median:percentile(sorted,50),Q3:percentile(sorted,75)}))near(statistics[name],value);
    for(const [name,value] of Object.entries(statistics.Percentiles))near(value,percentile(sorted,Number(name.slice(1))));
    near(statistics.ConfidenceInterval.Lower,mean-statistics.ConfidenceInterval.Margin);near(statistics.ConfidenceInterval.Upper,mean+statistics.ConfidenceInterval.Margin);
    const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
    equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.BytesAllocatedPerOperation,benchmark.Memory.TotalOperations],gc.slice(1).map(Number));
    equal(benchmark.Memory.TotalOperations,1);
    outcomes.push({streams:count,meanNs:mean,sdNs:sd,cvPercent:100*sd/mean,allocatedProcessBytes:benchmark.Memory.BytesAllocatedPerOperation,
        retainedSamples:values,warmupSamplesNs:warmups.map(row=>row.ns),reportedCi99_9LowerNs:statistics.ConfidenceInterval.Lower,reportedCi99_9UpperNs:statistics.ConfidenceInterval.Upper});
}
const result={
    candidate:'F001',disposition:'rejected',specificDisposition:disposition.specificDisposition,performancePrJustified:false,sourceChanged:false,
    scopedSourceTriples:21,currentDefaultEquivalentFiles:20,selectedUnchangedCleanupNeighborhoods:2,fullCurrentDefaultIntegrationExecuted:false,
    originalDiagnosticProfiles:1,candidateProfiles:0,sourceComparisons:0,changedSourceShapes:0,
    benchmarkOutcomes:3,retainedResults:24,actualWarmups:9,actualOverheadSamples:0,preparedOwningFixtures:36,validatedClosedFixtures:36,
    capturedSettingsRecords:6,exactOwningTestRows:17,owningTestSkips:0,distinctDiscoveryDisplayNames:16,uniqueTestAndExecutionIds:17,
    sourcePdbDocumentChecks:19,activeProducerControlRows:6,actualInputAndOutputLeafDisposalsCompletedSynchronously:2,
    activeImageFiles:manifest.files.length,originalPreparationFailurePreserved:true,failedDisplayUniquenessCheckerPreserved:true,
    liveQuicOrContendedStreamCancellationRegistrationExercised:false,fullTruncatedDisplayToSourceDataReconstructionClaimed:false,
    allPublicCopyMappingsVerified:copies?.length??null,omittedBinaryRuntimeBytesRehashedInPublicAudit:false,
    confidenceCriticalValuesIndependentlyComputed:false,maximumCvPercent:Math.max(...outcomes.map(row=>row.cvPercent)),outcomes
};
if(mode!=='--verify')fs.writeFileSync(local('measurement-audit.json'),JSON.stringify(result,null,2)+'\n');
else{
    const recorded=read('measurement-audit.json');
    delete result.allPublicCopyMappingsVerified;delete recorded.allPublicCopyMappingsVerified;equal(result,recorded);
}
console.log(`F001:3 original-only outcomes/24 retained/9 warmups/36 prepared+36 closed fixtures/17 exact test rows/19 PDB documents verified;0 source comparisons,rejected unestablished/design-blocked proposal.${copies?' Public copies verified;omitted binaries/runtime not rehashed.':' Live frozen image/runtime identities rehashed.'}`);
