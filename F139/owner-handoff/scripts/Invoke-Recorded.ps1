param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string]$File,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $PSScriptRoot
)
$ErrorActionPreference = 'Stop'
$logRoot = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force $logRoot | Out-Null
$prefix = Join-Path $logRoot $Id
if (Test-Path "$prefix.json") { throw "Receipt already exists: $Id" }
$info = [System.Diagnostics.ProcessStartInfo]::new()
$info.FileName = $File
$info.WorkingDirectory = $WorkingDirectory
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $Arguments) { $info.ArgumentList.Add($argument) }
$environment = [ordered]@{}
foreach ($key in @('DOTNET_ROOT', 'DOTNET_ROOT(x86)', 'DOTNET_ROLL_FORWARD', 'DOTNET_ROLL_FORWARD_TO_PRERELEASE', 'DOTNET_MULTILEVEL_LOOKUP', 'DOTNET_GENERATE_ASPNET_CERTIFICATE', 'DOTNET_ADD_GLOBAL_TOOLS_TO_PATH', 'MSBUILDDISABLENODEREUSE', 'DOTNET_HOST_TRACE', 'DOTNET_HOST_TRACEFILE', 'NUGET_PACKAGES')) {
    $environment[$key] = [Environment]::GetEnvironmentVariable($key)
}
$receipt = [ordered]@{
    id = $Id
    executable = $File
    arguments = $Arguments
    cwd = $WorkingDirectory
    environment = $environment
    wrapperPid = $PID
    startedUtc = [DateTime]::UtcNow.ToString('O')
    pid = $null
    exitCode = $null
    terminal = $false
    streamsTerminal = $false
    descendantCapture = 'Direct PID captured; fast and unobserved descendants are not exhaustively attested.'
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $info
try {
    [void]$process.Start()
    $receipt.pid = $process.Id
    $receipt | ConvertTo-Json -Depth 10 | Set-Content "$prefix.started.json" -Encoding utf8
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    [IO.File]::WriteAllText("$prefix.stdout.log", $stdout)
    [IO.File]::WriteAllText("$prefix.stderr.log", $stderr)
    $receipt.exitCode = $process.ExitCode
    $receipt.terminal = $true
    $receipt.streamsTerminal = $true
    $receipt.finishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 10 | Set-Content "$prefix.json" -Encoding utf8
    Write-Output "RECORDED $Id PID=$($process.Id) EXIT=$($process.ExitCode) STREAMS=CLOSED"
    if ($stdout.Length -gt 0) { Write-Output $stdout.Substring([Math]::Max(0, $stdout.Length - 5500)) }
    if ($stderr.Length -gt 0) { Write-Output $stderr.Substring([Math]::Max(0, $stderr.Length - 2500)) }
    $global:RecordedExitCode = $process.ExitCode
}
finally {
    $process.Dispose()
}
