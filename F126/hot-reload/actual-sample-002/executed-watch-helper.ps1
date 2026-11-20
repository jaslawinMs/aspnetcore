param([ValidatePattern('^\d{3}$')][string]$Attempt = '001')

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$directory = Join-Path $PSScriptRoot "autoperf-runs\F126\hot-reload\actual-sample-$Attempt"
$configuration = Get-Content -LiteralPath (Join-Path $directory 'configuration.json') -Raw | ConvertFrom-Json
if (Test-Path -LiteralPath (Join-Path $directory 'watch-started.json'))
{
    throw 'Never reuse an actual watch attempt.'
}
Set-Location -LiteralPath $root
. .\activate.ps1
$pinBefore = (Get-FileHash -LiteralPath (Join-Path $root 'global.json')).Hash
$environmentOverrides = [ordered]@{
    MSBUILDDISABLENODEREUSE = '1'
    DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    DOTNET_NOLOGO = '1'
    DOTNET_WATCH_SUPPRESS_LAUNCH_BROWSER = '1'
    DOTNET_WATCH_SUPPRESS_BROWSER_REFRESH = '1'
    DOTNET_WATCH_RESTART_ON_RUDE_EDIT = 'false'
    ASPNETCORE_ENVIRONMENT = 'Development'
    DOTNET_ENVIRONMENT = 'Development'
    ASPNETCORE_URLS = $configuration.actualLoopbackOnlyUrl
}
foreach ($key in $environmentOverrides.Keys)
{
    [Environment]::SetEnvironmentVariable($key, $environmentOverrides[$key], 'Process')
}
$arguments = @(
    'watch', '--project', (Join-Path $root 'src\Security\samples\CustomPolicyProvider\CustomPolicyProvider.csproj'),
    '--verbose', '--non-interactive', '--', 'run', '--no-restore', '--no-launch-profile',
    '--configuration', 'Debug', '--framework', 'net12.0', '-p:UseIisNativeAssets=false',
    '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false',
    '-p:BuildInParallel=false'
)
$command = [ordered]@{
    actualWorkingDirectory = $root
    actualActivation = '. .\activate.ps1'
    actualExecutable = (Join-Path $root '.dotnet\dotnet.exe')
    actualArguments = $arguments
    actualEnvironmentOverrides = $environmentOverrides
    actualProtectedGlobalJsonBefore = $pinBefore
    actualNoProcessPriorityAffinityOrMachineSettingsChange = $true
    actualBoundedSeconds = $configuration.actualMaximumWatchSeconds
    actualStartedAt = [DateTimeOffset]::UtcNow.ToString('O')
}
$command | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'watch-command.json') -Encoding utf8NoBOM
$watch = Start-Process -FilePath $command.actualExecutable -ArgumentList $arguments -WorkingDirectory $root -NoNewWindow `
    -RedirectStandardOutput (Join-Path $directory 'watch.stdout.txt') -RedirectStandardError (Join-Path $directory 'watch.stderr.txt') -PassThru
[ordered]@{ actualWatchProcessId = $watch.Id; actualWrapperProcessId = $PID; actualStartedAt = $command.actualStartedAt } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $directory 'watch-started.json') -Encoding utf8NoBOM
Write-Output "F126 actual sample watch started: owned watch PID $($watch.Id), loopback $($configuration.actualLoopbackOnlyUrl)."
$clock = [Diagnostics.Stopwatch]::StartNew()
$reason = 'watch-exited'
while (-not $watch.WaitForExit(250))
{
    if (Test-Path -LiteralPath (Join-Path $directory 'stop.request'))
    {
        $reason = 'requested-owned-cleanup'
        break
    }
    if ($clock.Elapsed.TotalSeconds -ge $configuration.actualMaximumWatchSeconds)
    {
        $reason = 'bounded-timeout'
        break
    }
}
function Get-OwnedDescendants([int]$ParentId)
{
    foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId"))
    {
        Get-OwnedDescendants -ParentId $child.ProcessId
        [int]$child.ProcessId
    }
}
$ownedIds = @(Get-OwnedDescendants -ParentId $watch.Id) + @([int]$watch.Id)
foreach ($processId in $ownedIds)
{
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue)
    {
        Stop-Process -Id $processId -Force -ErrorAction Continue
    }
}
$remaining = @($ownedIds | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
$pinAfter = (Get-FileHash -LiteralPath (Join-Path $root 'global.json')).Hash
[ordered]@{
    actualReason = $reason
    actualOwnedProcessIds = $ownedIds
    actualRemainingOwnedProcessIds = $remaining
    actualProtectedGlobalJsonBefore = $pinBefore
    actualProtectedGlobalJsonAfter = $pinAfter
    actualControllerAfterSha256 = (Get-FileHash -LiteralPath $configuration.actualController).Hash
    actualCompletedAt = [DateTimeOffset]::UtcNow.ToString('O')
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'watch-stopped.json') -Encoding utf8NoBOM
if ($remaining.Count -ne 0 -or $pinBefore -ne $pinAfter -or $reason -ne 'requested-owned-cleanup')
{
    throw 'Actual watch did not finish through verified, requested, owned cleanup.'
}
Write-Output 'F126 actual sample watch stopped; every specifically owned process is absent and the SDK pin is unchanged.'
