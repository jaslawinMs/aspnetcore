param(
    [ValidateSet('Original', 'CurrentDefault')][string]$Role = 'Original',
    [int]$Attempt = 1,
    [switch]$DiscoverOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Native010.ps1')
$commonGraph = Join-Path $PSScriptRoot 'graphs\Original'
$output = Join-Path $commonGraph 'artifacts\bin\InMemory.FunctionalTests\Release\net12.0'
$sample = Join-Path $PSScriptRoot "graphs\$Role\artifacts\bin\WebTransportInteractiveSampleApp\Release\net12.0\WebTransportInteractiveSampleApp.dll"
$env:PROBE010_SAMPLE_PATH = $sample
$env:PROBE010_SAMPLE_SHA256 = (Get-FileHash $sample -Algorithm SHA256).Hash
$env:PROBE010_CORE_SHA256 = (Get-FileHash (Join-Path $output 'Microsoft.AspNetCore.Server.Kestrel.Core.dll') -Algorithm SHA256).Hash
$config = Get-Content (Join-Path $output 'InMemory.FunctionalTests.runtimeconfig.json') -Raw | ConvertFrom-Json
if ($config.runtimeOptions.framework.version -ne '12.0.0-alpha.1.26557.102')
{
    throw 'The common consumer is not explicitly configured for runtime57.'
}

function Write-Image010([string]$Suffix)
{
    $files = foreach ($file in Get-ChildItem $output -Recurse -File | Sort-Object FullName)
    {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($output, $file.FullName)
            bytes = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        }
    }
    [ordered]@{
        physicalDirectory = $output
        completeFileInventory = $true
        prefixExclusions = @()
        files = @($files)
    } | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $PSScriptRoot "evidence\$Role-consumer-$Attempt-$Suffix.json")
}

Write-Image010 'before'
$arguments = @(
    'test', 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj',
    '--no-build', '--no-restore', '-c', 'Release',
    '--filter', 'FullyQualifiedName~CompiledSampleProducerTests|FullyQualifiedName~WebTransportSession_CanOpenNewStream|FullyQualifiedName~WebTransportSession_Closed_RemovedFromConnection',
    '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\Probe010.targets')"
)
$label = "$Role-tests-$Attempt"
if ($DiscoverOnly)
{
    $arguments += '--list-tests'
    $label = "$Role-discovery-$Attempt"
}
else
{
    $arguments += '--logger', "trx;LogFileName=$Role-attempt$Attempt.trx",
        '--results-directory', (Join-Path $PSScriptRoot "results\$Role\attempt$Attempt"),
        '-v:normal'
}
try
{
    Invoke-Native010 -Root $commonGraph -Label $label -Executable (Join-Path $commonGraph '.dotnet\dotnet.exe') -Arguments $arguments -Dotnet
}
finally
{
    Write-Image010 'after'
}
