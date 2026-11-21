import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, file = path.join(root, 'policy.json'), before = fs.readFileSync(file), policy = JSON.parse(before);
assert.equal(sha256(before), '8FE2B77BD421985808473362A18015EED515A82EDA033CC142C8E71F8A0DC7EE');
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F255']);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(root, 'benchmark-exclusive.lease.json')), false);
const campaign = JSON.parse(fs.readFileSync(path.join(path.dirname(root), 'autoperf-campaign.json'), 'utf8'));
for (const id of ['F257', 'F258', 'F259']) assert.equal(campaign.candidates.find(x => x.id === id).status, 'pending');
const entries = [
    { key: 'F257', actualOwner: '7ebf00d6-76eb-41b9-8a9b-b6549a772002', phase: 298, findings: ['F257'],
        folder: 'finding-F257-298',
        objective: 'TransportManager StopEndpointsAsync actual endpoint-stop/config-reload/shutdown/transport/list producers, source cardinality/frequency/equality/order/duplicates/mutation/cancellation/exception/concurrency/lifetime/currentDefault/history/materiality; no assumedsmallness, fakeexpandedendpoint/repeatedshutdownworkload or coldpath-only rejection.' },
    { key: 'F258', actualOwner: 'a4e76420-cb81-4c3e-9008-491e049270d2', phase: 299, findings: ['F258', 'F259'],
        folder: 'finding-F258-F259-299',
        objective: 'KnownHeaders static/header-table F258 and API loop generation F259 two distinct decisions; actual project Compile links/generator entry/build invocation/output ownership/table-loop-header producers/counts/lifetime/frequency/equality/order/duplicates/mutation/enumeration/exception/currentDefault/history/materiality. No shared/generated filename-only lifecycle/alias conclusions, fakepadded/repeatedgenerator work or buildtime-only rejection.' }
];
for (const entry of entries)
{
    assert.equal(policy.independentFindingPreparationWorkers[entry.key], undefined);
    const scope = `${entry.phase} SOURCE ONLY after separateGO${entry.phase} and fresh own-actual-ID/exactscope/no-lease/no-HOLD/nonquiesced/pendingfinding guards. New ${entry.folder} only. ${entry.objective} ` +
        'Initial15whole repository source/doc/test/project/guidance inputs PLUS atmost2injected/commoncontexts=17inclusive logicalinputs per pinned Original/observedDefault role;32directGit-ghroots includingfailures. Metadata confirms correctunique path/class beforebodybatch; nomissingmember replacement/retry or recursivebroadening. Original37e809/onefreshobservedupstreamDefault immutablecaptures; reservedR notDefault/executiontree. Preserve exactbinarywholecaptures/commit:path/modes/blob/bytes/SHA256/framing/fullstreams/stdin/allfailures/helpers; boundedroot/observedchild evidence withlimits, nou niversal census/idlenessclaim/arbitrarystops. Sealactualcompleteinventory/payloadhashes; prospectiveselfexitnull, actualfinalouterreceipt onlyafterreturn. Parentaccepts/rawqualifies/retires/finalizes. ' +
        'No activation/dotnet/product-native/build/test/generator-execution/host/server/browser/candidate/source/test/manifest/cache edits/install/restore/config/shared/policy/lease/ledger/publication/remote writes/subagent/timing/warmup/allocation/profiler/counters authority. Readonlyghmetadata/historyallowed; noscan/cardspackage/prepare/finalize invocation or unreadcardtextclaim.';
    policy.independentFindingPreparationWorkers[entry.key] = entry.actualOwner;
    policy.activeWorkerPreparationScopes[entry.key] = scope;
    entry.scope = scope;
    const output = path.join(root, entry.folder);
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'PARENT-ACCEPTANCE.json'), JSON.stringify({
        phase: entry.phase, findings: entry.findings, actualOwner: entry.actualOwner,
        scope, status: 'REGISTERED_SOURCE_ONLY_AWAIT_SEPARATE_GO',
        criteria: ['Real bounded producers/contracts/history/default, no fabricated workload or lifecycle-only dismissal.',
            'At most15 repository bodies plus2 common contexts per role;32 roots including failures; stop honest gaps.',
            'Exact byte/source custody, full raw streams and finite terminal observations, sealed complete inventory.',
            'No runtime/materiality/performance or canonical disposition claimed without parent qualification.']
    }, null, 2) + '\n', { flag: 'wx' });
}
assert.equal(Object.keys(policy.independentFindingPreparationWorkers).length, 4);
fs.writeFileSync(path.join(root, 'policy-before-owner-registrations-298-299.json'), before, { flag: 'wx' });
const after = Buffer.from(JSON.stringify(policy, null, 2) + '\n'), temporary = path.join(root, 'policy-registrations298299.tmp');
fs.writeFileSync(temporary, after, { flag: 'wx' });
fs.renameSync(temporary, file);
assert.equal(sha256(fs.readFileSync(file)), sha256(after));
const record = { registeredUtc: new Date().toISOString(), entries, policyBeforeSha256: sha256(before),
    policyAfterSha256: sha256(after), separateGoRequired: true, sourceOrProductRootsByRegistration: 0 };
fs.writeFileSync(path.join(root, 'owner-registrations-298-299.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ registrations: entries.map(({ key, actualOwner, phase }) => ({ key, actualOwner, phase })),
    ownerCount: 4, policySha256: sha256(after), separateGoRequired: true }));
