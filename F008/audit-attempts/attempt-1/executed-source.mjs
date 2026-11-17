import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F008'):path.resolve(supplied);
const file=relative=>path.join(root,...relative.split(/[\\/]/)),basename=value=>value.split(/[\\/]/).at(-1);
const text=relative=>fs.readFileSync(file(relative),'utf8').replace(/^\uFEFF/,''),json=relative=>JSON.parse(text(relative));
const sha=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const equal=(one,two)=>assert.deepEqual(one,two),canonical=value=>value.replaceAll('\r\n','\n');
const near=(one,two)=>assert(Math.abs(one-two)<=Math.max(1e-5,Math.abs(two)*1e-9),`Numeric mismatch:${one}/${two}`);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const quantile=(values,p)=>{const a=[...values].sort((x,y)=>x-y),index=(a.length-1)*p,lower=Math.floor(index);return a[lower]+(a[Math.ceil(index)]-a[lower])*(index-lower);};
const roundEven=value=>{const lower=Math.floor(value);return value-lower===0.5?lower+(lower%2):Math.round(value);};
const states=relative=>fs.readdirSync(file(relative)).filter(name=>name.endsWith('.json')).sort().map(name=>({name,data:json(relative+'/'+name)}));
const only=(rows,suffix)=>{const result=rows.filter(row=>row.name.endsWith(suffix));equal(result.length,1);return result[0].data;};
const shapes=['QueryOneMutable','QueryOneReadOnly','Query16LastArray','Query16LastReadOnlyWrapper','Query64Last','Query64Miss','Header3List64','Query64Parent'];
const investigation=json('current-source-investigation.json');
equal([investigation.scopedSourceFiles,investigation.currentDefaultEquivalentFiles,investigation.sourceChanged],[16,16,false]);
equal(investigation.currentDefault,json('investigation/current-default.stdout').commit.sha);
for(const source of investigation.sources){
    for(const[directory,key]of[['baseline-canonical','baselineSha256'],['current-default-canonical','currentDefaultSha256'],['producer-source','workingSha256']])
        equal(sha(fs.readFileSync(file(directory+'/'+source.file))),source[key]);
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('current-default-canonical/'+source.file)));
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('producer-source/'+source.file)));
}
const related=json('investigation/related-pr-70155.json'),patch=text('investigation/related-pr-70155.patch');
equal([related.author.login,related.state,related.url],['davidfowl','OPEN','https://github.com/dotnet/aspnetcore/pull/70155']);
assert(patch.includes('-        var culture = supportedCultures.FirstOrDefault('));
assert(patch.includes('+        var culture = FindSupportedCulture(name, supportedCultures);'));
assert(patch.includes('+    private static CultureInfo? FindSupportedCulture(StringSegment name, IList<CultureInfo> supportedCultures)'));
assert(text('investigation/current-sdk-context.patch').includes('26565.104'));
equal(json('acceptance.json').maximum_original_only_diagnostic_profiles,1);

let sourceSnapshots=0,liveImageFiles=0,liveArchivedImages=0,pdbBindings=0,pdbDocuments=0;
const manifests=new Map();
for(const[prefix,active]of[['',true],['retired-harness/preparation-3/',false],['retired-harness/preparation-4/',false]]){
    const manifest=json(prefix+'manifest-original.json');manifests.set(prefix,manifest);
    equal([manifest.sourceCandidateShapes,manifest.pairedComparisons],[0,0]);equal(manifest.sources.length,30);
    for(const row of manifest.sources){
        const bytes=fs.readFileSync(file(prefix+'sources/original/'+row.path));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);sourceSnapshots++;
    }
    if(live)for(const row of manifest.files){
        const bytes=fs.readFileSync(file(prefix+'images/original/'+row.path));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);
        if(active)liveImageFiles++;else liveArchivedImages++;
    }
    equal(canonical(text(prefix+'sources/original/owner/RequestLocalizationMiddleware.cs')),
        canonical(text('producer-source/src/Middleware/Localization/src/RequestLocalizationMiddleware.cs')));
}
const active=manifests.get('');equal(active.files.length,92);
const physical=(manifest,name)=>{const rows=manifest.files.filter(row=>row.path===name);equal(rows.length,1);return rows[0];};
for(const manifest of manifests.values())equal(manifest.ownerDllSha256,active.ownerDllSha256);

const test=json('tests/original/actual-test-audit.json'),trx=text('tests/original/owning-original.trx');
const unescape=value=>value.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attrs=value=>Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match=>[match[1],unescape(match[2])]));
const results=[...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match=>attrs(match[1]));
const definitions=[...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({
    ...attrs(match[1]),method:attrs(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),execution:attrs(match[2].match(/<Execution\b([^>]*)\/>/)[1])
}));
const entries=[...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match=>attrs(match[1]));
equal([results.length,definitions.length,entries.length,test.passed,test.failed,test.skipped],[40,40,40,40,0,0]);
equal(new Set(results.map(row=>row.testId)).size,40);equal(new Set(results.map(row=>row.executionId)).size,40);
const catalog=[];
for(const source of test.testSources){
    const bytes=fs.readFileSync(file('tests/original/'+source.name));equal(sha(bytes),source.sha256);
    const sourceText=bytes.toString('utf8'),className=source.name.replace(/\.cs$/,'');
    for(const match of sourceText.matchAll(/\[Fact\]\s+public (?:async )?(?:void|Task) (\w+)\(/g))catalog.push({className,name:match[1],rows:1});
    for(const match of sourceText.matchAll(/\[Theory\]([\s\S]*?)public (?:async )?(?:void|Task) (\w+)\(/g)){
        const data=[...match[1].matchAll(/\[InlineData\("([^"]*)", "([^"]*)"\)\]/g)].map(item=>item.slice(1));
        equal(data.length,10);catalog.push({className,name:match[2],rows:10,data});
    }
}
equal(catalog.filter(row=>row.rows===1).length,28);equal(catalog.filter(row=>row.rows===10).length,1);
const area=[],sentinels=[];
for(const result of results){
    equal(result.outcome,'Passed');assert(/^\d\d:\d\d:\d\d\.\d+$/.test(result.duration));assert(Number(result.duration.replaceAll(':',''))>0);
    const matches=definitions.filter(row=>row.id===result.testId);equal(matches.length,1);const definition=matches[0];
    equal(definition.execution.id,result.executionId);equal(entries.filter(row=>row.testId===result.testId&&row.executionId===result.executionId).length,1);
    const saved=test.rows.filter(row=>row.testId===result.testId);equal(saved.length,1);
    equal([saved[0].method,saved[0].class,saved[0].displayName,saved[0].executionId,saved[0].duration,saved[0].outcome],
        [definition.method.name,definition.method.className,result.testName,result.executionId,result.duration,result.outcome]);
    if(definition.method.className.startsWith('AlwaysTestTests.'))sentinels.push(definition);else area.push({...definition,result});
}
equal([area.length,sentinels.length],[38,2]);
for(const method of catalog){
    const rows=area.filter(row=>row.method.name===method.name&&row.method.className.split(',')[0].endsWith('.'+method.className));equal(rows.length,method.rows);
    if(method.data)equal(rows.map(row=>[...row.result.testName.matchAll(/"([^"]*)"/g)].map(match=>match[1])).sort(),method.data.sort());
}
assert(json('tests/original/execution.json').commands.every(command=>command.actualExitCode===0));
for(const row of test.binaryHashes)equal(row.sha256,physical(active,basename(row.path)).sha256);
if(live){
    for(const[name,key]of[['Microsoft.AspNetCore.Localization.Tests.dll','testAssemblySha256'],['Microsoft.AspNetCore.Localization.Tests.pdb','testPdbSha256']])
        equal(sha(fs.readFileSync(file('tests/original/test-image/'+name))),test[key]);
}

let producerRecords=0,validatedRecords=0,timedPreflights=0,settingsRecords=0,mutations=0;
const runtimes=[];
function witness(rows,prefix,bindings){
    const manifest=manifests.get(prefix),records=rows.filter(row=>row.name.includes('-source-pdb-'));equal(records.length,bindings);
    for(const record of records){
        const data=record.data;equal(data.actualPePdbBindingMatched,true);equal(data.codeViewGuid,data.pdbGuid);pdbBindings++;
        const token='-source-pdb-',assembly=record.name.slice(record.name.indexOf(token)+token.length,-5)+'.dll';
        const expectedAssembly=assembly.endsWith('.Tests.dll')?test.testAssemblySha256:physical(manifest,assembly).sha256;
        const expectedPdb=assembly.endsWith('.Tests.dll')?test.testPdbSha256:physical(manifest,assembly.replace(/\.dll$/,'.pdb')).sha256;
        equal(data.assemblySha256,expectedAssembly);equal(data.pdbSha256,expectedPdb);
        for(const document of data.documents){
            const name=basename(document.source),kind=name.endsWith('Test.cs')?'test':
                ['Program.cs','LocalizationSamples.cs','ContractProbes.cs','LocalizationBenchmarks.cs','SettingsPreservingEmitToolchain.cs'].includes(name)?'harness':'owner';
            const bytes=fs.readFileSync(file(prefix+'sources/original/'+kind+'/'+name));
            const algorithm=document.algorithm.toLowerCase()==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':
                document.algorithm.toLowerCase()==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
            assert(algorithm);equal(sha(bytes,algorithm),document.checksum);equal(sha(bytes),document.sha256);pdbDocuments++;
        }
    }
    const runtime=only(rows,'-runtime.json');equal(runtime.ownerSha256,manifest.ownerDllSha256);equal(runtime.harnessSha256,manifest.harnessDllSha256);
    equal(runtime.sharedMachineNotIsolated,true);equal(runtime.serverGc,true);runtimes.push(runtime);

    return runtime;
}
function producer(data){
    equal(data.optionsAndCallerListsNotCopiedByHarness,true);equal(data.providerResultNotInjected,true);
    equal(data.actualNullResult,!data.expectedResult);
    if(data.providerType.endsWith('.QueryStringRequestCultureProvider')){
        const query=new URLSearchParams(data.query?.replace(/^\?/,'')??'');
        let culture=query.get('culture'),ui=query.get('ui-culture');
        if(culture===null&&ui!==null)culture=ui;if(ui===null&&culture!==null)ui=culture;
        equal(data.actualProviderCultureNames,culture===null?null:[culture]);equal(data.actualProviderUICultureNames,ui===null?null:[ui]);
    }else{
        assert(data.providerType.endsWith('.AcceptLanguageHeaderRequestCultureProvider'));
        const expected=data.label==='HeaderConfiguredFourIncludesFourth'?['qaa','qab','qac','fr-FR']:
            data.label==='Header3List64'?['qaa','qab','fr-FR']:['qaa','qab','qac'];
        equal(data.actualProviderCultureNames,expected);equal(data.actualProviderUICultureNames,expected);
        equal(data.configuredHeaderMaximum,data.label==='HeaderConfiguredFourIncludesFourth'?4:3);
    }
    producerRecords++;

    return data;
}
function selection(names,supported,fallback,label){
    if(names===null||supported===null)return null;
    for(const name of names){
        assert(/^[a-zA-Z0-9-]*$/.test(name));
        if(name==='')continue;
        const hit=supported.find(value=>value.toUpperCase()===name.toUpperCase());if(hit)return hit;
        if(fallback&&name==='fr-CA'&&['ActualParentFallback','Query64Parent'].includes(label)&&supported.includes('fr'))return'fr';
    }

    return null;
}
function validate(data,proof){
    assert(proof);equal(data.Passed,true);equal([data.CultureReadOnly,data.UICultureReadOnly],[true,true]);assert(data.ActualNextCalls>0);
    const culture=selection(proof.actualProviderCultureNames,proof.supportedCultures,proof.fallback,data.Label);
    const ui=selection(proof.actualProviderUICultureNames,proof.supportedUICultures,proof.fallback,data.Label);
    equal([data.Culture,data.UICulture,data.WinningNativeProvider,data.ContentLanguage],[culture??'en-US',ui??'en-US',culture!==null||ui!==null,ui??'en-US']);
    if(data.Label==='MutableFormatBeforeEdit'||data.Label==='DuplicateNamesFirstWins')equal(data.DecimalSeparator,'~');
    if(data.Label==='MutableFormatAfterEdit'||data.Label==='DuplicateNamesReordered')equal(data.DecimalSeparator,'^');
    if(data.Logs!==null)for(const log of data.Logs){assert([1,2].includes(log.Id));equal(log.Level,'Debug');}
    validatedRecords++;
}
for(const[relative,prefix,expectedChecks,expectedProducers]of[
    ['characterization/original','',44,36],
    ['characterization/original-prep3','retired-harness/preparation-3/',18,18],
    ['characterization/original-prep4','retired-harness/preparation-4/',20,20],
    ['measurements/original-diagnostic-only','',8,8]
]){
    const rows=states(relative+'/states'),runtime=witness(rows,prefix,relative.startsWith('measurements/')?2:3);
    const proofs=rows.filter(row=>row.name.endsWith('-producer.json')).map(row=>producer(row.data));equal(proofs.length,expectedProducers);
    const checks=rows.filter(row=>row.name.endsWith('-validated.json'));equal(checks.length,expectedChecks);
    for(const row of checks)validate(row.data,proofs.find(proof=>proof.label===row.data.Label));
    const setups=rows.filter(row=>row.name.endsWith('-timed-setup-preflight.json'));
    equal(setups.length,prefix?0:8);
    for(const setup of setups){equal(setup.data.actualTimedTaskWrapperInvokedUntimed,true);equal(setup.data.passed,true);}timedPreflights+=setups.length;
    if(!prefix)equal(setups.map(row=>row.data.shape).sort(),[...shapes].sort());
    const mutationRows=rows.filter(row=>row.name.endsWith('-mutation.json'));mutations+=mutationRows.length;
    equal(mutationRows.length,prefix||relative.startsWith('characterization/')?7:0);
    for(const row of mutationRows){
        const m=row.data;
        if(m.kind==='add-remove-after-construction')equal([m.sameListReference,m.additionBefore.Culture,m.additionAfter.Culture,m.removalAfter.Culture],[true,'en-US','fr-FR','en-US']);
        if(m.kind==='same-count-list-element')equal([m.sameListReference,m.beforeCount,m.afterCount,m.replacementBefore.Culture,m.replacementAfter.Culture],[true,1,1,'en-US','fr-FR']);
        if(m.kind==='readonly-wrapper-mutable-backing')equal([m.sameListReference,m.beforeCount,m.afterCount,m.listReportsReadOnly,m.wrapperBefore.Culture,m.wrapperAfter.Culture],[true,1,1,true,'en-US','fr-FR']);
        if(m.kind==='same-count-array-element')equal([m.sameListReference,m.beforeCount,m.afterCount,m.listReportsReadOnly,m.arrayBefore.Culture,m.arrayAfter.Culture],[true,1,1,true,'en-US','fr-FR']);
        if(m.kind==='independent-options-list-properties')equal([m.sameMiddleware,m.sameOptions,m.propertyBefore.Culture,m.propertyAfter.Culture,m.propertyAfter.UICulture],[true,true,'en-US','fr-FR','de-DE']);
        if(m.kind==='mutable-culture-format')equal([m.originalSourceStillMutable,m.oldWrapperUnchanged,m.freshReadOnlyWrapper,m.formatBefore.DecimalSeparator,m.formatAfter.DecimalSeparator],[true,true,true,'~','^']);
        if(m.kind==='first-duplicate-reordered')equal([m.sameListReference,m.beforeCount,m.afterCount,m.duplicateBefore.DecimalSeparator,m.duplicateAfter.DecimalSeparator],[true,2,2,'~','^']);
    }
    const settings=rows.filter(row=>/-settings-(before|after)\.json$/.test(row.name));equal(settings.length,relative.startsWith('measurements/')?16:0);
    for(const record of settings){equal(record.data,runtime.initialSettings);settingsRecords++;}
    if(relative==='characterization/original'){
        const complete=only(rows,'-characterization-completed.json');equal([complete.actualChecks,complete.actualTimedSetupsPreflighted,complete.passed],[36,8,true]);
        const counters=rows.filter(row=>row.name.endsWith('-name-reads.json'));equal(counters.length,6);
        equal(counters.map(row=>row.data.observedNameReads),[2,6,32,96,128,384]);
        for(const row of counters){const d=row.data;equal(d.observedNameReads,d.supportedCount*d.actualNativeCandidateCount*2);equal(d.measurementTimed,false);equal(d.passed,true);}
    }
    if(relative.startsWith('measurements/'))equal(only(rows,'-completed.json').actualReports,8);
}
equal([producerRecords,validatedRecords,timedPreflights,settingsRecords,mutations,pdbBindings,pdbDocuments,sourceSnapshots],[82,90,16,16,21,11,64,90]);
for(const runtime of runtimes)equal([runtime.ownerSha256,runtime.corelibSha256,runtime.initialSettings],
    [runtimes[0].ownerSha256,runtimes[0].corelibSha256,runtimes[0].initialSettings]);

const analysis=json('analysis.json'),relative='measurements/original-diagnostic-only';
const exports=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(exports.length,1);
const data=json(relative+'/results/'+exports[0]);equal(data.Benchmarks.length,8);
equal(sha(fs.readFileSync(file(relative+'/results/'+exports[0]))),analysis.fullExportSha256);
const parts=text(relative+'/console.log').split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,8);
let actuals=0,retained=0,warmups=0,overheads=0;const overheadDistribution={};
for(const benchmark of data.Benchmarks){
    const shape=benchmark.FullName.match(/^AutoPerf\.LocalizationBenchmarks\.Invoke\(Shape: (\w+)\)$/)?.[1];assert(shapes.includes(shape));
    const matches=parts.filter(value=>value.slice(0,value.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));equal(matches.length,1);
    const part=matches[0];assert(part.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000')&&part.includes('Toolchain=SettingsPreservingEmitToolchain')
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
    const stats=benchmark.Statistics;equal(stats.N,normalized.length);
    equal([...stats.OriginalValues].sort((a,b)=>a-b),[...normalized].sort((a,b)=>a-b));
    const calculated=mean(normalized),variance=normalized.reduce((sum,value)=>sum+(value-calculated)**2,0)/(normalized.length-1);
    for(const[key,value]of Object.entries({Mean:calculated,Variance:variance,StandardDeviation:Math.sqrt(variance),StandardError:Math.sqrt(variance/normalized.length),
        Min:Math.min(...normalized),Max:Math.max(...normalized),Q1:quantile(normalized,.25),Median:quantile(normalized,.5),Q3:quantile(normalized,.75)}))near(stats[key],value);
    near(stats.ConfidenceInterval.Lower,stats.Mean-stats.ConfidenceInterval.Margin);near(stats.ConfidenceInterval.Upper,stats.Mean+stats.ConfidenceInterval.Margin);
    equal(benchmark.Measurements.length,result.length);
    benchmark.Measurements.forEach((value,index)=>{equal(value.IterationMode,'Workload');equal(value.IterationStage,'Result');
        equal(value.Operations,result[index].operations);near(value.Nanoseconds,result[index].ns);});
    const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
    const[g0,g1,g2,bytes,operations]=gc.slice(1).map(Number);assert(operations>0&&Number.isSafeInteger(bytes));
    equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.TotalOperations],[g0,g1,g2,operations]);
    equal(benchmark.Memory.BytesAllocatedPerOperation,roundEven(bytes/operations));
    const recorded=analysis.cases.find(row=>row.shape===shape);assert(recorded);
    equal(recorded.originalExportedParameter,benchmark.Parameters);equal(recorded.fullExportedIdentity,benchmark.FullName);
    equal([recorded.rawActual,recorded.retainedResult,recorded.warmup,recorded.overheadActual],[actual,result,warmup,overhead]);
    near(recorded.reportedMeanNs,calculated);near(recorded.reportedSdNs,Math.sqrt(variance));near(recorded.allEightUnfilteredActualMeanNs,mean(raw));
    near(recorded.reportedCvPercent,100*Math.sqrt(variance)/calculated);equal(recorded.allocatedProcessBytesPerOperation,benchmark.Memory.BytesAllocatedPerOperation);
    actuals+=actual.length;retained+=result.length;warmups+=warmup.length;overheads+=overhead.length;
}
equal([actuals,retained,warmups,overheads],[64,62,24,129]);
equal([analysis.actualWorkloadIterations,analysis.actualRetainedResults,analysis.actualWarmups,analysis.actualOverheadIterations],[64,62,24,129]);
equal(analysis.cases.map(row=>row.shape),shapes);equal([analysis.pairedComparisons,analysis.candidateProfiles,analysis.shippingSourceCandidates],[0,0,0]);
const command=json(relative+'/execution.json');equal(command.actualExitCode,0);equal(command.manifestSha256,sha(fs.readFileSync(file('manifest-original.json'))));
equal([command.preImageHashesVerified,command.postImageHashesVerified,command.preSourceHashesVerified,command.postSourceHashesVerified],[92,92,30,30]);
const budget=json('measurement-budget.json');equal([budget.maximumComparisons,budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.originalOnlyDiagnosticProfiles,budget.closed],[3,0,1,0,1,true]);
const evaluation=json('final-evaluation.json');equal(evaluation.disposition,'rejected/design-blocked');
equal([evaluation.performancePrJustified,evaluation.originalFindingCostStillPresent,evaluation.notMeasuredComparativeNoGain,evaluation.notClaimingAllOptimizationsImpossible],[false,true,true,true]);
const memory=json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))),memory.source_sha256);
equal(physical(active,'BenchmarkDotNet.dll').sha256,memory.currentMeasuredBdnDllSha256);equal(memory.newSourceFetchOrDelegateInstrumentation,false);
const history=json('preparation-history.json');equal(history.frozenImageVersions,3);equal(history.earlierTimings,0);
for(const attempt of history.buildAttempts){
    const execution=json(attempt.directory+'/execution.json'),build=execution.commands.find(row=>row.label==='build-harness');
    equal(build.actualExitCode,attempt.buildExitCode);
    if('characterizationExitCode'in attempt)equal(execution.commands.find(row=>row.label==='characterization').actualExitCode,attempt.characterizationExitCode);
}
equal(json('tests/prelaunch-helper-failure/failure.json').actualDotnetCommandsLaunched,0);
equal(fs.readFileSync(file('tests/prelaunch-helper-failure/build.log')).length,0);
equal(fs.readFileSync(file('tests/prelaunch-helper-failure/fresh-owner-build.log')).length,0);
if(live){
    for(const source of investigation.sources)equal(sha(fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`,source.file))),source.workingSha256);
    const git=spawnSync('git',['diff','--name-only'],{cwd:String.raw`C:\src\aspnetcore`});equal(git.status,0);equal(git.stdout.length,0);
}
let copyMappings=0;
if(fs.existsSync(file('authoritative-copy-manifest.json')))for(const row of json('authoritative-copy-manifest.json')){
    const bytes=fs.readFileSync(file(row.destination));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);copyMappings++;
}
const report={candidate:'F008',auditPassed:true,proposalDisposition:'rejected/design-blocked',performancePrJustified:false,
    actualLiveAuditPassed:live,portableAudit:!live,originalOnlyDiagnosticProfiles:1,pairedComparisons:0,candidateProfiles:0,
    benchmarkOutcomes:8,actualWorkloadIterations:actuals,retainedResults:retained,upperFilteredSamples:actuals-retained,
    actualWarmups:warmups,actualOverheadIterations:overheads,overheadDistribution,existingUnitProjectRows:40,existingAreaRows:38,repositoryAlwaysTestSentinelRows:2,
    producerRecordsAudited:producerRecords,validatedOwnerRecordsAudited:validatedRecords,actualTimedSetupPreflightsAudited:timedPreflights,
    finalLogicalUntimedChecks:36,finalInstrumentedNameReadProofs:6,capturedSettingsRecords:settingsRecords,mutationRecordsIncludingPreservedFailures:mutations,
    pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,sourceSnapshotsVerified:sourceSnapshots,
    liveImageFilesRehashed:liveImageFiles,liveArchivedImageFilesRehashed:liveArchivedImages,copiedMappingsVerified:copyMappings,
    budgetClosed:true,shippingSourceChanged:false,originalFindingCostStillPresent:true,maximumOriginalCvPercent:Math.max(...analysis.cases.map(row=>row.reportedCvPercent)),
    analysisSha256:sha(fs.readFileSync(file('analysis.json'))),auditorSourceSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    independentlyRecomputed:'Bounded input/actual-provider/owner observations,each38 area+2 sentinel TRX identity/outcome/duration and10 theory payloads,all preserved/final source checksums,GC midpoint-even bytes/op,raw/retained/warmup/overhead records,sample statistics/R7 quantiles/confidence-bound arithmetic. One truncated BDN display mapped through actual untruncated FullName and full setup/source enum.',
    boundary:'Original-owner mutation observations support the counterfactual against an uninvalidated startup snapshot;no such candidate was implemented or measured. Exact owner/component/native providers,not a network/new-context or full-current-default integration test. Portable audit cannot rehash omitted binaries or independently rebind PE/PDB bytes;captured PDB/source witnesses are bounded,not whole build provenance/method coverage. Confidence critical values and source-to-BDN DLL binding are not independently computed.'};
if(verify){
    const previous=json('measurement-audit.json');
    for(const key of ['candidate','auditPassed','proposalDisposition','benchmarkOutcomes','actualWorkloadIterations','retainedResults','actualWarmups','actualOverheadIterations',
        'existingUnitProjectRows','existingAreaRows','producerRecordsAudited','validatedOwnerRecordsAudited','pePdbBindings','sourcePdbDocumentChecks',
        'sourceSnapshotsVerified','actualTimedSetupPreflightsAudited','analysisSha256','auditorSourceSha256'])equal(report[key],previous[key]);
}else{
    assert(live);assert(!fs.existsSync(file('measurement-audit.json')));fs.writeFileSync(file('measurement-audit.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`F008 ${live?'live':'portable'} audit passed:8 original-only reports/64raw/62retained/24warmups/129overheads;38 area+2 sentinel tests,82producer/90owner observations,16setup preflights,11PE-PDB/64source docs,90snapshots,16settings. No candidate/comparison/gain.`);
