$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$root=Join-Path $run 'analysis-attempts\independent-audit'
$number=if(Test-Path $root){@(Get-ChildItem $root -Directory).Count+1}else{1}
$out=Join-Path $root ('attempt-'+$number.ToString('000'))
if(Test-Path $out){throw 'Preserve every actual read-only audit attempt.'}
New-Item $out -ItemType Directory -Force|Out-Null
$source=Join-Path $PSScriptRoot 'F010-reproduce-analysis.mjs'
Copy-Item $source (Join-Path $out 'executed-source.mjs')
Copy-Item $PSCommandPath (Join-Path $out 'driver.ps1')
$start=[DateTimeOffset]::UtcNow.ToString('o')
& node $source *> (Join-Path $out 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F010';phase='independent live source/runtime/TRX/raw-math/binlog-witness audit,not a timing rerun';
    entryPoint='node';arguments=@($source);actualExitCode=$code;sourceSha256=(Get-FileHash $source).Hash;
    startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o');rawOrExperimentChanged=$false;timingRepeated=$false;budgetReset=$false}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $out 'execution.json')
Get-Content (Join-Path $out 'console.log') -Tail 35
if($code){throw "Independent analysis failed,actual attempt$number retained."}
