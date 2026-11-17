import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F005'):path.resolve(supplied);
const file=relative=>path.join(root,...relative.split(/[\\/]/));
const text=relative=>fs.readFileSync(file(relative),'utf8').replace(/^\uFEFF/,'');
const json=relative=>JSON.parse(text(relative));
const sha=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const canonical=value=>value.replaceAll('\r\n','\n');
const basename=value=>value.split(/[\\/]/).at(-1);
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
for(const [before,after] of [
    ['public List<ILocalSymbol> PotentialIterators { get; private set; } = new();','public HashSet<ILocalSymbol>? PotentialIterators { get; private set; }'],
    ['return target is not null && PotentialIterators.Any(existing => SymbolEqualityComparer.Default.Equals(existing, target));','return target is not null && (PotentialIterators?.Contains(target) ?? false);'],
    ['PotentialIterators.Add(potentialIterator);','(PotentialIterators ??= new(SymbolEqualityComparer.Default)).Add(potentialIterator);'],
    ['PotentialIterators = PotentialIterators.Where(name => !SymbolEqualityComparer.Default.Equals(name, potentialIterator)).ToList();','PotentialIterators?.Remove(potentialIterator);']
]){
    const lines=expected.split('\n'),matches=lines.map((line,index)=>line.trim()===before?index:-1).filter(index=>index>=0);
    equal(matches.length,1);lines[matches[0]]=lines[matches[0]].replace(before,after);expected=lines.join('\n');
}
equal(candidate,expected);
const investigation=json('current-source-investigation.json');equal(investigation.scopedSourceFiles,7);equal(investigation.currentDefaultEquivalentFiles,2);
for(const source of investigation.sources){
    for(const [directory,key] of [['baseline-canonical','baselineSha256'],['current-default-canonical','currentDefaultSha256'],['producer-source','workingSha256']])
        equal(sha(fs.readFileSync(file(directory+'/'+source.file))),source[key]);
    equal(canonical(text('baseline-canonical/'+source.file)),canonical(text('producer-source/'+source.file)));
}
const defaultOwner=canonical(text('current-default-canonical/'+ownerRelative));
equal(defaultOwner,original.replace('conversionOperation.Operand.Type.ContainingNamespace.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal)',
    'conversionOperation.Operand.Type.ContainingNamespace?.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal) == true'));
const stateMarker='    private sealed class ForLoopAnalyzerState';
equal(original.slice(original.indexOf(stateMarker)),defaultOwner.slice(defaultOwner.indexOf(stateMarker)));
equal(sha(Buffer.from(original.slice(original.indexOf(stateMarker)))),investigation.selectedMembershipStateSha256);
const scope=json('current-default-class-probe-attempt1/scope.json');equal(scope.scopePrerequisites.length,10);
assert(scope.scopePrerequisites.every(row=>row.canonicalEqual));equal(scope.wholeDefaultAssemblyOrRepositoryIntegration,false);
equal(scope.originalOptionalExtensionFileExists,false);
for(const relative of ['build/original-attempt1/execution.json','build/candidate-1-attempt1/execution.json','build/small-controls-attempt1/execution.json'])
    equal(json(relative).actualExitCode,0);
assert(json('current-default-class-probe-attempt1/execution.json').every(command=>command.actualExitCode===0));
equal(json('observed-inspection-error.json').observedActualExitCode,1);
equal(json('observed-inspection-error.json').measurementRerunForInspectionError,false);
const correction=json('comparison-1-decision.json');equal(correction.budgetUsed,1);equal(correction.budgetMaximum,3);
equal(correction.candidateSourceChangedAfterComparison,false);equal(correction.rawSuccessfulEvidenceOverwrittenOrRerun,false);
let imageFiles=0,sourceFiles=0,pdbBindings=0,pdbDocuments=0,testRows=0,compilerChecks=0,bl0014=0,settingsRecords=0;
const manifests=new Map();
const variants=['original','candidate-1','current-default-class','original-small-controls','candidate-1-small-controls'];
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
for(const suffix of ['','-small-controls']){
    const differences=manifests.get('original'+suffix).files.filter(row=>row.sha256!==manifestFile('candidate-1'+suffix,row.relativePath).sha256)
        .map(row=>row.relativePath).sort();
    equal(differences,(suffix?['Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb']:
        ['AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb','Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb']).sort());
    for(const name of ['AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb'])
        equal(manifestFile('original'+suffix,name).sha256===manifestFile('candidate-1'+suffix,name).sha256,Boolean(suffix));
}
for(const role of ['original','candidate-1']){
    const updated=manifests.get(role+'-small-controls');equal(updated.allNonHarnessImageBytesUnchanged,true);
    equal(updated.compilerSampleBytesUnchanged,true);equal(updated.newExistingTestExecutions,0);
    for(const row of updated.files.filter(row=>!['AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb'].includes(row.relativePath)))
        equal(row.sha256,manifestFile(role,row.relativePath).sha256);
    equal(text('frozen-source/'+role+'/harness/CompilerSamples.cs'),text('frozen-source/'+role+'-small-controls/harness/CompilerSamples.cs'));
    equal(text('frozen-source/'+role+'/owner/ForLoopIteratorInClosureAnalyzer.cs'),text('frozen-source/'+role+'-small-controls/owner/ForLoopIteratorInClosureAnalyzer.cs'));
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
        equal([row[0].method,row[0].executionId,row[0].duration,row[0].outcome],
            [definition[0].method.name,result.executionId,result.duration,result.outcome]);testRows++;
    }
    equal(observed.sort(),names.sort());equal(audit.passed,20);equal(audit.skipped,0);
    equal(audit.binaryHashes[0].sha256,manifests.get(variant).ownerSha256);
    assert(json('tests/'+variant+'/execution.json').commands.every(command=>command.actualExitCode===0));
}
function witnesses(rows,variant){
    for(const record of rows.filter(row=>row.name.includes('-source-pdb-'))){
        const data=record.data;equal(data.actualPePdbBindingMatched,true);equal(data.codeViewGuid,data.pdbGuid);pdbBindings++;
        const assembly=record.name.slice(record.name.indexOf('-source-pdb-')+12,-5)+'.dll';
        for(const document of data.documents){
            const name=basename(document.source),directory=name==='ForLoopIteratorInClosureAnalyzerTest.cs'?'test':
                ['Program.cs','CompilerSamples.cs'].includes(name)?'harness':'owner';
            const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+directory+'/'+name));
            const algorithm=document.algorithm.toLowerCase()==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':
                document.algorithm.toLowerCase()==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
            assert(algorithm);equal(sha(bytes,algorithm),document.checksum);equal(sha(bytes),document.sha256);pdbDocuments++;
        }
        if(live){
            const location=assembly.includes('.Tests.dll')?'tests/'+variant.replace('-small-controls','')+'/test-image/'+assembly:'binaries/'+variant+'/'+assembly;
            equal(sha(fs.readFileSync(file(location))),data.assemblySha256);
            equal(sha(fs.readFileSync(file(location.replace(/\.dll$/,'.pdb')))),data.pdbSha256);
        }
    }
    const runtime=only(rows,'-runtime.json');
    equal(runtime.ownerSha256,manifests.get(variant).ownerSha256);equal(runtime.language,'CSharp13');equal(runtime.serverGc,true);
    assert(runtime.compilerVersion.startsWith('5.11.0-1.26420.103'));
    assert(runtime.ownerReferences.some(name=>name.startsWith('Microsoft.CodeAnalysis, Version=3.3.0.0')));
    equal(runtime.initialSettings,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});
}
for(const variant of variants){
    const relative='characterization/'+variant+'-attempt1',execution=json(relative+'/execution.json');equal(execution.actualExitCode,0);
    const rows=states(relative+'/states');witnesses(rows,variant);
    const allProducers=rows.filter(row=>row.name.includes('-producer-'));equal(allProducers.length,57);
    const producers=allProducers.filter(row=>!row.data.adjacentPreExistingArrayBoundary);equal(producers.length,56);
    const checks=rows.filter(row=>row.name.endsWith('-characterized.json'));equal(checks.length,112);
    for(const producer of producers){
        const data=producer.data,input='inputs/'+data.Label+'/'+(data.Label.includes('-generated')?'Sample.g.cs':'Sample.cs');
        const bytes=fs.readFileSync(file(relative+'/'+input));equal(sha(bytes),data.inputSha256);
        equal(data.validCompilerInput,true);equal(data.language,'CSharp13');
        const source=bytes.toString('utf8');
        const loops=[...source.matchAll(/for \(int ([^;]+); ([^;]+); ([^)]*)\)/g)];
        equal(loops.length,data.expectedLoops);
        const locals=[],potentials=[];
        for(const loop of loops){
            for(const declaration of loop[1].matchAll(/\b([A-Za-z]\w*)\s*=\s*\d+/g)){
                const symbol={Name:declaration[1],DeclarationStart:loop.index+loop[0].indexOf(loop[1])+declaration.index};
                locals.push(symbol);
                if(!new RegExp('\\b'+symbol.Name+'\\s*(?:\\+\\+|--|[+\\-*/]?=)').test(loop[3]))potentials.push(symbol);
            }
        }
        equal(locals.length,data.expectedLoopVariables);equal(potentials.length,data.expectedPotentialSymbols);
        equal(data.actualProducer.ActualForLoops,loops.length);equal(data.actualProducer.ActualLoopSymbols,locals.length);
        equal(data.actualProducer.PotentialSymbols,potentials);
        const mutations=data.actualProducer.PotentialMutationTargets;
        equal(mutations.length,data.expectedPotentialMutationOperations);
        for(const target of mutations)assert(potentials.some(symbol=>symbol.Name===target.Name&&symbol.DeclarationStart===target.DeclarationStart));
        equal(new Set(mutations.map(target=>target.Name+'@'+target.DeclarationStart)).size,data.expectedMutatedPotentialSymbols);
        equal(data.actualProducer.ActualDistinctMutatedPotentialSymbols,data.expectedMutatedPotentialSymbols);
        equal((source.match(/EventCallback\.Factory\.Create<int>/g)??[]).length,data.expectedCallbacks);
        for(const reference of data.expectedReferences)equal(source.slice(reference.Start,reference.Start+reference.Length),reference.Name);
        const expected=data.expectedReferences.filter(reference=>reference.Report).map(reference=>({
            Id:'BL0014',Severity:'Warning',Start:reference.Start,Length:reference.Length,
            Message:`For loop iterator '${reference.Name}' is used in a closure or RenderFragment/ChildContent. This can lead to unexpected runtime behavior.`
        })).sort((a,b)=>a.Start-b.Start||a.Length-b.Length);
        equal(expected.length,data.expectedBL0014);
        const actual=checks.filter(check=>check.data.Label===data.Label);equal(actual.length,2);
        equal(actual.map(check=>check.data.boundary).sort(),['FreshCompilation','WarmCompilation']);
        for(const check of actual){equal(check.data.passed,true);equal(check.data.diagnostics,expected);compilerChecks++;bl0014+=expected.length;}
    }
    const adjacent=only(rows,'-adjacent-current-default-difference.json');
    equal(adjacent.records.length,variant==='current-default-class'?0:1);
    if(adjacent.records.length)equal(adjacent.records[0].Id,'AD0001');
    equal(adjacent.notAnOptimizationWin,true);
}
const analysis=json('analysis.json'),allRows=[];
let actualIterations=0,retainedResults=0,warmups=0,overheads=0;
for(let comparison=1;comparison<=3;comparison++){
    const execution=json(`measurements/comparison-${comparison}/execution.json`);
    equal(execution.actualOrder,comparison===2?['candidate-1','original']:['original','candidate-1']);equal(execution.commands.length,2);
    for(const variant of ['original','candidate-1']){
        const expectedReports=comparison===1?14:18,imageVariant=comparison===1?variant:variant+'-small-controls';
        const command=execution.commands.find(value=>value.variant===variant);equal(command.actualExitCode,0);
        equal(command.imageVariant??variant,imageVariant);
        equal([command.actualPreImageHashesVerified,command.actualPostImageHashesVerified],[98,98]);
        const relative=`measurements/comparison-${comparison}/${variant}`,rows=states(relative+'/states');witnesses(rows,imageVariant);
        const before=rows.filter(row=>row.name.endsWith('-settings-before.json')),after=rows.filter(row=>row.name.endsWith('-settings-after.json'));
        equal([before.length,after.length],[expectedReports,expectedReports]);
        for(const row of [...before,...after]){equal(row.data,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});settingsRecords++;}
        const setup=rows.filter(row=>row.name.endsWith('-benchmark-ready.json'));equal(setup.length,expectedReports);
        assert(setup.every(row=>row.data.actualSetupChecks===2));equal(only(rows,'-completed.json').actualReports,expectedReports);
        const files=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(files.length,1);
        const data=json(relative+'/results/'+files[0]);equal(data.Benchmarks.length,expectedReports);
        const parts=text(relative+'/console.log').split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,expectedReports);
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}, Boundary=${parameters.Boundary}]`));assert(part);
            assert(part.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000')&&part.includes('Toolchain=SettingsPreservingEmitToolchain')
                &&part.includes('IterationTime=100.0000 ms')&&part.includes('RunStrategy=Throughput'));
            const parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const actual=parse('WorkloadActual'),result=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overhead=parse('OverheadActual');
            equal([actual.length,warmup.length,overhead.length],[8,3,20]);
            const normalized=result.map(row=>row.ns/row.operations),raw=actual.map(row=>row.ns/row.operations);
            const compensation=quantile(overhead.map(row=>row.ns/row.operations),0.5);
            const remaining=actual.map(row=>row.ns/row.operations-compensation);
            for(const value of normalized){
                const index=remaining.findIndex(other=>Math.abs(value-other)<0.001);assert(index>=0);remaining.splice(index,1);
            }
            assert(remaining.every(value=>value>=Math.max(...normalized)-0.001));
            const statistics=benchmark.Statistics;equal(statistics.N,normalized.length);
            equal([...statistics.OriginalValues].sort((a,b)=>a-b),[...normalized].sort((a,b)=>a-b));
            const calculatedMean=mean(normalized),variance=normalized.reduce((sum,value)=>sum+(value-calculatedMean)**2,0)/(normalized.length-1);
            for(const [key,value] of Object.entries({Mean:calculatedMean,Variance:variance,StandardDeviation:Math.sqrt(variance),
                StandardError:Math.sqrt(variance/normalized.length),Min:Math.min(...normalized),Max:Math.max(...normalized),
                Q1:quantile(normalized,0.25),Median:quantile(normalized,0.5),Q3:quantile(normalized,0.75)}))near(statistics[key],value);
            near(statistics.ConfidenceInterval.Lower,statistics.Mean-statistics.ConfidenceInterval.Margin);
            near(statistics.ConfidenceInterval.Upper,statistics.Mean+statistics.ConfidenceInterval.Margin);
            equal(benchmark.Measurements.length,result.length);
            benchmark.Measurements.forEach((value,index)=>{equal(value.IterationMode,'Workload');equal(value.IterationStage,'Result');
                equal(value.Operations,result[index].operations);near(value.Nanoseconds,result[index].ns);});
            const gc=part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);assert(gc);
            const [g0,g1,g2,bytes,operations]=gc.slice(1).map(Number);
            equal([benchmark.Memory.Gen0Collections,benchmark.Memory.Gen1Collections,benchmark.Memory.Gen2Collections,benchmark.Memory.TotalOperations],[g0,g1,g2,operations]);
            equal(benchmark.Memory.BytesAllocatedPerOperation,roundEven(bytes/operations));
            const recorded=analysis.profiles.find(row=>row.comparison===comparison&&row.variant===variant).rows
                .find(row=>row.shape===parameters.Shape&&row.boundary===parameters.Boundary);assert(recorded);
            equal(recorded.rawActual,actual);equal(recorded.retainedResult,result);equal(recorded.warmup,warmup);equal(recorded.overheadActual,overhead);
            near(recorded.reportedMeanNs,calculatedMean);near(recorded.allEightUnfilteredActualMeanNs,mean(raw));
            equal(recorded.allocatedProcessBytesPerOperation,benchmark.Memory.BytesAllocatedPerOperation);
            allRows.push({...recorded});actualIterations+=actual.length;retainedResults+=result.length;warmups+=warmup.length;overheads+=overhead.length;
        }
    }
}
for(const record of analysis.cases)for(const comparison of record.comparisons){
    const before=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='original'&&row.shape===record.shape&&row.boundary===record.boundary);
    const after=allRows.find(row=>row.comparison===comparison.comparison&&row.variant==='candidate-1'&&row.shape===record.shape&&row.boundary===record.boundary);
    near(comparison.reportedTimeRatio,after.reportedMeanNs/before.reportedMeanNs);
    near(comparison.allEightActualTimeRatio,after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs);
    near(comparison.allocatedChangePercent,100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1));
}
equal(analysis.cases.length,18);equal(analysis.actualReports,100);equal(analysis.originalCasesPerProfile,[14,18,18]);
equal(analysis.candidateCasesPerProfile,[14,18,18]);equal(analysis.harnessVersionsMeasured,2);
for(const record of analysis.cases)equal(record.comparisons.map(row=>row.comparison),['Promoted','Unmutated'].includes(record.shape)?[2,3]:[1,2,3]);
const allLarge=analysis.cases.filter(row=>row.shape==='Promoted64').flatMap(row=>row.comparisons);equal(allLarge.length,6);
assert(allLarge.every(row=>row.allocatedChangePercent<0&&row.reportedTimeRatio<1&&row.allEightActualTimeRatio<1));
const large=allLarge.filter(row=>row.comparison>1);equal(large.length,4);
const potential=analysis.cases.filter(row=>['Potential16','Potential64'].includes(row.shape)).flatMap(row=>row.comparisons);equal(potential.length,12);
assert(potential.every(row=>row.allocatedChangePercent<0));
const small=analysis.cases.filter(row=>['Promoted','Unmutated'].includes(row.shape)).flatMap(row=>row.comparisons);equal(small.length,8);
equal(small.filter(row=>row.allocatedChangePercent>0).length,4);
assert(small.filter(row=>row.comparison===3).every(row=>row.allocatedChangePercent>0));
assert(analysis.cases.filter(row=>row.shape==='NonRender').flatMap(row=>row.comparisons).every(row=>row.reportedTimeRatio>1));
assert(analysis.cases.find(row=>row.shape==='Promoted16'&&row.boundary==='FreshCompilation').comparisons.find(row=>row.comparison===3).allocatedChangePercent>0);
const budget=json('measurement-budget.json');equal([budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.closed],[3,3,3,true]);
const evaluation=json('final-evaluation.json');equal(evaluation.disposition,'qualified-proposal-pending-audit');
equal(evaluation.shippingProposalJustifiedOnlyAfterIndependentAudit,true);equal(evaluation.performancePrCreated,false);
const memory=json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))),memory.source_sha256);
for(const manifest of manifests.values())equal(manifest.files.find(row=>row.relativePath==='BenchmarkDotNet.dll').sha256,memory.currentMeasuredBdnDllSha256);
if(live){
    const working=fs.readFileSync(String.raw`C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`);
    equal(sha(working),json('source-state.json').measuredCandidateSha256);
    const status=spawnSync('git',['--no-pager','diff','--name-only'],{cwd:String.raw`C:\src\aspnetcore`});equal(status.status,0);
    equal(status.stdout.toString().trim().replaceAll('/','\\'),ownerRelative);
}
if(fs.existsSync(file('authoritative-copy-manifest.json'))){
    const copies=json('authoritative-copy-manifest.json');equal(new Set(copies.map(row=>row.destination)).size,copies.length);
    for(const copy of copies){const bytes=fs.readFileSync(file(copy.destination));equal(bytes.length,copy.bytes);equal(sha(bytes),copy.sha256);}
}
const report={candidate:'F005',disposition:'validated',qualification:evaluation.qualification,performancePrJustified:true,
    qualifiedNotMergeReady:true,causalGlobalSpeedupClaimed:false,actualForkDraftStillRequiresPublication:true,
    sourceComparisons:3,originalProfiles:3,candidateProfiles:3,benchmarkOutcomes:100,actualWorkloadIterations:actualIterations,
    retainedResults,filteredUpperSamples:actualIterations-retainedResults,actualWarmups:warmups,actualOverheadIterations:overheads,
    sourceTriples:7,wholeDefaultEquivalentFiles:2,defaultReferencedPrerequisiteChecks:10,wholeDefaultIntegrationClaimed:false,
    existingOwningTestRows:testRows,owningTestSkips:0,actualCompilerChecks:compilerChecks,actualBL0014Observations:bl0014,
    pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,capturedSettingsRecords:settingsRecords,
    frozenImageVariants:5,filesPerImage:98,sourceSnapshotsVerified:sourceFiles,candidatePatchChangedExistingLines:4,
    exactMeasuredCandidateSourceRetained:true,comparisonBudgetClosed:true,sourceCandidateShapes:1,
    harnessVersionsMeasured:2,casesPerRoleByComparison:[14,18,18],singlePotentialTargetTimedOnlyComparisons2And3:true,
    exactHarnessControlledComparisons:2,controlledComparisonIds:[2,3],exploratoryDifferentHarnessComparisonIds:[1],
    controlledBenchmarkOutcomes:72,exploratoryBenchmarkOutcomes:28,initialHarnessBinaryDriftRetainedAndNotOwnerIsolation:true,
    largePromotionLowerTimeAndProcesswideAllocationOutcomes:4,largePromotionMinimumAllocatedReductionPercent:-Math.max(...large.map(row=>row.allocatedChangePercent)),
    largePromotionMaximumAllocatedReductionPercent:-Math.min(...large.map(row=>row.allocatedChangePercent)),
    singlePotentialHeapIncreasesRetained:4,nonRenderSlowerBdnMeanOutcomesRetained:6,
    maximumCvPercent:Math.max(...allRows.map(row=>100*row.reportedSdNs/row.reportedMeanNs)),
    processWideMemoryNotIsolatedOwnerAllocation:true,confidenceCriticalValuesIndependentlyComputed:false};
equal([actualIterations,retainedResults,warmups,overheads],[800,765,300,2000]);
equal([testRows,compilerChecks,bl0014,pdbBindings,pdbDocuments,settingsRecords,sourceFiles],[40,560,7040,26,48,200,155]);
if(verify){
    const old=json('measurement-audit.json');for(const [key,value]of Object.entries(report))equal(old[key],value);
}else{
    assert(live);fs.writeFileSync(file('measurement-audit.json'),JSON.stringify({...report,liveImageFilesRehashed:imageFiles,
        completeMetadataSdkOrNativeRuntimeInventoryClaimed:false,actualLiveAuditPassed:true},null,2)+'\n');
}
console.log(`F005 ${live?'live':'portable'} independent audit passed:3 budgeted pairs(2 exact-harness controlled,1 exploratory)/100 reports/800 raw/765 retained/300 warmups/2000 overheads;40 tests,560 compiler checks,26 PE-PDB bindings/48 documents,200 unchanged settings;${live?imageFiles+' physical image files rehashed':'omitted binaries not rehashed'}. Qualified proposal only,not merge-ready/causal global speedup;initial binary drift/small-target costs retained.`);
