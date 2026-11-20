function Invoke-Recorded007
{
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$Dotnet,
        [switch]$AllowFailure
    )

    $ErrorActionPreference = 'Stop'
    $a = $PSScriptRoot
    if (Test-Path -LiteralPath (Join-Path $a 'MANIFEST.json'))
    {
        throw 'F146-007 is frozen; no new native command or log writes are permitted.'
    }

    $logs = Join-Path $a 'logs'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $stdout = Join-Path $logs "$Label.stdout.log"
    $stderr = Join-Path $logs "$Label.stderr.log"
    if ((Test-Path -LiteralPath $stdout) -or (Test-Path -LiteralPath $stderr))
    {
        throw "Refusing to overwrite $Label"
    }

    Push-Location $Root
    try
    {
        if ($Dotnet)
        {
            . .\activate.ps1
        }

        $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
        $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
        $env:MSBUILDDISABLENODEREUSE = '1'
        $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
        $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
        $env:DOTNET_ROLL_FORWARD = 'Disable'
        $env:DOTNET_CLI_HOME = Join-Path $a 'cli-home'
        $env:NUGET_HTTP_CACHE_PATH = Join-Path $a 'http-cache'
        $env:NUGET_SCRATCH = Join-Path $a 'scratch\nuget'
        $env:TEMP = Join-Path $a 'scratch'
        $env:TMP = $env:TEMP
        New-Item -ItemType Directory -Path $env:DOTNET_CLI_HOME, $env:NUGET_SCRATCH -Force | Out-Null

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
        $known = [System.Collections.Generic.HashSet[int]]::new()
        [void]$known.Add($process.Id)
        $outTask = $process.StandardOutput.ReadToEndAsync()
        $errTask = $process.StandardError.ReadToEndAsync()
        while (-not $process.WaitForExit(1000))
        {
            foreach ($parentId in @($known))
            {
                foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction SilentlyContinue))
                {
                    [void]$known.Add([int]$child.ProcessId)
                }
            }
        }

        $out = $outTask.GetAwaiter().GetResult()
        $err = $errTask.GetAwaiter().GetResult()
        [System.IO.File]::WriteAllText($stdout, $out)
        [System.IO.File]::WriteAllText($stderr, $err)
        $exitCode = $process.ExitCode
        $terminal = foreach ($ownedId in $known)
        {
            [ordered]@{
                pid = $ownedId
                stillRunning = $null -ne (Get-Process -Id $ownedId -ErrorAction SilentlyContinue)
            }
        }
        $receipt = [ordered]@{
            label = $Label
            executable = $Executable
            arguments = $Arguments
            workingDirectory = $Root
            exitCode = $exitCode
            stdout = $stdout
            stderr = $stderr
            ownedPidObservations = @($terminal)
            dotnetActivatedForThisCommand = [bool]$Dotnet
            runtimeRollForward = $env:DOTNET_ROLL_FORWARD
            packageCache = $env:NUGET_PACKAGES
            performanceMeasurement = $false
        }
        $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $logs "$Label.receipt.json")
        Write-Output "$Label exit=$exitCode owned_pids=$($known.Count)"
        if ($exitCode -ne 0)
        {
            Write-Output (($out -split "`r?`n" | Where-Object { $_ -match 'error |error:|failed|Exception' } | Select-Object -First 5) -join [Environment]::NewLine)
            Write-Output (($err -split "`r?`n" | Select-Object -First 5) -join [Environment]::NewLine)
            if (-not $AllowFailure)
            {
                throw "$Label failed; exact failure preserved."
            }
        }
    }
    finally
    {
        Pop-Location
    }
}
