import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, capture, json } from './source-io-v001.mjs';

const roles = read(path.join(root, 'roles.json')).roles;
const files = [
    'src/Validation/gen/Extensions/ISymbolExtensions.cs',
    'src/Validation/gen/Extensions/ITypeSymbolExtensions.cs',
    'src/Validation/gen/Extensions/IncrementalValuesProviderExtensions.cs',
    'src/Validation/gen/Emitters/ValidationsGenerator.Emitter.cs'
];
const selection = [];
for (const [role, commit] of Object.entries(roles))
{
    const inventory = read(path.join(root, 'tree-' + role + '.json'));
    for (const file of files)
    {
        const found = inventory.filter(x => x.path === file);
        assert.equal(found.length, 1, role + ':' + file);
        assert.equal(found[0].type, 'blob');
        selection.push({ ...found[0], role, commit });
    }
}
json('selection-before-body-v003.json', { files, newWholeInputsPerRole: 4, cumulativeWholeInputsPerRole: 18, selection });
const captures = capture('final-helper-whole-inputs', selection);
json('whole-inputs-v003.json', { captures, cumulativeWholeRepositoryBodiesPerRole: 18,
    sourceBodyBudgetClosed: true, furtherLogicalSourceBodiesAuthorized: false });
console.log(JSON.stringify({ newWholeBodiesPerRole: 4, cumulativeWholeBodiesPerRole: 18,
    repositoryBodyBudgetClosed: true, productNativeTestsCandidatesMeasurements: 0 }));
