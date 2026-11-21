param([Parameter(Mandatory = $true)][string]$Helper)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$utf8 = [System.Text.UTF8Encoding]::new($false)
$name = [System.IO.Path]::GetFileNameWithoutExtension($Helper)
$outputRoot = Join-Path $PSScriptRoot ('launches\' + $name)
if (Test-Path $outputRoot) { throw "Launch already exists: $outputRoot" }
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null
$node = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$psi = [System.Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $node
$psi.WorkingDirectory = $PSScriptRoot
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.ArgumentList.Add((Join-Path $PSScriptRoot $Helper))
$receipt = [ordered]@{
    helper = $Helper
    launcherPid = $PID
    launcherCommandLine = [Environment]::CommandLine
    argv = @($node, (Join-Path $PSScriptRoot $Helper))
    cwd = $PSScriptRoot
    startedUtc = [DateTime]::UtcNow.ToString('O')
    wait = 'Process.WaitForExit, then GetResult on both ReadToEndAsync tasks, Dispose'
    buildOrTest = $false
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $psi
try
{
    if (-not $process.Start()) { throw 'Node source helper did not start' }
    $receipt.pid = $process.Id
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $receipt.exitCode = $process.ExitCode
    $receipt.processWaited = $true
    $receipt.stdoutDrained = $true
    $receipt.stderrDrained = $true
    [System.IO.File]::WriteAllText((Join-Path $outputRoot 'stdout.txt'), $stdout, $utf8)
    [System.IO.File]::WriteAllText((Join-Path $outputRoot 'stderr.txt'), $stderr, $utf8)
}
finally
{
    $process.Dispose()
    $receipt.processObjectDisposed = $true
    $receipt.completedUtc = [DateTime]::UtcNow.ToString('O')
    [System.IO.File]::WriteAllText((Join-Path $outputRoot 'receipt.json'), ($receipt | ConvertTo-Json -Depth 8), $utf8)
}
Write-Output $stdout
if ($stderr) { Write-Output $stderr }
if ($receipt.exitCode -ne 0) { throw "Helper failed with exit $($receipt.exitCode); streams preserved" }
