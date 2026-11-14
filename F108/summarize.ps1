param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F108' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 6 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'F108 requires exactly three completed comparisons.'
}

$expectedReceipts = @(Get-Content (Join-Path $run 'setup-before.log') |
    Where-Object { $_.StartsWith('Contract receipt: ') } |
    ForEach-Object { $_.Substring(18) | ConvertFrom-Json })
$expectedNames = @($expectedReceipts.name | Sort-Object)
if ($expectedNames.Count -ne 18 -or @($expectedNames | Sort-Object -Unique).Count -ne 18)
{
    throw 'Invalid fixed F108 case inventory.'
}

$allReceipts = [Collections.Generic.List[object]]::new()
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
foreach ($round in 1..3)
{
    $byVariant = @{}
    foreach ($variant in @('before', 'after'))
    {
        $label = "round-$round-$variant"
        $sourceReports = Join-Path $run "$label\results"
        $file = if (Test-Path -LiteralPath $sourceReports)
        {
            @(Get-ChildItem -LiteralPath $sourceReports -Filter '*full*.json')
        }
        else
        {
            @(Get-Item -LiteralPath (Join-Path $run "$label\results.json"))
        }
        if ($file.Count -ne 1)
        {
            throw "Ambiguous raw report for $label."
        }
        $data = Get-Content $file[0].FullName -Raw | ConvertFrom-Json
        $byVariant[$variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
            {
                throw "Unrecognized full case identity: $($result.FullName)."
            }
            $name = $Matches[1]
            if ($byVariant[$variant].ContainsKey($name) -or $name -notin $expectedNames -or
                $result.Statistics.N -lt 8 -or $result.Statistics.Mean -le 0 -or
                $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw "Invalid measured result $label/$name."
            }
            $byVariant[$variant][$name] = $result
            $raw.Add([pscustomobject][ordered]@{
                round = $round
                variant = $variant
                case = $name
                mean_ns = $result.Statistics.Mean
                standard_deviation_ns = $result.Statistics.StandardDeviation
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation
                measured_iterations = $result.Statistics.N
            })
        }
        if ((($byVariant[$variant].Keys | Sort-Object) -join '|') -cne ($expectedNames -join '|'))
        {
            throw "Incomplete measured inventory for $label."
        }

        $receipts = @(Get-Content (Join-Path $run "$label\console.log") |
            Where-Object { $_.StartsWith('Contract receipt: ') } |
            ForEach-Object { $_.Substring(18) | ConvertFrom-Json })
        if ((($receipts.name | Sort-Object) -join '|') -cne ($expectedNames -join '|'))
        {
            throw "Incomplete actual-producer receipts for $label."
        }
        foreach ($receipt in $receipts)
        {
            $expected = @($expectedReceipts | Where-Object name -eq $receipt.name)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 5 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 5 -Compress))
            {
                throw "Actual producer contract differs for $label/$($receipt.name)."
            }
            $allReceipts.Add([pscustomobject]@{ label = $label; contract = $receipt })
        }
    }
    foreach ($name in $expectedNames)
    {
        $before = $byVariant.before[$name]
        $after = $byVariant.after[$name]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round
            case = $name
            time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
            before_ns = $before.Statistics.Mean
            after_ns = $after.Statistics.Mean
            before_bytes = $before.Memory.BytesAllocatedPerOperation
            after_bytes = $after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes = $after.Memory.BytesAllocatedPerOperation - $before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent = [Math]::Max(
                100 * $before.Statistics.StandardDeviation / $before.Statistics.Mean,
                100 * $after.Statistics.StandardDeviation / $after.Statistics.Mean)
        })
    }
}

$summary = @($pairs | Group-Object case | Sort-Object Name | ForEach-Object {
    $rows = @($_.Group | Sort-Object round)
    if ($rows.Count -ne 3)
    {
        throw "Incomplete paired summary for $($_.Name)."
    }
    [pscustomobject][ordered]@{
        case = $_.Name
        kind = if ($_.Name.EndsWith('Control')) { 'untouched control' } else { 'affected' }
        pair_time_changes_percent = @($rows.time_change_percent)
        median_paired_time_change_percent = @($rows.time_change_percent | Sort-Object)[1]
        before_bytes_by_round = @($rows.before_bytes)
        after_bytes_by_round = @($rows.after_bytes)
        extra_bytes_by_round = @($rows.allocation_change_bytes)
        maximum_cv_percent = ($rows.maximum_cv_percent | Measure-Object -Maximum).Maximum
    }
})
if ($raw.Count -ne 108 -or $pairs.Count -ne 54 -or $summary.Count -ne 18 -or $allReceipts.Count -ne 108)
{
    throw 'Incomplete F108 outcomes, paired summaries or producer receipts.'
}
$raw.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -NoNewline
$pairs.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -NoNewline
$summary | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'all-paired-summary.json') -NoNewline
$allReceipts.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'setup-correctness.json') -NoNewline
$summary | Select-Object case, kind,
    @{n='R1';e={[Math]::Round($_.pair_time_changes_percent[0], 2)}},
    @{n='R2';e={[Math]::Round($_.pair_time_changes_percent[1], 2)}},
    @{n='R3';e={[Math]::Round($_.pair_time_changes_percent[2], 2)}},
    @{n='Median';e={[Math]::Round($_.median_paired_time_change_percent, 2)}},
    @{n='Extra B';e={$_.extra_bytes_by_round -join '/'}},
    @{n='CV';e={[Math]::Round($_.maximum_cv_percent, 2)}} | Format-Table -AutoSize
