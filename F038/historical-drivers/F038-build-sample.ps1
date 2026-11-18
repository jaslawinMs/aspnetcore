param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant,
    [int]$Attempt = 1,
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$session = $PSScriptRoot
$run = Join-Path $session 'autoperf-runs\F038'
$directory = Join-Path $run "sample-build-$Variant-$Attempt"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite sample build evidence: $directory"
}
New-Item -ItemType Directory -Path $directory | Out-Null
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$owner = Join-Path $root 'src\Components\Components\src\RenderTree\RenderTreeDiffBuilder.cs'
$project = Join-Path $root 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj'
$arguments = @('build', $project, '--configuration', 'Release', '--no-restore', '-m:2', '-nr:false',
    '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
if ($Restore)
{
    $arguments = @('restore', $project, '-m:2', '-nr:false', '--verbosity', 'quiet',
        '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
}
$start = [DateTime]::UtcNow
$watch = [Diagnostics.Stopwatch]::StartNew()
& dotnet @arguments 1> (Join-Path $directory 'stdout.log') 2> (Join-Path $directory 'stderr.log')
$nativeExit = $LASTEXITCODE
$watch.Stop()
$receipt = [ordered]@{
    candidate = 'F038'
    variant = $Variant
    attempt = $Attempt
    actualRestoreCommand = [bool]$Restore
    executable = (Get-Command dotnet).Source
    arguments = $arguments
    actualExitCode = $nativeExit
    startedUtc = $start.ToString('O')
    finishedUtc = [DateTime]::UtcNow.ToString('O')
    elapsedSeconds = $watch.Elapsed.TotalSeconds
    ownerSourceSha256 = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
    maximumMsbuildWorkers = 2
    sharedMachineNotIsolated = $true
}
$receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'receipt.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 30
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 15
if ($nativeExit -ne 0)
{
    throw "Sample command failed with actual exit $nativeExit; inspect the retained prerequisite/source error before retrying."
}
Write-Output "F038:$Variant sample command completed successfully."
