$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$directory=Join-Path $run 'bcl-compatibility'
if (Test-Path $directory) { throw 'Retain the actual BCL probe;do not overwrite.' }
New-Item -ItemType Directory -Path $directory|Out-Null
$project=Join-Path $run 'tools\Base64Compatibility\Base64Compatibility.csproj'
$sdk=dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
function Invoke-Recorded([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    [ordered]@{
        candidate='F109';arguments=$Arguments;exitCode=$code;sdk=$sdk
        startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
        newStandaloneManifestPermitsInitialRestore=$true;sourceComparisons=0
    }|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory "$Label-command.json") -Encoding utf8
    Get-Content (Join-Path $directory "$Label.log") -Tail 18
    if ($code) { throw "Actual F109 BCL$Label failed exit$code;retain the exact attempt." }
}
Invoke-Recorded 'build' @('build',$project,'-c','Release','-m:2','-v:minimal')
Invoke-Recorded 'probe' @((Join-Path $run 'tools\Base64Compatibility\bin\Release\net12.0\Base64Compatibility.dll'),
    (Join-Path $directory 'actual-decoder-equivalence.json'))
Get-Content (Join-Path $directory 'actual-decoder-equivalence.json') -Raw
