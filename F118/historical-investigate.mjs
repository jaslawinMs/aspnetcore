import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url)), repo = 'C:\\src\\aspnetcore';
const root = path.join(session, 'autoperf-runs', 'F118'), target = path.join(root, 'investigation');
assert(!fs.existsSync(target), 'Never overwrite captured source/history evidence.');
fs.mkdirSync(target);
const scope = JSON.parse(fs.readFileSync(path.join(root, 'initial-scope.json'), 'utf8').replace(/^\uFEFF/, ''));
const commands = [];
function run(command, args, label) {
    const result = spawnSync(command, args, { cwd: repo, maxBuffer: 8 * 1024 * 1024 });
    const file = path.join(target, label); fs.writeFileSync(file, result.stdout ?? '');
    fs.writeFileSync(file + '.stderr.log', result.stderr ?? '');
    commands.push({ entryPoint: command, arguments: args, exitCode: result.status, stdout: label, stderr: label + '.stderr.log' });
    fs.writeFileSync(path.join(target, 'execution.json'), JSON.stringify({ candidate: 'F118', commands }, null, 2) + '\n');
    assert.equal(result.status, 0, command + '/' + label);

    return result.stdout;
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const canonical = value => Buffer.from(value.toString('utf8').replace(/\r\n/g, '\n'));
const files = [
    'src\\Mvc\\Mvc.Razor\\src\\TagHelpers\\UrlResolutionTagHelper.cs',
    'src\\Mvc\\Mvc.Razor\\src\\RazorPageBase.cs',
    'src\\Mvc\\Mvc.Razor\\src\\Microsoft.AspNetCore.Mvc.Razor.csproj',
    'src\\Mvc\\Mvc.Razor\\test\\TagHelpers\\UrlResolutionTagHelperTest.cs',
    'src\\Mvc\\Mvc.Razor\\test\\Microsoft.AspNetCore.Mvc.Razor.Test.csproj',
    'src\\Mvc\\Mvc.Core\\src\\Routing\\UrlHelperFactory.cs',
    'src\\Mvc\\Mvc.Core\\src\\Routing\\UrlHelperBase.cs',
    'src\\Mvc\\Mvc.Core\\src\\Routing\\UrlHelper.cs',
    'src\\Html.Abstractions\\src\\IHtmlContent.cs',
    'src\\Html.Abstractions\\src\\HtmlContentBuilder.cs',
    'src\\Html.Abstractions\\src\\HtmlString.cs',
    'src\\Razor\\Razor.Runtime\\src\\Runtime\\TagHelpers\\TagHelperExecutionContext.cs',
    'src\\Razor\\Razor.Runtime\\src\\Runtime\\TagHelpers\\TagHelperRunner.cs',
    'src\\Razor\\Razor\\src\\TagHelpers\\DefaultTagHelperContent.cs',
    'src\\Razor\\Razor\\src\\TagHelpers\\TagHelperOutput.cs',
    'src\\Razor\\Razor\\src\\TagHelpers\\TagHelperAttribute.cs',
    'src\\ObjectPool\\src\\ObjectPool.cs',
    'src\\ObjectPool\\src\\StringBuilderPooledObjectPolicy.cs',
    'src\\ObjectPool\\src\\DefaultObjectPool.cs',
    'src\\ObjectPool\\src\\DefaultObjectPoolProvider.cs'
];
const rows = [];
for (const [index, file] of files.entries()) {
    const gitPath = file.replaceAll('\\', '/'), original = run('git', ['show', `${scope.baseline}:${gitPath}`], `baseline-${index}.log`);
    const current = run('git', ['show', `${scope.freshDefault}:${gitPath}`], `current-${index}.log`);
    const working = fs.readFileSync(path.join(repo, file));
    for (const [folder, data] of [['producer-source', working], ['baseline-canonical', original], ['current-default-canonical', current]]) {
        const destination = path.join(root, folder, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, data);
    }
    rows.push({ path: file, workingRawSha256: hash(working), baselineCanonicalSha256: hash(original),
        currentCanonicalSha256: hash(current), workingMatchesBaseline: canonical(working).equals(original), currentMatchesBaseline: original.equals(current) });
}
run('git', ['log', '-6', '-p', scope.freshDefault, '--', files[0]], 'helper-history-with-diffs.log');
run('gh', ['search', 'prs', 'UrlResolutionTagHelper', '--repo', 'dotnet/aspnetcore', '--limit', '15',
    '--json', 'number,title,url,state,author,updatedAt'], 'related-helper-prs.json');
run('gh', ['search', 'prs', '"StringWriter" "pool"', '--repo', 'dotnet/aspnetcore', '--limit', '15',
    '--json', 'number,title,url,state,author,updatedAt'], 'related-writer-pool-prs.json');
run('gh', ['pr', 'view', '41454', '--repo', 'dotnet/aspnetcore', '--json',
    'number,title,body,url,state,mergedAt,mergeCommit,files'], 'minor-taghelper-history-pr.json');
run('gh', ['pr', 'view', '54878', '--repo', 'dotnet/aspnetcore', '--json',
    'number,title,body,url,state,mergedAt,mergeCommit,files'], 'searchvalues-history-pr.json');
const result = {
    candidate: 'F118', baseline: scope.baseline, freshDefault: scope.freshDefault, scopedSources: rows.length,
    exactScopedIdentities: rows.filter(row => row.currentMatchesBaseline && row.workingMatchesBaseline).length,
    scopedSourceIdentities: rows,
    behaviorBoundary: 'Actual public UrlResolutionTagHelper.Process,real TagHelperRunner ordered producer and URL factory;not network/full-page timing.',
    normalRazorProducerBoundary: 'RazorPageBase buffers AddHtmlAttributeValue through its existing reused writer and EndAddHtmlAttributeValues publishes HtmlString;that normal producer bypasses this finding seam.',
    ownershipBoundary: 'Renderers borrow the writer synchronously;per-call StringWriter type/culture/newline/disposal are retained. Reentrancy and exceptional cleanup require actual probes. No post-disposal ownership/fresh-capacity promise inferred.',
    indexUnavailable: ['GitHub semantic code search HTTP404 for dotnet/aspnetcore', 'CSharp LSP workspaceSymbol found no UrlResolutionTagHelper'],
    sourceGraphCompletenessClaimed: false, timingOrSourceChangeBeforeInvestigation: false
};
fs.writeFileSync(path.join(root, 'current-source-investigation.json'), JSON.stringify(result, null, 2) + '\n');
assert(rows.every(row => row.workingMatchesBaseline), 'Working source differs from independent baseline;inspect before testing.');
assert(rows.every(row => row.currentMatchesBaseline), 'Current scoped differences require explicit pre-edit characterization,not an assumed equivalence.');
console.log(`F118:${rows.length} exact current/baseline/working scoped sources;real runner/custom-content and ordinary Razor HtmlString boundaries captured,history inspected;no full-default integration claim.`);
