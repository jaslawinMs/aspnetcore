$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F041'
$inputs = Get-Content -Raw -LiteralPath (Join-Path $run 'source-inputs.json') | ConvertFrom-Json
if ($inputs.actualIdenticalSelectedDefaultFiles -ne 12 -or -not $inputs.actualAssessedInitialRegistryProducerBlockIdentical)
{
    throw 'Require the explicitly assessed original/default boundary.'
}
Set-Location $root
. .\activate.ps1
$dotnet = (Get-Command dotnet).Source
$version = (& $dotnet --version).Trim()
if ($LASTEXITCODE -ne 0 -or $version -cne '12.0.100-alpha.1.26557.102')
{
    throw 'Require the pinned activated SDK.'
}
$validation = Join-Path $run 'validation'
if (Test-Path -LiteralPath $validation)
{
    throw 'Use fresh validation directories; preserve prior attempts.'
}
New-Item -ItemType Directory -Path $validation | Out-Null
function Invoke-RecordedDotnet([string] $Label, [string[]] $Arguments)
{
    $directory = Join-Path $validation $Label
    New-Item -ItemType Directory -Path $directory | Out-Null
    $record = [ordered]@{
        executable = $dotnet
        arguments = $Arguments
        workingDirectory = $root
        activatedSdk = $version
        startedUtc = [DateTime]::UtcNow.ToString('O')
    }
    & $dotnet @Arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
    $code = $LASTEXITCODE
    $record.actualExitCode = $code
    $record.completedUtc = [DateTime]::UtcNow.ToString('O')
    [System.IO.File]::WriteAllText((Join-Path $directory 'command.json'), ($record | ConvertTo-Json -Depth 10) + "`n")
    if ($code -ne 0)
    {
        throw "$Label failed with exit $code; preserve its command and complete logs."
    }
}
$project = 'src\Components\Web\test\Microsoft.AspNetCore.Components.Web.Tests.csproj'
Invoke-RecordedDotnet 'WebBuild-original-001' @('build', $project, '--configuration', 'Release',
    '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$resultsDirectory = Join-Path $validation 'InputBaseTests-original-001\results'
Invoke-RecordedDotnet 'InputBaseTests-original-001' @('test', $project, '--configuration', 'Release',
    '--no-build', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false',
    '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Forms.InputBaseTest',
    '--logger', 'trx;LogFileName=results.trx', '--results-directory', $resultsDirectory)
$trxPath = Join-Path $resultsDirectory 'results.trx'
[xml] $trx = Get-Content -Raw -LiteralPath $trxPath
$rows = @($trx.SelectNodes('//*[local-name()="UnitTestResult"]'))
$definitions = @($trx.SelectNodes('//*[local-name()="UnitTest"]'))
$entries = @($trx.SelectNodes('//*[local-name()="TestEntry"]'))
$counters = $trx.SelectSingleNode('//*[local-name()="ResultSummary"]/*[local-name()="Counters"]')
if ($rows.Count -eq 0 -or @($rows | Where-Object outcome -cne 'Passed').Count -ne 0 -or
    $rows.Count -ne $definitions.Count -or $rows.Count -ne $entries.Count -or
    [int]$counters.total -ne $rows.Count -or [int]$counters.executed -ne $rows.Count -or
    [int]$counters.passed -ne $rows.Count -or [int]$counters.notExecuted -ne 0)
{
    throw 'Require every selected discovered TRX row, without skips or missing results.'
}
foreach ($file in $inputs.sourceFiles)
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $file.path) -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "Source changed during validation: $($file.path)"
    }
}
$verified = [ordered]@{
    candidate = 'F041'
    actualActivatedSdk = $version
    actualDependencyAwareBuildPassed = $true
    actualExistingInputBaseRows = $rows.Count
    actualSkippedRows = 0
    actualEveryRowParsed = $true
    actualSourceFilesUnchanged = $true
    actualCurrentDefaultBuildClaimed = $false
    actualShippingTestsAdded = $false
    actualRows = @($rows | ForEach-Object { [ordered]@{ testName = $_.testName; testId = $_.testId; outcome = $_.outcome; duration = $_.duration } })
}
[System.IO.File]::WriteAllText((Join-Path $validation 'verified-owner-validation.json'), ($verified | ConvertTo-Json -Depth 10) + "`n")
$verified | Select-Object candidate, actualActivatedSdk, actualDependencyAwareBuildPassed, actualExistingInputBaseRows, actualSkippedRows | ConvertTo-Json
