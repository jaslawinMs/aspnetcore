$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F102'
$destination = Join-Path $run 'original-sweep'
if (Test-Path -LiteralPath $destination) { throw 'Actual original F102 sweep exists;do not overwrite or duplicate.' }
if (@(git -C $repo status --porcelain --untracked-files=no).Count) { throw 'Unexpected shipping source changes.' }
$gate = Get-Content (Join-Path $run 'contract-gate.json') -Raw | ConvertFrom-Json
if ($gate.disposition -cne 'rejected' -or $gate.compiledPerformanceCandidate -or $gate.startedSourceComparisons -ne 0)
{
    throw 'Only the actual rejected generic strategy/original-profile boundary is approved here.'
}
node (Join-Path $PSScriptRoot 'F102-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Frozen original closure changed before original-only sweep.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$budget = [ordered]@{candidate='F102';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0;
    originalSweepsStarted=1;originalSweepsCompleted=0;closed=$true;
    note='Generic deletion/reset-reuse rejected by actual public setter/token/zero/async-error/pre-return value-serialization ownership. Original pending deadline failure characterized,not repaired. One original9-case true-void setter sweep;finite/infinity/None are different policies,not equivalent source variants. Actual serialized value123/public null acknowledgment.'}
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
$a = @((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--filter','*TimeoutBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
$execution = [ordered]@{candidate='F102';label='original-sweep';variant='original';sourceComparison=$false;
    arguments=$a;started_at=$started;completed_at=[DateTimeOffset]::UtcNow.ToString('o');exit_code=$code;
    sdk=(dotnet --version);expectedCases=9;actualBenchmarkReturn='System.Void';
    scope='Actual baseline timed runtime setter/SetValue/JSVoidResult/root0/[123]/public null acknowledgment;three distinct policies/three reply shapes. Array-value serialization control outside measurement. No return-value731 surrogate,native property mutation,deadline repair or equivalent source optimization.'}
$execution | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'execution.json')
if ($code) { throw 'Actual original F102 BDN sweep failed;preserve failure/budget.' }
$budget.originalSweepsCompleted=1
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
node (Join-Path $PSScriptRoot 'F102-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Original closure changed during actual setter sweep.' }
Write-Output 'F102 one original9-case true-void setter sweep completed;0 source comparisons,actual generic gate rejected,original deadline failures/source preserved.'
