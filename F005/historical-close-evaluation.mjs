import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F005');
const read=file=>JSON.parse(fs.readFileSync(path.join(run,file),'utf8').replace(/^\uFEFF/,''));
const write=(file,value)=>fs.writeFileSync(path.join(run,file),JSON.stringify(value,null,2)+'\n');
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const budget=read('measurement-budget.json');
assert.equal(budget.usedComparisons,3);assert.equal(budget.originalProfiles,3);assert.equal(budget.candidateProfiles,3);assert.equal(budget.closed,false);
assert(!fs.existsSync(path.join(run,'final-evaluation.json')));
const profiles=[],outcomes=[];
for(let comparison=1;comparison<=3;comparison++){
    const execution=read(path.join('measurements',`comparison-${comparison}`,'execution.json'));
    assert.equal(execution.commands.length,2);assert(execution.commands.every(command=>command.actualExitCode===0));
    const expectedReports=comparison===1?14:18;
    for(const variant of ['original','candidate-1']){
        const directory=path.join(run,'measurements',`comparison-${comparison}`,variant);
        const exports=fs.readdirSync(path.join(directory,'results')).filter(file=>file.endsWith('full.json'));assert.equal(exports.length,1);
        const data=JSON.parse(fs.readFileSync(path.join(directory,'results',exports[0]),'utf8'));assert.equal(data.Benchmarks.length,expectedReports);
        const parts=fs.readFileSync(path.join(directory,'console.log'),'utf8').split(/^\/\/ Benchmark: /m).slice(1);assert.equal(parts.length,expectedReports);
        let actualCount=0,resultCount=0,warmupCount=0,overheadCount=0;
        const rows=[];
        for(const benchmark of data.Benchmarks){
            const parameters=Object.fromEntries(benchmark.Parameters.split('&').map(pair=>pair.split('=')));
            const part=parts.find(value=>value.slice(0,value.indexOf('\n')).includes(`[Shape=${parameters.Shape}, Boundary=${parameters.Boundary}]`));assert(part);
            const measurements=kind=>[...part.matchAll(new RegExp('^'+kind+'\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,','gm'))]
                .map(match=>({index:Number(match[1]),operations:Number(match[2]),ns:Number(match[3])}));
            const actual=measurements('WorkloadActual'),retained=measurements('WorkloadResult'),warmup=measurements('WorkloadWarmup'),overhead=measurements('OverheadActual');
            assert.equal(actual.length,8);assert.equal(warmup.length,3);assert.equal(retained.length,benchmark.Statistics.N);
            assert(actual.every(row=>row.operations>0));assert(retained.length>=5);assert(overhead.length>0);
            actualCount+=actual.length;resultCount+=retained.length;warmupCount+=warmup.length;overheadCount+=overhead.length;
            const row={comparison,variant,shape:parameters.Shape,boundary:parameters.Boundary,
                reportedMeanNs:benchmark.Statistics.Mean,reportedSdNs:benchmark.Statistics.StandardDeviation,
                reportedRetainedN:benchmark.Statistics.N,allocatedProcessBytesPerOperation:benchmark.Memory.BytesAllocatedPerOperation,
                rawActual:actual,retainedResult:retained,warmup,overheadActual:overhead,
                allEightUnfilteredActualMeanNs:mean(actual.map(value=>value.ns/value.operations)),
                actualRawIterations:actual.length,reportedFilteredResults:retained.length};
            rows.push(row);outcomes.push(row);
        }
        profiles.push({comparison,variant,imageVariant:comparison===1?variant:variant+'-small-controls',actualReports:expectedReports,
            actualCount,resultCount,warmupCount,overheadCount,actualExitCode:execution.commands.find(command=>command.variant===variant).actualExitCode,
            fullExportSha256:hash(fs.readFileSync(path.join(directory,'results',exports[0]))),rows});
    }
}
const cases=[];
for(const shape of ['NoLoops','OneIterator','Potential16','Potential64','Promoted16','Promoted64','NonRender','Promoted','Unmutated']){
    for(const boundary of ['WarmCompilation','FreshCompilation']){
        const comparisons=[];
        for(let comparison=1;comparison<=3;comparison++){
            if(comparison===1&&['Promoted','Unmutated'].includes(shape)){continue;}
            const before=outcomes.find(row=>row.comparison===comparison&&row.variant==='original'&&row.shape===shape&&row.boundary===boundary);
            const after=outcomes.find(row=>row.comparison===comparison&&row.variant==='candidate-1'&&row.shape===shape&&row.boundary===boundary);
            assert(before&&after);
            comparisons.push({comparison,originalReportedMeanNs:before.reportedMeanNs,candidateReportedMeanNs:after.reportedMeanNs,
                reportedTimeRatio:after.reportedMeanNs/before.reportedMeanNs,
                originalAllEightActualMeanNs:before.allEightUnfilteredActualMeanNs,candidateAllEightActualMeanNs:after.allEightUnfilteredActualMeanNs,
                allEightActualTimeRatio:after.allEightUnfilteredActualMeanNs/before.allEightUnfilteredActualMeanNs,
                originalAllocatedProcessBytes:before.allocatedProcessBytesPerOperation,candidateAllocatedProcessBytes:after.allocatedProcessBytesPerOperation,
                allocatedChangePercent:100*(after.allocatedProcessBytesPerOperation/before.allocatedProcessBytesPerOperation-1)});
        }
        cases.push({shape,boundary,measuredComparisonIds:comparisons.map(row=>row.comparison),comparisons});
    }
}
const git=args=>{
    const result=spawnSync('git',['--no-pager',...args],{cwd:String.raw`C:\src\aspnetcore`,maxBuffer:8*1024*1024});
    assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
};
const owner=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
assert.equal(git(['diff','--name-only']).toString().trim().replaceAll('/','\\'),owner);
const patch=git(['diff','--binary','--',owner]);
assert.equal((patch.toString().match(/^\+[^+]/gm)??[]).length,4);assert.equal((patch.toString().match(/^-[^-]/gm)??[]).length,4);
fs.writeFileSync(path.join(run,'candidate.patch'),patch);
write('analysis.json',{candidate:'F005',actualComparisons:3,actualProfiles:6,actualReports:outcomes.length,
    actualWorkloadIterations:profiles.reduce((sum,row)=>sum+row.actualCount,0),
    actualRetainedResults:profiles.reduce((sum,row)=>sum+row.resultCount,0),
    actualWarmups:profiles.reduce((sum,row)=>sum+row.warmupCount,0),
    actualOverheadIterations:profiles.reduce((sum,row)=>sum+row.overheadCount,0),
    harnessVersionsMeasured:2,originalCasesPerProfile:[14,18,18],candidateCasesPerProfile:[14,18,18],
    statisticsPolicy:'BDN default upper-outlier filtering;JSON/WorkloadResult retain filtered results. All8 WorkloadActual samples and overhead/warmups remain in console logs;both BDN-reported and unfiltered-actual means/ratios shown.',
    allocationBoundary:'BDN0.13 process-wide allocated bytes/op on this net12 host,including compiler/driver and asynchronous process work;not isolated private-set/component allocation.',
    caseCoverage:'First14 cases have3 pairs;single-potential Promoted/Unmutated4 timing rows were added as nearest-target controls for pairs2/3. Not three identical18-case runs.',
    cases,profiles});
write('source-patch-metadata.json',{baseline:git(['rev-parse','HEAD']).toString().trim(),branch:git(['branch','--show-current']).toString().trim(),
    changedTrackedFiles:1,changedExistingLines:4,patchSha256:hash(patch),
    candidateSourceSha256:hash(fs.readFileSync(path.join(run,'frozen-source','candidate-1','owner','ForLoopIteratorInClosureAnalyzer.cs'))),
    candidateSourceUnchangedAcrossAllComparisons:true,sourceCandidateShapes:1,
    intendedFinalSource:'Retain the four-line private-state candidate only if the independent audit supports the explicitly qualified allocation/scaling proposal;no causal global speedup claim.'});
fs.copyFileSync(path.join(run,'measurement-budget.json'),path.join(run,'measurement-budget-before-close.json'));
budget.closed=true;budget.closedUtc=new Date().toISOString();budget.harnessVersionsMeasured=2;
budget.reason='Three paired full-owner comparisons consumed:14/18/18 cases per role. No additional profile/comparison authorized for F005.';
write('measurement-budget.json',budget);
write('final-evaluation.json',{candidate:'F005',disposition:'qualified-proposal-pending-audit',
    qualification:'Controlled large-promotion allocation/scaling proposal;small-target heap reversals and all timing/control costs retained,not merge-ready or a causal global speedup.',
    measuredComparisons:3,sourceCandidateShapes:1,harnessVersions:2,actualProfiles:6,actualReports:100,
    shippingProposalJustifiedOnlyAfterIndependentAudit:true,performancePrCreated:false,
    observedPositive:'Promoted64 full-owner BDN means are4.1-5.3percent lower warm/1.1-2.6percent lower fresh in all3 pairs;process-wide allocations are0.56-9.77percent lower across all6 large-promotion outcomes. Potential16/64 allocate less in all12 outcomes.',
    limitingEvidence:'Do not infer a causal speedup:OneIterator unchanged-state control moves20percent faster in pair3;NonRender fresh24.8percent slower in pair2(candidateCV18.2). NonRender BDN times are slower in all3 pairs at both boundaries. Promoted16 fresh pair3 allocates0.22percent more. Single-potential Promoted/Unmutated heap reverses from lower in pair2 to higher in pair3;neither has3 timing pairs.',
    decision:'Independent audit before a qualified allocation/scaling draft;expose all100 cases,small-target costs,process-wide variability and incomplete production/whole-build evidence. Do not extrapolate rare64-potential stressors to an average component.',
    validationBoundary:'Five frozen images each pass112 actual compiler checks=560 checks/7040 BL0014 observations. Original/candidate each20 exact existing facts=40 fresh rows;version2 reuses exact previously tested owners,not40 additional test executions.',
    harnessCorrection:'Comparison1 canonical OneIterator did not time the small potential list. Added existing characterized Promoted/Unmutated to versioned18-case harness for2/3,without changing compiler inputs,candidate or exceeding3 comparisons. Both18-case roles share exact harness bytes;non-harness bytes unchanged from respective original images.',
    currentDefaultBoundary:'Actual49147673 captured class built in baseline shipping-project context;ten referenced prerequisites checked and112 new-input checks/adjacent null fix executed. Not whole-default integration.',
    notEstablished:['Production frequency of16/64 potential locals and later promotions','Global analyzer/compiler/project build-duration speedup','Application/UI/browser speedup','VS2019/Roslyn3.3.1 host performance','Isolated component allocation or machine isolation'],
    rawPositiveAndNegativeResultsRetained:true,comparisonBudgetClosed:true,patchPreserved:true});
console.log(`F005 closed3/3:6 profiles/100 reports/${profiles.reduce((sum,row)=>sum+row.actualCount,0)} raw/${profiles.reduce((sum,row)=>sum+row.resultCount,0)} retained. Two harness versions,one unchanged source candidate;qualified disposition awaits independent audit.`);
