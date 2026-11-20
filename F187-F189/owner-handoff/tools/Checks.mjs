import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseTrx, parseXml } from './evidence.mjs';

export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const same = (left, right, message) => {
  if (JSON.stringify(canonical(left)) !== JSON.stringify(canonical(right))) throw Error(message);
};
export const requireThat = (condition, message) => { if (!condition) throw Error(message); };
const local = node => node.name.split(':').at(-1);
const children = (node, name) => node.children.filter(child => local(child) === name);
const one = (node, name) => {
  const found = children(node, name);
  requireThat(found.length === 1, `Expected one actual XML ${name}`);
  return found[0];
};
export function reconcileNative(root) {
  const selection = readJson(path.join(root, 'research', 'native-selection.json'));
  const systemBytes = fs.readFileSync(path.join(root, 'research', 'xml-system-reconciliation.json'));
  const system = readJson(path.join(root, 'research', 'xml-system-reconciliation.json'));
  requireThat(system.reports.length === selection.reports.length, 'System.Xml report cardinality');
  const reports = [];
  for (const expected of selection.reports) {
    const bytes = fs.readFileSync(path.join(root, expected.path));
    const text = bytes.toString('utf8');
    const parsed = parseTrx(text), raw = parseXml(text);
    const counterpart = system.reports.filter(report => report.path === expected.path && report.role === expected.role && report.scenario === expected.scenario);
    requireThat(counterpart.length === 1, 'System.Xml exact report association');
    const actualSystem = counterpart[0];
    requireThat(actualSystem.bytes === bytes.length && actualSystem.sha256.toLowerCase() === sha256(bytes), 'System.Xml parsed actual report bytes');
    requireThat(parsed.outcome === 'Completed', 'Native test run did not complete');
    same(actualSystem.run, raw.attributes, 'Independent parser run attributes');
    same(actualSystem.summary, one(raw, 'ResultSummary').attributes, 'Independent parser summary attributes');
    same(actualSystem.counters, parsed.counters, 'Independent parser counters');
    same(parsed.rows.map(row => row.testName).sort(), [...expected.expectedNames].sort(), 'Each expanded native test name must match selection');
    requireThat(new Set(parsed.rows.map(row => row.executionId)).size === parsed.rows.length, 'Distinct actual native execution IDs');
    const definitions = children(one(raw, 'TestDefinitions'), 'UnitTest');
    const entries = children(one(raw, 'TestEntries'), 'TestEntry');
    const results = children(one(raw, 'Results'), 'UnitTestResult');
    const details = results.map(result => {
      const definitionsForResult = definitions.filter(definition => definition.attributes.id === result.attributes.testId);
      requireThat(definitionsForResult.length === 1, 'Exactly one actual native definition');
      const definition = definitionsForResult[0];
      const entry = entries.filter(entry => entry.attributes.testId === result.attributes.testId && entry.attributes.executionId === result.attributes.executionId);
      requireThat(entry.length === 1, 'Exactly one actual native entry');
      const method = one(definition, 'TestMethod').attributes;
      const execution = one(definition, 'Execution').attributes;
      requireThat(method.codeBase === expected.expectedCodeBasePrefix, 'Actual native codeBase belongs to exact independent role');
      requireThat(expected.expectedClasses.includes(method.className), 'Actual native test class');
      requireThat(result.attributes.outcome === 'Passed' && definition.attributes.name === result.attributes.testName && execution.id === result.attributes.executionId, 'Actual native expanded outcome/definition/execution');
      const detail = { result: result.attributes, definition: definition.attributes, method, execution, entry: entry[0].attributes };
      const counterpartRows = actualSystem.rows.filter(row => row.result.executionId === result.attributes.executionId && row.result.testId === result.attributes.testId);
      requireThat(counterpartRows.length === 1, 'System.Xml row association');
      same(detail, counterpartRows[0], 'Every actual native attribute must agree across independent parsers');
      return detail;
    });
    requireThat(details.length === actualSystem.rows.length, 'No extra System.Xml rows');
    reports.push({
      role: expected.role,
      scenario: expected.scenario,
      path: expected.path,
      bytes: bytes.length,
      sha256: sha256(bytes),
      runId: parsed.runId,
      outcome: parsed.outcome,
      counters: parsed.counters,
      rows: details
    });
  }
  const byRole = Object.fromEntries(['original', 'default'].map(role => [role, reports.filter(report => report.role === role).reduce((sum, report) => sum + report.rows.length, 0)]));
  requireThat(byRole.original === selection.expectedRowsPerRole && byRole.default === selection.expectedRowsPerRole, 'Actual native role rows');
  for (const scenario of ['runtimecompilation', 'functional']) {
    const first = reports.find(report => report.role === 'original' && report.scenario === scenario);
    const second = reports.find(report => report.role === 'default' && report.scenario === scenario);
    same(first.rows.map(row => row.result.testName).sort(), second.rows.map(row => row.result.testName).sort(), 'Separate actual role row sets must agree');
  }
  return {
    parser: 'Portable structural XML parser plus TRX identifier/counter reconciliation; all row/result/definition/method/execution/entry attributes compared to real System.Xml results',
    systemReceiptSha256: sha256(systemBytes),
    selectionSha256: sha256(fs.readFileSync(path.join(root, 'research', 'native-selection.json'))),
    reports,
    actualRowExecutions: reports.reduce((sum, report) => sum + report.rows.length, 0),
    byRole,
    nativeAssertionCount: null,
    nativeAssertionCountBoundary: 'Native framework assertions are not instrumented; only actual expanded native cases/outcomes are counted.',
    status: 'PENDING'
  };
}
