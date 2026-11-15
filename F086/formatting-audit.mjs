import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root = process.argv[2];
assert(root, 'Explicit F086 artifact root required.');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const before = read('formatting-before-report/format-report.json');
const after = read('formatting-after-report/format-report.json');
const ranges = read('formatting-source-ranges.json');
assert.equal(read('formatting-before.json').exit_code, 2);
assert.equal(read('formatting-after.json').exit_code, 2);
const flatten = report => report.flatMap(file => file.FileChanges.map(change => ({
    file: file.FilePath.replaceAll('\\', '/').split('/src/Features/').at(-1),
    ...change,
})));
const original = flatten(before);
const selected = flatten(after);
assert.equal(original.length, 3);
assert.equal(selected.length, 3);
const oldLines = fs.readFileSync(path.join(root, 'source-tests-before.cs'), 'utf8').replaceAll('\r\n', '\n').split('\n');
const newLines = fs.readFileSync(path.join(root, 'source-tests.cs'), 'utf8').replaceAll('\r\n', '\n').split('\n');
const mapped = selected.map(change =>
{
    assert.equal(change.file, 'JsonPatch.SystemTextJson/test/Internal/ListAdapterTest.cs');
    let offset = 0;
    for (const range of ranges.test)
    {
        assert.equal(range.old_count, 0, 'Untouched test statements must not be removed or rewritten.');
        assert(change.LineNumber < range.new_start ||
            change.LineNumber >= range.new_start + range.new_count, 'An added line has a formatter violation.');
        if (change.LineNumber >= range.new_start + range.new_count)
        {
            offset += range.new_count;
        }
    }
    const line = change.LineNumber - offset;
    assert.equal(newLines[change.LineNumber - 1], oldLines[line - 1], 'Baseline whitespace seam was changed.');
    return { ...change, LineNumber: line };
});
assert.deepEqual(mapped, original, 'Only identical pre-existing original formatter violations may remain.');
for (const range of ranges.owner)
{
    assert.equal(range.old_count, 0, 'Existing shipping statements must be preserved.');
}
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const result = {
    candidate: 'F086',
    full_file_original_exit: 2,
    full_file_selected_exit: 2,
    full_file_check_passed: false,
    pre_existing_diagnostics: original,
    selected_original_diagnostics_equal_after_mapping: true,
    added_line_formatter_violations: 0,
    existing_owner_or_test_statements_removed_or_rewritten: 0,
    source_hashes: {
        original_test: hash('source-tests-before.cs'),
        selected_test: hash('source-tests.cs'),
    },
    boundary: 'Actual formatter reports remain nonzero for three untouched main test-file whitespace diagnostics;all added lines are clear. No unrelated formatting changes were made.',
};
if (process.argv.includes('--verify'))
{
    assert.deepEqual(read('formatting-audit.json'), result);
}
else
{
    fs.writeFileSync(path.join(root, 'formatting-audit.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log('F086:three actual baseline-only whitespace diagnostics reproduced andmapped exactly;zero added-line violations;no existing statements rewritten.');
