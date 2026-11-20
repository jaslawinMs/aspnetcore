. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
foreach ($role in @('original37','default'))
{
    Invoke-LocalDotnet "060-$role-native-defaults" $roles.$role @(
        'msbuild','src\Http\Http.Abstractions\test\Microsoft.AspNetCore.Http.Abstractions.Tests.csproj',
        '/p:UseIisNativeAssets=false','/nr:false','/p:UseSharedCompilation=false',
        '-getProperty:TargetFramework,TargetFrameworks,LangVersion,CheckForOverflowUnderflow,Nullable,EnableNETAnalyzers,RunAnalyzersDuringBuild,RuntimeFrameworkVersion,DefaultNetCoreTargetFramework,NetCoreTargetingPackVersion'
    )
}
