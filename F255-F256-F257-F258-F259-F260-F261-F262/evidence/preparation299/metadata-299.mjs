import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const roles = {};
for (const role of ['Original', 'Default'])
{
    const tree = JSON.parse(fs.readFileSync(path.join(output, `tree-${role}.json`), 'utf8'));
    roles[role] = {
        commit: tree.commit,
        ancestorGuidance: tree.entries.filter(entry =>
            ['AGENTS.md', 'src/AGENTS.md', 'src/Servers/AGENTS.md', 'src/Servers/Kestrel/AGENTS.md',
                'src/Servers/Kestrel/shared/AGENTS.md', 'src/Servers/Kestrel/tools/AGENTS.md',
                'src/Servers/Kestrel/tools/CodeGenerator/AGENTS.md', 'src/Servers/Kestrel/Kestrel/AGENTS.md',
                'src/Servers/Kestrel/Kestrel/test/AGENTS.md', 'src/Http/AGENTS.md', 'src/Http/Headers/AGENTS.md',
                'src/Http/Headers/src/AGENTS.md', 'src/Shared/AGENTS.md'].includes(entry.path)),
        producerAndTestPaths: tree.entries.filter(entry =>
            /(^|\/)(HeaderNames|InternalHeaderNames|GeneratedCodeTests)\.cs$/.test(entry.path) ||
            entry.path === 'src/Servers/Kestrel/Directory.Build.props' ||
            entry.path === 'src/Servers/Kestrel/Kestrel/test/Microsoft.AspNetCore.Server.Kestrel.Tests.csproj' ||
            entry.path === 'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs' ||
            entry.path.startsWith('src/Servers/Kestrel/') && /generat/i.test(entry.path) && /\.(cmd|ps1|sh|proj|targets)$/.test(entry.path))
    };
}
const report = { metadataOnly: true, sourceBodiesRead: 0, roles };
fs.writeFileSync(path.join(output, 'producer-test-metadata.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
