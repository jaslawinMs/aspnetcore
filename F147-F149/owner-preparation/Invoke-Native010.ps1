function Invoke-Native010
{
    param(
        [string]$Root,
        [string]$Label,
        [string]$Executable,
        [string[]]$Arguments,
        [switch]$Dotnet,
        [switch]$AllowFailure
    )

    $ErrorActionPreference = 'Stop'
    if (Test-Path (Join-Path $PSScriptRoot 'MANIFEST.json'))
    {
        throw 'Frozen historical capsule: native work and evidence rewrites are disabled.'
    }

    $logRoot = Join-Path $PSScriptRoot 'logs'
    $stdout = Join-Path $logRoot "$Label.stdout.log"
    $stderr = Join-Path $logRoot "$Label.stderr.log"
    if ((Test-Path $stdout) -or (Test-Path $stderr))
    {
        throw "Refusing to overwrite attempt $Label"
    }

    Push-Location $Root
    try
    {
        $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
        $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
        $env:MSBUILDDISABLENODEREUSE = '1'
        $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
        $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
        $env:DOTNET_ROLL_FORWARD = 'Disable'
        $env:DOTNET_CLI_HOME = Join-Path $PSScriptRoot 'local-work\cli-home'
        $env:NUGET_HTTP_CACHE_PATH = Join-Path $PSScriptRoot 'local-work\http-cache'
        $env:NUGET_SCRATCH = Join-Path $PSScriptRoot 'local-work\nuget'
        $env:TEMP = Join-Path $PSScriptRoot 'local-work\scratch'
        $env:TMP = $env:TEMP
        New-Item -ItemType Directory $env:DOTNET_CLI_HOME,$env:NUGET_SCRATCH,$env:TEMP -Force | Out-Null
        if ($Dotnet)
        {
            . .\activate.ps1
        }

        $info = [System.Diagnostics.ProcessStartInfo]::new()
        $info.FileName = $Executable
        $info.WorkingDirectory = $Root
        $info.UseShellExecute = $false
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        foreach ($argument in $Arguments)
        {
            $info.ArgumentList.Add($argument)
        }

        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $info
        [void]$process.Start()
        $known = @{}
        $known[$process.Id] = [ordered]@{
            pid = $process.Id
            startTimeUtc = $process.StartTime.ToUniversalTime().ToString('O')
            executable = $Executable
        }
        $output = $process.StandardOutput.ReadToEndAsync()
        $errorOutput = $process.StandardError.ReadToEndAsync()
        while (-not $process.WaitForExit(1000))
        {
            foreach ($parentId in @($known.Keys))
            {
                foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction SilentlyContinue))
                {
                    if (-not $known.ContainsKey([int]$child.ProcessId))
                    {
                        $known[[int]$child.ProcessId] = [ordered]@{
                            pid = [int]$child.ProcessId
                            startTimeUtc = $child.CreationDate.ToUniversalTime().ToString('O')
                            executable = $child.ExecutablePath
                        }
                    }
                }
            }
        }

        $out = $output.GetAwaiter().GetResult()
        $err = $errorOutput.GetAwaiter().GetResult()
        [System.IO.File]::WriteAllText($stdout, $out)
        [System.IO.File]::WriteAllText($stderr, $err)
        $terminal = foreach ($entry in $known.Values)
        {
            $current = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
            $sameIdentity = $null -ne $current -and
                $current.StartTime.ToUniversalTime().ToString('O') -eq $entry.startTimeUtc
            [ordered]@{
                identity = $entry
                originalProcessStillRunning = $sameIdentity
                pidSlotOccupied = $null -ne $current
            }
        }
        [ordered]@{
            label = $Label
            executable = $Executable
            arguments = $Arguments
            workingDirectory = $Root
            exitCode = $process.ExitCode
            observedUtc = [DateTime]::UtcNow.ToString('O')
            stdout = [System.IO.Path]::GetRelativePath($PSScriptRoot, $stdout)
            stderr = [System.IO.Path]::GetRelativePath($PSScriptRoot, $stderr)
            activatedThisCheckout = [bool]$Dotnet
            rollForward = $env:DOTNET_ROLL_FORWARD
            ownedProcessObservations = @($terminal)
            descendantSamplingIsExhaustive = $false
            performanceMeasurement = $false
        } | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $logRoot "$Label.receipt.json")
        Write-Output "$Label exit=$($process.ExitCode) observedOwnedPids=$($known.Count)"
        if ($process.ExitCode -ne 0)
        {
            Write-Output (($out -split "`r?`n" | Where-Object { $_ -match 'error |error:|failed|Exception' } | Select-Object -First 8) -join "`n")
            Write-Output (($err -split "`r?`n" | Select-Object -First 8) -join "`n")
            if (-not $AllowFailure)
            {
                throw "$Label failed; raw evidence retained."
            }
        }
    }
    finally
    {
        Pop-Location
    }
}
