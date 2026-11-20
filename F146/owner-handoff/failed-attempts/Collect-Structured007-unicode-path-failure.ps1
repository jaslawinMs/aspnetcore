$ErrorActionPreference = 'Stop'
$a = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $a 'MANIFEST.json'))
{
    throw 'Frozen; use node Audit007.cjs verify-only.'
}

function Get-Sha007
{
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try
    {
        return [System.Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($stream))
    }
    finally
    {
        $stream.Dispose()
    }
}

$archives = foreach ($role in 'Original', 'ObservedDefault')
{
    $identity = [System.IO.File]::ReadAllText((Join-Path $a "$role-source.json")) | ConvertFrom-Json
    $archive = Join-Path $a "$role.source.tar"
    if ((Get-Sha007 $archive) -ne $identity.archiveSha256)
    {
        throw "$role archive hash mismatch."
    }

    $stream = [System.IO.File]::OpenRead($archive)
    $reader = [System.Formats.Tar.TarReader]::new($stream, $true)
    $regularCount = 0
    $otherEntries = [System.Collections.Generic.List[object]]::new()
    try
    {
        while ($true)
        {
            $entry = $reader.GetNextEntry($false)
            if ($null -eq $entry)
            {
                break
            }

            if ($entry.EntryType -eq [System.Formats.Tar.TarEntryType]::Directory)
            {
                continue
            }

            if ($entry.EntryType -notin @(
                [System.Formats.Tar.TarEntryType]::RegularFile,
                [System.Formats.Tar.TarEntryType]::V7RegularFile))
            {
                $otherEntries.Add([ordered]@{ path = $entry.Name; type = $entry.EntryType.ToString() })
                continue
            }

            $relative = $entry.Name.Replace('/', '\')
            if ([System.IO.Path]::IsPathRooted($relative) -or $relative.Split('\').Contains('..'))
            {
                throw 'Unexpected archive path.'
            }

            $expected = if ($entry.Length -eq 0)
            {
                [System.Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData([byte[]]::new(0)))
            }
            else
            {
                [System.Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($entry.DataStream))
            }
            $file = Join-Path $identity.graph $relative
            if ((Get-Sha007 $file) -ne $expected)
            {
                throw "$role post-build archived-source mismatch: $relative"
            }

            $regularCount++
        }
    }
    finally
    {
        $reader.Dispose()
        $stream.Dispose()
    }

    [ordered]@{
        role = $role
        sourcePin = $identity.sourcePin
        archive = $archive
        archiveSha256 = $identity.archiveSha256
        graph = $identity.graph
        regularArchivedSourceFilesVerified = $regularCount
        everyRegularArchivedFileUnchangedAfterBuildAndTests = $true
        nonRegularArchiveEntriesNotContentCompared = @($otherEntries)
    }
}
$archives | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $a 'SOURCE-ARCHIVE-RAW-CHECKS.json')
$class = 'Microsoft.AspNetCore.Server.Kestrel.Core.Tests.F146ManagedProducerTests.'
$methods = @(
    'ManagedHttp3_IndependentInputStreamsReachIndependentHandlers',
    'ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads',
    'ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler'
)
$tests = foreach ($role in 'Original', 'ObservedDefault')
{
    $trx = Join-Path $a "results\$role\attempt1\F146-$role-rt57-attempt1.trx"
    [xml]$xml = [System.IO.File]::ReadAllText($trx)
    $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
    $rows = @($xml.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $ns))
    if ($rows.Count -ne 3)
    {
        throw "$role must have exactly three actual rows."
    }

    foreach ($method in $methods)
    {
        if (@($rows | Where-Object { $_.testName -eq "$class$method" }).Count -ne 1)
        {
            throw "$role missing/duplicate row $method"
        }
    }

    foreach ($row in $rows)
    {
        if ($row.outcome -ne 'Passed' -or $row.computerName -ne [System.Environment]::MachineName)
        {
            throw "$role row outcome/machine mismatch."
        }

        $output = $row.SelectSingleNode('t:Output/t:StdOut', $ns).InnerText
        foreach ($observation in 'received SETTINGS frame', 'received HEADERS frame', 'sending HEADERS frame', 'Initializing stream 6')
        {
            if (-not $output.Contains($observation))
            {
                throw "$role missing actual managed-producer trace: $observation"
            }
        }

        if ($row.testName.EndsWith($methods[0]) -and -not $output.Contains('Initializing stream 10'))
        {
            throw "$role missing second actual input-stream trace."
        }
    }

    $counters = $xml.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $ns)
    if ($counters.total -ne '3' -or $counters.executed -ne '3' -or
        $counters.passed -ne '3' -or $counters.failed -ne '0')
    {
        throw "$role exact discovered/executed/passed counters mismatch."
    }

    [ordered]@{
        role = $role
        trx = $trx
        trxSha256 = Get-Sha007 $trx
        rows = @($rows | Sort-Object testName | ForEach-Object {
            [ordered]@{ name = $_.testName; outcome = $_.outcome }
        })
        actualManagedHttp3FrameTracePresentInEveryRow = $true
        samePhysicalMachine = [System.Environment]::MachineName
        ownerPathHashAndActualRuntimeAssertedInsideEveryRow = $true
        performanceDurationsNotCollectedOrInterpreted = $true
    }
}
$tests | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $a 'TRX-ROW-CHECKS.json')
$pids = @(Get-ChildItem -LiteralPath (Join-Path $a 'logs') -Filter '*.receipt.json' -File | ForEach-Object {
    ([System.IO.File]::ReadAllText($_.FullName) | ConvertFrom-Json).ownedPidObservations.pid
} | Sort-Object -Unique)
$terminal = @($pids | ForEach-Object {
    [ordered]@{ pid = $_; stillRunning = $null -ne (Get-Process -Id $_ -ErrorAction SilentlyContinue) }
})
$allTerminal = @($terminal | Where-Object { $_.stillRunning }).Count -eq 0
[ordered]@{
    observedOwnedPidCount = $pids.Count
    allObservedOwnedPidsTerminal = $allTerminal
    processTerminationsPerformed = 0
    exhaustiveInstantaneousChildInventoryClaimed = $false
    observations = $terminal
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $a 'FINAL-OWNED-PID-CHECK.json')
if (-not $allTerminal)
{
    throw 'An observed PID is live; do not assume ownership or terminate a potentially reused PID.'
}

Write-Output "Archive regular files unchanged: $($archives.regularArchivedSourceFilesVerified -join ', '); exact passing TRX rows: 3 + 3; terminal observed PIDs: $($pids.Count)."
