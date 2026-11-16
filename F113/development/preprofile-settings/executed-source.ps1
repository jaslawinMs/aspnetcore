$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
if (Test-Path (Join-Path $run 'measurement-budget.json')) {throw 'Amend execution policy only before any timing comparison.'}
$destination=Join-Path $run 'development\preprofile-settings'
if (Test-Path $destination) {throw 'Never replace archived preprofile execution evidence.'}
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$names=@('binaries','frozen-source','original-manifest.json','candidate1-manifest.json',
    'execution-closure-original.json','execution-closure-candidate1.json','fixture','characterization',
    'resource-check-original.json','resource-check-candidate1.json')
$moved=@(foreach ($name in $names)
{
    $from=Join-Path $run $name
    if (-not (Test-Path $from)) {throw "Required preprofile artifact missing:$name"}
    Move-Item $from (Join-Path $destination $name)
    [ordered]@{original=$name;archived="development\preprofile-settings\$name"}
})
[ordered]@{
    candidate='F113';definedAt=[DateTimeOffset]::UtcNow.ToString('o');timingComparisonsStarted=0
    originalAcceptanceRequirementsRemainInForce=$true;allocationGoalsUnchanged=$true;workloadAndCaseDefinitionsUnchanged=$true
    originalResourceGoalSha256=(Get-FileHash (Join-Path $run 'resource-goals.json')).Hash
    reason='Upstream BDN0.13.0 default InProcessEmitExecutor attempts High process/Highest thread priority. No F113 timing used it. Preserve all earlier fixture/caliper evidence/images;use identical rebuilt harness with public BDN emitted generator/builder/RunnableProgram and a minimal IExecutor that omits settings mutations.'
    policy='Keep existing process/thread priority and affinity;Guid.Empty power-plan configuration avoids BDN power-plan application. Record startup/setup/before/after settings. No standard --inProcess/--job override;retain ShortRun3warmups/8retained/100ms/DontRemove.'
    toolchain='SettingsPreservingEmitToolchain;actual pinned BDN InProcessEmitGenerator/InProcessEmitBuilder/RunnableProgram/engine,not the default executor and not NoEmit.'
    defaultExecutorSource='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Toolchains/InProcess.Emit/InProcessEmitExecutor.cs'
    publicRunnerSource='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Toolchains/InProcess.Emit.Implementation/Runnable/RunnableProgram.cs'
    powerSource='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Running/PowerManagementApplier.cs'
    limitation='Historical stock-executor priority changes cannot be ruled out from absent console messages;do not claim those past benchmark processes were verified normal-priority. No historical timing is rerun or relabeled here.'
    archived=$moved
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'shared-settings-amendment.json') -Encoding utf8
