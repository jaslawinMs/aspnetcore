import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const harness = path.join(run, 'harness');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
fs.copyFileSync(path.join(session, 'autoperf-runs', 'F046', 'harness', 'SettingsPreservingEmitToolchain.cs'),
  path.join(harness, 'SettingsPreservingEmitToolchain.cs'), fs.constants.COPYFILE_EXCL);
const inputs = fs.readdirSync(harness).filter(file => /\.(cs|csproj)$/.test(file)).sort().map(file => {
  const bytes = fs.readFileSync(path.join(harness, file));
  return { path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() };
});
assert.equal(inputs.length, 8);
fs.writeFileSync(path.join(run, 'harness-source-hashes.json'), JSON.stringify(inputs, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'precompilation-fixture-boundary.json'), JSON.stringify({
  candidate: 'F047', actualBeforeAnyShippingEditOrTiming: true,
  actualCanonicalOriginalBrowserCasesPassed: 6,
  actualFreshOperation: 'Actual compiled internal boundary constructor, actual Renderer root assignment, framework parameter delivery and child rendering, root removal and child disposal. Prepared ParameterView frames and dispatcher delegate are reused; the boundary and child are fresh each operation.',
  actualIncludedCommonCosts: ['Compiled constructor adapter invocation', 'Default framework Dispatcher invocation', 'ParameterView snapshot and validation', 'Child parameter binding/rendering when prerendered', 'Root removal/disposal and lifetime counters'],
  actualExcludedFromTiming: ['Snapshot reflection adapter', 'Marker serialization', 'Input preparation', 'Host/network/browser work'],
  actualNewShippingInternalsVisibleToOrUnsafeAccessor: false,
  actualExistingSignedFriendNameOrPublicKeyImpersonated: false,
  actualByteExactSettingsPreservingExecutorReused: true,
  crossRuntimeCheckpoint: {
    actualChangeClassification: 'Local behavior-preserving server-side enumeration; no renderer/runtime/DI boundary is added or changed.',
    producingOwner: 'Endpoints SSRRenderModeBoundary.SetParametersAsync owns a fresh Dictionary snapshot.',
    consumingOwner: 'The same boundary renders its unchanged child/capture delegates and later serializes the same captures.',
    lifetime: 'Per-boundary dictionary and captures; no service registration or scope change.',
    assembly: 'Only Microsoft.AspNetCore.Components.Endpoints implementation changes.',
    ordering: 'Snapshot -> validation -> capture wrapping -> existing preload -> prerender -> existing marker serialization, unchanged.',
    destinations: 'Existing Server/WebAssembly/Auto destinations; no client or protocol change.',
    staleState: 'Existing state replacement/clearing behavior retained; unrelated stale-capture cleanup is out of scope.',
    actualArchitectureReviewRequiredForNewCrossRuntimeBehavior: false,
    reason: 'No cross-runtime behavior is being edited: existing-key value overwrites replace the same delegates in the same private snapshot. The predeclared runtime matrix remains preservation evidence, not a new architecture.',
  },
  actualInputFiles: inputs.length, actualCreated: new Date().toISOString()
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPreparedFiles: inputs.length, actualSourceComparisonsAuthorized: 0 }, null, 2));
