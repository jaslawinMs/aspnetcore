import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scope, guard, jsonNew, parseTree, sha256 } from './source-io-v001.mjs';

const finalGuard = guard('qualification-final-v001');
const pins = JSON.parse(fs.readFileSync(path.join(scope, 'source-pins-v001.json'), 'utf8'));
const batches = ['whole-inputs-v001.json', 'whole-inputs-v002.json'].map(name => JSON.parse(fs.readFileSync(path.join(scope, name), 'utf8')));
const members = batches.flatMap(batch => batch.members);
const verified = [];
for (const batch of batches) {
    const raw = fs.readFileSync(path.join(scope, batch.rawFrameFile));
    let consumed = 0;
    for (const member of batch.members) {
        const bytes = fs.readFileSync(path.join(scope, member.capturedFile));
        assert.equal(bytes.length, member.fullBytes);
        assert.equal(sha256(bytes), member.sha256);
        assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'), member.oid);
        assert.equal(member.rawFrameHeaderOffset, consumed);
        const header = Buffer.from(`${member.oid} blob ${bytes.length}\n`, 'ascii');
        assert.ok(raw.subarray(consumed, consumed + header.length).equals(header));
        assert.ok(raw.subarray(member.rawFrameBodyOffset, member.rawFrameBodyOffset + bytes.length).equals(bytes));
        assert.equal(raw[member.rawFrameEndExclusive - 1], 10);
        const treeRaw = fs.readFileSync(path.join(scope, `${member.membershipEvidence}.stdout.raw`));
        const treeMatches = parseTree(treeRaw).filter(item => item.path === member.path);
        assert.equal(treeMatches.length, 1);
        assert.equal(treeMatches[0].oid, member.oid);
        assert.equal(treeMatches[0].mode, member.mode);
        assert.equal(treeMatches[0].type, 'blob');
        assert.equal(member.commit, pins[member.role]);
        consumed = member.rawFrameEndExclusive;
        verified.push({ ...member, rawMembershipIndependentlyMatched: true, exactFrameAndWholeBytesMatched: true });
    }
    assert.equal(consumed, raw.length);
}
for (const role of ['Original', 'Default']) {
    const roleMembers = members.filter(member => member.role === role);
    assert.equal(roleMembers.length, 15);
    assert.equal(new Set(roleMembers.map(member => member.path)).size, 15);
}
const original = new Map(members.filter(member => member.role === 'Original').map(member => [member.path, member]));
const comparisons = members.filter(member => member.role === 'Default').map(member => {
    const before = original.get(member.path);
    assert.equal(before.oid, member.oid);
    assert.equal(before.mode, member.mode);
    assert.equal(before.sha256, member.sha256);
    return { path: member.path, mode: member.mode, originalOid: before.oid, defaultOid: member.oid, sha256: member.sha256, wholeBytesEqual: true };
});

const emitterPath = 'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs';
const snapshotPath = 'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/snapshots/OperationTests.DoesNotMisattributeDocumentationWhenMemberNameCollidesWithAnotherBindingName#OpenApiXmlCommentSupport.generated.verified.cs';
function operationBlock(role, file, attributeMarker) {
    const member = members.find(item => item.role === role && item.path === file);
    const bytes = fs.readFileSync(path.join(scope, member.capturedFile));
    const start = bytes.indexOf(Buffer.from('    file class XmlCommentOperationTransformer : '));
    const nextClass = bytes.indexOf(Buffer.from('    file class XmlCommentSchemaTransformer'), start);
    const stop = bytes.lastIndexOf(Buffer.from(attributeMarker), nextClass);
    assert.ok(start >= 0 && stop > start && nextClass > stop);
    return { role, commitPath: member.commitPath, startByte: start, endByteExclusive: stop, bytes: bytes.subarray(start, stop), wholeSourceSha256: member.sha256 };
}
const helperIdentity = [];
for (const role of ['Original', 'Default']) {
    const template = operationBlock(role, emitterPath, '    {{GeneratedCodeAttribute}}');
    const emitted = operationBlock(role, snapshotPath, '    [System.CodeDom.Compiler.GeneratedCodeAttribute(');
    const equal = template.bytes.equals(emitted.bytes);
    helperIdentity.push({
        role,
        staticExactOperationClassBytesEqual: equal,
        template: { ...template, bytes: template.bytes.length, operationClassSha256: sha256(template.bytes) },
        selectedSnapshot: { ...emitted, bytes: emitted.bytes.length, operationClassSha256: sha256(emitted.bytes) },
        runtimeOrGeneratorExecutionProof: false,
        aliasInference: 'None: class identity does not collapse four different loops/conditions.'
    });
    assert.equal(equal, true, 'Selected template/snapshot operation class differs; do not assert identical source owner');
}
jsonNew('template-emitted-helper-identity-v001.json', helperIdentity);

function location(file, literal, occurrence = 0) {
    const member = members.find(item => item.role === 'Original' && item.path === file);
    const text = fs.readFileSync(path.join(scope, member.capturedFile), 'utf8');
    let offset = -1;
    for (let index = 0; index <= occurrence; index++) {
        offset = text.indexOf(literal, offset + 1);
        assert.ok(offset >= 0, `${file}: missing exact evidence literal`);
    }
    return { path: file, line: text.substring(0, offset).split('\n').length, literal, wholeSourceSha256: member.sha256 };
}
const decisions = [
    {
        id: 'F243',
        retained: location(snapshotPath, 'var operationParameter = GetOperationParameter(operation, modelName);'),
        owner: location(emitterPath, 'var operationParameter = GetOperationParameter(operation, modelName);'),
        behavior: 'Method XML parameter-comment loop resolves effective model name and first matching current operation parameter by Ordinal name.',
        producerShape: 'Collision fixture declares two XML param comments and two named query parameters; actual runtime counts unobserved.',
        symbolicWork: 'C * P, conditional on method documentation/cache hit; reflection parameter scan is a separate cost.',
        distinctFrom: ['F244 fallback binding-source search', 'F245 response-code join', 'F246 property metadata/documentation phase']
    },
    {
        id: 'F244',
        retained: location(snapshotPath, 'else if (IsRequestBodyParameter(context, modelName))'),
        owner: location(emitterPath, 'else if (IsRequestBodyParameter(context, modelName))'),
        behavior: 'Only after operation-parameter miss, scan description source/name for Body, Form, or FormFile.',
        producerShape: 'Separate controller tests declare documented service/cancellation-token misses and one documented form/body parameter; collision fixture is not positive fallback proof.',
        symbolicWork: 'U * D, U limited to unmatched nonempty effective XML-comment names, early exit on qualifying match.',
        distinctFrom: ['F243 successful operation-parameter path', 'F245 response-code join', 'F246 property path uses direct Source gate']
    },
    {
        id: 'F245',
        retained: location(snapshotPath, 'var responseComment = global::System.Linq.Enumerable.SingleOrDefault(methodComment.Responses, xmlResponse => xmlResponse.Code == response.Key);'),
        owner: location(emitterPath, 'var responseComment = global::System.Linq.Enumerable.SingleOrDefault(methodComment.Responses, xmlResponse => xmlResponse.Code == response.Key);'),
        behavior: 'Each existing operation response queries XML response comments by exact code with SingleOrDefault uniqueness behavior.',
        producerShape: 'Minimal fixture declares three response-code XML comments and a three-outcome typed-results return; callbacks expect three descriptions, but actual typed-result metadata production/count was not executed or transitively closed.',
        symbolicWork: 'R * X; XML response list and produced operation responses are independently sourced.',
        distinctFrom: ['F243/F246 parameter-name joins', 'F244 body-source membership gate']
    },
    {
        id: 'F246',
        retained: location(snapshotPath, 'var parameter = GetOperationParameter(operation, modelName);'),
        owner: location(emitterPath, 'var parameter = GetOperationParameter(operation, modelName);'),
        behavior: 'Only documented, resolved property-kind API descriptions perform a first-match operation-parameter lookup; property phase follows method documentation.',
        producerShape: 'Controller source declares two inherited query properties; minimal source declares five documented AsParameters properties. MVC property expansion is captured; low-level minimal binding-metadata production remains a boundary.',
        symbolicWork: 'Q * P with Q <= D gated eligible/cache-hit properties, not all D descriptions.',
        distinctFrom: ['F243 XML method-parameter comments', 'F244 unmatched-method body-source scan', 'F245 response-code uniqueness join']
    }
].map(item => ({
    ...item,
    decision: 'source-only-informational-no-material-candidate-established',
    generatorEmitsBehavior: true,
    sourceApplicationDocumentPathAdmitted: true,
    sourceClosure: 'bounded-selected-inputs-with-explicit-transitive-boundaries',
    runtimeReachabilityObserved: false,
    productionCardinalityOrFrequencyObserved: false,
    measuredNoGainOrRuntimeClaim: false,
    candidateAuthored: false,
    aliasesProposed: []
}));
jsonNew('SOURCE-QUALIFICATION-v001.json', {
    actualAgentId: '7edc5806-0226-40d8-81f6-5c50d73959bc',
    pins,
    decisions,
    F201F202F203: 'Not qualified or aliased by this task; XML-example JSON parsing remains independent.',
    classificationBasis: 'Real generated/app source path and admitted small producer fixtures; not snapshot location. Material workload and benefit are unestablished, not disproved.',
    runtimeExecution: 'None',
    finalGuardPolicySha256: finalGuard.policySha256
});
jsonNew('additional-source-proposal-v001.json', {
    status: 'STOP-body-budget-closed-finite-unexecuted-proposal-not-authorization',
    requestedOnlyIfParentNeedsStrongerTransitiveClosure: true,
    roles: { Original: pins.Original, Default: pins.Default },
    exactAdditionalLogicalPathsPerRole: [
        { path: 'src/OpenApi/src/Extensions/OpenApiServiceCollectionExtensions.cs', reason: 'Close direct AddOpenApi service registration implementation.', membershipAlreadyInOpenApiMetadataTree: true },
        { path: 'src/OpenApi/src/OpenApiOptions.cs', reason: 'Close storage/dispatch registration of AddOperationTransformer.', membershipMustBeConfirmedBeforeAnyBody: true },
        { path: 'src/Http/Http.Extensions/src/RequestDelegateFactory.cs', reason: 'Inspect actual low-level parameter binding/AsParameters metadata producer; no inference from the consumer alone.', membershipMustBeConfirmedBeforeAnyBody: true },
        { path: 'src/Http/Http.Results/src/ResultsOfT.Generated.cs', reason: 'Inspect the actual typed-result union metadata producer behind declared response outcomes.', membershipMustBeConfirmedBeforeAnyBody: true }
    ],
    finiteMaximumAdditionalBodiesPerRole: 4,
    maximumAdditionalDirectGitGhRootsProposed: 3,
    noRecursiveBroadening: true,
    separateFreshExplicitScopeAndGORequired: true,
    noNativeCandidateTimingOrPublicationAdmission: true,
    remainingUnverifiedEvenIfAdmitted: ['Project/build selection and TFMs', 'Other transitive binding/response helpers if the four bodies delegate', 'Any runtime reachability, cardinality/frequency, materiality, or performance result']
});

const roots = fs.readdirSync(scope).filter(name => /^root-\d{3}\.request\.json$/.test(name)).sort().map(name => {
    const stem = name.replace('.request.json', '');
    const request = JSON.parse(fs.readFileSync(path.join(scope, name), 'utf8'));
    const receipt = JSON.parse(fs.readFileSync(path.join(scope, `${stem}.receipt.json`), 'utf8'));
    for (const stream of ['stdin', 'stdout', 'stderr']) {
        const bytes = fs.readFileSync(path.join(scope, `${stem}.${stream}.raw`));
        const expectedSize = stream === 'stdin' ? request.stdinBytes : receipt[`${stream}Bytes`];
        const expectedHash = stream === 'stdin' ? request.stdinSha256 : receipt[`${stream}Sha256`];
        assert.equal(bytes.length, expectedSize);
        assert.equal(sha256(bytes), expectedHash);
    }
    assert.equal(receipt.rootExitCode, 0);
    assert.equal(receipt.rootSignal, null);
    assert.equal(receipt.error, null);
    assert.equal(receipt.rootWaitAndStreamsReturned, true);
    return { root: stem, number: request.number, label: request.label, actualPid: receipt.actualRootPid, exitCode: receipt.rootExitCode, fullReturnedStreamsVerified: true };
});
assert.equal(roots.length, 14);
jsonNew('preserved-failures-and-limits-v001.json', {
    directRootNonzeroOrTransportFailures: roots.filter(item => item.exitCode !== 0),
    unsuccessfulMetadataDiscovery: [{ root: 'root-007', reason: 'Initial history paths used src/SourceGenerators and OperationTests.cs instead of the actual gen and partial test paths; empty successful command output is not negative source evidence.', correctedBy: 'root-009', originalBytesPreserved: true }],
    runtimeOrTestFailures: 'Not observed: no product-native/test execution authorized or performed.',
    observerLimit: 'Root receipts plus point-sampled known child identities; unseen/deeper descendants and unrelated machine work are not claimed absent.',
    instructionAccounting: {
        capturedRepositoryWholeInputsPerRole: 15,
        capturedRepositoryGuidanceAndDocsPerRoleIncluded: 2,
        injectedGenericAntiPatternSkillInstructionContexts: 1,
        injectedInstructionsNotUsedAsRepositorySourceEvidence: true,
        conservativeInterpretationRequiresParentReviewIfInjectedInstructionsAreBodySlots: true
    }
});
jsonNew('source-verification-v001.json', {
    verifiedUtc: new Date().toISOString(),
    verificationBoundary: 'Artifact and immutable-source byte verification only; not tests, benchmarks, product-native execution, or behavioral verification.',
    wholeInputsPerRole: { Original: 15, Default: 15 },
    totalWholeMembers: members.length,
    totalWholeBodyBytes: members.reduce((sum, member) => sum + member.fullBytes, 0),
    allIndependentRawTreeMembershipModesAndBlobIdsMatched: true,
    allWholeBodiesAndRawBinaryFramesMatched: true,
    allSelectedRolePairsSameWholeBytes: true,
    comparisons,
    fullVerifiedWholeInventory: verified,
    directGitGhRoots: roots,
    directRootCount: roots.length,
    directRootMaximum: 32,
    bodyBudgetClosed: true,
    finalGuard,
    finalOuterToolReceipt: 'Not available inside the running helper; parent must record the actual returned outer receipt.'
});
jsonNew('observed-outer-receipts-v004.json', {
    observed: [{ shellId: 'f243-246-283-capture-002', reportedState: 'completed', reportedExitCode: 0 }],
    note: 'Already-returned tool receipt only; no prediction for this helper or final outer exit.'
});
console.log(JSON.stringify({
    findings: decisions.map(item => ({ id: item.id, decision: item.decision, snapshotLine: item.retained.line, templateLine: item.owner.line })),
    sourceBodiesPerRole: 15, directGitGhRoots: roots.length,
    exactTemplateOperationClassMatchesSelectedSnapshotBothRoles: true,
    runtimeOrMeasurementExecuted: false,
    bodyBudgetClosed: true,
    parentAccountingReviewDisclosed: true
}, null, 2));
