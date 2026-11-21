import fs from 'node:fs';
import path from 'node:path';
import { ROOT, utc, writeJson, git } from './collect_source_213.mjs';

const comparison = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-COMPARISON.json')));
const external = comparison.declaredDependencySource;
for (const item of external.filter(item => !item.sameCompleteBytes)) {
    git('dependency-source-diff-' + path.basename(item.gitPath).replaceAll('.', '_'), [
        'diff', '--no-index', '--no-ext-diff', '--',
        path.join(ROOT, item.originalArtifact), path.join(ROOT, item.defaultArtifact),
    ], [0, 1]);
}
writeJson('SOURCE-COMPARISON-COMPACT.json', {
    recordedUtc: utc(),
    aspnetcore: comparison.aspnetcore.map(item => ({
        path: item.gitPath, sameCompleteBytes: item.sameCompleteBytes,
    })),
    declaredDependencySource: external.map(item => ({
        path: item.gitPath, sameCompleteBytes: item.sameCompleteBytes,
    })),
});

const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'source-manifest.json')));
const files = [
    ['decoder', 'src/Servers/Kestrel/Core/src/Internal/Infrastructure/HttpUtilities.cs', 'GetRequestHeaderString', 8, 75],
    ['kestrel-request-header-assignment', 'src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.cs', 'RequestHeaders = HttpRequestHeaders', 8, 12],
    ['default-string-formatter-registration', 'src/Mvc/Mvc.Core/src/Infrastructure/MvcCoreMvcOptionsSetup.cs', 'new StringOutputFormatter', 6, 8],
];
const excerpts = [];
for (const [label, gitPath, needle, before, after] of files) {
    for (const role of ['Original', 'Default']) {
        const source = sourceManifest.find(item => item.role === role && item.gitPath === gitPath && item.present);
        if (!source) throw new Error('Missing selected complete source: ' + role + ':' + gitPath);
        const lines = fs.readFileSync(path.join(ROOT, source.artifact), 'utf8').split(/\r?\n/);
        const index = lines.findIndex(line => line.includes(needle));
        if (index < 0) throw new Error('Missing exact excerpt selector: ' + needle);
        const start = Math.max(0, index - before);
        const end = Math.min(lines.length, index + after + 1);
        excerpts.push({
            label, role, gitPath, revision: source.revision, sha256: source.sha256,
            artifact: source.artifact, startLine: start + 1, endLine: end,
            numberedLines: lines.slice(start, end).map((text, i) => ({ line: start + i + 1, text })),
            nature: 'Raw source excerpt for manual inspection, not an executed runtime check',
        });
    }
}
writeJson('producer-source-excerpts.json', excerpts);
console.log(JSON.stringify({ phase: 'source-evidence-ready-for-gate', collectorPid: process.pid,
    dependencyChangedFiles: external.filter(item => !item.sameCompleteBytes).map(item => item.gitPath),
    excerpts: excerpts.map(item => ({ label: item.label, role: item.role, startLine: item.startLine, endLine: item.endLine })),
}));
