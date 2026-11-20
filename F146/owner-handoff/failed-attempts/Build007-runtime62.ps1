[CmdletBinding()]
param(
    [ValidateSet('Original', 'ObservedDefault')]
    [string]$Role = 'Original'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Recorded007.ps1')
$graph = Join-Path $PSScriptRoot "graphs\$Role"
$dotnet = Join-Path $graph '.dotnet\dotnet.exe'
$pins = @{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    ObservedDefault = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
}
$flags = @(
    '-p:UseIisNativeAssets=false','-p:BuildNodeJS=false','-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false','/m:2','/nr:false','-p:LangVersion=13.0',
    '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26562.105',
    "-p:SourceRevisionId=$($pins[$Role])","-p:F146SourceRole=$Role",
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\F146.Producer.targets')",
    '-p:NuGetAudit=false'
)
$cache = 'C:\.tools\.nuget\packages\'
Invoke-Recorded007 -Root $graph -Label "$Role-generate-files" -Executable $dotnet -Arguments (@(
    'msbuild','eng\tools\GenerateFiles\GenerateFiles.csproj','-restore',
    '-t:GenerateDirectoryBuildFiles',"-p:RestoreSources=$cache",'-v:minimal'
) + $flags) -Dotnet
$project = 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj'
Invoke-Recorded007 -Root $graph -Label "$Role-offline-restore" -Executable $dotnet -Arguments (@(
    'restore',$project,'--source',$cache,'--ignore-failed-sources','-v:minimal'
) + $flags) -Dotnet
Invoke-Recorded007 -Root $graph -Label "$Role-build-001" -Executable $dotnet -Arguments (@(
    'build',$project,'--no-restore','-c','Release','-v:q'
) + $flags) -Dotnet
