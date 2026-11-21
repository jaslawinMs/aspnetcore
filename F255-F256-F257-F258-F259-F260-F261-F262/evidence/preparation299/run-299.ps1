param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string[]]$NodeArguments
)

$ErrorActionPreference = 'Stop'
$directory = $PSScriptRoot
$prefix = Join-Path $directory $Label
$utf8 = [System.Text.UTF8Encoding]::new($false)
$info = [System.Diagnostics.ProcessStartInfo]::new()
$info.FileName = (Get-Command node -CommandType Application).Source
$info.WorkingDirectory = 'C:\src\aspnetcore'
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardInput = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $NodeArguments)
{
    $info.ArgumentList.Add($argument)
}
$start = @{
    utc = [DateTime]::UtcNow.ToString('O')
    wrapperPid = $PID
    executable = $info.FileName
    arguments = $NodeArguments
    workingDirectory = $info.WorkingDirectory
    prospectiveWrapperExitCode = $null
}
[System.IO.File]::WriteAllText("$prefix.start.json", ($start | ConvertTo-Json -Depth 20) + "`n", $utf8)
[System.IO.File]::WriteAllBytes("$prefix.stdin.bin", [byte[]]::new(0))
$stdout = [System.IO.File]::Open("$prefix.stdout.bin", [System.IO.FileMode]::CreateNew)
$stderr = [System.IO.File]::Open("$prefix.stderr.bin", [System.IO.FileMode]::CreateNew)
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $info
try
{
    if (-not $process.Start())
    {
        throw 'Node helper failed to start.'
    }
    $childPid = $process.Id
    $process.StandardInput.Close()
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $process.WaitForExit()
    [System.Threading.Tasks.Task]::WaitAll(@($outTask, $errTask))
    $stdout.Dispose()
    $stderr.Dispose()
    $terminal = @{
        utc = [DateTime]::UtcNow.ToString('O')
        wrapperPid = $PID
        helperPid = $childPid
        helperExitCode = $process.ExitCode
        helperHasExited = $process.HasExited
        helperStreamsFullyDrained = $true
        stdoutSha256 = (Get-FileHash -LiteralPath "$prefix.stdout.bin" -Algorithm SHA256).Hash
        stderrSha256 = (Get-FileHash -LiteralPath "$prefix.stderr.bin" -Algorithm SHA256).Hash
        stdinSha256 = (Get-FileHash -LiteralPath "$prefix.stdin.bin" -Algorithm SHA256).Hash
        observedDescendants = @()
        descendantCensusComplete = $false
        prospectiveWrapperExitCode = $null
        limitation = 'Actual Node helper exit observed after WaitForExit and stream drains. This is not the final enclosing tool exit or a universal descendant census.'
    }
    [System.IO.File]::WriteAllText("$prefix.terminal.json", ($terminal | ConvertTo-Json -Depth 20) + "`n", $utf8)
    [Console]::Write([System.IO.File]::ReadAllText("$prefix.stdout.bin", $utf8))
    [Console]::Error.Write([System.IO.File]::ReadAllText("$prefix.stderr.bin", $utf8))
    exit $process.ExitCode
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
