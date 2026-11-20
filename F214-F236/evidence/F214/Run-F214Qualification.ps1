param(
    [Parameter(Mandatory)] [ValidateSet('original', 'default')] [string] $Role,
    [Parameter(Mandatory)] [ValidateSet('tests', 'jit')] [string] $Kind,
    [Parameter(Mandatory)] [int] $FirstReceipt,
    [switch] $SkipRestore
)

$ErrorActionPreference = 'Stop'
$graph = if ($Role -eq 'original') { 'C:\src\ap-F214-o195' } else { 'C:\src\ap-F214-d195' }
$native = Join-Path $PSScriptRoot 'Invoke-F214Native.ps1'
$dotnet = Join-Path $graph '.dotnet\dotnet.exe'
$projectName = if ($Kind -eq 'tests') { 'F214.Qualification.Tests' } else { 'F214.JitDiagnostic' }
$project = Join-Path $PSScriptRoot ("qualification\$projectName.csproj")
$output = Join-Path $graph ("artifacts\F214\$Kind\bin")
$intermediate = Join-Path $graph ("artifacts\F214\$Kind\obj")
$common = @(
    "-p:SourceGraph=$graph"
    "-p:BaseIntermediateOutputPath=$intermediate\"
    "-p:MSBuildProjectExtensionsPath=$intermediate\"
    "-p:OutputPath=$output\"
    '-m:2'
    '-nr:false'
    '-p:UseSharedCompilation=false'
    '-tl:off'
    '-clp:NoSummary'
    '-v:q'
)
$prefix = '{0:D3}-{1}-{2}' -f $FirstReceipt, $Role, $Kind
if (-not $SkipRestore)
{
    & $native -Executable $dotnet -Arguments (@('restore', $project, '--source', 'C:\.tools\.nuget\packages', '-p:NuGetAudit=false') + $common) -WorkingDirectory $graph -Graph $graph -ReceiptName ($prefix + '-cache-restore')
}
$prefix = '{0:D3}-{1}-{2}' -f ($FirstReceipt + 1), $Role, $Kind
& $native -Executable $dotnet -Arguments (@('build', $project, '--no-restore', '-c', 'Release') + $common) -WorkingDirectory $graph -Graph $graph -ReceiptName ($prefix + '-build')

$dll = Join-Path $output ($projectName + '.dll')
if ($Kind -eq 'tests')
{
    $resultPath = Join-Path $PSScriptRoot ("$Role-unit-results.xml")
    $methods = @(
        'Microsoft.AspNetCore.Internal.Tests.AdaptiveCapacityDictionaryTests.TryAdd_*'
        'Microsoft.AspNetCore.Internal.Tests.AdaptiveCapacityDictionaryTests.ListStorage_SwitchesToDictionaryAfter10_TryAdd'
        'Microsoft.AspNetCore.Internal.Tests.AdaptiveCapacityDictionaryTests.UpgradeToDictionary_KeepsComparer'
        'Microsoft.AspNetCore.Http.Features.QueryFeatureTests.ParseQueryWithUniqueKeysWorks'
        'Microsoft.AspNetCore.Http.Features.QueryFeatureTests.ParseQueryWithThreefoldKeysGroups'
        'Microsoft.AspNetCore.Http.Features.QueryFeatureTests.CaseInsensitiveWithManyKeys'
        'Microsoft.AspNetCore.Http.Features.QueryFeatureTests.CaseInsensitiveWithFewKeys'
        'Microsoft.AspNetCore.Http.Tests.RequestCookiesCollectionTests.ParseManyCookies'
        'F214.Qualification.Tests.F214NullGuardQualificationTests.*'
    )
    $runArguments = @($dll, '-noLogo', '-noColor', '-parallel', 'none', '-xml', $resultPath)
    foreach ($method in $methods)
    {
        $runArguments += @('-method', $method)
    }

    $prefix = '{0:D3}-{1}-{2}' -f ($FirstReceipt + 2), $Role, $Kind
    & $native -Executable $dotnet -Arguments $runArguments -WorkingDirectory $graph -Graph $graph -ReceiptName ($prefix + '-run')
}
else
{
    $oldDisasm = $env:DOTNET_JitDisasm
    $oldAssemblies = $env:DOTNET_JitDisasmAssemblies
    $oldOutput = $env:DOTNET_JitStdOutFile
    try
    {
        $env:DOTNET_JitDisasm = 'ContainsKey TryAdd'
        $env:DOTNET_JitDisasmAssemblies = 'F214.JitDiagnostic'
        $env:DOTNET_JitStdOutFile = Join-Path $PSScriptRoot ("$Role-jit-disassembly.txt")
        $prefix = '{0:D3}-{1}-{2}' -f ($FirstReceipt + 2), $Role, $Kind
        & $native -Executable $dotnet -Arguments @($dll) -WorkingDirectory $graph -Graph $graph -ReceiptName ($prefix + '-run')
    }
    finally
    {
        $env:DOTNET_JitDisasm = $oldDisasm
        $env:DOTNET_JitDisasmAssemblies = $oldAssemblies
        $env:DOTNET_JitStdOutFile = $oldOutput
    }
}
