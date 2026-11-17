param([Parameter(Mandatory)][ValidateRange(1,3)][int]$Comparison)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F005'
$destination = Join-Path $run "measurements\comparison-$Comparison"
$budgetFile = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetFile -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne ($Comparison - 1) -or $Comparison -gt $budget.maximumComparisons) { throw 'Closed/exhausted/nonsequential comparison budget.' }
if (Test-Path $destination) { throw 'Refusing to overwrite an actual measured comparison.' }
$required = @('original','candidate-1','current-default-class')
if ($Comparison -gt 1) { $required += @('original-small-controls','candidate-1-small-controls') }
foreach ($variant in $required)
{
    $ready = Get-Content (Join-Path $run "ready-$variant.json") -Raw | ConvertFrom-Json
    if ($ready.actualExitCode -ne 0 -or $ready.actualCompilerChecks -ne 112) { throw 'Required real producer/diagnostic preconditions did not pass.' }
}
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $budgetFile (Join-Path $destination 'budget-before.json')
$budget.usedComparisons = $Comparison
$budget.sourceShapesMeasured = 2
$budget | ConvertTo-Json -Depth 5 | Set-Content $budgetFile
$order = if ($Comparison -eq 2) { @('candidate-1','original') } else { @('original','candidate-1') }
$commands = @()
foreach ($variant in $order)
{
    $imageVariant = if ($Comparison -eq 1) { $variant } else { "$variant-small-controls" }
    $reports = if ($Comparison -eq 1) { 14 } else { 18 }
    $image = Join-Path $run "binaries\$imageVariant"
    $sources = Join-Path $run "frozen-source\$imageVariant"
    $artifacts = Join-Path $destination $variant
    New-Item $artifacts -ItemType Directory -Force | Out-Null
    $manifestPath = Join-Path $run "manifest-$imageVariant.json"
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    foreach ($file in $manifest.files)
    {
        $path = Join-Path $image $file.relativePath
        if ((Get-FileHash $path).Hash -cne $file.sha256 -or (Get-Item $path).Length -ne $file.bytes) { throw 'Actual frozen image changed before timing.' }
    }
    if ($variant -eq 'original') { $budget.originalProfiles++ } else { $budget.candidateProfiles++ }
    $budget | ConvertTo-Json -Depth 5 | Set-Content $budgetFile
    $a = @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--artifacts',$artifacts,'--sources',$sources,'--context',$imageVariant,'--filter','*')
    $started = [DateTime]::UtcNow.ToString('o')
    & dotnet @a *> (Join-Path $artifacts 'console.log')
    $code = $LASTEXITCODE
    $commands += [ordered]@{variant=$variant;imageVariant=$imageVariant;actualExpectedReports=$reports;entryPoint='dotnet';arguments=$a;actualExitCode=$code;startedUtc=$started;completedUtc=[DateTime]::UtcNow.ToString('o');
        manifestSha256=(Get-FileHash $manifestPath).Hash;actualPreImageHashesVerified=$manifest.files.Count}
    [ordered]@{candidate='F005';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'} |
        ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'execution.json')
    if ($code -ne 0)
    {
        Get-Content (Join-Path $artifacts 'console.log') -Tail 65
        throw "Actual $variant profile failed;comparison budget remains spent."
    }
    foreach ($file in $manifest.files)
    {
        $path = Join-Path $image $file.relativePath
        if ((Get-FileHash $path).Hash -cne $file.sha256 -or (Get-Item $path).Length -ne $file.bytes) { throw 'Actual frozen image changed during timing.' }
    }
    $commands[-1].actualPostImageHashesVerified = $manifest.files.Count
    [ordered]@{candidate='F005';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'} |
        ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'execution.json')
    Write-Output "F005 comparison$Comparison $variant`:actual$reports-case full-owner profile completed,$($manifest.files.Count) image hashes checked before/after."
}
Copy-Item $budgetFile (Join-Path $destination 'budget-after.json')
Write-Output "F005 comparison$Comparison completed;used$($budget.usedComparisons)/3 paired comparisons."
