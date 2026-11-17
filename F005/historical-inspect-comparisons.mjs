import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F005');
const read=file=>JSON.parse(fs.readFileSync(path.join(run,file),'utf8').replace(/^\uFEFF/,''));
const budget=read('measurement-budget.json'),through=Number(process.argv[2]);
assert(Number.isInteger(through)&&through>=1&&through<=3&&through<=budget.usedComparisons);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const cases=[];
for(let comparison=1;comparison<=through;comparison++){
    const execution=read(path.join('measurements',`comparison-${comparison}`,'execution.json'));
    assert.equal(execution.commands.length,2);assert(execution.commands.every(row=>row.actualExitCode===0));
    const profiles={};
    for(const variant of ['original','candidate-1']){
        const directory=path.join(run,'measurements',`comparison-${comparison}`,variant);
        const exports=fs.readdirSync(path.join(directory,'results')).filter(file=>file.endsWith('full.json'));
        assert.equal(exports.length,1);
        const reports=comparison===1?14:18;
        const data=JSON.parse(fs.readFileSync(path.join(directory,'results',exports[0]),'utf8'));assert.equal(data.Benchmarks.length,reports);
        const parts=fs.readFileSync(path.join(directory,'console.log'),'utf8').split(/^\/\/ Benchmark: /m).slice(1);
        assert.equal(parts.length,reports);
        profiles[variant]=data.Benchmarks.map(benchmark=>{
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}, Boundary=${parameters.Boundary}]`));
            assert(part);
            const raw=[...part.matchAll(/^WorkloadActual\s+(\d+):\s+(\d+) op, ([\d.]+) ns,/gm)]
                .map(match=>Number(match[3])/Number(match[2]));
            assert.equal(raw.length,8);
            return {shape:parameters.Shape,boundary:parameters.Boundary,reportedMeanNs:benchmark.Statistics.Mean,
                allEightActualMeanNs:mean(raw),reportedN:benchmark.Statistics.N,
                cvPercent:100*benchmark.Statistics.StandardDeviation/benchmark.Statistics.Mean,
                allocatedProcessBytes:benchmark.Memory.BytesAllocatedPerOperation};
        });
    }
    for(const original of profiles.original){
        const matches=profiles['candidate-1'].filter(row=>row.shape===original.shape&&row.boundary===original.boundary);
        assert.equal(matches.length,1);const candidate=matches[0];
        cases.push({comparison,shape:original.shape,boundary:original.boundary,original,candidate,
            reportedTimeRatio:candidate.reportedMeanNs/original.reportedMeanNs,
            allEightActualTimeRatio:candidate.allEightActualMeanNs/original.allEightActualMeanNs,
            allocatedChangePercent:100*(candidate.allocatedProcessBytes/original.allocatedProcessBytes-1)});
    }
}
const output=path.join(run,`analysis-through-comparison-${through}.json`);
assert(!fs.existsSync(output),'Refusing to overwrite an actual interim analysis.');
fs.writeFileSync(output,JSON.stringify({candidate:'F005',completedComparisons:through,provisional:true,
    notAnIndependentFinalAudit:true,defaultFilteringAndSharedMachineCaveatsRetained:true,cases},null,2)+'\n');
for(const shape of ['NoLoops','OneIterator','Potential16','Potential64','Promoted16','Promoted64','NonRender','Promoted','Unmutated']){
    for(const boundary of ['WarmCompilation','FreshCompilation']){
        const rows=cases.filter(row=>row.shape===shape&&row.boundary===boundary);
        const values=selector=>rows.map(row=>`c${row.comparison}:${selector(row)}`).join(' / ');
        console.log(`${shape.padEnd(12)} ${boundary.padEnd(16)} BDN:${values(row=>row.reportedTimeRatio.toFixed(3))} raw8:${values(row=>row.allEightActualTimeRatio.toFixed(3))} alloc%:${values(row=>row.allocatedChangePercent.toFixed(2))} bytes:${values(row=>row.original.allocatedProcessBytes+'->'+row.candidate.allocatedProcessBytes)} CV%:${values(row=>row.original.cvPercent.toFixed(1)+'/'+row.candidate.cvPercent.toFixed(1))}`);
    }
}
console.log(`F005 interim actual paired comparisons:${through}/3;not a final verified net-benefit disposition.`);
