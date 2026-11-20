param(
    [Parameter(Mandatory)][string]$Checkout,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string[]]$NativeArguments,
    [string]$Executable = '',
    [switch]$NoActivation
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location -LiteralPath $Checkout
if (-not $NoActivation)
{
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $env:DOTNET_CLI_HOME = "$Checkout\artifacts\private-cli"
    $env:NUGET_PACKAGES = 'C:\.tools\.nuget\packages\'
    $env:NUGET_SCRATCH = "$Checkout\artifacts\nuget-scratch"
    $env:NUGET_HTTP_CACHE_PATH = "$Checkout\artifacts\http-cache"
    $env:TEMP = "$Checkout\artifacts\scratch"
    $env:TMP = $env:TEMP
    Remove-Item Env:\DOTNET_ROLL_FORWARD -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force $env:DOTNET_CLI_HOME,$env:NUGET_SCRATCH,$env:NUGET_HTTP_CACHE_PATH,$env:TEMP | Out-Null
    . .\activate.ps1
}
if (-not $Executable)
{
    $Executable = Join-Path $Checkout '.dotnet\dotnet.exe'
}
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $Executable
$start.WorkingDirectory = $Checkout
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $NativeArguments)
{
    $start.ArgumentList.Add($argument)
}
$receipt = [ordered]@{
    label = $Label
    checkout = $Checkout
    executable = $Executable
    arguments = $NativeArguments
    wrapperPid = $PID
    runnerSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    activatedExactCheckout = -not $NoActivation
    environment = @{}
    startedAt = [DateTime]::UtcNow.ToString('o')
    exhaustiveDescendantCensus = $false
    censusGap = 'Bounded parent-PID samples record observed native children only; short-lived or reparented descendants may be absent.'
}
foreach ($name in @('DOTNET_GENERATE_ASPNET_CERTIFICATE','DOTNET_ADD_GLOBAL_TOOLS_TO_PATH','MSBUILDDISABLENODEREUSE','DOTNET_ROOT','DOTNET_ROLL_FORWARD','DOTNET_CLI_HOME','NUGET_PACKAGES','NUGET_SCRATCH','NUGET_HTTP_CACHE_PATH','TEMP','TMP'))
{
    $receipt.environment[$name] = [Environment]::GetEnvironmentVariable($name)
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$receipt.nativePid = $process.Id
$receipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 "$root\evidence\$Label.started.json"
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$known = @{}
while (-not $process.WaitForExit(1000))
{
    $parents = @($process.Id) + @($known.Keys)
    foreach ($parentId in $parents)
    {
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction SilentlyContinue))
        {
            if (-not $known.ContainsKey([int]$child.ProcessId))
            {
                $known[[int]$child.ProcessId] = [ordered]@{
                    pid = [int]$child.ProcessId
                    parentPid = [int]$child.ParentProcessId
                    name = $child.Name
                    commandLine = $child.CommandLine
                    creationDate = $child.CreationDate.ToUniversalTime().ToString('o')
                }
            }
        }
    }
}
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $outText)
[System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $errText)
$receipt.exitCode = $process.ExitCode
$receipt.exitedAt = [DateTime]::UtcNow.ToString('o')
$receipt.nativeExited = $process.HasExited
$receipt.bothStreamsDrained = $true
$receipt.knownChildren = @($known.Values)
$receipt.knownChildWaits = @()
foreach ($child in $known.Values)
{
    $live = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
    $same = $live -and [Math]::Abs(($live.StartTime.ToUniversalTime() - [DateTime]::Parse($child.creationDate)).Ticks) -lt [TimeSpan]::TicksPerMillisecond
    if ($same)
    {
        $live.WaitForExit()
    }
    $receipt.knownChildWaits += @{ pid = $child.pid; observedLiveAfterRoot = [bool]$same; terminal = $true; note = 'Waited if still the same process (creation-time tolerance <1 ms); otherwise absent or PID reused.' }
}
$receipt.completedAt = [DateTime]::UtcNow.ToString('o')
$receipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 "$root\evidence\$Label.receipt.json"
Write-Output ($receipt | ConvertTo-Json -Depth 12 -Compress)
Write-Output $outText
Write-Output $errText
$exitCode = $process.ExitCode
$process.Dispose()
exit $exitCode
