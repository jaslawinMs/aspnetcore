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
    ['37e809ead5824bc753a1c3d56f11615bdb1296c5','49147673007a4b1d676694e2c5f85b83ad76c36f',26,25]);
equal([context.additionalSources.length,context.totalScopedSources,context.totalDefaultEquivalent],[2,28,27]);
const sourceRows=[...scope.sources,...context.additionalSources];unique(sourceRows.map(row=>row.file));
for(const row of sourceRows){
    const original=fs.readFileSync(file('baseline-canonical\\'+row.file));
    const fresh=fs.readFileSync(file('current-default-canonical\\'+row.file));
    const working=fs.readFileSync(file('producer-source\\'+row.file));
    equal(digest(original),row.baselineSha256);equal(digest(fresh),row.currentDefaultSha256);equal(digest(working),row.workingSha256);
    equal(canonical(working),canonical(original));equal(canonical(fresh).equals(canonical(original)),row.baselineAndDefaultEquivalent);
}
equal(sourceRows.filter(row=>!row.baselineAndDefaultEquivalent).map(row=>row.file),['src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Stream.cs']);
const neighborhoods=kind=>text(kind+'\\src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Stream.cs').replaceAll('\r\n','\n').split('\n')
    .flatMap((line,index,lines)=>line.includes('_context.WebTransportSession?.OnClientConnectionClosed();')?[lines.slice(Math.max(0,index-9),index+10).join('\n')]:[]);
equal(neighborhoods('baseline-canonical'),neighborhoods('current-default-canonical'));equal(neighborhoods('baseline-canonical').length,2);
const budget=read('measurement-budget.json'),disposition=read('final-evaluation.json');
equal([budget.maximumComparisons,budget.usedComparisons,budget.sourceShapesMeasured,budget.candidateProfiles,budget.originalDiagnosticProfiles,budget.closed],[3,0,0,0,1,true]);
equal([disposition.disposition,disposition.performancePrJustified,disposition.shippingSourceChanged,disposition.sourceComparisons,
    disposition.actualNativeQuicProducerExecuted,disposition.contendedCancellationRegistrationScheduleExercised,
    disposition.fullNetworkHttp3Executed,disposition.incompleteDisposalOrBlockingLatencyEstablished],['rejected',false,false,0,true,false,false,false]);
const ready=read('original-ready.json');equal(ready.tag,'original-prep6');
const manifest=read(ready.manifest),imageRelative='binaries\\'+ready.tag,sourceRelative='frozen-source\\'+ready.tag;
unique(manifest.files.map(row=>row.file));equal(manifest.files.length,151);
const images=new Map(manifest.files.map(row=>[row.file,row]));
if(!copies)for(const row of manifest.files)equal([hash(imageRelative+'\\'+row.file),fs.statSync(file(imageRelative+'\\'+row.file)).size],[row.sha256,row.bytes]);
for(const name of ['Program.cs','ProtocolFixture.cs','SettingsPreservingEmitToolchain.cs','NativeQuicProbe.cs','AutoPerf.Benchmarks.csproj'])
    equal(hash('harness\\'+name),hash(sourceRelative+'\\'+name));
const config=read(imageRelative+'\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
equal([config.tfm,config.rollForward,config.framework.name,config.framework.version,config.configProperties['System.GC.Server'],config.configProperties['System.GC.Concurrent']],
    ['net12.0','Disable','Microsoft.NETCore.App','12.0.0-alpha.1.26562.105',true,true]);
assert(text('harness\\Program.cs').includes('.WithPowerPlan(Guid.Empty)'));
assert(!/(?:\.PriorityClass|Thread\.CurrentThread\.Priority|\.ProcessorAffinity)\s*=(?!=)/.test(text('harness\\SettingsPreservingEmitToolchain.cs')));
const base=read('base-image-ready.json'),tests=read('tests\\borrowed-F001\\test-audit.json'),testRoot='tests\\borrowed-F001\\';
equal([base.borrowedTestRows,base.newExistingTestExecutions,base.reusedSourceFilesExactlyEqual,base.testImageFiles.length],[17,0,21,97]);
equal([tests.actualRows,tests.allPassed,tests.skipped,tests.runtimeUniqueTestAndExecutionIds],[17,true,0,17]);
const decode=value=>value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>entity[0]==='#'?
    String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1))):
    ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity.toLowerCase()]);
const attributes=value=>Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
const xml=text(testRoot+tests.trx);equal(hash(testRoot+tests.trx),tests.trxSha256);equal(tests.trxSha256,base.originalTrxSha256);
const testRows=[...xml.matchAll(/<UnitTestResult\s+([^>]+)>/g)].map(match=>attributes(match[1]));
const definitions=[...xml.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({...attributes(match[1]),execution:attributes(match[2].match(/<Execution\s+([^>]+)\/>/)[1]).id}));
const entries=[...xml.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match=>attributes(match[1]));
const discovered=[...text(testRoot+tests.discoveryLog).matchAll(/^\s+(Microsoft\.AspNetCore\..+)$/gm)].map(match=>match[1].trim());
equal([testRows.length,definitions.length,entries.length,discovered.length,new Set(discovered).size],[17,17,17,17,16]);
unique(testRows.map(row=>row.testId));unique(testRows.map(row=>row.executionId));equal(discovered.sort(),definitions.map(row=>row.name).sort());
for(const row of testRows){
    equal(row.outcome,'Passed');assert(Number(row.duration.split(':').at(-1))>0);
    const definition=definitions.filter(item=>item.id===row.testId),entry=entries.filter(item=>item.testId===row.testId&&item.executionId===row.executionId);
    equal([definition.length,entry.length,definition[0].name,definition[0].execution],[1,1,row.testName,row.executionId]);
    assert(tests.rows.some(item=>item.testId===row.testId&&item.executionId===row.executionId&&item.testName===row.testName&&item.outcome==='Passed'));
}
for(const [name,count] of Object.entries(tests.classRows))equal(testRows.filter(row=>row.testName.includes('.'+name+'.')).length,count);
for(const name of ['Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.Http.Features','InMemory.FunctionalTests'])
    for(const extension of ['.dll','.pdb'])equal(images.get(name+extension)?.sha256,base.testImageFiles.find(row=>row.file===name+extension)?.sha256);
const quicBinaries=base.quicImageFiles.filter(row=>/\.(dll|pdb)$/.test(row.file));equal(quicBinaries.length,2);
for(const row of quicBinaries)equal(images.get(row.file)?.sha256,row.sha256);
const pdb=read('pdb\\original\\document-audit.json');
equal([pdb.verifiedDocuments,pdb.rows.length,pdb.borrowedF001OwnerWitnesses,pdb.freshF002BaseWitnesses,pdb.freshF002FinalWitnesses],[26,26,16,2,8]);
for(const row of pdb.rows){
    const relative=row.owner==='AutoPerf.Benchmarks'?sourceRelative+'\\'+path.win32.basename(row.source):'producer-source\\'+row.source,actualHash=hash(relative);
    equal([row.sourceSha256,row.actual.verified,row.actual.source_sha256,row.actual.actual_pdb_document_sha256],[actualHash,true,actualHash,actualHash]);
    equal(row.pdbSha256,images.get(row.owner+'.pdb')?.sha256);
}
equal(read('build\\attempt1\\execution.json').actualExitCode,1);assert(text('build\\attempt1\\console.log').includes('CS0122'));
for(const attempt of [2,3,4,5,6]){
    equal(read(`build\\attempt${attempt}\\execution.json`).actualExitCode,0);assert(text(`build\\attempt${attempt}\\console.log`).includes('0 Warning(s)'));
    const outcome=read(`native-quic\\attempt${attempt}\\execution.json`).actualExitCode;
    if(attempt===6)equal(outcome,0);else assert(outcome!==0&&outcome!==2);
    const frozen=read(`manifest-original-prep${attempt}.json`),build=read(`build\\attempt${attempt}\\execution.json`);
    equal([frozen.files.length,frozen.buildAttempt],[151,attempt]);
    for(const row of build.sources)equal(hash(`frozen-source\\original-prep${attempt}\\${row.file}`),row.sha256);
}
for(const attempt of [2,3,4])assert(text(`native-quic\\attempt${attempt}\\console.log`).includes('UserCanceled'));
const events=relative=>list(relative).filter(name=>name.endsWith('.json')).map(read);
const failedNative=events('native-quic\\attempt4\\states');
assert(failedNative.some(row=>row.kind==='native-log'&&row.value.exception?.includes('platform does not support ephemeral keys')));
assert(text('native-quic\\attempt5\\console.log').includes('Required IConnectionHeartbeatFeature'));
const scenarios=['Missing','InputOne','InputSixteen','OutputOne'],countFor=name=>({Missing:0,InputOne:1,InputSixteen:16,OutputOne:1})[name];
function streamState(stream,closed,{output=false,native=false}={}){
    equal(stream.concreteType,'Microsoft.AspNetCore.Server.Kestrel.Core.Internal.WebTransport.WebTransportStream');
    equal([stream.canRead,stream.canWrite,stream.connectionClosedCanBeCanceled],[!closed&&!output,!closed&&output,native]);
    const owner=native?'Microsoft.AspNetCore.Server.Kestrel.Transport.Quic':'InMemory.FunctionalTests';
    assert(stream.inputType.startsWith('Microsoft.AspNetCore.Connections.CompletionPipeReader, '+owner+','));
    assert(stream.outputType.startsWith('Microsoft.AspNetCore.Connections.CompletionPipeWriter, '+owner+','));
    equal([stream.inputCompleted,stream.outputCompleted],[closed&&!output,closed&&output]);
}
function snapshot(value,scenario,{target=null,removed=false,closed=false,native=false}={}){
    const count=native?1:countFor(scenario);assert(Number.isInteger(count));
    equal([value.openStreams,value.registeredSessions,value.pendingAcceptCompleted,value.streams.length],[closed?0:count-(removed?1:0),closed?0:1,closed,count]);
    unique(value.streams.map(stream=>stream.streamId));
    if(removed)assert(value.streams.some(stream=>stream.streamId===target));
    value.streams.forEach(stream=>streamState(stream,closed||(removed&&stream.streamId===target),{output:scenario==='OutputOne',native}));
}
const controls=events('characterization\\original-prep6\\states');
equal(controls.map(row=>row.kind),['process','component-removal','component-removal','component-removal','component-removal','public-abort-control']);
unique(controls.map(row=>row.sequence));equal(new Set(controls.map(row=>row.pid)).size,1);
equal(controls.filter(row=>row.kind==='component-removal').map(row=>row.value.scenario),scenarios);
for(const row of controls.filter(row=>row.kind==='component-removal')){
    const value=row.value,removed=value.scenario!=='Missing';equal([value.actual,value.actualTransportCancellationCallbackExercised],[removed,false]);
    snapshot(value.before,value.scenario);snapshot(value.after,value.scenario,{target:value.target,removed});snapshot(value.afterRealConnectEof,value.scenario,{closed:true});
}
snapshot(controls.find(row=>row.kind==='public-abort-control').value,'InputOne',{closed:true});
const native=events('native-quic\\attempt6\\states');unique(native.map(row=>row.sequence));equal(new Set(native.map(row=>row.pid)).size,1);
const nativeBefore=native.filter(row=>row.kind==='native-associated-before-fin'),nativeAfter=native.filter(row=>row.kind==='native-fin-automatically-removed');
equal([nativeBefore.length,nativeAfter.length],[1,1]);assert(nativeBefore[0].sequence<nativeAfter[0].sequence);
const nb=nativeBefore[0].value,na=nativeAfter[0].value;equal([nb.target,na.target,nb.parentIsInMemoryHttp3,nb.nativePeerIsLoopback],[6,6,true,true]);
snapshot(nb.before,'InputOne',{native:true});snapshot(na.afterAutomaticRemoval,'InputOne',{target:6,removed:true,native:true});
equal([na.automaticRemovalAssertedBeforeAnyDirectTryRemoveCall,na.nativeProcessingTaskCompleted,na.actualNativeCancellationObserved,
    na.heartbeatRegistrations,na.heartbeatAndPoolExpiryCallbacksNotDrivenByProbe,na.fullNetworkHttp3OrContendedRegistrationProofClaimed],[true,true,true,1,true,false]);
equal(native.filter(row=>row.kind==='native-handshake-outcome').map(row=>row.value),[{client:'RanToCompletion',server:'RanToCompletion',clientException:null,serverException:null}]);
assert(native.some(row=>row.kind==='native-listener-bound'&&row.value.certificateHasPrivateKey&&row.value.existingOwningCertificateImportHelper.endsWith('.GetTestCertificate')));
equal(na.nativeModules.length,1);equal(na.nativeModules[0].ModuleName,'msquic.dll');
if(!copies)equal(digest(fs.readFileSync(na.nativeModules[0].FileName)),na.nativeModules[0].sha256);
const nativeCode=text(sourceRelative+'\\NativeQuicProbe.cs');
const positions=['await fixture.AssociateRealTransportStreamAsync(incoming);','await outgoing.WriteAsync(ReadOnlyMemory<byte>.Empty, completeWrites: true)',
    'await ProcessingTask(incoming)','fixture.AssertRemoval(outgoing.Id','fixture.Remove(outgoing.Id)'].map(needle=>nativeCode.indexOf(needle));
assert(positions.every((value,index)=>value>=0&&(index===0||value>positions[index-1])));
function identities(rows){
    for(const identity of rows){
        const name=path.win32.basename(identity.path),image=images.get(name);
        if(image)equal(identity.sha256,image.sha256);
        else{
            assert(['System.IO.Pipelines.dll','System.Private.CoreLib.dll','System.Net.Quic.dll'].includes(name));
            assert(identity.path.includes('\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26562.105\\'));
            if(!copies)equal(digest(fs.readFileSync(identity.path)),identity.sha256);
        }
    }
}
identities([...nb.identities,nb.nativeTransport,nb.systemQuic]);
const measurement='measurements\\original-diagnostic-only',execution=read(measurement+'\\execution.json');
equal([execution.actualExitCode,execution.originalOnly,execution.sourceChanged,execution.sourceComparisons,execution.candidateProfiles],[0,true,false,0,0]);
const stateRoot=measurement+'\\states',states=events(stateRoot);unique(states.map(row=>row.sequence));equal(new Set(states.map(row=>row.pid)).size,1);
const setups=states.filter(row=>row.kind==='prepared-removal'),removals=states.filter(row=>row.kind==='removed-before-cleanup');
equal([setups.length,removals.length],[48,48]);
for(const scenario of scenarios){
    equal([setups.filter(row=>row.value.scenario===scenario).length,removals.filter(row=>row.value.scenario===scenario).length],[12,12]);
    for(const row of setups.filter(row=>row.value.scenario===scenario)){
        snapshot(row.value.snapshot,scenario);const removal=removals.find(item=>item.sequence===row.sequence+1);assert(removal);
        equal([removal.value.scenario,removal.value.target,removal.value.actual],[scenario,row.value.target,scenario!=='Missing']);
        snapshot(removal.value.snapshot,scenario,{target:row.value.target,removed:scenario!=='Missing'});equal(row.value.identities.length,7);identities(row.value.identities);
    }
}
for(const kind of ['settings-before','settings-after']){
    const settings=states.filter(row=>row.kind===kind);equal(settings.length,4);
    for(const row of settings)equal(row.value,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});
}
equal(states.filter(row=>row.kind==='original-only-completed').map(row=>row.value),[{outcomes:4,sourceComparisons:0,optimizationGainEstablished:false}]);
const log=text(measurement+'\\console.log'),parts=log.split('// Benchmark: StreamRemovalBenchmark.TryRemoveStream:').slice(1);equal(parts.length,4);
const reportRelative=list(stateRoot+'\\artifacts\\results').filter(name=>/-report-full.*\.json$/.test(name));equal(reportRelative.length,1);
const report=read(reportRelative[0]);equal(report.Benchmarks.length,4);
const percentile=(sorted,p)=>{const rank=(sorted.length-1)*p/100,lower=Math.floor(rank),upper=Math.ceil(rank);return sorted[lower]+(sorted[upper]-sorted[lower])*(rank-lower);};
const outcomes=[];
for(const scenario of scenarios){
    const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Scenario=${scenario}]`));assert(part);
    assert(part.includes('RunStrategy=Monitoring')&&part.includes('OutlierMode=DontRemove')&&part.includes('InvocationCount=1'));
    function raw(kind){return [...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))].map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));}
    const warmups=raw('WorkloadWarmup'),actual=raw('WorkloadActual'),retained=raw('WorkloadResult');
    equal([warmups.length,actual.length,retained.length],[3,8,8]);equal(actual,retained);assert(!/^Overhead(?:Actual|Warmup)/m.test(part));
    const benchmark=report.Benchmarks.find(row=>row.FullName===`AutoPerf.StreamRemovalBenchmark.TryRemoveStream(Scenario: ${scenario})`);assert(benchmark);
    equal(benchmark.Measurements.map(row=>[row.IterationMode,row.IterationStage,row.IterationIndex,row.Operations,row.Nanoseconds]),retained.map(row=>['Workload','Result',row.index,1,row.ns]));
    const values=retained.map(row=>row.ns),mean=values.reduce((sum,value)=>sum+value,0)/8;
    const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/7,sd=Math.sqrt(variance),sorted=[...values].sort((a,b)=>a-b),statistics=benchmark.Statistics;
    equal(statistics.N,8);equal([...statistics.OriginalValues].sort((a,b)=>a-b),sorted);
    for(const [name,value] of Object.entries({Mean:mean,Variance:variance,StandardDeviation:sd,StandardError:sd/Math.sqrt(8),Min:sorted[0],Max:sorted.at(-1),Q1:percentile(sorted,25),Median:percentile(sorted,50),Q3:percentile(sorted,75)}))near(statistics[name],value);
    for(const [name,value] of Object.entries(statistics.Percentiles))near(value,percentile(sorted,Number(name.slice(1))));
    near(statistics.ConfidenceInterval.Lower,mean-statistics.ConfidenceInterval.Margin);near(statistics.ConfidenceInterval.Upper,mean+statistics.ConfidenceInterval.Margin);
    const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
    equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.BytesAllocatedPerOperation,benchmark.Memory.TotalOperations],gc.slice(1).map(Number));equal(benchmark.Memory.TotalOperations,1);
    outcomes.push({scenario,meanNs:mean,sdNs:sd,cvPercent:100*sd/mean,allocatedProcessBytes:benchmark.Memory.BytesAllocatedPerOperation,
        retainedSamples:values,warmupSamplesNs:warmups.map(row=>row.ns),reportedCi99_9LowerNs:statistics.ConfidenceInterval.Lower,reportedCi99_9UpperNs:statistics.ConfidenceInterval.Upper});
}
const memory=read('investigation\\bdn-memory-accounting\\provenance.json');
equal(memory.f002_measured_bdn_dll_sha256,images.get('BenchmarkDotNet.dll').sha256);equal(hash('investigation\\bdn-memory-accounting\\GcStats.cs'),memory.source_sha256);
equal(memory.source_fetch_rerun_for_f002,false);
const result={
    candidate:'F002',disposition:'rejected',specificDisposition:disposition.specificDisposition,performancePrJustified:false,sourceChanged:false,
    scopedSourceTriples:28,currentDefaultEquivalentFiles:27,selectedEqualCleanupNeighborhoods:2,fullCurrentDefaultIntegrationExecuted:false,
    originalDiagnosticProfiles:1,candidateProfiles:0,sourceComparisons:0,changedSourceShapes:0,
    benchmarkOutcomes:4,retainedResults:32,actualWarmups:12,actualOverheadSamples:0,preparedOwningFixtures:48,validatedRemovedFixtures:48,capturedSettingsRecords:8,
    borrowedOwningTestRows:17,newExistingTestExecutions:0,owningTestSkips:0,distinctDiscoveryDisplayNames:16,uniqueTestAndExecutionIds:17,
    sourcePdbDocumentChecks:26,borrowedF001PdbWitnesses:16,freshF002PdbWitnesses:10,componentControlRows:5,actualNativeFinControlRows:1,
    nativeFinAutomaticallyRemovedBeforeDirectInvocation:true,nativeModuleRecords:1,actualCancellableNativeTokensObserved:true,
    fullNetworkHttp3OrContendedRegistrationProofClaimed:false,heartbeatAndPoolExpiryCallbacksDriven:false,activeImageFiles:151,
    originalBuildAttempts:6,failedBuildAttempts:1,actualNativePreparationAttempts:5,failedNativePreparationAttempts:4,preparationFailuresPreserved:true,
    sourcePdbChecksAreNotPeBindingOrMethodCoverage:true,fullTruncatedDisplayToSourceDataReconstructionClaimed:false,
    allPublicCopyMappingsVerified:copies?.length??null,omittedBinaryRuntimeBytesRehashedInPublicAudit:false,
    confidenceCriticalValuesIndependentlyComputed:false,maximumCvPercent:Math.max(...outcomes.map(row=>row.cvPercent)),outcomes
};
if(mode!=='--verify')fs.writeFileSync(local('measurement-audit.json'),JSON.stringify(result,null,2)+'\n');
else{
    const recorded=read('measurement-audit.json');delete result.allPublicCopyMappingsVerified;delete recorded.allPublicCopyMappingsVerified;equal(result,recorded);
}
console.log(`F002:4 original-only outcomes/32 retained/12 warmups/48 prepared+48 checked removals/17 borrowed test rows/26 PDB witnesses/actual native FIN verified;0 source comparisons,rejected unestablished local optimization.${copies?' Public copies verified;omitted binaries/runtime not rehashed.':' Live frozen image/captured runtime/native identities rehashed.'}`);
