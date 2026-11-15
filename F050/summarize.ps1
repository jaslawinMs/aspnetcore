param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F050' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -notin @(2, 4, 6) -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'F050 requires one to three successful paired comparisons.'
}
$comparisons = [int]($execution.Count / 2)
$order = @('round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after')
if (($execution.label -join '|') -cne (($order | Select-Object -First $execution.Count) -join '|'))
{
    throw 'Unexpected serialized comparison order.'
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
$initialOracle = Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json
$names = @($initialOracle.Receipts.Name | Sort-Object)
if ($names.Count -ne 39 -or @($names | Sort-Object -Unique).Count -ne 39)
{
    throw 'The original fixed corpus must have 39 unique producer identities.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$receipts = [Collections.Generic.List[object]]::new()
$environment = $null
foreach ($round in 1..$comparisons)
{
    $oracle = if ($round -eq 3) {
        Get-Content (Join-Path $run 'contract-oracles-final.json') -Raw | ConvertFrom-Json
    } else {
        $initialOracle
    }
    if ((($oracle.Receipts.Name | Sort-Object) -join '|') -cne ($names -join '|'))
    {
        throw 'The final harness must preserve the exact fixed case inventory.'
    }
    $afterLaunch = @($execution | Where-Object { $_.round -eq $round -and $_.variant -eq 'after' })
    if ($afterLaunch.Count -ne 1)
    {
        throw 'Missing exact proposed source identity.'
    }
    $variants = @{}
    foreach ($variant in @('before', 'after'))
    {
        $label = "round-$round-$variant"
        $files = @(Get-ChildItem (Join-Path $run "$label\results") -File -Filter '*full*.json')
        if ($files.Count -ne 1)
        {
            throw "Exactly one original full report required for $label."
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
            throw 'Benchmark/runtime/SDK environment differs between launches.'
        }
        $variants[$variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
            {
                throw "Unresolved complete benchmark identity: $($result.FullName)"
            }
            $name = $Matches[1]
            if ($name -notin $names -or $variants[$variant].ContainsKey($name) -or
                $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw "Invalid or incomplete measured result: $label/$name"
            }
            $variants[$variant][$name] = $result
            $raw.Add([pscustomobject][ordered]@{
                round = $round
                variant = $variant
                case = $name
                full_name = $result.FullName
                mean_ns = $result.Statistics.Mean
                standard_deviation_ns = $result.Statistics.StandardDeviation
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation
                measured_iterations = $result.Statistics.N
            })
        }
        if ((($variants[$variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw "Incomplete fixed benchmark corpus in $label."
        }
        $actualReceipts = @(Get-Content (Join-Path $run "$label\console.log") |
            Where-Object { $_.StartsWith('Verified producer receipt: ') } |
            ForEach-Object { $_.Substring('Verified producer receipt: '.Length) | ConvertFrom-Json })
        if ((($actualReceipts.Name | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw "Incomplete or duplicate actual producer receipts in $label."
        }
        foreach ($receipt in $actualReceipts)
        {
            $expected = @($oracle.Receipts | Where-Object Name -eq $receipt.Name)
            if ($expected.Count -ne 1)
            {
                throw 'Producer does not have one original oracle.'
            }
            $expectedFormats = if ($variant -eq 'before' -or $receipt.Kind -eq 2) { $expected[0].FormatExceptions } else { 0 }
            $material = $receipt.PSObject.Copy()
            $material.FormatExceptions = $expected[0].FormatExceptions
            if ($receipt.FormatExceptions -ne $expectedFormats -or
                ($material | ConvertTo-Json -Depth 12 -Compress) -cne
                    ($expected[0] | ConvertTo-Json -Depth 12 -Compress))
            {
                throw "Material output, public errors or actual exception reduction differs: $label/$($receipt.Name)"
            }
            $receipts.Add([pscustomobject]@{ label = $label; contract = $receipt })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $definition = @($oracle.Receipts | Where-Object Name -eq $name)[0]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round
            after_snapshot = $afterLaunch[0].snapshot
            case = $name
            kind = $definition.Kind
            target = $definition.Kind -ne 2 -and $definition.FormatExceptions -gt 0
            time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
            before_ns = $before.Statistics.Mean
            after_ns = $after.Statistics.Mean
            before_bytes = $before.Memory.BytesAllocatedPerOperation
            after_bytes = $after.Memory.BytesAllocatedPerOperation
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
    return @($Rows | Group-Object case | ForEach-Object {
        $group = @($_.Group | Sort-Object round)
        [pscustomobject][ordered]@{
            case = $_.Name
            kind = $group[0].kind
            target = $group[0].target
            comparisons = $group.Count
            rounds = @($group.round)
            after_snapshots = @($group.after_snapshot)
            median_time_change_percent = Median ([double[]]$group.time_change_percent)
            minimum_time_change_percent = ($group.time_change_percent | Measure-Object -Minimum).Minimum
            maximum_time_change_percent = ($group.time_change_percent | Measure-Object -Maximum).Maximum
            every_pair_faster = @($group | Where-Object time_change_percent -ge 0).Count -eq 0
            median_before_bytes = Median ([double[]]$group.before_bytes)
            median_after_bytes = Median ([double[]]$group.after_bytes)
            minimum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Minimum).Minimum
            maximum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Maximum).Maximum
            maximum_cv_percent = ($group.maximum_cv_percent | Measure-Object -Maximum).Maximum
            time_changes_percent = @($group.time_change_percent)
        }
    } | Sort-Object case)
}
$summary = Summarize $pairs.ToArray()
$finalSnapshot = @($execution | Where-Object variant -eq 'after' | Sort-Object round)[-1].snapshot
$finalSummary = Summarize @($pairs | Where-Object after_snapshot -eq $finalSnapshot)
$raw.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$summary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-summary.json') -Encoding utf8
$finalSummary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'final-paired-summary.json') -Encoding utf8
$receipts.ToArray() | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$finalSummary | Select-Object case, median_time_change_percent, median_before_bytes, median_after_bytes,
    maximum_cv_percent | Format-Table -AutoSize
Write-Output "Comparisons=$comparisons; outcomes=$($raw.Count); receipts=$($receipts.Count); pairs=$($pairs.Count); final=$finalSnapshot."
