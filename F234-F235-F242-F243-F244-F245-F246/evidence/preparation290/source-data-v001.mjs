import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const scope = import.meta.dirname;
export const parallel = path.dirname(scope);
export const inherited = path.join(parallel, 'finding-F243-F246-283');
export const repository = 'C:\\src\\aspnetcore';
export const ownId = '7edc5806-0226-40d8-81f6-5c50d73959bc';
export const pins = {
    Original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    Default: 'd3483989953ae3cccd773aea5ea04cb0c7198531'
};
export const expectedScope = '290 SOURCE ONLY after separateGO290 and fresh actual-own-ID/exact290scope/no-lease/no-HOLD/nonquiesced/allF243F244F245F246pending guards. 283actualseal005exit0consumed and184indexed186completebytes/exactinventoryaccepted289ONLY; injectedgenericinstructioncaveat preserved, no retroactive scope-compliance/raw-tree/runtime/materiality approval. Same actual F243owner also coversF244F245F246. New finding-F243-F246-290 only. Explicit cumulative ceiling19repositorywholebodiesplus1injectedcommoninstructioncontext=20chargedlogicalinputs/role; old28315repository+1instruction accounting remains disclosed. At most4NEW whole repository bodies/role for actual AddOpenApi service registration, OpenApiOptions transformer storage, RequestDelegateFactory low-level parameter/AsParameters metadata producer, ResultsOfT.Generated typed-result metadata producer. At most3NEW directGit-ghroots (cumulative17): metadata-only path/membership confirmation BEFORE firstbodybatch may select correct unique filename counterpart to four proposed classes; no guessed replacement after missingbody, no freshhead, reuse Original37e809/observed283Defaultd348. No recursive broadening beyond four bodies if theydelegate; stop explicitremaininggaps. Preserve283helpers/seal/history-miss/failures/inputbytes/instructioncaveat unchanged. Four separate decisions, no snapshot/file/card-onlyduplicates or conflationF201F202F203; no fabricatedlargeproducer/frequency. Boundeddatahelpers/rawframing/fullstreams/observed-child limitations/staticsealing only. No SDKactivation/dotnet/product-native/build/test/generatedexecution/host/server/browser/candidate/source/test/manifest/cache edits/timing/warmup/allocation/profiler/install/restore/config/shared/policy/ledger/publication/remote/subagent authority.';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
export function writeNew(name, bytes) {
    const destination = path.join(scope, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
}
export function jsonNew(name, value) {
    writeNew(name, JSON.stringify(value, null, 2) + '\n');
}
export function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function guard(label) {
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json'));
    const campaignBytes = fs.readFileSync(path.join(path.dirname(parallel), 'autoperf-campaign.json'));
    const registrationBytes = fs.readFileSync(path.join(parallel, 'OpenApi-accepted-and-advanced-289.json'));
    const policy = JSON.parse(policyBytes.toString('utf8'));
    const campaign = JSON.parse(campaignBytes.toString('utf8'));
    const registration = JSON.parse(registrationBytes.toString('utf8'));
    writeNew(`guards\\${label}.policy.raw.json`, policyBytes);
    const result = {
        observedUtc: new Date().toISOString(),
        actualAgentId: ownId,
        scope,
        policySha256: sha256(policyBytes),
        registrationPolicyPointSha256: registration.policyAfterSha256,
        campaignSha256: sha256(campaignBytes),
        registrationSha256: sha256(registrationBytes),
        actualOwners: policy.independentFindingPreparationWorkers,
        ownRegisteredId: policy.independentFindingPreparationWorkers.F243,
        exactRegisteredScope: policy.activeWorkerPreparationScopes.F243,
        leaseAbsent: !fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')),
        HOLD: policy.actualWorkerBuildHoldActive,
        quiesced: policy.buildAndTestWorkQuiesced,
        pending: ['F243', 'F244', 'F245', 'F246'].map(id => ({
            id,
            matches: campaign.candidates.filter(candidate => candidate.id === id).map(candidate => candidate.status)
        })),
        pointOnlyNoFutureAuthorization: true
    };
    jsonNew(`guards\\${label}.observation.json`, result);
    assert.equal(registration.actualOwner, ownId);
    assert.equal(registration.policyAfterSha256, '23A1A9A83DD90EB321F1C610CC62D22420A97DE6DBABE5CD6C37EFB3EFBA89B6');
    assert.equal(registration.byteAndExactInventoryOnly, true);
    assert.equal(registration.preservedSealerProspectiveSelfExit, null);
    assert.equal(registration.retroactiveOldScopeComplianceClaimed, false);
    assert.equal(registration.fresh290ExplicitCumulativeRepositoryCap, 19);
    assert.equal(registration.fresh290InclusiveCommonContextCap, 20);
    assert.equal(registration.maxAdditionalRepositoryBodiesPerRole, 4);
    assert.equal(registration.maxAdditionalRoots, 3);
    assert.equal(registration.maximumCumulativeRoots, 17);
    assert.equal(result.ownRegisteredId, ownId);
    assert.equal(result.exactRegisteredScope, expectedScope);
    assert.equal(policy.maximumRegisteredPreparationOwners, 4);
    assert.ok(Object.keys(result.actualOwners).length <= 4);
    assert.equal(result.leaseAbsent, true);
    assert.equal(result.HOLD, false);
    assert.equal(result.quiesced, false);
    for (const candidate of result.pending) assert.deepEqual(candidate.matches, ['pending']);
    return { result, policyBytes, campaignBytes, registrationBytes };
}
export function root(label, args, stdin = Buffer.alloc(0)) {
    const previous = fs.readdirSync(scope).filter(name => /^root-\d{3}\.request\.json$/.test(name));
    assert.ok(previous.length < 3, 'New direct-root budget exhausted; no retries or recursive broadening');
    const number = 15 + previous.length;
    const stem = `root-${String(number).padStart(3, '0')}`;
    guard(stem);
    const request = {
        number, label, executable: 'git', args, cwd: repository,
        stdinBytes: stdin.length, stdinSha256: sha256(stdin),
        timeoutMilliseconds: 240000,
        maximumBufferedBytesPerStream: 134217728,
        createdUtc: new Date().toISOString(),
        aggregatePriorDirectRoots: 14
    };
    jsonNew(`${stem}.request.json`, request);
    writeNew(`${stem}.stdin.raw`, stdin);
    const child = spawnSync('git', args, {
        cwd: repository, input: stdin, encoding: null, windowsHide: true,
        timeout: request.timeoutMilliseconds, maxBuffer: request.maximumBufferedBytesPerStream,
        env: { ...process.env, GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0' }
    });
    const stdout = child.stdout ?? Buffer.alloc(0);
    const stderr = child.stderr ?? Buffer.alloc(0);
    writeNew(`${stem}.stdout.raw`, stdout);
    writeNew(`${stem}.stderr.raw`, stderr);
    const receipt = {
        ...request, observedTerminalUtc: new Date().toISOString(),
        actualPid: child.pid ?? null,
        exitCode: child.status, signal: child.signal,
        error: child.error ? { message: child.error.message, code: child.error.code } : null,
        stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        rootAndReturnedStreamsCompleted: child.status !== null && !child.error,
        limitations: ['Synchronous direct Git root and full returned streams only. No unseen/deeper-descendant or machine-idleness claim.']
    };
    jsonNew(`${stem}.receipt.json`, receipt);
    console.log(JSON.stringify({ root: number, label, pid: receipt.actualPid, exitCode: child.status, stdoutBytes: stdout.length, stderrBytes: stderr.length }));
    assert.ifError(child.error);
    assert.equal(child.status, 0, `${stem}: ${stderr.toString('utf8')}`);
    return { stem, stdout, stderr, receipt };
}
export function parseTree(buffer) {
    return buffer.toString('utf8').split('\0').filter(Boolean).map(entry => {
        const found = /^([0-7]{6}) (blob|tree|commit) ([0-9a-f]{40})\t(.+)$/.exec(entry);
        assert.ok(found, `Invalid metadata tree member: ${entry}`);
        return { mode: found[1], type: found[2], oid: found[3], path: found[4] };
    });
}
export function allFiles(directory) {
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        assert.equal(entry.isSymbolicLink(), false, `Unexpected symbolic link: ${full}`);
        if (entry.isDirectory()) result.push(...allFiles(full));
        else if (entry.isFile()) result.push(full);
        else assert.fail(`Unexpected filesystem member: ${full}`);
    }
    return result;
}
export function verifyInheritedBytes() {
    const indexBytes = fs.readFileSync(path.join(inherited, 'artifact-index-v001.json'));
    assert.equal(sha256(indexBytes), '4D2CFEC00AA7A23AC2B6AA6E219033E7585E6655FBB12672F85CC397CB0B6D61');
    const index = JSON.parse(indexBytes.toString('utf8'));
    const seal = readJson(path.join(inherited, 'artifact-seal-v001.json'));
    assert.equal(index.files.length, 184);
    assert.equal(seal.indexSha256, sha256(indexBytes));
    assert.equal(seal.finalOuterToolExitCode, null);
    const expected = new Set([...index.files.map(item => item.path), 'artifact-index-v001.json', 'artifact-seal-v001.json']);
    const files = allFiles(inherited);
    assert.equal(files.length, 186);
    for (const file of files) assert.ok(expected.has(path.relative(inherited, file)), `Unexpected inherited member ${file}`);
    const verified = index.files.map(item => {
        const bytes = fs.readFileSync(path.join(inherited, item.path));
        assert.equal(bytes.length, item.bytes);
        assert.equal(sha256(bytes), item.sha256);
        return { ...item, inheritedFile: path.join(inherited, item.path) };
    });
    for (const file of ['artifact-index-v001.json', 'artifact-seal-v001.json']) {
        const bytes = fs.readFileSync(path.join(inherited, file));
        verified.push({ path: file, bytes: bytes.length, sha256: sha256(bytes), inheritedFile: path.join(inherited, file) });
    }
    const oldPins = readJson(path.join(inherited, 'source-pins-v001.json'));
    assert.equal(oldPins.Original, pins.Original);
    assert.equal(oldPins.Default, pins.Default);
    return {
        observedUtc: new Date().toISOString(), inheritedScope: inherited,
        indexedFilesRehashed: 184, exactCompleteFilesRehashed: 186,
        byteChainOnlyNotRetroactiveScopeRawTreeRuntimeOrMaterialityApproval: true,
        oldRepositoryInputsPerRole: 15, oldInjectedInstructionContextsPerRole: 1,
        oldChargedTotalPerRole: 16,
        preservedProspectiveSelfExit: seal.finalOuterToolExitCode,
        verified
    };
}
