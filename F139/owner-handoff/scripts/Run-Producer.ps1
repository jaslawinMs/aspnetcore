param(
    [ValidateSet('original', 'default')][string]$Role,
    [Parameter(Mandatory)][string]$Id,
    [string]$Image,
    [string]$Common,
    [string]$Fixture,
    [string]$Output
)
$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$checkout = Join-Path $scope $Role
if (-not $Image) { $Image = Join-Path $scope "runtime-images\$Role" }
if (-not $Common) { $Common = Join-Path $scope 'consumer\bin\Debug\net12.0' }
if (-not $Fixture) { $Fixture = Join-Path $scope 'fixtures' }
if (-not $Output) { $Output = Join-Path $scope "results\$Role-producer-complete" }
$runtime = if ($Role -eq 'original') { 'C:\src\aspnetcore\.dotnet' } else { 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default' }
$version = if ($Role -eq 'original') { '12.0.0-alpha.1.26562.105' } else { '12.0.0-alpha.1.26568.110' }
Set-Location $checkout
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
$env:DOTNET_ROOT = $runtime
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_ROLL_FORWARD_TO_PRERELEASE = '0'
$env:DOTNET_MULTILEVEL_LOOKUP = '0'
$env:DOTNET_HOST_TRACE = '1'
$env:DOTNET_HOST_TRACEFILE = Join-Path $scope "logs\$Id.host.log"
& "$scope\Invoke-Recorded.ps1" -Id $Id -File "$runtime\dotnet.exe" -Arguments @(
    'exec', '--fx-version', $version, "$Common\F139.EmitProbe.dll", $Image, $Fixture, $Output, $Role
) -WorkingDirectory $checkout
