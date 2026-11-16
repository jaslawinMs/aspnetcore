import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F115');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F115-list-element-boxing';
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const commands = [];
function execute(name, command, args)
{
    const started = new Date().toISOString();
    const result = spawnSync(command, args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    fs.mkdirSync(path.join(run, 'investigation'), { recursive: true });
    fs.writeFileSync(path.join(run, 'investigation', name + '.stdout.log'), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(run, 'investigation', name + '.stderr.log'), stderr, { flag: 'wx' });
    commands.push({ name, command, arguments: args, exitCode: result.status, startedAt: started, completedAt: new Date().toISOString() });
    if (result.status !== 0)
    {
        write('investigation-failed-commands.json', commands);
        throw new Error(`${name}:${stderr.toString()}`);
    }

    return stdout;
}
if (execute('baseline-head', 'git', ['rev-parse', 'HEAD']).toString().trim() !== baseline ||
    execute('independent-branch', 'git', ['branch', '--show-current']).toString().trim() !== branch ||
    execute('tracked-clean', 'git', ['status', '--porcelain', '--untracked-files=no']).length)
{
    throw new Error('Exact independent unchanged F115 baseline required.');
}
const current = execute('fresh-default', 'git', ['rev-parse', 'FETCH_HEAD']).toString().trim();
const sources = [
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Helpers\GenericListOrJsonArrayUtilities.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Internal\IAdapter.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Internal\ObjectVisitor.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Helpers\JsonUtilities.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Adapters\AdapterFactory.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Adapters\ObjectAdapter.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\JsonPatchDocument.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Converters\JsonPatchDocumentConverter.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\src\Microsoft.AspNetCore.JsonPatch.SystemTextJson.csproj`,
    String.raw`src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj`,
    String.raw`src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\test\Internal\ObjectVisitorTest.cs`,
    String.raw`src\Features\JsonPatch.SystemTextJson\test\IntegrationTests\AnonymousObjectIntegrationTest.cs`
];
const identities = [];
for (const relative of sources)
{
    const gitPath = relative.replaceAll('\\', '/');
    const original = execute('baseline-source-' + identities.length, 'git', ['show', `${baseline}:${gitPath}`]);
    const fresh = execute('current-source-' + identities.length, 'git', ['show', `${current}:${gitPath}`]);
    const working = fs.readFileSync(path.join(root, relative));
    const canonical = Buffer.from(working.toString('utf8').replaceAll('\r\n', '\n'));
    if (!original.equals(fresh) || !original.equals(canonical))
    {
        throw new Error('Scoped current/baseline/working source differs:' + relative);
    }
    for (const [label, bytes] of [['baseline-canonical', original], ['current-default-canonical', fresh], ['producer-source', working]])
    {
        const destination = path.join(run, label, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
    }
    identities.push({ path: relative, baselineCanonicalSha256: hash(original), currentCanonicalSha256: hash(fresh), workingRawSha256: hash(working), canonicalEqual: true });
}
execute('helper-history', 'git', ['log', '-n', '8', '--format=%H %ad %s', '--date=iso-strict', current, '--', sources[0]]);
execute('consumer-history', 'git', ['log', '-n', '8', '--format=%H %ad %s', '--date=iso-strict', current, '--', sources[1], sources[4]]);
execute('related-helper-prs', 'gh', ['api', '-X', 'GET', 'search/issues', '-f', 'q=repo:dotnet/aspnetcore is:pr GenericListOrJsonArrayUtilities', '-f', 'per_page=10']);
execute('related-boxing-prs', 'gh', ['api', '-X', 'GET', 'search/issues', '-f', 'q=repo:dotnet/aspnetcore is:pr ListAdapter boxing', '-f', 'per_page=10']);
execute('jsonarray-traversal-fix', 'gh', ['pr', 'view', '65470', '-R', 'dotnet/aspnetcore', '--json', 'number,title,body,mergedAt,mergeCommit,files']);
write('current-source-investigation.json', {
    candidate: 'F115', baseline, freshDefault: current, branch, shippingChanges: false,
    scopedSourceIdentities: identities, exactScopedIdentities: identities.length,
    priorF086CacheChangeInherited: false,
    consumers: ['ListAdapter.TryGet', 'ListAdapter.TryTest', 'ListAdapter.TryTraverse'],
    owningProducer: 'Public JsonPatchDocument.ApplyTo -> ObjectAdapter -> ObjectVisitor/AdapterFactory -> ListAdapter -> actual IList indexer or JsonArray indexer.',
    contract: 'Current internal helper/IAdapter/visitor/deep-equality pipeline is object-valued. A generic read returning object still boxes; an unboxed T-return is not an interchangeable operation.',
    history: 'Helper unchanged since initial b9e9970;consumer JsonArray traversal correction072d32a/#65470 preserved. Searches are bounded,not exhaustive novelty proof.',
    lspBoundary: 'Available LSP reported only the declaration for GetElementAt and no ObjectVisitor workspace symbol;targeted actual source established consumers instead. No resolved complete call graph claimed.',
    earlierReadOnlyAttempt: 'An earlier gh search prs command with embedded quoted repo query exited1 with Invalid search query. Structured gh api searches succeeded;this note records the failed transcript attempt rather than inventing a raw log.',
    commands
});
console.log(`F115:${identities.length} exact fresh-default/baseline/working source identities;all three read consumers and JsonArray history captured;no source changes.`);
