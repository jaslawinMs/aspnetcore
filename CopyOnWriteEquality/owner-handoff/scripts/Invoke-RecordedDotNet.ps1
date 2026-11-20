param(
    [Parameter(Mandatory)][ValidateSet('original', 'default')][string]$Version,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string[]]$DotNetArguments
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$holdPath = Join-Path $root 'manifest\hold.json'
if ((Test-Path $holdPath) -and (Get-Content $holdPath -Raw | ConvertFrom-Json).hold_active)
{
    throw 'Coordinator hold is active; refusing a new dotnet process.'
}

$sourceRoot = "C:\src\autoperf-finding-F151-$Version"
$pins = @{
    original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    default = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
}
$head = & git --no-pager -c core.longpaths=true -C $sourceRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -ne $pins[$Version])
{
    throw "Source pin mismatch for $Version"
}

$logRoot = Join-Path $root "logs\$Version"
New-Item -ItemType Directory -Force -Path $logRoot, (Join-Path $root "scratch\$Version") | Out-Null
$prefix = Join-Path $logRoot $Label
if (Test-Path "$prefix.command.json")
{
    throw "Refusing to overwrite an existing invocation: $prefix"
}

Set-Location $sourceRoot
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER = '1'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:TEMP = Join-Path $root "scratch\$Version"
$env:TMP = $env:TEMP
. .\activate.ps1
$dotnet = Join-Path $sourceRoot '.dotnet\dotnet.exe'
$command = [ordered]@{
    label = $Label
    version = $Version
    source_root = $sourceRoot
    source_pin = $head
    working_directory = $sourceRoot
    executable = $dotnet
    arguments = $DotNetArguments
    environment = @{
        DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
        MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
        DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER = $env:DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER
        DOTNET_ROOT = $env:DOTNET_ROOT
        TEMP = $env:TEMP
        TMP = $env:TMP
    }
    purpose = 'Untimed correctness/preparation only; no performance instrumentation.'
}
$command | ConvertTo-Json -Depth 10 | Set-Content "$prefix.command.json"
$info = [System.Diagnostics.ProcessStartInfo]::new()
$info.FileName = $dotnet
$info.WorkingDirectory = $sourceRoot
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $DotNetArguments)
{
    $info.ArgumentList.Add($argument)
}

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $info
[void]$process.Start()
$ownedPid = $process.Id
[ordered]@{ process_id = $ownedPid; state = 'running'; command_manifest = "$prefix.command.json" } |
    ConvertTo-Json | Set-Content "$prefix.lifecycle.json"
$stdoutStream = [System.IO.File]::Create("$prefix.stdout.txt")
$stderrStream = [System.IO.File]::Create("$prefix.stderr.txt")
try
{
    $stdoutCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdoutStream)
    $stderrCopy = $process.StandardError.BaseStream.CopyToAsync($stderrStream)
    $process.WaitForExit()
    $stdoutCopy.GetAwaiter().GetResult()
    $stderrCopy.GetAwaiter().GetResult()
    $code = $process.ExitCode
}
finally
{
    $stdoutStream.Dispose()
    $stderrStream.Dispose()
}

[ordered]@{
    process_id = $ownedPid
    state = 'exited'
    exit_code = $code
    command_manifest = "$prefix.command.json"
    stdout = "$prefix.stdout.txt"
    stderr = "$prefix.stderr.txt"
} | ConvertTo-Json | Set-Content "$prefix.lifecycle.json"
Write-Output "$Version / $Label : exit $code; PID $ownedPid exited"
Get-Content "$prefix.stdout.txt" -Tail 45
Get-Content "$prefix.stderr.txt" -Tail 45
exit $code
