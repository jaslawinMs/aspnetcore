$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$ready=Get-Content (Join-Path $run 'original-ready.json') -Raw|ConvertFrom-Json
$budgetFile=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
$directory=Join-Path $run 'measurements\original-diagnostic-only'
$states=Join-Path $directory 'states'
if((Test-Path $directory) -or $budget.closed -or $budget.originalDiagnosticProfiles -ne 0 -or $budget.usedComparisons -ne 0 -or
    $budget.candidateProfiles -ne 0 -or $ready.compatibleOptimizationEstablished -or -not $ready.namedNativeAssertionReached -or
    (git branch --show-current).Trim() -cne 'autoperf/F002-webtransport-stream-removal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Exactly1 original-only diagnostic profile from clean independent source permitted.'}
$manifest=Get-Content (Join-Path $run $ready.manifest) -Raw|ConvertFrom-Json
foreach($entry in $manifest.files)
{
    $file=Join-Path $ready.image $entry.file
    if((Get-Item $file).Length -ne $entry.bytes -or (Get-FileHash $file).Hash -cne $entry.sha256){throw 'Frozen original image changed.'}
}
foreach($entry in Get-ChildItem (Join-Path $run 'harness') -File)
{
    if((Get-FileHash $entry.FullName).Hash -cne (Get-FileHash (Join-Path $ready.source $entry.Name)).Hash){throw 'Frozen original harness changed.'}
}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item $budgetFile (Join-Path $run 'measurement-budget-before-profile.json')
$budget.originalDiagnosticProfiles=1
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetFile -Encoding utf8
[ordered]@{
    candidate='F002';observedAt=[DateTimeOffset]::UtcNow.ToString('o')
    os=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,TotalVisibleMemorySize
    cpu=Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors
    sharedEnvironment=$true;continuousIsolationOrSettingsTraceClaimed=$false
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'machine-observation.json') -Encoding utf8
$arguments=@((Join-Path $ready.image 'AutoPerf.Benchmarks.dll'),'--benchmark',$states)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{
    candidate='F002';entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    originalOnly=$true;sourceChanged=$false;sourceComparisons=0;candidateProfiles=0
    note='One original-only4-case Monitoring diagnostic with1 invocation/iteration;not a before/after comparison,reliable general latency estimate or proof of the separately exercised native callback schedule. All samples retained.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 55
if($code){throw 'Actual original-only diagnostic failed;preserve this profile without silent reruns.'}
Write-Output 'F002:one original-only4-case diagnostic completed;zero changed-source profiles or before/after comparisons.'
