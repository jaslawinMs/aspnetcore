param(
    [ValidateSet('Original', 'CurrentDefault')][string]$Role = 'Original',
    [ValidateSet('Initial', 'Generate', 'Restore', 'Fixture', 'Sample')][string]$Stage = 'Initial',
    [ValidateSet('Baseline', 'F147', 'F149')][string]$Variant = 'Baseline',
    [int]$Attempt = 1,
    [switch]$RestoreGenerated,
    [switch]$UseFixtureProject,
    [switch]$OwnerOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Native010.ps1')
$setup = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source-graphs.json') -Raw | ConvertFrom-Json
$source = @($setup.actualSourceGraphs | Where-Object role -CEQ $Role)
if ($source.Count -ne 1)
{
    throw 'The exact source graph is not uniquely pinned.'
}
$graph = $source[0].graph
$project = 'src\Servers\Kestrel\samples\WebTransportInteractiveSampleApp\WebTransportInteractiveSampleApp.csproj'
if ($Stage -eq 'Fixture' -or $UseFixtureProject)
{
    if ($Role -cne 'Original' -or $Variant -cne 'Baseline')
    {
        throw 'The common fixture must be compiled once in the Original graph before candidates.'
    }
    $project = 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj'
}
if ($Stage -eq 'Fixture')
{
    $previous = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'logs') -File -Filter 'Original-Baseline-Fixture-*.receipt.json' |
        ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } |
        Where-Object exitCode -EQ 0)
    if ($previous.Count -ne 0)
    {
        throw 'The common fixture already compiled successfully; do not rebuild it.'
    }
}
$flags = @(
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
    "-p:SourceRevisionId=$($source[0].sourceCommit)",
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\Probe010.targets')"
)
if ($OwnerOnly)
{
    if ($Stage -cne 'Sample')
    {
        throw 'Owner-only rebuilding is restricted to the already built sample graph.'
    }
    $flags += '-p:BuildProjectReferences=false', '--no-incremental'
}
$arguments = @()
switch ($Stage)
{
    'Generate'
    {
        $arguments = @('msbuild', 'eng\tools\GenerateFiles\GenerateFiles.csproj',
            '-t:GenerateDirectoryBuildFiles', '-p:Configuration=Release', '-v:minimal')
        if ($RestoreGenerated)
        {
            $arguments += '-restore'
        }
    }
    'Restore'
    {
        $arguments = @('restore', $project, '-v:minimal')
    }
    default
    {
        $arguments = @('build', $project, '--no-restore', '-c', 'Release', '-v:q')
    }
}
$label = "$Role-$Variant-$Stage-$Attempt"
Invoke-Native010 -Root $graph -Label $label -Executable (Join-Path $graph '.dotnet\dotnet.exe') `
    -Arguments ($arguments + $flags) -Dotnet -AllowFailure:($Stage -eq 'Initial')
