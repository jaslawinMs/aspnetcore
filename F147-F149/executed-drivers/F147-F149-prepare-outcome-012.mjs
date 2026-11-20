import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const parallel = path.join(session, 'autoperf-parallelism');
const input = path.join(parallel, 'finding-F147-F149-implementation-011');
const root = path.join(session, 'autoperf-published-results', 'F147-F149');
const run = path.join(session, 'autoperf-runs', 'F147-F149');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const policy = read(path.join(parallel, 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
const measuredAuditFile = path.join(session, 'F147-F149-independent-measurement-audit-011.json');
const measuredAudit = read(measuredAuditFile);
assert.equal(measuredAudit.actualTotalMeasuredNativeRows, 28);
assert.equal(measuredAudit.actualAudits.length, 2);
for (const audit of measuredAudit.actualAudits)
{
    assert.equal(audit.actualQualification, 'inconclusive-unchanged-control-elapsed-drift');
    assert.equal(audit.actualXmlRowsFreshlyReconciled.length, 14);
}
fs.mkdirSync(run);
const copies = [];
function copy(source, logical)
{
    const destination = path.join(root, ...logical.split('/'));
    assert.equal(copies.some(c => c.file === logical), false);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    const sha256 = hash(source);
    assert.equal(hash(destination), sha256);
    copies.push({ file: logical, bytes: fs.statSync(source).size, sha256, actualSourcePath: source });
}
function tree(source, logical)
{
    for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const from = path.join(source, entry.name), to = logical + '/' + entry.name;
        if (entry.isDirectory()) { tree(from, to); }
        else { assert.ok(entry.isFile()); copy(from, to); }
    }
}
const older = path.join(parallel, 'finding-F147-F149-010', 'capsule');
assert.equal(hash(path.join(older, 'MANIFEST.json')), '934EDEC9D40C39FC4C6F1004C2FB97577D824991C6CF60EF506903014B95DA53');
tree(older, 'owner-preparation');
assert.equal(copies.length, 161);
assert.equal(copies.reduce((sum, c) => sum + c.bytes, 0), 16590650);
for (const name of ['acceptance.json', 'source-graphs.json', 'setup-started.json', 'common-identity.json',
    'Build011.ps1', 'Test011.ps1', 'Invoke-Native010.ps1'])
{
    copy(path.join(input, name), 'study/' + name);
}
for (const directory of ['prepared', 'evidence', 'setup', 'logs', 'results', 'inputs'])
{
    tree(path.join(input, directory), 'study/' + directory);
}
for (const role of ['Original', 'CurrentDefault'])
{
    for (const variant of ['Baseline', 'F147', 'F149'])
    {
        const image = read(path.join(input, 'evidence', `${role}-${variant}-image.json`));
        for (const name of ['WebTransportInteractiveSampleApp.dll', 'WebTransportInteractiveSampleApp.pdb'])
        {
            copy(path.join(image.actualImagePath, name), `selected/images/${role}/${variant}/${name}`);
        }
    }
}
const common = read(path.join(input, 'common-identity.json'));
for (const name of ['InMemory.FunctionalTests.dll', 'InMemory.FunctionalTests.pdb', 'InMemory.FunctionalTests.deps.json',
    'InMemory.FunctionalTests.runtimeconfig.json', 'Microsoft.AspNetCore.Server.Kestrel.Core.dll',
    'Microsoft.AspNetCore.Server.Kestrel.Core.pdb', 'Microsoft.AspNetCore.InternalTesting.dll',
    'Microsoft.AspNetCore.InternalTesting.pdb'])
{
    copy(path.join(common.actualOutputDirectory, name), 'selected/common/' + name);
}
for (const finding of ['F147', 'F149'])
{
    const source = path.join(session, 'autoperf-runs', finding);
    const budget = read(path.join(source, 'diagnostic-budget.json'));
    assert.equal(budget.closed, true);
    assert.equal(budget.authorizations.length, 1);
    assert.equal(budget.authorizations[0].status, 'completed');
    assert.equal(budget.authorizations[0].decision.actualAllPredeclaredGatesPassed, false);
    assert.equal(read(path.join(source, 'measurement-decision.json')).actualPerformanceQualification, false);
    tree(source, 'measurements/' + finding);
}
for (const name of ['F147-F149-timing-approval-011.json', 'F147-F149-local-quiescence-011.json',
    'hold-F147-F149-011-F160.json', 'hold-F147-F149-011-F163.json',
    'F147-F149-gateways-terminal-011.json', 'F147-F149-timing-release-011.json',
    'policy-before-F147-F149-timing-approval-011.json', 'policy-before-F147-F149-release-011.json'])
{
    copy(path.join(parallel, name), 'coordination/' + name);
}
const tokens = new Set(['F147', 'F149'].map(id =>
    read(path.join(session, 'autoperf-runs', id, 'diagnostic-budget.json')).authorizations[0].gatewayLeaseToken));
const gateEvents = fs.readFileSync(path.join(parallel, 'benchmark-gate-events.jsonl'), 'utf8').trim().split(/\r?\n/)
    .map(line => JSON.parse(line)).filter(e => tokens.has(e.token));
assert.equal(gateEvents.filter(e => e.event === 'acquired').length, 2);
assert.equal(gateEvents.filter(e => e.event === 'released').length, 2);
let activeToken = null;
for (const event of gateEvents)
{
    if (event.event === 'acquired') { assert.equal(activeToken, null); activeToken = event.token; }
    if (event.event === 'released') { assert.equal(activeToken, event.token); activeToken = null; }
}
assert.equal(activeToken, null);
write(path.join(root, 'coordination', 'selected-gateway-events.json'), {
    actualSelectedTokens: [...tokens], actualEvents: gateEvents, actualOnlyAuthorizedGatewayEventsSelected: true,
    actualArbitraryUncooperativeExternalProcessesProvenAbsent: false
});
copy(measuredAuditFile, 'independent-measurement-audit.json');
for (const name of ['F147-F149-coordinator-owner-verification-010.json',
    'F147-F149-coordinator-selected-metadata-010.json', 'F147-F149-coordinator-native-identity-verification-011.json'])
{
    copy(path.join(session, name), 'independent-audits/' + name);
}
const reader = path.join(parallel, 'finding-F155-F159-010', 'capsule', 'evidence.mjs');
copy(reader, 'metadata-reader.mjs');
for (const name of ['F147-F149-setup-011.mjs', 'F147-F149-snapshot-011.mjs',
    'F147-F149-audit-native-images-011.py', 'F147-F149-audit-selected-metadata-010.py',
    'F147-F149-compare-011.mjs', 'F147-F149-run-variant-011.ps1', 'F147-F149-seal-preflight-011.mjs',
    'F147-F149-approve-timing-011.mjs', 'F147-F149-run-approved-011.ps1',
    'F147-F149-audit-measurements-011.ps1', 'F147-F149-prepare-outcome-012.mjs',
    'autoperf-publish-bounded-outcome-012.mjs'])
{
    copy(path.join(session, name), 'executed-drivers/' + name);
}
const current = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.match(current, /^[a-f0-9]{40}$/);
const target = 'src/Servers/Kestrel/samples/WebTransportInteractiveSampleApp/Program.cs';
const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${target}?ref=${current}`, '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.equal(blob, '2fa999a73fc8ce4e4d1c7a7cc7185f8723727696');
write(path.join(root, 'coordinator-acceptance.json'), {
    recordedAt: new Date().toISOString(), finalDispositions: ['F147', 'F149'].map(id => ({
        id, campaignStatus: 'no-gain', subtype: 'measurement-inconclusive-unchanged-control-elapsed-drift'
    })),
    actualClassification: 'Sample-only allocation-copy removal with observed allocation benefit, but unqualified comparative measurement.',
    actualMeasuredOriginalComparisons: 2, actualMeasuredVariantNativeExecutions: 28,
    actualNativeFunctionalPasses: 120, actualSelectedFreshPePdbAndRawDocumentPairs: 7,
    actualCausalOnlyOwnerDllPdbDifferencesAcrossAllFourPairs: true,
    actualCommonFixtureCompiledSuccessfullyOnceAndUnchanged: true,
    actualObservedAllocationRatios: { F147: 0.6728489184632627, F149: 0.7494779177826838 },
    actualObservedControlElapsedRatios: { F147: 1.1366943006142418, F149: 1.2993990389111012 },
    actualFrozenControlElapsedRange: [0.90, 1.10], actualBothControlElapsedGatesFailed: true,
    actualCauseOfControlDriftEstablished: false, actualNoAllocationBenefitClaimed: false,
    actualWholeProcessCounterIncludesFrameworkBackgroundAllocations: true,
    actualBothBudgetsPermanentlyClosedAtOneOfThree: true, actualRemainingAuthorizationsPermanentlyClosed: 4,
    actualDefaultOwnerFunctionalImagesPassed: true, actualDefaultOwnerPerformanceComparisonExecuted: false,
    actualDefaultLabelBoundary: 'Actual default90 sample owner under identical common Original Kestrel/runtime57, not full stock-default runtime/framework validation.',
    actualLatestTargetOnlyObservation: { revision: current, path: target, gitBlob: blob, actualLaterWholeGraphRebuilt: false },
    actualNoCandidateSourceCommitPerformancePrOrNewBrowserWindow: true,
    actualNoRetryTuningPrimarySubstitutionRolePoolingOrHistoricalReplay: true,
    actualFullCompilerInputOrOmittedFullImageSdkPackageSourceByteAttestation: false,
    actualSelectedFilesMappedBelow: copies.length, actualOldProducerPreparationKeptSeparateFromNewMeasurementClosure: true,
    exclusions: 'Native QUIC/TLS/browser/physical network/physical console, full startup/certificate setup, EOF/cancellation/fault changes, pooling/churn/long-run economics and whole default framework/runtime.',
    actualComparisonsRunByPublicationPreparation: 0
});
write(path.join(root, 'authoritative-copies.json'), copies);
const completedComparisons = ['F147', 'F149'].map(findingId => {
    const closedBudgetFile = path.join(session, 'autoperf-runs', findingId, 'diagnostic-budget.json');
    return { findingId, closedBudgetFile, closedBudgetSha256: hash(closedBudgetFile), authorizations: 1 };
});
write(path.join(run, 'publication-config.json'), {
    folder: 'F147-F149', run, expectedParentIndex: '71d4b0186062f22d321f68b7cbb10ba9de308e44',
    performancePrAuthorized: false, subtype: 'measurement-inconclusive-unchanged-control-elapsed-drift',
    completedComparisons, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F147/F149] Sample allocation reductions observed; controls prevent qualification',
    issueSearch: '\"F147/F149\" in:title',
    evidenceCommitTitle: 'Publish bounded WebTransport sample allocation comparisons',
    evidenceCommitDescription: 'Preserve both independent same-host/runtime57 Original comparisons:7pairs14variantprocesses each,28actualnativeXMLpasses. Allocations0.672849/0.749478,7of7favorable,8435738/8439353meanbytesremoved andprimaryelapsedgatespass;unchangedcontrolelapsed1.136694/1.299399failsfrozen0.90..1.10. Noassertedcause,noretiming/primarysubstitution/defaultcomparison/PR;bothbudgetsclosed1of3. Sixfunctionalimages120actualpasses,all36UTF8theoryvalues,onebyteidenticalcommonCSharp13fixture,7freshMVIDPEPDBrawdocchecks. All4causalpairs156filesonlyownerDLLPDBdiffer;all224common197runtimefileschecked,noprefixexemptions. SourceDefault90ownerunderOriginalcommon57notwholedefaultframework. Preserveearlier161fileproducerpreparationseparately,normalfailures,globalHOLD/lease/terminalreceipts,independentrealXML/mathandallselectedrawbytes. FixedclassifiedREPORTunchanged.',
    indexCommitTitle: 'Index two inconclusive sample allocation comparisons',
    outcomes: ['F147', 'F149'].map(id => ({
        id, status: 'no-gain',
        note: (id === 'F147'
            ? 'MeasuredOriginal7pairallocationC/B0.6728489184632627,7/7favorable,8435738.285714285meanBsaved,primaryelapsed0.6890491965033575;unchangedcontrolalloc0.9999288773145076,controlelapsed1.1366943006142418failsfrozen0.90..1.10.'
            : 'MeasuredOriginal7pairallocationC/B0.7494779177826838,7/7favorable,8439353.142857144meanBsaved,primaryelapsed0.7366862569490602;unchangedcontrolalloc1.0002158894135018,controlelapsed1.2993990389111012failsfrozen0.90..1.10.') +
            ' Inconclusive-control-drift(notnoobservedallocationbenefit);causeunestablished. Independent1linespanreplacementpreservesrealcommands/exactlength/stringbeforeawait/reversal/write/clear. Bothrolesbaseline+independentcandidates120nativefunctionalpasses/36UTF8values;7freshPEPDBrawdocpairs,oneidenticalcommonfixture/runtime57. Fourcausalpairsall156filesonlyownerDLLPDBdiff,224common197runtimefullfilemaps,noexemptions. SourceDefault90sampleownerundercommonOriginal57notwholedefaultframework;notperformancemeasuredafterOriginalgatefail.14nativevariantprocessesperfinding28total,actualXMLmathaudited. Budgetpermanentlyclosed1of3,noretry/tuning/primarysubstitution/replay/sourcecommit/PR/window;physicalQUIC/TLS/browser/console/startup/bufferpoolingexcluded.',
        readmeRow: `| ${id} | Measured inconclusive: observed ${id === 'F147' ? '32.72%' : '25.05%'} fewer allocated bytes; unchanged-control elapsed drift ${id === 'F147' ? '13.67%' : '29.94%'} failed frozen gate. Closed1of3, no default timing/PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Paired study](F147-F149/README.md), [verified publication](F147-F149/publication.json) |`
    }))
});
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length,
    actualUnchangedCopiedBytes: copies.reduce((sum, c) => sum + c.bytes, 0),
    actualAllTwentyEightMeasuredRowsIndependentlyAudited: true,
    actualNewTimingOrPerformancePrCreated: false, actualTargetFreshness: { current, blob } }, null, 2));
