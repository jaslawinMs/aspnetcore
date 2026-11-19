import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const discovery = read(path.join(run, 'discovery-completed.json'));
function write(name, value) {
  fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
const status = spawnSync('git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no'],
  { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(status.status, 0);
assert.equal(status.stdout.trim(), '');
for (const input of discovery.actualSelectedInputs) assert.equal(sha(path.join(root, input.path)), input.originalPhysicalSha256);
const owner = discovery.actualSelectedInputs[0].path;
assert.ok(fs.readFileSync(path.join(root, owner), 'utf8').includes('parentNode.DescendantNodes().Count() > 1'));
const withoutDeclaration = [
  'using Microsoft.AspNetCore.Builder;', '', 'var app = WebApplication.Create();', '',
  'app.MapGet("/", () => "Hello, World!");', '', 'app.Run();'
].join('\n');
const testPath = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
const tests = fs.readFileSync(path.join(root, testPath), 'utf8').replaceAll('\r\n', '\n');
assert.ok(tests.includes(withoutDeclaration));
assert.equal(tests.includes('DoesNotFix_ProgramDeclarationInSeparateFile'), false);
assert.equal(tests.includes('RemovesDeclarationIfItIsFound_WithOneOtherNode'), false);
const profiles = [
  { key: 'MinimalProgram', selectedClass: 'Program', expectedPredicate: true, expectedDiagnosticCount: 1,
    source: withoutDeclaration + '\n\npublic partial class Program { }\n', additionalSource: null,
    derivation: 'Existing DoesNothingWhenNoDeclarationIsFound fixture plus the public-partial declaration already covered by RemovesDeclarationIfItIsFound.' },
  { key: 'LargeProgram', selectedClass: 'Program', expectedPredicate: true, expectedDiagnosticCount: 1,
    source: withoutDeclaration.replace('app.Run();', Array.from({ length: 128 }, (_, i) =>
      `app.MapGet("/route-${i}", () => "route-${i}");`).join('\n') + '\n\napp.Run();')
      + '\n\npublic partial class Program { }\n', additionalSource: null,
    derivation: 'Same fixture with 128 additional valid endpoint-registration statements; explicit scaling probe, not the primary or a claimed workload frequency.' },
  { key: 'LoneDeclaration', selectedClass: 'Program', expectedPredicate: false, expectedDiagnosticCount: 0,
    source: 'public partial class Program { }\n', additionalSource: 'System.Console.WriteLine("Hello");\n',
    derivation: 'One descendant in the analysed file; a separate real top-level-program file supplies the valid compilation entry point.' },
  { key: 'EarlyGuard', selectedClass: 'NotProgram', expectedPredicate: false, expectedDiagnosticCount: 0,
    source: withoutDeclaration + '\n\npublic partial class NotProgram { }\n', additionalSource: null,
    derivation: 'The same normal syntax tree but another class name; unchanged early-return control never reaches the traversal.' }
];
write('profile-definitions.json', profiles);
write('acceptance-plan.json', {
  candidate: 'F124', baseline: discovery.actualBaseline, actualCurrentDefault: discovery.actualCurrentDefault,
  branch: discovery.branch, actualSealedAt: new Date().toISOString(),
  actualShippingEditsAtSeal: 0, actualNewPermanentTestMethodsAtSeal: 0,
  actualNewTestsExecutedAtSeal: 0, actualTimingRunsAtSeal: 0,
  originalFinding: discovery.originalFinding,
  target: 'Only the private IsPublicPartialClassProgram predicate: replace complete DescendantNodes().Count() > 1 with DescendantNodes().Skip(1).Any(). Keep every other byte, guard, diagnostic, generated-code policy and code-fix behavior unchanged.',
  actualPhase: 'Analyzer-time syntax inspection, not request throughput. The class callback runs for visited declarations; only qualifying empty public partial Program declarations reach this traversal. No whole-solution call-frequency claim.',
  actualPredicateBoundary: 'One cached Func<SyntaxNode,bool> bound to the actual compiled private static owner method. Reflection/delegate creation and real CSharpSyntaxTree production remain outside timing. No reimplementation, shipping wrapper, new IVT or UnsafeAccessor.',
  actualOwningProducerEvidence: 'Real CSharpCompilation.WithAnalyzers and PublicPartialProgramClassAnalyzer must produce the exact expected ASP0027 ID, severity, message and class source span for every applicable profile. Validate compiler errors are absent. A fresh driver is used on every full-analysis invocation; do not time cached completed diagnostics.',
  benchmarkClass: 'AutoPerf.AnalyzerBenchmarks',
  primaryMethod: 'Predicate', primaryProfile: 'MinimalProgram',
  unchangedControlMethod: 'UnchangedGetLocation', ordinaryGuardProfile: 'EarlyGuard',
  timedMethods: ['Predicate', 'AnalyzeCompilation', 'UnchangedGetLocation'],
  profileKeys: profiles.map(item => item.key), actualCasesPerSource: 12,
  actualRetainedSamplesPerCompleteComparison: 192,
  actualFullAnalysisBoundary: 'Fresh CompilationWithAnalyzers over a prepared valid compilation on every invocation, serial analysis option, actual analyzer, diagnostics returned as a Task result. Tree/metadata construction, initial binding and validation excluded. This secondary measure is not a full build, IDE or cold-parse measurement and never replaces the primary.',
  actualCorrectnessRequirements: [
    { requirement: 'Exactly one descendant in the analysed file does not report, even though a second file supplies top-level statements.',
      test: 'DoesNotFix_ProgramDeclarationInSeparateFile', rows: 4 },
    { requirement: 'Exactly two descendants report at the Program class and the code fix removes only that class; the other node may be an empty sibling declaration.',
      test: 'RemovesDeclarationIfItIsFound_WithOneOtherNode', rows: 2 },
    { requirement: 'Preserve every existing diagnostic and code-fix guard, attributes, members, namespace/nesting, trivia, declaration style and locations.',
      tests: 'All existing PublicPartialProgramClassTest cases; original and candidate green/green preservation, not a semantic-bug red/green claim.' },
    { requirement: 'Real parser, compiler, analyzer driver and full-analysis benchmark methods reach their expected contracts with both measured owner images.',
      evidence: 'Untimed characterization of all four profiles, generated/trivia and exact-threshold additional contracts, with exact returned diagnostic records.' }
  ],
  timingGate: 'Median paired primary predicate less-time at least 10%; primary faster in at least two of three comparisons and at least two effects larger than same-profile unchanged GetLocation movement. Reject qualification if the unchanged EarlyGuard predicate has median slowdown at least 10%, is slower twice and exceeds its control movement twice. Keep every full-driver, small/LoneDeclaration, scaling, allocation and adverse result.',
  allocationGate: 'Independent allocation-only qualification requires at least 32 reported primary managed B/op saved in at least two comparisons, distinct from unchanged controls, and the same ordinary-guard rejection rule. Do not expect this gate: Skip may add one iterator allocation.',
  actualExpectedTradeOff: 'Bounded enumeration may add a small fixed Skip iterator allocation and can be worse for a lone declaration. Quantify and disclose those outcomes; never claim an unconditional improvement or infer an IDE/build gain from the predicate. A qualified micro-optimization remains workload-dependent and not merge-ready.',
  maximumTimingAuthorizationsIncludingFailedOrPartial: 3,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  actualNoRetuningPrimarySubstitutionOrHistoricalReplay: true,
  benchmarkDotNet: { version: '0.13.0', runtime: '12.0.0-alpha.1.26562.105',
    warmups: 3, retained: 8, requestedIterationMilliseconds: 100, unroll: 1,
    outlierMode: 'DontRemove', settingsPreservingExecutor: true, powerPlanChangeRequested: false },
  machine: 'Shared non-isolated Windows box. Serialize builds and timing, at most two MSBuild workers; no priority, affinity, power, firewall, URL ACL or other machine changes.',
  actualProvenanceBoundary: 'Actual source-built netstandard2.0 analyzer owner, matching selected owner-source portable-PDB document and loaded PE/PDB identity. Same measured common harness DLL/PDB across variants. Record complete image hashes and reference metadata; do not claim complete compiler provenance or fresh-clone byte-identical builds.',
  publication: 'Fork-only independent baseline37 branch, immutable connected evidence, exact commands and parsed XML rows. No PR without declared primary qualification. Any justified draft follows the normal PR template and is opened immediately in a separate visible browser window. No PR/browser for no-gain. Advance only F124 after remote receipt/index verification; preserve the fixed classified report and all closed cases.'
});
write('intake-completed.json', {
  ...discovery, actualAcceptancePlanNotYetSealed: false,
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualProfileDefinitionsSha256: sha(path.join(run, 'profile-definitions.json')),
  actualSealedBeforeTestsAndImplementation: true
});
console.log(JSON.stringify({ candidate: 'F124', actualAcceptancePlanSealed: true,
  actualPrimary: 'Predicate/MinimalProgram', actualProfiles: profiles.length,
  actualCasesPerSource: 12, actualSourceEdits: 0, actualNewTests: 0, actualTimingRuns: 0 }, null, 2));
