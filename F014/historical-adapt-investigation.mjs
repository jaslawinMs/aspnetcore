import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const original = fs.readFileSync(path.join(session, 'F013-investigate.mjs'));
let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F013', 'F014');
const changes = [];
function edit(before, after, count = 1) {
  equal(content.split(before).length - 1, count);
  content = content.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
function equal(actual, expected) {
  assert.deepEqual(actual, expected);
}
edit("assert(['autoperf/F012-signalr-broadcast-exclusions', acceptance.branch].includes(branch));",
  "assert(['autoperf/F013-signalr-targeted-membership', acceptance.branch].includes(branch));");
edit("const sources = previous.sources.filter(row => row.file.startsWith('src\\\\SignalR\\\\') || row.file.startsWith('src\\\\Servers\\\\'))\n  .map(row => {\n    const file = row.file;",
  `const selected = [
  ...previous.sources.filter(row => row.file.startsWith('src\\\\SignalR\\\\') || row.file.startsWith('src\\\\Servers\\\\')).map(row => row.file),
  'src\\\\SignalR\\\\server\\\\Core\\\\src\\\\DefaultUserIdProvider.cs',
  'src\\\\SignalR\\\\server\\\\Core\\\\src\\\\IUserIdProvider.cs',
  'src\\\\Servers\\\\Connections.Abstractions\\\\src\\\\Features\\\\IConnectionUserFeature.cs',
];
const sources = selected.map(file => {`);
edit('assert.equal(sources.length, 20);', 'assert.equal(sources.length, 23);');
edit('SendConnectionsAsync repo:dotnet/aspnetcore', 'SendUsersAsync repo:dotnet/aspnetcore');
edit('priorF011EvidenceIsNotTargetedSendBehaviorProof', 'priorF011EvidenceIsNotUserSendBehaviorProof');
edit('all27 historical rows passed with identical owner/source/SDK. Explicit prior preparation evidence only; a selected compatible shipping candidate requires fresh focused owning tests and all four16/17 array/List payloads.',
  'all27 historical rows passed with identical owner/source/SDK. Explicit old preparation evidence only, not a fresh F014 suite; any selected compatible candidate requires fresh focused owning tests and actual user-send producer controls.');
edit('every actual F014 targeted-send probe. This does not reuse F011/F012 exclusion observations or timing.',
  'every actual F014 user-send probe. This does not reuse F011/F012/F013 observations or timing.');
edit('untimedOwningTestRerunPlanned: true', 'untimedOwningTestRerunPlanned: false');
edit("subject: 'Actual owner diff optimizes <=16 requested IDs in SendConnectionsAsync. The independent F014 finding is its remaining >16 scan; do not mark the entire path duplicate.'",
  "subject: 'Actual owner diff optimizes SendConnectionsAsync, not the independent SendUsersAsync user-identifier scan. No upstream or prior group/broadcast/connection timing reused.'");
edit('Known owner and its SendToAllConnections body read directly; Known targeted-send owner and shared SendToAllConnections body read; no complete caller/dispatch graph claim.',
  'Known user-send owner, actual DefaultUserIdProvider/public user features and shared SendToAllConnections body read directly. LSP returned no workspace symbols for provider/feature; no complete caller/dispatch graph claim.');
edit("write('investigation/open-exact-symbol-pr-search.json'", `write('investigation/provider-history.json', gh('api',
  \`repos/dotnet/aspnetcore/commits?sha=\${fresh.sha}&path=src/SignalR/server/Core/src/DefaultUserIdProvider.cs&per_page=3\`));
write('investigation/context-history.json', gh('api',
  \`repos/dotnet/aspnetcore/commits?sha=\${fresh.sha}&path=src/SignalR/server/Core/src/HubConnectionContext.cs&per_page=3\`));
write('investigation/open-exact-symbol-pr-search.json'`);
const destination = path.join(session, 'F014-investigate.mjs');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, content);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'investigation-tools-attribution.json'), JSON.stringify({
  candidate: 'F014', template: 'F013-investigate.mjs', templateSha256: hash(original),
  resultSha256: hash(Buffer.from(content)), changes,
  qualification: 'Checked independent user-send reader with fresh owner/provider/context history, actual additional provider/feature source triples and user-specific PR search. No investigation or timing launched by this scaffolder.',
}, null, 2) + '\n');
console.log('F014 fresh user-send investigation reader prepared;23 selected source triples planned, no source candidate or timing.');
