param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F056' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -notin @(2, 4, 6) -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'One to three complete successful comparisons required.'
}
$comparisons = [int]($execution.Count / 2)
$order = @('round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after')
if (($execution.label -join '|') -cne (($order | Select-Object -First $execution.Count) -join '|'))
{
    throw 'Actual serialized alternating execution order differs.'
}
$previous = [DateTimeOffset]::MinValue
foreach ($launch in $execution)
{
    $start = [DateTimeOffset]::Parse($launch.started_at)
    $end = [DateTimeOffset]::Parse($launch.completed_at)
    if ($start -lt $previous -or $end -le $start)
    {
        throw 'Overlapping or invalid launch timestamps.'
    }
    $previous = $end
}
$oracle = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracle.Case | Sort-Object)
$targetNames = @($oracle | Where-Object {
    $_.Outcome -eq 'Unmet' -and $_.Mode -in @('Null', 'Disabled', 'FactoryFiltered')
} | ForEach-Object Case)
if ($names.Count -ne 37 -or @($names | Sort-Object -Unique).Count -ne 37 -or $targetNames.Count -ne 22)
{
    throw 'Fixed37-case corpus or actual22 filtered targets differ.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$receipts = [Collections.Generic.List[object]]::new()
$diagnostics = [Collections.Generic.List[object]]::new()
$environment = $null
foreach ($round in 1..$comparisons)
{
    $afterLaunch = @($execution | Where-Object { $_.round -eq $round -and $_.variant -eq 'after' })
    if ($afterLaunch.Count -ne 1 -or $afterLaunch[0].snapshot -notin @('after', 'after-2', 'after-3'))
    {
        throw 'Missing exact source snapshot for a comparison.'
    }
    $variants = @{}
    foreach ($variant in @('before', 'after'))
    {
        $label = "round-$round-$variant"
        $files = @(Get-ChildItem (Join-Path $run "$label\results") -File -Filter '*full*.json')
        if ($files.Count -ne 1)
        {
            throw 'Missing exact full BenchmarkDotNet report.'
        }
        $data = Get-Content $files[0].FullName -Raw | ConvertFrom-Json
        if ($null -eq $environment)
        {
            $environment = $data.HostEnvironmentInfo
        }
        elseif ($data.HostEnvironmentInfo.RuntimeVersion -cne $environment.RuntimeVersion -or
            $data.HostEnvironmentInfo.DotNetCliVersion -cne $environment.DotNetCliVersion -or
            $data.HostEnvironmentInfo.BenchmarkDotNetVersion -cne $environment.BenchmarkDotNetVersion)
        {
            throw 'Runtime/SDK/benchmark environment differs.'
        }
        $variants[$variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
            {
                throw 'Unresolved complete benchmark identity.'
            }
            $name = $Matches[1]
            if ($name -notin $names -or $variants[$variant].ContainsKey($name) -or
                $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw 'Missing/duplicate/incomplete actual benchmark result.'
            }
            $variants[$variant][$name] = $result
            $raw.Add([pscustomobject][ordered]@{
                round = $round; variant = $variant; case = $name; full_name = $result.FullName
                mean_ns = $result.Statistics.Mean; standard_deviation_ns = $result.Statistics.StandardDeviation
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation; measured_iterations = $result.Statistics.N
            })
        }
        if ((($variants[$variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Incomplete fixed corpus.'
        }
        $console = @(Get-Content (Join-Path $run "$label\console.log"))
        $verified = @($console | Where-Object { $_.StartsWith('AUTOPERF_CONTRACT ') } |
            ForEach-Object { $_.Substring('AUTOPERF_CONTRACT '.Length) | ConvertFrom-Json })
        if ((($verified.Case | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Missing/duplicate complete actual material contracts.'
        }
        foreach ($receipt in $verified)
        {
            $expected = @($oracle | Where-Object Case -ceq $receipt.Case)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 16 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 16 -Compress))
            {
                throw 'Actual owning-service result/log differs from original.'
            }
            $receipts.Add([pscustomobject]@{
                label = $label; actual_repeated_workloads_checked = 2; verified_original_contract = $receipt
            })
        }
        $actual = @($console | Where-Object { $_.StartsWith('AUTOPERF_DIAGNOSTIC ') } |
            ForEach-Object { $_.Substring('AUTOPERF_DIAGNOSTIC '.Length) | ConvertFrom-Json })
        if ($actual.Count -ne 74 -or
            @($actual | Group-Object Case | Where-Object Count -ne 2).Count -or
            ((($actual.Case | Sort-Object -Unique) -join '|') -cne ($names -join '|')))
        {
            throw 'Each complete contract must have two actual diagnostic producer observations.'
        }
        foreach ($diagnostic in $actual)
        {
            $expected = @($oracle | Where-Object Case -ceq $diagnostic.Case)[0]
            if ($diagnostic.ActualPendingCount -ne $expected.PendingIndices.Count -or
                $diagnostic.ActualToStringCalls.Count -ne $expected.OriginalUniqueRequirements -or
                ($diagnostic.PendingIndices -join '|') -cne ($expected.PendingIndices -join '|'))
            {
                throw 'Actual pending producer/unique references differ.'
            }
            for ($index = 0; $index -lt $diagnostic.ActualToStringCalls.Count; $index++)
            {
                $required = [int]($index -in $expected.PendingIndices -and
                    ($variant -eq 'before' -or $expected.Mode -in @('Enabled', 'FactoryEnabled')))
                if ($diagnostic.ActualToStringCalls[$index] -ne $required)
                {
                    throw 'Actual original eager/filtered omission/enabled ToString count differs.'
                }
            }
            $diagnostics.Add([pscustomobject]@{ label = $label; variant = $variant; actual_producer_observation = $diagnostic })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $definition = @($oracle | Where-Object Case -ceq $name)[0]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round; after_snapshot = $afterLaunch[0].snapshot; case = $name; mode = $definition.Mode
            outcome = $definition.Outcome; named = $definition.Named; partial = $definition.Partial
            submitted_requirements = $definition.SubmittedRequirements; actual_pending_requirements = $definition.PendingIndices.Count
            actual_reasons = $definition.Reasons.Count; target = $name -in $targetNames
            time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
            before_ns = $before.Statistics.Mean; after_ns = $after.Statistics.Mean
            before_bytes = $before.Memory.BytesAllocatedPerOperation; after_bytes = $after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes = $after.Memory.BytesAllocatedPerOperation - $before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent = [Math]::Max(100 * $before.Statistics.StandardDeviation / $before.Statistics.Mean,
                100 * $after.Statistics.StandardDeviation / $after.Statistics.Mean)
        })
    }
}
function Median([double[]]$Values)
{
    $sorted = @($Values | Sort-Object)
    $middle = [int][Math]::Floor($sorted.Count / 2)
    if ($sorted.Count % 2)
    {
        return $sorted[$middle]
    }

    return ($sorted[$middle - 1] + $sorted[$middle]) / 2
}
function Summarize([object[]]$Rows)
{
    return @($Rows | Group-Object case, after_snapshot | ForEach-Object {
        $group = @($_.Group | Sort-Object round)
        [pscustomobject][ordered]@{
            case = $group[0].case; after_snapshot = $group[0].after_snapshot
            mode = $group[0].mode; outcome = $group[0].outcome; named = $group[0].named; partial = $group[0].partial
            submitted_requirements = $group[0].submitted_requirements; actual_pending_requirements = $group[0].actual_pending_requirements
            actual_reasons = $group[0].actual_reasons; target = $group[0].target; comparisons = $group.Count
            median_time_change_percent = Median ([double[]]$group.time_change_percent)
            minimum_time_change_percent = ($group.time_change_percent | Measure-Object -Minimum).Minimum
            maximum_time_change_percent = ($group.time_change_percent | Measure-Object -Maximum).Maximum
            every_pair_faster = @($group | Where-Object time_change_percent -ge 0).Count -eq 0
            median_before_ns = Median ([double[]]$group.before_ns); median_after_ns = Median ([double[]]$group.after_ns)
            median_before_bytes = Median ([double[]]$group.before_bytes); median_after_bytes = Median ([double[]]$group.after_bytes)
            minimum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Minimum).Minimum
            maximum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Maximum).Maximum
            maximum_cv_percent = ($group.maximum_cv_percent | Measure-Object -Maximum).Maximum
            time_changes_percent = @($group.time_change_percent)
        }
    } | Sort-Object case, after_snapshot)
}
$summary = Summarize $pairs.ToArray()
$finalSnapshot = @($execution | Where-Object variant -eq 'after' | Sort-Object round)[-1].snapshot
$finalSummary = Summarize @($pairs | Where-Object after_snapshot -ceq $finalSnapshot)
$raw.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$summary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-summary.json') -Encoding utf8
$finalSummary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'final-paired-summary.json') -Encoding utf8
$receipts.ToArray() | ConvertTo-Json -Depth 18 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$diagnostics.ToArray() | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $run 'diagnostic-correctness.json') -Encoding utf8
$finalSummary | Select-Object case, median_time_change_percent, median_before_bytes, median_after_bytes, maximum_cv_percent |
    Format-Table -AutoSize
Write-Output "Comparisons=$comparisons;outcomes=$($raw.Count);pairs=$($pairs.Count);material contracts=$($receipts.Count);actual complete workloads/diagnostics=$($diagnostics.Count)."
