'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const old = path.join(path.dirname(root), 'finding-F146-006');
const roles = ['Original', 'ObservedDefault'];
const self = new Set(['MANIFEST.json', 'MANIFEST.sha256']);
const junctions = new Set(['graphs']);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + '\n');
const frozen = () => fs.existsSync(path.join(root, 'MANIFEST.json'));

function* files(directory = root) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(directory, entry.name);
        const relative = path.relative(root, full);
        if (self.has(relative) || junctions.has(relative)) continue;
        const stat = fs.lstatSync(full);
        assert(!stat.isSymbolicLink(), `Unexpected reparse/symbolic entry: ${relative}`);
        if (stat.isDirectory()) yield* files(full);
        else if (stat.isFile()) yield { path: relative, length: stat.size, full };
        else assert.fail(`Unexpected payload entry: ${relative}`);
    }
}

function oldCheck() {
    const expected = '24fe014f3a9dc99456169639e6f7c3cf3d8dc58301dbd2293aa238128460b0e2';
    const manifest = path.join(old, 'MANIFEST.json');
    assert.equal(sha(manifest), expected);
    const data = read(manifest);
    assert.equal(data.files.length, 100);
    for (const entry of data.files) {
        const full = path.join(old, entry.path);
        assert.equal(fs.statSync(full).size, entry.length, full);
        assert.equal(sha(full), entry.sha256.toLowerCase(), full);
    }
    return { root: old, payloadFileCount: 100, manifestSha256: expected, allPayloadHashesMatch: true, historicalHoldInterpretationNotRewritten: true };
}

function image(role) {
    const output = path.join(root, 'graphs', role, 'artifacts\\bin\\InMemory.FunctionalTests\\Release\\net12.0');
    const before = read(path.join(root, `${role}-complete-output-image-before-run.json`));
    const after = [];
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const full = path.join(directory, entry.name);
            assert(!entry.isSymbolicLink(), full);
            if (entry.isDirectory()) visit(full);
            else after.push({ path: path.relative(output, full), bytes: fs.statSync(full).size, sha256: sha(full) });
        }
    }
    visit(output);
    const map = new Map(after.map(entry => [entry.path, entry]));
    assert.equal(map.size, before.length);
    for (const entry of before) {
        assert.equal(map.get(entry.path)?.sha256, entry.sha256.toLowerCase(), entry.path);
        assert.equal(map.get(entry.path)?.bytes, entry.bytes, entry.path);
    }
    for (const name of ['InMemory.FunctionalTests.dll', 'InMemory.FunctionalTests.pdb', 'InMemory.FunctionalTests.deps.json', 'InMemory.FunctionalTests.runtimeconfig.json',
        'Microsoft.AspNetCore.Server.Kestrel.Core.dll', 'Microsoft.AspNetCore.Server.Kestrel.Core.pdb']) assert(map.has(name));
    after.sort((a, b) => a.path.localeCompare(b.path));
    save(`${role}-complete-output-image-after-run.json`, after);
    const frozenImage = path.join(root, 'verified-images', role);
    assert(!fs.existsSync(frozenImage), `Refusing to overwrite verified image ${role}`);
    fs.cpSync(output, frozenImage, { recursive: true, dereference: false });
    for (const entry of after) assert.equal(sha(path.join(frozenImage, entry.path)), entry.sha256);
    return map;
}

function collect() {
    assert(!frozen(), 'Frozen.');
    const oldStatus = oldCheck();
    const archives = read(path.join(root, 'SOURCE-ARCHIVE-RAW-CHECKS.json'));
    assert.equal(archives.length, 2);
    for (const role of roles) {
        const entry = archives.find(item => item.role === role);
        const identity = read(path.join(root, `${role}-source.json`));
        assert.equal(entry.sourcePin, identity.sourcePin);
        assert.equal(sha(entry.archive), entry.archiveSha256.toLowerCase());
        assert(entry.sourceOwnerRecordedInputsMatch);
    }
    const historical = read(path.join(root, 'source-observations.json'));
    const sourceChecks = historical.inputs.map(entry => {
        const full = path.join(root, 'graphs', entry.role, entry.path);
        const bytes = fs.readFileSync(full);
        const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
        const canonicalSha256 = crypto.createHash('sha256').update(canonical).digest('hex');
        assert.equal(canonicalSha256, entry.sha256.toLowerCase(), full);
        return {
            role: entry.role, path: entry.path, recordedGitBlob: entry.blob,
            rawMaterializedSha256: sha(full), historicalLfSha256: entry.sha256,
            lfCanonicalSha256: canonicalSha256, canonicalMatch: true,
            rawBytesCheckedAgainstActualCompiledPdbSeparately: true
        };
    });
    save('SOURCE-TEXT-AND-RAW-IDENTITIES.json', sourceChecks);
    const images = Object.fromEntries(roles.map(role => [role, image(role)]));
    const names = new Set([...images.Original.keys(), ...images.ObservedDefault.keys()]);
    const differences = [];
    for (const name of [...names].sort()) {
        const first = images.Original.get(name) ?? null;
        const second = images.ObservedDefault.get(name) ?? null;
        if (JSON.stringify(first) !== JSON.stringify(second)) differences.push({ path: name, Original: first, ObservedDefault: second });
    }
    const intendedOwner = ['WebTransportInteractiveSampleApp.dll', 'WebTransportInteractiveSampleApp.pdb'];
    const nonOwner = differences.filter(entry => !intendedOwner.includes(entry.path));
    assert(nonOwner.length > 0);
    const common = Object.fromEntries(['InMemory.FunctionalTests.dll', 'InMemory.FunctionalTests.pdb', 'InMemory.FunctionalTests.deps.json', 'InMemory.FunctionalTests.runtimeconfig.json']
        .map(name => [name, {
            Original: images.Original.get(name).sha256, ObservedDefault: images.ObservedDefault.get(name).sha256,
            identical: images.Original.get(name).sha256 === images.ObservedDefault.get(name).sha256
        }]));
    save('COMPLETE-IMAGE-AUDIT.json', {
        candidatePair: false, performanceComparisonAuthorized: false, commonHarnessCompiledOnce: false,
        commonFilesNeverExcludedByPrefix: common, everyOutputFileHashed: true,
        fileCounts: Object.fromEntries(roles.map(role => [role, images[role].size])),
        fullImageDifferenceCount: differences.length, nonSampleOwnerDifferenceCount: nonOwner.length,
        illustrativeFutureOwnerNamesOnly: intendedOwner, futurePolicyOrGatesAdopted: false,
        compiledSampleOwnerPresent: false, eligibleForPerformanceComparison: false,
        reason: 'Independent characterization builds; no common-once harness or compiled sample owner; non-owner image differences and an explicit analyzer-profile difference.',
        differences
    });
    const tests = read(path.join(root, 'TRX-ROW-CHECKS.json'));
    assert.equal(tests.length, 2);
    for (const test of tests) {
        assert.equal(test.rows.length, 3);
        assert(test.rows.every(row => row.outcome === 'Passed'));
        assert.equal(sha(test.trx), test.trxSha256.toLowerCase());
    }
    const pdb = read(path.join(root, 'PDB-SOURCE-OWNER-CHECKS.json'));
    assert.equal(pdb.length, 2);
    for (const entry of pdb) {
        assert.equal(entry.managedProducerSourceDocumentChecks.length, 4);
        assert.equal(entry.extractedBodyAndTestDocumentChecks.length, 2);
        for (const check of [...entry.managedProducerSourceDocumentChecks, ...entry.extractedBodyAndTestDocumentChecks]) {
            assert(check.match);
            assert.equal(sha(check.source), check.sha256.toLowerCase());
        }
    }
    const receipts = fs.readdirSync(path.join(root, 'logs')).filter(name => name.endsWith('.receipt.json')).sort()
        .map(name => read(path.join(root, 'logs', name)));
    assert(receipts.every(receipt => receipt.ownedPidObservations.every(pid => !pid.stillRunning)));
    const pids = [...new Set(receipts.flatMap(receipt => receipt.ownedPidObservations.map(pid => pid.pid)))].sort((a, b) => a - b);
    const count = receipts.reduce((sum, receipt) => sum + receipt.ownedPidObservations.length, 0);
    save('EXACT-COMMANDS-AND-EXIT-CODES.json', {
        recordedCommandCount: receipts.length, ownedPidObservationCount: count, distinctObservedOwnedPids: pids,
        allObservedOwnedPidsTerminalAtCommandCompletion: true, notAnExhaustiveInstantaneousChildInventory: true, commands: receipts
    });
    save('UNCHANGED-006-CHECK.json', oldStatus);
    save('SOURCE-ARCHIVE-AND-INPUT-CHECKS.json', {
        roles: archives, historicalSourceObservationInputsLfCanonicallyVerified: historical.inputs.length,
        rawIdentityNotConflatedWithLfCanonicalIdentity: true, candidateApplied: false
    });
    save('EXECUTABLE-RESULTS.json', {
        finding: 'F146', continuation: '007', artifactOnly: true, untimedUntuned: true,
        nativeWorkHoldActive: false, oldCapsuleImmutable: oldStatus,
        liveDefaultObservedSeparately: fs.readFileSync(path.join(root, 'live-default.txt'), 'utf8').trim(),
        liveSampleBlobObservedSeparately: fs.readFileSync(path.join(root, 'live-default-program-blob.txt'), 'utf8').trim(),
        pins: Object.fromEntries(archives.map(entry => [entry.role, entry.sourcePin])),
        sdk: '12.0.100-alpha.1.26557.102', actualCoreRuntimeVersionAssertedInsideAllSixRows: '12.0.0-alpha.1.26557.102',
        declared268PresentInOwnSdkRoot: fs.existsSync('C:\\src\\aspnetcore\\.dotnet\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26568.110'),
        privateF145Runtime268Used: false, tests,
        managedProducerAndReceivedBehaviorVerified: true, sourceExtractedHandlerNotCompiledSampleOwner: true,
        wholeRepositoryMaterializationIdentityPassed: archives.every(entry => entry.everyRegularArchivedFileUnchangedAfterBuildAndTests),
        archiveMismatches: Object.fromEntries(archives.map(entry => [entry.role, entry.archiveMismatches])),
        defaultDiagnosticAnalyzersDisabledAfterRecordedAD0001: true, fullCiValidationClaimed: false,
        nativeQuicTlsBrowserFullSampleVerified: false, poolingCandidateAppliedOrExecuted: false,
        poolingUsefulOptimizationEstablished: false, performanceOrCampaignVerdict: null,
        recommendation: 'Retain informational finding; managed producer reachability is proven at the simulated multiplexed transport boundary, not a reason to adopt pooling.'
    });
    console.log(JSON.stringify({
        producerRowsPassed: 6, sourceRegularFileCounts: Object.fromEntries(archives.map(entry => [entry.role, entry.regularArchivedSourceFilesVerified])),
        outputImageFileCounts: Object.fromEntries(roles.map(role => [role, images[role].size])),
        nonOwnerImageDifferences: nonOwner.length, recordedCommands: receipts.length, ownedPidObservations: count,
        allOwnedPidObservationsTerminal: true
    }, null, 2));
}

function seal() {
    assert(!frozen(), 'Frozen.');
    assert(read(path.join(root, 'EXECUTABLE-RESULTS.json')).managedProducerAndReceivedBehaviorVerified);
    assert(read(path.join(root, 'FINAL-OWNED-PID-CHECK.json')).allObservedOwnedPidsTerminal);
    assert(fs.existsSync(path.join(root, 'HANDOFF.md')));
    save('ARTIFACT-FREEZE.json', {
        wallClock: new Date().toISOString(), artifactIntegrityOnly: true, performancePairOrCampaignAcceptanceSeal: false,
        doNotRebuildOrModifyFrozenGraphs: true, noCandidateExecuted: true
    });
    const entries = [...files()].map(({ path: relative, length, full }) => ({ path: relative, length, sha256: sha(full) }));
    save('MANIFEST.json', {
        schemaVersion: 1, finding: 'F146', continuation: 'executable-007', artifactIntegrityOnly: true,
        payloadFileCount: entries.length, excludedManifestSelfFiles: [...self], excludedUnsealedBuildGraphDirectory: 'graphs',
        frozenExecutedImageCopies: roles.map(role => `verified-images\\${role}`),
        note: 'Every portable payload file is hashed, including exact source archives, scoped source evidence, all executed test-image copies and metadata. Retained build graphs and their toolchain junctions are explicitly excluded; whole-tree identity is not claimed. Not a performance or campaign seal.',
        files: entries
    });
    const checksum = sha(path.join(root, 'MANIFEST.json'));
    fs.writeFileSync(path.join(root, 'MANIFEST.sha256'), checksum + '  MANIFEST.json\n');
    console.log(JSON.stringify({ payloadFileCount: entries.length, manifestSha256: checksum }, null, 2));
}

function verifyOnly() {
    const manifest = read(path.join(root, 'MANIFEST.json'));
    const checksum = sha(path.join(root, 'MANIFEST.json'));
    assert.equal(fs.readFileSync(path.join(root, 'MANIFEST.sha256'), 'utf8').split(/\s+/)[0], checksum);
    const actual = new Map([...files()].map(entry => [entry.path, entry]));
    assert.equal(actual.size, manifest.files.length);
    for (const entry of manifest.files) {
        const file = actual.get(entry.path);
        assert(file, entry.path);
        assert.equal(file.length, entry.length, entry.path);
        assert.equal(sha(file.full), entry.sha256, entry.path);
    }
    oldCheck();
    console.log(JSON.stringify({
        verifyOnly: true, writes: false, dotnetStarts: 0, performanceRuns: 0,
        payloadFileCount: manifest.payloadFileCount, original006PayloadFilesUnchanged: 100,
        allHashesMatch: true, manifestSha256: checksum
    }, null, 2));
}

const operation = process.argv[2];
assert(['collect', 'seal', 'verify-only'].includes(operation), 'Use collect, seal or verify-only.');
({ collect, seal, 'verify-only': verifyOnly })[operation]();
