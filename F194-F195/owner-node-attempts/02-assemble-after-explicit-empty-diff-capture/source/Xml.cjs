'use strict';
const assert = require('node:assert/strict');

function decode(text) {
  return text.replace(/&([^;]+);/g, (_, value) => {
    if (value === 'amp') return '&';
    if (value === 'lt') return '<';
    if (value === 'gt') return '>';
    if (value === 'quot') return '"';
    if (value === 'apos') return "'";
    if (/^#x[0-9a-f]+$/i.test(value)) return String.fromCodePoint(parseInt(value.slice(2), 16));
    if (/^#[0-9]+$/.test(value)) return String.fromCodePoint(parseInt(value.slice(1), 10));
    throw new Error(`Unknown XML entity &${value};`);
  });
}
function parse(bytes) {
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '');
  const document = { name: '#document', attrs: {}, children: [], text: '' };
  const stack = [document];
  let position = 0;
  while (position < text.length) {
    if (text[position] !== '<') {
      let end = text.indexOf('<', position);
      if (end < 0) end = text.length;
      const raw = text.slice(position, end);
      assert(!/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-f]+);)/i.test(raw), 'Malformed XML text entity');
      stack.at(-1).text += decode(raw);
      position = end;
      continue;
    }
    if (text.startsWith('<?', position)) {
      const end = text.indexOf('?>', position + 2);
      assert(end >= 0);
      position = end + 2;
      continue;
    }
    if (text.startsWith('<!--', position)) {
      const end = text.indexOf('-->', position + 4);
      assert(end >= 0);
      position = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', position)) {
      const end = text.indexOf(']]>', position + 9);
      assert(end >= 0);
      stack.at(-1).text += text.slice(position + 9, end);
      position = end + 3;
      continue;
    }
    assert(!text.startsWith('<!', position), 'DTD/declarations are not accepted');
    let end = position + 1, quote = null;
    for (; end < text.length; end++) {
      const character = text[end];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        break;
      }
    }
    assert(end < text.length && !quote, 'Unterminated XML tag');
    const tag = text.slice(position + 1, end);
    position = end + 1;
    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      assert(stack.length > 1 && stack.at(-1).name === name, 'Mismatched XML closing element');
      stack.pop();
      continue;
    }
    const empty = /\/\s*$/.test(tag);
    const body = empty ? tag.replace(/\/\s*$/, '') : tag;
    const match = /^([A-Za-z_][\w.:-]*)([\s\S]*)$/.exec(body);
    assert(match, 'Invalid XML element');
    const attrs = {}, attrPattern = /\s+([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
    let at = 0;
    while (at < match[2].length) {
      if (/^\s*$/.test(match[2].slice(at))) break;
      attrPattern.lastIndex = at;
      const attribute = attrPattern.exec(match[2]);
      assert(attribute, 'Invalid XML attribute');
      assert(!Object.hasOwn(attrs, attribute[1]), 'Duplicate XML attribute');
      const value = attribute[2] ?? attribute[3];
      assert(!value.includes('<'), 'Raw less-than in XML attribute');
      attrs[attribute[1]] = decode(value);
      at = attrPattern.lastIndex;
    }
    const node = { name: match[1], attrs, children: [], text: '' };
    stack.at(-1).children.push(node);
    if (!empty) stack.push(node);
  }
  assert.equal(stack.length, 1, 'Unclosed XML elements');
  assert.equal(document.children.length, 1, 'Expected exactly one XML root');
  assert.equal(document.text.trim(), '', 'Unexpected XML root text');
  return document.children[0];
}
function child(node, name) {
  const found = node.children.filter(x => x.name === name);
  assert.equal(found.length, 1, `Expected one ${name}`);
  return found[0];
}
function reconcileTrx(bytes, expectedMethods, expectedRows, sourcePath) {
  const root = parse(bytes);
  assert.equal(root.name, 'TestRun');
  assert.equal(root.attrs.xmlns, 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');
  assert(root.attrs.id, 'Missing TRX run ID');
  const results = child(root, 'Results').children;
  const definitions = child(root, 'TestDefinitions').children;
  const entries = child(root, 'TestEntries').children;
  const summary = child(root, 'ResultSummary');
  assert.equal(summary.attrs.outcome, 'Completed');
  const counters = child(summary, 'Counters').attrs;
  assert.equal(results.length, 11);
  assert.equal(definitions.length, 11);
  assert.equal(entries.length, 11);
  for (const [name, value] of Object.entries(counters)) {
    assert.equal(Number(value), ['total', 'executed', 'passed'].includes(name) ? 11 : 0, `Unexpected TRX ${name} counter`);
  }
  for (const field of ['total', 'executed', 'passed', 'failed']) assert(Object.hasOwn(counters, field));
  const ids = new Set(), executions = new Set(), observedMethods = new Map(), theoryNames = [];
  const reconciled = [];
  for (const result of results) {
    assert.equal(result.name, 'UnitTestResult');
    const r = result.attrs;
    assert.equal(r.outcome, 'Passed');
    assert(r.testId && r.executionId && !ids.has(r.testId) && !executions.has(r.executionId));
    ids.add(r.testId); executions.add(r.executionId);
    const definition = definitions.filter(x => x.name === 'UnitTest' && x.attrs.id === r.testId);
    assert.equal(definition.length, 1, 'Result definition identity not unique');
    const d = definition[0];
    assert.equal(d.attrs.name, r.testName);
    assert.equal(d.attrs.storage.toLowerCase(), sourcePath.toLowerCase());
    assert.equal(child(d, 'Execution').attrs.id, r.executionId);
    const method = child(d, 'TestMethod').attrs;
    assert.equal(method.codeBase.toLowerCase(), sourcePath.toLowerCase());
    assert.equal(method.adapterTypeName, 'executor://xunit/VsTestRunner3/netcore/');
    const fullName = `${method.className}.${method.name}`;
    assert(expectedMethods.includes(fullName), `Unselected method in actual XML: ${fullName}`);
    observedMethods.set(fullName, (observedMethods.get(fullName) ?? 0) + 1);
    const matchingEntry = entries.filter(e => e.name === 'TestEntry' && e.attrs.testId === r.testId && e.attrs.executionId === r.executionId);
    assert.equal(matchingEntry.length, 1, 'Result/TestEntries execution identity not unique');
    assert.equal(matchingEntry[0].attrs.testListId, r.testListId);
    if (fullName.endsWith('.GetFileInfo_ResolvesFiles_WithDifferentCasing')) {
      theoryNames.push(r.testName);
    } else {
      assert.equal(r.testName, fullName);
    }
    reconciled.push({ testId: r.testId, executionId: r.executionId, name: r.testName, fullName, outcome: r.outcome, assemblyPath: method.codeBase });
  }
  assert.equal(observedMethods.size, expectedMethods.length);
  for (const method of expectedMethods) assert.equal(observedMethods.get(method), method.endsWith('.GetFileInfo_ResolvesFiles_WithDifferentCasing') ? 2 : 1);
  const theoryMethod = expectedMethods.find(x => x.endsWith('.GetFileInfo_ResolvesFiles_WithDifferentCasing'));
  const expectedNames = expectedRows.map(([folder, file]) => `${theoryMethod}(folder: "${folder}", file: "${file}")`).sort();
  assert.deepEqual(theoryNames.sort(), expectedNames, 'Each real theory row must appear and pass');
  return { runId: root.attrs.id, total: results.length, counters, theoryNames, results: reconciled.sort((a, b) => a.name.localeCompare(b.name)) };
}
module.exports = { parse, child, reconcileTrx };
