import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F006'):path.resolve(supplied);
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
const ownerRelative=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
const original=canonical(text('frozen-source/original/owner/ForLoopIteratorInClosureAnalyzer.cs'));
const candidate=canonical(text('frozen-source/candidate-1/owner/ForLoopIteratorInClosureAnalyzer.cs'));
let expected=original;
for(const [before,after]of[
    ['if (analyzerState.AllForVariables.Count == 0)','if (analyzerState.AllForVariables is not { Count: > 0 })'],
    ['public List<ILocalSymbol> AllForVariables { get; } = new();','public HashSet<ILocalSymbol>? AllForVariables { get; private set; }'],
    ['AllForVariables.Add(iterator);','(AllForVariables ??= new(SymbolEqualityComparer.Default)).Add(iterator);'],
    ['AllForVariables.Add(potentialIterator);','(AllForVariables ??= new(SymbolEqualityComparer.Default)).Add(potentialIterator);'],
    ['if (AllForVariables.Any(forVariable => SymbolEqualityComparer.Default.Equals(forVariable, variableReference.Local)))','if (AllForVariables?.Contains(variableReference.Local) ?? false)']
]){
    equal(expected.split(before).length,2);expected=expected.replace(before,after);
}
equal(candidate,expected);
const patch=json('source-patch-metadata.json');equal(patch.changedExistingLines,5);
equal(sha(fs.readFileSync(file('candidate.patch'))),patch.patchSha256);
equal(sha(fs.readFileSync(file('frozen-source/candidate-1/owner/ForLoopIteratorInClosureAnalyzer.cs'))),patch.candidateSourceSha256);
const investigation=json('current-source-investigation.json');equal(investigation.scopedSourceFiles,7);equal(investigation.currentDefaultEquivalentFiles,2);
for(const source of investigation.sources){
    for(const[directory,key]of[['baseline-canonical','baselineSha256'],['current-default-canonical','currentDefaultSha256'],['producer-source','workingSha256']])
        equal(sha(fs.readFileSync(file(directory+'/'+source.file))),source[key]);
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('producer-source/'+source.file)));
}
const defaultOwner=canonical(text('current-default-canonical/'+ownerRelative));
equal(defaultOwner,original.replace('conversionOperation.Operand.Type.ContainingNamespace.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal)',
    'conversionOperation.Operand.Type.ContainingNamespace?.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal) == true'));
const marker='    private sealed class ForLoopAnalyzerState';
equal(original.slice(original.indexOf(marker)),defaultOwner.slice(defaultOwner.indexOf(marker)));
equal(sha(Buffer.from(original.slice(original.indexOf(marker)))),investigation.selectedMembershipStateSha256);
const scope=json('current-default-class-probe-attempt1/scope.json');equal(scope.scopePrerequisites.length,10);
assert(scope.scopePrerequisites.every(row=>row.canonicalEqual));equal(scope.wholeDefaultAssemblyOrRepositoryIntegration,false);
equal(scope.originalOptionalExtensionFileExists,false);
equal(json('build/original-attempt1/execution.json').actualExitCode,0);
assert(json('current-default-class-probe-attempt1/execution.json').every(command=>command.actualExitCode===0));
let imageFiles=0,sourceFiles=0,pdbBindings=0,pdbDocuments=0,testRows=0,compilerChecks=0,bl0014=0,settingsRecords=0,producerRecords=0;
const manifests=new Map(),variants=['original','candidate-1','current-default-class'];
for(const variant of variants){
    const manifest=json('manifest-'+variant+'.json');equal(manifest.files.length,98);equal(manifest.frozenSources.length,31);manifests.set(variant,manifest);
    for(const row of manifest.frozenSources){
        const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);sourceFiles++;
    }
    if(live)for(const row of manifest.files){
        const bytes=fs.readFileSync(file('binaries/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);imageFiles++;
    }
}
const manifestFile=(variant,name)=>{const rows=manifests.get(variant).files.filter(row=>row.relativePath===name);equal(rows.length,1);return rows[0];};
for(const variant of ['candidate-1','current-default-class']){
    const differences=manifests.get('original').files.filter(row=>row.sha256!==manifestFile(variant,row.relativePath).sha256).map(row=>row.relativePath).sort();
    equal(differences,['Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb']);
    for(const name of ['AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb'])equal(manifestFile('original',name).sha256,manifestFile(variant,name).sha256);
}
const unescape=value=>value.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attributes=value=>Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match=>[match[1],unescape(match[2])]));
for(const variant of ['original','candidate-1']){
    const source=text('tests/'+variant+'/ForLoopIteratorInClosureAnalyzerTest.cs');
    const names=[...source.matchAll(/\[Fact\]\s+public void (\w+)\(/g)].map(match=>match[1]);equal(names.length,20);
    const audit=json('tests/'+variant+'/actual-test-audit.json'),trx=text('tests/'+variant+'/owning-'+variant+'.trx');
    const results=[...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match=>attributes(match[1]));
    const definitions=[...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match=>({
        ...attributes(match[1]),method:attributes(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),
        execution:attributes(match[2].match(/<Execution\b([^>]*)\/>/)[1])
    }));
    const entries=[...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match=>attributes(match[1]));
    equal([results.length,definitions.length,entries.length],[20,20,20]);
    equal(new Set(results.map(row=>row.testId)).size,20);equal(new Set(results.map(row=>row.executionId)).size,20);
    const observed=[];
    for(const result of results){
        equal(result.outcome,'Passed');assert(/^\d\d:\d\d:\d\d\.\d+$/.test(result.duration));assert(Number(result.duration.replaceAll(':',''))>0);
        const definition=definitions.filter(row=>row.id===result.testId);equal(definition.length,1);
        equal(definition[0].execution.id,result.executionId);
        equal(entries.filter(row=>row.testId===result.testId&&row.executionId===result.executionId).length,1);
        equal(definition[0].method.className.split(',')[0],'Microsoft.AspNetCore.Components.Analyzers.Test.ForLoopIteratorInClosureAnalyzerTest');
        assert(names.includes(definition[0].method.name));observed.push(definition[0].method.name);
        const row=audit.rows.filter(row=>row.testId===result.testId);equal(row.length,1);
        equal([row[0].method,row[0].executionId,row[0].duration,row[0].outcome],[definition[0].method.name,result.executionId,result.duration,result.outcome]);testRows++;
    }
    equal(observed.sort(),names.sort());equal(audit.passed,20);equal(audit.skipped,0);
    for(let i=0;i<4;i++)equal(audit.binaryHashes[i].sha256,manifestFile(variant,i%2===0?'Microsoft.AspNetCore.Components.Analyzers.dll':'Microsoft.AspNetCore.Components.Analyzers.pdb').sha256);
    assert(json('tests/'+variant+'/execution.json').commands.every(command=>command.actualExitCode===0));
}
const runtimes=[];
function witnesses(rows,variant,expectedBindings){
    const records=rows.filter(row=>row.name.includes('-source-pdb-'));equal(records.length,expectedBindings);
    for(const record of records){
        const data=record.data;equal(data.actualPePdbBindingMatched,true);equal(data.codeViewGuid,data.pdbGuid);pdbBindings++;
        const token='-source-pdb-',assembly=record.name.slice(record.name.indexOf(token)+token.length,-5)+'.dll';
        for(const document of data.documents){
            const name=basename(document.source),directory=name==='ForLoopIteratorInClosureAnalyzerTest.cs'?'test':
                ['Program.cs','CompilerSamples.cs'].includes(name)?'harness':'owner';
            const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+directory+'/'+name));
            const algorithm=document.algorithm.toLowerCase()==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':
                document.algorithm.toLowerCase()==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
            assert(algorithm);equal(sha(bytes,algorithm),document.checksum);equal(sha(bytes),document.sha256);pdbDocuments++;
        }
        if(live){
            const location=assembly.includes('.Tests.dll')?'tests/'+variant+'/test-image/'+assembly:'binaries/'+variant+'/'+assembly;
            equal(sha(fs.readFileSync(file(location))),data.assemblySha256);equal(sha(fs.readFileSync(file(location.replace(/\.dll$/,'.pdb')))),data.pdbSha256);
        }
    }
    const runtime=only(rows,'-runtime.json');
    equal(runtime.ownerSha256,manifests.get(variant).ownerSha256);equal(runtime.harnessSha256,manifestFile(variant,'AutoPerf.Benchmarks.dll').sha256);
    equal(runtime.language,'CSharp13');equal(runtime.serverGc,true);assert(runtime.compilerVersion.startsWith('5.11.0-1.26420.103'));
    assert(runtime.ownerReferences.some(name=>name.startsWith('Microsoft.CodeAnalysis, Version=3.3.0.0')));
    equal(runtime.initialSettings.processPriority,'Normal');equal(runtime.initialSettings.threadPriority,'Normal');assert(runtime.initialSettings.affinity>0);
    runtimes.push(runtime);return runtime;
}
function producerProof(data,relative){
    const input=relative+'/inputs/'+data.Label+'/'+(data.Label.includes('-generated')?'Sample.g.cs':'Sample.cs');
    const bytes=fs.readFileSync(file(input));equal(sha(bytes),data.inputSha256);
    equal(data.validCompilerInput,true);equal(data.language,'CSharp13');
    const source=bytes.toString('utf8'),loops=[...source.matchAll(/for \(int ([^;]+); ([^;]+); ([^)]*)\)/g)];
    equal(loops.length,data.expectedLoops);
    const locals=[],potentials=[];
    for(const loop of loops)for(const declaration of loop[1].matchAll(/\b([A-Za-z]\w*)\s*=\s*\d+/g)){
        const symbol={Name:declaration[1],DeclarationStart:loop.index+loop[0].indexOf(loop[1])+declaration.index};locals.push(symbol);
        if(!new RegExp('\\b'+symbol.Name+'\\s*(?:\\+\\+|--|[+\\-*/]?=)').test(loop[3]))potentials.push(symbol);
    }
    equal(locals.length,data.expectedLoopVariables);equal(potentials.length,data.expectedPotentialSymbols);
    equal(data.actualProducer.ActualForLoops,loops.length);equal(data.actualProducer.ActualLoopSymbols,locals.length);
    equal(data.actualProducer.PotentialSymbols,potentials);
    const mutations=data.actualProducer.PotentialMutationTargets;equal(mutations.length,data.expectedPotentialMutationOperations);
    for(const target of mutations)assert(potentials.some(symbol=>symbol.Name===target.Name&&symbol.DeclarationStart===target.DeclarationStart));
    equal(new Set(mutations.map(target=>target.Name+'@'+target.DeclarationStart)).size,data.expectedMutatedPotentialSymbols);
    equal(data.actualProducer.ActualDistinctMutatedPotentialSymbols,data.expectedMutatedPotentialSymbols);
    equal((source.match(/EventCallback\.Factory\.Create<int>/g)??[]).length,data.expectedCallbacks);
    for(const reference of data.expectedReferences){
        equal(source.slice(reference.Start,reference.Start+reference.Length),reference.Name);
        if(reference.TrackedForVariable)assert(locals.some(local=>local.Name===reference.Name));
        if(reference.Report)assert(reference.TrackedForVariable&&reference.ReachesRelatedMembership);
    }
    const candidates=data.expectedReferences.filter(reference=>reference.ReachesRelatedMembership),hits=candidates.filter(reference=>reference.TrackedForVariable);
    const misses=candidates.filter(reference=>!reference.TrackedForVariable);
    equal([data.expectedRelatedReferenceCandidates,data.expectedForVariableMembershipHits,data.expectedNonForVariableMembershipMisses],[candidates.length,hits.length,misses.length]);
    equal([data.actualProducer.ActualRelatedReferenceCandidates,data.actualProducer.ActualForVariableMembershipHits,data.actualProducer.ActualNonForVariableMembershipMisses],[candidates.length,hits.length,misses.length]);
    const shape=data.Label.split('-')[0];
    if(shape==='Cached64')equal([locals.length,hits.length,misses.length],[65,1,64]);
    if(shape==='Potential64')equal([locals.length,hits.length,misses.length],[65,65,0]);
    if(shape==='Cached')equal([hits.length,misses.length],[0,1]);
    if(shape==='Unmutated')equal([hits.length,misses.length,data.expectedBL0014],[1,0,0]);
    if(shape==='NonRender')equal(candidates.length,0);
    const expected=data.expectedReferences.filter(reference=>reference.Report).map(reference=>({
        Id:'BL0014',Severity:'Warning',Start:reference.Start,Length:reference.Length,
        Message:`For loop iterator '${reference.Name}' is used in a closure or RenderFragment/ChildContent. This can lead to unexpected runtime behavior.`
    })).sort((a,b)=>a.Start-b.Start||a.Length-b.Length);
    equal(expected.length,data.expectedBL0014);producerRecords++;return expected;
}
for(const variant of variants){
    const relative='characterization/'+variant+'-attempt1';equal(json(relative+'/execution.json').actualExitCode,0);
    const rows=states(relative+'/states');witnesses(rows,variant,variant==='current-default-class'?2:3);
    const allProducers=rows.filter(row=>row.name.includes('-producer-'));equal(allProducers.length,61);
    const producers=allProducers.filter(row=>!row.data.adjacentPreExistingArrayBoundary);equal(producers.length,60);
    equal(new Set(producers.map(row=>row.data.Label)).size,60);
    const checks=rows.filter(row=>row.name.endsWith('-characterized.json'));equal(checks.length,120);
    for(const producer of producers){
        const expected=producerProof(producer.data,relative),actual=checks.filter(check=>check.data.Label===producer.data.Label);
        equal(actual.length,2);equal(actual.map(check=>check.data.boundary).sort(),['FreshCompilation','WarmCompilation']);
        for(const check of actual){equal(check.data.passed,true);equal(check.data.diagnostics,expected);compilerChecks++;bl0014+=expected.length;}
    }
    const adjacent=only(rows,'-adjacent-current-default-difference.json');equal(adjacent.records.length,variant==='current-default-class'?0:1);
    if(adjacent.records.length)equal(adjacent.records[0].Id,'AD0001');equal(adjacent.notAnOptimizationWin,true);
}
const analysis=json('analysis.json'),allRows=[],overheadDistribution={};
let actualIterations=0,retainedResults=0,warmups=0,overheads=0;
for(let comparison=1;comparison<=3;comparison++){
    const execution=json(`measurements/comparison-${comparison}/execution.json`);
    equal(execution.actualOrder,comparison===2?['candidate-1','original']:['original','candidate-1']);equal(execution.commands.length,2);
    for(const variant of ['original','candidate-1']){
        const command=execution.commands.find(value=>value.variant===variant);equal(command.actualExitCode,0);equal(command.imageVariant,variant);
        equal([command.actualPreImageHashesVerified,command.actualPostImageHashesVerified,command.actualPreSourceHashesVerified,command.actualPostSourceHashesVerified],[98,98,31,31]);
        equal(command.originalHarnessDllPdbByteExact,true);
        const relative=`measurements/comparison-${comparison}/${variant}`,rows=states(relative+'/states'),runtime=witnesses(rows,variant,2);
        const before=rows.filter(row=>row.name.endsWith('-settings-before.json')),after=rows.filter(row=>row.name.endsWith('-settings-after.json'));
        equal([before.length,after.length],[22,22]);for(const row of [...before,...after]){equal(row.data,runtime.initialSettings);settingsRecords++;}
        const setup=rows.filter(row=>row.name.endsWith('-benchmark-ready.json'));equal(setup.length,22);
        assert(setup.every(row=>row.data.actualSetupChecks===2));equal(only(rows,'-completed.json').actualReports,22);
        const producers=rows.filter(row=>row.name.includes('-producer-'));equal(producers.length,22);
        for(const row of producers){equal(row.data.adjacentPreExistingArrayBoundary,false);producerProof(row.data,relative);}
        const exports=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(exports.length,1);
        const data=json(relative+'/results/'+exports[0]);equal(data.Benchmarks.length,22);
        equal(new Set(data.Benchmarks.map(row=>row.Parameters)).size,22);
        const profile=analysis.profiles.find(row=>row.comparison===comparison&&row.variant===variant);assert(profile);
        equal(sha(fs.readFileSync(file(relative+'/results/'+exports[0]))),profile.fullExportSha256);
        const parts=text(relative+'/console.log').split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,22);
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}, Boundary=${parameters.Boundary}]`));assert(part);
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
            const recorded=profile.rows.find(row=>row.shape===parameters.Shape&&row.boundary===parameters.Boundary);assert(recorded);
            equal(recorded.rawActual,actual);equal(recorded.retainedResult,result);equal(recorded.warmup,warmup);equal(recorded.overheadActual,overhead);
            near(recorded.reportedMeanNs,calculatedMean);near(recorded.reportedSdNs,Math.sqrt(variance));near(recorded.allEightUnfilteredActualMeanNs,mean(raw));
            equal(recorded.allocatedProcessBytesPerOperation,benchmark.Memory.BytesAllocatedPerOperation);
            allRows.push({...recorded});actualIterations+=actual.length;retainedResults+=result.length;warmups+=warmup.length;overheads+=overhead.length;
        }
    }
}
for(const record of analysis.cases){
    equal(record.comparisons.map(row=>row.comparison),[1,2,3]);
    for(const comparison of record.comparisons){
        const before=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='original'&&row.shape===record.shape&&row.boundary===record.boundary);
        const after=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='candidate-1'&&row.shape===record.shape&&row.boundary===record.boundary);
        near(comparison.reportedTimeRatio,after.reportedMeanNs/before.reportedMeanNs);
        near(comparison.allEightActualTimeRatio,after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs);
        near(comparison.allocatedChangePercent,100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1));
    }
}
equal(analysis.cases.length,22);equal(analysis.actualReports,132);equal(analysis.originalCasesPerProfile,[22,22,22]);
equal(analysis.candidateCasesPerProfile,[22,22,22]);equal(analysis.harnessVersionsMeasured,1);
const select=names=>analysis.cases.filter(row=>names.includes(row.shape)).flatMap(row=>row.comparisons);
const miss=select(['Cached64']),potential=select(['Potential16','Potential64']),promotion=select(['Promoted16','Promoted64']);
equal(miss.length,6);assert(miss.every(row=>row.reportedTimeRatio<1&&row.allEightActualTimeRatio<1&&row.allocatedChangePercent<0));
equal(potential.filter(row=>row.reportedTimeRatio>1).length,11);assert(potential.every(row=>row.allocatedChangePercent<0));
equal(promotion.filter(row=>row.allocatedChangePercent>0).length,8);
for(const runtime of runtimes)for(const key of ['harnessSha256','componentsSha256','compilerSha256','corelibSha256','initialSettings'])equal(runtime[key],runtimes[0][key]);
const budget=json('measurement-budget.json');equal([budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.closed],[3,3,3,true]);
const evaluation=json('final-evaluation.json');equal(evaluation.disposition,'no-gain-pending-audit');equal(evaluation.performancePrJustified,false);
const memory=json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))),memory.source_sha256);
for(const manifest of manifests.values())equal(manifest.files.find(row=>row.relativePath==='BenchmarkDotNet.dll').sha256,memory.currentMeasuredBdnDllSha256);
if(live){
    const working=fs.readFileSync(String.raw`C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`);
    equal(sha(working),patch.candidateSourceSha256);
    const status=spawnSync('git',['--no-pager','diff','--name-only'],{cwd:String.raw`C:\src\aspnetcore`});equal(status.status,0);
    equal(status.stdout.toString().trim().replaceAll('/','\\'),ownerRelative);
}
if(fs.existsSync(file('authoritative-copy-manifest.json'))){
    const copies=json('authoritative-copy-manifest.json');equal(new Set(copies.map(row=>row.destination)).size,copies.length);
    for(const copy of copies){const bytes=fs.readFileSync(file(copy.destination));equal(bytes.length,copy.bytes);equal(sha(bytes),copy.sha256);}
}
const report={candidate:'F006',disposition:'validated',recommendedCampaignDisposition:'no-gain',qualification:evaluation.qualification,
    performancePrJustified:false,actualPublishedDispositionStillRequiresReceipt:true,noLocalBenefitAnywhereClaimed:false,
    sourceComparisons:3,originalProfiles:3,candidateProfiles:3,benchmarkOutcomes:132,actualWorkloadIterations:actualIterations,
    retainedResults,filteredUpperSamples:actualIterations-retainedResults,actualWarmups:warmups,actualOverheadIterations:overheads,overheadCountDistribution:overheadDistribution,
    sourceTriples:7,wholeDefaultEquivalentFiles:2,defaultReferencedPrerequisiteChecks:10,wholeDefaultIntegrationClaimed:false,
    existingOwningTestRows:testRows,owningTestSkips:0,actualCompilerChecks:compilerChecks,actualBL0014Observations:bl0014,
    normalMembershipProducerRecordsAudited:producerRecords,pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,capturedSettingsRecords:settingsRecords,
    frozenImageVariants:3,filesPerImage:98,sourceSnapshotsVerified:sourceFiles,candidatePatchChangedExistingLines:5,
    exactMeasuredCandidateSourcePresentDuringAudit:true,comparisonBudgetClosed:true,sourceCandidateShapes:1,harnessVersionsMeasured:1,
    casesPerRoleByComparison:[22,22,22],exactHarnessControlledComparisons:3,controlledComparisonIds:[1,2,3],exploratoryDifferentHarnessComparisonIds:[],
    controlledBenchmarkOutcomes:132,all96NonownerImageBytesIdentical:true,cached64LowerTimeAndProcesswideAllocationOutcomes:6,
    cached64MinimumBdnReductionPercent:100*(1-Math.max(...miss.map(row=>row.reportedTimeRatio))),
    cached64MaximumBdnReductionPercent:100*(1-Math.min(...miss.map(row=>row.reportedTimeRatio))),
    potentialCasesSlowerBdnMean:11,potentialCasesLowerProcessBytes:12,promotionCasesHigherProcessBytes:8,
    maximumCvPercent:Math.max(...allRows.map(row=>100*row.reportedSdNs/row.reportedMeanNs)),
    processWideMemoryNotIsolatedOwnerAllocation:true,confidenceCriticalValuesIndependentlyComputed:false,
    explicitlyAdaptedSourcePatternsFrom:'F005-reproduce-analysis.mjs;F005 data and findings not reused.'};
equal([actualIterations,retainedResults,warmups,overheads],[1056,1014,396,2635]);
equal([testRows,compilerChecks,bl0014,pdbBindings,pdbDocuments,settingsRecords,sourceFiles,producerRecords],[40,360,4248,20,38,264,93,312]);
assert(Number.isFinite(report.maximumCvPercent));
if(verify){
    const old=json('measurement-audit.json');for(const[key,value]of Object.entries(report))equal(old[key],value);
}else{
    assert(live);assert(!fs.existsSync(file('measurement-audit.json')));
    fs.writeFileSync(file('measurement-audit.json'),JSON.stringify({...report,liveImageFilesRehashed:imageFiles,
        completeMetadataSdkOrNativeRuntimeInventoryClaimed:false,actualLiveAuditPassed:true},null,2)+'\n');
}
console.log(`F006 ${live?'live':'portable'} independent audit passed:3 exact-harness owner pairs/132 reports/1056 raw/1014 retained/396 warmups/2635 actual overheads;40 tests,360 compiler checks/4248 warnings,312 normal producer proofs,20 PE-PDB bindings/38 documents,264 unchanged settings;${live?imageFiles+' physical image files rehashed':'omitted binaries not rehashed'}. Conservative no-gain,not zero local benefits;all positive/adverse evidence retained,no performance PR justified.`);
