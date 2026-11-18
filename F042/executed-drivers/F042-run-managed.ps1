param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9-]*$')]
    [string]$Label,
    [ValidateSet('Default', 'Primary')]
    [string]$Repository = 'Default',
    [Parameter(Mandatory)]
    [string[]]$Arguments
)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F042'
$worktree = Get-Content -LiteralPath (Join-Path $run 'current-default-worktree.json') -Raw | ConvertFrom-Json
$root = if ($Repository -eq 'Default') { $worktree.actualVerificationRoot } else { 'C:\src\aspnetcore' }
$output = Join-Path $run "validation\$Label"
if ((Test-Path -LiteralPath $output) -or ($Arguments -contains 'measure'))
{
    throw 'Do not overwrite a recorded run or use this untimed runner to authorize timing.'
}

[System.IO.Directory]::CreateDirectory($output) | Out-Null
Set-Location -LiteralPath $root
. (Join-Path $root 'activate.ps1')
$executable = Join-Path $root '.dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $executable -PathType Leaf))
{
    throw 'The activated repository-local dotnet executable is absent.'
}
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $executable
$start.WorkingDirectory = $root
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $Arguments)
{
    $start.ArgumentList.Add($argument)
}
$configCount = if ($start.Environment.ContainsKey('GIT_CONFIG_COUNT')) { [int]$start.Environment['GIT_CONFIG_COUNT'] } else { 0 }
$start.Environment['GIT_CONFIG_COUNT'] = ($configCount + 1).ToString([Globalization.CultureInfo]::InvariantCulture)
$start.Environment["GIT_CONFIG_KEY_$configCount"] = 'core.longpaths'
$start.Environment["GIT_CONFIG_VALUE_$configCount"] = 'true'
$command = [ordered]@{
    executable = $executable
    arguments = $Arguments
    workingDirectory = $root
    actualRepository = $Repository
    actualCapturedDefault = $worktree.actualCapturedDefault
    actualProcessOnlyGitLongPaths = $true
    actualSourceComparison = $false
    actualTimingAuthorized = $false
    startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
}
$commandPath = Join-Path $output 'command.json'
$command | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $commandPath -Encoding utf8
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
try
{
    $started = $process.Start()
}
catch
{
    $command.actualLaunchFailure = $_.Exception.Message
    $command.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    $command | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $commandPath -Encoding utf8
    throw
}
if (-not $started)
{
    throw 'The recorded managed command could not start.'
}
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $output 'stdout.txt'), $stdout.GetAwaiter().GetResult(), $utf8)
[System.IO.File]::WriteAllText((Join-Path $output 'stderr.txt'), $stderr.GetAwaiter().GetResult(), $utf8)
$command.actualExitCode = $process.ExitCode
$command.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
$command | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $commandPath -Encoding utf8
Get-Content -LiteralPath (Join-Path $output 'stdout.txt') -Tail 35
Get-Content -LiteralPath (Join-Path $output 'stderr.txt') -Tail 20
Write-Output "Recorded exit $($process.ExitCode): $commandPath"
exit $process.ExitCode
