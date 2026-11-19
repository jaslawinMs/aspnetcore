import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const read = filename => JSON.parse(fs.readFileSync(path.join(run, filename), 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(path.join(run, filename))).digest('hex').toUpperCase();
const audit = read('measurement-audit.json');
const budget = read('diagnostic-budget.json');
assert.equal(budget.permanentlyClosed, true);
assert.equal(audit.actualRetainedSamples, 256);
assert.equal(audit.actualTimedCases, 32);
assert.equal(audit.actualSourceComparisons, 0);
assert.equal(audit.actualRuntimeRecordsChecked, 6);
assert.equal(audit.actualParsedIndividualTestRows, 68);
assert.deepEqual(audit.actualOtherConcreteGetEnumeratorOperandsOriginalAndDefault, [0, 0]);
const decision = {
  candidate: 'F122', disposition: 'rejected', mergeReady: false,
  actualReasonCode: 'concrete-pattern-no-established-production-consumer',
  actualReason: 'The original interface-returning GetEnumerator is a real syntactic fact, but the inspected controller/page public properties expose IList<IValueProviderFactory>. The 14-module MVC IL cohorts establish four constructor operands and only the owner non-generic forwarding call to its concrete GetEnumerator. A new concrete struct-enumerator pattern alone is not selectable through those properties. The predeclared production-fit gate was not met, so no shipping candidate or performance comparison was selected.',
  actualNotNumericalNoGainVerdict: true,
  actualNoAllocationFreeClaim: true,
  actualObservedInterfaceEnumerationAllocatesForNonemptyProfiles: true,
  actualOriginalInterfaceCostReading: 'The actual original copied-five-factory generic interface loop reports 40 B/op; the untouched-five-factory loop reports 32 B/op. These are absolute original observations, not a candidate improvement or a refutation of all possible interface-path redesigns.',
  actualOwnerInternalNotPublicApiCompatibilityRejection: true,
  actualBroaderInterfacePathRedesignNotRuledOut: true,
  actualNoWholeRepositoryOrArbitraryDynamicCallerAbsenceClaim: true,
  actualNoClaimNormalMvcRequestsRoutinelyEnumerateFactories: true,
  actualNoSpecificJitCauseClaim: true,
  actualShippingSourceChanged: false, actualCandidateSelected: false, actualSourceComparisons: 0,
  actualTimingAuthorizationsConsumed: 1, actualOriginalOnlyProfilesCompleted: 1,
  actualFailedOrPartialTimingAuthorizations: 0, actualUnusedTimingAuthorizationsPermanentlyClosed: 2,
  actualRetainedSamples: 256, actualEveryMeasuredCaseRetained: true,
  actualPrimary: 'EnumerateGeneric / CopiedDefault5',
  actualOrdinaryDiagnostic: 'EnumerateGeneric / UnmodifiedDefault5',
  actualPrimaryOriginalObservations: audit.rows.filter(item => item.method === 'EnumerateGeneric'
    && ['CopiedDefault5', 'UnmodifiedDefault5'].includes(item.profile)),
  actualOtherAbsoluteResults: 'measurement-audit.json: rows (all 32 cases)',
  actualClosedBudgetSha256: sha('diagnostic-budget.json'),
  actualMeasurementAuditSha256: sha('measurement-audit.json'),
  actualPerformancePrWarranted: false,
  actualSourceBranchPurpose: 'Preserve the twelve passing enumeration contract rows on an independent tests-only branch; the shipping owner remains unchanged.',
  actualPreservationNotBugFixEvidence: true,
  actualUnverifiedBoundaries: ['whole-repository/external dynamic callers', 'representative call frequency',
    'application/request improvement', 'a redesigned interface enumeration implementation',
    'compiled Razor Page execution', 'browser', 'AOT/trimming', 'packaging', 'full repository build'],
  actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F122', disposition: decision.disposition,
  actualSourceComparisons: 0, actualRetainedOriginalSamples: 256,
  actualShippingSourceChanged: false, actualRejectedForProductionFitNotForNoMeasuredCost: true }, null, 2));
