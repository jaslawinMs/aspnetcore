param(
    [ValidateSet('Original', 'CurrentDefault')][string]$Role = 'Original',
    [ValidateSet('Initial', 'Generate', 'Fixture', 'Sample')][string]$Stage = 'Initial',
    [int]$Attempt = 1,
    [switch]$SkipAnalyzers,
    [switch]$SkipRestore
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Native010.ps1')
$graph = Join-Path $PSScriptRoot "graphs\$Role"
$dotnet = Join-Path $graph '.dotnet\dotnet.exe'
$pins = @{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    CurrentDefault = '00560e2dd1954a2acf2bc54b35422b0f32484bf1'
}
$flags = @(
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
    "-p:SourceRevisionId=$($pins[$Role])", '-p:NuGetAudit=false',
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\Probe010.targets')"
)
if ($SkipAnalyzers)
{
    $flags += '-p:RunAnalyzers=false', '-p:RunAnalyzersDuringBuild=false'
}
$cache = 'C:\.tools\.nuget\packages\'
$project = 'src\Servers\Kestrel\samples\WebTransportInteractiveSampleApp\WebTransportInteractiveSampleApp.csproj'
if ($Stage -eq 'Fixture')
{
    if ($Role -ne 'Original')
    {
        throw 'COMMON-ONCE fixture may only be compiled in Original.'
    }
    $project = 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj'
}
switch ($Stage)
{
    'Initial'
    {
        Invoke-Native010 -Root $graph -Label "$Role-initial-no-restore-$Attempt" -Executable $dotnet -Arguments (@(
            'build', $project, '--no-restore', '-c', 'Release', '-v:q'
        ) + $flags) -Dotnet -AllowFailure
    }
    'Generate'
    {
        Invoke-Native010 -Root $graph -Label "$Role-generated-files-$Attempt" -Executable $dotnet -Arguments (@(
            'msbuild', 'eng\tools\GenerateFiles\GenerateFiles.csproj', '-restore',
            '-t:GenerateDirectoryBuildFiles', "-p:RestoreSources=$cache", '-v:minimal'
        ) + $flags) -Dotnet
    }
    default
    {
        if (-not $SkipRestore)
        {
            Invoke-Native010 -Root $graph -Label "$Role-$Stage-restore-$Attempt" -Executable $dotnet -Arguments (@(
                'restore', $project, '--source', $cache, '--ignore-failed-sources', '-v:minimal'
            ) + $flags) -Dotnet
        }
        Invoke-Native010 -Root $graph -Label "$Role-$Stage-build-$Attempt" -Executable $dotnet -Arguments (@(
            'build', $project, '--no-restore', '-c', 'Release', '-v:q'
        ) + $flags) -Dotnet
    }
}
