const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function save(name, value) {
  fs.writeFileSync(path.join(ROOT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}

// This is a bounded source-token inventory, not a C# compiler or runtime test.
function tokens(source) {
  const result = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    if (/\s/.test(source[i])) { i++; continue; }
    if (source.startsWith('//', i)) {
      i = source.indexOf('\n', i + 2);
      if (i < 0) break;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) throw new Error('Unclosed comment');
      i = end + 2;
      continue;
    }
    const prefix = source.slice(i).match(/^(?:\$+@?|@\$\$*|@)?("{1,})/);
    if (prefix) {
      const quotes = prefix[1].length;
      const verbatim = prefix[0].includes('@');
      i += prefix[0].length;
      if (quotes >= 3) {
        const end = source.indexOf('"'.repeat(quotes), i);
        if (end < 0) throw new Error('Unclosed raw string');
        i = end + quotes;
      } else {
        if (quotes === 2) {
          result.push({ text: '$literal', start, end: i });
          continue;
        }
        let closed = false;
        while (i < source.length) {
          if (!verbatim && source[i] === '\\') { i += 2; continue; }
          if (source[i] === '"') {
            if (verbatim && source[i + 1] === '"') { i += 2; continue; }
            i++;
            closed = true;
            break;
          }
          i++;
        }
        if (!closed) throw new Error('Unclosed string');
      }
      result.push({ text: '$literal', start, end: i });
      continue;
    }
    if (source[i] === "'") {
      i++;
      while (i < source.length && source[i] !== "'") {
        i += source[i] === '\\' ? 2 : 1;
      }
      if (i === source.length) throw new Error('Unclosed character');
      result.push({ text: '$char', start, end: ++i });
      continue;
    }
    const identifier = source.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);
    if (identifier) {
      i += identifier[0].length;
      result.push({ text: identifier[0], start, end: i });
      continue;
    }
    result.push({ text: source[i], start, end: ++i });
  }
  return result;
}

function pairs(ts) {
  const stack = [];
  const map = new Map();
  const opens = { '(': ')', '[': ']', '{': '}' };
  const closes = new Set(Object.values(opens));
  for (let i = 0; i < ts.length; i++) {
    const text = ts[i].text;
    if (opens[text]) stack.push(i);
    if (closes.has(text)) {
      const start = stack.pop();
      if (start === undefined || opens[ts[start].text] !== text) {
        throw new Error('Unbalanced tokens at source offset ' + ts[i].start);
      }
      map.set(start, i);
      map.set(i, start);
    }
  }
  if (stack.length) throw new Error('Unclosed token group');
  return map;
}

function inventory(file) {
  const source = fs.readFileSync(path.join(ROOT, file.artifact), 'utf8');
  const ts = tokens(source);
  const groups = pairs(ts);
  const line = offset => source.slice(0, offset).split('\n').length;
  const slice = (a, b) => source.slice(ts[a].start, ts[b].end);
  const methods = [];
  for (let i = 0; i < ts.length; i++) {
    if (ts[i].text !== 'public') continue;
    let cursor = i + 1;
    if (ts[cursor]?.text === 'async') cursor++;
    if (!['void', 'Task'].includes(ts[cursor]?.text)) continue;
    if (ts[cursor + 2]?.text !== '(') continue;
    const endSignature = groups.get(cursor + 2);
    const body = endSignature + 1;
    if (ts[body]?.text !== '{') continue;
    let attributeStart = i;
    while (ts[attributeStart - 1]?.text === ']') {
      attributeStart = groups.get(attributeStart - 1);
    }
    const attributes = slice(attributeStart, i).replace(/\bpublic$/, '').trim();
    methods.push({
      name: ts[cursor + 1].text, start: i, body, end: groups.get(body),
      declarationLine: line(ts[i].start),
      attributes,
      inlineDataRowsSourceOnly: (attributes.match(/\bInlineData\s*\(/g) || []).length,
      usesMemberData: /\bMemberData\s*\(/.test(attributes),
    });
  }
  const masked = ts.map(token => token.text).join(' ');
  const analyzer = masked.match(/\bGetCSharpDiagnosticAnalyzer\s*\(\s*\)\s*(?:=\s*>\s*new\s+(\w+)|\{\s*return\s+new\s+(\w+))/);
  const calls = [];
  for (let i = 0; i < ts.length; i++) {
    if (!['VerifyCSharpDiagnostic', 'VerifyBasicDiagnostic', 'VerifyCSharpFix', 'VerifyBasicFix',
      'GetSortedDiagnosticsFromDocuments'].includes(ts[i].text) || ts[i + 1]?.text !== '(') continue;
    const method = methods.find(candidate => i > candidate.body && i < candidate.end);
    if (!method) continue;
    const end = groups.get(i + 1);
    const argumentGroups = [];
    let start = i + 2;
    for (let j = start; j < end; j++) {
      if (['(', '[', '{'].includes(ts[j].text)) { j = groups.get(j); continue; }
      if (ts[j].text === ',') { argumentGroups.push([start, j - 1]); start = j + 1; }
    }
    if (start < end) argumentGroups.push([start, end - 1]);
    const args = argumentGroups.map(([a, b]) => slice(a, b));
    const targetPath = ts[i].text === 'VerifyCSharpDiagnostic' || ts[i].text === 'VerifyBasicDiagnostic';
    const expected = [];
    if (targetPath) {
      for (let argument = 1; argument < argumentGroups.length; argument++) {
        const [a, b] = argumentGroups[argument];
        let initializer = null;
        if (ts[a].text === 'new' && ts[a + 1]?.text === 'DiagnosticResult' && ts[a + 2]?.text === '{') {
          initializer = slice(a, b);
        } else if (a === b) {
          for (let j = method.body; j < i; j++) {
            if (ts[j].text === ts[a].text && ts[j + 1]?.text === '=' &&
              ts[j + 2]?.text === 'new' && ts[j + 3]?.text === 'DiagnosticResult' &&
              ts[j + 4]?.text === '{') {
              initializer = slice(j + 2, groups.get(j + 4));
            }
          }
        }
        expected.push({
          expression: args[argument], provenScalarDiagnosticResultFromSource: initializer !== null,
          initializer,
        });
      }
    }
    calls.push({
      role: file.role, file: file.repositoryPath.replaceAll('/', '\\'), line: line(ts[i].start),
      className: path.basename(file.repositoryPath, '.cs'), method: method.name,
      methodDeclarationLine: method.declarationLine, methodAttributes: method.attributes,
      inlineDataRowsSourceOnly: method.inlineDataRowsSourceOnly, usesMemberData: method.usesMemberData,
      callee: ts[i].text, feedsTargetVerifier: targetPath,
      analyzerFromOverride: analyzer ? (analyzer[1] || analyzer[2]) : null,
      argumentExpressions: args,
      expectedDiagnosticCountSourceOnly: targetPath && expected.every(item => item.provenScalarDiagnosticResultFromSource)
        ? expected.length : null,
      expectedDiagnosticsSourceOnly: expected,
      invocation: slice(i, end), invocationSha256: sha(slice(i, end)),
      runtimeRowsExecuted: 0,
    });
  }
  return calls;
}

function main() {
  const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_FILES.json'), 'utf8'))
    .filter(file => ['Original', 'Default'].includes(file.role) &&
      /\/test\/[^/]+Test\.cs$/.test(file.repositoryPath));
  const calls = files.flatMap(inventory);
  const summaries = [];
  for (const role of ['Original', 'Default']) {
    const all = calls.filter(call => call.role === role);
    const target = all.filter(call => call.feedsTargetVerifier);
    const byClass = [];
    for (const className of [...new Set(target.map(call => call.className))].sort()) {
      const selected = target.filter(call => call.className === className);
      const histogram = {};
      for (const call of selected) {
        const key = String(call.expectedDiagnosticCountSourceOnly);
        histogram[key] = (histogram[key] || 0) + 1;
      }
      byClass.push({
        className, analyzer: selected[0].analyzerFromOverride,
        callSites: selected.length, expectedCountHistogramSourceOnly: histogram,
      });
    }
    const values = target.map(call => call.expectedDiagnosticCountSourceOnly).filter(Number.isInteger);
    summaries.push({
      role, testFilesInspected: files.filter(file => file.role === role).length,
      targetCallSites: target.length, targetClasses: byClass.length,
      basicDiagnosticCallSites: target.filter(call => call.callee === 'VerifyBasicDiagnostic').length,
      unresolvedExpectedCountCallSites: target.filter(call => call.expectedDiagnosticCountSourceOnly === null),
      minimumExpectedCountSourceOnly: Math.min(...values),
      maximumExpectedCountSourceOnly: Math.max(...values),
      maximumCountSourceCases: target.filter(call => call.expectedDiagnosticCountSourceOnly === Math.max(...values))
        .map(call => ({ file: call.file, method: call.method, line: call.line, expected: call.expectedDiagnosticCountSourceOnly })),
      relatedCodeFixCallSites: all.filter(call => call.callee.endsWith('Fix')).length,
      directProducerCallSites: all.filter(call => call.callee === 'GetSortedDiagnosticsFromDocuments').map(call => ({
        file: call.file, line: call.line, method: call.method, assertion: 'Assert.Single',
      })),
      byClass,
    });
  }
  save('CANONICAL_CALLERS.json', {
    evidenceKind: 'Bounded offline source-token inventory; not compiler semantic analysis, test discovery or execution.',
    limitations: [
      'Expected diagnostic counts describe canonical source assertions, not observed runtime populations.',
      'InlineData attributes are preserved verbatim; source rows are not reported as executed.',
      'MemberData is not evaluated and test invocations are not synthesized.',
      'Collection shape is established independently by the private caller and explicit Diagnostic[] producer source, not by this inventory.',
    ],
    summaries, calls,
  });
  console.log(JSON.stringify(summaries.map(({ byClass, ...summary }) => summary), null, 2));
}
try { main(); } catch (error) {
  save('CANONICAL_CALLERS-failed.json', { error: String(error) });
  console.error(error);
  process.exitCode = 1;
}
