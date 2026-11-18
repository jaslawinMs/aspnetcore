$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F041'
$reproduction = Join-Path $run 'reproduction-original-001'
if (Test-Path -LiteralPath $reproduction)
{
    throw 'Do not overwrite or rerun a completed/partial reproduction. Inspect its recorded boundary.'
}
$budgetPath = Join-Path $run 'diagnostic-budget.json'
$budgetHash = (Get-FileHash -LiteralPath $budgetPath -Algorithm SHA256).Hash
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
if (-not $budget.actualBudgetPermanentlyClosedAfterThisAttempt -or
    $budget.actualAuthorizedOriginalOnlyInvocations -ne 1 -or $budget.actualAuthorizedSourceComparisons -ne 0)
{
    throw 'Require the permanently closed original-only budget; no additional timing is authorized.'
}
$original = Get-Content -LiteralPath (Join-Path $run 'consumer-closure.json') -Raw | ConvertFrom-Json
$projectDirectory = Join-Path $reproduction 'project'
[void](New-Item -ItemType Directory -Path $projectDirectory)
$copied = @(
    foreach ($file in (Get-Content -LiteralPath (Join-Path $run 'harness-source-hashes.json') -Raw | ConvertFrom-Json))
    {
        $source = Join-Path (Join-Path $run 'harness') $file.path
        $destination = Join-Path $projectDirectory $file.path
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $file.sha256)
        {
            throw "Measured harness source changed: $($file.path)"
        }
        [System.IO.File]::Copy($source, $destination, $false)
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -cne $file.sha256)
        {
            throw "Relocated harness source differs: $($file.path)"
        }
        $file
    }
)
if ($copied.Count -ne 7)
{
    throw 'Require all seven exact measured project/source files.'
}
[System.IO.File]::WriteAllText(
    (Join-Path $reproduction 'project-copy.json'),
    ($copied | ConvertTo-Json -Depth 6) + "`n")
Set-Location $root
. .\activate.ps1
$dotnet = (Get-Command dotnet -ErrorAction Stop).Source
$env:AUTOPERF_ASPNETCORE_ROOT = $root
function Invoke-RecordedDotnet([string]$Label, [string[]]$Arguments)
{
    $directory = Join-Path $reproduction $Label
    [void](New-Item -ItemType Directory -Path $directory)
    $entry = [ordered]@{
        executable = $dotnet
        arguments = $Arguments
        workingDirectory = $root
        startedUtc = [DateTime]::UtcNow.ToString('o')
        actualTimingAuthorized = $false
    }
    & $dotnet @Arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
    $code = $LASTEXITCODE
    $entry.actualExitCode = $code
    $entry.completedUtc = [DateTime]::UtcNow.ToString('o')
    [System.IO.File]::WriteAllText((Join-Path $directory 'command.json'), ($entry | ConvertTo-Json -Depth 8) + "`n")
    if ($code -ne 0)
    {
        throw "Untimed reproduction $Label failed with exit $code; preserve the attempt."
    }
}
$project = Join-Path $projectDirectory 'AutoPerf.Benchmarks.csproj'
Invoke-RecordedDotnet 'Restore' @('restore', $project, '-m:2', '-nr:false', '--verbosity', 'quiet',
    '--configfile', (Join-Path $root 'NuGet.config'), '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
Invoke-RecordedDotnet 'Build' @('build', $project, '--configuration', 'Release', '--no-restore',
    '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$consumer = Join-Path $reproduction 'consumer'
[void](New-Item -ItemType Directory -Path $consumer)
Get-ChildItem -LiteralPath (Join-Path $projectDirectory 'bin\Release\net12.0') -Force |
    Copy-Item -Destination $consumer -Recurse
$files = @(
    Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
        [ordered]@{ path = [System.IO.Path]::GetRelativePath($consumer, $_.FullName)
            bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    }
)
if (($files.path -join "`n") -cne ($original.files.path -join "`n") -or $files.Count -ne 131)
{
    throw 'Relocated consumer file identities differ from the original 131-entry closure.'
}
$changed = @(
    for ($index = 0; $index -lt $files.Count; $index++)
    {
        if ($files[$index].sha256 -cne $original.files[$index].sha256)
        {
            $files[$index].path
        }
    }
)
if (($changed -join "`n") -cne "AutoPerf.Benchmarks.dll`nAutoPerf.Benchmarks.pdb")
{
    throw "Require exact owner/dependency identity; actual relocated changes: $($changed -join ', ')"
}
$closurePath = Join-Path $reproduction 'consumer-closure.json'
[System.IO.File]::WriteAllText($closurePath, ([ordered]@{
    candidate = 'F041'; variant = 'original-only'; files = $files
} | ConvertTo-Json -Depth 8) + "`n")
$evidence = Join-Path (Join-Path $reproduction 'Characterize') 'evidence'
[void](New-Item -ItemType Directory -Path $evidence)
Invoke-RecordedDotnet 'CharacterizeRun' @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'),
    'characterize', $evidence, $closurePath, (Join-Path $run 'source-inputs.json'), $root,
    (Join-Path $reproduction 'not-a-timing-directory'))
$before = Get-Content -LiteralPath (Join-Path $run 'native-characterize-001\evidence\0005-characterization.json') -Raw | ConvertFrom-Json
$after = Get-Content -LiteralPath (Join-Path $evidence '0005-characterization.json') -Raw | ConvertFrom-Json
if (($before | ConvertTo-Json -Depth 20 -Compress) -cne ($after | ConvertTo-Json -Depth 20 -Compress))
{
    throw 'Relocated actual-producer characterization differs from the original.'
}
$lifecycles = Get-Content -LiteralPath (Join-Path $evidence '0018-all-lifecycles.json') -Raw | ConvertFrom-Json
if ($after.actualCases -ne 10 -or -not $after.actualEveryCasePassed -or
    $lifecycles.actualProfiles -ne 6 -or -not $lifecycles.actualEverySetupWorkloadCleanupPassed)
{
    throw 'Require all ten actual-producer cases and six untimed discovery/lifecycle profiles.'
}
foreach ($file in $original.files)
{
    if ((Get-FileHash -LiteralPath (Join-Path (Join-Path $run 'consumer-original') $file.path) -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw 'The original measured consumer must remain unchanged.'
    }
}
if ((Get-FileHash -LiteralPath $budgetPath -Algorithm SHA256).Hash -cne $budgetHash)
{
    throw 'The closed historical diagnostic budget changed.'
}
git --no-pager diff --exit-code --quiet
if ($LASTEXITCODE -ne 0)
{
    throw 'Shipping source must remain unchanged.'
}
$result = [ordered]@{
    candidate = 'F041'; actualByteExactProjectFiles = 7; actualConsumerEntries = 131
    actualDifferentConsumerFiles = $changed; actualOwnerAndOtherDependencyBytesIdentical = $true
    actualCharacterizationCases = 10; actualUntimedLifecycles = 6
    actualOriginalCharacterizationIdentical = $true; actualMeasuredConsumerPreserved = $true
    actualAdditionalTimingSamples = 0; actualClosedBudgetBytesUnchanged = $true
    actualShippingSourceChanged = $false
}
[System.IO.File]::WriteAllText((Join-Path $reproduction 'verified-reproduction.json'), ($result | ConvertTo-Json -Depth 8) + "`n")
$result | ConvertTo-Json -Depth 8
