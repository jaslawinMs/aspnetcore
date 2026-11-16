import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, action, label] = process.argv.slice(2);
assert(root && path.isAbsolute(root));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const goalsPath = path.join(root, 'resource-goals.json');
if (action === '--define')
{
    assert(!label);
    const original = read(path.join(root, 'original-manifest.json'));
    assert.equal(original.sourceTrackedUnchanged, true);
    const sourcePath = path.join('src', 'Components', 'Endpoints', 'src', 'Serialization', 'JsonStoredDataSerializer.cs');
    const sourceRecord = original.sourceFiles.find(row => row.file.replaceAll('\\', '/') === sourcePath.replaceAll('\\', '/'));
    assert(sourceRecord);
    assert.equal(hash(path.join(process.cwd(), sourcePath)), sourceRecord.sha256,
        'Resource goals must be defined before any shipping serializer edit.');
    const runtime = read(path.join(root, 'characterization', 'original', 'states', 'runtime.json'));
    assert.equal(runtime.owner.sha256, original.ownerSha256);
    assert.equal(runtime.harness.sha256, original.harnessSha256);
    const targets = [
        'DataAscii16K', 'DataAscii128K', 'DataEscaped16K', 'DataUnicode16K',
        'SessionAscii16K', 'SessionAscii128K', 'SessionEscaped16K'
    ].map(label =>
    {
        const file = path.join(root, 'characterization', 'original', 'states', `caliper-${label}.json`);
        const caliper = read(file);
        assert.equal(caliper.Label, label);
        assert.equal(caliper.samples.length, 5);
        const minimumOriginalBytes = Math.min(...caliper.samples.map(row => row.bytesPerOperation));
        assert(minimumOriginalBytes > 0);

        return {
            label, originalCaliperSha256: hash(file), minimumOriginalBytes,
            maximumSelectedBytesPerOperation: minimumOriginalBytes * 0.75,
            reductionRequiredPercent: 25
        };
    });
    write(goalsPath, {
        candidate: 'F111', definedAt: new Date().toISOString(),
        shippingSerializerStillExactOriginalSha256: sourceRecord.sha256,
        originalOwnerSha256: original.ownerSha256, harnessSha256: original.harnessSha256,
        fixtureManifestSha256: hash(path.join(root, 'fixture', 'manifest.json')), targets,
        reason: 'Observe real original allocation first,then set a25%total-allocation reduction target before any shipping edit. All five synchronous owning-call thread-allocation samples must meet each target;timing remains BenchmarkDotNet only. Original/caliper process-wide counter differences are retained,not attributed.',
        intentionallyExcludedClaims: 'No bounded/segmented/pooled-buffer,eliminated final result copy,production frequency,external cache I/O,HTTP throughput,or exact resize/copy attribution.'
    });
    console.log('F111 seven original-derived resource goals recorded before shipping implementation.');
}
else
{
    assert.equal(action, '--check');
    assert(/^[a-z0-9-]+$/.test(label));
    const goals = read(goalsPath);
    const directory = path.join(root, 'characterization', label, 'states');
    const runtime = read(path.join(directory, 'runtime.json'));
    assert.equal(runtime.harness.sha256, goals.harnessSha256);
    assert.equal(runtime.fixtureManifestSha256, goals.fixtureManifestSha256);
    const rows = goals.targets.map(target =>
    {
        const file = path.join(directory, `caliper-${target.label}.json`);
        const actual = read(file);
        assert.equal(actual.Label, target.label);
        assert.equal(actual.samples.length, 5);
        const maximumObservedBytes = Math.max(...actual.samples.map(row => row.bytesPerOperation));

        return {
            label: target.label, samplesChecked: actual.samples.length, maximumObservedBytes,
            maximumAllowedBytes: target.maximumSelectedBytesPerOperation,
            passed: maximumObservedBytes <= target.maximumSelectedBytesPerOperation,
            caliperSha256: hash(file)
        };
    });
    const result = {
        candidate: 'F111', label, goalsSha256: hash(goalsPath), ownerSha256: runtime.owner.sha256,
        harnessSha256: runtime.harness.sha256, rows,
        passed: rows.filter(row => row.passed).length, failed: rows.filter(row => !row.passed).length,
        reason: 'Actual warmed complete owning calls;not an assertion over a copied writer or the unchanged semantic controls.'
    };
    write(path.join(root, `resource-check-${label}.json`), result);
    console.log(JSON.stringify(result, null, 2));
    if (result.failed)
    {
        process.exitCode = 1;
    }
}
