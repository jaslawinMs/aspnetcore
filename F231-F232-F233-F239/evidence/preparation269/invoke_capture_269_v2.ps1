param(
    [Parameter(Mandatory)][string]$Plan,
    [Parameter(Mandatory)][string]$Run
)
$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$start = [Diagnostics.ProcessStartInfo]::new((Get-Command pwsh).Source)
$start.WorkingDirectory = $base
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$arguments = @('-NoLogo', '-NoProfile', '-File', (Join-Path $base 'source_capture_269_v2.ps1'), '-Plan', $Plan, '-Run', $Run)
foreach ($arg in $arguments) { $start.ArgumentList.Add($arg) }
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
$null = $process.Start()
$creation = $process.StartTime.ToUniversalTime().ToString('o')
$outPath = Join-Path $base "$Run.outer.stdout.raw.bin"
$errPath = Join-Path $base "$Run.outer.stderr.raw.bin"
$out = [IO.File]::Open($outPath, [IO.FileMode]::CreateNew)
$err = [IO.File]::Open($errPath, [IO.FileMode]::CreateNew)
$outTask = $process.StandardOutput.BaseStream.CopyToAsync($out)
$errTask = $process.StandardError.BaseStream.CopyToAsync($err)
$process.WaitForExit()
$null = $outTask.GetAwaiter().GetResult()
$null = $errTask.GetAwaiter().GetResult()
$out.Dispose()
$err.Dispose()
$receipt = @{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    outerPid = $PID
    outerCreationUtc = [Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o')
    childPid = $process.Id
    childCreationUtc = $creation
    childWaitComplete = $true
    childExitCode = $process.ExitCode
    argv = @($start.FileName) + $arguments
    cwd = $base
    stdoutBytes = (Get-Item -LiteralPath $outPath).Length
    stdoutSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($outPath)))
    stderrBytes = (Get-Item -LiteralPath $errPath).Length
    stderrSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($errPath)))
    noSelfProspectiveExit = $true
}
$receiptPath = Join-Path $base "$Run.outer-wait.json"
$bytes = [Text.Encoding]::UTF8.GetBytes(($receipt | ConvertTo-Json -Depth 10) + "`n")
$stream = [IO.File]::Open($receiptPath, [IO.FileMode]::CreateNew)
try { $stream.Write($bytes) } finally { $stream.Dispose() }
[Console]::Write([IO.File]::ReadAllText($outPath))
[Console]::Error.Write([IO.File]::ReadAllText($errPath))
exit $process.ExitCode
