$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F042'
$reproduction = Join-Path $run 'reproduction-paired-001'
if (Test-Path -LiteralPath $reproduction)
{
    throw 'Do not overwrite a completed or partial reproduction.'
}
$budgetPath = Join-Path $run 'diagnostic-budget.json'
$budgetHash = (Get-FileHash -LiteralPath $budgetPath -Algorithm SHA256).Hash
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
if (-not $budget.closed -or $budget.consumedAuthorizations -ne 3)
{
    throw 'Require the permanently closed three-comparison budget; this script never authorizes timing.'
}
$candidateInputs = Get-Content -LiteralPath (Join-Path $run 'source-inputs-candidate.json') -Raw | ConvertFrom-Json
$protected = (Get-Content -LiteralPath (Join-Path $run 'current-default-worktree-relocation.json') -Raw |
    ConvertFrom-Json).actualPrimaryProtectedBefore
$guards = @(
    foreach ($file in $candidateInputs.sourceFiles)
    {
        [pscustomobject]@{ path = Join-Path $root $file.path; sha256 = $file.sha256 }
    }
    [pscustomobject]@{
        path = Join-Path $root 'src\Features\JsonPatch.SystemTextJson\test\IntegrationTests\DictionaryReplaceTest.cs'
        sha256 = (Get-FileHash -LiteralPath (Join-Path $run 'new-tests-candidate.cs')).Hash
    }
    foreach ($file in $protected.PSObject.Properties)
    {
        [pscustomobject]@{ path = Join-Path $root $file.Name; sha256 = $file.Value }
    }
    foreach ($name in @('autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
        'autoperf-scan-report.md', 'performance-antipattern-findings.md'))
    {
        $file = Join-Path $root $name
        [pscustomobject]@{ path = $file; sha256 = (Get-FileHash -LiteralPath $file).Hash }
    }
)
function Confirm-Guards
{
    if ((Get-FileHash -LiteralPath $budgetPath).Hash -cne $budgetHash)
    {
        throw 'The permanently closed timing budget changed.'
    }
    foreach ($file in $guards)
    {
        if ((Get-FileHash -LiteralPath $file.path).Hash -cne $file.sha256)
        {
            throw "Source, tests, protected manifest or preserved report changed: $($file.path)"
        }
    }
    foreach ($variant in @('original', 'candidate'))
    {
        $closure = Get-Content -LiteralPath (Join-Path $run "consumer-$variant-closure.json") -Raw | ConvertFrom-Json
        foreach ($file in $closure.files)
        {
            if ((Get-FileHash -LiteralPath (Join-Path $run "consumer-$variant\$($file.path)")).Hash -cne $file.sha256)
            {
                throw "A measured image changed: $variant $($file.path)"
            }
        }
    }
}
Confirm-Guards
$projectDirectory = Join-Path $reproduction 'project'
[void][System.IO.Directory]::CreateDirectory($projectDirectory)
$harness = Get-Content -LiteralPath (Join-Path $run 'harness-source-hashes.json') -Raw | ConvertFrom-Json
if ($harness.files.Count -ne 7)
{
    throw 'Require all seven exact common measured project files.'
}
foreach ($file in $harness.files)
{
    $from = Join-Path $run "harness\$($file.path)"
    $to = Join-Path $projectDirectory $file.path
    if ((Get-FileHash -LiteralPath $from).Hash -cne $file.sha256)
    {
        throw "Measured harness source changed: $($file.path)"
    }
    [System.IO.File]::Copy($from, $to, $false)
    if ((Get-FileHash -LiteralPath $to).Hash -cne $file.sha256)
    {
        throw "Relocated harness source differs: $($file.path)"
    }
}
$harness | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reproduction 'project-copy.json') -Encoding utf8
Set-Location -LiteralPath $root
. .\activate.ps1
$dotnet = Join-Path $root '.dotnet\dotnet.exe'
$env:AUTOPERF_ASPNETCORE_ROOT = $root
function Invoke-RecordedDotnet([string]$Label, [string[]]$Arguments)
{
    if ($Arguments -contains 'measure')
    {
        throw 'No timing is authorized.'
    }
    $directory = Join-Path $reproduction $Label
    [void][System.IO.Directory]::CreateDirectory($directory)
    $commandPath = Join-Path $directory 'command.json'
    $entry = [ordered]@{
        executable = $dotnet; arguments = $Arguments; workingDirectory = $root
        startedUtc = [DateTimeOffset]::UtcNow.ToString('o'); actualTimingAuthorized = $false
    }
    $entry | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $commandPath -Encoding utf8
    & $dotnet @Arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
    $code = $LASTEXITCODE
    $entry.actualExitCode = $code
    $entry.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    $entry | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $commandPath -Encoding utf8
    if ($code -ne 0)
    {
        throw "Untimed reproduction $Label failed with exit $code; preserve its actual logs."
    }
}
$project = Join-Path $projectDirectory 'AutoPerf.Benchmarks.csproj'
Invoke-RecordedDotnet 'Restore' @('restore', $project, '-m:2', '-nr:false', '--verbosity', 'quiet',
    '--configfile', (Join-Path $root 'NuGet.config'), '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
Invoke-RecordedDotnet 'Build' @('build', $project, '-c', 'Release', '--no-restore', '-m:2', '-nr:false',
    '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$results = @(
    foreach ($variant in @('Original', 'Candidate'))
    {
        $lower = $variant.ToLowerInvariant()
        $baseline = Get-Content -LiteralPath (Join-Path $run "consumer-$lower-closure.json") -Raw | ConvertFrom-Json
        $consumer = Join-Path $reproduction "consumer-$lower"
        [void][System.IO.Directory]::CreateDirectory($consumer)
        Get-ChildItem -LiteralPath (Join-Path $projectDirectory 'bin\Release\net12.0') -Force |
            Copy-Item -Destination $consumer -Recurse
        foreach ($extension in @('dll', 'pdb'))
        {
            $name = "Microsoft.AspNetCore.JsonPatch.SystemTextJson.$extension"
            Copy-Item -LiteralPath (Join-Path $run "consumer-$lower\$name") -Destination (Join-Path $consumer $name)
        }
        $files = @(
            Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
                [pscustomobject]@{ path = [System.IO.Path]::GetRelativePath($consumer, $_.FullName).Replace('\', '/')
                    bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
            }
        )
        if ($files.Count -ne 77 -or (($files.path | Sort-Object) -join "`n") -cne (($baseline.files.path | Sort-Object) -join "`n"))
        {
            throw 'The relocated complete consumer inventory differs from the measured 77-file inventory.'
        }
        $differences = @(
            foreach ($file in $files)
            {
                $old = @($baseline.files | Where-Object path -CEQ $file.path)
                if ($old.Count -ne 1)
                {
                    throw "Ambiguous consumer identity: $($file.path)"
                }
                if ($old[0].sha256 -cne $file.sha256)
                {
                    $file.path
                }
            }
        )
        if (($differences -join "`n") -cne "AutoPerf.Benchmarks.dll`nAutoPerf.Benchmarks.pdb")
        {
            throw "Only relocated harness DLL/PDB may differ: $($differences -join ', ')"
        }
        $closure = Join-Path $reproduction "consumer-$lower-closure.json"
        [ordered]@{ candidate = 'F042'; actualVariant = $variant; files = $files } |
            ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $closure -Encoding utf8
        $evidence = Join-Path $reproduction "$variant\evidence"
        [void][System.IO.Directory]::CreateDirectory($evidence)
        $snapshot = if ($variant -eq 'Original') { 'source-files' } else { 'source-files-candidate' }
        Invoke-RecordedDotnet "$variant-CharacterizeRun" @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'),
            'characterize', $evidence, $closure, (Join-Path $run "source-inputs-$lower.json"),
            (Join-Path $run $snapshot), (Join-Path $reproduction 'not-a-timing-directory'), $variant, 'none')
        foreach ($name in @('0002-selected-source-pdb-associations.json', '0005-characterization.json', '0006-all-lifecycles.json'))
        {
            $before = Get-Content -LiteralPath (Join-Path $run "$lower-characterization-001\evidence\$name") -Raw | ConvertFrom-Json
            $after = Get-Content -LiteralPath (Join-Path $evidence $name) -Raw | ConvertFrom-Json
            if (($before | ConvertTo-Json -Depth 24 -Compress) -cne ($after | ConvertTo-Json -Depth 24 -Compress))
            {
                throw "Relocated observations differ: $variant $name"
            }
        }
        [pscustomobject]@{ variant = $variant; actualConsumerFiles = 77; actualOnlyChangedFiles = $differences
            actualCharacterizationCases = 16; actualUntimedLifecycles = 12; actualObservationsIdentical = $true }
    }
)
Confirm-Guards
$receipt = [ordered]@{
    candidate = 'F042'; actualByteExactProjectFiles = 7; actualFreshProjectRestoredAndRebuilt = $true
    actualVariants = $results; actualOwnerAndOtherDependencyBytesIdenticalToEachMeasuredVariant = $true
    actualAdditionalTimingSamples = 0; actualClosedBudgetBytesUnchanged = $true
    actualClosedBudgetSha256 = $budgetHash; actualMeasuredImagesPreserved = $true
    actualShippingSourceTestsProtectedFilesAndReportsPreserved = $true
}
$receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $reproduction 'verified-reproduction.json') -Encoding utf8
$receipt | ConvertTo-Json -Depth 10
