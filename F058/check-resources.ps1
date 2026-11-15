param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F058' }
$before = @(Get-Content (Join-Path $run 'resource-before.json') -Raw | ConvertFrom-Json)
$after = @(Get-Content (Join-Path $run 'resource-after.json') -Raw | ConvertFrom-Json)
if ($before.Count -ne 8 -or $after.Count -ne 8 -or
    (($before.Case | Sort-Object) -join '|') -cne (($after.Case | Sort-Object) -join '|'))
{
    throw 'Complete actual resource corpus differs.'
}
$verified = foreach ($original in $before)
{
    $final = @($after | Where-Object Case -ceq $original.Case)
    if ($final.Count -ne 1)
    {
        throw 'Duplicate/missing actual resource case.'
    }
    $expected = if ($original.Case -ceq 'Live_Cache_NoCache_Add_2') { 272 } else { 0 }
    foreach ($row in @($original, $final[0]))
    {
        if ($row.OperationsPerSample -ne 100000 -or $row.AllocatedBytes.Count -ne 3 -or
            @($row.AllocatedBytes | Where-Object { $_ -ne 100000 * $expected }).Count)
        {
            throw 'Actual complete resource observations differ from recorded Tier0 no-boxing premise.'
        }
    }
    [pscustomobject]@{
        case = $original.Case; original_bytes_per_operation = @($original.AllocatedBytes | ForEach-Object { $_ / 100000.0 })
        prototype_bytes_per_operation = @($final[0].AllocatedBytes | ForEach-Object { $_ / 100000.0 })
        boundary = 'Actual complete nonthrowing workload/separate Tier0 native probe,no observed default-validator boxing'
    }
}
$verified | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'resource-correctness.json') -Encoding utf8
Write-Output 'All48 resource samples/eight original-prototype cases unchanged;seven diagnostic cases0 B/op,real custom-validator header control272 B/op.'
