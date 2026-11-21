$ErrorActionPreference = 'Stop'
$script:EvidenceRoot = $PSScriptRoot
$script:ReservedRoot = 'C:\src\aspnetcore'
$script:ParallelDirectory = Split-Path $PSScriptRoot -Parent
$script:Accepted = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'acceptance.json') -Raw | ConvertFrom-Json
$script:SelfProcess = [System.Diagnostics.Process]::GetCurrentProcess()

function Write-FreshJson256
{
    param([string]$Path, [object]$Value)
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 40) + "`n")
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
}

function Get-Hash256
{
    param([byte[]]$Bytes)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($Bytes))
}

function Assert-SourceGuard256
{
    param([string]$Label)
    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $script:ParallelDirectory 'policy.json'))
    $parsedPolicy = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    $leasePresent = Test-Path -LiteralPath (Join-Path $script:ParallelDirectory 'benchmark-exclusive.lease.json')
    $allowed = (
        $parsedPolicy.independentFindingPreparationWorkers.F225 -ceq $script:Accepted.owner -and
        $parsedPolicy.activeWorkerPreparationScopes.F225 -ceq $script:Accepted.guardBeforeEveryNativeSourceUtility.'activeWorkerPreparationScopes.F225' -and
        -not $leasePresent -and
        $parsedPolicy.actualWorkerBuildHoldActive -ceq $false -and
        $parsedPolicy.buildAndTestWorkQuiesced -ceq $false
    )
    $policySnapshot = Join-Path $script:EvidenceRoot "$Label.policy.json"
    $stream = [System.IO.File]::Open($policySnapshot, [System.IO.FileMode]::CreateNew)
    try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
    Write-FreshJson256 (Join-Path $script:EvidenceRoot "$Label.guard.json") ([ordered]@{
        observedAtUtc = [DateTime]::UtcNow.ToString('O'); observerPid = $PID
        policySnapshot = "$Label.policy.json"; policySha256 = Get-Hash256 $bytes
        registeredOwner = $parsedPolicy.independentFindingPreparationWorkers.F225
        exactScope = $parsedPolicy.activeWorkerPreparationScopes.F225
        leasePresent = $leasePresent
        actualWorkerBuildHoldActive = $parsedPolicy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $parsedPolicy.buildAndTestWorkQuiesced
        allowed = $allowed; authority = 'point-in-time source-only admission'
    })
    if (-not $allowed) { throw "Closed source guard: $Label" }
}

function Get-ChildSnapshot256
{
    param([int]$ParentId)
    return [ordered]@{
        observedAtUtc = [DateTime]::UtcNow.ToString('O'); parentProcessId = $ParentId
        rows = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" |
            Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath)
    }
}

function Invoke-Source256
{
    param([string]$Label, [ValidateSet('git','gh')][string]$Program, [string[]]$Argv, [byte[]]$Stdin = [byte[]]::new(0))
    if (@(Get-ChildItem -LiteralPath $script:EvidenceRoot -Filter '*.native.json' -File).Count -ge 32) { throw 'Initial native-source budget closed.' }
    $receiptPath = Join-Path $script:EvidenceRoot "$Label.native.json"
    $outPath = Join-Path $script:EvidenceRoot "$Label.stdout.bin"
    $errPath = Join-Path $script:EvidenceRoot "$Label.stderr.bin"
    $inPath = Join-Path $script:EvidenceRoot "$Label.stdin.bin"
    foreach ($path in @($receiptPath,$outPath,$errPath,$inPath))
    {
        if (Test-Path -LiteralPath $path) { throw "No replay: $Label already has evidence." }
    }
    $inputStream = [System.IO.File]::Open($inPath, [System.IO.FileMode]::CreateNew)
    try { $inputStream.Write($Stdin, 0, $Stdin.Length) } finally { $inputStream.Dispose() }
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = (Get-Command $Program -CommandType Application).Source
    $startInfo.WorkingDirectory = $script:ReservedRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($arg in $Argv) { $startInfo.ArgumentList.Add($arg) }
    $scopedEnvironment = [ordered]@{
        GIT_OPTIONAL_LOCKS='0'; GIT_TERMINAL_PROMPT='0'; GIT_NO_REPLACE_OBJECTS='1'
        GH_PROMPT_DISABLED='1'; GH_NO_UPDATE_NOTIFIER='1'; GH_NO_EXTENSION_UPDATE_NOTIFIER='1'; GH_PAGER=''; PAGER=''
    }
    foreach ($entry in $scopedEnvironment.GetEnumerator()) { $startInfo.Environment[$entry.Key] = $entry.Value }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    Assert-SourceGuard256 $Label
    $output = [System.IO.File]::Open($outPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $errors = [System.IO.File]::Open($errPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $row = [ordered]@{
        label=$Label; program=$Program; executable=$startInfo.FileName; argv=$Argv; workingDirectory=$script:ReservedRoot
        scopedEnvironment=$scopedEnvironment; guard="$Label.guard.json"
        observerPid=$PID; observerStartUtc=$script:SelfProcess.StartTime.ToUniversalTime().ToString('O')
        observerExecutable=$script:SelfProcess.MainModule.FileName
        librarySha256=(Get-FileHash -LiteralPath (Join-Path $script:EvidenceRoot 'source-observer-256b.psm1')).Hash
        stdin="$Label.stdin.bin"; stdinSha256=Get-Hash256 $Stdin; stdout="$Label.stdout.bin"; stderr="$Label.stderr.bin"
        processStartAttemptedUtc=[DateTime]::UtcNow.ToString('O'); rootPid=$null; rootStartUtc=$null
        waitMilliseconds=120000; waitForExitReturned=$null; rootHasExited=$null; rootExitCode=$null
        stdoutCopyAwaited=$false; stderrCopyAwaited=$false; childObservations=@(); observedChildTerminal=@(); error=$null
        enclosingToolExitCode=$null; enclosingToolExitAuthority='Only the actual enclosing tool return is authoritative.'
        observationLimit='Direct-child CIM point snapshots and creation-identity terminal checks only; no universal descendant absence claim.'
    }
    try
    {
        if (-not $process.Start()) { throw "Process.Start returned false: $Label" }
        $row.rootPid=$process.Id
        $row.rootStartUtc=$process.StartTime.ToUniversalTime().ToString('O')
        $copyOut=$process.StandardOutput.BaseStream.CopyToAsync($output)
        $copyErr=$process.StandardError.BaseStream.CopyToAsync($errors)
        if ($Stdin.Length -gt 0)
        {
            $process.StandardInput.BaseStream.Write($Stdin,0,$Stdin.Length)
            $process.StandardInput.BaseStream.Flush()
        }
        $process.StandardInput.Close()
        $row.childObservations += Get-ChildSnapshot256 $process.Id
        $row.waitForExitReturned=$process.WaitForExit(120000)
        if (-not $row.waitForExitReturned)
        {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
            throw "Timeout for owned source PID $($process.Id); no retry."
        }
        $process.WaitForExit()
        $copyOut.GetAwaiter().GetResult()
        $row.stdoutCopyAwaited=$true
        $copyErr.GetAwaiter().GetResult()
        $row.stderrCopyAwaited=$true
        $row.childObservations += Get-ChildSnapshot256 $process.Id
        foreach ($child in @($row.childObservations | ForEach-Object { $_.rows } | Sort-Object ProcessId,CreationDate -Unique))
        {
            $same = @(Get-CimInstance Win32_Process -Filter "ProcessId = $($child.ProcessId)" | Where-Object CreationDate -eq $child.CreationDate)
            $row.observedChildTerminal += [ordered]@{
                pid=[int]$child.ProcessId; creationDate=$child.CreationDate; observedAtUtc=[DateTime]::UtcNow.ToString('O')
                sameCreationIdentityStillPresent=($same.Count -gt 0)
                terminalObservation=if ($same.Count -eq 0) { 'absent or PID reused at observation' } else { 'still present' }
            }
            if ($same.Count -gt 0) { throw "Observed child $($child.ProcessId) still present; stop." }
        }
    }
    catch { $row.error=$_.Exception.ToString(); throw }
    finally
    {
        if ($row.rootPid)
        {
            $row.rootHasExited=$process.HasExited
            if ($process.HasExited) { $row.rootExitCode=$process.ExitCode }
        }
        $output.Dispose()
        $errors.Dispose()
        $row.stdoutBytes=(Get-Item -LiteralPath $outPath).Length
        $row.stderrBytes=(Get-Item -LiteralPath $errPath).Length
        $row.stdoutSha256=(Get-FileHash -LiteralPath $outPath).Hash
        $row.stderrSha256=(Get-FileHash -LiteralPath $errPath).Hash
        $row.finishedObservationUtc=[DateTime]::UtcNow.ToString('O')
        Write-FreshJson256 $receiptPath $row
        $process.Dispose()
    }
    if ($row.rootExitCode -ne 0) { throw "Native source utility $Label exit $($row.rootExitCode); no retry." }
    return $row
}

function Save-Sources256
{
    param([string]$Label, [object[]]$Selections)
    foreach ($group in @($Selections | Group-Object role))
    {
        $prior = @()
        foreach ($manifest in @(Get-ChildItem -LiteralPath $script:EvidenceRoot -Filter '*.sources.json' -File))
        {
            $prior += @((Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json) | Where-Object role -eq $group.Name | ForEach-Object repositoryPath)
        }
        if (@(@($prior)+@($group.Group.repositoryPath) | Sort-Object -Unique).Count -gt 15) { throw "Whole-file role budget closed: $($group.Name)" }
    }
    $expressions = @($Selections | ForEach-Object { "$($_.commit):$($_.repositoryPath.Replace('\','/'))" })
    $stdinBytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($expressions -join "`n")+"`n")
    Invoke-Source256 -Label $Label -Program git -Argv @('--no-pager','cat-file','--batch') -Stdin $stdinBytes | Out-Null
    $raw = [System.IO.File]::ReadAllBytes((Join-Path $script:EvidenceRoot "$Label.stdout.bin"))
    $offset=0
    $bindings=@()
    for ($i=0; $i -lt $Selections.Count; $i++)
    {
        $headerStart=$offset
        while ($offset -lt $raw.Length -and $raw[$offset] -ne 10) { $offset++ }
        if ($offset -ge $raw.Length) { throw 'Truncated batch header.' }
        $header=[System.Text.Encoding]::UTF8.GetString($raw,$headerStart,$offset-$headerStart)
        $offset++
        $selection=$Selections[$i]
        $binding=[ordered]@{
            role=$selection.role; commit=$selection.commit; repositoryPath=$selection.repositoryPath
            expression=$expressions[$i]; nativeReceipt="$Label.native.json"; header=$header
        }
        if ($header.EndsWith(' missing'))
        {
            $binding.status='missing at immutable commit'
            $bindings += $binding
            continue
        }
        if ($header -notmatch '^([0-9a-f]{40,64}) blob ([0-9]+)$') { throw "Unexpected source header: $header" }
        $blob=$Matches[1]
        $size=[int]$Matches[2]
        if ($offset+$size -ge $raw.Length) { throw 'Truncated source blob.' }
        $body=[byte[]]::new($size)
        [Array]::Copy($raw,$offset,$body,0,$size)
        $bodyOffset=$offset
        $offset+=$size
        if ($raw[$offset] -ne 10) { throw 'Missing source delimiter.' }
        $offset++
        $relative=Join-Path (Join-Path 'sources' $selection.role) $selection.repositoryPath
        $path=Join-Path $script:EvidenceRoot $relative
        [System.IO.Directory]::CreateDirectory((Split-Path $path -Parent)) | Out-Null
        $stream=[System.IO.File]::Open($path,[System.IO.FileMode]::CreateNew)
        try { $stream.Write($body,0,$size) } finally { $stream.Dispose() }
        $binding.status='whole exact git blob'; $binding.blob=$blob; $binding.bytes=$size
        $binding.sha256=Get-Hash256 $body; $binding.retainedPath=$relative; $binding.batchBodyOffset=$bodyOffset
        $bindings+=$binding
    }
    if ($offset -ne $raw.Length) { throw 'Unexpected trailing batch bytes.' }
    Write-FreshJson256 (Join-Path $script:EvidenceRoot "$Label.sources.json") $bindings
    return $bindings
}

Export-ModuleMember -Function Write-FreshJson256,Get-Hash256,Assert-SourceGuard256,Invoke-Source256,Save-Sources256
