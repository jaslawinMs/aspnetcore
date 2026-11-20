. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$paths = @(
    'src\Components\Components\src\Reflection\MemberAssignment.cs',
    'src\Components\Components\src\Reflection\ComponentProperties.cs',
    'src\Components\Components\src\Reflection\PropertySetter.cs',
    'src\Components\Components\src\DefaultComponentPropertyActivator.cs',
    'src\Components\Components\src\ParameterView.cs',
    'src\Components\Components\src\ComponentBase.cs',
    'src\Components\Components\src\ResourceAssetCollection.cs',
    'src\Components\Components\src\ResourceAsset.cs',
    'src\Components\Components\src\ResourceAssetProperty.cs',
    'src\Components\Components\test\ParameterViewTest.Assignment.cs',
    'src\Components\Components\test\ResourceAssetCollectionTest.cs',
    'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj',
    'src\Components\Shared\src\HotReloadManager.cs',
    'src\Components\Endpoints\src\Assets\ImportMapDefinition.cs',
    'src\Components\Endpoints\src\Assets\ImportMap.cs',
    'src\Components\Endpoints\src\Builder\ResourceCollectionConvention.cs',
    'src\Components\Endpoints\src\Builder\ResourceCollectionUrlEndpoint.cs',
    'src\Components\Endpoints\src\Builder\RazorComponentEndpointDataSource.cs',
    'src\Components\Endpoints\test\Assets\ImportMapDefinitionTest.cs',
    'src\Components\Endpoints\test\ImportMapTest.cs',
    'src\Components\Endpoints\test\Builder\RazorComponentsEndpointConventionBuilderExtensionsTest.cs',
    'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
    'src\Components\Endpoints\test\TestApplication.staticwebassets.endpoints.json',
    'src\Components\Endpoints\test\TestManifests\Test.staticwebassets.endpoints.json',
    'src\Shared\Components\ResourceCollectionResolver.cs',
    'eng\Tools.props',
    'eng\tools\GenerateFiles\GenerateFiles.csproj',
    'src\Assets\Microsoft.AspNetCore.App.Internal.Assets.csproj',
    'global.json',
    'eng\Versions.props'
)
$paths | ConvertTo-Json | Set-Content "$PSScriptRoot\selected-sources.json" -Encoding utf8NoBOM
foreach ($role in @('original37','default'))
{
    $repo = $roles.$role
    foreach ($path in $paths)
    {
        $source = Join-Path $repo $path
        if (Test-Path $source)
        {
            $dest = Join-Path $PSScriptRoot "capsule\sources\$role\$path"
            New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $dest
        }
    }
    Invoke-Recorded "016-$role-source-identities" 'git' (@('ls-files','--stage','--') + $paths) $repo
}
foreach ($pair in @(
    @('member','src/Components/Components/src/Reflection/MemberAssignment.cs'),
    @('resource','src/Components/Components/src/ResourceAssetCollection.cs'),
    @('import','src/Components/Endpoints/src/Assets/ImportMapDefinition.cs')
))
{
    Invoke-Recorded "017-$($pair[0])-upstream-file-history" 'gh' @('api',"repos/dotnet/aspnetcore/commits?sha=$($roles.defaultCommit)&path=$($pair[1])&per_page=3")
}
$docs = @('src\Components\AGENTS.md','.github\instructions\components.instructions.md','.github\instructions\components.server.instructions.md','.github\instructions\cross-cutting-guidance.instructions.md','.github\instructions\build.instructions.md','docs\BuildFromSource.md','docs\BlazorComponentsGuidance.md','docs\CrossCuttingGuidance.md')
foreach ($path in $docs)
{
    $dest = Join-Path $PSScriptRoot "capsule\guidance\$path"
    New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path 'C:\src\aspnetcore' $path) -Destination $dest
}
