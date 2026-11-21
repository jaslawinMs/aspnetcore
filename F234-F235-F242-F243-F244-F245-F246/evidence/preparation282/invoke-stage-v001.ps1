param(
    [Parameter(Mandatory = $true)][string]$Stage,
    [Parameter(Mandatory = $true)][string]$Label
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$out = $PSScriptRoot
$receiptDirectory = Join-Path $out "launches\$Label"
if (Test-Path -LiteralPath $receiptDirectory)
{
    throw "Refusing to overwrite an existing launch: $Label"
}
[void][System.IO.Directory]::CreateDirectory($receiptDirectory)
$utf8 = [System.Text.UTF8Encoding]::new($false)
$stagePath = Join-Path $out $Stage
$node = (Get-Command node -CommandType Application -ErrorAction Stop).Source
$command = @{
    executable = $node
    arguments = @($stagePath)
    workingDirectory = $out
    maximumCreationBoundMilliseconds = 650000
    terminalLimit = 'Direct Node helper root and redirected streams only; its explicitly spawned Git/gh roots have separate records. No exhaustive descendant census.'
}
[System.IO.File]::WriteAllText((Join-Path $receiptDirectory 'command.json'), ($command | ConvertTo-Json -Depth 6), $utf8)
[System.IO.File]::WriteAllBytes((Join-Path $receiptDirectory 'stdin.bin'), [byte[]]::new(0))
$stdout = [System.IO.File]::Create((Join-Path $receiptDirectory 'stdout.bin'))
$stderr = [System.IO.File]::Create((Join-Path $receiptDirectory 'stderr.bin'))
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
$process.StartInfo.FileName = $node
[void]$process.StartInfo.ArgumentList.Add($stagePath)
$process.StartInfo.WorkingDirectory = $out
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.CreateNoWindow = $true
$process.StartInfo.RedirectStandardInput = $true
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true
$creationUtc = [DateTime]::UtcNow
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$started = $false
$rootExited = $false
$stdoutComplete = $false
$stderrComplete = $false
$deadlineExpired = $false
$caught = $null
$exitCode = $null
try
{
    $started = $process.Start()
    $process.StandardInput.Close()
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $rootExited = $process.WaitForExit([Math]::Max(1, 650000 - [int]$clock.ElapsedMilliseconds))
    if ($rootExited)
    {
        $exitCode = $process.ExitCode
        $stdoutComplete = $stdoutTask.Wait([Math]::Max(1, 650000 - [int]$clock.ElapsedMilliseconds))
        $stderrComplete = $stderrTask.Wait([Math]::Max(1, 650000 - [int]$clock.ElapsedMilliseconds))
    }
    if (-not ($rootExited -and $stdoutComplete -and $stderrComplete))
    {
        $deadlineExpired = $true
        if (-not $process.HasExited)
        {
            $process.Kill()
        }
    }
}
catch
{
    $caught = $_.Exception.ToString()
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
}
$terminal = @{
    helperPid = if ($started) { $process.Id } else { $null }
    creationUtc = $creationUtc.ToString('o')
    observedUtc = [DateTime]::UtcNow.ToString('o')
    rootExited = $rootExited
    actualHelperExitCode = $exitCode
    stdoutComplete = $stdoutComplete
    stderrComplete = $stderrComplete
    creationBoundExpired = $deadlineExpired
    exception = $caught
    outerPowerShellToolExitNotYetKnown = $true
    terminalLimit = $command.terminalLimit
}
[System.IO.File]::WriteAllText((Join-Path $receiptDirectory 'terminal.json'), ($terminal | ConvertTo-Json -Depth 6), $utf8)
$terminal | ConvertTo-Json -Depth 6 -Compress
if ($caught -or $deadlineExpired -or -not ($rootExited -and $stdoutComplete -and $stderrComplete))
{
    exit 97
}
exit $exitCode
