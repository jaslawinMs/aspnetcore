const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const gate = require('./image-identity-gate.cjs');

const root = __dirname;
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative));
const text = relative => read(relative).toString('utf8');
const observation = JSON.parse(text('source-observations.json'));
const checks = [];
function check(name, action) {
  action();
  checks.push({ name, passed: true, boundary: 'artifact/source only' });
}
check('All36PinnedInputsMatchSha256AndGitBlobIdentity', () => {
  assert.equal(observation.inputs.length, 36);
  for (const input of observation.inputs) {
    const bytes = read(input.savedPath);
    assert.equal(sha(bytes), input.sha256, input.savedPath);
    const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(blob, input.blob, input.savedPath);
  }
  assert.ok(observation.commands.every(command => command.exitCode === 0));
});
check('BothPinnedSharedStreamTypeDefinitionsUse0x54', () => {
  const supplemental = JSON.parse(text('supplemental-stream-type.json'));
  assert.equal(supplemental.inputs.length, 2);
  assert.ok(supplemental.commands.every(command => command.exitCode === 0));
  for (const input of supplemental.inputs) {
    const bytes = read(input.savedPath);
    assert.equal(sha(bytes), input.sha256);
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), input.gitBlob);
    assert.ok(bytes.toString('utf8').includes('WebTransportUnidirectional = 0x54'));
  }
});
check('AcceptanceDefinedBeforeProposalAndUnchanged', () => {
  assert.equal(sha(read('ACCEPTANCE.md')), observation.acceptanceSha256);
  assert.equal(observation.proposalAppliedToAnySourceGraph, false);
  assert.equal(observation.candidateExecuted, false);
});
const method = (source, name) => {
  const start = source.indexOf(`static async Task ${name}(`);
  assert.ok(start >= 0);
  let end = source.indexOf('{', start) + 1;
  for (let depth = 1; depth; end++) {
    assert.ok(end < source.length);
    depth += Number(source[end] === '{') - Number(source[end] === '}');
    if (!depth) break;
  }
  return source.slice(start, end + 1);
};
let firstSample;
for (const role of ['Original', 'ObservedDefault']) {
  const sample = text(`evidence\\${role}\\src\\Servers\\Kestrel\\samples\\WebTransportInteractiveSampleApp\\Program.cs`);
  const extraction = JSON.parse(text(`prepared\\${role}\\extraction.json`));
  const generated = text(`prepared\\${role}\\F146SampleHandler.cs`);
  const handler = method(sample, 'handleUnidirectionalStream');
  check(`${role}:ExactUnmodifiedHandlerAndCommandMethodExtraction`, () => {
    assert.equal(sha(Buffer.from(generated)), extraction.extractedSourceSha256);
    for (const row of extraction.methods) {
      assert.equal(sha(Buffer.from(method(sample, row.name))), row.sha256);
      assert.equal(method(generated, row.name), method(sample, row.name));
    }
  });
  check(`${role}:4096ArrayOccursOnceBeforeReadLoop`, () => {
    assert.equal(handler.split('new byte[4096]').length - 1, 1);
    assert.ok(handler.indexOf('new byte[4096]') < handler.indexOf('while ('));
    assert.ok(handler.includes('await inputPipe.AsStream().ReadAsync(memory)'));
    assert.ok(handler.includes('await ApplySpecialCommands(session, message)'));
    assert.ok(!handler.includes('ReadAsync(memory,'));
    assert.ok(!handler.includes('length == 0'));
  });
  check(`${role}:ExactSessionAndStreamDispatchStatementsPresent`, () => {
    assert.ok(sample.includes('feature.AcceptAsync(CancellationToken.None)'));
    assert.ok(sample.includes('session.AcceptStreamAsync(CancellationToken.None)'));
    assert.ok(sample.includes('if (direction.CanRead && direction.CanWrite)'));
    assert.ok(sample.includes('_ = handleUnidirectionalStream(session, stream)'));
  });
  if (firstSample) check('PinnedSampleSourceIsByteIdenticalAcrossRoles', () => assert.equal(sample, firstSample));
  firstSample = sample;
}
check('PreparedManagedProducerDoesNotInjectSessionAddStreamOrMockConnection', () => {
  const probe = text('prepared\\F146ManagedProducerTests.cs');
  assert.ok(probe.includes('CreateUnidirectionalStream(http3, 0x54, session.SessionId)'));
  assert.ok(probe.includes('session.AcceptStreamAsync(CancellationToken.None)'));
  assert.ok(probe.includes('F146SampleHandler.Run(session, stream)'));
  assert.ok(probe.includes('AssertSourceBuiltOwner()'));
  assert.ok(!probe.includes('.AddStream('));
  assert.ok(!probe.includes('Mock<'));
});
check('ProposalIsOnlySingleSamplePatchWithBoundedRentAndFinallyReturn', () => {
  const proposal = text('proposals\\F146-arraypool.diff');
  assert.equal(proposal.split('\n--- ').length, 1);
  assert.equal(proposal.match(/^\+\+\+ /gm)?.length, 1);
  assert.equal(proposal.match(/^\+.*Shared\.Rent\(4096\)/gm)?.length, 1);
  assert.equal(proposal.match(/^\+.*Shared\.Return\(buffer\)/gm)?.length, 1);
  assert.ok(proposal.includes('+    var memory = buffer.AsMemory(0, 4096);'));
  assert.ok(proposal.includes('+    finally'));
  assert.ok(!proposal.includes('+static async Task handleBidirectionalStream'));
});
const imageChecks = gate.selfCheck();
const result = {
  status: 'passed',
  mode: 'verify-only',
  artifactChecks: checks,
  imageGateSelfChecks: imageChecks,
  managedProducerCompiled: false,
  managedProducerExecuted: false,
  nativeQuicOrWebTransportExecuted: false,
  actualSelectedRuntime: null,
  candidateApplied: false,
  candidateExecuted: false,
  adoptedComparisonGate: false,
  boundary: 'Input hashes/source assertions and in-memory image-gate fixtures only; no behavior/performance proof.',
};
if (process.argv.includes('--write-result')) {
  fs.writeFileSync(path.join(root, 'verification-result.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify(result, null, 2));
