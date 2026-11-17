import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),root=path.join(session,'autoperf-runs','F008');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8').replace(/^\uFEFF/,''));
const budget=read('measurement-budget.json'),directory=path.join(root,'measurements','original-diagnostic-only');
assert.equal(budget.closed,true);assert.equal(budget.originalOnlyDiagnosticProfiles,1);assert.equal(budget.usedComparisons,0);assert.equal(budget.candidateProfiles,0);
const execution=read('measurements\\original-diagnostic-only\\execution.json');assert.equal(execution.actualExitCode,0);
const exports=fs.readdirSync(path.join(directory,'results')).filter(name=>name.endsWith('full.json'));assert.equal(exports.length,1);
const bytes=fs.readFileSync(path.join(directory,'results',exports[0])),data=JSON.parse(bytes);
assert.equal(data.Benchmarks.length,8);
const parts=fs.readFileSync(path.join(directory,'console.log'),'utf8').split(/^\/\/ Benchmark: /m).slice(1);assert.equal(parts.length,8);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const cases=data.Benchmarks.map(benchmark=>{
    const shape=benchmark.FullName.match(/^AutoPerf\.LocalizationBenchmarks\.Invoke\(Shape: (\w+)\)$/)?.[1];assert(shape);
    const matching=parts.filter(part=>part.slice(0,part.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));assert.equal(matching.length,1);
    const part=matching[0],parse=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
        .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
    const rawActual=parse('WorkloadActual'),retainedResult=parse('WorkloadResult'),warmup=parse('WorkloadWarmup'),overheadActual=parse('OverheadActual');
    assert.equal(rawActual.length,8);assert.equal(warmup.length,3);assert.equal(retainedResult.length,benchmark.Statistics.N);
    assert(retainedResult.length>=5&&overheadActual.length>0);
    return{shape,originalExportedParameter:benchmark.Parameters,fullExportedIdentity:benchmark.FullName,
        reportedMeanNs:benchmark.Statistics.Mean,reportedSdNs:benchmark.Statistics.StandardDeviation,
        reportedCvPercent:100*benchmark.Statistics.StandardDeviation/benchmark.Statistics.Mean,reportedRetainedN:benchmark.Statistics.N,
        allocatedProcessBytesPerOperation:benchmark.Memory.BytesAllocatedPerOperation,rawActual,retainedResult,warmup,overheadActual,
        allEightUnfilteredActualMeanNs:mean(rawActual.map(row=>row.ns/row.operations))};
});
assert.equal(new Set(cases.map(row=>row.shape)).size,8);
const analysis={candidate:'F008',mode:'original-only-diagnostic',pairedComparisons:0,candidateProfiles:0,shippingSourceCandidates:0,
    actualProfiles:1,successfulReports:8,actualWorkloadIterations:cases.reduce((sum,row)=>sum+row.rawActual.length,0),
    actualRetainedResults:cases.reduce((sum,row)=>sum+row.retainedResult.length,0),
    actualWarmups:cases.reduce((sum,row)=>sum+row.warmup.length,0),actualOverheadIterations:cases.reduce((sum,row)=>sum+row.overheadActual.length,0),
    fullExportSha256:crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    noImprovementOrAcrossInputSpeedupClaimed:true,
    statisticsPolicy:'BDN default upper-outlier filtering;all8 raw actual samples,warmups,actual overheads and GC lines retained. Distinct configurations are different original inputs,not before/after roles. No improvement percentages or upstream PR measurement replication.',
    allocationBoundary:'Explicitly attributed BDN0.13 upstream GcStats source observation for identical actual DLL:process-wide precise total allocation on pinned net12,not isolated owner/lookup/provider allocation or newly instrumented delegate.',
    identityBoundary:'One26-character parameter is truncated in BDN display/Parameters. Actual FullName retains Query16LastReadOnlyWrapper,matched to source enum,actual setup proof,and unique corresponding log display. Raw label is retained,not rewritten.',
    measuredBoundary:'Warm same-context actual public Middleware.Invoke/native QueryString or AcceptLanguage provider plus minimal downstream reference/call-count observer;query collection/header inputs prepared/cached. Not new HTTP requests,network,full query parsing throughput,production mix,or whole-current-default SDK integration.',
    actualHeaderCandidateLimit:3,defaultSupportedCultureCount:1,
    caseCoverage:'One-culture controls plus16/64 supported-culture scaling diagnostics. Actual supported names are unique real platform names. Default header3-candidate bound retained;16/64 supported lists are configured stress,not claimed default traffic.',
    cases};
const output=path.join(root,'analysis.json');assert(!fs.existsSync(output));fs.writeFileSync(output,JSON.stringify(analysis,null,2)+'\n');
for(const row of cases)console.log(`${row.shape.padEnd(27)} original:${row.reportedMeanNs.toFixed(2)}ns raw8:${row.allEightUnfilteredActualMeanNs.toFixed(2)}ns SD:${row.reportedSdNs.toFixed(2)}ns CV:${row.reportedCvPercent.toFixed(2)}% allocated:${row.allocatedProcessBytesPerOperation}B N:${row.reportedRetainedN}`);
console.log(`F008:one original-only profile/8reports/${analysis.actualWorkloadIterations}raw/${analysis.actualRetainedResults}retained/${analysis.actualWarmups}warmups/${analysis.actualOverheadIterations}overheads. No candidate,comparison or gain.`);
