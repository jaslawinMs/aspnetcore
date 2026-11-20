import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F237-F238-059');
const require = createRequire(import.meta.url);
const metadataFile = path.join(session, 'autoperf-parallelism', 'finding-F198-F199-048', 'capsule', 'Metadata.cjs');
const metadata = require(metadataFile);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => fs.readFileSync(file);
const entry = JSON.parse(read(path.join(root, 'entry-plan.json')));
const output = path.join(root, 'selected-metadata-preflight-073.json');
assert(!fs.existsSync(output));
const selected = [];
for (const role of ['Original', 'Default']) {
    const graph = entry.actualIndependentGraphs[role];
    const bin = path.join(graph, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test', 'Release', 'net12.0');
    for (const name of ['Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation',
        'Microsoft.AspNetCore.Mvc.RazorPages', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test']) {
        selected.push({ id: `${role}-${name}`, role, graph, image: path.join(bin, name + '.dll'),
            pdb: path.join(bin, name + '.pdb') });
    }
}
for (const cohort of ['common-066', 'common-070']) {
    selected.push({ id: cohort, role: cohort === 'common-070' ? 'AcceptedCommon' : 'HistoricalDependencyFailureCommon',
        graph: path.join(root, cohort), image: path.join(root, cohort, 'RuntimePageDiscovery.CommonProbe.dll'),
        pdb: path.join(root, cohort, 'RuntimePageDiscovery.CommonProbe.pdb') });
}
const result = [];
for (const item of selected) {
    const imageBytes = read(item.image), pdbBytes = read(item.pdb);
    const associated = metadata.associate(imageBytes, pdbBytes);
    const documents = associated.symbols.documents.map(document => {
        const bytes = document.embedded ?? read(document.name);
        metadata.documentHash(document, bytes);
        return { row: document.row, name: document.name, algorithm: document.algorithm,
            checksum: document.checksum, actualRawBytes: bytes.length, actualRawSha256: hash(bytes),
            actualEmbedded: document.embedded !== null };
    });
    result.push({ ...item, actualImageSha256: hash(imageBytes), actualPdbSha256: hash(pdbBytes),
        actualMvid: associated.image.managed.mvid, actualPdbGuid: associated.symbols.guid,
        actualPdbStamp: associated.symbols.stamp, actualDocuments: documents });
}
fs.writeFileSync(output, JSON.stringify({
    actualRecordedAt: new Date().toISOString(), actualMetadataParserSource: metadataFile,
    actualMetadataParserSha256: hash(read(metadataFile)),
    actualSelectedPairs: result, actualNoNativeExecutionOrBudgetAuthorization: true
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPreflightPassed: true, actualSelectedPePdbAssociations: result.length,
    actualRawDocumentsFreshlyVerified: result.reduce((sum, item) => sum + item.actualDocuments.length, 0),
    actualEmbeddedDocuments: result.flatMap(item => item.actualDocuments).filter(item => item.actualEmbedded).length,
    actualNoNativeExecutionOrBudgetAuthorization: true }, null, 2));
