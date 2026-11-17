import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),root=path.join(session,'autoperf-runs','F010');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').toUpperCase();
const budget=read('measurement-budget.json');assert.equal(budget.usedComparisons,3);assert.equal(budget.closed,false);
assert.deepEqual([budget.originalProfiles,budget.candidateProfiles,budget.completedProfiles],[3,3,6]);
assert.deepEqual(budget.completedComparisonIds,[1,2,3]);assert.equal(budget.failedComparisonIds.length,0);
const comparisons=[1,2,3].map(index=>read('analysis-comparison-'+index+'.json')),cases=comparisons[0].cases.map(initial=>{
    const records=comparisons.map(record=>record.cases.find(row=>row.shape===initial.shape));assert(records.every(Boolean));
    const ratio=records.map(record=>record.meanTimeRatio),raw=records.map(record=>record.allEightRawTimeRatio),changes=ratio.map(value=>100*(value-1));
    assert(records.every(row=>row.before.allocatedProcessBytesPerOperation===row.after.allocatedProcessBytesPerOperation));
    return{shape:initial.shape,knownComparerExactSet:initial.knownComparerExactSet,meanRatios:ratio,rawEightRatios:raw,
        meanTimeChangePercent:changes,rangeMeanTimeChangePercent:[Math.min(...changes),Math.max(...changes)],
        originalMeansNs:records.map(row=>row.before.reportedMeanNs),candidateMeansNs:records.map(row=>row.after.reportedMeanNs),
        originalCvPercent:records.map(row=>row.before.reportedCvPercent),candidateCvPercent:records.map(row=>row.after.reportedCvPercent),
        originalBytesPerOperation:records.map(row=>row.before.allocatedProcessBytesPerOperation),candidateBytesPerOperation:records.map(row=>row.after.allocatedProcessBytesPerOperation),
        allocationBenefitObserved:false};
});
budget.closed=true;budget.closedAtUtc=new Date().toISOString();
budget.reason='All3 authorized comparison slots completed;6 actual role profiles/66 successful reports. No further source tuning or timing permitted. Existing64-value late-match sets improve greatly,but small/default/no-value/early controls regress and process-wide allocation is unchanged;qualified CPU tradeoff only.';
fs.writeFileSync(path.join(root,'measurement-budget.json'),JSON.stringify(budget,null,2)+'\n');
const totals={profiles:6,reports:66,raw:528,retained:comparisons.reduce((n,row)=>n+row.actualRetainedResults,0),
    warmups:comparisons.reduce((n,row)=>n+row.actualWarmups,0),overheads:comparisons.reduce((n,row)=>n+row.actualOverheadIterations,0)};
totals.upperFiltered=totals.raw-totals.retained;
const analysis={candidate:'F010',mode:'qualified-existing-set-cpu-tradeoff',comparisonCount:3,sourceVersionsMeasured:1,compiledHarnessVersionsMeasured:1,
    allOriginalCandidateNonownerBytesIdentical:true,budgetClosed:true,totals,cases,
    comparisons:comparisons.map((row,index)=>({id:index+1,source:'analysis-comparison-'+(index+1)+'.json',sha256:sha('analysis-comparison-'+(index+1)+'.json'),order:row.order})),
    ratioPolicy:'All3 independent comparisons retained without pooling. Lower ratio means lower candidate time. All8 raw samples retained alongside BDN default upper-filtered means;no confidence/production-frequency/universal improvement inferred.',
    allocationBoundary:'All11 cases/all3 pairs have unchanged456B/op successes or5896B/op failures. Identical actual BDN0.13 GcStats process-wide net12 accounting,attributed through prior capsule source observations;not isolated set allocations.',
    measuredBoundary:'Warm actual public IAuthorizationService/registered default implementation/requirement dispatch;no observer in timed body. Caller already owns actual set/array/list. Actual builder/DI/claim/input production excluded. Existing eager failed-requirement formatting included,not bypassed.',
    qualifiedBenefit:'Large late-match exact default/Ordinal HashSet inputs only;normal params arrays are not converted,indexed or declared faster. Tiny/early sets and no-value/params controls have higher means in all3 pairs. Noneligible IgnoreCase fallback also changes CPU;do not attribute that to direct set path.',
    currentDefaultBoundary:'Nineteen initial+two addendum selected canonical-equal source/project/test/benchmark files,including whole owner/producer-logging source;not whole dependency/SDK/current-default integration. Legacy/std contracts untimed,not performance claims.'
};
assert(!fs.existsSync(path.join(root,'analysis.json')));fs.writeFileSync(path.join(root,'analysis.json'),JSON.stringify(analysis,null,2)+'\n');
const evaluation={candidate:'F010',disposition:'qualified-draft/existing-set-cpu-tradeoff',performancePrJustified:true,
    noDefaultAppOrAllocationWin:true,onlyKnownComparerExactSetsDirectLookup:true,callerOwnedValuesNotCopiedOrCached:true,
    allOtherSourcesRetainExactExplicitOrdinalContains:true,defaultArrayListValuesStillLinear:true,all3ComparisonsSpent:true,
    relevantSmallOrDefaultAdverseResultsRetained:true,wholeCurrentDefaultIntegration:false,legacyThroughputMeasured:false,
    originalFindingBroadIEnumerableCostNotUniversallyRemoved:true,analysis:'analysis.json',budget:'measurement-budget.json',
    reason:'Consistent large-existing-set late/miss CPU improvement in3 controlled comparisons without API/ownership/result changes. Full table prominently retains small/early/default/no-value regressions,unchanged allocation and fallback-input timing changes. Proposal only,not an aggregate production or merge-readiness claim.'};
fs.writeFileSync(path.join(root,'final-evaluation.json'),JSON.stringify(evaluation,null,2)+'\n');
fs.copyFileSync(path.join(session,'F010-extract-comparison.mjs'),path.join(root,'analysis-tools','extract-comparison.mjs'));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(root,'analysis-tools','finalize-analysis.mjs'));
console.log(`F010 closed3 slots:6profiles/${totals.reports}reports/${totals.raw}raw/${totals.retained}retained/${totals.upperFiltered}filtered/${totals.warmups}warmups/${totals.overheads}overheads.Qualified CPU tradeoff,not default-app/allocation win.`);
