$ErrorActionPreference = 'Stop'
$root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225'
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Write-NewJson
{
    param([string] $Path, [object] $Value)
    if (Test-Path -LiteralPath $Path)
    {
        throw "Sealed output already exists: $Path"
    }
    [System.IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 100) + "`n", $utf8)
}

function Get-FileReceipt
{
    param([string] $Path)
    $item = Get-Item -LiteralPath $Path
    [ordered]@{
        path = [System.IO.Path]::GetRelativePath($root, $item.FullName)
        bytes = $item.Length
        sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    }
}

$launches = @(Get-ChildItem -LiteralPath $root -File -Filter 'source-capture-225-v00?.launch.json' | Sort-Object Name)
if ($launches.Count -ne 6)
{
    throw "Expected six finite source-only launcher exit receipts; found $($launches.Count)"
}
$summaryJsonRecordsParsed = 0
$launchReceipts = foreach ($file in $launches)
{
    $value = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -Depth 100
    if ($value.exitCode -ne 0)
    {
        throw "A source-only launcher did not complete successfully: $($file.Name)"
    }
    foreach ($line in (Get-Content -LiteralPath (Join-Path $root $value.stdout)))
    {
        if (-not [string]::IsNullOrWhiteSpace($line))
        {
            $null = $line | ConvertFrom-Json -Depth 100
            $summaryJsonRecordsParsed++
        }
    }
    [ordered]@{
        launchReceipt = $file.Name
        executable = $value.executable
        argv = $value.argv
        startedAtUtc = $value.startedAtUtc
        completedAtUtc = $value.completedAtUtc
        actualExitCode = $value.exitCode
        stdout = Get-FileReceipt (Join-Path $root $value.stdout)
        stderr = Get-FileReceipt (Join-Path $root $value.stderr)
    }
}
$handoff = Get-Content -LiteralPath (Join-Path $root 'HANDOFF.json') -Raw | ConvertFrom-Json -Depth 100
if ($handoff.state -ne 'SOURCE_NO_CANDIDATE_MATERIALITY_NOT_ESTABLISHED')
{
    throw 'Unexpected handoff disposition'
}
$owned = [ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    owner = '2d68b596-6cf0-421c-8e56-42a1a990cb9e'
    preparation = 225
    status = 'TERMINAL_SOURCE_ONLY'
    sourceHelperLaunchesObservedExited = @($launchReceipts)
    sourceChildren = 'Each git/gh child and both redirected streams were synchronously awaited by its immutable helper; command/stream/exit receipts are retained and re-read.'
    nativeBuildTestOrDotnetRuntimeRootsStarted = @()
    benchmarkRootsStarted = @()
    remoteJobsStarted = @()
    outstandingOwnedBuildTestOrBenchmarkWork = @()
    sourceOnlyMetadataSealerPid = $PID
    metadataSealerInvocation = [ordered]@{
        script = $PSCommandPath
        argv = @($args)
        cwd = (Get-Location).Path
        powerShellVersion = $PSVersionTable.PSVersion.ToString()
        explicitEnvironmentChanges = @{}
        inheritedEnvironment = 'Inherited; values not dumped to avoid unrelated credentials.'
        outputAndActualCompletion = 'Final sealing summary and actual command exit are in the tool response. This script launches no child process.'
    }
    sourceOnlyMetadataSealerChildProcessesStarted = @()
    processStopsPerformed = @()
    limitation = 'No machine-dedication, unrelated-process inactivity, loaded .NET runtime identity, or universal descendant claim. Existing LSP servers were not launched or stopped by this worker. Earlier source-only helpers v001/v002 did not record source child PIDs; their actual awaited exits/streams and launcher exits are retained.'
    reservedClose = 'capture-v006\reserved-close.json'
}
Write-NewJson (Join-Path $root 'terminal-owned-work-225.json') $owned

$jsonFiles = @(Get-ChildItem -LiteralPath $root -File -Recurse -Filter '*.json' | Sort-Object FullName)
$jsonReceipts = foreach ($file in $jsonFiles)
{
    $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -Depth 100
    Get-FileReceipt $file.FullName
}
Write-NewJson (Join-Path $root 'json-reread-verification-225.json') ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    status = 'PASS'
    kind = 'Every then-existing generated .json re-read and parsed; this record, the artifact index, and the seal are separately re-read immediately after creation.'
    jsonFilesParsed = $jsonFiles.Count
    sourceHelperSummaryJsonRecordsReReadAndParsed = $summaryJsonRecordsParsed
    files = @($jsonReceipts)
})
$null = Get-Content -LiteralPath (Join-Path $root 'json-reread-verification-225.json') -Raw | ConvertFrom-Json -Depth 100

$indexPath = Join-Path $root 'artifact-index-225.json'
$sealPath = Join-Path $root 'SEAL-225.json'
$files = @(Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object { $_.FullName -notin @($indexPath, $sealPath) } | Sort-Object FullName)
$entries = @($files | ForEach-Object { Get-FileReceipt $_.FullName })
Write-NewJson $indexPath ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    finding = 'F207'
    preparation = 225
    evidenceRoot = $root
    algorithm = 'SHA256'
    indexedFiles = $entries.Count
    exclusions = @(
        'artifact-index-225.json: its exact bytes/hash are recorded in SEAL-225.json to avoid recursive self-hashing.',
        'SEAL-225.json: terminal envelope; its exact bytes/hash are returned by the sealing command.'
    )
    files = $entries
})
$index = Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json -Depth 100
foreach ($entry in $index.files)
{
    $actual = Get-FileReceipt (Join-Path $root $entry.path)
    if ($actual.bytes -ne $entry.bytes -or $actual.sha256 -ne $entry.sha256)
    {
        throw "Artifact changed during sealing: $($entry.path)"
    }
}
Write-NewJson $sealPath ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    finding = 'F207'
    preparation = 225
    owner = '2d68b596-6cf0-421c-8e56-42a1a990cb9e'
    state = $handoff.state
    scope = 'Private source-only evidence; coordinator alone accepts/finalizes/publishes.'
    indexedFiles = $entries.Count
    indexedBytes = ($entries | Measure-Object -Property bytes -Sum).Sum
    artifactIndex = Get-FileReceipt $indexPath
    handoff = Get-FileReceipt (Join-Path $root 'HANDOFF.json')
    terminalOwnedWork = Get-FileReceipt (Join-Path $root 'terminal-owned-work-225.json')
    jsonRereadVerification = Get-FileReceipt (Join-Path $root 'json-reread-verification-225.json')
    allIndexedArtifactsReReadAndRehashed = $true
    noNativeOrPerformanceQualificationClaim = $true
    recursiveSelfHashExcluded = $true
})
$null = Get-Content -LiteralPath $sealPath -Raw | ConvertFrom-Json -Depth 100
$sealReceipt = Get-FileReceipt $sealPath
[ordered]@{
    state = $handoff.state
    indexedFiles = $entries.Count
    handoff = 'HANDOFF.json'
    seal = $sealReceipt
    sourceOnly = $true
    nativeBuildTestAndMeasurementCount = 0
} | ConvertTo-Json -Depth 10 -Compress
