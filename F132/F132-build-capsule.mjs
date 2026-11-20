import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F132');
const common = path.join(session, 'autoperf-runs', 'F132-common');
const published = path.join(session, 'autoperf-published-results');
const target = path.join(published, 'F132');
const read = file => JSON.parse(fs.readFileSync(path.join(run, ...file.split('/')), 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
assert.equal(fs.existsSync(target), false, 'Never rewrite a public case');
assert.equal(read('audit-summary.json').actualAuditPassed, true);
assert.equal(read('audit-summary.json').actualLiveImagesVerified, true);
const analysis = read('measurement-analysis.json');
assert.equal(analysis.preliminaryDisposition, 'no-gain');
assert.equal(read('diagnostic-budget.json').closed, true);
const git = (...args) =>
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd: published, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
assert.equal(git('rev-parse', 'HEAD'), '4795a202fcd943b0c435bcabb38e98e0e79cb1ec');
assert.equal(git('status', '--porcelain'), '');
assert.equal(git('rev-parse', 'HEAD:REPORT.md'), '73abf142464b1f81676e03a1eebc766c279cb47b');
const sourceStatus = spawnSync('git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no'], { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8' });
assert.equal(sourceStatus.status, 0);
assert.equal(sourceStatus.stdout.trim(), '');
const decision = {
    findingId: 'F132', disposition: 'no-gain', recordedAt: new Date().toISOString(),
    meaning: 'Did not meet the sealed useful-gain gate; this is not a claim that the observed numerical effect was exactly zero.',
    primary: 'RegisteredShort4; four 10/11-character names and 64 retained components receiving real normal parameter delivery/rendering.',
    actualPrimaryMedianLessTimePercent: analysis.primaryMedianLessTimePercent,
    actualPrimaryEffectsPercent: analysis.pairs.map(pair => pair.profiles.find(row => row.profile === 'RegisteredShort4').lessTimePercent),
    actualLongNameSecondaryMedianLessTimePercent: analysis.pairs.map(pair => pair.profiles.find(row => row.profile === 'RegisteredLong4').lessTimePercent).sort((a, b) => a - b)[1],
    actualLongNameSecondaryNotPromotedToPrimary: true,
    actualPrimaryAllocationSavingsBytesPerParentTick: 0,
    actualRequiredPrimaryLessTimePercent: 10,
    actualStorageTradeoff: analysis.actualStorageTradeoff,
    actualComparisons: 3, actualClosedBudgetSha256: hash(path.join(run, 'diagnostic-budget.json')),
    actualNoFurtherTimingPermitted: true, actualPrototypeTunedAfterTiming: false,
    actualPublicSignaturesOrIndependentCacheAdded: false,
    actualShippingChangeRetained: false, actualSourceBranchPublished: false,
    actualPerformancePrCreated: false, actualBrowserLaunchRequested: false, actualPermanentTestsAdded: false,
    actualAllFourSourcesRestoredByteExactly: true, actualAll25OriginalConsumerFilesRestoredByteExactly: true,
    actualForcedSourceOwnerRebuildBeforeAcceptedRestoration: true,
    actualIndependentReconstruction: read('reconstruction-001/verified-reproduction.json'),
    actualAudit: read('audit-summary.json'),
    preparationDisclosures: [
        'Three actual missing-assets attempts were followed by restores only after NETSDK1004.',
        'Initial V1 probe incorrectly equated whole-renderer disposal with render-batch child removal; six terminal assertions failed. Source trace corrected the probe before timing. V1 code, images, rows and failures remain.',
        'Two MemberData rows have the same display name/testId but different executionId values; auditor now preserves all66 executions, including both rows.',
        'Supplemental twentieth Renderer source differs on actual default in unrelated event/error routing. Default snapshots are validated against Default, not Original. The original19 inputs remain Git-text identical.',
        'The first byte restoration copied older mtimes, so incremental tests still consumed the exact candidate owner. Those66 passing executions are retained separately, not called original verification. An explicit real-owner Rebuild and repeated tests then restored every original consumer byte.',
    ],
    limits: 'Managed custom-attribute registration/rendering and direct hash invariants only. Long-name stress gain does not establish common workloads. No real Session/TempData I/O, native browser, persistence-navigation, Server/WASM/Auto, AOT/trimming, complete compiler-input or whole-app claim. Existing refresh tests are not live metadata-delta proof. Common-project reconstruction is not an owner-graph rebuild.',
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
fs.mkdirSync(target);
const copied = [], omitted = [];
function walk(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const next = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file, next);
        else
        {
            assert.ok(entry.isFile());
            const bytes = fs.readFileSync(file);
            const item = { file: next, bytes: bytes.length, sha256: sha(bytes) };
            if (next.split('/').some(part => part === 'bin' || part === 'obj')) omitted.push(item);
            else
            {
                const destination = path.join(target, ...next.split('/'));
                fs.mkdirSync(path.dirname(destination), { recursive: true });
                fs.writeFileSync(destination, bytes, { flag: 'wx' });
                copied.push({ ...item, actualPrivateSource: file });
            }
        }
    }
}
walk(run);
for (const filename of ['AutoPerf.CascadingHashes.csproj', 'Program.cs'])
{
    const bytes = fs.readFileSync(path.join(common, filename));
    const relative = 'harness/' + filename;
    fs.mkdirSync(path.join(target, 'harness'), { recursive: true });
    fs.writeFileSync(path.join(target, ...relative.split('/')), bytes, { flag: 'wx' });
    copied.push({ file: relative, bytes: bytes.length, sha256: sha(bytes), actualPrivateSource: path.join(common, filename) });
}
for (const filename of ['F132-intake.mjs', 'F132-managed-command.mjs', 'F132-freeze.mjs', 'F132-reproduce-untimed.mjs', 'F132-compare.mjs', 'F132-verify.mjs', 'F132-build-capsule.mjs'])
{
    const bytes = fs.readFileSync(path.join(session, filename));
    fs.writeFileSync(path.join(target, filename), bytes, { flag: 'wx' });
    copied.push({ file: filename, bytes: bytes.length, sha256: sha(bytes), actualPrivateSource: path.join(session, filename) });
}
const json = (file, value) => fs.writeFileSync(path.join(target, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
json('authoritative-copies.json', copied);
json('omitted-file-hashes.json', { scope: 'Every individually inventoried private case bin/obj file, not all repository/compiler inputs. Historical, incomplete, accepted and reconstructed images are retained privately.', files: omitted });
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
const rows = analysis.pairs.map(pair => '| ' + pair.number + ' | ' + ['RegisteredShort4', 'RegisteredLong4', 'PlainShort4'].map(profile =>
    pair.profiles.find(row => row.profile === profile).lessTimePercent.toFixed(2) + '%').join(' | ') + ' |').join('\n');
const readme = `# F132: cached cascading-parameter name hashes

**No qualified gain; no shipping change or optimization PR.** The realistic short-name primary was numerically faster by **${analysis.primaryMedianLessTimePercent.toFixed(2)}% median** across three comparisons, below the sealed **10%** useful-gain gate. It saved **0 B/parent tick**. The intentionally long-name secondary improved **${decision.actualLongNameSecondaryMedianLessTimePercent.toFixed(2)}% median**, but cannot replace the predeclared primary after timing.

The prototype also grows each metadata record 24->32 bytes, subscription key 16->24 and retained cascading-state record 40->48. These are actual struct sizes, not a complete retained-heap measurement. The status \`no-gain\` means unqualified under the agreed gate, not literally zero numerical improvement. Three authorizations are used and permanently closed.

## Connected artifacts

| Artifact | Link |
|---|---|
| Finding and sealed acceptance | [Original F132 and protocol](plan.json), [seal](plan-seal.json), [pre-edit baseline proof](baseline-completed.json) |
| Actual tested source | [Four-file throwaway patch](prototype.patch), [original key](images-v2/Original/source/src/Components/Components/src/ComponentSubscriptionKey.cs), [candidate key](images-v2/Candidate/source/src/Components/Components/src/ComponentSubscriptionKey.cs) |
| Runnable C#13 benchmark/probe | [Exact two-input project](harness/AutoPerf.CascadingHashes.csproj), [Program](harness/Program.cs) |
| Measurements and gate | [All raw-derived analysis](measurement-analysis.json), [three closed authorizations](diagnostic-budget.json), [frozen images accepted before timing](accepted-images-before-timing.json) |
| Actual renderer lifetimes | [Original](validation/original-characterize-002/observations.json), [actual default](validation/default-characterize-001/observations.json), [candidate](validation/candidate-characterize-001/observations.json), [restored original](validation/restored-characterize-001/observations.json) |
| Existing tests | [All 330 individual XML executions](all-existing-tests-audit.json), [exact commands and results](validation-commands.md), [auditor](F132-audit-trx.ps1) |
| Fresh-project reproducibility | [Actual rebuild and both untimed roles](reconstruction-001/verified-reproduction.json), [fresh source](reconstruction-001/project/Program.cs) |
| Exact restoration | [Physical source proof](source-restoration.json), [byte-identical original](images-v2/Original/manifest.json) and [restored consumer](images-v2/RestoredOriginal/manifest.json) |
| Narrow decision and audit | [Decision](decision.json), [live evidence audit](audit-summary.json), [portable verifier](F132-verify.mjs) |
| Completeness and omitted binaries | [Authoritative copies](authoritative-copies.json), [every owned bin/obj omission](omitted-file-hashes.json), [core seal](capsule-file-hashes.json) |

## Why caching is not free

The actual source reconstructs a \`ComponentSubscriptionKey\` for every get/subscribe/unsubscribe. Caching a hash only in that fresh key would not amortize string hashing. This prototype instead computes the name hash in the **already existing per-component-type cascading metadata cache**, then carries the integer in each key. Subscriber identity and ordinal property-name equality remain unchanged; direct captured-key checks confirm exactly the original hash formula, equal strings with distinct references, case/property/subscriber distinctions, default keys and default metadata.

No separate static cache or public signature is added. Existing CascadingParameterState cache clearing creates fresh derived hashes with replacement metadata, and existing retained-component refresh rebuilds bindings/subscriptions. Those source paths and existing tests are not a claim of an actual live metadata delta. The now-unused standalone property-name local was removed only at the constructor seam that consumes the complete metadata record; no cleanup was mixed elsewhere.

Ordinary \`CascadingValueSource\` does **not** use these subscription-key dictionaries. The generic custom-attribute provider is registered by the real public \`TryAddCascadingValueSupplier\`; the persistent-state provider also uses the key. This experiment does not claim all cascading values or applications pay this cost.

## Measurements

Each operation is one synchronous real parent tick delivering four cascading values to 64 retained children and completing their renders. Each process runs three warmup and eight retained batches of 256 ticks, with every sample retained. Orders are Original/Candidate, Candidate/Original, Original/Candidate. Positive means less elapsed time; negative means slower.

| Pair | Short-name primary | Long-name secondary | Ordinary-source matched control |
|---|---|---|---|
${rows}

No profile saved update allocations. See raw values, full variability and actual producer counts below. The shared non-isolated box and fixed JIT settings limit extrapolation. Process-only overrides are TieredCompilation=0, TieredPGO=0, ReadyToRun=0; no power, affinity, priority or machine settings changed.

| Pair / role | Activated command | Raw profiles, clocks, allocations and provenance |
|---|---|---|
${[1, 2, 3].flatMap(index => ['Original', 'Candidate'].map(role =>
    `| ${index} / ${role} | [Exact command](comparison-${String(index).padStart(3, '0')}/${role}/command.ps1) | [Raw observations](comparison-${String(index).padStart(3, '0')}/${role}/observations.json) |`)).join('\n')}

## Faithful boundary and corrections

Normal reflected attributes, real DI registration and actual HtmlRenderer-created component state produce the subscriptions. Changed parent-to-child Generation values cause normal parameter delivery; the harness never manually calls framework GetCurrentValue, subscription callbacks, render methods or metadata-update events as reachability proof. Each accepted lifetime verifies exact output/read counts, retained identity, child removal, reactivation and a second real child-removal unsubscribe. All 25 original consumer files were finally restored byte for byte; original/candidate differ only in actual Components DLL/PDB, with 23 other consumer files identical.

There are **54 accepted untimed lifetime observations**, **18 timed profile lifetimes**, **378 direct key-invariant rows**, **116 selected source/PE/PDB associations** and **123 actual runtime assembly records** across the retained executions. These are repetitions of three profiles, not that many unique tests. The direct key checks are an additional invariant boundary, not the producer proof.

The initial nine-row diagnostic is retained with six expected-to-be-corrected terminal assertion failures: renderer-wide DisposeAsync does not take the same unsubscribe path as render-batch child removal. [Exact initial source and explanation](preparation-corrections.json) remain. The corrected probe explicitly removes reactivated children through the real producer before renderer disposal; no product defect is asserted here.

All 330 existing XML executions passed: **264** belong to accepted original/default/candidate/restored runs; **66** are a separately retained first restoration attempt that still consumed the exact stale candidate owner. Copying older source mtimes let incremental compilation skip the owner; the byte-identity guard caught it. [The actual timestamp/hash diagnosis](preparation-001/stale-restoration-owner.json), explicit owner Rebuild, repeated tests and successful frozen restoration remain. Do not treat that first green test run as original-owner proof.

Two numeric MemberData rows share a display name/testId, but have distinct executionId values; both XML rows are retained and checked. Three missing-assets attempts triggered restores only after NETSDK1004. The supplemental twentieth Renderer source differs on actual default in unrelated event/error routing; [the recorded delta](research/supplemental-renderer-default-diff.stdout.txt) and [default snapshot correction](preparation-001/default-freeze-correction.json) remain. Only the original 19 selected inputs were claimed Git-text identical.

## Reproduce without historical timing replay

After checking out this evidence branch, run \`node .\\F132\\F132-verify.mjs .\\F132 --require-seal\` with Node and PowerShell 7. This audits the portable recorded evidence; compiled images are deliberately omitted and hashed, so it is not newly established historical binary provenance.

To run the diagnostic afresh, genuinely build the source owners from the stated commits (Core.Tests and the Media.Tests dependency graph supplying Web/JSInterop), activating the appropriate checkout first. Copy the exact two project inputs, override ReferencePathRoot and ComponentsOwnerRoot to those compiled directories, and build the project. Its runtime is pinned to 12.0.0-alpha.1.26562.105 and C# 13. Restore only if missing assets require it. Create sibling \`bin\` and \`source\` directories matching the recorded manifest; put the selected physical source snapshots under \`source\`. Invoke \`dotnet <bin>\\AutoPerf.CascadingHashes.dll characterize <role> <output.json>\`. The independently rebuilt inputs and exact executed commands are linked above. Private orchestration scripts have this machine's absolute paths and are retained as execution evidence, not advertised as a portable bootstrap.

Do **not** replay the exhausted \`measure\` comparisons for this finding. The fresh two-input reconstruction actually repeated both original and candidate diagnostic roles while preserving each corresponding image's 23 other consumer files. It does not rebuild every historical owner/compiler input.

Original source baseline: 37e809ead5824bc753a1c3d56f11615bdb1296c5. Actual default tested: ae89581dfd24c6277b4267a9779d05f7b9f047f1. Scope excludes real Session/TempData I/O, persistence navigation, native browser/DOM, Server/WASM/Auto lifecycle, trimming/AOT, complete compiler provenance and whole-app performance. Any future shipping proposal still needs the applicable implementation, sample/permanent-coverage and live-edit work. No source PR or browser window is created for this unqualified result.
`;
fs.writeFileSync(path.join(target, 'README.md'), readme, { flag: 'wx' });
const commands = [];
for (const label of fs.readdirSync(path.join(run, 'validation')).sort())
{
    const command = read('validation/' + label + '/command.json');
    const result = read('validation/' + label + '/result.json');
    commands.push(`## ${label}\n\nActivation: \`${command.activation}\` in \`${command.cwd}\`.\n\n\`\`\`text\n"${command.executable}" ${command.arguments.map(argument => JSON.stringify(argument)).join(' ')}\n\`\`\`\n\nActual exit: **${result.exitCode}**. [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt), [receipt](validation/${label}/result.json).\n`);
}
fs.writeFileSync(path.join(target, 'validation-commands.md'), '# Actual managed commands and results\n\nThese 22 attempts include every missing-assets failure and the stale-restoration test attempt; inspect the README before interpreting a zero exit as owner restoration. The six successful comparison commands/results are linked separately in the README. No browser, packaging or full-repository command was run.\n\n' + commands.join('\n'), { flag: 'wx' });
const links = [];
for (const file of ['README.md', 'validation-commands.md'])
{
    const text = fs.readFileSync(path.join(target, file), 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g))
    {
        if (/^(https?:|#)/.test(match[1])) continue;
        const relative = match[1].split('#')[0];
        if (relative === 'capsule-file-hashes.json') continue;
        assert.ok(fs.existsSync(path.resolve(target, relative)), `${file}: broken authored link ${relative}`);
        links.push({ source: file, target: relative, actualExists: true });
    }
}
json('authored-local-links.json', { links, actualBroken: 0, actualSealSelfLinkCheckedAfterCreation: true });
const files = [];
function inventory(directory, prefix = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const relative = prefix ? prefix + '/' + entry.name : entry.name;
        if (entry.isDirectory()) inventory(path.join(directory, entry.name), relative);
        else
        {
            const bytes = fs.readFileSync(path.join(directory, entry.name));
            files.push({ file: relative, bytes: bytes.length, sha256: sha(bytes) });
        }
    }
}
inventory(target);
json('capsule-file-hashes.json', { findingId: 'F132', excludes: ['capsule-file-hashes.json', 'future additive publication.json'],
    actualSealedFiles: files.length, files });
assert.ok(fs.existsSync(path.join(target, 'capsule-file-hashes.json')));
const result = spawnSync(process.execPath, [path.join(target, 'F132-verify.mjs'), target, '--require-seal'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
assert.equal(result.status, 0, result.stderr);
const preparation = { findingId: 'F132', immutableCoreFiles: files.length + 1, actualCopiedAuthoritativeFiles: copied.length,
    actualIndividuallyHashedOmittedFiles: omitted.length, actualAuthoredLocalLinksChecked: links.length,
    actualSealedCapsuleAuditPassed: true, actualFixedReportBlob: git('rev-parse', 'HEAD:REPORT.md'),
    actualShippingTreeClean: true, actualProgressNotYetAdvanced: 131, recordedAt: new Date().toISOString() };
fs.writeFileSync(path.join(run, 'capsule-preparation.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(preparation, null, 2));
