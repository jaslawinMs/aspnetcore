$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$out=Join-Path $run 'analysis-tools\binlog-reader-execution'
if(Test-Path $out){throw 'Preserve actual read-only package-validation proof attempt.'}
New-Item $out -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $out 'executed-source.ps1')
$directory=Join-Path $run 'analysis-tools\binlog-reader'
Copy-Item (Join-Path $directory 'Program.cs') (Join-Path $out 'Program.cs')
Copy-Item (Join-Path $directory 'AutoPerf.BinlogReader.csproj') (Join-Path $out 'AutoPerf.BinlogReader.csproj')
$commands=[System.Collections.Generic.List[object]]::new()
function InvokeDotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $out "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F010';activation='. .\activate.ps1';readOnlyBinlogProofNotTiming=$true;commands=$commands}|
        ConvertTo-Json -Depth 9|Set-Content (Join-Path $out 'execution.json')
    Get-Content (Join-Path $out "$Label.log") -Tail 10
    if($code){throw "Read-only package proof$Label failed;retain actual attempt,no timing repeated."}
}
$project=Join-Path $directory 'AutoPerf.BinlogReader.csproj'
InvokeDotnet 'restore-new-sdk-reference-manifest' @('restore',$project,'--configfile','C:\src\aspnetcore\NuGet.config','-m:2','-v:q')
InvokeDotnet 'compile-reader' @('build',$project,'--no-restore','-c','Release','-m:2','-v:q')
InvokeDotnet 'read-actual-pack-binlog' @((Join-Path $directory 'bin\Release\net12.0\AutoPerf.BinlogReader.dll'),
    (Join-Path $run 'builds\candidate\pack-with-existing-package-validation.binlog'),(Join-Path $run 'package-validation-proof.json'))
$proof=Get-Content (Join-Path $run 'package-validation-proof.json') -Raw|ConvertFrom-Json
if(-not$proof.proofPassed){throw 'Actual successful native package-validation task events required.'}
Write-Output 'F010 native pack task execution verified from actual binary events;no source/experiment rerun or existing package-baseline-default override.'
