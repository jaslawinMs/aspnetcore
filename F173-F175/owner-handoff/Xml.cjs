'use strict';
const assert = require('node:assert/strict');
function parseXml(input) {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let cursor = 0;
  const root = { name: '#document', attributes: {}, children: [], text: '' }, stack = [root];
  const space = () => { while (/\s/.test(text[cursor] ?? '') && cursor < text.length) cursor++; };
  const name = () => {
    const start = cursor;
    while (cursor < text.length && !/[\s=/>?]/.test(text[cursor])) cursor++;
    assert(cursor > start, 'XML name');
    return text.slice(start, cursor);
  };
  const decode = value => value.replace(/&([^;]+);/g, (_, entity) => {
    const predefined = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.hasOwn(predefined, entity)) return predefined[entity];
    if (/^#x[0-9a-f]+$/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (/^#[0-9]+$/.test(entity)) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    throw new Error(`Unsupported XML entity ${entity}`);
  });
  while (cursor < text.length) {
    if (text[cursor] !== '<') {
      const end = text.indexOf('<', cursor), stop = end < 0 ? text.length : end;
      stack.at(-1).text += decode(text.slice(cursor, stop)); cursor = stop; continue;
    }
    if (text.startsWith('<!--', cursor)) {
      const end = text.indexOf('-->', cursor + 4); assert(end >= 0); cursor = end + 3; continue;
    }
    if (text.startsWith('<?', cursor)) {
      const end = text.indexOf('?>', cursor + 2); assert(end >= 0); cursor = end + 2; continue;
    }
    if (text.startsWith('<![CDATA[', cursor)) {
      const end = text.indexOf(']]>', cursor + 9); assert(end >= 0);
      stack.at(-1).text += text.slice(cursor + 9, end); cursor = end + 3; continue;
    }
    assert(!text.startsWith('<!', cursor), 'DTD/declarations are not accepted by this bounded XML parser');
    cursor++;
    if (text[cursor] === '/') {
      cursor++; const closing = name(); space(); assert.equal(text[cursor++], '>');
      assert(stack.length > 1); assert.equal(stack.pop().name, closing, 'XML balanced end tag'); continue;
    }
    const element = { name: name(), attributes: {}, children: [], text: '' };
    while (true) {
      space();
      if (text[cursor] === '/' || text[cursor] === '>') break;
      const attribute = name(); space(); assert.equal(text[cursor++], '='); space();
      const quote = text[cursor++]; assert(quote === '"' || quote === "'");
      const end = text.indexOf(quote, cursor); assert(end >= 0); assert(!Object.hasOwn(element.attributes, attribute));
      element.attributes[attribute] = decode(text.slice(cursor, end).replace(/[\n\t]/g, ' ')); cursor = end + 1;
    }
    stack.at(-1).children.push(element);
    if (text[cursor] === '/') { cursor++; assert.equal(text[cursor++], '>'); }
    else { assert.equal(text[cursor++], '>'); stack.push(element); }
  }
  assert.equal(stack.length, 1, 'XML closed document');
  assert.equal(root.children.length, 1, 'XML single root');
  return root.children[0];
}
function elements(root, localName) {
  return [...(root.name.split(':').at(-1) === localName ? [root] : []),
    ...root.children.flatMap(child => elements(child, localName))];
}
module.exports = { parseXml, elements };
