'use strict';
const assert = require('node:assert/strict');
const { parseXml, elements } = require('./Xml.cjs');
function one(node, name) {
  const found = elements(node, name);
  assert.equal(found.length, 1, `Exactly one ${name}`);
  return found[0];
}
function display(row) {
  const parameters = row.parameters.length === 0 ? '' :
    '(' + row.parameters.map(parameter => `${parameter.name}: ${JSON.stringify(parameter.value)}`).join(', ') + ')';
  return `${row.class}.${row.method}${parameters}`;
}
function reconcile(xml, group, imageDirectory) {
  const root = parseXml(xml);
  assert.equal(root.name, 'TestRun');
  const summary = one(root, 'ResultSummary'), counters = one(summary, 'Counters').attributes;
  assert.equal(summary.attributes.outcome, 'Completed');
  const results = elements(one(root, 'Results'), 'UnitTestResult');
  const definitions = elements(one(root, 'TestDefinitions'), 'UnitTest');
  const entries = elements(one(root, 'TestEntries'), 'TestEntry');
  const expected = new Map(group.expected.map(row => [display(row), row]));
  assert.equal(expected.size, group.expected.length);
  assert.equal(results.length, expected.size, 'Every selected individual row, no unrelated broad-filter rows or skipped support counts');
  assert(results.length > 0);
  assert.equal(definitions.length, results.length);
  assert.equal(entries.length, results.length);
  const byId = new Map(definitions.map(definition => [definition.attributes.id, definition]));
  assert.equal(byId.size, definitions.length);
  const usedNames = new Set(), usedExecutions = new Set(), usedTestIds = new Set(), rows = [];
  for (const result of results) {
    const r = result.attributes, definition = byId.get(r.testId);
    assert(definition);
    const row = expected.get(r.testName);
    assert(row, `Unselected or mismatched native row: ${r.testName}`);
    for (const [set, value] of [[usedNames, r.testName], [usedExecutions, r.executionId], [usedTestIds, r.testId]]) {
      assert(!set.has(value)); set.add(value);
    }
    assert.equal(r.outcome, 'Passed');
    assert.equal(definition.attributes.name, r.testName);
    assert.equal(one(definition, 'Execution').attributes.id, r.executionId);
    const method = one(definition, 'TestMethod').attributes;
    assert.equal(method.className, row.class);
    assert([row.method, r.testName.slice(row.class.length + 1)].includes(method.name), 'Real method declaration/display name agrees with the exact selected case');
    const wanted = `${imageDirectory}\\${group.assembly}.dll`.toLowerCase();
    assert.equal(method.codeBase.toLowerCase(), wanted);
    assert.equal(definition.attributes.storage.toLowerCase(), wanted);
    const linked = entries.filter(entry => entry.attributes.executionId === r.executionId && entry.attributes.testId === r.testId);
    assert.equal(linked.length, 1);
    assert.equal(linked[0].attributes.testListId, r.testListId);
    rows.push({
      name: r.testName, class: row.class, method: row.method, parameters: row.parameters,
      outcome: r.outcome, testId: r.testId, executionId: r.executionId, testListId: r.testListId,
      definition: definition.attributes, execution: one(definition, 'Execution').attributes,
      testMethod: method, entry: linked[0].attributes, findings: row.findings, boundary: row.boundary
    });
  }
  assert.deepEqual([...usedNames].sort(), [...expected.keys()].sort());
  for (const name of ['total', 'executed', 'passed']) assert.equal(Number(counters[name]), results.length, `Native ${name}`);
  for (const name of ['failed', 'error', 'timeout', 'aborted', 'inconclusive', 'passedButRunAborted', 'notRunnable', 'notExecuted', 'disconnected', 'warning', 'completed', 'inProgress', 'pending'])
    assert.equal(Number(counters[name]), 0, `Native ${name}`);
  assert.equal(elements(root, 'ErrorInfo').length, 0);
  return { runId: root.attributes.id, summaryOutcome: summary.attributes.outcome, counters, rows: rows.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0) };
}
module.exports = { reconcile, display };
