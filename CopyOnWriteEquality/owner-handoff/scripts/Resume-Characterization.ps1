param(
    [Parameter(Mandatory)][ValidatePattern('^[a-zA-Z0-9-]+$')][string]$RunId,
    [switch]$UseInstalledRuntimeForDefaultExistingTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if ((Get-Content (Join-Path $root 'manifest\hold.json') -Raw | ConvertFrom-Json).hold_active)
{
    throw 'Coordinator hold is active; this preparation script does not release it.'
}

$runner = Join-Path $PSScriptRoot 'Invoke-RecordedDotNet.ps1'
$flags = @(
    '-v:minimal',
    '-p:UseIisNativeAssets=false',
    '-p:BuildNodeJS=false',
    '-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false',
    '/m:2',
    '/nr:false'
)
foreach ($version in @('default', 'original'))
{
    $buildArguments = @('build', (Join-Path $root "projects\$version\F151F152.ProducerProbe.csproj"))
    if ($version -eq 'default')
    {
        $buildArguments += '--no-restore'
    }

    & $runner -Version $version -Label "$RunId-producer-build" -DotNetArguments ($buildArguments + $flags)
    if ($LASTEXITCODE -ne 0)
    {
        throw "Producer probe build failed for $version; inspect the recorded streams."
    }

    & $runner -Version $version -Label "$RunId-producer-run" -DotNetArguments @(
        (Join-Path $root "projects\$version\bin\Debug\net12.0\F151F152.ProducerProbe.dll"),
        "C:\src\autoperf-finding-F151-$version",
        (Join-Path $root "outputs\$version\repo-artifacts\bin\Microsoft.AspNetCore.Mvc.Core\Debug\net12.0\Microsoft.AspNetCore.Mvc.Core.dll"),
        (Join-Path $root "outputs\$version\$RunId-producer-characterization.json")
    )
    if ($LASTEXITCODE -ne 0)
    {
        throw "Producer characterization failed for $version; no producer pass may be claimed."
    }
}

$testArguments = @(
    'test',
    '.\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
    '--filter',
    'FullyQualifiedName~ControllerActionInvokerProviderTest|FullyQualifiedName~ControllerActionInvokerTest.AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~ControllerActionInvokerTest.DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext',
    '--logger',
    'console;verbosity=detailed',
    '--logger',
    "trx;LogFileName=$RunId-targeted.trx",
    '--results-directory',
    (Join-Path $root 'outputs\default\test-results')
)
if ($UseInstalledRuntimeForDefaultExistingTests)
{
    $testArguments += @(
        '--no-restore',
        '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
        '-p:RollForward=Disable'
    )
}

& $runner -Version default -Label "$RunId-existing-mvc-tests" -DotNetArguments ($testArguments + $flags)
if ($LASTEXITCODE -ne 0)
{
    throw 'Default existing MVC test command failed; inspect each test outcome.'
}
