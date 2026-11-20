$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Repo = 'C:\src\aspnetcore'
$Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$Default = '00560e2dd1954a2acf2bc54b35422b0f32484bf1'
$SdkRoot = 'C:\src\aspnetcore\.dotnet'
$PrivateRuntime = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe'
$Flags = @('-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')

function Save-Json($Path, $Value)
{
    $Value | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Run-Native([string]$Label, [string]$Exe, [string[]]$Arguments, [string]$WorkingDirectory = $Root)
{
    $directory = Join-Path $Root "evidence\$Label"
    if (Test-Path $directory) { throw "Refusing to overwrite command $Label" }
    New-Item -ItemType Directory -Path $directory | Out-Null
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Exe
    $start.WorkingDirectory = $WorkingDirectory
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    $command = [ordered]@{
        executable = $Exe; arguments = $Arguments; workingDirectory = $WorkingDirectory
        startedUtc = [DateTime]::UtcNow.ToString('o'); controllerPid = $PID
        environment = [ordered]@{
            DOTNET_ROOT = $env:DOTNET_ROOT; DOTNET_CLI_HOME = $env:DOTNET_CLI_HOME
            DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
            DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
            MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
            DOTNET_ROLL_FORWARD = $env:DOTNET_ROLL_FORWARD
            DOTNET_HOST_TRACE = $env:DOTNET_HOST_TRACE
            DOTNET_HOST_TRACEFILE = $env:DOTNET_HOST_TRACEFILE
        }
    }
    Save-Json (Join-Path $directory 'command.json') $command
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    [void]$process.Start()
    $known = @{}
    $known[$process.Id] = [ordered]@{ pid = $process.Id; parentPid = $PID; commandLine = "$Exe $($Arguments -join ' ')"; root = $true }
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    do
    {
        $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CommandLine -ErrorAction SilentlyContinue)
        do
        {
            $added = $false
            foreach ($child in $all)
            {
                if ($known.ContainsKey([int]$child.ParentProcessId) -and -not $known.ContainsKey([int]$child.ProcessId))
                {
                    $known[[int]$child.ProcessId] = [ordered]@{
                        pid = [int]$child.ProcessId; parentPid = [int]$child.ParentProcessId
                        commandLine = $child.CommandLine; root = $false
                    }
                    $added = $true
                }
            }
        } while ($added)
    } while (-not $process.WaitForExit(300))
    $process.WaitForExit()
    [IO.File]::WriteAllText((Join-Path $directory 'stdout.txt'), $outTask.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $directory 'stderr.txt'), $errTask.GetAwaiter().GetResult())
    $exitCode = $process.ExitCode
    $terminal = @()
    foreach ($entry in $known.Values)
    {
        $remaining = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
        if ($remaining)
        {
            if (-not $remaining.WaitForExit(60000)) { throw "Owned PID remains active: $($entry.pid)" }
        }
        $entry.terminalObserved = $true
        $terminal += $entry
    }
    $result = [ordered]@{
        exitCode = $exitCode; endedUtc = [DateTime]::UtcNow.ToString('o')
        ownedObservedProcesses = $terminal
        childObservationBoundary = 'Root PID plus recursively discovered child PIDs from Win32_Process polling; short-lived children may exit between snapshots. Root awaited and every observed child terminal.'
    }
    Save-Json (Join-Path $directory 'result.json') $result
    Write-Host "$Label exit=$exitCode rootPid=$($process.Id)"
    if ($exitCode -ne 0)
    {
        Get-Content (Join-Path $directory 'stdout.txt') -Tail 18
        Get-Content (Join-Path $directory 'stderr.txt') -Tail 12
    }
    return [pscustomobject]$result
}

function Activate-Checkout([string]$Checkout)
{
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_CLI_DO_NOT_USE_MSBUILD_SERVER = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
    $env:DOTNET_CLI_HOME = Join-Path $Root 'scratch\cli-home'
    $env:TEMP = Join-Path $Root 'scratch\temp'
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Path $env:DOTNET_CLI_HOME,$env:TEMP -Force | Out-Null
    Set-Location $Checkout
    . .\activate.ps1
}

function Inventory([string]$Directory)
{
    return @(Get-ChildItem -LiteralPath $Directory -Recurse -File | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($Directory, $_.FullName)
            length = $_.Length
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    })
}
