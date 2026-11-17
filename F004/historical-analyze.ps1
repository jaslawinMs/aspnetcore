param([int]$Attempt=1)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F004'
$prefix=Join-Path $run "development\analysis-attempt$Attempt"
if(Test-Path "$prefix-execution.json"){throw 'Do not overwrite an actual independent analysis attempt.'}
New-Item (Split-Path $prefix -Parent) -ItemType Directory -Force|Out-Null
$source=Join-Path $PSScriptRoot 'F004-reproduce-analysis.mjs'
Copy-Item $source "$prefix-source.mjs"
$a=@($source)
node @a *> "$prefix-console.log"
$code=$LASTEXITCODE
[ordered]@{candidate='F004';entryPoint='node';arguments=$a;actualExitCode=$code;sourceSha256=(Get-FileHash $source).Hash;attempt=$Attempt;livePhysicalImagesRehashed=($code-eq0)}|
    ConvertTo-Json -Depth 6|Set-Content "$prefix-execution.json"
Get-Content "$prefix-console.log" -Tail 35
if($code){throw "Independent live analysis failed with exit$code."}
