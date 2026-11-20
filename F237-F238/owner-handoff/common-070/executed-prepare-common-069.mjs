import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F237-F238-059');
const previous = path.join(root, 'common-066'), current = path.join(root, 'common-070');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => fs.readFileSync(file);
assert(!fs.existsSync(current));
const failures = [];
for (const role of ['Original', 'Default']) {
    const directory = path.join(root, `common-${role}-Run-first-066`);
    const receiptBytes = read(path.join(directory, 'exit.json'));
    const receipt = JSON.parse(receiptBytes);
    assert.equal(receipt.actualExitCode, -532462766);
    const stderr = read(path.join(directory, 'stderr.txt'));
    assert(stderr.toString('utf8').includes("Could not load file or assembly 'Microsoft.AspNetCore.Authorization.Policy,"));
    failures.push({ role, actualReceiptSha256: hash(receiptBytes), actualStderrSha256: hash(stderr),
        actualFailedBeforeCharacterizationAssertions: true, actualUnchangedFailedBinarySha256: receipt.actualInputConsumerSha256 });
}
assert.equal(failures[0].actualUnchangedFailedBinarySha256, failures[1].actualUnchangedFailedBinarySha256);
fs.mkdirSync(current);
for (const name of ['fixture-plan.json', 'fixture-input-inventory.json', 'reference-inputs.json']) {
    fs.copyFileSync(path.join(previous, name), path.join(current, name), fs.constants.COPYFILE_EXCL);
}
fs.cpSync(path.join(previous, 'fixture-inputs'), path.join(current, 'fixture-inputs'), {
    recursive: true, errorOnExist: true, force: false
});
fs.copyFileSync(path.join(session, 'F237-F238-Probe-061.cs'), path.join(current, 'Program.cs'), fs.constants.COPYFILE_EXCL);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(current, 'executed-prepare-common-069.mjs'));
const previousSource = read(path.join(previous, 'Program.cs')).toString('utf8');
const source = read(path.join(current, 'Program.cs')).toString('utf8');
const lineEnding = previousSource.includes('\r\n') ? '\r\n' : '\n';
assert.equal(source, previousSource
    .replace('services.AddRazorPages(options => options.RootDirectory = fixture.RootDirectory)',
        'services.AddMvcCore().AddRazorPages(options => options.RootDirectory = fixture.RootDirectory)')
    .replace('            actualRealPhysicalFileProviderNativeRazorDirectiveFactoryAndPublicRegistrationExecuted = true,' + lineEnding,
        '            actualRealPhysicalFileProviderNativeRazorDirectiveFactoryAndPublicRegistrationExecuted = true,' + lineEnding +
        '            actualPublicRegistrationBoundary = "AddMvcCore().AddRazorPages(...).AddRazorRuntimeCompilation(); not the broader IServiceCollection.AddRazorPages() aggregate",' + lineEnding));
const response = read(path.join(previous, 'compile.rsp')).toString('utf8').replaceAll(previous, current);
fs.writeFileSync(path.join(current, 'compile.rsp'), response, { flag: 'wx' });
const previousPlan = JSON.parse(read(path.join(previous, 'compile-plan.json')));
const plan = {
    ...previousPlan, recordedAt: new Date().toISOString(),
    actualSourceSha256: hash(read(path.join(current, 'Program.cs'))),
    actualResponseFileSha256: hash(Buffer.from(response)),
    actualPreviousFrozenPlanSha256: hash(read(path.join(previous, 'compile-plan.json'))),
    actualSourceFixturePlanAndReferenceInputBytesUnchanged: false,
    actualFixtureAndReferenceInputBytesUnchanged: true,
    actualFailedFullAggregateRegistrationRuns: failures,
    actualOnlyConsumerBoundaryChange: 'Use the actual public IMvcCoreBuilder AddRazorPages and AddRazorRuntimeCompilation registrations. The native test graph lacks Authorization.Policy, required by the broader IServiceCollection aggregate. No framework image is substituted or dependency graph merged.',
    actualBroaderAddRazorPagesAggregateAndFullHttpPipelineNotEstablished: true,
    actualNativeMinimalPublicRegistrationFactoryFileSystemDirectiveProducerStillRequired: true,
    actualNoCandidateOrPerformanceDatasetOrAuthorization: true
};
assert.equal(hash(read(path.join(current, 'fixture-plan.json'))), plan.actualFixturePlanSha256);
fs.writeFileSync(path.join(current, 'compile-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPrepared: true, actualNewCohort: current,
    actualPriorFailedFullRegistrationRunsPreserved: 2, actualFrozenPhysicalFixtureCasesUnchanged: 6,
    actualNewBoundary: 'Actual public IMvcCoreBuilder registrations; full aggregate/HTTP explicitly excluded',
    actualNoCompilerStarted: true }, null, 2));
