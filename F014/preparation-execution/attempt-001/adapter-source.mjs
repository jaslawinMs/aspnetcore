import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const original = fs.readFileSync(path.join(session, 'F012-prepare-original.ps1'));
let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F014');
const changes = [];
function edit(before, after, count = 1) {
  assert.equal(content.split(before).length - 1, count, before);
  content = content.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
edit('newBroadcastProducerObservationsRequired', 'newUserSendProducerObservationsRequired');
edit('priorGroupObservationsOrTimingReused', 'priorGroupBroadcastConnectionObservationsOrTimingReused');
edit('New broadcast harness', 'New user-send harness');
edit('f012ActualBroadcastCharacterizationRequired', 'f014ActualUserSendCharacterizationRequired');
edit('priorF011GroupResultsReusedAsBroadcastProof', 'priorGroupBroadcastConnectionResultsReusedAsUserSendProof');
edit('F014 independent original/current broadcast probes', 'F014 independent original/current user-send probes');
edit("New-Item (Join-Path $originalSources 'harness') -ItemType Directory | Out-Null", `$additionalSources = @(
    @{ from = 'src\\SignalR\\server\\Core\\src\\DefaultUserIdProvider.cs'; destination = 'owner\\DefaultUserIdProvider.cs' },
    @{ from = 'src\\SignalR\\server\\Core\\src\\IUserIdProvider.cs'; destination = 'owner\\IUserIdProvider.cs' },
    @{ from = 'src\\Servers\\Connections.Abstractions\\src\\Features\\IConnectionUserFeature.cs'; destination = 'producer\\IConnectionUserFeature.cs' }
)
foreach ($source in $additionalSources)
{
    $from = Join-Path $repo $source.from
    $to = Join-Path $originalSources $source.destination
    if ((Test-Path $to) -and (Get-FileHash $to).Hash -cne (Get-FileHash $from).Hash)
    {
        throw 'An existing frozen producer source differs from the selected actual baseline source.'
    }
    Copy-Item $from $to
}
New-Item (Join-Path $originalSources 'harness') -ItemType Directory | Out-Null`);
edit('$sourceFiles = Describe $originalSources\nif ($files.Count -ne 80 -or $sourceFiles.Count -ne 89)',
  `$sourceFiles = Describe $originalSources
$expectedSourcePaths = @(
    $priorManifest.sources | Where-Object { -not $_.path.StartsWith('harness\\') } | ForEach-Object { $_.path }
    Get-ChildItem $harness -File | Where-Object { $_.Extension -in '.cs', '.csproj' } | ForEach-Object { "harness\\$($_.Name)" }
    $additionalSources | ForEach-Object { $_.destination }
) | Sort-Object -Unique
if (@(Compare-Object -CaseSensitive @($expectedSourcePaths) @($sourceFiles.path)).Count -or
    $files.Count -ne 80 -or $sourceFiles.Count -ne $expectedSourcePaths.Count)`);
edit("sourceCandidateShapes = 0; pairedComparisons = 0; files = $files; sources = $sourceFiles",
  `sourceCandidateShapes = 0; pairedComparisons = 0; files = $files; sources = $sourceFiles
    derivedSourceCatalogCount = $sourceFiles.Count; actualAdditionalSourceRequests = $additionalSources
    expectedSourcePathsVerifiedExactly = $expectedSourcePaths`);
const destination = path.join(session, 'F014-prepare-original.ps1');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, content);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'preparation-tools-attribution.json'), JSON.stringify({
  candidate: 'F014', template: 'F012-prepare-original.ps1', templateSha256: hash(original),
  resultSha256: hash(Buffer.from(content)), changes,
  qualification: 'Independent actual user-send harness/preparation. Source-catalog paths are derived and exact-compared: prior snapshots already include DefaultUserIdProvider/IUserIdProvider; the feature interface adds one source, not three. No timings or prior method observations reused.',
}, null, 2) + '\n');
console.log('F014 preparation driver adapted with exact derived source-catalog validation and explicitly borrowed historical test/JSON bytes.');
