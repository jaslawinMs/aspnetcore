param(
    [Parameter(Mandatory)][string]$Checkout,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string[]]$NativeArguments,
    [string]$StartupHook = ''
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$policyPath = Join-Path (Split-Path (Split-Path $root)) 'policy.json'
$policy = Get-Content -Raw $policyPath | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'Build/test policy currently blocks native starts.'
}
Set-Location $Checkout
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:DOTNET_CLI_HOME = "$Checkout\artifacts\cli-home"
$env:NUGET_PACKAGES = 'C:\.tools\.nuget\packages\'
$env:NUGET_SCRATCH = "$Checkout\artifacts\nuget-scratch"
$env:NUGET_HTTP_CACHE_PATH = "$Checkout\artifacts\http-cache"
$env:TEMP = "$Checkout\artifacts\scratch"
$env:TMP = $env:TEMP
$env:DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER = '1'
New-Item -ItemType Directory -Force "$root\evidence", $env:DOTNET_CLI_HOME, $env:NUGET_SCRATCH, $env:NUGET_HTTP_CACHE_PATH, $env:TEMP | Out-Null
Remove-Item Env:\DOTNET_STARTUP_HOOKS -ErrorAction SilentlyContinue
Remove-Item Env:\DOTNET_ROLL_FORWARD -ErrorAction SilentlyContinue
if ($StartupHook)
{
    $env:DOTNET_STARTUP_HOOKS = $StartupHook
    $env:AUTOPERF_IDENTITY_OUTPUT = "$root\evidence\$Label-identities"
    New-Item -ItemType Directory $env:AUTOPERF_IDENTITY_OUTPUT -ErrorAction Stop | Out-Null
}
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
    activation = '. .\activate.ps1'
    executable = $exe
    arguments = $NativeArguments
    wrapperPid = $PID
    environment = [ordered]@{
        DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
        MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
        DOTNET_ROOT = $env:DOTNET_ROOT
        DOTNET_STARTUP_HOOKS = $env:DOTNET_STARTUP_HOOKS
        AUTOPERF_IDENTITY_OUTPUT = $env:AUTOPERF_IDENTITY_OUTPUT
        DOTNET_CLI_HOME = $env:DOTNET_CLI_HOME
        NUGET_PACKAGES = $env:NUGET_PACKAGES
        NUGET_SCRATCH = $env:NUGET_SCRATCH
        NUGET_HTTP_CACHE_PATH = $env:NUGET_HTTP_CACHE_PATH
        TEMP = $env:TEMP
        TMP = $env:TMP
        DOTNET_ROLL_FORWARD = $env:DOTNET_ROLL_FORWARD
    }
    policyObservedAt = [DateTime]::UtcNow.ToString('o')
    policySha256 = (Get-FileHash $policyPath -Algorithm SHA256).Hash
    policyHoldActive = $policy.actualWorkerBuildHoldActive
    startedAt = [DateTime]::UtcNow.ToString('o')
    exhaustiveDescendantCensus = $false
    censusBoundary = 'Direct child and sampled descendants only; very short-lived descendants may be missed. MSBuild reuse/shared compilation disabled for build commands.'
}
$receiptPath = "$root\evidence\$Label.receipt.json"
if (Test-Path $receiptPath)
{
    throw "Invocation label already used: $Label"
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$receipt.nativePid = $process.Id
$receipt | ConvertTo-Json -Depth 15 | Set-Content -Encoding utf8NoBOM "$root\evidence\$Label.started.json"
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$known = @{}
$known[$process.Id] = [ordered]@{ processId = $process.Id; parentProcessId = $PID; name = 'dotnet.exe'; commandLine = ($NativeArguments -join ' '); direct = $true }
do
{
    $snapshot = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Select-Object ProcessId, ParentProcessId, Name, CommandLine, CreationDate)
    do
    {
        $added = $false
        foreach ($child in $snapshot)
        {
            if ($known.ContainsKey([int]$child.ParentProcessId) -and !$known.ContainsKey([int]$child.ProcessId))
            {
                $known[[int]$child.ProcessId] = [ordered]@{
                    processId = [int]$child.ProcessId
                    parentProcessId = [int]$child.ParentProcessId
                    name = $child.Name
                    commandLine = $child.CommandLine
                    creationDate = $child.CreationDate.ToUniversalTime().ToString('o')
                    direct = $false
                }
                $added = $true
            }
        }
    } while ($added)
} while (!$process.WaitForExit(250))
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $outText)
[System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $errText)
$receipt.exitCode = $process.ExitCode
$receipt.nativeExited = $process.HasExited
$receipt.bothStreamsDrained = $true
foreach ($child in @($known.Values))
{
    if ($child.processId -eq $process.Id)
    {
        continue
    }
    $remaining = Get-Process -Id $child.processId -ErrorAction SilentlyContinue
    if ($remaining)
    {
        $remaining.WaitForExit()
    }
}
$receipt.observedProcesses = @($known.Values)
$receipt.observedDescendantsDrained = $true
$receipt.exitedAt = [DateTime]::UtcNow.ToString('o')
$receipt | ConvertTo-Json -Depth 15 | Set-Content -Encoding utf8NoBOM $receiptPath
Write-Output ($receipt | ConvertTo-Json -Depth 15 -Compress)
Write-Output $outText
Write-Output $errText
$exitCode = $process.ExitCode
$process.Dispose()
exit $exitCode
