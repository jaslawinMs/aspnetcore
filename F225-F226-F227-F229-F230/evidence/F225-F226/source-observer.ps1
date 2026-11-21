$ErrorActionPreference = 'Stop'
$script:Root = $PSScriptRoot
$script:Repository = 'C:\src\aspnetcore'
$script:ParallelRoot = Split-Path $script:Root -Parent
$script:Acceptance = Get-Content -LiteralPath (Join-Path $script:Root 'acceptance.json') -Raw | ConvertFrom-Json
$script:Observer = [System.Diagnostics.Process]::GetCurrentProcess()

function Write-NewJson
{
    param([string]$Path, [object]$Value)
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 40) + "`n")
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
}

function Get-BytesSha256
{
    param([byte[]]$Bytes)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($Bytes))
}

function Assert-LiveSourceGuard
{
    param([string]$Label)
    $policyPath = Join-Path $script:ParallelRoot 'policy.json'
    $bytes = [System.IO.File]::ReadAllBytes($policyPath)
    $policy = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    $leasePath = Join-Path $script:ParallelRoot 'benchmark-exclusive.lease.json'
    $leasePresent = Test-Path -LiteralPath $leasePath
    $scope = $policy.activeWorkerPreparationScopes.F225
    $allowed = (
        $policy.independentFindingPreparationWorkers.F225 -ceq $script:Acceptance.owner -and
        $scope -ceq $script:Acceptance.guardBeforeEveryNativeSourceUtility.'activeWorkerPreparationScopes.F225' -and
        -not $leasePresent -and
        $policy.actualWorkerBuildHoldActive -ceq $false -and
        $policy.buildAndTestWorkQuiesced -ceq $false
    )
    $snapshot = Join-Path $script:Root "$Label.policy.json"
    [System.IO.File]::WriteAllBytes($snapshot, $bytes)
    $receipt = [ordered]@{
        observedAtUtc = [DateTime]::UtcNow.ToString('O')
        observerPid = $PID
        policyPath = $policyPath
        policySnapshot = [System.IO.Path]::GetFileName($snapshot)
        policySha256 = Get-BytesSha256 $bytes
        registeredOwner = $policy.independentFindingPreparationWorkers.F225
        exactScope = $scope
        leasePresent = $leasePresent
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
        allowed = $allowed
        authority = 'point-in-time source-only admission; not future authority'
    }
    Write-NewJson (Join-Path $script:Root "$Label.guard.json") $receipt
    if (-not $allowed) { throw "Source guard closed before $Label; no native start authorized." }
    return $receipt
}

function Get-OwnedChildObservation
{
    param([int]$ParentId)
    $rows = @(Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction Stop |
        Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath)
    return [ordered]@{
        observedAtUtc = [DateTime]::UtcNow.ToString('O')
        parentProcessId = $ParentId
        rows = $rows
    }
}

function Invoke-SourceUtility
{
    param(
        [string]$Label,
        [ValidateSet('git', 'gh')][string]$Program,
        [string[]]$Arguments,
        [byte[]]$InputBytes = [byte[]]::new(0),
        [int]$WaitMilliseconds = 120000
    )
    $existing = @(Get-ChildItem -LiteralPath $script:Root -Filter '*.native.json' -File)
    if ($existing.Count -ge 32) { throw 'Closed initial source utility budget.' }
    $exe = (Get-Command $Program -CommandType Application -ErrorAction Stop).Source
    $stdoutPath = Join-Path $script:Root "$Label.stdout.bin"
    $stderrPath = Join-Path $script:Root "$Label.stderr.bin"
    $stdinPath = Join-Path $script:Root "$Label.stdin.bin"
    foreach ($path in @($stdoutPath, $stderrPath, $stdinPath, (Join-Path $script:Root "$Label.native.json")))
    {
        if (Test-Path -LiteralPath $path) { throw "Refusing an executed-label replay: $Label" }
    }
    [System.IO.File]::WriteAllBytes($stdinPath, $InputBytes)
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $exe
    $psi.WorkingDirectory = $script:Repository
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = $true
    foreach ($argument in $Arguments) { $psi.ArgumentList.Add($argument) }
    $environment = [ordered]@{
        GIT_OPTIONAL_LOCKS = '0'
        GIT_TERMINAL_PROMPT = '0'
        GIT_NO_REPLACE_OBJECTS = '1'
        GH_PROMPT_DISABLED = '1'
        GH_NO_UPDATE_NOTIFIER = '1'
        GH_NO_EXTENSION_UPDATE_NOTIFIER = '1'
        GH_PAGER = ''
        PAGER = ''
    }
    foreach ($entry in $environment.GetEnumerator()) { $psi.Environment[$entry.Key] = $entry.Value }
    $guard = Assert-LiveSourceGuard $Label
    $stdout = [System.IO.File]::Open($stdoutPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $stderr = [System.IO.File]::Open($stderrPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    $receipt = [ordered]@{
        label = $Label
        program = $Program
        executable = $exe
        argv = $Arguments
        workingDirectory = $script:Repository
        scopedEnvironment = $environment
        observerPid = $PID
        observerStartUtc = $script:Observer.StartTime.ToUniversalTime().ToString('O')
        observerExecutable = $script:Observer.MainModule.FileName
        librarySha256 = (Get-FileHash -LiteralPath (Join-Path $script:Root 'source-observer.ps1') -Algorithm SHA256).Hash
        guard = "$Label.guard.json"
        stdin = [System.IO.Path]::GetFileName($stdinPath)
        stdinSha256 = Get-BytesSha256 $InputBytes
        stdout = [System.IO.Path]::GetFileName($stdoutPath)
        stderr = [System.IO.Path]::GetFileName($stderrPath)
        waitMilliseconds = $WaitMilliseconds
        processStartAttemptedUtc = [DateTime]::UtcNow.ToString('O')
        rootPid = $null
        rootStartUtc = $null
        waitForExitReturned = $null
        rootHasExited = $null
        rootExitCode = $null
        stdoutCopyAwaited = $false
        stderrCopyAwaited = $false
        childObservations = @()
        observedChildTerminal = @()
        error = $null
        enclosingToolExitCode = $null
        enclosingToolExitAuthority = 'Reported only by actual functions.powershell return; no prospective self-attestation.'
        observationLimit = 'CIM direct-child point observations plus terminal checks for observed PIDs; not a universal descendant-closure proof.'
    }
    try
    {
        if (-not $process.Start()) { throw "Process.Start returned false for $Label" }
        $receipt.rootPid = $process.Id
        $receipt.rootStartUtc = $process.StartTime.ToUniversalTime().ToString('O')
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
        if ($InputBytes.Length -gt 0)
        {
            $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length)
            $process.StandardInput.BaseStream.Flush()
        }
        $process.StandardInput.Close()
        $receipt.childObservations += Get-OwnedChildObservation $process.Id
        $receipt.waitForExitReturned = $process.WaitForExit($WaitMilliseconds)
        if (-not $receipt.waitForExitReturned)
        {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            $process.WaitForExit()
            throw "Native root timeout; owned PID $($process.Id) stopped without retry."
        }
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult()
        $receipt.stdoutCopyAwaited = $true
        $errTask.GetAwaiter().GetResult()
        $receipt.stderrCopyAwaited = $true
        $receipt.childObservations += Get-OwnedChildObservation $process.Id
        $observed = @($receipt.childObservations | ForEach-Object { $_.rows } | Sort-Object ProcessId, CreationDate -Unique)
        foreach ($child in $observed)
        {
            $now = @(Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $($child.ProcessId)" -ErrorAction Stop)
            $sameIdentity = @($now | Where-Object { $_.CreationDate -eq $child.CreationDate })
            $receipt.observedChildTerminal += [ordered]@{
                pid = [int]$child.ProcessId
                creationDate = $child.CreationDate
                observedAtUtc = [DateTime]::UtcNow.ToString('O')
                sameCreationIdentityStillPresent = ($sameIdentity.Count -gt 0)
                terminalObservation = if ($sameIdentity.Count -eq 0) { 'absent or PID reused at observation' } else { 'still present; not terminal' }
            }
            if ($sameIdentity.Count -gt 0) { throw "Observed child $($child.ProcessId) remains; stop source work." }
        }
    }
    catch
    {
        $receipt.error = $_.Exception.ToString()
        throw
    }
    finally
    {
        if ($receipt.rootPid)
        {
            $receipt.rootHasExited = $process.HasExited
            if ($process.HasExited) { $receipt.rootExitCode = $process.ExitCode }
        }
        $stdout.Dispose()
        $stderr.Dispose()
        $receipt.stdoutBytes = (Get-Item -LiteralPath $stdoutPath).Length
        $receipt.stderrBytes = (Get-Item -LiteralPath $stderrPath).Length
        $receipt.stdoutSha256 = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
        $receipt.stderrSha256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
        $receipt.finishedObservationUtc = [DateTime]::UtcNow.ToString('O')
        Write-NewJson (Join-Path $script:Root "$Label.native.json") $receipt
        $process.Dispose()
    }
    if ($receipt.rootExitCode -ne 0) { throw "Source utility $Label exited $($receipt.rootExitCode); retained without retry." }
    return $receipt
}

function Save-BatchSources
{
    param([string]$Label, [object[]]$Selections)
    foreach ($role in @($Selections | Group-Object role))
    {
        $old = @()
        foreach ($manifest in @(Get-ChildItem -LiteralPath $script:Root -Filter '*.sources.json' -File))
        {
            $old += @((Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json) | Where-Object { $_.role -eq $role.Name } | ForEach-Object { $_.repositoryPath })
        }
        $paths = @(@($old) + @($role.Group.repositoryPath) | Sort-Object -Unique)
        if ($paths.Count -gt 15) { throw "Closed whole-file budget for role $($role.Name)." }
    }
    $lines = @($Selections | ForEach-Object { "$($_.commit):$($_.repositoryPath.Replace('\', '/'))" })
    $input = [System.Text.UTF8Encoding]::new($false).GetBytes(($lines -join "`n") + "`n")
    $native = Invoke-SourceUtility -Label $Label -Program git -Arguments @('--no-pager', 'cat-file', '--batch') -InputBytes $input
    $raw = [System.IO.File]::ReadAllBytes((Join-Path $script:Root "$Label.stdout.bin"))
    $position = 0
    $bindings = @()
    for ($i = 0; $i -lt $Selections.Count; $i++)
    {
        $start = $position
        while ($position -lt $raw.Length -and $raw[$position] -ne 10) { $position++ }
        if ($position -ge $raw.Length) { throw "Incomplete batch header at selection $i." }
        $header = [System.Text.Encoding]::UTF8.GetString($raw, $start, $position - $start)
        $position++
        $selection = $Selections[$i]
        if ($header.EndsWith(' missing'))
        {
            $bindings += [ordered]@{
                role = $selection.role; commit = $selection.commit; repositoryPath = $selection.repositoryPath
                expression = $lines[$i]; status = 'missing at immutable commit'; header = $header
                nativeReceipt = "$Label.native.json"
            }
            continue
        }
        if ($header -notmatch '^([0-9a-f]{40,64}) blob ([0-9]+)$') { throw "Unexpected batch object header: $header" }
        $blob = $Matches[1]
        $size = [int]$Matches[2]
        if ($position + $size -ge $raw.Length) { throw "Incomplete batch body at selection $i." }
        $bytes = [byte[]]::new($size)
        [Array]::Copy($raw, $position, $bytes, 0, $size)
        $position += $size
        if ($raw[$position] -ne 10) { throw "Missing batch object newline at selection $i." }
        $position++
        $roleRoot = Join-Path $script:Root (Join-Path 'sources' $selection.role)
        $relative = Join-Path (Join-Path 'sources' $selection.role) $selection.repositoryPath
        $path = Join-Path $script:Root $relative
        [System.IO.Directory]::CreateDirectory((Split-Path $path -Parent)) | Out-Null
        $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
        try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
        $bindings += [ordered]@{
            role = $selection.role; commit = $selection.commit; repositoryPath = $selection.repositoryPath
            expression = $lines[$i]; status = 'whole exact git blob'; blob = $blob; bytes = $size
            sha256 = Get-BytesSha256 $bytes; retainedPath = $relative
            nativeReceipt = "$Label.native.json"; batchBodyEndOffsetExclusive = $position - 1
        }
    }
    if ($position -ne $raw.Length) { throw "Unconsumed batch bytes: $($raw.Length - $position)" }
    Write-NewJson (Join-Path $script:Root "$Label.sources.json") $bindings
    return $bindings
}
