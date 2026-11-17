import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F007');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
const write=(name,value)=>{assert(!fs.existsSync(path.join(run,name)),'Never overwrite extracted evidence.');fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2)+'\n');};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const budget=read('measurement-budget.json'),through=Number(process.argv[2]);
assert(Number.isInteger(through)&&through>=1&&through<=3&&through<=budget.usedComparisons);
const profiles=[],outcomes=[],completedComparisonIds=[],failedAttempts=[];
for(let comparison=1;comparison<=through;comparison++){
    const execution=read(path.join('measurements',`comparison-${comparison}`,'execution.json'));
    assert.deepEqual(execution.actualOrder,comparison===2?['candidate-1','original']:['original','candidate-1']);
    if(execution.commands.some(command=>command.actualExitCode!==0)){
        assert.equal(comparison,1);assert.equal(execution.commands.length,1);assert.equal(execution.commands[0].variant,'original');
        const directory=path.join(run,'measurements','comparison-1','original');
        const log=fs.readFileSync(path.join(directory,'console.log'),'utf8');
        assert.match(log,/System\.NullReferenceException/);assert.match(log,/AutoPerf\.ServerAdapter\.Logger/);
        assert(!/^WorkloadActual\s/m.test(log));assert(!fs.existsSync(path.join(run,'measurements','comparison-1','candidate-1')));
        const exported=fs.readdirSync(path.join(directory,'results')).filter(name=>name.endsWith('full.json'));assert.equal(exported.length,1);
        const failure=JSON.parse(fs.readFileSync(path.join(directory,'results',exported[0]),'utf8'));assert.equal(failure.Benchmarks.length,1);
        assert(!failure.Benchmarks[0].Statistics);assert.equal((failure.Benchmarks[0].Measurements??[]).length,0);
        failedAttempts.push({comparison,actualAttemptedProfiles:1,actualCandidateProfiles:0,successfulWorkloadReports:0,workloadSamples:0,
            actualExitCode:execution.commands[0].actualExitCode,budgetSlotRemainsSpent:true,
            reason:'Actual harness null-logger member reflection failed in GlobalSetup before any workload sample;raw artifacts and older image/source manifests retained. Repaired helper and all22 actual setups preflighted before slots2/3.'});
        continue;
    }
    assert.equal(execution.commands.length,2);assert(execution.commands.every(command=>command.actualExitCode===0));
    completedComparisonIds.push(comparison);
    for(const variant of ['original','candidate-1']){
        const directory=path.join(run,'measurements',`comparison-${comparison}`,variant);
        const exports=fs.readdirSync(path.join(directory,'results')).filter(name=>name.endsWith('full.json'));assert.equal(exports.length,1);
        const bytes=fs.readFileSync(path.join(directory,'results',exports[0]));
        const data=JSON.parse(bytes);assert.equal(data.Benchmarks.length,22);
        const parts=fs.readFileSync(path.join(directory,'console.log'),'utf8').split(/^\/\/ Benchmark: /m).slice(1);assert.equal(parts.length,22);
        const rows=[];
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            assert.deepEqual(Object.keys(parameters),['Shape']);
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}]`));assert(part);
            const parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const rawActual=parse('WorkloadActual'),retainedResult=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overheadActual=parse('OverheadActual');
            assert.equal(rawActual.length,8);assert.equal(warmup.length,3);assert.equal(retainedResult.length,benchmark.Statistics.N);
            assert(retainedResult.length>=5&&overheadActual.length>0);assert(rawActual.every(row=>row.operations>0));
            const row={comparison,variant,shape:parameters.Shape,
                reportedMeanNs:benchmark.Statistics.Mean,reportedSdNs:benchmark.Statistics.StandardDeviation,
                reportedRetainedN:benchmark.Statistics.N,allocatedProcessBytesPerOperation:benchmark.Memory.BytesAllocatedPerOperation,
                rawActual,retainedResult,warmup,overheadActual,allEightUnfilteredActualMeanNs:mean(rawActual.map(row=>row.ns/row.operations)),
                actualRawIterations:rawActual.length,reportedFilteredResults:retainedResult.length};
            rows.push(row);outcomes.push(row);
        }
        assert.equal(new Set(rows.map(row=>row.shape)).size,22);
        profiles.push({comparison,variant,imageVariant:variant,actualReports:22,actualExitCode:0,
            actualCount:rows.reduce((sum,row)=>sum+row.rawActual.length,0),resultCount:rows.reduce((sum,row)=>sum+row.retainedResult.length,0),
            warmupCount:rows.reduce((sum,row)=>sum+row.warmup.length,0),overheadCount:rows.reduce((sum,row)=>sum+row.overheadActual.length,0),
            fullExportSha256:sha(bytes),rows});
    }
}
const shapes=['RemoveEmpty','Remove1','Remove16','Remove100','Remove128','Remove129','Remove256','Remove1024','Remove4096','Remove16384',
    'Resume1','Resume100','Resume128','Resume129','Resume1024','Resume4096','Resume16384','DuplicateEarly129','DuplicateLast129',
    'DuplicateMiddle4096','DuplicateEarly4096','DuplicateLast4096'],cases=[];
for(const shape of shapes){
    const comparisons=[];
    for(const comparison of completedComparisonIds){
        const before=outcomes.find(row=>row.comparison===comparison&&row.variant==='original'&&row.shape===shape);
        const after=outcomes.find(row=>row.comparison===comparison&&row.variant==='candidate-1'&&row.shape===shape);
        assert(before&&after);
        comparisons.push({comparison,originalReportedMeanNs:before.reportedMeanNs,candidateReportedMeanNs:after.reportedMeanNs,
            reportedTimeRatio:after.reportedMeanNs/before.reportedMeanNs,
            originalAllEightActualMeanNs:before.allEightUnfilteredActualMeanNs,candidateAllEightActualMeanNs:after.allEightUnfilteredActualMeanNs,
            allEightActualTimeRatio:after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs,
            originalAllocatedProcessBytes:before.allocatedProcessBytesPerOperation,candidateAllocatedProcessBytes:after.allocatedProcessBytesPerOperation,
            allocatedChangePercent:100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1),
            originalCvPercent:100*before.reportedSdNs/before.reportedMeanNs,candidateCvPercent:100*after.reportedSdNs/after.reportedMeanNs});
    }
    cases.push({shape,measuredComparisonIds:comparisons.map(row=>row.comparison),comparisons});
}
const analysis={candidate:'F007',actualComparisonSlotsUsed:through,actualComparisons:completedComparisonIds.length,actualProfiles:profiles.length,
    actualAttemptedProfiles:profiles.length+failedAttempts.reduce((sum,row)=>sum+row.actualAttemptedProfiles,0),
    actualReports:outcomes.length,completedComparisonIds,failedAttempts,
    actualWorkloadIterations:profiles.reduce((sum,row)=>sum+row.actualCount,0),actualRetainedResults:profiles.reduce((sum,row)=>sum+row.resultCount,0),
    actualWarmups:profiles.reduce((sum,row)=>sum+row.warmupCount,0),actualOverheadIterations:profiles.reduce((sum,row)=>sum+row.overheadCount,0),
    harnessVersionsWithWorkloadSamples:1,harnessVersionsInAttemptedTimingProfiles:2,
    originalCasesPerProfile:Array(completedComparisonIds.length).fill(22),candidateCasesPerProfile:Array(completedComparisonIds.length).fill(22),
    exactHarnessControlledComparisonIds:completedComparisonIds,
    statisticsPolicy:'BDN default upper-outlier filtering;all8 raw actual samples,warmups,actual overheads and GC lines retained. Both BDN-reported and all-eight unfiltered actual means/ratios shown;not independently recomputed confidence critical values.',
    allocationBoundary:'BDN0.13 process-wide allocated bytes/op on pinned net12 host,including parser/process workers;not isolated private-set allocation.',
    caseCoverage:'Every completed comparison uses one final compiled22-case harness,full actual JSON owner;exact original harness DLL/PDB and every144 nonowner byte retained across146-file role images. Failed first timing slot used older harness and produced no samples;all earlier sources/images and freeze failures preserved.',
    productionBoundary:'Default simultaneous-root limit100 is not a proven batch-size bound. Above100 are boundary/scaling stress,not typical-app throughput evidence. Full marker/parameter/state conversion characterized untimed,not timed;no browser/circuit-dispatch or whole-main integration claim.',
    explicitlyAdaptedSourcePatternsFrom:'F006-extract-analysis.mjs;no finalized F006 timings reused.',cases,profiles};
write(`analysis-through-comparison-${through}.json`,analysis);
if(through===3){
    assert.deepEqual(completedComparisonIds,[2,3]);assert.equal(failedAttempts.length,1);
    assert.equal(budget.originalProfiles,3);assert.equal(budget.candidateProfiles,2);assert.equal(budget.completedProfiles,4);assert.equal(budget.closed,false);
    write('analysis.json',analysis);write('measurement-budget-before-close.json',budget);
    budget.closed=true;budget.closedUtc=new Date().toISOString();budget.harnessVersionsWithWorkloadSamples=1;
    budget.reason='Maximum3 comparison slots spent:slot1 failed actual original GlobalSetup with no samples;slots2/3 completed with one fixed22-case harness/owner-only images. No extra timing,leaf profile or rerun authorized for F007.';
    fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify(budget,null,2)+'\n');
}
for(const record of cases){
    const values=selector=>record.comparisons.map(row=>`c${row.comparison}:${selector(row)}`).join('/');
    console.log(`${record.shape.padEnd(22)} BDN:${values(row=>row.reportedTimeRatio.toFixed(3))} raw8:${values(row=>row.allEightActualTimeRatio.toFixed(3))} alloc%:${values(row=>row.allocatedChangePercent.toFixed(2))} bytes:${values(row=>row.originalAllocatedProcessBytes+'->'+row.candidateAllocatedProcessBytes)} CV%:${values(row=>row.originalCvPercent.toFixed(1)+'/'+row.candidateCvPercent.toFixed(1))}`);
}
console.log(`F007 budget slots:${through}/3,completed comparisons:${completedComparisonIds.join(',')},failed/no-sample slot:1;${outcomes.length} successful reports. All positive/adverse data retained;independent audit/disposition not yet established.`);
