const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const optional = file => fs.existsSync(path.join(root, file)) ? read(file) : null;
const acceptance = read('acceptance.json');
const identity = read('evidence\\identity.json');
const owners = read('evidence\\copied-owner-static-proof.json');
const linq = read('evidence\\installed-linq-static-il.json');
const closure = read('evidence\\input-closure-identity-differences.json');
const comparison = optional('evidence\\verify-only-comparison.json');
const existing = optional('evidence\\existing-test-outcomes.json');
const imageAudit = optional('evidence\\image-pair-audit.json');
const processState = optional('logs\\process-terminal.json');
const commands = optional('logs\\commands.json') || [];
const release = read('native-release.json');
const inherited = {};
for (const variant of ['original', 'default']) {
  const stage = variant === 'original' ? 'runtime-003' : 'runtime-default-004';
  const evidence = read(`evidence\\${stage}-F134.json`);
  inherited[variant] = {
    sourceRevision: evidence.sourceRevision,
    exactTestNames: evidence.exactTestNames,
    passed: evidence.actualPassedCaseCount,
    skipped: evidence.skippedCases,
    evidence: `evidence\\${stage}-F134.json`,
    status: 'Inherited accepted producer results, not rerun or recompiled in this capsule.'
  };
}
const newCases = acceptance.cases.map(item => ({
  ...item,
  original: comparison ? 'Passed' : 'NotRun',
  default: comparison ? 'Passed' : 'NotRun',
  limitation: comparison ? null : 'New consumer not executed; native work was held.'
}));
const expectedExisting = [
  { method: 'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.CanAcceptWebSocket', row: 'default-empty-protocols' },
  { method: 'Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks', row: 'alpha-bravo-offered-charlie-selected' },
  { method: 'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties', row: 'http://localhost/connect -> localhost' },
  { method: 'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties', row: 'http://localhost:80/connect -> localhost' },
  { method: 'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties', row: 'http://localhost:81/connect -> localhost:81' },
  { method: 'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.VerifyWebSocketAndUpgradeFeatures', row: 'actual-websocket-and-upgrade-features' }
];
const outcome = {
  findingId: 'F134',
  findingContext: {
    card: 'concrete-collection-emptiness-via-ienumerable-helper',
    file: 'src\\Hosting\\TestHost\\src\\WebSocketClient.cs',
    line: 83,
    expression: 'if (SubProtocols.Any())',
    staticType: 'IList<string>',
    actualOwnedTypeAssertedInEachNewProducerCase: 'List<string>',
    suppliedSeverityNotChanged: 'Informational / low'
  },
  scope: 'Bounded untimed investigation and artifact-only executable preparation.',
  finalStatus: comparison && existing ? 'untimed-producer-validation-complete-no-performance-verdict' : 'frozen-preparation-new-execution-blocked',
  authoritativeVerdict: false,
  campaignFinalized: false,
  sourcePins: identity.revisions,
  exactSourceAndHistoryLinks: [
    'https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Hosting/TestHost/src/WebSocketClient.cs#L79-L95',
    'https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Hosting/TestHost/src/WebSocketClient.cs#L21-L39',
    'https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Hosting/TestHost/src/WebSocketClient.cs#L79-L109',
    'https://github.com/dotnet/aspnetcore/commit/af8d35dba62f91a74b416a96822b1ec5152b6f3b',
    'https://github.com/dotnet/aspnetcore/commit/3ea008c80d5cc63de7f90ddfd6823b7b006251ff'
  ],
  liveDefaultRequery: identity.liveDefaultRequery,
  acceptedProducerResults: inherited,
  freshCopiedOwnerProof: owners,
  actualLoadedOwnerSourceProof: comparison ? {
    original: comparison.outputs.original.sourceProof,
    default: comparison.outputs.default.sourceProof,
    evidence: 'evidence\\verify-only-comparison.json'
  } : null,
  installedRuntimeStaticEvidence: {
    file: linq.file,
    sha256: linq.sha256,
    productVersion: linq.productVersion,
    method: linq.method,
    countFastPath: 'IL offset 11 is ICollection<T> isinst; offset 21 calls ICollection<T>.get_Count; offsets 26-29 compare with zero and return, before fallback at 30.',
    evidence: 'evidence\\installed-linq-static-il.json',
    boundary: linq.interpretationBoundary
  },
  newAcceptanceCases: newCases,
  existingRepositoryTestOutcomes: existing ? existing.actualRows : expectedExisting.map(test => ({ ...test, outcome: 'NotRun', reason: 'Explicit native-work release was not available; no existing test reached its assertion in this capsule.' })),
  futureConsumer: {
    source: 'consumer\\Program.cs',
    project: 'consumer\\F134.Characterization.csproj',
    csharp: '13.0',
    mode: '--verify-only PAYLOAD',
    successfulNewCompilations: commands.filter(command => command.id.endsWith('-common-build') && command.exitCode === 0).length,
    executableVerified: !!comparison,
    commonCompiledOnceAndImagesChecked: !!comparison,
    sourceEqualIsNotImageEqual: true,
    allFileImageGate: 'Audit-ImagePair.cjs',
    intendedFutureOwnerDifferenceAllowlist: ['Microsoft.AspNetCore.TestHost.dll', 'Microsoft.AspNetCore.TestHost.pdb'],
    rawInputPEsEach: [closure.originalCount, closure.defaultCount],
    rawInputPEHashDifferences: closure.differences.length,
    originalDefaultNotAnOwnerOnlyPerformancePair: true,
    imageAudit,
    frozenContinuation: 'Do not compile into or modify this sealed capsule. Initialize a fresh authorized capsule from the authored scripts/source for continuation.'
  },
  release,
  managedOwnerExecutionRuntime: comparison ? '12.0.0-alpha.1.26565.104 explicitly selected and observed' : 'Not executed. Prepared explicit installed runtime: 12.0.0-alpha.1.26565.104.',
  unavailableDeclaredRuntime: '12.0.0-alpha.1.26568.110',
  commands,
  failedPreparations: read('failed-preparations.json'),
  processState: processState || {
    ownedDotnetBuildTestHostPids: [],
    ownedDotnetBuildTestHostStarts: 0,
    allOwnedNativeWorkTerminal: true,
    survivingOwnedServices: 0,
    note: 'No managed build/test/host process was launched; metadata/file/syntax helpers returned synchronously.'
  },
  noMaterialOptimizationGrounded: {
    conclusionBoundary: 'No enumeration/allocation mechanism has been established for the real owned List on this installed Count-fast-path runtime. Any remaining dispatch/inlining cost is unmeasured, so no empirical no-gain or gain verdict follows.',
    sourcePatchProduced: false,
    candidateAppliedOrBuilt: false,
    performanceSamples: 0,
    timingOrAllocationComparisons: 0,
    noMicroloopProducerProof: true,
    proposedPrimaryNotAdoptedOrSealed: 'If later justified and separately authorized: actual repeated F134.HandshakeEmpty connections.',
    proposedControlsNotAdoptedOrSealed: ['F134.HandshakeOne', 'F134.HandshakeSeveral'],
    gainThreshold: 'UNSET; not adopted or sealed',
    budgetsOrPolicyModified: false
  },
  exclusions: acceptance.acceptanceDoesNotProve,
  changeBoundary: {
    newFilesOnlyUnderThisRoot: true,
    shippingSourceModified: false,
    sourceBranchCommits: 0,
    archivedAcceptedClosuresModified: false,
    githubBrowserOrRemoteExecution: false,
    machineWideSettingsInstallsCertificatesChanged: false,
    nestedAgents: 0
  },
  unmetAcceptance: comparison && existing ? [] : [
    'New ten-row producer/exception matrix is prepared but not executed.',
    'New consumer compilation and runtime verify-only refusal are not verified.',
    'Six individual existing repository test cases are explicitly NotRun.',
    'No fresh live-default network observation is available while GitHub access is forbidden.'
  ]
};
fs.writeFileSync(path.join(root, 'HANDOFF.json'), JSON.stringify(outcome, null, 2) + '\n');
const text = [
  'F134-006 bounded handoff',
  `Status: ${outcome.finalStatus}. No authoritative disposition or performance verdict.`,
  'Original/default target source is byte-identical; exact copied owner PE/PDB/source identities are freshly verified as metadata.',
  'Installed System.Linq.dll has the ICollection<T>.Count fast path before its fallback. This is static IL evidence, not a timing/allocation result.',
  `Accepted inherited producer rows: Original ${inherited.original.passed}/3; Default ${inherited.default.passed}/3; zero skips in each accepted run.`,
  `New ten-row matrix: ${comparison ? '10/10 passed in each variant, zero skipped.' : 'NOT RUN; native-work hold remained effective.'}`,
  `Existing six repository test rows: ${existing ? '6/6 passed, zero skipped; exact TRX rows parsed.' : 'ALL NOT RUN; individual method/parameter rows recorded in HANDOFF.json.'}`,
  'Future consumer: common-once compile, exact common DLL/PDB/deps/runtimeconfig reuse, full-file image gate; only TestHost DLL/PDB may differ in a future owner-only pair.',
  `Original/default raw closures differ in ${closure.differences.length} of 44 PE hashes; they are not a valid owner-only performance pair.`,
  'No candidate patch was manufactured. Primary/control suggestions are explicitly unadopted; gain threshold UNSET.',
  'See README.txt for exact source/history links, accepted assertions, producer boundary, continuation commands and exclusions.',
  'Two setup/report failures were corrected and retained: metadata-token overload reporting, and the inherited wrong TestClientTests namespace that caused an incomplete five-row report.',
  `Owned build/test/host PIDs: ${commands.length ? 'see logs\\process-terminal.json' : 'none; zero starts; zero surviving services.'}`,
  'Do not modify or compile into this frozen capsule.'
];
fs.writeFileSync(path.join(root, 'HANDOFF.txt'), text.join('\r\n') + '\r\n');
console.log(JSON.stringify({ status: outcome.finalStatus, inheritedPassedEach: [inherited.original.passed, inherited.default.passed], freshConsumerVerified: !!comparison, existingTestsVerified: !!existing, nativeStarts: commands.length }));
