import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F035');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const git = args => {
  const result = spawnSync('git', args, { cwd: root });
  assert.equal(result.status, 0);
  return result.stdout.toString().trim();
};
assert.equal(git(['branch', '--show-current']), 'autoperf/F035-value-provider-enumeration');
assert.equal(git(['rev-parse', 'HEAD']), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=no']), '');
const profile = path.join(run, 'profiles', 'characterize-original-002');
const exit = read(path.join(profile, 'verified-native-exit.json'));
assert.equal(exit.actualNativeExitCode, 0);
const states = fs.readdirSync(path.join(profile, 'states')).map(file => read(path.join(profile, 'states', file)));
const completion = states.find(row => row.actualConcreteSemanticObservations !== undefined);
assert.equal(completion.actualConcreteSemanticObservations, 61);
assert.equal(completion.actualBenchmarkLifecycleProfiles, 20);
assert.equal(completion.actualAllSuccessful, true);
const methods = states.find(row => row.actualOwner !== undefined);
assert.equal(methods.actualShippedReturnTypePreserved, true);
assert.equal(methods.actualCollectionBinderMethodImplementation, 'Async');
assert.equal(methods.actualCollectionBinderCallsShippedEnumerator, true);
assert.equal(methods.actualStringValuesInterface.instructions.filter(row => row.opcode === 'box').length, 1);
const returnedTypes = states.filter(row => row.key?.endsWith('.Generic')).map(row => row.observation.actualReturnedType);
assert.equal(returnedTypes.length, 10);
assert.ok(returnedTypes.every(type => type === 'Microsoft.Extensions.Primitives.StringValues+Enumerator'));
assert.equal(read(path.join(run, 'validation', 'original-existing-1', 'verified-result.json')).actualPassed, 34);
const prepared = read(path.join(run, 'preparation-original-003', 'prepared', 'capsule.json'));
assert.equal(prepared.actualClosureFiles, 304);
const counts = [0, 1, 8, 64];
const names = ['PreparedConcrete', 'PreparedPreboxedGeneric', 'UnchangedValuesControl', 'QueryProducer', 'CollectionBinding'];
const plan = {
  candidate: 'F035', actualSealedBeforeShippingEditAndAnyTiming: true,
  actualCreated: new Date().toISOString(), maximumActualSourceComparisons: 3,
  actualShippingChangedFilesAtPlan: 0, actualNativeTimingAtPlan: false,
  primary: { method: 'CollectionBinding', count: 1,
    why: 'Ordinary nonempty one-value query collection binding through actual public factory/provider/CollectionModelBinder/SimpleTypeModelBinder;this reaches the shipped GetEnumerator inside the real runtime-async consumer.' },
  profiles: names.flatMap(method => counts.map(count => ({
    method, count, actualUnchangedSourceControl: method === 'UnchangedValuesControl',
    actualDoesNotReachTarget: method === 'UnchangedValuesControl' || (method === 'CollectionBinding' && count === 0),
    actualScaledSyntheticCardinality: count === 64,
  }))),
  boundaries: {
    PreparedConcrete: 'Prepared real query ValueProviderResult;concrete foreach with complete score and interface-returning GetEnumerator. Result/query/factory created outside timing.',
    PreparedPreboxedGeneric: 'Same result boxed as IEnumerable<string> once outside timing;enumerator creation and complete data consumption inside.',
    UnchangedValuesControl: 'Prepared result.Values concrete StringValues enumeration;does not call changed MVC GetEnumerator.',
    QueryProducer: 'Actual already-parsed QueryStringValueProvider.GetValue plus complete ValueProviderResult enumeration. Query parsing/factory/prefix creation excluded.',
    CollectionBinding: 'Actual query provider and CollectionModelBinder<string>/SimpleTypeModelBinder with fresh action/model-state/binding contexts;complete score,count/error checks. Metadata/binders/query parsed in setup. Missing/zero input bypasses target;nonempty enters the actual consumer.',
  },
  intendedOnlyShippingSeam: {
    file: 'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs',
    before: 'return ((IEnumerable<string>)Values).GetEnumerator();',
    candidate: 'return (IEnumerator<string>)Values.GetEnumerator();',
    actualShippedSignatureUnchanged: 'public IEnumerator<string> GetEnumerator()',
    remainingInterfaceEnumeratorBoxNotClaimedRemoved: true,
    nominalInputBoxMayAlreadyBeEliminatedByJit: true,
  },
  expectedSourceStrategyVariants: 1, actualOriginalConsumerFiles: 304,
  actualOriginalHarnessSha256: prepared.actualHarnessSha256, actualOriginalHarnessPdbSha256: prepared.actualHarnessPdbSha256,
  expectedCandidateMeasuredHarness: 'Copy authoritative original whole consumer;replace only actually tested MVC.Abstractions DLL/PDB. No separately compiled measured harness.',
  executorSourceSha256: '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B',
  settings: { strategy: 'Throughput', warmupIterations: 3, resultIterations: 8, iterationTimeMilliseconds: 100,
    unrollFactor: 1, outliers: 'DontRemove', powerPlan: 'Guid.Empty', settingsPreservingEmitter: true },
  pairedOrder: [['original', 'candidate'], ['candidate', 'original'], ['original', 'candidate']],
  stopping: 'Only clear >=50% declared-primary improvement can stop early;otherwise at most3 actual comparison attempts,including failed/partial timing. Retain all target/empty/unchanged/control/allocation results. No meaningful net gain => restore original source/product,no PR.',
  environmentalLimit: 'Shared non-isolated Windows x64 VM,pinned preview SDK/net12 runtime/server GC,serialized heavy commands,max2buildworkers. No application frequency,hosted HTTP/network,production throughput or newer-default SDK integration claim.',
  actualRetainedPreTimingFailures: {
    standaloneCompilation: 'preparation-original retained actual1error/2warnings:wrong binding-context return assumption and nullable enumerated model-state entries. Corrected baseline build0warnings/0errors.',
    untimedMetadataCharacterization: 'characterize-original/preparation-original-002 assumed compiler-generated async state machine. Actual frozen Core metadata uses runtime Async implementation and no such nested state machine. Failed negative exit and image retained;corrected actual-body inspection verifies the real GetEnumerator call.',
    actualComparisonSlotsConsumed: 0,
  },
};
for (const name of ['measurement-plan.json', 'measurement-plan-receipt.json', 'measurement-budget.json']) {
  assert.equal(fs.existsSync(path.join(run, name)), false);
}
fs.writeFileSync(path.join(run, 'measurement-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
const receipt = {
  candidate: 'F035', actualPlanSha256: hash(path.join(run, 'measurement-plan.json')),
  actualOriginalClosureSha256: hash(prepared.closurePath),
  actualAuthoritativeOriginalPreparation: 'preparation-original-003',
  actualAuthoritativeOriginalCharacterization: 'characterize-original-002',
  actualOriginalCharacterizationExitSha256: hash(path.join(profile, 'verified-native-exit.json')),
  actualHarnessSources: fs.readdirSync(path.join(run, 'harness')).filter(name => /\.(cs|csproj)$/.test(name))
    .map(name => ({ path: name, sha256: hash(path.join(run, 'harness', name)) })),
  actualShippingSourceSha256: hash(path.join(root, 'src', 'Mvc', 'Mvc.Abstractions', 'src', 'ModelBinding', 'ValueProviderResult.cs')),
  actualPlanSealedBeforeShippingEditAndTiming: true,
};
fs.writeFileSync(path.join(run, 'measurement-plan-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'measurement-budget.json'), JSON.stringify({
  candidate: 'F035', maximumActualSourceComparisons: 3, actualSourceComparisonsStarted: 0,
  actualSourceComparisonsCompleted: 0, actualSourceComparisonsConcluded: 0, sourceComparisonBudgetClosed: false,
  pairedOrder: plan.pairedOrder,
  authoritativePreparations: { original: 'preparation-original-003', candidate: 'preparation-candidate' },
  authoritativeCharacterizations: { original: 'characterize-original-002', candidate: 'characterize-candidate' },
  nativeProfilesStarted: [], nativeProfilesCompleted: [], comparisonsSettled: [],
}, null, 2) + '\n', { flag: 'wx' });
console.log('F035:pre-edit plan sealed;primary CollectionBinding/Count1;20profiles;3alternating attempts;0slots started.');
