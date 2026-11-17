import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),root=path.join(session,'autoperf-runs','F010'),comparison=Number(process.argv[2]);
assert(Number.isInteger(comparison)&&comparison>=1&&comparison<=3);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const budget=json(path.join(root,'measurement-budget.json')),attempt=budget.attempts.find(row=>row.comparison===comparison);
assert(attempt&&attempt.state==='completed'&&!attempt.failed);assert.equal(attempt.profiles.length,2);
const shapes=['Params2','NoValues','Array64','List64','Set1','Ord16Last','Ord64Last','Def64Last','Ord64Miss','Ord64Early','Ignore64'];
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const roles={};
for(const role of ['original','candidate']){
    const execution=attempt.profiles.find(row=>row.role===role);assert.equal(execution.actualExitCode,0);assert.equal(execution.actualReports,11);
    const directory=path.join(root,'measurements','comparison-'+comparison),results=path.join(directory,role,'results');
    const files=fs.readdirSync(results).filter(file=>file.endsWith('full.json'));assert.equal(files.length,1);
    const bytes=fs.readFileSync(path.join(results,files[0])),exported=JSON.parse(bytes);assert.equal(exported.Benchmarks.length,11);
    const consoleBytes=fs.readFileSync(path.join(directory,role+'.log')),parts=consoleBytes.toString('utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(parts.length,11);
    const cases=exported.Benchmarks.map(benchmark=>{
        const shape=benchmark.FullName.match(/^AutoPerf\.ClaimBenchmarks\.Authorize\(Shape: (\w+)\)$/)?.[1];assert(shapes.includes(shape));
        const matching=parts.filter(part=>part.slice(0,part.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));assert.equal(matching.length,1);
        const part=matching[0],parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
            .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
        const rawActual=parse('WorkloadActual'),retainedResult=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overheadActual=parse('OverheadActual');
        assert.equal(rawActual.length,8);assert.equal(warmup.length,3);assert.equal(retainedResult.length,benchmark.Statistics.N);
        assert(retainedResult.length>=5&&overheadActual.length>0);
        const gc=part.match(/^GC:\s+(.+)$/m);assert(gc);
        return{shape,fullExportedIdentity:benchmark.FullName,exportedParameter:benchmark.Parameters,
            reportedMeanNs:benchmark.Statistics.Mean,reportedSdNs:benchmark.Statistics.StandardDeviation,
            reportedCvPercent:100*benchmark.Statistics.StandardDeviation/benchmark.Statistics.Mean,reportedRetainedN:benchmark.Statistics.N,
            reportedStatistics:benchmark.Statistics,allocatedProcessBytesPerOperation:benchmark.Memory.BytesAllocatedPerOperation,
            reportedMemory:benchmark.Memory,gcLine:'GC: '+gc[1],rawActual,retainedResult,warmup,overheadActual,
            allEightUnfilteredActualMeanNs:mean(rawActual.map(row=>row.ns/row.operations))};
    });
    assert.equal(new Set(cases.map(row=>row.shape)).size,11);
    roles[role]={role,fullExportSha256:sha(bytes),consoleSha256:sha(consoleBytes),cases};
}
const cases=shapes.map(shape=>{
    const before=roles.original.cases.find(row=>row.shape===shape),after=roles.candidate.cases.find(row=>row.shape===shape);
    const ratio=after.reportedMeanNs/before.reportedMeanNs,rawRatio=after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs;
    return{shape,knownComparerExactSet:['Set1','Ord16Last','Ord64Last','Def64Last','Ord64Miss','Ord64Early'].includes(shape),
        before,after,meanTimeRatio:ratio,meanTimeChangePercent:100*(ratio-1),allEightRawTimeRatio:rawRatio,
        allocationChangeBytesPerOperation:after.allocatedProcessBytesPerOperation-before.allocatedProcessBytesPerOperation,
        allocationChangePercent:100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1)};
});
const allRoles=Object.values(roles).flatMap(role=>role.cases),result={
    candidate:'F010',comparison,order:attempt.order,actualProfiles:2,successfulReports:22,
    actualWorkloadIterations:allRoles.reduce((sum,row)=>sum+row.rawActual.length,0),
    actualRetainedResults:allRoles.reduce((sum,row)=>sum+row.retainedResult.length,0),
    actualWarmups:allRoles.reduce((sum,row)=>sum+row.warmup.length,0),
    actualOverheadIterations:allRoles.reduce((sum,row)=>sum+row.overheadActual.length,0),
    allocationBoundary:'Attributed identical actual BDN0.13 DLL/net12 GcStats process-wide allocated bytes/op,not isolated owner/HashSet allocation. No allocation benefit presumed.',
    measuredBoundary:'Warm real registered public service;owning builder/claims/allowed collection creation excluded. Existing eager failed-requirement formatting included,not bypassed;both successful and failed inputs retained.',
    statisticsPolicy:'Default BDN upper-outlier filtering;all8 unfiltered WorkloadActual samples,reported retained results,warmups,actual overheads,GC/settings retained. Independent role samples,not paired per operation;ratios of means,not production-frequency or universal latency inference.',
    roles:Object.fromEntries(Object.entries(roles).map(([role,record])=>[role,{fullExportSha256:record.fullExportSha256,consoleSha256:record.consoleSha256}])),
    cases
};
const output=path.join(root,'analysis-comparison-'+comparison+'.json');assert(!fs.existsSync(output));fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
for(const row of cases)console.log(`${row.shape.padEnd(12)} ${row.before.reportedMeanNs.toFixed(2).padStart(9)} ->${row.after.reportedMeanNs.toFixed(2).padStart(9)}ns ratio${row.meanTimeRatio.toFixed(4)} raw8:${row.allEightRawTimeRatio.toFixed(4)} CV${row.before.reportedCvPercent.toFixed(2)}/${row.after.reportedCvPercent.toFixed(2)}% B/op${row.before.allocatedProcessBytesPerOperation}->${row.after.allocatedProcessBytesPerOperation} N${row.before.reportedRetainedN}/${row.after.reportedRetainedN}`);
console.log(`F010 C${comparison}:22reports/${result.actualWorkloadIterations}raw/${result.actualRetainedResults}retained/${result.actualWarmups}warmups/${result.actualOverheadIterations}actual overheads;all adverse controls retained.`);
