param(
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string]$Checkout,
    [Parameter(Mandatory)][string]$Executable,
    [Parameter(Mandatory)][string[]]$Arguments
)

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$payload = Split-Path $PSScriptRoot
if (Test-Path (Join-Path $payload 'MANIFEST.json')) { throw 'Frozen payload' }
$log = Join-Path $payload "evidence\$Label"
if (Test-Path "$log.receipt.json") { throw 'Attempt already exists' }
Push-Location $Checkout
try
{
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_CLI_HOME = Join-Path $root 'work\cli'
    $env:NUGET_SCRATCH = Join-Path $root 'work\nuget-scratch'
    $env:NUGET_HTTP_CACHE_PATH = Join-Path $root 'work\http-cache'
    $env:TEMP = Join-Path $root 'work\scratch'
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory $env:DOTNET_CLI_HOME,$env:NUGET_SCRATCH,$env:NUGET_HTTP_CACHE_PATH,$env:TEMP -Force | Out-Null
    . .\activate.ps1
    $environment = [ordered]@{}
    foreach ($key in 'DOTNET_ROOT','DOTNET_ROLL_FORWARD','DOTNET_GENERATE_ASPNET_CERTIFICATE','DOTNET_ADD_GLOBAL_TOOLS_TO_PATH','MSBUILDDISABLENODEREUSE','NUGET_PACKAGES','DOTNET_CLI_HOME','TEMP','TMP')
    {
        $environment[$key] = [Environment]::GetEnvironmentVariable($key)
    }
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $Executable
    $info.WorkingDirectory = $Checkout
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in $Arguments) { $info.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $info
    [void]$process.Start()
    $known = @{}
    $known[$process.Id] = [ordered]@{pid=$process.Id; startUtc=$process.StartTime.ToUniversalTime().ToString('O'); executable=$Executable}
    [ordered]@{label=$Label; executable=$Executable; arguments=$Arguments; checkout=$Checkout; environment=$environment; pid=$process.Id; startedUtc=[DateTime]::UtcNow.ToString('O')} |
        ConvertTo-Json -Depth 8 | Set-Content "$log.started.json"
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    while (-not $process.WaitForExit(1000))
    {
        foreach ($parentId in @($known.Keys))
        {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction SilentlyContinue))
            {
                if (-not $known.ContainsKey([int]$child.ProcessId))
                {
                    $known[[int]$child.ProcessId] = [ordered]@{pid=[int]$child.ProcessId; startUtc=$child.CreationDate.ToUniversalTime().ToString('O'); executable=$child.ExecutablePath}
                }
            }
        }
    }
    [IO.File]::WriteAllText("$log.stdout.txt", $stdout.GetAwaiter().GetResult())
    [IO.File]::WriteAllText("$log.stderr.txt", $stderr.GetAwaiter().GetResult())
    $terminal = foreach ($entry in $known.Values)
    {
        $current = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
        $alive = $null -ne $current -and $current.StartTime.ToUniversalTime().ToString('O') -eq $entry.startUtc
        [ordered]@{identity=$entry; originalIdentityStillRunning=$alive}
    }
    [ordered]@{label=$Label; executable=$Executable; arguments=$Arguments; checkout=$Checkout; environment=$environment; exitCode=$process.ExitCode; terminalUtc=[DateTime]::UtcNow.ToString('O'); observedOwnedProcesses=@($terminal); descendantSamplingExhaustive=$false; untimed=$true} |
        ConvertTo-Json -Depth 10 | Set-Content "$log.receipt.json"
    "$Label exit=$($process.ExitCode), observed=$($known.Count)"
    Get-Content "$log.stdout.txt" | Where-Object { $_ -match 'error |failed|Passed!|Failed!|Total tests|Test Run' } | Select-Object -First 9
    Get-Content "$log.stderr.txt" | Select-Object -First 7
}
finally
{
    Pop-Location
}
