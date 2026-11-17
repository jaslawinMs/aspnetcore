import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F006');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
assert(!fs.existsSync(path.join(run,'final-evaluation.json')));
const analysis=read('analysis.json'),budget=read('measurement-budget.json');
assert.deepEqual([budget.usedComparisons,budget.originalProfiles,budget.candidateProfiles,budget.closed],[3,3,3,true]);
assert.equal(analysis.actualReports,132);
const select=names=>analysis.cases.filter(row=>names.includes(row.shape)).flatMap(row=>row.comparisons);
const miss=select(['Cached64']),potential=select(['Potential16','Potential64']),promotion=select(['Promoted16','Promoted64']);
assert.equal(miss.length,6);assert(miss.every(row=>row.reportedTimeRatio<1&&row.allEightActualTimeRatio<1&&row.allocatedChangePercent<0));
assert.equal(potential.filter(row=>row.reportedTimeRatio>1).length,11);
assert.equal(promotion.filter(row=>row.allocatedChangePercent>0).length,8);
const evaluation={candidate:'F006',disposition:'no-gain-pending-audit',performancePrJustified:false,performancePrCreated:false,
    qualification:'Conservative no-gain/net-benefit-not-established disposition,not a claim that every local case has zero benefit.',
    observedPositive:'Cached64 actual65-for-local/64-non-for-local-miss stressor has lower BDN and all-eight raw timing ratios and lower process-wide bytes at both boundaries in all3 comparisons.',
    observedContrary:'Potential16/64 have slower BDN means in11/12 outcomes despite lower process-wide bytes in all12. Promoted16/64 allocate more in8/12 outcomes. NoLoops time controls reverse substantially between pair2 and3;small targets and promotion allocations vary.',
    decision:'Do not publish a speculative generalized membership-change draft. Preserve every positive and adverse observation;after independent audit restore all five selected source statements and publish a no-gain results capsule.',
    productionMixKnown:false,unweightedSyntheticCasesNotAggregatedIntoProductionNetGain:true,
    sourceComparisons:3,sourceCandidateShapes:1,harnessVersions:1,actualProfiles:6,actualReports:132,
    exactHarnessControlledComparisonIds:[1,2,3],allNonownerImageBytesIdentical:true,
    cached64MinimumBdnReductionPercent:100*(1-Math.max(...miss.map(row=>row.reportedTimeRatio))),
    cached64MaximumBdnReductionPercent:100*(1-Math.min(...miss.map(row=>row.reportedTimeRatio))),
    cached64MinimumProcessAllocatedReductionPercent:-Math.max(...miss.map(row=>row.allocatedChangePercent)),
    cached64MaximumProcessAllocatedReductionPercent:-Math.min(...miss.map(row=>row.allocatedChangePercent)),
    potentialCasesSlowerBdnMean:11,potentialCasesLowerProcessBytes:12,promotionCasesHigherProcessBytes:8,
    validationBoundary:'40 fresh source-defined owning Facts;360 real-compiler checks/4248 BL0014 observations in original,candidate and selected current-default-class contexts. Real callbacks/symbols produce tracked hits and non-for-local misses.',
    currentDefaultBoundary:'Captured49147673 class through unchanged baseline shipping project and ten checked prerequisites;not whole-default integration. Adjacent null fix remains separate.',
    excluded:['Production case frequency or workload mix','Global analyzer/compiler/project-build speedup','Application/UI/browser performance','VS2019/Roslyn3.3.1 host performance','Isolated private-set allocation','Machine isolation or continuous settings observation'],
    rawPositiveAndNegativeResultsRetained:true,comparisonBudgetClosed:true,patchPreserved:true,shippingSourceRestorationPending:true};
fs.writeFileSync(path.join(run,'final-evaluation.json'),JSON.stringify(evaluation,null,2)+'\n');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'executed-close-evaluation.mjs'));
console.log('F006 preliminary conservative no-gain disposition:small repeatable Cached64 stressor win retained;11/12 potential cases slower and8/12 promotion allocations higher. Independent audit and exact source restoration/publication still required.');
