$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F043'
$reproduction = Join-Path $run 'reproduction-paired-001'
if (Test-Path -LiteralPath $reproduction)
{
    throw 'Do not overwrite any partial or completed untimed reproduction.'
}
$budgetPath = Join-Path $run 'diagnostic-budget.json'
$budgetHash = (Get-FileHash -LiteralPath $budgetPath -Algorithm SHA256).Hash
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
if (-not $budget.closed -or $budget.consumed -ne 3 -or $budget.completed -ne 3)
{
    throw 'Require the permanently closed3/3 budget; no additional timing is authorized.'
}
$inputs = Get-Content -LiteralPath (Join-Path $run 'source-inputs-candidate.json') -Raw | ConvertFrom-Json
$intake = Get-Content -LiteralPath (Join-Path $run 'intake-completed.json') -Raw | ConvertFrom-Json
$guards = @(
    foreach ($file in @($inputs.sourceFiles) + @($intake.protectedFiles))
    {
        [pscustomobject]@{ path = Join-Path $root $file.path; sha256 = $file.sha256 }
    }
    [pscustomobject]@{
        path = Join-Path $root 'NuGet.config'
        sha256 = (Get-FileHash -LiteralPath (Join-Path $root 'NuGet.config') -Algorithm SHA256).Hash
    }
)
function Confirm-Guards
{
    if ((Get-FileHash -LiteralPath $budgetPath -Algorithm SHA256).Hash -cne $budgetHash)
    {
        throw 'The permanently closed timing budget changed.'
    }
    foreach ($file in $guards)
    {
        if ((Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash -cne $file.sha256)
        {
            throw "A guarded source, test, manifest or report changed: $($file.path)"
        }
    }
    foreach ($variant in @('original', 'candidate'))
    {
        $closure = Get-Content -LiteralPath (Join-Path $run "consumer-$variant-closure.json") -Raw | ConvertFrom-Json
        foreach ($file in $closure.files)
        {
            if ((Get-FileHash -LiteralPath (Join-Path $run "consumer-$variant\$($file.path)") -Algorithm SHA256).Hash -cne $file.sha256)
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
if ($harness.files.Count -ne 13)
{
    throw 'Require all13 exact measured project inputs, including the six real Razor compiler fixtures.'
}
foreach ($file in $harness.files)
{
    $from = Join-Path $run "harness\$($file.path)"
    $to = Join-Path $projectDirectory $file.path
    if ((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "The common measured source changed: $($file.path)"
    }
    [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($to))
    [System.IO.File]::Copy($from, $to, $false)
    if ((Get-FileHash -LiteralPath $to -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "The relocated source is not byte-exact: $($file.path)"
    }
}
$harness | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reproduction 'project-copy.json') -Encoding utf8
Set-Location -LiteralPath $root
. .\activate.ps1
$dotnet = Join-Path $root '.dotnet\dotnet.exe'
$env:MSBUILDDISABLENODEREUSE = '1'
function Invoke-RecordedDotnet([string]$Label, [string[]]$Arguments)
{
    if ($Arguments -contains 'measure')
    {
        throw 'An untimed reproduction cannot authorize measurement.'
    }
    $directory = Join-Path $reproduction $Label
    [void][System.IO.Directory]::CreateDirectory($directory)
    $commandPath = Join-Path $directory 'command.json'
    $entry = [ordered]@{
        executable = $dotnet; arguments = $Arguments; workingDirectory = $root
        activation = '. .\activate.ps1'; startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
        actualTimingAuthorized = $false
    }
    $entry | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $commandPath -Encoding utf8
    & $dotnet @Arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
    $code = $LASTEXITCODE
    $entry.actualExitCode = $code
    $entry.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    $entry | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $commandPath -Encoding utf8
    if ($code -ne 0)
    {
        throw "Untimed reproduction $Label failed with exit$code; preserve its exact outputs."
    }
}
$project = Join-Path $projectDirectory 'AutoPerf.Benchmarks.csproj'
$common = @('-p:AspNetCoreRoot=C:\src\aspnetcore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false',
    '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false', '--verbosity', 'quiet')
Invoke-RecordedDotnet 'Restore' (@('restore', $project, '--configfile', (Join-Path $root 'NuGet.config')) + $common)
Invoke-RecordedDotnet 'Build' (@('build', $project, '-c', 'Release', '--no-restore', '-p:BuildProjectReferences=false') + $common)
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
            $name = "Microsoft.AspNetCore.Mvc.Razor.$extension"
            Copy-Item -LiteralPath (Join-Path $run "consumer-$lower\$name") -Destination (Join-Path $consumer $name)
        }
        $files = @(
            Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
                [pscustomobject]@{
                    path = [System.IO.Path]::GetRelativePath($consumer, $_.FullName).Replace('\', '/')
                    bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
                }
            }
        )
        if ($files.Count -ne 264 -or (($files.path | Sort-Object) -join "`n") -cne (($baseline.files.path | Sort-Object) -join "`n"))
        {
            throw 'The independently built consumer does not have the same complete264-file entry inventory.'
        }
        $differences = @(
            foreach ($file in $files)
            {
                $old = @($baseline.files | Where-Object path -CEQ $file.path)
                if ($old.Count -ne 1)
                {
                    throw "Ambiguous consumer entry: $($file.path)"
                }
                if ($old[0].sha256 -cne $file.sha256)
                {
                    $file.path
                }
            }
        )
        if ((($differences | Sort-Object) -join "`n") -cne "AutoPerf.Benchmarks.dll`nAutoPerf.Benchmarks.pdb")
        {
            throw "Only the fresh project's DLL/PDB may differ: $($differences -join ', ')"
        }
        $closure = Join-Path $reproduction "consumer-$lower-closure.json"
        [ordered]@{ candidate = 'F043'; actualVariant = $variant; files = $files } |
            ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $closure -Encoding utf8
        $evidence = Join-Path $reproduction "$variant\evidence"
        [void][System.IO.Directory]::CreateDirectory($evidence)
        Invoke-RecordedDotnet "$variant-CharacterizeRun" @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'),
            'characterize', $evidence, $closure, (Join-Path $run "source-inputs-$lower.json"),
            (Join-Path $run "source-files-$lower"), (Join-Path $reproduction 'not-a-timing-directory'), $variant, 'none')
        foreach ($name in @('0002-selected-source-pdb-associations.json', '0011-public-contracts.json',
            '0012-adjacent-bcl-diagnostics.json', '0013-characterization-completed.json'))
        {
            $before = Get-Content -LiteralPath (Join-Path $run "characterization-$lower-001\states\$name") -Raw | ConvertFrom-Json
            $after = Get-Content -LiteralPath (Join-Path $evidence $name) -Raw | ConvertFrom-Json
            if (($before | ConvertTo-Json -Depth 32 -Compress) -cne ($after | ConvertTo-Json -Depth 32 -Compress))
            {
                throw "An independently rebuilt actual observation differs: $variant $name"
            }
        }
        foreach ($file in Get-ChildItem -LiteralPath $evidence -Filter '*-compiled-producer-and-rendering.json' -File)
        {
            $before = Get-Content -LiteralPath (Join-Path $run "characterization-$lower-001\states\$($file.Name)") -Raw | ConvertFrom-Json
            $after = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            foreach ($observation in @($before, $after))
            {
                foreach ($callback in $observation.actualCallbacks)
                {
                    $callback.assembly = '<byte-bound-common-harness>'
                }
            }
            if (($before | ConvertTo-Json -Depth 32 -Compress) -cne ($after | ConvertTo-Json -Depth 32 -Compress))
            {
                throw "An independently compiled real producer/rendering signature differs: $variant $($file.Name)"
            }
        }
        [pscustomobject]@{
            variant = $variant; actualConsumerFiles = 264; actualOnlyChangedFiles = $differences
            actualCharacterizationCases = 9; actualCompiledProducers = 6; actualUntimedBoundaries = 12
            actualObservationsIdentical = $true
        }
    }
)
Confirm-Guards
$receipt = [ordered]@{
    candidate = 'F043'; actualByteExactProjectFiles = 13; actualFreshProjectRestoredAndRebuilt = $true
    actualVariants = $results; actualOwnerAndOtherDependencyBytesIdenticalToEachMeasuredVariant = $true
    actualAdditionalTimingSamples = 0; actualClosedBudgetBytesUnchanged = $true
    actualClosedBudgetSha256 = $budgetHash; actualMeasuredImagesPreserved = $true
    actualShippingSourceTestsProtectedFilesAndReportsPreserved = $true
    actualExcludedBuildBoundaries = 'JS/static-web-assets, native IIS and full-repository builds are not claimed.'
}
$receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $reproduction 'verified-reproduction.json') -Encoding utf8
$receipt | ConvertTo-Json -Depth 10
