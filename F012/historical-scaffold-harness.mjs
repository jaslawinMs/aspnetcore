import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const prior = path.join(session, 'autoperf-runs', 'F011');
const run = path.join(session, 'autoperf-runs', 'F012');
const manifest = JSON.parse(fs.readFileSync(path.join(prior, 'manifest-original.json'), 'utf8'));
const investigation = JSON.parse(fs.readFileSync(path.join(run, 'current-source-investigation.json'), 'utf8'));
const output = path.join(run, 'harness');
assert.equal(investigation.candidate, 'F012');
assert(!fs.existsSync(output), 'Preserve every scaffold/build attempt.');
fs.mkdirSync(output);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const transformations = [];
function edit(text, before, after, expected = null) {
  const count = text.split(before).length - 1;
  assert(count > 0 && (expected === null || count === expected), 'Exact template seam: ' + before);
  transformations.push({ before, after, actualOccurrences: count });
  return text.replaceAll(before, after);
}
const files = [];
for (const name of ['AutoPerf.Benchmarks.csproj', 'Program.cs', 'GroupSendFixture.cs', 'ContractProbes.cs',
  'GroupSendBenchmarks.cs', 'SettingsPreservingEmitToolchain.cs']) {
  const bytes = fs.readFileSync(path.join(prior, 'harness', name));
  assert.equal(hash(bytes), manifest.sources.find(row => row.path === 'harness\\' + name).sha256);
  let text = bytes.toString('utf8').replaceAll('\r\n', '\n');
  if (name === 'Program.cs') {
    text = edit(text, 'F011', 'F012');
    text = edit(text, 'GroupSendFixture', 'BroadcastSendFixture');
    text = edit(text, 'GroupSendBenchmarks', 'BroadcastSendBenchmarks');
    text = edit(text, 'public group sends', 'public broadcast sends', 1);
  }
  if (name === 'GroupSendFixture.cs') {
    text = edit(text, 'GroupSendFixture', 'BroadcastSendFixture');
    text = edit(text, '    private readonly string _targetGroup;\n', '', 1);
    text = edit(text, 'int groupMembers = -1, string targetGroup = "group", bool expectSingleRecipient = false',
      'int groupMembers = 0, bool expectSingleRecipient = false', 1);
    text = edit(text, '        _targetGroup = targetGroup;\n', '', 1);
    text = edit(text, 'groupMembers < 0 || index < groupMembers', 'index < groupMembers', 1);
    text = edit(text, 'Manager.SendGroupExceptAsync(_targetGroup, "Probe", _arguments, _excluded, cancellationToken)',
      'Manager.SendAllExceptAsync("Probe", _arguments, _excluded, cancellationToken)', 1);
  }
  if (name === 'ContractProbes.cs') {
    text = edit(text, 'GroupSendFixture', 'BroadcastSendFixture');
    text = edit(text, 'GroupScopeCaseAndDuplicates', 'BroadcastScopeCaseAndDuplicates', 3);
    text = edit(text, 'MissingGroupDoesNotReadInput', 'EmptyConnectionStoreDoesNotReadInput', 3);
    text = edit(text, '["CONNECTION", "Connection"], ["World"], groupMembers: 3',
      '["CONNECTION", "Connection", "outside"], ["World"], groupMembers: 3', 1);
    text = edit(text, `        var excluded = new UnreadableList();
        await using var fixture = new BroadcastSendFixture(["c0000"], excluded, [], ["World"], targetGroup: "GROUP");
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(excluded.Reads == 0, "An absent case-sensitive group touched caller input.");

        return new { inputReads = excluded.Reads, actual = fixture.Observe() };`,
      `        var excluded = new UnreadableList();
        var payload = new ObservedPayload(throwIfRead: true);
        await using var fixture = new BroadcastSendFixture([], excluded, [], [payload]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(excluded.Reads == 0 && payload.Reads == 0, "An empty connection store touched exclusions or serialized arguments.");

        return new { inputReads = excluded.Reads, argumentGetterReads = payload.Reads, actual = fixture.Observe() };`, 1);
    text = edit(text, '(Group:', '(Connections:');
    text = edit(text, 'dimensions.Group', 'dimensions.Connections');
    text = edit(text, 'RepeatedMissEnumerationG', 'RepeatedMissEnumerationC', 1);
    text = edit(text, 'groupSize', 'connectionCount');
    text = edit(text, '                await manager.AddToGroupAsync(hub.ConnectionId, "group");\n', '', 1);
    text = edit(text, 'manager.SendGroupExceptAsync("group", "Probe", ["World"], [], cancellation.Token)',
      'manager.SendAllExceptAsync("Probe", ["World"], [], cancellation.Token)', 1);
    text = edit(text, 'An absent group must not inspect exclusions.', 'An empty connection store must not inspect exclusions.', 1);
    text = edit(text, 'An entirely excluded group serialized the argument.', 'An entirely excluded broadcast serialized the argument.', 1);
    text = edit(text, 'The group send completed before the other actual pipe was drained.',
      'The broadcast completed before the other actual pipe was drained.', 1);
  }
  if (name === 'GroupSendBenchmarks.cs') {
    text = edit(text, 'GroupSendBenchmarks', 'BroadcastSendBenchmarks');
    text = edit(text, 'GroupSendFixture', 'BroadcastSendFixture');
    text = edit(text, 'NoGroup512', 'NoConnections512');
    text = edit(text, 'G32', 'C32');
    text = edit(text, 'G128', 'C128');
    text = edit(text, 'groupSize', 'connectionCount');
    text = edit(text, '            Shape.OneEmpty => 1,', '            Shape.NoConnections512 => 0,\n            Shape.OneEmpty => 1,', 1);
    text = edit(text, `_fixture = new BroadcastSendFixture(ids, excluded, expectedRecipients, ["World"],
            targetGroup: Shape is Shape.NoConnections512 ? "missing" : "group");`,
      '_fixture = new BroadcastSendFixture(ids, excluded, expectedRecipients, ["World"]);', 1);
  }
  const destination = name.replace('GroupSend', 'BroadcastSend');
  const result = name === 'SettingsPreservingEmitToolchain.cs' || name.endsWith('.csproj') ? bytes : Buffer.from(text);
  fs.writeFileSync(path.join(output, destination), result);
  files.push({ source: `F011/harness/${name}`, destination: `harness/${destination}`,
    sourceSha256: hash(bytes), resultSha256: hash(result), byteExactCopy: result.equals(bytes) });
}
const joined = fs.readdirSync(output).map(name => fs.readFileSync(path.join(output, name), 'utf8')).join('\n');
assert(!joined.includes('SendGroupExceptAsync') && !joined.includes('targetGroup') && !joined.includes('GroupSend'));
assert.equal(joined.split('SendAllExceptAsync').length - 1, 2);
fs.writeFileSync(path.join(run, 'scaffold-provenance.json'), JSON.stringify({
  candidate: 'F012', kind: 'Checked bulk adaptation of the previously executed real-owner harness; no F011 source overwritten.',
  files, transformations, actualBroadcastEntryPoints: 2,
  groupMembership: 'Only the untimed scope control adds three of four connections to a group. All timed connections and actual Pipe controls require registration only.',
  outcome: 'Source scaffolding only, not a build, producer observation or timing comparison.',
}, null, 2) + '\n');
console.log('F012 six-file standalone broadcast harness scaffolded from verified F011 templates; exact transformation provenance retained.');
