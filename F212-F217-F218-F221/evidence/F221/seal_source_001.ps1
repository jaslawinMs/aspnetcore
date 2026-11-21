$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Write-NewJson([string]$Relative, $Value)
{
    $target = Join-Path $PSScriptRoot $Relative
    if (Test-Path -LiteralPath $target) { throw "Refusing to overwrite: $Relative" }
    [System.IO.File]::WriteAllText($target, (($Value | ConvertTo-Json -Depth 100) + "`n"), $utf8)
}

function Read-StrictJson([string]$FullPath)
{
    $text = [System.IO.File]::ReadAllText($FullPath, $utf8)
    $document = [System.Text.Json.JsonDocument]::Parse($text)
    $document.Dispose()
    return ($text | ConvertFrom-Json -Depth 100)
}

function Get-BytesRecord([string]$FullPath)
{
    [byte[]]$bytes = [System.IO.File]::ReadAllBytes($FullPath)
    return [ordered]@{
        bytes = $bytes.Length
        sha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes))
    }
}

if ((Test-Path -LiteralPath (Join-Path $PSScriptRoot 'artifact-index.json')) -or
    (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'SEAL.json')))
{
    throw 'Seal already exists; no replay is permitted.'
}

$expectedExits = @{
    'capture_source_001' = 9009
    'capture_source_002' = 1
    'capture_source_003' = 0
    'capture_source_004' = 0
    'capture_source_005' = 0
    'capture_source_006' = 0
}
$rootSummary = @()
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'launches') -Recurse -Filter 'receipt.json' -File)
{
    $receipt = Read-StrictJson $file.FullName
    $name = $file.Directory.Name
    if (-not $expectedExits.ContainsKey($name) -or $receipt.exitCode -ne $expectedExits[$name])
    {
        throw "Unexpected source-helper exit: $name"
    }
    if (-not $receipt.processWaited -or -not $receipt.stdoutDrained -or
        -not $receipt.stderrDrained -or -not $receipt.processObjectDisposed)
    {
        throw "Incomplete source-helper terminal receipt: $name"
    }
    $rootSummary += [ordered]@{
        helper = $receipt.helper
        pid = $receipt.pid
        launcherPid = $receipt.launcherPid
        exitCode = $receipt.exitCode
        waited = $receipt.processWaited
        stdoutDrained = $receipt.stdoutDrained
        stderrDrained = $receipt.stderrDrained
        processObjectDisposed = $receipt.processObjectDisposed
        receipt = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
    }
}
if ($rootSummary.Count -ne 6) { throw 'Expected all six immutable source-helper attempt receipts.' }

$commandSummary = @()
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'commands') -Recurse -Filter 'receipt.json' -File)
{
    $receipt = Read-StrictJson $file.FullName
    if (-not $receipt.exitAcceptable -or -not $receipt.processWaited -or
        -not $receipt.stdoutDrained -or -not $receipt.stderrDrained -or
        -not $receipt.handlesClosedBySpawnSync)
    {
        throw "Incomplete source-command receipt: $($receipt.label)"
    }
    foreach ($stream in @('stdout', 'stderr'))
    {
        $actual = Get-BytesRecord (Join-Path $file.Directory.FullName ($stream + '.bin'))
        if ($actual.bytes -ne $receipt.($stream + 'Bytes') -or
            $actual.sha256 -ne $receipt.($stream + 'Sha256'))
        {
            throw "Source-command stream changed: $($receipt.label) $stream"
        }
    }
    $commandSummary += [ordered]@{
        label = $receipt.label
        pid = $receipt.pid
        owningHelperPid = $receipt.owningHelperPid
        exitCode = $receipt.exitCode
        waitedAndBothStreamsDrained = $true
        receipt = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
    }
}
Write-NewJson 'process-summary.json' ([ordered]@{
    observedSourceHelperRoots = $rootSummary
    rootCount = $rootSummary.Count
    expectedFailedRootAttempts = 2
    directSourceCommandCount = $commandSummary.Count
    directSourceCommands = $commandSummary
    allDirectSourceChildrenWaitedAndStreamsDrained = $true
    outstandingOwnedBuildTestApplicationWork = @()
    buildsTestsRestoresBenchmarks = @()
    processStops = @()
    systemWideQuiescenceClaim = $false
    sealer = [ordered]@{
        pid = $PID
        argv = [Environment]::CommandLine
        externalChildrenStarted = 0
        completionEvidence = 'The enclosing synchronous functions.powershell result must report exit0. This script cannot self-attest its future process exit.'
    }
})

$handoff = Read-StrictJson (Join-Path $PSScriptRoot 'HANDOFF.json')
if ($handoff.terminalDisposition -ne 'source-only-no-material-candidate') { throw 'Unexpected handoff disposition.' }
$candidate = Get-BytesRecord (Join-Path $PSScriptRoot 'candidate.diff')
if ($candidate.bytes -ne 0) { throw 'Source-only handoff has nonempty candidate diff.' }
$reserved = Read-StrictJson (Join-Path $PSScriptRoot 'reserved-terminal.json')
if (-not $reserved.allRecordedLogicalStateUnchanged) { throw 'Reserved checkout logical state changed.' }

$jsonChecks = @()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -Filter '*.json' -File)
{
    $null = Read-StrictJson $file.FullName
    $jsonChecks += [ordered]@{
        path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
        expectedValid = $true
        actualValid = $true
    }
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'commands') -Recurse -Filter 'stdout.bin' -File)
{
    if ($file.Directory.Name -like '*contents-*' -or
        $file.Directory.Name -in @('fresh-upstream-main-ref', 'default-analyzer-history'))
    {
        $null = Read-StrictJson $file.FullName
        $jsonChecks += [ordered]@{
            path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
            expectedValid = $true
            actualValid = $true
        }
    }
}
$malformedPath = Join-Path $PSScriptRoot 'guards\policy-source003.bin'
$malformedRejected = $false
$malformedError = $null
try { $null = Read-StrictJson $malformedPath }
catch
{
    $malformedRejected = $true
    $malformedError = $_.Exception.Message
}
if (-not $malformedRejected) { throw 'Malformed-policy failure artifact unexpectedly parses.' }
$jsonChecks += [ordered]@{
    path = 'guards\policy-source003.bin'
    expectedValid = $false
    actualValid = $false
    expectedHistoricalFailurePreserved = $true
    parseError = $malformedError
}
$null = Read-StrictJson (Join-Path $PSScriptRoot 'guards\policy-terminal.bin')
$jsonChecks += [ordered]@{
    path = 'guards\policy-terminal.bin'
    expectedValid = $true
    actualValid = $true
}
Write-NewJson 'json-validation.json' ([ordered]@{
    allExpectedOutcomesMatched = $true
    checks = $jsonChecks
    checkCount = $jsonChecks.Count
    validator = 'System.Text.Json.JsonDocument.Parse followed by ConvertFrom-Json'
    finalIndexAndSealParsedAfterTheirCreation = $true
})
$null = Read-StrictJson (Join-Path $PSScriptRoot 'json-validation.json')

$entries = @()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Sort-Object FullName)
{
    $record = Get-BytesRecord $file.FullName
    $entries += [ordered]@{
        path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
        bytes = $record.bytes
        sha256 = $record.sha256
    }
}
Write-NewJson 'artifact-index.json' ([ordered]@{
    finding = 'F221'
    owner = 'ac5fbaab-9a69-42c1-81ff-6fdc625139ba'
    root = $PSScriptRoot
    payloadFileCount = $entries.Count
    exclusions = @('artifact-index.json', 'SEAL.json')
    exclusionReason = 'Index is bound by SEAL; SEAL self-hash is reported externally to avoid recursive self-hashing.'
    entries = $entries
})
$index = Read-StrictJson (Join-Path $PSScriptRoot 'artifact-index.json')
foreach ($entry in $index.entries)
{
    $actual = Get-BytesRecord (Join-Path $PSScriptRoot $entry.path)
    if ($actual.bytes -ne $entry.bytes -or $actual.sha256 -ne $entry.sha256)
    {
        throw "Indexed payload changed during final reread: $($entry.path)"
    }
}
$indexRecord = Get-BytesRecord (Join-Path $PSScriptRoot 'artifact-index.json')
$handoffRecord = Get-BytesRecord (Join-Path $PSScriptRoot 'HANDOFF.json')
$validationRecord = Get-BytesRecord (Join-Path $PSScriptRoot 'json-validation.json')
Write-NewJson 'SEAL.json' ([ordered]@{
    schemaVersion = 1
    finding = 'F221'
    owner = 'ac5fbaab-9a69-42c1-81ff-6fdc625139ba'
    sealedUtc = [DateTime]::UtcNow.ToString('O')
    disposition = $handoff.terminalDisposition
    measuredNoGain = $false
    artifactIndex = [ordered]@{ path = 'artifact-index.json'; bytes = $indexRecord.bytes; sha256 = $indexRecord.sha256 }
    handoff = [ordered]@{ path = 'HANDOFF.json'; bytes = $handoffRecord.bytes; sha256 = $handoffRecord.sha256 }
    jsonValidation = [ordered]@{ path = 'json-validation.json'; sha256 = $validationRecord.sha256 }
    candidateDiff = [ordered]@{ path = 'candidate.diff'; bytes = $candidate.bytes; sha256 = $candidate.sha256 }
    payloadFiles = $entries.Count
    payloadBytes = ($entries | Measure-Object -Property bytes -Sum).Sum
    everyIndexedFileReReadAndRehashed = $true
    allExpectedJsonParseOutcomesMatched = $true
    sourceHelperRootsVerified = $rootSummary.Count
    directSourceCommandsVerified = $commandSummary.Count
    ownedBuildTestApplicationWorkOutstanding = @()
    finalSealerPid = $PID
    finalSealerExternalChildren = 0
    finalSealerExitRequiresExternalToolReceipt = $true
})
$null = Read-StrictJson (Join-Path $PSScriptRoot 'SEAL.json')
$sealRecord = Get-BytesRecord (Join-Path $PSScriptRoot 'SEAL.json')
Write-Output "F221 source-only-no-material-candidate; not measured no-gain"
Write-Output "HANDOFF.json SHA256=$($handoffRecord.sha256)"
Write-Output "artifact-index.json SHA256=$($indexRecord.sha256)"
Write-Output "SEAL.json SHA256=$($sealRecord.sha256)"
Write-Output "PayloadFiles=$($entries.Count); SourceHelperRoots=$($rootSummary.Count); DirectSourceCommands=$($commandSummary.Count); OutstandingBuildTestApplicationWork=0"
