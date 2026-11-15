param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F058' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 2 -or ($execution.label -join '|') -cne 'round-1-before|round-1-after' -or
    @($execution | Where-Object { $_.exit_code -ne 0 -or $_.round -ne 1 }).Count -or
    $execution[1].snapshot -cne 'after' -or
    [DateTimeOffset]::Parse($execution[1].started_at) -lt [DateTimeOffset]::Parse($execution[0].completed_at))
{
    throw 'Exactly one complete serialized unchanged-source rejection comparison required.'
}
$oracles = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracles.Case | Sort-Object)
if ($names.Count -ne 22 -or @($names | Sort-Object -Unique).Count -ne 22 -or
    @($names | Where-Object { $_.StartsWith('Live_') }).Count -ne 12)
{
    throw 'Fixed22-case corpus/twelve actual public producers required.'
}
$raw = [Collections.Generic.List[object]]::new()
$contracts = [Collections.Generic.List[object]]::new()
$variants = @{}
$environment = $null
foreach ($variant in @('before', 'after'))
{
    $label = "round-1-$variant"
    $file = @(Get-ChildItem (Join-Path $run "$label\results") -File -Filter '*full*.json')
    if ($file.Count -ne 1)
    {
        throw 'Missing complete actual BenchmarkDotNet JSON.'
    }
    $data = Get-Content $file[0].FullName -Raw | ConvertFrom-Json
    if ($null -eq $environment)
    {
        $environment = $data.HostEnvironmentInfo
    }
    elseif ($data.HostEnvironmentInfo.RuntimeVersion -cne $environment.RuntimeVersion -or
        $data.HostEnvironmentInfo.DotNetCliVersion -cne $environment.DotNetCliVersion -or
        $data.HostEnvironmentInfo.BenchmarkDotNetVersion -cne $environment.BenchmarkDotNetVersion)
    {
        throw 'Actual SDK/runtime/BenchmarkDotNet configurations differ.'
    }
    $variants[$variant] = @{}
    foreach ($result in $data.Benchmarks)
    {
        if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
        {
            throw 'Unresolved exact benchmark identity.'
        }
        $name = $Matches[1]
        if ($name -notin $names -or $variants[$variant].ContainsKey($name) -or
            $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
            $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
        {
            throw 'Incomplete/duplicate actual measured case.'
        }
        $variants[$variant][$name] = $result
        $raw.Add([pscustomobject]@{
            variant = $variant; case = $name; full_name = $result.FullName
            mean_ns = $result.Statistics.Mean; standard_deviation_ns = $result.Statistics.StandardDeviation
            bytes_per_operation = $result.Memory.BytesAllocatedPerOperation; measured_iterations = $result.Statistics.N
            coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
        })
    }
    if ((($variants[$variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
    {
        throw 'Complete fixed corpus missing.'
    }
    $receipts = @(Get-Content (Join-Path $run "$label\console.log") |
        Where-Object { $_.StartsWith('AUTOPERF_CONTRACT ') } |
        ForEach-Object { $_.Substring('AUTOPERF_CONTRACT '.Length) | ConvertFrom-Json })
    if ((($receipts.Case | Sort-Object) -join '|') -cne ($names -join '|'))
    {
        throw 'Missing/duplicate actual complete original contracts.'
    }
    foreach ($receipt in $receipts)
    {
        $expected = @($oracles | Where-Object Case -ceq $receipt.Case)
        if ($expected.Count -ne 1 -or
            ($receipt | ConvertTo-Json -Depth 12 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 12 -Compress))
        {
            throw 'Actual public protocol/validator/deep-copy/read-only/exact error contract differs.'
        }
        $contracts.Add([pscustomobject]@{ label = $label; actual_repeated_workloads_checked = 2; verified_original_contract = $receipt })
    }
}
$pairs = foreach ($name in $names)
{
    $before = $variants.before[$name]
    $after = $variants.after[$name]
    $oracle = @($oracles | Where-Object Case -ceq $name)[0]
    [pscustomobject][ordered]@{
        case = $name; scope = $oracle.Scope; actual_public_producer = $name.StartsWith('Live_')
        comparisons = 1; after_snapshot = 'after'; verified_original_contract = $true
        time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
        before_ns = $before.Statistics.Mean; after_ns = $after.Statistics.Mean
        before_bytes = $before.Memory.BytesAllocatedPerOperation; after_bytes = $after.Memory.BytesAllocatedPerOperation
        allocation_change_bytes = $after.Memory.BytesAllocatedPerOperation - $before.Memory.BytesAllocatedPerOperation
        maximum_cv_percent = [Math]::Max(100 * $before.Statistics.StandardDeviation / $before.Statistics.Mean,
            100 * $after.Statistics.StandardDeviation / $after.Statistics.Mean)
    }
}
$raw.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$contracts.ToArray() | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$pairs | Select-Object case, time_change_percent, before_bytes, after_bytes, maximum_cv_percent | Format-Table -AutoSize
Write-Output "One pair;$($raw.Count) outcomes;$($pairs.Count) ratios;$($contracts.Count) complete original contracts;$($contracts.Count * 2) actual repeated workloads."
