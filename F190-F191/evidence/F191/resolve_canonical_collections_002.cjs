const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'CANONICAL_CALLERS.json'), 'utf8'));
const corrections = [
  { method: 'AddsDiagnosticAndFixForNonPublicMethodsWithJSInvokableAttribute', count: 3, line: 69 },
  { method: 'AddsDiagnosticAndFixForMultiModifierMethodsWithJSInvokableAttribute', count: 4, line: 133 },
];
let applied = 0;
for (const call of data.calls) {
  const correction = corrections.find(item => item.method === call.method &&
    call.className === 'JSInvokableCodeFixProviderTest' && call.callee === 'VerifyCSharpDiagnostic');
  if (!correction) continue;
  const collection = call.argumentExpressions[1];
  if (call.line !== correction.line || call.argumentExpressions.length !== 2 ||
    !collection.trimStart().startsWith('[') || !collection.trimEnd().endsWith(']') ||
    collection.includes('..') ||
    (collection.match(/\bnew\s+DiagnosticResult\b/g) || []).length !== correction.count) {
    throw new Error('Manually inspected collection-expression evidence differs');
  }
  call.expectedDiagnosticCountSourceOnly = correction.count;
  call.expectedCollectionExpressionAdjudication = {
    kind: 'Explicit collection expression passed to params DiagnosticResult[]',
    count: correction.count,
    spreadElements: false,
    evidence: `raw\\${call.role}\\${call.file}:${call.line}`,
    boundary: 'Direct source inspection of every element; no runtime observation.',
  };
  applied++;
}
if (applied !== 4) throw new Error('Expected exactly two manually inspected calls in each source role');
for (const summary of data.summaries) {
  const target = data.calls.filter(call => call.role === summary.role && call.feedsTargetVerifier);
  summary.unresolvedExpectedCountCallSites = target.filter(call => call.expectedDiagnosticCountSourceOnly === null);
  summary.expectedCountHistogramSourceOnly = {};
  for (const call of target) {
    const key = String(call.expectedDiagnosticCountSourceOnly);
    summary.expectedCountHistogramSourceOnly[key] = (summary.expectedCountHistogramSourceOnly[key] || 0) + 1;
  }
  for (const entry of summary.byClass) {
    entry.expectedCountHistogramSourceOnly = {};
    for (const call of target.filter(call => call.className === entry.className)) {
      const key = String(call.expectedDiagnosticCountSourceOnly);
      entry.expectedCountHistogramSourceOnly[key] = (entry.expectedCountHistogramSourceOnly[key] || 0) + 1;
    }
  }
  summary.maximumCountSourceCases = target.filter(call =>
    call.expectedDiagnosticCountSourceOnly === summary.maximumExpectedCountSourceOnly).map(call => ({
    file: call.file, method: call.method, line: call.line, expected: call.expectedDiagnosticCountSourceOnly,
  }));
}
data.supersedes = 'CANONICAL_CALLERS.json (preserved; two collection-expression cases per role were initially unresolved)';
data.manualAdjudication = 'Read complete Default JSInvokableCodeFixProviderTest.cs; Original bytes are separately bound. Explicit arrays have three/four DiagnosticResult elements, not one scalar DiagnosticResult.';
fs.writeFileSync(path.join(ROOT, 'CANONICAL_CALLERS-002.json'), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(data.summaries.map(summary => ({
  role: summary.role, targetCallSites: summary.targetCallSites, targetClasses: summary.targetClasses,
  expectedCountHistogramSourceOnly: summary.expectedCountHistogramSourceOnly,
  unresolvedExpectedCountCallSites: summary.unresolvedExpectedCountCallSites.length,
})), null, 2));
