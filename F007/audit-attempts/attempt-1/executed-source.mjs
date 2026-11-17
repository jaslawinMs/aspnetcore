import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F007'):path.resolve(supplied);
const file=relative=>path.join(root,...relative.split(/[\\/]/));
const text=relative=>fs.readFileSync(file(relative),'utf8').replace(/^\uFEFF/,'');
const json=relative=>JSON.parse(text(relative));
const sha=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const canonical=value=>value.replaceAll('\r\n','\n'),basename=value=>value.split(/[\\/]/).at(-1);
const equal=(a,b)=>assert.deepEqual(a,b);
const near=(a,b)=>assert(Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-9),`Numeric mismatch:${a}/${b}`);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const quantile=(values,p)=>{const a=[...values].sort((x,y)=>x-y),index=(a.length-1)*p,lower=Math.floor(index);return a[lower]+(a[Math.ceil(index)]-a[lower])*(index-lower);};
const roundEven=value=>{const lower=Math.floor(value);return value-lower===0.5?lower+(lower%2):Math.round(value);};
const states=relative=>fs.readdirSync(file(relative)).filter(name=>name.endsWith('.json')).sort().map(name=>({name,data:json(relative+'/'+name)}));
const only=(rows,suffix)=>{const found=rows.filter(row=>row.name.endsWith(suffix));equal(found.length,1);return found[0].data;};
const ownerRelative=String.raw`src\Components\Server\src\Circuits\ServerComponentDeserializer.cs`;
const original=canonical(text('frozen-source/original/owner/ServerComponentDeserializer.cs'));
const candidate=canonical(text('frozen-source/candidate-1/owner/ServerComponentDeserializer.cs'));
let expected=original;
for(const[before,after]of[
    ['using System.Buffers;\n',''],
    ['        int[]? seenComponentIdsStorage = null;\n',''],
    ['                : (seenComponentIdsStorage = ArrayPool<int>.Shared.Rent(operations.Length)).AsSpan(0, operations.Length);',
        '                : default;\n            var seenSsrComponentIdSet = operations.Length > 128 ? new HashSet<int>(operations.Length) : null;'],
    ['                if (seenSsrComponentIds[0..currentSsrComponentIdIndex].Contains(operation.SsrComponentId))',
        '                if (seenSsrComponentIdSet is not null\n                    ? !seenSsrComponentIdSet.Add(operation.SsrComponentId)\n                    : seenSsrComponentIds[0..currentSsrComponentIdIndex].Contains(operation.SsrComponentId))'],
    ['                seenSsrComponentIds[currentSsrComponentIdIndex++] = operation.SsrComponentId;',
        '                if (seenSsrComponentIdSet is null)\n                {\n                    seenSsrComponentIds[currentSsrComponentIdIndex++] = operation.SsrComponentId;\n                }'],
    ['        finally\n        {\n            if (seenComponentIdsStorage != null)\n            {\n                ArrayPool<int>.Shared.Return(seenComponentIdsStorage);\n            }\n        }\n','']
]){
    equal(expected.split(before).length,2);expected=expected.replace(before,after);
}
equal(candidate,expected);
const patch=json('source-patch-metadata.json');equal(patch.threshold,128);equal(patch.noApiDependencyVisibilityOrTestChange,true);
equal(sha(fs.readFileSync(file('candidate.patch'))),patch.patchSha256);
for(const[variant,key]of[['original','originalSourceSha256'],['candidate-1','candidateSourceSha256']])
    equal(sha(fs.readFileSync(file(`frozen-source/${variant}/owner/ServerComponentDeserializer.cs`))),patch[key]);
const investigation=json('current-source-investigation.json');equal(investigation.scopedSourceFiles,15);
equal(investigation.currentDefaultEquivalentFiles,15);equal(investigation.wholeDefaultOwnerCanonicalEqual,true);
for(const source of investigation.sources){
    for(const[directory,key]of[['baseline-canonical','baselineSha256'],['current-default-canonical','currentDefaultSha256'],['producer-source','workingSha256']])
        equal(sha(fs.readFileSync(file(directory+'/'+source.file))),source[key]);
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('producer-source/'+source.file)));
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('current-default-canonical/'+source.file)));
}
equal(canonical(text('current-default-canonical/'+ownerRelative)),original);
const reproduction=json('preimplementation-reproduction.json');equal(reproduction.implementationStarted,false);equal(reproduction.measuredComparisons,0);
equal(reproduction.actualDefaultRootLimit,100);equal(reproduction.supplementalDefaultSources.length,5);
for(const source of reproduction.supplementalDefaultSources){
    equal(source.baselineAndDefaultEquivalent,true);
    equal(sha(fs.readFileSync(file('supplemental-current-context/'+source.file))),source.currentSha256);
}
assert(text('investigation/current-build-sdk-context.patch').includes('26565.104'));
let imageFiles=0,sourceFiles=0,testRows=0,pdbBindings=0,pdbDocuments=0,settingsRecords=0,producerRecords=0,validatedRecords=0,timedPreflights=0;
const manifests=new Map();
for(const variant of ['original','candidate-1']){
    const manifest=json('manifest-'+variant+'.json');equal(manifest.files.length,146);equal(manifest.frozenSources.length,26);manifests.set(variant,manifest);
    for(const row of manifest.frozenSources){
        const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);sourceFiles++;
    }
    if(live)for(const row of manifest.files){
        const bytes=fs.readFileSync(file('binaries/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);imageFiles++;
    }
}
const manifestFile=(variant,name)=>{const rows=manifests.get(variant).files.filter(row=>row.relativePath===name);equal(rows.length,1);return rows[0];};
equal(manifests.get('original').files.map(row=>row.relativePath),manifests.get('candidate-1').files.map(row=>row.relativePath));
equal(manifests.get('original').files.filter(row=>row.sha256!==manifestFile('candidate-1',row.relativePath).sha256).map(row=>row.relativePath).sort(),
    ['Microsoft.AspNetCore.Components.Server.dll','Microsoft.AspNetCore.Components.Server.pdb']);
const unescape=value=>value.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attributes=value=>Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match=>[match[1],unescape(match[2])]));
for(const variant of ['original','candidate-1']){
    const sources=['ServerComponentDeserializerTest.cs','ServerComponentDeserializerTest.Unions.cs'];
    const names=sources.flatMap(name=>[...text('tests/'+variant+'/'+name).matchAll(/\[Fact\]\s+public (?:async )?(?:void|Task) (\w+)\(/g)].map(match=>match[1]));
    equal(names.length,33);equal(new Set(names).size,33);
    const audit=json('tests/'+variant+'/actual-test-audit.json'),trx=text('tests/'+variant+'/owning-'+variant+'.trx');
    const results=[...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match=>attributes(match[1]));
    const definitions=[...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({
        ...attributes(match[1]),method:attributes(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),
        execution:attributes(match[2].match(/<Execution\b([^>]*)\/>/)[1])
    }));
    const entries=[...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match=>attributes(match[1]));
    equal([results.length,definitions.length,entries.length],[33,33,33]);equal(new Set(results.map(row=>row.testId)).size,33);
    equal(new Set(results.map(row=>row.executionId)).size,33);const observed=[];
    for(const result of results){
        equal(result.outcome,'Passed');assert(/^\d\d:\d\d:\d\d\.\d+$/.test(result.duration));assert(Number(result.duration.replaceAll(':',''))>0);
        const definition=definitions.filter(row=>row.id===result.testId);equal(definition.length,1);equal(definition[0].execution.id,result.executionId);
        equal(entries.filter(row=>row.testId===result.testId&&row.executionId===result.executionId).length,1);
        assert(definition[0].method.className.split(',')[0].endsWith('.ServerComponentDeserializerTest'));
        assert(names.includes(definition[0].method.name));observed.push(definition[0].method.name);
        const row=audit.rows.filter(row=>row.testId===result.testId);equal(row.length,1);
        equal([row[0].method,row[0].executionId,row[0].duration,row[0].outcome],[definition[0].method.name,result.executionId,result.duration,result.outcome]);testRows++;
    }
    equal(observed.sort(),names.sort());equal([audit.actualTests,audit.passed,audit.failed,audit.skipped],[33,33,0,0]);
    for(let i=0;i<4;i++)equal(audit.binaryHashes[i].sha256,manifestFile(variant,i%2===0?'Microsoft.AspNetCore.Components.Server.dll':'Microsoft.AspNetCore.Components.Server.pdb').sha256);
    assert(json('tests/'+variant+'/execution.json').commands.every(command=>command.actualExitCode===0));
    if(live)for(const[name,key]of[['Microsoft.AspNetCore.Components.Server.Tests.dll','testAssemblySha256'],['Microsoft.AspNetCore.Components.Server.Tests.pdb','testPdbSha256']])
        equal(sha(fs.readFileSync(file('tests/'+variant+'/test-image/'+name))),audit[key]);
}
const runtimes=[];
function witnesses(rows,variant,expectedBindings){
    const records=rows.filter(row=>row.name.includes('-source-pdb-'));equal(records.length,expectedBindings);
    for(const record of records){
        const data=record.data;equal(data.actualPePdbBindingMatched,true);equal(data.codeViewGuid,data.pdbGuid);pdbBindings++;
        const token='-source-pdb-',assembly=record.name.slice(record.name.indexOf(token)+token.length,-5)+'.dll';
        for(const document of data.documents){
            const name=basename(document.source),directory=name.startsWith('ServerComponentDeserializerTest')?'test':
                ['Program.cs','ServerAdapter.cs','BatchSamples.cs','RootBatchBenchmarks.cs','SettingsPreservingEmitToolchain.cs'].includes(name)?'harness':'owner';
            const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+directory+'/'+name));
            const algorithm=document.algorithm.toLowerCase()==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':
                document.algorithm.toLowerCase()==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
            assert(algorithm);equal(sha(bytes,algorithm),document.checksum);equal(sha(bytes),document.sha256);pdbDocuments++;
        }
        const expectedAssembly=assembly.includes('.Tests.dll')?json('tests/'+variant+'/actual-test-audit.json').testAssemblySha256:manifestFile(variant,assembly).sha256;
        equal(data.assemblySha256,expectedAssembly);
        if(live){
            const location=assembly.includes('.Tests.dll')?'tests/'+variant+'/test-image/'+assembly:'binaries/'+variant+'/'+assembly;
            equal(sha(fs.readFileSync(file(location))),data.assemblySha256);equal(sha(fs.readFileSync(file(location.replace(/\.dll$/,'.pdb')))),data.pdbSha256);
        }
    }
    const runtime=only(rows,'-runtime.json');
    equal(runtime.ownerSha256,manifests.get(variant).ownerSha256);equal(runtime.harnessSha256,manifestFile(variant,'AutoPerf.Benchmarks.dll').sha256);
    equal(runtime.serverGc,true);equal(runtime.publicDefaultMaximumRootComponents,100);equal(runtime.sharedMachineNotIsolated,true);
    equal(runtime.initialSettings.processPriority,'Normal');equal(runtime.initialSettings.threadPriority,'Normal');assert(runtime.initialSettings.affinity>0);
    runtimes.push(runtime);return runtime;
}
const malformed=new Map([['MalformedJson','{'],['NullBatch','null'],['MissingOperations','{}'],['NullOperations','{"operations":null}'],
    ['NullOperation','{"operations":[null]}'],['UnknownKind','{"operations":[{"type":"not-an-operation","ssrComponentId":1}]}'],
    ['FractionalId','{"operations":[{"type":"remove","ssrComponentId":1.5}]}'],['OverflowId','{"operations":[{"type":"remove","ssrComponentId":2147483648}]}']]);
const timedHashes=new Map();
function producerProof(data,relative){
    const bytes=fs.readFileSync(file(relative+'/inputs/'+data.Label+'.json'));equal(sha(bytes),data.inputSha256);equal(bytes.length,data.actualJsonBytes);
    equal(data.typedProducer.sameActualOwnerAssembly,true);
    for(const key of ['owner','batch','operation','marker'])assert(data.typedProducer[key].includes(', Microsoft.AspNetCore.Components.Server,'));
    equal(data.ids.length,data.operationCount);equal(data.kinds.length,data.operationCount);
    const seen=new Set();let first=null;
    for(let i=0;i<data.ids.length;i++){if(seen.has(data.ids[i])){first=i;break;}seen.add(data.ids[i]);}
    equal(first,data.firstDuplicateIndex);
    if(malformed.has(data.Label)){equal(bytes.toString('utf8'),malformed.get(data.Label));equal(data.ExpectedSuccess,false);}
    else{
        const wire=JSON.parse(bytes);equal(wire.batchId,71);equal(wire.operations.length,data.operationCount);
        equal(wire.operations.map(row=>row.ssrComponentId),data.ids);
        equal(wire.operations.map(row=>row.type),data.kinds.map(kind=>kind.toLowerCase()));
    }
    if(data.role==='timed-full-owner-global-setup'){
        if(timedHashes.has(data.Label))equal(timedHashes.get(data.Label),data.inputSha256);else timedHashes.set(data.Label,data.inputSha256);
    }
    producerRecords++;return data;
}
function validation(data,producer){
    equal(data.passed,true);equal(data.success,producer.ExpectedSuccess);equal(data.resultNull,!producer.ExpectedSuccess);
    equal(data.DeserializeMarkers,producer.DeserializeMarkers);
    if(data.success){
        equal(data.observation.BatchId,71);equal(data.observation.Operations.length,producer.operationCount);
        data.observation.Operations.forEach((operation,index)=>{
            equal(operation.Id,producer.ids[index]);equal(operation.Kind,producer.kinds[index]);
            equal(operation.HasDescriptor,producer.DeserializeMarkers&&operation.Kind!=='Remove');
        });
    }else equal(data.observation,null);
    if(data.logs!==null){
        equal(data.logs.length,producer.ExpectedLogId===null?0:1);
        if(data.logs.length){
            equal(data.logs[0].Id,producer.ExpectedLogId);equal(data.logs[0].Level,'Debug');
            if(producer.ExpectedLogMessage!==null)equal(data.logs[0].Fields.Message,producer.ExpectedLogMessage);
        }
    }
    if(!data.Label.startsWith('Real'))equal(data.state,{CurrentInvocation:null,ExpiredInvocations:0,SeenSequences:[]});
    validatedRecords++;
}
for(const variant of ['original','candidate-1']){
    const relative='characterization/'+variant+'-attempt2';equal(json(relative+'/execution.json').actualExitCode,0);
    const rows=states(relative+'/states');witnesses(rows,variant,3);
    const producers=rows.filter(row=>row.name.endsWith('-producer.json')).map(row=>producerProof(row.data,relative));equal(producers.length,129);
    const checks=rows.filter(row=>row.name.endsWith('-validated.json'));equal(checks.length,151);
    for(const check of checks){const matching=producers.filter(row=>row.Label===check.data.Label);assert(matching.length);validation(check.data,matching[0]);}
    const setups=rows.filter(row=>row.name.endsWith('-timed-setup-preflight.json'));equal(setups.length,22);
    assert(setups.every(row=>row.data.passed&&row.data.actualTimedWrapperInvokedUntimed));timedPreflights+=setups.length;
    equal(only(rows,'-characterization-completed.json').actualChecks,151);
    const real=label=>{const a=checks.filter(row=>row.data.Label===label);equal(a.length,1);return a[0].data;};
    const initial=real('RealAddUpdateRemove');equal(initial.observation.Operations.length,129);equal(initial.state.SeenSequences,[0,1]);
    for(let i=0;i<2;i++){equal(initial.observation.Operations[i].Component,'AutoPerf.ProbeComponent');equal(initial.observation.Operations[i].Parameters,{Value:40+i});}
    equal(real('RealSequenceReplay').state,initial.state);equal(real('RealNextSequenceSameSsrId').state.SeenSequences,[0,1,2]);
    const advanced=real('RealNextInvocation');assert(advanced.state.CurrentInvocation!==initial.state.CurrentInvocation);
    equal([advanced.state.ExpiredInvocations,advanced.state.SeenSequences],[1,[0]]);equal(real('RealExpiredInvocation').state,advanced.state);
    const consumed=real('RealMarkerConsumedBeforeDuplicate');equal(consumed.state.SeenSequences,[0]);
    equal(producers.find(row=>row.Label==='RealMarkerConsumedBeforeDuplicate').operationCount,130);
    equal(real('RealConsumedAfterBatchFailure').state,consumed.state);
}
const archive='retired-harness/failed-slot-1',failed=json('measurements/comparison-1/execution.json');
equal(failed.commands.length,1);equal(failed.commands[0].variant,'original');assert(failed.commands[0].actualExitCode!==0);
equal(failed.commands[0].manifestSha256,'170F3AA2B992209234E916DBBD5F2217F15AE167112E227F35EBC7AEFD61445B');
equal(sha(fs.readFileSync(file(archive+'/manifest-original.json'))),failed.commands[0].manifestSha256);
assert(!fs.existsSync(file('measurements/comparison-1/candidate-1')));
const failureLog=text('measurements/comparison-1/original/console.log');assert.match(failureLog,/System\.NullReferenceException/);
assert.match(failureLog,/AutoPerf\.ServerAdapter\.Logger/);assert(!/^WorkloadActual\s/m.test(failureLog));
const failureExports=fs.readdirSync(file('measurements/comparison-1/original/results')).filter(name=>name.endsWith('full.json'));equal(failureExports.length,1);
const failureExport=json('measurements/comparison-1/original/results/'+failureExports[0]);equal(failureExport.Benchmarks.length,1);
assert(!failureExport.Benchmarks[0].Statistics);equal((failureExport.Benchmarks[0].Measurements??[]).length,0);
const repair=json(archive+'/repair-completed.json');equal([repair.actualImageFilesPerRole,repair.actualSourceFilesPerRole],[146,26]);
equal(repair.firstSlotSpent,true);equal(repair.all144NonownerFilesIdentical,true);
const stale=json('retired-harness/stale-output-during-repair/stale-owner-proof.json');
equal(stale.actualRetainedCandidateDllSha256,manifests.get('candidate-1').ownerSha256);
equal(stale.actualRequiredOriginalDllSha256,manifests.get('original').ownerSha256);equal(stale.timingSlotsUsed,1);
const analysis=json('analysis.json'),allRows=[],overheadDistribution={};
let actualIterations=0,retainedResults=0,warmups=0,overheads=0;
for(const comparison of [2,3]){
    const execution=json(`measurements/comparison-${comparison}/execution.json`);
    equal(execution.actualOrder,comparison===2?['candidate-1','original']:['original','candidate-1']);equal(execution.commands.length,2);
    for(const variant of ['original','candidate-1']){
        const command=execution.commands.find(value=>value.variant===variant);equal(command.actualExitCode,0);equal(command.imageVariant,variant);
        equal([command.actualPreImageHashesVerified,command.actualPostImageHashesVerified,command.actualPreSourceHashesVerified,command.actualPostSourceHashesVerified],[146,146,26,26]);
        equal(command.originalHarnessDllPdbByteExact,true);equal(command.manifestSha256,sha(fs.readFileSync(file('manifest-'+variant+'.json'))));
        const relative=`measurements/comparison-${comparison}/${variant}`,rows=states(relative+'/states'),runtime=witnesses(rows,variant,2);
        const settings=rows.filter(row=>row.name.endsWith('-settings-before.json')||row.name.endsWith('-settings-after.json'));
        equal(settings.length,44);for(const row of settings){equal(row.data,runtime.initialSettings);settingsRecords++;}
        const setups=rows.filter(row=>row.name.endsWith('-timed-setup-preflight.json'));equal(setups.length,22);
        assert(setups.every(row=>row.data.passed&&row.data.actualTimedWrapperInvokedUntimed));timedPreflights+=setups.length;
        const producers=rows.filter(row=>row.name.endsWith('-producer.json')).map(row=>producerProof(row.data,relative));equal(producers.length,22);
        const checks=rows.filter(row=>row.name.endsWith('-validated.json'));equal(checks.length,22);
        for(const check of checks)validation(check.data,producers.find(row=>row.Label===check.data.Label));
        equal(only(rows,'-completed.json').actualReports,22);
        const exports=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(exports.length,1);
        const data=json(relative+'/results/'+exports[0]);equal(data.Benchmarks.length,22);
        const profile=analysis.profiles.find(row=>row.comparison===comparison&&row.variant===variant);assert(profile);
        equal(sha(fs.readFileSync(file(relative+'/results/'+exports[0]))),profile.fullExportSha256);
        const parts=text(relative+'/console.log').split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,22);
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));equal(Object.keys(parameters),['Shape']);
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}]`));assert(part);
            assert(part.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000')&&part.includes('Toolchain=SettingsPreservingEmitToolchain')
                &&part.includes('IterationTime=100.0000 ms')&&part.includes('RunStrategy=Throughput'));
            const parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const actual=parse('WorkloadActual'),result=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overhead=parse('OverheadActual');
            equal([actual.length,warmup.length],[8,3]);assert(overhead.length>0&&result.length>=5);
            for(const list of [actual,warmup,overhead])equal(list.map(row=>row.index),Array.from({length:list.length},(_,index)=>index+1));
            overheadDistribution[overhead.length]=(overheadDistribution[overhead.length]??0)+1;
            const normalized=result.map(row=>row.ns/row.operations),raw=actual.map(row=>row.ns/row.operations);
            const compensation=quantile(overhead.map(row=>row.ns/row.operations),0.5),remaining=actual.map(row=>row.ns/row.operations-compensation);
            for(const value of normalized){const index=remaining.findIndex(other=>Math.abs(value-other)<0.001);assert(index>=0);remaining.splice(index,1);}
            assert(remaining.every(value=>value>=Math.max(...normalized)-0.001));
            const statistics=benchmark.Statistics;equal(statistics.N,normalized.length);
            equal([...statistics.OriginalValues].sort((a,b)=>a-b),[...normalized].sort((a,b)=>a-b));
            const calculatedMean=mean(normalized),variance=normalized.reduce((sum,value)=>sum+(value-calculatedMean)**2,0)/(normalized.length-1);
            for(const[key,value]of Object.entries({Mean:calculatedMean,Variance:variance,StandardDeviation:Math.sqrt(variance),
                StandardError:Math.sqrt(variance/normalized.length),Min:Math.min(...normalized),Max:Math.max(...normalized),
                Q1:quantile(normalized,0.25),Median:quantile(normalized,0.5),Q3:quantile(normalized,0.75)}))near(statistics[key],value);
            near(statistics.ConfidenceInterval.Lower,statistics.Mean-statistics.ConfidenceInterval.Margin);
            near(statistics.ConfidenceInterval.Upper,statistics.Mean+statistics.ConfidenceInterval.Margin);
            equal(benchmark.Measurements.length,result.length);
            benchmark.Measurements.forEach((value,index)=>{equal(value.IterationMode,'Workload');equal(value.IterationStage,'Result');
                equal(value.Operations,result[index].operations);near(value.Nanoseconds,result[index].ns);});
            const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
            const[g0,g1,g2,bytes,operations]=gc.slice(1).map(Number);assert(operations>0&&Number.isSafeInteger(bytes));
            equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.TotalOperations],[g0,g1,g2,operations]);
            equal(benchmark.Memory.BytesAllocatedPerOperation,roundEven(bytes/operations));
            const recorded=profile.rows.find(row=>row.shape===parameters.Shape);assert(recorded);
            equal(recorded.rawActual,actual);equal(recorded.retainedResult,result);equal(recorded.warmup,warmup);equal(recorded.overheadActual,overhead);
            near(recorded.reportedMeanNs,calculatedMean);near(recorded.reportedSdNs,Math.sqrt(variance));near(recorded.allEightUnfilteredActualMeanNs,mean(raw));
            equal(recorded.allocatedProcessBytesPerOperation,benchmark.Memory.BytesAllocatedPerOperation);
            allRows.push(recorded);actualIterations+=actual.length;retainedResults+=result.length;warmups+=warmup.length;overheads+=overhead.length;
        }
    }
}
for(const record of analysis.cases){
    equal(record.comparisons.map(row=>row.comparison),[2,3]);
    for(const comparison of record.comparisons){
        const before=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='original'&&row.shape===record.shape);
        const after=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='candidate-1'&&row.shape===record.shape);
        near(comparison.reportedTimeRatio,after.reportedMeanNs/before.reportedMeanNs);
        near(comparison.allEightActualTimeRatio,after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs);
        near(comparison.allocatedChangePercent,100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1));
    }
}
equal([analysis.actualComparisonSlotsUsed,analysis.actualComparisons,analysis.actualAttemptedProfiles,analysis.actualProfiles,analysis.actualReports],[3,2,5,4,88]);
equal([actualIterations,retainedResults,warmups,overheads],[704,665,264,1700]);
equal([analysis.actualWorkloadIterations,analysis.actualRetainedResults,analysis.actualWarmups,analysis.actualOverheadIterations],[704,665,264,1700]);
equal(analysis.completedComparisonIds,[2,3]);equal(analysis.failedAttempts.length,1);equal(analysis.failedAttempts[0].workloadSamples,0);
const select=names=>analysis.cases.filter(row=>names.includes(row.shape)).flatMap(row=>row.comparisons);
const large=select(['Remove4096','Remove16384','Resume4096','Resume16384']),early=select(['DuplicateEarly129','DuplicateEarly4096']);
equal(large.length,8);assert(large.every(row=>row.reportedTimeRatio<1&&row.allEightActualTimeRatio<1&&row.allocatedChangePercent>0));
equal(early.length,4);assert(early.every(row=>row.reportedTimeRatio>1&&row.allocatedChangePercent>0));
assert(select(['Remove129','Remove256','Resume129']).some(row=>row.reportedTimeRatio>1));
for(const runtime of runtimes)for(const key of ['harnessSha256','componentsSha256','corelibSha256','initialSettings'])equal(runtime[key],runtimes[0][key]);
equal(timedHashes.size,22);
const budget=json('measurement-budget.json');equal([budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.completedProfiles,budget.closed],[3,3,2,4,true]);
equal(budget.completedComparisonIds,[2,3]);equal(budget.failedComparisonIds,[1]);
const evaluation=json('final-evaluation.json');equal(evaluation.performancePrJustified,true);equal(evaluation.practicalDefaultAppBenefitEstablished,false);
const memory=json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))),memory.source_sha256);
for(const variant of ['original','candidate-1'])equal(manifestFile(variant,'BenchmarkDotNet.dll').sha256,memory.currentMeasuredBdnDllSha256);
if(live){
    const working=fs.readFileSync(String.raw`C:\src\aspnetcore\src\Components\Server\src\Circuits\ServerComponentDeserializer.cs`);
    equal(sha(working),patch.candidateSourceSha256);
    equal(sha(fs.readFileSync(String.raw`C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Components.Server\Release\net12.0\Microsoft.AspNetCore.Components.Server.dll`)),manifests.get('candidate-1').ownerSha256);
    const status=spawnSync('git',['--no-pager','diff','--name-only'],{cwd:String.raw`C:\src\aspnetcore`});equal(status.status,0);
    equal(status.stdout.toString().trim().replaceAll('/','\\'),ownerRelative);
}
if(fs.existsSync(file('authoritative-copy-manifest.json'))){
    const copies=json('authoritative-copy-manifest.json');equal(new Set(copies.map(row=>row.destination)).size,copies.length);
    for(const copy of copies){const bytes=fs.readFileSync(file(copy.destination));equal(bytes.length,copy.bytes);equal(sha(bytes),copy.sha256);}
}
const report={candidate:'F007',disposition:'validated',recommendedCampaignDisposition:'qualified-scaling-draft',
    qualification:evaluation.qualification,performancePrJustified:true,practicalDefaultAppBenefitEstablished:false,
    attemptedComparisonSlots:3,failedNoSampleComparisonIds:[1],attemptedOriginalProfiles:3,attemptedCandidateProfiles:2,
    exactHarnessControlledComparisons:2,controlledComparisonIds:[2,3],completedProfiles:4,benchmarkOutcomes:88,
    actualWorkloadIterations:actualIterations,retainedResults,filteredUpperSamples:actualIterations-retainedResults,
    actualWarmups:warmups,actualOverheadIterations:overheads,overheadCountDistribution:overheadDistribution,
    existingOwningTestRows:testRows,owningTestSkips:0,finalCharacterizationChecksPerOwner:151,producerRecordsAudited:producerRecords,
    validatedOwnerRecordsAudited:validatedRecords,actualTimedSetupPreflightsAudited:timedPreflights,
    pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,capturedSettingsRecords:settingsRecords,
    selectedSourceTriples:15,supplementalDefaultSourceRecords:5,wholeDefaultClassEquivalent:true,wholeDefaultIntegrationClaimed:false,
    sourceCandidateShapes:1,harnessVersionsWithWorkloadSamples:1,harnessVersionsInAttemptedTimingProfiles:2,
    frozenImageVariants:2,filesPerImage:146,sourceSnapshotsVerified:sourceFiles,all144NonownerImageBytesIdentical:true,
    largeScalingOutcomesFasterWithHigherAllocation:large.length,largeMinimumBdnReductionPercent:100*(1-Math.max(...large.map(row=>row.reportedTimeRatio))),
    largeMaximumBdnReductionPercent:100*(1-Math.min(...large.map(row=>row.reportedTimeRatio))),
    earlyDuplicateOutcomesSlowerWithHigherAllocation:early.length,deterministicTimedInputsAcrossCompletedProfiles:timedHashes.size,
    maximumCvPercent:Math.max(...allRows.map(row=>100*row.reportedSdNs/row.reportedMeanNs)),
    processWideMemoryNotIsolatedOwnerAllocation:true,confidenceCriticalValuesIndependentlyComputed:false,
    comparisonBudgetClosed:true,failedSlotArtifactsPreserved:true,staleBuildGuardCaughtBeforeTiming:true,
    notCompleteMetadataSdkOrNativeRuntimeInventory:true,explicitlyAdaptedSourcePatternsFrom:'F006-reproduce-analysis.mjs;no F006 data/findings reused.'};
equal([testRows,producerRecords,validatedRecords,timedPreflights,pdbBindings,pdbDocuments,settingsRecords,sourceFiles],[66,346,390,132,14,64,176,52]);
if(verify){
    const old=json('measurement-audit.json');for(const[key,value]of Object.entries(report))equal(old[key],value);
}else{
    assert(live);assert(!fs.existsSync(file('measurement-audit.json')));
    fs.writeFileSync(file('measurement-audit.json'),JSON.stringify({...report,liveImageFilesRehashed:imageFiles,actualLiveAuditPassed:true},null,2)+'\n');
}
console.log(`F007 ${live?'live':'portable'} audit passed:3 spent slots,failed slot1/no samples,2 exact-harness pairs/88 reports/704 raw/665 retained/264 warmups/1700 overheads;66 owner Facts,346 producer proofs,390 owner observations,132 actual setup preflights,14 PE-PDB bindings/64 documents,176 unchanged settings;${live?imageFiles+' physical final image files rehashed':'omitted DLL/PDB/native images not rehashed'}. Narrow scaling/allocation draft only;no default-app or rendering gain claimed.`);
