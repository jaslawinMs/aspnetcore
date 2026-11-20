import fs from 'node:fs';
import crypto from 'node:crypto';

export const sha = b => crypto.createHash('sha256').update(b).digest('hex');
export const record = p => { const b = fs.readFileSync(p); return { bytes: b.length, sha256: sha(b) }; };
const u16 = (b, p) => b.readUInt16LE(p);
const u32 = (b, p) => b.readUInt32LE(p);
function guid(b) {
  const h = b.toString('hex');
  return `${b.subarray(0, 4).reverse().toString('hex')}-${b.subarray(4, 6).reverse().toString('hex')}-${b.subarray(6, 8).reverse().toString('hex')}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function compressed(b, p) {
  const a = b[p];
  if (!(a & 0x80)) return [a, p + 1];
  if ((a & 0xc0) === 0x80) return [((a & 0x3f) << 8) | b[p + 1], p + 2];
  if ((a & 0xe0) === 0xc0) return [(a & 0x1f) * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3], p + 4];
  throw Error('Invalid compressed metadata integer');
}
function streams(b, offset = 0) {
  if (b.toString('ascii', offset, offset + 4) !== 'BSJB') throw Error('Not CLI metadata');
  let p = (offset + 16 + u32(b, offset + 12) + 3) & ~3;
  const count = u16(b, p + 2); p += 4;
  const result = {};
  for (let i = 0; i < count; i++) {
    const relative = u32(b, p), size = u32(b, p + 4), end = b.indexOf(0, p + 8);
    result[b.toString('ascii', p + 8, end)] = b.subarray(offset + relative, offset + relative + size);
    p = (end + 4) & ~3;
  }
  return result;
}
function tables(s) {
  const b = s['#~'] ?? s['#-'], valid = b.readBigUInt64LE(8), rows = {};
  let p = 24;
  for (let i = 0; i < 64; i++) {
    if ((valid >> BigInt(i)) & 1n) { rows[i] = u32(b, p); p += 4; }
  }
  return { b, heaps: b[6], rows, p };
}
const getGuid = (s, i) => i ? guid(Buffer.from(s['#GUID'].subarray((i - 1) * 16, i * 16))) : null;
function blob(s, i) {
  const [length, p] = compressed(s['#Blob'], i);
  return s['#Blob'].subarray(p, p + length);
}
function index(b, p, wide) { const size = wide ? 4 : 2; return [wide ? u32(b, p) : u16(b, p), p + size]; }
export function pe(file) {
  const b = fs.readFileSync(file), header = u32(b, 0x3c);
  if (!b.subarray(header, header + 4).equals(Buffer.from('PE\0\0'))) throw Error('Not PE');
  const count = u16(b, header + 6), optSize = u16(b, header + 20), opt = header + 24;
  const directories = opt + (u16(b, opt) === 0x20b ? 112 : 96), sections = [];
  for (let i = 0; i < count; i++) {
    const p = opt + optSize + 40 * i;
    sections.push({ address: u32(b, p + 12), size: Math.max(u32(b, p + 8), u32(b, p + 16)), raw: u32(b, p + 20) });
  }
  function rva(value) {
    const s = sections.find(s => s.address <= value && value < s.address + s.size);
    if (!s) throw Error(`Unmapped RVA ${value}`);
    return s.raw + value - s.address;
  }
  const clr = rva(u32(b, directories + 14 * 8)), s = streams(b, rva(u32(b, clr + 8))), t = tables(s);
  if (t.rows[0] !== 1) throw Error('Expected one Module row');
  let p = t.p + 2, unused, mvid;
  [unused, p] = index(t.b, p, t.heaps & 1); [mvid, p] = index(t.b, p, t.heaps & 2);
  const result = { ...record(file), mvid: getGuid(s, mvid), codeView: [] };
  const debugRva = u32(b, directories + 6 * 8), debugSize = u32(b, directories + 6 * 8 + 4);
  if (debugRva) {
    const debug = rva(debugRva);
    for (let i = 0; i < Math.floor(debugSize / 28); i++) {
      const e = debug + 28 * i, kind = u32(b, e + 12), size = u32(b, e + 16), offset = u32(b, e + 24);
      if (kind === 2 && b.toString('ascii', offset, offset + 4) === 'RSDS') {
        result.codeView.push({
          guid: guid(Buffer.from(b.subarray(offset + 4, offset + 20))), stamp: u32(b, e + 4), age: u32(b, offset + 20),
          pdbPath: b.subarray(offset + 24, offset + size).toString('utf8').split('\0')[0]
        });
      }
    }
  }
  return result;
}
export function pdb(file) {
  const b = fs.readFileSync(file), s = streams(b), id = s['#Pdb'].subarray(0, 20), t = tables(s);
  if (Object.entries(t.rows).some(([k, v]) => +k < 48 && v)) throw Error('Unexpected pre-Document PDB table');
  const documents = []; let p = t.p;
  for (let row = 1; row <= (t.rows[48] ?? 0); row++) {
    let name, algorithm, checksum, language;
    [name, p] = index(t.b, p, t.heaps & 4); [algorithm, p] = index(t.b, p, t.heaps & 2);
    [checksum, p] = index(t.b, p, t.heaps & 4); [language, p] = index(t.b, p, t.heaps & 2);
    const n = blob(s, name), parts = []; let q = 1;
    while (q < n.length) { let part; [part, q] = compressed(n, q); parts.push(blob(s, part).toString('utf8')); }
    documents.push({ row, name: parts.join(String.fromCharCode(n[0])), algorithm: getGuid(s, algorithm), checksum: blob(s, checksum).toString('hex'), language: getGuid(s, language) });
  }
  return { ...record(file), idGuid: guid(Buffer.from(id.subarray(0, 16))), idStamp: u32(id, 16), documents };
}
export function source(file) {
  const b = fs.readFileSync(file), text = b.toString('utf8'), lf = Buffer.from(text.replaceAll('\r\n', '\n'));
  return { ...record(file), crlfPairs: (text.match(/\r\n/g) ?? []).length, lfBytes: lf.length, lfSha256: sha(lf),
    gitLfBlobSha1: crypto.createHash('sha1').update(Buffer.from(`blob ${lf.length}\0`)).update(lf).digest('hex') };
}
function attributes(text) {
  const decode = x => x.replace(/&#x([0-9a-f]+);|&#([0-9]+);|&(quot|apos|lt|gt|amp);/gi, (_, h, n, k) =>
    h ? String.fromCodePoint(parseInt(h, 16)) : n ? String.fromCodePoint(+n) : ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' })[k]);
  return Object.fromEntries([...text.matchAll(/([A-Za-z_:][-\w.:]*)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
}
export function trx(file) {
  const xml = fs.readFileSync(file, 'utf8');
  if (!xml.includes('http://microsoft.com/schemas/VisualStudio/TeamTest/2010')) throw Error('Unexpected TRX namespace');
  const all = tag => [...xml.matchAll(new RegExp(`<${tag}\\b([^>]*?)\\/?\\s*>`, 'g'))].map(m => attributes(m[1]));
  const definitions = [...xml.matchAll(/<UnitTest\b([^>]*?)>([\s\S]*?)<\/UnitTest>/g)].map(m => ({
    attributes: attributes(m[1]), execution: attributes(m[2].match(/<Execution\b([^>]*?)\/>/)?.[1] ?? ''),
    method: attributes(m[2].match(/<TestMethod\b([^>]*?)\/>/)?.[1] ?? '')
  }));
  return { run: all('TestRun')[0], counters: all('Counters')[0] ?? null, results: all('UnitTestResult'), definitions, entries: all('TestEntry') };
}
export function differences(left, right) {
  const result = [];
  for (const scope of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    const a = left[scope] ?? {}, b = right[scope] ?? {};
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) result.push({ scope, key, original37: a[key] ?? null, default: b[key] ?? null });
    }
  }
  return result;
}
