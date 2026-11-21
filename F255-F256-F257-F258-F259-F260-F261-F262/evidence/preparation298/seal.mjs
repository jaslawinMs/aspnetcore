import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const directory = import.meta.dirname;
const parallel = path.dirname(directory);
const owner = '7ebf00d6-76eb-41b9-8a9b-b6549a772002';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

try {
    const rawGuardInputs = {
        policy: fs.readFileSync(path.join(parallel, 'policy.json')),
        acceptance: fs.readFileSync(path.join(directory, 'PARENT-ACCEPTANCE.json')),
        registration: fs.readFileSync(path.join(parallel, 'owner-registrations-298-299.json')),
        campaign: fs.readFileSync(path.join(path.dirname(parallel), 'autoperf-campaign.json'))
    };
    const policy = JSON.parse(rawGuardInputs.policy);
    const acceptance = JSON.parse(rawGuardInputs.acceptance);
    const registration = JSON.parse(rawGuardInputs.registration).entries.find(x => x.key === 'F257');
    assert.equal(acceptance.actualOwner, owner);
    assert.equal(acceptance.phase, 298);
    assert.deepEqual(acceptance.findings, ['F257']);
    assert.equal(policy.independentFindingPreparationWorkers.F257, owner);
    assert.equal(policy.activeWorkerPreparationScopes.F257, acceptance.scope);
    assert.equal(registration.actualOwner, owner);
    assert.equal(registration.scope, acceptance.scope);
    assert.match(acceptance.scope, /^298 SOURCE ONLY after separateGO298 /);
    assert.equal(Object.keys(policy.independentFindingPreparationWorkers).length <= 4, true);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    assert.equal(JSON.parse(rawGuardInputs.campaign).candidates.find(x => x.id === 'F257').status, 'pending');
    const guardReferences = [];
    for (const [kind, bytes] of Object.entries(rawGuardInputs)) {
        const digest = sha256(bytes);
        const file = path.join(directory, 'guards', `${kind}-${digest}.json`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, { flag: 'wx' });
        guardReferences.push({ kind, file: path.relative(directory, file), bytes: bytes.length, sha256: digest });
    }
    write(path.join(directory, 'seal-guard.json'), {
        utc: new Date().toISOString(), owner, exactScope: true, noGlobalLease: true,
        leasePath: path.join(parallel, 'benchmark-exclusive.lease.json'),
        noHold: true, nonquiesced: true, findingStatus: 'pending', guardReferences
    });

    const state = read(path.join(directory, 'STATE.json'));
    const decision = read(path.join(directory, 'F257-source-decision.json'));
    assert.equal(state.owner, owner);
    assert.equal(state.original, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
    assert.equal(state.default, 'd3483989953ae3cccd773aea5ea04cb0c7198531');
    assert.equal(state.roots.length, 12);
    assert.equal(state.roots.length <= 32, true);
    assert.equal(decision.budgets.directGitGhRootsIncludingFailures, state.roots.length);
    const bodyAudit = [];
    for (const role of ['Original', 'Default']) {
        assert.equal(state.bodies[role].length, 15);
        assert.equal(new Set(state.bodies[role].map(x => x.path)).size, 15);
        const metadata = read(path.join(directory, 'metadata', role + '-tree.json'));
        for (const body of state.bodies[role]) {
            const bytes = fs.readFileSync(path.join(directory, body.file));
            const entry = metadata.find(x => x.path === body.path);
            assert.notEqual(entry, undefined);
            assert.equal(body.commit, role === 'Original' ? state.original : state.default);
            assert.equal(body.commitPath, `${body.commit}:${body.path}`);
            assert.equal(bytes.length, body.bytes);
            assert.equal(sha256(bytes), body.sha256);
            assert.equal(entry.mode, body.mode);
            assert.equal(entry.oid, body.blob);
            assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'), body.blob);
            const root = state.roots.find(x => x.index === body.root);
            const raw = fs.readFileSync(path.join(directory, root.directory, 'stdout.bin'));
            const framing = body.framing;
            assert.equal(raw.subarray(framing.bodyOffset, framing.bodyOffset + framing.bodyBytes).equals(bytes), true);
            assert.equal(raw[framing.terminatorOffset], 10);
            assert.equal(raw.subarray(framing.stdoutOffset, framing.bodyOffset).toString('ascii'), `${body.blob} blob ${body.bytes}\n`);
            bodyAudit.push({ role, path: body.path, blob: body.blob, bytes: body.bytes, sha256: body.sha256, root: body.root, metadataAndRawFramingVerified: true });
        }
    }
    const rootAudit = [];
    for (const root of state.roots) {
        assert.equal(root.terminal, true);
        assert.equal(root.exitCode, 0);
        assert.equal(root.exceededObservationDeadline, false);
        assert.notEqual(root.rootPid, null);
        assert.equal(root.streamsClosed.stdout, true);
        assert.equal(root.streamsClosed.stderr, true);
        const stored = read(path.join(directory, root.directory, 'root.json'));
        assert.deepEqual(stored, root);
        for (const stream of ['stdin', 'stdout', 'stderr']) {
            const bytes = fs.readFileSync(path.join(directory, root.directory, stream + '.bin'));
            assert.equal(bytes.length, root[stream].bytes);
            assert.equal(sha256(bytes), root[stream].sha256);
        }
        const members = [...state.bodies.Original, ...state.bodies.Default]
            .filter(x => x.root === root.index).sort((a, b) => a.framing.stdoutOffset - b.framing.stdoutOffset);
        if (members.length > 0) {
            const input = fs.readFileSync(path.join(directory, root.directory, 'stdin.bin'));
            assert.equal(input.equals(Buffer.from(members.map(x => x.commitPath).join('\n') + '\n')), true);
            let offset = 0;
            for (const member of members) {
                assert.equal(member.framing.stdoutOffset, offset);
                offset = member.framing.terminatorOffset + 1;
            }
            assert.equal(offset, root.stdout.bytes);
        }
        rootAudit.push({ index: root.index, label: root.label, directPid: root.rootPid, exitCode: root.exitCode, closeObservedUtc: root.closeObservedUtc, streamsAndBoundedObservationVerified: true });
    }
    const comparison = read(path.join(directory, 'selected-source-comparison.json'));
    assert.equal(comparison.pairs.length, 15);
    assert.equal(comparison.pairs.filter(x => x.sameBytes).length, 14);
    write(path.join(directory, 'custody-audit.json'), {
        phase: 298, owner, checkedUtc: new Date().toISOString(), validationKind: 'source-data-custody-only',
        rootAudit, bodyAudit, repositoryBodiesPerRole: { Original: 15, Default: 15 },
        commonContextsChargedPerRole: 2, inclusiveInputsPerRole: 17,
        sourceOrRuntimeCorrectnessTest: false, initialOperationalTranscriptBoundary: decision.explicitGaps.at(-1),
        prospectiveSealerSelfExit: null, actualEnclosingToolExit: null
    });

    const inventoryFile = path.join(directory, 'inventory.json');
    const receiptFile = path.join(directory, 'seal-receipt.json');
    assert.equal(fs.existsSync(inventoryFile), false);
    assert.equal(fs.existsSync(receiptFile), false);
    function files(at, found = []) {
        for (const name of fs.readdirSync(at)) {
            const full = path.join(at, name);
            const stat = fs.lstatSync(full);
            assert.equal(stat.isSymbolicLink(), false, 'Do not traverse out-of-scope links');
            if (stat.isDirectory()) files(full, found);
            else {
                assert.equal(stat.isFile(), true);
                found.push(path.relative(directory, full));
            }
        }
        return found;
    }
    const payloadNames = files(directory).sort();
    const payload = payloadNames.map(file => {
        const bytes = fs.readFileSync(path.join(directory, file));
        return { file, bytes: bytes.length, sha256: sha256(bytes) };
    });
    const actualInventoryNames = [...payloadNames, 'inventory.json', 'seal-receipt.json'].sort();
    write(inventoryFile, {
        schemaVersion: 1, phase: 298, owner, payload,
        completeFileNames: actualInventoryNames,
        integrityBoundary: 'All payload files have exact byte counts and SHA256. This index is hashed by seal-receipt.json. The index and its own receipt are named in the complete inventory, but not recursively self-hashed. Parent must independently hash the final receipt and record actual enclosing-tool completion.',
        excludedFromPayloadHashingOnly: ['inventory.json', 'seal-receipt.json']
    });
    const inventoryBytes = fs.readFileSync(inventoryFile);
    const receipt = {
        schemaVersion: 1, phase: 298, owner, outcome: decision.outcome,
        inventory: { file: 'inventory.json', bytes: inventoryBytes.length, sha256: sha256(inventoryBytes) },
        payloadFiles: payload.length, completeInventoryFiles: actualInventoryNames.length,
        completeFileNameSetSha256: sha256(Buffer.from(actualInventoryNames.join('\n') + '\n')),
        directGitGhRoots: state.roots.length, wholeRepositoryBodiesPerRole: { Original: 15, Default: 15 },
        commonContextsChargedPerRole: 2, inclusiveInputsPerRole: 17,
        allDirectRootsObservedTerminalWithStreams: true,
        descendantsUniversallyProvenAbsent: false, machineIdleClaimed: false,
        actualCompleteInventoryVerified: false,
        prospectiveSealerSelfExit: null, actualEnclosingToolExit: null,
        parentQualificationRequired: true, canonicalFindingStatusChanged: false
    };
    write(receiptFile, receipt);
    assert.deepEqual(files(directory).sort(), actualInventoryNames);
    for (const entry of payload) {
        const bytes = fs.readFileSync(path.join(directory, entry.file));
        assert.equal(bytes.length, entry.bytes);
        assert.equal(sha256(bytes), entry.sha256);
    }
    receipt.actualCompleteInventoryVerified = true;
    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
    assert.deepEqual(files(directory).sort(), actualInventoryNames);
    assert.equal(sha256(fs.readFileSync(inventoryFile)), receipt.inventory.sha256);
    console.log(JSON.stringify({ phase: 298, outcome: receipt.outcome, payloadFiles: receipt.payloadFiles, completeInventoryFiles: receipt.completeInventoryFiles, inventorySha256: receipt.inventory.sha256, prospectiveSealerSelfExit: null, actualEnclosingToolExit: null }));
} catch (error) {
    fs.appendFileSync(path.join(directory, 'seal-helper-failures.jsonl'), JSON.stringify({
        utc: new Date().toISOString(), name: error.name, message: error.message, stack: error.stack,
        prospectiveSealerSelfExit: null, actualEnclosingToolExit: null
    }) + '\n');
    console.error(error.stack);
    process.exitCode = 1;
}
