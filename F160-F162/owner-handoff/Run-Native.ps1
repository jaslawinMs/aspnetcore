param(
    [Parameter(Mandatory)][string]$Checkout,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string[]]$NativeArguments
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $Checkout
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:DOTNET_CLI_HOME = "$root\work\cli"
$env:NUGET_PACKAGES = 'C:\.tools\.nuget\packages\'
$env:NUGET_SCRATCH = "$Checkout\artifacts\nuget-scratch"
$env:NUGET_HTTP_CACHE_PATH = "$Checkout\artifacts\http-cache"
$env:TEMP = "$Checkout\artifacts\scratch"
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:DOTNET_CLI_HOME,$env:NUGET_SCRATCH,$env:NUGET_HTTP_CACHE_PATH,$env:TEMP | Out-Null
. .\activate.ps1
$exe = Join-Path $Checkout '.dotnet\dotnet.exe'
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $exe
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
    executable = $exe
    arguments = $NativeArguments
    wrapperPid = $PID
    environment = @{
        DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
        MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
        DOTNET_ROOT = $env:DOTNET_ROOT
        DOTNET_ROLL_FORWARD = $env:DOTNET_ROLL_FORWARD
        DOTNET_CLI_HOME = $env:DOTNET_CLI_HOME
        NUGET_PACKAGES = $env:NUGET_PACKAGES
        NUGET_SCRATCH = $env:NUGET_SCRATCH
        NUGET_HTTP_CACHE_PATH = $env:NUGET_HTTP_CACHE_PATH
        TEMP = $env:TEMP
        TMP = $env:TMP
    }
    startedAt = [DateTime]::UtcNow.ToString('o')
    exhaustiveDescendantCensus = $false
    censusGap = 'Only the actual direct native PID is recorded; short-lived descendants are not exhaustively sampled.'
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$receipt.nativePid = $process.Id
$receipt | ConvertTo-Json -Depth 10 | Set-Content "$root\evidence\$Label.started.json"
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $outText)
[System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $errText)
$receipt.exitCode = $process.ExitCode
$receipt.exitedAt = [DateTime]::UtcNow.ToString('o')
$receipt.nativeExited = $process.HasExited
$receipt.bothStreamsDrained = $true
$receipt | ConvertTo-Json -Depth 10 | Set-Content "$root\evidence\$Label.receipt.json"
Write-Output ($receipt | ConvertTo-Json -Depth 10 -Compress)
Write-Output $outText
Write-Output $errText
$exitCode = $process.ExitCode
$process.Dispose()
exit $exitCode
