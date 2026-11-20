'use strict';
const assert = require('node:assert/strict');
const { parseXml, elements } = require('./Xml.cjs');
const one = (node, name) => {
  const found = elements(node, name);
  assert.equal(found.length, 1, `Exactly one ${name}`);
  return found[0];
};
function reconcile(text, selection, imageDirectory) {
  const root = parseXml(text);
  assert.equal(root.name, 'TestRun');
  const summary = one(root, 'ResultSummary');
  assert.equal(summary.attributes.outcome, 'Completed');
  const counters = one(summary, 'Counters').attributes;
  const results = elements(one(root, 'Results'), 'UnitTestResult');
  const definitions = elements(one(root, 'TestDefinitions'), 'UnitTest');
  const entries = elements(one(root, 'TestEntries'), 'TestEntry');
  const expected = new Map(selection.expected.map(row => [`${row.class}.${row.method}`, row]));
  assert.equal(expected.size, selection.expected.length);
  assert(results.length > 0, 'Nonzero discovered/executed rows required');
  assert.equal(results.length, expected.size);
  assert.equal(definitions.length, results.length);
  assert.equal(entries.length, results.length);
  const definitionById = new Map(definitions.map(d => [d.attributes.id, d]));
  assert.equal(definitionById.size, definitions.length, 'Unique definition IDs');
  const executionIds = new Set(), testIds = new Set(), names = new Set();
  const rows = [];
  for (const result of results) {
    const r = result.attributes, definition = definitionById.get(r.testId);
    assert(definition, 'Result has its definition');
    assert(!executionIds.has(r.executionId));
    assert(!testIds.has(r.testId));
    assert(!names.has(r.testName));
    executionIds.add(r.executionId); testIds.add(r.testId); names.add(r.testName);
    const method = one(definition, 'TestMethod').attributes;
    const fullName = `${method.className}.${method.name}`;
    assert.equal(r.testName, fullName);
    assert.equal(definition.attributes.name, fullName);
    const expectedRow = expected.get(fullName);
    assert(expectedRow, `Unexpected discovered row ${fullName}`);
    assert.equal(expectedRow.parameters.length, 0, 'This selected native scope has only Facts');
    assert.equal(one(definition, 'Execution').attributes.id, r.executionId);
    const matchingEntries = entries.filter(e => e.attributes.testId === r.testId && e.attributes.executionId === r.executionId);
    assert.equal(matchingEntries.length, 1);
    assert.equal(matchingEntries[0].attributes.testListId, r.testListId);
    assert.equal(r.outcome, 'Passed');
    const wanted = `${imageDirectory}\\${selection.assembly}.dll`.toLowerCase();
    assert.equal(method.codeBase.toLowerCase(), wanted, 'Native row actually names the right role/image');
    assert.equal(definition.attributes.storage.toLowerCase(), wanted);
    rows.push({
      name: r.testName, class: method.className, method: method.name,
      outcome: r.outcome, testId: r.testId, executionId: r.executionId,
      parameters: [], findings: expectedRow.findings, codeBase: method.codeBase,
      adapter: method.adapterTypeName, conditionalBody: false
    });
  }
  assert.deepEqual([...names].sort(), [...expected.keys()].sort());
  for (const name of ['total', 'executed', 'passed']) assert.equal(Number(counters[name]), results.length, `Native ${name}`);
  for (const name of ['failed', 'error', 'timeout', 'aborted', 'inconclusive', 'passedButRunAborted', 'notRunnable', 'notExecuted', 'disconnected', 'warning', 'completed', 'inProgress', 'pending'])
    assert.equal(Number(counters[name]), 0, `Native ${name}`);
  assert.equal(elements(root, 'ErrorInfo').length, 0);
  return { runId: root.attributes.id, summaryOutcome: summary.attributes.outcome, counters, rows: rows.sort((a, b) => a.name.localeCompare(b.name, 'en')) };
}
module.exports = { reconcile };
