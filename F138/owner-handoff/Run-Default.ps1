$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$checkout = Join-Path $scope 'default'
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$runtime = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default'
$consumer = Join-Path $scope 'consumer\bin\Debug\net12.0\F138.Characterization.dll'
$runtimeConfig = Join-Path $scope 'consumer\bin\Debug\net12.0\F138.Characterization.runtimeconfig.json'
$bin = Join-Path $checkout 'artifacts\bin\Microsoft.AspNetCore.OpenApi.Tests\Debug\net12.0'
function Set-ExactRuntime([string]$TraceName) {
    Set-Location $script:checkout
    . .\activate.ps1
    $env:DOTNET_ROOT = $script:runtime
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_ROLL_FORWARD_TO_PRERELEASE = '0'
    $env:DOTNET_MULTILEVEL_LOOKUP = '0'
    $env:DOTNET_HOST_TRACE = '1'
    $env:DOTNET_HOST_TRACEFILE = Join-Path $script:scope "logs\$TraceName.host.log"
}
Set-ExactRuntime '035-default-real-producer'
& $recorder -Id '035-default-real-producer' -File "$runtime\dotnet.exe" -Arguments @(
    'exec', '--fx-version', '12.0.0-alpha.1.26568.110', $consumer, $bin,
    (Join-Path $scope 'results\default-producer'), 'fresh-default'
) -WorkingDirectory $checkout

Set-ExactRuntime '036-default-existing-tests'
$sdk = 'C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102'
& $recorder -Id '036-default-existing-tests' -File "$runtime\dotnet.exe" -Arguments @(
    'exec', '--runtimeconfig', $runtimeConfig, '--depsfile', "$sdk\vstest.console.deps.json",
    "$sdk\vstest.console.dll", "$bin\Microsoft.AspNetCore.OpenApi.Tests.dll",
    '/TestCaseFilter:FullyQualifiedName~OpenApiDocumentServiceTests.GetRequestBody_|FullyQualifiedName~OpenApiDocumentServiceTests.GetOpenApiRequestBody_|FullyQualifiedName~ApiDescriptionExtensionsTests',
    '/Logger:console;verbosity=detailed',
    '/Logger:trx;LogFileName=default.trx',
    "/ResultsDirectory:$scope\results\default-existing"
) -WorkingDirectory $checkout

$auditor = Join-Path $scope 'auditor\bin\Debug\net12.0\MetadataAudit.dll'
foreach ($owner in @('Microsoft.AspNetCore.OpenApi', 'Microsoft.AspNetCore.Mvc.ApiExplorer', 'Microsoft.AspNetCore.Mvc.Abstractions', 'Microsoft.AspNetCore.Http.Extensions', 'Microsoft.AspNetCore.OpenApi.Tests')) {
    Set-Location $checkout
    . .\activate.ps1
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_ROLL_FORWARD_TO_PRERELEASE = '0'
    $env:DOTNET_MULTILEVEL_LOOKUP = '0'
    Remove-Item Env:DOTNET_HOST_TRACE, Env:DOTNET_HOST_TRACEFILE -ErrorAction SilentlyContinue
    $null = & $recorder -Id "037-default-metadata-$owner" -File "$env:DOTNET_ROOT\dotnet.exe" -Arguments @(
        'exec', '--fx-version', '12.0.0-alpha.1.26557.102', $auditor, "$bin\$owner.dll", "$bin\$owner.pdb", $checkout
    ) -WorkingDirectory $checkout
    Write-Output "AUDITED $owner EXIT=$global:RecordedExitCode"
}
