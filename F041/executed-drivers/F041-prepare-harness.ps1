$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F041'
$harness = Join-Path $run 'harness'
$owner = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\verified-owner-validation.json') | ConvertFrom-Json
if (-not $owner.actualDependencyAwareBuildPassed -or $owner.actualExistingInputBaseRows -lt 1 -or $owner.actualSkippedRows -ne 0)
{
    throw 'Require the actual parsed owning validation result, not console-summary projection.'
}
$helper = Join-Path $PSScriptRoot 'autoperf-published-results\F040\harness\SettingsPreservingEmitToolchain.cs'
$destination = Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
if (Test-Path -LiteralPath $destination)
{
    throw 'Do not overwrite a prepared harness source.'
}
Copy-Item -LiteralPath $helper -Destination $destination
if ((Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash -cne (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash)
{
    throw 'Require the byte-exact existing settings-preserving toolchain.'
}
Set-Location $root
. .\activate.ps1
$dotnet = (Get-Command dotnet).Source
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$preparation = Join-Path $run 'harness-preparation-001'
New-Item -ItemType Directory -Path $preparation | Out-Null
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
function Invoke-RecordedDotnet([string] $Label, [string[]] $Arguments)
{
    $directory = Join-Path $preparation $Label
    New-Item -ItemType Directory -Path $directory | Out-Null
    $record = [ordered]@{
        executable = $dotnet
        arguments = $Arguments
        workingDirectory = $root
        startedUtc = [DateTime]::UtcNow.ToString('O')
    }
    & $dotnet @Arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
    $code = $LASTEXITCODE
    $record.actualExitCode = $code
    $record.completedUtc = [DateTime]::UtcNow.ToString('O')
    [System.IO.File]::WriteAllText((Join-Path $directory 'command.json'), ($record | ConvertTo-Json -Depth 10) + "`n")
    if ($code -ne 0)
    {
        throw "$Label failed with exit $code; preserve all diagnostics before changing the harness."
    }
}
Invoke-RecordedDotnet 'Restore' @('restore', $project, '-m:2', '-nr:false', '--verbosity', 'quiet',
    '--configfile', (Join-Path $root 'NuGet.config'), '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
Invoke-RecordedDotnet 'Build' @('build', $project, '--configuration', 'Release', '--no-restore',
    '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$consumer = Join-Path $run 'consumer-original'
New-Item -ItemType Directory -Path $consumer | Out-Null
Get-ChildItem -LiteralPath (Join-Path $harness 'bin\Release\net12.0') -Force | Copy-Item -Destination $consumer -Recurse
$files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path = [System.IO.Path]::GetRelativePath($consumer, $_.FullName)
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
})
$closure = [ordered]@{ candidate = 'F041'; variant = 'original-only'; files = $files }
[System.IO.File]::WriteAllText((Join-Path $run 'consumer-closure.json'), ($closure | ConvertTo-Json -Depth 10) + "`n")
$sources = @(Get-ChildItem -LiteralPath $harness -File | Where-Object Extension -in '.cs','.csproj' | Sort-Object Name | ForEach-Object {
    [ordered]@{ path = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
})
if ($sources.Count -ne 7)
{
    throw 'Require exactly the declared seven-file runnable harness.'
}
[System.IO.File]::WriteAllText((Join-Path $run 'harness-source-hashes.json'), ($sources | ConvertTo-Json -Depth 10) + "`n")
Write-Output "Original-only harness restored/built; frozen $($files.Count) consumer entries and $($sources.Count) exact source/project files. No tests or timing were run by this preparation."
