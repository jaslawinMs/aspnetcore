'use strict';
const assert = require('node:assert/strict');
const xml = require('./Xml.cjs');

function trx(bytes, methods, sourcePath) {
  const root = xml.parse(bytes);
  assert.equal(root.name, 'TestRun');
  assert.equal(root.attrs.xmlns, 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');
  assert(root.attrs.id);
  const results = xml.child(root, 'Results').children;
  const definitions = xml.child(root, 'TestDefinitions').children;
  const entries = xml.child(root, 'TestEntries').children;
  const summary = xml.child(root, 'ResultSummary');
  assert.equal(summary.attrs.outcome, 'Completed');
  const counters = xml.child(summary, 'Counters').attrs;
  const count = methods.length;
  assert(count > 0);
  assert.equal(results.length, count);
  assert.equal(definitions.length, count);
  assert.equal(entries.length, count);
  for (const [field, value] of Object.entries(counters)) {
    assert.equal(Number(value), ['total', 'executed', 'passed'].includes(field) ? count : 0, `Unexpected real TRX counter ${field}`);
  }
  for (const field of ['total', 'executed', 'passed', 'failed']) assert(Object.hasOwn(counters, field));
  const testIds = new Set(), executionIds = new Set(), observed = [];
  for (const result of results) {
    assert.equal(result.name, 'UnitTestResult');
    const r = result.attrs;
    assert.equal(r.outcome, 'Passed');
    assert(r.testId && r.executionId && !testIds.has(r.testId) && !executionIds.has(r.executionId));
    testIds.add(r.testId); executionIds.add(r.executionId);
    const definition = definitions.filter(d => d.name === 'UnitTest' && d.attrs.id === r.testId);
    assert.equal(definition.length, 1);
    const d = definition[0];
    assert.equal(d.attrs.name, r.testName);
    assert.equal(d.attrs.storage.toLowerCase(), sourcePath.toLowerCase());
    assert.equal(xml.child(d, 'Execution').attrs.id, r.executionId);
    const method = xml.child(d, 'TestMethod').attrs;
    assert.equal(method.codeBase.toLowerCase(), sourcePath.toLowerCase());
    assert.equal(method.adapterTypeName, 'executor://xunit/VsTestRunner3/netcore/');
    const fullName = `${method.className}.${method.name}`;
    assert(methods.includes(fullName), `Case-sensitive unselected native identity ${fullName}`);
    assert.equal(r.testName, fullName, 'Selected native methods are facts; no unverified theory display rows are accepted');
    const entry = entries.filter(e => e.name === 'TestEntry' && e.attrs.testId === r.testId && e.attrs.executionId === r.executionId);
    assert.equal(entry.length, 1);
    assert.equal(entry[0].attrs.testListId, r.testListId);
    observed.push({ name: fullName, testId: r.testId, executionId: r.executionId, outcome: r.outcome, assemblyPath: method.codeBase });
  }
  assert.deepEqual(observed.map(r => r.name).sort(), [...methods].sort());
  return { runId: root.attrs.id, counters, cases: observed.sort((a, b) => a.name.localeCompare(b.name)), selectedTheories: [], theoryNamePolicy: 'Case-sensitive exact names; no selected method is parameterized.' };
}

function consumer(report, rows, role, framework, commonSha256) {
  assert.equal(report.schema, 'F198-F199-real-producer-consumer-v1');
  assert.equal(report.role, role);
  assert.equal(report.state, 'PENDING');
  assert.equal(report.authorizations, 0);
  assert.equal(report.sourceRoleIsNotCandidate, true);
  assert.equal(report.failures, 0);
  assert.equal(report.framework, framework);
  assert.equal(report.consumer.sha256, commonSha256);
  assert.deepEqual(report.cases.map(c => c.name), rows);
  const seen = new Set();
  for (const row of report.cases) {
    assert(!seen.has(row.name)); seen.add(row.name);
    assert.equal(row.outcome, 'Passed');
    assert(row.assertions.length >= 2 && row.assertions.every(a => typeof a === 'string' && a.length > 10));
    const e = row.evidence.producer ?? row.evidence;
    const name = row.name;
    const expectedCount = name.includes('Empty') ? 0
      : name.includes('Singleton') || ['CloseCallbackError', 'AbortTransportError'].includes(name) ? 1 : 3;
    assert.equal(e.connections.length, expectedCount, `${name}: actual producer cardinality`);
    assert.equal(e.boundary, name.startsWith('Shutdown')
      ? 'native TransportManager.BindAsync -> ConnectionDispatcher -> StopAsync'
      : 'native ConnectionDispatcher -> tracked KestrelConnection -> native TransportConnectionManager');
    const ids = new Set();
    for (const c of e.connections) {
      assert(!ids.has(c.Index)); ids.add(c.Index);
      assert.equal(c.ConnectionId, `producer-${c.Index}`);
      assert(c.nativeType.startsWith('Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.KestrelConnection`1[['));
      assert.equal(c.nativeExecutionStatus, 'RanToCompletion');
      assert.equal(c.disposed, true);
      assert.equal(e.events.filter(v => v === `application:${c.Index}`).length, 1);
      assert.equal(e.events.filter(v => v === `accepted:${c.ConnectionId}`).length, 1);
      const removed = name.includes('RemovedCompleted');
      const aborted = !removed && (name.startsWith('Abort') || name === 'ShutdownCanceledMultiple');
      const closed = !removed && !name.startsWith('Abort');
      assert.equal(c.abortProduced, aborted);
      assert.equal(c.closeProduced, closed);
      assert.equal(c.abortReasons.length, aborted ? 1 : 0);
      assert.equal(e.events.filter(v => v === `abort:${c.Index}`).length, aborted ? 1 : 0);
      assert.equal(e.events.filter(v => v === `close:${c.Index}`).length, closed ? 1 : 0);
      assert(e.events.indexOf(`application:${c.Index}`) < e.events.indexOf(`disposed:${c.Index}`));
      if (name.startsWith('Shutdown')) {
        assert(e.events.indexOf('accept-loop-ended') < e.events.indexOf(`close:${c.Index}`));
        assert(e.events.indexOf(`disposed:${c.Index}`) < e.events.indexOf('listener-dispose-enter'));
      }
    }
    if (name.startsWith('Shutdown')) {
      for (const event of ['listener-unbind-enter', 'listener-unbound', 'accept-loop-ended', 'listener-dispose-enter', 'listener-disposed']) {
        assert.equal(e.events.filter(v => v === event).length, 1);
      }
      assert(e.events.indexOf('listener-unbind-enter') < e.events.indexOf('listener-dispose-enter'));
      assert(e.events.indexOf('listener-dispose-enter') < e.events.indexOf('listener-disposed'));
    }
    if (name === 'ClosePreCanceledMultiple' || name === 'CloseCancelAfterStartMultiple') assert.equal(row.evidence.result, false);
    if (name === 'CloseEmptyPreCanceled') assert.equal(row.evidence.result, true);
    if (name.includes('Application')) {
      assert(e.logs.some(log => name === 'CloseApplicationCancellation'
        ? log.exceptionType?.endsWith('TaskCanceledException')
        : log.exceptionType === 'System.InvalidOperationException'));
    }
  }
  return { role, framework, commonSha256, cases: report.cases.map(c => ({ name: c.name, outcome: c.outcome, assertions: c.assertions.length })), failures: 0 };
}
module.exports = { trx, consumer };
