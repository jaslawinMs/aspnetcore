import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F111');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8').replace(/^\uFEFF/, ''));
const audit = read('measurement-audit.json'), goals = read('resource-goals.json');
const pair = (label, comparison) => audit.pairs.find(row => row.label === label && row.comparison === comparison);
const target = ['| Case | Pair2 time change | Pair3 time change | Pair2 original/candidate B | Pair3 original/candidate B |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...goals.targets.map(({ label }) =>
    {
        const a = pair(label, 2), b = pair(label, 3);

        return `| ${label} | ${a.timeChangePercent.toFixed(2)}% | ${b.timeChangePercent.toFixed(2)}% | ${a.original.bytesPerOperation}/${a.candidate.bytesPerOperation} | ${b.original.bytesPerOperation}/${b.candidate.bytesPerOperation} |`;
    })].join('\n');
const controlLabels = audit.selectedUnchangedControlCosts.filter(row => row.comparison === 2).map(row => row.label);
const controls = ['| Unchanged control | Pair2 time change | Pair3 time change | Pair2 original/candidate B | Pair3 original/candidate B |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...controlLabels.map(label =>
    {
        const a = pair(label, 2), b = pair(label, 3);

        return `| ${label} | ${a.timeChangePercent.toFixed(2)}% | ${b.timeChangePercent.toFixed(2)}% | ${a.original.bytesPerOperation}/${a.candidate.bytesPerOperation} | ${b.original.bytesPerOperation}/${b.candidate.bytesPerOperation} |`;
    })].join('\n');
const template = fs.readFileSync(path.join(session, 'F111-results-readme-template.md'), 'utf8');
const output = template.replace('{{TARGET_TABLE}}', target).replace('{{CONTROL_TABLE}}', controls);
assert(!output.includes('{{'));
assert(output.includes(read('source-branch-publication.json').commit));
fs.writeFileSync(path.join(session, 'F111-results-readme.md'), output, { flag: 'wx' });
console.log('F111 qualified report rendered from actual seven targets/all six unchanged controls in both selected comparisons.');
