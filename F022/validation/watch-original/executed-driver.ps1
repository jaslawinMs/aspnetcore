param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$probeDirectory = Join-Path $run 'probes\HotReload'
$probe = Join-Path $probeDirectory 'HotReloadProbe.csproj'
$execution = Join-Path $run "validation\watch-$Label"
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual live-edit observation.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $env:DOTNET_WATCH_SUPPRESS_EMOJIS = '1'
    $env:NO_COLOR = '1'
    $arguments = @('watch', '--project', $probe, '--verbose', '--non-interactive',
        '--no-launch-profile', '--no-restore', '--disable-build-servers')
    $source = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ExpressionHelper.cs'
    [ordered]@{
        executable = (Get-Command dotnet).Source
        arguments = $arguments
        workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim()
        sourceTrackedChanges = @(& git status --porcelain --untracked-files=no)
        actualSourceSha256 = (Get-FileHash -LiteralPath $source).Hash
        sourceOwner = $source
        started = [DateTimeOffset]::UtcNow.ToString('o')
        driverProcessId = $PID
        timingProfile = $false
        processSettingsPolicy = 'Observe only; no priority,affinity or power setters.'
        stopPolicy = 'Stop only this attached command tree by its tool shellId after the recorded live-edit observation.'
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'launch.json') -Encoding utf8NoBOM
    Copy-Item -LiteralPath (Join-Path $probeDirectory 'IndexerModel.cs') -Destination (Join-Path $execution 'before-IndexerModel.cs')
    Copy-Item -LiteralPath (Join-Path $probeDirectory 'Program.cs') -Destination (Join-Path $execution 'executed-Program.cs')
    Copy-Item -LiteralPath $probe -Destination (Join-Path $execution 'executed-HotReloadProbe.csproj')
    & dotnet @arguments *>&1 | Tee-Object -FilePath (Join-Path $execution 'watch.log')
    $actualExit = $LASTEXITCODE
    [ordered]@{
        actualExitCode = $actualExit
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        termination = 'Actual watcher exit; not fabricated by the driver.'
    } | ConvertTo-Json | Set-Content (Join-Path $execution 'exit.json') -Encoding utf8NoBOM
    if ($actualExit -ne 0)
    {
        throw "The actual watcher exited $actualExit."
    }
}
finally
{
    Pop-Location
}
