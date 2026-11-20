[CmdletBinding()]
param(
    [ValidateSet('Original', 'ObservedDefault')]
    [string]$Role = 'Original',
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json'))
{
    throw 'F146-007 is frozen; use node Audit007.cjs verify-only without rebuilding or rerunning.'
}

. (Join-Path $PSScriptRoot 'Invoke-Recorded007.ps1')
$graph = Join-Path $PSScriptRoot "graphs\$Role"
$testOutput = Join-Path $graph 'artifacts\bin\InMemory.FunctionalTests\Release\net12.0'
$ownerName = 'Microsoft.AspNetCore.Server.Kestrel.Core'
$ownerOutput = Join-Path $graph "artifacts\bin\$ownerName\Release\net12.0"
$coreRuntime = '12.0.0-alpha.1.26557.102'
$runtimeConfig = Join-Path $testOutput 'InMemory.FunctionalTests.runtimeconfig.json'
$config = Get-Content -LiteralPath $runtimeConfig -Raw | ConvertFrom-Json
if ($config.runtimeOptions.framework.name -ne 'Microsoft.NETCore.App' -or
    $config.runtimeOptions.framework.version -ne $coreRuntime)
{
    throw 'Test runtimeconfig is not the explicitly selected runtime57.'
}

$owners = foreach ($extension in '.dll', '.pdb')
{
    $sourceOutput = Join-Path $ownerOutput "$ownerName$extension"
    $testCopy = Join-Path $testOutput "$ownerName$extension"
    $sourceHash = (Get-FileHash -LiteralPath $sourceOutput -Algorithm SHA256).Hash
    $copyHash = (Get-FileHash -LiteralPath $testCopy -Algorithm SHA256).Hash
    if ($sourceHash -ne $copyHash)
    {
        throw "Source-built owner/test-copy mismatch for $extension"
    }

    [ordered]@{
        sourceBuiltPath = $sourceOutput
        loadedExpectedPath = $testCopy
        sha256 = $copyHash
        identical = $true
    }
}
$owners | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot "$Role-owner-copy-check.json")
$outputFiles = foreach ($file in Get-ChildItem -LiteralPath $testOutput -Recurse -File | Sort-Object FullName)
{
    [ordered]@{
        path = [System.IO.Path]::GetRelativePath($testOutput, $file.FullName)
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}
$outputFiles | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot "$Role-complete-output-image-before-run.json")
$env:F146_EXPECTED_KESTREL_CORE_PATH = Join-Path $testOutput "$ownerName.dll"
$env:F146_EXPECTED_KESTREL_CORE_SHA256 = $owners[0].sha256
$env:F146_EXPECTED_CORE_RUNTIME_VERSION = $coreRuntime
[ordered]@{
    role = $Role
    expectedOwnerPath = $env:F146_EXPECTED_KESTREL_CORE_PATH
    expectedOwnerSha256 = $env:F146_EXPECTED_KESTREL_CORE_SHA256
    expectedCoreRuntime = $env:F146_EXPECTED_CORE_RUNTIME_VERSION
    runtimeConfigPath = $runtimeConfig
    runtimeConfigSha256 = (Get-FileHash -LiteralPath $runtimeConfig -Algorithm SHA256).Hash
    assertedInsideEveryTest = $true
    sourceBuiltOwnerIsKestrelCore = $true
    compiledSampleOwner = $false
    extractedSampleBodyInTestAssembly = $true
    performancePair = $false
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot "$Role-runtime-owner-expectation.json")
$results = Join-Path $PSScriptRoot "results\$Role\attempt$Attempt"
$pins = @{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    ObservedDefault = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
}
$flags = @(
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    "-p:RuntimeFrameworkVersion=$coreRuntime",
    "-p:SourceRevisionId=$($pins[$Role])", "-p:F146SourceRole=$Role",
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\F146.Producer.targets')",
    '-p:NuGetAudit=false'
)
if ($Role -eq 'ObservedDefault')
{
    $flags += '-p:RunAnalyzers=false', '-p:RunAnalyzersDuringBuild=false'
}
Invoke-Recorded007 -Root $graph -Label "$Role-producer-tests-rt57-$Attempt" -Executable (Join-Path $graph '.dotnet\dotnet.exe') -Arguments (@(
    'test', 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj',
    '--no-build', '--no-restore', '-c', 'Release',
    '--filter', 'FullyQualifiedName~F146ManagedProducerTests',
    '--logger', "trx;LogFileName=F146-$Role-rt57-attempt$Attempt.trx",
    '--results-directory', $results, '-v:normal'
) + $flags) -Dotnet
