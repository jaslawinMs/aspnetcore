$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = '.\invocation-initial-v1.json'
if (Test-Path -LiteralPath $receiptPath) { throw 'Single-use initial invocation cannot be replayed.' }
$policy = Get-Content -LiteralPath '..\policy.json' -Raw | ConvertFrom-Json
if ($policy.independentFindingPreparationWorkers.F206 -ne '2acd453e-18ab-4dd5-b36b-753c5e5a0a21' -or
    @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
    $policy.actualWorkerBuildHoldActive -ne $false -or
    $policy.buildAndTestWorkQuiesced -ne $false -or
    (Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'))
{
    throw 'F206 initial source invocation denied by current guards.'
}
$receipt = [ordered]@{
    recordedStartUtc = [DateTime]::UtcNow.ToString('o')
    launcherPid = $PID
    launcherExecutable = (Get-Process -Id $PID).Path
    outerToolPid = $null
    boundary = 'launcherPid identifies the PowerShell process executing the tool command; sourceChildRootPid is a separate observed child. No outer service PID or universal descendant closure is inferred.'
    helperPath = '.\collect-initial-source-v1.ps1'
    helperSha256 = (Get-FileHash -LiteralPath '.\collect-initial-source-v1.ps1' -Algorithm SHA256).Hash
    executable = (Get-Process -Id $PID).Path
    argv = @('-NoProfile', '-NonInteractive', '-File', '.\collect-initial-source-v1.ps1')
    workingDirectory = $PSScriptRoot
    sourceChildRootPid = $null
    sourceChildRootIdentity = $null
    waitForExitTimeoutMilliseconds = 120000
    waitForExitReturned = $null
    stdoutPath = '.\initial-v1.stdout.bin'
    stderrPath = '.\initial-v1.stderr.bin'
    stdoutDrainCompleted = $false
    stderrDrainCompleted = $false
    childExitCode = $null
    failure = $null
}
$p = [Diagnostics.Process]::new()
$out = $null
$err = $null
try
{
    $p.StartInfo.FileName = $receipt.executable
    $p.StartInfo.WorkingDirectory = $PSScriptRoot
    $p.StartInfo.UseShellExecute = $false
    $p.StartInfo.RedirectStandardOutput = $true
    $p.StartInfo.RedirectStandardError = $true
    $p.StartInfo.CreateNoWindow = $true
    foreach ($arg in $receipt.argv) { $p.StartInfo.ArgumentList.Add($arg) }
    $out = [IO.File]::Open($receipt.stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $err = [IO.File]::Open($receipt.stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    if (-not $p.Start()) { throw 'Source collector did not start.' }
    $receipt.sourceChildRootPid = $p.Id
    $outTask = $p.StandardOutput.BaseStream.CopyToAsync($out)
    $errTask = $p.StandardError.BaseStream.CopyToAsync($err)
    $receipt.sourceChildRootIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" |
        Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    $receipt.waitForExitReturned = $p.WaitForExit($receipt.waitForExitTimeoutMilliseconds)
    if (-not $receipt.waitForExitReturned) { $p.Kill(); $p.WaitForExit() }
    $outTask.GetAwaiter().GetResult()
    $receipt.stdoutDrainCompleted = $true
    $errTask.GetAwaiter().GetResult()
    $receipt.stderrDrainCompleted = $true
    $receipt.childExitCode = $p.ExitCode
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
    [IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 12) + "`n", $utf8)
}
if (Test-Path -LiteralPath $receipt.stdoutPath) { [Console]::Write([IO.File]::ReadAllText($receipt.stdoutPath)) }
if (Test-Path -LiteralPath $receipt.stderrPath) { [Console]::Error.Write([IO.File]::ReadAllText($receipt.stderrPath)) }
[Console]::WriteLine("INITIAL_OBSERVED sourceChildRootPid=$($receipt.sourceChildRootPid) childExit=$($receipt.childExitCode) waitReturned=$($receipt.waitForExitReturned) streams=$($receipt.stdoutDrainCompleted)/$($receipt.stderrDrainCompleted) launcherPid=$PID")
if ($null -ne $receipt.failure -or $receipt.childExitCode -ne 0 -or -not $receipt.waitForExitReturned) { exit 1 }
exit 0
