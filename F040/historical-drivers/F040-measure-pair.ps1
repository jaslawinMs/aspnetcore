param(
    [Parameter(Mandatory)]
    [ValidateRange(1, 3)]
    [int]$Round
)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F040'
$budgetFile = Join-Path $run 'source-comparison-budget.json'
$budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
$plan = Get-Content -Raw -LiteralPath (Join-Path $run 'acceptance-plan.json') | ConvertFrom-Json
$sealFile = Join-Path $run 'measurement-seal.json'
if ($budget.closed -or $budget.maximumPairs -ne 3 -or $Round -ne @($budget.attempts).Count + 1 -or
    @($budget.attempts).Count -ge 3 -or
    $budget.measurementSealSha256 -cne (Get-FileHash -LiteralPath $sealFile -Algorithm SHA256).Hash -or
    @($budget.attempts | Where-Object { $_.status -notin @('completed', 'failed') }).Count -ne 0)
{
    throw 'Do not exceed, reuse or overlap the three-attempt source-comparison budget.'
}
$attempt = [pscustomobject]@{
    round=$Round;status='started';startedUtc=[DateTime]::UtcNow.ToString('O');finishedUtc=$null
    order=@($plan.sourceComparisons.order[$Round - 1]);members=@()
}
$budget.attempts = @($budget.attempts) + @($attempt)
$budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
foreach ($variant in $attempt.order)
{
    & (Join-Path $PSHOME 'pwsh.exe') -NoLogo -NoProfile -File (Join-Path $PSScriptRoot 'F040-native.ps1') `
        -Mode measure -Variant $variant -Round $Round
    $nativeWrapperExit = $LASTEXITCODE
    if ($nativeWrapperExit -ne 0)
    {
        $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
        $failed = @($budget.attempts)[-1]
        $failed.status = 'failed'
        $failed.finishedUtc = [DateTime]::UtcNow.ToString('O')
        $budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
        throw "Source comparison $Round/$variant failed: $nativeWrapperExit; the partial attempt remains consumed."
    }
}
$budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
$completed = @($budget.attempts)[-1]
if ($completed.status -ne 'completed' -or @($completed.members).Count -ne 2 -or
    @($completed.members | Where-Object { $_.exitCode -ne 0 -or $_.status -ne 'completed' }).Count -ne 0)
{
    throw 'Both actually started native source members must finish successfully.'
}
$completed.finishedUtc = [DateTime]::UtcNow.ToString('O')
$budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
Write-Output "F040: source comparison $Round completed in the declared order; $(@($budget.attempts).Count) of 3 attempts consumed."
