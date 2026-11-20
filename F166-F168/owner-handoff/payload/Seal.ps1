$ErrorActionPreference = 'Stop'
$payload = $PSScriptRoot
$capsule = Split-Path -Parent $payload
foreach ($name in @('manifest.json', 'audit-execution.json', 'terminal.json', 'seal.json'))
{
    if (Test-Path -LiteralPath (Join-Path $capsule $name))
    {
        throw "Refusing to overwrite an existing envelope: $name"
    }
}
$paths = [string[]]@(Get-ChildItem -LiteralPath $payload -Recurse -File | ForEach-Object { $_.FullName })
[Array]::Sort($paths, [StringComparer]::Ordinal)
$files = @(
    foreach ($file in $paths)
    {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($payload, $file)
            bytes = [long](Get-Item -LiteralPath $file).Length
            sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        }
    }
)
if ($files.Count -gt 250)
{
    throw "Selected capsule exceeds the preparation file-count goal: $($files.Count)"
}
[long]$selectedBytes = 0
foreach ($file in $files)
{
    $selectedBytes += [long]$file.bytes
}
$manifest = [ordered]@{
    schema = 'F166-F168-selected-payload-v1'
    scope = 'payload'
    selectedFileCount = $files.Count
    selectedBytes = $selectedBytes
    files = $files
    exclusions = @()
}
[IO.File]::WriteAllText("$capsule\manifest.json", ($manifest | ConvertTo-Json -Depth 12))

$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$start.WorkingDirectory = $capsule
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.ArgumentList.Add("$payload\Audit.cjs")
$start.Environment['TEMP'] = 'C:\src\ap-F166-c012\scratch'
$start.Environment['TMP'] = 'C:\src\ap-F166-c012\scratch'
[IO.Directory]::CreateDirectory($start.Environment['TEMP']) | Out-Null
$audit = [ordered]@{
    label = 'final-manifest-payload-audit'
    executable = $start.FileName
    arguments = @("$payload\Audit.cjs")
    checkout = $capsule
    wrapperPid = $PID
    environment = [ordered]@{
        TEMP = $start.Environment['TEMP']
        TMP = $start.Environment['TMP']
        activationRequired = $false
        reason = 'Standard-library Node verifier, not dotnet'
    }
    startedAt = [DateTime]::UtcNow.ToString('o')
    exhaustiveDescendantCensus = $false
    knownChildren = @()
    knownChildWaits = @()
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$audit.nativePid = $process.Id
$audit.nativeCreationAt = $process.StartTime.ToUniversalTime().ToString('o')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$audit.stdout = $stdout.GetAwaiter().GetResult()
$audit.stderr = $stderr.GetAwaiter().GetResult()
$audit.exitCode = $process.ExitCode
$audit.nativeExited = $process.HasExited
$audit.nativeWaitCompleted = $true
$audit.bothStreamsDrained = $true
$audit.exitedAt = [DateTime]::UtcNow.ToString('o')
$process.Dispose()
[IO.File]::WriteAllText("$capsule\audit-execution.json", ($audit | ConvertTo-Json -Depth 20))
if ($audit.exitCode -ne 0)
{
    throw "Final payload audit failed; complete native receipt retained: $($audit.stderr)"
}
$auditResult = $audit.stdout | ConvertFrom-Json
if (-not $auditResult.evidenceAuditPassed -or -not $auditResult.exactSelectedFileSetPassed)
{
    throw 'Final verifier did not verify both evidence and exact manifest file set'
}

$stream = [IO.File]::OpenRead("$payload\evidence\all-attempts.json.gz")
$gzip = [IO.Compression.GZipStream]::new($stream, [IO.Compression.CompressionMode]::Decompress)
$reader = [IO.StreamReader]::new($gzip, [Text.Encoding]::UTF8)
try
{
    $archive = $reader.ReadToEnd() | ConvertFrom-Json -Depth 60
}
finally
{
    $reader.Dispose()
    $gzip.Dispose()
    $stream.Dispose()
}
$receipts = @(
    foreach ($member in $archive.members)
    {
        if ($member.path.EndsWith('.receipt.json', [StringComparison]::Ordinal))
        {
            $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($member.base64)).TrimStart([char]0xFEFF)
            $text | ConvertFrom-Json -Depth 40
        }
    }
    foreach ($file in Get-ChildItem -LiteralPath "$payload\evidence" -Filter *.receipt.json -File)
    {
        Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -Depth 40
    }
    foreach ($file in Get-ChildItem -LiteralPath "$payload\evidence" -Filter failed-seal-*.json.gz -File)
    {
        $failedStream = [IO.File]::OpenRead($file.FullName)
        $failedGzip = [IO.Compression.GZipStream]::new($failedStream, [IO.Compression.CompressionMode]::Decompress)
        $failedReader = [IO.StreamReader]::new($failedGzip, [Text.Encoding]::UTF8)
        try
        {
            $failedArchive = $failedReader.ReadToEnd() | ConvertFrom-Json -Depth 40
        }
        finally
        {
            $failedReader.Dispose()
            $failedGzip.Dispose()
            $failedStream.Dispose()
        }
        foreach ($member in $failedArchive.members)
        {
            if ($member.path -ceq 'audit-execution.json')
            {
                [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($member.base64)) | ConvertFrom-Json -Depth 40
            }
        }
        foreach ($postSealAudit in $failedArchive.postSealAudits)
        {
            $postSealAudit
        }
    }
    [pscustomobject]$audit
)
$rootObservations = @()
$childObservations = @()
foreach ($receipt in $receipts)
{
    if (-not $receipt.nativeExited -or -not $receipt.bothStreamsDrained)
    {
        throw "Incomplete actual native root or undrained stream: $($receipt.label)"
    }
    $live = Get-Process -Id $receipt.nativePid -ErrorAction SilentlyContinue
    $liveRootStart = $null
    if ($live)
    {
        $rootStartValue = $live.StartTime
        if ($rootStartValue -is [DateTime])
        {
            $liveRootStart = $rootStartValue.ToUniversalTime().ToString('o')
        }
    }
    $rootObservations += [ordered]@{
        label = $receipt.label
        nativePid = $receipt.nativePid
        actualProcessObjectWaitAndExitRecorded = $true
        bothStreamsDrained = $true
        livePidAtSeal = [bool]$live
        liveCreationAt = $liveRootStart
        note = 'Original Process-object waits establish root exit. A currently reused PID is not original ownership and is not stopped.'
    }
    foreach ($child in $receipt.knownChildren)
    {
        $liveChild = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
        $childStart = $null
        $identitySource = 'PID absent'
        if ($liveChild)
        {
            $startValue = $liveChild.StartTime
            if ($startValue -is [DateTime])
            {
                $childStart = $startValue.ToUniversalTime()
                $identitySource = 'Process.StartTime'
            }
            else
            {
                $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)" -ErrorAction Stop
                if ($cim)
                {
                    if ($cim.CreationDate -isnot [DateTime])
                    {
                        throw "Cannot establish known-child creation identity: $($child.pid)"
                    }
                    $childStart = $cim.CreationDate.ToUniversalTime()
                    $identitySource = 'Bounded single-PID Win32_Process.CreationDate after nullable Process.StartTime'
                }
                else
                {
                    $identitySource = 'PID absent after nullable/racing Process.StartTime'
                }
            }
        }
        $same = $null -ne $childStart -and [Math]::Abs(($childStart - [DateTime]::Parse($child.creationDate).ToUniversalTime()).Ticks) -lt [TimeSpan]::TicksPerMillisecond
        if ($same)
        {
            $liveChild.WaitForExit()
        }
        $childObservations += [ordered]@{
            label = $receipt.label
            pid = $child.pid
            parentPid = $child.parentPid
            recordedCreationAt = $child.creationDate
            observedCreationUtc = $(if ($null -ne $childStart) { $childStart.ToString('o') } else { $null })
            identitySource = $identitySource
            sameIdentityAtSeal = [bool]$same
            waitedIfSameIdentity = [bool]$same
            terminal = $true
            precisionRule = 'Both timestamps normalized UTC; absolute creation-time difference <1 ms; otherwise absent or PID reused.'
        }
    }
}
$terminal = [ordered]@{
    observedAt = [DateTime]::UtcNow.ToString('o')
    observerPid = $PID
    allRecordedRootsAndKnownChildrenTerminal = $true
    allRecordedStreamsDrained = $true
    recordedNativeRoots = $rootObservations.Count
    recordedKnownChildObservations = $childObservations.Count
    roots = $rootObservations
    knownChildren = $childObservations
    exhaustiveDescendantCensus = $false
    earlierWaitPrecisionBoundary = 'Earlier native receipts used exact timestamp strings, then a <1 ms comparison without explicit Parse(...).ToUniversalTime(). Closing reconciliation normalizes both timestamps UTC, uses a tolerant <1 ms rule and obtains nullable Process.StartTime identities through a bounded single-PID CIM query.'
    boundary = 'Covers recorded native execution roots/observed known children through the included final payload audit. Parent-PID sampling can miss short-lived/reparented descendants. No exhaustive census, future-auditor ownership or helper-service census is asserted. Subsequent read-only auditors do not mutate this capsule.'
    helperServiceIntentionallyCreated = $false
    findingStatus = [ordered]@{ F166 = 'PENDING'; F167 = 'PENDING'; F168 = 'PENDING' }
}
[IO.File]::WriteAllText("$capsule\terminal.json", ($terminal | ConvertTo-Json -Depth 40))
$envelope = [ordered]@{}
foreach ($name in @('manifest.json', 'audit-execution.json', 'terminal.json'))
{
    $file = "$capsule\$name"
    $envelope[$name] = [ordered]@{
        bytes = [long](Get-Item -LiteralPath $file).Length
        sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    }
}
$seal = [ordered]@{
    schema = 'F166-F168-read-only-capsule-envelope-v1'
    payloadDirectory = 'payload'
    selectedFileCount = $files.Count
    selectedBytes = $selectedBytes
    manifestSha256 = $envelope['manifest.json'].sha256
    files = $envelope
    rootFileSet = @('audit-execution.json', 'manifest.json', 'seal.json', 'terminal.json')
    sealSelfHashExcluded = $true
    noSelectedPayloadExclusions = $true
    noBenchmarksOrCandidateVerdicts = $true
    findingStatus = [ordered]@{ F166 = 'PENDING'; F167 = 'PENDING'; F168 = 'PENDING' }
}
[IO.File]::WriteAllText("$capsule\seal.json", ($seal | ConvertTo-Json -Depth 15))

$after = [string[]]@(Get-ChildItem -LiteralPath $payload -Recurse -File | ForEach-Object { $_.FullName })
[Array]::Sort($after, [StringComparer]::Ordinal)
if (@(Compare-Object $paths $after).Count)
{
    throw 'Selected file set changed while sealing'
}
foreach ($file in $files)
{
    if ((Get-FileHash -LiteralPath "$payload\$($file.path)" -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "Selected payload bytes changed while sealing: $($file.path)"
    }
}
[ordered]@{
    capsule = $capsule
    selectedFileCount = $files.Count
    selectedBytes = $selectedBytes
    manifestSha256 = $seal.manifestSha256
    recordedNativeRoots = $terminal.recordedNativeRoots
    knownChildObservations = $terminal.recordedKnownChildObservations
    audit = $auditResult
} | ConvertTo-Json -Depth 15
