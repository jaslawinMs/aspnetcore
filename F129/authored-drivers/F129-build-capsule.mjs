import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F129');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function inventory(directory, prefix = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const name = prefix ? prefix + '/' + item.name : item.name;
        return item.isDirectory() ? inventory(path.join(directory, item.name), name) : [name];
    }).sort();
}
function write(file, value)
{
    const target = path.join(destination, ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function git(...args)
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd: published, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
assert.equal(fs.existsSync(destination), false, 'Preserve an existing capsule');
assert.equal(git('rev-parse', 'HEAD'), 'ceb198ba87f0d93105a58bb74575032eb201f391');
assert.equal(git('status', '--porcelain'), '');
assert.equal(git('rev-parse', 'HEAD:REPORT.md'), '73abf142464b1f81676e03a1eebc766c279cb47b');
const decision = read(path.join(run, 'decision.json'));
const audit = read(path.join(run, 'audit-summary.json'));
assert.equal(decision.disposition, 'rejected');
assert.equal(audit.actualRealRendererRows, 162);
assert.equal(audit.actualIndividualXmlExecutions, 28);
assert.equal(audit.actualLiveCompiledImageBytesChecked, true);
assert.equal(hash(path.join(run, 'diagnostic-budget.json')), decision.actualClosedBudgetSha256);
fs.mkdirSync(destination);
const copies = [];
const omitted = [];
for (const name of inventory(run))
{
    const file = path.join(run, ...name.split('/'));
    const entry = { path: name, bytes: fs.statSync(file).size, sha256: hash(file) };
    if (name.split('/').some(segment => ['bin', 'obj', 'consumer'].includes(segment)) ||
        /\.(dll|pdb|exe|so|a|dylib|zip|nupkg|cache|bin|db)$/i.test(name))
    {
        omitted.push({ ...entry, authoritativeSource: 'private-case/' + name });
        continue;
    }
    const target = path.join(destination, ...name.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(target), entry.sha256);
    copies.push({ ...entry, authoritativeSource: 'private-case/' + name });
}
for (const prefix of ['bin', 'obj'])
{
    const common = path.join(session, 'autoperf-runs', 'F129-common', prefix);
    for (const name of inventory(common))
    {
        const file = path.join(common, ...name.split('/'));
        omitted.push({ path: 'common-project/' + prefix + '/' + name, bytes: fs.statSync(file).size,
            sha256: hash(file), authoritativeSource: 'private-common/' + prefix + '/' + name });
    }
}
for (const name of ['intake', 'managed-command', 'freeze', 'record-baseline', 'reproduce-untimed', 'finish-evaluation', 'build-capsule'])
{
    const filename = 'F129-' + name + '.mjs';
    const file = path.join(session, filename);
    const target = 'authored-drivers/' + filename;
    write(target, fs.readFileSync(file, 'utf8'));
    copies.push({ path: target, bytes: fs.statSync(file).size, sha256: hash(file),
        authoritativeSource: 'private-session/current-authored-driver/' + filename });
}
write('.gitattributes', '* -text\n');
const base = 'https://github.com/jaslawinMs/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5';
const original = 'images/Original/source/src/Components/Media/src/FileDownload.cs';
const prototype = 'images/Prototype/source/src/Components/Media/src/FileDownload.cs';
const matrix = read(path.join(run, 'semantic-matrix.json'));
const render = value => value === null ? 'No HTML: renderer exception' : '`' + value.replaceAll('|', '&#124;') + '`';
write('semantic-results.md', `# F129: every declared profile

The table shows repetition one. All three repetitions per profile remain in each raw JSON report. Four original/default/prototype/restored executions and two fresh-project executions produced **162 actual managed component renders**. These are repeated executions of nine profiles, not 162 distinct tests.

| Profile | Original HTML | Lazy-filter HTML | Prototype preservation result |
|---|---|---|---|
${matrix.map(row => `| ${row.profile} | ${render(row.originalHtml)} | ${render(row.prototypeHtml)} | ${row.actualPrototypeFailures.length ? 'Different: ' + row.actualPrototypeFailures.join('; ').replaceAll('|', '&#124;') : 'Same'} |`).join('\n')}

Both href-present mutator profiles differ in every repetition, including the independent rebuild. The two prototype executions each exit **2**, with six failed original-behavior rows. The original, actual default, restored original and fresh original each exit **0**, with all 27 rows satisfying the same assertions.

The nearest-opposite controls are retained: without supplied href, both implementations already observe a replacement during direct enumeration, and both already report the insertion exception. With custom ChildContent, neither invokes the mutating value. The uppercase-href/comparer control preserves the existing behavior; this case does not change it.

[Original](validation/original-characterize-001/observations.json), [actual default](validation/default-characterize-001/observations.json), [prototype](validation/prototype-characterize-001/observations.json), [restored original](validation/restored-characterize-001/observations.json), [fresh original](validation/reconstruction-original-characterize-001/observations.json), [fresh prototype](validation/reconstruction-prototype-characterize-001/observations.json), [machine-readable matrix](semantic-matrix.json).

**No timing, allocation result or ordinary application-frequency claim.** The deliberately reentrant application value establishes a concrete difference, not its prevalence.
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label =>
{
    const directory = path.join(run, 'validation', label);
    const command = read(path.join(directory, 'command.json'));
    const result = read(path.join(directory, 'result.json'));
    const reason = label === 'prototype-tests-001' ? 'Compilation stopped at CS1061: this project does not import System.Linq. The same prototype was then compiled with a fully qualified Enumerable.Where call.' :
        ['default-tests-001', 'harness-build-001', 'reconstruction-build-001'].includes(label) ? 'Missing assets NETSDK1004; restore occurred only after this actual failure.' :
        label.includes('prototype-characterize') ? 'Expected negative preservation result: both changed profiles fail in all three repetitions; all other profiles retain the baseline behavior.' :
        label.includes('tests-') ? 'All seven individual FileDownloadTest XML rows passed; none failed or skipped.' :
        label.includes('characterize') ? 'All 27 actual component-rendering rows satisfy the original assertions.' :
        label.includes('build') ? 'Build succeeded with zero warnings and zero errors.' : 'Restore succeeded.';
    return `## ${label}

\`\`\`powershell
Set-Location -LiteralPath ${quote(command.cwd)}
. .\\activate.ps1
${Object.entries(command.environmentOverrides).map(([name, value]) => '$env:' + name + ' = ' + quote(value)).join('\n')}
$arguments = @(${command.arguments.map(quote).join(', ')})
& ${quote(command.executable)} @arguments
\`\`\`

**Result: exit ${result.exitCode}.** ${reason}
[Exact command](validation/${label}/command.json), [receipt](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt).
`;
}).join('\n');
write('validation-commands.md', `# F129: exact commands and observed results

All **19 managed commands** are retained, including four preparation failures and two expected semantic-failure executions. The four complete existing-test executions contain **28 individually parsed passing XML rows**: seven tests repeated on original, actual default, prototype and restored original. Passing the existing seven tests alone did not establish equivalence of the proposed replacement.

Builds and executions were serialized on a shared Windows box. Every fresh .NET shell activates its reviewed checkout first. No root SDK pin, package manifest, feed configuration, power setting, affinity, priority or machine configuration changed.

The first prototype spelling needed a System.Linq import. Rather than alter imports, the compiled prototype qualifies the identical static Enumerable.Where call. The failed source and CS1061 output remain [captured](validation/prototype-tests-001/source-snapshot/FileDownload.cs). This was a preparation correction, not timing or source-result selection.

The first reconstruction manifest retained its old PDB byte length although the new PDB hash was correct. [The correction](reconstruction-001/manifest-size-correction.json) refreshes only the two size fields from actual bytes; [both](reconstruction-001/Original/manifest-before-size-correction.json) [old manifests](reconstruction-001/Prototype/manifest-before-size-correction.json) and the [exact executed helper](reconstruction-001/executed-reproducer-before-manifest-size-correction.mjs) remain. No source, binary, raw observation, build or execution was changed or repeated by that correction. Current authored-driver source includes the size fix and must not be mistaken for those earlier executed bytes.

Initial optional related-PR filename queries used an unsupported gh --slurp/--jq combination. They did not execute a test or contact a product endpoint. The successful -002 path lists and actual FileDownload hunks in [research](research/) are the authority.

${commands}

## What this did not run

No sample server, browser, download, JS interop, performance benchmark, AOT/trimming, packaging or full-repository build. This explicitly throwaway investigation observes behavior fully produced below the browser by actual managed component rendering. No permanent test was added solely to satisfy the Components implementation workflow; no shipping implementation is retained.
`);
write('README.md', `# F129: keep the attribute snapshot - unbuffered replacement rejected

**No shipping change, optimization PR or measured performance claim.** The dictionary is not simply redundant materialization: in the supplied-href branch it also snapshots attribute pairs before rendering converts object values to strings. Replacing it with an unbuffered filter changes actual HTML or throws for the concrete inputs below.

This is **observable-behavior preservation**, not a claim that the API documents snapshot guarantees or that such reentrant values are common. Only the single unbuffered recommendation is rejected; buffered list/array/pooling/constructor alternatives have not been established or measured here.

## Why the copy matters

An application supplies href, an object-valued data-trigger attribute and data-after="before". The real RenderTreeBuilder.AddAttribute(object) invokes that object's ToString; the object updates its own supplied dictionary to data-after="after". The existing FileDownload has already copied every pair, so the real HTML retains **before**. The lazy-filter prototype reads the later changed source pair and renders **after** instead.

When the same real conversion adds a new source key instead, the existing copy finishes rendering; the lazy prototype reports **InvalidOperationException: Collection was modified**. Neither probe invokes ToString or BuildRenderTree directly, fabricates renderer events, or relies on a browser scheduler.

The input is deliberately reentrant. It establishes a real difference at the managed HTML/exception boundary, **not normal application frequency or a current product defect**.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Current shipping code | [Baseline source](${base}/src/Components/Media/src/FileDownload.cs), [tested snapshot](${original}) | Unchanged; no source branch or performance PR published |
| Actual-default source | [Snapshot](images/Default/source/src/Components/Media/src/FileDownload.cs), [complete default observations](validation/default-characterize-001/observations.json) | Genuine default dependency graph at ae89581dfd24c6277b4267a9779d05f7b9f047f1, not substituted baseline owners |
| Rejected source | [Actual compiled prototype](${prototype}), [raw source delta](prototype.patch) | Only the href-present branch uses lazy ordinal filtering; not a proposed fix |
| Acceptance and baseline | [Sealed plan](plan.json), [seal](plan-seal.json), [passing baseline](baseline-completed.json) | Defined before prototype edits, with nine profiles and three repetitions each |
| Actual producer | [Media parameter assignment](images/Original/source/src/Components/Media/src/MediaComponentBase.cs), [builder conversion](images/Original/source/src/Components/Components/src/Rendering/RenderTreeBuilder.cs), [probe](harness/Program.cs) | Actual FileDownload, normal parameters, actual object-value conversion and real HTML/exception |
| Every observed profile | [Readable table](semantic-results.md), [matrix](semantic-matrix.json), [prototype raw rows](validation/prototype-characterize-001/observations.json) | Both href-present mutator profiles change in all repetitions; nearest-opposite and ordinary controls retained |
| Existing correctness coverage | [Exact commands/results](validation-commands.md), [test source](images/Original/source/src/Components/Media/test/FileDownloadTest.cs), [XML parser](F129-audit-trx.ps1) | 28 passing historical XML executions; no hidden failed or skipped discovered test |
| Runnable private characterization | [Project](harness/AutoPerf.Characterization.csproj), [C# source](harness/Program.cs), [two input hashes](common-inputs.json) | C# 13 and real source-built owners, not a copied render loop or performance benchmark |
| Fresh exact-input reconstruction | [Verified result](reconstruction-001/verified-reproduction.json), [copied project](reconstruction-001/project/AutoPerf.Characterization.csproj), [metadata correction](reconstruction-001/manifest-size-correction.json) | Actual restore/build and both original/prototype reexecutions reproduce the distinction; no timing |
| Outcome | [Decision](decision.json), [closed budget](diagnostic-budget.json), [closure](budget-closure.json) | Rejected before timing; all three unused authorizations permanently closed |
| Independent audit | [Portable verifier](F129-verify.mjs), [full live-image audit](audit-summary.json), [raw audit output](live-audit.stdout.txt) | 162 real render rows, 72 runtime assembly records, 30 selected PE/PDB/source associations and every individual XML result |
| Evidence integrity | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [sealed hashes](capsule-file-hashes.json) | Binary/build outputs are individually inventoried, not shipped |

Closed fork tracking and the late publication receipt are added only after the immutable core is remotely verified. The additive publication.json and live root index connect that issue without rewriting this core.

## Boundary and controls

Original, actual default, restored original and rebuilt original each satisfy all 27 original-behavior rows. Both prototype executions fail exactly six rows: the two changed profiles repeated three times. **162 renders are repeated executions of nine profiles**, not 162 unique tests. The seven existing tests pass with either implementation, so they cannot by themselves justify this optimization.

Without supplied href, both implementations still use direct source enumeration: replacing the later value renders after, and adding a key throws. ChildContent bypasses conversion entirely; the uppercase-href/source-comparer behavior is unchanged. All raw control observations are retained.

The 30-file original/prototype images differ only in the actual Media DLL/PDB. The other **28 files include the identical common harness DLL/PDB**. The restored original reproduces all 30 original image files byte for byte. The independent two-input rebuild replaces only its new harness DLL/PDB; the other 28 files in each corresponding source consumer are preserved.

Five selected source documents per execution match actual loaded PE/PDB identities and the copied physical source. This is **selected provenance, not complete compiler provenance**. Pinned Microsoft.NETCore.App assemblies keep their actual runtime paths and hashes; they are not relabeled source-built ASP.NET Core owners.

The behavior owner is FileDownload.BuildRenderTree plus actual RenderTreeBuilder object conversion. The producer is normal component parameter assignment followed by actual ToString dispatch; the final observable is real HTML or a renderer exception. This lower managed boundary is faithful for the claim. No browser/download, JS, DOM/layout, Server/WASM/Auto lifecycle, general throughput or allocation claim is made. A later shipping implementation would still need the Components sample and permanent coverage workflow.

## Verification and reproduction

From this directory on Windows with Node.js and PowerShell 7:

\`\`\`powershell
node .\\F129-verify.mjs . --require-seal
\`\`\`

The recorded live audit passed with the private compiled images; the sealed portable audit additionally checks the immutable published file hashes. It reparses actual XML, all raw semantic rows, command receipts and snapshot checksums. Historical PE/PDB binaries are omitted: portable audit verifies their recorded associations and authoritative hashes, not a newly rebuilt historical binary.

To reexecute rather than audit, use an isolated checkout at the recorded baseline and its documented activated SDK build/test commands in [validation-commands.md](validation-commands.md). Build the two-input project with ReferencePathRoot set to that built Media.Tests output (or the retained private original consumer). A consumer directory must contain the compiled output and have its corresponding source snapshot directory beside it, because the probe checks loaded-owner PDBs against those sources. The actual [fresh-project commands and results](reconstruction-001/verified-reproduction.json) demonstrate both roles. Raw observations are written to the explicit second application argument; prototype preservation checks deliberately exit 2. This is a characterization, not a benchmark.

SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105, x64; C# 13. Zero timing comparisons, retuning or machine setting changes.

## History and related work

The copy is present in the [original introduction](research/original-introduction.stdout.txt), before the [package rename](research/renamed-history.stdout.txt). All eleven selected original/default inputs match in Git text. [Attribute-splatting docs](research/attribute-splatting-docs.stdout.txt) describe the application-supplied object-valued dictionary; they do not establish a documented snapshot guarantee.

The three open-PR search leads were resolved against complete changed-path lists: [dotnet/aspnetcore#69687](https://github.com/dotnet/aspnetcore/pull/69687) changes a trimming annotation on OnClickAsync ([actual hunk](research/upstream-pr-69687-FileDownload.patch)); [dotnet/aspnetcore#68300](https://github.com/dotnet/aspnetcore/pull/68300) changes component descriptors ([paths](research/upstream-pr-68300-changed-paths-002.txt)); [dotnet/aspnetcore#68672](https://github.com/dotnet/aspnetcore/pull/68672) rewinds the source stream on click ([actual hunk](research/upstream-pr-68672-FileDownload.patch)). None is this attribute-copy optimization. [The existing media API issue](https://github.com/dotnet/aspnetcore/issues/66391) is context, not approval of any proposed change. No global or external caller census is claimed.
`);
write('authoritative-copies.json', { findingId: 'F129', files: copies });
write('omitted-file-hashes.json', { findingId: 'F129', scope: 'Owned case consumer/build outputs and original private common project bin/obj only; not all repository compiler inputs.', files: omitted });
const links = [];
for (const file of inventory(destination).filter(file => file.endsWith('.md') && ['README.md', 'semantic-results.md', 'validation-commands.md'].includes(file)))
{
    const text = fs.readFileSync(path.join(destination, file), 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g))
    {
        const target = match[1];
        if (/^(https?:|#)/.test(target)) continue;
        const resolved = path.resolve(path.dirname(path.join(destination, file)), decodeURIComponent(target.split('#')[0]));
        if (target === 'capsule-file-hashes.json') continue;
        assert.equal(fs.existsSync(resolved), true, `Broken authored link ${file}: ${target}`);
        links.push({ file, target });
    }
}
write('authored-local-links.json', { checked: links.length + 1, deferredManifestLink: 'capsule-file-hashes.json', links });
const files = inventory(destination).map(file => ({ path: file, bytes: fs.statSync(path.join(destination, file)).size, sha256: hash(path.join(destination, file)) }));
write('capsule-file-hashes.json', { findingId: 'F129', files, excludedFromSelfHash: ['capsule-file-hashes.json', 'publication.json'] });
assert.equal(fs.existsSync(path.join(destination, 'capsule-file-hashes.json')), true);
const command = [path.join(destination, 'F129-verify.mjs'), destination, '--require-seal'];
const verification = spawnSync(process.execPath, command, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.command.json'), JSON.stringify({ executable: process.execPath, arguments: command, exitCode: verification.status }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), verification.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), verification.stderr ?? '', { flag: 'wx' });
assert.equal(verification.status, 0, verification.stderr);
const preparation = {
    findingId: 'F129', recordedAt: new Date().toISOString(), immutableCoreFiles: files.length + 1,
    actualCopiedAuthoritativeFiles: copies.length, actualIndividuallyHashedOmittedFiles: omitted.length,
    actualAuthoredLocalLinksChecked: links.length + 1, actualBrokenAuthoredLinks: 0,
    actualManifestSelfLinkVerifiedAfterCreation: true, actualSealedCapsuleAuditPassed: true,
    actualFixedReportBlob: git('rev-parse', 'HEAD:REPORT.md'),
};
fs.writeFileSync(path.join(run, 'capsule-preparation.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(preparation, null, 2));
