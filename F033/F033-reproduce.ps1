$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F033'
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if (!$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsCompleted -ne 3)
{
    throw 'Only an untimed source relocation after all three closed comparison pairs is authorized.'
}
& (Join-Path $PSScriptRoot 'F033-rebuild-owner.ps1') -Variant original -Label reproduction-original-owner-build
$original = Join-Path $run 'harness'
$relocated = Join-Path $run 'relocated-harness'
if (Test-Path -LiteralPath $relocated)
{
    throw 'Do not overwrite a relocated consumer source.'
}
New-Item -ItemType Directory -Path $relocated | Out-Null
$rows = @(foreach ($file in Get-ChildItem -LiteralPath $original -File -Force)
{
    $destination = Join-Path $relocated $file.Name
    Copy-Item -LiteralPath $file.FullName -Destination $destination
    $hash = (Get-FileHash -LiteralPath $file.FullName).Hash
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $hash)
    {
        throw 'Relocated source differs from the measured consumer source.'
    }
    [ordered]@{ original = $file.FullName; copy = $destination; sha256 = $hash }
})
if ($rows.Count -ne 6)
{
    throw 'Require the five actual harness source files and its project.'
}
[ordered]@{
    candidate = 'F033'; actualFiles = $rows.Count; actualSourcesByteExact = $true; mappings = $rows
    actualNativeTiming = $false; actualSourceComparisonSlotsAdded = 0
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'relocated-harness-copy.json') -Encoding utf8NoBOM
& (Join-Path $PSScriptRoot 'F033-prepare.ps1') -Label reproduction-preparation -Variant original -HarnessDirectory $relocated
& (Join-Path $PSScriptRoot 'F033-run-profile.ps1') -Mode characterize -Label reproduction-characterized -Preparation reproduction-preparation
& (Join-Path $PSScriptRoot 'F033-rebuild-owner.ps1') -Variant candidate -Label final-candidate-owner-build
Write-Output 'F033:byte-exact relocated source independently built and characterized without timing;candidate source/product byte-restored for pending evidence assessment.'
