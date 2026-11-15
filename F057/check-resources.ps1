param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F057' }
$before = @(Get-Content (Join-Path $run 'resource-before.json') -Raw | ConvertFrom-Json)
$after = @(Get-Content (Join-Path $run 'resource-after.json') -Raw | ConvertFrom-Json)
if ($before.Count -ne 26 -or $after.Count -ne 26 -or
    (($before.Case | Sort-Object) -join '|') -cne (($after.Case | Sort-Object) -join '|'))
{
    throw 'Actual original/prototype resource corpus differs.'
}
$expected = @{
    Helper_Int_Equal = @(72, 24); Helper_Int_Different = @(72, 24); Helper_Long_Equal = @(72, 24)
    Helper_Bool_Equal = @(72, 24); Helper_Guid_Equal = @(96, 32); Helper_DateOnly_Equal = @(72, 24)
    Helper_TimeOnly_Equal = @(72, 24); Helper_Enum_Equal = @(96, 48); Helper_WideStruct_Equal = @(288, 0)
    Helper_Int_Object_Equal = @(24, 0); Helper_NullableInt_EqualZero = @(72, 72)
}
$verified = foreach ($original in $before)
{
    $final = @($after | Where-Object Case -ceq $original.Case)
    if ($final.Count -ne 1)
    {
        throw 'Duplicate/missing resource case.'
    }
    $required = if ($expected.ContainsKey($original.Case)) { $expected[$original.Case] } else { @(0, 0) }
    foreach ($entry in @(@{ row = $original; expected = $required[0] }, @{ row = $final[0]; expected = $required[1] }))
    {
        if ($entry.row.OperationsPerSample -ne 100000 -or $entry.row.AllocatedBytes.Count -ne 3)
        {
            throw 'Incomplete full-method resource observations.'
        }
        foreach ($bytes in $entry.row.AllocatedBytes)
        {
            if ([Math]::Abs($bytes / 100000.0 - $entry.expected) -gt 0.02)
            {
                throw 'Actual resource effect differs;do not attribute a different tier or allocation to this probe.'
            }
        }
    }
    [pscustomobject]@{
        case = $original.Case; original_bytes_per_operation = @($original.AllocatedBytes | ForEach-Object { $_ / 100000.0 })
        prototype_bytes_per_operation = @($final[0].AllocatedBytes | ForEach-Object { $_ / 100000.0 })
        expected_original_bytes = $required[0]; expected_prototype_bytes = $required[1]
        boundary = 'Actual full method in separately recorded Tier0 probe,not BenchmarkDotNet timing or other tiers'
    }
}
$verified | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'resource-correctness.json') -Encoding utf8
Write-Output 'All26 cases/all156 original-prototype resource samples match expected Tier0 effects and nullable/reference/frame controls.'
