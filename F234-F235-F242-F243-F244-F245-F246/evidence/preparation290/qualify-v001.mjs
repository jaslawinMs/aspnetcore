import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scope, inherited, pins, guard, jsonNew, parseTree, verifyInheritedBytes, readJson, sha256 } from './source-data-v001.mjs';

const currentGuard = guard('final-source-verification-v001').result;
const oldBefore = readJson(path.join(scope, 'inherited-byte-chain-before-v001.json'));
const oldAfter = verifyInheritedBytes();
assert.deepEqual(oldBefore.verified, oldAfter.verified);
jsonNew('inherited-byte-chain-after-v001.json', oldAfter);
const oldBatches = ['whole-inputs-v001.json', 'whole-inputs-v002.json'].map(file => ({
    base: inherited, inherited283: true, batch: readJson(path.join(inherited, file))
}));
const newBatch = { base: scope, inherited283: false, batch: readJson(path.join(scope, 'whole-inputs-v001.json')) };
const all = [];
for (const item of [...oldBatches, newBatch]) {
    const raw = fs.readFileSync(path.join(item.base, item.batch.rawFrameFile));
    let consumed = 0;
    for (const member of item.batch.members) {
        const bytes = fs.readFileSync(path.join(item.base, member.capturedFile));
        assert.equal(bytes.length, member.fullBytes);
        assert.equal(sha256(bytes), member.sha256);
        assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'), member.oid);
        const bodyOffset = item.inherited283 ? member.rawFrameBodyOffset : member.rawBodyOffset;
        const metadataRoot = item.inherited283 ? member.membershipEvidence : member.membershipRoot;
        const header = Buffer.from(`${member.oid} blob ${bytes.length}\n`, 'ascii');
        assert.equal(member.rawFrameHeaderOffset, consumed);
        assert.equal(bodyOffset, consumed + header.length);
        assert.ok(raw.subarray(consumed, bodyOffset).equals(header));
        assert.ok(raw.subarray(bodyOffset, bodyOffset + bytes.length).equals(bytes));
        assert.equal(member.rawFrameEndExclusive, bodyOffset + bytes.length + 1);
        assert.equal(raw[member.rawFrameEndExclusive - 1], 10);
        const metadata = parseTree(fs.readFileSync(path.join(item.base, `${metadataRoot}.stdout.raw`)))
            .filter(entry => entry.path === member.path);
        assert.equal(metadata.length, 1);
        assert.equal(metadata[0].oid, member.oid);
        assert.equal(metadata[0].mode, member.mode);
        assert.equal(metadata[0].type, 'blob');
        assert.equal(member.commit, pins[member.role]);
        assert.equal(member.commitPath, `${pins[member.role]}:${member.path}`);
        consumed = member.rawFrameEndExclusive;
        all.push({
            ...member,
            sourceScope: item.base,
            inherited283: item.inherited283,
            completeBodyRawFrameMembershipModeAndHashMatched: true
        });
    }
    assert.equal(consumed, raw.length);
}
assert.equal(all.length, 38);
for (const role of ['Original', 'Default']) {
    const roleMembers = all.filter(member => member.role === role);
    assert.equal(roleMembers.length, 19);
    assert.equal(roleMembers.filter(member => !member.inherited283).length, 4);
    assert.equal(new Set(roleMembers.map(member => member.path)).size, 19);
}
const pairEquality = all.filter(member => member.role === 'Original').map(before => {
    const after = all.find(member => member.role === 'Default' && member.path === before.path);
    assert.ok(after);
    assert.equal(before.oid, after.oid);
    assert.equal(before.mode, after.mode);
    assert.equal(before.sha256, after.sha256);
    return {
        path: before.path, Original: before.commitPath, Default: after.commitPath,
        mode: before.mode, oid: before.oid, sha256: before.sha256, wholeBytesEqual: true,
        newlyCaptured290: !before.inherited283
    };
});

function locate(file, literal, occurrence = 0) {
    const member = all.find(entry => entry.role === 'Original' && entry.path === file);
    assert.ok(member, `Unselected source is not evidence: ${file}`);
    const text = fs.readFileSync(path.join(member.sourceScope, member.capturedFile), 'utf8');
    let offset = -1;
    for (let count = 0; count <= occurrence; count++) {
        offset = text.indexOf(literal, offset + 1);
        assert.ok(offset >= 0, `Missing exact captured source literal: ${file}`);
    }
    return {
        path: file, Original: member.commitPath, Default: `${pins.Default}:${file}`,
        line: text.substring(0, offset).split('\n').length,
        literal, completeBodySha256: member.sha256,
        sourceScope: member.sourceScope
    };
}
const A = 'src/OpenApi/src/Extensions/OpenApiServiceCollectionExtensions.cs';
const O = 'src/OpenApi/src/Services/OpenApiOptions.cs';
const R = 'src/Http/Http.Extensions/src/RequestDelegateFactory.cs';
const T = 'src/Http/Http.Results/src/ResultsOfT.Generated.cs';
const D = 'src/OpenApi/src/Services/OpenApiDocumentService.cs';
const E = 'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs';
const evidence = {
    registration: [
        locate(A, 'public static IServiceCollection AddOpenApi(this IServiceCollection services, string documentName, Action<OpenApiOptions> configureOptions)'),
        locate(A, 'services.Configure<OpenApiOptions>(lowercasedDocumentName, configureOptions);'),
        locate(A, 'services.AddEndpointsApiExplorer();'),
        locate(A, 'services.TryAddKeyedSingleton<OpenApiDocumentService>(KeyedService.AnyKey);'),
        locate(A, 'services.TryAddSingleton<IDocumentProvider, OpenApiDocumentProvider>();'),
        locate(O, 'internal readonly List<IOpenApiOperationTransformer> OperationTransformers = [];'),
        locate(O, 'public OpenApiOptions AddOperationTransformer(IOpenApiOperationTransformer transformer)'),
        locate(O, 'OperationTransformers.Add(transformer);'),
        locate(D, 'operationTransformers[i] = operationTransformer;'),
        locate(D, 'await transformer.TransformAsync(operation, operationContext, cancellationToken);')
    ],
    actualParameterMetadataConstruction: [
        locate(R, 'public static RequestDelegateMetadataResult InferMetadata(MethodInfo methodInfo, RequestDelegateFactoryOptions? options = null)'),
        locate(R, 'private static Expression[] CreateArgumentsAndInferMetadata(MethodInfo methodInfo, RequestDelegateFactoryContext factoryContext)'),
        locate(R, 'EndpointMetadataPopulator.PopulateMetadata(methodInfo, factoryContext.EndpointBuilder, factoryContext.Parameters);'),
        locate(R, 'factoryContext.EndpointBuilder.Metadata.Add(new ParameterBindingMetadata('),
        locate(R, 'else if (parameterCustomAttributes.OfType<AsParametersAttribute>().Any())'),
        locate(R, 'private static Expression BindParameterFromProperties(ParameterInfo parameter, RequestDelegateFactoryContext factoryContext)'),
        locate(R, 'ParameterBindingMethodCache.Instance.FindConstructor(parameterType);'),
        locate(R, 'new PropertyAsParameterInfo(parameters[i].PropertyInfo, parameters[i].ParameterInfo, factoryContext.NullabilityContext);'),
        locate(R, 'if (properties[i].CanWrite && properties[i].GetSetMethod(nonPublic: false) != null)'),
        locate(R, 'new PropertyAsParameterInfo(properties[i], factoryContext.NullabilityContext);'),
        locate(R, 'factoryContext.EndpointBuilder.Metadata.Add(new ParameterBindingMetadata(parameterInfo.Name, parameterInfo', 0),
        locate(R, 'factoryContext.EndpointBuilder.Metadata.Add(new ParameterBindingMetadata(parameterInfo.Name, parameterInfo', 1),
        locate(R, 'private static void AddInferredAcceptsMetadata(RequestDelegateFactoryContext factoryContext, Type type, string[] contentTypes)'),
        locate(R, 'private static Expression BindParameterFromBody(ParameterInfo parameter, bool allowEmpty, RequestDelegateFactoryContext factoryContext)')
    ],
    actualUnionMetadataDispatch: [
        locate(R, 'private static void PopulateBuiltInResponseTypeMetadata(Type returnType, RequestDelegateFactoryContext factoryContext)'),
        locate(R, 'if (returnType == typeof(void) || typeof(IResult).IsAssignableFrom(returnType))'),
        locate(T, 'static void IEndpointMetadataProvider.PopulateMetadata(MethodInfo method, EndpointBuilder builder)', 1),
        locate(T, 'ResultsOfTHelper.PopulateMetadataIfTargetIsIEndpointMetadataProvider<TResult1>(method, builder);', 1),
        locate(T, 'ResultsOfTHelper.PopulateMetadataIfTargetIsIEndpointMetadataProvider<TResult2>(method, builder);', 1),
        locate(T, 'ResultsOfTHelper.PopulateMetadataIfTargetIsIEndpointMetadataProvider<TResult3>(method, builder);', 0)
    ],
    distinctLookupOwners: [
        locate(E, 'var operationParameter = GetOperationParameter(operation, modelName);'),
        locate(E, 'else if (IsRequestBodyParameter(context, modelName))'),
        locate(E, 'var responseComment = global::System.Linq.Enumerable.SingleOrDefault(methodComment.Responses, xmlResponse => xmlResponse.Code == response.Key);'),
        locate(E, 'var parameter = GetOperationParameter(operation, modelName);')
    ]
};
jsonNew('source-boundary-evidence-v001.json', evidence);

const remaining = [
    { source: R, boundaries: ['PropertyAsParameterInfo', 'ParameterBindingMetadata', 'ParameterBindingMethodCache.FindConstructor'], observation: 'Visible constructor/selection calls, not complete implementations; actual property-metadata carriage/selection remains bounded.' },
    { source: R, boundaries: ['EndpointMetadataPopulator', 'routing/request-delegate-generator selection'], observation: 'Metadata dispatch and its guards are visible, but lower-level invocation/selection implementation was not captured.' },
    { source: T, boundaries: ['ResultsOfTHelper', 'concrete NotFound/Ok/Created endpoint metadata providers'], observation: 'Three ordered generic helper calls are visible; actual response metadata contents/counts are unobserved.' },
    { source: A, boundaries: ['DI/options infrastructure', 'AddEndpointsApiExplorer registration implementation', 'OpenApiDocumentProvider'], observation: 'Actual service registration statements are captured, not executed or transitively expanded.' },
    { source: 'inherited-283-test-helper-and-project-context', boundaries: ['Project/build/TFM/interceptor selection', 'H early-return/async assertion reachability', 'document request frequency and output caching', 'runtime material effect or performance'], observation: 'No product-native execution, test, host, measurement, or additional dependency capture was authorized.' }
];
const previous = readJson(path.join(inherited, 'SOURCE-QUALIFICATION-v001.json'));
const additions = {
    F243: {
        newSourceConclusion: 'A/O close actual generated-instance service registration/storage; ordinary instance dispatch is visible in inherited D.',
        producerDimensions: 'Two declared XML comments/two bound query parameters in the retained collision fixture; actual runtime counts/frequency still unobserved.',
        work: 'C * P; first current operation parameter by Ordinal effective name.',
        notAliasReason: 'Method XML-comment loop, not F246 property-metadata/cache-hit loop.'
    },
    F244: {
        newSourceConclusion: 'R now directly constructs ordinary/body/form/service/special-parameter metadata and separates AsParameters construction; existing description/body consumers remain source-linked.',
        producerDimensions: 'Separate declared body/form and cancellation/service fixtures; no source or runtime proof of a large unmatched-comment population.',
        work: 'U * D, only unmatched nonempty effective comment names; body/form source gate with early match.',
        notAliasReason: 'Distinct fallback helper/conditions and observable body-assignment contract.'
    },
    F245: {
        newSourceConclusion: 'The exact three-type Results union performs three ordered per-generic-type metadata-helper calls, independent of active result execution.',
        producerDimensions: 'Three explicit XML codes and three declared return variants are source facts; actual concrete response metadata/three output response entries remain unobserved behind delegates.',
        work: 'Rsp * X; queried-code SingleOrDefault uniqueness and exception ordering preserved.',
        notAliasReason: 'Response-code join with uniqueness semantics, not parameter-name or body-source matching.'
    },
    F246: {
        newSourceConclusion: 'R captures actual constructor/property expansion and public-setter filtering, with per-property metadata constructor calls and omitted outer AsParameters metadata branch.',
        producerDimensions: 'Two inherited controller properties / five declared minimal properties are fixture declarations; constructor choice/property-info and metadata-class implementation remain explicit delegates, not observed counts.',
        work: 'Q * P, Q <= D gated eligible property metadata, reflection resolution, and documentation cache hit.',
        notAliasReason: 'Later property-documentation phase and different eligibility/comment source/body fallback, despite sharing GetOperationParameter with F243.'
    }
};
const decisions = ['F243', 'F244', 'F245', 'F246'].map((id, index) => {
    const prior = previous.decisions.filter(decision => decision.id === id);
    assert.equal(prior.length, 1);
    return {
        id,
        retainedSnapshotLocation: prior[0].retained,
        actualEmittedOwner: evidence.distinctLookupOwners[index],
        recommendation: 'source-only-informational-no-material-candidate-established',
        ...additions[id],
        realEmittedApplicationBehaviorInSource: true,
        completeTransitiveProducerClosureClaimed: false,
        actualRuntimeReachabilityOrCountsObserved: false,
        performanceOrMeasuredNoGainClaimed: false,
        aliasesProposed: [],
        candidateAuthoredOrExecuted: false,
        parentFinalDispositionApproved: false
    };
});
jsonNew('SOURCE-QUALIFICATION-v001.json', {
    actualOwner: '7edc5806-0226-40d8-81f6-5c50d73959bc',
    rolePinsReusedFrom283: pins,
    noFreshCurrentDefaultClaim: true,
    decisions,
    explicitAccounting: {
        unchanged283RepositoryBodiesPerRole: 15, unchangedInjectedCommonInstructionContextsPerRole: 1,
        unchanged283ConservativeTotalPerRole: 16, new290RepositoryBodiesPerRole: 4,
        cumulativeRepositoryBodiesPerRole: 19, cumulativeChargedLogicalInputsPerRole: 20,
        oldScopeComplianceRetroactivelyApproved: false,
        newDirectGitRoots: 3, aggregateDirectGitGhRoots: 17,
        bodyAndRootBudgetsClosed: true
    },
    F201F202F203: 'No qualification, alias, decision, or mutation supplied for XML-example JSON parsing or its pending aliases.',
    remainingGaps: remaining,
    noRecursiveBroadening: true,
    noFurtherSourceOrNativeAuthority: true,
    original283AcceptanceRemainsByteAndExactInventoryOnly: true,
    finalGuardPolicySha256: currentGuard.policySha256
});
jsonNew('remaining-gaps-and-stop-v001.json', {
    state: 'STOP-four-bodies-and-three-new-roots-consumed-no-further-source-traversal',
    remaining,
    noGuessedPostBodyReplacementOrRetry: true,
    noExtraSourceProposalAutomaticallyAuthorized: true,
    freshExplicitParentScopeRequiredForAnyLaterWork: true,
    runtimeBuildTestCandidateTimingPublicationAuthority: false
});

const roots = [];
for (const [base, inherited283] of [[inherited, true], [scope, false]]) {
    for (const file of fs.readdirSync(base).filter(name => /^root-\d{3}\.request\.json$/.test(name)).sort()) {
        const stem = file.replace('.request.json', '');
        const request = readJson(path.join(base, file));
        const receipt = readJson(path.join(base, `${stem}.receipt.json`));
        for (const stream of ['stdin', 'stdout', 'stderr']) {
            const bytes = fs.readFileSync(path.join(base, `${stem}.${stream}.raw`));
            const size = stream === 'stdin' ? request.stdinBytes : receipt[`${stream}Bytes`];
            const digest = stream === 'stdin' ? request.stdinSha256 : receipt[`${stream}Sha256`];
            assert.equal(bytes.length, size);
            assert.equal(sha256(bytes), digest);
        }
        assert.equal(inherited283 ? receipt.rootExitCode : receipt.exitCode, 0);
        assert.equal(inherited283 ? receipt.rootSignal : receipt.signal, null);
        assert.equal(receipt.error, null);
        assert.equal(inherited283 ? receipt.rootWaitAndStreamsReturned : receipt.rootAndReturnedStreamsCompleted, true);
        roots.push({
            number: request.number, root: stem, sourceScope: base, inherited283,
            label: request.label, pid: inherited283 ? receipt.actualRootPid : receipt.actualPid,
            exitCode: 0, completeRawReturnedStreamsVerified: true
        });
    }
}
assert.equal(roots.length, 17);
assert.deepEqual(roots.map(item => item.number).sort((a, b) => a - b), Array.from({ length: 17 }, (_, index) => index + 1));
const selection = readJson(path.join(scope, 'confirmed-selection-before-first-body-batch-v001.json'));
assert.equal(selection.metadataOnlyConfirmationCompleted, true);
assert.equal(selection.metadataDirectRootsAlreadyCompleted, 2);
assert.equal(selection.firstBodyBatchNotYetRequested, true);
assert.equal(selection.members.length, 8);
assert.equal(roots.filter(item => !item.inherited283).length, 3);
jsonNew('source-verification-v001.json', {
    observedUtc: new Date().toISOString(),
    verificationBoundary: 'Static immutable-source, artifact-byte, raw membership/framing, and returned-stream verification only; not product-native or behavioral verification.',
    samePinsReusedWithoutFreshHead: pins,
    exactNewMetadataConfirmationBeforeBodyBatch: true,
    actualOptionsCounterpartChosenByMetadata: 'src/OpenApi/src/Services/OpenApiOptions.cs',
    missingBodyRetries: 0, guessedPostMissingReplacements: 0,
    totalWholeRepositoryMembersBothRoles: all.length,
    cumulativeRepositoryBodiesPerRole: 19,
    injectedCommonInstructionContextsPerRole: 1,
    cumulativeChargedLogicalInputsPerRole: 20,
    wholeNewBodiesPerRole: 4,
    allCompleteBodiesRawFramesMembershipModesAndHashesVerified: true,
    all19SelectedRolePairsWholeByteIdentical: true,
    selectedRolePairEquality: pairEquality,
    cumulativeWholeInputInventory: all,
    directRootInventory: roots,
    newDirectRoots: 3, aggregateDirectRoots: 17,
    preserved283ExactInventoryBeforeAndAfter: 186,
    original283AcceptanceNotRetroactivelyExtended: true,
    existing283HistoryMissPreserved: 'root-007: initial mistargeted history probe, not negative source evidence; unchanged.',
    newDirectRootFailures: [],
    freshFinalPointGuard: currentGuard,
    machineIdleOrUnseenDescendantClaim: false,
    finalOuterToolExitCode: null,
    actualFinalOuterReceiptOnlyAfterReturn: true
});
jsonNew('observed-prior-outer-receipt-v001.json', {
    shellId: 'f243-246-290-capture-001', reportedState: 'completed', reportedExitCode: 0,
    observedOnlyAfterThatToolReturned: true,
    notProspectiveEvidenceForThisHelperOrFinalOuterTool: true
});
console.log(JSON.stringify({
    findings: decisions.map(decision => ({ id: decision.id, recommendation: decision.recommendation, completeTransitiveClosureClaimed: decision.completeTransitiveProducerClosureClaimed })),
    newBodiesPerRole: 4, cumulativeRepositoryBodiesPerRole: 19,
    injectedContextPerRole: 1, cumulativeChargedInputsPerRole: 20,
    newRoots: 3, aggregateRoots: 17,
    old283Exact186FilesRehashedUnchanged: true,
    all19SelectedRolePairsWholeByteIdentical: true,
    runtimeOrMeasurementExecuted: false,
    stopAtDelegationBoundaries: true
}, null, 2));
