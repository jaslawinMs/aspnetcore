param([ValidateSet('original37','default')][string]$Role)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$projects = [ordered]@{
    components='src\Components\Components\src\Microsoft.AspNetCore.Components.csproj'
    componentsTests='src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj'
    endpoints='src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj'
    endpointsTests='src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj'
}
foreach ($key in $projects.Keys)
{
    Invoke-LocalDotnet "060-$Role-$key-resolved-inventory" $repo @(
        'msbuild',$projects[$key],'/t:ResolveReferences','-v:q','/m:2','/nr:false',
        '/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false','/p:BuildNodeJS=false','/p:StaticWebAssetsEnabled=false',
        '/getItem:ReferencePath,ReferenceCopyLocalPaths,Analyzer,Compile,AdditionalFiles,EditorConfigFiles,EmbeddedResource,ProjectReference',
        '/getProperty:MSBuildProjectFullPath,TargetFramework,TargetPath,RuntimeFrameworkVersion,LangVersion,EnableNETAnalyzers,RunAnalyzers,RunAnalyzersDuringBuild,MSBuildAllProjects,MSBuildSDKsPath,NETCoreSdkVersion,NuGetPackageRoot,BaseIntermediateOutputPath'
    )
}
