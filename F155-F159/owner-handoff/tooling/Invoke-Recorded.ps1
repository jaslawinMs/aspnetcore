param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Executable,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = 'C:\src\aspnetcore',
    [hashtable]$Environment = @{}
)
$ErrorActionPreference = 'Stop'
$directory = Join-Path $PSScriptRoot 'commands'
$prefix = Join-Path $directory $Name
if (Test-Path "$prefix.json") { throw "Receipt already exists: $Name" }
$info = [System.Diagnostics.ProcessStartInfo]::new()
$info.FileName = $Executable
$info.WorkingDirectory = $WorkingDirectory
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $Arguments) { [void]$info.ArgumentList.Add($argument) }
foreach ($key in $Environment.Keys) { $info.Environment[$key] = $Environment[$key] }
$record = [ordered]@{
    name = $Name
    recorderPid = $PID
    recorderParentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId
    executable = $Executable
    arguments = $Arguments
    workingDirectory = $WorkingDirectory
    environmentOverrides = $Environment
    inheritedEnvironment = [ordered]@{
        PATH = $env:PATH
        DOTNET_ROOT = $env:DOTNET_ROOT
        NUGET_PACKAGES = $env:NUGET_PACKAGES
    }
    startedUtc = [DateTime]::UtcNow.ToString('o')
    stdout = "commands\$Name.stdout.txt"
    stderr = "commands\$Name.stderr.txt"
    state = 'starting'
}
$record | ConvertTo-Json -Depth 10 | Set-Content "$prefix.json" -Encoding utf8
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $info
try {
    [void]$process.Start()
    $record.pid = $process.Id
    $record.state = 'running'
    $record | ConvertTo-Json -Depth 10 | Set-Content "$prefix.json" -Encoding utf8
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    [IO.File]::WriteAllText("$prefix.stdout.txt", $stdout.GetAwaiter().GetResult())
    [IO.File]::WriteAllText("$prefix.stderr.txt", $stderr.GetAwaiter().GetResult())
    $record.exitCode = $process.ExitCode
    $record.state = 'terminal'
    $record.streamsTerminal = $true
    $record.endedUtc = [DateTime]::UtcNow.ToString('o')
    $record | ConvertTo-Json -Depth 10 | Set-Content "$prefix.json" -Encoding utf8
    Get-Content "$prefix.stdout.txt"
    Get-Content "$prefix.stderr.txt"
    "RECORDED $Name PID=$($record.pid) exit=$($record.exitCode) streams=terminal"
} catch {
    $record.state = 'recorder-failure'
    $record.failure = $_.ToString()
    $record | ConvertTo-Json -Depth 10 | Set-Content "$prefix.json" -Encoding utf8
    throw
} finally {
    $process.Dispose()
}
