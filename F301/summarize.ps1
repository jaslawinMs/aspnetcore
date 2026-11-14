param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F301' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 6 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'F301 requires exactly three completed comparisons.'
}
$expectedOrder = @('round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after')
if (($execution.label -join '|') -cne ($expectedOrder -join '|'))
{
    throw 'Unexpected serial comparison order.'
}
$expectedReceipts = @(Get-Content (Join-Path $run 'setup-before.log') |
    Where-Object { $_.StartsWith('Contract receipt: ') } |
    ForEach-Object { $_.Substring(18) | ConvertFrom-Json })
$expectedNames = @(
    'EmptySwitch', 'HPackRequest', 'HPackResponse', 'HeaderLookup', 'HeadersFull', 'OneSwitch', 'ProgramWarm',
    'ProtocolControl', 'QPackMatch', 'QPackRequest', 'QPackResponse', 'RequestSwitch', 'ResponseSwitch',
    'TrailersSwitch', 'UtilityControl'
)
$expectedNames = @($expectedNames | Sort-Object)
if ((($expectedReceipts.Name | Sort-Object) -join '|') -cne ($expectedNames -join '|'))
{
    throw 'Invalid fixed F301 original producer inventory.'
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
        if ((($receipts.Name | Sort-Object) -join '|') -cne ($expectedNames -join '|'))
        {
            throw "Incomplete actual-producer receipts for $label."
        }
        foreach ($receipt in $receipts)
        {
            $expected = @($expectedReceipts | Where-Object Name -eq $receipt.Name)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 5 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 5 -Compress))
            {
                throw "Actual producer contract differs for $label/$($receipt.Name)."
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
        kind = if ($_.Name.EndsWith('Control')) { 'untouched generator control' }
            elseif ($_.Name -in 'EmptySwitch', 'OneSwitch') { 'tiny affected-path control' }
            elseif ($_.Name -eq 'HeadersFull') { 'complete header generation' }
            elseif ($_.Name -eq 'ProgramWarm') { 'actual warm five-file program' }
            else { 'actual header generation partition' }
        pair_time_changes_percent = @($rows.time_change_percent)
        median_paired_time_change_percent = @($rows.time_change_percent | Sort-Object)[1]
        before_bytes_by_round = @($rows.before_bytes)
        after_bytes_by_round = @($rows.after_bytes)
        saved_bytes_by_round = @($rows | ForEach-Object { -$_.allocation_change_bytes })
        maximum_cv_percent = ($rows.maximum_cv_percent | Measure-Object -Maximum).Maximum
    }
})
if ($raw.Count -ne 90 -or $pairs.Count -ne 45 -or $summary.Count -ne 15 -or $allReceipts.Count -ne 90)
{
    throw 'Incomplete F301 outcomes, paired summaries or producer receipts.'
}
$raw.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -NoNewline
$pairs.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -NoNewline
$summary | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'all-paired-summary.json') -NoNewline
$allReceipts.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'setup-correctness.json') -NoNewline
$summary | Select-Object case,
    @{n='R1';e={[Math]::Round($_.pair_time_changes_percent[0], 2)}},
    @{n='R2';e={[Math]::Round($_.pair_time_changes_percent[1], 2)}},
    @{n='R3';e={[Math]::Round($_.pair_time_changes_percent[2], 2)}},
    @{n='Median';e={[Math]::Round($_.median_paired_time_change_percent, 2)}},
    @{n='Saved B';e={$_.saved_bytes_by_round -join '/'}},
    @{n='CV';e={[Math]::Round($_.maximum_cv_percent, 2)}} | Format-Table -AutoSize
