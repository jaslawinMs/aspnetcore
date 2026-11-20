param([ValidateSet('original', 'default')][string]$Role)
$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$checkout = Join-Path $scope $Role
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$nativeBin = Join-Path $checkout 'artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Debug\net12.0'
$image = Join-Path $scope "runtime-images\$Role"
$common = Join-Path $scope 'consumer\bin\Debug\net12.0'
$runtime = if ($Role -eq 'original') { 'C:\src\aspnetcore\.dotnet' } else { 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default' }
$version = if ($Role -eq 'original') { '12.0.0-alpha.1.26562.105' } else { '12.0.0-alpha.1.26568.110' }
function Set-ExactRuntime([string]$Id) {
    Set-Location $script:checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    $env:DOTNET_ROOT = $script:runtime
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_ROLL_FORWARD_TO_PRERELEASE = '0'
    $env:DOTNET_MULTILEVEL_LOOKUP = '0'
    $env:DOTNET_HOST_TRACE = '1'
    $env:DOTNET_HOST_TRACEFILE = Join-Path $script:scope "logs\$Id.host.log"
}
Set-ExactRuntime "030-$Role-real-producer"
& $recorder -Id "030-$Role-real-producer" -File "$runtime\dotnet.exe" -Arguments @(
    'exec', '--fx-version', $version, "$common\F139.EmitProbe.dll", $image, "$scope\fixtures", "$scope\results\$Role-producer", $Role
) -WorkingDirectory $checkout

Set-ExactRuntime "031-$Role-existing-tests"
$sdk = 'C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102'
& $recorder -Id "031-$Role-existing-tests" -File "$runtime\dotnet.exe" -Arguments @(
    'exec', '--fx-version', $version, '--runtimeconfig', "$common\F139.EmitProbe.runtimeconfig.json",
    '--depsfile', "$sdk\vstest.console.deps.json", "$sdk\vstest.console.dll",
    "$nativeBin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.dll",
    '/TestCaseFilter:FullyQualifiedName~RuntimeViewCompilerTest.Compile_|FullyQualifiedName~RuntimeViewCompilerTest.CompileAndEmit_|FullyQualifiedName~CSharpCompilerTest',
    '/Logger:console;verbosity=detailed',
    "/Logger:trx;LogFileName=$Role.trx",
    "/ResultsDirectory:$scope\results\$Role-existing"
) -WorkingDirectory $checkout
