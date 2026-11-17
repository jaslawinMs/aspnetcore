import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const prior = path.join(session, 'autoperf-runs', 'F013', 'harness');
const output = path.join(run, 'harness');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const records = [];
function one(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, before);
  return source.replace(before, after);
}
for (const [from, to] of [
  ['AutoPerf.Benchmarks.csproj', 'AutoPerf.Benchmarks.csproj'],
  ['Program.cs', 'Program.cs'],
  ['TargetedSendFixture.cs', 'UserSendFixture.cs'],
  ['SettingsPreservingEmitToolchain.cs', 'SettingsPreservingEmitToolchain.cs'],
]) {
  const original = fs.readFileSync(path.join(prior, from));
  let content = original.toString('utf8');
  if (from !== 'SettingsPreservingEmitToolchain.cs') {
    content = content.replaceAll('\r\n', '\n').replaceAll('F013', 'F014')
      .replaceAll('TargetedSendFixture', 'UserSendFixture').replaceAll('TargetedSendBenchmarks', 'UserSendBenchmarks');
  }
  if (from === 'Program.cs') {
    content = one(content, '"HubConnectionStore.cs", "SerializedHubMessage.cs" }',
      '"HubConnectionStore.cs", "SerializedHubMessage.cs", "DefaultUserIdProvider.cs" }');
    content = one(content,
      'Actual targeted-send characterization or one member of a separately budgeted comparison; no gain assumption.',
      'Actual user-send characterization or one independently budgeted profile; no gain assumption.');
    content = one(content,
      'Repeated public targeted sends over pre-created real connections, real JSON serialization and bounded synchronous transports; minimal call/frame/byte counters; not network, handshake, stateful reconnect, connection creation or production frequency.',
      'Repeated public user-targeted sends over pre-created real connections; actual DefaultUserIdProvider/principal setup outside timing, real JSON serialization and bounded synchronous transports with minimal counters. Not network, handshake, stateful reconnect, principal/provider/connection/input construction or production frequency.');
    content = one(content, 'Every expected actual targeted-send profile report must succeed.',
      'Every expected actual user-send profile report must succeed.');
  }
  if (from === 'TargetedSendFixture.cs') {
    content = one(content, 'using System.IO.Pipelines;', 'using System.IO.Pipelines;\nusing System.Security.Claims;');
    content = one(content, 'public UserSendFixture(string[] ids, IReadOnlyList<string> targets, string[] expectedRecipients,',
      'public UserSendFixture(string[] ids, string?[] userIdentifiers, IReadOnlyList<string> targets, string[] expectedRecipients,');
    content = one(content, '        _targets = targets;',
      '        Evidence.Require(ids.Length == userIdentifiers.Length, "One actual provider input is required per connection.");\n        _targets = targets;');
    content = one(content, '        var protocol = new JsonHubProtocol();',
      '        var protocol = new JsonHubProtocol();\n        var userIdProvider = new DefaultUserIdProvider();');
    content = one(content, '                Transport = new Transport(',
      '                User = CreatePrincipal(userIdentifiers[index]),\n                Transport = new Transport(');
    content = one(content, '            _connections[index] = connection;',
      `            hub.UserIdentifier = userIdProvider.GetUserId(hub);
            Evidence.Require(StringComparer.Ordinal.Equals(hub.UserIdentifier, userIdentifiers[index]),
                "Actual DefaultUserIdProvider output differs from the configured name-identifier claim.");
            _connections[index] = connection;`);
    content = one(content, 'Manager.SendConnectionsAsync(', 'Manager.SendUsersAsync(');
    content = one(content, '        inputType = _targets.GetType().FullName,',
      `        inputType = _targets.GetType().FullName,
        actualUserIdProvider = typeof(DefaultUserIdProvider).FullName,
        userIdentifiersProducedDuringSetup = true,`);
    content = one(content, '            id = item.ConnectionId,',
      `            id = item.ConnectionId,
            userIdentifier = _hubs[index].UserIdentifier,
            actualNameIdentifierClaim = item.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value,`);
    content = one(content, '    internal static void ValidateFrame(', `    internal static ClaimsPrincipal CreatePrincipal(string? userIdentifier)
    {
        var claims = new List<Claim> { new(ClaimTypes.Name, "display-name-is-not-user-identifier") };
        if (userIdentifier is not null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userIdentifier));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "AutoPerf"));
    }

    internal static void ValidateFrame(`);
  }
  const destination = path.join(output, to);
  assert(!fs.existsSync(destination));
  fs.writeFileSync(destination, content);
  records.push({ origin: `F013/harness/${from}`, destination: `harness\\${to}`,
    templateSha256: hash(original), resultSha256: hash(fs.readFileSync(destination)),
    qualification: from === 'SettingsPreservingEmitToolchain.cs' ? 'Byte-exact executed settings-preserving toolchain.' : 'Checked independent user-send adaptation.' });
}
for (const name of ['UserSendBenchmarks.cs', 'ContractProbes.cs']) {
  const destination = path.join(output, name);
  assert(fs.existsSync(destination));
  records.push({ origin: 'New independent F014 user-send workload/producer source.', destination: `harness\\${name}`,
    resultSha256: hash(fs.readFileSync(destination)) });
}
fs.writeFileSync(path.join(run, 'scaffold-provenance.json'), JSON.stringify({
  candidate: 'F014', files: records, actualUserSendEntryPoints: 2,
  actualUserIdentifierProducer: 'DefaultUserIdProvider.GetUserId on real HubConnectionContext/connection principal in untimed setup.',
  noCopiedPrivateOwnerOrNewShippingVisibility: true,
  qualification: 'Independent user-send harness. Four checked shared scaffold adaptations and two new source files. No prior method observations/timing reused as user-targeting proof.',
}, null, 2) + '\n');
console.log('F014: independent six-file user-send harness prepared, actual provider/null/multi-connection inputs; no build or timing launched.');
