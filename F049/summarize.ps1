param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F049' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -notin @(2, 4, 6) -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'F049 requires one to three complete serial comparisons.'
}
$comparisons = [int]($execution.Count / 2)
$order = @('round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after')
if (($execution.label -join '|') -cne (($order | Select-Object -First $execution.Count) -join '|'))
{
    throw 'Unexpected serial F049 comparison order.'
}
$previousCompletion = [DateTimeOffset]::MinValue
foreach ($record in $execution)
{
    $start = [DateTimeOffset]::Parse($record.started_at)
    $completion = [DateTimeOffset]::Parse($record.completed_at)
    if ($start -lt $previousCompletion -or $completion -le $start)
    {
        throw 'Measurements overlap or have invalid timestamps.'
    }
    $previousCompletion = $completion
}
$oracle = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracle.Name | Sort-Object)
if ($names.Count -ne 31 -or @($names | Sort-Object -Unique).Count -ne 31)
{
    throw 'Invalid fixed 31-case original producer inventory.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$allReceipts = [Collections.Generic.List[object]]::new()
foreach ($round in 1..$comparisons)
{
    $afterExecution = @($execution | Where-Object { $_.round -eq $round -and $_.variant -eq 'after' })
    if ($afterExecution.Count -ne 1)
    {
        throw "Missing proposed snapshot identity for round $round."
    }
    $variants = @{}
    foreach ($variant in @('before', 'after'))
    {
        $label = "round-$round-$variant"
        $files = @(Get-ChildItem (Join-Path $run "$label\results") -Filter '*full*.json' -File | Sort-Object Name)
        if ($files.Count -ne 2)
        {
            throw "Expected both conversion and full-reader reports for $label."
        }
        $variants[$variant] = @{}
        foreach ($file in $files)
        {
            $data = Get-Content $file.FullName -Raw | ConvertFrom-Json
            foreach ($result in $data.Benchmarks)
            {
                if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
                {
                    throw "Unknown complete benchmark identity $($result.FullName)."
                }
                $name = $Matches[1]
                if ($name -notin $names -or $variants[$variant].ContainsKey($name) -or $result.Statistics.N -ne 8 -or
                    $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
                {
                    throw "Invalid measured F049 result $label/$name."
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
        }
        if ((($variants[$variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw "Incomplete aggregate 31-case inventory for $label."
        }
        $receipts = @(Get-Content (Join-Path $run "$label\console.log") |
            Where-Object { $_.StartsWith('Contract receipt: ') } |
            ForEach-Object { $_.Substring(18) | ConvertFrom-Json })
        if ((($receipts.Name | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw "Incomplete actual producer receipts for $label."
        }
        foreach ($receipt in $receipts)
        {
            $expected = @($oracle | Where-Object Name -eq $receipt.Name)
            if ($expected.Count -ne 1 -or ($receipt | ConvertTo-Json -Depth 12 -Compress) -cne
                ($expected[0] | ConvertTo-Json -Depth 12 -Compress))
            {
                throw "Actual producer contract differs for $label/$($receipt.Name)."
            }
            $allReceipts.Add([pscustomobject]@{ label = $label; contract = $receipt })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round
            after_snapshot = $afterExecution[0].snapshot
            case = $name
            kind = @($oracle | Where-Object Name -eq $name)[0].Kind
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
$allReceipts.ToArray() | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$finalSummary | Select-Object case, median_time_change_percent, median_before_bytes, median_after_bytes,
    maximum_cv_percent | Format-Table -AutoSize
Write-Output "Comparisons=$comparisons; outcomes=$($raw.Count); producer receipts=$($allReceipts.Count); paired rows=$($pairs.Count)."
Write-Output "Final source snapshot=$finalSnapshot; report medians use only its $($finalSummary[0].comparisons) comparisons."
