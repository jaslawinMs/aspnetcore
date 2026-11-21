import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const readJson = file => JSON.parse(fs.readFileSync(path.join(output, file), 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const manifests = Object.fromEntries(['Original', 'Default'].map(role => [role,
    fs.readdirSync(output).filter(file => file.startsWith(`bodies-${role}-`) && file.endsWith('.json')).sort()
        .flatMap(file => readJson(file).entries)]));
const pins = readJson('pins.json');
const roles = {};

function source(role, repositoryPath)
{
    const entries = manifests[role].filter(value => value.path === repositoryPath);
    assert.equal(entries.length, 1);
    const entry = entries[0];
    const bytes = fs.readFileSync(path.join(output, entry.file));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(sha256(bytes), entry.sha256);
    return { entry, text: bytes.toString('utf8') };
}

function lineOf(text, needle)
{
    const offset = text.indexOf(needle);
    assert.ok(offset >= 0, `Missing selected-source anchor: ${needle}`);
    return text.slice(0, offset).split('\n').length;
}

function braces(text, anchor)
{
    const offset = text.indexOf(anchor);
    assert.ok(offset >= 0, `Missing bounded data declaration: ${anchor}`);
    const open = text.indexOf('{', offset + anchor.length);
    assert.ok(open >= 0);
    let depth = 1;
    let close = open + 1;
    for (; close < text.length && depth !== 0; close++)
    {
        if (text[close] === '{') depth++;
        if (text[close] === '}') depth--;
    }
    assert.equal(depth, 0);
    return { body: text.slice(open + 1, close - 1), line: text.slice(0, open).split('\n').length };
}

function fields(text)
{
    const result = [];
    let obsolete = false;
    for (const [index, line] of text.split('\n').entries())
    {
        if (line.trimStart().startsWith('[Obsolete(')) obsolete = true;
        const match = /^\s*public static readonly string (\w+) = "([^"]*)";/.exec(line);
        if (match)
        {
            result.push({ identifier: match[1], value: match[2], obsolete, line: index + 1 });
            obsolete = false;
        }
    }
    assert.equal((text.match(/public static readonly string /g) ?? []).length, result.length);
    assert.equal(new Set(result.map(value => value.identifier)).size, result.length);
    return result;
}

function duplicates(values)
{
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function identifier(name)
{
    if (name === 'baggage') return 'Baggage';
    if (name === 'traceparent') return 'TraceParent';
    if (name === 'tracestate') return 'TraceState';
    const value = name.replaceAll('-', '');
    return value.startsWith(':') ? value[1].toUpperCase() + value.slice(2) : value;
}

for (const role of ['Original', 'Default'])
{
    assert.equal(manifests[role].length, 15);
    const known = source(role, 'src/Servers/Kestrel/shared/KnownHeaders.cs');
    const publicFields = fields(source(role, 'src/Http/Headers/src/HeaderNames.cs').text);
    const internalFields = fields(source(role, 'src/Shared/InternalHeaderNames.cs').text);
    const publicValues = new Map(publicFields.map(value => [value.identifier, value.value]));
    const internalValues = new Map(internalFields.map(value => [value.identifier, value.value]));
    const literalArrays = {};
    function headerArray(label, anchor)
    {
        const region = braces(known.text, anchor);
        const tokens = region.body.split(',').map(value => value.trim()).filter(Boolean);
        const values = tokens.map(token =>
        {
            const match = /^(HeaderNames|InternalHeaderNames)\.(\w+)$/.exec(token);
            assert.ok(match, `Unsupported literal-array data: ${token}`);
            const value = (match[1] === 'HeaderNames' ? publicValues : internalValues).get(match[2]);
            assert.notEqual(value, undefined);
            return { token, value };
        });
        literalArrays[label] = { line: region.line, count: values.length, values };
        return values.map(value => value.value);
    }
    const accessors = headerArray('InternalHeaderAccessors', 'InternalHeaderAccessors = new[]');
    const nonPublic = headerArray('NonPublicHeaderNames', 'NonPublicHeaderNames = new[]');
    const requestPrimary = headerArray('requestPrimaryHeaders', 'var requestPrimaryHeaders = new[]');
    const responsePrimary = headerArray('responsePrimaryHeaders', 'var responsePrimaryHeaders = new[]');
    const common = headerArray('commonHeaders', 'var commonHeaders = new[]');
    const corsRequest = headerArray('corsRequestHeaders', 'var corsRequestHeaders = new[]');
    const requestExistence = headerArray('requestHeadersExistence', 'var requestHeadersExistence = new[]');
    const requestCount = headerArray('requestHeadersCount', 'var requestHeadersCount = new[]');
    const requestAdditional = headerArray('requestAdditionalHeaders', 'RequestHeaders = commonHeaders.Concat(new[]');
    const responseExistence = headerArray('responseHeadersExistence', 'var responseHeadersExistence = new[]');
    const enhanced = headerArray('enhancedHeaders', 'var enhancedHeaders = new[]');
    const corsResponse = headerArray('corsResponseHeaders', 'var corsResponseHeaders = new[]');
    const responseAdditional = headerArray('responseAdditionalHeaders', 'ResponseHeaders = commonHeaders.Concat(new[]');
    const trailerNames = headerArray('ResponseTrailers', 'ResponseTrailers = new[]');
    const invalid = headerArray('invalidH2H3ResponseHeaders', 'var invalidH2H3ResponseHeaders = new[]');
    const formattedRegion = braces(known.text, 'FormattedInternalHeaderNames = new[]');
    const formatted = [...formattedRegion.body.matchAll(/new InternalHeader\("(\w+)", InternalHeaderNames\.(\w+)(, isPseudoHeader: true)?\)/g)]
        .map(match => ({ identifier: match[1], value: internalValues.get(match[2]), pseudo: Boolean(match[3]) }));
    assert.equal(formatted.length, (formattedRegion.body.match(/new InternalHeader\(/g) ?? []).length);
    assert.ok(formatted.every(value => typeof value.value === 'string'));
    const pseudo = formatted.filter(value => value.pseudo);
    const nonApi = [...nonPublic, ...formatted.map(value => value.identifier)];
    const nonApiSet = new Set(nonApi);
    const defined = publicFields.filter(value => !value.obsolete).map(value => value.identifier);
    const api = defined.filter(value => !nonApiSet.has(value));
    const apiWithoutContentLength = api.filter(value => value !== 'ContentLength');
    const requestBeforeContentLength = [...common, ...requestAdditional, ...corsRequest];
    const responseBeforeContentLength = [...common, ...responseAdditional, ...corsResponse];
    const tables = {
        HttpRequestHeaders: [...requestBeforeContentLength, publicValues.get('ContentLength')],
        HttpResponseHeaders: [...responseBeforeContentLength, publicValues.get('ContentLength')],
        HttpResponseTrailers: trailerNames
    };
    const generated = source(role, 'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs');
    const generatedClassMatches = [...generated.text.matchAll(/^    internal partial class (HttpRequestHeaders|HttpResponseHeaders|HttpResponseTrailers) : IHeaderDictionary/gm)];
    assert.equal(generatedClassMatches.length, 3);
    const generatedClasses = {};
    for (const [index, match] of generatedClassMatches.entries())
    {
        const className = match[1];
        const body = generated.text.slice(match.index, generatedClassMatches[index + 1]?.index ?? generated.text.length);
        const properties = [...body.matchAll(/^\s*StringValues IHeaderDictionary\.(\w+)/gm)].map(value => value[1]);
        const fallback = [...body.matchAll(/StringValues IHeaderDictionary\.(\w+)\s*\{\s*get\s*\{\s*StringValues value = default;\s*if \(!TryGetUnknown\(HeaderNames\.(\w+), ref value\)\)/g)]
            .map(value => { assert.equal(value[1], value[2]); return value[1]; });
        const sourceNames = tables[className];
        const sourceIdentifiers = sourceNames.map(identifier);
        const knownIdentifierSet = new Set(sourceIdentifiers);
        const expectedFallback = apiWithoutContentLength.filter(value => !knownIdentifierSet.has(value));
        assert.deepEqual([...fallback].sort(), [...expectedFallback].sort());
        assert.deepEqual([...properties].sort(), [...apiWithoutContentLength].sort());
        assert.equal(new Set(properties).size, properties.length);
        const headerReferences = braces(body, 'private struct HeaderReferences').body;
        const referenceFields = [...headerReferences.matchAll(/public StringValues _(\w+);/g)].map(value => value[1]);
        assert.deepEqual([...referenceFields].sort(), sourceNames.filter(value => value !== publicValues.get('ContentLength')).map(identifier).sort());
        const emittedIndexByWireName = {};
        for (const value of body.matchAll(/case (-?\d+): \/\/ Header: "([^"]+)"/g))
        {
            const prior = emittedIndexByWireName[value[2]];
            if (prior !== undefined) assert.equal(prior, Number(value[1]));
            emittedIndexByWireName[value[2]] = Number(value[1]);
        }
        generatedClasses[className] = {
            generatedDeclarationLine: generated.text.slice(0, match.index).split('\n').length,
            tableCount: sourceNames.length,
            tableNamesUnsortedLiteralData: sourceNames,
            tableIdentifiersUnsortedLiteralData: sourceIdentifiers,
            duplicateWireNames: duplicates(sourceNames),
            duplicateIdentifiers: duplicates(sourceIdentifiers),
            apiKnownExcludingContentLength: apiWithoutContentLength.filter(value => knownIdentifierSet.has(value)).length,
            fallbackPropertyCount: fallback.length,
            fallbackPropertiesInCheckedInOrder: fallback,
            totalExplicitInterfaceProperties: properties.length,
            sourceFieldOrderConsistentWithCheckedInFallbackOrder: JSON.stringify(fallback) === JSON.stringify(expectedFallback),
            referenceFieldCount: referenceFields.length,
            emittedIndexByWireName
        };
    }
    const pseudoRequestNames = tables.HttpRequestHeaders.filter(value => pseudo.some(item => item.identifier === identifier(value)));
    const invalidResponseNames = tables.HttpResponseHeaders.filter(value => invalid.includes(value));
    const pseudoMask = pseudoRequestNames.reduce((mask, value) => mask | (1n << BigInt(generatedClasses.HttpRequestHeaders.emittedIndexByWireName[value])), 0n);
    const invalidMask = invalidResponseNames.reduce((mask, value) => mask | (1n << BigInt(generatedClasses.HttpResponseHeaders.emittedIndexByWireName[value])), 0n);
    const emittedPseudoMask = /_pseudoBits = _bits & (\d+);/.exec(generated.text)[1];
    const emittedInvalidMask = /HasInvalidH2H3Headers => \(_bits & (\d+)\)/.exec(generated.text)[1];
    assert.equal(pseudoMask.toString(), emittedPseudoMask);
    assert.equal(invalidMask.toString(), emittedInvalidMask);
    const requestLength = requestBeforeContentLength.length;
    const responseLength = responseBeforeContentLength.length;
    const trailerLength = trailerNames.length;
    const membershipSites = [
        { name: 'requestPrimaryHeaders.Contains', calls: requestLength * 2 + 1, width: requestPrimary.length, explanation: 'OrderBy key once per non-ContentLength request header; PrimaryHeader once per same header; one appended ContentLength.' },
        { name: 'responsePrimaryHeaders.Contains', calls: responseLength * 2 + 1 + trailerLength * 2, width: responsePrimary.length, explanation: 'Response OrderBy and PrimaryHeader, one appended ContentLength, trailer OrderBy and PrimaryHeader.' },
        { name: 'FormattedInternalHeaderNames.Select(Name).Contains', calls: requestLength + responseLength + trailerLength, width: formatted.length, explanation: 'ClassName projection for the three source tables, before appended ContentLength entries.' },
        { name: 'requestHeadersExistence.Contains', calls: requestLength, width: requestExistence.length },
        { name: 'requestHeadersCount.Contains', calls: requestLength, width: requestCount.length },
        { name: 'enhancedHeaders.Contains', calls: responseLength + 1 + trailerLength, width: enhanced.length },
        { name: 'responseHeadersExistence.Contains', calls: responseLength + trailerLength, width: responseExistence.length },
        { name: 'invalidH2H3ResponseHeaders.Contains', calls: tables.HttpResponseHeaders.length, width: invalid.length },
        { name: 'FormattedInternalHeaderNames.Where(IsPseudoHeader).Select(Identifier).Contains', calls: tables.HttpRequestHeaders.length, width: pseudo.length, underlyingFilterWidth: formatted.length }
    ].map(site => ({ ...site, maximumSequentialEqualityPositions: site.calls * site.width }));
    const f259Loops = Object.entries(generatedClasses).map(([className, data]) => ({
        className,
        candidateApiHeaders: api.length,
        fullPassMembershipCalls: apiWithoutContentLength.length,
        innerTableCount: data.tableCount,
        knownApiMembersExcludingContentLength: data.apiKnownExcludingContentLength,
        fallbackMembers: data.fallbackPropertyCount,
        fullPassMaximumProjectedIdentifierVisits: apiWithoutContentLength.length * data.tableCount,
        anyPrefixMembershipCallsLowerBound: 1,
        anyPrefixMembershipCallsUpperBound: data.apiKnownExcludingContentLength + 1
    }));
    const requestTests = source(role, 'src/Servers/Kestrel/Core/test/HttpRequestHeadersTests.cs').text;
    const theoryCount = (requestTests.match(/\[MemberData\(nameof\(KnownRequestHeaders\)\)\]/g) ?? []).length;
    const sourceAnchors = {
        staticConstructor: lineOf(known.text, 'static KnownHeaders()'),
        definedFieldsReflection: lineOf(known.text, 'public static readonly string[] DefinedHeaderNames'),
        apiNames: lineOf(known.text, 'public static readonly string[] ApiHeaderNames'),
        staticRequestProjection: lineOf(known.text, '.OrderBy(header => !requestPrimaryHeaders.Contains(header))'),
        invalidResponseBits: lineOf(known.text, 'InvalidH2H3ResponseHeadersBits = ResponseHeaders'),
        pseudoRequestBits: lineOf(known.text, 'PseudoRequestHeadersBits = RequestHeaders'),
        eachDoubleEnumeration: lineOf(known.text, 'return values.Any() ? values.Select(formatter).Aggregate'),
        identifierResolver: lineOf(known.text, 'private static string ResolveIdentifier'),
        generatedFile: lineOf(known.text, 'public static string GeneratedFile()'),
        threeLoopProducer: lineOf(known.text, 'var loops = new[]'),
        mutableByteCount: lineOf(known.text, 'header.BytesCount += header.Bytes.Length'),
        apiMembership: lineOf(known.text, 'Each(ApiHeaderNames.Where(header => header != "ContentLength"'),
        memberDataProvider: lineOf(requestTests, 'public static IEnumerable<object[]> KnownRequestHeaders')
    };
    roles[role] = {
        commit: role === 'Original' ? pins.original : pins.default.commit,
        repositoryBodies: manifests[role].length,
        chargedInjectedCommonContexts: 2,
        inclusiveLogicalInputs: manifests[role].length + 2,
        sourceAnchors,
        literalArrays,
        formattedInternalHeaders: { count: formatted.length, pseudoCount: pseudo.length, values: formatted },
        fieldNameProducers: {
            publicStaticReadonlyFields: publicFields.length,
            obsoletePublicFields: publicFields.filter(value => value.obsolete),
            definedNonObsoleteFieldNames: defined.length,
            nonApiEntries: nonApi,
            nonApiDistinctCount: nonApiSet.size,
            excludedDefinedFieldNames: defined.filter(value => nonApiSet.has(value)),
            apiHeaderNames: api,
            apiHeaderNameCount: api.length,
            duplicatePublicWireValues: duplicates(publicFields.map(value => value.value)),
            reflectionOrderObservedByExecution: false,
            accessorCount: accessors.length
        },
        tables: generatedClasses,
        F258: {
            lookupSites: membershipSites,
            membershipCallsPerSuccessfulTypeInitialization: membershipSites.reduce((sum, site) => sum + site.calls, 0),
            maximumSequentialEqualityPositionsPerTypeInitialization: membershipSites.reduce((sum, site) => sum + site.maximumSequentialEqualityPositions, 0),
            pseudoFilterMaximumItemVisits: tables.HttpRequestHeaders.length * formatted.length,
            pseudoRequestNameCount: pseudoRequestNames.length,
            invalidResponseNameCount: invalidResponseNames.length,
            checkedInPseudoMask: emittedPseudoMask,
            checkedInInvalidResponseMask: emittedInvalidMask,
            separateCoreTestCompilation: true,
            knownRequestHeadersProviderRowsPerFullEnumeration: (tables.HttpRequestHeaders.length - 1) * 2,
            memberDataAttributesUsingThatProvider: theoryCount
        },
        F259: {
            loops: f259Loops,
            fullPassMembershipCalls: f259Loops.reduce((sum, loop) => sum + loop.fullPassMembershipCalls, 0),
            fullPassMaximumProjectedIdentifierVisits: f259Loops.reduce((sum, loop) => sum + loop.fullPassMaximumProjectedIdentifierVisits, 0),
            anyPrefixMembershipCallsLowerBound: f259Loops.reduce((sum, loop) => sum + loop.anyPrefixMembershipCallsLowerBound, 0),
            anyPrefixMembershipCallsUpperBound: f259Loops.reduce((sum, loop) => sum + loop.anyPrefixMembershipCallsUpperBound, 0),
            anyPrefixMaximumProjectedIdentifierVisits: f259Loops.reduce((sum, loop) => sum + loop.anyPrefixMembershipCallsUpperBound * loop.innerTableCount, 0)
        }
    };
}

const equivalence = manifests.Original.map(entry =>
{
    const other = manifests.Default.find(value => value.path === entry.path);
    assert.ok(other);
    assert.equal(other.blob, entry.blob);
    assert.equal(other.mode, entry.mode);
    assert.equal(other.bytes, entry.bytes);
    assert.equal(other.sha256, entry.sha256);
    return { path: entry.path, mode: entry.mode, blob: entry.blob, bytes: entry.bytes, sha256: entry.sha256, byteIdentical: true };
});
const rootCommands = fs.readdirSync(output).filter(file => /^\d{2}-.*\.command\.json$/.test(file)).sort();
assert.equal(rootCommands.length, 15);
for (const command of rootCommands)
{
    const terminal = readJson(command.replace('.command.json', '.terminal.json'));
    assert.equal(terminal.close.code, 0);
    assert.equal(terminal.launchError, null);
    for (const stream of ['stdin', 'stdout', 'stderr'])
    {
        const bytes = fs.readFileSync(path.join(output, terminal[stream].file));
        assert.equal(sha256(bytes), terminal[stream].sha256);
        assert.equal(bytes.length, terminal[stream].bytes);
    }
}
const historyOriginal = fs.readFileSync(path.join(output, '12-history-Original-knownheaders-owner.stdout.bin'));
const historyDefault = fs.readFileSync(path.join(output, '13-history-Default-knownheaders-owner.stdout.bin'));
assert.ok(historyOriginal.equals(historyDefault));
const registrationHelper = path.join(path.dirname(output), 'Register-Owners-298-299.mjs');
const registrationHelperBytes = fs.readFileSync(registrationHelper);
fs.writeFileSync(path.join(output, 'observed-registration-helper.bin'), registrationHelperBytes, { flag: 'wx' });
const result = {
    analysisKind: 'Finite textual source-data derivation and raw-custody checks only; no .NET, product, generator, test, candidate, benchmark, counters, timings, or allocation collection.',
    modelLimits: [
        'Literal cardinalities and complete-pass counts are source arithmetic, not measured operation counts or elapsed/allocation predictions.',
        'Sequential-equality-position bounds do not assert the implementation of the selected runtime Enumerable.Contains or string operations.',
        'No culture-sensitive sorting or reflection is executed. Table data are unsorted source literals; indexes/masks are read from the pinned checked-in generated output.',
        'Existing generated output was statically checked for expected field/property membership; this is not executing the generator or the GeneratedCodeIsUpToDate test.'
    ],
    commonContextAccounting: {
        chargedPerRole: 2,
        contexts: [
            'Injected task/GO299 and operating-instruction context.',
            'Operational owner-registration/guard context: PARENT-ACCEPTANCE, registration/policy, canonical pending selection, and the registration helper used to identify the exact lease path.'
        ],
        repositoryGuidanceChargedAmongFifteenBodies: true,
        operationalGuardFileInventoryIsNotClaimedToBeRepositorySourceBodies: true
    },
    rootCount: rootCommands.length,
    rootMaximumIncludingFailures: 32,
    actualNonzeroDirectGitGhRoots: 0,
    history: { limitPerRole: 8, pathCount: 6, metadataOnly: true, exactOutputsIdentical: true, sha256: sha256(historyOriginal), historicalSourceBodiesRead: 0 },
    operationalHelper: { originalPath: registrationHelper, bytes: registrationHelperBytes.length, sha256: sha256(registrationHelperBytes), copy: 'observed-registration-helper.bin' },
    pairwiseSourceEquivalence: equivalence,
    roles
};
writeJson('derived-source-data-299.json', result);
console.log(JSON.stringify({
    rootCount: rootCommands.length,
    repositoryBodiesPerRole: 15,
    inclusiveLogicalInputsPerRole: 17,
    byteIdenticalRoleBodies: equivalence.length,
    F258: roles.Original.F258,
    F259: roles.Original.F259,
    apiHeaderNames: roles.Original.fieldNameProducers.apiHeaderNameCount,
    publicStaticReadonlyFields: roles.Original.fieldNameProducers.publicStaticReadonlyFields,
    definedNonObsoleteFields: roles.Original.fieldNameProducers.definedNonObsoleteFieldNames
}, null, 2));
