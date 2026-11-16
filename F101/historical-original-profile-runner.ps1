$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F101'
$destination = Join-Path $run 'original-sweep'
if (Test-Path -LiteralPath $destination) { throw 'Actual original F101 sweep exists;do not overwrite or duplicate.' }
if (@(git -C $repo status --porcelain --untracked-files=no).Count) { throw 'Unexpected shipping source changes.' }
node (Join-Path $PSScriptRoot 'F101-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Frozen original closure changed before original-only sweep.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$budget = [ordered]@{candidate='F101';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0;
    originalSweepsStarted=1;originalSweepsCompleted=0;closed=$true;
    note='Generic removal/reset-reuse failed public property/token/zero/error/pre-return-host transport ownership gate. Original pending deadline failure characterized,not repaired. One original9-case actual-int-property-returning sweep;distinct finite/infinity/None policies,not equivalent source variants. Get has no arguments/value serialization.'}
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
$a = @((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--filter','*TimeoutBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
$execution = [ordered]@{candidate='F101';label='original-sweep';variant='original';sourceComparison=$false;
    arguments=$a;started_at=$started;completed_at=[DateTimeOffset]::UtcNow.ToString('o');exit_code=$code;
    sdk=(dotnet --version);expectedCases=9;actualBenchmarkReturn='System.Int32';
    scope='Actual baseline timed runtime property GetValue/Default/root0/[] public int731 reply;three distinct timeout policies/three reply shapes. Reference-valued Get/target47 controls outside measurement. No property input serialization,deadline repair or equivalent-contract source optimization.'}
$execution | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'execution.json')
if ($code) { throw 'Actual original F101 BDN sweep failed;preserve failure and budget.' }
$budget.originalSweepsCompleted=1
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
node (Join-Path $PSScriptRoot 'F101-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Original closure changed during actual property sweep.' }
Write-Output 'F101:one original9-case actual int-property-returning sweep complete;0 source comparisons,generic gate rejected,original deadline failures preserved/source unchanged.'
