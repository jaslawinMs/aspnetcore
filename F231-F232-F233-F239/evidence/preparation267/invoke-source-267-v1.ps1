param(
    [Parameter(Mandatory = $true)][string]$Invocation,
    [Parameter(Mandatory = $true)][string]$Action,
    [string]$Specification = ''
)
$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$par = Split-Path -Parent $out
$policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
$policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
$initial = Get-Content -LiteralPath (Join-Path $out 'initial-guard-267.json') -Raw | ConvertFrom-Json
if ($policy.independentFindingPreparationWorkers.F231 -cne 'ed471f5e-c998-47a0-a617-4b6bcd83121b' -or
    $policy.activeWorkerPreparationScopes.F231 -cne $initial.scope -or
    $policy.actualWorkerBuildHoldActive -cne $false -or
    $policy.buildAndTestWorkQuiesced -cne $false -or
    (Test-Path -LiteralPath (Join-Path $par 'benchmark-exclusive.lease.json')))
{
    throw 'F231 source utility entry guard failed.'
}
$observer = [ordered]@{
    pid = $PID
    startUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
}
$python = (Get-Command python -CommandType Application -ErrorAction Stop).Source
$helper = Join-Path $out 'source-capture-267-v1.py'
$arguments = @('-B', $helper, $Action)
if ($Specification -ne '')
{
    $arguments += $Specification
}
$beforePath = Join-Path $out "outer-$Invocation-before.json"
if (Test-Path -LiteralPath $beforePath)
{
    throw "Invocation already exists: $Invocation"
}
[ordered]@{
    observedAt = [DateTime]::UtcNow.ToString('o')
    observer = $observer
    executable = $python
    arguments = $arguments
    cwd = $out
    helperSha256 = (Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash
    policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($policyBytes))
    ownerId = $initial.ownerId
    exactScopeMatched = $true
    leaseAbsentAtObservation = $true
    actualWorkerBuildHoldActive = $false
    buildAndTestWorkQuiesced = $false
} | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $beforePath -Encoding utf8
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $python
$start.WorkingDirectory = $out
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $start.ArgumentList.Add($argument)
}
$start.Environment['F231_OUTER_PS_PID'] = [string]$observer.pid
$start.Environment['F231_OUTER_PS_START_UTC'] = $observer.startUtc
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
if (-not $process.Start())
{
    throw 'Python source utility did not start.'
}
$root = [ordered]@{
    pid = $process.Id
    startUtc = $process.StartTime.ToUniversalTime().ToString('o')
    executable = $python
    arguments = $arguments
    identityBoundByOwnedProcessHandle = $true
}
$root | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $out "outer-$Invocation-started.json") -Encoding utf8
$stdoutPath = Join-Path $out "outer-$Invocation-stdout.bin"
$stderrPath = Join-Path $out "outer-$Invocation-stderr.bin"
$stdout = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
$stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
$exited = $process.WaitForExit(900000)
if (-not $exited)
{
    [ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        root = $root
        observer = $observer
        rootExited = $false
        noSuccessClaim = $true
        noUnownedProcessTermination = $true
    } | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $out "outer-$Invocation-INCOMPLETE.json") -Encoding utf8
    throw 'Source utility deadline exceeded; root/streams remain unqualified.'
}
$process.WaitForExit()
$stdoutTask.GetAwaiter().GetResult()
$stderrTask.GetAwaiter().GetResult()
$stdout.Dispose()
$stderr.Dispose()
$exitCode = $process.ExitCode
[ordered]@{
    observedAt = [DateTime]::UtcNow.ToString('o')
    root = $root
    observer = $observer
    rootExited = $true
    waitForExitReturned = $true
    rootExitCode = $exitCode
    stdoutDrainCompleted = $stdoutTask.IsCompletedSuccessfully
    stderrDrainCompleted = $stderrTask.IsCompletedSuccessfully
    stdout = [ordered]@{ path = $stdoutPath; bytes = (Get-Item -LiteralPath $stdoutPath).Length; sha256 = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash }
    stderr = [ordered]@{ path = $stderrPath; bytes = (Get-Item -LiteralPath $stderrPath).Length; sha256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash }
    directChildObservation = 'Owned Python root only. Git/gh roots and sampled descendants are creation-bound by the inner utility; no claim about unobserved short-lived descendants.'
    outerToolReturnNotYetObserved = $true
} | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $out "outer-$Invocation-receipt.json") -Encoding utf8
Get-Content -LiteralPath $stdoutPath -Raw
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0)
{
    Get-Content -LiteralPath $stderrPath -Raw
}
Write-Output "OUTER_SOURCE_267 invocation=$Invocation pid=$($root.pid) exit=$exitCode stdoutDrain=$($stdoutTask.IsCompletedSuccessfully) stderrDrain=$($stderrTask.IsCompletedSuccessfully)"
$process.Dispose()
exit $exitCode
