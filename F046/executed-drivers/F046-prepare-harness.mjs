import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const harness = path.join(run, 'harness');
const previous = path.join(session, 'autoperf-runs', 'F044', 'harness');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
const toolchain = fs.readFileSync(path.join(previous, 'SettingsPreservingEmitToolchain.cs'));
fs.writeFileSync(path.join(harness, 'SettingsPreservingEmitToolchain.cs'), toolchain, { flag: 'wx' });
let program = fs.readFileSync(path.join(previous, 'Program.cs'), 'utf8').replaceAll('F044', 'F046')
  .replaceAll('SectionRegistrationBenchmarks', 'HeaderAppendBenchmarks');
assert.ok(program.includes('public static int Main(string[] args)') && program.includes('Characterization.Run();'));
program = program.replace('public static int Main(string[] args)', 'public static async Task<int> Main(string[] args)')
  .replace('Characterization.Run();', 'await Characterization.RunAsync().ConfigureAwait(false);');
fs.writeFileSync(path.join(harness, 'Program.cs'), program, { flag: 'wx' });
const inputs = fs.readdirSync(harness).filter(file => /\.(cs|csproj)$/.test(file)).sort().map(file => {
  const bytes = fs.readFileSync(path.join(harness, file));
  return { path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() };
});
assert.equal(inputs.length, 9);
fs.writeFileSync(path.join(run, 'harness-source-hashes.json'), JSON.stringify(inputs, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'precompilation-fixture-boundary.json'), JSON.stringify({
  candidate: 'F046', actualBeforeAnyShippingEditOrTiming: true,
  actualFreshSuffixSeedsOptionalAppConnectionBeforeContentLengthHeader: true,
  actualContentLengthInitialization: 'Use the actual endOfRequest ComputeHeaders indexer shape: Headers[Content-Length]=0, not the public cached ContentLength property setter.',
  actualNativeApplicationDoesNotSetContentLength: true,
  reason: 'The producer sets this header for an empty response. If the application pre-set ContentLength=0, ComputeHeaders instead removes it before appending close; that is deliberately not substituted for the declared fresh primary.',
  actualInternalCalls: 'A once-compiled expression adapter invokes real owner constructors, setters and Append; it does not copy Append. Per-operation delegate and initialization costs remain in scope.',
  actualNewShippingInternalsVisibleToOrUnsafeAccessor: false,
  actualExistingSignedFriendNameOrPublicKeyImpersonated: false,
  actualByteExactSettingsPreservingExecutorReused: true,
  actualInputFiles: inputs.length, actualCreated: new Date().toISOString()
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPreparedFiles: inputs.length, actualSourceComparisonsAuthorized: 0,
  actualReflectionAdapterScopeDeclaredBeforeCompilation: true }, null, 2));
