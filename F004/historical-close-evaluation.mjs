import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F004');
const read=file=>JSON.parse(fs.readFileSync(path.join(run,file),'utf8').replace(/^\uFEFF/,''));
const write=(file,value)=>fs.writeFileSync(path.join(run,file),JSON.stringify(value,null,2)+'\n');
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const budget=read('measurement-budget.json');assert.equal(budget.usedComparisons,3);assert.equal(budget.originalProfiles,3);assert.equal(budget.candidateProfiles,3);assert.equal(budget.closed,false);
assert(!fs.existsSync(path.join(run,'final-evaluation.json')));
const profiles=[],outcomes=[];
for(let comparison=1;comparison<=3;comparison++){
    const execution=read(`measurements/comparison-${comparison}/execution.json`);
    assert.equal(execution.commands.length,2);assert(execution.commands.every(command=>command.actualExitCode===0));
    for(const variant of ['original','candidate-1']){
        const directory=path.join(run,'measurements',`comparison-${comparison}`,variant);
        const exports=fs.readdirSync(path.join(directory,'results')).filter(file=>file.endsWith('full.json'));assert.equal(exports.length,1);
        const data=JSON.parse(fs.readFileSync(path.join(directory,'results',exports[0]),'utf8'));assert.equal(data.Benchmarks.length,10);
        const consoleText=fs.readFileSync(path.join(directory,'console.log'),'utf8');
        const parts=consoleText.split(/^\/\/ Benchmark: /m).slice(1);assert.equal(parts.length,10);
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
        profiles.push({comparison,variant,actualReports:10,actualCount,resultCount,warmupCount,overheadCount,
            actualExitCode:execution.commands.find(command=>command.variant===variant).actualExitCode,
            fullExportSha256:hash(fs.readFileSync(path.join(directory,'results',exports[0]))),rows});
    }
}
const cases=[];
for(const shape of ['NoLoops','OneIterator','Nested16','Nested64','NonRender']){
    for(const boundary of ['WarmCompilation','FreshCompilation']){
        const comparisons=[];
        for(let comparison=1;comparison<=3;comparison++){
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
        cases.push({shape,boundary,comparisons});
    }
}
const git=args=>{
    const result=spawnSync('git',['--no-pager',...args],{cwd:String.raw`C:\src\aspnetcore`,maxBuffer:8*1024*1024});
    assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
};
const owner=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
assert.equal(git(['diff','--name-only']).toString().trim().replaceAll('/','\\'),owner);
const patch=git(['diff','--binary','--',owner]);assert.equal((patch.toString().match(/^\+[^+]/gm)??[]).length,4);
assert.equal((patch.toString().match(/^-[^-]/gm)??[]).length,4);fs.writeFileSync(path.join(run,'candidate.patch'),patch);
write('analysis.json',{candidate:'F004',actualComparisons:3,actualProfiles:6,actualReports:60,
    actualWorkloadIterations:profiles.reduce((sum,row)=>sum+row.actualCount,0),
    actualRetainedResults:profiles.reduce((sum,row)=>sum+row.resultCount,0),
    actualWarmups:profiles.reduce((sum,row)=>sum+row.warmupCount,0),
    actualOverheadIterations:profiles.reduce((sum,row)=>sum+row.overheadCount,0),
    statisticsPolicy:'BDN default upper-outlier filtering;JSON/WorkloadResult retain filtered results. All8 WorkloadActual samples and overhead/warmups remain in console logs;both BDN-reported and unfiltered-actual means/ratios shown.',
    allocationBoundary:'BDN0.13 process-wide allocated bytes/op on this net12 host,including compiler/driver and asynchronous process work;not isolated private-set/component allocation.',
    cases,profiles});
write('source-patch-metadata.json',{baseline:git(['rev-parse','HEAD']).toString().trim(),branch:git(['branch','--show-current']).toString().trim(),
    changedTrackedFiles:1,changedExistingLines:4,patchSha256:hash(patch),candidateSourceSha256:hash(fs.readFileSync(path.join(run,'frozen-source','candidate-1','owner','ForLoopIteratorInClosureAnalyzer.cs'))),
    intendedFinalSource:'Restore these4 lines to the unchanged independent baseline branch;retain actual candidate patch/source/binaries locally and portable evidence publicly.'});
fs.copyFileSync(path.join(run,'measurement-budget.json'),path.join(run,'measurement-budget-before-close.json'));
budget.closed=true;budget.closedUtc=new Date().toISOString();budget.reason='Three paired full-owner comparisons consumed. No additional profile/comparison authorized for F004.';
write('measurement-budget.json',budget);
write('final-evaluation.json',{candidate:'F004',disposition:'no-gain',qualification:'mixed-results-unestablished-net-benefit',
    measuredComparisons:3,sourceCandidateShapes:1,actualProfiles:6,shippingProposalJustified:false,performancePrCreated:false,
    observedPositive:'Nested16 allocates approximately1.1–2.0percent less across both boundaries in all3 comparisons. Nested64 fresh-compilation allocations decrease approximately2.1–3.5percent in all3.',
    limitingEvidence:'Timing benefit is small/mixed. BDN-reported NoLoops fresh-compilation control is3.2–7.0percent slower in all3 comparisons;OneIterator warm is0.9–6.0percent slower. Nested64 warm allocation change varies from17.9percent less to1.6percent more. Shared-machine noise and default outlier filtering preclude treating these as universal causal regressions or a reliable overall speedup.',
    decision:'Do not publish a speculative optimization PR. Record measured allocation wins and contrary observations rather than claim literally zero improvement,false positive,or universally harmful HashSet use.',
    validationBoundary:'Real compile-time Roslyn owner/actual Components metadata/valid CSharp13 inputs;20 existing facts per source plus72 full-owner controls per original/candidate/captured-current-default class. Not browser/runtime performance.',
    currentDefaultBoundary:'Actual49147673 class compiled in baseline shipping-project context;referenced API/project/BL0014 sites verified equal and72 controls/adjacent null fix executed. Not whole-default assembly/repository integration.',
    notEstablished:['Production frequency of16/64 nested captured iterators','Application/UI/browser speedup','Full build-duration gain','VS2019/Roslyn3.3.1-host runtime performance','Isolated component allocation or machine isolation'],
    rawPositiveAndNegativeResultsRetained:true,comparisonBudgetClosed:true,patchPreserved:true});
console.log(`F004:no established net win;closed3/3 comparisons,6 profiles,60 reports,${profiles.reduce((sum,row)=>sum+row.resultCount,0)} retained/${profiles.reduce((sum,row)=>sum+row.actualCount,0)} raw actual samples. Modest allocation gains retained;no speculative PR.`);
