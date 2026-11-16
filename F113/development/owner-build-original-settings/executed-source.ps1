param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Label)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$directory=Join-Path $run "development\owner-build-$Label"
if (Test-Path $directory) {throw 'Never replace a source/image build attempt.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item 'src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperService.cs' (Join-Path $directory 'DistributedCacheTagHelperService.cs')
$arguments=@('build','src\Mvc\Mvc.TagHelpers\src\Microsoft.AspNetCore.Mvc.TagHelpers.csproj','-c','Release',
    '--no-restore','-m:2','-p:BuildProjectReferences=false','-p:UseIisNativeAssets=false','-v:quiet')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F113';label=$Label;arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 10
if ($code) {throw 'Actual owner build failed;retain this attempt.'}
