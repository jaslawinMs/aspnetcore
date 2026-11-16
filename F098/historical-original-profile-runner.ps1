$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F098'
$destination = Join-Path $run 'original-sweep'
if (Test-Path -LiteralPath $destination) { throw 'Actual original sweep exists; do not overwrite or duplicate.' }
if (@(git -C $repo status --porcelain --untracked-files=no).Count) { throw 'Unexpected shipping source changes.' }
node (Join-Path $PSScriptRoot 'F098-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Frozen original closure changed before original-only sweep.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$budget = [ordered]@{candidate='F098';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0;
    originalSweepsStarted=1;originalSweepsCompleted=0;closed=$true;
    note='Generic unconditional removal/reset/reuse failed the public token-lifetime gate. One original9-case sweep quantifies finite/infinity/None pressure, not an equivalent before/after speedup. No shipping candidate or source comparison.'}
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
$a = @((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--filter','*TimeoutBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
$execution = [ordered]@{candidate='F098';label='original-sweep';variant='original';sourceComparison=$false;
    arguments=$a;started_at=$started;completed_at=[DateTimeOffset]::UtcNow.ToString('o');exit_code=$code;
    sdk=(dotnet --version);expectedCases=9;scope='Actual baseline source, three distinct timeout policies and three real reply shapes; no equivalent-contract performance change'}
@($execution) | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'execution.json')
if ($code) { throw 'Actual original-only BDN sweep failed; preserve failure and budget.' }
$budget.originalSweepsCompleted=1
$budget | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'measurement-budget.json')
node (Join-Path $PSScriptRoot 'F098-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Original closure changed during actual sweep.' }
Write-Output 'F098:one actual original9-case sweep complete;0 source comparisons, generic contract gate rejected, source unchanged.'
