import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const [rootArgument, mode] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(mode));
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const relocate = original => {
  const marker = '/autoperf-runs/F029/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0);
  return at(normalized.slice(index + marker.length));
};
const auditTool = path.join(path.dirname(fileURLToPath(import.meta.url)), 'F029-audit.mjs');
const auditRun = spawnSync(process.execPath, [auditTool, root, '--verify'], { encoding: 'utf8' });
assert.equal(auditRun.status, 0, auditRun.stderr);
const audit = read(at('measurement-audit.json'));
const formatted = read(at('formatted-reproduction-preparation/prepared/capsule.json'));
const exit = read(at('profiles/formatted-reproduction-characterized/verified-native-exit.json'));
assert.equal(exit.actualNativeExitCode, 0);
assert.equal(exit.actualTimingProfile, false);
assert.equal(exit.actualHarnessSha256, formatted.actualHarnessSha256);
assert.equal(exit.actualClosureBeforeAndAfterMatched, true);
assert.equal(formatted.actualClosureFiles, 294);
const statesDirectory = at('profiles/formatted-reproduction-characterized/states');
const states = fs.readdirSync(statesDirectory).filter(file => file.endsWith('.json')).map(file =>
  ({ file, value: read(path.join(statesDirectory, file)) }));
const matching = ending => states.filter(row => row.file.endsWith(ending)).map(row => row.value);
const single = ending => {
  const rows = matching(ending);
  assert.equal(rows.length, 1, ending);
  return rows[0];
};
assert.deepEqual(single('-characterization-completed.json'), {
  actualCompletedWrappers: 4, actualPendingProducerContracts: 6, actualAllSuccessful: true,
  directMockedHtmlHelperTask: false, sourceComparison: false,
});
assert.equal(matching('-completed-producer.json').length, 4);
assert.equal(matching('-pending-outcome.json').length, 6);
assert.ok(matching('-pending-outcome.json').every(row => row.actualExpectedOutcomeMatched));
for (const api of ['sync', 'async']) {
  const before = matching(`-pending-${api}-before-release.json`);
  assert.equal(before.length, 3);
  for (const row of before) {
    assert.equal(row.actualProducerTaskCompleted, false);
    assert.equal(row.actualRealRazorViewTaskCompleted, false);
    assert.equal(row.actualPublicCallReturned, api === 'async');
    if (api === 'sync') {
      assert.equal(row.actualObservedPendingWait, true);
    }
  }
}
for (const row of [...matching('-completed-producer.json'), ...matching('-pending-sync-after-release.json'),
  ...matching('-pending-async-after-release.json')]) {
  assert.equal(row.actualConsumed, row.expected);
  assert.equal(row.actualViewDisposeCalls, 1);
  assert.equal(row.actualModelAndViewDataContractsMatched, true);
}
for (const entry of formatted.sourceFiles) {
  assert.equal(sha(path.join(path.dirname(relocate(formatted.closurePath)), entry.path)), entry.sha256);
}
const runtimeBefore = single('-runtime-characterize-before.json');
const runtimeAfter = single('-runtime-characterize-after.json');
assert.equal(runtimeBefore.processId, runtimeAfter.processId);
assert.equal(runtimeBefore.sourceComparison, false);
assert.equal(runtimeBefore.runtimeAssemblies.find(row => row.name === 'AutoPerf.Benchmarks')?.sha256, formatted.actualHarnessSha256);
for (const [assembly, count] of [['Microsoft.AspNetCore.Mvc.ViewFeatures', 3], ['Microsoft.AspNetCore.Mvc.Razor', 3], ['AutoPerf.Benchmarks', 5]]) {
  const witness = single(`-source-pdb-${assembly}.json`);
  assert.equal(witness.actualPePdbBindingMatched, true);
  assert.equal(witness.codeViewGuid, witness.pdbGuid);
  assert.equal(witness.documents.length, count);
  assert.equal(witness.assemblySha256, runtimeBefore.runtimeAssemblies.find(row => row.name === assembly)?.sha256);
  for (const document of witness.documents) {
    assert.equal(sha(relocate(document.source)), document.sha256);
  }
}
const format = read(at('validation/format-runnable/invocation.json'));
assert.equal(format.actualExitCode, 0);
assert.equal(format.historicalMeasuredConsumerAndSourceModified, false);
assert.equal(format.formattedRunnableCopyOnly, true);
assert.equal(format.actualSources.length, 5);
for (const entry of format.actualSources) {
  const original = at('preparation-005/prepared/sources/harness/' + entry.file);
  const runnable = at('harness/' + entry.file);
  assert.equal(sha(original), entry.actualHistoricalSourceSha256);
  assert.equal(sha(runnable), entry.actualRunnableSourceSha256);
  assert.equal(fs.readFileSync(original, 'utf8').replace(/\s/g, ''), fs.readFileSync(runnable, 'utf8').replace(/\s/g, ''));
}
const whitespace = read(at('validation/whitespace-runnable/invocation.json'));
assert.equal(whitespace.actualExitCode, 0);
assert.equal(whitespace.actualFolderWorkspace, true);
assert.equal(whitespace.actualIncludedSources.length, 5);
assert.equal(whitespace.actualCopiedRepoEditorConfigSha256, whitespace.actualRootEditorConfigSha256);
for (const entry of whitespace.actualIncludedSources) {
  assert.equal(sha(relocate(entry.path)), entry.sha256);
}
const build = fs.readFileSync(at('formatted-reproduction-preparation/build.stdout'), 'utf8');
assert.ok(build.includes('7 Warning(s)') && build.includes('0 Error(s)'));
const live = read(at('live-frozen-closure-audit.json'));
assert.equal(live.actualConsumerBindings, 588);
assert.equal(live.actualLoadedRuntimeBindings, 348);
assert.equal(live.actualUniquePhysicalFilesRehashed, 685);
const receiptPath = at('formatted-live-closure-audit.json');
if (mode === '--finalize') {
  assert.ok(!fs.existsSync(receiptPath));
  const entries = read(formatted.closurePath).files.map(entry => ({ file: path.join(formatted.output, entry.path), sha256: entry.sha256 }));
  const runtime = [...runtimeBefore.runtimeAssemblies, ...runtimeAfter.runtimeAssemblies].map(entry => ({ file: entry.path, sha256: entry.sha256 }));
  for (const entry of [...entries, ...runtime]) {
    assert.equal(sha(entry.file), entry.sha256);
  }
  fs.writeFileSync(receiptPath, JSON.stringify({
    actualConsumerBindings: entries.length, actualLoadedAssemblyBindings: runtime.length,
    actualAllPhysicalBytesRehashed: true, entries, runtime,
  }, null, 2) + '\n');
}
const formattedLive = read(receiptPath);
assert.equal(formattedLive.actualConsumerBindings, 294);
assert.equal(formattedLive.actualAllPhysicalBytesRehashed, true);
const decision = {
  candidate: 'F029', disposition: 'rejected', qualification: 'Contract-blocked nonblocking replacement,not zero original cost and not a universal rejection of future compatible optimizations.',
  exactShippedEntryPointUnchanged: 'IHtmlContent HtmlHelperPartialExtensions.Partial(IHtmlHelper htmlHelper,string partialViewName,object model,ViewDataDictionary viewData)',
  compatibilityReason: 'Already-compiled callers bind the exact synchronous IHtmlContent-returning signature. Changing it to Task<IHtmlContent> breaks that binding;returning before actual rendering completes changes output/error/disposal semantics.',
  actualProducerBoundary: 'Actual public Partial -> real HtmlHelper.PartialAsync/RenderPartialCoreAsync -> real RazorView.RenderAsync -> controlled CSharp RazorPage.ExecuteAsync with a page-owned pending task.',
  existingSupportedAlternative: 'Existing PartialAsync or PartialTagHelper at caller sites,already described by MVC1000;not an implemented framework optimization.',
  actualShippingChanges: 0, actualSourceComparisons: 0, originalOnlyDiagnosticProfiles: 1,
  originalResults: 4, retainedRawResults: 32, originalOwningRows: 34, originalOwningSkips: 0,
  measuredAndByteExactRelocatedImages: 2, physicalConsumerFilesPerImage: 294,
  actualFinalRunnableFormattedBuildPassed: true, actualFinalRunnableAnalyzerWarnings: 7,
  actualFinalRunnableCompileErrors: 0, actualFinalRunnableWhitespaceCheckPassed: true,
  actualFormattedRunnableContracts: { completed: 4, pendingSuccessFailureCancellation: 6 },
  historicalOriginalMeasuredBuildWarnings: 0, historicalOriginalMeasuredSourcesAndImagesUnmodified: true,
  actualMaximumDiagnosticCvPercent: audit.maximumCoefficientOfVariationPercent,
  actualOriginalAndByteExactRelocatedPhysicalFilesRehashed: 685,
  actualOriginalAndByteExactRelocatedLoadedAssemblyBindingsRehashed: 348,
  actualFormattedRunnableConsumerBindingsRehashed: 294,
  comparisonAndDiagnosticBudgetsPermanentlyClosed: true, actualPerformancePrCreated: false,
  additionalTimingPerformedAfterFormatting: false,
  retainedNegativePreparationEvidence: [
    'First standalone build:CS1503 public-constructor error and2CS8602warnings;corrected before timing.',
    'First untimed native characterization:missing Hosting.Abstractions dependency,actual exit-532462766;154-file consumer retained.',
    'Broader actual owning-test dependency closure build:one EventLog version conflict warning;unified explicitly before timing.',
    'Later untimed native characterization:mutable ThreadState checked twice and conjunction failed,actual exit-532462766. Exact failed conjunct not recorded;sampled-state observation and diagnostic capture added before timing.',
    'First whitespace project check:exit0 with workspace-loading warnings;not accepted as a direct five-file whitespace proof.',
    'Direct-folder invocation initially rejected incompatible --folder/--no-restore;next direct check found anonymous-object whitespace. Exact historical sources retained;only runnable working copy formatted after permanently closing timing.',
    'Copied repository editorconfig activates7CA2007/CA1829analyzer warnings in the formatted runnable build;warnings are retained,not suppressed or described as a zero-warning build.',
  ],
  noClaims: audit.limitations,
};
const decisionPath = at('decision.json');
if (mode === '--finalize') {
  assert.ok(!fs.existsSync(decisionPath));
  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2) + '\n');
} else {
  assert.deepEqual(read(decisionPath), decision);
}
console.log('F029:closed original diagnostics,unchanged historical bytes and formatted runnable4/6contracts/whitespace/294physical files verified;0source comparisons,no performance PR.');
