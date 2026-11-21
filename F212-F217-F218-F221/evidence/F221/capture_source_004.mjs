import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ORIGINAL, readJson, writeJson, run, localBlob, remoteBlob, helperStart, helperEnd } from './capture_common_002.mjs';

helperStart('capture_source_004');
const currentDefault = readJson('source-roles.json').default;
run('default-local-availability', ['git', '--no-pager', 'cat-file', '-e', `${currentDefault}^{commit}`], [0, 1, 128]);
const defaultLocal = readJson(String.raw`commands\default-local-availability\receipt.json`).exitCode === 0;
const paths = [
    'src/Components/Testing/gen/DiagnosticDescriptors.cs',
    'src/Components/Testing/gen/StartupHookGenerator.cs',
    'src/Components/Testing/src/Infrastructure/ServerStartOptions.cs',
    'src/Components/Testing/src/Infrastructure/IE2EServiceOverrideResolver.cs',
    'src/Components/Testing/src/Infrastructure/TestReadinessHostingStartup.cs',
    'src/Components/Testing/src/Infrastructure/TestServiceOverrideObserver.cs',
    'src/Components/Testing/test/Generators/ServiceOverrideAnalyzerTests.cs',
    'src/Components/Testing/test/Generators/StartupHookGeneratorTests.cs',
    'src/Components/Testing/test/Microsoft.AspNetCore.Components.Testing.Tests.csproj',
    'src/Components/Testing/src/Microsoft.AspNetCore.Components.Testing.csproj',
    'src/Components/Testing/testassets/Directory.Build.props',
    'src/Components/Testing/testassets/TestApp.E2E.Tests/TestApp.E2E.Tests.csproj',
    'src/Components/Testing/testassets/TestApp.E2E.Tests/Tests/WeatherServiceOverrideTests.cs',
    'src/Components/Testing/testassets/TestApp.E2E.Tests/ServiceOverrides/TestOverrides.cs',
];
const sources = [];
for (const gitPath of paths) {
    sources.push(localBlob('Original', ORIGINAL, gitPath));
    sources.push(defaultLocal ? localBlob('Default', currentDefault, gitPath) : remoteBlob('Default', currentDefault, gitPath));
}
writeJson('source-stage2.json', sources);
run('original-documentation-usage-search', [
    'git', '--no-pager', 'grep', '-n', '-E',
    'ServerStartOptions|ServiceOverrideAnalyzer|ConfigureServices<TestOverrides>|E2E_TEST_SERVICES',
    ORIGINAL, '--', ':(glob)docs/**/*.md', ':(glob)src/Components/Testing/**/*.md',
], [0, 1]);
run('original-source-callsite-search', [
    'git', '--no-pager', 'grep', '-n', '-E',
    '\\.ConfigureServices[<(]|ServerStartOptions',
    ORIGINAL, '--', ':(glob)src/Components/Testing/testassets/**/*.cs',
], [0, 1]);
run('original-repository-explicit-serverstartoptions-search', [
    'git', '--no-pager', 'grep', '-l', '-E',
    'ServerStartOptions|\\.ConfigureServices<TestOverrides>',
    ORIGINAL, '--', ':(glob)src/**/*.cs', ':!src/Components/Testing/gen/ServiceOverrideAnalyzer.cs',
], [0, 1]);
if (defaultLocal) {
    run('default-testing-tree', ['git', '--no-pager', 'ls-tree', '-r', '--name-only', currentDefault, '--', 'src/Components/Testing']);
    run('default-source-callsite-search', [
        'git', '--no-pager', 'grep', '-n', '-E',
        '\\.ConfigureServices[<(]|ServerStartOptions',
        currentDefault, '--', ':(glob)src/Components/Testing/testassets/**/*.cs',
    ], [0, 1]);
    run('default-documentation-usage-search', [
        'git', '--no-pager', 'grep', '-n', '-E',
        'ServerStartOptions|ServiceOverrideAnalyzer|ConfigureServices<TestOverrides>|E2E_TEST_SERVICES',
        currentDefault, '--', ':(glob)docs/**/*.md', ':(glob)src/Components/Testing/**/*.md',
    ], [0, 1]);
} else {
    run('default-testing-directory', [
        'gh', 'api', '--method', 'GET', 'repos/dotnet/aspnetcore/contents/src/Components/Testing',
        '-f', `ref=${currentDefault}`,
    ]);
}
const history = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'default-analyzer-history', 'stdout.bin'), 'utf8'));
writeJson('history-summary.json', {
    originalHistory: String.raw`commands\original-analyzer-history\stdout.bin`,
    defaultHistory: String.raw`commands\default-analyzer-history\stdout.bin`,
    defaultHistoryReturned: history.length,
    defaultHistoryRequestedMaximum: 8,
    commits: history.map(item => ({
        sha: item.sha, authorDate: item.commit.author.date,
        committerDate: item.commit.committer.date,
        subject: item.commit.message.split('\n')[0], url: item.html_url,
    })),
    defaultLocalObjectAvailable: defaultLocal,
    note: 'Path-specific history only. No F215/hash-combiner analysis.',
});
helperEnd('capture_source_004');
