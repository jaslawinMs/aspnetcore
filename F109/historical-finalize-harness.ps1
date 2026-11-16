$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
if (Test-Path (Join-Path $run 'format-commands.json')) { throw 'Retain completed formatting outcomes.' }
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Formatting([string]$Label,[string]$Project,[string[]]$Include,[bool]$Verify)
{
    $arguments=@('format','whitespace',$Project,'--no-restore','--include')+$Include
    if ($Verify) { $arguments+='--verify-no-changes' }
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @arguments *> (Join-Path $run "format-$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    $commands|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'format-commands.json') -Encoding utf8

    return $code
}
$harness=Join-Path $run 'harness'
$include=@(Get-ChildItem $harness -Filter '*.cs' -File|Sort-Object Name|ForEach-Object FullName)
if ($include.Count -ne 5) { throw 'Exactly five authored benchmark C# files are required.' }
foreach ($scope in @(
    [pscustomobject]@{label='harness';project=(Join-Path $harness 'AutoPerf.Benchmarks.csproj');include=$include},
    [pscustomobject]@{label='test';project='C:\src\aspnetcore\src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj';
        include=@('C:\src\aspnetcore\src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs')}
))
{
    $code=Invoke-Formatting "$($scope.label)-initial-check" $scope.project $scope.include $true
    if ($code -eq 2)
    {
        if ((Invoke-Formatting "$($scope.label)-apply" $scope.project $scope.include $false) -ne 0) { throw 'Scoped existing formatter application failed.' }
        if ((Invoke-Formatting "$($scope.label)-final-check" $scope.project $scope.include $true) -ne 0) { throw 'Scoped final formatter check failed.' }
    }
    elseif ($code -ne 0) { throw 'Actual scoped formatting failed.' }
}
& (Join-Path $PSScriptRoot 'F109-build-harness.ps1') -Label final-formatted -NoRestore
Write-Output 'F109 actual five-file harness/new-test scoped formatting/final clean build retained;no source comparison.'
