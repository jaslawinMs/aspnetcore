import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F022');
const label = process.argv[2];
if (!/^[a-z0-9-]+$/.test(label ?? '')) throw new Error('Provide one explicit owned watch label.');
const execution = path.join(run, 'validation', 'watch-' + label);
const logBytes = fs.readFileSync(path.join(execution, 'watch.log'));
const log = logBytes.toString('utf8');
const events = log.split(/\r?\n/).filter(line => line.startsWith('{"kind":"F022_')).map(line => JSON.parse(line));
const starts = events.filter(row => row.kind === 'F022_PROCESS_START');
const states = events.filter(row => row.kind === 'F022_STATE');
const require = (condition, message) => { if (!condition) throw new Error(message); };
require(starts.length === 1, 'The watcher restarted or never reached the actual app marker.');
const pid = starts[0].processId;
require(states.length > 1 && states.every(row => row.processId === pid), 'Missing live states or changed process.');
require(starts[0].metadataUpdatesSupported === true && states.every(row => row.metadataUpdatesSupported === true),
  'The actual runtime metadata-update producer was not enabled.');
require(log.includes('Updates applied.') && log.includes('C# and Razor changes applied in '),
  'The actual watcher did not report an applied supported delta.');
require(!log.includes('Restart is needed') && !log.includes('[auto-restart]') && !/\berror ENC/.test(log),
  'A rude edit or restart is not a supported in-place edit.');
require(states.some(row => row.actualGetterValue === 'before') && states.some(row => row.actualGetterValue === 'after'),
  'The retained real compiled expression did not observe the actual edited getter.');
require(states.every(row => row.retainedGetter === 'get_Item' && row.defaultMember === 'Item' &&
  row.classifiedAsIndexer === true && row.expressionText === '[7].Name' &&
  row.unsupportedGetter === 'Lookup' && row.unsupportedClassifiedAsIndexer === false &&
  row.unsupportedExpressionText === 'Name' && row.successfulClassifierCalls === 32),
  'The public expression-text/indexer/non-indexer control changed.');
require(states.every(row => row.classifierAllocatedBytes > 0),
  'LIVE_METADATA_PATH_REQUIRED: the warmed classifier used an allocation-free cache while metadata updates were enabled.');
const before = fs.readFileSync(path.join(execution, 'before-IndexerModel.cs'), 'utf8');
const after = fs.readFileSync(path.join(execution, 'after-IndexerModel.cs'), 'utf8');
require(before.replace('Name = "before"', 'Name = "after"') === after, 'The actual model edit exceeded the one getter-body value.');
const result = {
  candidate: 'F022', label, observedAt: new Date().toISOString(),
  actualStarts: starts.length, actualPid: pid, actualStateCount: states.length,
  actualRuntime: starts[0].runtime, actualOwnerSha256: starts[0].ownerSha256, actualOwnerModule: starts[0].ownerModule,
  actualMetadataUpdatesSupported: true, actualAppliedWatcherDelta: true, actualRestart: false,
  actualGetterTransition: ['before', 'after'], actualExpressionText: '[7].Name',
  actualNonIndexerText: 'Name', successfulClassifierCallsPerState: 32,
  actualLiveMetadataAllocationRange: [Math.min(...states.map(row => row.classifierAllocatedBytes)),
    Math.max(...states.map(row => row.classifierAllocatedBytes))],
  actualWatchLogSha256: crypto.createHash('sha256').update(logBytes).digest('hex').toUpperCase(),
  proofBoundary: 'Actual watch producer,retained compiled getter,public expression text and live-classifier resource path.',
  notProven: 'A getter-body edit does not change default-member classification. This is not default-member cache invalidation evidence.',
  timingProfiles: 0,
};
console.log(JSON.stringify(result, null, 2));
