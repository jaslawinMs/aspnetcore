import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F010'):path.resolve(supplied);
const file=relative=>path.join(root,...relative.split(/[\\/]/)),base=value=>value.split(/[\\/]/).at(-1);
const bytes=relative=>fs.readFileSync(file(relative)),text=relative=>bytes(relative).toString('utf8').replace(/^\uFEFF/,''),json=relative=>JSON.parse(text(relative));
const hash=(value,algorithm='sha256')=>crypto.createHash(algorithm).update(value).digest('hex').toUpperCase(),sha=relative=>hash(bytes(relative));
const equal=(one,two)=>assert.deepEqual(one,two),canonical=value=>value.replaceAll('\r\n','\n');
const near=(one,two)=>assert(Number.isFinite(one)&&Number.isFinite(two)&&Math.abs(one-two)<=Math.max(1e-5,Math.abs(two)*1e-9),`Numeric mismatch:${one}/${two}`);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const quantile=(values,p)=>{const a=[...values].sort((x,y)=>x-y),index=(a.length-1)*p,lower=Math.floor(index);return a[lower]+(a[Math.ceil(index)]-a[lower])*(index-lower);};
const roundEven=value=>{const lower=Math.floor(value);return value-lower===0.5?lower+(lower%2):Math.round(value);};
const states=relative=>fs.readdirSync(file(relative)).filter(name=>name.endsWith('.json')).sort().map(name=>({name,data:json(relative+'/'+name)}));
const only=(rows,suffix)=>{const a=rows.filter(row=>row.name.endsWith(suffix));equal(a.length,1);return a[0].data;};
const bool=value=>{assert([true,false,'true','false','True','False'].includes(value),`Missing/invalid Boolean:${value}`);return value===true||String(value).toLowerCase()==='true';};
const shapes=['Params2','NoValues','Array64','List64','Set1','Ord16Last','Ord64Last','Def64Last','Ord64Miss','Ord64Early','Ignore64'];
const eligible=['Set1','Ord16Last','Ord64Last','Def64Last','Ord64Miss','Ord64Early'];
const owner='Microsoft.AspNetCore.Authorization',testAssembly=owner+'.Test';
const roleTfm={primary:'net12.0',legacy:'net462',standard:'netstandard2.0'};
const omissions=fs.existsSync(file('omitted-file-manifest.json'))?json('omitted-file-manifest.json'):[];
let omittedRecords=0,liveImageFiles=0,liveArchivedImages=0,liveOwnerAndTestFiles=0,sourceSnapshots=0,pdbBindings=0,pdbDocuments=0;
function exact(relative,expected){
    if(fs.existsSync(file(relative))){
        const value=bytes(relative);if(expected.bytes!==undefined)equal(value.length,expected.bytes);equal(hash(value),expected.sha256);
        return true;
    }
    assert(!live,`Missing live evidence:${relative}`);
    const records=omissions.filter(row=>row.original.replaceAll('\\','/')===relative.replaceAll('\\','/'));equal(records.length,1);
    equal(records[0].sha256,expected.sha256);if(expected.bytes!==undefined)equal(records[0].bytes,expected.bytes);omittedRecords++;
    return false;
}
const investigation=json('current-source-investigation.json'),addendum=json('logging-investigation-addendum.json');
equal([investigation.scopedSourceFiles,investigation.currentDefaultEquivalentFiles,investigation.wholeSelectedOwnerCanonicalEqual,investigation.sourceChanged],[19,19,true,false]);
equal(investigation.currentDefault,'49147673007a4b1d676694e2c5f85b83ad76c36f');
for(const row of investigation.sources){
    for(const[directory,key]of[['baseline-canonical','baselineSha256'],['current-default-canonical','currentDefaultSha256'],['producer-source','workingSha256']])
        equal(sha(directory+'/'+row.file),row[key]);
    equal(canonical(text('baseline-canonical/'+row.file)),canonical(text('current-default-canonical/'+row.file)));
    equal(canonical(text('baseline-canonical/'+row.file)),canonical(text('producer-source/'+row.file)));
}
equal(addendum.additionalCanonicalEqualSources.length,2);
for(const row of addendum.additionalCanonicalEqualSources){
    equal(sha('producer-source/'+row.file),row.workingSha256);equal(row.baselineDefaultWorkingCanonicalEqual,true);
    equal(canonical(text('baseline-canonical/'+row.file)),canonical(text('current-default-canonical/'+row.file)));
    equal(canonical(text('baseline-canonical/'+row.file)),canonical(text('producer-source/'+row.file)));
}
assert(addendum.actualNativeProducerDiscovered.includes('LoggingExtensions.UserAuthorizationFailed'));
equal(addendum.expectedDeferredCountsAfterConstructorCounterReset,{nextTypeMissCumulative:4,nextHitCumulative:3,firstMiss:2});
equal(json('acceptance.json').maximum_paired_comparisons,3);
const manifests=Object.fromEntries(['original','candidate'].map(role=>[role,json('manifest-'+role+'.json')]));
const tests=Object.fromEntries(['original','candidate'].map(role=>[role,json('tests/'+role+'/actual-test-audit.json')]));
function image(role,kind){const a=manifests[role].images.filter(row=>row.role===kind);equal(a.length,1);return a[0];}
function asset(role,kind,name){const a=image(role,kind).files.filter(row=>row.path===name);equal(a.length,1);return a[0];}
function imageRelative(role,kind){return 'images/'+(kind==='primary'?role:kind+'-'+role);}
for(const role of ['original','candidate']){
    const manifest=manifests[role];equal(manifest.sources.length,64);equal(manifest.images.length,3);
    for(const row of manifest.sources){exact('sources/'+role+'/'+row.path,row);sourceSnapshots++;}
    for(const kind of Object.keys(roleTfm)){
        for(const row of image(role,kind).files)if(exact(imageRelative(role,kind)+'/'+row.path,row))liveImageFiles++;
        const target=manifest.ownerTargets.find(row=>row.targetFramework===roleTfm[kind]);assert(target);
        equal([target.dllSha256,target.pdbSha256],[asset(role,kind,owner+'.dll').sha256,asset(role,kind,owner+'.pdb').sha256]);
        for(const[extension,key]of[['dll','dllSha256'],['pdb','pdbSha256']])
            if(exact('tests/'+role+'/owner-outputs/'+target.targetFramework+'/'+owner+'.'+extension,{sha256:target[key]}))liveOwnerAndTestFiles++;
    }
    equal(manifest.ownerTargets,tests[role].ownerTargets);
    for(const[extension,key]of[['dll','testAssemblySha256'],['pdb','testPdbSha256']])
        if(exact('tests/'+role+'/test-image/'+testAssembly+'.'+extension,{sha256:tests[role][key]}))liveOwnerAndTestFiles++;
    equal(manifest.harnessDllSha256,asset(role,'primary','AutoPerf.Benchmarks.dll').sha256);
    equal(manifest.harnessPdbSha256,asset(role,'primary','AutoPerf.Benchmarks.pdb').sha256);
    equal(manifest.benchmarkDotNetSha256,asset(role,'primary','BenchmarkDotNet.dll').sha256);
}
for(const kind of Object.keys(roleTfm)){
    const original=image('original',kind),candidate=image('candidate',kind);equal(original.files.map(row=>row.path),candidate.files.map(row=>row.path));
    const changes=original.files.filter((row,index)=>row.sha256!==candidate.files[index].sha256).map(row=>row.path);
    equal(changes.sort(),[owner+'.dll',owner+'.pdb'].sort());
}
equal(manifests.original.harnessDllSha256,manifests.candidate.harnessDllSha256);
equal(manifests.original.harnessPdbSha256,manifests.candidate.harnessPdbSha256);
equal(manifests.original.sources.map(row=>row.path),manifests.candidate.sources.map(row=>row.path));
equal(manifests.original.sources.filter((row,index)=>row.sha256!==manifests.candidate.sources[index].sha256).map(row=>row.path).sort(),
    ['owner\\ClaimsAuthorizationRequirement.cs','test\\DefaultAuthorizationServiceTests.cs'].sort());

const decode=value=>value.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attrs=value=>Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
let trxRows=0;
const testRows={};
for(const role of ['original','candidate']){
    const trx=text('tests/'+role+'/owning-'+role+'.trx'),audit=tests[role],count=role==='original'?214:219;
    const results=[...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match=>attrs(match[1]));
    const definitions=[...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({
        ...attrs(match[1]),method:attrs(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),execution:attrs(match[2].match(/<Execution\b([^>]*)\/>/)[1])
    }));
    const entries=[...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match=>attrs(match[1]));
    equal([results.length,definitions.length,entries.length,audit.passed,audit.failed,audit.skipped],[count,count,count,count,0,0]);
    equal(new Set(results.map(row=>row.testId)).size,count);equal(new Set(results.map(row=>row.executionId)).size,count);
    let sentinels=0;testRows[role]=[];
    for(const result of results){
        equal(result.outcome,'Passed');assert(/^\d\d:\d\d:\d\d\.\d+$/.test(result.duration));assert(Number(result.duration.replaceAll(':',''))>0);
        const matches=definitions.filter(row=>row.id===result.testId);equal(matches.length,1);const definition=matches[0];
        equal(definition.execution.id,result.executionId);equal(entries.filter(row=>row.testId===result.testId&&row.executionId===result.executionId).length,1);
        const saved=audit.rows.filter(row=>row.testId===result.testId);equal(saved.length,1);
        equal([saved[0].method,saved[0].class,saved[0].displayName,saved[0].executionId,saved[0].duration,saved[0].outcome],
            [definition.method.name,definition.method.className,result.testName,result.executionId,result.duration,result.outcome]);
        if(definition.method.className.startsWith('AlwaysTestTests.'))sentinels++;
        testRows[role].push({method:definition.method.name,className:definition.method.className,display:result.testName});trxRows++;
    }
    equal(sentinels,2);
}
for(const original of testRows.original)
    equal(testRows.candidate.filter(row=>row.className===original.className&&row.method===original.method&&row.display===original.display).length,1);
const names=['Authorize_RequireClaim_UsesOrdinalHashSetValueComparison','Authorize_RequireClaim_UsesLiveAllowedSet','Authorize_RequireClaim_UsesOverriddenAllowedValuesEnumeration'];
const newRows=testRows.candidate.filter(row=>names.includes(row.method));equal(newRows.length,5);
equal(newRows.filter(row=>row.method===names[0]).map(row=>row.display.match(/claimValue: "([^"]+)", expected: (True|False)/)?.slice(1)).sort(),
    [['CanViewPage','True'],['canviewpage','False']].sort());
equal(newRows.filter(row=>row.method===names[1]).map(row=>row.display.match(/useOrdinalComparer: (True|False)/)?.[1]).sort(),['False','True']);
equal(newRows.filter(row=>row.method===names[2]).length,1);
equal(tests.candidate.newMethods,[{rows:2,name:names[0]},{rows:2,name:names[1]},{rows:1,name:names[2]}]);

let producerRecords=0,timedPreflights=0,settingsRecords=0;
const runtimes=[];
const expected=new Map(shapes.map(shape=>['sample-'+shape,!['Ord64Miss','Ignore64'].includes(shape)]));
for(const kind of ['ordinal','default'])
    for(const[label,value]of[['live-before-add',false],['live-after-add',true],['live-after-remove',false],['nonempty-then-empty',false],['empty-then-nonempty',true]])
        expected.set(kind+'-'+label,value);
for(const[label,value]of[
    ['array-before-replace',false],['array-same-count-replace',true],['readonly-before-replace',false],['readonly-live-backing',true],
    ['deferred-before-mutation',false],['deferred-after-mutation',true],['type-miss-only-failure-formatting',false],
    ['custom-comparer-must-not-run',false],['derived-set-storage-hidden',false],['derived-set-visible-enumeration',true],
    ['deferred-short-circuit',true],['deferred-original-exception-propagates',false],['claim-type-case-insensitive',true],
    ['allowed-values-case-sensitive',false],['principal-override-honored',false],['identity-override-honored',true],
    ['all-identities-search',true],['existing-tostring-and-identity',true]
])expected.set(label,value);
equal(expected.size,39);
function probe(data,setup=false){
    const label=setup?data.Name.replace('actual-benchmark-setup-','sample-'):data.Name;assert(expected.has(label),label);
    equal([bool(data.Expected),bool(data.Observed)],[expected.get(label),expected.get(label)]);
    equal(data.ServiceType,'Microsoft.AspNetCore.Authorization.DefaultAuthorizationServiceImpl');
    equal(bool(data.RetainedAllowedValuesIdentity),true);
    equal(bool(data.FailureRequirementIdentity),label!=='deferred-original-exception-propagates');
    if(label==='deferred-original-exception-propagates')equal([data.ActualProducerThrows,data.ActualSourceEnumerations],[1,3]);
    if(label==='deferred-short-circuit')equal([data.ActualProducerThrows,data.ActualSourceEnumerations],[0,2]);
    for(const[name,count]of[['deferred-before-mutation',2],['deferred-after-mutation',3],['type-miss-only-failure-formatting',4],
        ['derived-set-storage-hidden',2],['derived-set-visible-enumeration',3]])if(label===name)equal(data.ActualSourceEnumerations,count);
    if(['principal-override-honored','identity-override-honored'].includes(label))assert(data.ActualSourceEnumerations>0);
    if(['sample-Ignore64','custom-comparer-must-not-run','derived-set-storage-hidden'].includes(label))equal(bool(data.NativeSetContains),true);
    if(label==='sample-Ignore64'||label==='custom-comparer-must-not-run')equal([bool(data.KnownOrdinalComparer),bool(data.KnownDefaultComparer)],[false,false]);
    if(label.startsWith('derived-set-'))equal(bool(data.ExactHashSet),false);
    if(label.startsWith('sample-')){
        const shape=label.slice(7);
        equal(bool(data.ExactHashSet),eligible.includes(shape)||shape==='Ignore64');
        equal(bool(data.KnownDefaultComparer),shape==='Def64Last');
        equal(bool(data.KnownOrdinalComparer),eligible.includes(shape)&&shape!=='Def64Last');
    }
    if(setup){assert(data.Note.startsWith('Actual timed public Task-returning wrapper preflighted;'));timedPreflights++;}
    producerRecords++;
}
function witnesses(rows,role,count){
    const records=rows.filter(row=>row.name.includes('-source-pdb-'));equal(records.length,count);
    for(const record of records){
        const d=record.data,assembly=base(d.assembly),isTest=assembly===testAssembly+'.dll';
        const matches=manifests[role].images.flatMap(row=>row.files).filter(row=>base(row.path)===assembly&&row.sha256===d.assemblySha256);
        if(isTest)equal(d.assemblySha256,tests[role].testAssemblySha256);else assert(matches.length>0,assembly);
        const pdbHash=isTest?tests[role].testPdbSha256:
            manifests[role].images.flatMap(row=>row.files).filter(row=>base(row.path)===assembly.replace(/\.(dll|exe)$/,'.pdb')&&row.sha256===d.pdbSha256)[0]?.sha256;
        equal(d.pdbSha256,pdbHash);equal(d.actualPePdbBindingMatched,true);equal(d.codeViewGuid,d.pdbGuid);pdbBindings++;
        const expectedDocs=assembly===owner+'.dll'?15:isTest?2:assembly.startsWith('AutoPerf.Compatibility')?3:5;
        equal(d.documents.length,expectedDocs);
        for(const document of d.documents){
            const token='/sources/'+role+'/',normalized=document.source.replaceAll('\\','/');assert(normalized.includes(token));
            const contents=bytes('sources/'+role+'/'+normalized.split(token)[1]);
            const algorithm=document.algorithm.toLowerCase()==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':
                document.algorithm.toLowerCase()==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
            assert(algorithm);equal(hash(contents,algorithm),document.checksum);equal(hash(contents),document.sha256);pdbDocuments++;
        }
    }
}
function primaryRuntime(rows,role){
    const runtime=only(rows,'-runtime.json');
    equal([runtime.ownerSha256,runtime.ownerPdbSha256],[asset(role,'primary',owner+'.dll').sha256,asset(role,'primary',owner+'.pdb').sha256]);
    equal([runtime.harnessSha256,runtime.harnessPdbSha256,runtime.benchmarkDotNetSha256],
        [manifests[role].harnessDllSha256,manifests[role].harnessPdbSha256,manifests[role].benchmarkDotNetSha256]);
    equal([runtime.ownerTargetFramework,runtime.runtime,runtime.serverGc,runtime.sharedMachineNotIsolated],['.NETCoreApp,Version=v12.0','12.0.0',true,true]);
    equal(runtime.initialSettings,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});runtimes.push(runtime);
    return runtime;
}
for(const role of ['original','candidate']){
    const rows=states('characterization/'+role+'/states');witnesses(rows,role,7);primaryRuntime(rows,role);
    const producers=rows.filter(row=>row.name.endsWith('-producer.json'));equal(producers.map(row=>row.data.Name),[...expected.keys()]);
    producers.forEach(row=>probe(row.data));
    const setups=rows.filter(row=>row.name.endsWith('-benchmark-setup.json'));equal(setups.map(row=>row.data.Name),shapes.map(shape=>'actual-benchmark-setup-'+shape));
    setups.forEach(row=>probe(row.data,true));
    const completed=only(rows,'-characterization-completed.json');
    equal([completed.actualChecks,completed.actualTimedSetupsPreflighted,completed.sharedContractChecks,completed.passed],[50,11,39,true]);
    for(const kind of ['legacy','standard']){
        const relative='characterization/'+kind+'-'+role,compat=states(relative);
        const records=compat.filter(row=>row.name.endsWith('-producer.json'));equal(records.map(row=>row.data.Name),[...expected.keys()]);records.forEach(row=>probe(row.data));
        const runtime=json(relative+'/runtime.json'),done=json(relative+'/completed.json');
        equal([runtime.ownerSha256,runtime.ownerPdbSha256],[asset(role,kind,owner+'.dll').sha256,asset(role,kind,owner+'.pdb').sha256]);
        equal(runtime.ownerTargetFramework,kind==='legacy'?'.NETFramework,Version=v4.6.2':'.NETStandard,Version=v2.0');
        equal([Number(done.actualChecks),Number(done.actualRecords),bool(done.passed),done.finalSettings],[39,39,true,'Normal|Normal|65535']);
        equal(runtime.initialSettings,'Normal|Normal|65535');equal(bool(runtime.serverGc),kind==='standard');
        equal(runtime.harnessSha256,asset(role,kind,kind==='legacy'?'AutoPerf.Compatibility.exe':'AutoPerf.Compatibility.dll').sha256);
        if(kind==='legacy')equal([runtime.runtime,runtime.corelibProductVersion],['4.0.30319.42000','4.8.10008.0']);
        else equal(runtime.corelibSha256,runtimes[0].corelibSha256);
    }
}

const comparisons=[1,2,3].map(id=>json('analysis-comparison-'+id+'.json'));
let reports=0,actuals=0,retained=0,warmups=0,overheads=0;const overheadDistribution={};
for(let index=0;index<comparisons.length;index++){
    const id=index+1,comparison=comparisons[index],order=id===2?['candidate','original']:['original','candidate'];
    equal(comparison.order,order);equal(comparison.cases.map(row=>row.shape),shapes);
    let comparisonRaw=0,comparisonRetained=0,comparisonWarmups=0,comparisonOverheads=0;
    for(const role of order){
        const relative='measurements/comparison-'+id+'/'+role,rows=states(relative+'/states');
        witnesses(rows,role,2);const runtime=primaryRuntime(rows,role);
        const setups=rows.filter(row=>row.name.endsWith('-benchmark-setup.json'));equal(setups.map(row=>row.data.Name),shapes.map(shape=>'actual-benchmark-setup-'+shape));
        setups.forEach(row=>probe(row.data,true));
        const settings=rows.filter(row=>/-settings-(before|after)\.json$/.test(row.name));equal(settings.length,22);
        for(const record of settings){equal(record.data,runtime.initialSettings);settingsRecords++;}
        equal(only(rows,'-completed.json'),{actualReports:11,allSuccessful:true,context:role+'-comparison-'+id});
        const exports=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(exports.length,1);
        const exported=json(relative+'/results/'+exports[0]);equal(exported.Benchmarks.length,11);
        equal(sha(relative+'/results/'+exports[0]),comparison.roles[role].fullExportSha256);
        const consoleRelative='measurements/comparison-'+id+'/'+role+'.log';
        equal(sha(consoleRelative),comparison.roles[role].consoleSha256);
        const parts=text(consoleRelative).split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,11);
        for(const benchmark of exported.Benchmarks){
            const shape=benchmark.FullName.match(/^AutoPerf\.ClaimBenchmarks\.Authorize\(Shape: (\w+)\)$/)?.[1];assert(shapes.includes(shape));
            const matching=parts.filter(value=>value.slice(0,value.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));equal(matching.length,1);
            const part=matching[0];assert(part.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000')&&part.includes('Toolchain=SettingsPreservingEmitToolchain')
                &&part.includes('IterationTime=100.0000 ms')&&part.includes('RunStrategy=Throughput'));
            const parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const actual=parse('WorkloadActual'),result=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overhead=parse('OverheadActual');
            equal([actual.length,warmup.length],[8,3]);assert(overhead.length>0&&result.length>=5);
            for(const list of [actual,warmup,overhead])equal(list.map(row=>row.index),Array.from({length:list.length},(_,n)=>n+1));
            overheadDistribution[overhead.length]=(overheadDistribution[overhead.length]??0)+1;
            const normalized=result.map(row=>row.ns/row.operations),raw=actual.map(row=>row.ns/row.operations);
            const compensation=quantile(overhead.map(row=>row.ns/row.operations),.5),remaining=raw.map(value=>value-compensation);
            for(const value of normalized){const match=remaining.findIndex(other=>Math.abs(value-other)<.001);assert(match>=0);remaining.splice(match,1);}
            assert(remaining.every(value=>value>=Math.max(...normalized)-.001));
            const statistics=benchmark.Statistics;equal(statistics.N,normalized.length);
            equal([...statistics.OriginalValues].sort((a,b)=>a-b),[...normalized].sort((a,b)=>a-b));
            const calculated=mean(normalized),variance=normalized.reduce((sum,value)=>sum+(value-calculated)**2,0)/(normalized.length-1);
            for(const[key,value]of Object.entries({Mean:calculated,Variance:variance,StandardDeviation:Math.sqrt(variance),StandardError:Math.sqrt(variance/normalized.length),
                Min:Math.min(...normalized),Max:Math.max(...normalized),Q1:quantile(normalized,.25),Median:quantile(normalized,.5),Q3:quantile(normalized,.75)}))near(statistics[key],value);
            near(statistics.ConfidenceInterval.Lower,statistics.Mean-statistics.ConfidenceInterval.Margin);
            near(statistics.ConfidenceInterval.Upper,statistics.Mean+statistics.ConfidenceInterval.Margin);
            equal(benchmark.Measurements.length,result.length);
            benchmark.Measurements.forEach((value,n)=>{equal(value.IterationMode,'Workload');equal(value.IterationStage,'Result');
                equal(value.Operations,result[n].operations);near(value.Nanoseconds,result[n].ns);});
            const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
            const[g0,g1,g2,allocated,operations]=gc.slice(1).map(Number);assert(operations>0&&Number.isSafeInteger(allocated));
            equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.TotalOperations],[g0,g1,g2,operations]);
            equal(benchmark.Memory.BytesAllocatedPerOperation,roundEven(allocated/operations));
            const recorded=comparison.cases.find(row=>row.shape===shape)[role==='original'?'before':'after'];
            equal([recorded.fullExportedIdentity,recorded.exportedParameter],[benchmark.FullName,benchmark.Parameters]);
            equal([recorded.rawActual,recorded.retainedResult,recorded.warmup,recorded.overheadActual],[actual,result,warmup,overhead]);
            equal(recorded.reportedStatistics,statistics);equal(recorded.reportedMemory,benchmark.Memory);
            near(recorded.reportedMeanNs,calculated);near(recorded.reportedSdNs,Math.sqrt(variance));near(recorded.allEightUnfilteredActualMeanNs,mean(raw));
            near(recorded.reportedCvPercent,100*Math.sqrt(variance)/calculated);equal(recorded.allocatedProcessBytesPerOperation,benchmark.Memory.BytesAllocatedPerOperation);
            equal(benchmark.Memory.BytesAllocatedPerOperation,['Ord64Miss','Ignore64'].includes(shape)?5896:456);
            actuals+=actual.length;retained+=result.length;warmups+=warmup.length;overheads+=overhead.length;reports++;
            comparisonRaw+=actual.length;comparisonRetained+=result.length;comparisonWarmups+=warmup.length;comparisonOverheads+=overhead.length;
        }
    }
    for(const row of comparison.cases){
        equal(row.knownComparerExactSet,eligible.includes(row.shape));near(row.meanTimeRatio,row.after.reportedMeanNs/row.before.reportedMeanNs);
        near(row.meanTimeChangePercent,100*(row.meanTimeRatio-1));near(row.allEightRawTimeRatio,row.after.allEightUnfilteredActualMeanNs/row.before.allEightUnfilteredActualMeanNs);
        equal([row.allocationChangeBytesPerOperation,row.allocationChangePercent],[0,0]);
    }
    equal([comparison.actualProfiles,comparison.successfulReports,comparison.actualWorkloadIterations,comparison.actualRetainedResults,comparison.actualWarmups,comparison.actualOverheadIterations],
        [2,22,comparisonRaw,comparisonRetained,comparisonWarmups,comparisonOverheads]);
    equal(text('measurements/comparison-'+id+'/power-before.txt').trim(),text('measurements/comparison-'+id+'/power-after.txt').trim());
}
for(const runtime of runtimes)equal([runtime.harnessSha256,runtime.harnessPdbSha256,runtime.benchmarkDotNetSha256,runtime.corelibSha256,runtime.initialSettings],
    [runtimes[0].harnessSha256,runtimes[0].harnessPdbSha256,runtimes[0].benchmarkDotNetSha256,runtimes[0].corelibSha256,runtimes[0].initialSettings]);
const analysis=json('analysis.json');equal(analysis.totals,{profiles:6,reports,raw:actuals,retained,warmups,overheads,upperFiltered:actuals-retained});
equal([reports,actuals,retained,warmups,overheads],[66,528,491,198,1120]);equal(analysis.cases.map(row=>row.shape),shapes);
for(const row of analysis.cases){
    const cases=comparisons.map(item=>item.cases.find(value=>value.shape===row.shape));
    for(const[key,values]of Object.entries({
        meanRatios:cases.map(value=>value.meanTimeRatio),rawEightRatios:cases.map(value=>value.allEightRawTimeRatio),
        meanTimeChangePercent:cases.map(value=>value.meanTimeChangePercent),originalMeansNs:cases.map(value=>value.before.reportedMeanNs),
        candidateMeansNs:cases.map(value=>value.after.reportedMeanNs),originalCvPercent:cases.map(value=>value.before.reportedCvPercent),
        candidateCvPercent:cases.map(value=>value.after.reportedCvPercent),originalBytesPerOperation:cases.map(value=>value.before.allocatedProcessBytesPerOperation),
        candidateBytesPerOperation:cases.map(value=>value.after.allocatedProcessBytesPerOperation)
    }))equal(row[key],values);
    equal(row.rangeMeanTimeChangePercent,[Math.min(...row.meanTimeChangePercent),Math.max(...row.meanTimeChangePercent)]);
    equal(row.allocationBenefitObserved,false);
}
const budget=json('measurement-budget.json');
equal([budget.maximumComparisons,budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.completedProfiles,budget.closed],[3,3,3,3,6,true]);
equal([budget.completedComparisonIds,budget.failedComparisonIds],[[1,2,3],[]]);equal(budget.attempts.length,3);
for(const attempt of budget.attempts){
    equal([attempt.state,attempt.failed],['completed',false]);equal(attempt.order,attempt.comparison===2?['candidate','original']:['original','candidate']);
    equal(attempt.profiles.map(row=>row.role),attempt.order);
    for(const profile of attempt.profiles){equal([profile.actualExitCode,profile.expectedReports,profile.actualReports],[0,11,11]);assert(profile.arguments.includes('--measure'));}
    for(const role of ['original','candidate'])equal(attempt.manifestHashes[role],sha('manifest-'+role+'.json'));
}
const evaluation=json('final-evaluation.json');equal([evaluation.disposition,evaluation.performancePrJustified],['qualified-draft/existing-set-cpu-tradeoff',true]);

for(const relative of ['tests/original/execution.json','builds/original/execution.json','builds/candidate/execution.json','analysis-tools/binlog-reader-execution/execution.json']){
    const command=json(relative);assert(command.commands.length>0);assert(command.commands.every(row=>row.actualExitCode===0));
}
const gates=json('compatibility-gates/original/gates.json');
for(const row of gates.ownerTargets){equal([row.evaluated.EnablePackageValidation,row.evaluated.IsPackable,row.evaluated.PackageValidationBaselineVersion],['true','true','']);}
for(const row of gates.apiFiles){
    equal(sha('sources/original/owner/'+row.path),row.sha256);equal(sha('sources/candidate/owner/'+row.path),row.sha256);
}
const packageProof=json('package-validation-proof.json');equal(packageProof.proofPassed,true);
const task='Microsoft.DotNet.ApiCompat.Task.ValidatePackageTask',starts=packageProof.records.filter(row=>row.kind==='task-started'&&row.name===task);
equal(starts.length,1);
for(const row of starts)equal(packageProof.records.filter(other=>other.kind==='task-finished'&&other.name===task&&other.context===row.context&&other.succeeded===true).length,1);
for(const row of packageProof.records.filter(row=>row.kind.endsWith('-finished')))equal(row.succeeded,true);
exact('builds/candidate/pack-with-existing-package-validation.binlog',{sha256:packageProof.actualBinlogSha256});
if(live)equal(hash(fs.readFileSync(packageProof.actualReaderAssembly)),packageProof.actualReaderAssemblySha256);

for(const name of ['attempt-1','candidate-1']){
    const prefix='preparation-attempts/'+name,retired=json(prefix+'/retirement.json');equal(retired.nativeExitCode,name==='attempt-1'?-532462766:1);
    for(const mapping of retired.byteExactMovedMappings)for(const row of mapping.files){
        const physical=exact(mapping.to+'/'+row.path,row);
        if(mapping.to.includes('\\images\\')&&physical)liveArchivedImages++;
        if(mapping.to.includes('\\sources\\'))sourceSnapshots++;
    }
    if(name==='attempt-1'){
        const partial=states(prefix+'/characterization/legacy-original'),observations=partial.filter(row=>row.name.endsWith('-producer.json'));
        equal(observations.map(row=>row.data.Name),[...expected.keys()].slice(0,25));observations.forEach(row=>probe(row.data));
        equal(fs.existsSync(file(prefix+'/characterization/legacy-original/completed.json')),false);
        const execution=json(prefix+'/builds/original/execution.json');equal(execution.commands.at(-1).actualExitCode,-532462766);
    }else{
        equal(sha(prefix+'/ClaimsAuthorizationRequirement.cs'),retired.ownerSourceSha256);
        equal(sha(prefix+'/DefaultAuthorizationServiceTests.cs'),retired.testSourceSha256);
        equal(retired.ownerSourceSha256,sha('sources/candidate/owner/ClaimsAuthorizationRequirement.cs'));
        const execution=json(prefix+'/builds/candidate/execution.json');equal(execution.commands.at(-1).actualExitCode,1);
        equal(execution.commands.filter(row=>row.label.startsWith('fresh-owner-')).map(row=>row.actualExitCode),[0,0,0]);
    }
}
const reuse=json('builds/candidate/reused-three-target-owner-builds.json');
equal([reuse.actualOwnerBuildRepeated,reuse.sourceSha256],[false,sha('sources/candidate/owner/ClaimsAuthorizationRequirement.cs')]);
equal(reuse.ownerTargets,manifests.candidate.ownerTargets);
const extraction=json('analysis-attempts/extraction-1/failure.json');
equal([extraction.observedNativeToolExitCode,extraction.rawOrExperimentChanged,extraction.timingRepeated,extraction.comparisonBudgetReset],[1,false,false,false]);
const attribution=json('investigation/bdn-memory-accounting/provenance.json');
equal(attribution.currentMeasuredBdnDllSha256,manifests.original.benchmarkDotNetSha256);equal(attribution.newSourceFetchOrDelegateInstrumentation,false);
equal(sha('investigation/bdn-memory-accounting/borrowed-F008/GcStats.cs'),attribution.sourceSha256);
equal(sha('investigation/bdn-memory-accounting/borrowed-F008/provenance.json'),attribution.borrowedProvenanceSha256);
if(live){
    const repository=String.raw`C:\src\aspnetcore`,changes=spawnSync('git',['diff','--name-only'],{cwd:repository});equal(changes.status,0);
    const ownerPath='src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs',testPath='src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs';
    equal(changes.stdout.toString('utf8').trim().split(/\r?\n/).sort(),[ownerPath,testPath].sort());
    for(const[relative,snapshot]of[[ownerPath,'owner/ClaimsAuthorizationRequirement.cs'],[testPath,'test/DefaultAuthorizationServiceTests.cs']])
        equal(hash(fs.readFileSync(path.join(repository,...relative.split('/')))),sha('sources/candidate/'+snapshot));
    for(const row of gates.apiFiles)equal(hash(fs.readFileSync(path.join(repository,'src','Security','Authorization','Core','src',row.path))),row.sha256);
    const ref=gates.ownerTargets.find(row=>row.targetFramework==='net12.0');
    equal(hash(fs.readFileSync(ref.evaluated.TargetRefPath)),ref.referenceAssemblySha256);
}
let copyMappings=0;
if(fs.existsSync(file('authoritative-copy-manifest.json')))for(const row of json('authoritative-copy-manifest.json')){
    exact(row.destination,row);copyMappings++;
}
equal([producerRecords,timedPreflights,settingsRecords,pdbBindings,pdbDocuments,sourceSnapshots],[347,88,132,26,236,192]);
const report={
    candidate:'F010',auditPassed:true,actualLiveAuditPassed:live,portableAudit:!live,proposalDisposition:evaluation.disposition,performancePrJustified:true,
    pairedComparisons:3,completedProfiles:6,successfulReports:reports,actualWorkloadIterations:actuals,retainedResults:retained,upperFilteredSamples:actuals-retained,
    actualWarmups:warmups,actualOverheadIterations:overheads,overheadDistribution,originalUnitProjectRows:214,candidateUnitProjectRows:219,
    originalAreaRows:212,candidateAreaRows:217,repositorySentinelRowsPerRun:2,trxRowsAudited:trxRows,newPermanentMethods:3,newPermanentRows:5,
    producerRecordsAudited:producerRecords,finalThreeTargetChecksPerRole:128,preservedPartialLegacyRecords:25,actualTimedSetupPreflightsAudited:timedPreflights,
    pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,sourceSnapshotsVerified:sourceSnapshots,capturedSettingsRecords:settingsRecords,
    liveImageFilesRehashed:liveImageFiles,liveArchivedImageFilesRehashed:liveArchivedImages,liveOwnerAndTestOutputFilesRehashed:liveOwnerAndTestFiles,
    copiedMappingsVerified:copyMappings,portableOmittedRecordsCheckedAgainstManifest:omittedRecords,actualSuccessfulPackageValidationTasks:starts.length,
    budgetClosed:true,allocationBenefitObserved:false,allNonownerImageBytesIdentical:true,
    maximumOriginalCvPercent:Math.max(...analysis.cases.flatMap(row=>row.originalCvPercent)),maximumCandidateCvPercent:Math.max(...analysis.cases.flatMap(row=>row.candidateCvPercent)),
    analysisSha256:sha('analysis.json'),auditorSourceSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    independentlyRecomputed:'Every433 TRX result/definition/entry identity,duration,outcome and all5 new theory/fact rows;21 selected source equivalences;final/preserved source hashes;actual39-check public-service producer sequences on3TFMs per role and25 retained partial legacy observations;actual timed setup wrappers;26 captured PE/PDB bindings/236 document checks;all66 raw exports,528raw/491retained/198warmup/1120overhead samples,GC midpoint-even bytes/op,sample variance/SD/SE/R7 quantiles/confidence-bound arithmetic,ratios and unfavorable controls;actual successful native package-validation task events.',
    boundary:'Qualified existing-large-set CPU tradeoff,not aggregate/default-app/allocation benefit. All3 timing slots closed;small/default/no-value/early regressions retained,noneligible ignore-case fallback also speeds up without direct-set causal attribution. Warm owning public service,not HTTP/new request/scope,current-default dependency integration,production frequency or legacy throughput. Actual net462 hosted by Framework4.8.1 workstation GC;netstandard2 library hosted by net12 consumer. Package gate keeps existing nonservicing disabled released-baseline comparison. Portable audit cannot rehash omitted binaries/binlogs/packages or independently rebind PE/PDB bytes;captured witnesses are bounded,not whole build provenance/method coverage. Confidence critical values and source-to-BDN DLL binding not independently derived.'
};
if(verify){
    const previous=json('measurement-audit.json');
    for(const key of ['candidate','auditPassed','proposalDisposition','pairedComparisons','successfulReports','actualWorkloadIterations','retainedResults','actualWarmups',
        'actualOverheadIterations','trxRowsAudited','producerRecordsAudited','actualTimedSetupPreflightsAudited','pePdbBindings','sourcePdbDocumentChecks','sourceSnapshotsVerified',
        'capturedSettingsRecords','analysisSha256','auditorSourceSha256','actualSuccessfulPackageValidationTasks'])equal(report[key],previous[key]);
}else{
    assert(live);assert(!fs.existsSync(file('measurement-audit.json')));fs.writeFileSync(file('measurement-audit.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`F010 ${live?'live':'portable'} audit passed:3closed pairs/66reports/528raw/491retained/198warmups/1120overheads;214+219TRX rows,347producer/88setup,26PE-PDB/236docs/192snapshots,132settings,native package validation. CPU tradeoff only;no allocation gain.`);
