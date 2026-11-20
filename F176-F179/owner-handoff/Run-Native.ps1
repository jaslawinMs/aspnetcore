param(
    [Parameter(Mandatory)][string]$Checkout,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string[]]$NativeArguments,
    [ValidateSet('dotnet', 'node')][string]$Tool = 'dotnet',
    [string]$StartupHook = '',
    [switch]$CaptureTesthostModules
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$policyPath = Join-Path (Split-Path (Split-Path $root)) 'policy.json'
$policy = Get-Content -Raw $policyPath | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'Build/test policy currently blocks NEW native starts.'
}
function Write-AtomicJson([string]$Filename, $Value)
{
    $stage = "$Filename.$PID.stage"
    [System.IO.File]::WriteAllText($stage, ($Value | ConvertTo-Json -Depth 30))
    [System.IO.File]::Move($stage, $Filename, $true)
}
function Get-CreationUtc($Process)
{
    return $Process.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
}
function Get-Key([int]$ProcessId, [string]$CreationUtc)
{
    return "$ProcessId@$CreationUtc"
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
Remove-Item Env:\AUTOPERF_IDENTITY_OUTPUT -ErrorAction SilentlyContinue
if ($StartupHook)
{
    $env:DOTNET_STARTUP_HOOKS = $StartupHook
    $env:AUTOPERF_IDENTITY_OUTPUT = "$root\evidence\$Label-identities"
    New-Item -ItemType Directory $env:AUTOPERF_IDENTITY_OUTPUT -ErrorAction Stop | Out-Null
}
. .\activate.ps1
$exe = if ($Tool -eq 'dotnet') { Join-Path $Checkout '.dotnet\dotnet.exe' } else { (Get-Command node.exe).Source }
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
$receiptPath = "$root\evidence\$Label.receipt.json"
if ((Test-Path $receiptPath) -or (Test-Path "$root\evidence\$Label.started.json"))
{
    throw "Invocation label already used: $Label"
}
$wrapper = Get-Process -Id $PID
$receipt = [ordered]@{
    recorderVersion = '022-v2-atomic-pid-creation-aware'
    tool = $Tool
    label = $Label
    checkout = $Checkout
    activation = '. .\activate.ps1'
    executable = $exe
    arguments = $NativeArguments
    wrapperPid = $PID
    wrapperCreationUtc = $wrapper.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
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
    policyObservedAtUtc = [DateTime]::UtcNow.ToString('o')
    policySha256 = (Get-FileHash $policyPath -Algorithm SHA256).Hash
    policyHoldActive = [bool]$policy.actualWorkerBuildHoldActive
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    exhaustiveDescendantCensus = $false
    censusBoundary = 'Direct child plus sampled transitive descendants only. Short-lived descendants may be missed. PID ownership requires matching creation UTC; reuse is not owned. Both redirected streams fully drained; no performance measurement.'
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$receipt.nativePid = $process.Id
$receipt.nativeCreationUtc = $process.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
Write-AtomicJson "$root\evidence\$Label.started.json" $receipt
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$known = @{}
$observations = [System.Collections.Generic.List[object]]::new()
$moduleFiles = @{}
$moduleErrors = [System.Collections.Generic.List[object]]::new()
$censusErrors = [System.Collections.Generic.List[object]]::new()
$rootKey = Get-Key $process.Id $receipt.nativeCreationUtc
$known[$rootKey] = [ordered]@{
    processId = $process.Id
    parentProcessId = $PID
    name = [System.IO.Path]::GetFileName($exe)
    commandLine = ($NativeArguments -join ' ')
    creationUtc = $receipt.nativeCreationUtc
    parentCreationUtc = $receipt.wrapperCreationUtc
    direct = $true
}
do
{
    $snapshot = @()
    try
    {
        $snapshot = @(Get-CimInstance Win32_Process -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, Name, CommandLine, CreationDate)
    }
    catch
    {
        $censusErrors.Add([ordered]@{ observedAtUtc = [DateTime]::UtcNow.ToString('o'); error = $_.Exception.Message })
    }
    do
    {
        $added = $false
        foreach ($child in $snapshot)
        {
            $creation = Get-CreationUtc $child
            $key = Get-Key ([int]$child.ProcessId) $creation
            if ($known.ContainsKey($key))
            {
                continue
            }
            $parent = @($known.Values | Where-Object { $_.processId -eq [int]$child.ParentProcessId -and [DateTime]$_.creationUtc -le [DateTime]$creation })
            if ($parent.Count -eq 1)
            {
                $liveParent = @($snapshot | Where-Object { [int]$_.ProcessId -eq [int]$child.ParentProcessId })
                if ($liveParent.Count -eq 1 -and (Get-CreationUtc $liveParent[0]) -ne $parent[0].creationUtc)
                {
                    continue
                }
                $known[$key] = [ordered]@{
                    processId = [int]$child.ProcessId
                    parentProcessId = [int]$child.ParentProcessId
                    name = $child.Name
                    commandLine = $child.CommandLine
                    creationUtc = $creation
                    parentCreationUtc = $parent[0].creationUtc
                    direct = $false
                }
                $added = $true
            }
        }
    } while ($added)
    if ($CaptureTesthostModules)
    {
        foreach ($candidate in $snapshot)
        {
            $creation = Get-CreationUtc $candidate
            if ($candidate.Name -ne 'testhost.exe' -or !$known.ContainsKey((Get-Key ([int]$candidate.ProcessId) $creation)))
            {
                continue
            }
            try
            {
                $hostProcess = Get-Process -Id $candidate.ProcessId -ErrorAction Stop
                if ($hostProcess.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ') -ne $creation)
                {
                    throw 'PID changed between sampled ownership and module observation.'
                }
                $paths = @($hostProcess.Modules | ForEach-Object { $_.FileName })
                $observations.Add([ordered]@{
                    processId = [int]$candidate.ProcessId
                    creationUtc = $creation
                    parentProcessId = [int]$candidate.ParentProcessId
                    commandLine = $candidate.CommandLine
                    observedAtUtc = [DateTime]::UtcNow.ToString('o')
                    modulePaths = $paths
                })
                foreach ($filename in $paths)
                {
                    if (!$moduleFiles.ContainsKey($filename))
                    {
                        $version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($filename)
                        $moduleFiles[$filename] = [ordered]@{
                            path = $filename
                            bytes = (Get-Item -LiteralPath $filename).Length
                            sha256 = (Get-FileHash -LiteralPath $filename -Algorithm SHA256).Hash
                            fileVersion = $version.FileVersion
                            productVersion = $version.ProductVersion
                        }
                    }
                }
            }
            catch
            {
                $moduleErrors.Add([ordered]@{ processId = [int]$candidate.ProcessId; creationUtc = $creation; observedAtUtc = [DateTime]::UtcNow.ToString('o'); error = $_.Exception.Message })
            }
        }
    }
} while (!$process.WaitForExit(150))
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[System.IO.File]::WriteAllText("$root\evidence\$Label.stdout.txt", $outText)
[System.IO.File]::WriteAllText("$root\evidence\$Label.stderr.txt", $errText)
$receipt.exitCode = $process.ExitCode
$receipt.nativeExited = $process.HasExited
$receipt.bothStreamsDrained = $true
$terminal = [System.Collections.Generic.List[object]]::new()
foreach ($child in @($known.Values))
{
    $live = Get-Process -Id $child.processId -ErrorAction SilentlyContinue
    $state = 'not-running'
    $observedCreation = $null
    if ($live)
    {
        $observedCreation = $live.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
        if ($observedCreation -eq $child.creationUtc)
        {
            $live.WaitForExit()
            $state = 'matching-owned-process-exited'
        }
        else
        {
            $state = 'pid-reused-not-owned'
        }
    }
    $terminal.Add([ordered]@{
        processId = $child.processId
        creationUtc = $child.creationUtc
        checkedAtUtc = [DateTime]::UtcNow.ToString('o')
        observedCreationUtc = $observedCreation
        terminalState = $state
    })
}
$receipt.observedProcesses = @($known.Values)
$receipt.terminalChecks = $terminal.ToArray()
$receipt.censusErrors = $censusErrors.ToArray()
$receipt.observedDescendantsDrained = $true
if ($CaptureTesthostModules)
{
    Write-AtomicJson "$root\evidence\$Label.modules.json" ([ordered]@{
        boundary = 'All modules exposed by Process.Modules for sampled owned native testhost PIDs. Not exhaustive managed identity or a historical descendant census. No module filename/prefix exclusion.'
        observations = $observations.ToArray()
        files = @($moduleFiles.Values)
        transientErrors = $moduleErrors.ToArray()
        completed = $true
    })
    $receipt.modules = "evidence/$Label.modules.json"
}
$receipt.exitedAtUtc = [DateTime]::UtcNow.ToString('o')
Write-AtomicJson $receiptPath $receipt
Write-Output ($receipt | ConvertTo-Json -Depth 30 -Compress)
Write-Output $outText
Write-Output $errText
$exitCode = $process.ExitCode
$process.Dispose()
exit $exitCode
