param(
    [Parameter(Mandatory)][string]$Role,
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string[]]$NativeArguments,
    [string]$Executable = '',
    [string]$WorkingDirectory = '',
    [string]$RuntimeRoot = ''
)
$ErrorActionPreference = 'Stop'
$scope = Split-Path $PSScriptRoot -Parent
$graph = Join-Path $scope "graphs\$Role"
Set-Location $graph
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_MULTILEVEL_LOOKUP = '0'
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_CLI_HOME = Join-Path $scope "cli\$Role"
$env:NUGET_PACKAGES = Join-Path $scope "packages\$Role"
$env:NUGET_FALLBACK_PACKAGES = 'C:\.tools\.nuget\packages'
$env:NUGET_HTTP_CACHE_PATH = Join-Path $scope "http\$Role"
$env:TEMP = Join-Path $scope "scratch\$Role"
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:DOTNET_CLI_HOME,$env:NUGET_PACKAGES,$env:TEMP | Out-Null
. .\activate.ps1
if (-not $Executable) { $Executable = Join-Path $env:DOTNET_ROOT 'dotnet.exe' }
if ($RuntimeRoot)
{
    $env:DOTNET_ROOT = $RuntimeRoot
    $env:DOTNET_ROOT_X64 = $RuntimeRoot
    $env:VSTEST_DOTNET_HOST_PATH = Join-Path $RuntimeRoot 'dotnet.exe'
}
if (-not $WorkingDirectory) { $WorkingDirectory = $graph }
$prefix = Join-Path $PSScriptRoot "logs\$Role-$Name"
if (Test-Path "$prefix.process.json") { throw "Immutable command record already exists: $prefix" }
$quoted = $NativeArguments | ForEach-Object { if ($_ -match '\s|"') { '"' + $_.Replace('"','\"') + '"' } else { $_ } }
$record = [ordered]@{
    role=$Role; name=$Name; executable=$Executable; arguments=$NativeArguments
    workingDirectory=$WorkingDirectory; graph=$graph; startedUtc=[DateTime]::UtcNow.ToString('O')
    pid=$null; exitCode=$null; terminal=$false
    environment=@{ DOTNET_ROOT=$env:DOTNET_ROOT; DOTNET_ROLL_FORWARD=$env:DOTNET_ROLL_FORWARD
        DOTNET_CLI_HOME=$env:DOTNET_CLI_HOME; NUGET_PACKAGES=$env:NUGET_PACKAGES
        NUGET_FALLBACK_PACKAGES=$env:NUGET_FALLBACK_PACKAGES; TEMP=$env:TEMP
        DOTNET_GENERATE_ASPNET_CERTIFICATE=$env:DOTNET_GENERATE_ASPNET_CERTIFICATE
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
        MSBUILDDISABLENODEREUSE=$env:MSBUILDDISABLENODEREUSE
        DOTNET_ROOT_X64=$env:DOTNET_ROOT_X64; VSTEST_DOTNET_HOST_PATH=$env:VSTEST_DOTNET_HOST_PATH }
}
$process = Start-Process -FilePath $Executable -ArgumentList $quoted -WorkingDirectory $WorkingDirectory -PassThru -NoNewWindow -RedirectStandardOutput "$prefix.stdout.log" -RedirectStandardError "$prefix.stderr.log"
$record.pid = $process.Id
$record | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "$prefix.started.json"
Write-Host "START $Role/$Name PID=$($process.Id)"
$process.WaitForExit()
$process.Refresh()
$record.exitCode = $process.ExitCode
$record.terminal = $true
$record.finishedUtc = [DateTime]::UtcNow.ToString('O')
$record | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "$prefix.process.json"
Get-Content "$prefix.stdout.log" -Tail 35
Get-Content "$prefix.stderr.log" -Tail 20
Write-Host "EXIT $Role/$Name PID=$($process.Id) code=$($process.ExitCode)"
exit $process.ExitCode
