param([ValidateRange(1,3)][int]$Comparison=1,
    [Parameter(Mandatory)][ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant,[switch]$Reverse)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$destination=Join-Path $run "measurements\comparison$Comparison\$Variant"
if (Test-Path $destination) {throw 'Never rerun or overwrite an actual F113 profile attempt.'}
node (Join-Path $PSScriptRoot 'F113-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) {throw 'Frozen complete execution image differs before profiling.'}
$manifest=Get-Content (Join-Path $run "$Variant-manifest.json") -Raw|ConvertFrom-Json
$states=Join-Path $run "characterization\$Variant-settings\states"
$probe=Get-Content (Join-Path $states 'runtime.json') -Raw|ConvertFrom-Json
$contracts=@(Get-ChildItem $states -Filter 'contract-*.json' -File)
$fixture=Get-Content (Join-Path $run 'fixture\manifest.json') -Raw|ConvertFrom-Json
if ($contracts.Count -ne 28 -or $fixture.actualCases -ne 28 -or $probe.harness.sha256 -cne $manifest.harnessSha256 -or
    $probe.owner.sha256 -cne $manifest.ownerSha256 -or $probe.cache.sha256 -cne $manifest.cacheSha256) {throw 'All28 contracts must pass for the exact measured owner/harness/cache.'}
foreach ($file in $contracts)
{
    $contract=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $input=@($fixture.files|Where-Object Label -CEQ $contract.Label)
    if ($input.Count -ne 1 -or $contract.inputSha256 -cne $input[0].inputSha256 -or $contract.outputSha256 -cne $input[0].outputSha256 -or
        -not $contract.exactNativePrefixKeyPayload -or -not $contract.independentlyOwnedAcrossInputMutation -or
        -not $contract.realRegisteredPipelineStoreAndNextHitVerified -or -not $contract.actualPreparedTimedModeVerified -or
        -not $contract.preparedOperationsSynchronouslyComplete) {throw 'Exact producer/input/ownership/output/storage contract differs.'}
}
$resource=Get-Content (Join-Path $run "resource-check-$Variant-settings.json") -Raw|ConvertFrom-Json
if (($Variant -ceq 'original' -and ($resource.passed -ne 0 -or $resource.failed -ne 7)) -or
    ($Variant -cne 'original' -and ($resource.passed -ne 7 -or $resource.failed -ne 0))) {throw 'Actual exact original-red/selected-green resource gates required.'}
$budgetPath=Join-Path $run 'measurement-budget.json'
if (Test-Path $budgetPath) {$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json}
else
{
    $budget=[pscustomobject][ordered]@{
        candidate='F113';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
        originalProfilesStarted=0;originalProfilesCompleted=0;candidateProfilesStarted=0;candidateProfilesCompleted=0
        completedProfiles=@();closed=$false
        note='Each source comparison is a sequential28-case original/candidate pair,identical frozen settings-preserving emitted harness/runtime/config/fixtures. All separately retained calipers/bootstrap attempts are not BDN timing sweeps.'
    }
}
if ($budget.closed -or $budget.maximumSourceComparisons -ne 3) {throw 'Fixed budget closed or differs.'}
$firstHalf=if ($Reverse) {$Variant -cne 'original'} else {$Variant -ceq 'original'}
if ($firstHalf)
{
    if ($budget.startedSourceComparisons -ne ($Comparison-1) -or $budget.completedSourceComparisons -ne ($Comparison-1)) {throw 'Only next sequential comparison may start.'}
    $budget.startedSourceComparisons++
}
elseif ($budget.startedSourceComparisons -ne $Comparison -or $budget.completedSourceComparisons -ne ($Comparison-1) -or
    @($budget.completedProfiles|Where-Object {$_.comparison -eq $Comparison -and (($_.variant -ceq 'original') -ne ($Variant -ceq 'original'))}).Count -ne 1) {throw 'One completed opposite half required.'}
if ($Variant -ceq 'original') {$budget.originalProfilesStarted++} else {$budget.candidateProfilesStarted++}
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$beforePower=@(powercfg /GETACTIVESCHEME)
if ($LASTEXITCODE) {throw 'Read-only existing power scheme observation failed.'}
$arguments=@((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--filter','*DistributedEncodingBenchmark*',
    '--exporters','json','csv','--artifacts',$destination,'--warmupCount','3','--iterationCount','8','--iterationTime','100',
    '--outliers','DontRemove','--fixture',(Join-Path $run 'fixture'),'--variant',$Variant)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log');$code=$LASTEXITCODE
$afterPower=@(powercfg /GETACTIVESCHEME)
if ($LASTEXITCODE) {throw 'Read-only final power scheme observation failed.'}
[ordered]@{
    candidate='F113';comparison=$Comparison;variant=$Variant;arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sdk=(dotnet --version)
    expectedCases=28;expectedRetainedResultsPerCase=8;sourceComparison=$true;pairOrder=$(if ($Reverse) {'candidate-first'} else {'original-first'})
    harnessSha256=$manifest.harnessSha256;ownerSha256=$manifest.ownerSha256;cacheSha256=$manifest.cacheSha256
    toolchain='SettingsPreservingEmitToolchain;stock emitted generator/builder/RunnableProgram/engine with harness-only no-settings-mutation IExecutor;not default InProcessEmitExecutor or NoEmit.'
    beforePower=$beforePower;afterPower=$afterPower
    scope='Direct actual private encoder and actual registered public tag-helper evict-plus-miss/store/next-hit pipeline;prepared child content. No Razor/HTTP/external store/input-frequency/application-wide or unrepresentable-array exception-equivalence claim.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
if ($code) {throw 'Actual BDN process failed;retain failure and started budget.'}
if (($beforePower -join "`n") -cne ($afterPower -join "`n")) {throw 'Observed power scheme changed during profile;do not restore unrelated settings.'}
$reports=@(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) {throw 'Exactly one complete actual BDN JSON report required.'}
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
$setups=@(Get-ChildItem (Join-Path $destination 'states') -Filter 'setup-*.json' -File)
$runtime=Get-Content (Join-Path $destination 'states\runtime.json') -Raw|ConvertFrom-Json
if ($report.Benchmarks.Count -ne 28 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count -or $setups.Count -ne 28) {throw 'All28 outcomes/eight retained samples/full setups required.'}
foreach ($file in $setups)
{
    $setup=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $input=@($fixture.files|Where-Object Label -CEQ $setup.label)
    $before=Get-Content (Join-Path $destination "states\settings-before-$($setup.label).json") -Raw|ConvertFrom-Json
    $after=Get-Content (Join-Path $destination "states\settings-after-$($setup.label).json") -Raw|ConvertFrom-Json
    $expectedSettings=$runtime.settings|ConvertTo-Json -Compress
    if ($setup.variant -cne $Variant -or $setup.harness.sha256 -cne $manifest.harnessSha256 -or $setup.owner.sha256 -cne $manifest.ownerSha256 -or
        $input.Count -ne 1 -or $setup.contract.inputSha256 -cne $input[0].inputSha256 -or $setup.contract.outputSha256 -cne $input[0].outputSha256 -or
        -not $setup.contract.realRegisteredPipelineStoreAndNextHitVerified -or
        ($before|ConvertTo-Json -Compress) -cne $expectedSettings -or ($after|ConvertTo-Json -Compress) -cne $expectedSettings -or
        ($setup.settings|ConvertTo-Json -Compress) -cne $expectedSettings) {throw 'Actual setup/identity/producer/shared-input/settings witness differs.'}
}
$budget.completedProfiles=@($budget.completedProfiles)+[pscustomobject]@{
    comparison=$Comparison;variant=$Variant;cases=28;reportSha256=(Get-FileHash $reports[0].FullName).Hash;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
if ($Variant -ceq 'original') {$budget.originalProfilesCompleted++} else {$budget.candidateProfilesCompleted++}
if (-not $firstHalf) {$budget.completedSourceComparisons++}
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F113-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) {throw 'Frozen execution image changed during actual profile.'}
Get-Content (Join-Path $destination 'console.log') -Tail 36
Write-Output "F113 comparison$Comparison/$Variant all28actual outcomes/eight retained/full input-owner-settings witnesses verified."
