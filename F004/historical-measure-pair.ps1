param([Parameter(Mandatory)][ValidateRange(1,3)][int]$Comparison)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F004'
$destination = Join-Path $run "measurements\comparison-$Comparison"
$budgetFile = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetFile -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne ($Comparison - 1) -or $Comparison -gt $budget.maximumComparisons) { throw 'Closed/exhausted/nonsequential comparison budget.' }
if (Test-Path $destination) { throw 'Refusing to overwrite an actual measured comparison.' }
foreach ($variant in 'original','candidate-1','current-default-class')
{
    $ready = Get-Content (Join-Path $run "ready-$variant.json") -Raw | ConvertFrom-Json
    if ($ready.actualExitCode -ne 0 -or $ready.actualCompilerChecks -ne 72) { throw 'Required real producer/diagnostic preconditions did not pass.' }
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
    $image = Join-Path $run "binaries\$variant"
    $sources = Join-Path $run "frozen-source\$variant"
    $artifacts = Join-Path $destination $variant
    New-Item $artifacts -ItemType Directory -Force | Out-Null
    $manifestPath = Join-Path $run "manifest-$variant.json"
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    foreach ($file in $manifest.files)
    {
        $path = Join-Path $image $file.relativePath
        if ((Get-FileHash $path).Hash -cne $file.sha256 -or (Get-Item $path).Length -ne $file.bytes) { throw 'Actual frozen image changed before timing.' }
    }
    if ($variant -eq 'original') { $budget.originalProfiles++ } else { $budget.candidateProfiles++ }
    $budget | ConvertTo-Json -Depth 5 | Set-Content $budgetFile
    $a = @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--artifacts',$artifacts,'--sources',$sources,'--context',$variant,'--filter','*')
    $started = [DateTime]::UtcNow.ToString('o')
    & dotnet @a *> (Join-Path $artifacts 'console.log')
    $code = $LASTEXITCODE
    $commands += [ordered]@{variant=$variant;entryPoint='dotnet';arguments=$a;actualExitCode=$code;startedUtc=$started;completedUtc=[DateTime]::UtcNow.ToString('o');
        manifestSha256=(Get-FileHash $manifestPath).Hash;actualPreImageHashesVerified=$manifest.files.Count}
    [ordered]@{candidate='F004';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'} |
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
    [ordered]@{candidate='F004';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'} |
        ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'execution.json')
    Write-Output "F004 comparison$Comparison $variant`:actual10-case full-owner profile completed,98 image hashes checked before/after."
}
Copy-Item $budgetFile (Join-Path $destination 'budget-after.json')
Write-Output "F004 comparison$Comparison completed;used$($budget.usedComparisons)/3 paired comparisons."
