param(
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string]$WorkingDirectory,
    [Parameter(Mandatory)][string]$Executable,
    [Parameter(Mandatory)][string[]]$Arguments,
    [switch]$Activate,
    [string]$RuntimeRoot
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$log = Join-Path $root "logs\$Label"
New-Item -ItemType Directory -Path $log | Out-Null
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_CLI_HOME = Join-Path $root 'cli-home'
$env:NUGET_PACKAGES = Join-Path $root 'packages'
$env:NUGET_FALLBACK_PACKAGES = 'C:\src\autoperf-worker-a-37e809\artifacts\worker-a-runtime\packages;C:\src\autoperf-worker-a-default\artifacts\worker-a-runtime\packages'
$env:NUGET_HTTP_CACHE_PATH = Join-Path $root 'nuget-http-cache'
$env:NUGET_PLUGINS_CACHE_PATH = Join-Path $root 'nuget-plugins-cache'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:GIT_OPTIONAL_LOCKS = '0'
$env:GIT_CONFIG_COUNT = '1'
$env:GIT_CONFIG_KEY_0 = 'core.longpaths'
$env:GIT_CONFIG_VALUE_0 = 'true'
$env:TEMP = Join-Path $root 'scratch'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
Set-Location -LiteralPath $WorkingDirectory
if ($Activate)
{
    . .\activate.ps1
}
if ($RuntimeRoot)
{
    $env:DOTNET_ROOT = $RuntimeRoot
    ${env:DOTNET_ROOT(x86)} = $RuntimeRoot
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_HOST_TRACE = '1'
    $env:DOTNET_HOST_TRACEFILE = Join-Path $log 'host-resolution.txt'
}

$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $Executable
$start.WorkingDirectory = $WorkingDirectory
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $Arguments)
{
    $start.ArgumentList.Add($argument)
}
$record = [ordered]@{
    label = $Label
    machine = $env:COMPUTERNAME
    utc = [DateTimeOffset]::UtcNow.ToString('o')
    workingDirectory = $WorkingDirectory
    executable = $Executable
    arguments = $Arguments
    activation = [bool]$Activate
    dotnetRoot = $env:DOTNET_ROOT
    dotnetCliHome = $env:DOTNET_CLI_HOME
    runtimeRollForward = $env:DOTNET_ROLL_FORWARD
    certificateGeneration = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
    globalToolPath = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
    nodeReuse = $env:MSBUILDDISABLENODEREUSE
    performanceInstrumentation = 'none'
}
$process = [System.Diagnostics.Process]::Start($start)
$record.pid = $process.Id
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath "$log\started.json"
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout.GetAwaiter().GetResult() | Set-Content -LiteralPath "$log\stdout.txt"
$stderr.GetAwaiter().GetResult() | Set-Content -LiteralPath "$log\stderr.txt"
$record.exitCode = $process.ExitCode
$record.terminal = $process.HasExited
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath "$log\result.json"
Write-Output "$Label exit=$($process.ExitCode) pid=$($process.Id) terminal=$($process.HasExited)"
Get-Content -LiteralPath "$log\stdout.txt" -Tail 12
Get-Content -LiteralPath "$log\stderr.txt" -Tail 12
if ($process.ExitCode -ne 0)
{
    exit $process.ExitCode
}
