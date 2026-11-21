import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, command, git, tree, capture, json } from './source-io-v001.mjs';
import { sha256 } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const before = {
    branch: git('reserved-branch-before', ['symbolic-ref', '--short', 'HEAD']).toString('utf8').trim(),
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8').trim(),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(String.raw`C:\src\aspnetcore\global.json`))
};
assert.equal(before.branch, 'autoperf/F145-hoist-large-response-utf8-encoding');
assert.equal(before.head, '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
json('reserved-before.json', before);
const repository = JSON.parse(command('upstream-repository', 'gh', ['api', 'repos/dotnet/aspnetcore']).toString('utf8'));
assert.equal(repository.full_name, 'dotnet/aspnetcore');
const reference = JSON.parse(command('upstream-default-ref', 'gh',
    ['api', 'repos/dotnet/aspnetcore/git/ref/heads/' + repository.default_branch]).toString('utf8'));
assert.equal(reference.object.type, 'commit');
const roles = { Original: original, Default: reference.object.sha };
json('roles.json', { roles, observedDefaultBranch: repository.default_branch, observedUtc: new Date().toISOString(),
    reservedCheckoutNotUsedAsDefault: true });
const inventories = {};
for (const [role, commit] of Object.entries(roles))
{
    inventories[role] = tree(git('validation-tree-' + role, ['ls-tree', '-r', '-z', commit, '--',
        'src/Validation', '.github/instructions/cross-cutting-guidance.instructions.md']));
    json('tree-' + role + '.json', inventories[role]);
}
const paths = [
    '.github/instructions/cross-cutting-guidance.instructions.md',
    'src/Validation/gen/Parsers/ValidationsGenerator.TypesParser.cs'
];
const generator = inventories.Original.filter(x => x.path.startsWith('src/Validation/gen/') && /\/ValidationsGenerator\.cs$/.test(x.path));
const project = inventories.Original.filter(x => x.path.startsWith('src/Validation/gen/') && x.path.endsWith('.csproj'));
assert.equal(generator.length, 1);
assert.equal(project.length, 1);
paths.push(generator[0].path, project[0].path);
for (const optional of ['src/Validation/AGENTS.md', 'src/Validation/README.md'])
    if (inventories.Original.some(x => x.path === optional)) paths.push(optional);
const selection = [];
for (const [role, commit] of Object.entries(roles))
    for (const file of paths)
    {
        const found = inventories[role].filter(x => x.path === file);
        assert.equal(found.length, 1, role + ':' + file);
        assert.equal(found[0].type, 'blob');
        selection.push({ ...found[0], role, commit });
    }
assert.ok(paths.length <= 6);
json('selection-before-body-v001.json', { paths, repositoryWholeInputsPerRole: paths.length, selection });
const captures = capture('initial-whole-inputs', selection);
json('whole-inputs-v001.json', { captures, repositoryWholeInputsPerRole: paths.length,
    noRuntimeOrGeneratedExecution: true, exactCardTextNotClaimed: true });
console.log(JSON.stringify({ roles, wholeBodiesPerRole: paths.length, capturedBodies: captures.length,
    sourceRoots: fs.readdirSync(path.join(root, 'commands')).filter(x => x.endsWith('.receipt.json')).length,
    validationProject: project[0].path, generator: generator[0].path }));
