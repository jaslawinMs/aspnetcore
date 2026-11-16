param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$directory=Join-Path $run "browser\$Label-server"
if (Test-Path $directory) { throw 'Preserve every F112 launch attempt.' }
if (-not (Test-Path (Join-Path $run "browser\$Label-build\built-output.json"))) { throw 'Actual completed canonical build required.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@('run','--project','src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
    '--no-build','--no-restore','-c','Release','--no-launch-profile','--','--urls','http://127.0.0.1:0')
$env:ASPNETCORE_ENVIRONMENT='Development'
$record=[ordered]@{
    candidate='F112';label=$Label;arguments=$arguments;controllerPid=$PID
    requestedLoopbackDynamicPort=$true;configuration='Release';environment='Development'
    startedAt=[DateTimeOffset]::UtcNow.ToString('o');state='starting';actualListeningUrl=$null
    completedExitCode=$null;helperMustBeStoppedBeforeReturningControl=$true
}
$record|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
dotnet @arguments *> (Join-Path $directory 'console.log')
$record.completedExitCode=$LASTEXITCODE
$record.state='exited'
$record.completedAt=[DateTimeOffset]::UtcNow.ToString('o')
$record|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 25
if ($record.completedExitCode) { throw "Actual canonical F112 server exited:$($record.completedExitCode)" }
