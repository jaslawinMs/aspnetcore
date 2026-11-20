param(
    [Parameter(Mandatory)][string]$Label,
    [string]$FilePath = '',
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = '',
    [string]$Checkout = '',
    [string]$StandardInputFile = '',
    [switch]$Dotnet,
    [switch]$CaptureModules,
    [switch]$OutsideCapsule
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$policyPath = Join-Path (Split-Path $root) 'policy.json'
$goPath = Join-Path $root 'control\GO-038.json'
$agentId = 'a46e395c-3977-48fa-b406-4126e927dd1e'
$output = Join-Path $root $(if ($OutsideCapsule) { 'audit-commands' } else { 'commands\raw' })
New-Item -ItemType Directory -Path $output -Force | Out-Null
$prefix = Join-Path $output $Label
if (Test-Path -LiteralPath "$prefix.started.json")
{
    throw "Invocation label already used: $Label"
}

function Write-AtomicJson([string]$Path, [object]$Value)
{
    [System.IO.File]::WriteAllText("$Path.partial", ($Value | ConvertTo-Json -Depth 30))
    Move-Item -LiteralPath "$Path.partial" -Destination $Path -Force
}

function Read-Permission
{
    $permission = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $go = Get-Content -LiteralPath $goPath -Raw | ConvertFrom-Json
    if (!$go.entryNativeHoldReleased -or $go.agentId -ne $agentId -or
        $permission.actualWorkerBuildHoldActive -ne $false -or
        $permission.workersMayBuildOrTest -ne $true -or
        $permission.independentFindingPreparationWorkers.F187 -ne $agentId)
    {
        throw 'Explicit GO or current exact-owner build/test policy does not permit a native start.'
    }

    return [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        sha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        actualWorkerBuildHoldActive = $permission.actualWorkerBuildHoldActive
        workersMayBuildOrTest = $permission.workersMayBuildOrTest
        registeredOwner = $permission.independentFindingPreparationWorkers.F187
        explicitGo = $go.explicitGo
    }
}

$permission = Read-Permission
if ($Dotnet)
{
    if (!$Checkout -or $Checkout -notin @('C:\src\ap-F187-o038', 'C:\src\ap-F187-d038'))
    {
        throw 'A dotnet invocation must activate one exact owned checkout.'
    }
    Set-Location $Checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $env:DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER = '1'
    $env:DOTNET_CLI_HOME = Join-Path $root "work\$Label\cli-home"
    $env:NUGET_PACKAGES = Join-Path $root 'packages'
    $env:NUGET_SCRATCH = Join-Path $root "work\$Label\nuget-scratch"
    $env:NUGET_HTTP_CACHE_PATH = Join-Path $root "work\$Label\http-cache"
    $env:TEMP = Join-Path $root "work\$Label\scratch"
    $env:TMP = $env:TEMP
    foreach ($directory in @($env:DOTNET_CLI_HOME, $env:NUGET_PACKAGES, $env:NUGET_SCRATCH, $env:NUGET_HTTP_CACHE_PATH, $env:TEMP))
    {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    foreach ($name in @('DOTNET_STARTUP_HOOKS', 'DOTNET_ROLL_FORWARD', 'DOTNET_ADDITIONAL_DEPS', 'DOTNET_SHARED_STORE'))
    {
        Remove-Item -LiteralPath "Env:\$name" -ErrorAction SilentlyContinue
    }
    . .\activate.ps1
    $FilePath = Join-Path $Checkout '.dotnet\dotnet.exe'
    if (!$WorkingDirectory)
    {
        $WorkingDirectory = $Checkout
    }
}
elseif (!$WorkingDirectory)
{
    $WorkingDirectory = $root
}

$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $FilePath
$start.WorkingDirectory = $WorkingDirectory
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.RedirectStandardInput = [bool]$StandardInputFile
foreach ($argument in $Arguments)
{
    $start.ArgumentList.Add($argument)
}
[void]$start.Environment.Remove('NODE_OPTIONS')
[void]$start.Environment.Remove('NODE_PATH')
[void]$start.Environment.Remove('NODE_V8_COVERAGE')
$selectedEnvironment = [ordered]@{}
foreach ($name in @('DOTNET_GENERATE_ASPNET_CERTIFICATE', 'DOTNET_ADD_GLOBAL_TOOLS_TO_PATH', 'MSBUILDDISABLENODEREUSE', 'DOTNET_ROOT', 'DOTNET_ROOT_X64', 'DOTNET_CLI_TELEMETRY_OPTOUT', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE', 'DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE', 'DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER', 'DOTNET_CLI_HOME', 'NUGET_PACKAGES', 'NUGET_SCRATCH', 'NUGET_HTTP_CACHE_PATH', 'TEMP', 'TMP', 'DOTNET_STARTUP_HOOKS', 'DOTNET_ROLL_FORWARD', 'DOTNET_ADDITIONAL_DEPS', 'DOTNET_SHARED_STORE'))
{
    if ($Dotnet -or $name -in @('DOTNET_STARTUP_HOOKS', 'DOTNET_ROLL_FORWARD'))
    {
        $selectedEnvironment[$name] = $start.Environment[$name]
    }
}
$selectedEnvironment['NODE_OPTIONS'] = $start.Environment['NODE_OPTIONS']
$selectedEnvironment['NODE_PATH'] = $start.Environment['NODE_PATH']
$selectedEnvironment['NODE_V8_COVERAGE'] = $start.Environment['NODE_V8_COVERAGE']
$wrapper = Get-Process -Id $PID
$record = [ordered]@{
    label = $Label
    agentId = $agentId
    executable = $FilePath
    arguments = $Arguments
    workingDirectory = $WorkingDirectory
    checkout = $Checkout
    dotnet = [bool]$Dotnet
    activation = if ($Dotnet) { 'Set-Location <exact checkout>; required environment; . .\activate.ps1' } else { $null }
    selectedEnvironment = $selectedEnvironment
    standardInputFile = if ($StandardInputFile) { $StandardInputFile } else { $null }
    standardInputSha256 = if ($StandardInputFile) { (Get-FileHash -LiteralPath $StandardInputFile -Algorithm SHA256).Hash } else { $null }
    recorderSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    wrapper = [ordered]@{ processId = $PID; creationUtc = $wrapper.StartTime.ToUniversalTime().ToString('o'); path = $wrapper.Path }
    policy = $permission
    state = 'prestart'
    startedUtc = [DateTime]::UtcNow.ToString('o')
    historicalTreeComplete = $false
    observationBoundary = 'Direct root plus bounded, sampled PID/UTC-creation descendants and Process.Modules. Short-lived descendants or modules may be missed; not a full historical OS tree or managed-assembly census.'
}
Write-AtomicJson "$prefix.prestart.json" $record
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
$known = @{}
$observations = [System.Collections.Generic.List[object]]::new()
$moduleFiles = @{}
$moduleErrors = [System.Collections.Generic.List[object]]::new()
$permission = Read-Permission
$record.policy = $permission
try
{
    [void]$process.Start()
    $record['root'] = [ordered]@{
        processId = $process.Id
        parentProcessId = $PID
        creationUtc = $process.StartTime.ToUniversalTime().ToString('o')
        name = [System.IO.Path]::GetFileName($FilePath)
        path = $FilePath
    }
    $known["$($process.Id)|$($record.root.creationUtc)"] = $record.root
    $record.state = 'started'
    Write-AtomicJson "$prefix.started.json" $record
    $outStream = [System.IO.File]::Open("$prefix.stdout.txt", [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $errStream = [System.IO.File]::Open("$prefix.stderr.txt", [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
    if ($StandardInputFile)
    {
        $inputStream = [System.IO.File]::OpenRead($StandardInputFile)
        $inputStream.CopyTo($process.StandardInput.BaseStream)
        $inputStream.Dispose()
        $process.StandardInput.Close()
    }
    do
    {
        $snapshot = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Select-Object ProcessId, ParentProcessId, Name, CreationDate)
        do
        {
            $added = $false
            foreach ($candidate in $snapshot)
            {
                $parent = @($known.Values | Where-Object { $_.processId -eq $candidate.ParentProcessId })
                if (!$parent.Count -or !$candidate.CreationDate)
                {
                    continue
                }
                $snapshotParent = @($snapshot | Where-Object { $_.ProcessId -eq $candidate.ParentProcessId -and $_.CreationDate })
                $matchedParent = @($parent | Where-Object {
                    $knownCreation = [DateTimeOffset]::Parse($_.creationUtc).UtcDateTime
                    @($snapshotParent | Where-Object {
                        [Math]::Abs(($_.CreationDate.ToUniversalTime() - $knownCreation).Ticks) -lt 10
                    }).Count -gt 0 -and $candidate.CreationDate.ToUniversalTime() -ge $knownCreation
                })
                if (!$matchedParent.Count)
                {
                    continue
                }
                $creation = $candidate.CreationDate.ToUniversalTime().ToString('o')
                $identity = "$($candidate.ProcessId)|$creation"
                if ($known.ContainsKey($identity))
                {
                    continue
                }
                $live = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
                if ($live -and $live.StartTime)
                {
                    $creation = $live.StartTime.ToUniversalTime().ToString('o')
                    $identity = "$($candidate.ProcessId)|$creation"
                }
                if (!$known.ContainsKey($identity))
                {
                    $known[$identity] = [ordered]@{
                        processId = [int]$candidate.ProcessId
                        parentProcessId = [int]$candidate.ParentProcessId
                        creationUtc = $creation
                        name = $candidate.Name
                        path = if ($live) { $live.Path } else { $null }
                        creationSource = if ($live -and $live.StartTime) { 'Process.StartTime' } else { 'CIM-creation-time' }
                    }
                    $added = $true
                }
            }
        } while ($added)
        if ($CaptureModules)
        {
            foreach ($candidate in $known.Values)
            {
                if ($candidate.name -notin @('testhost.exe', 'dotnet.exe'))
                {
                    continue
                }
                try
                {
                    $live = Get-Process -Id $candidate.processId -ErrorAction Stop
                    if (!$live.StartTime -or $live.StartTime.ToUniversalTime().ToString('o') -ne $candidate.creationUtc)
                    {
                        continue
                    }
                    $paths = @($live.Modules | ForEach-Object { $_.FileName })
                    if ($candidate.name -ne 'testhost.exe' -and !@($paths | Where-Object { [System.IO.Path]::GetFileName($_) -eq 'testhost.dll' }).Count)
                    {
                        continue
                    }
                    $observations.Add([ordered]@{ processId = $candidate.processId; creationUtc = $candidate.creationUtc; observedUtc = [DateTime]::UtcNow.ToString('o'); modulePaths = $paths })
                    foreach ($path in $paths)
                    {
                        if (!$moduleFiles.ContainsKey($path))
                        {
                            $item = Get-Item -LiteralPath $path
                            $moduleFiles[$path] = [ordered]@{ path = $path; bytes = $item.Length; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash; fileVersion = $item.VersionInfo.FileVersion; productVersion = $item.VersionInfo.ProductVersion }
                        }
                    }
                }
                catch
                {
                    $moduleErrors.Add([ordered]@{ processId = $candidate.processId; creationUtc = $candidate.creationUtc; message = $_.Exception.Message })
                }
            }
        }
    } while (!$process.WaitForExit(350))
    $process.WaitForExit()
    [void]$outTask.GetAwaiter().GetResult()
    [void]$errTask.GetAwaiter().GetResult()
    $outStream.Flush()
    $errStream.Flush()
    $outStream.Dispose()
    $errStream.Dispose()
    $record['exitCode'] = $process.ExitCode
    $record['rootExited'] = $process.HasExited
    $record['bothStreamsDrained'] = $true
    $record['rawByteStreams'] = $true
    $terminal = [System.Collections.Generic.List[object]]::new()
    foreach ($candidate in $known.Values)
    {
        $live = Get-Process -Id $candidate.processId -ErrorAction SilentlyContinue
        $same = $live -and $live.StartTime -and $live.StartTime.ToUniversalTime().ToString('o') -eq $candidate.creationUtc
        if ($same)
        {
            $live.WaitForExit()
        }
        $terminal.Add([ordered]@{ processId = $candidate.processId; creationUtc = $candidate.creationUtc; sameCreationObservedAliveBeforeDrain = [bool]$same; exactOwnedInstanceTerminal = $true })
    }
    $record['observedProcesses'] = @($known.Values)
    $record['terminalChecks'] = $terminal.ToArray()
    $record['observedDescendantsDrained'] = $true
    $record['completedUtc'] = [DateTime]::UtcNow.ToString('o')
    $record.state = 'terminal'
    if ($CaptureModules)
    {
        Write-AtomicJson "$prefix.modules.json" ([ordered]@{ boundary = $record.observationBoundary; observations = $observations.ToArray(); files = @($moduleFiles.Values); transientErrors = $moduleErrors.ToArray() })
    }
    Write-AtomicJson "$prefix.terminal.json" $record
    Write-Output ([ordered]@{ label = $Label; exitCode = $process.ExitCode; root = $record.root; observedProcesses = $known.Count; streamsDrained = $true; prefix = $prefix } | ConvertTo-Json -Compress -Depth 8)
    if ($process.ExitCode -ne 0)
    {
        Get-Content -LiteralPath "$prefix.stdout.txt", "$prefix.stderr.txt" -ErrorAction SilentlyContinue | Select-Object -Last 60
    }
    $code = $process.ExitCode
    $process.Dispose()
    exit $code
}
catch
{
    $record.state = 'recorder-failure'
    $record['failureUtc'] = [DateTime]::UtcNow.ToString('o')
    $record['failure'] = $_.ToString()
    $record['notAClosureAttestation'] = $true
    Write-AtomicJson "$prefix.recorder-failure.json" $record
    throw
}
