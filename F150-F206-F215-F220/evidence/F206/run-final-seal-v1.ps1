$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
if (Test-Path -LiteralPath '.\sealer-observed-exit-v1.json') { throw 'Single-use final seal invocation cannot be replayed.' }
$repo = 'C:\src\aspnetcore'
function Assert-SealGuard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes('..\policy.json')
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        ownerId = $policy.independentFindingPreparationWorkers.F206
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F206
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        leaseExists = Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    }
    [IO.File]::WriteAllBytes(".\$Label.policy.json", $bytes)
    [IO.File]::WriteAllText(".\$Label.guard.json", ($guard | ConvertTo-Json -Depth 8) + "`n", $utf8)
    if ($guard.ownerId -ne '2acd453e-18ab-4dd5-b36b-753c5e5a0a21' -or $guard.ownerCount -gt 4 -or
        $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists -or
        -not $guard.scope.StartsWith('245 '))
    {
        throw "Final source-only handoff guard denied before $Label."
    }
}
function Observe-Child([string] $Label, [string] $Executable, [string[]] $Argv, [string] $WorkingDirectory, [string] $StdoutPath, [string] $StderrPath)
{
    Assert-SealGuard $Label
    $receipt = [ordered]@{
        label = $Label
        observedStartUtc = [DateTime]::UtcNow.ToString('o')
        observerPowerShellPid = $PID
        outerToolPid = $null
        executable = $Executable
        argv = $Argv
        workingDirectory = $WorkingDirectory
        childRootPid = $null
        childRootIdentity = $null
        observedDirectChildren = @()
        identityBoundary = 'The source/sealer child root is distinct from this observing PowerShell PID. Outer tool-service identity and universal descendant closure are not asserted.'
        waitForExitTimeoutMilliseconds = 120000
        waitForExitReturned = $null
        stdoutPath = $StdoutPath
        stderrPath = $StderrPath
        stdoutDrainCompleted = $false
        stderrDrainCompleted = $false
        observedChildExitCode = $null
        failure = $null
    }
    $p = [Diagnostics.Process]::new()
    $out = $null
    $err = $null
    try
    {
        $p.StartInfo.FileName = $Executable
        $p.StartInfo.WorkingDirectory = $WorkingDirectory
        $p.StartInfo.UseShellExecute = $false
        $p.StartInfo.RedirectStandardOutput = $true
        $p.StartInfo.RedirectStandardError = $true
        $p.StartInfo.CreateNoWindow = $true
        $p.StartInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
        $p.StartInfo.Environment['GIT_TERMINAL_PROMPT'] = '0'
        $p.StartInfo.Environment['GIT_PAGER'] = ''
        foreach ($arg in $Argv) { $p.StartInfo.ArgumentList.Add($arg) }
        $out = [IO.File]::Open($StdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $err = [IO.File]::Open($StderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        if (-not $p.Start()) { throw "$Label did not start." }
        $receipt.childRootPid = $p.Id
        $outTask = $p.StandardOutput.BaseStream.CopyToAsync($out)
        $errTask = $p.StandardError.BaseStream.CopyToAsync($err)
        $identity = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)"
        $receipt.childRootIdentity = if ($null -ne $identity)
        {
            $identity | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
        }
        else
        {
            @{ processId = $p.Id; boundary = 'Process exited before CIM identity query; Process.Start PID, argv and actual handle exit remain recorded.' }
        }
        $receipt.observedDirectChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" |
            Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
        $receipt.waitForExitReturned = $p.WaitForExit($receipt.waitForExitTimeoutMilliseconds)
        if (-not $receipt.waitForExitReturned) { $p.Kill(); $p.WaitForExit() }
        $null = $outTask.GetAwaiter().GetResult()
        $receipt.stdoutDrainCompleted = $true
        $null = $errTask.GetAwaiter().GetResult()
        $receipt.stderrDrainCompleted = $true
        $receipt.observedChildExitCode = $p.ExitCode
    }
    catch
    {
        $receipt.failure = $_.Exception.ToString()
    }
    finally
    {
        if ($null -ne $out) { $out.Dispose() }
        if ($null -ne $err) { $err.Dispose() }
        $p.Dispose()
        $receipt.observedFinishUtc = [DateTime]::UtcNow.ToString('o')
        foreach ($stream in @('stdout', 'stderr'))
        {
            if (Test-Path -LiteralPath $receipt."${stream}Path")
            {
                $receipt["${stream}Bytes"] = (Get-Item -LiteralPath $receipt."${stream}Path").Length
                $receipt["${stream}Sha256"] = (Get-FileHash -LiteralPath $receipt."${stream}Path" -Algorithm SHA256).Hash
            }
        }
        [IO.File]::WriteAllText(".\$Label.observation.json", ($receipt | ConvertTo-Json -Depth 12) + "`n", $utf8)
    }
    return $receipt
}

$git = (Get-Command git -CommandType Application).Source
$status = Observe-Child 'final-navigation-status-v1' $git @('--no-pager', 'status', '--porcelain=v1', '--untracked-files=all') $repo '.\final-status-v1.stdout.bin' '.\final-status-v1.stderr.bin'
if ($status.observedChildExitCode -ne 0 -or -not $status.waitForExitReturned -or
    -not $status.stdoutDrainCompleted -or -not $status.stderrDrainCompleted -or $null -ne $status.failure)
{
    throw 'Final reserved-checkout read did not complete successfully; observation preserved.'
}
if ((Get-FileHash -LiteralPath '.\final-status-v1.stdout.bin' -Algorithm SHA256).Hash -ne
    (Get-FileHash -LiteralPath '.\commands-initial-v1\02-navigation-status.stdout.bin' -Algorithm SHA256).Hash)
{
    throw 'Reserved checkout status changed; do not claim preservation.'
}
$closure = Get-Content -LiteralPath '.\collection-closure-v1.json' -Raw | ConvertFrom-Json
$reports = @()
foreach ($report in $closure.preservedUntrackedReports)
{
    $path = Join-Path $repo $report.path
    $bytes = (Get-Item -LiteralPath $path).Length
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    if ($bytes -ne $report.bytes -or $hash -ne $report.sha256) { throw "Pre-existing untracked report changed: $($report.path)" }
    $reports += @{ path = $report.path; bytes = $bytes; sha256 = $hash; unchanged = $true }
}
[IO.File]::WriteAllText('.\reserved-checkout-preservation-v1.json', (@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    navigationHead = [IO.File]::ReadAllText('.\commands-initial-v1\01-navigation-head.stdout.bin').Trim()
    rawStatusUnchanged = $true
    preservedReports = $reports
    noWriteClaimBoundary = 'This worker only executed read-only git/gh operations on the reserved checkout; no universal assertion about other users or unrelated processes.'
} | ConvertTo-Json -Depth 10) + "`n", $utf8)

$pwsh = (Get-Process -Id $PID).Path
$sealerHash = (Get-FileHash -LiteralPath '.\seal-payload-v1.ps1' -Algorithm SHA256).Hash
$sealer = Observe-Child 'payload-sealer-v1' $pwsh @('-NoProfile', '-NonInteractive', '-File', '.\seal-payload-v1.ps1') $PSScriptRoot '.\sealer-v1.stdout.bin' '.\sealer-v1.stderr.bin'
[IO.File]::WriteAllText('.\sealer-observed-exit-v1.json', (@{
    observedAfterChildExitUtc = [DateTime]::UtcNow.ToString('o')
    executedSealerSha256 = $sealerHash
    childObservation = $sealer
    outsideToolObservationBoundary = 'Not self-attested; use the actual functions.powershell shell result after this script returns.'
} | ConvertTo-Json -Depth 15) + "`n", $utf8)
if ($sealer.observedChildExitCode -ne 0 -or -not $sealer.waitForExitReturned -or
    -not $sealer.stdoutDrainCompleted -or -not $sealer.stderrDrainCompleted -or $null -ne $sealer.failure)
{
    [Console]::Error.Write([IO.File]::ReadAllText('.\sealer-v1.stderr.bin'))
    throw 'Payload sealer did not complete successfully; failed bytes, streams, argv and actual exit preserved. Do not replay v1.'
}
if ((Get-FileHash -LiteralPath '.\seal-payload-v1.ps1' -Algorithm SHA256).Hash -ne $sealerHash) { throw 'Executed sealer bytes changed.' }
$payload = Get-Content -LiteralPath '.\payload-seal-v1.json' -Raw | ConvertFrom-Json
foreach ($binding in $payload.files)
{
    if ((Get-Item -LiteralPath $binding.path).Length -ne $binding.bytes -or
        (Get-FileHash -LiteralPath $binding.path -Algorithm SHA256).Hash -ne $binding.sha256)
    {
        throw "Payload binding changed after the sealer exited: $($binding.path)"
    }
}
$wholeFiles = @()
foreach ($file in Get-ChildItem -LiteralPath '.' -File -Recurse -Force | Sort-Object FullName)
{
    if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'No reparse-point file may enter the whole seal.' }
    $relative = [IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
    if ($relative -eq 'WHOLE-SEAL-v1.json') { continue }
    $wholeFiles += @{ path = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash }
}
$seal = [ordered]@{
    findingId = 'F206'
    ownerId = '2acd453e-18ab-4dd5-b36b-753c5e5a0a21'
    disposition = 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE'
    observedUtc = [DateTime]::UtcNow.ToString('o')
    originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    defaultCommit = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
    observerPowerShellPid = $PID
    sealerChildRootPid = $sealer.childRootPid
    sealerChildActualExit = $sealer.observedChildExitCode
    sealerChildActualWait = $sealer.waitForExitReturned
    sealerBothRawStreamDrainsCompleted = $sealer.stdoutDrainCompleted -and $sealer.stderrDrainCompleted
    outerToolPid = $null
    outerToolExitBoundary = 'Observe the actual shell/tool completed result after this script exits; no future self-attested exit field.'
    performanceOrBrowserQualification = $false
    fourPreExistingReportsReverifiedUnchanged = $reports.Count -eq 4
    sourceReadNativeCommands = 70
    additionalFinalReadOnlyGitStatusCommands = 1
    payloadSealSha256 = (Get-FileHash -LiteralPath '.\payload-seal-v1.json' -Algorithm SHA256).Hash
    assessmentSha256 = (Get-FileHash -LiteralPath '.\assessment-v1.json' -Algorithm SHA256).Hash
    excluded = @('WHOLE-SEAL-v1.json (self only; digest is emitted to actual tool output)')
    files = $wholeFiles
    fileCount = $wholeFiles.Count
}
[IO.File]::WriteAllText('.\WHOLE-SEAL-v1.json', ($seal | ConvertTo-Json -Depth 16) + "`n", $utf8)
$wholeSha = (Get-FileHash -LiteralPath '.\WHOLE-SEAL-v1.json' -Algorithm SHA256).Hash
foreach ($binding in $wholeFiles)
{
    if ((Get-Item -LiteralPath $binding.path).Length -ne $binding.bytes -or
        (Get-FileHash -LiteralPath $binding.path -Algorithm SHA256).Hash -ne $binding.sha256)
    {
        throw "Final whole-tree recheck failed: $($binding.path)"
    }
}
$actualFiles = @(Get-ChildItem -LiteralPath '.' -File -Recurse -Force |
    Where-Object { [IO.Path]::GetRelativePath($PSScriptRoot, $_.FullName) -ne 'WHOLE-SEAL-v1.json' })
if ($actualFiles.Count -ne $wholeFiles.Count) { throw 'Whole-tree coverage count changed.' }
[Console]::Write([IO.File]::ReadAllText('.\sealer-v1.stdout.bin'))
[Console]::WriteLine("WHOLE_SEAL_SHA256=$wholeSha files=$($wholeFiles.Count) observerPowerShellPid=$PID sealerChildRootPid=$($sealer.childRootPid) childActualExit=$($sealer.observedChildExitCode) childWait=$($sealer.waitForExitReturned) rawStreamDrains=$($sealer.stdoutDrainCompleted)/$($sealer.stderrDrainCompleted) reportsUnchanged=$($reports.Count)")
[Console]::WriteLine('OUTER_TOOL_EXIT_MUST_BE_OBSERVED_FROM_ACTUAL_TOOL_RESULT_NOT_FROM_THIS_OUTPUT')
