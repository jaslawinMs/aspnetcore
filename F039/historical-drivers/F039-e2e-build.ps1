$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F039'
$directory = Join-Path $run 'selenium-build-candidate-001'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite an E2E build receipt.'
}
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'source-comparison-budget.json') | ConvertFrom-Json
if (-not $budget.closed)
{
    throw 'Finish and close the bounded source comparisons before the dependency-aware Debug build.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$owner = Join-Path $root 'src\Components\Endpoints\src\TempData\TempData.cs'
$before = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
$arguments = @('build', 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj',
    '--configuration', 'Debug', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet',
    '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$started = [DateTime]::UtcNow
& dotnet @arguments 1> (Join-Path $directory 'stdout.log') 2> (Join-Path $directory 'stderr.log')
$nativeExit = $LASTEXITCODE
$after = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
$binary = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Components.Endpoints\Debug\net12.0\Microsoft.AspNetCore.Components.Endpoints.dll'
$appBinary = Join-Path $root 'artifacts\bin\Components.TestServer\Debug\net12.0\Microsoft.AspNetCore.Components.Endpoints.dll'
[ordered]@{
    candidate='F039';executable=(Get-Command dotnet).Source;arguments=$arguments
    actualStartedUtc=$started.ToString('O');actualFinishedUtc=[DateTime]::UtcNow.ToString('O');actualExitCode=$nativeExit
    actualDependencyAwareBuild=$true;actualConfiguration='Debug';actualMaximumMsbuildWorkers=2
    actualOwnerSourceBeforeSha256=$before;actualOwnerSourceAfterSha256=$after
    actualOwnerDebugBinary=$binary;actualOwnerDebugBinarySha256=if(Test-Path -LiteralPath $binary){(Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash}
    actualTestServerDebugOwnerBinary=$appBinary
    actualTestServerDebugOwnerBinarySha256=if(Test-Path -LiteralPath $appBinary){(Get-FileHash -LiteralPath $appBinary -Algorithm SHA256).Hash}
    actualSharedMachineNotIsolated=$true
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 25
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 15
if ($nativeExit -ne 0 -or $before -cne $after)
{
    throw "F039 dependency-aware E2E build failed or source changed: native exit $nativeExit."
}
if ((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -cne (Get-FileHash -LiteralPath $appBinary -Algorithm SHA256).Hash)
{
    throw 'The rebuilt Debug test server did not receive the actual rebuilt owning Endpoints assembly.'
}
