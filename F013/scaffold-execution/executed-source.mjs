import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const prior = path.join(session, 'autoperf-runs', 'F012');
const run = path.join(session, 'autoperf-runs', 'F013');
const manifest = JSON.parse(fs.readFileSync(path.join(prior, 'manifest-original.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const outputs = [];
for (const name of ['AutoPerf.Benchmarks.csproj', 'SettingsPreservingEmitToolchain.cs', 'Program.cs',
  'BroadcastSendFixture.cs', 'ContractProbes.cs']) {
  const source = fs.readFileSync(path.join(prior, 'harness', name));
  assert.equal(hash(source), manifest.sources.find(row => row.path === 'harness\\' + name).sha256);
  const destination = name.replaceAll('BroadcastSend', 'TargetedSend');
  let text = source.toString('utf8');
  const changes = [];
  function edit(before, after, count = 1) {
    const actual = text.split(before).length - 1;
    assert.equal(actual, count, destination + ': ' + before);
    text = text.replaceAll(before, after);
    changes.push({ before, after, actualOccurrences: actual });
  }
  function section(start, end, replacement) {
    const first = text.indexOf(start);
    const last = text.indexOf(end);
    assert(first >= 0 && last > first && text.lastIndexOf(start) === first && text.lastIndexOf(end) === last);
    changes.push({ replacedSection: start.trim(), throughBefore: end.trim() });
    text = text.slice(0, first) + replacement.trimEnd() + '\n\n' + text.slice(last);
  }
  if (name.endsWith('.cs') && name !== 'SettingsPreservingEmitToolchain.cs') {
    text = text.replaceAll('\r\n', '\n').replaceAll('F012', 'F013').replaceAll('BroadcastSend', 'TargetedSend');
    if (name === 'Program.cs') {
      edit('Original-owner characterization or original-only diagnostic; no indexed shipping candidate or before/after improvement.',
        'Actual targeted-send characterization or one member of a separately budgeted comparison; no gain assumption.');
      edit('public broadcast sends', 'public targeted sends');
      edit('SettingsPreserving-F013-original-only', 'SettingsPreserving-F013');
      edit('Every expected original-only diagnostic report must succeed.', 'Every expected actual targeted-send profile report must succeed.');
      edit('context, candidateProfiles = 0, pairedComparisons = 0',
        'context, singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true');
    }
    if (name === 'BroadcastSendFixture.cs') {
      text = text.replaceAll('_excluded', '_targets').replaceAll('excluded', 'targets');
      edit('return Manager.SendAllExceptAsync("Probe", _arguments, _targets, cancellationToken);',
        'return Manager.SendConnectionsAsync(_targets, "Probe", _arguments, cancellationToken);');
    }
    if (name === 'ContractProbes.cs') {
      text = text.replaceAll('BroadcastScopeCaseAndDuplicates', 'LargeTargetScopeCaseAndDuplicates')
        .replaceAll('EmptyConnectionStoreDoesNotReadInput', 'EmptyConnectionStoreOnlyReadsTargetCount')
        .replaceAll('AllExcludedDoesNotSerializeCanceledSend', 'AllMissingDoesNotSerializeCanceledSend')
        .replaceAll('broadcast', 'targeted send').replaceAll('excluded', 'targets').replaceAll('exclusionSize', 'targetSize')
        .replaceAll('shippingSourceCandidate = false', 'inputSnapshotIsShippingImplementation = false');
      edit('(Connections: 1, Excluded: 1), (Connections: 8, Excluded: 16), (Connections: 32, Excluded: 64)',
        '(Connections: 1, Targets: 17), (Connections: 8, Targets: 32), (Connections: 32, Targets: 64)');
      edit('E{dimensions.Excluded}', 'T{dimensions.Targets}');
      edit('dimensions.Connections, dimensions.Excluded', 'dimensions.Connections, dimensions.Targets');
      edit('await RunCase("SnapshotInputControlCustomDispatch", () => CustomCollectionContainsDispatch(snapshotControl: true));',
        'await RunCase("SnapshotInputControlCustomDispatch", () => CustomCollectionContainsDispatch(snapshotControl: true));\n' +
        '        await RunCase("DerivedListRetainsCustomContainsDispatch", DerivedListRetainsCustomContainsDispatch);');
      section('    private static async Task<object> LargeTargetScopeCaseAndDuplicates()',
        '    private static async Task<object> EmptyConnectionStoreOnlyReadsTargetCount()', String.raw`
    private static async Task<object> LargeTargetScopeCaseAndDuplicates()
    {
        string[] ids = ["connection", "CONNECTION", "Connection", "outside"];
        var targets = LargeTargets("connection", "connection", "outside");
        await using var fixture = new TargetedSendFixture(ids, targets,
            ["connection", "outside"], ["World"], groupMembers: 3);
        await fixture.Send();
        fixture.Validate();

        return new { targetCount = targets.Length, actual = fixture.Observe() };
    }`);
      edit('targets.Reads == 0 && payload.Reads == 0', 'targets.CountReads == 1 && targets.Reads == 0 && payload.Reads == 0');
      edit('inputReads = targets.Reads, argumentGetterReads = payload.Reads',
        'targetCountReads = targets.CountReads, inputReadsBeyondCount = targets.Reads, argumentGetterReads = payload.Reads');
      edit('new TargetedSendFixture(["c0000", "c0001"], ["c0000", "c0001"],',
        'new TargetedSendFixture(["c0000", "c0001"], LargeTargets(),');
      edit('new TargetedSendFixture(ids, [], ids, [payload])',
        'new TargetedSendFixture(ids, LargeTargets(ids), ids, [payload])');
      edit('var initial = Enumerable.Range(0, 16).Select(index => $"missing-{index:D4}").ToArray();',
        'var initial = LargeTargets(ids);\n        var removed = ids.Select(id => "removed-" + id).ToArray();');
      edit('var payload = new ObservedPayload(backing, ids);', 'var payload = new ObservedPayload(backing, removed);');
      edit('var originalCount = original.Count;', 'var originalCount = original.Count;\n        Evidence.Require(originalCount == 17, "The mutation probe must exercise the actual >16 path.");');
      edit('IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(original, StringComparer.Ordinal).ToArray() : original;',
        'IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(original, StringComparer.Ordinal).ToArray() : original;\n' +
        '        Evidence.Require(input.Count == 17, "A copied-input control must not cross the existing16-target boundary.");');
      edit('ids.Select((id, index) => original[index] == id)', 'removed.Select((id, index) => original[index] == id)');
      edit('new DispatchList(["connection"])', 'new DispatchList(LargeTargets("connection"))');
      edit('snapshotControl ? ["CONNECTION", "other"] : ["other"]',
        'snapshotControl ? [] : ["CONNECTION"]');
      edit('targets.CountReads == 0 && targets.IndexerReads == 0', 'targets.CountReads == 1 && targets.IndexerReads == 0');
      edit('new TargetedSendFixture(ids, targets, ids, ["World"])', 'new TargetedSendFixture(ids, targets, [], ["World"])');
      edit('var send = manager.SendAllExceptAsync("Probe", ["World"], [], cancellation.Token);',
        'var send = manager.SendConnectionsAsync(LargeTargets("pipe-0", "pipe-1"), "Probe", ["World"], cancellation.Token);');
      edit('    private sealed class ObservedPayload', String.raw`    private static string[] LargeTargets(params string[] ids)
    {
        return ids.Concat(Enumerable.Range(0, 17 - ids.Length).Select(index => $"missing-{index:D4}")).ToArray();
    }

    private sealed class ObservedPayload`);
      section('    private sealed class UnreadableList', '    private sealed class DispatchList', String.raw`
    private sealed class UnreadableList : IReadOnlyList<string>
    {
        public int Reads { get; private set; }
        public int CountReads { get; private set; }
        private Exception UnexpectedRead()
        {
            Reads++;

            return new InvalidOperationException("An empty store must not read targets beyond the required Count.");
        }
        public int Count
        {
            get
            {
                CountReads++;

                return 17;
            }
        }
        public string this[int index] => throw UnexpectedRead();
        public IEnumerator<string> GetEnumerator() => throw UnexpectedRead();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }`);
      const derived = String.raw`    private static async Task<object> DerivedListRetainsCustomContainsDispatch()
    {
        var targets = new DerivedDispatchList();
        targets.AddRange(LargeTargets("connection"));
        await using var fixture = new TargetedSendFixture(["CONNECTION", "other"], targets, ["CONNECTION"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.Count == 17 && targets.ContainsCalls == 2, "Derived List ICollection.Contains dispatch was bypassed.");

        return new { targetCount = targets.Count, targets.ContainsCalls, customComparison = "OrdinalIgnoreCase", actual = fixture.Observe() };
    }

    private sealed class DerivedDispatchList : List<string>, ICollection<string>
    {
        public int ContainsCalls { get; private set; }
        bool ICollection<string>.Contains(string value)
        {
            ContainsCalls++;

            return this.Contains(value, StringComparer.OrdinalIgnoreCase);
        }
    }

`;
      edit('    private static async Task<object> RepeatedMissEnumeration', derived + '    private static async Task<object> RepeatedMissEnumeration');
      assert(!text.includes('SendAllExceptAsync'));
    }
  }
  const file = path.join(run, 'harness', destination);
  assert(!fs.existsSync(file));
  fs.writeFileSync(file, text);
  outputs.push({ template: 'F012/harness/' + name, templateSha256: hash(source),
    destination: 'harness/' + destination, resultSha256: hash(Buffer.from(text)), changes });
}
const fresh = path.join(run, 'harness', 'TargetedSendBenchmarks.cs');
assert(fs.existsSync(fresh));
outputs.push({ destination: 'harness/TargetedSendBenchmarks.cs', resultSha256: hash(fs.readFileSync(fresh)),
  origin: 'New independent14-shape targeted-send workload; actual inputs/recipients asserted outside timing.' });
fs.writeFileSync(path.join(run, 'scaffold-provenance.json'), JSON.stringify({
  candidate: 'F013', files: outputs,
  qualification: 'Hash-checked runnable harness adaptation; every targeted-send observation must execute anew. No prior exclusion behavior/timing reused as targeted-send proof.',
}, null, 2) + '\n');
console.log('F013 independent six-file targeted-send harness prepared:18 native producer checks and14 actual timed-wrapper paths, no build or timing launched.');
