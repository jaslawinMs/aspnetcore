import fs from 'node:fs';
import crypto from 'node:crypto';

export const hash = (data, algorithm = 'sha256') => crypto.createHash(algorithm).update(data).digest('hex');
export const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const align4 = n => (n + 3) & ~3;
const guid = b => `${b.readUInt32LE(0).toString(16).padStart(8, '0')}-${b.readUInt16LE(4).toString(16).padStart(4, '0')}-${b.readUInt16LE(6).toString(16).padStart(4, '0')}-${b.subarray(8, 10).toString('hex')}-${b.subarray(10, 16).toString('hex')}`;
const zstring = (b, p) => b.subarray(p, b.indexOf(0, p)).toString('utf8');

function metadata(buffer, root) {
  if (buffer.toString('ascii', root, root + 4) !== 'BSJB') throw Error('Not ECMA metadata');
  let cursor = root + align4(16 + buffer.readUInt32LE(root + 12));
  const count = buffer.readUInt16LE(cursor + 2);
  cursor += 4;
  const streams = {};
  for (let i = 0; i < count; i++) {
    const offset = buffer.readUInt32LE(cursor), size = buffer.readUInt32LE(cursor + 4);
    const name = zstring(buffer, cursor + 8);
    streams[name] = buffer.subarray(root + offset, root + offset + size);
    cursor += align4(8 + Buffer.byteLength(name) + 1);
  }
  const tables = streams['#~'] ?? streams['#-'];
  const heapSizes = tables[6], valid = tables.readBigUInt64LE(8), rows = {};
  let dataStart = 24;
  for (let i = 0; i < 64; i++) {
    if ((valid & (1n << BigInt(i))) !== 0n) {
      rows[i] = tables.readUInt32LE(dataStart);
      dataStart += 4;
    }
  }
  const sizes = { string: heapSizes & 1 ? 4 : 2, guid: heapSizes & 2 ? 4 : 2, blob: heapSizes & 4 ? 4 : 2 };
  const index = (b, p, size) => size === 4 ? b.readUInt32LE(p) : b.readUInt16LE(p);
  return { streams, tables, rows, dataStart, sizes, index };
}

function compressed(b, cursor) {
  const first = b[cursor];
  if ((first & 128) === 0) return [first, cursor + 1];
  if ((first & 192) === 128) return [((first & 63) << 8) | b[cursor + 1], cursor + 2];
  if ((first & 224) === 192) return [((first & 31) * 0x1000000) + b.readUIntBE(cursor + 1, 3), cursor + 4];
  throw Error('Invalid compressed metadata integer');
}

export function parsePe(buffer) {
  if (buffer.toString('ascii', 0, 2) !== 'MZ') throw Error('Not PE');
  const pe = buffer.readUInt32LE(60);
  if (buffer.toString('ascii', pe, pe + 4) !== 'PE\0\0') throw Error('Missing PE signature');
  const optional = pe + 24, magic = buffer.readUInt16LE(optional);
  const directory = optional + (magic === 0x20b ? 112 : 96);
  const sections = [];
  for (let i = 0; i < buffer.readUInt16LE(pe + 6); i++) {
    const p = optional + buffer.readUInt16LE(pe + 20) + i * 40;
    sections.push({ va: buffer.readUInt32LE(p + 12), size: Math.max(buffer.readUInt32LE(p + 8), buffer.readUInt32LE(p + 16)), raw: buffer.readUInt32LE(p + 20) });
  }
  const rva = address => {
    const section = sections.find(s => address >= s.va && address < s.va + s.size);
    if (!section) throw Error(`Unmapped RVA ${address}`);
    return section.raw + address - section.va;
  };
  const debugRva = buffer.readUInt32LE(directory + 6 * 8), debugSize = buffer.readUInt32LE(directory + 6 * 8 + 4);
  const codeView = [];
  if (debugRva) {
    for (let i = 0; i < debugSize / 28; i++) {
      const p = rva(debugRva) + i * 28;
      if (buffer.readUInt32LE(p + 12) === 2) {
        const q = buffer.readUInt32LE(p + 24);
        if (buffer.toString('ascii', q, q + 4) === 'RSDS') {
          codeView.push({ guid: guid(buffer.subarray(q + 4, q + 20)), stamp: buffer.readUInt32LE(p + 4), age: buffer.readUInt32LE(q + 20), pdbPath: zstring(buffer, q + 24) });
        }
      }
    }
  }
  const cliRva = buffer.readUInt32LE(directory + 14 * 8);
  let mvid = null;
  if (cliRva) {
    const cli = rva(cliRva), md = metadata(buffer, rva(buffer.readUInt32LE(cli + 8)));
    if (md.rows[0] !== 1) throw Error('Expected single module row');
    const mvidIndex = md.index(md.tables, md.dataStart + 2 + md.sizes.string, md.sizes.guid);
    mvid = guid(md.streams['#GUID'].subarray((mvidIndex - 1) * 16, mvidIndex * 16));
  }
  return { machine: buffer.readUInt16LE(pe + 4), coffTimestamp: buffer.readUInt32LE(pe + 8), mvid, codeView };
}

export function parsePdb(buffer) {
  const md = metadata(buffer, 0), blobHeap = md.streams['#Blob'], guidHeap = md.streams['#GUID'];
  const blob = index => {
    const [length, offset] = compressed(blobHeap, index);
    return blobHeap.subarray(offset, offset + length);
  };
  const getGuid = index => index === 0 ? null : guid(guidHeap.subarray((index - 1) * 16, index * 16));
  for (const id of Object.keys(md.rows).map(Number)) if (id < 48 && md.rows[id]) throw Error('Unexpected non-PDB table before Document');
  const documents = [];
  let p = md.dataStart;
  for (let i = 0; i < (md.rows[48] ?? 0); i++) {
    const nameIndex = md.index(md.tables, p, md.sizes.blob); p += md.sizes.blob;
    const algorithmIndex = md.index(md.tables, p, md.sizes.guid); p += md.sizes.guid;
    const checksumIndex = md.index(md.tables, p, md.sizes.blob); p += md.sizes.blob;
    const languageIndex = md.index(md.tables, p, md.sizes.guid); p += md.sizes.guid;
    const nameBlob = blob(nameIndex), separator = String.fromCharCode(nameBlob[0]), segments = [];
    for (let q = 1; q < nameBlob.length;) {
      const [segment, end] = compressed(nameBlob, q);
      segments.push(blob(segment).toString('utf8')); q = end;
    }
    documents.push({ row: i + 1, name: segments.join(separator), algorithm: getGuid(algorithmIndex), checksum: blob(checksumIndex).toString('hex'), language: getGuid(languageIndex) });
  }
  const id = md.streams['#Pdb'];
  return { guid: guid(id.subarray(0, 16)), stamp: id.readUInt32LE(16), documentCount: documents.length, documents };
}

// A recursive XML parser, not a regular-expression report extractor.
// The evidence format needs XML 1.0 elements, attributes, entities, comments,
// processing instructions and CDATA; DTD-bearing documents are not accepted.
export function parseXml(input) {
  const s = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let p = 0;
  const starts = value => s.startsWith(value, p);
  const consume = value => { if (!starts(value)) throw Error(`XML expected ${value} at ${p}`); p += value.length; };
  const whitespace = () => { while (p < s.length && ' \t\r\n'.includes(s[p])) p++; };
  const name = () => {
    const start = p;
    while (p < s.length && !' \t\r\n/>=?!<"\'&'.includes(s[p])) p++;
    if (p === start) throw Error(`XML name at ${p}`);
    return s.slice(start, p);
  };
  const decoded = text => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '&') { result += text[i]; continue; }
      const end = text.indexOf(';', i);
      if (end < 0) throw Error('Unclosed XML entity');
      const entity = text.slice(i + 1, end), known = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };
      if (entity[0] === '#') result += String.fromCodePoint(entity[1] === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
      else if (Object.hasOwn(known, entity)) result += known[entity];
      else throw Error(`Unknown XML entity ${entity}`);
      i = end;
    }
    return result;
  };
  const skip = (open, close) => {
    consume(open);
    const end = s.indexOf(close, p);
    if (end < 0) throw Error(`Unclosed ${open}`);
    p = end + close.length;
  };
  const misc = () => {
    for (;;) {
      whitespace();
      if (starts('<?')) skip('<?', '?>');
      else if (starts('<!--')) skip('<!--', '-->');
      else break;
    }
  };
  const element = () => {
    consume('<');
    const tag = name(), attributes = {}, children = [];
    let text = '';
    for (;;) {
      whitespace();
      if (starts('/>')) { p += 2; return { name: tag, attributes, children, text }; }
      if (starts('>')) { p++; break; }
      const key = name();
      whitespace(); consume('='); whitespace();
      const quote = s[p++];
      if (quote !== '"' && quote !== "'") throw Error('Unquoted XML attribute');
      const end = s.indexOf(quote, p);
      if (end < 0 || Object.hasOwn(attributes, key)) throw Error('Invalid XML attribute');
      attributes[key] = decoded(s.slice(p, end)); p = end + 1;
    }
    for (;;) {
      if (starts('</')) {
        p += 2; const closing = name(); whitespace(); consume('>');
        if (closing !== tag) throw Error('Mismatched XML closing element');
        return { name: tag, attributes, children, text };
      }
      if (starts('<!--')) skip('<!--', '-->');
      else if (starts('<?')) skip('<?', '?>');
      else if (starts('<![CDATA[')) {
        p += 9; const end = s.indexOf(']]>', p);
        if (end < 0) throw Error('Unclosed CDATA');
        text += s.slice(p, end); p = end + 3;
      } else if (starts('<')) children.push(element());
      else {
        const end = s.indexOf('<', p);
        if (end < 0) throw Error('Unclosed XML element');
        text += decoded(s.slice(p, end)); p = end;
      }
    }
  };
  misc();
  const root = element();
  misc();
  if (p !== s.length) throw Error('XML trailing data');
  return root;
}

export function parseTrx(text) {
  const root = parseXml(text), local = n => n.name.split(':').at(-1);
  const children = (n, tag) => n.children.filter(c => local(c) === tag);
  const one = (n, tag) => {
    const values = children(n, tag);
    if (values.length !== 1) throw Error(`Expected exactly one ${tag}`);
    return values[0];
  };
  if (local(root) !== 'TestRun') throw Error('Not TRX TestRun');
  const optional = (n, tag) => children(n, tag)[0] ?? { children: [] };
  const definitions = children(optional(root, 'TestDefinitions'), 'UnitTest').map(n => ({
    ...n.attributes, method: one(n, 'TestMethod').attributes, execution: one(n, 'Execution').attributes
  }));
  const entries = children(optional(root, 'TestEntries'), 'TestEntry').map(n => n.attributes);
  const results = children(optional(root, 'Results'), 'UnitTestResult').map(n => n.attributes);
  const summary = one(root, 'ResultSummary'), counters = one(summary, 'Counters').attributes;
  const ids = new Set(results.map(r => r.testId));
  if (ids.size !== results.length || definitions.length !== results.length || entries.length !== results.length) throw Error('TRX row/definition/entry cardinality mismatch');
  const rows = results.map(result => {
    const definition = definitions.find(d => d.id === result.testId);
    const entry = entries.find(e => e.testId === result.testId && e.executionId === result.executionId);
    if (!definition || !entry || definition.execution.id !== result.executionId) throw Error('TRX ID mismatch');
    return { ...result, method: definition.method, definitionName: definition.name, entry };
  });
  const passed = rows.filter(r => r.outcome === 'Passed').length, failed = rows.filter(r => r.outcome === 'Failed').length;
  if (+counters.total !== rows.length || +counters.executed !== passed + failed || +counters.passed !== passed || +counters.failed !== failed) throw Error('TRX counters mismatch');
  for (const [key, value] of Object.entries(counters)) {
    if (!['total', 'executed', 'passed', 'failed'].includes(key) && +value !== 0) throw Error(`Unexpected nonzero TRX counter ${key}`);
  }
  return { runId: root.attributes.id, outcome: summary.attributes.outcome, counters, rows, definitions, entries };
}

export function parseXunit(text) {
  const root = parseXml(text);
  if (root.name !== 'assemblies') throw Error('Not xUnit assemblies XML');
  const assemblies = root.children.filter(n => n.name === 'assembly');
  if (assemblies.length !== 1) throw Error('Expected one native xUnit assembly');
  const assembly = assemblies[0], collections = assembly.children.filter(n => n.name === 'collection');
  const rows = collections.flatMap(c => c.children.filter(n => n.name === 'test').map(n => n.attributes));
  const passed = rows.filter(r => ['Pass', 'Passed'].includes(r.result)).length;
  const failed = rows.filter(r => ['Fail', 'Failed'].includes(r.result)).length;
  const skipped = rows.filter(r => ['Skip', 'Skipped'].includes(r.result)).length;
  for (const [field, expected] of [['total', rows.length], ['passed', passed], ['failed', failed], ['skipped', skipped], ['errors', 0]]) {
    if (+assembly.attributes[field] !== expected) throw Error(`xUnit ${field} counter mismatch`);
  }
  for (const collection of collections) {
    if (+collection.attributes.total !== collection.children.filter(n => n.name === 'test').length) throw Error('xUnit collection counter mismatch');
  }
  return { assembly: assembly.attributes, collections: collections.map(c => c.attributes), rows, ids: 'Only identifiers actually present in raw XML; no synthetic TRX IDs assigned.' };
}
