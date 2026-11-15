param(
    [Parameter(Mandatory)]
    [ValidateSet('Snapshot', 'Run')]
    [string]$Action,
    [Parameter(Mandatory)]
    [ValidatePattern('^F[0-9]{3}$')]
    [string]$Id,
    [ValidateSet('before', 'after')]
    [string]$Variant,
    [string]$ProjectName,
    [string]$TargetAssembly,
    [string]$TargetSource,
    [string[]]$AdditionalTargetSource = @(),
    [ValidatePattern('^[A-Za-z0-9_.-]+\.dll$')]
    [string[]]$ReuseAssemblyFromBefore = @(),
    [string]$Filter,
    [string]$BuildOutput,
    [int]$ExpectedCaseCount,
    [ValidateRange(1, 3)]
    [int]$Round = 1,
    [ValidateRange(1, 3)]
    [int]$ComparisonCount = 1,
    [ValidateSet('before', 'after', 'after-2', 'after-3')]
    [string]$SnapshotName,
    [ValidateSet('after', 'after-2', 'after-3')]
    [string]$AfterSnapshot = 'after',
    [ValidateSet('before')]
    [string]$ReuseHarnessFrom,
    [switch]$Smoke
)

$ErrorActionPreference = 'Stop'
$runRoot = Join-Path $PSScriptRoot "autoperf-runs\$Id"
$repoRoot = 'C:\src\aspnetcore'

if ($Action -eq 'Snapshot')
{
    foreach ($required in @('Variant', 'ProjectName', 'TargetAssembly', 'TargetSource'))
    {
        if (-not (Get-Variable -Name $required -ValueOnly))
        {
            throw "Snapshot requires -$required."
        }
    }

    if (-not $BuildOutput)
    {
        $BuildOutput = Join-Path $repoRoot "artifacts\bin\$ProjectName\Release\net12.0"
    }
    if (-not $SnapshotName)
    {
        $SnapshotName = $Variant
    }
    if (($Variant -eq 'before' -and $SnapshotName -ne 'before') -or
        ($Variant -eq 'after' -and -not $SnapshotName.StartsWith('after')))
    {
        throw 'Snapshot name does not match the selected variant.'
    }
    $destination = Join-Path $runRoot "binaries\$SnapshotName"
    if (Test-Path -LiteralPath $destination)
    {
        throw "Refusing to overwrite an existing binary snapshot: $destination"
    }
    foreach ($file in @("$ProjectName.dll", "$ProjectName.runtimeconfig.json", "$ProjectName.deps.json", "$TargetAssembly.dll"))
    {
        if (-not (Test-Path -LiteralPath (Join-Path $BuildOutput $file)))
        {
            throw "Missing benchmark build output: $file"
        }
    }

    New-Item -ItemType Directory -Path $destination | Out-Null
    Get-ChildItem -LiteralPath $BuildOutput -Force | Copy-Item -Destination $destination -Recurse
    if ($ReuseAssemblyFromBefore.Count)
    {
        $original = Join-Path $runRoot 'binaries\before'
        foreach ($file in $ReuseAssemblyFromBefore)
        {
            if ($file -eq "$TargetAssembly.dll")
            {
                throw 'The measured target cannot be replaced with its baseline.'
            }
            $beforeAssembly = Join-Path $original $file
            $afterAssembly = Join-Path $destination $file
            if ([Reflection.AssemblyName]::GetAssemblyName($beforeAssembly).FullName -ne
                [Reflection.AssemblyName]::GetAssemblyName($afterAssembly).FullName)
            {
                throw "Cannot freeze an assembly with a different public identity: $file"
            }
            Copy-Item -LiteralPath $beforeAssembly -Destination $afterAssembly
            $pdb = [IO.Path]::ChangeExtension($file, '.pdb')
            if (Test-Path -LiteralPath (Join-Path $original $pdb))
            {
                Copy-Item -LiteralPath (Join-Path $original $pdb) -Destination (Join-Path $destination $pdb)
            }
        }
    }
    if ($ReuseHarnessFrom)
    {
        $original = Join-Path $runRoot "binaries\$ReuseHarnessFrom"
        foreach ($file in @("$ProjectName.runtimeconfig.json", "$ProjectName.deps.json"))
        {
            if ((Get-FileHash -LiteralPath (Join-Path $original $file)).Hash -ne
                (Get-FileHash -LiteralPath (Join-Path $destination $file)).Hash)
            {
                throw "Cannot reuse a harness with a different runtime or dependency configuration: $file"
            }
        }
        foreach ($file in @("$ProjectName.dll", "$ProjectName.pdb"))
        {
            Copy-Item -LiteralPath (Join-Path $original $file) -Destination (Join-Path $destination $file)
        }
    }
    $ownerPath = Join-Path $destination "$TargetAssembly.dll"
    $benchmarkPath = Join-Path $destination "$ProjectName.dll"
    $manifest = [pscustomobject]@{
        candidate = $Id
        variant = $Variant
        snapshot = $SnapshotName
        captured_at = [DateTimeOffset]::UtcNow.ToString('o')
        source_revision = (git -C $repoRoot rev-parse HEAD)
        source_dirty = @(git -C $repoRoot status --porcelain --untracked-files=all)
        target_source = $TargetSource
        target_source_sha256 = (Get-FileHash -LiteralPath (Join-Path $repoRoot $TargetSource) -Algorithm SHA256).Hash
        additional_target_sources = @($AdditionalTargetSource | ForEach-Object {
            @{ path = $_; sha256 = (Get-FileHash -LiteralPath (Join-Path $repoRoot $_) -Algorithm SHA256).Hash }
        })
        target_assembly = "$TargetAssembly.dll"
        target_assembly_sha256 = (Get-FileHash -LiteralPath $ownerPath -Algorithm SHA256).Hash
        benchmark_assembly = "$ProjectName.dll"
        benchmark_assembly_sha256 = (Get-FileHash -LiteralPath $benchmarkPath -Algorithm SHA256).Hash
        reused_harness_from = $ReuseHarnessFrom
        reused_assemblies_from_before = $ReuseAssemblyFromBefore
        runtime_configuration_sha256 = (Get-FileHash -LiteralPath (Join-Path $destination "$ProjectName.runtimeconfig.json") -Algorithm SHA256).Hash
        dependency_configuration_sha256 = (Get-FileHash -LiteralPath (Join-Path $destination "$ProjectName.deps.json") -Algorithm SHA256).Hash
        runtime_framework = ((Get-Content -LiteralPath (Join-Path $destination "$ProjectName.runtimeconfig.json") -Raw | ConvertFrom-Json).runtimeOptions.framework.version)
        configuration = 'Release'
        target_framework = 'net12.0'
        note = 'Immutable copied build outputs; source_dirty records tracked and untracked changes at capture, including any unrelated local report files. Published final commit must reproduce the relevant source changes. Raw binaries are not published.'
    }
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $runRoot "$SnapshotName-manifest.json") -Encoding utf8
    Write-Output "Captured $SnapshotName binaries: $destination"
    return
}

if (-not $ProjectName -or -not $Filter)
{
    throw 'Run requires -ProjectName and -Filter.'
}
if ($Round + $ComparisonCount - 1 -gt 3)
{
    throw 'The campaign allows at most three measured comparisons per item.'
}
if ($Smoke -and -not $Variant)
{
    throw 'Smoke testing requires an explicit variant.'
}

. (Join-Path $repoRoot 'activate.ps1')
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.dotnet\dotnet.exe')))
{
    throw 'The repository SDK must be installed before benchmarking.'
}

$sdk = dotnet --version
if ($LASTEXITCODE -ne 0)
{
    throw 'Unable to select the pinned repository SDK.'
}

$variants = if ($Smoke) { @($Variant) } else { @('before', 'after') }
foreach ($name in $variants)
{
    $snapshot = if ($name -eq 'after') { $AfterSnapshot } else { $name }
    $manifest = Get-Content -LiteralPath (Join-Path $runRoot "$snapshot-manifest.json") -Raw | ConvertFrom-Json
    foreach ($pair in @(
        @($manifest.target_assembly, $manifest.target_assembly_sha256),
        @($manifest.benchmark_assembly, $manifest.benchmark_assembly_sha256),
        @("$ProjectName.runtimeconfig.json", $manifest.runtime_configuration_sha256)
    ))
    {
        $file = Join-Path $runRoot "binaries\$snapshot\$($pair[0])"
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $pair[1])
        {
            throw "The $name snapshot changed after capture: $file"
        }
    }
}

if (-not $Smoke)
{
    $before = Get-Content -LiteralPath (Join-Path $runRoot 'before-manifest.json') -Raw | ConvertFrom-Json
    $after = Get-Content -LiteralPath (Join-Path $runRoot "$AfterSnapshot-manifest.json") -Raw | ConvertFrom-Json
    if ($before.target_assembly_sha256 -eq $after.target_assembly_sha256)
    {
        throw 'The target assemblies are identical; refusing to present a no-change A/B comparison.'
    }
    if ($before.benchmark_assembly_sha256 -ne $after.benchmark_assembly_sha256 -or
        $before.runtime_configuration_sha256 -ne $after.runtime_configuration_sha256 -or
        $before.dependency_configuration_sha256 -ne $after.dependency_configuration_sha256)
    {
        throw 'The benchmark harness or runtime configuration differs between variants.'
    }
}

$execution = @()
if (-not $Smoke -and (Test-Path -LiteralPath (Join-Path $runRoot 'execution.json')))
{
    $execution = @(Get-Content -LiteralPath (Join-Path $runRoot 'execution.json') -Raw | ConvertFrom-Json)
}
if (-not $Smoke)
{
    $lastRecordedRound = if ($execution.Count) { ($execution | Measure-Object round -Maximum).Maximum } else { 0 }
    if ($Round -ne $lastRecordedRound + 1)
    {
        throw "The next comparison must be round $($lastRecordedRound + 1); existing evidence cannot be overwritten."
    }
}
$lastRound = if ($Smoke) { $Round } else { $Round + $ComparisonCount - 1 }
for ($comparisonRound = $Round; $comparisonRound -le $lastRound; $comparisonRound++)
{
    $order = if ($Smoke) { @($Variant) } elseif ($comparisonRound % 2 -eq 1) { @('before', 'after') } else { @('after', 'before') }
    foreach ($name in $order)
    {
        $snapshot = if ($name -eq 'after') { $AfterSnapshot } else { $name }
        $label = if ($Smoke) { "smoke-$snapshot" } else { "round-$comparisonRound-$name" }
        $output = Join-Path $runRoot $label
        if (Test-Path -LiteralPath $output)
        {
            throw "Refusing to overwrite existing benchmark results: $output"
        }
        New-Item -ItemType Directory -Path $output | Out-Null
        $dll = Join-Path $runRoot "binaries\$snapshot\$ProjectName.dll"
        $arguments = @(
            $dll, '--filter', $Filter, '--inProcess',
            '--exporters', 'json', 'csv', '--artifacts', $output
        )
        if ($Smoke)
        {
            $arguments += @('--job', 'Dry', '--warmupCount', '0', '--iterationCount', '1')
        }
        else
        {
            $arguments += @('--job', 'Short', '--warmupCount', '3', '--iterationCount', '8', '--iterationTime', '100', '--outliers', 'DontRemove')
        }
        $started = [DateTimeOffset]::UtcNow
        Write-Output "Starting $label; SDK $sdk; results $output"
        & dotnet @arguments *> (Join-Path $output 'console.log')
        $exitCode = $LASTEXITCODE
        $execution += [pscustomobject]@{
            round = $comparisonRound
            variant = $name
            snapshot = $snapshot
            label = $label
            started_at = $started.ToString('o')
            completed_at = [DateTimeOffset]::UtcNow.ToString('o')
            sdk = $sdk
            arguments = $arguments
            exit_code = $exitCode
        }
        $executionName = if ($Smoke) { "execution-smoke-$snapshot.json" } else { 'execution.json' }
        $execution | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $runRoot $executionName) -Encoding utf8
        if ($exitCode -ne 0)
        {
            throw "Benchmark $label failed with exit code $exitCode. See $output\console.log."
        }
        $jsonResults = @(Get-ChildItem -LiteralPath (Join-Path $output 'results') -Filter '*-full*.json' -File)
        if ($jsonResults.Count -eq 0)
        {
            throw "Benchmark $label produced no full JSON measurement report."
        }
        foreach ($json in $jsonResults)
        {
            $results = Get-Content -LiteralPath $json.FullName -Raw | ConvertFrom-Json
            if (@($results.Benchmarks).Count -eq 0)
            {
                throw "Benchmark $label produced an empty report."
            }
            if ($ExpectedCaseCount -gt 0 -and @($results.Benchmarks).Count -ne $ExpectedCaseCount)
            {
                throw "Benchmark $label produced $(@($results.Benchmarks).Count) cases; expected $ExpectedCaseCount."
            }
            foreach ($case in $results.Benchmarks)
            {
                if (-not $case.Statistics -or $case.Statistics.Mean -le 0)
                {
                    throw "Benchmark $label has an unmeasured case: $($case.FullName)"
                }
                if (-not $Smoke -and $case.Statistics.N -lt 8)
                {
                    throw "Benchmark $label has fewer than eight measurements: $($case.FullName)"
                }
            }
        }
        Write-Output "Completed $label."
    }
}
