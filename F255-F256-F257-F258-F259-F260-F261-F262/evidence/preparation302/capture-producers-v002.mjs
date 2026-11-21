import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, git, capture, json } from './source-io-v001.mjs';

const roles = read(path.join(root, 'roles.json')).roles;
const inventories = Object.fromEntries(Object.keys(roles).map(role => [role, read(path.join(root, 'tree-' + role + '.json'))]));
const files = [
    'src/Validation/gen/Parsers/ValidationsGenerator.AddValidation.cs',
    'src/Validation/gen/Parsers/ValidationsGenerator.AttributeParser.cs',
    'src/Validation/gen/Parsers/ValidationsGenerator.EndpointsParser.cs',
    'src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/ValidationsGenerator.RecordType.cs',
    'src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/ValidationsGenerator.Recursion.cs',
    'src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/ValidationsGenerator.ComplexType.cs',
    'src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/ValidationsGenerator.ValidatableType.cs',
    'src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/ValidationsGeneratorTestBase.cs',
    'src/Validation/perf/Microbenchmarks/ValidatableTypesBenchmark.cs'
];
const project = inventories.Original.filter(x => x.path.startsWith('src/Validation/test/Microsoft.Extensions.Validation.GeneratorTests/') && x.path.endsWith('.csproj'));
assert.equal(project.length, 1);
files.push(project[0].path);
assert.equal(files.length, 10);
const selection = [];
for (const [role, commit] of Object.entries(roles))
    for (const file of files)
    {
        const found = inventories[role].filter(x => x.path === file);
        assert.equal(found.length, 1, role + ':' + file);
        assert.equal(found[0].type, 'blob');
        selection.push({ ...found[0], role, commit });
    }
json('selection-before-body-v002.json', { files, newWholeInputsPerRole: 10, cumulativeWholeInputsPerRole: 14, selection });
const captures = capture('producer-and-fixture-whole-inputs', selection);
json('whole-inputs-v002.json', { captures, cumulativeWholeRepositoryBodiesPerRole: 14, productOrTestExecution: false });
git('target-history-Default', ['log', '-8', '--format=%H%x00%aI%x00%s%x00', roles.Default, '--',
    'src/Validation/gen/Parsers/ValidationsGenerator.TypesParser.cs']);
git('generator-entry-history-Default', ['log', '-8', '--format=%H%x00%aI%x00%s%x00', roles.Default, '--',
    'src/Validation/gen/ValidationsGenerator.cs', 'src/Validation/gen/Parsers/ValidationsGenerator.AttributeParser.cs',
    'src/Validation/gen/Parsers/ValidationsGenerator.EndpointsParser.cs']);
console.log(JSON.stringify({ newWholeBodiesPerRole: 10, cumulativeWholeBodiesPerRole: 14,
    actualBodiesCaptured: 20, remainingWholeRepositoryBudgetPerRole: 4, historyRoots: 2,
    runtimeGeneratorTestOrPerformanceExecution: false }));
