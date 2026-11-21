$ErrorActionPreference = 'Stop'
$root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225'
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Write-NewJson
{
    param([string] $Path, [object] $Value)
    if (Test-Path -LiteralPath $Path)
    {
        throw "Append-only correction already exists: $Path"
    }
    [System.IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 100) + "`n", $utf8)
}

function Get-FileReceipt
{
    param([string] $Path)
    $item = Get-Item -LiteralPath $Path
    [pscustomobject][ordered]@{
        path = [System.IO.Path]::GetRelativePath($root, $item.FullName)
        bytes = [long] $item.Length
        sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    }
}

$oldSealPath = Join-Path $root 'SEAL-225.json'
$oldSealReceipt = Get-FileReceipt $oldSealPath
if ($oldSealReceipt.sha256 -ne '2DA9E0F5B6080F1693049B9F67A7F608AEF35D96D3272913F2AA7E5820D871F9')
{
    throw 'Original seal bytes changed; correction stopped'
}
$oldSeal = Get-Content -LiteralPath $oldSealPath -Raw | ConvertFrom-Json -Depth 100
$oldIndex = Get-Content -LiteralPath (Join-Path $root $oldSeal.artifactIndex.path) -Raw | ConvertFrom-Json -Depth 100
[long] $oldIndexedBytes = 0
foreach ($entry in $oldIndex.files)
{
    $actual = Get-FileReceipt (Join-Path $root $entry.path)
    if ($actual.bytes -ne $entry.bytes -or $actual.sha256 -ne $entry.sha256)
    {
        throw "Original indexed artifact changed: $($entry.path)"
    }
    $oldIndexedBytes += [long] $actual.bytes
}
Write-NewJson (Join-Path $root 'seal-metadata-correction-225.json') ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    kind = 'Append-only metadata correction; no earlier helper or output is edited or replayed.'
    observedIssue = 'SEAL-225.json indexedBytes is null rather than a numeric aggregate. Its 454 per-file byte counts and SHA256 values remain intact and were independently re-read/rehashed here.'
    originalSeal = $oldSealReceipt
    originalIndexedFiles = $oldIndex.indexedFiles
    originalIndexedBytesCorrected = $oldIndexedBytes
    correctionMethod = 'Explicit Int64 addition of re-read actual file lengths; no Measure-Object aggregate.'
    originalHandoffAndSourceResultsUnchanged = $true
    sourceOnlyMetadataPid = $PID
    childProcessesStarted = @()
    nativeBuildTestOrMeasurements = 0
    authoritativeCompleteEvidenceEnvelope = 'SEAL-225-v002.json'
})

$jsonFiles = @(Get-ChildItem -LiteralPath $root -File -Recurse -Filter '*.json' | Sort-Object FullName)
foreach ($file in $jsonFiles)
{
    $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -Depth 100
}
Write-NewJson (Join-Path $root 'json-reread-verification-225-v002.json') ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    status = 'PASS'
    thenExistingJsonFilesReReadAndParsed = $jsonFiles.Count
    originalIndexFilesReReadAndRehashed = $oldIndex.indexedFiles
    laterGeneratedRecords = 'This record, the v002 artifact index, and the v002 seal are re-read after creation.'
})
$null = Get-Content -LiteralPath (Join-Path $root 'json-reread-verification-225-v002.json') -Raw | ConvertFrom-Json -Depth 100

$indexPath = Join-Path $root 'artifact-index-225-v002.json'
$sealPath = Join-Path $root 'SEAL-225-v002.json'
$files = @(Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object { $_.FullName -notin @($indexPath, $sealPath) } | Sort-Object FullName)
$entries = @($files | ForEach-Object { Get-FileReceipt $_.FullName })
[long] $totalBytes = 0
foreach ($entry in $entries)
{
    $totalBytes += [long] $entry.bytes
}
Write-NewJson $indexPath ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    finding = 'F207'
    preparation = 225
    evidenceRoot = $root
    algorithm = 'SHA256'
    indexedFiles = $entries.Count
    indexedBytes = $totalBytes
    exclusions = @(
        'artifact-index-225-v002.json: exact bytes/SHA256 recorded in SEAL-225-v002.json.',
        'SEAL-225-v002.json: terminal envelope; exact bytes/SHA256 returned in the tool response.'
    )
    preservesOriginalHandoffAndSeal = $true
    files = $entries
})
$index = Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json -Depth 100
[long] $verifiedBytes = 0
foreach ($entry in $index.files)
{
    $actual = Get-FileReceipt (Join-Path $root $entry.path)
    if ($actual.bytes -ne $entry.bytes -or $actual.sha256 -ne $entry.sha256)
    {
        throw "v002 indexed artifact changed: $($entry.path)"
    }
    $verifiedBytes += [long] $actual.bytes
}
if ($verifiedBytes -ne $totalBytes)
{
    throw 'Explicit aggregate validation failed'
}
Write-NewJson $sealPath ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    finding = 'F207'
    preparation = 225
    owner = '2d68b596-6cf0-421c-8e56-42a1a990cb9e'
    state = 'SOURCE_NO_CANDIDATE_MATERIALITY_NOT_ESTABLISHED'
    scope = 'Private source-only append-only evidence envelope; coordinator alone accepts/finalizes/publishes.'
    indexedFiles = $entries.Count
    indexedBytes = $verifiedBytes
    artifactIndex = Get-FileReceipt $indexPath
    unchangedHandoff = Get-FileReceipt (Join-Path $root 'HANDOFF.json')
    originalSealPreserved = Get-FileReceipt $oldSealPath
    correction = Get-FileReceipt (Join-Path $root 'seal-metadata-correction-225.json')
    terminalOwnedWork = Get-FileReceipt (Join-Path $root 'terminal-owned-work-225.json')
    allGeneratedJsonReReadAndAllIndexedArtifactsRehashed = $true
    currentMetadataOnlyPid = $PID
    childProcessesStarted = @()
    nativeBuildTestAndMeasurementCount = 0
    recursiveSelfHashExcluded = $true
})
$null = Get-Content -LiteralPath $sealPath -Raw | ConvertFrom-Json -Depth 100
[ordered]@{
    state = 'SOURCE_NO_CANDIDATE_MATERIALITY_NOT_ESTABLISHED'
    indexedFiles = $entries.Count
    indexedBytes = $verifiedBytes
    unchangedHandoff = 'HANDOFF.json'
    finalEnvelope = Get-FileReceipt $sealPath
    originalSealAndNullAggregatePreserved = $true
    childProcessesStarted = 0
} | ConvertTo-Json -Depth 10 -Compress
