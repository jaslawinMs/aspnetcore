import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const supplied=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:null;
const live=supplied===null,verify=process.argv.includes('--verify');
const root=live?path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F004'):path.resolve(supplied);
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
    ['public List<ILocalSymbol> Iterators { get; } = new();','public HashSet<ILocalSymbol>? Iterators { get; private set; }'],
    ['return Iterators.Any(existing => SymbolEqualityComparer.Default.Equals(existing, target));','return Iterators?.Contains(target) ?? false;'],
    ['Iterators.Add(iterator);','(Iterators ??= new(SymbolEqualityComparer.Default)).Add(iterator);'],
    ['Iterators.Add(potentialIterator);','(Iterators ??= new(SymbolEqualityComparer.Default)).Add(potentialIterator);']
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
const scope=json('current-default-class-probe-attempt3/scope.json');equal(scope.scopePrerequisites.length,10);
assert(scope.scopePrerequisites.every(row=>row.canonicalEqual));equal(scope.wholeDefaultAssemblyOrRepositoryIntegration,false);
equal(scope.originalOptionalExtensionFileExists,false);
equal(json('build/original-attempt1/execution.json').actualExitCode,1);
assert(text('build/original-attempt1/harness-build.log').includes('error CS1061'));
for(const relative of ['build/original-attempt2/execution.json','build/candidate-1-attempt1/execution.json'])
    equal(json(relative).actualExitCode,0);
assert(json('current-default-class-probe-attempt3/execution.json').every(command=>command.actualExitCode===0));
equal(json('observed-preparation-failures.json').length,4);
let imageFiles=0,sourceFiles=0,pdbBindings=0,pdbDocuments=0,testRows=0,compilerChecks=0,bl0014=0,settingsRecords=0;
const manifests=new Map();
for(const variant of ['original','candidate-1','current-default-class']){
    const manifest=json('manifest-'+variant+'.json');equal(manifest.files.length,98);equal(manifest.frozenSources.length,31);manifests.set(variant,manifest);
    for(const row of manifest.frozenSources){
        const bytes=fs.readFileSync(file('frozen-source/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);sourceFiles++;
    }
    if(live)for(const row of manifest.files){
        const bytes=fs.readFileSync(file('binaries/'+variant+'/'+row.relativePath));equal(bytes.length,row.bytes);equal(sha(bytes),row.sha256);imageFiles++;
    }
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
            const location=assembly.includes('.Tests.dll')?'tests/'+variant+'/test-image/'+assembly:'binaries/'+variant+'/'+assembly;
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
for(const variant of ['original','candidate-1','current-default-class']){
    const relative='characterization/'+variant+'-attempt1',execution=json(relative+'/execution.json');equal(execution.actualExitCode,0);
    const rows=states(relative+'/states');witnesses(rows,variant);
    const allProducers=rows.filter(row=>row.name.includes('-producer-'));equal(allProducers.length,37);
    const producers=allProducers.filter(row=>!row.data.adjacentPreExistingArrayBoundary);equal(producers.length,36);
    const checks=rows.filter(row=>row.name.endsWith('-characterized.json'));equal(checks.length,72);
    for(const producer of producers){
        const data=producer.data,input='inputs/'+data.Label+'/'+(data.Label.includes('-generated')?'Sample.g.cs':'Sample.cs');
        const bytes=fs.readFileSync(file(relative+'/'+input));equal(sha(bytes),data.inputSha256);
        equal(data.validCompilerInput,true);equal(data.language,'CSharp13');
        const source=bytes.toString('utf8');equal((source.match(/for \(int /g)??[]).length,data.expectedLoops);
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
        const command=execution.commands.find(value=>value.variant===variant);equal(command.actualExitCode,0);
        equal([command.actualPreImageHashesVerified,command.actualPostImageHashesVerified],[98,98]);
        const relative=`measurements/comparison-${comparison}/${variant}`,rows=states(relative+'/states');witnesses(rows,variant);
        const before=rows.filter(row=>row.name.endsWith('-settings-before.json')),after=rows.filter(row=>row.name.endsWith('-settings-after.json'));
        equal([before.length,after.length],[10,10]);
        for(const row of [...before,...after]){equal(row.data,{processPriority:'Normal',threadPriority:'Normal',affinity:65535});settingsRecords++;}
        const setup=rows.filter(row=>row.name.endsWith('-benchmark-ready.json'));equal(setup.length,10);
        assert(setup.every(row=>row.data.actualSetupChecks===2));equal(only(rows,'-completed.json').actualReports,10);
        const files=fs.readdirSync(file(relative+'/results')).filter(name=>name.endsWith('full.json'));equal(files.length,1);
        const data=json(relative+'/results/'+files[0]);equal(data.Benchmarks.length,10);
        const parts=text(relative+'/console.log').split(/^\/\/ Benchmark: /m).slice(1);equal(parts.length,10);
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
const budget=json('measurement-budget.json');equal([budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.closed],[3,3,3,true]);
const evaluation=json('final-evaluation.json');equal(evaluation.disposition,'no-gain');equal(evaluation.shippingProposalJustified,false);equal(evaluation.performancePrCreated,false);
const memory=json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))),memory.source_sha256);
for(const manifest of manifests.values())equal(manifest.files.find(row=>row.relativePath==='BenchmarkDotNet.dll').sha256,memory.currentMeasuredBdnDllSha256);
if(live){
    const working=fs.readFileSync(String.raw`C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`);
    equal(sha(working),json('source-restoration.json').actualOriginalProducerSha256);
    const status=spawnSync('git',['--no-pager','diff','--name-only'],{cwd:String.raw`C:\src\aspnetcore`});equal(status.status,0);equal(status.stdout.length,0);
}
if(fs.existsSync(file('authoritative-copy-manifest.json'))){
    const copies=json('authoritative-copy-manifest.json');equal(new Set(copies.map(row=>row.destination)).size,copies.length);
    for(const copy of copies){const bytes=fs.readFileSync(file(copy.destination));equal(bytes.length,copy.bytes);equal(sha(bytes),copy.sha256);}
}
const report={candidate:'F004',disposition:'no-gain',qualification:'mixed-results-unestablished-net-benefit',performancePrJustified:false,
    sourceComparisons:3,originalProfiles:3,candidateProfiles:3,benchmarkOutcomes:60,actualWorkloadIterations:actualIterations,
    retainedResults,filteredUpperSamples:actualIterations-retainedResults,actualWarmups:warmups,actualOverheadIterations:overheads,
    sourceTriples:7,wholeDefaultEquivalentFiles:2,defaultReferencedPrerequisiteChecks:10,wholeDefaultIntegrationClaimed:false,
    existingOwningTestRows:testRows,owningTestSkips:0,actualCompilerChecks:compilerChecks,actualBL0014Observations:bl0014,
    pePdbBindings:pdbBindings,sourcePdbDocumentChecks:pdbDocuments,capturedSettingsRecords:settingsRecords,
    frozenImageVariants:3,filesPerImage:98,sourceSnapshotsVerified:sourceFiles,candidatePatchChangedExistingLines:4,
    shippingSourceRestored:true,comparisonBudgetClosed:true,sourceCandidateShapes:1,
    processWideMemoryNotIsolatedOwnerAllocation:true,confidenceCriticalValuesIndependentlyComputed:false};
equal([actualIterations,retainedResults,warmups,overheads],[480,461,180,1200]);
equal([testRows,compilerChecks,bl0014,pdbBindings,pdbDocuments,settingsRecords,sourceFiles],[40,216,55392,20,38,120,93]);
if(verify){
    const old=json('measurement-audit.json');for(const [key,value]of Object.entries(report))equal(old[key],value);
}else{
    assert(live);fs.writeFileSync(file('measurement-audit.json'),JSON.stringify({...report,liveImageFilesRehashed:imageFiles,
        completeMetadataSdkOrNativeRuntimeInventoryClaimed:false,actualLiveAuditPassed:true},null,2)+'\n');
}
console.log(`F004 ${live?'live':'portable'} independent audit passed:3 pairs/60 reports/480 raw/461 retained/180 warmups/1200 overheads;40 tests,216 compiler checks,20 PE-PDB bindings/38 documents,120 unchanged settings;${live?imageFiles+' physical image files rehashed':'omitted binaries not rehashed'}. No PR/net-win claim.`);
