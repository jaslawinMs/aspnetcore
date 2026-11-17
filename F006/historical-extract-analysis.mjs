import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F006');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
const write=(name,value)=>{assert(!fs.existsSync(path.join(run,name)),'Never overwrite actual extracted evidence.');fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2)+'\n');};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const budget=read('measurement-budget.json'),through=Number(process.argv[2]);
assert(Number.isInteger(through)&&through>=1&&through<=3&&through<=budget.usedComparisons);
const profiles=[],outcomes=[];
for(let comparison=1;comparison<=through;comparison++){
    const execution=read(path.join('measurements',`comparison-${comparison}`,'execution.json'));
    assert.deepEqual(execution.actualOrder,comparison===2?['candidate-1','original']:['original','candidate-1']);
    assert.equal(execution.commands.length,2);assert(execution.commands.every(command=>command.actualExitCode===0));
    for(const variant of ['original','candidate-1']){
        const directory=path.join(run,'measurements',`comparison-${comparison}`,variant);
        const exports=fs.readdirSync(path.join(directory,'results')).filter(name=>name.endsWith('full.json'));assert.equal(exports.length,1);
        const bytes=fs.readFileSync(path.join(directory,'results',exports[0]));
        const data=JSON.parse(bytes);assert.equal(data.Benchmarks.length,22);
        const parts=fs.readFileSync(path.join(directory,'console.log'),'utf8').split(/^\/\/ Benchmark: /m).slice(1);assert.equal(parts.length,22);
        const rows=[];
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}, Boundary=${parameters.Boundary}]`));assert(part);
            const parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const rawActual=parse('WorkloadActual'),retainedResult=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overheadActual=parse('OverheadActual');
            assert.equal(rawActual.length,8);assert.equal(warmup.length,3);assert.equal(retainedResult.length,benchmark.Statistics.N);
            assert(retainedResult.length>=5&&overheadActual.length>0);assert(rawActual.every(row=>row.operations>0));
            const row={comparison,variant,shape:parameters.Shape,boundary:parameters.Boundary,
                reportedMeanNs:benchmark.Statistics.Mean,reportedSdNs:benchmark.Statistics.StandardDeviation,
                reportedRetainedN:benchmark.Statistics.N,allocatedProcessBytesPerOperation:benchmark.Memory.BytesAllocatedPerOperation,
                rawActual,retainedResult,warmup,overheadActual,allEightUnfilteredActualMeanNs:mean(rawActual.map(row=>row.ns/row.operations)),
                actualRawIterations:rawActual.length,reportedFilteredResults:retainedResult.length};
            rows.push(row);outcomes.push(row);
        }
        assert.equal(new Set(rows.map(row=>row.shape+'|'+row.boundary)).size,22);
        profiles.push({comparison,variant,imageVariant:variant,actualReports:22,actualExitCode:0,
            actualCount:rows.reduce((sum,row)=>sum+row.rawActual.length,0),resultCount:rows.reduce((sum,row)=>sum+row.retainedResult.length,0),
            warmupCount:rows.reduce((sum,row)=>sum+row.warmup.length,0),overheadCount:rows.reduce((sum,row)=>sum+row.overheadActual.length,0),
            fullExportSha256:sha(bytes),rows});
    }
}
const shapes=['NoLoops','OneIterator','Potential16','Potential64','Promoted16','Promoted64','NonRender','Promoted','Unmutated','Cached','Cached64'],cases=[];
for(const shape of shapes)for(const boundary of ['WarmCompilation','FreshCompilation']){
    const comparisons=[];
    for(let comparison=1;comparison<=through;comparison++){
        const before=outcomes.find(row=>row.comparison===comparison&&row.variant==='original'&&row.shape===shape&&row.boundary===boundary);
        const after=outcomes.find(row=>row.comparison===comparison&&row.variant==='candidate-1'&&row.shape===shape&&row.boundary===boundary);
        assert(before&&after);
        comparisons.push({comparison,originalReportedMeanNs:before.reportedMeanNs,candidateReportedMeanNs:after.reportedMeanNs,
            reportedTimeRatio:after.reportedMeanNs/before.reportedMeanNs,
            originalAllEightActualMeanNs:before.allEightUnfilteredActualMeanNs,candidateAllEightActualMeanNs:after.allEightUnfilteredActualMeanNs,
            allEightActualTimeRatio:after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs,
            originalAllocatedProcessBytes:before.allocatedProcessBytesPerOperation,candidateAllocatedProcessBytes:after.allocatedProcessBytesPerOperation,
            allocatedChangePercent:100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1),
            originalCvPercent:100*before.reportedSdNs/before.reportedMeanNs,candidateCvPercent:100*after.reportedSdNs/after.reportedMeanNs});
    }
    cases.push({shape,boundary,measuredComparisonIds:comparisons.map(row=>row.comparison),comparisons});
}
const analysis={candidate:'F006',actualComparisons:through,actualProfiles:2*through,actualReports:outcomes.length,
    actualWorkloadIterations:profiles.reduce((sum,row)=>sum+row.actualCount,0),actualRetainedResults:profiles.reduce((sum,row)=>sum+row.resultCount,0),
    actualWarmups:profiles.reduce((sum,row)=>sum+row.warmupCount,0),actualOverheadIterations:profiles.reduce((sum,row)=>sum+row.overheadCount,0),
    harnessVersionsMeasured:1,originalCasesPerProfile:Array(through).fill(22),candidateCasesPerProfile:Array(through).fill(22),
    exactHarnessControlledComparisonIds:Array.from({length:through},(_,index)=>index+1),
    statisticsPolicy:'BDN default upper-outlier filtering;all8 raw actual samples,warmups,actual overheads and GC lines retained. Both BDN-reported and all-eight unfiltered actual means/ratios shown;not independently recomputed confidence critical values.',
    allocationBoundary:'BDN0.13 process-wide allocated bytes/op on pinned net12 host,including compiler/driver/process workers;not isolated private-set allocation.',
    caseCoverage:'One compiled22-case harness,all11 shapes at both boundaries in every pair;exact original harness DLL/PDB and every nonowner image byte retained from first pair.',
    explicitlyAdaptedSourcePatternsFrom:'F005-inspect-comparisons.mjs and F005-close-evaluation.mjs;no F005 measurements reused.',cases,profiles};
write(`analysis-through-comparison-${through}.json`,analysis);
if(through===3){
    assert.equal(budget.originalProfiles,3);assert.equal(budget.candidateProfiles,3);assert.equal(budget.closed,false);
    write('analysis.json',analysis);write('measurement-budget-before-close.json',budget);
    budget.closed=true;budget.closedUtc=new Date().toISOString();budget.harnessVersionsMeasured=1;
    budget.reason='Maximum3 fixed22-case owner-only paired comparisons spent;no additional leaf profile or rerun authorized for F006.';
    fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify(budget,null,2)+'\n');
}
for(const record of cases){
    const values=selector=>record.comparisons.map(row=>`c${row.comparison}:${selector(row)}`).join('/');
    console.log(`${record.shape.padEnd(12)} ${record.boundary.padEnd(16)} BDN:${values(row=>row.reportedTimeRatio.toFixed(3))} raw8:${values(row=>row.allEightActualTimeRatio.toFixed(3))} alloc%:${values(row=>row.allocatedChangePercent.toFixed(2))} bytes:${values(row=>row.originalAllocatedProcessBytes+'->'+row.candidateAllocatedProcessBytes)} CV%:${values(row=>row.originalCvPercent.toFixed(1)+'/'+row.candidateCvPercent.toFixed(1))}`);
}
console.log(`F006 actual paired comparisons:${through}/3,${outcomes.length} reports;all positive/adverse data retained;independent audit/disposition not yet established.`);
