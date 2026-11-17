$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$destination=Join-Path $run 'measurements\original-diagnostic-only'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons-ne0 -or $budget.originalProfiles-ne0 -or
    $budget.candidateProfiles-ne0 -or $budget.originalOnlyDiagnosticProfiles-ne0 -or
    $budget.maximumOriginalOnlyDiagnosticProfiles-ne1 -or (Test-Path $destination)){throw 'Only one fresh original-only diagnostic profile authorized.'}
$manifest=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
$states=Join-Path $run 'characterization\original\states'
$completion=@(Get-ChildItem $states -Filter '*-characterization-completed.json')
if($completion.Count-ne1){throw 'Actual successful final characterization required.'}
$ready=Get-Content $completion[0].FullName -Raw|ConvertFrom-Json
if(-not$ready.passed -or $ready.actualChecks-ne36 -or $ready.actualTimedSetupsPreflighted-ne8 -or
    @(Get-ChildItem $states -Filter '*-validated.json').Count-ne44 -or
    @(Get-ChildItem $states -Filter '*-producer.json').Count-ne36 -or
    @(Get-ChildItem $states -Filter '*-name-reads.json').Count-ne6){throw 'Exact real owner/producer/control/setup preflights required.'}
$audit=Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw|ConvertFrom-Json
if($audit.passed-ne40 -or $audit.failed-ne0 -or $audit.skipped-ne0 -or
    @($audit.rows|Where-Object class -Like 'AlwaysTestTests.*').Count-ne2){throw 'Expected38 area+2 repository sentinel rows,all passed.'}
function AssertOriginal
{
    if((git rev-parse HEAD).Trim()-cne$investigation.baseline -or
        (git branch --show-current).Trim()-cne$investigation.branch -or
        @(git diff --name-only).Count -or @(git diff --cached --name-only).Count){throw 'Only unchanged independent original allowed.'}
    foreach($source in $investigation.sources)
    {
        if((Get-FileHash $source.file).Hash-cne$source.workingSha256){throw 'Actual selected working source changed.'}
    }
    foreach($group in @(@{root='images\original';rows=$manifest.files},@{root='sources\original';rows=$manifest.sources}))
    {
        foreach($file in $group.rows)
        {
            $path=Join-Path $run "$($group.root)\$($file.path)"
            if((Get-FileHash $path).Hash-cne$file.sha256 -or (Get-Item $path).Length-ne$file.bytes){throw 'Frozen original image/source changed.'}
        }
    }
    foreach($source in Get-ChildItem (Join-Path $run 'harness') -File|Where-Object {$_.Extension-in'.cs','.csproj'})
    {
        if((Get-FileHash $source.FullName).Hash-cne(Get-FileHash (Join-Path $run "sources\original\harness\$($source.Name)")).Hash)
        {throw 'Actual final harness changed after untimed setup validation.'}
    }
}
AssertOriginal
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $budgetPath (Join-Path $destination 'budget-before.json')
& dotnet --info *> (Join-Path $destination 'dotnet-info.log')
if($LASTEXITCODE){throw 'Actual pinned SDK/host context required before timing.'}
$cpu=Get-CimInstance Win32_Processor|Select-Object Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors
$os=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,BuildNumber,OSArchitecture,TotalVisibleMemorySize
[ordered]@{candidate='F008';capturedUtc=[DateTimeOffset]::UtcNow.ToString('o');cpu=$cpu;os=$os;sharedMachine=$true;machineIsolationClaimed=$false;
    noDeliberatePowerPriorityAffinityChanges=$true;maximumBuildNodes=2;onlyOriginalProfile=$true}|ConvertTo-Json -Depth 7|
    Set-Content (Join-Path $destination 'host-context.json')
$budget.originalOnlyDiagnosticProfiles=1
$budget.originalProfiles=1
$budget.reason='One original-only diagnostic attempt spent before launch;no candidate or paired comparison. All8 actual Setup/task-wrapper paths preflighted.'
$budget|ConvertTo-Json -Depth 6|Set-Content $budgetPath
$arguments=@((Join-Path $run 'images\original\AutoPerf.Benchmarks.dll'),'--sources',(Join-Path $run 'sources\original'),
    '--context','original-diagnostic-only','--filter','*','--artifacts',$destination)
$start=[DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
$command=[ordered]@{candidate='F008';variant='original';entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedUtc=$start;
    completedUtc=[DateTimeOffset]::UtcNow.ToString('o');activation='. .\activate.ps1';
    manifestSha256=(Get-FileHash (Join-Path $run 'manifest-original.json')).Hash;preImageHashesVerified=$manifest.files.Count;
    preSourceHashesVerified=$manifest.sources.Count;originalOnlyDiagnosticProfile=$true;pairedComparisons=0;candidateProfiles=0}
$command|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'execution.json')
if($code)
{
    Get-Content (Join-Path $destination 'console.log') -Tail 65
    throw 'Original diagnostic failed;attempt remains spent,do not silently rerun.'
}
AssertOriginal
$command.postImageHashesVerified=$manifest.files.Count
$command.postSourceHashesVerified=$manifest.sources.Count
$command|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'execution.json')
$budget.closed=$true
$budget.reason='Exactly one original-only8-case profile completed;no compatible source candidate selected,no before-after comparison or improvement percentage. No more F008 timing authorized.'
$budget|ConvertTo-Json -Depth 6|Set-Content $budgetPath
Copy-Item $budgetPath (Join-Path $destination 'budget-after.json')
Get-Content (Join-Path $destination 'console.log') -Tail 32
Write-Output "F008 original-only diagnostic completed;0 paired comparisons/0 candidate profiles;$($manifest.files.Count) image/$($manifest.sources.Count) source identities verified before/after."
