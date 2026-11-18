$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$directory = Join-Path $PSScriptRoot 'autoperf-runs\F040\validation\InitialManagedBuild-original-1'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite initial-build evidence.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:UseIisNativeAssets = 'false'
& git submodule status --recursive 1> (Join-Path $directory 'submodules.stdout') 2> (Join-Path $directory 'submodules.stderr')
if ($LASTEXITCODE -ne 0 -or @(Get-Content -LiteralPath (Join-Path $directory 'submodules.stdout') | Where-Object { $_ -match '^[-+U]' }).Count)
{
    throw 'Inspect uninitialized or changed submodules; do not overwrite existing submodule work.'
}
$arguments = @('-BuildManaged', '-NoRestore', '-NoBuildNative', '-NoBuildNodeJS', '-NoBuildJava',
    '-NoBuildInstallers', '-Configuration', 'Release', '-verbosity:quiet',
    '/p:UseIisNativeAssets=false', '/p:UseSharedCompilation=false', '/maxcpucount:2', '/nodeReuse:false')
$started = [DateTime]::UtcNow
& .\eng\build.cmd @arguments 1> (Join-Path $directory 'stdout.log') 2> (Join-Path $directory 'stderr.log')
$nativeExit = $LASTEXITCODE
[ordered]@{
    candidate = 'F040'
    actualStartedUtc = $started.ToString('O')
    actualFinishedUtc = [DateTime]::UtcNow.ToString('O')
    executable = 'C:\src\aspnetcore\eng\build.cmd'
    arguments = $arguments
    actualExitCode = $nativeExit
    actualMaximumMsbuildWorkers = 2
    actualInitialMarkerWasMissing = $true
    actualManagedRepositoryGraphRequested = $true
    actualNativeNodeJavaInstallerBuildRequested = $false
    actualFreshBlazorJavascriptAlreadyVerified = $true
    actualSourceComparisons = 0
    actualSharedMachineNotIsolated = $true
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 35
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 15
exit $nativeExit
